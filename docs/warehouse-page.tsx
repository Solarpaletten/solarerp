// app/(dashboard)/company/[companyId]/warehouse/page.tsx
// ═══════════════════════════════════════════════════
// Warehouse Stock Balance — Task 34
// ═══════════════════════════════════════════════════

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { Package, ChevronDown, Search } from 'lucide-react';

interface ProductBalance {
  warehouseName: string;
  itemCode: string;
  itemName: string;
  quantity: number;
}

export default function WarehousePage() {
  const params = useParams();
  const companyId = params.companyId as string;

  const [balances, setBalances] = useState<ProductBalance[]>([]);
  const [warehouses, setWarehouses] = useState<string[]>([]);
  const [selectedWarehouse, setSelectedWarehouse] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchBalance = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const warehouseParam = selectedWarehouse ? `?warehouse=${encodeURIComponent(selectedWarehouse)}` : '';
      const res = await fetch(`/api/company/${companyId}/warehouse/balance${warehouseParam}`);
      if (res.status === 401) { window.location.href = '/login'; return; }
      if (!res.ok) throw new Error(`API returned ${res.status}`);
      const data = await res.json();
      setBalances(data.balances || []);
      setWarehouses(data.warehouses || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [companyId, selectedWarehouse]);

  useEffect(() => { fetchBalance(); }, [fetchBalance]);

  const filtered = balances.filter(b => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return b.itemCode.toLowerCase().includes(q) || b.itemName.toLowerCase().includes(q);
  });

  // Group by warehouse for display
  const groupedByWarehouse = new Map<string, ProductBalance[]>();
  for (const b of filtered) {
    const existing = groupedByWarehouse.get(b.warehouseName) || [];
    existing.push(b);
    groupedByWarehouse.set(b.warehouseName, existing);
  }

  const totalItems = filtered.length;
  const totalQuantity = filtered.reduce((sum, b) => sum + b.quantity, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-500">Loading warehouse data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">🏭 Warehouse</h1>
          <p className="text-sm text-gray-500 mt-1">
            {totalItems} products · {totalQuantity.toFixed(2)} total units
            {warehouses.length > 0 && ` · ${warehouses.length} warehouse${warehouses.length > 1 ? 's' : ''}`}
          </p>
        </div>
      </div>

      {error && <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">{error}</div>}

      {/* Filters */}
      <div className="flex items-center gap-3 mb-6">
        {/* Warehouse filter */}
        {warehouses.length > 0 && (
          <div className="relative">
            <select
              value={selectedWarehouse}
              onChange={(e) => setSelectedWarehouse(e.target.value)}
              className="appearance-none border border-gray-300 rounded-lg px-4 py-2 pr-8 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
            >
              <option value="">All warehouses</option>
              {warehouses.map(w => <option key={w} value={w}>{w}</option>)}
            </select>
            <ChevronDown className="w-4 h-4 text-gray-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        )}

        {/* Search */}
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by code or name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full border border-gray-300 rounded-lg pl-9 pr-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
        </div>
      </div>

      {/* No data */}
      {balances.length === 0 && !loading && (
        <div className="text-center py-16">
          <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 text-lg font-medium">No stock movements yet</p>
          <p className="text-gray-400 text-sm mt-1">Create a purchase to add items to your warehouse.</p>
        </div>
      )}

      {/* Tables by warehouse */}
      {[...groupedByWarehouse.entries()].map(([warehouse, items]) => (
        <div key={warehouse} className="mb-6">
          <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-2">
            🏭 {warehouse}
          </h2>
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Code</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Product</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Quantity</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, idx) => (
                  <tr key={`${item.itemCode}-${idx}`} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-mono text-sm font-semibold text-gray-800">{item.itemCode}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{item.itemName}</td>
                    <td className={`px-4 py-3 text-sm font-semibold text-right ${item.quantity <= 0 ? 'text-red-600' : item.quantity < 5 ? 'text-amber-600' : 'text-green-700'}`}>
                      {item.quantity.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
}
