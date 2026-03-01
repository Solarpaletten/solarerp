// app/(dashboard)/company/[companyId]/purchases/[purchaseId]/page.tsx
// ═══════════════════════════════════════════════════
// Task 37A+37B: Purchase Document Page (Read View)
// ═══════════════════════════════════════════════════
// Structure:
//   ├── Back link
//   ├── PurchaseHeader       (37A ✅)
//   ├── PurchaseItemsTable   (37B ✅)
//   └── PurchaseTotals       (37C — placeholder)

'use client';

import { useParams, useRouter } from 'next/navigation';
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { ArrowLeft, Loader2 } from 'lucide-react';
import PurchaseHeader from '@/components/purchases/PurchaseHeader';
import PurchaseItemsTable from '@/components/purchases/PurchaseItemsTable';

interface PurchaseItem {
  id: string;
  itemName: string;
  itemCode: string | null;
  quantity: string | number;
  priceWithoutVat: string | number;
  vatRate: string | number | null;
}

interface PurchaseDocument {
  id: string;
  series: string;
  number: string;
  purchaseDate: string;
  payUntil: string | null;
  supplierName: string;
  supplierCode: string | null;
  warehouseName: string;
  operationType: string;
  currencyCode: string;
  employeeName: string | null;
  comments: string | null;
  status: string | null;
  items: PurchaseItem[];
}

export default function PurchaseDocumentPage() {
  const params = useParams();
  const router = useRouter();
  const companyId = params.companyId as string;
  const purchaseId = params.purchaseId as string;

  const [purchase, setPurchase] = useState<PurchaseDocument | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPurchase = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await fetch(`/api/company/${companyId}/purchases/${purchaseId}`);

      if (res.status === 404) {
        setError('Purchase document not found');
        return;
      }
      if (!res.ok) throw new Error('Failed to load purchase');

      const json = await res.json();
      setPurchase(json.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, [companyId, purchaseId]);

  useEffect(() => {
    fetchPurchase();
  }, [fetchPurchase]);

  // ─── Loading state ────────────────────────────
  if (isLoading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="animate-spin text-gray-300" size={24} />
          <span className="ml-2 text-sm text-gray-400">Loading document...</span>
        </div>
      </div>
    );
  }

  // ─── Error / Not Found ────────────────────────
  if (error || !purchase) {
    return (
      <div className="p-6">
        <Link
          href={`/company/${companyId}/purchases`}
          className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 mb-6"
        >
          <ArrowLeft size={14} />
          Back to Purchases
        </Link>
        <div className="bg-white border border-gray-200 rounded-lg p-12 text-center">
          <p className="text-gray-500 text-sm">{error || 'Document not found'}</p>
          <button
            onClick={() => router.push(`/company/${companyId}/purchases`)}
            className="mt-4 text-xs text-blue-600 hover:text-blue-800"
          >
            ← Return to list
          </button>
        </div>
      </div>
    );
  }

  // ─── Document View ────────────────────────────
  return (
    <div className="p-6 space-y-4">
      {/* Back navigation */}
      <Link
        href={`/company/${companyId}/purchases`}
        className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 transition-colors"
      >
        <ArrowLeft size={14} />
        Purchases
      </Link>

      {/* Header (Task 37A) */}
      <PurchaseHeader purchase={purchase} />

      {/* Items Table (Task 37B) */}
      <PurchaseItemsTable items={purchase.items} />

      {/* Totals — Task 37C placeholder */}
      <div className="bg-white border border-gray-200 rounded-lg px-5 py-6 text-center">
        <p className="text-xs text-gray-400">💰 Totals — Task 37C</p>
      </div>
    </div>
  );
}
