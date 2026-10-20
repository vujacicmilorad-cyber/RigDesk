/** Monthly payment: principal P, down payment, term months, APR percent */
export function monthlyPayment(
  price: number,
  down: number,
  termMonths: number,
  aprPercent: number,
): number {
  const loan = Math.max(0, price - down);
  if (termMonths <= 0) return 0;
  const r = aprPercent / 100 / 12;
  if (r === 0) return loan / termMonths;
  return (loan * r) / (1 - Math.pow(1 + r, -termMonths));
}

export function dealProfit(
  salePrice: number,
  purchasePrice: number | null,
  prepCosts: number,
  warrantyPrice = 0,
): number | null {
  if (purchasePrice === null || Number.isNaN(purchasePrice)) return null;
  return salePrice - purchasePrice - prepCosts + warrantyPrice * 0.4;
}

export function commission(profit: number, rate = 0.1): number {
  return profit * rate;
}
