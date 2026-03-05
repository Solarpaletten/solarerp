'use client';

import { useParams } from 'next/navigation';

export default function NewSalePage() {
  const params = useParams();
  const companyId = params.companyId as string;

  return (
    <div className="p-6">
      <h1 className="text-xl font-semibold mb-4">New Sale</h1>

      <p className="text-gray-500">
        Sale editor will be implemented in Task 50.
      </p>

      <p className="mt-4 text-sm text-gray-400">
        Company ID: {companyId}
      </p>
    </div>
  );
}