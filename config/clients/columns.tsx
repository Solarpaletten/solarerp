// config/clients/columns.tsx
// ═══════════════════════════════════════════════════
// Task 55_5 FIXED: Clients column definitions for ERPGrid
// ═══════════════════════════════════════════════════
// CHANGES:

// Shows: Registration date | Name | Code | Type | Role | Status | Email | VAT code

import { ColumnDef } from '@/components/erp';

const CLIENT_TYPE_LABELS: Record<string, string> = {
  COMPANY: 'Company',
  SOLE_TRADER: 'Sole Trader',
  INDIVIDUAL: 'Individual',
  GOVERNMENT: 'Government',
  NON_PROFIT: 'Non-Profit',
};

const CLIENT_ROLE_LABELS: Record<string, string> = {
  CUSTOMER: 'Customer',
  SUPPLIER: 'Supplier',
  BOTH: 'Both',
};

const ROLE_COLORS: Record<string, string> = {
  CUSTOMER: 'bg-blue-100 text-blue-700',
  SUPPLIER: 'bg-purple-100 text-purple-700',
  BOTH: 'bg-indigo-100 text-indigo-700',
};

export const clientColumns: ColumnDef[] = [
  {
    key: 'createdAt',
    label: 'Registration date',
    type: 'date',
    width: '120px',
    sortable: true,
  },
  {
    key: 'name',
    label: 'Name',
    type: 'text',
    sortable: true,
    render: (val) => (
      <span className="font-medium text-gray-900">{String(val || '—')}</span>
    ),
  },
  {
    key: 'code',
    label: 'Code',
    type: 'text',
    width: '100px',
    sortable: true,
    render: (val) => (
      <span className="font-mono text-xs font-medium text-gray-600">{String(val || '—')}</span>
    ),
  },
  {
    key: 'type',
    label: 'Type',
    type: 'badge',
    width: '110px',
    enumLabels: CLIENT_TYPE_LABELS,
    sortable: true,
  },
  {
    key: 'role',
    label: 'Role',
    type: 'text',
    width: '100px',
    sortable: true,
    render: (val) => {
      const role = String(val || 'BOTH');
      const color = ROLE_COLORS[role] || 'bg-gray-100 text-gray-700';
      const label = CLIENT_ROLE_LABELS[role] || role;
      return (
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${color}`}>
          {label}
        </span>
      );
    },
  },
  {
    key: 'isActive',
    label: 'Status',
    type: 'text',
    width: '90px',
    sortable: true,
    render: (val) => {
      const active = Boolean(val);
      const color = active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700';
      const label = active ? 'Active' : 'Inactive';
      return (
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${color}`}>
          {label}
        </span>
      );
    },
  },
  {
    key: 'email',
    label: 'Email',
    type: 'text',
    width: '180px',
    render: (val) => val ? (
      <a href={`mailto:${val}`} className="text-blue-600 hover:underline text-xs">
        {String(val)}
      </a>
    ) : (
      <span className="text-gray-300">—</span>
    ),
  },
  {
    key: 'vatCode',
    label: 'VAT Code',
    type: 'text',
    width: '130px',
    render: (val) => (
      <span className="font-mono text-xs text-gray-600">{String(val || '—')}</span>
    ),
  },
  {
    key: 'phoneNumber',
    label: 'Phone',
    type: 'text',
    width: '120px',
    render: (val) => val ? (
      <a href={`tel:${val}`} className="text-blue-600 hover:underline text-xs">
        {String(val)}
      </a>
    ) : (
      <span className="text-gray-300">—</span>
    ),
  },
];
