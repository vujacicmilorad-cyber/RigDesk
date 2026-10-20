import Link from "next/link";
import { requireProfile } from "@/lib/auth";
import { canAddTruck, canSeeFinancials } from "@/lib/roles";
import { formatMoney, ownerOnlyMoney } from "@/lib/money";
import { daysOnLot } from "@/components/inventory/TruckRow";
import { ActivityFeed } from "@/components/dashboard/ActivityFeed";
import { Button } from "@/components/ui/button";
import type { ActivityLog, Truck } from "@/types/database";

function stockFromJoin(
  trucks: { stock_no: number } | { stock_no: number }[] | null | undefined,
): number | undefined {
  if (!trucks) return undefined;
  if (Array.isArray(trucks)) return trucks[0]?.stock_no;
  return trucks.stock_no;
}

export default async function TodayPage() {
  const { profile, supabase } = await requireProfile();
  const canSeeMoney = canSeeFinancials(profile.role);

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const [
    { data: trucks },
    { data: costs },
    { data: leads },
    { data: activity },
    { data: openKeys },
    { data: floorLines },
    { count: soldThisMonth },
  ] = await Promise.all([
    supabase.from("trucks_visible").select("*"),
    supabase.from("costs_visible").select("truck_id, amount"),
    supabase.from("leads").select("id, status"),
    supabase
      .from("activity_log")
      .select("*, profiles(name)")
      .order("created_at", { ascending: false })
      .limit(12),
    supabase
      .from("key_log")
      .select("id, taken_at, taken_by_name, trucks(stock_no)")
      .is("returned_at", null),
    supabase
      .from("floor_plan")
      .select("next_curtailment_date, trucks(stock_no)")
      .not("next_curtailment_date", "is", null),
    supabase
      .from("deals")
      .select("id", { count: "exact", head: true })
      .eq("stage", "sold")
      .gte("sold_at", monthStart.toISOString()),
  ]);

  const list = (trucks ?? []) as Truck[];
  const onLot = list.filter(
    (t) => t.status !== "sold" && t.status !== "delivered",
  );
  const count = (s: string) => list.filter((t) => t.status === s).length;

  const costsByTruck = new Map<string, number>();
  for (const c of costs ?? []) {
    if (!c.truck_id || c.amount == null) continue;
    costsByTruck.set(
      c.truck_id,
      (costsByTruck.get(c.truck_id) ?? 0) + Number(c.amount),
    );
  }

  let inventoryValue = 0;
  let plannedProfit = 0;
  for (const t of onLot) {
    const buy = t.purchase_price != null ? Number(t.purchase_price) : 0;
    const prep = costsByTruck.get(t.id) ?? 0;
    const ask = t.asking_price != null ? Number(t.asking_price) : 0;
    inventoryValue += buy + prep;
    plannedProfit += ask - buy - prep;
  }

  const attention: { text: string; href: string; red?: boolean }[] = [];
  const uncontacted = (leads ?? []).filter((l) => l.status === "new").length;
  if (uncontacted) {
    attention.push({
      text: `${uncontacted} new leads have not been contacted yet`,
      href: "/leads",
    });
  }
  for (const t of onLot) {
    const days = daysOnLot(t.purchase_date);
    if (days > 60) {
      attention.push({
        text: `Stock ${t.stock_no} has been on the lot ${days} days`,
        href: `/trucks/${t.id}`,
        red: true,
      });
    }
  }
  const prepTrucks = list.filter((t) => t.status === "in_prep");
  if (prepTrucks.length) {
    const { data: steps } = await supabase
      .from("prep_steps")
      .select("truck_id, done")
      .in(
        "truck_id",
        prepTrucks.map((t) => t.id),
      );
    for (const t of prepTrucks) {
      const left = (steps ?? []).filter(
        (s) => s.truck_id === t.id && !s.done,
      ).length;
      if (left > 0) {
        attention.push({
          text: `Stock ${t.stock_no} has ${left} prep steps left before it can be sold`,
          href: "/prep",
        });
      }
    }
  }
  for (const t of list.filter((x) => x.status === "on_hold")) {
    const expired =
      t.hold_expires_at != null &&
      new Date(t.hold_expires_at).getTime() < Date.now();
    attention.push({
      text: expired
        ? `Deposit hold on stock ${t.stock_no} expired ${new Date(t.hold_expires_at!).toLocaleDateString("en-US")} — follow up`
        : `Deposit on stock ${t.stock_no} ${
            t.hold_expires_at
              ? `expires ${new Date(t.hold_expires_at).toLocaleDateString("en-US")}`
              : "is on hold"
          }`,
      href: "/deals",
      red: expired,
    });
  }

  for (const k of openKeys ?? []) {
    const hours =
      (Date.now() - new Date(k.taken_at).getTime()) / (1000 * 60 * 60);
    if (hours > 24) {
      const stock = stockFromJoin(k.trucks);
      attention.push({
        text: `Keys for stock ${stock ?? "?"} out over 24 hours (${k.taken_by_name})`,
        href: "/keys",
        red: true,
      });
    }
  }

  for (const f of floorLines ?? []) {
    if (!f.next_curtailment_date) continue;
    const daysLeft = Math.ceil(
      (new Date(f.next_curtailment_date).getTime() - Date.now()) /
        (1000 * 60 * 60 * 24),
    );
    if (daysLeft <= 7) {
      const stock = stockFromJoin(f.trucks);
      attention.push({
        text:
          daysLeft < 0
            ? `Floor-plan curtailment overdue on stock ${stock ?? "?"}`
            : `Floor-plan curtailment on stock ${stock ?? "?"} in ${daysLeft} day${daysLeft === 1 ? "" : "s"}`,
        href: "/floor-plan",
        red: daysLeft < 0,
      });
    }
  }

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <div>
      <div className="top flex justify-between items-end gap-4 flex-wrap mb-5">
        <div>
          <h1>Today on the lot</h1>
          <div className="sub text-muted mt-1">{today}</div>
        </div>
        {canAddTruck(profile.role) && (
          <Button asChild>
            <Link href="/trucks/new">Add a truck</Link>
          </Button>
        )}
      </div>

      <div className="saved flex gap-3.5 items-center flex-wrap bg-sign text-white rounded-[10px] px-[18px] py-3.5 mb-4">
        <div className="num text-[30px] leading-none">
          {(activity ?? []).length}
        </div>
        <span className="opacity-90">
          recent entries from the team. Everyone works from the same numbers, on
          the lot and in the office.
        </span>
      </div>

      <div className="panel bg-surface border border-line rounded-[10px] mb-4 overflow-hidden">
        <div className="strip grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
          {[
            [onLot.length, "Trucks on the lot"],
            [count("available"), "Ready to sell"],
            [count("in_prep"), "In prep"],
            [count("on_hold"), "On hold"],
            [soldThisMonth ?? 0, "Sold this month"],
          ].map(([n, label]) => (
            <div
              key={String(label)}
              className="px-[18px] py-3.5 border-r border-b md:border-b-0 border-line last:border-r-0"
            >
              <div className="num text-[38px] leading-none">{n}</div>
              <span className="text-muted text-[13.5px]">{label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="cols grid grid-cols-1 md:grid-cols-2 gap-[18px]">
        <section className="panel bg-surface border border-line rounded-[10px]">
          <div className="panel-h flex justify-between items-baseline px-[18px] pt-3.5 pb-2">
            <h2>Needs attention</h2>
            <small className="text-muted">{attention.length} items</small>
          </div>
          <ul className="list-none m-0 px-2 pb-2">
            {attention.length === 0 ? (
              <li className="px-2.5 py-3 text-muted text-sm">
                Nothing urgent. The lot is caught up.
              </li>
            ) : (
              attention.map((a) => (
                <li key={a.text}>
                  <Link
                    href={a.href}
                    className="flex gap-3 items-start w-full text-left px-2.5 py-2 rounded-lg hover:bg-paper"
                  >
                    <span
                      className={`flex-none w-3 h-3 mt-1.5 rotate-45 rounded-sm ${
                        a.red ? "bg-red" : "bg-amber"
                      }`}
                    />
                    <span>{a.text}</span>
                  </Link>
                </li>
              ))
            )}
          </ul>
        </section>

        <ActivityFeed initial={(activity ?? []) as ActivityLog[]} />
      </div>

      <div className="money grid grid-cols-1 md:grid-cols-2 gap-[18px] mt-[18px]">
        <div className="panel bg-surface border border-line rounded-[10px] p-4">
          <span className="sub text-muted">Money tied up in inventory</span>
          <div className="num text-[34px] leading-tight">
            {ownerOnlyMoney(inventoryValue, canSeeMoney)}
          </div>
          <span className="sub text-muted text-sm">
            Purchase price plus prep costs of unsold trucks
          </span>
        </div>
        <div className="panel bg-surface border border-line rounded-[10px] p-4">
          <span className="sub text-muted">
            Planned profit if everything sells at asking
          </span>
          <div className="num text-[34px] leading-tight">
            {ownerOnlyMoney(plannedProfit, canSeeMoney)}
          </div>
          <span className="sub text-muted text-sm">
            After purchase and all prep costs
            {!canSeeMoney ? "" : ` · ${formatMoney(plannedProfit)}`}
          </span>
        </div>
      </div>
    </div>
  );
}
