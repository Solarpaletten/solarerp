// app/(dashboard)/company/[companyId]/clients/page.tsx
// ═══════════════════════════════════════════════════
// Task 55 v2: Client List Page
// Shows all clients in ERPGrid format
// ═══════════════════════════════════════════════════

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Search, Plus, MoreVertical } from 'lucide-react';

interface Client {
  id: string;
  name: string;
  code: string | null;
  type: string;
  role: string;
  isActive: boolean;
  vatCode: string | null;
  email: string | null;
  createdAt: string;
}

interface ListResponse {
  data: Client[];
  count: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export default function ClientListPage() {
  const params = useParams();
  const router = useRouter();
  const companyId = params.companyId as string;

  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [searchDebounce, setSearchDebounce] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [filterActive, setFilterActive] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setSearchDebounce(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Load clients
  const loadClients = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        search: searchDebounce,
        page: String(page),
        pageSize: String(pageSize),
        sortBy,
        sortDir,
      });

      if (filterActive !== 'all') {
        params.append('isActive', filterActive === 'active' ? 'true' : 'false');
      }

      if (filterType !== 'all') {
        params.append('type', filterType);
      }

      const res = await fetch(`/api/company/${companyId}/clients?${params}`, { cache: 'no-store' });
      if (!res.ok) throw new Error('Failed to load clients');

      const json: ListResponse = await res.json();
      setClients(json.data);
      setTotal(json.count);
      setTotalPages(json.totalPages);
    } catch (err) {
      console.error('Failed to load clients:', err);
      setClients([]);
    } finally {
      setLoading(false);
    }
  }, [companyId, searchDebounce, page, pageSize, sortBy, sortDir, filterActive, filterType]);

  useEffect(() => {
    setPage(1); // Reset to page 1 when filters change
  }, [searchDebounce, filterActive, filterType, sortBy, sortDir]);

  useEffect(() => {
    loadClients();
  }, [loadClients]);

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortDir('asc');
    }
  };

  const getSortIcon = (field: string) => {
    if (sortBy !== field) return '⇅';
    return sortDir === 'asc' ? '↑' : '↓';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Clients</h1>
        <Link
          href={`/company/${companyId}/clients/new`}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700"
        >
          <Plus size={16} />
          New Client
        </Link>
      </div>

      {/* Filters & Search */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-4">
        <div className="grid grid-cols-4 gap-4">
          {/* Search */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-2">Search</label>
            <div className="relative">
              <Search size={16} className="absolute left-3 top-3 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Name, code, email..."
                className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-400"
              />
            </div>
          </div>

          {/* Filter: Active/Inactive */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-2">Status</label>
            <select
              value={filterActive}
              onChange={e => setFilterActive(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-400"
            >
              <option value="all">All</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

          {/* Filter: Type */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-2">Type</label>
            <select
              value={filterType}
              onChange={e => setFilterType(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-400"
            >
              <option value="all">All Types</option>
              <option value="COMPANY">Company</option>
              <option value="INDIVIDUAL">Individual</option>
              <option value="SOLE_TRADER">Sole Trader</option>
              <option value="GOVERNMENT">Government</option>
              <option value="NON_PROFIT">Non-Profit</option>
            </select>
          </div>

          {/* Page Size */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-2">Per Page</label>
            <select
              value={pageSize}
              onChange={e => setPageSize(Number(e.target.value))}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-400"
            >
              <option value="10">10</option>
              <option value="20">20</option>
              <option value="50">50</option>
              <option value="100">100</option>
            </select>
          </div>
        </div>

        {/* Results Info */}
        <div className="text-xs text-gray-500">
          Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} of {total} clients
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-gray-700">
                <button onClick={() => handleSort('name')} className="flex items-center gap-1 hover:text-blue-600">
                  Name {getSortIcon('name')}
                </button>
              </th>
              <th className="px-4 py-3 text-left font-medium text-gray-700">
                <button onClick={() => handleSort('code')} className="flex items-center gap-1 hover:text-blue-600">
                  Code {getSortIcon('code')}
                </button>
              </th>
              <th className="px-4 py-3 text-left font-medium text-gray-700">Type</th>
              <th className="px-4 py-3 text-left font-medium text-gray-700">Role</th>
              <th className="px-4 py-3 text-left font-medium text-gray-700">Email</th>
              <th className="px-4 py-3 text-left font-medium text-gray-700">VAT Code</th>
              <th className="px-4 py-3 text-center font-medium text-gray-700">Status</th>
              <th className="px-4 py-3 text-center font-medium text-gray-700">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                  Loading...
                </td>
              </tr>
            ) : clients.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                  No clients found
                </td>
              </tr>
            ) : (
              clients.map(client => (
                <tr key={client.id} className="border-b border-gray-200 hover:bg-gray-50 transition">
                  <td className="px-4 py-3">
                    <Link href={`/company/${companyId}/clients/${client.id}`} className="text-blue-600 hover:text-blue-700 font-medium">
                      {client.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{client.code || '—'}</td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-700">{client.type}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-700">{client.role}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{client.email || '—'}</td>
                  <td className="px-4 py-3 text-gray-600 font-mono text-xs">{client.vatCode || '—'}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`px-2 py-1 text-xs rounded-full ${client.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {client.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => router.push(`/company/${companyId}/clients/${client.id}`)}
                      className="inline-flex text-gray-500 hover:text-gray-700"
                    >
                      <MoreVertical size={16} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <button
            onClick={() => setPage(Math.max(1, page - 1))}
            disabled={page === 1}
            className="px-3 py-2 text-sm border border-gray-200 rounded-md hover:bg-gray-50 disabled:opacity-50"
          >
            Previous
          </button>
          {Array.from({ length: totalPages }).map((_, i) => (
            <button
              key={i + 1}
              onClick={() => setPage(i + 1)}
              className={`px-3 py-2 text-sm rounded-md ${page === i + 1 ? 'bg-blue-600 text-white' : 'border border-gray-200 hover:bg-gray-50'}`}
            >
              {i + 1}
            </button>
          ))}
          <button
            onClick={() => setPage(Math.min(totalPages, page + 1))}
            disabled={page === totalPages}
            className="px-3 py-2 text-sm border border-gray-200 rounded-md hover:bg-gray-50 disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
