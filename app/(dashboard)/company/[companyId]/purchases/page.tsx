// app/(dashboard)/company/[companyId]/purchases/page.tsx
// ═══════════════════════════════════════════════════
// Task 38 39: Purchases Module Page
// ═══════════════════════════════════════════════════

'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import PurchaseTable from '@/components/purchases/PurchaseTable';
import { Loader2 } from 'lucide-react';

interface Purchase {
  id: string;
  series: string;
  number: string;
  purchaseDate: string;
  supplierName: string;
  currencyCode: string;
  status: string | null;

  // optional because API may not return them yet
  warehouseName?: string;
  operationType?: string;
  items?: {
    id: string;
    itemName: string;
    quantity: string | number;
    priceWithoutVat: string | number;
  }[];
}

export default function PurchasesPage() {
  const params = useParams();
  const companyId = params.companyId as string;

  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  useEffect(() => {
    async function loadPurchases() {
      try {
        setIsLoading(true);
        setError(null);

        const res = await fetch(`/api/company/${companyId}/purchases`);

        if (!res.ok) {
          throw new Error('Failed to load purchases');
        }

        const json = await res.json();

        // 🔐 SAFETY: always extract array from json.data
        const safeArray = Array.isArray(json.data) ? json.data : [];

        setPurchases(safeArray);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setIsLoading(false);
      }
    }

    if (companyId) {
      loadPurchases();
    }
  }, [companyId]);

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center py-20">
        <Loader2 className="animate-spin text-gray-300" size={24} />
        <span className="ml-2 text-sm text-gray-400">Loading purchases...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-white border border-gray-200 rounded-lg p-12 text-center">
          <p className="text-red-500 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  // UI DTO transformation
  const purchaseDocuments = purchases.map((p) => ({
    id: p.id,
    series: p.series ?? '',
    number: p.number ?? '',
    purchaseDate: p.purchaseDate,
    supplierName: p.supplier?.name ?? '',
    warehouseName: p.warehouse?.name ?? '',
    operationType: p.operationType ?? 'STANDARD',
    currencyCode: p.currencyCode ?? 'EUR',
    status: p.status ?? 'DRAFT',
    items: p.items ?? [],
  }));

  return (
    // UI DTO transformation
    <PurchaseTable
      purchases={purchaseDocuments}
      selectedIds={selectedIds}
      onSelectionChange={setSelectedIds}
      isLoading={isLoading}
      companyId={companyId}
    />
  );
}