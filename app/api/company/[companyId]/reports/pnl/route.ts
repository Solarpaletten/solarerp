// app/api/company/[companyId]/reports/pnl/route.ts
// ═══════════════════════════════════════════════════
// P&L (Profit & Loss) Report — Backend Aggregator
// ═══════════════════════════════════════════════════
//
// Task 25: P&L Aggregator (backend-only, no UI)
//
// Aggregates JournalLine data for INCOME and EXPENSE accounts.
// Returns structured P&L with income, expenses, and net result.
//
// Source: JournalLine → JournalEntry (date filter) → Account (type filter)
//
// Note on "posted only": Current architecture has no draft mechanism.
// All JournalEntries are created atomically with documents → all are posted.
// If draft/status field is added later, add filter:
//   entry: { status: 'POSTED' } or entry: { postedAt: { not: null } }

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

// ─── GET /api/company/[companyId]/reports/pnl ────
//
// Query params (required):
//   ?from=YYYY-MM-DD&to=YYYY-MM-DD
//
// Response:
// {
//   "period": { "from": "2026-01-01", "to": "2026-01-31" },
//   "income": [{ "accountCode": "90", "accountName": "Revenue", "amount": 10000 }],
//   "expenses": [{ "accountCode": "60", "accountName": "COGS", "amount": 4000 }],
//   "result": 6000
// }
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { tenantId } = await requireTenant(request);
    const { companyId } = await params;

    const isOwner = await verifyCompanyOwnership(companyId, tenantId);
    if (!isOwner) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

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

    // Set toDate to end of day for inclusive range
    const toDateEnd = new Date(toDate);
    toDateEnd.setHours(23, 59, 59, 999);

    // ─── Fetch INCOME and EXPENSE accounts ───────
    const accounts = await prisma.account.findMany({
      where: {
        companyId,
        company: { tenantId },
        type: { in: ['INCOME', 'EXPENSE'] },
      },
      select: {
        id: true,
        code: true,
        name: true,
        type: true,
      },
    });

    if (accounts.length === 0) {
      return NextResponse.json({
        period: { from: fromParam, to: toParam },
        income: [],
        expenses: [],
        result: 0,
      });
    }

    const accountIds = accounts.map((a) => a.id);
    const accountMap = new Map(accounts.map((a) => [a.id, a]));

    // ─── Aggregate journal lines ─────────────────
    // Group by accountId, SUM debit and credit
    // Filter: date range + account IDs (INCOME/EXPENSE only)
    // Note: No draft filter needed — all entries are posted in current architecture
    const aggregation = await prisma.journalLine.groupBy({
      by: ['accountId'],
      where: {
        accountId: { in: accountIds },
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

    // ─── Calculate amounts per account ───────────
    const incomeLines: { accountCode: string; accountName: string; amount: number }[] = [];
    const expenseLines: { accountCode: string; accountName: string; amount: number }[] = [];

    for (const agg of aggregation) {
      const account = accountMap.get(agg.accountId);
      if (!account) continue;

      const sumDebit = Number(agg._sum.debit || 0);
      const sumCredit = Number(agg._sum.credit || 0);

      let amount: number;
      if (account.type === 'INCOME') {
        // Income: credit increases, debit decreases
        amount = sumCredit - sumDebit;
      } else {
        // Expense: debit increases, credit decreases
        amount = sumDebit - sumCredit;
      }

      // Round to 2 decimal places
      amount = Math.round(amount * 100) / 100;

      // Skip zero amounts
      if (amount === 0) continue;

      const line = {
        accountCode: account.code,
        accountName: account.name,
        amount,
      };

      if (account.type === 'INCOME') {
        incomeLines.push(line);
      } else {
        expenseLines.push(line);
      }
    }

    // ─── Sort by accountCode ASC ─────────────────
    incomeLines.sort((a, b) => a.accountCode.localeCompare(b.accountCode));
    expenseLines.sort((a, b) => a.accountCode.localeCompare(b.accountCode));

    // ─── Calculate net result ────────────────────
    const totalIncome = incomeLines.reduce((sum, l) => sum + l.amount, 0);
    const totalExpenses = expenseLines.reduce((sum, l) => sum + l.amount, 0);
    const result = Math.round((totalIncome - totalExpenses) * 100) / 100;

    return NextResponse.json({
      period: { from: fromParam, to: toParam },
      income: incomeLines,
      expenses: expenseLines,
      result,
    });
  } catch (error) {
    if (error instanceof Response) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('P&L report error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
