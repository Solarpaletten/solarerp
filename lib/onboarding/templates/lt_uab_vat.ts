// lib/onboarding/templates/lt_uab_vat.ts
// ═══════════════════════════════════════════════════════════════
// Template: LT_UAB_VAT
// Lithuania · UAB (closed joint-stock) · VAT payer
// Accounting plan: Lithuanian SKS (simplified)
// ═══════════════════════════════════════════════════════════════

import type { CompanyTemplate } from './types';

export const LT_UAB_VAT: CompanyTemplate = {
  key: 'LT_UAB_VAT',
  country: 'LT',
  legalType: 'UAB',
  vatPayer: true,
  currencyCode: 'EUR',

  vatRates: [
    { name: '21% Standard',      rate: 21,   code: 'PVM1',  category: 'STANDARD',        isDefault: true  },
    { name: '9% Reduced',        rate: 9,    code: 'PVM9',  category: 'REDUCED',         isDefault: false },
    { name: '5% Reduced',        rate: 5,    code: 'PVM5',  category: 'REDUCED',         isDefault: false },
    { name: '0% Export',         rate: 0,    code: 'PVM0E', category: 'ZERO_EXPORT',     isDefault: false },
    { name: '0% Intra-EU',       rate: 0,    code: 'PVM0I', category: 'ZERO_INTRACOM',   isDefault: false },
    { name: 'Reverse Charge',    rate: 0,    code: 'PVMRC', category: 'REVERSE_CHARGE',  isDefault: false },
    { name: 'No VAT',            rate: 0,    code: 'PVMNO', category: 'NO_VAT',          isDefault: false },
  ],

  operationTypes: [
    { name: 'Purchase goods',    code: 'PIRK', module: 'PURCHASE', debitAccountCode: '3400', creditAccountCode: '1600', vatAccountCode: '1576', affectsWarehouse: true,  affectsVat: true,  priority: 10 },
    { name: 'Purchase services', code: 'PPS',  module: 'PURCHASE', debitAccountCode: '4900', creditAccountCode: '1600', vatAccountCode: '1576', affectsWarehouse: false, affectsVat: true,  priority: 5  },
    { name: 'Advance invoice',   code: 'AV',   module: 'PURCHASE', debitAccountCode: '1518', creditAccountCode: '1600',                         affectsWarehouse: false, affectsVat: false, priority: 1  },
    { name: 'Sale goods',        code: 'SALE', module: 'SALE',     debitAccountCode: '1200', creditAccountCode: '8400', vatAccountCode: '1776', affectsWarehouse: true,  affectsVat: true,  priority: 10 },
    { name: 'Sale services',     code: 'SSVC', module: 'SALE',     debitAccountCode: '1200', creditAccountCode: '8400', vatAccountCode: '1776', affectsWarehouse: false, affectsVat: true,  priority: 5  },
  ],

  warehouses: [
    { name: 'Main',   code: 'WH-MAIN',   isDefault: true  },
    { name: 'Office', code: 'WH-OFFICE', isDefault: false },
  ],

  employees: [
    { name: 'Director',            code: 'EMP-DIR',  position: 'Director'           },
    { name: 'Manager',             code: 'EMP-MGR',  position: 'Manager'            },
    { name: 'Warehouse Employee',  code: 'EMP-WH',   position: 'Warehouse Keeper'   },
  ],

  clients: [
    // Government clients for Lithuania
    { name: 'State Tax Inspectorate (VMI)',   code: 'GOV-VMI',  type: 'GOVERNMENT', role: 'BOTH',    location: 'LOCAL', vatCode: 'LT288715220' },
    { name: 'State Social Insurance (SODRA)', code: 'GOV-SOD',  type: 'GOVERNMENT', role: 'BOTH',    location: 'LOCAL', vatCode: 'LT000000000' },
    { name: 'Demo Customer',                  code: 'CUS-001',  type: 'COMPANY',    role: 'CUSTOMER', location: 'LOCAL' },
    { name: 'Demo Supplier',                  code: 'SUP-001',  type: 'COMPANY',    role: 'SUPPLIER', location: 'LOCAL' },
  ],

  products: [
    { name: 'Product Standard VAT',   code: 'PRD-001', unitName: 'pcs',   vatRate: 21, priceWithoutVat: 100, attributeName: 'Goods'    },
    { name: 'Product Reduced VAT',    code: 'PRD-002', unitName: 'pcs',   vatRate: 9,  priceWithoutVat: 50,  attributeName: 'Goods'    },
    { name: 'Product Export (0%)',    code: 'PRD-003', unitName: 'pcs',   vatRate: 0,  priceWithoutVat: 80,  attributeName: 'Goods'    },
    { name: 'Service Standard VAT',   code: 'SVC-001', unitName: 'hours', vatRate: 21, priceWithoutVat: 60,  attributeName: 'Services' },
    { name: 'Service No VAT',         code: 'SVC-002', unitName: 'hours', vatRate: 0,  priceWithoutVat: 40,  attributeName: 'Services' },
  ],

  accounts: [
    // ASSETS
    { code: '1000', name: 'Cash on hand',              type: 'ASSET'     },
    { code: '1010', name: 'Bank account EUR',          type: 'ASSET'     },
    { code: '1200', name: 'Accounts receivable',       type: 'ASSET'     },
    { code: '1400', name: 'Inventory / Goods',         type: 'ASSET'     },
    { code: '1518', name: 'Advances to suppliers',     type: 'ASSET'     },
    { code: '1576', name: 'Input VAT',                 type: 'ASSET'     },
    // LIABILITIES
    { code: '1600', name: 'Accounts payable',          type: 'LIABILITY' },
    { code: '1776', name: 'Output VAT',                type: 'LIABILITY' },
    { code: '1800', name: 'VAT payable (net)',         type: 'LIABILITY' },
    { code: '1900', name: 'Advances from customers',  type: 'LIABILITY' },
    // EQUITY
    { code: '3000', name: 'Share capital',             type: 'EQUITY'    },
    { code: '3400', name: 'Retained earnings',         type: 'EQUITY'    },
    // INCOME
    { code: '8400', name: 'Sales revenue',             type: 'INCOME'    },
    { code: '8500', name: 'Other income',              type: 'INCOME'    },
    // EXPENSES
    { code: '4900', name: 'Services expense',          type: 'EXPENSE'   },
    { code: '5000', name: 'Cost of goods sold',        type: 'EXPENSE'   },
    { code: '5800', name: 'Operating expenses',        type: 'EXPENSE'   },
    { code: '6000', name: 'Payroll expense',           type: 'EXPENSE'   },
    { code: '6100', name: 'Social insurance expense',  type: 'EXPENSE'   },
  ],

  governmentClientNames: {
    taxAuthority:    'State Tax Inspectorate (VMI)',
    socialSecurity:  'State Social Insurance (SODRA)',
  },
};
