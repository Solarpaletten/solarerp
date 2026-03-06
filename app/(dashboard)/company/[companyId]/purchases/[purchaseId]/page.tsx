// app/(dashboard)/company/[companyId]/purchases/[purchaseId]/page.tsx
// ═══════════════════════════════════════════════════════════════════════════
// Task 41 + 49 + Task 56_6 FIX: Purchase Document Editor (FIXED)
// ═══════════════════════════════════════════════════════════════════════════
// FIXES APPLIED:
// 1. PurchaseHeaderEdit: Add companyId prop
// 2. PurchaseHeaderEdit: Extract series, number from props
// 3. PurchaseItemsEdit: Add companyId prop
// 4. handleHeaderChange: Fix type to include number | boolean

'use client';

import { useParams, useRouter } from 'next/navigation';
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

import PurchaseHeader from '@/components/purchases/PurchaseHeader';
import PurchaseItemsTable from '@/components/purchases/PurchaseItemsTable';
import PurchaseTotals from '@/components/purchases/PurchaseTotals';
import PurchaseHeaderEdit from '@/components/purchases/PurchaseHeaderEdit';
import PurchaseItemsEdit from '@/components/purchases/PurchaseItemsEdit';
import PostedAccountingView from '@/components/purchases/PostedAccountingView';
import { PurchaseActions } from '@/components/purchases/PurchaseActions';
import type { EditableItem } from '@/lib/accounting/totalsHelper';

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

interface HeaderForm {
  purchaseDate: string;
  supplierName: string;
  supplierCode: string;
  warehouseName: string;
  currencyCode: string;
  operationType: string;
  comments: string;
}

function toDateInputValue(dateStr: string): string {
  try {
    return new Date(dateStr).toISOString().split('T')[0];
  } catch {
    return '';
  }
}

function initHeaderForm(p: PurchaseDocument): HeaderForm {
  return {
    purchaseDate: toDateInputValue(p.purchaseDate),
    supplierName: p.supplierName || '',
    supplierCode: p.supplierCode || '',
    warehouseName: p.warehouseName || 'Main',
    currencyCode: p.currencyCode || 'EUR',
    operationType: p.operationType || 'PURCHASE',
    comments: p.comments || '',
  };
}

function initEditableItems(items: PurchaseItem[]): EditableItem[] {
  return items.map((item) => ({
    id: item.id,
    itemName: item.itemName || '',
    itemCode: item.itemCode || '',
    quantity: Number(item.quantity) || 0,
    priceWithoutVat: Number(item.priceWithoutVat) || 0,
    vatRate: item.vatRate != null ? Number(item.vatRate) : 19,
  }));
}

export default function PurchaseDocumentPage() {
  const params = useParams();
  const router = useRouter();
  const companyId = params.companyId as string;
  const purchaseId = params.purchaseId as string;
  const base = `/company/${companyId}`;

  const [purchase, setPurchase] = useState<PurchaseDocument | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [headerForm, setHeaderForm] = useState<HeaderForm | null>(null);
  const [editItems, setEditItems] = useState<EditableItem[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isPosting, setIsPosting] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);

  const status = purchase?.status || 'DRAFT';
  const isEditable = status === 'DRAFT';
  const showAccounting = status === 'POSTED' || status === 'CANCELLED';

  // ── Load ───────────────────────────────────────

  const fetchPurchase = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await fetch(`/api/company/${companyId}/purchases/${purchaseId}`, {
        cache: 'no-store',
      });
      if (res.status === 404) {
        setError('Purchase document not found');
        return;
      }
      if (!res.ok) throw new Error('Failed to load purchase');
      const json = await res.json();
      const doc = json.data as PurchaseDocument;
      setPurchase(doc);
      setHeaderForm(initHeaderForm(doc));
      setEditItems(initEditableItems(doc.items));
      setDirty(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, [companyId, purchaseId]);

  useEffect(() => {
    fetchPurchase();
  }, [fetchPurchase]);

  // ── Save ───────────────────────────────────────

  async function handleSave() {
    if (!headerForm || !purchase) return;
    setIsSaving(true);
    setSaveMsg(null);
    setError(null);
    try {
      const res = await fetch(`/api/company/${companyId}/purchases/${purchaseId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...headerForm,
          items: editItems.map((item) => ({
            itemName: item.itemName,
            itemCode: item.itemCode || null,
            quantity: item.quantity,
            priceWithoutVat: item.priceWithoutVat,
            vatRate: item.vatRate,
          })),
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || 'Save failed');
      }
      const json = await res.json();
      const doc = json.data as PurchaseDocument;
      setPurchase(doc);
      setHeaderForm(initHeaderForm(doc));
      setEditItems(initEditableItems(doc.items));
      setDirty(false);
      setSaveMsg('Saved ✓');
      setTimeout(() => setSaveMsg(null), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setIsSaving(false);
    }
  }

  // ── Post ───────────────────────────────────────

  async function handlePost() {
    if (!purchase || !headerForm) return;

    // Front-end pre-validation
    if (editItems.length === 0) {
      setError('Cannot post: add at least one item');
      return;
    }
    if (!headerForm.supplierName.trim()) {
      setError('Cannot post: supplier name is required');
      return;
    }

    // Confirmation dialog
    const confirmed = window.confirm(
      `Post document ${purchase.series}-${purchase.number}?\n\nThis will create journal entries and stock movements.\nThe document will become read-only.`
    );
    if (!confirmed) return;

    setIsPosting(true);
    setError(null);

    try {
      // Step 1: Save first (ensure latest data is persisted)
      const saveRes = await fetch(`/api/company/${companyId}/purchases/${purchaseId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...headerForm,
          items: editItems.map((item) => ({
            itemName: item.itemName,
            itemCode: item.itemCode || null,
            quantity: item.quantity,
            priceWithoutVat: item.priceWithoutVat,
            vatRate: item.vatRate,
          })),
        }),
      });

      if (!saveRes.ok) {
        const json = await saveRes.json().catch(() => ({}));
        throw new Error(json.error || 'Save before post failed');
      }

      // Step 2: Post
      const postRes = await fetch(
        `/api/company/${companyId}/purchases/${purchaseId}/post`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        }
      );

      if (!postRes.ok) {
        const json = await postRes.json().catch(() => ({}));
        throw new Error(json.error || 'Post failed');
      }

      const json = await postRes.json();
      const doc = json.data as PurchaseDocument;
      setPurchase(doc);
      setHeaderForm(initHeaderForm(doc));
      setEditItems(initEditableItems(doc.items));
      setSaveMsg('Posted ✓');
      setTimeout(() => setSaveMsg(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Post failed');
      await fetchPurchase();
    } finally {
      setIsPosting(false);
    }
  }

  // ── Copy ───────────────────────────────────────

  async function handleCopy() {
    if (!purchase) return;
    try {
      const res = await fetch(`/api/company/${companyId}/purchases/${purchaseId}/copy`, {
        method: 'POST',
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || 'Copy failed');
      }
      const json = await res.json();
      router.replace(`${base}/purchases/${json.data.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Copy failed');
    }
  }

  // ── Cancel (Storno) ───────────────────────────

  async function handleCancel() {
    if (!purchase) return;
    const confirmed = window.confirm(
      `Cancel ${purchase.series}-${purchase.number}?\n\nThis will create reversal journal entries (STORNO).`
    );
    if (!confirmed) return;
    try {
      const res = await fetch(`/api/company/${companyId}/purchases/${purchaseId}/cancel`, {
        method: 'POST',
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || 'Cancel failed');
      }
      await fetchPurchase();
      setSaveMsg('Cancelled (Storno) ✓');
      setTimeout(() => setSaveMsg(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Cancel failed');
    }
  }

  // ── Header change tracking ────────────────────
  // FIX #4: Updated type signature to include number | boolean
  function handleHeaderChange(
    field: keyof HeaderForm,
    value: string | number | boolean
  ) {
    if (!headerForm) return;
    setHeaderForm({ ...headerForm, [field]: value });
    setDirty(true);
  }

  function handleItemsChange(items: EditableItem[]) {
    setEditItems(items);
    setDirty(true);
  }

  // ── Loading / Error states ─────────────────────

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center py-20">
        <div className="flex items-center gap-2 text-gray-400 text-sm">
          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
              fill="none"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          Loading document...
        </div>
      </div>
    );
  }

  if (!purchase) {
    return (
      <div className="p-6">
        <Link href={`${base}/purchases`} className="text-xs text-gray-400 hover:text-gray-600">
          ← Back to Purchases
        </Link>
        <div className="bg-white border border-gray-200 rounded-lg p-12 text-center mt-4">
          <p className="text-gray-500 text-sm">{error || 'Document not found'}</p>
        </div>
      </div>
    );
  }

  const totalsItems = isEditable
    ? editItems.map((i) => ({
        quantity: i.quantity,
        priceWithoutVat: i.priceWithoutVat,
        vatRate: i.vatRate,
      }))
    : purchase.items;

  // ── Render ─────────────────────────────────────

  return (
    <div className="p-6 space-y-4">
      {/* Actions bar */}
      <PurchaseActions
        status={status}
        saving={isSaving}
        posting={isPosting}
        dirty={dirty}
        onSave={handleSave}
        onPost={handlePost}
        onCopy={handleCopy}
        onCancel={handleCancel}
        onClose={() => router.replace(`${base}/purchases`)}
        saveMsg={saveMsg}
      />

      {/* Error banner */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-2.5 text-sm text-red-700 flex items-center justify-between">
          <span>{error}</span>
          <button
            onClick={() => setError(null)}
            className="text-red-400 hover:text-red-600 text-xs ml-4"
          >
            ×
          </button>
        </div>
      )}

      {/* Header */}
      {isEditable && headerForm ? (
        <PurchaseHeaderEdit
          companyId={companyId}
          form={headerForm}
          onChange={handleHeaderChange}
          series={purchase.series}
          number={purchase.number}
        />
      ) : (
        <PurchaseHeader purchase={purchase} />
      )}

      {/* Items */}
      {isEditable ? (
        <PurchaseItemsEdit
          companyId={companyId}
          items={editItems}
          onChange={handleItemsChange}
        />
      ) : (
        <PurchaseItemsTable items={purchase.items} />
      )}

      {/* Totals */}
      <PurchaseTotals
        items={totalsItems}
        currencyCode={isEditable ? headerForm?.currencyCode || 'EUR' : purchase.currencyCode}
      />

      {/* Accounting View (POSTED/CANCELLED) */}
      {showAccounting && (
        <PostedAccountingView companyId={companyId} purchaseId={purchaseId} />
      )}
    </div>
  );
}
