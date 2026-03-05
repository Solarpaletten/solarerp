// app/(dashboard)/company/[companyId]/clients/[clientId]/page.tsx
// ═══════════════════════════════════════════════════
// Task 48: Client Editor — Orchestrator
// ═══════════════════════════════════════════════════
// Components: ClientHeader, ClientGeneralForm, ClientContactForm,
//             ClientAddressForm, ClientAccounting, ClientActions

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ClientHeader } from '@/components/clients/ClientHeader';
import { ClientGeneralForm } from '@/components/clients/ClientGeneralForm';
import { ClientContactForm } from '@/components/clients/ClientContactForm';
import { ClientAddressForm } from '@/components/clients/ClientAddressForm';
import { ClientAccounting } from '@/components/clients/ClientAccounting';
import { ClientActions } from '@/components/clients/ClientActions';

const EMPTY: Record<string, unknown> = {
  name: '', shortName: '', code: '', type: 'COMPANY', location: 'LOCAL',
  isActive: true, vatCode: '', email: '', phoneNumber: '', faxNumber: '',
  automaticDebtRemind: false, payWithinDays: '', creditLimit: '',
  creditLimitCurrency: 'EUR', receivableAccount: '', payableAccount: '',
  registrationCountryCode: '', registrationCity: '', registrationAddress: '',
  registrationZipCode: '', bankAccount: '', bankName: '', bankCode: '', bankSwiftCode: '',
};

export default function ClientEditorPage() {
  const params = useParams();
  const router = useRouter();
  const companyId = params.companyId as string;
  const clientId = params.clientId as string;
  const isNew = clientId === 'new';
  const base = `/company/${companyId}`;

  const [data, setData] = useState<Record<string, unknown>>({ ...EMPTY });
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);

  const loadClient = useCallback(async () => {
    if (isNew) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/company/${companyId}/clients/${clientId}`, { cache: 'no-store' });
      if (!res.ok) throw new Error('Client not found');
      const json = await res.json();
      const d = json.data;
      const mapped: Record<string, unknown> = {};
      for (const key of Object.keys(EMPTY)) mapped[key] = d[key] ?? EMPTY[key];
      mapped.id = d.id;
      mapped.payWithinDays = d.payWithinDays != null ? String(d.payWithinDays) : '';
      mapped.creditLimit = d.creditLimit != null ? String(d.creditLimit) : '';
      setData(mapped);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [companyId, clientId, isNew]);

  useEffect(() => { loadClient(); }, [loadClient]);

  const set = (key: string, value: unknown) => { setData(prev => ({ ...prev, [key]: value })); setDirty(true); };

  const handleSave = async () => {
    if (!String(data.name || '').trim()) { setError('Name is required'); return; }
    if (!String(data.code || '').trim()) { setError('Code is required'); return; }

    setSaving(true); setError(null); setSaveMsg(null);
    try {
      const url = isNew ? `/api/company/${companyId}/clients` : `/api/company/${companyId}/clients/${clientId}`;
      const payload = { ...data, payWithinDays: data.payWithinDays ? Number(data.payWithinDays) : null, creditLimit: data.creditLimit ? Number(data.creditLimit) : null };
      const res = await fetch(url, { method: isNew ? 'POST' : 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error || 'Save failed'); }
      const json = await res.json();
      setDirty(false); setSaveMsg('Saved'); setTimeout(() => setSaveMsg(null), 2500);
      if (isNew) router.replace(`${base}/clients/${json.data.id}`);
      else loadClient();
    } catch (err) { setError(err instanceof Error ? err.message : 'Save failed'); }
    finally { setSaving(false); }
  };

  const handleArchive = async () => {
    if (!confirm('Deactivate this client?')) return;
    try { const res = await fetch(`/api/company/${companyId}/clients/${clientId}`, { method: 'DELETE' }); if (!res.ok) { const e = await res.json(); throw new Error(e.error); } router.replace(`${base}/clients`); }
    catch (err) { setError(err instanceof Error ? err.message : 'Archive failed'); }
  };

  const handleDelete = async () => {
    if (!confirm('Permanently delete? Only possible if no linked documents.')) return;
    try { const res = await fetch(`/api/company/${companyId}/clients/${clientId}?hard=true`, { method: 'DELETE' }); if (!res.ok) { const e = await res.json(); throw new Error(e.error); } router.replace(`${base}/clients`); }
    catch (err) { setError(err instanceof Error ? err.message : 'Delete failed'); }
  };

  if (loading) return <div className="flex items-center justify-center h-full py-20"><div className="text-gray-400 text-sm">Loading client...</div></div>;

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <ClientHeader isNew={isNew} name={String(data.name || '')} code={String(data.code || '')} type={String(data.type || '')} isActive={Boolean(data.isActive)} backHref={`${base}/clients`} />

      {error && <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-2.5 text-sm text-red-700 flex justify-between"><span>{error}</span><button onClick={() => setError(null)} className="text-red-400 text-xs">&times;</button></div>}
      {saveMsg && <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-2 text-sm text-emerald-700">{saveMsg}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <ClientGeneralForm data={data} set={set} />
          <ClientContactForm data={data} set={set} />
          <ClientAddressForm data={data} set={set} />
        </div>
        <ClientAccounting data={data} set={set} />
      </div>

      <ClientActions isNew={isNew} saving={saving} dirty={dirty} onSave={handleSave} onClose={() => router.replace(`${base}/clients`)} onArchive={handleArchive} onDelete={handleDelete} />
    </div>
  );
}
