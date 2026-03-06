// components/purchases/PurchaseItemsEdit.tsx
// ═══════════════════════════════════════════════════
// Task 56_10 — Editable Items with Product Selector (OPTIMIZED)
// ═══════════════════════════════════════════════════
// Optimization: Use totalsHelper as single source of truth
// Removed: 120+ lines of duplicated calculation code
// Benefit: DRY principle, single source of truth

'use client';

import { ProductSelector, type ProductOption } from '@/components/products/ProductSelector';
import {
  calculateDocumentTotals,
  calculateLineTotals,
  formatCurrency,
  type DocumentTotals,
  type EditableItem,
} from '@/lib/accounting/totalsHelper';
import { Plus, Trash2 } from 'lucide-react';

interface PurchaseItemsEditProps {
  companyId: string;
  items: EditableItem[];
  onChange: (items: EditableItem[]) => void;
  onTotalsChange?: (totals: DocumentTotals) => void;
}

const INPUT_CLASS = 'w-full text-sm border-0 focus:ring-0 px-0 py-0';
const NUM_INPUT_CLASS = 'w-20 text-sm border-0 focus:ring-0 px-0 py-0 text-right tabular-nums font-mono';

export default function PurchaseItemsEdit({
  companyId,
  items,
  onChange,
  onTotalsChange,
}: PurchaseItemsEditProps) {
  const updateItem = (index: number, key: keyof EditableItem, value: unknown) => {
    const updated = [...items];
    updated[index] = {
      ...updated[index],
      [key]: value,
    };
    onChange(updated);

    // Notify parent of new totals — using totalsHelper as single source
    if (onTotalsChange) {
      const totals = calculateDocumentTotals(
        updated.map((item) => ({
          itemName: item.itemName,                          // ✅ ADDED
          itemCode: item.itemCode,                          // ✅ ADDED
          quantity: item.quantity,
          priceWithoutVat: item.priceWithoutVat,
          vatRate: item.vatRate,
        }))
      );
      onTotalsChange(totals);
    }
  };

  const addItem = () => {
    const newItem: EditableItem = {
      itemName: '',
      itemCode: '',
      quantity: 1,
      priceWithoutVat: 0,
      vatRate: 19,
    };
    const updated = [...items, newItem];
    onChange(updated);

    // Notify parent
    if (onTotalsChange) {
      const totals = calculateDocumentTotals(
        updated.map((item) => ({
          itemName: item.itemName,                          // ✅ ADDED
          itemCode: item.itemCode,                          // ✅ ADDED
          quantity: item.quantity,
          priceWithoutVat: item.priceWithoutVat,
          vatRate: item.vatRate,
        }))
      );
      onTotalsChange(totals);
    }
  };

  const removeItem = (index: number) => {
    const updated = items.filter((_, i) => i !== index);
    onChange(updated);

    // Notify parent
    if (onTotalsChange) {
      const totals = calculateDocumentTotals(
        updated.map((item) => ({
          itemName: item.itemName,                          // ✅ ADDED
          itemCode: item.itemCode,                          // ✅ ADDED
          quantity: item.quantity,
          priceWithoutVat: item.priceWithoutVat,
          vatRate: item.vatRate,
        }))
      );
      onTotalsChange(totals);
    }
  };

  // Handle product selection — auto-fill item fields
  const handleProductSelect = (index: number, product: ProductOption) => {
    updateItem(index, 'itemName', product.name);
    updateItem(index, 'itemCode', product.code || product.name);
    if (product.vatRate !== null) {
      updateItem(index, 'vatRate', product.vatRate);
    }
    if (product.priceWithoutVat !== null) {
      updateItem(index, 'priceWithoutVat', product.priceWithoutVat);
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      {/* Items Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="px-3 py-2 text-left font-semibold text-gray-600">Item</th>
              <th className="px-3 py-2 text-left font-semibold text-gray-600">Code</th>
              <th className="px-3 py-2 text-right font-semibold text-gray-600">Qty</th>
              <th className="px-3 py-2 text-right font-semibold text-gray-600">Price</th>
              <th className="px-3 py-2 text-right font-semibold text-gray-600">VAT %</th>
              <th className="px-3 py-2 text-right font-semibold text-gray-600">Netto</th>
              <th className="px-3 py-2 text-right font-semibold text-gray-600">Gross</th>
              <th className="px-2 py-2 text-center font-semibold text-gray-600 w-6"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {items.map((item, index) => {
              // ✅ USE totalsHelper for calculations (SINGLE SOURCE OF TRUTH)
              const lineTotal = calculateLineTotals({
                itemName: item.itemName,
                itemCode: item.itemCode,
                quantity: item.quantity,
                priceWithoutVat: item.priceWithoutVat,
                vatRate: item.vatRate,
              });

              return (
                <tr key={index} className="hover:bg-gray-50 transition-colors">
                  {/* Product Selector */}
                  <td className="px-3 py-1.5">
                    <ProductSelector
                      companyId={companyId}
                      value={item.itemName}
                      onSelect={(product) => handleProductSelect(index, product)}
                      placeholder="Select product..."
                      className={INPUT_CLASS}
                    />
                  </td>

                  {/* Code (auto-filled or manual) */}
                  <td className="px-3 py-1.5">
                    <input
                      type="text"
                      value={item.itemCode}
                      onChange={(e) => updateItem(index, 'itemCode', e.target.value)}
                      placeholder="Code"
                      className={`${INPUT_CLASS} font-mono text-[11px]`}
                    />
                  </td>

                  {/* Quantity */}
                  <td className="px-3 py-1.5">
                    <input
                      type="number"
                      value={item.quantity || ''}
                      onChange={(e) => updateItem(index, 'quantity', parseFloat(e.target.value) || 0)}
                      min="0"
                      step="0.01"
                      className={NUM_INPUT_CLASS}
                    />
                  </td>

                  {/* Price without VAT */}
                  <td className="px-3 py-1.5">
                    <input
                      type="number"
                      value={item.priceWithoutVat || ''}
                      onChange={(e) =>
                        updateItem(index, 'priceWithoutVat', parseFloat(e.target.value) || 0)
                      }
                      min="0"
                      step="0.01"
                      className={NUM_INPUT_CLASS}
                    />
                  </td>

                  {/* VAT Rate */}
                  <td className="px-3 py-1.5">
                    <input
                      type="number"
                      value={item.vatRate ?? ''}
                      onChange={(e) => updateItem(index, 'vatRate', parseFloat(e.target.value) || 0)}
                      min="0"
                      max="100"
                      step="1"
                      className={NUM_INPUT_CLASS}
                    />
                  </td>

                  {/* Netto Total (from totalsHelper) */}
                  <td className="px-3 py-1.5 text-right text-gray-700 tabular-nums font-mono">
                    {formatCurrency(lineTotal.netAmount)}
                  </td>

                  {/* Gross Total (from totalsHelper) */}
                  <td className="px-3 py-1.5 text-right text-gray-900 font-semibold tabular-nums font-mono">
                    {formatCurrency(lineTotal.grossAmount)}
                  </td>

                  {/* Delete Button */}
                  <td className="px-2 py-1.5 text-center">
                    <button
                      type="button"
                      onClick={() => removeItem(index)}
                      className="text-gray-300 hover:text-red-500 transition-colors p-0.5"
                      title="Remove item"
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Add Item Button */}
      <div className="px-3 py-2 border-t border-gray-100 bg-gray-50">
        <button
          type="button"
          onClick={addItem}
          className="inline-flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-800 font-medium transition-colors"
        >
          <Plus size={14} />
          Add Item
        </button>
      </div>
    </div>
  );
}

// Re-export for parent components
export { calculateDocumentTotals };
