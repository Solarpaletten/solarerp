// components/clients/ClientAccounting.tsx
'use client';

import { Field, Section, INPUT } from '@/components/ui/FormField';

type Props = { data: Record<string, unknown>; set: (key: string, value: unknown) => void };

export function ClientAccounting({ data, set }: Props) {
  return (
    <div className="space-y-4">
      <Section title="Accounting" color="text-blue-700">
        <Field label="Receivable account (Debitor)">
          <input className={INPUT} value={String(data.receivableAccount || '')}
            onChange={e => set('receivableAccountId', e.target.value)} placeholder="1200 — Forderungen" />
        </Field>
        <Field label="Payable account (Kreditor)">
          <input className={INPUT} value={String(data.payableAccount || '')}
            onChange={e => set('payableAccountId', e.target.value)} placeholder="3300 — Verbindlichkeiten" />
        </Field>
        <Field label="Credit limit">
          <input className={INPUT} type="number" min="0" step="0.01"
            value={String(data.creditLimit || '')} onChange={e => set('creditLimit', e.target.value)} />
        </Field>
        <Field label="Currency">
          <input className={INPUT} value={String(data.creditLimitCurrency || '')}
            onChange={e => set('creditLimitCurrency', e.target.value)} placeholder="EUR" />
        </Field>
        <Field label="Payment terms (days)">
          <input className={INPUT} type="number" min="0"
            value={String(data.paymentTermsDays || '')} onChange={e => set('paymentTermsDays', e.target.value)} />
        </Field>
      </Section>

      <Section title="Bank Account">
        <Field label="IBAN"><input className={INPUT} value={String(data.bankAccount || '')} onChange={e => set('bankAccount', e.target.value)} /></Field>
        <Field label="Bank name"><input className={INPUT} value={String(data.bankName || '')} onChange={e => set('bankName', e.target.value)} /></Field>
        <Field label="BLZ"><input className={INPUT} value={String(data.bankCode || '')} onChange={e => set('bankCode', e.target.value)} /></Field>
        <Field label="SWIFT/BIC"><input className={INPUT} value={String(data.bankSwiftCode || '')} onChange={e => set('bankSwiftCode', e.target.value)} /></Field>
      </Section>
    </div>
  );
}
