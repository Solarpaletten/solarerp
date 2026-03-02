// lib/accounting/accountMapping.ts
// ═══════════════════════════════════════════════════
// Accounting Mapping Layer — SKR03 Abstraction
// ═══════════════════════════════════════════════════
//
// Task 31 + Task 32 fix: Real DATEV SKR03 codes.
//
// DATEV SKR03 standard:
//   1000 = Kasse (Cash)
//   1200 = Bank (main bank account)
//   1400 = Forderungen aus L+L (Trade receivables)
//   1600 = Verbindlichkeiten aus L+L (Trade payables)
//   1576 = Abziehbare Vorsteuer 19% (Input VAT 19%)
//   1571 = Abziehbare Vorsteuer 7% (Input VAT 7%)
//   1776 = Umsatzsteuer 19% (Output VAT 19%)
//   1771 = Umsatzsteuer 19% standard (Output VAT 19% alt)
//
// Rules:
//   - No hardcoded account codes outside this file
//   - All code references go through ACCOUNT_MAP
//   - Resolver validates accounts exist before returning IDs

import { PrismaClient } from '@prisma/client';

type TxClient = Omit<
  PrismaClient,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
>;

// ─── VAT Modes ───────────────────────────────────
export type VatMode = 'VAT_19' | 'VAT_7' | 'EXPORT';

// ─── SKR03 Account Map (DATEV-compliant codes) ───
export const ACCOUNT_MAP = {
  // Balance sheet — liquid assets
  bank: '1200',         // Bank (DATEV standard)
  cash: '1000',         // Kasse

  // Trade accounts
  receivable: '1400',   // Forderungen aus L+L
  payable: '1600',      // Verbindlichkeiten aus L+L

  // Sales by VAT mode
  sales: {
    VAT_19: {
      revenue: '8400',  // Erlöse 19% USt
      vat: '1776',      // Umsatzsteuer 19%
    },
    VAT_7: {
      revenue: '8300',  // Erlöse 7% USt
      vat: '1771',      // Umsatzsteuer 19% (standard) — used for 7% output
    },
    EXPORT: {
      revenue: '8125',  // Steuerfreie ig. Lieferungen
    },
  },

  // Task 35: FIFO COGS & Inventory
  // SKR03 standard:
  //   3960 = Bestandsveränderungen Waren (Inventory asset on balance sheet)
  //   5000 = Aufwendungen für Waren (COGS expense on P&L)
  inventory: '3960',   // Bestandsveränderungen Waren — balance sheet asset
  cogs: '5000',        // Aufwendungen für Waren — cost of goods sold (P&L)

  // Purchases by VAT mode
  purchase: {
    VAT_19: {
      expense: '3400',  // Wareneingang 16% Vorsteuer
      vat: '1576',      // Abziehbare Vorsteuer 19%
    },
    VAT_7: {
      expense: '3100',  // Einkauf RHB 7%
      vat: '1571',      // Abziehbare Vorsteuer 7%
    },
  },

  // Equity / year-end
  equity: {
    capital: '0800',          // Gezeichnetes Kapital
    retainedEarnings: '0840', // Gewinnvortrag
    lossCarryforward: '0860', // Verlustvortrag
    annualResult: '0868',     // Jahresüberschuss / Jahresfehlbetrag
  },

  // Opening / closing
  opening: '9008',     // Eröffnungsbilanz
  closing: '9009',     // Schlussbilanzkonto
} as const;

// ─── Types for resolved account IDs ──────────────
export type ResolvedSaleAccounts = {
  debitAccountId: string;
  creditAccountId: string;
  vatAccountId?: string;
};

export type ResolvedPurchaseAccounts = {
  debitAccountId: string;
  creditAccountId: string;
  vatAccountId?: string;
};

// ─── Batch resolver: multiple codes → IDs ────────
async function resolveCodes(
  tx: TxClient,
  companyId: string,
  codes: string[]
): Promise<Map<string, string>> {
  const uniqueCodes = [...new Set(codes)];
  const accounts = await tx.account.findMany({
    where: { companyId, code: { in: uniqueCodes } },
    select: { id: true, code: true },
  });

  const map = new Map<string, string>();
  for (const acc of accounts) {
    map.set(acc.code, acc.id);
  }

  const missing = uniqueCodes.filter((c) => !map.has(c));
  if (missing.length > 0) {
    throw new Error(
      `ACCOUNT_CODE_NOT_FOUND: Codes not found for company ${companyId}: ${missing.join(', ')}. Import SKR03 first.`
    );
  }

  return map;
}

// ─── Sale Account Resolver ───────────────────────
//
// Sale 19%:
//   Debit:  1400 (Forderungen)     → gross amount
//   Credit: 8400 (Erlöse 19%)      → net amount
//   Credit: 1776 (Umsatzsteuer 19%) → VAT amount
//
// Sale Export:
//   Debit:  1400 (Forderungen)     → full amount
//   Credit: 8125 (ig. Lieferungen)  → full amount
export async function resolveSaleAccounts(
  tx: TxClient,
  companyId: string,
  vatMode: VatMode
): Promise<ResolvedSaleAccounts> {
  const salesConfig = ACCOUNT_MAP.sales[vatMode];
  
  const codes: string[] = [
    ACCOUNT_MAP.receivable,
    salesConfig.revenue,
  ];

  if ('vat' in salesConfig) {
    codes.push(salesConfig.vat);
  }

  const map = await resolveCodes(tx, companyId, codes);

  return {
    debitAccountId: map.get(ACCOUNT_MAP.receivable)!,
    creditAccountId: map.get(salesConfig.revenue)!,
    vatAccountId: 'vat' in salesConfig ? map.get(salesConfig.vat) : undefined,
  };
}

// ─── Purchase Account Resolver ───────────────────
//
// Purchase 19%:
//   Debit:  3400 (Wareneingang)          → net amount
//   Debit:  1576 (Abziehbare Vorsteuer)  → VAT amount
//   Credit: 1600 (Verbindlichkeiten)     → gross amount
export async function resolvePurchaseAccounts(
  tx: TxClient,
  companyId: string,
  vatMode: 'VAT_19' | 'VAT_7'
): Promise<ResolvedPurchaseAccounts> {
  const purchaseConfig = ACCOUNT_MAP.purchase[vatMode];
  const codes = [purchaseConfig.expense, ACCOUNT_MAP.payable, purchaseConfig.vat];

  const map = await resolveCodes(tx, companyId, codes);

  return {
    debitAccountId: map.get(purchaseConfig.expense)!,
    creditAccountId: map.get(ACCOUNT_MAP.payable)!,
    vatAccountId: map.get(purchaseConfig.vat),
  };
}

// ─── Simple 2-line posting resolver ──────────────
export async function resolveSimplePosting(
  tx: TxClient,
  companyId: string,
  debitCode: string,
  creditCode: string
): Promise<{ debitAccountId: string; creditAccountId: string }> {
  const map = await resolveCodes(tx, companyId, [debitCode, creditCode]);
  return {
    debitAccountId: map.get(debitCode)!,
    creditAccountId: map.get(creditCode)!,
  };
}

// ─── Default posting codes for document types ────
export function getDefaultPostingCodes(
  docType: 'SALE' | 'PURCHASE',
  vatMode: VatMode = 'VAT_19'
): { debitCode: string; creditCode: string; vatCode?: string } {
  if (docType === 'SALE') {
    const config = ACCOUNT_MAP.sales[vatMode];
    return {
      debitCode: ACCOUNT_MAP.receivable,
      creditCode: config.revenue,
      vatCode: 'vat' in config ? config.vat : undefined,
    };
  } else {
    const config = ACCOUNT_MAP.purchase[vatMode as 'VAT_19' | 'VAT_7'];
    return {
      debitCode: config.expense,
      creditCode: ACCOUNT_MAP.payable,
      vatCode: config.vat,
    };
  }
}

// ─── FIFO 4-line Account Resolver ────────────────
// Returns all 4 account IDs needed for a FIFO sale journal entry:
//   DR Accounts Receivable (1400)  → revenue gross
//   CR Revenue (8400/8300/8125)    → revenue net
//   DR COGS (5000)                 → cost of goods sold
//   CR Inventory (3960)            → reduce inventory asset
export type ResolvedFifoSaleAccounts = {
  arAccountId: string;       // 1400 - Accounts Receivable
  revenueAccountId: string;  // 8400/8300/8125 - Revenue
  vatAccountId?: string;     // 1776/1771 - VAT (if applicable)
  cogsAccountId: string;     // 5000 - Cost of Goods Sold
  inventoryAccountId: string; // 3960 - Inventory
};

export async function resolveFifoSaleAccounts(
  tx: TxClient,
  companyId: string,
  vatMode: VatMode
): Promise<ResolvedFifoSaleAccounts> {
  const salesConfig = ACCOUNT_MAP.sales[vatMode];
  
  const codes: string[] = [
    ACCOUNT_MAP.receivable,
    salesConfig.revenue,
    ACCOUNT_MAP.cogs,
    ACCOUNT_MAP.inventory,
  ];

  if ('vat' in salesConfig) {
    codes.push(salesConfig.vat);
  }

  const map = await resolveCodes(tx, companyId, codes);

  return {
    arAccountId: map.get(ACCOUNT_MAP.receivable)!,
    revenueAccountId: map.get(salesConfig.revenue)!,
    vatAccountId: 'vat' in salesConfig ? map.get(salesConfig.vat) : undefined,
    cogsAccountId: map.get(ACCOUNT_MAP.cogs)!,
    inventoryAccountId: map.get(ACCOUNT_MAP.inventory)!,
  };
}
