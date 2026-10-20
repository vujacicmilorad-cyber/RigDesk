import Link from "next/link";
import { requireProfile } from "@/lib/auth";
import { canAddTruck, canSeeFinancials } from "@/lib/roles";
import { StatusChips } from "@/components/inventory/StatusChips";
import { TruckRow } from "@/components/inventory/TruckRow";
import { Button } from "@/components/ui/button";
import type { Truck, TruckStatus } from "@/types/database";

type SearchParams = Promise<{ status?: string; q?: string }>;

export default async function InventoryPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { profile, supabase } = await requireProfile();
  const params = await searchParams;
  const status = (params.status as TruckStatus | "all" | undefined) ?? "all";
  const q = (params.q ?? "").trim();

  let query = supabase
    .from("trucks_visible")
    .select("*")
    .order("stock_no", { ascending: true });

  if (status !== "all") {
    query = query.eq("status", status);
  }
  if (q) {
    const asNum = Number(q);
    if (!Number.isNaN(asNum) && q.length <= 5) {
      query = query.or(
        `vin.ilike.%${q}%,make.ilike.%${q}%,model.ilike.%${q}%,stock_no.eq.${asNum}`,
      );
    } else {
      query = query.or(
        `vin.ilike.%${q}%,make.ilike.%${q}%,model.ilike.%${q}%`,
      );
    }
  }

  const { data: trucks, error } = await query;
  const { data: allTrucks } = await supabase
    .from("trucks_visible")
    .select("status");

  const counts: Record<string, number> = { all: allTrucks?.length ?? 0 };
  for (const t of allTrucks ?? []) {
    counts[t.status] = (counts[t.status] ?? 0) + 1;
  }

  const canSeeMoney = canSeeFinancials(profile.role);
  const list = (trucks ?? []) as Truck[];

  return (
    <div>
      <div className="top flex justify-between items-end gap-4 flex-wrap mb-5">
        <div>
          <h1>Inventory</h1>
          <div className="sub text-muted mt-1">
            Open a truck to see its numbers, photos, costs, documents and
            history.
          </div>
        </div>
        {canAddTruck(profile.role) && (
          <Button asChild>
            <Link href="/trucks/new">Add a truck</Link>
          </Button>
        )}
      </div>

      <StatusChips current={status} counts={counts} />

      <form className="mb-3.5 max-w-md">
        <input type="hidden" name="status" value={status} />
        <input
          name="q"
          defaultValue={q}
          placeholder="Search VIN, stock number, make…"
          className="flex h-10 w-full rounded-lg border-[1.5px] border-line bg-surface px-3 text-sm"
        />
      </form>

      {error && (
        <p className="text-red text-sm mb-3" role="alert">
          Could not load inventory: {error.message}
        </p>
      )}

      <div className="panel bg-surface border border-line rounded-[10px] overflow-hidden">
        <div className="inventory-head row grid grid-cols-[86px_76px_1.6fr_1fr_1fr_0.6fr_1fr_110px] gap-3 items-center px-4 pt-3 pb-2 text-muted text-[13px]">
          <span>Stock</span>
          <span />
          <span>Truck</span>
          <span className="text-right">Miles</span>
          <span className="text-right">Asking</span>
          <span className="text-right">Days</span>
          <span className="text-right">Profit</span>
          <span>Status</span>
        </div>
        {list.length === 0 ? (
          <div className="px-4 py-8 text-muted">
            No trucks with this filter. Add a truck or pick another status.
          </div>
        ) : (
          list.map((truck) => (
            <TruckRow
              key={truck.id}
              truck={truck}
              canSeeMoney={canSeeMoney}
            />
          ))
        )}
      </div>
    </div>
  );
}
