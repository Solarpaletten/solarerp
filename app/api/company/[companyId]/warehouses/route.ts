// app/api/company/[companyId]/warehouses/route.ts
// ═══════════════════════════════════════════════════
// Task 57_1: Warehouses CRUD API
// ═══════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireTenant } from '@/lib/auth/requireTenant';

type RouteParams = { params: Promise<{ companyId: string }> };

async function verifyCompany(companyId: string, tenantId: string) {
  return prisma.company.findFirst({
    where: { id: companyId, tenantId },
    select: { id: true },
  });
}

// ─── GET: List warehouses ──────────────────────────
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { tenantId } = await requireTenant(request);
    const { companyId } = await params;

    const company = await verifyCompany(companyId, tenantId);
    if (!company) return NextResponse.json({ error: 'Company not found' }, { status: 404 });

    const url = new URL(request.url);
    const isActive = url.searchParams.get('isActive');

    const where: Record<string, unknown> = { companyId };
    if (isActive === 'true') where.isActive = true;

    const data = await prisma.warehouse.findMany({
      where,
      include: {
        responsibleEmployee: { select: { id: true, name: true, position: true } },
      },
      orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
    });

    return NextResponse.json({ data });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error('Warehouses GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ─── POST: Create warehouse ───────────────────────
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { tenantId } = await requireTenant(request);
    const { companyId } = await params;

    const company = await verifyCompany(companyId, tenantId);
    if (!company) return NextResponse.json({ error: 'Company not found' }, { status: 404 });

    const body = await request.json();
    if (!body.name?.trim()) {
      return NextResponse.json({ error: 'Warehouse name is required' }, { status: 400 });
    }

    const data = await prisma.warehouse.create({
      data: {
        companyId,
        name: body.name.trim(),
        code: body.code?.trim() || null,
        isDefault: Boolean(body.isDefault),
        isActive: body.isActive !== false,
        address: body.address?.trim() || null,
        responsibleEmployeeId: body.responsibleEmployeeId || null,
      },
    });

    return NextResponse.json({ data }, { status: 201 });
  } catch (error: unknown) {
    if (error instanceof Response) return error;
    if ((error as { code?: string }).code === 'P2002') {
      return NextResponse.json({ error: 'Warehouse with this name already exists' }, { status: 409 });
    }
    console.error('Warehouses POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
