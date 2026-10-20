import Link from "next/link";
import { requireProfile } from "@/lib/auth";
import { formatMoney } from "@/lib/money";
import {
  CUSTOMER_TYPE_LABEL,
  type Customer,
  type Deal,
} from "@/types/database";

export default async function CustomersPage() {
  const { supabase } = await requireProfile();

  const [{ data: customers }, { data: deals }] = await Promise.all([
    supabase
      .from("customers")
      .select("*, profiles!customers_sales_rep_id_fkey(name)")
      .order("name"),
    supabase
      .from("deals")
      .select(
        "*, trucks(stock_no, year, make, model), profiles(name), customers(name)",
      )
      .eq("stage", "sold")
      .order("sold_at", { ascending: false }),
  ]);

  const list = (customers ?? []) as (Customer & {
    profiles?: { name: string } | null;
  })[];
  const sold = (deals ?? []) as Deal[];

  const boughtCount = (customerId: string) =>
    sold.filter((d) => d.customer_id === customerId).length;

  const featured =
    list.find((c) => c.name === "Great Lakes Freight") ?? list[0] ?? null;
  const featuredDeals = featured
    ? sold.filter((d) => d.customer_id === featured.id)
    : [];

  return (
    <div>
      <div className="top mb-5">
        <h1>Customers</h1>
        <div className="sub text-muted mt-1">
          Owner-operators and fleets, what they bought, what they are looking for
          and who looks after them.
        </div>
      </div>

      <section className="panel bg-surface border border-line rounded-[10px] overflow-hidden">
        <div className="md:overflow-x-auto">
          <table className="data-table w-full text-[14.5px]">
            <thead>
              <tr className="text-muted text-[13px] text-left">
                <th className="px-3.5 py-2 border-b border-line">Customer</th>
                <th className="px-3.5 py-2 border-b border-line">Type</th>
                <th className="px-3.5 py-2 border-b border-line text-right">
                  Bought
                </th>
                <th className="px-3.5 py-2 border-b border-line">Looking for</th>
                <th className="px-3.5 py-2 border-b border-line">Rep</th>
                <th className="px-3.5 py-2 border-b border-line">Last contact</th>
              </tr>
            </thead>
            <tbody>
              {list.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3.5 py-8 text-muted">
                    No customers yet. Logging a lead creates one.
                  </td>
                </tr>
              ) : (
                list.map((c) => {
                  const typeLabel =
                    c.type === "fleet"
                      ? `Fleet${c.fleet_size ? `, ${c.fleet_size} trucks` : ""}`
                      : CUSTOMER_TYPE_LABEL[c.type];
                  return (
                    <tr key={c.id}>
                      <td
                        data-label="Customer"
                        className="card-title px-3.5 py-2 border-b border-line"
                      >
                        <b>{c.name}</b>
                      </td>
                      <td
                        data-label="Type"
                        className="px-3.5 py-2 border-b border-line"
                      >
                        {typeLabel}
                      </td>
                      <td
                        data-label="Bought"
                        className="px-3.5 py-2 border-b border-line text-right num"
                      >
                        {boughtCount(c.id)}
                      </td>
                      <td
                        data-label="Looking for"
                        className="px-3.5 py-2 border-b border-line"
                      >
                        {c.looking_for ?? "—"}
                      </td>
                      <td
                        data-label="Rep"
                        className="px-3.5 py-2 border-b border-line"
                      >
                        {c.profiles?.name ?? "—"}
                      </td>
                      <td
                        data-label="Last contact"
                        className="px-3.5 py-2 border-b border-line"
                      >
                        {new Date(c.created_at).toLocaleDateString("en-US")}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      {featured && (
        <section className="panel bg-surface border border-line rounded-[10px] mt-[18px] overflow-hidden">
          <div className="panel-h flex justify-between px-[18px] pt-3.5 pb-2">
            <h2>Purchase history: {featured.name}</h2>
            <small className="text-muted">
              {featuredDeals.length} truck
              {featuredDeals.length === 1 ? "" : "s"}
            </small>
          </div>
          <div className="md:overflow-x-auto">
            <table className="data-table w-full text-[14.5px]">
              <thead>
                <tr className="text-muted text-[13px] text-left">
                  <th className="px-3.5 py-2 border-b border-line">Date</th>
                  <th className="px-3.5 py-2 border-b border-line">Truck</th>
                  <th className="px-3.5 py-2 border-b border-line">Rep</th>
                  <th className="px-3.5 py-2 border-b border-line text-right">
                    Price
                  </th>
                </tr>
              </thead>
              <tbody>
                {featuredDeals.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-3.5 py-4 text-muted">
                      No completed purchases on file yet.
                    </td>
                  </tr>
                ) : (
                  featuredDeals.map((d) => (
                    <tr key={d.id}>
                      <td
                        data-label="Date"
                        className="px-3.5 py-2 border-b border-line"
                      >
                        {d.sold_at
                          ? new Date(d.sold_at).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                            })
                          : "—"}
                      </td>
                      <td
                        data-label="Truck"
                        className="card-title px-3.5 py-2 border-b border-line"
                      >
                        {d.trucks ? (
                          <Link
                            href={`/trucks/${d.truck_id}`}
                            className="hover:underline"
                          >
                            {d.trucks.year} {d.trucks.make} {d.trucks.model}, No.{" "}
                            {d.trucks.stock_no}
                          </Link>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td
                        data-label="Rep"
                        className="px-3.5 py-2 border-b border-line"
                      >
                        {d.profiles?.name ?? "—"}
                      </td>
                      <td
                        data-label="Price"
                        className="px-3.5 py-2 border-b border-line text-right num"
                      >
                        {formatMoney(d.price)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
