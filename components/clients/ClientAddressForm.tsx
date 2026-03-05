// components/clients/ClientAddressForm.tsx
'use client';

import { Field, Section, INPUT } from '@/components/ui/FormField';

type Props = { data: Record<string, unknown>; set: (key: string, value: unknown) => void };

export function ClientAddressForm({ data, set }: Props) {
  return (
    <Section title="Address">
      <div className="grid grid-cols-2 gap-4">
        <Field label="Country"><input className={INPUT} value={String(data.registrationCountryCode || '')} onChange={e => set('registrationCountryCode', e.target.value)} placeholder="Germany" /></Field>
        <Field label="City"><input className={INPUT} value={String(data.registrationCity || '')} onChange={e => set('registrationCity', e.target.value)} /></Field>
      </div>
      <Field label="Address"><input className={INPUT} value={String(data.registrationAddress || '')} onChange={e => set('registrationAddress', e.target.value)} /></Field>
      <Field label="Postal code"><input className={INPUT} value={String(data.registrationZipCode || '')} onChange={e => set('registrationZipCode', e.target.value)} /></Field>
    </Section>
  );
}
