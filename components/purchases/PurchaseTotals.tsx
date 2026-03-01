// components/purchases/PurchaseTotals.tsx
// ═══════════════════════════════════════════════════
// Task 37C: Purchase Totals Summary (Read-Only)
// ═══════════════════════════════════════════════════
// Accounting-style totals block.
// Grouped by VAT rate, right-aligned on desktop.

'use client';

interface TotalsItem {
  quantity: string | number;
  priceWithoutVat: string | number;
  vatRate: string | number | null;
}

interface PurchaseTotalsProps {
  items: TotalsItem[];
  currencyCode: string;
}

function num(v: string | number | null | undefined): number {
  if (v === null || v === undefined) return 0;
  const n = Number(v);
  return isNaN(n) ? 0 : n;
}

function fmt(value: number): string {
  return value.toLocaleString('de-DE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

interface VatGroup {
  rate: number;
  netSum: number;
  vatSum: number;
}

function Row({
  label,
  amount,
  currency,
  bold,
  muted,
}: {
  label: string;
  amount: number;
  currency: string;
  bold?: boolean;
  muted?: boolean;
}) {
  return (
    <div className="flex justify-between items-baseline">
      <span className={`text-xs ${bold ? 'font-bold text-gray-900' : muted ? 'text-gray-400' : 'text-gray-600'}`}>
        {label}
      </span>
      <span
        className={`text-xs font-mono tabular-nums ${
          bold ? 'font-bold text-gray-900' : muted ? 'text-gray-400' : 'text-gray-800'
        }`}
      >
        {currency} {fmt(amount)}
      </span>
    </div>
  );
}

export default function PurchaseTotals({ items, currencyCode }: PurchaseTotalsProps) {
  // ─── Calculate totals ─────────────────────────
  let totalNet = 0;
  let totalVat = 0;

  const vatMap = new Map<string, VatGroup>();

  for (const item of items) {
    const qty = num(item.quantity);
    const price = num(item.priceWithoutVat);
    const vatRate = num(item.vatRate);
    const net = qty * price;
    const vat = net * (vatRate / 100);

    totalNet += net;
    totalVat += vat;

    const key = vatRate.toString();
    const existing = vatMap.get(key);
    if (existing) {
      existing.netSum += net;
      existing.vatSum += vat;
    } else {
      vatMap.set(key, { rate: vatRate, netSum: net, vatSum: vat });
    }
  }

  const totalGross = totalNet + totalVat;

  // Sort VAT groups by rate descending
  const vatGroups = Array.from(vatMap.values()).sort((a, b) => b.rate - a.rate);

  const cc = currencyCode || 'EUR';

  // ─── Empty state ──────────────────────────────
  if (items.length === 0) {
    return (
      <div className="flex justify-end">
        <div className="bg-white border border-gray-200 rounded-lg px-5 py-5 w-full md:max-w-md">
          <div className="text-xs text-gray-400 text-center">No totals to display</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-end">
      <div className="bg-white border border-gray-200 rounded-lg px-5 py-5 w-full md:max-w-md space-y-1.5">
        {/* Net Total */}
        <Row label="Net Total" amount={totalNet} currency={cc} />

        {/* VAT breakdown by rate */}
        {vatGroups.map((group) => (
          <Row
            key={group.rate}
            label={group.rate > 0 ? `VAT ${fmt(group.rate)}%` : 'VAT 0%'}
            amount={group.vatSum}
            currency={cc}
            muted={group.vatSum === 0}
          />
        ))}

        {/* Total VAT (separator) */}
        {totalVat > 0 && (
          <div className="border-t border-gray-200 pt-1.5">
            <Row label="Total VAT" amount={totalVat} currency={cc} />
          </div>
        )}

        {/* Grand Total (double line) */}
        <div className="border-t-2 border-gray-300 pt-2 mt-2">
          <Row label="Grand Total" amount={totalGross} currency={cc} bold />
        </div>
      </div>
    </div>
  );
}
