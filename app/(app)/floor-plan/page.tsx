import Link from "next/link";
import { requireProfile } from "@/lib/auth";
import { redirect } from "next/navigation";
import { formatMoney } from "@/lib/money";
import { StockPlate } from "@/components/ui/badge";
import { interestToDate, type FloorPlan } from "@/types/database";
import { cn } from "@/lib/utils";

export default async function FloorPlanPage() {
  const { profile, supabase } = await requireProfile();
  if (!["owner", "office"].includes(profile.role)) redirect("/today");

  const { data } = await supabase
    .from("floor_plan")
    .select(
      "*, trucks(stock_no, year, make, model, status)",
    )
    .order("next_curtailment_date", { ascending: true });

  const rows = (data ?? []) as FloorPlan[];

  return (
    <div>
      <div className="top mb-5">
        <h1>Floor plan</h1>
        <div className="sub text-muted mt-1">
          Lender, financed amount, daily interest, interest to date, and
          curtailment dates. Amber warns inside 7 days.
        </div>
      </div>

      <section className="panel bg-surface border border-line rounded-[10px] overflow-hidden">
        <div className="md:overflow-x-auto">
          <table className="data-table w-full text-[14.5px]">
            <thead>
              <tr className="text-muted text-[13px] text-left">
                <th className="px-3.5 py-2 border-b border-line">Truck</th>
                <th className="px-3.5 py-2 border-b border-line">Lender</th>
                <th className="px-3.5 py-2 border-b border-line text-right">
                  Financed
                </th>
                <th className="px-3.5 py-2 border-b border-line text-right">
                  Daily rate
                </th>
                <th className="px-3.5 py-2 border-b border-line text-right">
                  Interest to date
                </th>
                <th className="px-3.5 py-2 border-b border-line">Curtailment</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3.5 py-8 text-muted">
                    No floor-plan lines yet.
                  </td>
                </tr>
              ) : (
                rows.map((r) => {
                  const interest = interestToDate(
                    Number(r.financed_amount),
                    Number(r.daily_interest_rate),
                    r.start_date,
                  );
                  const curt = r.next_curtailment_date
                    ? new Date(r.next_curtailment_date)
                    : null;
                  const daysLeft = curt
                    ? Math.ceil(
                        (curt.getTime() - Date.now()) / (1000 * 60 * 60 * 24),
                      )
                    : null;
                  const warn =
                    daysLeft !== null && daysLeft >= 0 && daysLeft <= 7;
                  const overdue = daysLeft !== null && daysLeft < 0;

                  return (
                    <tr key={r.id}>
                      <td
                        data-label="Truck"
                        className="card-title px-3.5 py-2 border-b border-line"
                      >
                        {r.trucks ? (
                          <Link
                            href={`/trucks/${r.truck_id}`}
                            className="hover:underline"
                          >
                            <StockPlate stockNo={r.trucks.stock_no} />{" "}
                            <span className="ml-1">
                              {r.trucks.year} {r.trucks.model}
                            </span>
                          </Link>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td
                        data-label="Lender"
                        className="px-3.5 py-2 border-b border-line"
                      >
                        {r.lender_name}
                      </td>
                      <td
                        data-label="Financed"
                        className="px-3.5 py-2 border-b border-line text-right num"
                      >
                        {formatMoney(r.financed_amount)}
                      </td>
                      <td
                        data-label="Daily rate"
                        className="px-3.5 py-2 border-b border-line text-right num"
                      >
                        {(Number(r.daily_interest_rate) * 100).toFixed(3)}%/day
                      </td>
                      <td
                        data-label="Interest to date"
                        className="px-3.5 py-2 border-b border-line text-right num"
                      >
                        {formatMoney(interest)}
                      </td>
                      <td
                        data-label="Curtailment"
                        className={cn(
                          "px-3.5 py-2 border-b border-line",
                          warn && "text-[#5A4500] font-semibold",
                          overdue && "text-red font-semibold",
                        )}
                      >
                        {curt ? curt.toLocaleDateString("en-US") : "—"}
                        {warn && " · due soon"}
                        {overdue && " · overdue"}
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
