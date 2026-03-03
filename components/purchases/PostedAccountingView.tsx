// components/purchases/PostedAccountingView.tsx
// ═══════════════════════════════════════════════════
// Task 41: Visible Accounting Layer
// ═══════════════════════════════════════════════════
// Shows: Journal entries, VAT summary, Stock movements, FIFO lots

'use client';

import { useState, useEffect } from 'react';
import { BookOpen, Package, Layers, AlertCircle, Loader2 } from 'lucide-react';

interface JournalLine {
  id: string;
  accountCode: string;
  accountNameDe: string;
  accountNameEn: string;
  accountType: string;
  debit: number;
  credit: number;
}

interface JournalEntry {
  id: string;
  date: string;
  documentType: string;
  source: string;
  description: string | null;
  createdAt: string;
  lines: JournalLine[];
}

interface StockMovement {
  id: string;
  itemName: string;
  itemCode: string | null;
  quantity: number;
  cost: number;
  direction: string;
  documentType: string;
  warehouseName: string;
  documentDate: string;
}

interface StockLot {
  id: string;
  itemCode: string;
  itemName: string;
  warehouseName: string;
  unitCost: number;
  qtyInitial: number;
  qtyRemaining: number;
  currencyCode: string;
  purchaseDate: string;
}

interface AccountingData {
  journal: JournalEntry[];
  stockMovements: StockMovement[];
  stockLots: StockLot[];
}

function fmt(value: number): string {
  return value.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtQty(value: number): string {
  return value.toLocaleString('de-DE', { minimumFractionDigits: 0, maximumFractionDigits: 4 });
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

// ─── Section Wrapper ────────────────────────────
function Section({ title, icon, children, badge }: {
  title: string; icon: React.ReactNode; children: React.ReactNode; badge?: string;
}) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      <div className="px-4 py-2.5 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
        <div className="flex items-center gap-2">
          <span className="text-gray-400">{icon}</span>
          <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wider">{title}</h3>
        </div>
        {badge && (
          <span className="text-[10px] font-bold text-gray-400 bg-gray-100 px-2 py-0.5 rounded">{badge}</span>
        )}
      </div>
      <div className="p-0">{children}</div>
    </div>
  );
}

export default function PostedAccountingView({ companyId, purchaseId }: { companyId: string; purchaseId: string }) {
  const [data, setData] = useState<AccountingData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchAccounting() {
      try {
        setIsLoading(true);
        const res = await fetch(`/api/company/${companyId}/purchases/${purchaseId}/accounting`);
        if (!res.ok) {
          const json = await res.json().catch(() => ({}));
          throw new Error(json.error || 'Failed to load accounting data');
        }
        const json = await res.json();
        setData(json);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setIsLoading(false);
      }
    }

    fetchAccounting();
  }, [companyId, purchaseId]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="animate-spin text-gray-300" size={20} />
        <span className="ml-2 text-xs text-gray-400">Loading accounting data...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-700 flex items-center gap-2">
        <AlertCircle size={16} /> {error}
      </div>
    );
  }

  if (!data) return null;

  const hasReversal = data.journal.some((j) => j.documentType === 'PURCHASE_REVERSAL');

  return (
    <div className="space-y-3">
      {/* ── Journal Entries (41.1) ────────────── */}
      {data.journal.map((entry) => {
        const isReversal = entry.documentType === 'PURCHASE_REVERSAL';
        const totalDebit = entry.lines.reduce((s, l) => s + l.debit, 0);
        const totalCredit = entry.lines.reduce((s, l) => s + l.credit, 0);

        return (
          <Section
            key={entry.id}
            title={isReversal ? 'Reversal Entry (STORNO)' : 'Accounting Entries'}
            icon={<BookOpen size={14} />}
            badge={`${entry.lines.length} lines`}
          >
            {entry.description && (
              <div className="px-4 py-2 text-xs text-gray-500 italic border-b border-gray-50">{entry.description}</div>
            )}
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="px-4 py-2 text-left text-[10px] font-semibold text-gray-400 uppercase">Account</th>
                  <th className="px-4 py-2 text-left text-[10px] font-semibold text-gray-400 uppercase">Name</th>
                  <th className="px-4 py-2 text-right text-[10px] font-semibold text-gray-400 uppercase">Debit</th>
                  <th className="px-4 py-2 text-right text-[10px] font-semibold text-gray-400 uppercase">Credit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {entry.lines.map((line) => (
                  <tr key={line.id} className={`${isReversal ? 'bg-red-50/30' : ''} hover:bg-gray-50/50`}>
                    <td className="px-4 py-2 font-mono font-semibold text-gray-800">{line.accountCode}</td>
                    <td className="px-4 py-2 text-gray-600">{line.accountNameDe}</td>
                    <td className="px-4 py-2 text-right font-mono tabular-nums text-gray-900">
                      {line.debit > 0 ? fmt(line.debit) : <span className="text-gray-200">—</span>}
                    </td>
                    <td className="px-4 py-2 text-right font-mono tabular-nums text-gray-900">
                      {line.credit > 0 ? fmt(line.credit) : <span className="text-gray-200">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-gray-200 bg-gray-50/50">
                  <td colSpan={2} className="px-4 py-2 text-[10px] font-bold text-gray-500 uppercase">Total</td>
                  <td className="px-4 py-2 text-right font-mono font-bold tabular-nums text-gray-900">{fmt(totalDebit)}</td>
                  <td className="px-4 py-2 text-right font-mono font-bold tabular-nums text-gray-900">{fmt(totalCredit)}</td>
                </tr>
                <tr>
                  <td colSpan={4} className="px-4 py-1.5 text-right">
                    {Math.abs(totalDebit - totalCredit) < 0.01 ? (
                      <span className="text-[10px] font-semibold text-green-600">✓ Balanced (double-entry verified)</span>
                    ) : (
                      <span className="text-[10px] font-semibold text-red-600">✗ UNBALANCED — difference: {fmt(Math.abs(totalDebit - totalCredit))}</span>
                    )}
                  </td>
                </tr>
              </tfoot>
            </table>
          </Section>
        );
      })}

      {/* ── Warehouse Receipt (41.3) ─────────── */}
      {data.stockMovements.length > 0 && (
        <Section
          title={hasReversal ? 'Stock Movements (incl. Reversals)' : 'Warehouse Receipt'}
          icon={<Package size={14} />}
          badge={`${data.stockMovements.length} movements`}
        >
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="px-4 py-2 text-left text-[10px] font-semibold text-gray-400 uppercase">Item</th>
                <th className="px-4 py-2 text-left text-[10px] font-semibold text-gray-400 uppercase">Warehouse</th>
                <th className="px-4 py-2 text-center text-[10px] font-semibold text-gray-400 uppercase">Direction</th>
                <th className="px-4 py-2 text-right text-[10px] font-semibold text-gray-400 uppercase">Qty</th>
                <th className="px-4 py-2 text-right text-[10px] font-semibold text-gray-400 uppercase">Unit Cost</th>
                <th className="px-4 py-2 text-left text-[10px] font-semibold text-gray-400 uppercase">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {data.stockMovements.map((m) => {
                const isOut = m.direction === 'OUT';
                return (
                  <tr key={m.id} className={`hover:bg-gray-50/50 ${isOut ? 'bg-red-50/30' : ''}`}>
                    <td className="px-4 py-2 text-gray-900">
                      {m.itemName}
                      {m.itemCode && <span className="ml-1.5 text-gray-400 font-mono text-[10px]">{m.itemCode}</span>}
                    </td>
                    <td className="px-4 py-2 text-gray-500">{m.warehouseName}</td>
                    <td className="px-4 py-2 text-center">
                      <span className={`inline-block px-1.5 py-0.5 text-[10px] font-bold uppercase rounded ${isOut ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-700'}`}>
                        {m.direction}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-right font-mono tabular-nums text-gray-900">{fmtQty(m.quantity)}</td>
                    <td className="px-4 py-2 text-right font-mono tabular-nums text-gray-700">{fmt(m.cost)}</td>
                    <td className="px-4 py-2 text-gray-500">{formatDate(m.documentDate)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Section>
      )}

      {/* ── FIFO Lots (41.3) ─────────────────── */}
      {data.stockLots.length > 0 && (
        <Section
          title="FIFO Inventory Lots"
          icon={<Layers size={14} />}
          badge={`${data.stockLots.length} lots`}
        >
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="px-4 py-2 text-left text-[10px] font-semibold text-gray-400 uppercase">Item</th>
                <th className="px-4 py-2 text-left text-[10px] font-semibold text-gray-400 uppercase">Warehouse</th>
                <th className="px-4 py-2 text-right text-[10px] font-semibold text-gray-400 uppercase">Unit Cost</th>
                <th className="px-4 py-2 text-right text-[10px] font-semibold text-gray-400 uppercase">Initial Qty</th>
                <th className="px-4 py-2 text-right text-[10px] font-semibold text-gray-400 uppercase">Remaining</th>
                <th className="px-4 py-2 text-left text-[10px] font-semibold text-gray-400 uppercase">Purchase Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {data.stockLots.map((lot) => {
                const consumed = lot.qtyInitial - lot.qtyRemaining;
                const fullyConsumed = lot.qtyRemaining <= 0;
                return (
                  <tr key={lot.id} className={`hover:bg-gray-50/50 ${fullyConsumed ? 'bg-gray-50 opacity-60' : ''}`}>
                    <td className="px-4 py-2 text-gray-900">
                      {lot.itemName}
                      <span className="ml-1.5 text-gray-400 font-mono text-[10px]">{lot.itemCode}</span>
                    </td>
                    <td className="px-4 py-2 text-gray-500">{lot.warehouseName}</td>
                    <td className="px-4 py-2 text-right font-mono tabular-nums text-gray-700">{lot.currencyCode} {fmt(lot.unitCost)}</td>
                    <td className="px-4 py-2 text-right font-mono tabular-nums text-gray-700">{fmtQty(lot.qtyInitial)}</td>
                    <td className="px-4 py-2 text-right font-mono tabular-nums">
                      <span className={fullyConsumed ? 'text-red-500' : consumed > 0 ? 'text-amber-600' : 'text-green-700'}>
                        {fmtQty(lot.qtyRemaining)}
                      </span>
                      {consumed > 0 && !fullyConsumed && (
                        <span className="ml-1 text-[10px] text-gray-400">(-{fmtQty(consumed)})</span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-gray-500">{formatDate(lot.purchaseDate)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Section>
      )}
    </div>
  );
}
