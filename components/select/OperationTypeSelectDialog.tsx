// components/select/OperationTypeSelectDialog.tsx
// ═══════════════════════════════════════════════════
// Task 57_1: Operation Type Selection Window
// ═══════════════════════════════════════════════════
// Determines: accounting entries, warehouse impact, VAT

'use client';

import { useCallback, useState } from 'react';
import { EntitySelectDialog, type EntityColumn } from './EntitySelectDialog';

export interface OperationTypeEntity {
  id: string;
  name: string;
  code: string;
  module: string;
  debitAccountCode: string | null;
  creditAccountCode: string | null;
  vatAccountCode: string | null;
  expenseAccountCode: string | null;
  revenueAccountCode: string | null;
  advanceAccountCode: string | null;
  affectsWarehouse: boolean;
  affectsVat: boolean;
}

const opTypeColumns: EntityColumn<OperationTypeEntity>[] = [
  {
    key: 'code', label: 'Code', width: '90px', mono: true,
    render: (v) => <span className="font-bold">{String(v)}</span>,
  },
  {
    key: 'name', label: 'Operation',
    render: (_, row) => (
      <div>
        <span className="font-medium text-gray-900">{row.name}</span>
        <div className="flex gap-1 mt-0.5">
          {row.affectsWarehouse && (
            <span className="inline-flex px-1 py-0 rounded text-[8px] font-semibold bg-blue-50 text-blue-600">STOCK</span>
          )}
          {row.affectsVat && (
            <span className="inline-flex px-1 py-0 rounded text-[8px] font-semibold bg-amber-50 text-amber-600">VAT</span>
          )}
        </div>
      </div>
    ),
  },
  {
    key: 'debitAccountCode', label: 'Debit', width: '80px', mono: true, align: 'center',
    render: (v) => v ? String(v) : <span className="text-gray-300">&mdash;</span>,
  },
  {
    key: 'creditAccountCode', label: 'Credit', width: '80px', mono: true, align: 'center',
    render: (v) => v ? String(v) : <span className="text-gray-300">&mdash;</span>,
  },
  {
    key: 'vatAccountCode', label: 'VAT Acc.', width: '80px', mono: true, align: 'center',
    render: (v) => v ? String(v) : <span className="text-gray-300">&mdash;</span>,
  },
];

// ─── Quick Create ──────────────────────────────────
function QuickCreateOperationType({ companyId, module, onCreated, onCancel }: {
  companyId: string;
  module: string;
  onCreated: (ot: OperationTypeEntity) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [debitAcc, setDebitAcc] = useState('');
  const [creditAcc, setCreditAcc] = useState('');
  const [vatAcc, setVatAcc] = useState('');
  const [affectsWarehouse, setAffectsWarehouse] = useState(true);
  const [affectsVat, setAffectsVat] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    if (!name.trim()) { setError('Name is required'); return; }
    if (!code.trim()) { setError('Code is required'); return; }
    setSaving(true); setError('');
    try {
      const res = await fetch(`/api/company/${companyId}/operation-types`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(), code: code.trim(), module,
          debitAccountCode: debitAcc.trim() || undefined,
          creditAccountCode: creditAcc.trim() || undefined,
          vatAccountCode: vatAcc.trim() || undefined,
          affectsWarehouse, affectsVat,
        }),
      });
      if (!res.ok) { const j = await res.json().catch(() => ({})); throw new Error(j.error || 'Failed'); }
      const json = await res.json();
      const d = json.data;
      onCreated({
        id: d.id, name: d.name, code: d.code, module: d.module,
        debitAccountCode: d.debitAccountCode || null,
        creditAccountCode: d.creditAccountCode || null,
        vatAccountCode: d.vatAccountCode || null,
        expenseAccountCode: d.expenseAccountCode || null,
        revenueAccountCode: d.revenueAccountCode || null,
        advanceAccountCode: d.advanceAccountCode || null,
        affectsWarehouse: d.affectsWarehouse ?? true,
        affectsVat: d.affectsVat ?? true,
      });
    } catch (err) { setError(err instanceof Error ? err.message : 'Failed'); }
    finally { setSaving(false); }
  };

  const INPUT = 'w-full text-sm border border-gray-200 rounded-md px-3 py-1.5 focus:ring-1 focus:ring-blue-400';

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-900">Quick Create Operation Type</h3>
        <button onClick={onCancel} className="text-xs text-gray-400 hover:text-gray-600">&times; Cancel</button>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-[10px] font-semibold text-gray-500 uppercase">Name *</label>
          <input className={INPUT} value={name} onChange={e => setName(e.target.value)} placeholder="Purchase goods" autoFocus />
        </div>
        <div>
          <label className="text-[10px] font-semibold text-gray-500 uppercase">Code *</label>
          <input className={INPUT} value={code} onChange={e => setCode(e.target.value)} placeholder="PIRK" />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="text-[10px] font-semibold text-gray-500 uppercase">Debit Account</label>
          <input className={INPUT} value={debitAcc} onChange={e => setDebitAcc(e.target.value)} placeholder="2040" />
        </div>
        <div>
          <label className="text-[10px] font-semibold text-gray-500 uppercase">Credit Account</label>
          <input className={INPUT} value={creditAcc} onChange={e => setCreditAcc(e.target.value)} placeholder="4430" />
        </div>
        <div>
          <label className="text-[10px] font-semibold text-gray-500 uppercase">VAT Account</label>
          <input className={INPUT} value={vatAcc} onChange={e => setVatAcc(e.target.value)} placeholder="2441" />
        </div>
      </div>
      <div className="flex gap-4">
        <label className="flex items-center gap-1.5 text-xs text-gray-600">
          <input type="checkbox" checked={affectsWarehouse} onChange={e => setAffectsWarehouse(e.target.checked)} className="rounded" />
          Affects warehouse
        </label>
        <label className="flex items-center gap-1.5 text-xs text-gray-600">
          <input type="checkbox" checked={affectsVat} onChange={e => setAffectsVat(e.target.checked)} className="rounded" />
          Affects VAT
        </label>
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
interface OperationTypeSelectDialogProps {
  companyId: string;
  open: boolean;
  onClose: () => void;
  onSelect: (ot: OperationTypeEntity) => void;
  module?: string; // PURCHASE | SALE — filter
}

export function OperationTypeSelectDialog({ companyId, open, onClose, onSelect, module = 'PURCHASE' }: OperationTypeSelectDialogProps) {
  const fetchTypes = useCallback(async (): Promise<OperationTypeEntity[]> => {
    const res = await fetch(`/api/company/${companyId}/operation-types?module=${module}`, { cache: 'no-store' });
    if (!res.ok) return [];
    const json = await res.json();
    return (json.data || []).map((d: Record<string, unknown>) => ({
      id: String(d.id),
      name: String(d.name || ''),
      code: String(d.code || ''),
      module: String(d.module || 'PURCHASE'),
      debitAccountCode: d.debitAccountCode ? String(d.debitAccountCode) : null,
      creditAccountCode: d.creditAccountCode ? String(d.creditAccountCode) : null,
      vatAccountCode: d.vatAccountCode ? String(d.vatAccountCode) : null,
      expenseAccountCode: d.expenseAccountCode ? String(d.expenseAccountCode) : null,
      revenueAccountCode: d.revenueAccountCode ? String(d.revenueAccountCode) : null,
      advanceAccountCode: d.advanceAccountCode ? String(d.advanceAccountCode) : null,
      affectsWarehouse: Boolean(d.affectsWarehouse),
      affectsVat: Boolean(d.affectsVat),
    }));
  }, [companyId, module]);

  return (
    <EntitySelectDialog<OperationTypeEntity>
      title={`Select Operation Type (${module})`}
      open={open}
      onClose={onClose}
      onSelect={onSelect}
      fetchEntities={fetchTypes}
      columns={opTypeColumns}
      searchKeys={['name', 'code']}
      createLabel="+ Create Operation Type"
      renderCreateForm={({ onCreated, onCancel }) => (
        <QuickCreateOperationType companyId={companyId} module={module} onCreated={onCreated} onCancel={onCancel} />
      )}
      emptyMessage="No operation types found. Create your first operation type."
      emptyIcon="⚙️"
    />
  );
}
