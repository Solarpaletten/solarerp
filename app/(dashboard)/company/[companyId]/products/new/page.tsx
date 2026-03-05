// app/(dashboard)/company/[companyId]/products/new/page.tsx
// Task 51: Create product and redirect to editor

'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState, useRef } from 'react';

export default function NewProductPage() {
  const params = useParams();
  const router = useRouter();
  const companyId = params.companyId as string;
  const [error, setError] = useState<string | null>(null);
  const called = useRef(false);

  useEffect(() => {
    if (called.current) return;
    called.current = true;

    (async () => {
      try {
        const res = await fetch(`/api/company/${companyId}/products`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: 'New Product', unitName: 'pcs' }),
        });
        if (!res.ok) { const j = await res.json().catch(() => ({})); throw new Error(j.error || 'Failed'); }
        const json = await res.json();
        router.replace(`/company/${companyId}/products/${json.data.id}`);
      } catch (err) { setError(err instanceof Error ? err.message : 'Failed'); }
    })();
  }, [companyId, router]);

  if (error) return (
    <div className="p-6"><div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700">
      <p className="font-medium">Error creating product</p><p className="mt-1">{error}</p>
      <button onClick={() => router.push(`/company/${companyId}/products`)} className="mt-3 text-xs text-blue-600 hover:underline">&larr; Back to Products</button>
    </div></div>
  );

  return (
    <div className="flex items-center justify-center h-full py-20">
      <div className="flex items-center gap-2 text-gray-400 text-sm">
        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" /></svg>
        Creating new product...
      </div>
    </div>
  );
}
