// components/purchases/PurchaseHeaderEdit.tsx
// ═══════════════════════════════════════════════════
// Task 38B: Editable Purchase Header (DRAFT mode)
// ═══════════════════════════════════════════════════

'use client';

interface PurchaseFormData {
  purchaseDate: string;
  supplierName: string;
  supplierCode: string;
  warehouseName: string;
  currencyCode: string;
  operationType: string;
  comments: string;
}

interface PurchaseHeaderEditProps {
  form: PurchaseFormData;
  onChange: (field: keyof PurchaseFormData, value: string) => void;
  series: string;
  number: string;
}

const INPUT_CLASS =
  'w-full px-2.5 py-1.5 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-400 focus:border-blue-400 bg-white';

const SELECT_CLASS =
  'w-full px-2.5 py-1.5 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-400 focus:border-blue-400 bg-white';

const LABEL_CLASS = 'text-[11px] font-medium text-gray-400 uppercase tracking-wider mb-1 block';

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className={LABEL_CLASS}>{label}</label>
      {children}
    </div>
  );
}

export default function PurchaseHeaderEdit({
  form,
  onChange,
  series,
  number: docNumber,
}: PurchaseHeaderEditProps) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg">
      {/* Top bar: Doc number + DRAFT badge */}
      <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="font-mono text-base font-bold text-gray-900">
            {series}-{docNumber}
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
          <Field label="Purchase Date">
            <input
              type="date"
              value={form.purchaseDate}
              onChange={(e) => onChange('purchaseDate', e.target.value)}
              className={INPUT_CLASS}
            />
          </Field>
        </div>

        {/* Column 2: Supplier */}
        <div className="space-y-3">
          <Field label="Supplier Name">
            <input
              type="text"
              value={form.supplierName}
              onChange={(e) => onChange('supplierName', e.target.value)}
              placeholder="Enter supplier name..."
              className={INPUT_CLASS}
            />
          </Field>
          <Field label="Supplier Code">
            <input
              type="text"
              value={form.supplierCode}
              onChange={(e) => onChange('supplierCode', e.target.value)}
              placeholder="Optional"
              className={INPUT_CLASS}
            />
          </Field>
          <Field label="Currency">
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

        {/* Column 3: Meta */}
        <div className="space-y-3">
          <Field label="Warehouse">
            <select
              value={form.warehouseName}
              onChange={(e) => onChange('warehouseName', e.target.value)}
              className={SELECT_CLASS}
            >
              <option value="Main">Main</option>
              <option value="Secondary">Secondary</option>
              <option value="Returns">Returns</option>
            </select>
          </Field>
          <Field label="Operation Type">
            <select
              value={form.operationType}
              onChange={(e) => onChange('operationType', e.target.value)}
              className={SELECT_CLASS}
            >
              <option value="PURCHASE">PURCHASE</option>
              <option value="RETURN">RETURN</option>
              <option value="ADVANCE">ADVANCE</option>
            </select>
          </Field>
          <Field label="Comments">
            <textarea
              value={form.comments}
              onChange={(e) => onChange('comments', e.target.value)}
              placeholder="Optional notes..."
              rows={2}
              className={`${INPUT_CLASS} resize-none`}
            />
          </Field>
        </div>
      </div>
    </div>
  );
}
