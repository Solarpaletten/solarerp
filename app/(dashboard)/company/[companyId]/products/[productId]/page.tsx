// app/(dashboard)/company/[companyId]/products/[productId]/page.tsx
// ═══════════════════════════════════════════════════
// Task 51: Product Editor (production quality)
// ═══════════════════════════════════════════════════

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Field, Section, INPUT } from '@/components/ui/FormField';

const EMPTY: Record<string, unknown> = {
  name: '', code: '', barcode: '', unitName: 'pcs',
  vatRate: '', priceWithoutVat: '', priceWithVat: '',
  groupName: '', manufacturer: '', countryOfOrigin: '',
  purchaseAccountCode: '', saleAccountCode: '', expenseAccountCode: '',
  minimumQuantity: '', description: '', freePrice: false,
};

export default function ProductEditorPage() {
  const params = useParams();
  const router = useRouter();
  const companyId = params.companyId as string;
  const productId = params.productId as string;
  const base = `/company/${companyId}`;

  const [data, setData] = useState<Record<string, unknown>>({ ...EMPTY });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);

  const loadProduct = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/company/${companyId}/products/${productId}`, { cache: 'no-store' });
      if (!res.ok) throw new Error('Product not found');
      const json = await res.json();
      const d = json.data;
      const mapped: Record<string, unknown> = {};
      for (const key of Object.keys(EMPTY)) mapped[key] = d[key] ?? EMPTY[key];
      mapped.id = d.id;
      mapped.vatRate = d.vatRate != null ? String(d.vatRate) : '';
      mapped.priceWithoutVat = d.priceWithoutVat != null ? String(d.priceWithoutVat) : '';
      mapped.priceWithVat = d.priceWithVat != null ? String(d.priceWithVat) : '';
      mapped.minimumQuantity = d.minimumQuantity != null ? String(d.minimumQuantity) : '';
      setData(mapped);
    } catch (err) { setError(err instanceof Error ? err.message : 'Failed to load'); }
    finally { setLoading(false); }
  }, [companyId, productId]);

  useEffect(() => { loadProduct(); }, [loadProduct]);

  const set = (key: string, value: unknown) => { setData(prev => ({ ...prev, [key]: value })); setDirty(true); };

  const handleSave = async () => {
    if (!String(data.name || '').trim()) { setError('Name is required'); return; }
    if (!String(data.unitName || '').trim()) { setError('Unit is required'); return; }

    setSaving(true); setError(null); setSaveMsg(null);
    try {
      const payload = {
        ...data,
        vatRate: data.vatRate ? Number(data.vatRate) : null,
        priceWithoutVat: data.priceWithoutVat ? Number(data.priceWithoutVat) : null,
        priceWithVat: data.priceWithVat ? Number(data.priceWithVat) : null,
        minimumQuantity: data.minimumQuantity ? Number(data.minimumQuantity) : null,
      };
      const res = await fetch(`/api/company/${companyId}/products/${productId}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error || 'Save failed'); }
      setDirty(false); setSaveMsg('Saved'); setTimeout(() => setSaveMsg(null), 2500);
      loadProduct();
    } catch (err) { setError(err instanceof Error ? err.message : 'Save failed'); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!confirm('Delete this product?')) return;
    try {
      const res = await fetch(`/api/company/${companyId}/products/${productId}`, { method: 'DELETE' });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error || 'Delete failed'); }
      router.replace(`${base}/products`);
    } catch (err) { setError(err instanceof Error ? err.message : 'Delete failed'); }
  };

  const handleCopy = async () => {
    try {
      const res = await fetch(`/api/company/${companyId}/products/${productId}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error || 'Copy failed'); }
      const json = await res.json();
      router.replace(`${base}/products/${json.data.id}`);
    } catch (err) { setError(err instanceof Error ? err.message : 'Copy failed'); }
  };

  if (loading) return <div className="flex items-center justify-center h-full py-20"><div className="text-gray-400 text-sm">Loading product...</div></div>;

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <a href={`${base}/products`} className="text-xs text-gray-400 hover:text-gray-600 mb-1 inline-block">&larr; Products</a>
          <h1 className="text-xl font-bold text-gray-900">{String(data.name || 'Product')}</h1>
          {data.code && <p className="text-sm text-gray-500 mt-0.5">Code: <span className="font-mono font-medium">{String(data.code)}</span></p>}
        </div>
      </div>

      {error && <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-2.5 text-sm text-red-700 flex justify-between"><span>{error}</span><button onClick={() => setError(null)} className="text-red-400 text-xs">&times;</button></div>}
      {saveMsg && <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-2 text-sm text-emerald-700">{saveMsg}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <Section title="Product Identity">
            <div className="grid grid-cols-2 gap-4">
              <Field label="Name" required><input className={INPUT} value={String(data.name || '')} onChange={e => set('name', e.target.value)} /></Field>
              <Field label="Code / SKU"><input className={INPUT} value={String(data.code || '')} onChange={e => set('code', e.target.value)} placeholder="MBP-14" /></Field>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <Field label="Barcode"><input className={INPUT} value={String(data.barcode || '')} onChange={e => set('barcode', e.target.value)} /></Field>
              <Field label="Unit" required><input className={INPUT} value={String(data.unitName || '')} onChange={e => set('unitName', e.target.value)} placeholder="pcs" /></Field>
              <Field label="Group"><input className={INPUT} value={String(data.groupName || '')} onChange={e => set('groupName', e.target.value)} placeholder="Electronics" /></Field>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Manufacturer"><input className={INPUT} value={String(data.manufacturer || '')} onChange={e => set('manufacturer', e.target.value)} /></Field>
              <Field label="Country of origin"><input className={INPUT} value={String(data.countryOfOrigin || '')} onChange={e => set('countryOfOrigin', e.target.value)} /></Field>
            </div>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={Boolean(data.freePrice)} onChange={e => set('freePrice', e.target.checked)} className="rounded border-gray-300" /> Free price</label>
          </Section>

          <Section title="Description">
            <Field label="Description"><textarea className={`${INPUT} h-20`} value={String(data.description || '')} onChange={e => set('description', e.target.value)} /></Field>
          </Section>
        </div>

        <div className="space-y-4">
          <Section title="Pricing" color="text-blue-700">
            <Field label="Price without VAT"><input className={INPUT} type="number" min="0" step="0.01" value={String(data.priceWithoutVat || '')} onChange={e => set('priceWithoutVat', e.target.value)} /></Field>
            <Field label="Price with VAT"><input className={INPUT} type="number" min="0" step="0.01" value={String(data.priceWithVat || '')} onChange={e => set('priceWithVat', e.target.value)} /></Field>
            <Field label="VAT rate (%)"><input className={INPUT} type="number" min="0" max="100" value={String(data.vatRate || '')} onChange={e => set('vatRate', e.target.value)} /></Field>
            <Field label="Minimum quantity"><input className={INPUT} type="number" min="0" value={String(data.minimumQuantity || '')} onChange={e => set('minimumQuantity', e.target.value)} /></Field>
          </Section>
          <Section title="Accounting Codes">
            <Field label="Purchase account"><input className={INPUT} value={String(data.purchaseAccountCode || '')} onChange={e => set('purchaseAccountCode', e.target.value)} placeholder="3400" /></Field>
            <Field label="Sale account"><input className={INPUT} value={String(data.saleAccountCode || '')} onChange={e => set('saleAccountCode', e.target.value)} placeholder="8400" /></Field>
            <Field label="Expense account"><input className={INPUT} value={String(data.expenseAccountCode || '')} onChange={e => set('expenseAccountCode', e.target.value)} placeholder="5400" /></Field>
          </Section>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between pt-2 border-t border-gray-200">
        <div className="flex items-center gap-2">
          <button onClick={handleCopy} className="px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100">Copy</button>
          <button onClick={handleDelete} className="px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 border border-red-200 rounded-md hover:bg-red-100">Delete</button>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => router.replace(`${base}/products`)} className="px-4 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-md hover:bg-gray-50">Close</button>
          <button onClick={handleSave} disabled={saving || !dirty} className="px-4 py-1.5 text-xs font-semibold text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:bg-blue-300">{saving ? 'Saving...' : 'Save'}</button>
        </div>
      </div>
    </div>
  );
}
