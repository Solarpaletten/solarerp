// app/(dashboard)/company/[companyId]/warehouse/[warehouseId]/page.tsx
// ═══════════════════════════════════════════════════
// Task 52: Warehouse Detail — stock + movements for one warehouse
// ═══════════════════════════════════════════════════
// warehouseId here = encoded warehouse name (e.g. "Main")

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';

interface ProductBalance { warehouseName: string; itemCode: string; itemName: string; quantity: number }
interface Movement { id: string; itemName: string; itemCode: string | null; quantity: string; cost: string; direction: string; documentType: string; documentDate: string; series: string; number: string }

export default function WarehouseDetailPage() {
  const params = useParams();
  const router = useRouter();
  const companyId = params.companyId as string;
  const warehouseId = decodeURIComponent(params.warehouseId as string);
  const base = `/company/${companyId}`;

  const [balances, setBalances] = useState<ProductBalance[]>([]);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'stock' | 'movements'>('stock');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [balRes, movRes] = await Promise.all([
        fetch(`/api/company/${companyId}/warehouse/balance?warehouse=${encodeURIComponent(warehouseId)}`, { cache: 'no-store' }),
        fetch(`/api/company/${companyId}/warehouse/movements?warehouse=${encodeURIComponent(warehouseId)}&pageSize=100`, { cache: 'no-store' }),
      ]);
      if (balRes.ok) { const d = await balRes.json(); setBalances(d.balances || []); }
      if (movRes.ok) { const d = await movRes.json(); setMovements(d.data || []); }
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [companyId, warehouseId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const totalProducts = balances.length;
  const totalUnits = balances.reduce((s, b) => s + b.quantity, 0);

  if (loading) return <div className="flex items-center justify-center h-full py-20 text-gray-400 text-sm">Loading warehouse...</div>;

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-700 to-slate-800 px-5 py-3">
        <a href={`${base}/warehouse`} className="text-xs text-slate-400 hover:text-slate-200">&larr; All Warehouses</a>
        <h1 className="text-white text-lg font-semibold mt-1">{warehouseId}</h1>
        <p className="text-slate-300 text-xs">{totalProducts} products · {totalUnits.toFixed(2)} units</p>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-200 px-4">
        <nav className="flex gap-0 -mb-px">
          {(['stock', 'movements'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${tab === t ? 'border-blue-600 text-blue-700' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
              {t === 'stock' ? 'Current Stock' : 'Movement History'}
            </button>
          ))}
        </nav>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto bg-white">
        {tab === 'stock' ? (
          balances.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-gray-400">
              <span className="text-4xl mb-3">📦</span>
              <p className="text-sm">No stock in this warehouse yet.</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b sticky top-0">
                <tr>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase">Code</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase">Product</th>
                  <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-500 uppercase">Quantity</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {balances.map((b, i) => (
                  <tr key={`${b.itemCode}-${i}`} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}>
                    <td className="px-4 py-2 font-mono text-xs font-medium text-gray-900">{b.itemCode}</td>
                    <td className="px-4 py-2 font-medium text-gray-900">{b.itemName}</td>
                    <td className={`px-4 py-2 text-right font-mono font-semibold ${b.quantity > 0 ? 'text-emerald-600' : b.quantity < 0 ? 'text-red-600' : 'text-gray-400'}`}>
                      {Number(b.quantity).toLocaleString('de-DE', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )
        ) : (
          movements.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-gray-400">
              <span className="text-4xl mb-3">📋</span>
              <p className="text-sm">No movements in this warehouse.</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b sticky top-0">
                <tr>
                  <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase">Date</th>
                  <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase">Doc</th>
                  <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase">Type</th>
                  <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase">Product</th>
                  <th className="px-3 py-2.5 text-right text-xs font-semibold text-gray-500 uppercase text-emerald-600">IN</th>
                  <th className="px-3 py-2.5 text-right text-xs font-semibold text-gray-500 uppercase text-red-600">OUT</th>
                  <th className="px-3 py-2.5 text-right text-xs font-semibold text-gray-500 uppercase">Cost</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {movements.map((m, i) => {
                  const qty = Number(m.quantity);
                  const cost = Number(m.cost);
                  const isIn = m.direction === 'IN';
                  return (
                    <tr key={m.id} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}>
                      <td className="px-3 py-2 text-gray-600 whitespace-nowrap">{new Date(m.documentDate).toLocaleDateString('de-DE')}</td>
                      <td className="px-3 py-2 font-mono text-xs font-medium">{m.series}-{m.number}</td>
                      <td className="px-3 py-2">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          m.documentType.includes('REVERSAL') ? 'bg-red-100 text-red-700' :
                          m.documentType === 'PURCHASE' ? 'bg-blue-100 text-blue-700' :
                          m.documentType === 'SALE' ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-700'
                        }`}>{m.documentType}</span>
                      </td>
                      <td className="px-3 py-2">
                        <span className="font-medium text-gray-900">{m.itemName}</span>
                        {m.itemCode && <span className="ml-1 text-xs text-gray-400 font-mono">({m.itemCode})</span>}
                      </td>
                      <td className="px-3 py-2 text-right font-mono">{isIn ? <span className="text-emerald-600 font-semibold">{qty.toLocaleString('de-DE', { minimumFractionDigits: 2 })}</span> : <span className="text-gray-300">—</span>}</td>
                      <td className="px-3 py-2 text-right font-mono">{!isIn ? <span className="text-red-600 font-semibold">{qty.toLocaleString('de-DE', { minimumFractionDigits: 2 })}</span> : <span className="text-gray-300">—</span>}</td>
                      <td className="px-3 py-2 text-right font-mono text-gray-700">{cost > 0 ? cost.toLocaleString('de-DE', { minimumFractionDigits: 2 }) : '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )
        )}
      </div>
    </div>
  );
}
