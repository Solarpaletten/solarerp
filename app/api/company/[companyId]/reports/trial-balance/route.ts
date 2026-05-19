// app/api/company/[companyId]/reports/trial-balance/route.ts
// ═══════════════════════════════════════════════════
// Trial Balance — Ledger Consistency Proof
// ═══════════════════════════════════════════════════
//
// TASK 68A — migrated to requireCompanyContext
//
// Source: JournalLine + JournalEntry (date filter).
// No document involvement. No source filter (MANUAL included).
// Ledger is the single source of truth.

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import {
  requireCompanyContext,
  companyContextErrorResponse,
} from '@/lib/auth/requireCompanyContext';

type RouteParams = {
  params: Promise<{ companyId: string }>;
};


// ─── GET /api/company/[companyId]/reports/trial-balance ───
//
// Query params (both required):
//   ?from=YYYY-MM-DD&to=YYYY-MM-DD
//
// Response:
// {
//   "from": "2026-01-01",
//   "to": "2026-01-31",
//   "totalDebit": "10000.00",
//   "totalCredit": "10000.00",
//   "isBalanced": true
// }
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { companyId, tenantId } = await requireCompanyContext(request);


    // ─── Validate query params ───────────────────
    const url = new URL(request.url);
    const fromParam = url.searchParams.get('from');
    const toParam = url.searchParams.get('to');

    if (!fromParam || !toParam) {
      return NextResponse.json(
        { error: 'Both "from" and "to" query parameters are required (YYYY-MM-DD)' },
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

    // UTC-safe end of day
    const toDateEnd = new Date(`${toParam}T23:59:59.999Z`);

    // ─── Aggregate: SUM(debit), SUM(credit) ──────
    const aggregation = await prisma.journalLine.aggregate({
      where: {
        entry: {
          companyId,
          company: { tenantId },
          date: {
            gte: fromDate,
            lte: toDateEnd,
          },
        },
      },
      _sum: {
        debit: true,
        credit: true,
      },
    });

    const totalDebit = Number(aggregation._sum.debit || 0);
    const totalCredit = Number(aggregation._sum.credit || 0);

    // Decimal-safe comparison (round to 2 places)
    const roundedDebit = Math.round(totalDebit * 100) / 100;
    const roundedCredit = Math.round(totalCredit * 100) / 100;
    const isBalanced = roundedDebit === roundedCredit;

    return NextResponse.json({
      from: fromParam,
      to: toParam,
      totalDebit: roundedDebit.toFixed(2),
      totalCredit: roundedCredit.toFixed(2),
      isBalanced,
    });
  } catch (error) {
    if (error instanceof Response) {
      return error;
    }
    console.error('Trial balance error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
