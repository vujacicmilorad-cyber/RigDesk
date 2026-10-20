import { requireProfile } from "@/lib/auth";
import { canSeeFinancials } from "@/lib/roles";
import { formatMoney, ownerOnlyMoney } from "@/lib/money";
import { daysOnLot } from "@/components/inventory/TruckRow";
import { ExportCsvButton } from "@/components/reports/ExportCsvButton";
import {
  LEAD_SOURCE_LABEL,
  type Lead,
  type LeadSource,
  type Truck,
} from "@/types/database";

export default async function ReportsPage() {
  const { profile, supabase } = await requireProfile();
  const canSeeMoney = canSeeFinancials(profile.role);
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const [
    { data: trucks },
    { data: costs },
    { data: leads },
    { data: deals },
    { data: goals },
    { data: reps },
  ] = await Promise.all([
    supabase.from("trucks_visible").select("*"),
    supabase.from("costs_visible").select("truck_id, amount"),
    supabase.from("leads").select("*, profiles(name)"),
    supabase
      .from("deals")
      .select("*, profiles(name), trucks(stock_no, make, model)")
      .eq("stage", "sold"),
    supabase.from("rep_goals").select("*").gte("month", monthStart.toISOString().slice(0, 10)),
    supabase.from("profiles").select("*").eq("role", "sales").eq("active", true),
  ]);

  const list = (trucks ?? []) as Truck[];
  const costMap = new Map<string, number>();
  for (const c of costs ?? []) {
    if (!c.truck_id || c.amount == null) continue;
    costMap.set(c.truck_id, (costMap.get(c.truck_id) ?? 0) + Number(c.amount));
  }

  const profitOf = (t: Truck) => {
    const ask = Number(t.asking_price ?? 0);
    const buy = t.purchase_price != null ? Number(t.purchase_price) : null;
    if (buy === null) return null;
    return ask - buy - (costMap.get(t.id) ?? 0);
  };

  // Sold per month (last 6 months) from deals.sold_at or truck
  const months: { label: string; key: string; count: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    months.push({
      label: d.toLocaleString("en-US", { month: "short" }),
      key,
      count: 0,
    });
  }
  for (const d of deals ?? []) {
    const when = d.sold_at ? new Date(d.sold_at) : new Date(d.created_at);
    const key = `${when.getFullYear()}-${String(when.getMonth() + 1).padStart(2, "0")}`;
    const m = months.find((x) => x.key === key);
    if (m) m.count += 1;
  }
  const maxSold = Math.max(1, ...months.map((m) => m.count));

  const leadList = (leads ?? []) as Lead[];
  const bySource: Record<string, number> = {};
  for (const l of leadList) {
    bySource[l.source] = (bySource[l.source] ?? 0) + 1;
  }
  const sources = Object.entries(bySource).sort((a, b) => b[1] - a[1]);
  const srcMax = sources[0]?.[1] ?? 1;

  const onLot = list
    .filter((t) => t.status !== "sold" && t.status !== "delivered")
    .map((t) => ({ t, days: daysOnLot(t.purchase_date) }))
    .sort((a, b) => b.days - a.days);

  const byProfit = [...list]
    .map((t) => ({ t, p: profitOf(t) }))
    .filter((x) => x.p !== null)
    .sort((a, b) => (b.p ?? 0) - (a.p ?? 0));
  const pMax = byProfit[0]?.p ?? 1;

  const teamRows = (reps ?? []).map((r) => {
    const mineLeads = leadList.filter((l) => l.sales_rep_id === r.id).length;
    const sold = (deals ?? []).filter((d) => d.sales_rep_id === r.id);
    let profit = 0;
    for (const d of sold) {
      const truck = list.find((t) => t.id === d.truck_id);
      if (!truck || truck.purchase_price == null) continue;
      profit +=
        Number(d.price) -
        Number(truck.purchase_price) -
        (costMap.get(truck.id) ?? 0);
    }
    const goal = (goals ?? []).find((g) => g.sales_rep_id === r.id);
    return {
      name: r.name,
      id: r.id,
      leads: mineLeads,
      sold: sold.length,
      profit,
      commission: profit * 0.1,
      targetUnits: goal?.target_units ?? 0,
      targetProfit: Number(goal?.target_profit ?? 0),
    };
  });

  const exportRows = teamRows.map((r) => [
    r.name,
    r.leads,
    r.sold,
    Math.round(r.profit),
    Math.round(r.commission),
    r.targetUnits,
    Math.round(r.targetProfit),
  ]);

  return (
    <div>
      <div className="top flex justify-between items-end gap-4 flex-wrap mb-5">
        <div>
          <h1>Reports</h1>
          <div className="sub text-muted mt-1">
            Sold units, lead sources, days on lot, profit and goals vs actual.
          </div>
        </div>
        <ExportCsvButton
          filename="rigdesk-sales-team.csv"
          headers={[
            "Rep",
            "Leads",
            "Sold",
            "Profit",
            "Commission",
            "Goal units",
            "Goal profit",
          ]}
          rows={exportRows}
        />
      </div>

      <div className="cols grid grid-cols-1 md:grid-cols-2 gap-[18px]">
        <section className="panel bg-surface border border-line rounded-[10px]">
          <div className="panel-h flex justify-between px-[18px] pt-3.5 pb-2">
            <h2>Trucks sold per month</h2>
            <small className="text-muted">last 6 months</small>
          </div>
          <div className="bars flex items-end gap-3.5 h-[170px] px-[18px] pt-2.5">
            {months.map((m, i) => (
              <div
                key={m.key}
                className="bar flex-1 flex flex-col items-center justify-end gap-1 h-full"
              >
                <span className="num text-[18px] text-ink">{m.count}</span>
                <b
                  className={`block w-full max-w-[54px] rounded-t ${
                    i === months.length - 1 ? "bg-amber" : "bg-sign"
                  }`}
                  style={{ height: `${(m.count / maxSold) * 72}%`, minHeight: 4 }}
                />
                <span className="text-[12.5px] text-muted">{m.label}</span>
              </div>
            ))}
          </div>
          <div className="h-3" />
        </section>

        <section className="panel bg-surface border border-line rounded-[10px]">
          <div className="panel-h flex justify-between px-[18px] pt-3.5 pb-2">
            <h2>Where leads come from</h2>
            <small className="text-muted">share of leads</small>
          </div>
          <div className="pb-3">
            {sources.length === 0 ? (
              <p className="px-[18px] text-muted text-sm">No leads yet.</p>
            ) : (
              sources.map(([src, n]) => (
                <div
                  key={src}
                  className="hbar grid grid-cols-[minmax(64px,150px)_1fr_44px] gap-2.5 items-center px-[18px] py-1.5"
                >
                  <span>{LEAD_SOURCE_LABEL[src as LeadSource] ?? src}</span>
                  <i
                    className="block h-3 rounded-md bg-sign"
                    style={{ width: `${(n / srcMax) * 100}%` }}
                  />
                  <span className="num text-right">
                    {Math.round((n / leadList.length) * 100)}%
                  </span>
                </div>
              ))
            )}
          </div>
        </section>
      </div>

      <div className="cols grid grid-cols-1 md:grid-cols-2 gap-[18px] mt-[18px]">
        <section className="panel bg-surface border border-line rounded-[10px]">
          <div className="panel-h flex justify-between px-[18px] pt-3.5 pb-2">
            <h2>Days on the lot</h2>
            <small className="text-muted">red is past 60 days</small>
          </div>
          <div className="pb-3">
            {onLot.map(({ t, days }) => (
              <div
                key={t.id}
                className="hbar grid grid-cols-[minmax(64px,150px)_1fr_44px] gap-2.5 items-center px-[18px] py-1.5"
              >
                <span>
                  No. {t.stock_no} {t.model}
                </span>
                <i
                  className={`block h-3 rounded-md ${days > 60 ? "bg-red" : "bg-sign"}`}
                  style={{ width: `${Math.max(2, (days / 80) * 100)}%` }}
                />
                <span className="num text-right">{days}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="panel bg-surface border border-line rounded-[10px]">
          <div className="panel-h flex justify-between px-[18px] pt-3.5 pb-2">
            <h2>Profit per truck</h2>
            <small className="text-muted">after all costs</small>
          </div>
          <div className="pb-3">
            {!canSeeMoney ? (
              <p className="px-[18px] text-muted text-sm">Owner only</p>
            ) : (
              byProfit.map(({ t, p }) => (
                <div
                  key={t.id}
                  className="hbar grid grid-cols-[minmax(64px,150px)_1fr_44px] gap-2.5 items-center px-[18px] py-1.5"
                >
                  <span>
                    No. {t.stock_no} {t.model}
                  </span>
                  <i
                    className="block h-3 rounded-md bg-sign"
                    style={{ width: `${((p ?? 0) / (pMax || 1)) * 100}%` }}
                  />
                  <span className="num text-right">
                    {Math.round((p ?? 0) / 1000)}k
                  </span>
                </div>
              ))
            )}
          </div>
        </section>
      </div>

      <section className="panel bg-surface border border-line rounded-[10px] mt-[18px] overflow-hidden">
        <div className="panel-h flex justify-between px-[18px] pt-3.5 pb-2">
          <h2>Sales team</h2>
          <small className="text-muted">
            this month · commission at 10% of profit · goals vs actual
          </small>
        </div>
        <div className="md:overflow-x-auto">
          <table className="data-table w-full text-[14.5px]">
            <thead>
              <tr className="text-muted text-[13px] text-left">
                <th className="px-3.5 py-2 border-b border-line">Rep</th>
                <th className="px-3.5 py-2 border-b border-line text-right">Leads</th>
                <th className="px-3.5 py-2 border-b border-line text-right">Sold</th>
                <th className="px-3.5 py-2 border-b border-line text-right">Goal</th>
                <th className="px-3.5 py-2 border-b border-line text-right">Profit</th>
                <th className="px-3.5 py-2 border-b border-line text-right">
                  Target $
                </th>
                <th className="px-3.5 py-2 border-b border-line text-right">
                  Commission
                </th>
              </tr>
            </thead>
            <tbody>
              {teamRows.map((r) => (
                <tr key={r.id}>
                  <td
                    data-label="Rep"
                    className="card-title px-3.5 py-2 border-b border-line"
                  >
                    <b>{r.name}</b>
                  </td>
                  <td
                    data-label="Leads"
                    className="px-3.5 py-2 border-b border-line text-right num"
                  >
                    {r.leads}
                  </td>
                  <td
                    data-label="Sold"
                    className="px-3.5 py-2 border-b border-line text-right num"
                  >
                    {r.sold}
                  </td>
                  <td
                    data-label="Goal"
                    className="px-3.5 py-2 border-b border-line text-right num"
                  >
                    {r.targetUnits}
                  </td>
                  <td
                    data-label="Profit"
                    className="px-3.5 py-2 border-b border-line text-right num"
                  >
                    {ownerOnlyMoney(r.profit, canSeeMoney)}
                  </td>
                  <td
                    data-label="Target $"
                    className="px-3.5 py-2 border-b border-line text-right num"
                  >
                    {ownerOnlyMoney(r.targetProfit, canSeeMoney)}
                  </td>
                  <td
                    data-label="Commission"
                    className="px-3.5 py-2 border-b border-line text-right num"
                  >
                    {canSeeMoney || profile.id === r.id
                      ? formatMoney(r.commission)
                      : "Owner only"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
