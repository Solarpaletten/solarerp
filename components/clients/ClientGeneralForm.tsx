// components/clients/ClientGeneralForm.tsx
'use client';

import { Field, Section, INPUT, SELECT } from '@/components/ui/FormField';

const CLIENT_TYPES = [
  { value: 'COMPANY', label: 'Company' }, { value: 'SOLE_TRADER', label: 'Sole Trader' },
  { value: 'INDIVIDUAL', label: 'Individual' }, { value: 'GOVERNMENT', label: 'Government' },
  { value: 'NON_PROFIT', label: 'Non-Profit' },
];
const LOCATIONS = [
  { value: 'LOCAL', label: 'Local' }, { value: 'EU', label: 'EU' }, { value: 'FOREIGN', label: 'Foreign' },
];

type Props = {
  data: Record<string, unknown>;
  set: (key: string, value: unknown) => void;
};

export function ClientGeneralForm({ data, set }: Props) {
  const setCode = (val: string) => set('code', val.toUpperCase().replace(/\s/g, '').slice(0, 20));

  return (
    <Section title="General Information">
      <div className="grid grid-cols-2 gap-4">
        <Field label="Name" required><input className={INPUT} value={String(data.name || '')} onChange={e => set('name', e.target.value)} /></Field>
        <Field label="Display name"><input className={INPUT} value={String(data.shortName || '')} onChange={e => set('shortName', e.target.value)} /></Field>
      </div>
      <div className="grid grid-cols-3 gap-4">
        <Field label="Code" required><input className={INPUT} value={String(data.code || '')} onChange={e => setCode(e.target.value)} placeholder="APPLE" /></Field>
        <Field label="Type"><select className={SELECT} value={String(data.type || 'COMPANY')} onChange={e => set('type', e.target.value)}>{CLIENT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}</select></Field>
        <Field label="Location"><select className={SELECT} value={String(data.location || 'LOCAL')} onChange={e => set('location', e.target.value)}>{LOCATIONS.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}</select></Field>
      </div>
      <Field label="VAT Number"><input className={INPUT} value={String(data.vatCode || '')} onChange={e => set('vatCode', e.target.value)} placeholder="DE123456789" /></Field>
      <div className="flex items-center gap-6">
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={Boolean(data.isActive)} onChange={e => set('isActive', e.target.checked)} className="rounded border-gray-300" /> Active</label>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={Boolean(data.automaticDebtRemind)} onChange={e => set('automaticDebtRemind', e.target.checked)} className="rounded border-gray-300" /> Auto debt reminder</label>
      </div>
    </Section>
  );
}
