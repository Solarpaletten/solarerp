// config/products/columns.tsx
// ═══════════════════════════════════════════════════
// Task 47: Products column definitions for ERPGrid
// ═══════════════════════════════════════════════════

import { ColumnDef } from '@/components/erp';

export const productColumns: ColumnDef[] = [
  {
    key: 'code',
    label: 'Code',
    type: 'text',
    width: '100px',
    sortable: true,
    render: (val) => (
      <span className="font-mono text-xs font-medium text-gray-900">{String(val || '\u2014')}</span>
    ),
  },
  {
    key: 'name',
    label: 'Name',
    type: 'text',
    sortable: true,
    render: (val) => (
      <span className="font-medium text-gray-900">{String(val || '\u2014')}</span>
    ),
  },
  {
    key: 'barcode',
    label: 'Barcode',
    type: 'text',
    width: '120px',
  },
  {
    key: 'groupName',
    label: 'Group',
    type: 'text',
    width: '120px',
    sortable: true,
  },
  {
    key: 'unitName',
    label: 'Unit',
    type: 'text',
    width: '60px',
  },
  {
    key: 'priceWithoutVat',
    label: 'Price (net)',
    type: 'currency',
    width: '100px',
    sortable: true,
  },
  {
    key: 'priceWithVat',
    label: 'Price (gross)',
    type: 'currency',
    width: '100px',
  },
  {
    key: 'vatRate',
    label: 'VAT %',
    type: 'number',
    width: '60px',
  },
  {
    key: 'manufacturer',
    label: 'Manufacturer',
    type: 'text',
    width: '120px',
  },
  {
    key: 'countryOfOrigin',
    label: 'Country',
    type: 'text',
    width: '80px',
  },
];
