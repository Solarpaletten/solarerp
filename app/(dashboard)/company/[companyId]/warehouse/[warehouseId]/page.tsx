'use client';

import { useParams } from 'next/navigation';

export default function WarehouseEditorPlaceholder() {
  const params = useParams();
  const companyId = params.companyId as string;
  const warehouseId = params.warehouseId as string;

  return (
    <div className="p-6">
      <h1 className="text-xl font-semibold mb-4">Warehouse</h1>

      <p className="text-gray-500">
        Warehouse module will be implemented in a future task.
      </p>

      <div className="mt-4 text-sm text-gray-400">
        <div>Company ID: {companyId}</div>
        <div>Warehouse ID: {warehouseId}</div>
      </div>
    </div>
  );
}