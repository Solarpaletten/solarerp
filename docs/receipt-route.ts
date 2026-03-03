// app/api/company/[companyId]/purchases/[purchaseId]/receipt/route.ts
// ═══════════════════════════════════════════════════
// Task 41.7: Purchase Receipt (Goods Received)
// ═══════════════════════════════════════════════════
// Returns structured data for warehouse receipt view/print

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireTenant } from '@/lib/auth/requireTenant';

type RouteParams = {
  params: Promise<{ companyId: string; purchaseId: string }>;
};

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { tenantId } = await requireTenant(request);
    const { companyId, purchaseId } = await params;

    const company = await prisma.company.findFirst({
      where: { id: companyId, tenantId },
      select: { id: true, name: true },
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

    if (purchase.status !== 'POSTED' && purchase.status !== 'CANCELLED') {
      return NextResponse.json({ error: 'Receipt only available for posted documents' }, { status: 400 });
    }

    // Build receipt data
    const items = purchase.items.map((item, idx) => ({
      line: idx + 1,
      itemName: item.itemName,
      itemCode: item.itemCode,
      quantity: Number(item.quantity),
      unitPrice: Number(item.priceWithoutVat),
      vatRate: item.vatRate ? Number(item.vatRate) : 0,
      netTotal: Number(item.quantity) * Number(item.priceWithoutVat),
    }));

    const netTotal = items.reduce((s, i) => s + i.netTotal, 0);
    const vatTotal = items.reduce((s, i) => s + i.netTotal * (i.vatRate / 100), 0);

    return NextResponse.json({
      receipt: {
        companyName: company.name,
        documentNumber: `${purchase.series}-${purchase.number}`,
        documentDate: purchase.purchaseDate,
        supplierName: purchase.supplierName,
        supplierCode: purchase.supplierCode,
        warehouseName: purchase.warehouseName,
        currencyCode: purchase.currencyCode,
        status: purchase.status,
        items,
        totals: {
          netTotal,
          vatTotal,
          grossTotal: netTotal + vatTotal,
          itemCount: items.length,
          totalQuantity: items.reduce((s, i) => s + i.quantity, 0),
        },
        meta: {
          type: 'GOODS_RECEIVED',
          generatedAt: new Date().toISOString(),
        },
      },
    });
  } catch (error: unknown) {
    if (error instanceof Response) return error;
    const msg = error instanceof Error ? error.message : 'Unknown error';
    console.error('Get receipt error:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
