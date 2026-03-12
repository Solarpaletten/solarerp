// lib/onboarding/templates/global_default.ts
// Fallback template for any country not specifically mapped
import type { CompanyTemplate } from './types';

export const GLOBAL_DEFAULT: CompanyTemplate = {
  key: 'GLOBAL_DEFAULT',
  country: 'XX',
  legalType: 'LLC',
  vatPayer: true,
  currencyCode: 'EUR',

  vatRates: [
    { name: '19% Standard',   rate: 19, code: 'VAT19', category: 'STANDARD',      isDefault: true  },
    { name: '7% Reduced',     rate: 7,  code: 'VAT7',  category: 'REDUCED',       isDefault: false },
    { name: '0% Export',      rate: 0,  code: 'VAT0E', category: 'ZERO_EXPORT',   isDefault: false },
    { name: '0% Intra-EU',    rate: 0,  code: 'VAT0I', category: 'ZERO_INTRACOM', isDefault: false },
    { name: 'Reverse Charge', rate: 0,  code: 'VATRC', category: 'REVERSE_CHARGE',isDefault: false },
    { name: 'No VAT',         rate: 0,  code: 'VATNO', category: 'NO_VAT',        isDefault: false },
  ],

  operationTypes: [
    { name: 'Purchase goods',    code: 'PIRK', module: 'PURCHASE', debitAccountCode: '1400', creditAccountCode: '2000', vatAccountCode: '1576', affectsWarehouse: true,  affectsVat: true,  priority: 10 },
    { name: 'Purchase services', code: 'PPS',  module: 'PURCHASE', debitAccountCode: '5000', creditAccountCode: '2000', vatAccountCode: '1576', affectsWarehouse: false, affectsVat: true,  priority: 5  },
    { name: 'Advance invoice',   code: 'AV',   module: 'PURCHASE', debitAccountCode: '1518', creditAccountCode: '2000',                         affectsWarehouse: false, affectsVat: false, priority: 1  },
    { name: 'Sale goods',        code: 'SALE', module: 'SALE',     debitAccountCode: '1200', creditAccountCode: '4000', vatAccountCode: '2200', affectsWarehouse: true,  affectsVat: true,  priority: 10 },
    { name: 'Sale services',     code: 'SSVC', module: 'SALE',     debitAccountCode: '1200', creditAccountCode: '4000', vatAccountCode: '2200', affectsWarehouse: false, affectsVat: true,  priority: 5  },
  ],

  warehouses: [
    { name: 'Main',   code: 'WH-MAIN',   isDefault: true  },
    { name: 'Office', code: 'WH-OFFICE', isDefault: false },
  ],

  employees: [
    { name: 'Director',           code: 'EMP-DIR', position: 'Director'        },
    { name: 'Manager',            code: 'EMP-MGR', position: 'Manager'         },
    { name: 'Warehouse Employee', code: 'EMP-WH',  position: 'Warehouse Keeper'},
  ],

  clients: [
    { name: 'Tax Authority',           code: 'GOV-TAX', type: 'GOVERNMENT', role: 'BOTH',    location: 'LOCAL' },
    { name: 'Social Security Authority', code: 'GOV-SOC', type: 'GOVERNMENT', role: 'BOTH',  location: 'LOCAL' },
    { name: 'Demo Customer',           code: 'CUS-001', type: 'COMPANY',    role: 'CUSTOMER', location: 'LOCAL' },
    { name: 'Demo Supplier',           code: 'SUP-001', type: 'COMPANY',    role: 'SUPPLIER', location: 'LOCAL' },
  ],

  products: [
    { name: 'Product Standard VAT',  code: 'PRD-001', unitName: 'pcs',   vatRate: 19, priceWithoutVat: 100, attributeName: 'Goods'    },
    { name: 'Product Reduced VAT',   code: 'PRD-002', unitName: 'pcs',   vatRate: 7,  priceWithoutVat: 50,  attributeName: 'Goods'    },
    { name: 'Product Export (0%)',   code: 'PRD-003', unitName: 'pcs',   vatRate: 0,  priceWithoutVat: 80,  attributeName: 'Goods'    },
    { name: 'Service Standard VAT',  code: 'SVC-001', unitName: 'hours', vatRate: 19, priceWithoutVat: 60,  attributeName: 'Services' },
    { name: 'Service No VAT',        code: 'SVC-002', unitName: 'hours', vatRate: 0,  priceWithoutVat: 40,  attributeName: 'Services' },
  ],

  accounts: [
    { code: '1000', name: 'Cash on hand',             type: 'ASSET'     },
    { code: '1010', name: 'Bank account',             type: 'ASSET'     },
    { code: '1200', name: 'Accounts receivable',      type: 'ASSET'     },
    { code: '1400', name: 'Inventory / Goods',        type: 'ASSET'     },
    { code: '1518', name: 'Advances to suppliers',    type: 'ASSET'     },
    { code: '1576', name: 'Input VAT',                type: 'ASSET'     },
    { code: '2000', name: 'Accounts payable',         type: 'LIABILITY' },
    { code: '2200', name: 'Output VAT',               type: 'LIABILITY' },
    { code: '2300', name: 'Advances from customers',  type: 'LIABILITY' },
    { code: '3000', name: 'Share capital',            type: 'EQUITY'    },
    { code: '3400', name: 'Retained earnings',        type: 'EQUITY'    },
    { code: '4000', name: 'Sales revenue',            type: 'INCOME'    },
    { code: '4100', name: 'Other income',             type: 'INCOME'    },
    { code: '5000', name: 'Cost of goods sold',       type: 'EXPENSE'   },
    { code: '5100', name: 'Services expense',         type: 'EXPENSE'   },
    { code: '5800', name: 'Operating expenses',       type: 'EXPENSE'   },
    { code: '6000', name: 'Payroll expense',          type: 'EXPENSE'   },
  ],
};

// ─────────────────────────────────────────────────────
// DE_GMBH_VAT — Germany · GmbH · VAT payer
// ─────────────────────────────────────────────────────
export const DE_GMBH_VAT: CompanyTemplate = {
  key: 'DE_GMBH_VAT',
  country: 'DE',
  legalType: 'GmbH',
  vatPayer: true,
  currencyCode: 'EUR',

  vatRates: [
    { name: '19% Standard (DE)',  rate: 19, code: 'UST19', category: 'STANDARD',      isDefault: true  },
    { name: '7% Reduced (DE)',    rate: 7,  code: 'UST7',  category: 'REDUCED',       isDefault: false },
    { name: '0% Export',          rate: 0,  code: 'UST0E', category: 'ZERO_EXPORT',   isDefault: false },
    { name: '0% Innergemeinsch.', rate: 0,  code: 'UST0I', category: 'ZERO_INTRACOM', isDefault: false },
    { name: 'Reverse Charge (§13b)', rate: 0, code: 'USTRC', category: 'REVERSE_CHARGE', isDefault: false },
    { name: 'Keine USt',          rate: 0,  code: 'USTNO', category: 'NO_VAT',        isDefault: false },
  ],

  operationTypes: [
    { name: 'Wareneinkauf',         code: 'PIRK', module: 'PURCHASE', debitAccountCode: '3400', creditAccountCode: '1600', vatAccountCode: '1576', affectsWarehouse: true,  affectsVat: true,  priority: 10 },
    { name: 'Dienstleistungseink.', code: 'PPS',  module: 'PURCHASE', debitAccountCode: '4900', creditAccountCode: '1600', vatAccountCode: '1576', affectsWarehouse: false, affectsVat: true,  priority: 5  },
    { name: 'Anzahlungsrechnung',   code: 'AV',   module: 'PURCHASE', debitAccountCode: '1518', creditAccountCode: '1600',                         affectsWarehouse: false, affectsVat: false, priority: 1  },
    { name: 'Warenverkauf',         code: 'SALE', module: 'SALE',     debitAccountCode: '1200', creditAccountCode: '8400', vatAccountCode: '1776', affectsWarehouse: true,  affectsVat: true,  priority: 10 },
    { name: 'Dienstleistungsv.',    code: 'SSVC', module: 'SALE',     debitAccountCode: '1200', creditAccountCode: '8400', vatAccountCode: '1776', affectsWarehouse: false, affectsVat: true,  priority: 5  },
  ],

  warehouses: [
    { name: 'Hauptlager', code: 'WH-MAIN',   isDefault: true  },
    { name: 'Bürolager',  code: 'WH-OFFICE', isDefault: false },
  ],

  employees: [
    { name: 'Geschäftsführer',    code: 'EMP-DIR', position: 'Geschäftsführer' },
    { name: 'Manager',            code: 'EMP-MGR', position: 'Manager'          },
    { name: 'Lagerist',           code: 'EMP-WH',  position: 'Lagerist'         },
  ],

  clients: [
    { name: 'Finanzamt',            code: 'GOV-FA',  type: 'GOVERNMENT', role: 'BOTH',     location: 'LOCAL' },
    { name: 'Sozialversicherung',   code: 'GOV-SV',  type: 'GOVERNMENT', role: 'BOTH',     location: 'LOCAL' },
    { name: 'Demo Kunde',           code: 'CUS-001', type: 'COMPANY',    role: 'CUSTOMER', location: 'LOCAL' },
    { name: 'Demo Lieferant',       code: 'SUP-001', type: 'COMPANY',    role: 'SUPPLIER', location: 'LOCAL' },
  ],

  products: [
    { name: 'Produkt Standard MwSt', code: 'PRD-001', unitName: 'Stk',  vatRate: 19, priceWithoutVat: 100, attributeName: 'Goods'    },
    { name: 'Produkt Reduziert MwSt',code: 'PRD-002', unitName: 'Stk',  vatRate: 7,  priceWithoutVat: 50,  attributeName: 'Goods'    },
    { name: 'Dienstleistung 19%',    code: 'SVC-001', unitName: 'Std',  vatRate: 19, priceWithoutVat: 80,  attributeName: 'Services' },
    { name: 'Dienstleistung 0%',     code: 'SVC-002', unitName: 'Std',  vatRate: 0,  priceWithoutVat: 60,  attributeName: 'Services' },
  ],

  accounts: [
    { code: '1000', name: 'Kasse',                    type: 'ASSET'     },
    { code: '1200', name: 'Girokonto',                type: 'ASSET'     },
    { code: '1400', name: 'Forderungen',              type: 'ASSET'     },
    { code: '1600', name: 'Warenbestand',             type: 'ASSET'     },
    { code: '1576', name: 'Vorsteuer',                type: 'ASSET'     },
    { code: '3300', name: 'Verbindlichkeiten (L+L)',  type: 'LIABILITY' },
    { code: '1776', name: 'Umsatzsteuer',             type: 'LIABILITY' },
    { code: '2900', name: 'Stammkapital',             type: 'EQUITY'    },
    { code: '8400', name: 'Umsatzerlöse',             type: 'INCOME'    },
    { code: '3400', name: 'Wareneinsatz',             type: 'EXPENSE'   },
    { code: '4900', name: 'Dienstleistungsaufwand',   type: 'EXPENSE'   },
    { code: '4800', name: 'Büroaufwand',              type: 'EXPENSE'   },
    { code: '6000', name: 'Lohnaufwand',              type: 'EXPENSE'   },
  ],

  governmentClientNames: {
    taxAuthority:   'Finanzamt',
    socialSecurity: 'Sozialversicherung',
  },
};
