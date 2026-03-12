// lib/onboarding/templates/chart_of_accounts/global_default.ts
// ═══════════════════════════════════════════════════════════════
// TASK 58 FIX — Chart of Accounts Template (extracted from inline)
// Global default CoA — used as fallback for any country
// ═══════════════════════════════════════════════════════════════

export interface AccountEntry {
  code: string;
  name: string;
  type: 'ASSET' | 'LIABILITY' | 'EQUITY' | 'INCOME' | 'EXPENSE';
}

export const GLOBAL_DEFAULT_COA: AccountEntry[] = [
  // ── ASSETS ───────────────────────────────
  { code: '1000', name: 'Cash on hand',              type: 'ASSET'     },
  { code: '1010', name: 'Bank account',              type: 'ASSET'     },
  { code: '1200', name: 'Accounts receivable',       type: 'ASSET'     },
  { code: '1400', name: 'Inventory / Goods',         type: 'ASSET'     },
  { code: '1518', name: 'Advances to suppliers',     type: 'ASSET'     },
  { code: '1576', name: 'Input VAT',                 type: 'ASSET'     },
  // ── LIABILITIES ──────────────────────────
  { code: '2000', name: 'Accounts payable',          type: 'LIABILITY' },
  { code: '2200', name: 'Output VAT',                type: 'LIABILITY' },
  { code: '2300', name: 'Advances from customers',   type: 'LIABILITY' },
  // ── EQUITY ───────────────────────────────
  { code: '3000', name: 'Share capital',             type: 'EQUITY'    },
  { code: '3400', name: 'Retained earnings',         type: 'EQUITY'    },
  // ── INCOME ───────────────────────────────
  { code: '4000', name: 'Sales revenue',             type: 'INCOME'    },
  { code: '4100', name: 'Other income',              type: 'INCOME'    },
  // ── EXPENSES ─────────────────────────────
  { code: '5000', name: 'Cost of goods sold',        type: 'EXPENSE'   },
  { code: '5100', name: 'Services expense',          type: 'EXPENSE'   },
  { code: '5800', name: 'Operating expenses',        type: 'EXPENSE'   },
  { code: '6000', name: 'Payroll expense',           type: 'EXPENSE'   },
];
