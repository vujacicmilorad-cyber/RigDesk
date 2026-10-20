import { requireProfile } from "@/lib/auth";
import { StockPlate } from "@/components/ui/badge";
import { PREP_STEP_LABEL, type PrepStep, type Truck } from "@/types/database";

function daysBetween(a: string, b: string): number {
  const ms =
    new Date(b).getTime() - new Date(a).getTime();
  return Math.max(0, Math.round(ms / (1000 * 60 * 60 * 24)));
}

export default async function TimeToLinePage() {
  const { supabase } = await requireProfile();

  const [{ data: trucks }, { data: steps }] = await Promise.all([
    supabase
      .from("trucks_visible")
      .select("*")
      .not("available_at", "is", null)
      .order("available_at", { ascending: false }),
    supabase
      .from("prep_steps")
      .select("*")
      .eq("done", true)
      .not("done_at", "is", null),
  ]);

  const list = (trucks ?? []) as Truck[];
  const rows = list
    .filter((t) => t.purchase_date && t.available_at)
    .map((t) => ({
      t,
      days: daysBetween(t.purchase_date!, t.available_at!),
    }));

  const avg =
    rows.length === 0
      ? 0
      : Math.round(rows.reduce((a, r) => a + r.days, 0) / rows.length);

  // Longest prep step: average hours from truck created_at / purchase to done_at per step kind
  const stepList = (steps ?? []) as PrepStep[];
  const truckById = new Map(list.map((t) => [t.id, t]));
  const byKind: Record<string, number[]> = {};
  for (const s of stepList) {
    const truck = truckById.get(s.truck_id);
    const start = truck?.purchase_date ?? s.created_at;
    if (!s.done_at) continue;
    const hrs =
      (new Date(s.done_at).getTime() - new Date(start).getTime()) /
      (1000 * 60 * 60);
    if (!byKind[s.step]) byKind[s.step] = [];
    byKind[s.step].push(Math.max(0, hrs));
  }
  const stepAvgs = Object.entries(byKind)
    .map(([step, hrs]) => ({
      step,
      avgDays: hrs.reduce((a, b) => a + b, 0) / hrs.length / 24,
    }))
    .sort((a, b) => b.avgDays - a.avgDays);
  const slowest = stepAvgs[0];

  return (
    <div>
      <div className="top mb-5">
        <h1>Time to line</h1>
        <div className="sub text-muted mt-1">
          Days from purchase to Available. Average across the lot, and which
          prep step takes longest.
        </div>
      </div>

      <div className="crew grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
        <div className="panel bg-surface border border-line rounded-[10px] px-4 py-3">
          <div className="num text-[28px] leading-none">{avg}</div>
          <span className="sub text-muted text-sm">average days to Available</span>
        </div>
        <div className="panel bg-surface border border-line rounded-[10px] px-4 py-3">
          <div className="num text-[28px] leading-none">{rows.length}</div>
          <span className="sub text-muted text-sm">trucks with a line date</span>
        </div>
        <div className="panel bg-surface border border-line rounded-[10px] px-4 py-3 col-span-2 md:col-span-1">
          <div className="num text-xl leading-tight">
            {slowest
              ? PREP_STEP_LABEL[slowest.step as keyof typeof PREP_STEP_LABEL]
              : "—"}
          </div>
          <span className="sub text-muted text-sm">
            slowest prep step
            {slowest ? ` · ~${slowest.avgDays.toFixed(1)} days` : ""}
          </span>
        </div>
      </div>

      <section className="panel bg-surface border border-line rounded-[10px] overflow-hidden mb-4">
        <div className="panel-h px-[18px] pt-3.5 pb-2">
          <h2>Per truck</h2>
        </div>
        <div className="md:overflow-x-auto">
          <table className="data-table w-full text-[14.5px]">
            <thead>
              <tr className="text-muted text-[13px] text-left">
                <th className="px-3.5 py-2 border-b border-line">Stock</th>
                <th className="px-3.5 py-2 border-b border-line">Truck</th>
                <th className="px-3.5 py-2 border-b border-line">Purchased</th>
                <th className="px-3.5 py-2 border-b border-line">Available</th>
                <th className="px-3.5 py-2 border-b border-line text-right">
                  Days
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-3.5 py-8 text-muted">
                    No trucks have been marked Available yet.
                  </td>
                </tr>
              ) : (
                rows.map(({ t, days }) => (
                  <tr key={t.id}>
                    <td
                      data-label="Stock"
                      className="card-title px-3.5 py-2 border-b border-line"
                    >
                      <StockPlate stockNo={t.stock_no} />
                    </td>
                    <td
                      data-label="Truck"
                      className="px-3.5 py-2 border-b border-line"
                    >
                      {t.year} {t.make} {t.model}
                    </td>
                    <td
                      data-label="Purchased"
                      className="px-3.5 py-2 border-b border-line"
                    >
                      {t.purchase_date}
                    </td>
                    <td
                      data-label="Available"
                      className="px-3.5 py-2 border-b border-line"
                    >
                      {t.available_at
                        ? new Date(t.available_at).toLocaleDateString("en-US")
                        : "—"}
                    </td>
                    <td
                      data-label="Days"
                      className="px-3.5 py-2 border-b border-line text-right num"
                    >
                      {days}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel bg-surface border border-line rounded-[10px]">
        <div className="panel-h px-[18px] pt-3.5 pb-2">
          <h2>Prep step duration</h2>
          <small className="text-muted">avg days from purchase to check-off</small>
        </div>
        <div className="pb-3">
          {stepAvgs.length === 0 ? (
            <p className="px-[18px] text-muted text-sm">Not enough prep data yet.</p>
          ) : (
            stepAvgs.map((s) => (
              <div
                key={s.step}
                className="hbar grid grid-cols-[minmax(90px,220px)_1fr_64px] gap-2.5 items-center px-[18px] py-1.5"
              >
                <span>
                  {PREP_STEP_LABEL[s.step as keyof typeof PREP_STEP_LABEL]}
                </span>
                <i
                  className="block h-3 rounded-md bg-sign"
                  style={{
                    width: `${Math.min(100, (s.avgDays / (slowest?.avgDays || 1)) * 100)}%`,
                  }}
                />
                <span className="num text-right">{s.avgDays.toFixed(1)}</span>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
