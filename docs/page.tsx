// app/(dashboard)/company/[companyId]/chart-of-accounts/page.tsx
// ═══════════════════════════════════════════════════
// Chart of Accounts — Bilingual + Bulk Operations
// ═══════════════════════════════════════════════════

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { Plus, Pencil, Trash2, X, ChevronDown, Globe, Check, Copy, AlertTriangle } from 'lucide-react';

// ─── TYPES ───────────────────────────────────────
type AccountType = 'ASSET' | 'LIABILITY' | 'EQUITY' | 'INCOME' | 'EXPENSE';
type Lang = 'de' | 'en';

interface Account {
  id: string;
  code: string;
  nameDe: string;
  nameEn: string;
  type: AccountType;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface AccountFormData {
  code: string;
  nameDe: string;
  nameEn: string;
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

function getAccountName(account: Account, lang: Lang): string {
  return lang === 'en' ? (account.nameEn || account.nameDe) : account.nameDe;
}

// ─── COMPONENT ───────────────────────────────────
export default function ChartOfAccountsPage() {
  const params = useParams();
  const companyId = params.companyId as string;

  if (!companyId || companyId.includes('[')) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="text-4xl mb-3">⚠️</div>
          <p className="text-red-500 font-semibold">Invalid company context</p>
        </div>
      </div>
    );
  }

  return <ChartOfAccountsContent companyId={companyId} />;
}

// ─── INNER COMPONENT ─────────────────────────────
function ChartOfAccountsContent({ companyId }: { companyId: string }) {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lang, setLang] = useState<Lang>('de');

  // Selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Account | null>(null);
  const [showDeleteAllModal, setShowDeleteAllModal] = useState(false);
  const [showDeleteSelectedModal, setShowDeleteSelectedModal] = useState(false);
  const [formData, setFormData] = useState<AccountFormData>({
    code: '', nameDe: '', nameEn: '', type: 'ASSET',
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [bulkResult, setBulkResult] = useState<string | null>(null);

  // Filter state
  const [filterType, setFilterType] = useState<AccountType | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // ─── FETCH ─────────────────────────────────────
  const fetchAccounts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/company/${companyId}/accounts`);
      if (res.status === 401) { window.location.href = '/login'; return; }
      if (!res.ok) throw new Error(`API returned ${res.status}`);
      const data = await res.json();
      setAccounts(data.data || []);
      setSelectedIds(new Set());
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load accounts');
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => { fetchAccounts(); }, [fetchAccounts]);

  // ─── FILTER ────────────────────────────────────
  const filteredAccounts = accounts.filter(acc => {
    if (filterType !== 'ALL' && acc.type !== filterType) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return acc.code.toLowerCase().includes(q) || acc.nameDe.toLowerCase().includes(q) || acc.nameEn.toLowerCase().includes(q);
    }
    return true;
  });

  // ─── SELECTION LOGIC ───────────────────────────
  const filteredIds = new Set(filteredAccounts.map(a => a.id));
  const allFilteredSelected = filteredAccounts.length > 0 && filteredAccounts.every(a => selectedIds.has(a.id));
  const someSelected = selectedIds.size > 0;
  const selectedCount = [...selectedIds].filter(id => filteredIds.has(id)).length;

  const toggleSelectAll = () => {
    if (allFilteredSelected) {
      // Deselect all filtered
      const next = new Set(selectedIds);
      filteredAccounts.forEach(a => next.delete(a.id));
      setSelectedIds(next);
    } else {
      // Select all filtered
      const next = new Set(selectedIds);
      filteredAccounts.forEach(a => next.add(a.id));
      setSelectedIds(next);
    }
  };

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelectedIds(next);
  };

  // ─── BULK DELETE SELECTED ──────────────────────
  const handleDeleteSelected = async () => {
    setBulkDeleting(true);
    setBulkResult(null);
    let deleted = 0;
    let failed = 0;

    for (const id of selectedIds) {
      try {
        const res = await fetch(`/api/company/${companyId}/accounts/${id}`, { method: 'DELETE' });
        if (res.ok || res.status === 204) deleted++;
        else failed++;
      } catch { failed++; }
    }

    setBulkDeleting(false);
    setShowDeleteSelectedModal(false);
    setBulkResult(`Deleted ${deleted}${failed > 0 ? `, ${failed} failed (have journal entries)` : ''}`);
    setTimeout(() => setBulkResult(null), 4000);
    await fetchAccounts();
  };

  // ─── DELETE ALL ────────────────────────────────
  const handleDeleteAll = async () => {
    setBulkDeleting(true);
    setBulkResult(null);
    let deleted = 0;
    let failed = 0;

    for (const acc of accounts) {
      try {
        const res = await fetch(`/api/company/${companyId}/accounts/${acc.id}`, { method: 'DELETE' });
        if (res.ok || res.status === 204) deleted++;
        else failed++;
      } catch { failed++; }
    }

    setBulkDeleting(false);
    setShowDeleteAllModal(false);
    setBulkResult(`Deleted ${deleted}${failed > 0 ? `, ${failed} skipped (have journal entries)` : ''}`);
    setTimeout(() => setBulkResult(null), 4000);
    await fetchAccounts();
  };

  // ─── COPY TO CLIPBOARD ─────────────────────────
  const handleCopySelected = () => {
    const selected = accounts.filter(a => selectedIds.has(a.id));
    if (selected.length === 0) return;
    const csv = ['code,nameDe,nameEn,type', ...selected.map(a => `${a.code},${a.nameDe},${a.nameEn},${a.type}`)].join('\n');
    navigator.clipboard.writeText(csv).then(() => {
      setBulkResult(`Copied ${selected.length} accounts to clipboard`);
      setTimeout(() => setBulkResult(null), 3000);
    });
  };

  // ─── CREATE ────────────────────────────────────
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFormError(null);
    try {
      const res = await fetch(`/api/company/${companyId}/accounts`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: formData.code, nameDe: formData.nameDe, nameEn: formData.nameEn || formData.nameDe, type: formData.type }),
      });
      if (!res.ok) { const err = await res.json(); throw new Error(err.error || 'Failed'); }
      setShowCreateModal(false);
      setFormData({ code: '', nameDe: '', nameEn: '', type: 'ASSET' });
      await fetchAccounts();
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'Failed');
    } finally { setSaving(false); }
  };

  // ─── UPDATE ────────────────────────────────────
  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAccount) return;
    setSaving(true);
    setFormError(null);
    try {
      const res = await fetch(`/api/company/${companyId}/accounts/${editingAccount.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: formData.code, nameDe: formData.nameDe, nameEn: formData.nameEn || formData.nameDe, type: formData.type }),
      });
      if (!res.ok) { const err = await res.json(); throw new Error(err.error || 'Failed'); }
      setEditingAccount(null);
      setFormData({ code: '', nameDe: '', nameEn: '', type: 'ASSET' });
      await fetchAccounts();
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'Failed');
    } finally { setSaving(false); }
  };

  // ─── DELETE SINGLE ─────────────────────────────
  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      const res = await fetch(`/api/company/${companyId}/accounts/${deleteTarget.id}`, { method: 'DELETE' });
      if (!res.ok && res.status !== 204) throw new Error('Failed');
      setDeleteTarget(null);
      await fetchAccounts();
    } catch { alert('Failed to delete account (may have journal entries)'); }
  };

  const openEdit = (account: Account) => {
    setEditingAccount(account);
    setFormData({ code: account.code, nameDe: account.nameDe, nameEn: account.nameEn, type: account.type });
    setFormError(null);
  };

  const stats = ACCOUNT_TYPES.map(t => ({ ...t, count: accounts.filter(a => a.type === t.value).length }));

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
        <div className="flex items-center gap-3">
          <button onClick={() => setLang(lang === 'de' ? 'en' : 'de')}
            className="flex items-center gap-1.5 px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
            title={lang === 'de' ? 'Switch to English' : 'Auf Deutsch umschalten'}>
            <Globe className="w-4 h-4" />{lang === 'de' ? 'DE' : 'EN'}
          </button>
          <button onClick={() => { setShowCreateModal(true); setFormData({ code: '', nameDe: '', nameEn: '', type: 'ASSET' }); setFormError(null); }}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg font-medium transition-colors">
            <Plus className="w-4 h-4" /> New Account
          </button>
        </div>
      </div>

      {error && <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">{error}</div>}
      {bulkResult && <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-blue-700 text-sm font-medium">{bulkResult}</div>}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        {stats.map(s => (
          <button key={s.value} onClick={() => setFilterType(filterType === s.value ? 'ALL' : s.value)}
            className={`p-3 rounded-lg border text-center transition-all ${filterType === s.value ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-200 hover:border-gray-300'}`}>
            <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${s.color}`}>{s.label}</span>
            <p className="text-2xl font-bold text-gray-800 mt-1">{s.count}</p>
          </button>
        ))}
      </div>

      {/* Search + Bulk toolbar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-4">
        <input type="text" placeholder="Search by code or name..." value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full sm:w-80 border border-gray-300 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />

        <div className="flex items-center gap-2 flex-wrap">
          {someSelected && (
            <>
              <span className="text-sm text-gray-500 font-medium">{selectedCount} selected</span>
              <button onClick={handleCopySelected}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors">
                <Copy className="w-3.5 h-3.5" /> Copy CSV
              </button>
              <button onClick={() => setShowDeleteSelectedModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors">
                <Trash2 className="w-3.5 h-3.5" /> Delete Selected
              </button>
            </>
          )}
          <button onClick={() => setShowDeleteAllModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-red-600 border border-red-200 hover:bg-red-50 rounded-lg transition-colors">
            <Trash2 className="w-3.5 h-3.5" /> Delete All
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="w-10 px-3 py-3">
                <button onClick={toggleSelectAll}
                  className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                    allFilteredSelected ? 'bg-blue-600 border-blue-600' : 'border-gray-300 hover:border-blue-400'
                  }`}>
                  {allFilteredSelected && <Check className="w-3.5 h-3.5 text-white" />}
                </button>
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Code</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Name {lang === 'de' ? '(DE)' : '(EN)'}</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Type</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredAccounts.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-12 text-gray-400">
                  {accounts.length === 0 ? 'No accounts yet. Create your first account.' : 'No accounts match your filter.'}
                </td>
              </tr>
            ) : (
              filteredAccounts.map((account) => {
                const isSelected = selectedIds.has(account.id);
                return (
                  <tr key={account.id} className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${isSelected ? 'bg-blue-50/50' : ''}`}>
                    <td className="w-10 px-3 py-3">
                      <button onClick={() => toggleSelect(account.id)}
                        className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                          isSelected ? 'bg-blue-600 border-blue-600' : 'border-gray-300 hover:border-blue-400'
                        }`}>
                        {isSelected && <Check className="w-3.5 h-3.5 text-white" />}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-mono text-sm font-semibold text-gray-800">{account.code}</span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">{getAccountName(account, lang)}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${TYPE_COLOR_MAP[account.type]}`}>{account.type}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${account.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-500'}`}>
                        {account.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => openEdit(account)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors">
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button onClick={() => setDeleteTarget(account)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* ═══ MODALS ═══════════════════════════════ */}

      {/* CREATE */}
      {showCreateModal && (
        <Modal title="New Account" onClose={() => setShowCreateModal(false)}>
          {formError && <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">{formError}</div>}
          <form onSubmit={handleCreate}>
            <AccountFormFields formData={formData} setFormData={setFormData} />
            <div className="flex gap-3 mt-6">
              <button type="submit" disabled={saving}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white py-2 rounded-lg font-semibold transition-colors">
                {saving ? 'Creating...' : 'Create Account'}
              </button>
              <button type="button" onClick={() => setShowCreateModal(false)}
                className="flex-1 bg-gray-100 hover:bg-gray-200 py-2 rounded-lg font-semibold transition-colors">Cancel</button>
            </div>
          </form>
        </Modal>
      )}

      {/* EDIT */}
      {editingAccount && (
        <Modal title="Edit Account" onClose={() => setEditingAccount(null)}>
          {formError && <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">{formError}</div>}
          <form onSubmit={handleUpdate}>
            <AccountFormFields formData={formData} setFormData={setFormData} />
            <div className="flex gap-3 mt-6">
              <button type="submit" disabled={saving}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white py-2 rounded-lg font-semibold transition-colors">
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
              <button type="button" onClick={() => setEditingAccount(null)}
                className="flex-1 bg-gray-100 hover:bg-gray-200 py-2 rounded-lg font-semibold transition-colors">Cancel</button>
            </div>
          </form>
        </Modal>
      )}

      {/* DELETE SINGLE */}
      {deleteTarget && (
        <ConfirmModal
          title="Delete Account?"
          message={<><span className="font-mono font-semibold">{deleteTarget.code}</span> — {deleteTarget.nameDe}</>}
          sub="This action cannot be undone."
          confirmLabel="Delete"
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
          danger
        />
      )}

      {/* DELETE SELECTED */}
      {showDeleteSelectedModal && (
        <ConfirmModal
          title={`Delete ${selectedCount} accounts?`}
          message={`You are about to delete ${selectedCount} selected account(s). Accounts with journal entries will be skipped.`}
          sub="This action cannot be undone."
          confirmLabel={bulkDeleting ? 'Deleting...' : `Delete ${selectedCount}`}
          onConfirm={handleDeleteSelected}
          onCancel={() => setShowDeleteSelectedModal(false)}
          disabled={bulkDeleting}
          danger
        />
      )}

      {/* DELETE ALL */}
      {showDeleteAllModal && (
        <ConfirmModal
          title="Delete ALL accounts?"
          message={`You are about to delete all ${accounts.length} account(s). Accounts with journal entries will be skipped.`}
          sub="This action cannot be undone!"
          confirmLabel={bulkDeleting ? 'Deleting...' : `Delete All ${accounts.length}`}
          onConfirm={handleDeleteAll}
          onCancel={() => setShowDeleteAllModal(false)}
          disabled={bulkDeleting}
          danger
        />
      )}
    </div>
  );
}

// ─── SHARED: Modal wrapper ───────────────────────
function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md mx-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-800">{title}</h3>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 rounded"><X className="w-5 h-5" /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ─── SHARED: Confirm modal ───────────────────────
function ConfirmModal({ title, message, sub, confirmLabel, onConfirm, onCancel, danger, disabled }: {
  title: string; message: React.ReactNode; sub?: string; confirmLabel: string;
  onConfirm: () => void; onCancel: () => void; danger?: boolean; disabled?: boolean;
}) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-sm mx-4 text-center">
        <div className="text-4xl mb-3">{danger ? '⚠️' : 'ℹ️'}</div>
        <h3 className="text-lg font-bold mb-2">{title}</h3>
        <p className="text-sm text-gray-600 mb-1">{message}</p>
        {sub && <p className="text-xs text-gray-400 mb-6">{sub}</p>}
        <div className="flex gap-3 mt-4">
          <button onClick={onConfirm} disabled={disabled}
            className={`flex-1 py-2 rounded-lg font-semibold transition-colors ${
              danger ? 'bg-red-500 hover:bg-red-600 disabled:bg-red-300 text-white' : 'bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white'
            }`}>{confirmLabel}</button>
          <button onClick={onCancel} className="flex-1 bg-gray-100 hover:bg-gray-200 py-2 rounded-lg font-semibold transition-colors">Cancel</button>
        </div>
      </div>
    </div>
  );
}

// ─── SHARED: Account form fields ─────────────────
function AccountFormFields({ formData, setFormData }: {
  formData: { code: string; nameDe: string; nameEn: string; type: string };
  setFormData: React.Dispatch<React.SetStateAction<{ code: string; nameDe: string; nameEn: string; type: AccountType }>>;
}) {
  return (
    <div className="space-y-3">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Account Code</label>
        <input placeholder="e.g. 1000" required value={formData.code}
          onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value }))}
          className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none font-mono" />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Name (Deutsch)</label>
        <input placeholder="z.B. Kasse" required value={formData.nameDe}
          onChange={(e) => setFormData(prev => ({ ...prev, nameDe: e.target.value }))}
          className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Name (English)</label>
        <input placeholder="e.g. Cash on hand" value={formData.nameEn}
          onChange={(e) => setFormData(prev => ({ ...prev, nameEn: e.target.value }))}
          className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
        <p className="text-xs text-gray-400 mt-1">Optional — defaults to German name</p>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Account Type</label>
        <div className="relative">
          <select value={formData.type}
            onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value as AccountType }))}
            className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none appearance-none pr-8">
            {ACCOUNT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
          <ChevronDown className="w-4 h-4 text-gray-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>
      </div>
    </div>
  );
}
