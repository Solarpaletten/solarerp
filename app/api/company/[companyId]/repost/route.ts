// app/api/company/[companyId]/repost/route.ts
// ═══════════════════════════════════════════════════
// Reposting Engine Endpoint
// ═══════════════════════════════════════════════════
//
// Task 27: POST /api/company/:id/repost
//
// Aggressive rebuild: delete all SYSTEM journal entries
// in date range, recreate from source documents.
// MANUAL entries untouched. Idempotent.

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireTenant } from '@/lib/auth/requireTenant';
import { repostRange } from '@/lib/accounting/repostingService';

type RouteParams = {
  params: Promise<{ companyId: string }>;
};

async function verifyCompanyOwnership(companyId: string, tenantId: string) {
  const company = await prisma.company.findFirst({
    where: { id: companyId, tenantId },
    select: { id: true },
  });
  return company !== null;
}

// ─── POST /api/company/[companyId]/repost ────────
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { tenantId } = await requireTenant(request);
    const { companyId } = await params;

    const isOwner = await verifyCompanyOwnership(companyId, tenantId);
    if (!isOwner) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    const body = await request.json();
    const { from: fromParam, to: toParam } = body;

    // ─── Validate dates ──────────────────────────
    if (!fromParam || !toParam) {
      return NextResponse.json(
        { error: 'Both "from" and "to" are required (YYYY-MM-DD)' },
        { status: 400 }
      );
    }

    const fromDate = new Date(fromParam);
    const toDate = new Date(toParam);

    if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
      return NextResponse.json(
        { error: 'Invalid date format. Use YYYY-MM-DD.' },
        { status: 400 }
      );
    }

    if (fromDate > toDate) {
      return NextResponse.json(
        { error: '"from" must be <= "to"' },
        { status: 400 }
      );
    }

    // ─── Check period locks in range ─────────────
    // Find all closed periods that overlap with the repost range
    const fromYear = fromDate.getFullYear();
    const fromMonth = fromDate.getMonth() + 1;
    const toYear = toDate.getFullYear();
    const toMonth = toDate.getMonth() + 1;

    const closedPeriods = await prisma.accountingPeriod.findMany({
      where: {
        companyId,
        isClosed: true,
        OR: buildMonthRange(fromYear, fromMonth, toYear, toMonth),
      },
      select: { year: true, month: true },
    });

    if (closedPeriods.length > 0) {
      const locked = closedPeriods
        .map((p) => `${p.year}-${String(p.month).padStart(2, '0')}`)
        .join(', ');
      return NextResponse.json(
        { error: `PERIOD_CLOSED: Cannot repost — locked periods: ${locked}` },
        { status: 409 }
      );
    }

    // ─── Execute repost in transaction ───────────
    const result = await prisma.$transaction(
      async (tx) => {
        return repostRange(tx, {
          companyId,
          tenantId,
          from: fromDate,
          to: toDate,
        });
      },
      { timeout: 30000 } // 30s for large ranges
    );

    return NextResponse.json(result);
  } catch (error: unknown) {
    if (error instanceof Response) {
      return error;
    }

    if (error instanceof Error) {
      // MISSING_POSTING_PROFILE — document lacks account mapping
      if (error.message.startsWith('MISSING_POSTING_PROFILE')) {
        return NextResponse.json(
          { error: error.message },
          { status: 409 }
        );
      }
      // PERIOD_CLOSED from journalService (second contour)
      if (error.message.startsWith('PERIOD_CLOSED')) {
        return NextResponse.json(
          { error: error.message },
          { status: 409 }
        );
      }
    }

    const message =
      error instanceof Error ? error.message : 'Internal server error';
    console.error('Repost error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// ─── Helper: build month range for period lock check ─
function buildMonthRange(
  fromYear: number,
  fromMonth: number,
  toYear: number,
  toMonth: number
): Array<{ year: number; month: number }> {
  const months: Array<{ year: number; month: number }> = [];
  let y = fromYear;
  let m = fromMonth;

  while (y < toYear || (y === toYear && m <= toMonth)) {
    months.push({ year: y, month: m });
    m++;
    if (m > 12) {
      m = 1;
      y++;
    }
  }

  return months;
}
