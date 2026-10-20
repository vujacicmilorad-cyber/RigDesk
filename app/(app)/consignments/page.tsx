import { requireProfile } from "@/lib/auth";
import { redirect } from "next/navigation";
import { formatMoney } from "@/lib/money";
import { StockPlate } from "@/components/ui/badge";
import { ConsignmentForm } from "@/components/phase3/ConsignmentForm";
import {
  FEE_TYPE_LABEL,
  PAYOUT_STATUS_LABEL,
  type Consignment,
} from "@/types/database";
import { cn } from "@/lib/utils";

export default async function ConsignmentsPage() {
  const { profile, supabase } = await requireProfile();
  if (!["owner", "office"].includes(profile.role)) redirect("/today");

  const [{ data }, { data: trucks }] = await Promise.all([
    supabase
      .from("consignments")
      .select("*, trucks(stock_no, year, make, model)")
      .order("created_at", { ascending: false }),
    supabase
      .from("trucks_visible")
      .select("id, stock_no, year, make, model")
      .order("stock_no"),
  ]);

  const list = (data ?? []) as Consignment[];

  return (
    <div>
      <div className="top flex justify-between items-end gap-4 flex-wrap mb-5">
        <div>
          <h1>Consignments</h1>
          <div className="sub text-muted mt-1">
            Owner, agreed net, fee type (flat / percent / over net), end date and
            payout status.
          </div>
        </div>
        <ConsignmentForm trucks={trucks ?? []} />
      </div>

      <section className="panel bg-surface border border-line rounded-[10px] overflow-hidden">
        <div className="md:overflow-x-auto">
          <table className="data-table w-full text-[14.5px]">
            <thead>
              <tr className="text-muted text-[13px] text-left">
                <th className="px-3.5 py-2 border-b border-line">Truck</th>
                <th className="px-3.5 py-2 border-b border-line">Owner</th>
                <th className="px-3.5 py-2 border-b border-line text-right">
                  Agreed net
                </th>
                <th className="px-3.5 py-2 border-b border-line">Fee</th>
                <th className="px-3.5 py-2 border-b border-line">Ends</th>
                <th className="px-3.5 py-2 border-b border-line">Payout</th>
              </tr>
            </thead>
            <tbody>
              {list.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3.5 py-8 text-muted">
                    No consignments on the books.
                  </td>
                </tr>
              ) : (
                list.map((c) => {
                  const fee =
                    c.fee_type === "percent"
                      ? `${Number(c.fee_value)}%`
                      : formatMoney(c.fee_value);
                  const endingSoon =
                    c.end_date &&
                    (new Date(c.end_date).getTime() - Date.now()) /
                      (1000 * 60 * 60 * 24) <=
                      14;
                  return (
                    <tr key={c.id}>
                      <td
                        data-label="Truck"
                        className="card-title px-3.5 py-2 border-b border-line"
                      >
                        {c.trucks ? (
                          <>
                            <StockPlate stockNo={c.trucks.stock_no} />{" "}
                            {c.trucks.model}
                          </>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td
                        data-label="Owner"
                        className="px-3.5 py-2 border-b border-line"
                      >
                        {c.owner_name}
                      </td>
                      <td
                        data-label="Agreed net"
                        className="px-3.5 py-2 border-b border-line text-right num"
                      >
                        {formatMoney(c.agreed_net)}
                      </td>
                      <td
                        data-label="Fee"
                        className="px-3.5 py-2 border-b border-line text-sm"
                      >
                        {FEE_TYPE_LABEL[c.fee_type]} · {fee}
                      </td>
                      <td
                        data-label="Ends"
                        className={cn(
                          "px-3.5 py-2 border-b border-line text-sm",
                          endingSoon && "text-red font-semibold",
                        )}
                      >
                        {c.end_date ?? "—"}
                      </td>
                      <td
                        data-label="Payout"
                        className="px-3.5 py-2 border-b border-line"
                      >
                        <span
                          className={cn(
                            "inline-block px-2 py-0.5 rounded-full text-[12.5px] font-semibold border-[1.5px]",
                            c.payout_status === "paid" &&
                              "bg-sign-soft border-sign",
                            c.payout_status === "pending" &&
                              "bg-amber-soft border-amber",
                            c.payout_status === "partial" && "border-line",
                          )}
                        >
                          {PAYOUT_STATUS_LABEL[c.payout_status]}
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
    </div>
  );
}
