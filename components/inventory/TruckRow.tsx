import Link from "next/link";
import { StatusBadge, StockPlate } from "@/components/ui/badge";
import { formatMiles, formatMoney, ownerOnlyMoney } from "@/lib/money";
import type { Truck } from "@/types/database";
import { cn } from "@/lib/utils";

function daysOnLot(purchaseDate: string | null): number {
  if (!purchaseDate) return 0;
  const start = new Date(purchaseDate);
  const now = new Date();
  return Math.max(
    0,
    Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)),
  );
}

function plannedProfit(truck: Truck): number | null {
  const ask = Number(truck.asking_price);
  const buy = Number(truck.purchase_price);
  if (Number.isNaN(ask) || Number.isNaN(buy) || truck.purchase_price == null) {
    return null;
  }
  return ask - buy;
}

export function TruckThumb({ color }: { color: string | null }) {
  const c = color || "#0E5A43";
  return (
    <span
      className="thumb block w-[76px] h-[38px] rounded-md bg-paper overflow-hidden"
      aria-hidden
    >
      <svg viewBox="0 0 240 104" className="w-full h-full text-ink">
        <g fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round">
          <rect x="118" y="8" width="5" height="34" fill="#9AA5A0" />
          <path d="M62 78V26a8 8 0 0 1 8-8h50v60z" fill={c} />
          <path
            d="M120 30h34a6 6 0 0 1 6 5l4 19h44a10 10 0 0 1 10 10v14H120z"
            fill={c}
          />
          <path d="M128 37h22l4 17h-26z" fill="#CFE0EA" />
          <rect x="74" y="30" width="30" height="13" rx="2" fill="#CFE0EA" />
          <rect x="14" y="74" width="208" height="8" rx="2" fill="#3A4541" />
          <g fill="#1E2623">
            <circle cx="38" cy="84" r="14" />
            <circle cx="70" cy="84" r="14" />
            <circle cx="190" cy="84" r="14" />
          </g>
        </g>
      </svg>
    </span>
  );
}

export function TruckRow({
  truck,
  canSeeMoney,
}: {
  truck: Truck;
  canSeeMoney: boolean;
}) {
  const days = daysOnLot(truck.purchase_date);
  const profit = plannedProfit(truck);

  return (
    <Link
      href={`/trucks/${truck.id}`}
      className="row grid grid-cols-[86px_76px_1.6fr_1fr_1fr_0.6fr_1fr_110px] gap-3 items-center w-full text-left px-4 py-2.5 border-b border-line last:border-0 hover:bg-paper inventory-row"
    >
      <span>
        <StockPlate stockNo={truck.stock_no} />
      </span>
      <TruckThumb color={truck.color} />
      <span className="name font-semibold">
        {truck.year} {truck.make} {truck.model}
        <small className="block font-normal text-muted text-[13px]">
          {truck.engine ?? "—"}
          {truck.hp ? `, ${truck.hp} HP` : ""}, {truck.type.replace("_", " ")}
        </small>
      </span>
      <span className="r text-right num font-display font-semibold tabular-nums">
        {formatMiles(truck.miles)}
      </span>
      <span className="r text-right num font-display font-semibold tabular-nums">
        {formatMoney(truck.asking_price)}
      </span>
      <span
        className={cn(
          "r text-right num font-display font-semibold tabular-nums",
          days > 60 && "text-red font-semibold",
        )}
      >
        {days}
      </span>
      <span className="r text-right num font-display font-semibold tabular-nums profit-cell">
        {ownerOnlyMoney(profit, canSeeMoney && profit !== null)}
      </span>
      <span>
        <StatusBadge status={truck.status} />
      </span>
    </Link>
  );
}

export { daysOnLot, plannedProfit };
