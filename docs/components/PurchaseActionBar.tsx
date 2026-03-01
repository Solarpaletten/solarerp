// components/purchases/PurchaseActionBar.tsx
// ═══════════════════════════════════════════════════
// Task 36A: Purchase Document Action Bar
// ═══════════════════════════════════════════════════

'use client';

import Link from 'next/link';
import { Plus, Pencil, Trash2, Lock, Unlock, Copy, Download } from 'lucide-react';

interface PurchaseActionBarProps {
  selectedIds: string[];
  onDelete: () => void;
  onCopy: () => void;
  companyId: string;
  isLoading?: boolean;
}

interface ActionButton {
  icon: React.ReactNode;
  label: string;
  href?: string;
  onClick?: () => void;
  disabled: boolean;
  variant?: 'default' | 'danger';
}

export default function PurchaseActionBar({
  selectedIds,
  onDelete,
  onCopy,
  companyId,
  isLoading = false,
}: PurchaseActionBarProps) {
  const selectedCount = selectedIds.length;
  const hasSelection = selectedCount > 0;
  const hasSingleSelection = selectedCount === 1;

  const actions: ActionButton[] = [
    { icon: <Plus size={16} />, label: 'Create', href: `/company/${companyId}/purchases/new`, disabled: false },
    { icon: <Pencil size={16} />, label: 'Edit', href: hasSingleSelection ? `/company/${companyId}/purchases/${selectedIds[0]}` : undefined, disabled: !hasSingleSelection },
    { icon: <Trash2 size={16} />, label: 'Delete', onClick: onDelete, disabled: !hasSelection || isLoading, variant: 'danger' },
    { icon: <Lock size={16} />, label: 'Lock', disabled: true },
    { icon: <Unlock size={16} />, label: 'Unlock', disabled: true },
    { icon: <Copy size={16} />, label: 'Copy', onClick: onCopy, disabled: !hasSingleSelection || isLoading },
    { icon: <Download size={16} />, label: 'Import', disabled: true },
  ];

  return (
    <div className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 flex items-center gap-1">
      {actions.map((action, idx) => {
        const baseClasses = 'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-150';
        const enabledClasses = action.variant === 'danger'
          ? 'text-red-600 hover:bg-red-50 hover:text-red-700 active:bg-red-100'
          : 'text-gray-600 hover:bg-white hover:text-gray-900 hover:shadow-sm active:bg-gray-100';
        const disabledClasses = 'text-gray-300 cursor-not-allowed';
        const classes = `${baseClasses} ${action.disabled ? disabledClasses : enabledClasses}`;
        const showSeparator = idx === 2 || idx === 4;

        return (
          <span key={action.label} className="flex items-center">
            {action.href && !action.disabled ? (
              <Link href={action.href} className={classes}>
                {action.icon}
                {action.label}
              </Link>
            ) : (
              <button onClick={action.onClick} disabled={action.disabled} className={classes}>
                {action.icon}
                {action.label}
              </button>
            )}
            {showSeparator && <span className="w-px h-5 bg-gray-200 mx-1" />}
          </span>
        );
      })}
    </div>
  );
}
