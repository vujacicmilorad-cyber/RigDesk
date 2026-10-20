import type { TruckStatus } from "@/types/database";
import { TRUCK_STATUS_LABEL } from "@/types/database";
import { cn } from "@/lib/utils";

const STAGES: TruckStatus[] = [
  "incoming",
  "in_prep",
  "available",
  "on_hold",
  "sold",
  "delivered",
];

export function StatusRoute({ status }: { status: TruckStatus }) {
  const idx = STAGES.indexOf(status);
  const pct = idx <= 0 ? 0 : (idx / (STAGES.length - 1)) * 100;

  return (
    <div className="route relative grid grid-cols-6 my-4 mx-0 sm:mx-1 gap-x-0.5">
      <div className="absolute left-[8.33%] right-[8.33%] top-[9px] h-[3px] bg-line" />
      <i
        className="absolute left-[8.33%] top-[9px] h-[3px] bg-sign"
        style={{ width: `calc(${pct}% * 0.833)` }}
      />
      {STAGES.map((s, i) => (
        <div
          key={s}
          className={cn(
            "stop relative text-center text-[10px] xs:text-[11px] sm:text-[12.5px] text-muted leading-tight px-0.5",
            i < idx && "done",
            i === idx && "now text-ink font-semibold",
          )}
        >
          <b
            className={cn(
              "block w-3.5 h-3.5 mx-auto mt-0.5 mb-2 rounded-full bg-surface border-[3px] border-line",
              i < idx && "bg-sign border-sign",
              i === idx &&
                "w-[18px] h-[18px] mt-px mb-1.5 rounded-sm rotate-45 bg-amber border-ink border-2",
            )}
          />
          {TRUCK_STATUS_LABEL[s]}
        </div>
      ))}
    </div>
  );
}
