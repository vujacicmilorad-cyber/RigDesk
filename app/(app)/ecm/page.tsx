import { requireProfile } from "@/lib/auth";
import { StockPlate } from "@/components/ui/badge";
import { EcmForm } from "@/components/phase3/EcmForm";
import { idlePercent, type EcmReport } from "@/types/database";
import { cn } from "@/lib/utils";

export default async function EcmPage() {
  const { profile, supabase } = await requireProfile();

  const [{ data: reports }, { data: trucks }] = await Promise.all([
    supabase
      .from("ecm_reports")
      .select("*, trucks(stock_no, year, make, model)")
      .order("created_at", { ascending: false }),
    supabase
      .from("trucks_visible")
      .select("id, stock_no, year, make, model")
      .not("status", "in", '("sold","delivered")')
      .order("stock_no"),
  ]);

  const list = (reports ?? []) as EcmReport[];
  const canWrite = ["owner", "office", "mechanic"].includes(profile.role);

  return (
    <div>
      <div className="top flex justify-between items-end gap-4 flex-wrap mb-5">
        <div>
          <h1>ECM reports</h1>
          <div className="sub text-muted mt-1">
            Engine hours, idle hours, idle %, fault codes and file upload. Idle
            above 40% is flagged.
          </div>
        </div>
        {canWrite && <EcmForm trucks={trucks ?? []} />}
      </div>

      <section className="panel bg-surface border border-line rounded-[10px] overflow-hidden">
        <div className="md:overflow-x-auto">
          <table className="data-table w-full text-[14.5px]">
            <thead>
              <tr className="text-muted text-[13px] text-left">
                <th className="px-3.5 py-2 border-b border-line">Truck</th>
                <th className="px-3.5 py-2 border-b border-line text-right">
                  Engine hrs
                </th>
                <th className="px-3.5 py-2 border-b border-line text-right">
                  Idle hrs
                </th>
                <th className="px-3.5 py-2 border-b border-line text-right">
                  Idle %
                </th>
                <th className="px-3.5 py-2 border-b border-line">Faults</th>
                <th className="px-3.5 py-2 border-b border-line">Logged</th>
              </tr>
            </thead>
            <tbody>
              {list.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3.5 py-8 text-muted">
                    No ECM reports yet. Log one after a download.
                  </td>
                </tr>
              ) : (
                list.map((r) => {
                  const pct = idlePercent(
                    Number(r.engine_hours),
                    Number(r.idle_hours),
                  );
                  const high = pct > 40;
                  return (
                    <tr key={r.id}>
                      <td
                        data-label="Truck"
                        className="card-title px-3.5 py-2 border-b border-line"
                      >
                        {r.trucks ? (
                          <>
                            <StockPlate stockNo={r.trucks.stock_no} />{" "}
                            {r.trucks.year} {r.trucks.model}
                          </>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td
                        data-label="Engine hrs"
                        className="px-3.5 py-2 border-b border-line text-right num"
                      >
                        {Number(r.engine_hours).toLocaleString("en-US")}
                      </td>
                      <td
                        data-label="Idle hrs"
                        className="px-3.5 py-2 border-b border-line text-right num"
                      >
                        {Number(r.idle_hours).toLocaleString("en-US")}
                      </td>
                      <td
                        data-label="Idle %"
                        className={cn(
                          "px-3.5 py-2 border-b border-line text-right num",
                          high && "text-red font-semibold",
                        )}
                      >
                        {pct.toFixed(1)}%{high ? " ⚠" : ""}
                      </td>
                      <td
                        data-label="Faults"
                        className="px-3.5 py-2 border-b border-line text-sm"
                      >
                        {r.fault_codes ?? "—"}
                      </td>
                      <td
                        data-label="Logged"
                        className="px-3.5 py-2 border-b border-line text-sm text-muted"
                      >
                        {new Date(r.created_at).toLocaleDateString("en-US")}
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
