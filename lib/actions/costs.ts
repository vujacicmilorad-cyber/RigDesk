"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { logActivity, requireProfile } from "@/lib/auth";
import { canWriteCosts } from "@/lib/roles";

const costSchema = z.object({
  truck_id: z.string().uuid().optional().or(z.literal("")),
  category: z.string().min(1),
  vendor: z.string().optional(),
  amount: z.coerce.number().min(0),
  date: z.string().min(1),
});

export async function addCostAction(formData: FormData) {
  const { profile, supabase } = await requireProfile();
  if (!canWriteCosts(profile.role)) {
    return { error: "Your role cannot add costs." };
  }

  const parsed = costSchema.safeParse({
    truck_id: formData.get("truck_id") || "",
    category: formData.get("category"),
    vendor: formData.get("vendor") || "",
    amount: formData.get("amount"),
    date: formData.get("date") || new Date().toISOString().slice(0, 10),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid cost" };
  }

  const v = parsed.data;
  const truckId = v.truck_id || null;
  let receiptPath: string | null = null;
  const file = formData.get("receipt");

  if (file instanceof File && file.size > 0) {
    const ext = file.name.split(".").pop() || "jpg";
    const path = `${profile.id}/${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage
      .from("receipts")
      .upload(path, file, { contentType: file.type, upsert: false });
    if (upErr) return { error: upErr.message };
    receiptPath = path;
  }

  const { error } = await supabase.from("costs").insert({
    truck_id: truckId,
    category: v.category,
    vendor: v.vendor || null,
    amount: v.amount,
    date: v.date,
    receipt_path: receiptPath,
  });

  if (error) return { error: error.message };

  let stockLabel = "company overhead";
  if (truckId) {
    const { data: truck } = await supabase
      .from("trucks")
      .select("stock_no")
      .eq("id", truckId)
      .single();
    if (truck) stockLabel = `stock ${truck.stock_no}`;
  }

  await logActivity(
    supabase,
    profile.id,
    `added a $${Math.round(v.amount).toLocaleString("en-US")} ${v.category.toLowerCase()} receipt to ${stockLabel}`,
    truckId,
  );

  revalidatePath("/costs");
  revalidatePath("/today");
  if (truckId) revalidatePath(`/trucks/${truckId}`);
  return { ok: true };
}
