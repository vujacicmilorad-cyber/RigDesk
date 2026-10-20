"use client";

import { useState, useTransition } from "react";
import { returnKeyAction, takeKeyAction } from "@/lib/actions/phase3";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function KeyActions({
  trucks,
  returnId,
}: {
  trucks?: { id: string; stock_no: number; year: number; make: string; model: string }[];
  returnId?: string;
}) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (returnId) {
    return (
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={pending}
        onClick={() =>
          start(async () => {
            await returnKeyAction(returnId);
          })
        }
      >
        Return
      </Button>
    );
  }

  if (!trucks) return null;

  if (!open) {
    return (
      <Button type="button" onClick={() => setOpen(true)}>
        Take keys
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
          const res = await takeKeyAction(fd);
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
          className="mt-1 flex h-10 w-full rounded-lg border-[1.5px] border-line px-3 text-sm"
        >
          {trucks.map((t) => (
            <option key={t.id} value={t.id}>
              No. {t.stock_no} — {t.year} {t.make} {t.model}
            </option>
          ))}
        </select>
      </div>
      <div>
        <Label htmlFor="notes">Notes</Label>
        <Input id="notes" name="notes" className="mt-1" />
      </div>
      {error && <p className="text-red text-sm">{error}</p>}
      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Check out"}
        </Button>
        <Button type="button" variant="outline" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
