'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

// =============================================================================
// TYPES
// =============================================================================

type Company = {
  id: string;
  name: string;
  code: string | null;
  vatNumber: string | null;
  country: string | null;
  status: string;
  createdAt: string;
};

type PageState = {
  companies: Company[];
  isLoading: boolean;
  error: string | null;
};

type CreateFormState = {
  isOpen: boolean;
  name: string;
  code: string;
  vatNumber: string;
  country: string;
  isSubmitting: boolean;
  error: string | null;
};

// =============================================================================
// COMPONENT
// =============================================================================

export default function DashboardPage() {
  const [state, setState] = useState<PageState>({
    companies: [],
    isLoading: true,
    error: null,
  });

  const [form, setForm] = useState<CreateFormState>({
    isOpen: false,
    name: '',
    code: '',
    vatNumber: '',
    country: '',
    isSubmitting: false,
    error: null,
  });

  // Factory auth: x-user-id from localStorage
  const getAuthHeaders = (): Record<string, string> => {
    const userId = localStorage.getItem('userId');
    return {
      'Content-Type': 'application/json',
      'x-user-id': userId || '',
    };
  };

  // ───────────────────────────────────────────────
  // DATA FETCHING
  // ───────────────────────────────────────────────

  const fetchCompanies = async () => {
    try {
      const response = await fetch('/api/companies', {
        headers: getAuthHeaders(),
      });
      if (!response.ok) throw new Error('Failed to fetch companies');
      const companies = await response.json();
      setState({ companies, isLoading: false, error: null });
    } catch (error) {
      setState({
        companies: [],
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to load',
      });
    }
  };

  useEffect(() => {
    fetchCompanies();
  }, []);

  // ───────────────────────────────────────────────
  // CREATE COMPANY
  // ───────────────────────────────────────────────

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;

    setForm((prev) => ({ ...prev, isSubmitting: true, error: null }));

    try {
      const response = await fetch('/api/companies', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          name: form.name,
          code: form.code || null,
          vatNumber: form.vatNumber || null,
          country: form.country || null,
        }),
      });

      if (!response.ok) throw new Error('Failed to create company');

      setForm({
        isOpen: false,
        name: '',
        code: '',
        vatNumber: '',
        country: '',
        isSubmitting: false,
        error: null,
      });
      fetchCompanies();
    } catch (error) {
      setForm((prev) => ({
        ...prev,
        isSubmitting: false,
        error: error instanceof Error ? error.message : 'Failed',
      }));
    }
  };

  // ───────────────────────────────────────────────
  // DELETE COMPANY
  // ───────────────────────────────────────────────

  const handleDelete = async (company: Company) => {
    if (!window.confirm(`Delete "${company.name}"? This cannot be undone.`)) return;

    try {
      await fetch(`/api/companies/${company.id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      fetchCompanies();
    } catch {
      alert('Failed to delete');
    }
  };

  // ───────────────────────────────────────────────
  // DERIVED STATE
  // ───────────────────────────────────────────────

  const activeCount = state.companies.filter((c) => c.status === 'ACTIVE').length;
  const frozenCount = state.companies.filter((c) => c.status === 'FROZEN').length;
  const archivedCount = state.companies.filter((c) => c.status === 'ARCHIVED').length;

  // ───────────────────────────────────────────────
  // RENDER
  // ───────────────────────────────────────────────

  if (state.isLoading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="inline-block w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-gray-500">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 mt-1">Manage your companies and ERP workspaces</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        <StatCard label="Total Companies" value={state.companies.length} icon="🏢" color="blue" />
        <StatCard label="Active" value={activeCount} icon="✅" color="green" />
        <StatCard label="Frozen" value={frozenCount} icon="❄️" color="yellow" />
        <StatCard label="Archived" value={archivedCount} icon="📦" color="gray" />
      </div>

      {/* Actions Bar */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Companies</h2>
        <button
          onClick={() => setForm((prev) => ({ ...prev, isOpen: !prev.isOpen }))}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
        >
          <span>+</span>
          <span>New Company</span>
        </button>
      </div>

      {/* Create Form */}
      {form.isOpen && (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Create Company</h3>
          {form.error && (
            <p className="text-red-600 text-sm mb-4 bg-red-50 px-3 py-2 rounded">{form.error}</p>
          )}
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Company Name *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g. Solar Trading GmbH"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Code</label>
                <input
                  type="text"
                  value={form.code}
                  onChange={(e) => setForm((prev) => ({ ...prev, code: e.target.value }))}
                  placeholder="e.g. SOLAR-01"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">VAT Number</label>
                <input
                  type="text"
                  value={form.vatNumber}
                  onChange={(e) => setForm((prev) => ({ ...prev, vatNumber: e.target.value }))}
                  placeholder="e.g. DE123456789"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
                <input
                  type="text"
                  value={form.country}
                  onChange={(e) => setForm((prev) => ({ ...prev, country: e.target.value }))}
                  placeholder="e.g. DE, LT, PL"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  maxLength={3}
                />
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={form.isSubmitting}
                className="px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors text-sm font-medium"
              >
                {form.isSubmitting ? 'Creating...' : 'Create Company'}
              </button>
              <button
                type="button"
                onClick={() => setForm((prev) => ({ ...prev, isOpen: false }))}
                className="px-5 py-2.5 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors text-sm"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Error */}
      {state.error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
          {state.error}
        </div>
      )}

      {/* Company Grid */}
      {state.companies.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-dashed border-gray-300">
          <p className="text-4xl mb-3">🏢</p>
          <p className="text-gray-600 font-medium">No companies yet</p>
          <p className="text-gray-400 text-sm mt-1">Create your first company to get started</p>
          <button
            onClick={() => setForm((prev) => ({ ...prev, isOpen: true }))}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
          >
            + New Company
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {state.companies.map((company) => (
            <CompanyCard
              key={company.id}
              company={company}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

function StatCard({
  label,
  value,
  icon,
  color,
}: {
  label: string;
  value: number;
  icon: string;
  color: 'blue' | 'green' | 'yellow' | 'gray';
}) {
  const colorMap = {
    blue: 'text-blue-600 bg-blue-50',
    green: 'text-green-600 bg-green-50',
    yellow: 'text-yellow-600 bg-yellow-50',
    gray: 'text-gray-600 bg-gray-50',
  };

  return (
    <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm text-gray-500">{label}</div>
          <div className="text-2xl font-bold text-gray-900 mt-1">{value}</div>
        </div>
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl ${colorMap[color]}`}>
          {icon}
        </div>
      </div>
    </div>
  );
}

function CompanyCard({
  company,
  onDelete,
}: {
  company: Company;
  onDelete: (c: Company) => void;
}) {
  const statusStyles: Record<string, string> = {
    ACTIVE: 'bg-green-100 text-green-700',
    FROZEN: 'bg-yellow-100 text-yellow-700',
    ARCHIVED: 'bg-gray-100 text-gray-600',
  };

  return (
    <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow group">
      <div className="flex justify-between items-start mb-3">
        <Link
          href={`/account/companies/${company.id}`}
          className="font-semibold text-gray-900 hover:text-blue-600 transition-colors"
        >
          {company.name}
        </Link>
        <button
          onClick={() => onDelete(company)}
          className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
          title="Delete company"
        >
          🗑️
        </button>
      </div>

      <div className="space-y-1 text-sm text-gray-500 mb-4">
        {company.code && <p>Code: <span className="text-gray-700">{company.code}</span></p>}
        {company.vatNumber && <p>VAT: <span className="text-gray-700">{company.vatNumber}</span></p>}
        {company.country && <p>Country: <span className="text-gray-700">{company.country}</span></p>}
      </div>

      <div className="flex justify-between items-center pt-3 border-t border-gray-50">
        <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${statusStyles[company.status] || 'bg-gray-100 text-gray-600'}`}>
          {company.status}
        </span>
        <span className="text-xs text-gray-400">
          {new Date(company.createdAt).toLocaleDateString()}
        </span>
      </div>

      <Link
        href={`/account/companies/${company.id}`}
        className="block mt-3 text-center text-sm text-blue-600 hover:text-blue-700 font-medium py-2 rounded-lg hover:bg-blue-50 transition-colors"
      >
        Open Workspace →
      </Link>
    </div>
  );
}
