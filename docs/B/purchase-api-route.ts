// app/api/company/[companyId]/purchases/[purchaseId]/route.ts
// ═══════════════════════════════════════════════════
// Task 37A: GET | Task 38B+38B.A: PUT (with validation)
// ═══════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireTenant } from '@/lib/auth/requireTenant';

type RouteParams = {
  params: Promise<{ companyId: string; purchaseId: string }>;
};

// ─── GET — Read single document ─────────────────
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
      where: {
        id: purchaseId,
        companyId,
        company: { tenantId },
      },
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

// ─── PUT — Update DRAFT document (with validation) ─
// NO journal, NO stock, NO FIFO. Only DRAFT editable.
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

    // ── Validation BEFORE transaction ────────────
    // Validate date
    if (body.purchaseDate) {
      const d = new Date(body.purchaseDate);
      if (isNaN(d.getTime())) {
        return NextResponse.json({ error: 'INVALID_PURCHASE_DATE' }, { status: 400 });
      }
    }

    // Validate items if provided
    if (Array.isArray(body.items) && body.items.length > 0) {
      for (let i = 0; i < body.items.length; i++) {
        const item = body.items[i];
        if (!item.itemName || String(item.itemName).trim().length === 0) {
          return NextResponse.json(
            { error: `ITEM_NAME_REQUIRED (row ${i + 1})` },
            { status: 400 }
          );
        }
        if (Number(item.quantity) <= 0 || isNaN(Number(item.quantity))) {
          return NextResponse.json(
            { error: `ITEM_QTY_MUST_BE_POSITIVE (row ${i + 1})` },
            { status: 400 }
          );
        }
        if (Number(item.priceWithoutVat) < 0 || isNaN(Number(item.priceWithoutVat))) {
          return NextResponse.json(
            { error: `ITEM_PRICE_MUST_BE_NON_NEGATIVE (row ${i + 1})` },
            { status: 400 }
          );
        }
        if (item.vatRate != null) {
          const vr = Number(item.vatRate);
          if (isNaN(vr) || vr < 0 || vr > 100) {
            return NextResponse.json(
              { error: `ITEM_VAT_RATE_INVALID (row ${i + 1})` },
              { status: 400 }
            );
          }
        }
      }

      // If items present, header fields should be filled
      if (!body.supplierName || String(body.supplierName).trim().length === 0) {
        return NextResponse.json({ error: 'SUPPLIER_NAME_REQUIRED_WITH_ITEMS' }, { status: 400 });
      }
      if (!body.warehouseName || String(body.warehouseName).trim().length === 0) {
        return NextResponse.json({ error: 'WAREHOUSE_NAME_REQUIRED_WITH_ITEMS' }, { status: 400 });
      }
    }

    // ── Transaction ─────────────────────────────
    const result = await prisma.$transaction(async (tx) => {
      const purchase = await tx.purchaseDocument.findFirst({
        where: {
          id: purchaseId,
          companyId,
          company: { tenantId },
        },
        select: { id: true, status: true },
      });

      if (!purchase) throw new Error('PURCHASE_NOT_FOUND');
      if (purchase.status !== 'DRAFT') throw new Error('ONLY_DRAFT_EDITABLE');

      // Update header
      await tx.purchaseDocument.update({
        where: { id: purchaseId },
        data: {
          purchaseDate: body.purchaseDate ? new Date(body.purchaseDate) : undefined,
          supplierName: body.supplierName ?? undefined,
          supplierCode: body.supplierCode ?? undefined,
          warehouseName: body.warehouseName ?? undefined,
          currencyCode: body.currencyCode ?? undefined,
          operationType: body.operationType ?? undefined,
          comments: body.comments ?? undefined,
        },
      });

      // Replace items
      if (Array.isArray(body.items)) {
        await tx.purchaseItem.deleteMany({
          where: { purchaseDocumentId: purchaseId },
        });

        if (body.items.length > 0) {
          await tx.purchaseItem.createMany({
            data: body.items.map(
              (item: {
                itemName: string;
                itemCode?: string;
                quantity: number;
                priceWithoutVat: number;
                vatRate?: number;
              }) => ({
                purchaseDocumentId: purchaseId,
                itemName: String(item.itemName).trim(),
                itemCode: item.itemCode || null,
                quantity: Number(item.quantity),
                priceWithoutVat: Number(item.priceWithoutVat),
                vatRate: item.vatRate != null ? Number(item.vatRate) : null,
              })
            ),
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

    if (msg === 'PURCHASE_NOT_FOUND') {
      return NextResponse.json({ error: 'Purchase not found' }, { status: 404 });
    }
    if (msg === 'ONLY_DRAFT_EDITABLE') {
      return NextResponse.json({ error: 'Only DRAFT documents can be edited' }, { status: 400 });
    }

    console.error('Update purchase error:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
