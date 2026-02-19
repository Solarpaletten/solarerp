// app/account/dashboard/page.tsx
// Account Dashboard — Factory-compatible
// Auth: x-user-id header (via getCurrentUser)
// API: /api/companies (Factory endpoints)

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

type Company = {
  id: string;
  name: string;
  code: string | null;
  vatNumber: string | null;
  country: string | null;
  status: 'ACTIVE' | 'FROZEN' | 'ARCHIVED';
  createdAt: string;
};

type CreateFormData = { name: string; code: string; vatNumber: string; country: string };

const STATUS_STYLE: Record<string, { bg: string; text: string; dot: string }> = {
  ACTIVE:   { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  FROZEN:   { bg: 'bg-amber-50',   text: 'text-amber-700',   dot: 'bg-amber-500' },
  ARCHIVED: { bg: 'bg-gray-100',   text: 'text-gray-500',    dot: 'bg-gray-400' },
};

const FLAGS: Record<string, string> = {
  DE: '🇩🇪', LT: '🇱🇹', PL: '🇵🇱', LV: '🇱🇻', EE: '🇪🇪', US: '🇺🇸', GB: '🇬🇧', FR: '🇫🇷',
};

export default function AccountDashboard() {
  const router = useRouter();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<CreateFormData>({ name: '', code: '', vatNumber: '', country: 'DE' });

  const fetchCompanies = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/companies');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setCompanies(await res.json());
      setError(null);
    } catch (e: any) {
      setError(e.message || 'Failed to load');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchCompanies(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      const res = await fetch('/api/companies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error('Failed to create');
      await fetchCompanies();
      setShowCreate(false);
      setForm({ name: '', code: '', vatNumber: '', country: 'DE' });
    } catch (e: any) { setError(e.message); }
    finally { setCreating(false); }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete "${name}"?`)) return;
    await fetch(`/api/companies/${id}`, { method: 'DELETE' });
    await fetchCompanies();
  };

  const active = companies.filter(c => c.status === 'ACTIVE').length;
  const countries = new Set(companies.map(c => c.country).filter(Boolean)).size;

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <span className="text-4xl">☀️</span>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Solar ERP</h1>
            <p className="text-sm text-gray-500">Account Dashboard — Multi-Tenant Architecture</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">Companies</p>
            <p className="text-2xl font-bold text-gray-900">{companies.length}</p>
          </div>
          <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">Active</p>
            <p className="text-2xl font-bold text-emerald-600">{active}</p>
          </div>
          <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">Countries</p>
            <p className="text-2xl font-bold text-blue-600">{countries}</p>
          </div>
        </div>

        {/* Actions bar */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-800">Companies</h2>
          <button onClick={() => setShowCreate(!showCreate)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-sm">
            + New Company
          </button>
        </div>

        {/* Create form */}
        {showCreate && (
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 mb-6">
            <h3 className="text-base font-semibold text-gray-800 mb-4">Create New Company</h3>
            <form onSubmit={handleCreate} className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Company Name *</label>
                <input type="text" required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Solar Energy Ltd" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Code</label>
                <input type="text" value={form.code} onChange={e => setForm({ ...form, code: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="SOLAR-01" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">VAT Number</label>
                <input type="text" value={form.vatNumber} onChange={e => setForm({ ...form, vatNumber: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="DE123456789" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Country</label>
                <select value={form.country} onChange={e => setForm({ ...form, country: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                  <option value="DE">🇩🇪 Germany</option><option value="LT">🇱🇹 Lithuania</option>
                  <option value="PL">🇵🇱 Poland</option><option value="LV">🇱🇻 Latvia</option><option value="EE">🇪🇪 Estonia</option>
                </select>
              </div>
              <div className="col-span-2 flex gap-3 pt-2">
                <button type="submit" disabled={creating}
                  className="px-5 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50">{creating ? 'Creating...' : 'Create Company'}</button>
                <button type="button" onClick={() => setShowCreate(false)}
                  className="px-5 py-2 text-gray-600 text-sm rounded-lg hover:bg-gray-100">Cancel</button>
              </div>
            </form>
          </div>
        )}

        {error && <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-6"><p className="text-red-600 text-sm">{error}</p></div>}

        {/* Companies grid */}
        {companies.length === 0 ? (
          <div className="bg-white rounded-xl p-12 shadow-sm border border-gray-100 text-center">
            <span className="text-5xl block mb-4">🏢</span>
            <p className="text-gray-500 mb-4">No companies yet. Create your first company to get started.</p>
            <button onClick={() => setShowCreate(true)} className="px-5 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700">Create Company</button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {companies.map(company => {
              const s = STATUS_STYLE[company.status] || STATUS_STYLE.ACTIVE;
              const flag = FLAGS[company.country || ''] || '🌍';
              return (
                <div key={company.id} className="bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md hover:border-blue-200 transition-all group">
                  <div className="p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div className="w-10 h-10 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-sm">{company.name.charAt(0)}</div>
                      <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${s.bg} ${s.text}`}>
                        <div className={`w-1.5 h-1.5 rounded-full ${s.dot}`}></div>{company.status}
                      </div>
                    </div>
                    <h3 className="font-semibold text-gray-900 mb-1 truncate">{company.name}</h3>
                    <div className="flex items-center gap-3 text-xs text-gray-400 mb-4">
                      {company.code && <span className="font-mono">{company.code}</span>}
                      {company.country && <span>{flag} {company.country}</span>}
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => router.push(`/account/companies/${company.id}`)}
                        className="flex-1 px-3 py-2 bg-blue-50 text-blue-700 text-xs font-medium rounded-lg hover:bg-blue-100 transition-colors">Enter Workspace →</button>
                      <button onClick={() => handleDelete(company.id, company.name)}
                        className="px-3 py-2 text-red-400 text-xs rounded-lg hover:bg-red-50 hover:text-red-600 transition-colors opacity-0 group-hover:opacity-100">🗑</button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
