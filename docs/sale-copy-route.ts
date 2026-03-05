// app/api/company/[companyId]/sales/[saleId]/copy/route.ts
// Task 50: Copy sale document → new draft

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireTenant } from '@/lib/auth/requireTenant';

type RouteParams = { params: Promise<{ companyId: string; saleId: string }> };
const MAX_RETRIES = 5;

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { tenantId } = await requireTenant(request);
    const { companyId, saleId } = await params;

    const source = await prisma.saleDocument.findFirst({
      where: { id: saleId, companyId, company: { tenantId } },
      include: { items: true },
    });
    if (!source) return NextResponse.json({ error: 'Source sale not found' }, { status: 404 });

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        const lastDoc = await prisma.saleDocument.findFirst({
          where: { companyId, series: 'S' }, orderBy: { number: 'desc' }, select: { number: true },
        });
        const nextNum = String(Number(lastDoc?.number || '0') + 1).padStart(4, '0');

        const copy = await prisma.saleDocument.create({
          data: {
            companyId, series: 'S', number: nextNum,
            saleDate: new Date(), status: 'DRAFT',
            clientName: source.clientName, clientCode: source.clientCode, clientId: source.clientId,
            warehouseName: source.warehouseName, operationType: source.operationType,
            currencyCode: source.currencyCode, employeeName: source.employeeName,
            comments: source.comments,
            items: {
              create: source.items.map(i => ({
                itemName: i.itemName, itemCode: i.itemCode, quantity: i.quantity,
                priceWithoutVat: i.priceWithoutVat, vatRate: i.vatRate,
              })),
            },
          },
          include: { items: true },
        });

        return NextResponse.json({ data: copy }, { status: 201 });
      } catch (err: unknown) {
        if (err && typeof err === 'object' && 'code' in err && (err as { code: string }).code === 'P2002') {
          if (attempt < MAX_RETRIES - 1) continue;
          return NextResponse.json({ error: 'Number conflict' }, { status: 409 });
        }
        throw err;
      }
    }
    return NextResponse.json({ error: 'Unexpected' }, { status: 500 });
  } catch (error: unknown) {
    if (error instanceof Response) return error;
    const msg = error instanceof Error ? error.message : 'Unknown error';
    console.error('Copy sale error:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
