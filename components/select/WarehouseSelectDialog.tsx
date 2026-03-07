// components/select/WarehouseSelectDialog.tsx
// ═══════════════════════════════════════════════════
// Task 57_1: Warehouse Selection Window
// ═══════════════════════════════════════════════════

'use client';

import { useCallback, useState } from 'react';
import { EntitySelectDialog, type EntityColumn } from './EntitySelectDialog';

export interface WarehouseEntity {
  id: string;
  name: string;
  code: string | null;
  isDefault: boolean;
  isActive: boolean;
  address: string | null;
  responsibleEmployee: { id: string; name: string; position: string | null } | null;
}

const warehouseColumns: EntityColumn<WarehouseEntity>[] = [
  {
    key: 'name', label: 'Warehouse',
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
    key: 'code', label: 'Code', width: '100px', mono: true,
    render: (v) => v ? <span className="font-semibold">{String(v)}</span> : <span className="text-gray-300">&mdash;</span>,
  },
  {
    key: 'responsibleEmployee', label: 'Responsible', width: '160px',
    render: (_, row) => row.responsibleEmployee
      ? <span className="text-xs text-gray-600">{row.responsibleEmployee.name}</span>
      : <span className="text-gray-300">&mdash;</span>,
  },
  {
    key: 'address', label: 'Address', width: '180px',
    render: (v) => v ? <span className="text-xs text-gray-500">{String(v)}</span> : <span className="text-gray-300">&mdash;</span>,
  },
];

// ─── Quick Create ──────────────────────────────────
function QuickCreateWarehouse({ companyId, onCreated, onCancel }: {
  companyId: string;
  onCreated: (w: WarehouseEntity) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    if (!name.trim()) { setError('Name is required'); return; }
    setSaving(true); setError('');
    try {
      const res = await fetch(`/api/company/${companyId}/warehouses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), code: code.trim() || undefined }),
      });
      if (!res.ok) { const j = await res.json().catch(() => ({})); throw new Error(j.error || 'Failed'); }
      const json = await res.json();
      const d = json.data;
      onCreated({
        id: d.id, name: d.name, code: d.code || null,
        isDefault: d.isDefault ?? false, isActive: d.isActive ?? true,
        address: d.address || null, responsibleEmployee: null,
      });
    } catch (err) { setError(err instanceof Error ? err.message : 'Failed'); }
    finally { setSaving(false); }
  };

  const INPUT = 'w-full text-sm border border-gray-200 rounded-md px-3 py-1.5 focus:ring-1 focus:ring-blue-400';

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-900">Quick Create Warehouse</h3>
        <button onClick={onCancel} className="text-xs text-gray-400 hover:text-gray-600">&times; Cancel</button>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-[10px] font-semibold text-gray-500 uppercase">Name *</label>
          <input className={INPUT} value={name} onChange={e => setName(e.target.value)} placeholder="Main Warehouse" autoFocus />
        </div>
        <div>
          <label className="text-[10px] font-semibold text-gray-500 uppercase">Code</label>
          <input className={INPUT} value={code} onChange={e => setCode(e.target.value)} placeholder="WH-01" />
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
interface WarehouseSelectDialogProps {
  companyId: string;
  open: boolean;
  onClose: () => void;
  onSelect: (warehouse: WarehouseEntity) => void;
}

export function WarehouseSelectDialog({ companyId, open, onClose, onSelect }: WarehouseSelectDialogProps) {
  const fetchWarehouses = useCallback(async (): Promise<WarehouseEntity[]> => {
    const res = await fetch(`/api/company/${companyId}/warehouses?isActive=true`, { cache: 'no-store' });
    if (!res.ok) return [];
    const json = await res.json();
    return (json.data || []).map((w: Record<string, unknown>) => ({
      id: String(w.id),
      name: String(w.name || ''),
      code: w.code ? String(w.code) : null,
      isDefault: Boolean(w.isDefault),
      isActive: Boolean(w.isActive),
      address: w.address ? String(w.address) : null,
      responsibleEmployee: w.responsibleEmployee as WarehouseEntity['responsibleEmployee'] || null,
    }));
  }, [companyId]);

  return (
    <EntitySelectDialog<WarehouseEntity>
      title="Select Warehouse"
      open={open}
      onClose={onClose}
      onSelect={onSelect}
      fetchEntities={fetchWarehouses}
      columns={warehouseColumns}
      searchKeys={['name', 'code']}
      createLabel="+ Create Warehouse"
      renderCreateForm={({ onCreated, onCancel }) => (
        <QuickCreateWarehouse companyId={companyId} onCreated={onCreated} onCancel={onCancel} />
      )}
      emptyMessage="No warehouses found. Create your first warehouse."
      emptyIcon="🏭"
    />
  );
}
