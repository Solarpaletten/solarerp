// components/erp/ERPToolbar.tsx
// ═══════════════════════════════════════════════════
// Task 44: ERP Toolbar (shared across modules)
// ═══════════════════════════════════════════════════
// Breadcrumb + action buttons for detail/edit views

'use client';

import Link from 'next/link';

type Breadcrumb = {
  label: string;
  href?: string;
};

type Action = {
  label: string;
  onClick: () => void;
  variant?: 'primary' | 'danger' | 'secondary';
  icon?: string;
  disabled?: boolean;
};

type Props = {
  breadcrumbs: Breadcrumb[];
  actions?: Action[];
};

const VARIANT_CLASSES: Record<string, string> = {
  primary: 'bg-emerald-500 hover:bg-emerald-600 text-white',
  danger: 'bg-red-500 hover:bg-red-600 text-white',
  secondary: 'bg-white border border-gray-300 hover:bg-gray-50 text-gray-700',
};

export function ERPToolbar({ breadcrumbs, actions = [] }: Props) {
  return (
    <div className="bg-white border-b border-gray-200 px-5 py-3 flex items-center justify-between">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-sm">
        {breadcrumbs.map((crumb, i) => (
          <span key={i} className="flex items-center gap-1.5">
            {i > 0 && <span className="text-gray-300">/</span>}
            {crumb.href ? (
              <Link href={crumb.href} className="text-blue-600 hover:text-blue-800 hover:underline">
                {crumb.label}
              </Link>
            ) : (
              <span className="text-gray-700 font-medium">{crumb.label}</span>
            )}
          </span>
        ))}
      </nav>

      {/* Actions */}
      {actions.length > 0 && (
        <div className="flex items-center gap-2">
          {actions.map((action, i) => (
            <button
              key={i}
              onClick={action.onClick}
              disabled={action.disabled}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                VARIANT_CLASSES[action.variant || 'secondary']
              }`}
            >
              {action.icon && <span>{action.icon}</span>}
              {action.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
44
