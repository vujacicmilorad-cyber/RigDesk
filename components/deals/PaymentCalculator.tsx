"use client";

import { useMemo, useState } from "react";
import { monthlyPayment } from "@/lib/finance";
import { formatMoney } from "@/lib/money";

export function PaymentCalculator({
  total,
  initialDown,
}: {
  total: number;
  initialDown: number;
}) {
  const maxDown = Math.round(total / 2);
  const [down, setDown] = useState(Math.min(initialDown, maxDown));
  const [term, setTerm] = useState(48);
  const [apr, setApr] = useState(11.5);

  const pay = useMemo(
    () => monthlyPayment(total, down, term, apr),
    [total, down, term, apr],
  );

  return (
    <div className="calcbox border-[1.5px] border-sign rounded-[10px] p-4 my-3.5">
      <b>Payment calculator</b>
      <label className="grid grid-cols-1 sm:grid-cols-[110px_1fr_84px] gap-1 sm:gap-2.5 sm:items-center text-sm my-1.5">
        Down payment
        <input
          type="range"
          min={0}
          max={maxDown}
          step={500}
          value={down}
          onChange={(e) => setDown(Number(e.target.value))}
          className="w-full accent-sign min-h-11"
        />
        <output className="sm:text-right font-display font-semibold text-lg">
          {formatMoney(down)}
        </output>
      </label>
      <label className="grid grid-cols-1 sm:grid-cols-[110px_1fr_84px] gap-1 sm:gap-2.5 sm:items-center text-sm my-1.5">
        Term
        <input
          type="range"
          min={24}
          max={72}
          step={12}
          value={term}
          onChange={(e) => setTerm(Number(e.target.value))}
          className="w-full accent-sign min-h-11"
        />
        <output className="sm:text-right font-display font-semibold text-lg">
          {term} mo
        </output>
      </label>
      <label className="grid grid-cols-1 sm:grid-cols-[110px_1fr_84px] gap-1 sm:gap-2.5 sm:items-center text-sm my-1.5">
        Rate
        <input
          type="range"
          min={6}
          max={18}
          step={0.5}
          value={apr}
          onChange={(e) => setApr(Number(e.target.value))}
          className="w-full accent-sign min-h-11"
        />
        <output className="sm:text-right font-display font-semibold text-lg">
          {apr.toFixed(1)}%
        </output>
      </label>
      <div className="flex flex-wrap justify-between items-baseline gap-2 border-t border-line mt-2.5 pt-2.5">
        <span className="sub text-muted">Estimated monthly payment</span>
        <span className="num text-[28px] sm:text-[34px]">{formatMoney(pay)}</span>
      </div>
    </div>
  );
}
