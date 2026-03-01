// components/purchases/PurchaseTotals.tsx
// ═══════════════════════════════════════════════════
// Task 37C: Purchase Totals Summary
// ═══════════════════════════════════════════════════

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

interface VatGroup {
  rate: number;
  netTotal: number;
  vatAmount: number;
}

function num(v: string | number | null | undefined): number {
  if (v === null || v === undefined) return 0;
  const n = Number(v);
  return isNaN(n) ? 0 : n;
}

function fmt(value: number, currency: string): string {
  return `${currency} ${value.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function Row({ label, value, bold, muted, border }: {
  label: string; value: string; bold?: boolean; muted?: boolean; border?: 'top' | 'double';
}) {
  const borderClass = border === 'double'
    ? 'border-t-2 border-double border-gray-900 pt-2 mt-1'
    : border === 'top'
      ? 'border-t border-gray-200 pt-2 mt-1'
      : '';

  return (
    <div className={`flex items-center justify-between py-0.5 ${borderClass}`}>
      <span className={`text-xs ${muted ? 'text-gray-400' : 'text-gray-600'} ${bold ? 'font-semibold text-gray-900' : ''}`}>
        {label}
      </span>
      <span className={`text-xs font-mono tabular-nums ${muted ? 'text-gray-400' : 'text-gray-900'} ${bold ? 'font-bold text-sm' : ''}`}>
        {value}
      </span>
    </div>
  );
}

export default function PurchaseTotals({ items, currencyCode }: PurchaseTotalsProps) {
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

    const key = vatRate.toFixed(2);
    const existing = vatMap.get(key);
    if (existing) {
      existing.netTotal += net;
      existing.vatAmount += vat;
    } else {
      vatMap.set(key, { rate: vatRate, netTotal: net, vatAmount: vat });
    }
  }

  const totalGross = totalNet + totalVat;
  const vatGroups = Array.from(vatMap.values()).sort((a, b) => b.rate - a.rate);

  return (
    <div className="flex justify-end">
      <div className="w-full md:max-w-md bg-white border border-gray-200 rounded-lg px-5 py-4 space-y-0.5">
        <Row label="Net Total" value={fmt(totalNet, currencyCode)} />

        {vatGroups.map((group) => (
          <Row
            key={group.rate}
            label={`VAT ${group.rate.toFixed(0)}%`}
            value={fmt(group.vatAmount, currencyCode)}
            muted={group.vatAmount === 0}
          />
        ))}

        {vatGroups.length > 1 && (
          <Row label="Total VAT" value={fmt(totalVat, currencyCode)} border="top" />
        )}

        <Row label="Grand Total" value={fmt(totalGross, currencyCode)} bold border="double" />
      </div>
    </div>
  );
}
