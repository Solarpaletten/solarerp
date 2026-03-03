Дарья права по обоим пунктам. Исправляю:
Баг 1 — clearing FK: Когда supplierId = null, FK не очищался. Исправлено.
Баг 3 — composite FK: Добавляю DB-level защиту от cross-company linking.Clean for patchesClean for patchesPatch 1: Fixed Purchase PUT route (clearing FK bug):Edited a file, created a fileEdited a file, created a filePatch 2: Migration with composite CHECK constraint:Created 2 files, ran a commandCreated 2 files, ran a commandПонял, жду сигнал. Файлы готовы — purchase-id-route.ts с фиксом clearing FK (пункт 1) и migration_fk_v2.sql с триггерами cross-company (пункт 3).Presented 2 filesPresented 2 filesПатч Task 43 v2 — 2 файла
Пункт 1 (clearing FK bug) — purchase-id-route.ts:

Три явных режима: set / clear / skip
supplierId = null → updateData.supplierId = null (теперь FK действительно очищается)
Snapshot (supplierName/supplierCode) сохраняется при clear — бухгалтерская история не теряется

Пункт 3 (cross-company DB guard) — migration_fk_v2.sql:

Два PostgreSQL trigger'а: trg_sale_client_company и trg_purchase_supplier_company
BEFORE INSERT OR UPDATE — блокируют привязку клиента из чужой компании на уровне БД
API-level защита остаётся (defense in depth), но теперь есть и DB-level

Пункт 2 — уже применён: company ownership проверяется ДО транзакции.
Пункт 4 (creditLimit) — отложен как следующий логический шаг (Task 44+).
Замена при деплое:
bash# Миграция (заменяет v1)
cp migration_fk_v2.sql prisma/migrations/.../migration.sql

# API (заменяет v1)
cp purchase-id-route.ts app/api/company/[companyId]/purchases/[purchaseId]/route.tsPurchase id routeTS DownloadMigration fk v2Code · SQL DownloadDownload all

1
-- Task 43 v2: Client FK + Cross-Company Protection

ALTER TABLE "sale_documents" ADD COLUMN "clientId" TEXT;
ALTER TABLE "purchase_documents" ADD COLUMN "supplierId" TEXT;

ALTER TABLE "sale_documents"
  ADD CONSTRAINT "sale_documents_clientId_fkey"
  FOREIGN KEY ("clientId") REFERENCES "clients"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "purchase_documents"
  ADD CONSTRAINT "purchase_documents_supplierId_fkey"
  FOREIGN KEY ("supplierId") REFERENCES "clients"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "sale_documents_companyId_clientId_idx"
  ON "sale_documents"("companyId", "clientId");

CREATE INDEX "purchase_documents_companyId_supplierId_idx"
  ON "purchase_documents"("companyId", "supplierId");

CREATE OR REPLACE FUNCTION check_sale_client_company()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW."clientId" IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM "clients"
      WHERE "id" = NEW."clientId" AND "companyId" = NEW."companyId"
    ) THEN
      RAISE EXCEPTION 'Client company mismatch';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_sale_client_company
  BEFORE INSERT OR UPDATE ON "sale_documents"
  FOR EACH ROW EXECUTE FUNCTION check_sale_client_company();

CREATE OR REPLACE FUNCTION check_purchase_supplier_company()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW."supplierId" IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM "clients"
      WHERE "id" = NEW."supplierId" AND "companyId" = NEW."companyId"
    ) THEN
      RAISE EXCEPTION 'Supplier company mismatch';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_purchase_supplier_company
  BEFORE INSERT OR UPDATE ON "purchase_documents"
  FOR EACH ROW EXECUTE FUNCTION check_purchase_supplier_company();
2
// app/api/company/[companyId]/purchases/[purchaseId]/route.ts
// Task 37A: GET | Task 38B + 43: PUT (with supplierId FK)
// AUDIT FIX: FK clearing bug (item 1) + company check before tx (item 2)
// PATCH v2: Fix clearing FK bug (Daria audit #1)

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

    // Company ownership check BEFORE transaction (Daria audit #2)
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

      // Allow supplierName to be empty if supplierId is used
      if (!body.supplierId && (!body.supplierName || String(body.supplierName).trim().length === 0)) {
        return NextResponse.json({ error: 'SUPPLIER_NAME_REQUIRED_WITH_ITEMS' }, { status: 400 });
      }
      if (!body.warehouseName || String(body.warehouseName).trim().length === 0) {
        return NextResponse.json({ error: 'WAREHOUSE_NAME_REQUIRED_WITH_ITEMS' }, { status: 400 });
      }
    }

    // ── Task 43: Resolve supplier FK ────────────
    // Three modes:
    //   supplierId = "cxxx" → resolve + snapshot
    //   supplierId = null   → clear FK explicitly
    //   supplierId absent   → legacy string mode (no FK change)
    type SupplierFkMode = 'set' | 'clear' | 'skip';
    let supplierFkMode: SupplierFkMode = 'skip';
    let resolvedSupplierId: string | null = null;
    let resolvedSupplierName: string | null = null;
    let resolvedSupplierCode: string | null = null;

    if (body.supplierId !== undefined) {
      if (body.supplierId === null) {
        // ── FIX (Daria audit #1): explicitly clear FK ──
        supplierFkMode = 'clear';
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

        supplierFkMode = 'set';
        resolvedSupplierId = supplier.id;
        resolvedSupplierName = supplier.name;
        resolvedSupplierCode = supplier.code;
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

      // Build update data
      const updateData: Record<string, unknown> = {};
      if (body.purchaseDate) updateData.purchaseDate = new Date(body.purchaseDate);
      if (body.warehouseName !== undefined) updateData.warehouseName = body.warehouseName;
      if (body.currencyCode !== undefined) updateData.currencyCode = body.currencyCode;
      if (body.operationType !== undefined) updateData.operationType = body.operationType;
      if (body.comments !== undefined) updateData.comments = body.comments;

      // Task 43: Apply supplier FK based on mode
      if (supplierFkMode === 'set') {
        updateData.supplierId = resolvedSupplierId;
        updateData.supplierName = resolvedSupplierName;
        updateData.supplierCode = resolvedSupplierCode;
      } else if (supplierFkMode === 'clear') {
        // ── FIX: explicitly set FK to null ──
        updateData.supplierId = null;
        // Keep existing supplierName/supplierCode (snapshot stays)
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
