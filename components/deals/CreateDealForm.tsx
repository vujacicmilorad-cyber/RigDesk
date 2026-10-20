"use client";

import { useState, useTransition } from "react";
import { createDealAction } from "@/lib/actions/deals";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type CustomerOpt = { id: string; name: string; type: string };
type TruckOpt = {
  id: string;
  stock_no: number;
  year: number;
  make: string;
  model: string;
  asking_price: number | string | null;
  status: string;
};
type LeadOpt = {
  id: string;
  customer_id: string;
  truck_id: string | null;
  customers?: { name: string } | null;
};

export function CreateDealForm({
  customers,
  trucks,
  leads = [],
  defaultCustomerId,
  defaultTruckId,
  defaultLeadId,
  compact,
}: {
  customers: CustomerOpt[];
  trucks: TruckOpt[];
  leads?: LeadOpt[];
  defaultCustomerId?: string;
  defaultTruckId?: string;
  defaultLeadId?: string;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(
    Boolean(defaultLeadId || defaultCustomerId || defaultTruckId),
  );
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [customerId, setCustomerId] = useState(defaultCustomerId ?? "");
  const [truckId, setTruckId] = useState(defaultTruckId ?? "");
  const [leadId, setLeadId] = useState(defaultLeadId ?? "");

  const selectedTruck = trucks.find((t) => t.id === truckId);
  const ask = selectedTruck?.asking_price != null ? Number(selectedTruck.asking_price) : "";

  if (!open) {
    return (
      <Button type="button" onClick={() => setOpen(true)} size={compact ? "sm" : "default"}>
        {compact ? "Start deal" : "New deal"}
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
          const res = await createDealAction(fd);
          if (res.error) setError(res.error);
          else {
            setOpen(false);
            e.currentTarget.reset();
          }
        });
      }}
    >
      <h3 className="font-display text-xl">New deal</h3>
      <input type="hidden" name="lead_id" value={leadId} />

      {!defaultLeadId && leads.length > 0 && (
        <div>
          <Label htmlFor="from_lead">From lead (optional)</Label>
          <select
            id="from_lead"
            className="mt-1 flex h-10 w-full rounded-lg border-[1.5px] border-line bg-surface px-3 text-sm"
            value={leadId}
            onChange={(e) => {
              const id = e.target.value;
              setLeadId(id);
              const lead = leads.find((l) => l.id === id);
              if (lead) {
                setCustomerId(lead.customer_id);
                if (lead.truck_id) setTruckId(lead.truck_id);
              }
            }}
          >
            <option value="">Pick customer + truck below</option>
            {leads.map((l) => (
              <option key={l.id} value={l.id}>
                {l.customers?.name ?? "Lead"}
              </option>
            ))}
          </select>
        </div>
      )}

      <div>
        <Label htmlFor="customer_id">Customer</Label>
        <select
          id="customer_id"
          name="customer_id"
          required
          value={customerId}
          onChange={(e) => setCustomerId(e.target.value)}
          className="mt-1 flex h-10 w-full rounded-lg border-[1.5px] border-line bg-surface px-3 text-sm"
        >
          <option value="">Select…</option>
          {customers.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <Label htmlFor="truck_id">Truck</Label>
        <select
          id="truck_id"
          name="truck_id"
          required
          value={truckId}
          onChange={(e) => setTruckId(e.target.value)}
          className="mt-1 flex h-10 w-full rounded-lg border-[1.5px] border-line bg-surface px-3 text-sm"
        >
          <option value="">Select…</option>
          {trucks.map((t) => (
            <option key={t.id} value={t.id}>
              No. {t.stock_no} · {t.year} {t.make} {t.model} ({t.status.replace("_", " ")})
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <div>
          <Label htmlFor="price">Sale price</Label>
          <Input
            id="price"
            name="price"
            type="number"
            min={1}
            step="100"
            required
            defaultValue={ask || ""}
            className="mt-1"
          />
        </div>
        <div>
          <Label htmlFor="warranty_price">Warranty</Label>
          <Input
            id="warranty_price"
            name="warranty_price"
            type="number"
            min={0}
            step="100"
            defaultValue={0}
            className="mt-1"
          />
        </div>
        <div>
          <Label htmlFor="down_payment">Down</Label>
          <Input
            id="down_payment"
            name="down_payment"
            type="number"
            min={0}
            step="100"
            defaultValue={5000}
            className="mt-1"
          />
        </div>
      </div>

      <div>
        <Label htmlFor="notes">Notes</Label>
        <Input id="notes" name="notes" className="mt-1" placeholder="Optional" />
      </div>

      {error && (
        <p className="text-red text-sm" role="alert">
          {error}
        </p>
      )}

      <div className="flex gap-2 flex-wrap">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Open deal"}
        </Button>
        <Button type="button" variant="outline" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
