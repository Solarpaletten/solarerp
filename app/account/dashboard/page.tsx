'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

type Company = {
  id: string;
  name: string;
  code: string | null;
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
  isSubmitting: boolean;
  error: string | null;
};

export default function DashboardPage() {
  const [state, setState] = useState<PageState>({
    companies: [],
    isLoading: true,
    error: null,
  });

  const [form, setForm] = useState<CreateFormState>({
    isOpen: false,
    name: '',
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

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;

    setForm((prev) => ({ ...prev, isSubmitting: true, error: null }));

    try {
      const response = await fetch('/api/companies', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ name: form.name }),
      });

      if (!response.ok) throw new Error('Failed to create company');

      setForm({ isOpen: false, name: '', isSubmitting: false, error: null });
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
    if (!window.confirm(`Delete "${company.name}"?`)) return;

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

  const activeCount = state.companies.filter((c) => c.status === 'ACTIVE').length;

  if (state.isLoading) {
    return <div className="p-8 text-gray-500">Loading...</div>;
  }

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-2">Dashboard</h1>
      <p className="text-gray-600 mb-8">Manage your companies and ERP workspaces</p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="text-3xl font-bold text-blue-600">{state.companies.length}</div>
          <div className="text-gray-500">Total Companies</div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="text-3xl font-bold text-green-600">{activeCount}</div>
          <div className="text-gray-500">Active Companies</div>
        </div>
      </div>

      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Companies</h2>
        <button
          onClick={() => setForm((prev) => ({ ...prev, isOpen: !prev.isOpen }))}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          + New Company
        </button>
      </div>

      {form.isOpen && (
        <div className="bg-white p-6 rounded-xl shadow-sm border mb-6">
          <form onSubmit={handleCreate} className="flex gap-4">
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
              placeholder="Company name"
              className="flex-1 px-4 py-2 border rounded-lg"
              required
            />
            <button
              type="submit"
              disabled={form.isSubmitting}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-50"
            >
              {form.isSubmitting ? 'Creating...' : 'Create'}
            </button>
          </form>
        </div>
      )}

      {state.error && <p className="text-red-600 mb-4">{state.error}</p>}

      {state.companies.length === 0 ? (
        <p className="text-gray-500">No companies yet.</p>
      ) : (
        <div className="grid gap-4">
          {state.companies.map((company) => (
            <div
              key={company.id}
              className="bg-white p-4 rounded-xl shadow-sm border flex justify-between items-center"
            >
              <Link
                href={`/account/companies/${company.id}`}
                className="font-medium text-gray-900 hover:text-blue-600"
              >
                {company.name}
                {company.code && <span className="text-gray-400 ml-2">({company.code})</span>}
              </Link>
              <div className="flex items-center gap-4">
                <span className={`text-xs px-2 py-1 rounded ${
                  company.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                }`}>
                  {company.status}
                </span>
                <button
                  onClick={() => handleDelete(company)}
                  className="text-red-500 hover:text-red-700"
                >
                  🗑️
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

