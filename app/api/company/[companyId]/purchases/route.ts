// app/api/company/[companyId]/purchases/[purchaseId]/route.ts
// ═══════════════════════════════════════════════════
// Task 37A: GET + Task 38B: PUT Single Purchase Document
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
      include: {
        items: { orderBy: { id: 'asc' } },
      },
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

// ─── PUT — Update DRAFT document ────────────────
// NO journal entry, NO stock movement, NO FIFO.
// Only DRAFT documents can be updated.
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

    const result = await prisma.$transaction(async (tx) => {
      // 1. Find and verify document
      const purchase = await tx.purchaseDocument.findFirst({
        where: {
          id: purchaseId,
          companyId,
          company: { tenantId },
        },
        select: { id: true, status: true },
      });

      if (!purchase) {
        throw new Error('PURCHASE_NOT_FOUND');
      }

      if (purchase.status !== 'DRAFT') {
        throw new Error('ONLY_DRAFT_EDITABLE');
      }

      // 2. Update header fields
      const updated = await tx.purchaseDocument.update({
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

      // 3. Replace items: delete all → create new
      if (Array.isArray(body.items)) {
        await tx.purchaseItem.deleteMany({
          where: { purchaseId },
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
                itemName: item.itemName || '',
                itemCode: item.itemCode || null,
                quantity: Number(item.quantity) || 0,
                priceWithoutVat: Number(item.priceWithoutVat) || 0,
                vatRate: item.vatRate != null ? Number(item.vatRate) : null,
              })
            ),
          });
        }
      }

      // 4. Re-fetch with items
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
      return NextResponse.json(
        { error: 'Only DRAFT documents can be edited' },
        { status: 400 }
      );
    }

    console.error('Update purchase error:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
