// ═══════════════════════════════════════════════════
// PATCH for: lib/accounting/accountMapping.ts
// Task 35: Add COGS + Inventory account codes
// ═══════════════════════════════════════════════════
//
// ADD these entries to the ACCOUNT_MAP object:

  // Task 35: FIFO COGS & Inventory
  // SKR03 standard:
  //   3960 = Bestandsveränderungen Waren (Inventory asset on balance sheet)
  //   5000 = Aufwendungen für Waren (COGS expense on P&L)
  inventory: '3960',   // Bestandsveränderungen Waren — balance sheet asset
  cogs: '5000',        // Aufwendungen für Waren — cost of goods sold (P&L)

// ═══════════════════════════════════════════════════
// ADD to protectedAccounts.ts (PROTECTED_ACCOUNT_CODES):
//   '3960', // Bestandsveränderungen Waren (Inventory)
//   '5000', // Aufwendungen für Waren (COGS)
//
// ADD to skr03.csv if not present:
//   3960,Bestandsveränderungen Waren,Inventory Changes,ASSET
//   5000,Aufwendungen für Waren,Cost of Goods Sold,EXPENSE
// ═══════════════════════════════════════════════════

// ADD this resolver function to accountMapping.ts:

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
  const codes = [
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
