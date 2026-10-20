"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { logActivity, requireProfile } from "@/lib/auth";
import type { DocumentStatus, DocumentType } from "@/types/database";

export async function upsertDocumentAction(formData: FormData) {
  const { profile, supabase } = await requireProfile();
  if (!["owner", "office"].includes(profile.role)) {
    return { error: "Owner or office only" };
  }

  const schema = z.object({
    truck_id: z.string().uuid(),
    deal_id: z.string().uuid().optional().or(z.literal("")),
    type: z.enum([
      "inspection_report",
      "spec_sheet",
      "dot_certificate",
      "title",
      "deposit_receipt",
      "buyer_order",
      "bill_of_sale",
      "odometer_statement",
      "delivery_checklist",
    ]),
    status: z.enum(["not_yet", "waiting_for_signature", "signed", "in_hand"]),
    document_id: z.string().uuid().optional().or(z.literal("")),
  });

  const parsed = schema.safeParse({
    truck_id: formData.get("truck_id"),
    deal_id: formData.get("deal_id") || "",
    type: formData.get("type"),
    status: formData.get("status") || "not_yet",
    document_id: formData.get("document_id") || "",
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid" };
  }

  const v = parsed.data;
  const file = formData.get("file");
  let filePath: string | null = null;

  if (file instanceof File && file.size > 0) {
    const ext = file.name.split(".").pop() || "bin";
    const path = `${v.truck_id}/${v.type}-${Date.now()}.${ext}`;
    const buf = Buffer.from(await file.arrayBuffer());
    const { error: upErr } = await supabase.storage
      .from("documents")
      .upload(path, buf, { contentType: file.type || "application/octet-stream", upsert: true });
    if (upErr) return { error: upErr.message };
    filePath = path;
  }

  if (v.document_id) {
    const patch: Record<string, unknown> = {
      status: v.status as DocumentStatus,
    };
    if (filePath) patch.file_path = filePath;
    const { error } = await supabase
      .from("documents")
      .update(patch)
      .eq("id", v.document_id);
    if (error) return { error: error.message };
  } else {
    const { error } = await supabase.from("documents").insert({
      truck_id: v.truck_id,
      deal_id: v.deal_id || null,
      type: v.type as DocumentType,
      status: v.status as DocumentStatus,
      file_path: filePath,
      created_by: profile.id,
    });
    if (error) return { error: error.message };
  }

  await logActivity(
    supabase,
    profile.id,
    `updated document ${v.type.replace(/_/g, " ")}`,
    v.truck_id,
  );

  revalidatePath(`/trucks/${v.truck_id}`);
  revalidatePath("/deals");
  return { ok: true };
}

export async function updateDocumentStatusAction(
  documentId: string,
  status: DocumentStatus,
) {
  const { profile, supabase } = await requireProfile();
  if (!["owner", "office", "sales"].includes(profile.role)) {
    return { error: "Not allowed" };
  }

  const { data: doc } = await supabase
    .from("documents")
    .select("id, truck_id, type")
    .eq("id", documentId)
    .single();
  if (!doc) return { error: "Not found" };

  const { error } = await supabase
    .from("documents")
    .update({ status })
    .eq("id", documentId);
  if (error) return { error: error.message };

  await logActivity(
    supabase,
    profile.id,
    `set ${String(doc.type).replace(/_/g, " ")} to ${status.replace(/_/g, " ")}`,
    doc.truck_id,
  );

  if (doc.truck_id) revalidatePath(`/trucks/${doc.truck_id}`);
  revalidatePath("/deals");
  return { ok: true };
}
