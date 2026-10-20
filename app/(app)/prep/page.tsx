import { requireProfile } from "@/lib/auth";
import { StatusBadge, StockPlate } from "@/components/ui/badge";
import { PrepChecklist } from "@/components/trucks/PrepChecklist";
import { PrepActions } from "@/components/prep/PrepActions";
import type { PrepStep, Truck } from "@/types/database";

export default async function PrepPage() {
  const { supabase } = await requireProfile();

  const { data: trucks } = await supabase
    .from("trucks_visible")
    .select("*")
    .in("status", ["incoming", "in_prep"])
    .order("stock_no");

  const list = (trucks ?? []) as Truck[];
  const ids = list.map((t) => t.id);

  const { data: steps } = ids.length
    ? await supabase.from("prep_steps").select("*").in("truck_id", ids)
    : { data: [] as PrepStep[] };

  const stepsByTruck = new Map<string, PrepStep[]>();
  for (const s of (steps ?? []) as PrepStep[]) {
    const arr = stepsByTruck.get(s.truck_id) ?? [];
    arr.push(s);
    stepsByTruck.set(s.truck_id, arr);
  }

  const openFor = (role: "mechanic" | "office") =>
    list
      .filter((t) => t.status === "in_prep")
      .reduce((n, t) => {
        const st = stepsByTruck.get(t.id) ?? [];
        return n + st.filter((x) => x.assigned_role === role && !x.done).length;
      }, 0);

  return (
    <div>
      <div className="top mb-5">
        <h1>Prep</h1>
        <div className="sub text-muted mt-1">
          A truck cannot be listed until all five steps are checked. Each person
          sees only their own tasks.
        </div>
      </div>

      <div className="crew grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        {[
          ["Mechanic", openFor("mechanic")],
          ["DOT / detailing", openFor("mechanic")],
          ["Office", openFor("office")],
          ["In prep", list.filter((t) => t.status === "in_prep").length],
        ].map(([label, n]) => (
          <div
            key={String(label)}
            className="panel bg-surface border border-line rounded-[10px] px-4 py-3"
          >
            <div className="num text-[28px] leading-none">{n}</div>
            <span className="sub text-muted text-sm">open for {label}</span>
          </div>
        ))}
      </div>

      {list.length === 0 ? (
        <div className="panel bg-surface border border-line rounded-[10px] p-[14px_18px]">
          Nothing in prep. Every truck on the lot is ready to sell.
        </div>
      ) : (
        list.map((t) => {
          const st = stepsByTruck.get(t.id) ?? [];
          const done = st.filter((x) => x.done).length;
          return (
            <section
              key={t.id}
              className="panel bg-surface border border-line rounded-[10px] p-[14px_18px] mb-3.5"
            >
              <div className="flex justify-between items-start gap-3 flex-wrap">
                <div className="flex items-center gap-2 flex-wrap">
                  <StockPlate stockNo={t.stock_no} />
                  <b>
                    {t.year} {t.make} {t.model}
                  </b>
                </div>
                <StatusBadge status={t.status} />
              </div>
              {t.status === "incoming" ? (
                <p className="sub text-muted text-sm mt-2">
                  Tasks open when the truck arrives
                </p>
              ) : (
                <PrepChecklist steps={st} />
              )}
              <PrepActions
                truckId={t.id}
                status={t.status}
                prepDone={done}
              />
            </section>
          );
        })
      )}
    </div>
  );
}
