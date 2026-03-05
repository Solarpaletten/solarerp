// app/api/company/[companyId]/purchases/route.ts
// ═══════════════════════════════════════════════════
// Task 45: Purchases API — GET with search/sort/pagination
// ═══════════════════════════════════════════════════
// Existing POST /draft stays in purchases/draft/route.ts
// This GET supports ERPGrid

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireTenant } from '@/lib/auth/requireTenant';

type RouteParams = {
  params: Promise<{ companyId: string }>;
};

const SORTABLE_FIELDS = ['purchaseDate', 'number', 'supplierName', 'status', 'warehouseName', 'currencyCode'];

export async function GET(request: NextRequest, { params }: RouteParams) {
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

    const url = new URL(request.url);
    const search = url.searchParams.get('search') || '';
    const statusFilter = url.searchParams.get('status') || '';
    const sortBy = url.searchParams.get('sortBy') || 'purchaseDate';
    const sortDir = url.searchParams.get('sortDir') === 'asc' ? 'asc' : 'desc';
    const page = Math.max(1, parseInt(url.searchParams.get('page') || '1'));
    const pageSize = Math.min(100, Math.max(1, parseInt(url.searchParams.get('pageSize') || '20')));

    const where: Record<string, unknown> = {
      companyId,
      company: { tenantId },
    };

    if (search) {
      where.OR = [
        { supplierName: { contains: search, mode: 'insensitive' } },
        { supplierCode: { contains: search, mode: 'insensitive' } },
        { number: { contains: search, mode: 'insensitive' } },
        { comments: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (statusFilter && ['DRAFT', 'POSTED', 'CANCELLED'].includes(statusFilter)) {
      where.status = statusFilter;
    }

    const orderField = SORTABLE_FIELDS.includes(sortBy) ? sortBy : 'purchaseDate';

    const [total, purchases] = await Promise.all([
      prisma.purchaseDocument.count({ where: where as any }),
      prisma.purchaseDocument.findMany({
        where: where as any,
        orderBy: { [orderField]: sortDir },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { items: true },
      }),
    ]);

    return NextResponse.json({
      data: purchases,
      count: total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (error: unknown) {
    if (error instanceof Response) return error;
    const msg = error instanceof Error ? error.message : 'Unknown error';
    console.error('List purchases error:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
