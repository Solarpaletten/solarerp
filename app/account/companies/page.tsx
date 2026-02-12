'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

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

export default function CompaniesPage() {
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

  const getAuthHeaders = () => {
    const userId = localStorage.getItem('userId');
    return {
      'Content-Type': 'application/json',
      'x-user-id': userId || '',
    };
  };

  const fetchCompanies = async () => {
    try {
      const response = await fetch('/api/companies', {
        headers: getAuthHeaders(),
      });
      if (!response.ok) throw new Error('Failed to fetch');
      const companies = await response.json();
      setState({ companies, isLoading: false, error: null });
    } catch (error) {
      setState({
        companies: [],
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed',
      });
    }
  };

  useEffect(() => {
    fetchCompanies();
  }, []);

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

      if (!response.ok) throw new Error('Failed to create');

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

  if (state.isLoading) {
    return <div className="p-8 text-gray-500">Loading companies...</div>;
  }

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Companies</h1>
        <button
          onClick={() => setForm((prev) => ({ ...prev, isOpen: !prev.isOpen }))}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          + New Company
        </button>
      </div>

      {form.isOpen && (
        <div className="bg-white p-6 rounded-xl shadow-sm border mb-8">
          <h2 className="text-lg font-semibold mb-4">Create Company</h2>
          {form.error && <p className="text-red-600 text-sm mb-4">{form.error}</p>}
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="Company Name *"
                className="px-4 py-2 border rounded-lg"
                required
              />
              <input
                type="text"
                value={form.code}
                onChange={(e) => setForm((prev) => ({ ...prev, code: e.target.value }))}
                placeholder="Code"
                className="px-4 py-2 border rounded-lg"
              />
              <input
                type="text"
                value={form.vatNumber}
                onChange={(e) => setForm((prev) => ({ ...prev, vatNumber: e.target.value }))}
                placeholder="VAT Number"
                className="px-4 py-2 border rounded-lg"
              />
              <input
                type="text"
                value={form.country}
                onChange={(e) => setForm((prev) => ({ ...prev, country: e.target.value }))}
                placeholder="Country (e.g. LT)"
                className="px-4 py-2 border rounded-lg"
              />
            </div>
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={form.isSubmitting}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-50"
              >
                {form.isSubmitting ? 'Creating...' : 'Create'}
              </button>
              <button
                type="button"
                onClick={() => setForm((prev) => ({ ...prev, isOpen: false }))}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {state.error && <p className="text-red-600 mb-4">{state.error}</p>}

      {state.companies.length === 0 ? (
        <p className="text-gray-500">No companies yet. Create your first company!</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {state.companies.map((company) => (
            <div
              key={company.id}
              className="bg-white p-6 rounded-xl shadow-sm border hover:shadow-md transition-shadow"
            >
              <div className="flex justify-between items-start mb-2">
                <Link
                  href={`/account/companies/${company.id}`}
                  className="font-semibold text-gray-900 hover:text-blue-600"
                >
                  {company.name}
                </Link>
                <button
                  onClick={() => handleDelete(company)}
                  className="text-red-500 hover:text-red-700"
                >
                  🗑️
                </button>
              </div>
              {company.code && <p className="text-sm text-gray-500">Code: {company.code}</p>}
              {company.vatNumber && <p className="text-sm text-gray-500">VAT: {company.vatNumber}</p>}
              {company.country && <p className="text-sm text-gray-500">Country: {company.country}</p>}
              <div className="mt-3 flex justify-between items-center">
                <span className={`text-xs px-2 py-1 rounded ${
                  company.status === 'ACTIVE' ? 'bg-green-100 text-green-700' :
                  company.status === 'FROZEN' ? 'bg-yellow-100 text-yellow-700' :
                  'bg-gray-100 text-gray-700'
                }`}>
                  {company.status}
                </span>
                <span className="text-xs text-gray-400">
                  {new Date(company.createdAt).toLocaleDateString()}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

