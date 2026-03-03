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
