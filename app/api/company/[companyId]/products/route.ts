// app/api/company/[companyId]/products/route.ts
// ═══════════════════════════════════════════════════
// Task 47: Products API — GET list + POST create
// ═══════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireTenant } from '@/lib/auth/requireTenant';

type RouteParams = {
  params: Promise<{ companyId: string }>;
};

const SORTABLE_FIELDS = ['name', 'code', 'groupName', 'priceWithoutVat', 'createdAt', 'unitName', 'manufacturer'];

// ─── GET: List products ──────────────────────────

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
    const groupFilter = url.searchParams.get('group') || '';
    const sortBy = url.searchParams.get('sortBy') || 'name';
    const sortDir = url.searchParams.get('sortDir') === 'desc' ? 'desc' : 'asc';
    const page = Math.max(1, parseInt(url.searchParams.get('page') || '1'));
    const pageSize = Math.min(100, Math.max(1, parseInt(url.searchParams.get('pageSize') || '20')));

    const where: Record<string, unknown> = {
      companyId,
      company: { tenantId },
    };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { code: { contains: search, mode: 'insensitive' } },
        { barcode: { contains: search, mode: 'insensitive' } },
        { manufacturer: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (groupFilter) {
      where.groupName = groupFilter;
    }

    const orderField = SORTABLE_FIELDS.includes(sortBy) ? sortBy : 'name';

    const [total, products] = await Promise.all([
      prisma.item.count({ where: where as any }),
      prisma.item.findMany({
        where: where as any,
        orderBy: { [orderField]: sortDir },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    return NextResponse.json({
      data: products,
      count: total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (error: unknown) {
    if (error instanceof Response) return error;
    const msg = error instanceof Error ? error.message : 'Unknown error';
    console.error('List products error:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// ─── POST: Create product ────────────────────────

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

    // Validation
    if (!body.name || String(body.name).trim().length === 0) {
      return NextResponse.json({ error: 'Product name is required' }, { status: 400 });
    }

    if (!body.unitName || String(body.unitName).trim().length === 0) {
      return NextResponse.json({ error: 'Unit name is required (e.g. pcs, kg, hr)' }, { status: 400 });
    }

    // Unique code check
    if (body.code) {
      const existing = await prisma.item.findFirst({
        where: { companyId, code: body.code },
        select: { id: true },
      });
      if (existing) {
        return NextResponse.json({ error: `Product with code "${body.code}" already exists` }, { status: 409 });
      }
    }

    // Price validation
    if (body.priceWithoutVat !== undefined && body.priceWithoutVat !== null) {
      if (isNaN(Number(body.priceWithoutVat)) || Number(body.priceWithoutVat) < 0) {
        return NextResponse.json({ error: 'Price must be non-negative' }, { status: 400 });
      }
    }

    const product = await prisma.item.create({
      data: {
        companyId,
        name: String(body.name).trim(),
        code: body.code || null,
        barcode: body.barcode || null,
        unitName: String(body.unitName).trim(),
        vatRate: body.vatRate != null ? Number(body.vatRate) : null,
        priceWithoutVat: body.priceWithoutVat != null ? Number(body.priceWithoutVat) : null,
        priceWithVat: body.priceWithVat != null ? Number(body.priceWithVat) : null,
        attributeName: body.attributeName || null,
        groupName: body.groupName || null,
        manufacturer: body.manufacturer || null,
        countryOfOrigin: body.countryOfOrigin || null,
        purchaseAccountCode: body.purchaseAccountCode || null,
        saleAccountCode: body.saleAccountCode || null,
        expenseAccountCode: body.expenseAccountCode || null,
        minimumQuantity: body.minimumQuantity != null ? Number(body.minimumQuantity) : null,
        description: body.description || null,
        externalId: body.externalId || null,
        freePrice: body.freePrice || false,
      },
    });

    return NextResponse.json({ data: product }, { status: 201 });
  } catch (error: unknown) {
    if (error instanceof Response) return error;

    if (error && typeof error === 'object' && 'code' in error && (error as { code: string }).code === 'P2002') {
      return NextResponse.json({ error: 'Product with this code already exists' }, { status: 409 });
    }

    const msg = error instanceof Error ? error.message : 'Unknown error';
    console.error('Create product error:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
