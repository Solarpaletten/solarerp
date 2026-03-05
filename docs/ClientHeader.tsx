// components/clients/ClientHeader.tsx
'use client';

const TYPE_LABELS: Record<string, string> = {
  COMPANY: 'Company', SOLE_TRADER: 'Sole Trader', INDIVIDUAL: 'Individual',
  GOVERNMENT: 'Government', NON_PROFIT: 'Non-Profit',
};

type Props = {
  isNew: boolean;
  name: string;
  code: string;
  type: string;
  isActive: boolean;
  backHref: string;
};

export function ClientHeader({ isNew, name, code, type, isActive, backHref }: Props) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <a href={backHref} className="text-xs text-gray-400 hover:text-gray-600 mb-1 inline-block">&larr; Customers</a>
        <h1 className="text-xl font-bold text-gray-900">{isNew ? 'New Client' : name || 'Client'}</h1>
        {!isNew && code && (
          <p className="text-sm text-gray-500 mt-0.5">
            Code: <span className="font-mono font-medium">{code}</span>
            {' \u00b7 '}{TYPE_LABELS[type] || type}
          </p>
        )}
      </div>
      {!isNew && (
        <span className={`px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded border ${
          isActive ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-600 border-red-200'
        }`}>{isActive ? 'Active' : 'Inactive'}</span>
      )}
    </div>
  );
}
