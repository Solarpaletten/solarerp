// prisma/seed.ts
// 55_6 FINAL SEED SCRIPT 

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
      // ✅ CORRECT: Use company.connect (Prisma relation syntax)
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
      // ✅ CORRECT: Use company.connect (Prisma relation syntax)
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
  // SALE DOCUMENT
  // =============================
  const sale = await prisma.saleDocument.create({
    data: {
      companyId: company.id,
      saleDate: new Date(),
      series: 'S',
      number: '0001',

      // ✅ Link to Client (for foreign key integrity)
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

      // ✅ Link to Supplier (Client with role=SUPPLIER)
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
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
