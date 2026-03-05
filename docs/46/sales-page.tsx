// app/(dashboard)/company/[companyId]/sales/page.tsx
// ═══════════════════════════════════════════════════
// Task 46: Sales List Page (ERPGrid Engine)
// ═══════════════════════════════════════════════════

'use client';

import { useParams, useRouter } from 'next/navigation';
import { ERPGrid } from '@/components/erp';
import { salesColumns } from '@/config/sales/columns';

export default function SalesPage() {
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
          entity="sales"
          title="Sales"
          columns={salesColumns}
          addLabel="+ New sale"
          onAdd={() => router.push(`${base}/sales/new`)}
          onRowClick={(row) => router.push(`${base}/sales/${row.id}`)}
          searchPlaceholder="Search by client, document number..."
          emptyMessage="No sales documents found. Create your first sale to get started."
          emptyIcon="&#x1F4B0;"
        />
      </div>
    </div>
  );
}
