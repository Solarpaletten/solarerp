'use client';

import { useParams } from 'next/navigation';

export default function SaleEditorPlaceholder() {
  const params = useParams();
  const companyId = params.companyId as string;
  const saleId = params.saleId as string;

  return (
    <div className="p-6">
      <h1 className="text-xl font-semibold mb-4">Sales Document</h1>

      <p className="text-gray-500">
        Sales editor will be implemented in a future task.
      </p>

      <div className="mt-4 text-sm text-gray-400">
        <div>Company ID: {companyId}</div>
        <div>Sale ID: {saleId}</div>
      </div>
    </div>
  );
}