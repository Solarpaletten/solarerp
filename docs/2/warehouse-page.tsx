// app/(dashboard)/company/[companyId]/warehouse/page.tsx
// ═══════════════════════════════════════════════════
// Task 52: Warehouse — Balance + Stock Movements Ledger
// ═══════════════════════════════════════════════════
// Tab 1: Stock Balance (existing warehouse/balance API)
// Tab 2: Stock Movements (new warehouse/movements API)

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';

interface ProductBalance { warehouseName: string; itemCode: string; itemName: string; quantity: number }
interface Movement { id: string; warehouseName: string; itemName: string; itemCode: string | null; quantity: string; cost: string; direction: string; documentType: string; documentId: string | null; documentDate: string; series: string; number: string; createdAt: string }

export default function WarehousePage() {
  const params = useParams();
  const companyId = params.companyId as string;
  const [tab, setTab] = useState<'balance' | 'movements'>('balance');

  // Balance state
  const [balances, setBalances] = useState<ProductBalance[]>([]);
  const [warehouses, setWarehouses] = useState<string[]>([]);
  const [selectedWh, setSelectedWh] = useState('');
  const [balLoading, setBalLoading] = useState(true);
  const [searchBal, setSearchBal] = useState('');

  // Movements state
  const [movements, setMovements] = useState<Movement[]>([]);
  const [movTotal, setMovTotal] = useState(0);
  const [movPage, setMovPage] = useState(1);
  const [movLoading, setMovLoading] = useState(false);
  const [searchMov, setSearchMov] = useState('');

  // Fetch balance
  const fetchBalance = useCallback(async () => {
    setBalLoading(true);
    try {
      const whParam = selectedWh ? `?warehouse=${encodeURIComponent(selectedWh)}` : '';
      const res = await fetch(`/api/company/${companyId}/warehouse/balance${whParam}`, { cache: 'no-store' });
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      setBalances(data.balances || []);
      setWarehouses(data.warehouses || []);
    } catch { setBalances([]); }
    finally { setBalLoading(false); }
  }, [companyId, selectedWh]);

  // Fetch movements
  const fetchMovements = useCallback(async () => {
    setMovLoading(true);
    try {
      const qp = new URLSearchParams({ page: String(movPage), pageSize: '50' });
      if (selectedWh) qp.set('warehouse', selectedWh);
      if (searchMov) qp.set('search', searchMov);
      const res = await fetch(`/api/company/${companyId}/warehouse/movements?${qp}`, { cache: 'no-store' });
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      setMovements(data.data || []);
      setMovTotal(data.count || 0);
    } catch { setMovements([]); }
    finally { setMovLoading(false); }
  }, [companyId, selectedWh, searchMov, movPage]);

  useEffect(() => { fetchBalance(); }, [fetchBalance]);
  useEffect(() => { if (tab === 'movements') fetchMovements(); }, [tab, fetchMovements]);

  const filteredBal = balances.filter(b => {
    if (!searchBal) return true;
    const q = searchBal.toLowerCase();
    return b.itemName.toLowerCase().includes(q) || b.itemCode.toLowerCase().includes(q);
  });

  const totalUnits = filteredBal.reduce((s, b) => s + b.quantity, 0);
  const totalProducts = filteredBal.length;
  const movTotalPages = Math.max(1, Math.ceil(movTotal / 50));

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-700 to-slate-800 px-5 py-3 flex items-center justify-between">
        <div>
          <h1 className="text-white text-base font-semibold">Warehouse</h1>
          <p className="text-slate-300 text-xs">{totalProducts} products &middot; {totalUnits.toFixed(2)} total units &middot; {warehouses.length || 1} warehouse</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-200 px-4">
        <nav className="flex gap-0 -mb-px">
          {(['balance', 'movements'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${tab === t ? 'border-blue-600 text-blue-700' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
              {t === 'balance' ? 'Stock Balance' : 'Stock Movements'}
            </button>
          ))}
        </nav>
      </div>

      {/* Toolbar */}
      <div className="bg-white border-b border-gray-200 px-4 py-2 flex items-center gap-4">
        <select value={selectedWh} onChange={e => { setSelectedWh(e.target.value); setMovPage(1); }}
          className="text-sm border border-gray-200 rounded-md px-2 py-1.5">
          <option value="">All warehouses</option>
          {warehouses.map(w => <option key={w} value={w}>{w}</option>)}
        </select>
        <input type="text" placeholder="Search..."
          value={tab === 'balance' ? searchBal : searchMov}
          onChange={e => tab === 'balance' ? setSearchBal(e.target.value) : setSearchMov(e.target.value)}
          className="w-64 text-sm border border-gray-200 rounded-md px-3 py-1.5 focus:ring-1 focus:ring-blue-400" />
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto bg-white">
        {tab === 'balance' ? (
          /* ═══ Balance Tab ═══ */
          balLoading ? (
            <div className="flex items-center justify-center py-20 text-gray-400 text-sm">Loading...</div>
          ) : filteredBal.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-gray-400">
              <span className="text-4xl mb-3">&#x1F4E6;</span>
              <p className="text-sm">No stock data. Post a purchase to see inventory.</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b sticky top-0">
                <tr>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase">Warehouse</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase">Code</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase">Product</th>
                  <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-500 uppercase">Quantity</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredBal.map((b, i) => (
                  <tr key={`${b.warehouseName}-${b.itemCode}-${i}`} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}>
                    <td className="px-4 py-2 text-gray-600">{b.warehouseName}</td>
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
          /* ═══ Movements Tab ═══ */
          movLoading ? (
            <div className="flex items-center justify-center py-20 text-gray-400 text-sm">Loading movements...</div>
          ) : movements.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-gray-400">
              <span className="text-4xl mb-3">&#x1F4CB;</span>
              <p className="text-sm">No movements recorded yet.</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b sticky top-0">
                <tr>
                  <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase">Date</th>
                  <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase">Document</th>
                  <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase">Type</th>
                  <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase">Product</th>
                  <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase">Warehouse</th>
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
                      <td className="px-3 py-2 text-gray-600 whitespace-nowrap">
                        {new Date(m.documentDate).toLocaleDateString('de-DE')}
                      </td>
                      <td className="px-3 py-2 font-mono text-xs font-medium text-gray-900">
                        {m.series}-{m.number}
                      </td>
                      <td className="px-3 py-2">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          m.documentType.includes('REVERSAL') ? 'bg-red-100 text-red-700' :
                          m.documentType === 'PURCHASE' ? 'bg-blue-100 text-blue-700' :
                          m.documentType === 'SALE' ? 'bg-amber-100 text-amber-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>{m.documentType}</span>
                      </td>
                      <td className="px-3 py-2">
                        <span className="font-medium text-gray-900">{m.itemName}</span>
                        {m.itemCode && <span className="ml-1 text-xs text-gray-400 font-mono">({m.itemCode})</span>}
                      </td>
                      <td className="px-3 py-2 text-gray-600">{m.warehouseName}</td>
                      <td className="px-3 py-2 text-right font-mono">
                        {isIn ? <span className="text-emerald-600 font-semibold">{qty.toLocaleString('de-DE', { minimumFractionDigits: 2 })}</span> : <span className="text-gray-300">&mdash;</span>}
                      </td>
                      <td className="px-3 py-2 text-right font-mono">
                        {!isIn ? <span className="text-red-600 font-semibold">{qty.toLocaleString('de-DE', { minimumFractionDigits: 2 })}</span> : <span className="text-gray-300">&mdash;</span>}
                      </td>
                      <td className="px-3 py-2 text-right font-mono text-gray-700">
                        {cost > 0 ? cost.toLocaleString('de-DE', { minimumFractionDigits: 2 }) : '&mdash;'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )
        )}
      </div>

      {/* Pagination (movements only) */}
      {tab === 'movements' && movements.length > 0 && (
        <div className="bg-white border-t border-gray-200 px-4 py-2 flex items-center justify-between">
          <div className="flex items-center gap-1">
            <button onClick={() => setMovPage(p => Math.max(1, p - 1))} disabled={movPage <= 1}
              className="px-2 py-1 text-xs text-gray-500 hover:text-gray-800 disabled:opacity-30">&larr; Prev</button>
            <span className="px-2 py-1 text-xs text-blue-600 font-semibold">{movPage}</span>
            <button onClick={() => setMovPage(p => Math.min(movTotalPages, p + 1))} disabled={movPage >= movTotalPages}
              className="px-2 py-1 text-xs text-gray-500 hover:text-gray-800 disabled:opacity-30">Next &rarr;</button>
          </div>
          <span className="text-xs text-gray-400">{movTotal} movements &middot; Page {movPage}/{movTotalPages}</span>
        </div>
      )}
    </div>
  );
}
