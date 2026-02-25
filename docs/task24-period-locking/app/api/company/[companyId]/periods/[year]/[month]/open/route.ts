// app/api/company/[companyId]/periods/[year]/[month]/open/route.ts
// ═══════════════════════════════════════════════════
// TENANT-SAFE Period Reopen Endpoint
// ═══════════════════════════════════════════════════
//
// Task 24: Period Locking
//
// POST /api/company/:id/periods/:year/:month/open
//
// Reopens a closed period → isClosed = false
//
// Protection: Period must exist and be closed → 404/409.
// Note: In production, this should require elevated permissions.
// For now, any authenticated tenant user can reopen.

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

// ─── POST /api/company/[companyId]/periods/[year]/[month]/open ───
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { tenantId } = await requireTenant(request);
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

    // Find and reopen
    const result = await prisma.$transaction(async (tx) => {
      const existing = await tx.accountingPeriod.findUnique({
        where: {
          companyId_year_month: { companyId, year, month },
        },
      });

      if (!existing) {
        throw new Error('PERIOD_NOT_FOUND');
      }

      if (!existing.isClosed) {
        throw new Error('ALREADY_OPEN');
      }

      const period = await tx.accountingPeriod.update({
        where: { id: existing.id },
        data: {
          isClosed: false,
          closedAt: null,
          closedBy: null,
        },
      });

      return period;
    });

    return NextResponse.json({
      data: result,
      message: `Period ${year}-${String(month).padStart(2, '0')} reopened successfully`,
    });
  } catch (error: unknown) {
    if (error instanceof Response) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (error instanceof Error) {
      if (error.message === 'PERIOD_NOT_FOUND') {
        return NextResponse.json(
          { error: 'Period not found' },
          { status: 404 }
        );
      }
      if (error.message === 'ALREADY_OPEN') {
        return NextResponse.json(
          { error: 'Period is already open' },
          { status: 409 }
        );
      }
    }

    const message =
      error instanceof Error ? error.message : 'Internal server error';
    console.error('Reopen period error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
