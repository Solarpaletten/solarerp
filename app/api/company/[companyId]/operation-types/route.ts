// app/api/company/[companyId]/operation-types/route.ts
// ═══════════════════════════════════════════════════
// Task 57_1: Operation Types CRUD API
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

// ─── GET: List operation types ────────────────────
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { tenantId } = await requireTenant(request);
    const { companyId } = await params;

    const company = await verifyCompany(companyId, tenantId);
    if (!company) return NextResponse.json({ error: 'Company not found' }, { status: 404 });

    const url = new URL(request.url);
    const module = url.searchParams.get('module'); // PURCHASE | SALE

    const where: Record<string, unknown> = { companyId, isActive: true };
    if (module) where.module = module.toUpperCase();

    const data = await prisma.operationType.findMany({
      where,
      orderBy: [{ priority: 'desc' }, { name: 'asc' }],
    });

    return NextResponse.json({ data });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error('OperationTypes GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ─── POST: Create operation type ──────────────────
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { tenantId } = await requireTenant(request);
    const { companyId } = await params;

    const company = await verifyCompany(companyId, tenantId);
    if (!company) return NextResponse.json({ error: 'Company not found' }, { status: 404 });

    const body = await request.json();
    if (!body.name?.trim()) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }
    if (!body.code?.trim()) {
      return NextResponse.json({ error: 'Code is required' }, { status: 400 });
    }

    const VALID_MODULES = ['PURCHASE', 'SALE', 'ADJUSTMENT'];
    const module = (body.module || 'PURCHASE').toUpperCase();
    if (!VALID_MODULES.includes(module)) {
      return NextResponse.json({ error: `Module must be one of: ${VALID_MODULES.join(', ')}` }, { status: 400 });
    }

    const data = await prisma.operationType.create({
      data: {
        companyId,
        name: body.name.trim(),
        code: body.code.trim().toUpperCase(),
        module,
        debitAccountCode: body.debitAccountCode?.trim() || null,
        creditAccountCode: body.creditAccountCode?.trim() || null,
        vatAccountCode: body.vatAccountCode?.trim() || null,
        expenseAccountCode: body.expenseAccountCode?.trim() || null,
        revenueAccountCode: body.revenueAccountCode?.trim() || null,
        advanceAccountCode: body.advanceAccountCode?.trim() || null,
        affectsWarehouse: body.affectsWarehouse !== false,
        affectsVat: body.affectsVat !== false,
        isActive: body.isActive !== false,
        priority: typeof body.priority === 'number' ? body.priority : 0,
      },
    });

    return NextResponse.json({ data }, { status: 201 });
  } catch (error: unknown) {
    if (error instanceof Response) return error;
    if ((error as { code?: string }).code === 'P2002') {
      return NextResponse.json({ error: 'Operation type with this code already exists' }, { status: 409 });
    }
    console.error('OperationTypes POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
