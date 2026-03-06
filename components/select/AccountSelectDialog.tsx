// components/select/AccountSelectDialog.tsx
// ═══════════════════════════════════════════════════
// Task 57: Account Selection Window
// ═══════════════════════════════════════════════════

'use client';

import { useCallback } from 'react';
import { EntitySelectDialog, type EntityColumn } from './EntitySelectDialog';

export interface AccountEntity {
  id: string;
  code: string;
  nameDe: string;
  nameEn: string;
  type: string;
  isActive: boolean;
}

const TYPE_COLORS: Record<string, string> = {
  ASSET: 'bg-blue-100 text-blue-700',
  LIABILITY: 'bg-red-100 text-red-700',
  EQUITY: 'bg-purple-100 text-purple-700',
  INCOME: 'bg-emerald-100 text-emerald-700',
  EXPENSE: 'bg-amber-100 text-amber-700',
};

const accountColumns: EntityColumn<AccountEntity>[] = [
  { key: 'code', label: 'Code', width: '80px', mono: true,
    render: (v) => <span className="font-bold">{String(v)}</span>,
  },
  { key: 'nameDe', label: 'Name (DE)' },
  { key: 'nameEn', label: 'Name (EN)', render: (v) => v ? <span className="text-gray-600">{String(v)}</span> : <span className="text-gray-300">&mdash;</span> },
  { key: 'type', label: 'Type', width: '90px', align: 'center',
    render: (v) => (
      <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold ${TYPE_COLORS[String(v)] || 'bg-gray-100 text-gray-600'}`}>
        {String(v)}
      </span>
    ),
  },
];

interface AccountSelectDialogProps {
  companyId: string;
  open: boolean;
  onClose: () => void;
  onSelect: (account: AccountEntity) => void;
  filterType?: string; // e.g. 'EXPENSE', 'ASSET'
}

export function AccountSelectDialog({ companyId, open, onClose, onSelect, filterType }: AccountSelectDialogProps) {
  const fetchAccounts = useCallback(async (): Promise<AccountEntity[]> => {
    const res = await fetch(`/api/company/${companyId}/accounts`, { cache: 'no-store' });
    if (!res.ok) return [];
    const json = await res.json();
    let accounts = (json.data || []).map((a: Record<string, unknown>) => ({
      id: String(a.id),
      code: String(a.code || ''),
      nameDe: String(a.nameDe || a.name || ''),
      nameEn: String(a.nameEn || ''),
      type: String(a.type || ''),
      isActive: Boolean(a.isActive),
    }));
    if (filterType) accounts = accounts.filter((a: AccountEntity) => a.type === filterType);
    return accounts;
  }, [companyId, filterType]);

  return (
    <EntitySelectDialog<AccountEntity>
      title={filterType ? `Select ${filterType} Account` : 'Select Account'}
      open={open}
      onClose={onClose}
      onSelect={onSelect}
      fetchEntities={fetchAccounts}
      columns={accountColumns}
      searchKeys={['code', 'nameDe', 'nameEn']}
      emptyMessage="No accounts found. Import SKR03 chart first."
      emptyIcon="📒"
    />
  );
}
