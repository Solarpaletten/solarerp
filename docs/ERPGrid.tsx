// components/erp/ERPGrid.tsx
// ═══════════════════════════════════════════════════
// Task 44: ERP Grid Engine
// ═══════════════════════════════════════════════════
// Universal data grid for all ERP modules:
// Clients, Products, Sales, Purchases, Bank, Warehouse
//
// Architecture:
//   <ERPGrid entity="clients" columns={columns} ... />
//
// Features:
// - Column definitions (type, width, format)
// - Server-side pagination
// - Column sorting
// - Text search filter
// - Row selection (checkbox)
// - Add new button
// - Loading / empty states

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';

// ─── Types ───────────────────────────────────────

export type ColumnType = 'text' | 'date' | 'number' | 'currency' | 'boolean' | 'enum' | 'badge';

export type ColumnDef<T = Record<string, unknown>> = {
  key: string;
  label: string;
  type?: ColumnType;
  width?: string;
  sortable?: boolean;
  filterable?: boolean;
  render?: (value: unknown, row: T) => React.ReactNode;
  enumLabels?: Record<string, string>;
  format?: (value: unknown) => string;
};

export type ERPGridProps<T = Record<string, unknown>> = {
  entity: string;
  title: string;
  columns: ColumnDef<T>[];
  apiPath?: string;
  addLabel?: string;
  onAdd?: () => void;
  onRowClick?: (row: T) => void;
  pageSize?: number;
  searchPlaceholder?: string;
  emptyMessage?: string;
  emptyIcon?: string;
};

// ─── Formatters ──────────────────────────────────

function formatCell(value: unknown, type: ColumnType = 'text'): string {
  if (value === null || value === undefined) return '—';

  switch (type) {
    case 'date': {
      const d = new Date(String(value));
      if (isNaN(d.getTime())) return '—';
      return d.toLocaleDateString('de-DE', { year: 'numeric', month: '2-digit', day: '2-digit' });
    }
    case 'number':
      return Number(value).toLocaleString('de-DE');
    case 'currency':
      return Number(value).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    case 'boolean':
      return value ? '✓' : '✗';
    default:
      return String(value);
  }
}

// ─── Component ───────────────────────────────────

export function ERPGrid<T extends Record<string, unknown>>({
  entity,
  title,
  columns,
  apiPath,
  addLabel = '+ Add new',
  onAdd,
  onRowClick,
  pageSize = 20,
  searchPlaceholder = 'Search...',
  emptyMessage = 'No records found',
  emptyIcon = '📋',
}: ERPGridProps<T>) {
  const params = useParams();
  const router = useRouter();
  const companyId = params.companyId as string;

  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const basePath = apiPath || `/api/company/${companyId}/${entity}`;

  // ─── Fetch data ────────────────────────────────

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (sortKey) {
        params.set('sortBy', sortKey);
        params.set('sortDir', sortDir);
      }
      params.set('page', String(page));
      params.set('pageSize', String(pageSize));

      const res = await fetch(`${basePath}?${params}`);
      if (!res.ok) throw new Error(`API error: ${res.status}`);
      const json = await res.json();

      setData(json.data || []);
      setTotal(json.count || json.total || (json.data || []).length);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [basePath, search, sortKey, sortDir, page, pageSize]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ─── Sort handler ──────────────────────────────

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
    setPage(1);
  };

  // ─── Selection ─────────────────────────────────

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selected.size === data.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(data.map(r => String(r.id))));
    }
  };

  // ─── Pagination ────────────────────────────────

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  // ─── Render ────────────────────────────────────

  return (
    <div className="h-full flex flex-col">
      {/* ── Header: Title + Actions ── */}
      <div className="bg-gradient-to-r from-slate-700 to-slate-800 px-5 py-3 flex items-center justify-between">
        <h1 className="text-white text-base font-semibold tracking-wide">{title}</h1>
        <div className="flex items-center gap-2">
          {onAdd && (
            <button
              onClick={onAdd}
              className="bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-semibold px-3 py-1.5 rounded transition-colors"
            >
              {addLabel}
            </button>
          )}
        </div>
      </div>

      {/* ── Toolbar: Search + Pagination info ── */}
      <div className="bg-white border-b border-gray-200 px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative">
            <input
              type="text"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder={searchPlaceholder}
              className="w-64 pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-400 focus:border-blue-400"
            />
            <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>
        <div className="flex items-center gap-4 text-xs text-gray-500">
          <span>
            Page {page} / {totalPages}
          </span>
          <span className="text-gray-400">|</span>
          <span>{total} records</span>
          <span className="text-gray-400">|</span>
          <span>{pageSize} per page</span>
        </div>
      </div>

      {/* ── Table ── */}
      <div className="flex-1 overflow-auto bg-white">
        {error ? (
          <div className="flex flex-col items-center justify-center py-20 text-red-500">
            <p className="text-sm font-medium">Error loading data</p>
            <p className="text-xs text-red-400 mt-1">{error}</p>
            <button onClick={fetchData} className="mt-3 text-xs text-blue-600 hover:underline">Retry</button>
          </div>
        ) : loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="flex items-center gap-2 text-gray-400">
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <span className="text-sm">Loading {entity}...</span>
            </div>
          </div>
        ) : data.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <span className="text-4xl mb-3">{emptyIcon}</span>
            <p className="text-sm">{emptyMessage}</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200 sticky top-0 z-10">
              <tr>
                {/* Checkbox column */}
                <th className="w-10 px-3 py-2.5">
                  <input
                    type="checkbox"
                    checked={selected.size === data.length && data.length > 0}
                    onChange={toggleSelectAll}
                    className="rounded border-gray-300"
                  />
                </th>
                {columns.map(col => (
                  <th
                    key={col.key}
                    style={col.width ? { width: col.width } : undefined}
                    className={`px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider ${
                      col.sortable !== false ? 'cursor-pointer select-none hover:text-gray-700' : ''
                    }`}
                    onClick={() => col.sortable !== false && handleSort(col.key)}
                  >
                    <div className="flex items-center gap-1">
                      <span>{col.label}</span>
                      {sortKey === col.key && (
                        <span className="text-blue-500 text-[10px]">
                          {sortDir === 'asc' ? '▲' : '▼'}
                        </span>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data.map((row, idx) => {
                const rowId = String(row.id || idx);
                const isSelected = selected.has(rowId);
                return (
                  <tr
                    key={rowId}
                    className={`transition-colors ${
                      isSelected ? 'bg-blue-50' : idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'
                    } ${onRowClick ? 'cursor-pointer hover:bg-blue-50/50' : 'hover:bg-gray-50'}`}
                    onClick={() => onRowClick?.(row)}
                  >
                    <td className="px-3 py-2" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelect(rowId)}
                        className="rounded border-gray-300"
                      />
                    </td>
                    {columns.map(col => {
                      const val = row[col.key];
                      return (
                        <td key={col.key} className="px-3 py-2 text-gray-700 whitespace-nowrap">
                          {col.render
                            ? col.render(val, row)
                            : col.format
                            ? col.format(val)
                            : col.type === 'badge' && col.enumLabels
                            ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-gray-100 text-gray-700">
                                {col.enumLabels[String(val)] || String(val)}
                              </span>
                            )
                            : col.type === 'boolean'
                            ? (
                              <span className={val ? 'text-emerald-600' : 'text-gray-300'}>
                                {val ? '●' : '○'}
                              </span>
                            )
                            : formatCell(val, col.type)
                          }
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* ── Pagination Footer ── */}
      {!loading && data.length > 0 && (
        <div className="bg-white border-t border-gray-200 px-4 py-2 flex items-center justify-between">
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="px-2 py-1 text-xs text-gray-500 hover:text-gray-800 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              ← Prev
            </button>

            {/* Page numbers */}
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let p: number;
              if (totalPages <= 5) {
                p = i + 1;
              } else if (page <= 3) {
                p = i + 1;
              } else if (page >= totalPages - 2) {
                p = totalPages - 4 + i;
              } else {
                p = page - 2 + i;
              }
              return (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={`px-2 py-1 text-xs rounded ${
                    page === p
                      ? 'bg-blue-600 text-white font-semibold'
                      : 'text-gray-500 hover:bg-gray-100'
                  }`}
                >
                  {p}
                </button>
              );
            })}

            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="px-2 py-1 text-xs text-gray-500 hover:text-gray-800 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              Next →
            </button>
          </div>

          <div className="text-xs text-gray-400">
            {pageSize} per page · {total} total
          </div>
        </div>
      )}
    </div>
  );
}
