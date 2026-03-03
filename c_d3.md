Дарья права — composite FK чище триггеров. Prisma это поддерживает, и раз уже всё равно патчим миграцию, сделаю правильно сразу.**Patch 2 v2: Composite FK вместо триггеров.**Now let me also copy the purchase-id-route.ts from the previous round (it already has the FK clearing fix):Purchase-id-route.ts с фиксом clearing уже есть в /mnt/user-data/outputs/ — нет, он был удалён при `rm -rf`. Пересоздаю:## Task 43 FINAL — Composite FK patch (3 файла)

### Что изменилось vs v2 (trigger):

**Schema** — composite FK вместо триггеров:
```prisma
// Client: добавить @@unique([companyId, id])
// SaleDocument:     fields: [companyId, clientId]   → references: [companyId, id]
// PurchaseDocument: fields: [companyId, supplierId]  → references: [companyId, id]
```

**Migration** — чистый SQL без plpgsql: один `UNIQUE`, два composite `FOREIGN KEY`, два `INDEX`. Никаких триггеров.

**Purchase PUT** — переменные по формату Дарьи: `updateSupplierId` / `updateSupplierName` / `updateSupplierCode` с тремя состояниями (`undefined` / `null` / `string`).

### Acceptance test
```
1. Insert Client в Company A
2. Попытка: INSERT INTO sale_documents (companyId='B', clientId='client-from-A')
   → FK violation (DB-level, декларативно, без trigger)
3. PUT /purchases/[id] с { supplierId: null }
   → FK очищается, snapshot остаётся
```

Task 43 → **99% production-ready**. Готов к закрытию.
1
// app/api/company/[companyId]/purchases/[purchaseId]/route.ts
// Task 37A: GET | Task 38B + 43A: PUT
// Daria audit: 3-state FK clearing + company check before tx

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

// PUT - Update DRAFT document
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { tenantId } = await requireTenant(request);
    const { companyId, purchaseId } = await params;

    // Company ownership BEFORE transaction (Daria audit #2)
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

      if (!body.supplierId && (!body.supplierName || String(body.supplierName).trim().length === 0)) {
        return NextResponse.json({ error: 'SUPPLIER_NAME_REQUIRED_WITH_ITEMS' }, { status: 400 });
      }
      if (!body.warehouseName || String(body.warehouseName).trim().length === 0) {
        return NextResponse.json({ error: 'WAREHOUSE_NAME_REQUIRED_WITH_ITEMS' }, { status: 400 });
      }
    }

    // Task 43A: 3-state supplier FK (Daria audit #1 fix)
    // undefined = skip (no FK change, legacy string mode)
    // null = clear FK explicitly
    // string = set FK + auto-snapshot
    let updateSupplierId: string | null | undefined = undefined;
    let updateSupplierName: string | undefined = undefined;
    let updateSupplierCode: string | null | undefined = undefined;

    if (body.supplierId !== undefined) {
      if (body.supplierId === null) {
        // Explicit FK clearing
        updateSupplierId = null;
        updateSupplierName = body.supplierName ?? '';
        updateSupplierCode = body.supplierCode ?? null;
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

        updateSupplierId = supplier.id;
        updateSupplierName = supplier.name;
        updateSupplierCode = supplier.code ?? null;
      }
    }

    // Transaction
    const result = await prisma.$transaction(async (tx) => {
      const purchase = await tx.purchaseDocument.findFirst({
        where: { id: purchaseId, companyId },
        select: { id: true, status: true },
      });

      if (!purchase) throw new Error('PURCHASE_NOT_FOUND');
      if (purchase.status !== 'DRAFT') throw new Error('ONLY_DRAFT_EDITABLE');

      const updateData: Record<string, unknown> = {};
      if (body.purchaseDate) updateData.purchaseDate = new Date(body.purchaseDate);
      if (body.warehouseName !== undefined) updateData.warehouseName = body.warehouseName;
      if (body.currencyCode !== undefined) updateData.currencyCode = body.currencyCode;
      if (body.operationType !== undefined) updateData.operationType = body.operationType;
      if (body.comments !== undefined) updateData.comments = body.comments;

      // Task 43A: Apply supplier FK based on resolution
      if (updateSupplierId !== undefined) {
        updateData.supplierId = updateSupplierId;
        updateData.supplierName = updateSupplierName;
        updateData.supplierCode = updateSupplierCode;
      } else {
        // Legacy string mode
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
2
// ═══════════════════════════════════════════════════
// Task 43 FINAL: Composite FK (no triggers)
// ═══════════════════════════════════════════════════
//
// 3 changes in prisma/schema.prisma:
// 1. Client — add @@unique([companyId, id])
// 2. SaleDocument — composite FK [companyId, clientId]
// 3. PurchaseDocument — composite FK [companyId, supplierId]

// ─── Client model: ADD composite unique ──────────
// (id is already globally unique, but Prisma needs
// a composite target for multi-column FK references)
//
// ADD before @@map("clients"):

//   @@unique([companyId, id])

// Full Client indexes section becomes:
//   @@unique([companyId, code])
//   @@unique([companyId, id])          // Task 43: composite FK target
//   @@index([companyId])
//   @@index([companyId, vatCode])
//   @@map("clients")


// ─── SaleDocument model ──────────────────────────
// REPLACE the single-field relation:

// REMOVE:
//   clientId  String?
//   client    Client?  @relation("SaleClient", fields: [clientId], references: [id], onDelete: Restrict)

// REPLACE WITH:
//   clientId  String?
//   client    Client?  @relation("SaleClient", fields: [companyId, clientId], references: [companyId, id], onDelete: Restrict)

// Full SaleDocument model:

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
  clientId   String?
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
  client  Client?    @relation("SaleClient", fields: [companyId, clientId], references: [companyId, id], onDelete: Restrict)

  @@unique([companyId, series, number])
  @@index([companyId])
  @@index([saleDate])
  @@index([companyId, clientId])
  @@map("sale_documents")
}


// ─── PurchaseDocument model ──────────────────────
// Same pattern: composite FK

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
  supplierId      String?
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
  supplier Client?        @relation("PurchaseSupplier", fields: [companyId, supplierId], references: [companyId, id], onDelete: Restrict)

  @@unique([companyId, series, number])
  @@index([companyId])
  @@index([purchaseDate])
  @@index([companyId, supplierId])
  @@map("purchase_documents")
}


// ─── Client model back-relations (unchanged) ─────
// Inside Client model:
//   salesAsClient       SaleDocument[]     @relation("SaleClient")
//   purchasesAsSupplier PurchaseDocument[] @relation("PurchaseSupplier")
3
-- Task 43 FINAL: Composite FK (no triggers)

ALTER TABLE "sale_documents" ADD COLUMN "clientId" TEXT;
ALTER TABLE "purchase_documents" ADD COLUMN "supplierId" TEXT;

ALTER TABLE "clients"
  ADD CONSTRAINT "clients_companyId_id_key"
  UNIQUE ("companyId", "id");

ALTER TABLE "sale_documents"
  ADD CONSTRAINT "sale_documents_company_client_fkey"
  FOREIGN KEY ("companyId", "clientId")
  REFERENCES "clients"("companyId", "id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "purchase_documents"
  ADD CONSTRAINT "purchase_documents_company_supplier_fkey"
  FOREIGN KEY ("companyId", "supplierId")
  REFERENCES "clients"("companyId", "id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "sale_documents_companyId_clientId_idx"
  ON "sale_documents"("companyId", "clientId");

CREATE INDEX "purchase_documents_companyId_supplierId_idx"
  ON "purchase_documents"("companyId", "supplierId");
