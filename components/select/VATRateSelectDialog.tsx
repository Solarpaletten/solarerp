// components/select/VATRateSelectDialog.tsx
// ═══════════════════════════════════════════════════
// Task 57_1: VAT Rate Selection Window
// ═══════════════════════════════════════════════════

'use client';

import { useCallback, useState } from 'react';
import { EntitySelectDialog, type EntityColumn } from './EntitySelectDialog';

export interface VATRateEntity {
  id: string;
  name: string;
  rate: number;
  code: string | null;
  category: string;
  isDefault: boolean;
  isActive: boolean;
  effectiveFrom: string | null;
}

const CATEGORY_COLORS: Record<string, string> = {
  STANDARD: 'bg-blue-100 text-blue-700',
  REDUCED: 'bg-emerald-100 text-emerald-700',
  ZERO_EXPORT: 'bg-amber-100 text-amber-700',
  ZERO_INTRACOM: 'bg-purple-100 text-purple-700',
  REVERSE_CHARGE: 'bg-red-100 text-red-700',
  NO_VAT: 'bg-gray-100 text-gray-600',
};

const vatRateColumns: EntityColumn<VATRateEntity>[] = [
  {
    key: 'name', label: 'VAT Rate',
    render: (_, row) => (
      <div className="flex items-center gap-2">
        <span className="font-medium text-gray-900">{row.name}</span>
        {row.isDefault && (
          <span className="inline-flex px-1.5 py-0.5 rounded text-[9px] font-semibold bg-emerald-100 text-emerald-700">
            DEFAULT
          </span>
        )}
      </div>
    ),
  },
  {
    key: 'rate', label: 'Rate %', width: '80px', align: 'right', mono: true,
    render: (v) => <span className="font-bold">{Number(v).toFixed(2)}%</span>,
  },
  {
    key: 'code', label: 'Code', width: '90px', mono: true,
    render: (v) => v ? String(v) : <span className="text-gray-300">&mdash;</span>,
  },
  {
    key: 'category', label: 'Category', width: '130px', align: 'center',
    render: (v) => (
      <span className={`inline-flex px-2 py-0.5 rounded-full text-[9px] font-semibold ${CATEGORY_COLORS[String(v)] || 'bg-gray-100 text-gray-600'}`}>
        {String(v).replace(/_/g, ' ')}
      </span>
    ),
  },
  {
    key: 'effectiveFrom', label: 'Effective', width: '100px',
    render: (v) => v ? <span className="text-xs text-gray-500">{new Date(String(v)).toLocaleDateString('de-DE')}</span> : <span className="text-gray-300">&mdash;</span>,
  },
];

// ─── Quick Create ──────────────────────────────────
function QuickCreateVATRate({ companyId, onCreated, onCancel }: {
  companyId: string;
  onCreated: (vr: VATRateEntity) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState('');
  const [rate, setRate] = useState('');
  const [code, setCode] = useState('');
  const [category, setCategory] = useState('STANDARD');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    if (!name.trim()) { setError('Name is required'); return; }
    if (!rate || isNaN(Number(rate))) { setError('Valid rate is required'); return; }
    setSaving(true); setError('');
    try {
      const res = await fetch(`/api/company/${companyId}/vat-rates`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(), rate: Number(rate),
          code: code.trim() || undefined, category,
        }),
      });
      if (!res.ok) { const j = await res.json().catch(() => ({})); throw new Error(j.error || 'Failed'); }
      const json = await res.json();
      const d = json.data;
      onCreated({
        id: d.id, name: d.name, rate: Number(d.rate),
        code: d.code || null, category: d.category,
        isDefault: d.isDefault ?? false, isActive: d.isActive ?? true,
        effectiveFrom: d.effectiveFrom || null,
      });
    } catch (err) { setError(err instanceof Error ? err.message : 'Failed'); }
    finally { setSaving(false); }
  };

  const INPUT = 'w-full text-sm border border-gray-200 rounded-md px-3 py-1.5 focus:ring-1 focus:ring-blue-400';

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-900">Quick Create VAT Rate</h3>
        <button onClick={onCancel} className="text-xs text-gray-400 hover:text-gray-600">&times; Cancel</button>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="text-[10px] font-semibold text-gray-500 uppercase">Name *</label>
          <input className={INPUT} value={name} onChange={e => setName(e.target.value)} placeholder="PVM 21%" autoFocus />
        </div>
        <div>
          <label className="text-[10px] font-semibold text-gray-500 uppercase">Rate % *</label>
          <input className={INPUT} type="number" step="0.01" value={rate} onChange={e => setRate(e.target.value)} placeholder="21.00" />
        </div>
        <div>
          <label className="text-[10px] font-semibold text-gray-500 uppercase">Code</label>
          <input className={INPUT} value={code} onChange={e => setCode(e.target.value)} placeholder="PVM1" />
        </div>
      </div>
      <div>
        <label className="text-[10px] font-semibold text-gray-500 uppercase">Category</label>
        <select className={INPUT} value={category} onChange={e => setCategory(e.target.value)}>
          <option value="STANDARD">Standard</option>
          <option value="REDUCED">Reduced</option>
          <option value="ZERO_EXPORT">Zero (Export)</option>
          <option value="ZERO_INTRACOM">Zero (Intra-community)</option>
          <option value="REVERSE_CHARGE">Reverse Charge</option>
          <option value="NO_VAT">No VAT</option>
        </select>
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
interface VATRateSelectDialogProps {
  companyId: string;
  open: boolean;
  onClose: () => void;
  onSelect: (vatRate: VATRateEntity) => void;
}

export function VATRateSelectDialog({ companyId, open, onClose, onSelect }: VATRateSelectDialogProps) {
  const fetchRates = useCallback(async (): Promise<VATRateEntity[]> => {
    const res = await fetch(`/api/company/${companyId}/vat-rates?isActive=true`, { cache: 'no-store' });
    if (!res.ok) return [];
    const json = await res.json();
    return (json.data || []).map((d: Record<string, unknown>) => ({
      id: String(d.id),
      name: String(d.name || ''),
      rate: Number(d.rate || 0),
      code: d.code ? String(d.code) : null,
      category: String(d.category || 'STANDARD'),
      isDefault: Boolean(d.isDefault),
      isActive: Boolean(d.isActive),
      effectiveFrom: d.effectiveFrom ? String(d.effectiveFrom) : null,
    }));
  }, [companyId]);

  return (
    <EntitySelectDialog<VATRateEntity>
      title="Select VAT Rate"
      open={open}
      onClose={onClose}
      onSelect={onSelect}
      fetchEntities={fetchRates}
      columns={vatRateColumns}
      searchKeys={['name', 'code', 'category']}
      createLabel="+ Create VAT Rate"
      renderCreateForm={({ onCreated, onCancel }) => (
        <QuickCreateVATRate companyId={companyId} onCreated={onCreated} onCancel={onCancel} />
      )}
      emptyMessage="No VAT rates found. Create your first rate."
      emptyIcon="🏷️"
    />
  );
}
