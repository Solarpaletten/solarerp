// lib/onboarding/templates/chart_of_accounts/de_gmbh.ts
// ═══════════════════════════════════════════════════════════════
// Germany GmbH Chart of Accounts (simplified SKR03)
// ═══════════════════════════════════════════════════════════════

import type { AccountEntry } from './global_default';

export const DE_GMBH_COA: AccountEntry[] = [
  // ── ASSETS ───────────────────────────────
  { code: '1000', name: 'Kasse',                       type: 'ASSET'     },
  { code: '1200', name: 'Girokonto',                   type: 'ASSET'     },
  { code: '1400', name: 'Forderungen aus L+L',         type: 'ASSET'     },
  { code: '1600', name: 'Warenbestand',                type: 'ASSET'     },
  { code: '1518', name: 'Anzahlungen an Lieferanten',  type: 'ASSET'     },
  { code: '1576', name: 'Vorsteuer 19%',               type: 'ASSET'     },
  { code: '1571', name: 'Vorsteuer 7%',                type: 'ASSET'     },
  // ── LIABILITIES ──────────────────────────
  { code: '3300', name: 'Verbindlichkeiten L+L',       type: 'LIABILITY' },
  { code: '1776', name: 'Umsatzsteuer 19%',            type: 'LIABILITY' },
  { code: '1771', name: 'Umsatzsteuer 7%',             type: 'LIABILITY' },
  { code: '1780', name: 'USt-Zahllast',                type: 'LIABILITY' },
  // ── EQUITY ───────────────────────────────
  { code: '2900', name: 'Stammkapital',                type: 'EQUITY'    },
  { code: '2970', name: 'Gewinnvortrag',               type: 'EQUITY'    },
  // ── INCOME ───────────────────────────────
  { code: '8400', name: 'Erlöse 19% USt',              type: 'INCOME'    },
  { code: '8300', name: 'Erlöse 7% USt',               type: 'INCOME'    },
  { code: '8120', name: 'Steuerfreie Erlöse Export',   type: 'INCOME'    },
  // ── EXPENSES ─────────────────────────────
  { code: '3400', name: 'Wareneinsatz',                type: 'EXPENSE'   },
  { code: '4900', name: 'Fremdleistungen',             type: 'EXPENSE'   },
  { code: '4800', name: 'Büroaufwand',                 type: 'EXPENSE'   },
  { code: '6000', name: 'Löhne und Gehälter',          type: 'EXPENSE'   },
  { code: '6010', name: 'Sozialabgaben',               type: 'EXPENSE'   },
];
