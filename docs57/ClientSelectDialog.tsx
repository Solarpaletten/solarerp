// components/select/ClientSelectDialog.tsx
// ═══════════════════════════════════════════════════
// Task 57: Client Selection Window (SAP/Odoo style)
// ═══════════════════════════════════════════════════

'use client';

import { useCallback, useState } from 'react';
import { EntitySelectDialog, type EntityColumn } from './EntitySelectDialog';

export interface ClientEntity {
  id: string;
  name: string;
  code: string | null;
  vatCode: string | null;
  location: string | null;
  payWithinDays: number | null;
  email: string | null;
  phoneNumber: string | null;
  isActive: boolean;
}

const clientColumns: EntityColumn<ClientEntity>[] = [
  {
    key: 'code', label: 'Code', width: '100px', mono: true,
    render: (v) => v ? <span className="font-semibold">{String(v)}</span> : <span className="text-gray-300">&mdash;</span>,
  },
  {
    key: 'name', label: 'Client',
    render: (_, row) => (
      <div>
        <span className="font-medium text-gray-900">{row.name}</span>
        {row.location && <span className={`ml-2 inline-flex px-1.5 py-0.5 rounded text-[9px] font-semibold ${
          row.location === 'EU' ? 'bg-blue-100 text-blue-700' :
          row.location === 'LOCAL' ? 'bg-emerald-100 text-emerald-700' :
          'bg-gray-100 text-gray-600'
        }`}>{row.location}</span>}
      </div>
    ),
  },
  {
    key: 'vatCode', label: 'VAT', width: '130px', mono: true,
    render: (v) => v ? String(v) : <span className="text-gray-300">&mdash;</span>,
  },
  {
    key: 'payWithinDays', label: 'Payment', width: '80px', align: 'right',
    render: (v) => v != null ? `${v} days` : <span className="text-gray-300">&mdash;</span>,
  },
  {
    key: 'email', label: 'Email', width: '160px',
    render: (v) => v ? <span className="text-xs text-gray-600">{String(v)}</span> : <span className="text-gray-300">&mdash;</span>,
  },
];

// ─── Quick Create Form ─────────────────────────────
function QuickCreateClient({ companyId, onCreated, onCancel }: {
  companyId: string;
  onCreated: (client: ClientEntity) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [vatCode, setVatCode] = useState('');
  const [payDays, setPayDays] = useState('30');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    if (!name.trim()) { setError('Name is required'); return; }
    setSaving(true); setError('');
    try {
      const res = await fetch(`/api/company/${companyId}/clients`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          code: code.trim() || undefined,
          vatCode: vatCode.trim() || undefined,
          payWithinDays: payDays ? Number(payDays) : undefined,
          type: 'COMPANY',
          location: 'LOCAL',
        }),
      });
      if (!res.ok) { const j = await res.json().catch(() => ({})); throw new Error(j.error || 'Failed'); }
      const json = await res.json();
      const d = json.data;
      onCreated({
        id: d.id, name: d.name, code: d.code || null, vatCode: d.vatCode || null,
        location: d.location || null, payWithinDays: d.payWithinDays ?? null,
        email: d.email || null, phoneNumber: d.phoneNumber || null, isActive: d.isActive ?? true,
      });
    } catch (err) { setError(err instanceof Error ? err.message : 'Failed'); }
    finally { setSaving(false); }
  };

  const INPUT = 'w-full text-sm border border-gray-200 rounded-md px-3 py-1.5 focus:ring-1 focus:ring-blue-400';

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-900">Quick Create Client</h3>
        <button onClick={onCancel} className="text-xs text-gray-400 hover:text-gray-600">&times; Cancel</button>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-[10px] font-semibold text-gray-500 uppercase">Name *</label>
          <input className={INPUT} value={name} onChange={e => setName(e.target.value)} placeholder="SWAPOIL GmbH" autoFocus />
        </div>
        <div>
          <label className="text-[10px] font-semibold text-gray-500 uppercase">Code</label>
          <input className={INPUT} value={code} onChange={e => setCode(e.target.value)} placeholder="SWAP01" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-[10px] font-semibold text-gray-500 uppercase">VAT Number</label>
          <input className={INPUT} value={vatCode} onChange={e => setVatCode(e.target.value)} placeholder="DE123456789" />
        </div>
        <div>
          <label className="text-[10px] font-semibold text-gray-500 uppercase">Payment days</label>
          <input className={INPUT} type="number" value={payDays} onChange={e => setPayDays(e.target.value)} />
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
interface ClientSelectDialogProps {
  companyId: string;
  open: boolean;
  onClose: () => void;
  onSelect: (client: ClientEntity) => void;
}

export function ClientSelectDialog({ companyId, open, onClose, onSelect }: ClientSelectDialogProps) {
  const fetchClients = useCallback(async (): Promise<ClientEntity[]> => {
    const res = await fetch(`/api/company/${companyId}/clients?pageSize=200&isActive=true`, { cache: 'no-store' });
    if (!res.ok) return [];
    const json = await res.json();
    return (json.data || []).map((c: Record<string, unknown>) => ({
      id: String(c.id),
      name: String(c.name || ''),
      code: c.code ? String(c.code) : null,
      vatCode: c.vatCode ? String(c.vatCode) : null,
      location: c.location ? String(c.location) : null,
      payWithinDays: c.payWithinDays != null ? Number(c.payWithinDays) : null,
      email: c.email ? String(c.email) : null,
      phoneNumber: c.phoneNumber ? String(c.phoneNumber) : null,
      isActive: Boolean(c.isActive),
    }));
  }, [companyId]);

  return (
    <EntitySelectDialog<ClientEntity>
      title="Select Client"
      open={open}
      onClose={onClose}
      onSelect={onSelect}
      fetchEntities={fetchClients}
      columns={clientColumns}
      searchKeys={['name', 'code', 'vatCode', 'email']}
      createLabel="+ Create Client"
      renderCreateForm={({ onCreated, onCancel }) => (
        <QuickCreateClient companyId={companyId} onCreated={onCreated} onCancel={onCancel} />
      )}
      emptyMessage="No clients found. Create your first client."
      emptyIcon="👥"
    />
  );
}
