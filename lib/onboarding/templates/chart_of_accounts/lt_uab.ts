// lib/onboarding/templates/chart_of_accounts/lt_uab.ts
// ═══════════════════════════════════════════════════════════════
// Lithuania UAB Chart of Accounts (simplified SKS plan)
// Used by LT_UAB_VAT and LT_MB_VAT templates
// ═══════════════════════════════════════════════════════════════

import type { AccountEntry } from './global_default';

export const LT_UAB_COA: AccountEntry[] = [
  // ── ASSETS ───────────────────────────────
  { code: '1000', name: 'Cash on hand',              type: 'ASSET'     },
  { code: '1010', name: 'Bank account EUR',          type: 'ASSET'     },
  { code: '1200', name: 'Accounts receivable',       type: 'ASSET'     },
  { code: '1400', name: 'Inventory / Goods',         type: 'ASSET'     },
  { code: '1518', name: 'Advances to suppliers',     type: 'ASSET'     },
  { code: '1576', name: 'Input VAT',                 type: 'ASSET'     },
  // ── LIABILITIES ──────────────────────────
  { code: '1600', name: 'Accounts payable',          type: 'LIABILITY' },
  { code: '1776', name: 'Output VAT',                type: 'LIABILITY' },
  { code: '1800', name: 'VAT payable (net)',          type: 'LIABILITY' },
  { code: '1900', name: 'Advances from customers',   type: 'LIABILITY' },
  // ── EQUITY ───────────────────────────────
  { code: '3000', name: 'Share capital',             type: 'EQUITY'    },
  { code: '3400', name: 'Retained earnings',         type: 'EQUITY'    },
  // ── INCOME ───────────────────────────────
  { code: '8400', name: 'Sales revenue',             type: 'INCOME'    },
  { code: '8500', name: 'Other income',              type: 'INCOME'    },
  // ── EXPENSES ─────────────────────────────
  { code: '4900', name: 'Services expense',          type: 'EXPENSE'   },
  { code: '5000', name: 'Cost of goods sold',        type: 'EXPENSE'   },
  { code: '5800', name: 'Operating expenses',        type: 'EXPENSE'   },
  { code: '6000', name: 'Payroll expense',           type: 'EXPENSE'   },
  { code: '6100', name: 'Social insurance expense',  type: 'EXPENSE'   },
];
