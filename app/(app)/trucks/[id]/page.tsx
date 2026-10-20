import Link from "next/link";
import { notFound } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { canSeeFinancials } from "@/lib/roles";
import { formatMiles, formatMoney, ownerOnlyMoney } from "@/lib/money";
import { StatusBadge, StockPlate } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StatusRoute } from "@/components/trucks/StatusRoute";
import { PrepChecklist } from "@/components/trucks/PrepChecklist";
import { PhotoSlots } from "@/components/trucks/PhotoSlots";
import { DocumentsPanel } from "@/components/trucks/DocumentsPanel";
import { MarkDeliveredButton } from "@/components/trucks/MarkDeliveredButton";
import { TruckThumb, daysOnLot } from "@/components/inventory/TruckRow";
import type {
  ActivityLog,
  Cost,
  DocumentRow,
  PrepStep,
  Truck,
  TruckPhoto,
} from "@/types/database";

type Params = Promise<{ id: string }>;

export default async function TruckDetailPage({
  params,
}: {
  params: Params;
}) {
  const { id } = await params;
  const { profile, supabase } = await requireProfile();
  const canSeeMoney = canSeeFinancials(profile.role);

  const { data: truck } = await supabase
    .from("trucks_visible")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!truck) notFound();

  const t = truck as Truck;

  const [
    { data: photos },
    { data: steps },
    { data: costs },
    { data: docs },
    { data: history },
  ] = await Promise.all([
    supabase
      .from("truck_photos")
      .select("*")
      .eq("truck_id", id)
      .order("sort"),
    supabase.from("prep_steps").select("*").eq("truck_id", id),
    supabase
      .from("costs_visible")
      .select("*")
      .eq("truck_id", id)
      .order("date", { ascending: false }),
    supabase.from("documents").select("*").eq("truck_id", id),
    supabase
      .from("activity_log")
      .select("*, profiles(name, role)")
      .eq("truck_id", id)
      .order("created_at", { ascending: false })
      .limit(40),
  ]);

  const costRows = (costs ?? []) as Cost[];
  const costSum = canSeeMoney
    ? costRows.reduce((a, c) => a + Number(c.amount ?? 0), 0)
    : null;
  const purchase = t.purchase_price != null ? Number(t.purchase_price) : null;
  const ask = t.asking_price != null ? Number(t.asking_price) : null;
  const planned =
    canSeeMoney && purchase != null && ask != null
      ? ask - purchase - (costSum ?? 0)
      : null;
  const days = daysOnLot(t.purchase_date);
  const publicUrlBase = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/truck-photos`;
  const docsUrlBase = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/documents`;
  const canDocs = ["owner", "office"].includes(profile.role);

  return (
    <div className="max-w-3xl">
      <div className="mb-3">
        <Link href="/inventory" className="text-sm text-muted hover:text-ink">
          ← Inventory
        </Link>
      </div>

      <div className="d-top flex justify-between items-start gap-3 flex-wrap">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <StockPlate stockNo={t.stock_no} />
            <StatusBadge status={t.status} />
            {t.status === "sold" && (
              <MarkDeliveredButton truckId={t.id} />
            )}
          </div>
          <h1 className="mt-2">
            {t.year} {t.make} {t.model}
          </h1>
          <p className="sub text-muted mt-1">
            VIN {t.vin} · {formatMiles(t.miles)} miles · {days} days on lot
            {days > 60 ? " · over 60 days" : ""}
          </p>
        </div>
      </div>

      <div className="hero bg-paper rounded-[10px] my-3.5 px-4 pt-2.5">
        <TruckThumb color={t.color} />
      </div>

      <StatusRoute status={t.status} />

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="photos">Photos</TabsTrigger>
          <TabsTrigger value="costs">Costs</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="calc grid grid-cols-2 md:grid-cols-4 gap-2.5 my-4">
            <div className="border border-line rounded-[10px] p-2.5 px-3">
              <span className="block text-muted text-[12.5px]">Purchase</span>
              <div className="num text-[22px]">
                {ownerOnlyMoney(purchase, canSeeMoney)}
              </div>
            </div>
            <div className="border border-line rounded-[10px] p-2.5 px-3">
              <span className="block text-muted text-[12.5px]">Asking</span>
              <div className="num text-[22px]">{formatMoney(ask)}</div>
            </div>
            <div className="border border-line rounded-[10px] p-2.5 px-3">
              <span className="block text-muted text-[12.5px]">Prep costs</span>
              <div className="num text-[22px]">
                {ownerOnlyMoney(costSum, canSeeMoney)}
              </div>
            </div>
            <div className="border border-sign rounded-[10px] p-2.5 px-3 bg-sign text-white profit">
              <span className="block text-white/85 text-[12.5px]">
                Planned profit
              </span>
              <div className="num text-[22px]">
                {ownerOnlyMoney(planned, canSeeMoney)}
              </div>
            </div>
          </div>

          <div className="specs grid grid-cols-2 md:grid-cols-3 gap-px bg-line border border-line rounded-[10px] overflow-hidden my-4">
            {[
              ["Engine", t.engine ?? "—"],
              ["HP", t.hp?.toString() ?? "—"],
              ["Trans", t.transmission ?? "—"],
              ["Ratio", t.ratio ?? "—"],
              ["Type", t.type.replace("_", " ")],
              ["APU", t.apu ? "Yes" : "No"],
              ["Lot", t.lot_location ?? "—"],
              ["Source", t.source?.replace("_", "-") ?? "—"],
              ["Min price", ownerOnlyMoney(t.min_price, canSeeMoney)],
            ].map(([label, value]) => (
              <div key={label} className="bg-surface px-3 py-2">
                <span className="block text-muted text-[12.5px]">{label}</span>
                {value}
              </div>
            ))}
          </div>

          <h2 className="mt-6 mb-2">Prep checklist</h2>
          <PrepChecklist steps={(steps ?? []) as PrepStep[]} />
        </TabsContent>

        <TabsContent value="photos">
          <p className="sub text-muted mb-2">
            Ten guided slots. Tap a slot to upload from camera or files.
          </p>
          <PhotoSlots
            truckId={t.id}
            photos={(photos ?? []) as TruckPhoto[]}
            publicUrlBase={publicUrlBase}
          />
        </TabsContent>

        <TabsContent value="costs">
          {!canSeeMoney ? (
            <p className="text-muted">Owner only</p>
          ) : costRows.length === 0 ? (
            <p className="text-muted">
              No costs yet. Snap a receipt from the Costs screen in Phase 2.
            </p>
          ) : (
            <div className="panel border border-line rounded-[10px] overflow-hidden">
              <table className="data-table w-full text-[14.5px]">
                <thead>
                  <tr className="text-muted text-[13px] text-left">
                    <th className="px-3.5 py-2 border-b border-line">Category</th>
                    <th className="px-3.5 py-2 border-b border-line">Vendor</th>
                    <th className="px-3.5 py-2 border-b border-line text-right">
                      Amount
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {costRows.map((c) => (
                    <tr key={c.id}>
                      <td
                        data-label="Category"
                        className="card-title px-3.5 py-2 border-b border-line"
                      >
                        {c.category}
                      </td>
                      <td
                        data-label="Vendor"
                        className="px-3.5 py-2 border-b border-line"
                      >
                        {c.vendor ?? "—"}
                      </td>
                      <td
                        data-label="Amount"
                        className="px-3.5 py-2 border-b border-line text-right num"
                      >
                        {formatMoney(c.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td className="px-3.5 py-2 font-semibold" colSpan={2}>
                      Total
                    </td>
                    <td className="px-3.5 py-2 text-right num font-semibold">
                      {formatMoney(costSum)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </TabsContent>

        <TabsContent value="documents">
          <DocumentsPanel
            truckId={t.id}
            docs={(docs ?? []) as DocumentRow[]}
            canWrite={canDocs}
            publicUrlBase={docsUrlBase}
          />
        </TabsContent>

        <TabsContent value="history">
          {(history ?? []).length === 0 ? (
            <p className="text-muted">No activity yet for this truck.</p>
          ) : (
            <ul className="tl list-none m-0 p-0">
              {(history as ActivityLog[]).map((h) => (
                <li key={h.id} className="relative pl-6 pb-4">
                  <span className="absolute left-0 top-1 w-3 h-3 rounded-full bg-sign" />
                  <div>
                    <b>{h.profiles?.name ?? "Team"}</b> {h.action}
                  </div>
                  <small className="text-muted text-[13px]">
                    {new Date(h.created_at).toLocaleString("en-US")}
                  </small>
                </li>
              ))}
            </ul>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
