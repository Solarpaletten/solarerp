// app/api/company/[companyId]/employees/route.ts
// ═══════════════════════════════════════════════════
// Task 57_1: Employees CRUD API
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

// ─── GET: List employees ─────────────────────────
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { tenantId } = await requireTenant(request);
    const { companyId } = await params;

    const company = await verifyCompany(companyId, tenantId);
    if (!company) return NextResponse.json({ error: 'Company not found' }, { status: 404 });

    const url = new URL(request.url);
    const isActive = url.searchParams.get('isActive');
    const search = url.searchParams.get('search');

    const where: Record<string, unknown> = { companyId };
    if (isActive === 'true') where.isActive = true;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { code: { contains: search, mode: 'insensitive' } },
        { position: { contains: search, mode: 'insensitive' } },
        { department: { contains: search, mode: 'insensitive' } },
      ];
    }

    const data = await prisma.employee.findMany({
      where,
      orderBy: [{ name: 'asc' }],
    });

    return NextResponse.json({ data });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error('Employees GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ─── POST: Create employee ───────────────────────
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { tenantId } = await requireTenant(request);
    const { companyId } = await params;

    const company = await verifyCompany(companyId, tenantId);
    if (!company) return NextResponse.json({ error: 'Company not found' }, { status: 404 });

    const body = await request.json();
    if (!body.name?.trim()) {
      return NextResponse.json({ error: 'Employee name is required' }, { status: 400 });
    }

    const data = await prisma.employee.create({
      data: {
        companyId,
        name: body.name.trim(),
        code: body.code?.trim() || null,
        position: body.position?.trim() || null,
        department: body.department?.trim() || null,
        email: body.email?.trim() || null,
        phone: body.phone?.trim() || null,
        isActive: body.isActive !== false,
      },
    });

    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error('Employees POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
