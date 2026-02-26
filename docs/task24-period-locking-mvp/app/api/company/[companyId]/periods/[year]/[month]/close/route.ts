// app/api/company/[companyId]/periods/[year]/[month]/close/route.ts
// ═══════════════════════════════════════════════════
// TENANT-SAFE Period Close Endpoint
// ═══════════════════════════════════════════════════
//
// Task 24 MVP: Period Locking
//
// POST /api/company/:id/periods/:year/:month/close
//
// Upsert AccountingPeriod → isClosed = true, closedAt = now()
// Already closed → 409 ALREADY_CLOSED.

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireTenant } from '@/lib/auth/requireTenant';

type RouteParams = {
  params: Promise<{ companyId: string; year: string; month: string }>;
};

async function verifyCompanyOwnership(companyId: string, tenantId: string) {
  const company = await prisma.company.findFirst({
    where: { id: companyId, tenantId },
    select: { id: true },
  });
  return company !== null;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { tenantId } = await requireTenant(request);
    const { companyId, year: yearStr, month: monthStr } = await params;

    const year = parseInt(yearStr, 10);
    const month = parseInt(monthStr, 10);

    if (isNaN(year) || year < 1900 || year > 2100) {
      return NextResponse.json(
        { error: 'Invalid year' },
        { status: 400 }
      );
    }

    if (isNaN(month) || month < 1 || month > 12) {
      return NextResponse.json(
        { error: 'Invalid month. Must be 1-12.' },
        { status: 400 }
      );
    }

    const isOwner = await verifyCompanyOwnership(companyId, tenantId);
    if (!isOwner) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    const result = await prisma.$transaction(async (tx) => {
      const existing = await tx.accountingPeriod.findUnique({
        where: {
          companyId_year_month: { companyId, year, month },
        },
      });

      if (existing?.isClosed) {
        throw new Error('ALREADY_CLOSED');
      }

      const period = await tx.accountingPeriod.upsert({
        where: {
          companyId_year_month: { companyId, year, month },
        },
        update: {
          isClosed: true,
          closedAt: new Date(),
        },
        create: {
          companyId,
          year,
          month,
          isClosed: true,
          closedAt: new Date(),
        },
      });

      return period;
    });

    return NextResponse.json({
      data: result,
      message: `Period ${year}-${String(month).padStart(2, '0')} closed`,
    });
  } catch (error: unknown) {
    if (error instanceof Response) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (error instanceof Error && error.message === 'ALREADY_CLOSED') {
      return NextResponse.json(
        { error: 'Period is already closed' },
        { status: 409 }
      );
    }

    const message =
      error instanceof Error ? error.message : 'Internal server error';
    console.error('Close period error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
