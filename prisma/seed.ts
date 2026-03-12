// prisma/seed.ts
// ═══════════════════════════════════════════════════
// Solar ERP Seed — Task 58 (idempotent)
// Можно запускать многократно — дубликатов не будет
// ═══════════════════════════════════════════════════

import { PrismaClient, Prisma, CompanyStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding Solar ERP database...');

  // =============================
  // TENANT
  // =============================
  const tenant = await prisma.tenant.upsert({
    where: { id: 'seed-tenant-solar-group' },
    update: { name: 'Solar Group' },
    create: {
      id: 'seed-tenant-solar-group',
      name: 'Solar Group',
    },
  });

  // =============================
  // USER (ADMIN)
  // =============================
  const passwordHash = await bcrypt.hash('pass123', 10);

  const user = await prisma.user.upsert({
    where: { tenantId_email: { tenantId: tenant.id, email: 'solar@solar.com' } },
    update: {},
    create: {
      id: 'seed-user-solar-admin',
      email: 'solar@solar.com',
      passwordHash,
      name: 'Solar',
      tenantId: tenant.id,
    },
  });

  // =============================
  // COMPANY
  // =============================
  const company = await prisma.company.upsert({
    where: { id: 'seed-company-solar-erp-demo' },
    update: { name: 'Solar ERP Demo' },
    create: {
      id: 'seed-company-solar-erp-demo',
      tenantId: tenant.id,
      name: 'Solar ERP Demo',
      code: 'SOLAR-ERP',
      vatNumber: 'DE123456789',
      country: 'DE',
      legalType: 'GmbH',
      currencyCode: 'EUR',
      vatPayer: true,
      status: CompanyStatus.ACTIVE,
    },
  });

  // TASK 58: CompanyUser — OWNER
  await prisma.companyUser.upsert({
    where: { companyId_userId: { companyId: company.id, userId: user.id } },
    update: {},
    create: {
      companyId: company.id,
      userId: user.id,
      role: 'OWNER',
      isOwner: true,
    },
  });

  console.log('  ✓ Tenant + User + Company + CompanyUser(OWNER)');

  // =============================
  // CLIENTS
  // =============================
  const client = await prisma.client.upsert({
    where: { companyId_code: { companyId: company.id, code: 'CLIENT-001' } },
    update: {},
    create: {
      companyId: company.id,
      tenantId: tenant.id,
      name: 'Demo Client GmbH',
      shortName: 'DEMO',
      code: 'CLIENT-001',
      type: 'COMPANY',
      role: 'CUSTOMER',
      location: 'EU',
      isActive: true,
      vatCode: 'DE987654321',
      email: 'client@demo.de',
      phoneNumber: '+49 30 123456',
      paymentTermsDays: 14,
      creditLimit: new Prisma.Decimal(50000),
      creditLimitCurrency: 'EUR',
    },
  });

  const supplier = await prisma.client.upsert({
    where: { companyId_code: { companyId: company.id, code: 'SUPPLIER-001' } },
    update: {},
    create: {
      companyId: company.id,
      tenantId: tenant.id,
      name: 'Demo Supplier Ltd',
      shortName: 'SUPPLIER',
      code: 'SUPPLIER-001',
      type: 'COMPANY',
      role: 'SUPPLIER',
      location: 'EU',
      isActive: true,
      vatCode: 'DE111111111',
      email: 'supplier@demo.de',
      phoneNumber: '+49 40 654321',
      paymentTermsDays: 30,
      creditLimit: new Prisma.Decimal(100000),
      creditLimitCurrency: 'EUR',
    },
  });

  console.log('  ✓ Clients: Demo Client GmbH, Demo Supplier Ltd');

  // =============================
  // ITEMS
  // =============================
  const item = await prisma.item.upsert({
    where: { id: 'seed-item-cons-001' },
    update: {},
    create: {
      id: 'seed-item-cons-001',
      companyId: company.id,
      name: 'Consulting Service',
      code: 'CONS-001',
      unitName: 'hours',
      vatRate: new Prisma.Decimal(19),
      priceWithoutVat: new Prisma.Decimal(100),
      priceWithVat: new Prisma.Decimal(119),
      attributeName: 'Service',
      freePrice: false,
    },
  });

  // =============================
  // EMPLOYEES
  // =============================
  const employee = await prisma.employee.upsert({
    where: { id: 'seed-employee-dir-01' },
    update: {},
    create: {
      id: 'seed-employee-dir-01',
      companyId: company.id,
      name: 'Leanid Kanoplich',
      code: 'DIR-01',
      position: 'Director',
      department: 'Management',
      email: 'leanid@solar.com',
      isActive: true,
    },
  });

  await prisma.employee.upsert({
    where: { id: 'seed-employee-mgr-01' },
    update: {},
    create: {
      id: 'seed-employee-mgr-01',
      companyId: company.id,
      name: 'Anna Schmidt',
      code: 'MGR-01',
      position: 'Purchase Manager',
      department: 'Procurement',
      email: 'anna@solar.com',
      isActive: true,
    },
  });

  console.log('  ✓ Employees: Leanid (Director), Anna (Purchase Manager)');

  // =============================
  // WAREHOUSES
  // =============================
  await prisma.warehouse.upsert({
    where: { companyId_name: { companyId: company.id, name: 'Main' } },
    update: {},
    create: {
      companyId: company.id,
      name: 'Main',
      code: 'WH-MAIN',
      isDefault: true,
      isActive: true,
      address: 'Hamburg, Germany',
      responsibleEmployeeId: employee.id,
    },
  });

  await prisma.warehouse.upsert({
    where: { companyId_name: { companyId: company.id, name: 'Goods' } },
    update: {},
    create: {
      companyId: company.id,
      name: 'Goods',
      code: 'WH-GOODS',
      isDefault: false,
      isActive: true,
    },
  });

  console.log('  ✓ Warehouses: Main (default), Goods');

  // =============================
  // OPERATION TYPES
  // =============================
  const opTypes = [
    { code: 'PIRK', name: 'Purchase goods',    module: 'PURCHASE', debitAccountCode: '3400', creditAccountCode: '1600', vatAccountCode: '1576', expenseAccountCode: '5000', affectsWarehouse: true,  affectsVat: true,  priority: 10 },
    { code: 'PPS',  name: 'Purchase services', module: 'PURCHASE', debitAccountCode: '4900', creditAccountCode: '1600', vatAccountCode: '1576',                              affectsWarehouse: false, affectsVat: true,  priority: 5  },
    { code: 'AV',   name: 'Advance invoice',   module: 'PURCHASE', debitAccountCode: '1518', creditAccountCode: '1600',                                                      affectsWarehouse: false, affectsVat: false, priority: 1  },
    { code: 'SALE', name: 'Sale goods',         module: 'SALE',     debitAccountCode: '1200', creditAccountCode: '8400', vatAccountCode: '1776', expenseAccountCode: '5800', affectsWarehouse: true,  affectsVat: true,  priority: 10 },
    { code: 'SSVC', name: 'Sale services',      module: 'SALE',     debitAccountCode: '1200', creditAccountCode: '8400', vatAccountCode: '1776',                              affectsWarehouse: false, affectsVat: true,  priority: 5  },
  ];

  for (const op of opTypes) {
    await prisma.operationType.upsert({
      where: { companyId_code: { companyId: company.id, code: op.code } },
      update: {},
      create: { companyId: company.id, ...op },
    });
  }

  console.log('  ✓ Operation Types: PIRK, PPS, AV, SALE, SSVC');

  // =============================
  // VAT RATES
  // =============================
  const vatRates = [
    { code: 'PVM1',   name: '19% Standard',       rate: 19, category: 'STANDARD',       isDefault: true,  effectiveFrom: new Date('2007-01-01') },
    { code: 'PVM2',   name: '7% Reduced',          rate: 7,  category: 'REDUCED',        isDefault: false, effectiveFrom: new Date('2007-01-01') },
    { code: 'PVM5',   name: '0% Export',            rate: 0,  category: 'ZERO_EXPORT',   isDefault: false },
    { code: 'PVM15',  name: '0% Intra-community',   rate: 0,  category: 'ZERO_INTRACOM', isDefault: false },
    { code: 'PVM16',  name: 'Reverse Charge',       rate: 0,  category: 'REVERSE_CHARGE',isDefault: false },
    { code: 'PVM100', name: 'No VAT',               rate: 0,  category: 'NO_VAT',        isDefault: false },
  ];

  for (const vr of vatRates) {
    await prisma.vatRate.upsert({
      where: { id: `seed-vat-${company.id}-${vr.code}` },
      update: {},
      create: {
        id: `seed-vat-${company.id}-${vr.code}`,
        companyId: company.id,
        name: vr.name,
        rate: new Prisma.Decimal(vr.rate),
        code: vr.code,
        category: vr.category,
        isDefault: vr.isDefault,
        isActive: true,
        effectiveFrom: vr.effectiveFrom,
      },
    });
  }

  console.log('  ✓ VAT Rates: 19%, 7%, 0% Export, 0% Intra, Reverse Charge, No VAT');

  // =============================
  // SALE DOCUMENT
  // =============================
  await prisma.saleDocument.upsert({
    where: { companyId_series_number: { companyId: company.id, series: 'S', number: '0001' } },
    update: {},
    create: {
      companyId: company.id,
      saleDate: new Date('2026-01-01'),
      series: 'S',
      number: '0001',
      clientId: client.id,
      clientName: client.name,
      clientCode: client.code,
      warehouseName: 'Main',
      operationType: 'SALE',
      currencyCode: 'EUR',
      items: {
        create: [{
          itemName: item.name,
          itemCode: item.code,
          quantity: new Prisma.Decimal(10),
          priceWithoutVat: new Prisma.Decimal(100),
          vatRate: new Prisma.Decimal(19),
        }],
      },
    },
  });

  // =============================
  // PURCHASE DOCUMENT
  // =============================
  const purchase = await prisma.purchaseDocument.upsert({
    where: { companyId_series_number: { companyId: company.id, series: 'P', number: '0001' } },
    update: {},
    create: {
      companyId: company.id,
      purchaseDate: new Date('2026-01-01'),
      series: 'P',
      number: '0001',
      supplierId: supplier.id,
      supplierName: supplier.name,
      supplierCode: supplier.code,
      warehouseName: 'Main',
      operationType: 'PURCHASE',
      currencyCode: 'EUR',
      items: {
        create: [{
          itemName: item.name,
          itemCode: item.code,
          quantity: new Prisma.Decimal(5),
          priceWithoutVat: new Prisma.Decimal(80),
          vatRate: new Prisma.Decimal(19),
        }],
      },
    },
  });

  // =============================
  // BANK STATEMENT
  // =============================
  await prisma.bankStatement.upsert({
    where: { companyId_transactionNumber: { companyId: company.id, transactionNumber: 'TX-0001' } },
    update: {},
    create: {
      companyId: company.id,
      accountNumber: 'DE001234567890',
      currencyCode: 'EUR',
      period: new Date('2026-01-01'),
      transactionNumber: 'TX-0001',
      amount: new Prisma.Decimal(1190),
      operationType: 2,
      clientName: client.name,
      paymentPurpose: 'Invoice S-0001',
    },
  });

  console.log('✅ Seed completed successfully');
  console.log('--------------------------------');
  console.log('Tenant:', tenant.name);
  console.log('User:', user.email, '(password: pass123)');
  console.log('Company:', company.name);
  console.log('CompanyUser: OWNER ✓');
  console.log('Employees: 2 | Warehouses: 2 | OpTypes: 5 | VAT Rates: 6');
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
