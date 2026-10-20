"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { logActivity, requireProfile } from "@/lib/auth";
import type { LeadStatus } from "@/types/database";
import { LEAD_STATUS_ORDER } from "@/types/database";

const leadSchema = z.object({
  customer_name: z.string().min(1),
  customer_type: z.enum(["owner_operator", "fleet"]),
  truck_id: z.string().uuid().optional().or(z.literal("")),
  source: z.enum([
    "website",
    "phone",
    "walk_in",
    "truck_paper",
    "instagram",
    "tiktok",
    "referral",
  ]),
});

export async function createLeadAction(formData: FormData) {
  const { profile, supabase } = await requireProfile();
  if (!["owner", "office", "sales"].includes(profile.role)) {
    return { error: "Not allowed" };
  }

  const parsed = leadSchema.safeParse({
    customer_name: formData.get("customer_name"),
    customer_type: formData.get("customer_type") || "owner_operator",
    truck_id: formData.get("truck_id") || "",
    source: formData.get("source") || "phone",
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid lead" };
  }

  const v = parsed.data;
  const repId = profile.role === "sales" ? profile.id : profile.id;

  const { data: customer, error: cErr } = await supabase
    .from("customers")
    .insert({
      name: v.customer_name,
      type: v.customer_type,
      sales_rep_id: repId,
    })
    .select("id, name")
    .single();

  if (cErr || !customer) return { error: cErr?.message ?? "Could not create customer" };

  const truckId = v.truck_id || null;
  const { data: lead, error } = await supabase
    .from("leads")
    .insert({
      customer_id: customer.id,
      truck_id: truckId,
      source: v.source,
      status: "new",
      sales_rep_id: repId,
    })
    .select("id")
    .single();

  if (error || !lead) return { error: error?.message ?? "Could not create lead" };

  let stock = "";
  if (truckId) {
    const { data: t } = await supabase
      .from("trucks")
      .select("stock_no")
      .eq("id", truckId)
      .single();
    if (t) stock = ` for stock ${t.stock_no}`;
  }

  await logActivity(
    supabase,
    profile.id,
    `logged a new lead${stock}`,
    truckId,
  );

  revalidatePath("/leads");
  revalidatePath("/customers");
  revalidatePath("/today");
  return { ok: true };
}

export async function advanceLeadAction(leadId: string) {
  const { profile, supabase } = await requireProfile();
  if (!["owner", "office", "sales"].includes(profile.role)) {
    return { error: "Not allowed" };
  }

  const { data: lead } = await supabase
    .from("leads")
    .select("*, customers(name), trucks(stock_no)")
    .eq("id", leadId)
    .single();

  if (!lead) return { error: "Lead not found" };

  const idx = LEAD_STATUS_ORDER.indexOf(lead.status as LeadStatus);
  if (idx < 0 || idx >= 3) {
    return { error: "Lead cannot move forward" };
  }
  const next = LEAD_STATUS_ORDER[idx + 1];

  const { error } = await supabase
    .from("leads")
    .update({ status: next })
    .eq("id", leadId);

  if (error) return { error: error.message };

  const name =
    (lead.customers as { name: string } | null)?.name ?? "buyer";
  await logActivity(
    supabase,
    profile.id,
    `moved ${name} to ${next}`,
    lead.truck_id,
  );

  revalidatePath("/leads");
  revalidatePath("/today");
  return { ok: true };
}
