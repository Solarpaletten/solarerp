// components/purchases/PurchaseTable.tsx
// ═══════════════════════════════════════════════════
// Task 36A: Purchase Documents Table
// ═══════════════════════════════════════════════════

'use client';

import { useRouter } from 'next/navigation';
import { Package } from 'lucide-react';

interface PurchaseItem {
  id: string;
  itemName: string;
  quantity: string | number;
  priceWithoutVat: string | number;
}

interface PurchaseDocument {
  id: string;
  series: string;
  number: string;
  purchaseDate: string;
  supplierName: string;
  warehouseName: string;
  operationType: string;
  currencyCode: string;
  status: string | null;
  items: PurchaseItem[];
}

interface PurchaseTableProps {
  purchases: PurchaseDocument[];
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
  isLoading: boolean;
  companyId: string;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('de-DE', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  });
}

function calcTotal(items: PurchaseItem[]): string {
  const total = (items || []).reduce(
    (sum, item) => sum + Number(item.quantity) * Number(item.priceWithoutVat), 0
  );
  return total.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const STATUS_STYLES: Record<string, string> = {
  DRAFT: 'bg-gray-50 text-gray-600 border-gray-200',
  POSTED: 'bg-green-50 text-green-600 border-green-200',
  CANCELLED: 'bg-red-50 text-red-600 border-red-200',
  LOCKED: 'bg-blue-50 text-blue-600 border-blue-200',
};

export default function PurchaseTable({
  purchases, selectedIds, onSelectionChange, isLoading, companyId,
}: PurchaseTableProps) {
  const router = useRouter();
  const allSelected = purchases.length > 0 && selectedIds.length === purchases.length;

  function toggleAll() {
    onSelectionChange(allSelected ? [] : purchases.map((p) => p.id));
  }

  function toggleOne(id: string) {
    onSelectionChange(
      selectedIds.includes(id)
        ? selectedIds.filter((i) => i !== id)
        : [...selectedIds, id]
    );
  }

  function handleRowClick(e: React.MouseEvent, purchaseId: string) {
    if ((e.target as HTMLElement).closest('input')) return;
    router.push(`/company/${companyId}/purchases/${purchaseId}`);
  }

  if (isLoading) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="px-4 py-3 border-b border-gray-100 animate-pulse">
            <div className="h-4 bg-gray-100 rounded w-3/4" />
          </div>
        ))}
      </div>
    );
  }

  if (purchases.length === 0) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-12 text-center">
        <Package className="mx-auto mb-3 text-gray-300" size={36} />
        <p className="text-sm text-gray-500">No purchase documents yet</p>
        <p className="text-xs text-gray-400 mt-1">Click Create to add the first one</p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      <table className="w-full text-xs">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-200">
            <th className="px-3 py-2.5 w-10">
              <input type="checkbox" checked={allSelected} onChange={toggleAll}
                className="w-3.5 h-3.5 rounded border-gray-300 text-blue-600" />
            </th>
            <th className="px-3 py-2.5 text-left text-[10px] font-semibold text-gray-400 uppercase">Document</th>
            <th className="px-3 py-2.5 text-left text-[10px] font-semibold text-gray-400 uppercase">Date</th>
            <th className="px-3 py-2.5 text-left text-[10px] font-semibold text-gray-400 uppercase">Supplier</th>
            <th className="px-3 py-2.5 text-left text-[10px] font-semibold text-gray-400 uppercase">Warehouse</th>
            <th className="px-3 py-2.5 text-right text-[10px] font-semibold text-gray-400 uppercase">Net Total</th>
            <th className="px-3 py-2.5 text-center text-[10px] font-semibold text-gray-400 uppercase">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {purchases.map((purchase) => {
            const isSelected = selectedIds.includes(purchase.id);
            const status = purchase.status || 'DRAFT';
            const statusStyle = STATUS_STYLES[status] || STATUS_STYLES.DRAFT;

            return (
              <tr key={purchase.id}
                onClick={(e) => handleRowClick(e, purchase.id)}
                className={`hover:bg-gray-50/50 cursor-pointer transition-colors ${isSelected ? 'bg-blue-50/50' : ''}`}>
                <td className="px-3 py-2">
                  <input type="checkbox" checked={isSelected}
                    onChange={() => toggleOne(purchase.id)}
                    className="w-3.5 h-3.5 rounded border-gray-300 text-blue-600" />
                </td>
                <td className="px-3 py-2 font-mono font-medium text-gray-900">
                  {purchase.series}-{purchase.number}
                </td>
                <td className="px-3 py-2 text-gray-600">{formatDate(purchase.purchaseDate)}</td>
                <td className="px-3 py-2 text-gray-700">{purchase.supplierName || <span className="text-gray-300">—</span>}</td>
                <td className="px-3 py-2 text-gray-500">{purchase.warehouseName}</td>
                <td className="px-3 py-2 text-right font-mono tabular-nums text-gray-900">
                  {calcTotal(purchase.items)}
                </td>
                <td className="px-3 py-2 text-center">
                  <span className={`inline-block px-2 py-0.5 text-[10px] font-bold uppercase rounded border ${statusStyle}`}>
                    {status}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
