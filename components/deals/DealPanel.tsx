"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  advanceDealAction,
  markDeliveredAction,
} from "@/lib/actions/deals";
import { updateDocumentStatusAction } from "@/lib/actions/documents";
import { PaymentCalculator } from "@/components/deals/PaymentCalculator";
import { Button } from "@/components/ui/button";
import { formatMoney, ownerOnlyMoney } from "@/lib/money";
import { commission, dealProfit } from "@/lib/finance";
import type { Deal, DocumentRow, LenderApplication } from "@/types/database";
import {
  DEAL_STAGE_LABEL,
  DEAL_STAGE_ORDER,
  DOCUMENT_STATUS_LABEL,
  DOCUMENT_TYPE_LABEL,
  LENDER_STATUS_LABEL,
  type DocumentStatus,
} from "@/types/database";
import { cn } from "@/lib/utils";

type DealFull = Deal & {
  lender_applications?: LenderApplication[];
  documents?: DocumentRow[];
  cost_sum?: number;
  isOwner?: boolean;
};

export function DealPanel({
  deal,
  canSeeMoney,
  isOwner = false,
}: {
  deal: DealFull;
  canSeeMoney: boolean;
  isOwner?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const truck = deal.trucks;
  const customer = deal.customers;
  const price = Number(deal.price);
  const warranty = Number(deal.warranty_price);
  const total = price + warranty;
  const purchase =
    truck?.purchase_price != null ? Number(truck.purchase_price) : null;
  const prep = deal.cost_sum ?? 0;
  const profit = dealProfit(price, purchase, prep, warranty);
  const stageIdx = DEAL_STAGE_ORDER.indexOf(deal.stage);

  const [titleOverride, setTitleOverride] = useState(false);
  const [minOverride, setMinOverride] = useState(false);

  function advance() {
    setError(null);
    start(async () => {
      const res = await advanceDealAction(deal.id, {
        ownerTitleOverride: titleOverride,
        ownerMinPriceOverride: minOverride,
      });
      if (res.error === "TITLE_REQUIRED") {
        setError(res.message ?? "Title required");
        setTitleOverride(true);
        return;
      }
      if (res.error === "MIN_PRICE_REQUIRED") {
        setError(res.message ?? "Below minimum");
        setMinOverride(true);
        return;
      }
      if (res.error) setError(String(res.error));
      else setOpen(false);
    });
  }

  const docs = deal.documents ?? [];
  const truckSold = truck?.status === "sold";
  const truckDelivered = truck?.status === "delivered";

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="kcard block w-full text-left border-[1.5px] border-line rounded-lg p-2.5 px-3 mb-2 bg-paper hover:border-sign"
      >
        <b>{customer?.name ?? "Buyer"}</b>
        <small className="block text-muted text-[13px]">
          {truck
            ? `${truck.year} ${truck.make} ${truck.model}, No. ${truck.stock_no}`
            : "—"}
        </small>
        <div className="num text-xl">{formatMoney(price)}</div>
        <small className="block text-muted text-[13px]">
          {deal.profiles?.name ?? "—"}. {deal.notes ?? ""}
        </small>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 grid place-items-end sm:place-items-center p-0 sm:p-4 bg-black/45">
          <div
            role="dialog"
            aria-label="Deal"
            className="bg-surface rounded-t-2xl sm:rounded-xl w-full max-w-lg max-h-[92dvh] sm:max-h-[90vh] overflow-auto p-5 sm:p-6 pb-[calc(20px+env(safe-area-inset-bottom,0px))]"
          >
            <div className="flex justify-between items-start gap-3">
              <div className="min-w-0">
                <h2 className="break-words">{customer?.name}</h2>
                <div className="sub text-muted mt-1">
                  {customer?.type?.replace("_", "-")},{" "}
                  {truck
                    ? `${truck.year} ${truck.make} ${truck.model} (No. ${truck.stock_no})`
                    : ""}
                  , rep {deal.profiles?.name}
                </div>
              </div>
              <button
                type="button"
                className="flex-none w-11 h-11 rounded-full border-[1.5px] border-line"
                onClick={() => setOpen(false)}
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <div className="chips flex gap-2 flex-wrap mt-3.5">
              {DEAL_STAGE_ORDER.map((s) => (
                <span
                  key={s}
                  className={cn(
                    "chip px-3 py-1.5 rounded-full border-[1.5px] border-line text-sm",
                    s === deal.stage && "border-sign bg-sign-soft font-semibold",
                  )}
                >
                  {DEAL_STAGE_LABEL[s]}
                </span>
              ))}
            </div>

            <div className="kv grid grid-cols-2 md:grid-cols-3 gap-px bg-line border border-line rounded-[10px] overflow-hidden my-3.5">
              {[
                ["Truck price", formatMoney(price)],
                ["Warranty", warranty ? formatMoney(warranty) : "None"],
                ["Total", formatMoney(total)],
                ["Asking was", formatMoney(truck?.asking_price ?? null)],
                [
                  "Profit on this deal",
                  ownerOnlyMoney(profit, canSeeMoney && profit !== null),
                ],
                [
                  "Commission",
                  canSeeMoney && profit !== null
                    ? formatMoney(commission(profit))
                    : "Owner only",
                ],
              ].map(([label, value]) => (
                <div key={label} className="bg-surface px-3 py-2">
                  <span className="block text-muted text-[12.5px]">{label}</span>
                  <b>{value}</b>
                </div>
              ))}
            </div>

            <PaymentCalculator
              total={total}
              initialDown={Number(deal.down_payment)}
            />

            {(deal.lender_applications?.length ?? 0) > 0 ? (
              <table className="w-full text-[14.5px] mb-3">
                <thead>
                  <tr className="text-muted text-[13px] text-left">
                    <th className="py-2">Lender</th>
                    <th className="py-2 text-right">Credit application</th>
                  </tr>
                </thead>
                <tbody>
                  {deal.lender_applications!.map((l) => (
                    <tr key={l.id} className="border-t border-line">
                      <td className="py-2">
                        <b>{l.lender_name}</b>
                      </td>
                      <td className="py-2 text-right">
                        <span
                          className={cn(
                            "inline-block px-2 py-0.5 rounded-full text-[12.5px] font-semibold border-[1.5px]",
                            l.status === "approved" &&
                              "bg-sign-soft border-sign",
                            l.status === "declined" &&
                              "bg-red-soft border-red text-red",
                            l.status === "reviewing" &&
                              "bg-amber-soft border-amber",
                          )}
                        >
                          {LENDER_STATUS_LABEL[l.status]}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="hint text-muted text-[13.5px] mb-3">
                No credit application yet. Moves to Credit app will open lender
                reviews.
              </p>
            )}

            <div className="mb-3">
              <h3 className="font-display text-lg mb-2">Document checklist</h3>
              {docs.length === 0 ? (
                <p className="text-muted text-sm">
                  Checklist appears when you open or advance this deal.
                </p>
              ) : (
                <ul className="space-y-1.5">
                  {docs.map((d) => (
                    <li
                      key={d.id}
                      className="flex justify-between items-center gap-2 text-sm border-b border-line py-1.5"
                    >
                      <span>{DOCUMENT_TYPE_LABEL[d.type]}</span>
                      <select
                        className="h-9 rounded-md border border-line bg-surface px-2 text-[13px]"
                        defaultValue={d.status}
                        disabled={pending}
                        onChange={(e) => {
                          const status = e.target.value as DocumentStatus;
                          start(async () => {
                            await updateDocumentStatusAction(d.id, status);
                          });
                        }}
                      >
                        {(
                          Object.keys(DOCUMENT_STATUS_LABEL) as DocumentStatus[]
                        ).map((s) => (
                          <option key={s} value={s}>
                            {DOCUMENT_STATUS_LABEL[s]}
                          </option>
                        ))}
                      </select>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {error && (
              <p className="text-red text-sm mb-2" role="alert">
                {error}
              </p>
            )}
            {titleOverride && isOwner && (
              <p className="text-sm text-muted mb-2">
                Click Move again to confirm owner override (sell without title in
                hand).
              </p>
            )}
            {minOverride && isOwner && (
              <p className="text-sm text-muted mb-2">
                Click Move again to approve a sale below minimum price.
              </p>
            )}

            <div className="actions flex gap-2.5 flex-wrap mt-4">
              {stageIdx < DEAL_STAGE_ORDER.length - 1 && (
                <Button type="button" onClick={advance} disabled={pending}>
                  {pending
                    ? "Saving…"
                    : `Move to ${DEAL_STAGE_LABEL[DEAL_STAGE_ORDER[stageIdx + 1]]}`}
                </Button>
              )}
              {deal.stage === "sold" && truckSold && !truckDelivered && (
                <Button
                  type="button"
                  variant="amber"
                  disabled={pending}
                  onClick={() =>
                    start(async () => {
                      const res = await markDeliveredAction(deal.truck_id);
                      if (res.error) setError(res.error);
                      else setOpen(false);
                    })
                  }
                >
                  Mark delivered
                </Button>
              )}
              {truckDelivered && (
                <span className="text-sm text-muted self-center">Delivered</span>
              )}
              {truck && (
                <Button asChild variant="outline">
                  <Link href={`/trucks/${deal.truck_id}`}>Open truck</Link>
                </Button>
              )}
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
