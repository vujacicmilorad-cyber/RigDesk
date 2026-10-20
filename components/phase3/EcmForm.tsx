"use client";

import { useState, useTransition } from "react";
import { saveEcmAction } from "@/lib/actions/phase3";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function EcmForm({
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
        Log ECM
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
          const res = await saveEcmAction(fd);
          if (res.error) setError(res.error);
          else setOpen(false);
        });
      }}
    >
      <div>
        <Label htmlFor="truck_id">Truck</Label>
        <select
          id="truck_id"
          name="truck_id"
          required
          className="mt-1 flex h-10 w-full rounded-lg border-[1.5px] border-line bg-surface px-3 text-sm"
        >
          {trucks.map((t) => (
            <option key={t.id} value={t.id}>
              No. {t.stock_no} — {t.year} {t.make} {t.model}
            </option>
          ))}
        </select>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <div>
          <Label htmlFor="engine_hours">Engine hours</Label>
          <Input id="engine_hours" name="engine_hours" type="number" min={0} step="0.1" required className="mt-1" />
        </div>
        <div>
          <Label htmlFor="idle_hours">Idle hours</Label>
          <Input id="idle_hours" name="idle_hours" type="number" min={0} step="0.1" required className="mt-1" />
        </div>
      </div>
      <div>
        <Label htmlFor="fault_codes">Fault codes</Label>
        <Input id="fault_codes" name="fault_codes" className="mt-1" placeholder="SPN …" />
      </div>
      <div>
        <Label htmlFor="file">ECM file</Label>
        <Input id="file" name="file" type="file" className="mt-1" />
      </div>
      {error && <p className="text-red text-sm">{error}</p>}
      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>{pending ? "Saving…" : "Save"}</Button>
        <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
      </div>
    </form>
  );
}
