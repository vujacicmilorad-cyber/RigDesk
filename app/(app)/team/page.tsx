import { requireProfile } from "@/lib/auth";
import { canSeeFinancials } from "@/lib/roles";
import { formatMoney, ownerOnlyMoney } from "@/lib/money";
import { roleLabel } from "@/lib/roles";
import { TeamAdmin } from "@/components/team/TeamAdmin";
import type { Profile } from "@/types/database";

export default async function TeamPage() {
  const { profile, supabase } = await requireProfile();
  const canSeeMoney = canSeeFinancials(profile.role);
  const monthStart = new Date();
  monthStart.setDate(1);

  const [
    { data: people },
    { data: leads },
    { data: deals },
    { data: trucks },
    { data: costs },
    { data: activity },
    { data: goals },
  ] = await Promise.all([
    supabase.from("profiles").select("*").order("name"),
    supabase.from("leads").select("id, sales_rep_id, status"),
    supabase.from("deals").select("id, sales_rep_id, stage, price, truck_id"),
    supabase.from("trucks_visible").select("id, purchase_price, sales_rep_id, status"),
    supabase.from("costs_visible").select("truck_id, amount"),
    supabase
      .from("activity_log")
      .select("user_id, action, created_at")
      .order("created_at", { ascending: false })
      .limit(200),
    supabase
      .from("rep_goals")
      .select("*")
      .gte("month", monthStart.toISOString().slice(0, 10)),
  ]);

  const costMap = new Map<string, number>();
  for (const c of costs ?? []) {
    if (!c.truck_id || c.amount == null) continue;
    costMap.set(c.truck_id, (costMap.get(c.truck_id) ?? 0) + Number(c.amount));
  }

  const list = (people ?? []) as Profile[];

  const roles = [
    ["Owner", "Everything, including purchase prices, profit and commissions"],
    [
      "Sales rep",
      "Inventory, own leads and deals. Purchase prices and profit stay hidden.",
    ],
    ["Mechanic", "Prep tasks and the trucks they belong to"],
    ["Office", "Documents, titles, payments and costs"],
  ];

  return (
    <div>
      <div className="top mb-5">
        <h1>Team</h1>
        <div className="sub text-muted mt-1">
          Everyone enters their own part. The whole company sees one shared
          picture.
        </div>
      </div>

      <section className="panel bg-surface border border-line rounded-[10px] overflow-hidden">
        <div className="md:overflow-x-auto">
          <table className="data-table w-full text-[14.5px]">
            <thead>
              <tr className="text-muted text-[13px] text-left">
                <th className="px-3.5 py-2 border-b border-line">Person</th>
                <th className="px-3.5 py-2 border-b border-line">Role</th>
                <th className="px-3.5 py-2 border-b border-line text-right">Leads</th>
                <th className="px-3.5 py-2 border-b border-line text-right">
                  Open deals
                </th>
                <th className="px-3.5 py-2 border-b border-line text-right">Sold</th>
                <th className="px-3.5 py-2 border-b border-line text-right">
                  Profit
                </th>
                <th className="px-3.5 py-2 border-b border-line text-right">
                  Commission
                </th>
                <th className="px-3.5 py-2 border-b border-line">Goal</th>
                <th className="px-3.5 py-2 border-b border-line">Last entry</th>
              </tr>
            </thead>
            <tbody>
              {list.map((p) => {
                const isRep = p.role === "sales";
                const mineLeads = (leads ?? []).filter(
                  (l) => l.sales_rep_id === p.id,
                ).length;
                const openDeals = (deals ?? []).filter(
                  (d) => d.sales_rep_id === p.id && d.stage !== "sold",
                ).length;
                const soldDeals = (deals ?? []).filter(
                  (d) => d.sales_rep_id === p.id && d.stage === "sold",
                );
                let profit = 0;
                for (const d of soldDeals) {
                  const truck = (trucks ?? []).find((t) => t.id === d.truck_id);
                  if (!truck || truck.purchase_price == null) continue;
                  profit +=
                    Number(d.price) -
                    Number(truck.purchase_price) -
                    (costMap.get(truck.id) ?? 0);
                }
                const last = (activity ?? []).find((a) => a.user_id === p.id);
                const goal = (goals ?? []).find((g) => g.sales_rep_id === p.id);
                const showComm =
                  canSeeMoney || profile.id === p.id || profile.role === "owner";

                return (
                  <tr key={p.id} className={!p.active ? "opacity-50" : undefined}>
                    <td
                      data-label="Person"
                      className="card-title px-3.5 py-2 border-b border-line"
                    >
                      <b>{p.name}</b>
                      {p.id === profile.id && (
                        <span className="ml-2 inline-block px-2 py-0.5 rounded-full text-[12.5px] font-semibold border-[1.5px] bg-sign-soft border-sign">
                          You
                        </span>
                      )}
                      {!p.active && (
                        <span className="ml-2 text-muted text-xs">Inactive</span>
                      )}
                    </td>
                    <td
                      data-label="Role"
                      className="px-3.5 py-2 border-b border-line"
                    >
                      {roleLabel(p.role)}
                    </td>
                    <td
                      data-label="Leads"
                      className="px-3.5 py-2 border-b border-line text-right num"
                    >
                      {isRep ? mineLeads : "—"}
                    </td>
                    <td
                      data-label="Open deals"
                      className="px-3.5 py-2 border-b border-line text-right num"
                    >
                      {isRep ? openDeals : "—"}
                    </td>
                    <td
                      data-label="Sold"
                      className="px-3.5 py-2 border-b border-line text-right num"
                    >
                      {isRep ? soldDeals.length : "—"}
                    </td>
                    <td
                      data-label="Profit"
                      className="px-3.5 py-2 border-b border-line text-right num"
                    >
                      {isRep ? ownerOnlyMoney(profit, canSeeMoney) : "—"}
                    </td>
                    <td
                      data-label="Commission"
                      className="px-3.5 py-2 border-b border-line text-right num"
                    >
                      {isRep
                        ? showComm
                          ? formatMoney(profit * 0.1)
                          : "Owner only"
                        : "—"}
                    </td>
                    <td
                      data-label="Goal"
                      className="px-3.5 py-2 border-b border-line text-sm"
                    >
                      {isRep && goal
                        ? `${goal.target_units} u / ${ownerOnlyMoney(goal.target_profit, canSeeMoney)}`
                        : isRep
                          ? "—"
                          : "—"}
                    </td>
                    <td
                      data-label="Last entry"
                      className="px-3.5 py-2 border-b border-line text-sm text-muted"
                    >
                      {last?.action ?? "No entries yet"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <div className="cols grid grid-cols-1 md:grid-cols-2 gap-[18px] mt-[18px]">
        <section className="panel bg-surface border border-line rounded-[10px]">
          <div className="panel-h px-[18px] pt-3.5 pb-2">
            <h2>Who sees what</h2>
          </div>
          <div className="overflow-x-auto px-2 pb-3">
            <table className="w-full text-[14.5px]">
              <tbody>
                {roles.map(([r, d]) => (
                  <tr key={r}>
                    <td className="px-3.5 py-2 border-b border-line">
                      <b>{r}</b>
                    </td>
                    <td className="px-3.5 py-2 border-b border-line">{d}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="panel bg-surface border border-line rounded-[10px]">
          <div className="panel-h px-[18px] pt-3.5 pb-2">
            <h2>One company, every screen</h2>
          </div>
          <ul className="list-none m-0 px-2 pb-3">
            {[
              "Same data on the phone, the tablet and the office computer",
              "An entry shows up for everyone the moment it is saved",
              "Every change carries a name and a time",
              "Backed up every night",
            ].map((t) => (
              <li
                key={t}
                className="flex gap-3 items-start px-2.5 py-2"
              >
                <span className="tick flex-none w-[18px] h-[18px] rounded-full bg-sign-soft text-sign grid place-items-center text-[11px] font-bold">
                  ✓
                </span>
                <span>{t}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>

      {profile.role === "owner" && (
        <TeamAdmin
          people={list.filter((p) => p.id !== profile.id)}
          reps={list.filter((p) => p.role === "sales" && p.active)}
          goals={(goals ?? []).map((g) => ({
            sales_rep_id: g.sales_rep_id,
            target_units: g.target_units,
            target_profit: Number(g.target_profit),
          }))}
        />
      )}
    </div>
  );
}
