"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import type { TruckStatus } from "@/types/database";
import { TRUCK_STATUS_LABEL } from "@/types/database";

const FILTERS: Array<"all" | TruckStatus> = [
  "all",
  "incoming",
  "in_prep",
  "available",
  "on_hold",
  "sold",
];

export function StatusChips({
  current,
  counts,
}: {
  current: string;
  counts: Record<string, number>;
}) {
  return (
    <div className="chips flex gap-2 flex-wrap mb-3.5">
      {FILTERS.map((f) => {
        const label = f === "all" ? "All" : TRUCK_STATUS_LABEL[f];
        const n = counts[f] ?? 0;
        const pressed = current === f;
        return (
          <Link
            key={f}
            href={f === "all" ? "/inventory" : `/inventory?status=${f}`}
            className={cn(
              "chip inline-flex items-center min-h-10 px-3.5 py-2 rounded-full border-[1.5px] border-line bg-surface font-medium text-sm",
              pressed && "border-sign bg-sign-soft font-semibold",
            )}
            aria-pressed={pressed}
          >
            {label} {n}
          </Link>
        );
      })}
    </div>
  );
}
