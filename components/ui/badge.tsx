import { cn } from "@/lib/utils";
import type { TruckStatus } from "@/types/database";
import { TRUCK_STATUS_LABEL } from "@/types/database";

export function StatusBadge({ status }: { status: TruckStatus }) {
  return (
    <span
      className={cn(
        "inline-block rounded-full border-[1.5px] px-2.5 py-0.5 text-[13px] font-semibold",
        status === "available" && "bg-sign-soft border-sign",
        status === "on_hold" && "bg-amber-soft border-amber",
        (status === "sold" || status === "delivered") &&
          "bg-ink text-surface border-ink",
        (status === "incoming" || status === "in_prep") &&
          "bg-surface border-line text-ink",
      )}
    >
      {TRUCK_STATUS_LABEL[status]}
    </span>
  );
}

export function StockPlate({ stockNo }: { stockNo: number }) {
  return (
    <span className="plate inline-block font-display font-semibold text-base leading-none px-2 py-1 border-[1.5px] border-ink rounded bg-surface">
      No. {stockNo}
    </span>
  );
}
