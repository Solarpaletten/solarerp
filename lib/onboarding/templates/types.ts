// lib/onboarding/templates/types.ts
// ═══════════════════════════════════════════════════════════════
// Shared types for all company templates
// ═══════════════════════════════════════════════════════════════

export interface VatRateTemplate {
  name: string;
  rate: number;
  code?: string;
  category: 'STANDARD' | 'REDUCED' | 'ZERO_EXPORT' | 'ZERO_INTRACOM' | 'REVERSE_CHARGE' | 'NO_VAT';
  isDefault: boolean;
}

export interface OperationTypeTemplate {
  name: string;
  code: string;
  module: 'PURCHASE' | 'SALE';
  debitAccountCode?: string;
  creditAccountCode?: string;
  vatAccountCode?: string;
  expenseAccountCode?: string;
  revenueAccountCode?: string;
  advanceAccountCode?: string;
  affectsWarehouse: boolean;
  affectsVat: boolean;
  priority?: number;
}

export interface WarehouseTemplate {
  name: string;
  code: string;
  isDefault: boolean;
}

export interface EmployeeTemplate {
  name: string;
  code: string;
  position: string;
}

export interface ClientTemplate {
  name: string;
  code: string;
  type: 'COMPANY' | 'GOVERNMENT' | 'INDIVIDUAL';
  role: 'CUSTOMER' | 'SUPPLIER' | 'BOTH';
  location: 'LOCAL' | 'EU' | 'FOREIGN';
  vatCode?: string;
}

export interface ProductTemplate {
  name: string;
  code: string;
  unitName: string;
  vatRate: number;
  priceWithoutVat: number;
  attributeName: 'Goods' | 'Services';
}

export interface AccountTemplate {
  code: string;
  name: string;
  type: 'ASSET' | 'LIABILITY' | 'EQUITY' | 'INCOME' | 'EXPENSE';
}

export interface CompanyTemplate {
  key: string;
  country: string;
  legalType: string;
  vatPayer: boolean;
  currencyCode: string;
  vatRates: VatRateTemplate[];
  operationTypes: OperationTypeTemplate[];
  warehouses: WarehouseTemplate[];
  employees: EmployeeTemplate[];
  clients: ClientTemplate[];
  products: ProductTemplate[];
  accounts: AccountTemplate[];
  governmentClientNames?: {
    taxAuthority?: string;
    socialSecurity?: string;
  };
}
