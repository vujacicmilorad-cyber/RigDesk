import { requireProfile } from "@/lib/auth";
import { redirect } from "next/navigation";
import { StockPlate } from "@/components/ui/badge";
import { AuditClient } from "@/components/phase3/AuditClient";
import type { AuditScan, AuditSession, Truck } from "@/types/database";

export default async function AuditPage() {
  const { profile, supabase } = await requireProfile();
  if (!["owner", "office"].includes(profile.role)) redirect("/today");

  const [{ data: sessions }, { data: trucks }] = await Promise.all([
    supabase
      .from("audit_sessions")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("trucks")
      .select("id, stock_no, vin, year, make, model, status")
      .not("status", "eq", "delivered")
      .order("stock_no"),
  ]);

  const active = ((sessions ?? []) as AuditSession[]).find(
    (s) => !s.completed_at,
  );
  let scans: AuditScan[] = [];
  if (active) {
    const { data } = await supabase
      .from("audit_scans")
      .select("*")
      .eq("session_id", active.id)
      .order("created_at", { ascending: false });
    scans = (data ?? []) as AuditScan[];
  }

  const lot = (trucks ?? []) as Truck[];
  const scannedIds = new Set(
    scans.filter((s) => s.matched_truck_id).map((s) => s.matched_truck_id!),
  );
  const missing = lot.filter((t) => !scannedIds.has(t.id));
  const unknown = scans.filter((s) => !s.matched_truck_id);

  return (
    <div>
      <div className="top mb-5">
        <h1>Inventory audit</h1>
        <div className="sub text-muted mt-1">
          Scan or type VINs on the lot. See missing trucks and unknown VINs.
        </div>
      </div>

      <AuditClient
        activeSessionId={active?.id ?? null}
        scanCount={scans.length}
      />

      {active && (
        <>
          <div className="cols grid grid-cols-1 md:grid-cols-2 gap-[18px] mt-4">
            <section className="panel bg-surface border border-line rounded-[10px] p-[14px_18px]">
              <h2 className="mb-2">Missing on lot ({missing.length})</h2>
              {missing.length === 0 ? (
                <p className="text-muted text-sm">All on-lot trucks scanned.</p>
              ) : (
                <ul className="space-y-1 text-sm">
                  {missing.map((t) => (
                    <li key={t.id}>
                      <StockPlate stockNo={t.stock_no} /> {t.year} {t.make}{" "}
                      {t.model}
                      <span className="text-muted block font-display tracking-wider text-xs">
                        {t.vin}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
            <section className="panel bg-surface border border-line rounded-[10px] p-[14px_18px]">
              <h2 className="mb-2">Unknown VINs ({unknown.length})</h2>
              {unknown.length === 0 ? (
                <p className="text-muted text-sm">No unknowns yet.</p>
              ) : (
                <ul className="space-y-1 text-sm font-display tracking-wider">
                  {unknown.map((s) => (
                    <li key={s.id} className="text-red">
                      {s.vin}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>

          <section className="panel bg-surface border border-line rounded-[10px] mt-4 overflow-hidden">
            <div className="panel-h px-[18px] pt-3.5 pb-2">
              <h2>Scans this session</h2>
              <small className="text-muted">{scans.length}</small>
            </div>
            <ul className="px-[18px] pb-4 text-sm space-y-1">
              {scans.map((s) => {
                const t = lot.find((x) => x.id === s.matched_truck_id);
                return (
                  <li key={s.id} className="flex justify-between gap-2 border-b border-line py-1.5">
                    <span className="font-display tracking-wider">{s.vin}</span>
                    <span className={t ? "text-sign" : "text-red"}>
                      {t ? `No. ${t.stock_no}` : "Unknown"}
                    </span>
                  </li>
                );
              })}
            </ul>
          </section>
        </>
      )}
    </div>
  );
}
