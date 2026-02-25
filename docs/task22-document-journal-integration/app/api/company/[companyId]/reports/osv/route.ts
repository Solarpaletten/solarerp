// app/api/company/[companyId]/reports/osv/route.ts
// ═══════════════════════════════════════════════════
// ОСВ (Оборотно-сальдовая ведомость) — Trial Balance
// ═══════════════════════════════════════════════════
//
// Task 22: Backend-only aggregator
//
// SQL logic: SUM(debit - credit) GROUP BY accountId
// Returns balance per account from JournalLine.
//
// No UI. No formatting. Raw JSON.

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

// ─── GET /api/company/[companyId]/reports/osv ────
// Trial Balance: balance per account
//
// Optional query params:
//   ?from=2024-01-01&to=2024-12-31 (date range filter)
//
// Response:
// [
//   {
//     "accountId": "...",
//     "accountCode": "1200",
//     "accountName": "Accounts Receivable",
//     "accountType": "ASSET",
//     "totalDebit": 5000.00,
//     "totalCredit": 2000.00,
//     "balance": 3000.00
//   }
// ]
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { tenantId } = await requireTenant(request);
    const { companyId } = await params;

    const isOwner = await verifyCompanyOwnership(companyId, tenantId);
    if (!isOwner) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    // Optional date range filters
    const url = new URL(request.url);
    const fromDate = url.searchParams.get('from');
    const toDate = url.searchParams.get('to');

    // Build date filter for JournalEntry
    const dateFilter: { gte?: Date; lte?: Date } = {};
    if (fromDate) dateFilter.gte = new Date(fromDate);
    if (toDate) dateFilter.lte = new Date(toDate);

    // Aggregate journal lines grouped by accountId
    // Using Prisma groupBy for the aggregation
    const aggregation = await prisma.journalLine.groupBy({
      by: ['accountId'],
      where: {
        entry: {
          companyId,
          company: { tenantId }, // TENANT SCOPE
          ...(Object.keys(dateFilter).length > 0 ? { date: dateFilter } : {}),
        },
      },
      _sum: {
        debit: true,
        credit: true,
      },
    });

    // If no journal lines exist, return empty array
    if (aggregation.length === 0) {
      return NextResponse.json({ data: [], count: 0 });
    }

    // Fetch account details for enrichment
    const accountIds = aggregation.map((a) => a.accountId);
    const accounts = await prisma.account.findMany({
      where: {
        id: { in: accountIds },
        companyId,
        company: { tenantId },
      },
      select: {
        id: true,
        code: true,
        name: true,
        type: true,
      },
    });

    const accountMap = new Map(accounts.map((a) => [a.id, a]));

    // Build response with enriched data
    const balances = aggregation
      .map((agg) => {
        const account = accountMap.get(agg.accountId);
        const totalDebit = Number(agg._sum.debit || 0);
        const totalCredit = Number(agg._sum.credit || 0);

        return {
          accountId: agg.accountId,
          accountCode: account?.code || 'UNKNOWN',
          accountName: account?.name || 'Unknown Account',
          accountType: account?.type || 'UNKNOWN',
          totalDebit: Math.round(totalDebit * 100) / 100,
          totalCredit: Math.round(totalCredit * 100) / 100,
          balance: Math.round((totalDebit - totalCredit) * 100) / 100,
        };
      })
      .sort((a, b) => a.accountCode.localeCompare(b.accountCode));

    return NextResponse.json({ data: balances, count: balances.length });
  } catch (error) {
    if (error instanceof Response) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('OSV report error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
