// app/(dashboard)/company/[companyId]/purchases/page.tsx
// ═══════════════════════════════════════════════════
// Task 45: Purchases List Page (ERPGrid Engine)
// ═══════════════════════════════════════════════════

'use client';

import { useParams, useRouter } from 'next/navigation';
import { ERPGrid } from '@/components/erp';
import { purchaseColumns } from '@/config/purchases/columns';

export default function PurchasesPage() {
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
          entity="purchases"
          title="Purchases"
          columns={purchaseColumns}
          addLabel="+ New purchase"
          onAdd={() => router.push(`${base}/purchases/new`)}
          onRowClick={(row) => router.push(`${base}/purchases/${row.id}`)}
          searchPlaceholder="Search by supplier, document number..."
          emptyMessage="No purchase documents found. Create your first purchase to get started."
          emptyIcon="&#x1F6D2;"
        />
      </div>
    </div>
  );
}
