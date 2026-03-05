'use client';

import { useParams } from 'next/navigation';

export default function NewProductPage() {
  const params = useParams();
  const companyId = params.companyId as string;

  return (
    <div className="p-6">
      <h1 className="text-xl font-semibold mb-4">New Product</h1>

      <p className="text-gray-500">
        Product editor will be implemented in Task 52.
      </p>

      <p className="mt-4 text-sm text-gray-400">
        Company ID: {companyId}
      </p>
    </div>
  );
}