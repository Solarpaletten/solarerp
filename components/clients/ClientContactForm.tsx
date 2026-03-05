// components/clients/ClientContactForm.tsx
'use client';

import { Field, Section, INPUT } from '@/components/ui/FormField';

type Props = { data: Record<string, unknown>; set: (key: string, value: unknown) => void };

export function ClientContactForm({ data, set }: Props) {
  return (
    <Section title="Contact">
      <div className="grid grid-cols-3 gap-4">
        <Field label="Email"><input className={INPUT} type="email" value={String(data.email || '')} onChange={e => set('email', e.target.value)} /></Field>
        <Field label="Phone"><input className={INPUT} value={String(data.phoneNumber || '')} onChange={e => set('phoneNumber', e.target.value)} /></Field>
        <Field label="Fax"><input className={INPUT} value={String(data.faxNumber || '')} onChange={e => set('faxNumber', e.target.value)} /></Field>
      </div>
    </Section>
  );
}
