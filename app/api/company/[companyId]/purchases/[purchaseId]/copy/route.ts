// app/api/company/[companyId]/purchases/[purchaseId]/copy/route.ts
// ═══════════════════════════════════════════════════
// TASK 67 — migrated to requireCompanyContext
// ═══════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import {
  requireCompanyContext,
  companyContextErrorResponse,
} from '@/lib/auth/requireCompanyContext';

type RouteParams = {
  params: Promise<{ companyId: string; purchaseId: string }>;
};

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { companyId, tenantId } = await requireCompanyContext(request);
    const { purchaseId } = await params;


    const original = await prisma.purchaseDocument.findFirst({
      where: {
        id: purchaseId,
        companyId,
        company: { tenantId },
      },
      include: { items: true },
    });

    if (!original) {
      return NextResponse.json({ error: 'Purchase not found' }, { status: 404 });
    }

    // Generate next number in same series
    const lastInSeries = await prisma.purchaseDocument.findFirst({
      where: { companyId, series: original.series },
      orderBy: { number: 'desc' },
      select: { number: true },
    });

    const nextNumber = lastInSeries
      ? String(Number(lastInSeries.number) + 1).padStart(4, '0')
      : '0001';

    const copy = await prisma.purchaseDocument.create({
      data: {
        companyId,
        purchaseDate: new Date(),
        payUntil: original.payUntil,
        advancePaymentDate: original.advancePaymentDate,
        series: original.series,
        number: nextNumber,
        supplierName: original.supplierName,
        supplierCode: original.supplierCode,
        advanceEmployee: original.advanceEmployee,
        warehouseName: original.warehouseName,
        operationType: original.operationType,
        currencyCode: original.currencyCode,
        employeeName: original.employeeName,
        comments: `Copy of ${original.series}-${original.number}`,
        status: 'DRAFT',
        items: {
          create: original.items.map((item) => ({
            itemName: item.itemName,
            itemCode: item.itemCode,
            barcode: item.barcode,
            quantity: item.quantity,
            priceWithoutVat: item.priceWithoutVat,
            unitDiscount: item.unitDiscount,
            vatRate: item.vatRate,
            vatClassifier: item.vatClassifier,
            corAccountCode: item.corAccountCode,
            costCenter: item.costCenter,
            notes: item.notes,
          })),
        },
      },
      include: { items: true },
    });

    return NextResponse.json({ data: copy }, { status: 201 });
  } catch (error: unknown) {
    const errRes = companyContextErrorResponse(error); if (errRes) return errRes;

    if (error && typeof error === 'object' && 'code' in error && (error as { code: string }).code === 'P2002') {
      return NextResponse.json({ error: 'Document with this series/number already exists' }, { status: 409 });
    }

    const msg = error instanceof Error ? error.message : 'Unknown error';
    console.error('Copy purchase error:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
