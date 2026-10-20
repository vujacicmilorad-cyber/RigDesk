"use client";

import { useState, useTransition } from "react";
import { addCostAction } from "@/lib/actions/costs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function AddCostForm({
  trucks,
}: {
  trucks: { id: string; stock_no: number; model: string }[];
}) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (!open) {
    return (
      <Button type="button" onClick={() => setOpen(true)}>
        Snap a receipt
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
          const res = await addCostAction(fd);
          if (res.error) setError(res.error);
          else {
            setOpen(false);
            e.currentTarget.reset();
          }
        });
      }}
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        <div className="col-span-2">
          <Label htmlFor="truck_id">Truck (blank = overhead)</Label>
          <select
            id="truck_id"
            name="truck_id"
            className="mt-1 flex h-10 w-full rounded-lg border-[1.5px] border-line bg-surface px-3 text-sm"
            defaultValue=""
          >
            <option value="">Company overhead</option>
            {trucks.map((t) => (
              <option key={t.id} value={t.id}>
                No. {t.stock_no} {t.model}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label htmlFor="category">Category</Label>
          <Input
            id="category"
            name="category"
            required
            defaultValue="Detailing"
            className="mt-1"
          />
        </div>
        <div>
          <Label htmlFor="vendor">Vendor</Label>
          <Input id="vendor" name="vendor" defaultValue="ShineLine Detail" className="mt-1" />
        </div>
        <div>
          <Label htmlFor="amount">Amount</Label>
          <Input
            id="amount"
            name="amount"
            type="number"
            min={0}
            step="0.01"
            required
            defaultValue={185}
            className="mt-1"
          />
        </div>
        <div>
          <Label htmlFor="date">Date</Label>
          <Input
            id="date"
            name="date"
            type="date"
            defaultValue={new Date().toISOString().slice(0, 10)}
            className="mt-1"
          />
        </div>
        <div className="col-span-2">
          <Label htmlFor="receipt">Receipt photo</Label>
          <Input id="receipt" name="receipt" type="file" accept="image/*" className="mt-1" />
        </div>
      </div>
      {error && <p className="text-red text-sm">{error}</p>}
      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save cost"}
        </Button>
        <Button type="button" variant="outline" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
