// app/(dashboard)/company/[companyId]/sales/[saleId]/page.tsx
// ═══════════════════════════════════════════════════
// Task 50: Sales Document Editor
// ═══════════════════════════════════════════════════
// Mirrors Purchase Editor (Task 41+49)
// DRAFT → editable, POSTED → read-only + accounting, CANCELLED → read-only

'use client';

import { useParams, useRouter } from 'next/navigation';
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Field, Section, INPUT, SELECT } from '@/components/ui/FormField';

interface SaleItem { id: string; itemName: string; itemCode: string | null; quantity: string | number; priceWithoutVat: string | number; vatRate: string | number | null; }
interface SaleDocument { id: string; series: string; number: string; saleDate: string; payUntil: string | null; clientName: string; clientCode: string | null; warehouseName: string; operationType: string; currencyCode: string; employeeName: string | null; comments: string | null; status: string | null; items: SaleItem[]; }
type EditItem = { id: string; itemName: string; itemCode: string; quantity: number; priceWithoutVat: number; vatRate: number };
type HeaderForm = { saleDate: string; clientName: string; clientCode: string; warehouseName: string; currencyCode: string; operationType: string; comments: string };

function toDate(s: string) { try { return new Date(s).toISOString().split('T')[0]; } catch { return ''; } }
function initHeader(d: SaleDocument): HeaderForm {
  return { saleDate: toDate(d.saleDate), clientName: d.clientName || '', clientCode: d.clientCode || '', warehouseName: d.warehouseName || 'Main', currencyCode: d.currencyCode || 'EUR', operationType: d.operationType || 'SALE', comments: d.comments || '' };
}
function initItems(items: SaleItem[]): EditItem[] {
  return items.map(i => ({ id: i.id, itemName: i.itemName || '', itemCode: i.itemCode || '', quantity: Number(i.quantity) || 0, priceWithoutVat: Number(i.priceWithoutVat) || 0, vatRate: i.vatRate != null ? Number(i.vatRate) : 19 }));
}

const STATUS_CFG: Record<string, { label: string; cls: string }> = {
  DRAFT: { label: 'DRAFT', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  POSTED: { label: 'POSTED', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  CANCELLED: { label: 'CANCELLED', cls: 'bg-red-50 text-red-600 border-red-200' },
};

export default function SaleEditorPage() {
  const params = useParams();
  const router = useRouter();
  const companyId = params.companyId as string;
  const saleId = params.saleId as string;
  const base = `/company/${companyId}`;

  const [sale, setSale] = useState<SaleDocument | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [header, setHeader] = useState<HeaderForm | null>(null);
  const [items, setItems] = useState<EditItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [posting, setPosting] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);

  const status = sale?.status || 'DRAFT';
  const isDraft = status === 'DRAFT';
  const showAccounting = status === 'POSTED' || status === 'CANCELLED';
  const sc = STATUS_CFG[status] || STATUS_CFG.DRAFT;

  const fetchSale = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = await fetch(`/api/company/${companyId}/sales/${saleId}`, { cache: 'no-store' });
      if (!res.ok) throw new Error('Sale not found');
      const json = await res.json();
      const d = json.data as SaleDocument;
      setSale(d); setHeader(initHeader(d)); setItems(initItems(d.items)); setDirty(false);
    } catch (err) { setError(err instanceof Error ? err.message : 'Error'); }
    finally { setLoading(false); }
  }, [companyId, saleId]);

  useEffect(() => { fetchSale(); }, [fetchSale]);

  const hSet = (k: keyof HeaderForm, v: string) => { if (header) { setHeader({ ...header, [k]: v }); setDirty(true); } };

  // Items management
  const addItem = () => { setItems([...items, { id: `new-${Date.now()}`, itemName: '', itemCode: '', quantity: 1, priceWithoutVat: 0, vatRate: 19 }]); setDirty(true); };
  const removeItem = (idx: number) => { setItems(items.filter((_, i) => i !== idx)); setDirty(true); };
  const updateItem = (idx: number, key: keyof EditItem, val: string | number) => {
    const n = [...items]; n[idx] = { ...n[idx], [key]: val }; setItems(n); setDirty(true);
  };

  // Save
  const handleSave = async () => {
    if (!header) return;
    setSaving(true); setError(null); setSaveMsg(null);
    try {
      const res = await fetch(`/api/company/${companyId}/sales/${saleId}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...header, items: items.map(i => ({ itemName: i.itemName, itemCode: i.itemCode || null, quantity: i.quantity, priceWithoutVat: i.priceWithoutVat, vatRate: i.vatRate })) }),
      });
      if (!res.ok) { const j = await res.json().catch(() => ({})); throw new Error(j.error || 'Save failed'); }
      await fetchSale(); setSaveMsg('Saved'); setTimeout(() => setSaveMsg(null), 2000);
    } catch (err) { setError(err instanceof Error ? err.message : 'Save failed'); }
    finally { setSaving(false); }
  };

  // Post
  const handlePost = async () => {
    if (!header || items.length === 0) { setError('Add at least one item'); return; }
    if (!header.clientName.trim()) { setError('Client name is required'); return; }
    if (!confirm(`Post ${sale?.series}-${sale?.number}?\nJournal + Stock + FIFO will be created. Document becomes read-only.`)) return;

    setPosting(true); setError(null);
    try {
      // Save first
      await fetch(`/api/company/${companyId}/sales/${saleId}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...header, items: items.map(i => ({ itemName: i.itemName, itemCode: i.itemCode || null, quantity: i.quantity, priceWithoutVat: i.priceWithoutVat, vatRate: i.vatRate })) }),
      });
      // Post (uses existing POST /sales endpoint which creates journal+stock+FIFO)
      const res = await fetch(`/api/company/${companyId}/sales`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          saleDate: header.saleDate, series: sale?.series, number: sale?.number,
          clientName: header.clientName, clientCode: header.clientCode,
          warehouseName: header.warehouseName, operationType: header.operationType,
          currencyCode: header.currencyCode, employeeName: null,
          items: items.map(i => ({ itemName: i.itemName, itemCode: i.itemCode || null, quantity: i.quantity, priceWithoutVat: i.priceWithoutVat, vatRate: i.vatRate })),
        }),
      });
      if (!res.ok) { const j = await res.json().catch(() => ({})); throw new Error(j.error || 'Post failed'); }
      await fetchSale(); setSaveMsg('Posted'); setTimeout(() => setSaveMsg(null), 3000);
    } catch (err) { setError(err instanceof Error ? err.message : 'Post failed'); await fetchSale(); }
    finally { setPosting(false); }
  };

  // Copy
  const handleCopy = async () => {
    try {
      const res = await fetch(`/api/company/${companyId}/sales/${saleId}/copy`, { method: 'POST' });
      if (!res.ok) { const j = await res.json().catch(() => ({})); throw new Error(j.error || 'Copy failed'); }
      const json = await res.json();
      router.replace(`${base}/sales/${json.data.id}`);
    } catch (err) { setError(err instanceof Error ? err.message : 'Copy failed'); }
  };

  // Cancel
  const handleCancel = async () => {
    if (!confirm(`Cancel ${sale?.series}-${sale?.number}? Creates reversal (STORNO).`)) return;
    try {
      const res = await fetch(`/api/company/${companyId}/sales/${saleId}/cancel`, { method: 'POST' });
      if (!res.ok) { const j = await res.json().catch(() => ({})); throw new Error(j.error || 'Cancel failed'); }
      await fetchSale(); setSaveMsg('Cancelled (Storno)'); setTimeout(() => setSaveMsg(null), 3000);
    } catch (err) { setError(err instanceof Error ? err.message : 'Cancel failed'); }
  };

  // Totals
  const netTotal = items.reduce((s, i) => s + i.quantity * i.priceWithoutVat, 0);
  const vatTotal = items.reduce((s, i) => s + i.quantity * i.priceWithoutVat * (i.vatRate / 100), 0);

  if (loading) return <div className="flex items-center justify-center h-full py-20"><div className="text-gray-400 text-sm">Loading sale...</div></div>;
  if (!sale) return <div className="p-6"><Link href={`${base}/sales`} className="text-xs text-gray-400">&larr; Sales</Link><div className="bg-white border rounded-lg p-12 text-center mt-4 text-gray-500 text-sm">{error || 'Not found'}</div></div>;

  return (
    <div className="p-6 space-y-4">
      {/* Actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href={`${base}/sales`} className="text-xs text-gray-400 hover:text-gray-600">&larr; Sales</Link>
          {saveMsg && <span className="text-xs text-emerald-600 font-medium">{saveMsg}</span>}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => router.replace(`${base}/sales`)} className="px-3 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-md hover:bg-gray-50">Close</button>
          {(status === 'POSTED' || status === 'CANCELLED') && <button onClick={handleCopy} className="px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100">Copy</button>}
          {status === 'POSTED' && <button onClick={handleCancel} className="px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 border border-red-200 rounded-md hover:bg-red-100">Cancel (Storno)</button>}
          {isDraft && <button onClick={handleSave} disabled={saving || !dirty} className="px-4 py-1.5 text-xs font-semibold text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:bg-blue-300">{saving ? 'Saving...' : 'Save'}</button>}
          {isDraft && <button onClick={handlePost} disabled={posting} className="px-4 py-1.5 text-xs font-semibold text-white bg-emerald-600 rounded-md hover:bg-emerald-700 disabled:bg-emerald-300">{posting ? 'Posting...' : 'Post'}</button>}
        </div>
      </div>

      {error && <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-2.5 text-sm text-red-700 flex justify-between"><span>{error}</span><button onClick={() => setError(null)} className="text-red-400 text-xs">&times;</button></div>}

      {/* Header */}
      <div className="bg-white border border-gray-200 rounded-lg p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-mono text-base font-bold text-gray-900">{sale.series}-{sale.number}</h2>
            <span className="text-xs text-gray-400">Sales Document</span>
          </div>
          <span className={`px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded border ${sc.cls}`}>{sc.label}</span>
        </div>
        {isDraft && header ? (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <Field label="Sale date"><input className={INPUT} type="date" value={header.saleDate} onChange={e => hSet('saleDate', e.target.value)} /></Field>
            <Field label="Customer" required><input className={INPUT} value={header.clientName} onChange={e => hSet('clientName', e.target.value)} /></Field>
            <Field label="Customer code"><input className={INPUT} value={header.clientCode} onChange={e => hSet('clientCode', e.target.value)} /></Field>
            <Field label="Warehouse"><input className={INPUT} value={header.warehouseName} onChange={e => hSet('warehouseName', e.target.value)} /></Field>
            <Field label="Currency"><input className={INPUT} value={header.currencyCode} onChange={e => hSet('currencyCode', e.target.value)} /></Field>
            <Field label="Comments"><input className={INPUT} value={header.comments} onChange={e => hSet('comments', e.target.value)} /></Field>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div><span className="text-[11px] text-gray-400 uppercase block">Customer</span>{sale.clientName}</div>
            <div><span className="text-[11px] text-gray-400 uppercase block">Date</span>{toDate(sale.saleDate)}</div>
            <div><span className="text-[11px] text-gray-400 uppercase block">Warehouse</span>{sale.warehouseName}</div>
          </div>
        )}
      </div>

      {/* Items */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Item</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase w-20">Code</th>
              <th className="px-3 py-2 text-right text-xs font-semibold text-gray-500 uppercase w-20">Qty</th>
              <th className="px-3 py-2 text-right text-xs font-semibold text-gray-500 uppercase w-24">Price</th>
              <th className="px-3 py-2 text-right text-xs font-semibold text-gray-500 uppercase w-16">VAT%</th>
              <th className="px-3 py-2 text-right text-xs font-semibold text-gray-500 uppercase w-24">Net</th>
              <th className="px-3 py-2 text-right text-xs font-semibold text-gray-500 uppercase w-24">Gross</th>
              {isDraft && <th className="w-8"></th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {(isDraft ? items : sale.items.map(i => ({ ...i, itemCode: i.itemCode || '', quantity: Number(i.quantity), priceWithoutVat: Number(i.priceWithoutVat), vatRate: Number(i.vatRate || 0) }))).map((item, idx) => {
              const net = item.quantity * item.priceWithoutVat;
              const gross = net * (1 + item.vatRate / 100);
              return (
                <tr key={item.id || idx}>
                  <td className="px-3 py-1.5">{isDraft ? <input className="w-full text-sm border-0 focus:ring-0 p-0" value={item.itemName} onChange={e => updateItem(idx, 'itemName', e.target.value)} /> : item.itemName}</td>
                  <td className="px-3 py-1.5 font-mono text-xs">{isDraft ? <input className="w-full text-sm border-0 focus:ring-0 p-0 font-mono" value={item.itemCode} onChange={e => updateItem(idx, 'itemCode', e.target.value)} /> : item.itemCode}</td>
                  <td className="px-3 py-1.5 text-right">{isDraft ? <input type="number" min="0" className="w-16 text-sm text-right border-0 focus:ring-0 p-0" value={item.quantity} onChange={e => updateItem(idx, 'quantity', Number(e.target.value))} /> : Number(item.quantity).toLocaleString('de-DE')}</td>
                  <td className="px-3 py-1.5 text-right">{isDraft ? <input type="number" min="0" step="0.01" className="w-20 text-sm text-right border-0 focus:ring-0 p-0" value={item.priceWithoutVat} onChange={e => updateItem(idx, 'priceWithoutVat', Number(e.target.value))} /> : Number(item.priceWithoutVat).toLocaleString('de-DE', { minimumFractionDigits: 2 })}</td>
                  <td className="px-3 py-1.5 text-right">{isDraft ? <input type="number" min="0" max="100" className="w-12 text-sm text-right border-0 focus:ring-0 p-0" value={item.vatRate} onChange={e => updateItem(idx, 'vatRate', Number(e.target.value))} /> : item.vatRate}</td>
                  <td className="px-3 py-1.5 text-right font-mono">{net.toLocaleString('de-DE', { minimumFractionDigits: 2 })}</td>
                  <td className="px-3 py-1.5 text-right font-mono font-medium">{gross.toLocaleString('de-DE', { minimumFractionDigits: 2 })}</td>
                  {isDraft && <td className="px-1"><button onClick={() => removeItem(idx)} className="text-gray-300 hover:text-red-500 text-xs">&times;</button></td>}
                </tr>
              );
            })}
          </tbody>
        </table>
        {isDraft && <div className="px-3 py-2 border-t"><button onClick={addItem} className="text-xs text-blue-600 hover:text-blue-800 font-medium">+ Add item</button></div>}
      </div>

      {/* Totals */}
      <div className="bg-white border border-gray-200 rounded-lg p-4 flex justify-end">
        <div className="text-sm space-y-1 text-right">
          <div className="text-gray-500">Net: <span className="font-mono font-medium text-gray-900">{netTotal.toLocaleString('de-DE', { minimumFractionDigits: 2 })} {header?.currencyCode || sale.currencyCode}</span></div>
          <div className="text-gray-500">VAT: <span className="font-mono text-gray-700">{vatTotal.toLocaleString('de-DE', { minimumFractionDigits: 2 })}</span></div>
          <div className="text-gray-900 font-semibold">Total: <span className="font-mono">{(netTotal + vatTotal).toLocaleString('de-DE', { minimumFractionDigits: 2 })} {header?.currencyCode || sale.currencyCode}</span></div>
        </div>
      </div>

      {/* Accounting View (POSTED/CANCELLED) */}
      {showAccounting && (
        <div className="bg-white border border-gray-200 rounded-lg p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Accounting entries</h3>
          <p className="text-xs text-gray-400">Journal entries for this sale are visible in the accounting module. Revenue: DR 1200 AR / CR 8400 Revenue. COGS: DR 5000 / CR 1400 Inventory.</p>
        </div>
      )}
    </div>
  );
}
