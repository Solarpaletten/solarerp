// app/api/company/[companyId]/warehouse/movements/route.ts
// ═══════════════════════════════════════════════════
// Task 52: Warehouse Stock Movements Ledger
// ═══════════════════════════════════════════════════
// Returns detailed movement history with pagination
// Filters: warehouse, itemCode, search
// Uses existing StockMovement model — no new tables needed

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireTenant } from '@/lib/auth/requireTenant';

type RouteParams = { params: Promise<{ companyId: string }> };

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { tenantId } = await requireTenant(request);
    const { companyId } = await params;

    const company = await prisma.company.findFirst({ where: { id: companyId, tenantId }, select: { id: true } });
    if (!company) return NextResponse.json({ error: 'Company not found' }, { status: 404 });

    const url = new URL(request.url);
    const warehouse = url.searchParams.get('warehouse') || '';
    const itemCode = url.searchParams.get('itemCode') || '';
    const search = url.searchParams.get('search') || '';
    const page = Math.max(1, parseInt(url.searchParams.get('page') || '1'));
    const pageSize = Math.min(100, Math.max(1, parseInt(url.searchParams.get('pageSize') || '50')));

    const where: Record<string, unknown> = { companyId };
    if (warehouse) where.warehouseName = warehouse;
    if (itemCode) where.itemCode = itemCode;
    if (search) {
      where.OR = [
        { itemName: { contains: search, mode: 'insensitive' } },
        { itemCode: { contains: search, mode: 'insensitive' } },
        { documentType: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [total, movements] = await Promise.all([
      prisma.stockMovement.count({ where: where as any }),
      prisma.stockMovement.findMany({
        where: where as any,
        orderBy: [{ documentDate: 'desc' }, { createdAt: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true,
          warehouseName: true,
          itemName: true,
          itemCode: true,
          quantity: true,
          cost: true,
          direction: true,
          documentType: true,
          documentId: true,
          documentDate: true,
          series: true,
          number: true,
          createdAt: true,
        },
      }),
    ]);

    return NextResponse.json({
      data: movements,
      count: total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (error: unknown) {
    if (error instanceof Response) return error;
    const msg = error instanceof Error ? error.message : 'Unknown error';
    console.error('Warehouse movements error:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
