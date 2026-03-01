// components/purchases/PurchaseItemsEdit.tsx
// ═══════════════════════════════════════════════════
// Task 38B: Editable Items Grid (DRAFT mode)
// ═══════════════════════════════════════════════════

'use client';

import { Plus, Trash2 } from 'lucide-react';

export interface EditableItem {
  id?: string;
  itemName: string;
  itemCode: string;
  quantity: number;
  priceWithoutVat: number;
  vatRate: number;
}

interface PurchaseItemsEditProps {
  items: EditableItem[];
  onChange: (items: EditableItem[]) => void;
}

function num(v: number | string | null | undefined): number {
  if (v === null || v === undefined) return 0;
  const n = Number(v);
  return isNaN(n) ? 0 : n;
}

function fmt(value: number): string {
  return value.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const INPUT_CLASS = 'w-full px-2 py-1.5 text-xs border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-400 focus:border-blue-400 bg-white';
const NUM_INPUT_CLASS = `${INPUT_CLASS} text-right tabular-nums font-mono`;

export default function PurchaseItemsEdit({ items, onChange }: PurchaseItemsEditProps) {
  function updateItem(index: number, field: keyof EditableItem, value: string | number) {
    const updated = [...items];
    updated[index] = { ...updated[index], [field]: value };
    onChange(updated);
  }

  function addItem() {
    onChange([...items, { itemName: '', itemCode: '', quantity: 1, priceWithoutVat: 0, vatRate: 19 }]);
  }

  function removeItem(index: number) {
    onChange(items.filter((_, i) => i !== index));
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="px-3 py-2.5 text-center text-[10px] font-semibold text-gray-400 uppercase w-10">#</th>
              <th className="px-3 py-2.5 text-left text-[10px] font-semibold text-gray-400 uppercase min-w-[180px]">Item Name</th>
              <th className="px-3 py-2.5 text-left text-[10px] font-semibold text-gray-400 uppercase min-w-[90px]">Code</th>
              <th className="px-3 py-2.5 text-right text-[10px] font-semibold text-gray-400 uppercase min-w-[70px]">Qty</th>
              <th className="px-3 py-2.5 text-right text-[10px] font-semibold text-gray-400 uppercase min-w-[90px]">Price (net)</th>
              <th className="px-3 py-2.5 text-right text-[10px] font-semibold text-gray-400 uppercase min-w-[60px]">VAT %</th>
              <th className="px-3 py-2.5 text-right text-[10px] font-semibold text-gray-400 uppercase min-w-[90px]">Net Total</th>
              <th className="px-3 py-2.5 text-right text-[10px] font-semibold text-gray-400 uppercase min-w-[90px]">Gross Total</th>
              <th className="px-3 py-2.5 w-10" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {items.map((item, index) => {
              const qty = num(item.quantity);
              const price = num(item.priceWithoutVat);
              const vatRate = num(item.vatRate);
              const netTotal = qty * price;
              const grossTotal = netTotal + netTotal * (vatRate / 100);

              return (
                <tr key={index} className="hover:bg-gray-50/50">
                  <td className="px-3 py-1.5 text-center text-gray-400 tabular-nums">{index + 1}</td>
                  <td className="px-1.5 py-1.5">
                    <input type="text" value={item.itemName} onChange={(e) => updateItem(index, 'itemName', e.target.value)} placeholder="Item name..." className={INPUT_CLASS} />
                  </td>
                  <td className="px-1.5 py-1.5">
                    <input type="text" value={item.itemCode} onChange={(e) => updateItem(index, 'itemCode', e.target.value)} placeholder="Code" className={`${INPUT_CLASS} font-mono`} />
                  </td>
                  <td className="px-1.5 py-1.5">
                    <input type="number" value={item.quantity || ''} onChange={(e) => updateItem(index, 'quantity', Number(e.target.value))} min="0" step="0.01" className={NUM_INPUT_CLASS} />
                  </td>
                  <td className="px-1.5 py-1.5">
                    <input type="number" value={item.priceWithoutVat || ''} onChange={(e) => updateItem(index, 'priceWithoutVat', Number(e.target.value))} min="0" step="0.01" className={NUM_INPUT_CLASS} />
                  </td>
                  <td className="px-1.5 py-1.5">
                    <input type="number" value={item.vatRate ?? ''} onChange={(e) => updateItem(index, 'vatRate', Number(e.target.value))} min="0" max="100" step="1" className={NUM_INPUT_CLASS} />
                  </td>
                  <td className="px-3 py-1.5 text-right text-gray-700 tabular-nums font-mono">{fmt(netTotal)}</td>
                  <td className="px-3 py-1.5 text-right text-gray-900 font-semibold tabular-nums font-mono">{fmt(grossTotal)}</td>
                  <td className="px-2 py-1.5 text-center">
                    <button onClick={() => removeItem(index)} className="text-gray-300 hover:text-red-500 transition-colors p-0.5" title="Remove item">
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="px-3 py-2 border-t border-gray-100">
        <button onClick={addItem} className="inline-flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-800 font-medium transition-colors">
          <Plus size={14} /> Add Item
        </button>
      </div>
    </div>
  );
}
