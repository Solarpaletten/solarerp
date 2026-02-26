// app/api/company/[companyId]/reports/pnl/route.ts
// ═══════════════════════════════════════════════════
// P&L (Profit & Loss) Report — Backend Aggregator
// ═══════════════════════════════════════════════════
//
// Task 25 + Task 26.1 fixes:
//   - UTC-safe date boundary
//   - Auth error: return original Response

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireTenant } from '@/lib/auth/requireTenant';

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

    // End of day for inclusive range (UTC-safe — Task 26.1 fix)
    const toDateEnd = new Date(`${toParam}T23:59:59.999Z`);

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
        amount = sumCredit - sumDebit;
      } else {
        amount = sumDebit - sumCredit;
      }

      amount = Math.round(amount * 100) / 100;
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
    // Task 26.1 fix: return original Response from requireTenant()
    if (error instanceof Response) {
      return error;
    }
    console.error('P&L report error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
