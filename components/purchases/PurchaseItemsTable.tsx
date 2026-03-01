// components/purchases/PurchaseItemsTable.tsx
// ═══════════════════════════════════════════════════
// Task 37B: Purchase Items Table (Read View)
// ═══════════════════════════════════════════════════
// Accounting-style table. 9 columns. No edit. No input.
// Calculations: netTotal, vatAmount, grossTotal per row.

'use client';

import { ClipboardList } from 'lucide-react';

interface PurchaseItem {
  id: string;
  itemName: string;
  itemCode: string | null;
  quantity: string | number;
  priceWithoutVat: string | number;
  vatRate: string | number | null;
}

interface PurchaseItemsTableProps {
  items: PurchaseItem[];
}

function num(value: string | number | null | undefined): number {
  if (value === null || value === undefined) return 0;
  const n = Number(value);
  return isNaN(n) ? 0 : n;
}

function fmt(value: number): string {
  return value.toLocaleString('de-DE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function fmtQty(value: number): string {
  // Show up to 4 decimals for quantity, trim trailing zeros
  const s = value.toLocaleString('de-DE', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 4,
  });
  return s;
}

export default function PurchaseItemsTable({ items }: PurchaseItemsTableProps) {
  if (items.length === 0) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-10 text-center">
        <ClipboardList className="mx-auto mb-2 text-gray-300" size={32} />
        <p className="text-sm text-gray-400">No items in this document</p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200 sticky top-0 z-10">
              <th className="px-3 py-2.5 text-center text-[10px] font-semibold text-gray-400 uppercase tracking-wider w-10">
                #
              </th>
              <th className="px-3 py-2.5 text-left text-[10px] font-semibold text-gray-400 uppercase tracking-wider min-w-[180px]">
                Item Name
              </th>
              <th className="px-3 py-2.5 text-left text-[10px] font-semibold text-gray-400 uppercase tracking-wider min-w-[90px]">
                Code
              </th>
              <th className="px-3 py-2.5 text-right text-[10px] font-semibold text-gray-400 uppercase tracking-wider min-w-[70px]">
                Qty
              </th>
              <th className="px-3 py-2.5 text-right text-[10px] font-semibold text-gray-400 uppercase tracking-wider min-w-[90px]">
                Price (net)
              </th>
              <th className="px-3 py-2.5 text-right text-[10px] font-semibold text-gray-400 uppercase tracking-wider min-w-[60px]">
                VAT %
              </th>
              <th className="px-3 py-2.5 text-right text-[10px] font-semibold text-gray-400 uppercase tracking-wider min-w-[100px]">
                Net Total
              </th>
              <th className="px-3 py-2.5 text-right text-[10px] font-semibold text-gray-400 uppercase tracking-wider min-w-[90px]">
                VAT Amount
              </th>
              <th className="px-3 py-2.5 text-right text-[10px] font-semibold text-gray-400 uppercase tracking-wider min-w-[100px]">
                Gross Total
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {items.map((item, index) => {
              const qty = num(item.quantity);
              const price = num(item.priceWithoutVat);
              const vatRate = num(item.vatRate);
              const netTotal = qty * price;
              const vatAmount = netTotal * (vatRate / 100);
              const grossTotal = netTotal + vatAmount;

              return (
                <tr key={item.id} className="hover:bg-gray-50/50">
                  <td className="px-3 py-2 text-center text-gray-400 tabular-nums">
                    {index + 1}
                  </td>
                  <td className="px-3 py-2 text-gray-900 font-medium">
                    {item.itemName}
                  </td>
                  <td className="px-3 py-2 text-gray-500 font-mono text-[11px]">
                    {item.itemCode || <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-3 py-2 text-right text-gray-900 tabular-nums">
                    {fmtQty(qty)}
                  </td>
                  <td className="px-3 py-2 text-right text-gray-900 tabular-nums font-mono">
                    {fmt(price)}
                  </td>
                  <td className="px-3 py-2 text-right text-gray-500 tabular-nums">
                    {vatRate > 0 ? `${fmt(vatRate)}%` : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-3 py-2 text-right text-gray-900 tabular-nums font-mono">
                    {fmt(netTotal)}
                  </td>
                  <td className="px-3 py-2 text-right text-gray-500 tabular-nums font-mono">
                    {vatAmount > 0 ? fmt(vatAmount) : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-3 py-2 text-right text-gray-900 font-semibold tabular-nums font-mono">
                    {fmt(grossTotal)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
