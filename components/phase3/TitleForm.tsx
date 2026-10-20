"use client";

import { useState, useTransition } from "react";
import { updateTitleAction } from "@/lib/actions/phase3";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function TitleForm({
  trucks,
}: {
  trucks: { id: string; stock_no: number; year: number; make: string; model: string; vin?: string }[];
}) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (!open) {
    return (
      <Button type="button" onClick={() => setOpen(true)}>
        Update title
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
          const res = await updateTitleAction(fd);
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
        <Label>Location</Label>
        <Input name="location" required defaultValue="File cabinet" className="mt-1" />
      </div>
      <div>
        <Label>Due date</Label>
        <Input name="due_date" type="date" className="mt-1" />
      </div>
      <label className="flex gap-2 items-center text-sm">
        <input type="checkbox" name="in_hand" className="accent-sign w-[18px] h-[18px]" />
        Title in hand
      </label>
      {error && <p className="text-red text-sm">{error}</p>}
      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>{pending ? "Saving…" : "Save"}</Button>
        <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
      </div>
    </form>
  );
}
