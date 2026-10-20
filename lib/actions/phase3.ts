"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { logActivity, requireProfile } from "@/lib/auth";

export async function takeKeyAction(formData: FormData) {
  const { profile, supabase } = await requireProfile();
  const truckId = String(formData.get("truck_id") ?? "");
  const notes = String(formData.get("notes") ?? "");
  if (!truckId) return { error: "Pick a truck" };

  const { data: open } = await supabase
    .from("key_log")
    .select("id")
    .eq("truck_id", truckId)
    .is("returned_at", null)
    .maybeSingle();
  if (open) return { error: "Keys for this truck are already out" };

  const { error } = await supabase.from("key_log").insert({
    truck_id: truckId,
    taken_by_id: profile.id,
    taken_by_name: profile.name,
    notes: notes || null,
  });
  if (error) return { error: error.message };

  const { data: t } = await supabase
    .from("trucks")
    .select("stock_no")
    .eq("id", truckId)
    .single();
  await logActivity(
    supabase,
    profile.id,
    `took keys for stock ${t?.stock_no ?? "?"}`,
    truckId,
  );
  revalidatePath("/keys");
  revalidatePath("/today");
  return { ok: true };
}

export async function returnKeyAction(entryId: string) {
  const { profile, supabase } = await requireProfile();
  const { data: entry } = await supabase
    .from("key_log")
    .select("*, trucks(stock_no)")
    .eq("id", entryId)
    .single();
  if (!entry) return { error: "Not found" };

  const { error } = await supabase
    .from("key_log")
    .update({ returned_at: new Date().toISOString() })
    .eq("id", entryId);
  if (error) return { error: error.message };

  const trucksJoin = entry.trucks as
    | { stock_no: number }
    | { stock_no: number }[]
    | null;
  const stock = Array.isArray(trucksJoin)
    ? trucksJoin[0]?.stock_no
    : trucksJoin?.stock_no;
  await logActivity(
    supabase,
    profile.id,
    `returned keys for stock ${stock ?? "?"}`,
    entry.truck_id,
  );
  revalidatePath("/keys");
  revalidatePath("/today");
  return { ok: true };
}

export async function saveEcmAction(formData: FormData) {
  const { profile, supabase } = await requireProfile();
  if (!["owner", "office", "mechanic"].includes(profile.role)) {
    return { error: "Not allowed" };
  }
  const schema = z.object({
    truck_id: z.string().uuid(),
    engine_hours: z.coerce.number().min(0),
    idle_hours: z.coerce.number().min(0),
    fault_codes: z.string().optional(),
  });
  const parsed = schema.safeParse({
    truck_id: formData.get("truck_id"),
    engine_hours: formData.get("engine_hours"),
    idle_hours: formData.get("idle_hours"),
    fault_codes: formData.get("fault_codes") || "",
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid" };

  let filePath: string | null = null;
  const file = formData.get("file");
  if (file instanceof File && file.size > 0) {
    const path = `${parsed.data.truck_id}/${Date.now()}-${file.name}`;
    const { error: up } = await supabase.storage
      .from("ecm-files")
      .upload(path, file, { contentType: file.type });
    if (up) return { error: up.message };
    filePath = path;
  }

  const { error } = await supabase.from("ecm_reports").insert({
    ...parsed.data,
    fault_codes: parsed.data.fault_codes || null,
    file_path: filePath,
  });
  if (error) return { error: error.message };

  await logActivity(
    supabase,
    profile.id,
    `logged ECM report`,
    parsed.data.truck_id,
  );
  revalidatePath("/ecm");
  return { ok: true };
}

export async function saveAppraisalAction(formData: FormData) {
  const { profile, supabase } = await requireProfile();
  if (!["owner", "office", "sales"].includes(profile.role)) {
    return { error: "Not allowed" };
  }
  const schema = z.object({
    vin: z.string().min(11),
    year: z.coerce.number().optional().or(z.literal("")),
    make: z.string().optional(),
    model: z.string().optional(),
    miles: z.coerce.number().min(0),
    condition: z.enum(["excellent", "good", "fair", "rough"]),
    expected_sale_price: z.coerce.number().min(0),
    planned_prep: z.coerce.number().min(0),
    target_profit: z.coerce.number().min(0),
    notes: z.string().optional(),
  });
  const parsed = schema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid" };
  const v = parsed.data;

  const { error } = await supabase.from("appraisals").insert({
    vin: v.vin.trim().toUpperCase(),
    year: typeof v.year === "number" ? v.year : null,
    make: v.make || null,
    model: v.model || null,
    miles: v.miles,
    condition: v.condition,
    expected_sale_price: v.expected_sale_price,
    planned_prep: v.planned_prep,
    target_profit: v.target_profit,
    notes: v.notes || null,
  });
  if (error) return { error: error.message };

  await logActivity(supabase, profile.id, `saved appraisal for VIN ${v.vin}`);
  revalidatePath("/appraisals");
  return { ok: true };
}

export async function updateTitleAction(formData: FormData) {
  const { profile, supabase } = await requireProfile();
  if (!["owner", "office"].includes(profile.role)) {
    return { error: "Not allowed" };
  }
  const truckId = String(formData.get("truck_id") ?? "");
  const location = String(formData.get("location") ?? "");
  const due = String(formData.get("due_date") ?? "") || null;
  const inHand = formData.get("in_hand") === "on" || formData.get("in_hand") === "true";
  if (!truckId || !location) return { error: "Truck and location required" };

  const { data: existing } = await supabase
    .from("titles")
    .select("id")
    .eq("truck_id", truckId)
    .maybeSingle();

  const row = {
    truck_id: truckId,
    location,
    due_date: due,
    in_hand: inHand,
  };

  const { error } = existing
    ? await supabase.from("titles").update(row).eq("id", existing.id)
    : await supabase.from("titles").insert(row);
  if (error) return { error: error.message };

  const { data: t } = await supabase
    .from("trucks")
    .select("stock_no")
    .eq("id", truckId)
    .single();
  await logActivity(
    supabase,
    profile.id,
    `updated title for stock ${t?.stock_no ?? "?"} (${inHand ? "in hand" : location})`,
    truckId,
  );
  revalidatePath("/titles");
  revalidatePath("/today");
  return { ok: true };
}

export async function saveConsignmentAction(formData: FormData) {
  const { profile, supabase } = await requireProfile();
  if (!["owner", "office"].includes(profile.role)) {
    return { error: "Not allowed" };
  }
  const schema = z.object({
    truck_id: z.string().uuid(),
    owner_name: z.string().min(1),
    agreed_net: z.coerce.number().min(0),
    fee_type: z.enum(["flat", "percent", "over_net"]),
    fee_value: z.coerce.number().min(0),
    end_date: z.string().optional(),
    payout_status: z.enum(["pending", "partial", "paid"]),
    notes: z.string().optional(),
  });
  const parsed = schema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid" };
  const v = parsed.data;

  const { error } = await supabase.from("consignments").insert({
    ...v,
    end_date: v.end_date || null,
    notes: v.notes || null,
  });
  if (error) return { error: error.message };

  await logActivity(
    supabase,
    profile.id,
    `added consignment for ${v.owner_name}`,
    v.truck_id,
  );
  revalidatePath("/consignments");
  return { ok: true };
}

export async function updateConsignmentPayoutAction(
  id: string,
  status: "pending" | "partial" | "paid",
) {
  const { profile, supabase } = await requireProfile();
  if (!["owner", "office"].includes(profile.role)) {
    return { error: "Not allowed" };
  }
  const { error } = await supabase
    .from("consignments")
    .update({ payout_status: status })
    .eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/consignments");
  return { ok: true };
}

export async function startAuditSessionAction() {
  const { profile, supabase } = await requireProfile();
  if (!["owner", "office"].includes(profile.role)) {
    return { error: "Not allowed" };
  }
  const { data, error } = await supabase
    .from("audit_sessions")
    .insert({ notes: "Lot walk" })
    .select("id")
    .single();
  if (error || !data) return { error: error?.message ?? "Failed" };
  await logActivity(supabase, profile.id, "started an inventory audit");
  revalidatePath("/audit");
  return { ok: true, id: data.id };
}

export async function scanAuditVinAction(sessionId: string, vin: string) {
  const { profile, supabase } = await requireProfile();
  if (!["owner", "office"].includes(profile.role)) {
    return { error: "Not allowed" };
  }
  const cleaned = vin.trim().toUpperCase();
  if (cleaned.length < 11) return { error: "Enter a VIN" };

  const { data: truck } = await supabase
    .from("trucks")
    .select("id, stock_no")
    .eq("vin", cleaned)
    .maybeSingle();

  const { error } = await supabase.from("audit_scans").insert({
    session_id: sessionId,
    vin: cleaned,
    matched_truck_id: truck?.id ?? null,
  });
  if (error) return { error: error.message };

  await logActivity(
    supabase,
    profile.id,
    truck
      ? `audit scanned stock ${truck.stock_no}`
      : `audit scanned unknown VIN ${cleaned}`,
    truck?.id,
  );
  revalidatePath("/audit");
  return { ok: true, matched: Boolean(truck) };
}

export async function completeAuditSessionAction(sessionId: string) {
  const { profile, supabase } = await requireProfile();
  if (!["owner", "office"].includes(profile.role)) {
    return { error: "Not allowed" };
  }
  const { error } = await supabase
    .from("audit_sessions")
    .update({ completed_at: new Date().toISOString() })
    .eq("id", sessionId);
  if (error) return { error: error.message };
  await logActivity(supabase, profile.id, "completed an inventory audit");
  revalidatePath("/audit");
  return { ok: true };
}

export async function inviteOrToggleUserAction(formData: FormData) {
  const { profile, supabase } = await requireProfile();
  if (profile.role !== "owner") return { error: "Owner only" };

  const userId = String(formData.get("user_id") ?? "");
  const active = formData.get("active") === "true";
  if (!userId) return { error: "Missing user" };

  const { error } = await supabase
    .from("profiles")
    .update({ active })
    .eq("id", userId);
  if (error) return { error: error.message };

  await logActivity(
    supabase,
    profile.id,
    `${active ? "reactivated" : "deactivated"} a team member`,
  );
  revalidatePath("/team");
  return { ok: true };
}

export async function inviteUserAction(formData: FormData) {
  const { profile } = await requireProfile();
  if (profile.role !== "owner") return { error: "Owner only" };

  const schema = z.object({
    email: z.string().email(),
    name: z.string().min(1),
    role: z.enum(["owner", "sales", "mechanic", "office"]),
    password: z.string().min(8),
  });
  const parsed = schema.safeParse({
    email: formData.get("email"),
    name: formData.get("name"),
    role: formData.get("role") || "sales",
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid" };
  }

  try {
    const { createServiceClient } = await import("@/lib/supabase/server");
    const admin = await createServiceClient();
    const { data, error } = await admin.auth.admin.createUser({
      email: parsed.data.email,
      password: parsed.data.password,
      email_confirm: true,
      user_metadata: { name: parsed.data.name },
    });
    if (error || !data.user) {
      return {
        error:
          error?.message ??
          "Could not create auth user. Use Supabase Dashboard → Auth → Add user, then add a profiles row.",
      };
    }

    const { error: pErr } = await admin.from("profiles").upsert({
      id: data.user.id,
      name: parsed.data.name,
      role: parsed.data.role,
      active: true,
      created_by: profile.id,
    });
    if (pErr) {
      return {
        error: `Auth user created but profile failed: ${pErr.message}. Add profiles row manually for ${data.user.id}.`,
      };
    }

    const { supabase } = await requireProfile();
    await logActivity(
      supabase,
      profile.id,
      `created login for ${parsed.data.name} (${parsed.data.role})`,
    );
    revalidatePath("/team");
    return {
      ok: true,
      message: `Created ${parsed.data.email}. Share the temp password securely.`,
    };
  } catch (e) {
    return {
      error:
        e instanceof Error
          ? `${e.message}. Or use Supabase Dashboard → Authentication → Add user.`
          : "Service role unavailable. Use Supabase Dashboard to add users.",
    };
  }
}

export async function saveRepGoalAction(formData: FormData) {
  const { profile, supabase } = await requireProfile();
  if (profile.role !== "owner") return { error: "Owner only" };

  const schema = z.object({
    sales_rep_id: z.string().uuid(),
    month: z.string().min(7),
    target_units: z.coerce.number().int().min(0),
    target_profit: z.coerce.number().min(0),
  });
  const parsed = schema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid" };

  const month = `${parsed.data.month.slice(0, 7)}-01`;
  const { error } = await supabase.from("rep_goals").upsert(
    {
      sales_rep_id: parsed.data.sales_rep_id,
      month,
      target_units: parsed.data.target_units,
      target_profit: parsed.data.target_profit,
    },
    { onConflict: "sales_rep_id,month" },
  );
  if (error) return { error: error.message };
  revalidatePath("/team");
  revalidatePath("/reports");
  return { ok: true };
}
