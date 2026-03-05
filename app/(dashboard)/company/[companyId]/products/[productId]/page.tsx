'use client';

import { useParams } from 'next/navigation';

export default function ProductEditorPlaceholder() {
  const params = useParams();
  const companyId = params.companyId as string;
  const productId = params.productId as string;

  return (
    <div className="p-6">
      <h1 className="text-xl font-semibold mb-4">Product Editor</h1>

      <p className="text-gray-500">
        Product editor will be implemented in Task 49.
      </p>

      <div className="mt-4 text-sm text-gray-400">
        <div>Company: {companyId}</div>
        <div>Product: {productId}</div>
      </div>
    </div>
  );
}