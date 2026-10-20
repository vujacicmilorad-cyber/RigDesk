import { requireProfile } from "@/lib/auth";
import { StockPlate } from "@/components/ui/badge";
import { TitleForm } from "@/components/phase3/TitleForm";
import type { TitleRecord, Truck } from "@/types/database";
import { cn } from "@/lib/utils";

export default async function TitlesPage() {
  const { profile, supabase } = await requireProfile();
  const canWrite = ["owner", "office"].includes(profile.role);

  const [{ data: titles }, { data: trucks }] = await Promise.all([
    supabase
      .from("titles")
      .select("*, trucks(stock_no, year, make, model, status, vin)")
      .order("due_date", { ascending: true, nullsFirst: false }),
    supabase.from("trucks_visible").select("id, stock_no, year, make, model, vin").order("stock_no"),
  ]);

  const list = (titles ?? []) as TitleRecord[];
  const titledIds = new Set(list.map((t) => t.truck_id));
  const missing = ((trucks ?? []) as Truck[]).filter(
    (t) => !titledIds.has(t.id) && t.status !== "delivered",
  );

  return (
    <div>
      <div className="top flex justify-between items-end gap-4 flex-wrap mb-5">
        <div>
          <h1>Title tracking</h1>
          <div className="sub text-muted mt-1">
            Where the title is and when it is due. Marking a deal sold without a
            title in hand needs owner approval.
          </div>
        </div>
        {canWrite && <TitleForm trucks={trucks ?? []} />}
      </div>

      <section className="panel bg-surface border border-line rounded-[10px] overflow-hidden mb-4">
        <div className="md:overflow-x-auto">
          <table className="data-table w-full text-[14.5px]">
            <thead>
              <tr className="text-muted text-[13px] text-left">
                <th className="px-3.5 py-2 border-b border-line">Truck</th>
                <th className="px-3.5 py-2 border-b border-line">Location</th>
                <th className="px-3.5 py-2 border-b border-line">Due</th>
                <th className="px-3.5 py-2 border-b border-line">Status</th>
              </tr>
            </thead>
            <tbody>
              {list.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-3.5 py-8 text-muted">
                    No title records yet.
                  </td>
                </tr>
              ) : (
                list.map((t) => {
                  const dueSoon =
                    t.due_date &&
                    !t.in_hand &&
                    (new Date(t.due_date).getTime() - Date.now()) /
                      (1000 * 60 * 60 * 24) <=
                      7;
                  return (
                    <tr key={t.id}>
                      <td
                        data-label="Truck"
                        className="card-title px-3.5 py-2 border-b border-line"
                      >
                        {t.trucks ? (
                          <>
                            <StockPlate stockNo={t.trucks.stock_no} />{" "}
                            {t.trucks.year} {t.trucks.model}
                          </>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td
                        data-label="Location"
                        className="px-3.5 py-2 border-b border-line"
                      >
                        {t.location}
                      </td>
                      <td
                        data-label="Due"
                        className={cn(
                          "px-3.5 py-2 border-b border-line text-sm",
                          dueSoon && "text-red font-semibold",
                        )}
                      >
                        {t.due_date ?? "—"}
                      </td>
                      <td
                        data-label="Status"
                        className="px-3.5 py-2 border-b border-line"
                      >
                        <span
                          className={cn(
                            "inline-block px-2 py-0.5 rounded-full text-[12.5px] font-semibold border-[1.5px]",
                            t.in_hand
                              ? "bg-sign-soft border-sign"
                              : "bg-amber-soft border-amber",
                          )}
                        >
                          {t.in_hand ? "In hand" : "Not in hand"}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      {missing.length > 0 && (
        <section className="panel bg-surface border border-line rounded-[10px] p-[14px_18px]">
          <h2 className="mb-2">Trucks without a title record</h2>
          <ul className="text-sm space-y-1">
            {missing.map((t) => (
              <li key={t.id}>
                <StockPlate stockNo={t.stock_no} /> {t.year} {t.make} {t.model}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
