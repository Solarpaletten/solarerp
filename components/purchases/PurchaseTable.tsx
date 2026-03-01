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
  companyId: string;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function calcTotal(items: PurchaseItem[]): string {
  const total = items.reduce(
    (sum, item) => sum + Number(item.quantity) * Number(item.priceWithoutVat),
    0
  );

  return total.toLocaleString('de-DE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

const STATUS_STYLES: Record<string, string> = {
  DRAFT: 'bg-gray-50 text-gray-600 border-gray-200',
  POSTED: 'bg-green-50 text-green-600 border-green-200',
  CANCELLED: 'bg-red-50 text-red-600 border-red-200',
  LOCKED: 'bg-blue-50 text-blue-600 border-blue-200',
};

export default function PurchaseTable({
  purchases,
  companyId,
}: PurchaseTableProps) {
  const router = useRouter();
  const safePurchases = Array.isArray(purchases) ? purchases : [];

  if (safePurchases.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
        <Package className="mx-auto mb-3 text-gray-300" size={40} />
        <p className="text-gray-500 text-sm mb-1">
          No purchase documents yet
        </p>
        <p className="text-gray-400 text-xs">
          Create your first purchase to get started
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Doc #
              </th>
              <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Date
              </th>
              <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Supplier
              </th>
              <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Warehouse
              </th>
              <th className="px-3 py-2.5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Total (net)
              </th>
              <th className="px-3 py-2.5 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Status
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {safePurchases.map((purchase) => {
              const status = purchase.status || 'DRAFT';
              const statusStyle =
                STATUS_STYLES[status] ||
                'bg-gray-50 text-gray-500 border-gray-200';

              return (
                <tr
                  key={purchase.id}
                  onClick={() =>
                    router.push(
                      `/company/${companyId}/purchases/${purchase.id}`
                    )
                  }
                  className="cursor-pointer hover:bg-gray-50 transition-colors"
                >
                  <td className="px-3 py-2.5 font-mono text-xs font-medium text-gray-900">
                    {purchase.series}-{purchase.number}
                  </td>

                  <td className="px-3 py-2.5 text-gray-600 text-xs">
                    {formatDate(purchase.purchaseDate)}
                  </td>

                  <td className="px-3 py-2.5 text-gray-800 font-medium text-xs">
                    {purchase.supplierName}
                  </td>

                  <td className="px-3 py-2.5 text-gray-500 text-xs">
                    {purchase.warehouseName}
                  </td>

                  <td className="px-3 py-2.5 text-right font-mono text-xs text-gray-900 tabular-nums">
                    €{calcTotal(purchase.items || [])}
                  </td>

                  <td className="px-3 py-2.5 text-center">
                    <span
                      className={`inline-block px-2 py-0.5 text-[10px] font-semibold uppercase rounded border ${statusStyle}`}
                    >
                      {status}
                    </span>
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