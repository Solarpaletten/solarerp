// config/purchases/columns.ts
// ═══════════════════════════════════════════════════
// Task 45: Purchase column definitions for ERPGrid
// ═══════════════════════════════════════════════════
// Matches Site.pro: Date | Due date | Doc number | Warehouse | Supplier | Total | Status

import { ColumnDef } from '@/components/erp';

const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Draft',
  POSTED: 'Posted',
  CANCELLED: 'Cancelled',
};

const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-amber-100 text-amber-700',
  POSTED: 'bg-emerald-100 text-emerald-700',
  CANCELLED: 'bg-red-100 text-red-700',
};

export const purchaseColumns: ColumnDef[] = [
  {
    key: 'purchaseDate',
    label: 'Purchase date',
    type: 'date',
    width: '110px',
    sortable: true,
  },
  {
    key: 'payUntil',
    label: 'Due date',
    type: 'date',
    width: '100px',
    sortable: true,
  },
  {
    key: 'number',
    label: 'Doc number',
    type: 'text',
    width: '110px',
    sortable: true,
    render: (val, row) => (
      <span className="font-mono text-xs font-medium text-gray-900">
        {String((row as Record<string, unknown>).series || '')}-{String(val || '')}
      </span>
    ),
  },
  {
    key: 'warehouseName',
    label: 'Warehouse',
    type: 'text',
    width: '120px',
  },
  {
    key: 'supplierName',
    label: 'Supplier',
    type: 'text',
    sortable: true,
    render: (val) => (
      <span className="font-medium text-gray-900">{String(val || '\u2014')}</span>
    ),
  },
  {
    key: 'supplierCode',
    label: 'Supplier code',
    type: 'text',
    width: '100px',
  },
  {
    key: 'operationType',
    label: 'Operation',
    type: 'text',
    width: '100px',
  },
  {
    key: 'currencyCode',
    label: 'Currency',
    type: 'text',
    width: '70px',
  },
  {
    key: 'employeeName',
    label: 'Employee',
    type: 'text',
    width: '120px',
  },
  {
    key: 'status',
    label: 'Status',
    width: '90px',
    sortable: true,
    render: (val) => {
      const s = String(val || 'DRAFT');
      const color = STATUS_COLORS[s] || 'bg-gray-100 text-gray-700';
      const label = STATUS_LABELS[s] || s;
      return (
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${color}`}>
          {label}
        </span>
      );
    },
  },
  {
    key: 'comments',
    label: 'Comments',
    type: 'text',
    width: '150px',
    render: (val) => val ? (
      <span className="text-xs text-gray-500 truncate max-w-[140px] inline-block">{String(val)}</span>
    ) : <span className="text-gray-300">&mdash;</span>,
  },
];
