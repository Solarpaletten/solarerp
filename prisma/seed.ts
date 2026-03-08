// prisma/seed.ts
// ═══════════════════════════════════════════════════
// Solar ERP Seed — Task 57 Phase 2
// ═══════════════════════════════════════════════════

import { PrismaClient, Prisma, CompanyStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding Solar ERP database...');

  // =============================
  // TENANT
  // =============================
  const tenant = await prisma.tenant.create({
    data: {
      name: 'Solar Group',
    },
  });

  // =============================
  // USER (ADMIN)
  // =============================
  const passwordHash = await bcrypt.hash('pass123', 10);

  const user = await prisma.user.create({
    data: {
      email: 'solar@solar.com',
      passwordHash,
      name: 'Solar',
      tenantId: tenant.id,
    },
  });

  // =============================
  // COMPANY
  // =============================
  const company = await prisma.company.create({
    data: {
      tenantId: tenant.id,
      name: 'Solar ERP Demo',
      code: 'SOLAR-ERP',
      vatNumber: 'DE123456789',
      country: 'DE',
      status: CompanyStatus.ACTIVE,
    },
  });

  // =============================
  // CLIENTS
  // =============================
  // CUSTOMER
  const client = await prisma.client.create({
    data: {
      company: {
        connect: { id: company.id },
      },
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

  // SUPPLIER
  const supplier = await prisma.client.create({
    data: {
      company: {
        connect: { id: company.id },
      },
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

  // =============================
  // ITEMS
  // =============================
  const item = await prisma.item.create({
    data: {
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
  // TASK 57: EMPLOYEES
  // =============================
  const employee = await prisma.employee.create({
    data: {
      companyId: company.id,
      name: 'Leanid Kanoplich',
      code: 'DIR-01',
      position: 'Director',
      department: 'Management',
      email: 'leanid@solar.com',
      isActive: true,
    },
  });

  const manager = await prisma.employee.create({
    data: {
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
  // TASK 57: WAREHOUSES
  // =============================
  const warehouseMain = await prisma.warehouse.create({
    data: {
      companyId: company.id,
      name: 'Main',
      code: 'WH-MAIN',
      isDefault: true,
      isActive: true,
      address: 'Hamburg, Germany',
      responsibleEmployeeId: employee.id,
    },
  });

  const warehouseGoods = await prisma.warehouse.create({
    data: {
      companyId: company.id,
      name: 'Goods',
      code: 'WH-GOODS',
      isDefault: false,
      isActive: true,
    },
  });

  console.log('  ✓ Warehouses: Main (default), Goods');

  // =============================
  // TASK 57: OPERATION TYPES (SKR03)
  // =============================
  const opPurchaseGoods = await prisma.operationType.create({
    data: {
      companyId: company.id,
      name: 'Purchase goods',
      code: 'PIRK',
      module: 'PURCHASE',
      debitAccountCode: '3400',
      creditAccountCode: '1600',
      vatAccountCode: '1576',
      expenseAccountCode: '5000',
      affectsWarehouse: true,
      affectsVat: true,
      priority: 10,
    },
  });

  const opPurchaseServices = await prisma.operationType.create({
    data: {
      companyId: company.id,
      name: 'Purchase services',
      code: 'PPS',
      module: 'PURCHASE',
      debitAccountCode: '4900',
      creditAccountCode: '1600',
      vatAccountCode: '1576',
      affectsWarehouse: false,
      affectsVat: true,
      priority: 5,
    },
  });

  const opAdvance = await prisma.operationType.create({
    data: {
      companyId: company.id,
      name: 'Advance invoice',
      code: 'AV',
      module: 'PURCHASE',
      debitAccountCode: '1518',
      creditAccountCode: '1600',
      affectsWarehouse: false,
      affectsVat: false,
      priority: 1,
    },
  });

  const opSaleGoods = await prisma.operationType.create({
    data: {
      companyId: company.id,
      name: 'Sale goods',
      code: 'SALE',
      module: 'SALE',
      debitAccountCode: '1200',
      creditAccountCode: '8400',
      vatAccountCode: '1776',
      expenseAccountCode: '5800',
      affectsWarehouse: true,
      affectsVat: true,
      priority: 10,
    },
  });

  const opSaleServices = await prisma.operationType.create({
    data: {
      companyId: company.id,
      name: 'Sale services',
      code: 'SSVC',
      module: 'SALE',
      debitAccountCode: '1200',
      creditAccountCode: '8400',
      vatAccountCode: '1776',
      affectsWarehouse: false,
      affectsVat: true,
      priority: 5,
    },
  });

  console.log('  ✓ Operation Types: PIRK, PPS, AV, SALE, SSVC');

  // =============================
  // TASK 57: VAT RATES (German/EU)
  // =============================
  await prisma.vatRate.createMany({
    data: [
      {
        companyId: company.id,
        name: '19% Standard',
        rate: new Prisma.Decimal(19),
        code: 'PVM1',
        category: 'STANDARD',
        isDefault: true,
        isActive: true,
        effectiveFrom: new Date('2007-01-01'),
      },
      {
        companyId: company.id,
        name: '7% Reduced',
        rate: new Prisma.Decimal(7),
        code: 'PVM2',
        category: 'REDUCED',
        isDefault: false,
        isActive: true,
        effectiveFrom: new Date('2007-01-01'),
      },
      {
        companyId: company.id,
        name: '0% Export',
        rate: new Prisma.Decimal(0),
        code: 'PVM5',
        category: 'ZERO_EXPORT',
        isDefault: false,
        isActive: true,
      },
      {
        companyId: company.id,
        name: '0% Intra-community',
        rate: new Prisma.Decimal(0),
        code: 'PVM15',
        category: 'ZERO_INTRACOM',
        isDefault: false,
        isActive: true,
      },
      {
        companyId: company.id,
        name: 'Reverse Charge',
        rate: new Prisma.Decimal(0),
        code: 'PVM16',
        category: 'REVERSE_CHARGE',
        isDefault: false,
        isActive: true,
      },
      {
        companyId: company.id,
        name: 'No VAT',
        rate: new Prisma.Decimal(0),
        code: 'PVM100',
        category: 'NO_VAT',
        isDefault: false,
        isActive: true,
      },
    ],
  });

  console.log('  ✓ VAT Rates: 19%, 7%, 0% Export, 0% Intra, Reverse Charge, No VAT');

  // =============================
  // SALE DOCUMENT
  // =============================
  const sale = await prisma.saleDocument.create({
    data: {
      companyId: company.id,
      saleDate: new Date(),
      series: 'S',
      number: '0001',

      clientId: client.id,
      clientName: client.name,
      clientCode: client.code,

      warehouseName: 'Main',
      operationType: 'SALE',
      currencyCode: 'EUR',

      items: {
        create: [
          {
            itemName: item.name,
            itemCode: item.code,
            quantity: new Prisma.Decimal(10),
            priceWithoutVat: new Prisma.Decimal(100),
            vatRate: new Prisma.Decimal(19),
          },
        ],
      },
    },
  });

  // =============================
  // PURCHASE DOCUMENT
  // =============================
  const purchase = await prisma.purchaseDocument.create({
    data: {
      companyId: company.id,
      purchaseDate: new Date(),
      series: 'P',
      number: '0001',

      supplierId: supplier.id,
      supplierName: supplier.name,
      supplierCode: supplier.code,

      warehouseName: 'Main',
      operationType: 'PURCHASE',
      currencyCode: 'EUR',

      items: {
        create: [
          {
            itemName: item.name,
            itemCode: item.code,
            quantity: new Prisma.Decimal(5),
            priceWithoutVat: new Prisma.Decimal(80),
            vatRate: new Prisma.Decimal(19),
          },
        ],
      },
    },
  });

  // =============================
  // STOCK MOVEMENT
  // =============================
  await prisma.stockMovement.create({
    data: {
      companyId: company.id,
      warehouseName: 'Main',
      operationType: 'IN',
      documentDate: new Date(),
      series: 'SM',
      number: '0001',

      itemName: item.name,
      itemCode: item.code,
      quantity: new Prisma.Decimal(5),
      cost: new Prisma.Decimal(80),
      unitName: 'hours',

      direction: 'IN',
      documentType: 'PURCHASE',
      documentId: purchase.id,
    },
  });

  // =============================
  // BANK STATEMENT
  // =============================
  await prisma.bankStatement.create({
    data: {
      companyId: company.id,
      accountNumber: 'DE001234567890',
      currencyCode: 'EUR',
      period: new Date(),
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
  console.log('Client:', client.name, `(${client.code})`);
  console.log('Supplier:', supplier.name, `(${supplier.code})`);
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
