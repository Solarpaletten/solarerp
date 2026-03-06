// app/(dashboard)/company/[companyId]/clients/page.tsx
// ═══════════════════════════════════════════════════
// Task 55_5 FIXED: Client List Page (ERPGrid Engine)
// ═══════════════════════════════════════════════════
// CHANGES:
// - Added apiPath parameter for tenant isolation
// - Changed <a> to <Link> (Next.js best practice)

'use client';

import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ERPGrid } from '@/components/erp';
import { clientColumns } from '@/config/clients/columns';

export default function ClientListPage() {
  const params = useParams();
  const router = useRouter();
  const companyId = params.companyId as string;
  const base = `/company/${companyId}`;

  return (
    <div className="h-full flex flex-col">
      {/* Breadcrumb */}
      <div className="bg-white border-b border-gray-100 px-5 py-2">
        <nav className="flex items-center gap-1.5 text-xs text-gray-400">
          <Link href={`${base}/dashboard`} className="hover:text-gray-600">
            ← Dashboard
          </Link>
        </nav>
      </div>

      {/* ERPGrid Container */}
      <div className="flex-1">
        <ERPGrid
          entity="clients"
          title="Clients"
          columns={clientColumns}
          apiPath={`/api/company/${companyId}/clients`}
          addLabel="+ New Client"
          onAdd={() => router.push(`${base}/clients/new`)}
          onRowClick={(row) => router.push(`${base}/clients/${row.id}`)}
          searchPlaceholder="Search by name, code, email, VAT code..."
          emptyMessage="No clients found. Add your first client to get started."
          emptyIcon="👥"
          pageSize={20}
        />
      </div>
    </div>
  );
}
