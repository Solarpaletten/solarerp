// app/(dashboard)/company/[companyId]/chart-of-accounts/page.tsx
// ═══════════════════════════════════════════════════
// Chart of Accounts — ERP Core Foundation
// ═══════════════════════════════════════════════════
//
// Uses CompanyContext (zero duplicate fetch)
// Cookie-only auth (no localStorage, no x-user-id)
// CRUD: table + create/edit modals + delete confirmation

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { Plus, Pencil, Trash2, X, ChevronDown } from 'lucide-react';

// ─── TYPES ───────────────────────────────────────
type AccountType = 'ASSET' | 'LIABILITY' | 'EQUITY' | 'INCOME' | 'EXPENSE';

interface Account {
  id: string;
  code: string;
  name: string;
  type: AccountType;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface AccountFormData {
  code: string;
  name: string;
  type: AccountType;
}

const ACCOUNT_TYPES: { value: AccountType; label: string; color: string }[] = [
  { value: 'ASSET',     label: 'Asset',     color: 'bg-blue-100 text-blue-800' },
  { value: 'LIABILITY', label: 'Liability', color: 'bg-red-100 text-red-800' },
  { value: 'EQUITY',    label: 'Equity',    color: 'bg-purple-100 text-purple-800' },
  { value: 'INCOME',    label: 'Income',    color: 'bg-green-100 text-green-800' },
  { value: 'EXPENSE',   label: 'Expense',   color: 'bg-orange-100 text-orange-800' },
];

const TYPE_COLOR_MAP: Record<AccountType, string> = {
  ASSET:     'bg-blue-100 text-blue-800',
  LIABILITY: 'bg-red-100 text-red-800',
  EQUITY:    'bg-purple-100 text-purple-800',
  INCOME:    'bg-green-100 text-green-800',
  EXPENSE:   'bg-orange-100 text-orange-800',
};

// ─── COMPONENT ───────────────────────────────────
export default function ChartOfAccountsPage() {
  const params = useParams();
  const companyId = params.companyId as string;

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Account | null>(null);
  const [formData, setFormData] = useState<AccountFormData>({
    code: '', name: '', type: 'ASSET',
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Filter state
  const [filterType, setFilterType] = useState<AccountType | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // ─── FETCH ACCOUNTS ────────────────────────────
  const fetchAccounts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/company/${companyId}/accounts`);

      if (res.status === 401) {
        window.location.href = '/login';
        return;
      }

      if (!res.ok) throw new Error(`API returned ${res.status}`);

      const data = await res.json();
      setAccounts(data.data || []);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load accounts';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => { fetchAccounts(); }, [fetchAccounts]);

  // ─── CREATE ────────────────────────────────────
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFormError(null);

    try {
      const res = await fetch(`/api/company/${companyId}/accounts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to create account');
      }

      setShowCreateModal(false);
      setFormData({ code: '', name: '', type: 'ASSET' });
      await fetchAccounts();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to create account';
      setFormError(message);
    } finally {
      setSaving(false);
    }
  };

  // ─── UPDATE ────────────────────────────────────
  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAccount) return;
    setSaving(true);
    setFormError(null);

    try {
      const res = await fetch(`/api/company/${companyId}/accounts/${editingAccount.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to update account');
      }

      setEditingAccount(null);
      setFormData({ code: '', name: '', type: 'ASSET' });
      await fetchAccounts();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to update account';
      setFormError(message);
    } finally {
      setSaving(false);
    }
  };

  // ─── DELETE ────────────────────────────────────
  const handleDelete = async () => {
    if (!deleteTarget) return;

    try {
      const res = await fetch(`/api/company/${companyId}/accounts/${deleteTarget.id}`, {
        method: 'DELETE',
      });

      if (!res.ok && res.status !== 204) {
        throw new Error('Failed to delete account');
      }

      setDeleteTarget(null);
      await fetchAccounts();
    } catch {
      alert('Failed to delete account');
    }
  };

  // ─── OPEN EDIT MODAL ──────────────────────────
  const openEdit = (account: Account) => {
    setEditingAccount(account);
    setFormData({ code: account.code, name: account.name, type: account.type });
    setFormError(null);
  };

  // ─── FILTER ────────────────────────────────────
  const filteredAccounts = accounts.filter(acc => {
    if (filterType !== 'ALL' && acc.type !== filterType) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return acc.code.toLowerCase().includes(q) || acc.name.toLowerCase().includes(q);
    }
    return true;
  });

  // ─── STATS ─────────────────────────────────────
  const stats = ACCOUNT_TYPES.map(t => ({
    ...t,
    count: accounts.filter(a => a.type === t.value).length,
  }));

  // ─── LOADING ───────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-500">Loading accounts...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">📋 Chart of Accounts</h1>
          <p className="text-sm text-gray-500 mt-1">{accounts.length} accounts total</p>
        </div>
        <button
          onClick={() => {
            setShowCreateModal(true);
            setFormData({ code: '', name: '', type: 'ASSET' });
            setFormError(null);
          }}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg font-medium transition-colors"
        >
          <Plus className="w-4 h-4" /> New Account
        </button>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
          {error}
        </div>
      )}

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        {stats.map(s => (
          <button
            key={s.value}
            onClick={() => setFilterType(filterType === s.value ? 'ALL' : s.value)}
            className={`p-3 rounded-lg border text-center transition-all ${
              filterType === s.value
                ? 'border-blue-500 ring-2 ring-blue-200'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${s.color}`}>
              {s.label}
            </span>
            <p className="text-2xl font-bold text-gray-800 mt-1">{s.count}</p>
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="mb-4">
        <input
          type="text"
          placeholder="Search by code or name..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full md:w-80 border border-gray-300 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Code</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Name</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Type</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredAccounts.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center py-12 text-gray-400">
                  {accounts.length === 0
                    ? 'No accounts yet. Create your first account.'
                    : 'No accounts match your filter.'}
                </td>
              </tr>
            ) : (
              filteredAccounts.map((account) => (
                <tr key={account.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <span className="font-mono text-sm font-semibold text-gray-800">{account.code}</span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">{account.name}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${TYPE_COLOR_MAP[account.type]}`}>
                      {account.type}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${
                      account.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-500'
                    }`}>
                      {account.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => openEdit(account)}
                        className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors">
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button onClick={() => setDeleteTarget(account)}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ─── CREATE MODAL ──────────────────────── */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-800">New Account</h3>
              <button onClick={() => setShowCreateModal(false)}
                className="p-1 text-gray-400 hover:text-gray-600 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>
            {formError && (
              <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                {formError}
              </div>
            )}
            <form onSubmit={handleCreate}>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Account Code</label>
                  <input
                    placeholder="e.g. 1000"
                    required
                    value={formData.code}
                    onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value }))}
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Account Name</label>
                  <input
                    placeholder="e.g. Cash"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Account Type</label>
                  <div className="relative">
                    <select
                      value={formData.type}
                      onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value as AccountType }))}
                      className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none appearance-none pr-8"
                    >
                      {ACCOUNT_TYPES.map(t => (
                        <option key={t.value} value={t.value}>{t.label}</option>
                      ))}
                    </select>
                    <ChevronDown className="w-4 h-4 text-gray-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button type="submit" disabled={saving}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white py-2 rounded-lg font-semibold transition-colors">
                  {saving ? 'Creating...' : 'Create Account'}
                </button>
                <button type="button" onClick={() => setShowCreateModal(false)}
                  className="flex-1 bg-gray-100 hover:bg-gray-200 py-2 rounded-lg font-semibold transition-colors">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── EDIT MODAL ────────────────────────── */}
      {editingAccount && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-800">Edit Account</h3>
              <button onClick={() => setEditingAccount(null)}
                className="p-1 text-gray-400 hover:text-gray-600 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>
            {formError && (
              <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                {formError}
              </div>
            )}
            <form onSubmit={handleUpdate}>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Account Code</label>
                  <input
                    required
                    value={formData.code}
                    onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value }))}
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Account Name</label>
                  <input
                    required
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Account Type</label>
                  <div className="relative">
                    <select
                      value={formData.type}
                      onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value as AccountType }))}
                      className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none appearance-none pr-8"
                    >
                      {ACCOUNT_TYPES.map(t => (
                        <option key={t.value} value={t.value}>{t.label}</option>
                      ))}
                    </select>
                    <ChevronDown className="w-4 h-4 text-gray-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button type="submit" disabled={saving}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white py-2 rounded-lg font-semibold transition-colors">
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
                <button type="button" onClick={() => setEditingAccount(null)}
                  className="flex-1 bg-gray-100 hover:bg-gray-200 py-2 rounded-lg font-semibold transition-colors">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── DELETE CONFIRMATION ───────────────── */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-sm mx-4 text-center">
            <div className="text-4xl mb-3">⚠️</div>
            <h3 className="text-lg font-bold mb-2">Delete Account?</h3>
            <p className="text-sm text-gray-600 mb-1">
              <span className="font-mono font-semibold">{deleteTarget.code}</span> — {deleteTarget.name}
            </p>
            <p className="text-xs text-gray-400 mb-6">This action cannot be undone.</p>
            <div className="flex gap-3">
              <button onClick={handleDelete}
                className="flex-1 bg-red-500 hover:bg-red-600 text-white py-2 rounded-lg font-semibold transition-colors">
                Delete
              </button>
              <button onClick={() => setDeleteTarget(null)}
                className="flex-1 bg-gray-100 hover:bg-gray-200 py-2 rounded-lg font-semibold transition-colors">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
