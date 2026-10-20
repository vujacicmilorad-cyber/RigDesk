import { requireProfile } from "@/lib/auth";
import { StockPlate } from "@/components/ui/badge";
import { KeyActions } from "@/components/phase3/KeyActions";
import type { KeyLogEntry } from "@/types/database";
import { cn } from "@/lib/utils";

export default async function KeysPage() {
  const { supabase } = await requireProfile();

  const [{ data: entries }, { data: trucks }] = await Promise.all([
    supabase
      .from("key_log")
      .select("*, trucks(stock_no, year, make, model)")
      .order("taken_at", { ascending: false }),
    supabase
      .from("trucks_visible")
      .select("id, stock_no, year, make, model")
      .not("status", "in", '("sold","delivered")')
      .order("stock_no"),
  ]);

  const list = (entries ?? []) as KeyLogEntry[];
  const open = list.filter((e) => !e.returned_at);

  return (
    <div>
      <div className="top flex justify-between items-end gap-4 flex-wrap mb-5">
        <div>
          <h1>Key log</h1>
          <div className="sub text-muted mt-1">
            Who took which key and when it came back. Keys out over 24 hours are
            flagged on Today.
          </div>
        </div>
        <KeyActions trucks={trucks ?? []} />
      </div>

      <div className="crew grid grid-cols-2 gap-3 mb-4">
        <div className="panel bg-surface border border-line rounded-[10px] px-4 py-3">
          <div className="num text-[28px] leading-none">{open.length}</div>
          <span className="sub text-muted text-sm">keys out now</span>
        </div>
        <div className="panel bg-surface border border-line rounded-[10px] px-4 py-3">
          <div className="num text-[28px] leading-none">
            {
              open.filter(
                (e) =>
                  Date.now() - new Date(e.taken_at).getTime() >
                  24 * 60 * 60 * 1000,
              ).length
            }
          </div>
          <span className="sub text-muted text-sm">out over 24 hours</span>
        </div>
      </div>

      <section className="panel bg-surface border border-line rounded-[10px] overflow-hidden">
        <div className="md:overflow-x-auto">
          <table className="data-table w-full text-[14.5px]">
            <thead>
              <tr className="text-muted text-[13px] text-left">
                <th className="px-3.5 py-2 border-b border-line">Truck</th>
                <th className="px-3.5 py-2 border-b border-line">Taken by</th>
                <th className="px-3.5 py-2 border-b border-line">Out</th>
                <th className="px-3.5 py-2 border-b border-line">Returned</th>
                <th className="px-3.5 py-2 border-b border-line">Notes</th>
                <th className="px-3.5 py-2 border-b border-line" />
              </tr>
            </thead>
            <tbody>
              {list.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3.5 py-8 text-muted">
                    No key movements yet.
                  </td>
                </tr>
              ) : (
                list.map((e) => {
                  const hoursOut =
                    (Date.now() - new Date(e.taken_at).getTime()) /
                    (1000 * 60 * 60);
                  const late = !e.returned_at && hoursOut > 24;
                  return (
                    <tr key={e.id}>
                      <td
                        data-label="Truck"
                        className="card-title px-3.5 py-2 border-b border-line"
                      >
                        {e.trucks ? (
                          <>
                            <StockPlate stockNo={e.trucks.stock_no} />{" "}
                            {e.trucks.model}
                          </>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td
                        data-label="Taken by"
                        className="px-3.5 py-2 border-b border-line"
                      >
                        {e.taken_by_name}
                      </td>
                      <td
                        data-label="Out"
                        className={cn(
                          "px-3.5 py-2 border-b border-line text-sm",
                          late && "text-red font-semibold",
                        )}
                      >
                        {new Date(e.taken_at).toLocaleString("en-US")}
                        {late && " · >24h"}
                      </td>
                      <td
                        data-label="Returned"
                        className="px-3.5 py-2 border-b border-line text-sm"
                      >
                        {e.returned_at
                          ? new Date(e.returned_at).toLocaleString("en-US")
                          : "Out"}
                      </td>
                      <td
                        data-label="Notes"
                        className="px-3.5 py-2 border-b border-line text-sm text-muted"
                      >
                        {e.notes ?? "—"}
                      </td>
                      <td className="card-actions px-3.5 py-2 border-b border-line text-right">
                        {!e.returned_at && <KeyActions returnId={e.id} />}
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
