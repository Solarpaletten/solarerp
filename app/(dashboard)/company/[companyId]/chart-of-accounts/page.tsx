// app/(dashboard)/company/[companyId]/chart-of-accounts/page.tsx
// ═══════════════════════════════════════════════════
// Chart of Accounts — Bilingual + Selection + Stammkonten
// ═══════════════════════════════════════════════════
// Task 32: Bilingual model (nameDe + nameEn)
// Task 33: Selection + Toolbar + Stammkonten protection

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams } from 'next/navigation';
import { Plus, Pencil, Trash2, X, ChevronDown, Globe, Copy, Loader2, ShieldAlert, Lock } from 'lucide-react';

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

interface ProtectedAccount {
  id: string;
  code: string;
  nameDe: string;
  lineCount: number;
}

interface SystemAccount {
  id: string;
  code: string;
  nameDe: string;
}

interface UsageCheckResult {
  total: number;
  deletable: number;
  system: SystemAccount[];
  protected: ProtectedAccount[];
}

// ─── STAMMKONTEN (mirror of server-side) ─────────
// Client-side copy for UI hints (lock icons, badges)
// Source of truth is lib/accounting/protectedAccounts.ts
const STAMMKONTEN = new Set([
  '1000','1200','1400','1600',
  '1576','1571','1776','1771',
  '8400','8300','8125',
  '3400','3100',
  '0800','0840','0860','0868',
  '9008','9009',
]);

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

function isStammkonto(code: string): boolean {
  return STAMMKONTEN.has(code);
}

// ─── ENTRY POINT ─────────────────────────────────
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

// ─── INDETERMINATE CHECKBOX ──────────────────────
function IndeterminateCheckbox({ checked, indeterminate, onChange }: {
  checked: boolean; indeterminate: boolean; onChange: () => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => { if (ref.current) ref.current.indeterminate = indeterminate; }, [indeterminate]);
  return (
    <input ref={ref} type="checkbox" checked={checked} onChange={onChange}
      className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer" />
  );
}

// ─── INNER COMPONENT ─────────────────────────────
function ChartOfAccountsContent({ companyId }: { companyId: string }) {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lang, setLang] = useState<Lang>('de');

  // Selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Account | null>(null);
  const [formData, setFormData] = useState<AccountFormData>({ code: '', nameDe: '', nameEn: '', type: 'ASSET' });
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Smart delete modal
  const [showSmartDeleteModal, setShowSmartDeleteModal] = useState(false);
  const [usageCheck, setUsageCheck] = useState<UsageCheckResult | null>(null);
  const [checkingUsage, setCheckingUsage] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [banner, setBanner] = useState<string | null>(null);

  // Filter
  const [filterType, setFilterType] = useState<AccountType | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const showBanner = (msg: string) => { setBanner(msg); setTimeout(() => setBanner(null), 5000); };

  // ─── FETCH ─────────────────────────────────────
  const fetchAccounts = useCallback(async () => {
    try {
      setLoading(true); setError(null);
      const res = await fetch(`/api/company/${companyId}/accounts`);
      if (res.status === 401) { window.location.href = '/login'; return; }
      if (!res.ok) throw new Error(`API returned ${res.status}`);
      const data = await res.json();
      setAccounts(data.data || []);
      setSelectedIds(new Set());
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load accounts');
    } finally { setLoading(false); }
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

  // ─── SELECTION ─────────────────────────────────
  const filteredIdSet = new Set(filteredAccounts.map(a => a.id));
  const selectedInView = [...selectedIds].filter(id => filteredIdSet.has(id)).length;
  const allFilteredSelected = filteredAccounts.length > 0 && filteredAccounts.every(a => selectedIds.has(a.id));
  const someFilteredSelected = filteredAccounts.some(a => selectedIds.has(a.id));
  const isIndeterminate = someFilteredSelected && !allFilteredSelected;

  const toggleSelectAll = () => {
    const next = new Set(selectedIds);
    if (allFilteredSelected) { filteredAccounts.forEach(a => next.delete(a.id)); }
    else { filteredAccounts.forEach(a => next.add(a.id)); }
    setSelectedIds(next);
  };

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelectedIds(next);
  };

  const clearSelection = () => setSelectedIds(new Set());

  // ─── COPY CSV ──────────────────────────────────
  const handleCopyCSV = () => {
    const selected = accounts.filter(a => selectedIds.has(a.id));
    if (selected.length === 0) return;
    const csv = ['code,nameDe,nameEn,type', ...selected.map(a => `${a.code},${a.nameDe},${a.nameEn},${a.type}`)].join('\n');
    navigator.clipboard.writeText(csv).then(() => showBanner(`Copied ${selected.length} accounts to clipboard`));
  };

  // ─── SMART DELETE: Step 1 — Check usage ────────
  const handleDeleteSelectedClick = async () => {
    setCheckingUsage(true);
    setUsageCheck(null);
    setShowSmartDeleteModal(true);

    try {
      const res = await fetch(`/api/company/${companyId}/accounts/bulk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'check-usage', ids: [...selectedIds] }),
      });
      if (!res.ok) throw new Error('Failed to check usage');
      const data: UsageCheckResult = await res.json();
      setUsageCheck(data);
    } catch {
      setUsageCheck(null);
      setShowSmartDeleteModal(false);
      showBanner('Failed to check account usage');
    } finally {
      setCheckingUsage(false);
    }
  };

  // ─── SMART DELETE: Step 2 — Execute ────────────
  const handleBulkDelete = async () => {
    setBulkDeleting(true);
    try {
      const res = await fetch(`/api/company/${companyId}/accounts/bulk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', ids: [...selectedIds] }),
      });
      if (!res.ok) throw new Error('Delete failed');
      const data = await res.json();
      setShowSmartDeleteModal(false);
      const parts = [`Deleted ${data.deleted}`];
      if (data.systemCount > 0) parts.push(`${data.systemCount} system (Stammkonten) protected`);
      if (data.protectedCount > 0) parts.push(`${data.protectedCount} with journal entries skipped`);
      showBanner(parts.join(', '));
      await fetchAccounts();
    } catch {
      showBanner('Bulk delete failed');
    } finally {
      setBulkDeleting(false);
    }
  };

  // ─── CREATE ────────────────────────────────────
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true); setFormError(null);
    try {
      const res = await fetch(`/api/company/${companyId}/accounts`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: formData.code, nameDe: formData.nameDe, nameEn: formData.nameEn || formData.nameDe, type: formData.type }),
      });
      if (!res.ok) { const err = await res.json(); throw new Error(err.error || 'Failed'); }
      setShowCreateModal(false);
      setFormData({ code: '', nameDe: '', nameEn: '', type: 'ASSET' });
      await fetchAccounts();
    } catch (err: unknown) { setFormError(err instanceof Error ? err.message : 'Failed'); }
    finally { setSaving(false); }
  };

  // ─── UPDATE ────────────────────────────────────
  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault(); if (!editingAccount) return; setSaving(true); setFormError(null);
    try {
      const res = await fetch(`/api/company/${companyId}/accounts/${editingAccount.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: formData.code, nameDe: formData.nameDe, nameEn: formData.nameEn || formData.nameDe, type: formData.type }),
      });
      if (!res.ok) { const err = await res.json(); throw new Error(err.error || 'Failed'); }
      setEditingAccount(null);
      setFormData({ code: '', nameDe: '', nameEn: '', type: 'ASSET' });
      await fetchAccounts();
    } catch (err: unknown) { setFormError(err instanceof Error ? err.message : 'Failed'); }
    finally { setSaving(false); }
  };

  // ─── DELETE SINGLE ─────────────────────────────
  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      const res = await fetch(`/api/company/${companyId}/accounts/${deleteTarget.id}`, { method: 'DELETE' });
      if (res.status === 403) {
        const err = await res.json();
        alert(err.error || 'Cannot delete system account');
        setDeleteTarget(null);
        return;
      }
      if (!res.ok && res.status !== 204) throw new Error('Failed');
      setDeleteTarget(null);
      await fetchAccounts();
    } catch { alert('Failed to delete account'); }
  };

  const openEdit = (account: Account) => {
    setEditingAccount(account);
    setFormData({ code: account.code, nameDe: account.nameDe, nameEn: account.nameEn, type: account.type });
    setFormError(null);
  };

  const stats = ACCOUNT_TYPES.map(t => ({ ...t, count: accounts.filter(a => a.type === t.value).length }));
  const stammkontenCount = accounts.filter(a => isStammkonto(a.code)).length;

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
          <p className="text-sm text-gray-500 mt-1">
            {accounts.length} accounts total
            {stammkontenCount > 0 && (
              <span className="ml-2 text-amber-600">· {stammkontenCount} Stammkonten 🔒</span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => setLang(lang === 'de' ? 'en' : 'de')}
            className="flex items-center gap-1.5 px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
            <Globe className="w-4 h-4" />{lang === 'de' ? 'DE' : 'EN'}
          </button>
          <button onClick={() => { setShowCreateModal(true); setFormData({ code: '', nameDe: '', nameEn: '', type: 'ASSET' }); setFormError(null); }}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg font-medium transition-colors">
            <Plus className="w-4 h-4" /> New Account
          </button>
        </div>
      </div>

      {error && <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">{error}</div>}
      {banner && <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-blue-700 text-sm font-medium">{banner}</div>}

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

      {/* Search */}
      <div className="mb-4">
        <input type="text" placeholder="Search by code or name..." value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full md:w-80 border border-gray-300 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
      </div>

      {/* Toolbar */}
      {selectedIds.size > 0 && (
        <div className="mb-4 flex items-center gap-3 p-3 bg-gray-50 border border-gray-200 rounded-lg">
          <span className="text-sm font-semibold text-gray-700">{selectedInView} selected</span>
          <div className="h-4 w-px bg-gray-300" />
          <button onClick={handleCopyCSV}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-600 bg-white border border-gray-200 hover:bg-gray-100 rounded-lg transition-colors">
            <Copy className="w-3.5 h-3.5" /> Copy CSV
          </button>
          <button onClick={clearSelection}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-500 bg-white border border-gray-200 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="w-3.5 h-3.5" /> Clear Selection
          </button>
          <button onClick={handleDeleteSelectedClick}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-red-600 bg-white border border-red-200 hover:bg-red-50 rounded-lg transition-colors">
            <Trash2 className="w-3.5 h-3.5" /> Delete Selected
          </button>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="w-10 px-3 py-3">
                <IndeterminateCheckbox checked={allFilteredSelected} indeterminate={isIndeterminate} onChange={toggleSelectAll} />
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
              <tr><td colSpan={6} className="text-center py-12 text-gray-400">
                {accounts.length === 0 ? 'No accounts yet.' : 'No accounts match your filter.'}
              </td></tr>
            ) : (
              filteredAccounts.map((account) => {
                const isSelected = selectedIds.has(account.id);
                const isSystem = isStammkonto(account.code);
                return (
                  <tr key={account.id}
                    className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${isSelected ? 'bg-blue-50' : ''} ${isSystem ? 'bg-amber-50/30' : ''}`}>
                    <td className="w-10 px-3 py-3">
                      <input type="checkbox" checked={isSelected} onChange={() => toggleSelect(account.id)}
                        className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer" />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-sm font-semibold text-gray-800">{account.code}</span>
                        {isSystem && (
                          <Lock className="w-3.5 h-3.5 text-amber-500" title="Stammkonto — system protected" />
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">{getAccountName(account, lang)}</td>
                    <td className="px-4 py-3"><span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${TYPE_COLOR_MAP[account.type]}`}>{account.type}</span></td>
                    <td className="px-4 py-3"><span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${account.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-500'}`}>{account.isActive ? 'Active' : 'Inactive'}</span></td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => openEdit(account)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors">
                          <Pencil className="w-4 h-4" />
                        </button>
                        {isSystem ? (
                          <span className="p-1.5 text-amber-300 cursor-not-allowed" title="Stammkonto — cannot delete">
                            <Lock className="w-4 h-4" />
                          </span>
                        ) : (
                          <button onClick={() => setDeleteTarget(account)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
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

      {showCreateModal && (
        <Modal title="New Account" onClose={() => setShowCreateModal(false)}>
          {formError && <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">{formError}</div>}
          <form onSubmit={handleCreate}>
            <AccountFormFields formData={formData} setFormData={setFormData} />
            <div className="flex gap-3 mt-6">
              <button type="submit" disabled={saving} className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white py-2 rounded-lg font-semibold transition-colors">{saving ? 'Creating...' : 'Create Account'}</button>
              <button type="button" onClick={() => setShowCreateModal(false)} className="flex-1 bg-gray-100 hover:bg-gray-200 py-2 rounded-lg font-semibold transition-colors">Cancel</button>
            </div>
          </form>
        </Modal>
      )}

      {editingAccount && (
        <Modal title={`Edit Account ${editingAccount.code}${isStammkonto(editingAccount.code) ? ' 🔒' : ''}`} onClose={() => setEditingAccount(null)}>
          {isStammkonto(editingAccount.code) && (
            <div className="mb-3 p-2 bg-amber-50 border border-amber-200 rounded-lg text-amber-700 text-xs">
              <Lock className="w-3 h-3 inline mr-1" />Stammkonto — only name can be edited. Code and type are locked.
            </div>
          )}
          {formError && <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">{formError}</div>}
          <form onSubmit={handleUpdate}>
            <AccountFormFields formData={formData} setFormData={setFormData} lockedCode={isStammkonto(editingAccount.code)} lockedType={isStammkonto(editingAccount.code)} />
            <div className="flex gap-3 mt-6">
              <button type="submit" disabled={saving} className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white py-2 rounded-lg font-semibold transition-colors">{saving ? 'Saving...' : 'Save Changes'}</button>
              <button type="button" onClick={() => setEditingAccount(null)} className="flex-1 bg-gray-100 hover:bg-gray-200 py-2 rounded-lg font-semibold transition-colors">Cancel</button>
            </div>
          </form>
        </Modal>
      )}

      {deleteTarget && (
        isStammkonto(deleteTarget.code) ? (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-sm mx-4 text-center">
              <div className="text-4xl mb-3">🔒</div>
              <h3 className="text-lg font-bold mb-2">System Account Protected</h3>
              <p className="text-sm text-gray-600 mb-1">
                <span className="font-mono font-semibold">{deleteTarget.code}</span> — {deleteTarget.nameDe}
              </p>
              <p className="text-xs text-amber-600 mb-4">
                Stammkonto cannot be deleted. It is required by the accounting engine.
              </p>
              <button onClick={() => setDeleteTarget(null)}
                className="w-full bg-gray-100 hover:bg-gray-200 py-2 rounded-lg font-semibold transition-colors">Close</button>
            </div>
          </div>
        ) : (
          <ConfirmModal title="Delete Account?"
            message={<><span className="font-mono font-semibold">{deleteTarget.code}</span> — {deleteTarget.nameDe}</>}
            sub="This action cannot be undone."
            confirmLabel="Delete" onConfirm={handleDelete} onCancel={() => setDeleteTarget(null)} danger />
        )
      )}

      {/* ═══ SMART DELETE MODAL ═══════════════════ */}
      {showSmartDeleteModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-800">Delete Selected Accounts</h3>
              <button onClick={() => { setShowSmartDeleteModal(false); setUsageCheck(null); }}
                className="p-1 text-gray-400 hover:text-gray-600 rounded"><X className="w-5 h-5" /></button>
            </div>

            {checkingUsage && (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-blue-600 mr-3" />
                <span className="text-gray-500">Checking account usage...</span>
              </div>
            )}

            {usageCheck && !checkingUsage && (
              <div>
                {/* Summary: 3 columns */}
                <div className="grid grid-cols-3 gap-3 mb-4">
                  <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-center">
                    <p className="text-2xl font-bold text-green-700">{usageCheck.deletable}</p>
                    <p className="text-xs text-green-600 font-medium">Can delete</p>
                  </div>
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-center">
                    <p className="text-2xl font-bold text-amber-700">{usageCheck.system.length}</p>
                    <p className="text-xs text-amber-600 font-medium">Stammkonten 🔒</p>
                  </div>
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-center">
                    <p className="text-2xl font-bold text-red-700">{usageCheck.protected.length}</p>
                    <p className="text-xs text-red-600 font-medium">Have entries</p>
                  </div>
                </div>

                {/* System accounts (Stammkonten) */}
                {usageCheck.system.length > 0 && (
                  <div className="mb-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Lock className="w-4 h-4 text-amber-500" />
                      <span className="text-sm font-semibold text-amber-700">Stammkonten — system protected ({usageCheck.system.length}):</span>
                    </div>
                    <div className="max-h-32 overflow-y-auto border border-amber-100 rounded-lg">
                      <table className="w-full text-sm">
                        <tbody>
                          {usageCheck.system.map(sa => (
                            <tr key={sa.id} className="border-t border-amber-50 first:border-t-0">
                              <td className="px-3 py-1.5 font-mono font-semibold text-gray-700 w-16">{sa.code}</td>
                              <td className="px-3 py-1.5 text-gray-600">{sa.nameDe}</td>
                              <td className="px-3 py-1.5 text-right"><Lock className="w-3 h-3 text-amber-400 inline" /></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Protected accounts (have journal entries) */}
                {usageCheck.protected.length > 0 && (
                  <div className="mb-4">
                    <div className="flex items-center gap-2 mb-2">
                      <ShieldAlert className="w-4 h-4 text-red-500" />
                      <span className="text-sm font-semibold text-red-700">Have journal entries ({usageCheck.protected.length}):</span>
                    </div>
                    <div className="max-h-32 overflow-y-auto border border-red-100 rounded-lg">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-red-50 text-xs text-red-600 font-semibold">
                            <th className="text-left px-3 py-1.5">Code</th>
                            <th className="text-left px-3 py-1.5">Name</th>
                            <th className="text-right px-3 py-1.5">Entries</th>
                          </tr>
                        </thead>
                        <tbody>
                          {usageCheck.protected.map(pa => (
                            <tr key={pa.id} className="border-t border-red-50">
                              <td className="px-3 py-1.5 font-mono font-semibold text-gray-700">{pa.code}</td>
                              <td className="px-3 py-1.5 text-gray-600 truncate max-w-[200px]">{pa.nameDe}</td>
                              <td className="px-3 py-1.5 text-right text-red-600 font-semibold">{pa.lineCount}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Nothing deletable */}
                {usageCheck.deletable === 0 && (
                  <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg text-amber-700 text-sm mb-4">
                    No accounts can be deleted. {usageCheck.system.length > 0 ? 'System accounts (Stammkonten) are permanently protected.' : ''} {usageCheck.protected.length > 0 ? 'Other accounts have journal entries.' : ''}
                  </div>
                )}

                {/* Deletable summary */}
                {usageCheck.deletable > 0 && (
                  <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-600 mb-4">
                    <span className="font-semibold text-gray-800">{usageCheck.deletable}</span> account(s) will be permanently deleted.
                    {(usageCheck.system.length + usageCheck.protected.length) > 0 && (
                      <span className="ml-1">{usageCheck.system.length + usageCheck.protected.length} will be kept (system + entries).</span>
                    )}
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-3">
                  {usageCheck.deletable > 0 && (
                    <button onClick={handleBulkDelete} disabled={bulkDeleting}
                      className="flex-1 bg-red-500 hover:bg-red-600 disabled:bg-red-300 text-white py-2 rounded-lg font-semibold transition-colors">
                      {bulkDeleting ? 'Deleting...' : `Delete ${usageCheck.deletable} accounts`}
                    </button>
                  )}
                  <button onClick={() => { setShowSmartDeleteModal(false); setUsageCheck(null); }}
                    className={`${usageCheck.deletable > 0 ? 'flex-1' : 'w-full'} bg-gray-100 hover:bg-gray-200 py-2 rounded-lg font-semibold transition-colors`}>
                    {usageCheck.deletable === 0 ? 'Close' : 'Cancel'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── SHARED COMPONENTS ───────────────────────────

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
            className={`flex-1 py-2 rounded-lg font-semibold transition-colors ${danger ? 'bg-red-500 hover:bg-red-600 disabled:bg-red-300 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white'}`}>{confirmLabel}</button>
          <button onClick={onCancel} className="flex-1 bg-gray-100 hover:bg-gray-200 py-2 rounded-lg font-semibold transition-colors">Cancel</button>
        </div>
      </div>
    </div>
  );
}

function AccountFormFields({ formData, setFormData, lockedCode, lockedType }: {
  formData: { code: string; nameDe: string; nameEn: string; type: string };
  setFormData: React.Dispatch<React.SetStateAction<AccountFormData>>;
  lockedCode?: boolean;
  lockedType?: boolean;
}) {
  return (
    <div className="space-y-3">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Account Code {lockedCode && <Lock className="w-3 h-3 inline text-amber-500" />}</label>
        <input placeholder="e.g. 1000" required value={formData.code} disabled={lockedCode}
          onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value }))}
          className={`w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none font-mono ${lockedCode ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : ''}`} />
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
        <label className="block text-sm font-medium text-gray-700 mb-1">Account Type {lockedType && <Lock className="w-3 h-3 inline text-amber-500" />}</label>
        <div className="relative">
          <select value={formData.type} disabled={lockedType}
            onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value as AccountType }))}
            className={`w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none appearance-none pr-8 ${lockedType ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : ''}`}>
            {ACCOUNT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
          <ChevronDown className="w-4 h-4 text-gray-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>
      </div>
    </div>
  );
}
