"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { logActivity, requireProfile } from "@/lib/auth";
import type { DealStage, DocumentType } from "@/types/database";
import { DEAL_STAGE_ORDER } from "@/types/database";

const DEAL_DOC_TYPES: DocumentType[] = [
  "buyer_order",
  "deposit_receipt",
  "bill_of_sale",
  "odometer_statement",
  "title",
  "delivery_checklist",
];

async function ensureDealDocuments(
  supabase: Awaited<ReturnType<typeof requireProfile>>["supabase"],
  dealId: string,
  truckId: string,
  createdBy: string,
) {
  const { data: existing } = await supabase
    .from("documents")
    .select("type")
    .eq("deal_id", dealId);
  const have = new Set((existing ?? []).map((d) => d.type));
  const missing = DEAL_DOC_TYPES.filter((t) => !have.has(t));
  if (missing.length === 0) return;
  await supabase.from("documents").insert(
    missing.map((type) => ({
      deal_id: dealId,
      truck_id: truckId,
      type,
      status: "not_yet" as const,
      created_by: createdBy,
    })),
  );
}

export async function createDealAction(formData: FormData) {
  const { profile, supabase } = await requireProfile();
  if (!["owner", "office", "sales"].includes(profile.role)) {
    return { error: "Not allowed" };
  }

  const schema = z.object({
    customer_id: z.string().uuid(),
    truck_id: z.string().uuid(),
    price: z.coerce.number().positive(),
    warranty_price: z.coerce.number().min(0).optional().default(0),
    down_payment: z.coerce.number().min(0).optional().default(0),
    notes: z.string().optional(),
    lead_id: z.string().uuid().optional().or(z.literal("")),
  });

  const parsed = schema.safeParse({
    customer_id: formData.get("customer_id"),
    truck_id: formData.get("truck_id"),
    price: formData.get("price"),
    warranty_price: formData.get("warranty_price") || 0,
    down_payment: formData.get("down_payment") || 0,
    notes: formData.get("notes") || "",
    lead_id: formData.get("lead_id") || "",
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid deal" };
  }

  const v = parsed.data;

  const { data: truck } = await supabase
    .from("trucks")
    .select("id, stock_no, status, asking_price, min_price")
    .eq("id", v.truck_id)
    .single();
  if (!truck) return { error: "Truck not found" };
  if (truck.status === "on_hold" || truck.status === "sold" || truck.status === "delivered") {
    return { error: "This truck already has a hold or sale" };
  }
  if (truck.status !== "available" && truck.status !== "in_prep") {
    // allow available primarily; in_prep ok for inquiry
  }

  const { data: blockers } = await supabase
    .from("deals")
    .select("id")
    .eq("truck_id", v.truck_id)
    .in("stage", ["deposit", "sold"]);
  if (blockers && blockers.length > 0) {
    return { error: "This truck already has an active hold or sale" };
  }

  const { data: customer } = await supabase
    .from("customers")
    .select("id, name")
    .eq("id", v.customer_id)
    .single();
  if (!customer) return { error: "Customer not found" };

  const repId = profile.role === "sales" ? profile.id : profile.id;

  const { data: deal, error } = await supabase
    .from("deals")
    .insert({
      customer_id: v.customer_id,
      truck_id: v.truck_id,
      sales_rep_id: repId,
      stage: "inquiry",
      price: v.price,
      warranty_price: v.warranty_price,
      down_payment: v.down_payment,
      notes: v.notes || null,
      created_by: profile.id,
    })
    .select("id")
    .single();

  if (error || !deal) return { error: error?.message ?? "Could not create deal" };

  await ensureDealDocuments(supabase, deal.id, v.truck_id, profile.id);

  if (v.lead_id) {
    await supabase
      .from("leads")
      .update({ status: "viewing", truck_id: v.truck_id })
      .eq("id", v.lead_id);
  }

  await logActivity(
    supabase,
    profile.id,
    `opened a deal with ${customer.name} on stock ${truck.stock_no}`,
    v.truck_id,
  );

  revalidatePath("/deals");
  revalidatePath("/leads");
  revalidatePath("/customers");
  revalidatePath("/today");
  revalidatePath(`/trucks/${v.truck_id}`);
  return { ok: true, dealId: deal.id };
}

export async function advanceDealAction(
  dealId: string,
  opts?: { ownerTitleOverride?: boolean; ownerMinPriceOverride?: boolean },
) {
  const { profile, supabase } = await requireProfile();
  if (!["owner", "office", "sales"].includes(profile.role)) {
    return { error: "Not allowed" };
  }

  const { data: deal } = await supabase
    .from("deals")
    .select(
      "*, customers(name), trucks(id, stock_no, status, min_price, asking_price)",
    )
    .eq("id", dealId)
    .single();

  if (!deal) return { error: "Deal not found" };

  const idx = DEAL_STAGE_ORDER.indexOf(deal.stage as DealStage);
  if (idx < 0 || idx >= DEAL_STAGE_ORDER.length - 1) {
    return { error: "Deal is already sold" };
  }

  const next = DEAL_STAGE_ORDER[idx + 1];
  const trucksJoin = deal.trucks as
    | {
        id: string;
        stock_no: number;
        status: string;
        min_price: number | string | null;
        asking_price: number | string | null;
      }
    | {
        id: string;
        stock_no: number;
        status: string;
        min_price: number | string | null;
        asking_price: number | string | null;
      }[]
    | null;
  const truck = Array.isArray(trucksJoin) ? (trucksJoin[0] ?? null) : trucksJoin;

  if (next === "deposit" || next === "sold") {
    const { data: others } = await supabase
      .from("deals")
      .select("id, stage")
      .eq("truck_id", deal.truck_id)
      .neq("id", dealId)
      .in("stage", ["deposit", "sold"]);
    if (others && others.length > 0) {
      return { error: "This truck already has an active hold or sale" };
    }
  }

  if (next === "sold" && truck) {
    const min =
      truck.min_price != null && truck.min_price !== ""
        ? Number(truck.min_price)
        : null;
    const price = Number(deal.price);
    if (min != null && !Number.isNaN(min) && price < min) {
      if (opts?.ownerMinPriceOverride && profile.role === "owner") {
        // allowed
      } else if (profile.role === "owner") {
        return {
          error: "MIN_PRICE_REQUIRED",
          message: `Sale price ${price.toLocaleString("en-US")} is below minimum ${min.toLocaleString("en-US")}. As owner you can approve and sell anyway.`,
        };
      } else {
        return {
          error: `Sale is below the minimum price ($${min.toLocaleString("en-US")}). Ask the owner to approve.`,
        };
      }
    }

    const { data: title } = await supabase
      .from("titles")
      .select("in_hand")
      .eq("truck_id", truck.id)
      .maybeSingle();

    const inHand = title?.in_hand === true;
    if (!inHand) {
      if (opts?.ownerTitleOverride && profile.role === "owner") {
        // allowed
      } else if (profile.role === "owner") {
        return {
          error: "TITLE_REQUIRED",
          message:
            "Title is not in hand. As owner you can override and mark sold anyway.",
        };
      } else {
        return {
          error:
            "Cannot mark sold without a title in hand. Ask the owner to approve.",
        };
      }
    }
  }

  const patch: Record<string, unknown> = { stage: next };
  if (next === "deposit") {
    patch.deposit_amount = deal.deposit_amount ?? 5000;
    patch.deposit_expires_at =
      deal.deposit_expires_at ??
      new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString();
  }
  if (next === "sold") {
    patch.sold_at = new Date().toISOString();
    if (opts?.ownerTitleOverride && profile.role === "owner") {
      patch.title_override_by = profile.id;
      patch.title_override_at = new Date().toISOString();
    }
  }

  const { error } = await supabase.from("deals").update(patch).eq("id", dealId);
  if (error) return { error: error.message };

  await ensureDealDocuments(supabase, dealId, deal.truck_id, profile.id);

  if (truck) {
    if (next === "credit_app") {
      const { count } = await supabase
        .from("lender_applications")
        .select("id", { count: "exact", head: true })
        .eq("deal_id", dealId);
      if (!count) {
        await supabase.from("lender_applications").insert([
          {
            deal_id: dealId,
            lender_name: "Northline Capital",
            status: "reviewing",
          },
          {
            deal_id: dealId,
            lender_name: "Prairie Equipment Finance",
            status: "reviewing",
          },
        ]);
      }
    }
    if (next === "deposit" && truck.status === "available") {
      await supabase
        .from("trucks")
        .update({
          status: "on_hold",
          hold_expires_at:
            (patch.deposit_expires_at as string) ??
            new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString(),
        })
        .eq("id", truck.id);
    }
    if (next === "sold") {
      await supabase
        .from("trucks")
        .update({
          status: "sold",
          asking_price: deal.price,
          hold_expires_at: null,
        })
        .eq("id", truck.id);
    }
  }

  const buyer = (deal.customers as { name: string } | null)?.name ?? "buyer";
  const stageLabel = next.replace("_", " ");
  await logActivity(
    supabase,
    profile.id,
    `moved ${buyer} to ${stageLabel}${truck ? ` on stock ${truck.stock_no}` : ""}${
      opts?.ownerMinPriceOverride ? " (below-min approved)" : ""
    }`,
    deal.truck_id,
  );

  revalidatePath("/deals");
  revalidatePath("/inventory");
  revalidatePath("/today");
  revalidatePath("/titles");
  if (truck) revalidatePath(`/trucks/${truck.id}`);
  return { ok: true };
}

export async function markDeliveredAction(truckId: string) {
  const { profile, supabase } = await requireProfile();
  if (!["owner", "office", "sales"].includes(profile.role)) {
    return { error: "Not allowed" };
  }

  const { data: truck } = await supabase
    .from("trucks")
    .select("id, stock_no, status")
    .eq("id", truckId)
    .single();
  if (!truck) return { error: "Truck not found" };
  if (truck.status !== "sold") {
    return { error: "Only sold trucks can be marked delivered" };
  }

  const { error } = await supabase
    .from("trucks")
    .update({ status: "delivered" })
    .eq("id", truckId);
  if (error) return { error: error.message };

  await logActivity(
    supabase,
    profile.id,
    `marked stock ${truck.stock_no} delivered`,
    truckId,
  );

  revalidatePath("/deals");
  revalidatePath("/inventory");
  revalidatePath("/today");
  revalidatePath(`/trucks/${truckId}`);
  return { ok: true };
}
