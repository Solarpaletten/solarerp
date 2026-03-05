// app/(dashboard)/company/[companyId]/products/page.tsx
// ═══════════════════════════════════════════════════
// Task 47: Products List Page (ERPGrid Engine)
// ═══════════════════════════════════════════════════

'use client';

import { useParams, useRouter } from 'next/navigation';
import { ERPGrid } from '@/components/erp';
import { productColumns } from '@/config/products/columns';

export default function ProductsPage() {
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
          entity="products"
          title="Products"
          columns={productColumns}
          addLabel="+ New product"
          onAdd={() => router.push(`${base}/products/new`)}
          onRowClick={(row) => router.push(`${base}/products/${row.id}`)}
          searchPlaceholder="Search by name, code, barcode..."
          emptyMessage="No products found. Add your first product to get started."
          emptyIcon="&#x1F4E6;"
        />
      </div>
    </div>
  );
}
