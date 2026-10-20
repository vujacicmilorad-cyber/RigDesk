"use client";

import { useState, useTransition } from "react";
import { saveConsignmentAction } from "@/lib/actions/phase3";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ConsignmentForm({
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
        Add consignment
      </Button>
    );
  }

  return (
    <form
      className="bg-surface border border-line rounded-[10px] p-4 space-y-3 w-full max-w-lg"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        setError(null);
        start(async () => {
          const res = await saveConsignmentAction(fd);
          if (res.error) setError(res.error);
          else setOpen(false);
        });
      }}
    >
      <div>
        <Label>Truck</Label>
        <select name="truck_id" required className="mt-1 flex h-10 w-full rounded-lg border-[1.5px] border-line px-3 text-sm">
          {trucks.map((t) => (
            <option key={t.id} value={t.id}>
              No. {t.stock_no} — {t.year} {t.make} {t.model}
            </option>
          ))}
        </select>
      </div>
      <div>
        <Label>Owner name</Label>
        <Input name="owner_name" required className="mt-1" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <div>
          <Label>Agreed net</Label>
          <Input name="agreed_net" type="number" min={0} required className="mt-1" />
        </div>
        <div>
          <Label>Fee type</Label>
          <select name="fee_type" defaultValue="percent" className="mt-1 flex h-10 w-full rounded-lg border-[1.5px] border-line px-3 text-sm">
            <option value="flat">Flat</option>
            <option value="percent">Percent</option>
            <option value="over_net">Over net</option>
          </select>
        </div>
        <div>
          <Label>Fee value</Label>
          <Input name="fee_value" type="number" min={0} defaultValue={8} required className="mt-1" />
        </div>
        <div>
          <Label>End date</Label>
          <Input name="end_date" type="date" className="mt-1" />
        </div>
      </div>
      <input type="hidden" name="payout_status" value="pending" />
      <div>
        <Label>Notes</Label>
        <Input name="notes" className="mt-1" />
      </div>
      {error && <p className="text-red text-sm">{error}</p>}
      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>{pending ? "Saving…" : "Save"}</Button>
        <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
      </div>
    </form>
  );
}
