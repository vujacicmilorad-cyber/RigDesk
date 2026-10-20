"use server";

import { revalidatePath } from "next/cache";
import { logActivity, requireProfile } from "@/lib/auth";
import { togglePrepStepAction } from "@/lib/actions/trucks";

export { togglePrepStepAction };

export async function markArrivedAction(truckId: string) {
  const { profile, supabase } = await requireProfile();
  if (!["owner", "office", "mechanic", "sales"].includes(profile.role)) {
    return { error: "Not allowed" };
  }

  const { data: truck, error: fetchErr } = await supabase
    .from("trucks")
    .select("id, stock_no, status")
    .eq("id", truckId)
    .single();

  if (fetchErr || !truck) return { error: "Truck not found" };
  if (truck.status !== "incoming") {
    return { error: "Only incoming trucks can be marked arrived" };
  }

  const { error } = await supabase
    .from("trucks")
    .update({ status: "in_prep" })
    .eq("id", truckId);

  if (error) return { error: error.message };

  await logActivity(
    supabase,
    profile.id,
    `marked stock ${truck.stock_no} as arrived, prep checklist opened`,
    truckId,
  );

  revalidatePath("/prep");
  revalidatePath("/inventory");
  revalidatePath(`/trucks/${truckId}`);
  revalidatePath("/today");
  return { ok: true };
}

export async function publishListingAction(truckId: string) {
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
  if (truck.status !== "in_prep") {
    return { error: "Only trucks in prep can be published" };
  }

  const { data: steps } = await supabase
    .from("prep_steps")
    .select("done")
    .eq("truck_id", truckId);

  if (!steps || steps.some((s) => !s.done) || steps.length < 5) {
    return { error: "All five prep steps must be done first" };
  }

  const { error } = await supabase
    .from("trucks")
    .update({ status: "available", available_at: new Date().toISOString() })
    .eq("id", truckId);

  if (error) return { error: error.message };

  await logActivity(
    supabase,
    profile.id,
    `marked stock ${truck.stock_no} as Available`,
    truckId,
  );

  revalidatePath("/prep");
  revalidatePath("/inventory");
  revalidatePath(`/trucks/${truckId}`);
  revalidatePath("/today");
  return { ok: true };
}
