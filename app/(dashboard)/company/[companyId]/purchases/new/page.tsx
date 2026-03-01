'use client';

import { useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';

export default function NewPurchasePage() {
  const router = useRouter();
  const params = useParams();
  const companyId = params.companyId as string;

  useEffect(() => {
    async function createDraft() {
      const res = await fetch(`/api/company/${companyId}/purchases`, {
        method: 'POST',
      });

      const json = await res.json();
      router.replace(`/company/${companyId}/purchases/${json.data.id}`);
    }

    createDraft();
  }, [companyId, router]);

  return null;
}