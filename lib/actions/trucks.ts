"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { logActivity, requireProfile } from "@/lib/auth";
import { canAddTruck, canSeeFinancials } from "@/lib/roles";
import { decodeVin } from "@/lib/vin";
import type { PhotoSlot, PrepStepKind, TruckType } from "@/types/database";

const addTruckSchema = z.object({
  vin: z.string().min(11).max(17),
  year: z.coerce.number().int().min(1980).max(2100),
  make: z.string().min(1),
  model: z.string().min(1),
  type: z.enum(["sleeper", "day_cab", "box_truck", "trailer"]),
  miles: z.coerce.number().int().min(0),
  engine: z.string().optional(),
  hp: z.coerce.number().int().positive().optional().or(z.literal("")),
  transmission: z.string().optional(),
  ratio: z.string().optional(),
  apu: z.coerce.boolean().optional(),
  color: z.string().optional(),
  purchase_price: z.coerce.number().min(0).optional().or(z.literal("")),
  asking_price: z.coerce.number().min(0).optional().or(z.literal("")),
  min_price: z.coerce.number().min(0).optional().or(z.literal("")),
  source: z
    .enum(["auction", "fleet", "trade_in", "consignment", "private"])
    .optional(),
  notes: z.string().optional(),
});

const PREP_DEFAULTS: { step: PrepStepKind; assigned_role: "mechanic" | "office" }[] =
  [
    { step: "mechanical_inspection", assigned_role: "mechanic" },
    { step: "service_records", assigned_role: "office" },
    { step: "dot_inspection", assigned_role: "mechanic" },
    { step: "detailing", assigned_role: "mechanic" },
    { step: "clean_title", assigned_role: "office" },
  ];

export async function decodeVinAction(vin: string) {
  return decodeVin(vin);
}

export async function checkVinDuplicate(vin: string) {
  const { supabase } = await requireProfile();
  const cleaned = vin.trim().toUpperCase();
  const { data } = await supabase
    .from("trucks")
    .select("id, stock_no")
    .eq("vin", cleaned)
    .maybeSingle();
  return data;
}

export async function createTruckAction(formData: FormData) {
  const { profile, supabase } = await requireProfile();
  if (!canAddTruck(profile.role)) {
    return { error: "Your role cannot add trucks." };
  }

  const raw = Object.fromEntries(formData.entries());
  const parsed = addTruckSchema.safeParse({
    ...raw,
    apu: formData.get("apu") === "on" || formData.get("apu") === "true",
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid form" };
  }

  const v = parsed.data;
  const vin = v.vin.trim().toUpperCase();

  const { data: existing } = await supabase
    .from("trucks")
    .select("id, stock_no")
    .eq("vin", vin)
    .maybeSingle();
  if (existing) {
    return {
      error: `VIN already on stock No. ${existing.stock_no}`,
    };
  }

  const seeMoney = canSeeFinancials(profile.role);
  const insert = {
    vin,
    year: v.year,
    make: v.make,
    model: v.model,
    type: v.type as TruckType,
    miles: v.miles,
    engine: v.engine || null,
    hp: typeof v.hp === "number" ? v.hp : null,
    transmission: v.transmission || null,
    ratio: v.ratio || null,
    apu: Boolean(v.apu),
    color: v.color || null,
    status: "incoming" as const,
    purchase_date: new Date().toISOString().slice(0, 10),
    source: v.source || null,
    asking_price: typeof v.asking_price === "number" ? v.asking_price : null,
    purchase_price: seeMoney
      ? typeof v.purchase_price === "number"
        ? v.purchase_price
        : null
      : null,
    min_price: seeMoney
      ? typeof v.min_price === "number"
        ? v.min_price
        : null
      : null,
    sales_rep_id: profile.role === "sales" ? profile.id : null,
    notes: v.notes || null,
  };

  const { data: truck, error } = await supabase
    .from("trucks")
    .insert(insert)
    .select("id, stock_no")
    .single();

  if (error || !truck) {
    return { error: error?.message ?? "Could not create truck" };
  }

  await supabase.from("prep_steps").insert(
    PREP_DEFAULTS.map((p) => ({
      truck_id: truck.id,
      step: p.step,
      assigned_role: p.assigned_role,
      done: false,
    })),
  );

  await logActivity(
    supabase,
    profile.id,
    `added stock ${truck.stock_no} from a VIN scan`,
    truck.id,
  );

  revalidatePath("/inventory");
  redirect(`/trucks/${truck.id}`);
}

export async function uploadTruckPhotoAction(formData: FormData) {
  const { profile, supabase } = await requireProfile();
  const truckId = String(formData.get("truck_id") ?? "");
  const slot = String(formData.get("slot") ?? "") as PhotoSlot;
  const file = formData.get("file");

  if (!truckId || !slot || !(file instanceof File) || file.size === 0) {
    return { error: "Missing photo data" };
  }

  const ext = file.name.split(".").pop() || "jpg";
  const path = `${truckId}/${slot}-${Date.now()}.${ext}`;

  const { error: upErr } = await supabase.storage
    .from("truck-photos")
    .upload(path, file, { upsert: true, contentType: file.type });

  if (upErr) {
    return { error: upErr.message };
  }

  const { error } = await supabase.from("truck_photos").upsert(
    {
      truck_id: truckId,
      slot,
      file_path: path,
      sort: 0,
    },
    { onConflict: "truck_id,slot" },
  );

  if (error) return { error: error.message };

  const { data: truck } = await supabase
    .from("trucks")
    .select("stock_no")
    .eq("id", truckId)
    .single();

  await logActivity(
    supabase,
    profile.id,
    `uploaded ${slot.replaceAll("_", " ")} photo${truck ? ` on stock ${truck.stock_no}` : ""}`,
    truckId,
  );

  revalidatePath(`/trucks/${truckId}`);
  return { ok: true, path };
}

export async function togglePrepStepAction(formData: FormData) {
  const { profile, supabase } = await requireProfile();
  const stepId = String(formData.get("step_id") ?? "");
  const done = formData.get("done") === "true";

  const { data: step, error: fetchErr } = await supabase
    .from("prep_steps")
    .select("*, trucks(stock_no)")
    .eq("id", stepId)
    .single();

  if (fetchErr || !step) return { error: "Step not found" };

  if (
    profile.role !== "owner" &&
    profile.role !== "office" &&
    profile.role === "mechanic" &&
    step.assigned_role !== "mechanic"
  ) {
    return { error: "That prep step is not assigned to mechanics." };
  }

  const { error } = await supabase
    .from("prep_steps")
    .update({
      done,
      done_by: done ? profile.id : null,
      done_at: done ? new Date().toISOString() : null,
    })
    .eq("id", stepId);

  if (error) return { error: error.message };

  const trucksJoin = step.trucks as
    | { stock_no: number }
    | { stock_no: number }[]
    | null;
  const stock = (
    Array.isArray(trucksJoin) ? trucksJoin[0]?.stock_no : trucksJoin?.stock_no
  ) ?? "?";
  await logActivity(
    supabase,
    profile.id,
    `${done ? "checked off" : "reopened"} prep step on stock ${stock}`,
    step.truck_id,
  );

  revalidatePath(`/trucks/${step.truck_id}`);
  revalidatePath("/prep");
  revalidatePath("/today");
  return { ok: true };
}

