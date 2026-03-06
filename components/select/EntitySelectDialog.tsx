// components/select/EntitySelectDialog.tsx
// ═══════════════════════════════════════════════════
// Task 57: Universal Entity Selection Dialog
// ═══════════════════════════════════════════════════
// SAP/Odoo/1C-style modal selection window
// Used for: Products, Clients, Accounts, Warehouses
//
// Features:
// - Full-screen modal with search
// - Tabular display with sortable columns
// - Keyboard navigation (Escape to close)
// - "Create new" inline — without leaving dialog
// - Dual mode: icon click = full dialog, type = autocomplete

'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

// ─── Column definition ────────────────────────────
export interface EntityColumn<T> {
  key: keyof T;
  label: string;
  width?: string;       // e.g. "120px", "30%"
  align?: 'left' | 'right' | 'center';
  render?: (value: unknown, row: T) => React.ReactNode;
  mono?: boolean;
}

// ─── Props ────────────────────────────────────────
export interface EntitySelectDialogProps<T extends { id: string }> {
  title: string;
  open: boolean;
  onClose: () => void;
  onSelect: (entity: T) => void;

  // Data
  fetchEntities: () => Promise<T[]>;
  columns: EntityColumn<T>[];
  searchKeys: (keyof T)[];            // fields to search by

  // Optional: inline create
  createLabel?: string;               // "+ Create Product"
  onCreateNew?: () => void;           // opens create form or navigates

  // Optional: create inline form
  renderCreateForm?: (props: {
    onCreated: (entity: T) => void;
    onCancel: () => void;
  }) => React.ReactNode;

  // Display
  emptyMessage?: string;
  emptyIcon?: string;
}

export function EntitySelectDialog<T extends { id: string }>({
  title,
  open,
  onClose,
  onSelect,
  fetchEntities,
  columns,
  searchKeys,
  createLabel,
  onCreateNew,
  renderCreateForm,
  emptyMessage = 'No items found',
  emptyIcon = '📋',
}: EntitySelectDialogProps<T>) {
  const [entities, setEntities] = useState<T[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedIdx, setSelectedIdx] = useState(-1);
  const [showCreate, setShowCreate] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Load entities when dialog opens
  useEffect(() => {
    if (!open) return;
    setSearch('');
    setSelectedIdx(-1);
    setShowCreate(false);
    setLoading(true);
    fetchEntities()
      .then(setEntities)
      .catch(() => setEntities([]))
      .finally(() => setLoading(false));
  }, [open, fetchEntities]);

  // Auto-focus search
  useEffect(() => {
    if (open && searchRef.current) {
      setTimeout(() => searchRef.current?.focus(), 100);
    }
  }, [open]);

  // Filter
  const filtered = entities.filter(e => {
    if (!search) return true;
    const q = search.toLowerCase();
    return searchKeys.some(key => {
      const val = e[key];
      if (val == null) return false;
      return String(val).toLowerCase().includes(q);
    });
  });

  // Keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIdx(prev => Math.min(prev + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIdx(prev => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter' && selectedIdx >= 0 && selectedIdx < filtered.length) {
      e.preventDefault();
      onSelect(filtered[selectedIdx]);
      onClose();
    }
  }, [filtered, selectedIdx, onSelect, onClose]);

  // Scroll selected row into view
  useEffect(() => {
    if (selectedIdx >= 0 && listRef.current) {
      const row = listRef.current.querySelector(`[data-idx="${selectedIdx}"]`);
      row?.scrollIntoView({ block: 'nearest' });
    }
  }, [selectedIdx]);

  const handleSelect = (entity: T) => {
    onSelect(entity);
    onClose();
  };

  const handleCreated = (entity: T) => {
    setEntities(prev => [entity, ...prev]);
    setShowCreate(false);
    onSelect(entity);
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center" onKeyDown={handleKeyDown}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      {/* Dialog */}
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[80vh] flex flex-col mx-4 overflow-hidden">
        {/* Header */}
        <div className="px-5 py-3 border-b border-gray-200 flex items-center justify-between bg-gray-50">
          <h2 className="text-sm font-bold text-gray-900">{title}</h2>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-200">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>

        {/* Search */}
        <div className="px-5 py-3 border-b border-gray-100">
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.3-4.3"/></svg>
            <input
              ref={searchRef}
              type="text"
              value={search}
              onChange={e => { setSearch(e.target.value); setSelectedIdx(0); }}
              placeholder="Search by name, code, barcode..."
              className="w-full pl-10 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-blue-400"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs">
                Clear
              </button>
            )}
          </div>
          <div className="mt-1 text-[10px] text-gray-400">{filtered.length} of {entities.length} results</div>
        </div>

        {/* Table */}
        <div ref={listRef} className="flex-1 overflow-auto">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-gray-400 text-sm">Loading...</div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400">
              <span className="text-3xl mb-2">{emptyIcon}</span>
              <p className="text-sm">{emptyMessage}</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b sticky top-0 z-10">
                <tr>
                  {columns.map((col) => (
                    <th key={String(col.key)}
                      className={`px-4 py-2 text-[10px] font-semibold text-gray-500 uppercase ${col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'}`}
                      style={col.width ? { width: col.width } : undefined}>
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((entity, idx) => (
                  <tr
                    key={entity.id}
                    data-idx={idx}
                    onClick={() => handleSelect(entity)}
                    className={`cursor-pointer transition-colors ${
                      idx === selectedIdx ? 'bg-blue-50 ring-1 ring-inset ring-blue-200' : 'hover:bg-gray-50'
                    }`}>
                    {columns.map((col) => {
                      const val = entity[col.key];
                      return (
                        <td key={String(col.key)}
                          className={`px-4 py-2.5 ${col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'} ${col.mono ? 'font-mono text-xs' : ''}`}>
                          {col.render ? col.render(val, entity) : val != null ? String(val) : <span className="text-gray-300">&mdash;</span>}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer: Create button or inline form */}
        {showCreate && renderCreateForm ? (
          <div className="border-t border-gray-200 p-4 bg-gray-50">
            {renderCreateForm({ onCreated: handleCreated, onCancel: () => setShowCreate(false) })}
          </div>
        ) : (
          <div className="border-t border-gray-200 px-5 py-2.5 bg-gray-50 flex items-center justify-between">
            {(createLabel && (onCreateNew || renderCreateForm)) ? (
              <button
                onClick={() => renderCreateForm ? setShowCreate(true) : onCreateNew?.()}
                className="text-sm font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14"/></svg>
                {createLabel}
              </button>
            ) : <div />}
            <button onClick={onClose} className="px-4 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-md hover:bg-gray-100">
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
