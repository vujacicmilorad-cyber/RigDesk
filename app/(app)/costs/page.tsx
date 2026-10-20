import { requireProfile } from "@/lib/auth";
import { canSeeFinancials, canWriteCosts } from "@/lib/roles";
import { formatMoney } from "@/lib/money";
import { StockPlate } from "@/components/ui/badge";
import { AddCostForm } from "@/components/costs/AddCostForm";
import type { Cost, Truck } from "@/types/database";
import { cn } from "@/lib/utils";

export default async function CostsPage() {
  const { profile, supabase } = await requireProfile();
  const canSeeMoney = canSeeFinancials(profile.role);

  const [{ data: costs }, { data: trucks }] = await Promise.all([
    supabase
      .from("costs_visible")
      .select("*")
      .order("date", { ascending: false }),
    supabase.from("trucks_visible").select("id, stock_no, model").order("stock_no"),
  ]);

  const rows = (costs ?? []) as Cost[];
  const truckList = (trucks ?? []) as Pick<Truck, "id" | "stock_no" | "model">[];
  const stockById = new Map(truckList.map((t) => [t.id, t]));

  if (!canSeeMoney && profile.role === "sales") {
    return (
      <div>
        <div className="top mb-5">
          <h1>Costs</h1>
          <div className="sub text-muted mt-1">Owner only</div>
        </div>
        <div className="panel bg-surface border border-line rounded-[10px] p-6 text-muted">
          Prep costs and purchase numbers are hidden for sales reps. Ask an
          owner or office teammate if you need a receipt logged.
        </div>
      </div>
    );
  }

  const cats: Record<string, number> = {};
  const perTruck: Record<string, number> = {};
  let total = 0;
  for (const c of rows) {
    const amt = Number(c.amount ?? 0);
    if (Number.isNaN(amt)) continue;
    total += amt;
    cats[c.category] = (cats[c.category] ?? 0) + amt;
    if (c.truck_id) {
      perTruck[c.truck_id] = (perTruck[c.truck_id] ?? 0) + amt;
    }
  }
  const catKeys = Object.keys(cats).sort((a, b) => cats[b] - cats[a]);
  const catMax = cats[catKeys[0]] || 1;
  const overhead = rows.filter((c) => !c.truck_id);

  return (
    <div>
      <div className="top flex justify-between items-end gap-4 flex-wrap mb-5">
        <div>
          <h1>Costs</h1>
          <div className="sub text-muted mt-1">
            Anyone can photograph a receipt. The cost lands on the right truck
            for everyone to see.
          </div>
        </div>
        {canWriteCosts(profile.role) && <AddCostForm trucks={truckList} />}
      </div>

      {!canSeeMoney ? (
        <p className="text-muted mb-4">Amounts show as Owner only for your role.</p>
      ) : null}

      <div className="cols grid grid-cols-1 md:grid-cols-2 gap-[18px]">
        <section className="panel bg-surface border border-line rounded-[10px]">
          <div className="panel-h flex justify-between px-[18px] pt-3.5 pb-2">
            <h2>By category</h2>
            <small className="text-muted">
              {canSeeMoney ? formatMoney(total) : "Owner only"} total
            </small>
          </div>
          <div className="pb-3">
            {catKeys.length === 0 ? (
              <p className="px-[18px] text-muted text-sm">No costs yet.</p>
            ) : (
              catKeys.map((k) => (
                <div
                  key={k}
                  className="hbar grid grid-cols-[minmax(64px,150px)_1fr_64px] gap-2.5 items-center px-[18px] py-1.5"
                >
                  <span className="truncate">{k}</span>
                  <i
                    className="block h-3 rounded-md bg-sign"
                    style={{
                      width: `${canSeeMoney ? (cats[k] / catMax) * 100 : 0}%`,
                    }}
                  />
                  <span className="num text-right">
                    {canSeeMoney ? formatMoney(cats[k]) : "—"}
                  </span>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="panel bg-surface border border-line rounded-[10px]">
          <div className="panel-h flex justify-between px-[18px] pt-3.5 pb-2">
            <h2>Prep cost per truck</h2>
            <small className="text-muted">against a $5,000 budget</small>
          </div>
          <div className="pb-3">
            {truckList.map((t) => {
              const r = perTruck[t.id] ?? 0;
              return (
                <div
                  key={t.id}
                  className="hbar grid grid-cols-[minmax(64px,150px)_1fr_64px] gap-2.5 items-center px-[18px] py-1.5"
                >
                  <span className="truncate">
                    No. {t.stock_no} {t.model}
                  </span>
                  <i
                    className={cn(
                      "block h-3 rounded-md bg-sign",
                      r > 5000 && "bg-red",
                    )}
                    style={{
                      width: `${canSeeMoney ? Math.min(100, (r / 6000) * 100) : 0}%`,
                    }}
                  />
                  <span className="num text-right">
                    {canSeeMoney ? formatMoney(r) : "—"}
                  </span>
                </div>
              );
            })}
          </div>
        </section>
      </div>

      {overhead.length > 0 && (
        <section className="panel bg-surface border border-line rounded-[10px] mt-[18px]">
          <div className="panel-h px-[18px] pt-3.5 pb-2">
            <h2>Company overhead</h2>
          </div>
          <div className="px-[18px] pb-4 text-sm text-muted">
            {overhead.length} receipt{overhead.length === 1 ? "" : "s"} not tied
            to a truck
            {canSeeMoney
              ? ` · ${formatMoney(
                  overhead.reduce((a, c) => a + Number(c.amount ?? 0), 0),
                )}`
              : ""}
          </div>
        </section>
      )}

      <section className="panel bg-surface border border-line rounded-[10px] mt-[18px] overflow-hidden">
        <div className="panel-h flex justify-between px-[18px] pt-3.5 pb-2">
          <h2>All receipts</h2>
          <small className="text-muted">{rows.length} entries</small>
        </div>
        <div className="md:overflow-x-auto">
          <table className="data-table w-full text-[14.5px]">
            <thead>
              <tr className="text-muted text-[13px] text-left">
                <th className="px-3.5 py-2 border-b border-line">Stock</th>
                <th className="px-3.5 py-2 border-b border-line">Category</th>
                <th className="px-3.5 py-2 border-b border-line">Vendor</th>
                <th className="px-3.5 py-2 border-b border-line text-right">
                  Amount
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-3.5 py-6 text-muted">
                    No receipts yet. Snap one to get started.
                  </td>
                </tr>
              ) : (
                rows.slice(0, 40).map((c) => {
                  const t = c.truck_id ? stockById.get(c.truck_id) : null;
                  return (
                    <tr key={c.id}>
                      <td
                        data-label="Stock"
                        className="card-title px-3.5 py-2 border-b border-line"
                      >
                        {t ? (
                          <StockPlate stockNo={t.stock_no} />
                        ) : (
                          <span className="text-muted">Overhead</span>
                        )}
                      </td>
                      <td
                        data-label="Category"
                        className="px-3.5 py-2 border-b border-line"
                      >
                        {c.category}
                      </td>
                      <td
                        data-label="Vendor"
                        className="px-3.5 py-2 border-b border-line"
                      >
                        {c.vendor ?? "—"}
                      </td>
                      <td
                        data-label="Amount"
                        className="px-3.5 py-2 border-b border-line text-right num"
                      >
                        {canSeeMoney ? formatMoney(c.amount) : "Owner only"}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
