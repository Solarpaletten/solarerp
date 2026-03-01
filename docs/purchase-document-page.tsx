// app/(dashboard)/company/[companyId]/purchases/[purchaseId]/page.tsx
// ═══════════════════════════════════════════════════
// Task 38B: Purchase Document Page (Dual Mode)
// ═══════════════════════════════════════════════════
// DRAFT  → editable header + editable items + save
// POSTED → read-only header + read-only items + totals

'use client';

import { useParams, useRouter } from 'next/navigation';
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { ArrowLeft, Loader2, Save } from 'lucide-react';

// Read-only components (37A/37B/37C)
import PurchaseHeader from '@/components/purchases/PurchaseHeader';
import PurchaseItemsTable from '@/components/purchases/PurchaseItemsTable';
import PurchaseTotals from '@/components/purchases/PurchaseTotals';

// Editable components (38B)
import PurchaseHeaderEdit from '@/components/purchases/PurchaseHeaderEdit';
import PurchaseItemsEdit, { type EditableItem } from '@/components/purchases/PurchaseItemsEdit';

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

  // Data state
  const [purchase, setPurchase] = useState<PurchaseDocument | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form state (DRAFT only)
  const [headerForm, setHeaderForm] = useState<HeaderForm | null>(null);
  const [editItems, setEditItems] = useState<EditableItem[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);

  const isEditable = purchase?.status === 'DRAFT';

  // ─── Fetch ────────────────────────────────────
  const fetchPurchase = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await fetch(`/api/company/${companyId}/purchases/${purchaseId}`);
      if (res.status === 404) { setError('Purchase document not found'); return; }
      if (!res.ok) throw new Error('Failed to load purchase');
      const json = await res.json();
      const doc = json.data as PurchaseDocument;
      setPurchase(doc);
      setHeaderForm(initHeaderForm(doc));
      setEditItems(initEditableItems(doc.items));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, [companyId, purchaseId]);

  useEffect(() => { fetchPurchase(); }, [fetchPurchase]);

  // ─── Save (PUT) ───────────────────────────────
  async function handleSave() {
    if (!headerForm || !purchase) return;
    setIsSaving(true);
    setSaveMsg(null);

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
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || 'Save failed');
      }

      const json = await res.json();
      const doc = json.data as PurchaseDocument;
      setPurchase(doc);
      setHeaderForm(initHeaderForm(doc));
      setEditItems(initEditableItems(doc.items));
      setSaveMsg('Saved');
      setTimeout(() => setSaveMsg(null), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setIsSaving(false);
    }
  }

  // ─── Header form handler ──────────────────────
  function handleHeaderChange(field: keyof HeaderForm, value: string) {
    if (!headerForm) return;
    setHeaderForm({ ...headerForm, [field]: value });
  }

  // ─── Loading ──────────────────────────────────
  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center py-20">
        <Loader2 className="animate-spin text-gray-300" size={24} />
        <span className="ml-2 text-sm text-gray-400">Loading document...</span>
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
          <ArrowLeft size={14} /> Back to Purchases
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

  // ─── Items for Totals (works for both modes) ──
  const totalsItems = isEditable
    ? editItems.map((i) => ({
        quantity: i.quantity,
        priceWithoutVat: i.priceWithoutVat,
        vatRate: i.vatRate,
      }))
    : purchase.items;

  // ─── Render ───────────────────────────────────
  return (
    <div className="p-6 space-y-4">
      {/* Back + Save bar */}
      <div className="flex items-center justify-between">
        <Link
          href={`/company/${companyId}/purchases`}
          className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 transition-colors"
        >
          <ArrowLeft size={14} /> Purchases
        </Link>

        {isEditable && (
          <div className="flex items-center gap-2">
            {saveMsg && (
              <span className="text-xs text-green-600 font-medium">{saveMsg}</span>
            )}
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white text-xs font-medium rounded-md transition-colors"
            >
              {isSaving ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Save size={14} />
              )}
              {isSaving ? 'Saving...' : 'Save'}
            </button>
            <button
              disabled
              className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-gray-100 text-gray-400 text-xs font-medium rounded-md cursor-not-allowed"
              title="Posting will be available in Task 39"
            >
              Post
            </button>
          </div>
        )}
      </div>

      {/* Header */}
      {isEditable && headerForm ? (
        <PurchaseHeaderEdit
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
        <PurchaseItemsEdit items={editItems} onChange={setEditItems} />
      ) : (
        <PurchaseItemsTable items={purchase.items} />
      )}

      {/* Totals */}
      <PurchaseTotals
        items={totalsItems}
        currencyCode={isEditable ? (headerForm?.currencyCode || 'EUR') : purchase.currencyCode}
      />
    </div>
  );
}
