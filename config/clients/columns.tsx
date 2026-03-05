// config/clients/columns.ts
// ═══════════════════════════════════════════════════
// Task 44: Clients column definitions for ERPGrid
// ═══════════════════════════════════════════════════
// Matches Site.pro: Registration date | Name | Display name | Code | VAT code | Phone | Fax | Email | Website

import { ColumnDef } from '@/components/erp';

const CLIENT_TYPE_LABELS: Record<string, string> = {
  COMPANY: 'Company',
  SOLE_TRADER: 'Sole Trader',
  INDIVIDUAL: 'Individual',
  GOVERNMENT: 'Government',
  NON_PROFIT: 'Non-Profit',
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
    key: 'shortName',
    label: 'Display name',
    type: 'text',
    sortable: true,
  },
  {
    key: 'code',
    label: 'Code',
    type: 'text',
    width: '100px',
    sortable: true,
  },
  {
    key: 'type',
    label: 'Type',
    type: 'badge',
    width: '100px',
    enumLabels: CLIENT_TYPE_LABELS,
    sortable: true,
  },
  {
    key: 'isActive',
    label: 'Active',
    type: 'boolean',
    width: '60px',
    sortable: true,
  },
  {
    key: 'vatCode',
    label: 'VAT code',
    type: 'text',
    width: '130px',
  },
  {
    key: 'phoneNumber',
    label: 'Phone number',
    type: 'text',
    width: '120px',
  },
  {
    key: 'faxNumber',
    label: 'Fax number',
    type: 'text',
    width: '110px',
  },
  {
    key: 'email',
    label: 'Email address',
    type: 'text',
    width: '180px',
    render: (val) => val ? (
      <a href={`mailto:${val}`} className="text-blue-600 hover:underline text-xs">{String(val)}</a>
    ) : <span className="text-gray-300">—</span>,
  },
];
