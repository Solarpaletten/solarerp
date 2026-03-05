'use client';

import { useParams } from 'next/navigation';

export default function NewBankPage() {
  const params = useParams();
  const companyId = params.companyId as string;

  return (
    <div className="p-6">
      <h1 className="text-xl font-semibold mb-4">New Bank</h1>

      <p className="text-gray-500">
        Bank editor will be implemented in Task 51.
      </p>

      <p className="mt-4 text-sm text-gray-400">
        Company ID: {companyId}
      </p>
    </div>
  );
}