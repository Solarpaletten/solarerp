// components/purchases/PurchaseHeader.tsx
// ═══════════════════════════════════════════════════
// Task 37A: Purchase Document Header (Read View)
// ═══════════════════════════════════════════════════
// Enterprise ERP document header — 3-column grid.
// No edit, no form state, no save. Just clean display.

'use client';

interface PurchaseHeaderProps {
  purchase: {
    id: string;
    series: string;
    number: string;
    purchaseDate: string;
    payUntil: string | null;
    supplierName: string;
    supplierCode: string | null;
    warehouseName: string;
    operationType: string;
    currencyCode: string;
    employeeName: string | null;
    comments: string | null;
    status: string | null;
  };
}

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string; border: string }> = {
  DRAFT:     { label: 'DRAFT',     bg: 'bg-gray-50',  text: 'text-gray-600',  border: 'border-gray-200' },
  POSTED:    { label: 'POSTED',    bg: 'bg-green-50', text: 'text-green-600', border: 'border-green-200' },
  CANCELLED: { label: 'CANCELLED', bg: 'bg-red-50',   text: 'text-red-600',   border: 'border-red-200' },
  LOCKED:    { label: 'LOCKED',    bg: 'bg-blue-50',  text: 'text-blue-600',  border: 'border-blue-200' },
};

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function Field({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <dt className="text-[11px] font-medium text-gray-400 uppercase tracking-wider mb-0.5">
        {label}
      </dt>
      <dd className="text-sm text-gray-900">
        {value || <span className="text-gray-300">—</span>}
      </dd>
    </div>
  );
}

export default function PurchaseHeader({ purchase }: PurchaseHeaderProps) {
  const status = purchase.status || 'DRAFT';
  const statusConfig = STATUS_CONFIG[status] || STATUS_CONFIG.DRAFT;
  const isCancelled = status === 'CANCELLED';

  return (
    <div className={`bg-white border border-gray-200 rounded-lg ${isCancelled ? 'opacity-75' : ''}`}>
      {/* Top bar: Doc number + Status badge */}
      <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="font-mono text-base font-bold text-gray-900">
            {purchase.series}-{purchase.number}
          </h2>
          <span className="text-xs text-gray-400">Purchase Document</span>
        </div>
        <span
          className={`inline-block px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded border ${statusConfig.bg} ${statusConfig.text} ${statusConfig.border}`}
        >
          {statusConfig.label}
        </span>
      </div>

      {/* 3-column grid */}
      <div className="px-5 py-4 grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-4">
        {/* Column 1: Document Identity */}
        <div className="space-y-3">
          <Field label="Series" value={purchase.series} />
          <Field label="Number" value={purchase.number} />
          <Field label="Purchase Date" value={formatDate(purchase.purchaseDate)} />
          <Field label="Due Date" value={formatDate(purchase.payUntil)} />
        </div>

        {/* Column 2: Supplier */}
        <div className="space-y-3">
          <Field label="Supplier" value={purchase.supplierName} />
          <Field label="Supplier Code" value={purchase.supplierCode} />
          <Field label="Currency" value={purchase.currencyCode} />
        </div>

        {/* Column 3: Meta */}
        <div className="space-y-3">
          <Field label="Warehouse" value={purchase.warehouseName} />
          <Field label="Operation Type" value={purchase.operationType} />
          <Field label="Employee" value={purchase.employeeName} />
          {purchase.comments && (
            <div>
              <dt className="text-[11px] font-medium text-gray-400 uppercase tracking-wider mb-0.5">
                Comments
              </dt>
              <dd className="text-sm text-gray-600 italic">
                {purchase.comments}
              </dd>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
