// components/purchases/PurchaseHeaderEdit.tsx
// ═══════════════════════════════════════════════════
// Task 56_8 — Purchase Header with Supplier Selector (FIXED)
// ═══════════════════════════════════════════════════
// FIXES APPLIED:
// 1. HeaderEditProps includes companyId
// 2. HeaderEditProps includes series and number
// 3. Function destructures series and number from props
// 4. Uses dynamic series-number in title (not hardcoded)

'use client';

import { ClientSelector, type ClientOption } from '@/components/clients/ClientSelector';

const INPUT_CLASS = 'w-full text-sm border border-gray-200 rounded-md px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-400 focus:border-transparent';
const SELECT_CLASS = INPUT_CLASS;

// ✅ FIXED: Interface includes series and number
interface HeaderEditProps {
  companyId: string;
  form: {
    purchaseDate: string;
    supplierId?: string;
    supplierName: string;
    supplierCode: string;
    warehouseName: string;
    currencyCode: string;
    operationType: string;
    comments: string;
  };
  onChange: (key: string, value: string | number | boolean) => void;
  series: string;      // ← ADDED
  number: string;      // ← ADDED
}

interface FieldProps {
  label: string;
  children: React.ReactNode;
  required?: boolean;
}

function Field({ label, children, required }: FieldProps) {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-semibold text-gray-700">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      {children}
    </div>
  );
}

// ✅ FIXED: Function destructures series and number
export default function PurchaseHeaderEdit({
  companyId,
  form,
  onChange,
  series,     // ← ADDED (extracted from props)
  number,     // ← ADDED (extracted from props)
}: HeaderEditProps) {
  const handleSupplierSelect = (client: ClientOption) => {
    onChange('supplierId', client.id);
    onChange('supplierName', client.name);
    onChange('supplierCode', client.code || '');
  };

  const handleSupplierClear = () => {
    onChange('supplierId', '');
    onChange('supplierName', '');
    onChange('supplierCode', '');
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      {/* Document Title Bar */}
      <div className="px-5 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
        <div>
          {/* ✅ Uses dynamic series-number, not hardcoded */}
          <h2 className="text-base font-bold text-gray-900">
            {series}-{number}
          </h2>
          <span className="text-xs text-gray-400">Purchase Document</span>
        </div>
        <span className="inline-block px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded border bg-gray-50 text-gray-600 border-gray-200">
          DRAFT
        </span>
      </div>

      {/* 3-column editable grid */}
      <div className="px-5 py-4 grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-3">
        {/* Column 1: Document Identity */}
        <div className="space-y-3">
          <Field label="Purchase Date" required>
            <input
              type="date"
              value={form.purchaseDate}
              onChange={(e) => onChange('purchaseDate', e.target.value)}
              className={INPUT_CLASS}
            />
          </Field>
        </div>

        {/* Column 2: Supplier — WITH ClientSelector */}
        <div className="space-y-3">
          <Field label="Supplier" required>
            <ClientSelector
              companyId={companyId}
              role="SUPPLIER"
              value={form.supplierId}
              onSelect={handleSupplierSelect}
              placeholder="Select supplier..."
              className={INPUT_CLASS}
            />
          </Field>

          {form.supplierId && form.supplierCode && (
            <Field label="Supplier Code">
              <input
                type="text"
                value={form.supplierCode}
                disabled
                className={`${INPUT_CLASS} bg-gray-50 text-gray-500 cursor-not-allowed`}
              />
            </Field>
          )}

          {form.supplierId && (
            <button
              type="button"
              onClick={handleSupplierClear}
              className="text-xs text-red-600 hover:text-red-800 font-medium"
            >
              Clear supplier
            </button>
          )}
        </div>

        {/* Column 3: Warehouse & Currency */}
        <div className="space-y-3">
          <Field label="Warehouse" required>
            <select
              value={form.warehouseName}
              onChange={(e) => onChange('warehouseName', e.target.value)}
              className={SELECT_CLASS}
            >
              <option value="Main">Main</option>
              <option value="Secondary">Secondary</option>
              <option value="Reserve">Reserve</option>
            </select>
          </Field>

          <Field label="Currency" required>
            <select
              value={form.currencyCode}
              onChange={(e) => onChange('currencyCode', e.target.value)}
              className={SELECT_CLASS}
            >
              <option value="EUR">EUR</option>
              <option value="USD">USD</option>
              <option value="GBP">GBP</option>
              <option value="CHF">CHF</option>
            </select>
          </Field>
        </div>
      </div>

      {/* Operation Type & Comments */}
      <div className="px-5 py-4 border-t border-gray-100 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
          <Field label="Operation Type" required>
            <select
              value={form.operationType}
              onChange={(e) => onChange('operationType', e.target.value)}
              className={SELECT_CLASS}
            >
              <option value="PURCHASE">Purchase</option>
              <option value="INTERNAL_TRANSFER">Internal Transfer</option>
              <option value="RETURN">Return</option>
            </select>
          </Field>
        </div>

        <Field label="Comments">
          <textarea
            value={form.comments}
            onChange={(e) => onChange('comments', e.target.value)}
            placeholder="Internal notes..."
            rows={2}
            className={`${INPUT_CLASS} resize-none`}
          />
        </Field>
      </div>
    </div>
  );
}
