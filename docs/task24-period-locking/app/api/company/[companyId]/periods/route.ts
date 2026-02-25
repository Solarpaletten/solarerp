// app/api/company/[companyId]/periods/route.ts
// ═══════════════════════════════════════════════════
// TENANT-SAFE Accounting Periods API
// ═══════════════════════════════════════════════════
//
// Task 24: Period Locking
//
// GET /api/company/:id/periods — list all periods
// GET /api/company/:id/periods?year=2025 — filter by year

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireTenant } from '@/lib/auth/requireTenant';

type RouteParams = {
  params: Promise<{ companyId: string }>;
};

// ─── HELPER: Verify company belongs to tenant ────
async function verifyCompanyOwnership(companyId: string, tenantId: string) {
  const company = await prisma.company.findFirst({
    where: { id: companyId, tenantId },
    select: { id: true },
  });
  return company !== null;
}

// ─── GET /api/company/[companyId]/periods ─────────
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { tenantId } = await requireTenant(request);
    const { companyId } = await params;

    const isOwner = await verifyCompanyOwnership(companyId, tenantId);
    if (!isOwner) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    // Optional year filter
    const { searchParams } = new URL(request.url);
    const yearParam = searchParams.get('year');

    const where: Record<string, unknown> = {
      companyId,
      company: { tenantId },
    };

    if (yearParam) {
      const year = parseInt(yearParam, 10);
      if (isNaN(year) || year < 1900 || year > 2100) {
        return NextResponse.json(
          { error: 'Invalid year parameter' },
          { status: 400 }
        );
      }
      where.year = year;
    }

    const periods = await prisma.accountingPeriod.findMany({
      where,
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
      select: {
        id: true,
        year: true,
        month: true,
        isClosed: true,
        closedAt: true,
        closedBy: true,
        createdAt: true,
      },
    });

    return NextResponse.json({
      data: periods,
      count: periods.length,
    });
  } catch (error) {
    if (error instanceof Response) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('List periods error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
