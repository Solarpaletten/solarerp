// app/(dashboard)/company/[companyId]/purchases/page.tsx
// ═══════════════════════════════════════════════════
// Task 36A: Purchases Module Page
// ═══════════════════════════════════════════════════

'use client';

import { useParams } from 'next/navigation';
import { useState, useEffect, useCallback } from 'react';
import PurchaseActionBar from '@/components/purchases/PurchaseActionBar';
import PurchaseTable from '@/components/purchases/PurchaseTable';

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

export default function PurchasesPage() {
  const params = useParams();
  const companyId = params.companyId as string;

  const [purchases, setPurchases] = useState<PurchaseDocument[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ─── Fetch purchases ───────────────────────────
  const fetchPurchases = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await fetch(`/api/company/${companyId}/purchases`);
      if (!res.ok) throw new Error('Failed to load purchases');
      const json = await res.json();
      setPurchases(json.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    fetchPurchases();
  }, [fetchPurchases]);

  // ─── Delete selected (STORNO cancel) ──────────
  async function handleDelete() {
    if (selectedIds.length === 0) return;

    const count = selectedIds.length;
    const confirmed = window.confirm(
      `Cancel ${count} purchase document${count > 1 ? 's' : ''}?\n\nThis will create reversal journal entries (STORNO).`
    );
    if (!confirmed) return;

    setActionLoading(true);
    try {
      const results = await Promise.allSettled(
        selectedIds.map((id) =>
          fetch(`/api/company/${companyId}/purchases/${id}/cancel`, {
            method: 'POST',
          })
        )
      );

      const failures = results.filter(
        (r) =>
          r.status === 'rejected' ||
          (r.status === 'fulfilled' && !r.value.ok)
      );

      if (failures.length > 0) {
        setError(`${failures.length} document(s) failed to cancel`);
      }

      setSelectedIds([]);
      await fetchPurchases();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Cancel failed');
    } finally {
      setActionLoading(false);
    }
  }

  // ─── Copy selected ────────────────────────────
  async function handleCopy() {
    if (selectedIds.length !== 1) return;

    setActionLoading(true);
    try {
      const res = await fetch(
        `/api/company/${companyId}/purchases/${selectedIds[0]}/copy`,
        { method: 'POST' }
      );

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || 'Copy failed');
      }

      setSelectedIds([]);
      await fetchPurchases();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Copy failed');
    } finally {
      setActionLoading(false);
    }
  }

  return (
    <div className="p-6 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Purchases</h1>
          <p className="text-xs text-gray-400 mt-0.5">
            {purchases.length} document{purchases.length !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-2.5 text-sm text-red-700 flex items-center justify-between">
          <span>{error}</span>
          <button
            onClick={() => setError(null)}
            className="text-red-400 hover:text-red-600 text-xs ml-4"
          >
            ✕
          </button>
        </div>
      )}

      {/* Action Bar */}
      <PurchaseActionBar
        selectedIds={selectedIds}
        onDelete={handleDelete}
        onCopy={handleCopy}
        companyId={companyId}
        isLoading={actionLoading}
      />

      {/* Table */}
      <PurchaseTable
        purchases={purchases}
        selectedIds={selectedIds}
        onSelectionChange={setSelectedIds}
        isLoading={isLoading}
        companyId={companyId}
      />
    </div>
  );
}
