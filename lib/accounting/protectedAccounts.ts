// lib/accounting/protectedAccounts.ts
// ═══════════════════════════════════════════════════
// DATEV Stammkonten — Protected System Accounts
// ═══════════════════════════════════════════════════
//
// These accounts are referenced by ACCOUNT_MAP and are
// required for the accounting engine to function.
// They cannot be deleted, deactivated, or have their
// code changed by any user operation.
//
// Source: ACCOUNT_MAP in accountMapping.ts (SKR03)

export const PROTECTED_ACCOUNT_CODES = new Set([
  // Liquid assets
  '1000', // Kasse (Cash)
  '1200', // Bank

  // Trade accounts
  '1400', // Forderungen aus L+L (Trade receivables)
  '1600', // Verbindlichkeiten aus L+L (Trade payables)

  // Input VAT (Vorsteuer)
  '1576', // Abziehbare Vorsteuer 19%
  '1571', // Abziehbare Vorsteuer 7%

  // Output VAT (Umsatzsteuer)
  '1776', // Umsatzsteuer 19%
  '1771', // Umsatzsteuer 19% (standard)

  // Revenue
  '8400', // Erlöse 19% USt
  '8300', // Erlöse 7% USt
  '8125', // Steuerfreie ig. Lieferungen (Export)

  // Purchases / Expenses
  '3400', // Wareneingang 16%/19% Vorsteuer
  '3100', // Einkauf RHB 7%

  // Equity / Year-end
  '0800', // Gezeichnetes Kapital
  '0840', // Gewinnvortrag
  '0860', // Verlustvortrag
  '0868', // Jahresüberschuss / Jahresfehlbetrag

  // Opening / Closing
  '9008', // Eröffnungsbilanz
  '9009', // Schlussbilanzkonto

  // PROTECTED_ACCOUNT_CODES
  '3960', // Bestandsveränderungen Waren (Inventory)
  '5000', // Aufwendungen für Waren (COGS)
]);
  

/**
 * Check if an account code is a protected system account.
 */
export function isProtectedCode(code: string): boolean {
  return PROTECTED_ACCOUNT_CODES.has(code);
}

/**
 * Total number of protected accounts.
 */
export const PROTECTED_COUNT = PROTECTED_ACCOUNT_CODES.size; // 20
