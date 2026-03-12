// lib/onboarding/companyBootstrapService.ts
// ═══════════════════════════════════════════════════════════════
// TASK 58 FIX — Company Bootstrap Service (patched)
// Changes from original Task 58:
//   FIX1: CompanyUser OWNER created inside bootstrap pipeline
//   FIX2: Chart of Accounts loaded from template files (not inline)
//   FIX3: Demo products = 4 items (PRD 19%/7%, SVC 19%/0%)
//   FIX4: Warehouses × 2 (already was, confirmed)
//   FIX5: Employees × 3 (already was, confirmed)
//   FIX6: Clients: self + gov × 2 + demo × 2 (already was, confirmed)
// ═══════════════════════════════════════════════════════════════

import prisma from '@/lib/prisma';
import { resolveTemplateKey } from './templateResolver';
import { LT_UAB_VAT } from './templates/lt_uab_vat';
import { DE_GMBH_VAT, GLOBAL_DEFAULT } from './templates/global_default';
import { LT_UAB_COA } from './templates/chart_of_accounts/lt_uab';
import { DE_GMBH_COA } from './templates/chart_of_accounts/de_gmbh';
import { GLOBAL_DEFAULT_COA } from './templates/chart_of_accounts/global_default';
import type { CompanyTemplate } from './templates/types';
import type { AccountEntry } from './templates/chart_of_accounts/global_default';

// ─── CoA registry (separate from main template) ──────────────
const COA_REGISTRY: Record<string, AccountEntry[]> = {
  LT_UAB_VAT:    LT_UAB_COA,
  LT_UAB_NO_VAT: LT_UAB_COA,
  LT_MB_VAT:     LT_UAB_COA,
  DE_GMBH_VAT:   DE_GMBH_COA,
  GLOBAL_DEFAULT: GLOBAL_DEFAULT_COA,
};

// ─── Main template registry ───────────────────────────────────
const TEMPLATES: Record<string, CompanyTemplate> = {
  LT_UAB_VAT,
  LT_UAB_NO_VAT: { ...GLOBAL_DEFAULT, key: 'LT_UAB_NO_VAT', country: 'LT', vatPayer: false },
  LT_MB_VAT:     { ...LT_UAB_VAT,     key: 'LT_MB_VAT', legalType: 'MB' },
  DE_GMBH_VAT,
  LV_SIA_VAT:    { ...GLOBAL_DEFAULT, key: 'LV_SIA_VAT', country: 'LV', legalType: 'SIA' },
  EE_OU_VAT:     { ...GLOBAL_DEFAULT, key: 'EE_OU_VAT',  country: 'EE', legalType: 'OÜ'  },
  GLOBAL_DEFAULT,
};

export interface BootstrapOptions {
  companyId: string;
  companyName: string;
  country: string;
  legalType: string;
  vatPayer: boolean;
  userId: string;            // ← REQUIRED: needed for CompanyUser creation (FIX1)
  createdByUserName?: string;
  progressCallback?: (step: string) => void;
}

export interface BootstrapResult {
  success: boolean;
  templateKey: string;
  created: {
    accounts: number;
    vatRates: number;
    operationTypes: number;
    warehouses: number;
    employees: number;
    clients: number;
    products: number;
  };
  error?: string;
}

// ─── Main orchestrator ───────────────────────────────────────
export async function initializeCompanyFromTemplate(
  opts: BootstrapOptions
): Promise<BootstrapResult> {
  const { companyId, companyName, country, legalType, vatPayer, userId, createdByUserName, progressCallback } = opts;

  const emit = (step: string) => {
    console.log(`[Bootstrap:${companyId}] ${step}`);
    progressCallback?.(step);
  };

  const templateKey = resolveTemplateKey({ country, legalType, vatPayer });
  const template    = TEMPLATES[templateKey]    ?? GLOBAL_DEFAULT;
  const coa         = COA_REGISTRY[templateKey] ?? GLOBAL_DEFAULT_COA;

  emit(`Template resolved: ${templateKey}`);

  const result: BootstrapResult = {
    success: false,
    templateKey,
    created: { accounts: 0, vatRates: 0, operationTypes: 0, warehouses: 0, employees: 0, clients: 0, products: 0 },
  };

  try {
    // ── FIX1: CompanyUser OWNER ─────────────────────────────
    // Must be first — establishes ownership before any ERP data
    emit('Creating company owner access...');
    await createCompanyOwner(companyId, userId);

    // ── STEP 1: Chart of Accounts (FIX2: from template file) ─
    emit('Creating chart of accounts...');
    result.created.accounts = await createChartOfAccounts(companyId, coa);

    // ── STEP 2: VAT Rates ─────────────────────────────────────
    emit('Creating VAT settings...');
    result.created.vatRates = await createDefaultVatRates(companyId, template);

    // ── STEP 3: Operation Types ───────────────────────────────
    emit('Creating operation types...');
    result.created.operationTypes = await createDefaultOperationTypes(companyId, template);

    // ── STEP 4: Warehouses ────────────────────────────────────
    emit('Creating warehouses...');
    result.created.warehouses = await createDefaultWarehouses(companyId, template);

    // ── STEP 5: Employees ─────────────────────────────────────
    emit('Creating employees...');
    result.created.employees = await createDefaultEmployees(companyId, template, createdByUserName);

    // ── STEP 6: Clients ───────────────────────────────────────
    emit('Creating clients and counterparties...');
    result.created.clients = await createDefaultClients(companyId, companyName, template);

    // ── STEP 7: Products (FIX3: 4 demo items) ────────────────
    emit('Creating demo products and services...');
    result.created.products = await createDefaultProducts(companyId, template);

    // ── STEP 8: Mark onboarding complete ─────────────────────
    emit('Finalizing workspace...');
    await prisma.company.update({
      where: { id: companyId },
      data: { onboardingCompletedAt: new Date() },
    });

    result.success = true;
    emit(`Bootstrap complete. Accounts:${result.created.accounts} VAT:${result.created.vatRates} OpTypes:${result.created.operationTypes} WH:${result.created.warehouses} Emp:${result.created.employees} Clients:${result.created.clients} Products:${result.created.products}`);

    return result;
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    emit(`Bootstrap FAILED: ${msg}`);
    result.error = msg;
    return result;
  }
}

// ═══════════════════════════════════════════════════════════════
// FIX1 — CompanyUser OWNER
// Creates the ownership record in the pipeline
// Idempotent via upsert
// ═══════════════════════════════════════════════════════════════
async function createCompanyOwner(companyId: string, userId: string): Promise<void> {
  await (prisma as any).companyUser.upsert({
    where:  { companyId_userId: { companyId, userId } },
    update: { role: 'OWNER', isOwner: true },
    create: { companyId, userId, role: 'OWNER', isOwner: true },
  });
  console.log(`[Bootstrap] CompanyUser OWNER: userId=${userId} companyId=${companyId}`);
}

// ═══════════════════════════════════════════════════════════════
// FIX2 — Chart of Accounts from template file
// Signature: createChartOfAccounts(companyId, coaArray)
// ═══════════════════════════════════════════════════════════════
async function createChartOfAccounts(companyId: string, coa: AccountEntry[]): Promise<number> {
  let created = 0;
  for (const acc of coa) {
    await prisma.account.upsert({
      where:  { companyId_code: { companyId, code: acc.code } },
      update: {},
      create: { companyId, code: acc.code, nameDe: acc.name, nameEn: acc.name, type: acc.type as any, isActive: true },
    });
    created++;
  }
  return created;
}

// ─── VAT Rates (unchanged) ────────────────────────────────────
async function createDefaultVatRates(companyId: string, template: CompanyTemplate): Promise<number> {
  let created = 0;
  for (const vr of template.vatRates) {
    const key = vr.code
      ? await prisma.vatRate.findFirst({ where: { companyId, code: vr.code } })
      : await prisma.vatRate.findFirst({ where: { companyId, name: vr.name } });
    if (!key) {
      await prisma.vatRate.create({
        data: { companyId, name: vr.name, rate: vr.rate, code: vr.code ?? null,
                category: vr.category, isDefault: vr.isDefault, isActive: true },
      });
      created++;
    }
  }
  return created;
}

// ─── Operation Types (unchanged) ─────────────────────────────
async function createDefaultOperationTypes(companyId: string, template: CompanyTemplate): Promise<number> {
  let created = 0;
  for (const ot of template.operationTypes) {
    const existing = await prisma.operationType.findFirst({ where: { companyId, code: ot.code } });
    if (!existing) {
      await prisma.operationType.create({
        data: { companyId, name: ot.name, code: ot.code, module: ot.module,
                debitAccountCode: ot.debitAccountCode ?? null, creditAccountCode: ot.creditAccountCode ?? null,
                vatAccountCode: ot.vatAccountCode ?? null, expenseAccountCode: ot.expenseAccountCode ?? null,
                affectsWarehouse: ot.affectsWarehouse, affectsVat: ot.affectsVat,
                priority: ot.priority ?? 0, isActive: true },
      });
      created++;
    }
  }
  return created;
}

// ─── Warehouses × 2 (unchanged) ──────────────────────────────
async function createDefaultWarehouses(companyId: string, template: CompanyTemplate): Promise<number> {
  let created = 0;
  for (const wh of template.warehouses) {
    const existing = await prisma.warehouse.findFirst({ where: { companyId, name: wh.name } });
    if (!existing) {
      await prisma.warehouse.create({
        data: { companyId, name: wh.name, code: wh.code, isDefault: wh.isDefault, isActive: true },
      });
      created++;
    }
  }
  return created;
}

// ─── Employees × 3 (unchanged) ───────────────────────────────
async function createDefaultEmployees(
  companyId: string, template: CompanyTemplate, createdByUserName?: string
): Promise<number> {
  let created = 0;
  for (const emp of template.employees) {
    const name = (emp.position === 'Director' || emp.position === 'Geschäftsführer') && createdByUserName
      ? createdByUserName : emp.name;
    const existing = await prisma.employee.findFirst({ where: { companyId, code: emp.code } });
    if (!existing) {
      await prisma.employee.create({
        data: { companyId, name, code: emp.code, position: emp.position, isActive: true },
      });
      created++;
    }
  }
  return created;
}

// ─── Clients: self + gov×2 + demo×2 (unchanged) ──────────────
async function createDefaultClients(
  companyId: string, companyName: string, template: CompanyTemplate
): Promise<number> {
  let created = 0;
  const company = await prisma.company.findUnique({ where: { id: companyId }, select: { tenantId: true } });
  const tenantId = company!.tenantId;

  // Self-client
  const selfCode = 'SELF-001';
  if (!await prisma.client.findFirst({ where: { companyId, code: selfCode } })) {
    await prisma.client.create({
      data: { companyId, tenantId, name: companyName, code: selfCode,
              type: 'COMPANY', role: 'BOTH', location: 'LOCAL', isActive: true },
    });
    created++;
  }

  // Template clients (gov + demo)
  for (const cl of template.clients) {
    if (!await prisma.client.findFirst({ where: { companyId, code: cl.code } })) {
      await prisma.client.create({
        data: { companyId, tenantId, name: cl.name, code: cl.code, type: cl.type,
                role: cl.role, location: cl.location, vatCode: cl.vatCode ?? null, isActive: true },
      });
      created++;
    }
  }
  return created;
}

// ═══════════════════════════════════════════════════════════════
// FIX3 — Demo Products: exactly 4 items
//   Demo Product 19%   (goods, standard VAT)
//   Demo Product 7%    (goods, reduced VAT)
//   Demo Service 19%   (service, standard VAT)
//   Demo Service 0%    (service, zero VAT)
// Template vatRates used to pick the correct rate value
// ═══════════════════════════════════════════════════════════════
async function createDefaultProducts(companyId: string, template: CompanyTemplate): Promise<number> {
  // Determine standard and reduced VAT rates from template
  const stdRate = template.vatRates.find(v => v.category === 'STANDARD')?.rate ?? 19;
  const redRate = template.vatRates.find(v => v.category === 'REDUCED')?.rate  ?? 7;

  const DEMO_PRODUCTS = [
    { code: 'PRD-001', name: `Demo Product ${stdRate}%`, unitName: 'pcs',   vatRate: stdRate, priceWithoutVat: 100, attributeName: 'Goods'    },
    { code: 'PRD-002', name: `Demo Product ${redRate}%`, unitName: 'pcs',   vatRate: redRate, priceWithoutVat: 50,  attributeName: 'Goods'    },
    { code: 'SVC-001', name: `Demo Service ${stdRate}%`, unitName: 'hours', vatRate: stdRate, priceWithoutVat: 80,  attributeName: 'Services' },
    { code: 'SVC-002', name: 'Demo Service 0%',          unitName: 'hours', vatRate: 0,       priceWithoutVat: 60,  attributeName: 'Services' },
  ];

  let created = 0;
  for (const p of DEMO_PRODUCTS) {
    if (!await prisma.item.findFirst({ where: { companyId, code: p.code } })) {
      await prisma.item.create({
        data: {
          companyId,
          name:            p.name,
          code:            p.code,
          unitName:        p.unitName,
          vatRate:         p.vatRate,
          priceWithoutVat: p.priceWithoutVat,
          priceWithVat:    p.priceWithoutVat * (1 + p.vatRate / 100),
          attributeName:   p.attributeName,
        } as any,
      });
      created++;
    }
  }
  return created;
}
