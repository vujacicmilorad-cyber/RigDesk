"use client";

import { useState, useTransition } from "react";
import { advanceLeadAction, createLeadAction } from "@/lib/actions/leads";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LEAD_STATUS_LABEL, type LeadStatus } from "@/types/database";

export function AdvanceLeadButton({
  leadId,
  status,
}: {
  leadId: string;
  status: LeadStatus;
}) {
  const [pending, start] = useTransition();
  const order: LeadStatus[] = ["new", "contacted", "viewing", "won"];
  const idx = order.indexOf(status);
  if (idx < 0 || idx >= 2) {
    // allow up to viewing -> can still go to won via... demo only advances to next of new/contacted/viewing
  }
  if (status === "won" || status === "lost" || status === "viewing") {
    // demo allows advance while st < 3, so viewing can go to won
  }
  const nextMap: Partial<Record<LeadStatus, LeadStatus>> = {
    new: "contacted",
    contacted: "viewing",
    viewing: "won",
  };
  const next = nextMap[status];
  if (!next) return null;

  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      disabled={pending}
      onClick={() =>
        start(async () => {
          await advanceLeadAction(leadId);
        })
      }
    >
      Mark {LEAD_STATUS_LABEL[next].toLowerCase()}
    </Button>
  );
}

export function LogLeadForm({
  trucks,
}: {
  trucks: { id: string; stock_no: number; year: number; make: string; model: string }[];
}) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (!open) {
    return (
      <Button type="button" onClick={() => setOpen(true)}>
        Log a lead
      </Button>
    );
  }

  return (
    <form
      className="bg-surface border border-line rounded-[10px] p-4 space-y-3 w-full max-w-md"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        setError(null);
        start(async () => {
          const res = await createLeadAction(fd);
          if (res.error) setError(res.error);
          else setOpen(false);
        });
      }}
    >
      <div>
        <Label htmlFor="customer_name">Buyer name</Label>
        <Input id="customer_name" name="customer_name" required className="mt-1" />
      </div>
      <div>
        <Label htmlFor="customer_type">Type</Label>
        <select
          id="customer_type"
          name="customer_type"
          className="mt-1 flex h-10 w-full rounded-lg border-[1.5px] border-line bg-surface px-3 text-sm"
          defaultValue="owner_operator"
        >
          <option value="owner_operator">Owner-operator</option>
          <option value="fleet">Fleet</option>
        </select>
      </div>
      <div>
        <Label htmlFor="truck_id">Truck</Label>
        <select
          id="truck_id"
          name="truck_id"
          className="mt-1 flex h-10 w-full rounded-lg border-[1.5px] border-line bg-surface px-3 text-sm"
          defaultValue={trucks[0]?.id ?? ""}
        >
          {trucks.map((t) => (
            <option key={t.id} value={t.id}>
              No. {t.stock_no} — {t.year} {t.make} {t.model}
            </option>
          ))}
        </select>
      </div>
      <div>
        <Label htmlFor="source">Source</Label>
        <select
          id="source"
          name="source"
          className="mt-1 flex h-10 w-full rounded-lg border-[1.5px] border-line bg-surface px-3 text-sm"
          defaultValue="phone"
        >
          <option value="website">Website</option>
          <option value="phone">Phone</option>
          <option value="walk_in">Walk-in</option>
          <option value="truck_paper">Truck Paper</option>
          <option value="instagram">Instagram</option>
          <option value="tiktok">TikTok</option>
          <option value="referral">Referral</option>
        </select>
      </div>
      {error && <p className="text-red text-sm">{error}</p>}
      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save lead"}
        </Button>
        <Button type="button" variant="outline" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
