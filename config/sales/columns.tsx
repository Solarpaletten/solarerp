// config/sales/columns.ts
// ═══════════════════════════════════════════════════
// Task 46 v2: Sales column definitions for ERPGrid
// ═══════════════════════════════════════════════════
// Fix: "Sale's date" → "Sale date"

import { ColumnDef } from '@/components/erp';

const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-amber-100 text-amber-700',
  POSTED: 'bg-emerald-100 text-emerald-700',
  CANCELLED: 'bg-red-100 text-red-700',
};

export const salesColumns: ColumnDef[] = [
  {
    key: 'saleDate',
    label: 'Sale date',
    type: 'date',
    width: '110px',
    sortable: true,
  },
  {
    key: 'payUntil',
    label: 'Due date',
    type: 'date',
    width: '100px',
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
    key: 'clientName',
    label: 'Client',
    type: 'text',
    sortable: true,
    render: (val) => (
      <span className="font-medium text-gray-900">{String(val || '\u2014')}</span>
    ),
  },
  {
    key: 'clientCode',
    label: 'Customer code',
    type: 'text',
    width: '100px',
  },
  {
    key: 'operationType',
    label: 'Operation type',
    type: 'text',
    width: '100px',
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
      const s = String(val || 'POSTED');
      const color = STATUS_COLORS[s] || 'bg-gray-100 text-gray-700';
      return (
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${color}`}>
          {s}
        </span>
      );
    },
  },
  {
    key: 'currencyCode',
    label: 'Currency',
    type: 'text',
    width: '70px',
  },
];
