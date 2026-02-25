// app/api/company/[companyId]/periods/[year]/[month]/close/route.ts
// ═══════════════════════════════════════════════════
// TENANT-SAFE Period Close Endpoint
// ═══════════════════════════════════════════════════
//
// Task 24: Period Locking
//
// POST /api/company/:id/periods/:year/:month/close
//
// Creates or updates AccountingPeriod → isClosed = true
// Once closed, no journal entries can be created for this period.
//
// Protection: Cannot close a future period.
// Protection: Already closed → 409 Conflict.

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireTenant } from '@/lib/auth/requireTenant';

type RouteParams = {
  params: Promise<{ companyId: string; year: string; month: string }>;
};

// ─── HELPER: Verify company belongs to tenant ────
async function verifyCompanyOwnership(companyId: string, tenantId: string) {
  const company = await prisma.company.findFirst({
    where: { id: companyId, tenantId },
    select: { id: true },
  });
  return company !== null;
}

// ─── POST /api/company/[companyId]/periods/[year]/[month]/close ───
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { tenantId, userId } = await requireTenant(request);
    const { companyId, year: yearStr, month: monthStr } = await params;

    // Validate params
    const year = parseInt(yearStr, 10);
    const month = parseInt(monthStr, 10);

    if (isNaN(year) || year < 1900 || year > 2100) {
      return NextResponse.json(
        { error: 'Invalid year. Must be between 1900 and 2100.' },
        { status: 400 }
      );
    }

    if (isNaN(month) || month < 1 || month > 12) {
      return NextResponse.json(
        { error: 'Invalid month. Must be between 1 and 12.' },
        { status: 400 }
      );
    }

    // Verify company ownership
    const isOwner = await verifyCompanyOwnership(companyId, tenantId);
    if (!isOwner) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    // Protection: Cannot close a future period
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;

    if (year > currentYear || (year === currentYear && month > currentMonth)) {
      return NextResponse.json(
        { error: 'Cannot close a future period' },
        { status: 400 }
      );
    }

    // Upsert: create period if not exists, update if exists
    const result = await prisma.$transaction(async (tx) => {
      const existing = await tx.accountingPeriod.findUnique({
        where: {
          companyId_year_month: { companyId, year, month },
        },
      });

      // Already closed → 409
      if (existing?.isClosed) {
        throw new Error('ALREADY_CLOSED');
      }

      // Upsert the period
      const period = await tx.accountingPeriod.upsert({
        where: {
          companyId_year_month: { companyId, year, month },
        },
        update: {
          isClosed: true,
          closedAt: new Date(),
          closedBy: userId,
        },
        create: {
          companyId,
          year,
          month,
          isClosed: true,
          closedAt: new Date(),
          closedBy: userId,
        },
      });

      return period;
    });

    return NextResponse.json({
      data: result,
      message: `Period ${year}-${String(month).padStart(2, '0')} closed successfully`,
    });
  } catch (error: unknown) {
    if (error instanceof Response) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (error instanceof Error && error.message === 'ALREADY_CLOSED') {
      return NextResponse.json(
        { error: `Period is already closed` },
        { status: 409 }
      );
    }

    const message =
      error instanceof Error ? error.message : 'Internal server error';
    console.error('Close period error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
