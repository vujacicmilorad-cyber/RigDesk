"use client";

import { useState, useTransition } from "react";
import {
  checkVinDuplicate,
  createTruckAction,
  decodeVinAction,
} from "@/lib/actions/trucks";
import { guessTruckType } from "@/lib/vin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { TruckType } from "@/types/database";

export function AddTruckForm({ canSeeMoney }: { canSeeMoney: boolean }) {
  const [vin, setVin] = useState("1XPBD49X5RD614783");
  const [year, setYear] = useState("");
  const [make, setMake] = useState("");
  const [model, setModel] = useState("");
  const [engine, setEngine] = useState("");
  const [type, setType] = useState<TruckType>("sleeper");
  const [filled, setFilled] = useState(false);
  const [warn, setWarn] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [decoding, startDecode] = useTransition();
  const [saving, startSave] = useTransition();

  function decode() {
    setWarn(null);
    setError(null);
    startDecode(async () => {
      const dup = await checkVinDuplicate(vin);
      if (dup) {
        setWarn(`This VIN is already on stock No. ${dup.stock_no}`);
      }
      const result = await decodeVinAction(vin);
      if (result.error && !result.make) {
        setError(result.error);
        return;
      }
      if (result.year) setYear(String(result.year));
      if (result.make) setMake(result.make);
      if (result.model) setModel(result.model);
      if (result.engine) setEngine(result.engine);
      setType(guessTruckType(result.bodyClass));
      setFilled(true);
      if (result.error) setWarn(result.error);
    });
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startSave(async () => {
      const res = await createTruckAction(fd);
      if (res?.error) setError(res.error);
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4 max-w-2xl">
      <div className="vin flex gap-2">
        <Input
          name="vin"
          value={vin}
          onChange={(e) => setVin(e.target.value.toUpperCase())}
          aria-label="VIN"
          className="font-display text-xl font-semibold tracking-wider border-ink"
          required
          minLength={11}
          maxLength={17}
        />
        <Button type="button" onClick={decode} disabled={decoding}>
          {decoding ? "Reading…" : "Decode VIN"}
        </Button>
      </div>
      {warn && <p className="text-sm text-amber-ink font-medium text-[#5A4500]">{warn}</p>}
      {error && (
        <p className="text-sm text-red font-medium" role="alert">
          {error}
        </p>
      )}

      <div className="form grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        <div>
          <Label htmlFor="year">Year</Label>
          <Input
            id="year"
            name="year"
            value={year}
            onChange={(e) => setYear(e.target.value)}
            className={filled ? "filled border-sign bg-sign-soft mt-1" : "mt-1"}
            required
          />
        </div>
        <div>
          <Label htmlFor="make">Make</Label>
          <Input
            id="make"
            name="make"
            value={make}
            onChange={(e) => setMake(e.target.value)}
            className={filled ? "filled border-sign bg-sign-soft mt-1" : "mt-1"}
            required
          />
        </div>
        <div>
          <Label htmlFor="model">Model</Label>
          <Input
            id="model"
            name="model"
            value={model}
            onChange={(e) => setModel(e.target.value)}
            className={filled ? "filled border-sign bg-sign-soft mt-1" : "mt-1"}
            required
          />
        </div>
        <div>
          <Label htmlFor="type">Type</Label>
          <select
            id="type"
            name="type"
            value={type}
            onChange={(e) => setType(e.target.value as TruckType)}
            className="mt-1 flex h-10 w-full rounded-lg border-[1.5px] border-line bg-surface px-3 text-sm"
          >
            <option value="sleeper">Sleeper</option>
            <option value="day_cab">Day cab</option>
            <option value="box_truck">Box truck</option>
            <option value="trailer">Trailer</option>
          </select>
        </div>
        <div>
          <Label htmlFor="miles">Miles</Label>
          <Input id="miles" name="miles" type="number" min={0} defaultValue={0} className="mt-1" required />
        </div>
        <div>
          <Label htmlFor="engine">Engine</Label>
          <Input
            id="engine"
            name="engine"
            value={engine}
            onChange={(e) => setEngine(e.target.value)}
            className="mt-1"
          />
        </div>
        <div>
          <Label htmlFor="hp">HP</Label>
          <Input id="hp" name="hp" type="number" className="mt-1" />
        </div>
        <div>
          <Label htmlFor="transmission">Transmission</Label>
          <Input id="transmission" name="transmission" defaultValue="Automatic" className="mt-1" />
        </div>
        <div>
          <Label htmlFor="asking_price">Asking price</Label>
          <Input id="asking_price" name="asking_price" type="number" min={0} className="mt-1" />
        </div>
        {canSeeMoney && (
          <>
            <div>
              <Label htmlFor="purchase_price">Purchase price</Label>
              <Input id="purchase_price" name="purchase_price" type="number" min={0} className="mt-1" />
            </div>
            <div>
              <Label htmlFor="min_price">Minimum price</Label>
              <Input id="min_price" name="min_price" type="number" min={0} className="mt-1" />
            </div>
          </>
        )}
        <div>
          <Label htmlFor="source">Source</Label>
          <select
            id="source"
            name="source"
            className="mt-1 flex h-10 w-full rounded-lg border-[1.5px] border-line bg-surface px-3 text-sm"
            defaultValue="auction"
          >
            <option value="auction">Auction</option>
            <option value="fleet">Fleet</option>
            <option value="trade_in">Trade-in</option>
            <option value="consignment">Consignment</option>
            <option value="private">Private</option>
          </select>
        </div>
        <div className="flex items-end gap-2 pb-2">
          <input id="apu" name="apu" type="checkbox" className="accent-sign w-[18px] h-[18px]" />
          <Label htmlFor="apu">APU installed</Label>
        </div>
      </div>
      <div>
        <Label htmlFor="notes">Notes</Label>
        <Input id="notes" name="notes" className="mt-1" />
      </div>
      <Button type="submit" disabled={saving}>
        {saving ? "Saving…" : "Add truck"}
      </Button>
      <p className="hint text-muted text-[13.5px]">
        After save you can upload guided photos on the truck page. Duplicate VINs are blocked.
      </p>
    </form>
  );
}
