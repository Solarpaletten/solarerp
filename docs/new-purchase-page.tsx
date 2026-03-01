// app/(dashboard)/company/[companyId]/purchases/new/page.tsx
// ═══════════════════════════════════════════════════
// Task 38A: New Purchase — Draft Redirect Page
// ═══════════════════════════════════════════════════

'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function NewPurchasePage() {
  const router = useRouter();
  const params = useParams();
  const companyId = params.companyId as string;

  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function createDraft() {
      try {
        const res = await fetch(`/api/company/${companyId}/purchases/draft`, {
          method: 'POST',
        });

        if (!res.ok) {
          const json = await res.json().catch(() => ({}));
          throw new Error(json.error || 'Failed to create draft');
        }

        const json = await res.json();

        if (!json?.data?.id) {
          throw new Error('Invalid response — no document ID');
        }

        if (!cancelled) {
          router.replace(`/company/${companyId}/purchases/${json.data.id}`);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Unknown error');
        }
      }
    }

    createDraft();

    return () => {
      cancelled = true;
    };
  }, [companyId, router]);

  if (error) {
    return (
      <div className="p-6">
        <Link
          href={`/company/${companyId}/purchases`}
          className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 mb-6"
        >
          <ArrowLeft size={14} />
          Back to Purchases
        </Link>
        <div className="bg-white border border-gray-200 rounded-lg p-12 text-center">
          <p className="text-red-500 text-sm mb-2">{error}</p>
          <button
            onClick={() => router.push(`/company/${companyId}/purchases`)}
            className="text-xs text-blue-600 hover:text-blue-800"
          >
            ← Return to list
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 flex items-center justify-center min-h-[300px]">
      <Loader2 className="animate-spin text-gray-300" size={24} />
      <span className="ml-2 text-sm text-gray-400">Creating document...</span>
    </div>
  );
}
