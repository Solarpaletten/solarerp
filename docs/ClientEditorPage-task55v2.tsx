// app/(dashboard)/company/[companyId]/clients/[clientId]/page.tsx
// ═══════════════════════════════════════════════════
// Task 55 v2: Client Editor Page
// Wrapper for /clients/new and /clients/[clientId]
// Uses single ClientForm component (DRY principle)
// ═══════════════════════════════════════════════════

'use client';

import { useParams, useRouter } from 'next/navigation';
import { ClientForm } from '@/components/clients/ClientForm';

export default function ClientEditorPage() {
  const params = useParams();
  const router = useRouter();
  const companyId = params.companyId as string;
  const clientId = params.clientId === 'new' ? undefined : (params.clientId as string);

  return (
    <div className="max-w-4xl mx-auto">
      <ClientForm
        companyId={companyId}
        clientId={clientId}
        onSuccess={(id) => {
          router.push(`/company/${companyId}/clients/${id}`);
        }}
      />
    </div>
  );
}
