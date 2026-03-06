// components/select/ProductSelectDialog.tsx
// ═══════════════════════════════════════════════════
// Task 57: Product Selection Window (SAP/Odoo style)
// ═══════════════════════════════════════════════════
// Uses EntitySelectDialog with product-specific columns
// Includes inline quick-create form

'use client';

import { useCallback, useState } from 'react';
import { EntitySelectDialog, type EntityColumn } from './EntitySelectDialog';

export interface ProductEntity {
  id: string;
  name: string;
  code: string | null;
  barcode: string | null;
  unitName: string;
  vatRate: number | null;
  priceWithoutVat: number | null;
  groupName: string | null;
  manufacturer: string | null;
}

const productColumns: EntityColumn<ProductEntity>[] = [
  {
    key: 'code', label: 'Code', width: '110px', mono: true,
    render: (v) => v ? <span className="font-semibold">{String(v)}</span> : <span className="text-gray-300">&mdash;</span>,
  },
  {
    key: 'name', label: 'Product',
    render: (_, row) => (
      <div>
        <span className="font-medium text-gray-900">{row.name}</span>
        {row.manufacturer && <span className="ml-2 text-[10px] text-gray-400">{row.manufacturer}</span>}
      </div>
    ),
  },
  { key: 'unitName', label: 'Unit', width: '70px', align: 'center' },
  {
    key: 'vatRate', label: 'VAT', width: '60px', align: 'right',
    render: (v) => v != null ? `${v}%` : <span className="text-gray-300">&mdash;</span>,
  },
  {
    key: 'priceWithoutVat', label: 'Price', width: '100px', align: 'right', mono: true,
    render: (v) => v != null ? Number(v).toLocaleString('de-DE', { minimumFractionDigits: 2 }) : <span className="text-gray-300">&mdash;</span>,
  },
];

// ─── Quick Create Form ─────────────────────────────
function QuickCreateProduct({ companyId, onCreated, onCancel }: {
  companyId: string;
  onCreated: (product: ProductEntity) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [unit, setUnit] = useState('pcs');
  const [vat, setVat] = useState('19');
  const [price, setPrice] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    if (!name.trim()) { setError('Name is required'); return; }
    setSaving(true); setError('');
    try {
      const res = await fetch(`/api/company/${companyId}/products`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          code: code.trim() || undefined,
          unitName: unit,
          vatRate: vat ? Number(vat) : 19,
          priceWithoutVat: price ? Number(price) : undefined,
        }),
      });
      if (!res.ok) { const j = await res.json().catch(() => ({})); throw new Error(j.error || 'Failed'); }
      const json = await res.json();
      const d = json.data;
      onCreated({
        id: d.id, name: d.name, code: d.code || null, barcode: d.barcode || null,
        unitName: d.unitName || 'pcs', vatRate: d.vatRate != null ? Number(d.vatRate) : null,
        priceWithoutVat: d.priceWithoutVat != null ? Number(d.priceWithoutVat) : null,
        groupName: d.groupName || null, manufacturer: d.manufacturer || null,
      });
    } catch (err) { setError(err instanceof Error ? err.message : 'Failed'); }
    finally { setSaving(false); }
  };

  const INPUT = 'w-full text-sm border border-gray-200 rounded-md px-3 py-1.5 focus:ring-1 focus:ring-blue-400';

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-900">Quick Create Product</h3>
        <button onClick={onCancel} className="text-xs text-gray-400 hover:text-gray-600">&times; Cancel</button>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
      <div className="grid grid-cols-3 gap-3">
        <div className="col-span-2">
          <label className="text-[10px] font-semibold text-gray-500 uppercase">Name *</label>
          <input className={INPUT} value={name} onChange={e => setName(e.target.value)} placeholder="MacBook Pro" autoFocus />
        </div>
        <div>
          <label className="text-[10px] font-semibold text-gray-500 uppercase">Code</label>
          <input className={INPUT} value={code} onChange={e => setCode(e.target.value)} placeholder="MBP-14" />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="text-[10px] font-semibold text-gray-500 uppercase">Unit</label>
          <input className={INPUT} value={unit} onChange={e => setUnit(e.target.value)} />
        </div>
        <div>
          <label className="text-[10px] font-semibold text-gray-500 uppercase">VAT %</label>
          <input className={INPUT} type="number" value={vat} onChange={e => setVat(e.target.value)} />
        </div>
        <div>
          <label className="text-[10px] font-semibold text-gray-500 uppercase">Price</label>
          <input className={INPUT} type="number" step="0.01" value={price} onChange={e => setPrice(e.target.value)} placeholder="0.00" />
        </div>
      </div>
      <div className="flex justify-end">
        <button onClick={handleSave} disabled={saving}
          className="px-4 py-1.5 text-xs font-semibold text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:bg-blue-300">
          {saving ? 'Creating...' : 'Create & Select'}
        </button>
      </div>
    </div>
  );
}

// ─── Exported Dialog ───────────────────────────────
interface ProductSelectDialogProps {
  companyId: string;
  open: boolean;
  onClose: () => void;
  onSelect: (product: ProductEntity) => void;
}

export function ProductSelectDialog({ companyId, open, onClose, onSelect }: ProductSelectDialogProps) {
  const fetchProducts = useCallback(async (): Promise<ProductEntity[]> => {
    const res = await fetch(`/api/company/${companyId}/products?pageSize=200`, { cache: 'no-store' });
    if (!res.ok) return [];
    const json = await res.json();
    return (json.data || []).map((p: Record<string, unknown>) => ({
      id: String(p.id),
      name: String(p.name || ''),
      code: p.code ? String(p.code) : null,
      barcode: p.barcode ? String(p.barcode) : null,
      unitName: String(p.unitName || 'pcs'),
      vatRate: p.vatRate != null ? Number(p.vatRate) : null,
      priceWithoutVat: p.priceWithoutVat != null ? Number(p.priceWithoutVat) : null,
      groupName: p.groupName ? String(p.groupName) : null,
      manufacturer: p.manufacturer ? String(p.manufacturer) : null,
    }));
  }, [companyId]);

  return (
    <EntitySelectDialog<ProductEntity>
      title="Select Product"
      open={open}
      onClose={onClose}
      onSelect={onSelect}
      fetchEntities={fetchProducts}
      columns={productColumns}
      searchKeys={['name', 'code', 'barcode', 'manufacturer']}
      createLabel="+ Create Product"
      renderCreateForm={({ onCreated, onCancel }) => (
        <QuickCreateProduct companyId={companyId} onCreated={onCreated} onCancel={onCancel} />
      )}
      emptyMessage="No products found. Create your first product."
      emptyIcon="📦"
    />
  );
}
