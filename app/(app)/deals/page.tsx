import { requireProfile } from "@/lib/auth";
import { canSeeFinancials } from "@/lib/roles";
import { DealPanel } from "@/components/deals/DealPanel";
import { CreateDealForm } from "@/components/deals/CreateDealForm";
import {
  DEAL_STAGE_LABEL,
  DEAL_STAGE_ORDER,
  type Deal,
  type DealStage,
  type DocumentRow,
} from "@/types/database";

type SearchParams = Promise<{
  customer?: string;
  truck?: string;
  lead?: string;
}>;

export default async function DealsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const { profile, supabase } = await requireProfile();
  const canSeeMoney = canSeeFinancials(profile.role);
  const canWrite = ["owner", "office", "sales"].includes(profile.role);

  const [
    { data: deals },
    { data: customers },
    { data: trucks },
    { data: leads },
  ] = await Promise.all([
    supabase
      .from("deals")
      .select(
        "*, customers(name, type), trucks(stock_no, year, make, model, asking_price, purchase_price, status, min_price), profiles(name), lender_applications(*), documents(*)",
      )
      .order("created_at", { ascending: false }),
    supabase.from("customers").select("id, name, type").order("name"),
    supabase
      .from("trucks_visible")
      .select("id, stock_no, year, make, model, asking_price, status")
      .not("status", "in", '("sold","delivered","on_hold")')
      .order("stock_no"),
    supabase
      .from("leads")
      .select("id, customer_id, truck_id, customers(name)")
      .not("status", "in", '("won","lost")')
      .order("created_at", { ascending: false }),
  ]);

  const list = (deals ?? []) as (Deal & { documents?: DocumentRow[] })[];
  const truckIds = [...new Set(list.map((d) => d.truck_id))];

  const costSum = new Map<string, number>();
  if (truckIds.length && canSeeMoney) {
    const { data: costs } = await supabase
      .from("costs_visible")
      .select("truck_id, amount")
      .in("truck_id", truckIds);
    for (const c of costs ?? []) {
      if (!c.truck_id || c.amount == null) continue;
      costSum.set(
        c.truck_id,
        (costSum.get(c.truck_id) ?? 0) + Number(c.amount),
      );
    }
  }

  return (
    <div>
      <div className="top flex justify-between items-end gap-4 flex-wrap mb-5">
        <div>
          <h1>Deals</h1>
          <div className="sub text-muted mt-1">
            Every buyer from first question to sold, with the rep who owns the
            deal.
          </div>
        </div>
        {canWrite && (
          <CreateDealForm
            customers={customers ?? []}
            trucks={trucks ?? []}
            leads={(leads ?? []).map((l) => {
              const cust = l.customers as
                | { name: string }
                | { name: string }[]
                | null;
              const c = Array.isArray(cust) ? cust[0] : cust;
              return {
                id: l.id as string,
                customer_id: l.customer_id as string,
                truck_id: (l.truck_id as string | null) ?? null,
                customers: c ? { name: c.name } : null,
              };
            })}
            defaultCustomerId={params.customer}
            defaultTruckId={params.truck}
            defaultLeadId={params.lead}
          />
        )}
      </div>

      <div className="board board-scroll grid grid-cols-1 lg:grid-cols-5 gap-3 pb-1.5">
        {DEAL_STAGE_ORDER.map((stage: DealStage) => {
          const ds = list.filter((d) => d.stage === stage);
          return (
            <div
              key={stage}
              className="kcol bg-surface border border-line rounded-[10px] p-2.5 min-h-[220px] min-w-0"
            >
              <h3 className="text-lg flex justify-between px-1 pb-2">
                {DEAL_STAGE_LABEL[stage]}
                <span className="font-sans text-[13px] text-muted font-normal">
                  {ds.length}
                </span>
              </h3>
              {ds.length === 0 ? (
                <p className="text-muted text-sm px-1">
                  None yet. Open a new deal to fill this column.
                </p>
              ) : (
                ds.map((d) => (
                  <DealPanel
                    key={d.id}
                    deal={{
                      ...d,
                      cost_sum: costSum.get(d.truck_id) ?? 0,
                      documents: (d.documents ?? []).filter(
                        (doc) => !doc.deal_id || doc.deal_id === d.id,
                      ),
                    }}
                    canSeeMoney={canSeeMoney}
                    isOwner={profile.role === "owner"}
                  />
                ))
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
