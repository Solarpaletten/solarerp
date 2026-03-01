// app/api/company/[companyId]/purchases/draft/route.ts
// ═══════════════════════════════════════════════════
// Task 38A: Create Draft Purchase Document
// ═══════════════════════════════════════════════════

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

    // Generate next number in P series
    const lastDoc = await prisma.purchaseDocument.findFirst({
      where: { companyId, series: 'P' },
      orderBy: { number: 'desc' },
      select: { number: true },
    });

    const nextNumber = lastDoc
      ? String(Number(lastDoc.number) + 1).padStart(4, '0')
      : '0001';

    // Create minimal DRAFT — no journal, no stock, no items
    const draft = await prisma.purchaseDocument.create({
      data: {
        companyId,
        purchaseDate: new Date(),
        series: 'P',
        number: nextNumber,
        supplierName: '',
        warehouseName: 'Main',
        operationType: 'PURCHASE',
        currencyCode: 'EUR',
        status: 'DRAFT',
      },
    });

    return NextResponse.json({ data: draft }, { status: 201 });
  } catch (error: unknown) {
    if (error instanceof Response) return error;

    if (error && typeof error === 'object' && 'code' in error && (error as { code: string }).code === 'P2002') {
      return NextResponse.json({ error: 'Document with this series/number already exists' }, { status: 409 });
    }

    const msg = error instanceof Error ? error.message : 'Unknown error';
    console.error('Create draft error:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
