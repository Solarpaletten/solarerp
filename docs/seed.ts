import { PrismaClient, CompanyStatus, ClientLocation } from '@prisma/client';
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
  const client = await prisma.client.create({
    data: {
      companyId: company.id,
      name: 'Demo Client GmbH',
      shortName: 'DEMO',
      isJuridical: true,
      location: ClientLocation.EU,
      vatCode: 'DE987654321',
      email: 'client@demo.de',
      payWithinDays: 14,
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
      vatRate: 19,
      priceWithoutVat: 100,
      priceWithVat: 119,
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
      clientName: client.name,
      warehouseName: 'Main',
      operationType: 'SALE',
      currencyCode: 'EUR',
      items: {
        create: [
          {
            itemName: item.name,
            itemCode: item.code,
            quantity: 10,
            priceWithoutVat: 100,
            vatRate: 19,
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
      supplierName: 'Demo Supplier Ltd',
      warehouseName: 'Main',
      operationType: 'PURCHASE',
      currencyCode: 'EUR',
      items: {
        create: [
          {
            itemName: item.name,
            itemCode: item.code,
            quantity: 5,
            priceWithoutVat: 80,
            vatRate: 19,
          },
        ],
      },
    },
  });

  // =============================
  // STOCK MOVEMENT (Task 34: direction + documentType required)
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
      quantity: 5,
      cost: 80,
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
      amount: 1190,
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
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
