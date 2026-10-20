"use client";

import { useState, useTransition } from "react";
import { saveAppraisalAction } from "@/lib/actions/phase3";
import { decodeVinAction } from "@/lib/actions/trucks";
import { maxBuyPrice } from "@/types/database";
import { formatMoney } from "@/lib/money";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function AppraisalForm() {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [vin, setVin] = useState("");
  const [year, setYear] = useState("");
  const [make, setMake] = useState("");
  const [model, setModel] = useState("");
  const [expected, setExpected] = useState(90000);
  const [prep, setPrep] = useState(4000);
  const [profit, setProfit] = useState(8000);

  const max = maxBuyPrice(expected, prep, profit);

  if (!open) {
    return (
      <Button type="button" onClick={() => setOpen(true)}>
        New appraisal
      </Button>
    );
  }

  return (
    <form
      className="bg-surface border border-line rounded-[10px] p-4 space-y-3 w-full max-w-xl"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        setError(null);
        start(async () => {
          const res = await saveAppraisalAction(fd);
          if (res.error) setError(res.error);
          else setOpen(false);
        });
      }}
    >
      <div className="flex gap-2">
        <Input
          name="vin"
          value={vin}
          onChange={(e) => setVin(e.target.value.toUpperCase())}
          placeholder="VIN"
          required
          className="font-display tracking-wider"
        />
        <Button
          type="button"
          variant="outline"
          onClick={() =>
            start(async () => {
              const r = await decodeVinAction(vin);
              if (r.year) setYear(String(r.year));
              if (r.make) setMake(r.make);
              if (r.model) setModel(r.model);
            })
          }
        >
          Decode
        </Button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <div>
          <Label>Year</Label>
          <Input name="year" value={year} onChange={(e) => setYear(e.target.value)} className="mt-1" />
        </div>
        <div>
          <Label>Make</Label>
          <Input name="make" value={make} onChange={(e) => setMake(e.target.value)} className="mt-1" />
        </div>
        <div>
          <Label>Model</Label>
          <Input name="model" value={model} onChange={(e) => setModel(e.target.value)} className="mt-1" />
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <div>
          <Label>Miles</Label>
          <Input name="miles" type="number" min={0} defaultValue={300000} required className="mt-1" />
        </div>
        <div>
          <Label>Condition</Label>
          <select name="condition" defaultValue="good" className="mt-1 flex h-10 w-full rounded-lg border-[1.5px] border-line px-3 text-sm">
            <option value="excellent">Excellent</option>
            <option value="good">Good</option>
            <option value="fair">Fair</option>
            <option value="rough">Rough</option>
          </select>
        </div>
        <div>
          <Label>Expected sale</Label>
          <Input
            name="expected_sale_price"
            type="number"
            value={expected}
            onChange={(e) => setExpected(Number(e.target.value))}
            className="mt-1"
          />
        </div>
        <div>
          <Label>Planned prep</Label>
          <Input
            name="planned_prep"
            type="number"
            value={prep}
            onChange={(e) => setPrep(Number(e.target.value))}
            className="mt-1"
          />
        </div>
        <div>
          <Label>Target profit</Label>
          <Input
            name="target_profit"
            type="number"
            value={profit}
            onChange={(e) => setProfit(Number(e.target.value))}
            className="mt-1"
          />
        </div>
        <div className="flex flex-col justify-end">
          <span className="text-[12.5px] text-muted">Max buy</span>
          <span className="num text-2xl text-sign">{formatMoney(max)}</span>
        </div>
      </div>
      <div>
        <Label>Notes</Label>
        <Input name="notes" className="mt-1" />
      </div>
      {error && <p className="text-red text-sm">{error}</p>}
      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>{pending ? "Saving…" : "Save appraisal"}</Button>
        <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
      </div>
    </form>
  );
}
