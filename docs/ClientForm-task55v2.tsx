// components/clients/ClientForm.tsx
// ═══════════════════════════════════════════════════
// Task 55 v2: Universal Client Form (create/edit)
// Single source of truth for client data
// Reusable for: /clients/new, /clients/[id], future modules
// ═══════════════════════════════════════════════════

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';

interface ClientFormProps {
  companyId: string;
  clientId?: string; // undefined for create, set for edit
  onSuccess?: (clientId: string) => void;
}

interface ClientData {
  // General
  name: string;
  shortName: string;
  code: string;
  type: string;
  role: string;
  location: string;
  isActive: boolean;
  vatCode: string;
  businessLicenseCode: string;
  residentTaxCode: string;

  // Contact
  email: string;
  phoneNumber: string;
  faxNumber: string;
  contactInfo: string;
  notes: string;

  // Financial
  payWithinDays: string;
  creditLimit: string;
  creditLimitCurrency: string;
  automaticDebtRemind: boolean;

  // Registration Address
  registrationCountryCode: string;
  registrationCity: string;
  registrationAddress: string;
  registrationZipCode: string;

  // Correspondence Address
  correspondenceCountryCode: string;
  correspondenceCity: string;
  correspondenceAddress: string;
  correspondenceZipCode: string;

  // Banking
  bankAccount: string;
  bankName: string;
  bankCode: string;
  bankSwiftCode: string;

  // Accounting
  receivableAccountCode: string;
  payableAccountCode: string;
}

const EMPTY_CLIENT: ClientData = {
  name: '',
  shortName: '',
  code: '',
  type: 'COMPANY',
  role: 'BOTH',
  location: 'LOCAL',
  isActive: true,
  vatCode: '',
  businessLicenseCode: '',
  residentTaxCode: '',
  email: '',
  phoneNumber: '',
  faxNumber: '',
  contactInfo: '',
  notes: '',
  payWithinDays: '',
  creditLimit: '',
  creditLimitCurrency: 'EUR',
  automaticDebtRemind: false,
  registrationCountryCode: '',
  registrationCity: '',
  registrationAddress: '',
  registrationZipCode: '',
  correspondenceCountryCode: '',
  correspondenceCity: '',
  correspondenceAddress: '',
  correspondenceZipCode: '',
  bankAccount: '',
  bankName: '',
  bankCode: '',
  bankSwiftCode: '',
  receivableAccountCode: '',
  payableAccountCode: '',
};

const INPUT_CLASS = 'w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-400 focus:border-blue-400';
const SELECT_CLASS = `${INPUT_CLASS} appearance-none`;
const CHECKBOX_CLASS = 'w-4 h-4 rounded border-gray-200 text-blue-600 focus:ring-blue-500';

function Section({ title, color = 'text-gray-700', children }: { title: string; color?: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-5 space-y-4">
      <h3 className={`text-sm font-semibold ${color} border-b border-gray-100 pb-2`}>{title}</h3>
      <div className="grid grid-cols-2 gap-4">{children}</div>
    </div>
  );
}

function Field({ label, children, required = false, span = 1 }: { label: string; children: React.ReactNode; required?: boolean; span?: number }) {
  return (
    <div className={span === 2 ? 'col-span-2' : ''}>
      <label className="block text-xs font-medium text-gray-600 mb-1.5">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}

export function ClientForm({ companyId, clientId, onSuccess }: ClientFormProps) {
  const router = useRouter();
  const isNew = !clientId;
  const mode = isNew ? 'create' : 'edit';

  const [data, setData] = useState<ClientData>(EMPTY_CLIENT);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);

  // Load client if editing
  useEffect(() => {
    if (isNew) {
      setLoading(false);
      return;
    }

    const load = async () => {
      try {
        const res = await fetch(`/api/company/${companyId}/clients/${clientId}`, { cache: 'no-store' });
        if (!res.ok) throw new Error('Client not found');
        const json = await res.json();
        const c = json.data;

        setData({
          name: c.name || '',
          shortName: c.shortName || '',
          code: c.code || '',
          type: c.type || 'COMPANY',
          role: c.role || 'BOTH',
          location: c.location || 'LOCAL',
          isActive: c.isActive ?? true,
          vatCode: c.vatCode || '',
          businessLicenseCode: c.businessLicenseCode || '',
          residentTaxCode: c.residentTaxCode || '',
          email: c.email || '',
          phoneNumber: c.phoneNumber || '',
          faxNumber: c.faxNumber || '',
          contactInfo: c.contactInfo || '',
          notes: c.notes || '',
          payWithinDays: c.payWithinDays ? String(c.payWithinDays) : '',
          creditLimit: c.creditLimit ? String(c.creditLimit) : '',
          creditLimitCurrency: c.creditLimitCurrency || 'EUR',
          automaticDebtRemind: c.automaticDebtRemind ?? false,
          registrationCountryCode: c.registrationCountryCode || '',
          registrationCity: c.registrationCity || '',
          registrationAddress: c.registrationAddress || '',
          registrationZipCode: c.registrationZipCode || '',
          correspondenceCountryCode: c.correspondenceCountryCode || '',
          correspondenceCity: c.correspondenceCity || '',
          correspondenceAddress: c.correspondenceAddress || '',
          correspondenceZipCode: c.correspondenceZipCode || '',
          bankAccount: c.bankAccount || '',
          bankName: c.bankName || '',
          bankCode: c.bankCode || '',
          bankSwiftCode: c.bankSwiftCode || '',
          receivableAccountCode: c.receivableAccountCode || '',
          payableAccountCode: c.payableAccountCode || '',
        });
        setLoading(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load client');
        setLoading(false);
      }
    };

    load();
  }, [companyId, clientId, isNew]);

  const updateField = useCallback((field: keyof ClientData, value: unknown) => {
    setData(prev => ({ ...prev, [field]: value }));
    setDirty(true);
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!data.name.trim()) {
      setError('Name is required');
      return;
    }

    setSaving(true);

    try {
      const payload = {
        name: data.name.trim(),
        shortName: data.shortName.trim() || null,
        code: data.code.trim() || null,
        type: data.type,
        role: data.role,
        location: data.location,
        isActive: data.isActive,
        vatCode: data.vatCode.trim() || null,
        businessLicenseCode: data.businessLicenseCode.trim() || null,
        residentTaxCode: data.residentTaxCode.trim() || null,
        email: data.email.trim() || null,
        phoneNumber: data.phoneNumber.trim() || null,
        faxNumber: data.faxNumber.trim() || null,
        contactInfo: data.contactInfo.trim() || null,
        notes: data.notes.trim() || null,
        payWithinDays: data.payWithinDays ? Number(data.payWithinDays) : null,
        creditLimit: data.creditLimit ? parseFloat(data.creditLimit) : null,
        creditLimitCurrency: data.creditLimitCurrency,
        automaticDebtRemind: data.automaticDebtRemind,
        registrationCountryCode: data.registrationCountryCode.trim() || null,
        registrationCity: data.registrationCity.trim() || null,
        registrationAddress: data.registrationAddress.trim() || null,
        registrationZipCode: data.registrationZipCode.trim() || null,
        correspondenceCountryCode: data.correspondenceCountryCode.trim() || null,
        correspondenceCity: data.correspondenceCity.trim() || null,
        correspondenceAddress: data.correspondenceAddress.trim() || null,
        correspondenceZipCode: data.correspondenceZipCode.trim() || null,
        bankAccount: data.bankAccount.trim() || null,
        bankName: data.bankName.trim() || null,
        bankCode: data.bankCode.trim() || null,
        bankSwiftCode: data.bankSwiftCode.trim() || null,
        receivableAccountCode: data.receivableAccountCode.trim() || null,
        payableAccountCode: data.payableAccountCode.trim() || null,
      };

      const endpoint = isNew
        ? `/api/company/${companyId}/clients`
        : `/api/company/${companyId}/clients/${clientId}`;

      const method = isNew ? 'POST' : 'PATCH';

      const res = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to save');
      }

      const json = await res.json();
      const savedId = json.data.id;

      setSuccess(`Client ${isNew ? 'created' : 'updated'} successfully`);
      setDirty(false);

      setTimeout(() => {
        if (onSuccess) {
          onSuccess(savedId);
        } else {
          router.push(`/company/${companyId}/clients/${savedId}`);
        }
      }, 500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!clientId || !confirm('Are you sure you want to delete this client?')) return;

    setSaving(true);
    try {
      const res = await fetch(`/api/company/${companyId}/clients/${clientId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete');

      setSuccess('Client deleted');
      setTimeout(() => router.push(`/company/${companyId}/clients`), 500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="text-center py-8 text-gray-500">Loading...</div>;
  }

  return (
    <form onSubmit={handleSave} className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">{isNew ? 'New Client' : 'Edit Client'}</h1>
        <div className="space-x-2">
          <button type="submit" disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
            {saving ? 'Saving...' : 'Save'}
          </button>
          {!isNew && (
            <button type="button" onClick={handleDelete} disabled={saving} className="px-4 py-2 bg-red-600 text-white rounded-md text-sm font-medium hover:bg-red-700 disabled:opacity-50">
              Delete
            </button>
          )}
          <button type="button" onClick={() => router.back()} className="px-4 py-2 bg-gray-300 text-gray-900 rounded-md text-sm font-medium hover:bg-gray-400">
            Cancel
          </button>
        </div>
      </div>

      {/* Alerts */}
      {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm">{error}</div>}
      {success && <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded text-sm">{success}</div>}

      {/* Section 1: General */}
      <Section title="1️⃣ General Information" color="text-blue-700">
        <Field label="Name" required span={2}>
          <input type="text" value={data.name} onChange={e => updateField('name', e.target.value)} className={INPUT_CLASS} placeholder="Company name" />
        </Field>
        <Field label="Short Name">
          <input type="text" value={data.shortName} onChange={e => updateField('shortName', e.target.value)} className={INPUT_CLASS} placeholder="Abbreviated name" />
        </Field>
        <Field label="Code">
          <input type="text" value={data.code} onChange={e => updateField('code', e.target.value)} className={INPUT_CLASS} placeholder="Client code" />
        </Field>
        <Field label="Type">
          <select value={data.type} onChange={e => updateField('type', e.target.value)} className={SELECT_CLASS}>
            <option value="COMPANY">Company</option>
            <option value="SOLE_TRADER">Sole Trader</option>
            <option value="INDIVIDUAL">Individual</option>
            <option value="GOVERNMENT">Government</option>
            <option value="NON_PROFIT">Non-Profit</option>
          </select>
        </Field>
        <Field label="Role">
          <select value={data.role} onChange={e => updateField('role', e.target.value)} className={SELECT_CLASS}>
            <option value="CUSTOMER">Customer</option>
            <option value="SUPPLIER">Supplier</option>
            <option value="BOTH">Both</option>
          </select>
        </Field>
        <Field label="Location">
          <select value={data.location} onChange={e => updateField('location', e.target.value)} className={SELECT_CLASS}>
            <option value="LOCAL">Local</option>
            <option value="EU">EU</option>
            <option value="FOREIGN">Foreign</option>
          </select>
        </Field>
        <Field label="VAT Code">
          <input type="text" value={data.vatCode} onChange={e => updateField('vatCode', e.target.value)} className={INPUT_CLASS} placeholder="VAT number" />
        </Field>
        <Field label="Active">
          <input type="checkbox" checked={data.isActive} onChange={e => updateField('isActive', e.target.checked)} className={CHECKBOX_CLASS} />
        </Field>
      </Section>

      {/* Section 2: Contact */}
      <Section title="2️⃣ Contact Information" color="text-green-700">
        <Field label="Email" span={2}>
          <input type="email" value={data.email} onChange={e => updateField('email', e.target.value)} className={INPUT_CLASS} placeholder="email@company.com" />
        </Field>
        <Field label="Phone">
          <input type="tel" value={data.phoneNumber} onChange={e => updateField('phoneNumber', e.target.value)} className={INPUT_CLASS} placeholder="+1 234 567 8900" />
        </Field>
        <Field label="Fax">
          <input type="tel" value={data.faxNumber} onChange={e => updateField('faxNumber', e.target.value)} className={INPUT_CLASS} placeholder="Fax number" />
        </Field>
        <Field label="Contact Info" span={2}>
          <textarea value={data.contactInfo} onChange={e => updateField('contactInfo', e.target.value)} className={INPUT_CLASS} placeholder="Additional contact details" rows={2} />
        </Field>
        <Field label="Notes" span={2}>
          <textarea value={data.notes} onChange={e => updateField('notes', e.target.value)} className={INPUT_CLASS} placeholder="Internal notes" rows={2} />
        </Field>
      </Section>

      {/* Section 3: Financial */}
      <Section title="3️⃣ Financial & Accounting" color="text-purple-700">
        <Field label="Payment Days">
          <input type="number" value={data.payWithinDays} onChange={e => updateField('payWithinDays', e.target.value)} className={INPUT_CLASS} placeholder="30" min="0" max="365" />
        </Field>
        <Field label="Credit Limit">
          <input type="number" value={data.creditLimit} onChange={e => updateField('creditLimit', e.target.value)} className={INPUT_CLASS} placeholder="0.00" step="0.01" />
        </Field>
        <Field label="Currency">
          <select value={data.creditLimitCurrency} onChange={e => updateField('creditLimitCurrency', e.target.value)} className={SELECT_CLASS}>
            <option value="EUR">EUR</option>
            <option value="USD">USD</option>
            <option value="GBP">GBP</option>
          </select>
        </Field>
        <Field label="Auto Reminders">
          <input type="checkbox" checked={data.automaticDebtRemind} onChange={e => updateField('automaticDebtRemind', e.target.checked)} className={CHECKBOX_CLASS} />
        </Field>
        <Field label="Receivable Account">
          <input type="text" value={data.receivableAccountCode} onChange={e => updateField('receivableAccountCode', e.target.value)} className={INPUT_CLASS} placeholder="1200" />
        </Field>
        <Field label="Payable Account">
          <input type="text" value={data.payableAccountCode} onChange={e => updateField('payableAccountCode', e.target.value)} className={INPUT_CLASS} placeholder="2100" />
        </Field>
      </Section>

      {/* Section 4: Registration Address */}
      <Section title="4️⃣ Registration Address" color="text-orange-700">
        <Field label="Country Code">
          <input type="text" value={data.registrationCountryCode} onChange={e => updateField('registrationCountryCode', e.target.value)} className={INPUT_CLASS} placeholder="DE" maxLength={2} />
        </Field>
        <Field label="City">
          <input type="text" value={data.registrationCity} onChange={e => updateField('registrationCity', e.target.value)} className={INPUT_CLASS} placeholder="Berlin" />
        </Field>
        <Field label="Address" span={2}>
          <input type="text" value={data.registrationAddress} onChange={e => updateField('registrationAddress', e.target.value)} className={INPUT_CLASS} placeholder="Street and number" />
        </Field>
        <Field label="ZIP Code">
          <input type="text" value={data.registrationZipCode} onChange={e => updateField('registrationZipCode', e.target.value)} className={INPUT_CLASS} placeholder="10115" />
        </Field>
      </Section>

      {/* Section 5: Correspondence Address */}
      <Section title="5️⃣ Correspondence Address" color="text-pink-700">
        <Field label="Country Code">
          <input type="text" value={data.correspondenceCountryCode} onChange={e => updateField('correspondenceCountryCode', e.target.value)} className={INPUT_CLASS} placeholder="DE" maxLength={2} />
        </Field>
        <Field label="City">
          <input type="text" value={data.correspondenceCity} onChange={e => updateField('correspondenceCity', e.target.value)} className={INPUT_CLASS} placeholder="Berlin" />
        </Field>
        <Field label="Address" span={2}>
          <input type="text" value={data.correspondenceAddress} onChange={e => updateField('correspondenceAddress', e.target.value)} className={INPUT_CLASS} placeholder="Street and number" />
        </Field>
        <Field label="ZIP Code">
          <input type="text" value={data.correspondenceZipCode} onChange={e => updateField('correspondenceZipCode', e.target.value)} className={INPUT_CLASS} placeholder="10115" />
        </Field>
      </Section>

      {/* Section 6: Banking */}
      <Section title="6️⃣ Banking Information" color="text-cyan-700">
        <Field label="Account Number" span={2}>
          <input type="text" value={data.bankAccount} onChange={e => updateField('bankAccount', e.target.value)} className={INPUT_CLASS} placeholder="IBAN" />
        </Field>
        <Field label="Bank Name">
          <input type="text" value={data.bankName} onChange={e => updateField('bankName', e.target.value)} className={INPUT_CLASS} placeholder="Bank name" />
        </Field>
        <Field label="Bank Code">
          <input type="text" value={data.bankCode} onChange={e => updateField('bankCode', e.target.value)} className={INPUT_CLASS} placeholder="BLZ" />
        </Field>
        <Field label="SWIFT Code">
          <input type="text" value={data.bankSwiftCode} onChange={e => updateField('bankSwiftCode', e.target.value)} className={INPUT_CLASS} placeholder="SWIFT code" />
        </Field>
      </Section>

      {/* Footer Actions */}
      <div className="flex justify-between gap-2 sticky bottom-0 bg-white p-4 border-t border-gray-200 rounded-b-lg">
        <button type="button" onClick={() => router.back()} className="px-4 py-2 bg-gray-300 text-gray-900 rounded-md text-sm font-medium hover:bg-gray-400">
          Cancel
        </button>
        <button type="submit" disabled={saving || !dirty} className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </form>
  );
}
