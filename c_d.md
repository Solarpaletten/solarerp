Вижу скриншоты Site.pro (референс для UI) и ТЗ Task 43. У меня уже есть полный контекст из предыдущего анализа — SaleDocument, PurchaseDocument модели и Sales API. Приступаю.

**Ключевая архитектурная проблема:** Prisma требует уникальные имена для relation когда один и тот же Client используется в двух моделях. Нужны named relations.**1. Schema diff — SaleDocument + PurchaseDocument + Client (relation names):****2. Migration SQL:****3. Updated Sales API (POST with clientId snapshot):****4. Updated Purchase draft API (POST with supplierId snapshot):****5. Updated Purchase PUT (update with supplierId snapshot):**## Task 43 — Client FK Integration: 5 файлов

### Деплой карта

```bash
# ═══ 1. SCHEMA (3 изменения в prisma/schema.prisma) ═══

# 1a. SaleDocument — добавить после clientCode:
#   clientId   String?
#   client     Client?  @relation("SaleClient", fields: [clientId], references: [id], onDelete: Restrict)
#   @@index([companyId, clientId])

# 1b. PurchaseDocument — добавить после supplierCode:
#   supplierId String?
#   supplier   Client?  @relation("PurchaseSupplier", fields: [supplierId], references: [id], onDelete: Restrict)
#   @@index([companyId, supplierId])

# 1c. Client — добавить back-relations:
#   salesAsClient       SaleDocument[]     @relation("SaleClient")
#   purchasesAsSupplier PurchaseDocument[] @relation("PurchaseSupplier")

# ═══ 2. MIGRATION ═══
npx prisma migrate dev --name client_fk_integration

# ═══ 3. API FILES ═══
cp sales-route.ts         app/api/company/\[companyId\]/sales/route.ts
cp purchase-draft-route.ts app/api/company/\[companyId\]/purchases/draft/route.ts
cp purchase-id-route.ts   app/api/company/\[companyId\]/purchases/\[purchaseId\]/route.ts
```

### Архитектурный принцип — Snapshot

```
clientId → FK ссылка (для AR/AP запросов)
clientName → snapshot (бухгалтерская неизменяемость)
clientCode → snapshot (исторический документ)
```

Изменение Client в будущем НЕ меняет исторический документ.

### Smoke Test

1. Создать Client (POST `/clients`)
2. Создать SaleDocument с `clientId` → проверить: clientName заполнен автоматически
3. Создать PurchaseDocument с `supplierId` → проверить: supplierName заполнен
4. DELETE Client → 409 (FK Restrict)
5. Legacy режим (без clientId, только строки) → работает как раньше

### Бухгалтерский контроль ✅

- JournalEntry — НЕ тронут
- Posting Engine — НЕ тронут
- Stock Engine — НЕ тронут
- FIFO — НЕ тронут
- Seed — НЕ сломан (nullable FK)

1
// app/api/company/[companyId]/purchases/draft/route.ts
// Task 36 + 43: Create DRAFT Purchase Document
// Task 43: supplierId FK + snapshot fields

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireTenant } from '@/lib/auth/requireTenant';

type RouteParams = {
  params: Promise<{ companyId: string }>;
};

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { tenantId } = await requireTenant(request);
    const { companyId } = await params;

    const company = await prisma.company.findFirst({
      where: { id: companyId, tenantId },
      select: { id: true },
    });
    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    const body = await request.json();

    // Task 43: Resolve supplier via FK or legacy string
    let resolvedSupplierId: string | null = null;
    let resolvedSupplierName: string = body.supplierName || '';
    let resolvedSupplierCode: string | null = body.supplierCode || null;

    if (body.supplierId) {
      const supplier = await prisma.client.findFirst({
        where: { id: body.supplierId, companyId, company: { tenantId } },
        select: { id: true, name: true, code: true, isActive: true },
      });

      if (!supplier) {
        return NextResponse.json({ error: 'Supplier not found in this company' }, { status: 404 });
      }
      if (!supplier.isActive) {
        return NextResponse.json({ error: 'Supplier is deactivated' }, { status: 400 });
      }

      // Snapshot: freeze current supplier data
      resolvedSupplierId = supplier.id;
      resolvedSupplierName = supplier.name;
      resolvedSupplierCode = supplier.code;
    }

    // Generate next number
    const lastDoc = await prisma.purchaseDocument.findFirst({
      where: { companyId, series: 'P' },
      orderBy: { number: 'desc' },
      select: { number: true },
    });
    const nextNum = String(Number(lastDoc?.number || '0') + 1).padStart(4, '0');

    const draft = await prisma.purchaseDocument.create({
      data: {
        companyId,
        series: 'P',
        number: nextNum,
        purchaseDate: body.purchaseDate ? new Date(body.purchaseDate) : new Date(),
        supplierName: resolvedSupplierName || 'New Supplier',
        supplierCode: resolvedSupplierCode,
        supplierId: resolvedSupplierId,    // Task 43: FK
        warehouseName: body.warehouseName || 'Main',
        operationType: body.operationType || 'PURCHASE',
        currencyCode: body.currencyCode || 'EUR',
        status: 'DRAFT',
        comments: body.comments || null,
      },
    });

    return NextResponse.json({ data: draft }, { status: 201 });
  } catch (error: unknown) {
    if (error instanceof Response) return error;

    if (error && typeof error === 'object' && 'code' in error && (error as { code: string }).code === 'P2002') {
      return NextResponse.json({ error: 'Document number conflict' }, { status: 409 });
    }

    const msg = error instanceof Error ? error.message : 'Unknown error';
    console.error('Create draft error:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
2
// app/api/company/[companyId]/purchases/[purchaseId]/route.ts
// Task 37A: GET | Task 38B + 43: PUT (with supplierId FK)

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireTenant } from '@/lib/auth/requireTenant';

type RouteParams = {
  params: Promise<{ companyId: string; purchaseId: string }>;
};

// GET - Read single document
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { tenantId } = await requireTenant(request);
    const { companyId, purchaseId } = await params;

    const company = await prisma.company.findFirst({
      where: { id: companyId, tenantId },
      select: { id: true },
    });
    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    const purchase = await prisma.purchaseDocument.findFirst({
      where: { id: purchaseId, companyId, company: { tenantId } },
      include: { items: { orderBy: { id: 'asc' } } },
    });

    if (!purchase) {
      return NextResponse.json({ error: 'Purchase not found' }, { status: 404 });
    }

    return NextResponse.json({ data: purchase });
  } catch (error: unknown) {
    if (error instanceof Response) return error;
    const msg = error instanceof Error ? error.message : 'Unknown error';
    console.error('Get purchase error:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// PUT - Update DRAFT document (with validation)
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { tenantId } = await requireTenant(request);
    const { companyId, purchaseId } = await params;

    const company = await prisma.company.findFirst({
      where: { id: companyId, tenantId },
      select: { id: true },
    });
    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    const body = await request.json();

    // Validation BEFORE transaction
    if (body.purchaseDate) {
      const d = new Date(body.purchaseDate);
      if (isNaN(d.getTime())) {
        return NextResponse.json({ error: 'INVALID_PURCHASE_DATE' }, { status: 400 });
      }
    }

    if (Array.isArray(body.items) && body.items.length > 0) {
      for (let i = 0; i < body.items.length; i++) {
        const item = body.items[i];
        if (!item.itemName || String(item.itemName).trim().length === 0) {
          return NextResponse.json({ error: `ITEM_NAME_REQUIRED (row ${i + 1})` }, { status: 400 });
        }
        if (Number(item.quantity) <= 0 || isNaN(Number(item.quantity))) {
          return NextResponse.json({ error: `ITEM_QTY_MUST_BE_POSITIVE (row ${i + 1})` }, { status: 400 });
        }
        if (Number(item.priceWithoutVat) < 0 || isNaN(Number(item.priceWithoutVat))) {
          return NextResponse.json({ error: `ITEM_PRICE_MUST_BE_NON_NEGATIVE (row ${i + 1})` }, { status: 400 });
        }
        if (item.vatRate != null) {
          const vr = Number(item.vatRate);
          if (isNaN(vr) || vr < 0 || vr > 100) {
            return NextResponse.json({ error: `ITEM_VAT_RATE_INVALID (row ${i + 1})` }, { status: 400 });
          }
        }
      }

      if (!body.supplierName || String(body.supplierName).trim().length === 0) {
        // Allow if supplierId is being used (Task 43)
        if (!body.supplierId) {
          return NextResponse.json({ error: 'SUPPLIER_NAME_REQUIRED_WITH_ITEMS' }, { status: 400 });
        }
      }
      if (!body.warehouseName || String(body.warehouseName).trim().length === 0) {
        return NextResponse.json({ error: 'WAREHOUSE_NAME_REQUIRED_WITH_ITEMS' }, { status: 400 });
      }
    }

    // Task 43: Resolve supplier FK if provided
    let resolvedSupplierId: string | undefined = undefined;
    let resolvedSupplierName: string | undefined = undefined;
    let resolvedSupplierCode: string | undefined = undefined;

    if (body.supplierId !== undefined) {
      if (body.supplierId === null) {
        // Explicitly clearing FK
        resolvedSupplierId = undefined; // will set to null below
      } else {
        const supplier = await prisma.client.findFirst({
          where: { id: body.supplierId, companyId, company: { tenantId } },
          select: { id: true, name: true, code: true, isActive: true },
        });

        if (!supplier) {
          return NextResponse.json({ error: 'Supplier not found in this company' }, { status: 404 });
        }
        if (!supplier.isActive) {
          return NextResponse.json({ error: 'Supplier is deactivated' }, { status: 400 });
        }

        // Snapshot: freeze supplier data
        resolvedSupplierId = supplier.id;
        resolvedSupplierName = supplier.name;
        resolvedSupplierCode = supplier.code ?? undefined;
      }
    }

    // Transaction
    const result = await prisma.$transaction(async (tx) => {
      const purchase = await tx.purchaseDocument.findFirst({
        where: { id: purchaseId, companyId, company: { tenantId } },
        select: { id: true, status: true },
      });

      if (!purchase) throw new Error('PURCHASE_NOT_FOUND');
      if (purchase.status !== 'DRAFT') throw new Error('ONLY_DRAFT_EDITABLE');

      // Build update data
      const updateData: Record<string, unknown> = {};
      if (body.purchaseDate) updateData.purchaseDate = new Date(body.purchaseDate);
      if (body.warehouseName !== undefined) updateData.warehouseName = body.warehouseName;
      if (body.currencyCode !== undefined) updateData.currencyCode = body.currencyCode;
      if (body.operationType !== undefined) updateData.operationType = body.operationType;
      if (body.comments !== undefined) updateData.comments = body.comments;

      // Task 43: supplier resolution
      if (resolvedSupplierId !== undefined) {
        updateData.supplierId = resolvedSupplierId;
        if (resolvedSupplierName) updateData.supplierName = resolvedSupplierName;
        if (resolvedSupplierCode !== undefined) updateData.supplierCode = resolvedSupplierCode;
      } else {
        // Legacy mode: string fields directly
        if (body.supplierName !== undefined) updateData.supplierName = body.supplierName;
        if (body.supplierCode !== undefined) updateData.supplierCode = body.supplierCode;
      }

      await tx.purchaseDocument.update({
        where: { id: purchaseId },
        data: updateData,
      });

      if (Array.isArray(body.items)) {
        await tx.purchaseItem.deleteMany({ where: { purchaseId } });

        if (body.items.length > 0) {
          await tx.purchaseItem.createMany({
            data: body.items.map((item: {
              itemName: string; itemCode?: string; quantity: number;
              priceWithoutVat: number; vatRate?: number;
            }) => ({
              purchaseId,
              itemName: String(item.itemName).trim(),
              itemCode: item.itemCode || null,
              quantity: Number(item.quantity),
              priceWithoutVat: Number(item.priceWithoutVat),
              vatRate: item.vatRate != null ? Number(item.vatRate) : null,
            })),
          });
        }
      }

      return tx.purchaseDocument.findUniqueOrThrow({
        where: { id: purchaseId },
        include: { items: { orderBy: { id: 'asc' } } },
      });
    });

    return NextResponse.json({ data: result });
  } catch (error: unknown) {
    if (error instanceof Response) return error;
    const msg = error instanceof Error ? error.message : 'Unknown error';

    if (msg === 'PURCHASE_NOT_FOUND') return NextResponse.json({ error: 'Purchase not found' }, { status: 404 });
    if (msg === 'ONLY_DRAFT_EDITABLE') return NextResponse.json({ error: 'Only DRAFT documents can be edited' }, { status: 400 });

    console.error('Update purchase error:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
3
// app/api/company/[companyId]/sales/route.ts
// Task 22 + 34 + 35 + 43: Sales API
// Task 43: clientId FK + snapshot fields

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireTenant } from '@/lib/auth/requireTenant';
import { createJournalEntry } from '@/lib/accounting/journalService';
import { assertPeriodOpen } from '@/lib/accounting/periodLock';
import { createStockMovement } from '@/lib/accounting/stockService';
import { allocateFifoLots } from '@/lib/accounting/fifoService';
import { resolveFifoSaleAccounts, VatMode } from '@/lib/accounting/accountMapping';
import Decimal from 'decimal.js';

type RouteParams = {
  params: Promise<{ companyId: string }>;
};

async function verifyCompanyOwnership(companyId: string, tenantId: string) {
  const company = await prisma.company.findFirst({
    where: { id: companyId, tenantId },
    select: { id: true },
  });
  return company !== null;
}

// GET /api/company/[companyId]/sales
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { tenantId } = await requireTenant(request);
    const { companyId } = await params;

    const isOwner = await verifyCompanyOwnership(companyId, tenantId);
    if (!isOwner) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    const sales = await prisma.saleDocument.findMany({
      where: { companyId, company: { tenantId } },
      include: { items: true },
      orderBy: { saleDate: 'desc' },
    });

    return NextResponse.json({ data: sales, count: sales.length });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error('List sales error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/company/[companyId]/sales
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { tenantId } = await requireTenant(request);
    const { companyId } = await params;

    const isOwner = await verifyCompanyOwnership(companyId, tenantId);
    if (!isOwner) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    const body = await request.json();

    const {
      saleDate, series, number: docNumber,
      clientName: rawClientName, warehouseName,
      operationType, currencyCode, items,
    } = body;

    // Task 43: Resolve client via FK or legacy string
    let resolvedClientId: string | null = null;
    let resolvedClientName: string = rawClientName || '';
    let resolvedClientCode: string | null = body.clientCode || null;

    if (body.clientId) {
      const client = await prisma.client.findFirst({
        where: { id: body.clientId, companyId, company: { tenantId } },
        select: { id: true, name: true, code: true, isActive: true },
      });

      if (!client) {
        return NextResponse.json({ error: 'Client not found in this company' }, { status: 404 });
      }
      if (!client.isActive) {
        return NextResponse.json({ error: 'Client is deactivated' }, { status: 400 });
      }

      // Snapshot: freeze current client data into document
      resolvedClientId = client.id;
      resolvedClientName = client.name;
      resolvedClientCode = client.code;
    }

    if (!saleDate || !series || !docNumber || !resolvedClientName || !warehouseName || !operationType || !currencyCode) {
      return NextResponse.json({ error: 'Missing required sale fields' }, { status: 400 });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'Sale must have at least one item' }, { status: 400 });
    }

    const result = await prisma.$transaction(async (tx) => {
      await assertPeriodOpen(tx, { companyId, date: new Date(saleDate) });

      const vatMode: VatMode = body.vatMode || 'VAT_19';
      const accounts = await resolveFifoSaleAccounts(tx, companyId, vatMode);

      const sale = await tx.saleDocument.create({
        data: {
          companyId,
          saleDate: new Date(saleDate),
          payUntil: body.payUntil ? new Date(body.payUntil) : null,
          accountingDate: body.accountingDate ? new Date(body.accountingDate) : null,
          series, number: docNumber,
          clientName: resolvedClientName,
          clientCode: resolvedClientCode,
          clientId: resolvedClientId,       // Task 43: FK
          payerName: body.payerName || null,
          payerCode: body.payerCode || null,
          unloadAddress: body.unloadAddress || null,
          unloadCity: body.unloadCity || null,
          warehouseName, operationType, currencyCode,
          employeeName: body.employeeName || null,
          comments: body.comments || null,
          debitAccountId: accounts.arAccountId,
          creditAccountId: accounts.revenueAccountId,
          items: {
            create: items.map((item: {
              itemName: string; itemCode?: string; barcode?: string;
              quantity: number; priceWithoutVat: number; unitDiscount?: number;
              vatRate?: number; vatClassifier?: string;
              salesAccountCode?: string; expenseAccountCode?: string; costCenter?: string;
            }) => ({
              itemName: item.itemName,
              itemCode: item.itemCode || null,
              barcode: item.barcode || null,
              quantity: item.quantity,
              priceWithoutVat: item.priceWithoutVat,
              unitDiscount: item.unitDiscount || null,
              vatRate: item.vatRate || null,
              vatClassifier: item.vatClassifier || null,
              salesAccountCode: item.salesAccountCode || null,
              expenseAccountCode: item.expenseAccountCode || null,
              costCenter: item.costCenter || null,
            })),
          },
        },
        include: { items: true },
      });

      let totalCogs = new Decimal(0);
      for (const item of sale.items) {
        const itemCode = item.itemCode || item.itemName;
        const fifoResult = await allocateFifoLots(tx, {
          companyId, warehouseName: sale.warehouseName,
          itemCode, itemName: item.itemName,
          quantity: item.quantity, documentType: 'SALE',
          documentId: sale.id, saleItemId: item.id,
        });
        totalCogs = totalCogs.plus(fifoResult.totalCogs);
      }

      const totalRevenue = items.reduce(
        (sum: number, item: { quantity: number; priceWithoutVat: number }) =>
          sum + Number(item.quantity) * Number(item.priceWithoutVat), 0
      );

      if (totalRevenue <= 0) throw new Error('Total revenue must be positive');

      const journalLines = [
        { accountId: accounts.arAccountId, debit: totalRevenue, credit: 0 },
        { accountId: accounts.revenueAccountId, debit: 0, credit: totalRevenue },
        ...(totalCogs.gt(0) ? [
          { accountId: accounts.cogsAccountId, debit: Number(totalCogs.toFixed(2)), credit: 0 },
          { accountId: accounts.inventoryAccountId, debit: 0, credit: Number(totalCogs.toFixed(2)) },
        ] : []),
      ];

      const journalEntry = await createJournalEntry(tx, {
        companyId, date: new Date(saleDate),
        documentType: 'SALE', documentId: sale.id, lines: journalLines,
      });

      for (const item of sale.items) {
        await createStockMovement({
          tx, companyId, warehouseName: sale.warehouseName,
          itemName: item.itemName, itemCode: item.itemCode || item.itemName,
          quantity: Number(item.quantity), cost: Number(item.priceWithoutVat),
          direction: 'OUT', documentType: 'SALE', documentId: sale.id,
          documentDate: sale.saleDate, series: sale.series, number: docNumber,
        });
      }

      return { sale, journalEntry, totalCogs: Number(totalCogs.toFixed(2)) };
    });

    return NextResponse.json({
      data: result.sale,
      journal: { id: result.journalEntry.id, linesCount: result.journalEntry.lines.length },
      cogs: result.totalCogs,
    }, { status: 201 });
  } catch (error: unknown) {
    if (error instanceof Response) return error;

    if (error && typeof error === 'object' && 'code' in error && (error as { code: string }).code === 'P2002') {
      return NextResponse.json({ error: 'Sale with this series/number already exists' }, { status: 409 });
    }

    const message = error instanceof Error ? error.message : 'Internal server error';
    if (message.startsWith('INSUFFICIENT_STOCK') || message.startsWith('FIFO_ALLOCATION_INCOMPLETE')) {
      return NextResponse.json({ error: message }, { status: 409 });
    }
    if (message.startsWith('ACCOUNT_CODE_NOT_FOUND')) {
      return NextResponse.json({ error: message }, { status: 400 });
    }

    console.error('Create sale error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
4
// ═══════════════════════════════════════════════════
// Task 43: Schema Changes — Client FK Integration
// ═══════════════════════════════════════════════════
//
// INSTRUCTIONS:
// 1. Add clientId + relation to SaleDocument
// 2. Add supplierId + relation to PurchaseDocument
// 3. Add named back-relations in Client model
// 4. Run: npx prisma migrate dev --name client_fk_integration
//
// ─── IMPORTANT: Named relations ─────────────────
// Prisma requires unique relation names when one model
// (Client) is referenced from multiple other models.
// We use: "SaleClient" and "PurchaseSupplier"

// ═══════════════════════════════════════════════════
// CHANGE 1: SaleDocument — add after clientCode field
// ═══════════════════════════════════════════════════
//
// BEFORE (existing fields stay):
//   clientName String
//   clientCode String?
//
// ADD AFTER clientCode:
//   clientId   String?
//   client     Client?  @relation("SaleClient", fields: [clientId], references: [id], onDelete: Restrict)
//
// ADD to indexes section (before @@map):
//   @@index([companyId, clientId])

// Full SaleDocument model after change:
// ──────────────────────────────────────

model SaleDocument {
  id        String @id @default(cuid())
  companyId String

  saleDate       DateTime
  payUntil       DateTime?
  accountingDate DateTime?
  lockedAt       DateTime?

  series String
  number String

  clientName String
  clientCode String?
  clientId   String?                // ← Task 43: FK
  payerName  String?
  payerCode  String?

  unloadAddress String?
  unloadCity    String?
  warehouseName String

  operationType String
  currencyCode  String
  employeeName  String?
  status        String?
  comments      String?
  debitAccountId  String?
  creditAccountId String?

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  items   SaleItem[]
  company Company    @relation(fields: [companyId], references: [id])
  client  Client?    @relation("SaleClient", fields: [clientId], references: [id], onDelete: Restrict)  // ← Task 43

  @@unique([companyId, series, number])
  @@index([companyId])
  @@index([saleDate])
  @@index([companyId, clientId])    // ← Task 43
  @@map("sale_documents")
}


// ═══════════════════════════════════════════════════
// CHANGE 2: PurchaseDocument — add after supplierCode
// ═══════════════════════════════════════════════════
//
// BEFORE (existing fields stay):
//   supplierName    String
//   supplierCode    String?
//
// ADD AFTER supplierCode:
//   supplierId      String?
//   supplier        Client?  @relation("PurchaseSupplier", fields: [supplierId], references: [id], onDelete: Restrict)
//
// ADD to indexes:
//   @@index([companyId, supplierId])

// Full PurchaseDocument model after change:
// ──────────────────────────────────────────

model PurchaseDocument {
  id        String @id @default(cuid())
  companyId String

  purchaseDate       DateTime
  payUntil           DateTime?
  advancePaymentDate DateTime?

  series String
  number String

  supplierName    String
  supplierCode    String?
  supplierId      String?           // ← Task 43: FK
  advanceEmployee String?

  warehouseName String

  operationType String
  currencyCode  String
  employeeName  String?
  comments      String?
  status        String?
  debitAccountId  String?
  creditAccountId String?

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  items    PurchaseItem[]
  company  Company        @relation(fields: [companyId], references: [id])
  supplier Client?        @relation("PurchaseSupplier", fields: [supplierId], references: [id], onDelete: Restrict)  // ← Task 43

  @@unique([companyId, series, number])
  @@index([companyId])
  @@index([purchaseDate])
  @@index([companyId, supplierId])  // ← Task 43
  @@map("purchase_documents")
}


// ═══════════════════════════════════════════════════
// CHANGE 3: Client model — add back-relations
// ═══════════════════════════════════════════════════
//
// ADD inside Client model (after company relation):
//
//   salesAsClient     SaleDocument[]     @relation("SaleClient")
//   purchasesAsSupplier PurchaseDocument[] @relation("PurchaseSupplier")

// Updated Client model (only showing relation section):
// ─────────────────────────────────────────────────────

//  company Company @relation(fields: [companyId], references: [id])
//
//  // Task 43: Back-relations for FK integration
//  salesAsClient       SaleDocument[]     @relation("SaleClient")
//  purchasesAsSupplier PurchaseDocument[] @relation("PurchaseSupplier")
//
//  @@unique([companyId, code])
//  @@index([companyId])
//  @@index([companyId, vatCode])
//  @@map("clients")
5
-- Task 43: Client FK Integration
-- Phase 1: Safe addition (nullable, no backfill)
-- No data loss. No NOT NULL. No breaking changes.

-- 1. Add clientId to SaleDocument
ALTER TABLE "sale_documents" ADD COLUMN "clientId" TEXT;

-- 2. Add supplierId to PurchaseDocument
ALTER TABLE "purchase_documents" ADD COLUMN "supplierId" TEXT;

-- 3. FK: SaleDocument.clientId -> Client.id (RESTRICT)
ALTER TABLE "sale_documents"
  ADD CONSTRAINT "sale_documents_clientId_fkey"
  FOREIGN KEY ("clientId") REFERENCES "clients"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- 4. FK: PurchaseDocument.supplierId -> Client.id (RESTRICT)
ALTER TABLE "purchase_documents"
  ADD CONSTRAINT "purchase_documents_supplierId_fkey"
  FOREIGN KEY ("supplierId") REFERENCES "clients"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- 5. Composite indexes for AR/AP queries
CREATE INDEX "sale_documents_companyId_clientId_idx"
  ON "sale_documents"("companyId", "clientId");

CREATE INDEX "purchase_documents_companyId_supplierId_idx"
  ON "purchase_documents"("companyId", "supplierId");

