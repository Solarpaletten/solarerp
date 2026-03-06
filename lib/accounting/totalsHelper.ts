// lib/accounting/totalsHelper.ts
// ═══════════════════════════════════════════════════
// Task 56_7 — Decimal-Safe Totals Calculation
// ═══════════════════════════════════════════════════
// Used by:
// - PurchaseItemsEdit (live recalc)
// - PurchaseTotals (display)
// - Posting endpoint (verify amounts)

import Decimal from 'decimal.js';

export interface EditableItem {
  id?: string;
  itemName: string;
  itemCode: string;
  quantity: number | string;
  priceWithoutVat: number | string;
  vatRate: number | string;
}

export interface DocumentTotals {
  subtotal: number; // sum of net amounts
  vatTotal: number; // sum of VAT amounts
  grossTotal: number; // subtotal + vatTotal
  items: LineTotal[]; // per-item breakdown
}

export interface LineTotal {
  itemName: string;
  quantity: number;
  priceWithoutVat: number;
  vatRate: number;
  netAmount: number;
  vatAmount: number;
  grossAmount: number;
}

/**
 * Convert value to Decimal-safe number
 */
function toDecimal(val: number | string | null | undefined): Decimal {
  if (val === null || val === undefined) return new Decimal(0);
  const str = String(val).trim();
  if (!str) return new Decimal(0);
  try {
    return new Decimal(str);
  } catch {
    return new Decimal(0);
  }
}

/**
 * Calculate single line totals (net, vat, gross)
 */
export function calculateLineTotals(item: EditableItem & { itemName?: string }): LineTotal {
  const quantity = toDecimal(item.quantity);
  const price = toDecimal(item.priceWithoutVat);
  const vatRate = toDecimal(item.vatRate);

  // Net = Qty × Price
  const netAmount = quantity.times(price);

  // VAT = Net × (VatRate / 100)
  const vatAmount = netAmount.times(vatRate.dividedBy(100));

  // Gross = Net + VAT
  const grossAmount = netAmount.plus(vatAmount);

  return {
    itemName: item.itemName || '',
    quantity: quantity.toNumber(),
    priceWithoutVat: price.toNumber(),
    vatRate: vatRate.toNumber(),
    netAmount: netAmount.toNumber(),
    vatAmount: vatAmount.toNumber(),
    grossAmount: grossAmount.toNumber(),
  };
}

/**
 * Calculate document totals (all items aggregated)
 */
export function calculateDocumentTotals(items: (EditableItem & { itemName?: string })[]): DocumentTotals {
  const lineItems: LineTotal[] = items.map(calculateLineTotals);

  // Sum using Decimal to avoid float errors
  let subtotal = new Decimal(0);
  let vatTotal = new Decimal(0);

  for (const line of lineItems) {
    subtotal = subtotal.plus(line.netAmount);
    vatTotal = vatTotal.plus(line.vatAmount);
  }

  const grossTotal = subtotal.plus(vatTotal);

  return {
    subtotal: subtotal.toNumber(),
    vatTotal: vatTotal.toNumber(),
    grossTotal: grossTotal.toNumber(),
    items: lineItems,
  };
}

/**
 * Format currency for display
 */
export function formatCurrency(value: number | string | undefined, decimals: number = 2): string {
  const num = typeof value === 'string' ? parseFloat(value) : value || 0;
  if (isNaN(num)) return '0.00';
  return num.toFixed(decimals);
}

/**
 * Validate document totals (useful for API validation)
 */
export function validateTotals(totals: DocumentTotals): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (totals.grossTotal <= 0) {
    errors.push('Gross total must be greater than zero');
  }

  if (totals.subtotal < 0) {
    errors.push('Subtotal cannot be negative');
  }

  if (totals.vatTotal < 0) {
    errors.push('VAT total cannot be negative');
  }

  // Validate balanced: subtotal + vatTotal = grossTotal
  const expectedGross = new Decimal(totals.subtotal).plus(totals.vatTotal);
  const actualGross = new Decimal(totals.grossTotal);

  // Allow for small rounding differences (0.01)
  if (Math.abs(expectedGross.minus(actualGross).toNumber()) > 0.01) {
    errors.push('Totals are not balanced');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Create posting payload from document totals
 * Used by posting endpoint to create journal entries
 */
export function createPostingPayload(totals: DocumentTotals) {
  return {
    totalNetAmount: totals.subtotal,
    totalVatAmount: totals.vatTotal,
    totalGrossAmount: totals.grossTotal,
    itemsCount: totals.items.length,
    // Journal posting will use grossTotal for DR/CR accounts
  };
}
