import { requireProfile } from "@/lib/auth";
import { formatMoney, formatMiles } from "@/lib/money";
import { AppraisalForm } from "@/components/phase3/AppraisalForm";
import {
  CONDITION_LABEL,
  maxBuyPrice,
  type Appraisal,
} from "@/types/database";

export default async function AppraisalsPage() {
  const { profile, supabase } = await requireProfile();
  const canWrite = ["owner", "office", "sales"].includes(profile.role);

  const { data } = await supabase
    .from("appraisals")
    .select("*")
    .order("created_at", { ascending: false });

  const list = (data ?? []) as Appraisal[];

  return (
    <div>
      <div className="top flex justify-between items-end gap-4 flex-wrap mb-5">
        <div>
          <h1>Appraisals</h1>
          <div className="sub text-muted mt-1">
            Before buying: VIN, miles, condition and expected sale. Max buy =
            expected sale − planned prep − target profit.
          </div>
        </div>
        {canWrite && <AppraisalForm />}
      </div>

      <div className="space-y-3">
        {list.length === 0 ? (
          <div className="panel bg-surface border border-line rounded-[10px] p-6 text-muted">
            No appraisals yet. Run one before you bid.
          </div>
        ) : (
          list.map((a) => {
            const max = maxBuyPrice(
              Number(a.expected_sale_price),
              Number(a.planned_prep),
              Number(a.target_profit),
            );
            return (
              <section
                key={a.id}
                className="panel bg-surface border border-line rounded-[10px] p-[14px_18px]"
              >
                <div className="flex justify-between gap-3 flex-wrap">
                  <div>
                    <h2 className="text-xl">
                      {a.year ?? "—"} {a.make ?? ""} {a.model ?? ""}
                    </h2>
                    <p className="text-muted text-sm font-display tracking-wider">
                      {a.vin}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="block text-muted text-[12.5px]">
                      Max buy price
                    </span>
                    <div className="num text-[28px] text-sign">{formatMoney(max)}</div>
                  </div>
                </div>
                <div className="specs grid grid-cols-2 md:grid-cols-4 gap-px bg-line border border-line rounded-[10px] overflow-hidden mt-3">
                  {[
                    ["Miles", formatMiles(a.miles)],
                    ["Condition", CONDITION_LABEL[a.condition]],
                    ["Expected sale", formatMoney(a.expected_sale_price)],
                    ["Planned prep", formatMoney(a.planned_prep)],
                    ["Target profit", formatMoney(a.target_profit)],
                    [
                      "Logged",
                      new Date(a.created_at).toLocaleDateString("en-US"),
                    ],
                  ].map(([k, v]) => (
                    <div key={k} className="bg-surface px-3 py-2">
                      <span className="block text-muted text-[12.5px]">{k}</span>
                      {v}
                    </div>
                  ))}
                </div>
                {a.notes && (
                  <p className="text-sm text-muted mt-2">{a.notes}</p>
                )}
              </section>
            );
          })
        )}
      </div>
    </div>
  );
}
