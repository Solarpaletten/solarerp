// app/(dashboard)/company/[companyId]/clients/page.tsx
// Task 44 v3: Clients List Page (ERPGrid Engine)

'use client';

import { useParams, useRouter } from 'next/navigation';
import { ERPGrid } from '@/components/erp';
import { clientColumns } from '@/config/clients/columns';

export default function ClientsPage() {
  const params = useParams();
  const router = useRouter();
  const companyId = params.companyId as string;
  const base = `/company/${companyId}`;

  return (
    <div className="h-full flex flex-col">
      <div className="bg-white border-b border-gray-100 px-5 py-2">
        <nav className="flex items-center gap-1.5 text-xs text-gray-400">
          <a href={`${base}/dashboard`} className="hover:text-gray-600">&larr; Dashboard</a>
        </nav>
      </div>
      <div className="flex-1">
        <ERPGrid
          entity="clients"
          title="Customers"
          columns={clientColumns}
          addLabel="+ Add new client"
          onAdd={() => router.push(`${base}/clients/new`)}
          onRowClick={(row) => router.push(`${base}/clients/${row.id}`)}
          searchPlaceholder="Search by name, code, VAT..."
          emptyMessage="No clients found. Add your first client to get started."
          emptyIcon="&#x1F465;"
        />
      </div>
    </div>
  );
}
