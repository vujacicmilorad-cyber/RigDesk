import Link from "next/link";
import { requireProfile } from "@/lib/auth";
import { StockPlate } from "@/components/ui/badge";
import {
  AdvanceLeadButton,
  LogLeadForm,
} from "@/components/leads/LeadActions";
import { Button } from "@/components/ui/button";
import {
  CUSTOMER_TYPE_LABEL,
  LEAD_SOURCE_LABEL,
  LEAD_STATUS_LABEL,
  LEAD_STATUS_ORDER,
  type Lead,
  type LeadStatus,
} from "@/types/database";
import { cn } from "@/lib/utils";

export default async function LeadsPage() {
  const { profile, supabase } = await requireProfile();

  const [{ data: leads }, { data: trucks }, { data: reps }] = await Promise.all([
    supabase
      .from("leads")
      .select(
        "*, customers(name, type, fleet_size), trucks(stock_no, year, make, model), profiles(name)",
      )
      .order("created_at", { ascending: false }),
    supabase
      .from("trucks_visible")
      .select("id, stock_no, year, make, model")
      .not("status", "in", '("sold","delivered")')
      .order("stock_no"),
    supabase
      .from("profiles")
      .select("id, name")
      .eq("role", "sales")
      .eq("active", true),
  ]);

  const list = (leads ?? []) as Lead[];
  const counts = Object.fromEntries(
    LEAD_STATUS_ORDER.map((s) => [
      s,
      list.filter((l) => l.status === s).length,
    ]),
  ) as Record<LeadStatus, number>;

  const canLog = ["owner", "office", "sales"].includes(profile.role);

  return (
    <div>
      <div className="top flex justify-between items-end gap-4 flex-wrap mb-5">
        <div>
          <h1>Leads</h1>
          <div className="sub text-muted mt-1">
            Every rep logs their own leads, so the whole team sees who is talking
            to whom.
          </div>
        </div>
        {canLog && (
          <LogLeadForm trucks={trucks ?? []} />
        )}
      </div>

      <div className="chips flex gap-2 flex-wrap mb-3.5">
        {LEAD_STATUS_ORDER.map((s) => (
          <span
            key={s}
            className="chip px-3.5 py-1.5 rounded-full border-[1.5px] border-line bg-surface text-sm font-medium"
          >
            {LEAD_STATUS_LABEL[s]} {counts[s]}
          </span>
        ))}
      </div>

      <section className="panel bg-surface border border-line rounded-[10px] overflow-hidden">
        <div className="md:overflow-x-auto">
          <table className="data-table w-full text-[14.5px]">
            <thead>
              <tr className="text-muted text-[13px] text-left">
                <th className="px-3.5 py-2 border-b border-line">Buyer</th>
                <th className="px-3.5 py-2 border-b border-line">Type</th>
                <th className="px-3.5 py-2 border-b border-line">Truck</th>
                <th className="px-3.5 py-2 border-b border-line">Source</th>
                <th className="px-3.5 py-2 border-b border-line">Rep</th>
                <th className="px-3.5 py-2 border-b border-line">Logged</th>
                <th className="px-3.5 py-2 border-b border-line">Status</th>
                <th className="px-3.5 py-2 border-b border-line" />
              </tr>
            </thead>
            <tbody>
              {list.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-3.5 py-8 text-muted">
                    No leads yet. Log the next buyer call here.
                  </td>
                </tr>
              ) : (
                list.map((l) => {
                  const typeLabel = l.customers
                    ? l.customers.type === "fleet"
                      ? `Fleet${l.customers.fleet_size ? `, ${l.customers.fleet_size} trucks` : ""}`
                      : CUSTOMER_TYPE_LABEL[l.customers.type]
                    : "—";
                  return (
                    <tr key={l.id}>
                      <td
                        data-label="Buyer"
                        className="card-title px-3.5 py-2 border-b border-line"
                      >
                        <b>{l.customers?.name ?? "—"}</b>
                      </td>
                      <td
                        data-label="Type"
                        className="px-3.5 py-2 border-b border-line"
                      >
                        {typeLabel}
                      </td>
                      <td
                        data-label="Truck"
                        className="px-3.5 py-2 border-b border-line"
                      >
                        {l.trucks ? (
                          <StockPlate stockNo={l.trucks.stock_no} />
                        ) : (
                          "—"
                        )}
                      </td>
                      <td
                        data-label="Source"
                        className="px-3.5 py-2 border-b border-line"
                      >
                        {LEAD_SOURCE_LABEL[l.source]}
                      </td>
                      <td
                        data-label="Rep"
                        className="px-3.5 py-2 border-b border-line"
                      >
                        {l.profiles?.name ?? "—"}
                      </td>
                      <td
                        data-label="Logged"
                        className="px-3.5 py-2 border-b border-line"
                      >
                        {new Date(l.created_at).toLocaleDateString("en-US")}
                      </td>
                      <td
                        data-label="Status"
                        className="px-3.5 py-2 border-b border-line"
                      >
                        <span
                          className={cn(
                            "inline-block px-2 py-0.5 rounded-full text-[12.5px] font-semibold border-[1.5px]",
                            l.status === "won" && "bg-sign-soft border-sign",
                            l.status === "lost" && "text-muted border-line",
                            l.status === "new" && "bg-red-soft border-red",
                            (l.status === "contacted" ||
                              l.status === "viewing") &&
                              "bg-amber-soft border-amber",
                          )}
                        >
                          {LEAD_STATUS_LABEL[l.status]}
                        </span>
                      </td>
                      <td className="card-actions px-3.5 py-2 border-b border-line text-right">
                        <div className="inline-flex flex-wrap gap-2 justify-end">
                          <AdvanceLeadButton leadId={l.id} status={l.status} />
                          {canLog &&
                            l.status !== "lost" &&
                            l.status !== "won" && (
                              <Button asChild size="sm" variant="outline">
                                <Link
                                  href={`/deals?customer=${l.customer_id}${l.truck_id ? `&truck=${l.truck_id}` : ""}&lead=${l.id}`}
                                >
                                  Start deal
                                </Link>
                              </Button>
                            )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel bg-surface border border-line rounded-[10px] mt-[18px]">
        <div className="panel-h flex justify-between px-[18px] pt-3.5 pb-2">
          <h2>Leads per rep</h2>
          <small className="text-muted">open and won</small>
        </div>
        <div className="pb-3">
          {(reps ?? []).map((p) => {
            const mine = list.filter((l) => l.sales_rep_id === p.id).length;
            return (
              <div
                key={p.id}
                className="hbar grid grid-cols-[minmax(72px,150px)_1fr_44px] gap-2.5 items-center px-[18px] py-1.5"
              >
                <span>{p.name}</span>
                <i
                  className="block h-3 rounded-md bg-sign"
                  style={{ width: `${Math.min(100, (mine / 4) * 100)}%` }}
                />
                <span className="num text-right">{mine}</span>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
