// components/select/EmployeeSelectDialog.tsx
// ═══════════════════════════════════════════════════
// Task 57_1: Employee Selection Window
// ═══════════════════════════════════════════════════

'use client';

import { useCallback, useState } from 'react';
import { EntitySelectDialog, type EntityColumn } from './EntitySelectDialog';

export interface EmployeeEntity {
  id: string;
  name: string;
  code: string | null;
  position: string | null;
  department: string | null;
  email: string | null;
  phone: string | null;
  isActive: boolean;
}

const employeeColumns: EntityColumn<EmployeeEntity>[] = [
  {
    key: 'code', label: 'Code', width: '80px', mono: true,
    render: (v) => v ? <span className="font-semibold">{String(v)}</span> : <span className="text-gray-300">&mdash;</span>,
  },
  {
    key: 'name', label: 'Employee',
    render: (_, row) => (
      <div>
        <span className="font-medium text-gray-900">{row.name}</span>
        {row.position && <span className="ml-2 text-[10px] text-gray-400">{row.position}</span>}
      </div>
    ),
  },
  {
    key: 'department', label: 'Department', width: '120px',
    render: (v) => v ? <span className="text-xs text-gray-600">{String(v)}</span> : <span className="text-gray-300">&mdash;</span>,
  },
  {
    key: 'email', label: 'Email', width: '160px',
    render: (v) => v ? <span className="text-xs text-gray-600">{String(v)}</span> : <span className="text-gray-300">&mdash;</span>,
  },
];

// ─── Quick Create ──────────────────────────────────
function QuickCreateEmployee({ companyId, onCreated, onCancel }: {
  companyId: string;
  onCreated: (e: EmployeeEntity) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [position, setPosition] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    if (!name.trim()) { setError('Name is required'); return; }
    setSaving(true); setError('');
    try {
      const res = await fetch(`/api/company/${companyId}/employees`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          code: code.trim() || undefined,
          position: position.trim() || undefined,
        }),
      });
      if (!res.ok) { const j = await res.json().catch(() => ({})); throw new Error(j.error || 'Failed'); }
      const json = await res.json();
      const d = json.data;
      onCreated({
        id: d.id, name: d.name, code: d.code || null,
        position: d.position || null, department: d.department || null,
        email: d.email || null, phone: d.phone || null,
        isActive: d.isActive ?? true,
      });
    } catch (err) { setError(err instanceof Error ? err.message : 'Failed'); }
    finally { setSaving(false); }
  };

  const INPUT = 'w-full text-sm border border-gray-200 rounded-md px-3 py-1.5 focus:ring-1 focus:ring-blue-400';

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-900">Quick Create Employee</h3>
        <button onClick={onCancel} className="text-xs text-gray-400 hover:text-gray-600">&times; Cancel</button>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
      <div className="grid grid-cols-3 gap-3">
        <div className="col-span-1">
          <label className="text-[10px] font-semibold text-gray-500 uppercase">Name *</label>
          <input className={INPUT} value={name} onChange={e => setName(e.target.value)} placeholder="Leanid Kanoplich" autoFocus />
        </div>
        <div>
          <label className="text-[10px] font-semibold text-gray-500 uppercase">Code</label>
          <input className={INPUT} value={code} onChange={e => setCode(e.target.value)} placeholder="EMP-01" />
        </div>
        <div>
          <label className="text-[10px] font-semibold text-gray-500 uppercase">Position</label>
          <input className={INPUT} value={position} onChange={e => setPosition(e.target.value)} placeholder="Director" />
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
interface EmployeeSelectDialogProps {
  companyId: string;
  open: boolean;
  onClose: () => void;
  onSelect: (employee: EmployeeEntity) => void;
}

export function EmployeeSelectDialog({ companyId, open, onClose, onSelect }: EmployeeSelectDialogProps) {
  const fetchEmployees = useCallback(async (): Promise<EmployeeEntity[]> => {
    const res = await fetch(`/api/company/${companyId}/employees?isActive=true`, { cache: 'no-store' });
    if (!res.ok) return [];
    const json = await res.json();
    return (json.data || []).map((d: Record<string, unknown>) => ({
      id: String(d.id),
      name: String(d.name || ''),
      code: d.code ? String(d.code) : null,
      position: d.position ? String(d.position) : null,
      department: d.department ? String(d.department) : null,
      email: d.email ? String(d.email) : null,
      phone: d.phone ? String(d.phone) : null,
      isActive: Boolean(d.isActive),
    }));
  }, [companyId]);

  return (
    <EntitySelectDialog<EmployeeEntity>
      title="Select Employee"
      open={open}
      onClose={onClose}
      onSelect={onSelect}
      fetchEntities={fetchEmployees}
      columns={employeeColumns}
      searchKeys={['name', 'code', 'position', 'department']}
      createLabel="+ Create Employee"
      renderCreateForm={({ onCreated, onCancel }) => (
        <QuickCreateEmployee companyId={companyId} onCreated={onCreated} onCancel={onCancel} />
      )}
      emptyMessage="No employees found. Create your first employee."
      emptyIcon="👤"
    />
  );
}
