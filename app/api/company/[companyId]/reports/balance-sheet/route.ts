// app/api/company/[companyId]/reports/balance-sheet/route.ts
// ═══════════════════════════════════════════════════
// Balance Sheet (Bilanz) — Ledger-based Aggregator
// ═══════════════════════════════════════════════════
//
// Task 26 MVP + Task 26.1 fixes:
//   - UTC-safe date boundary
//   - Auth error: return original Response
//
// Aggregates ALL JournalLine data up to asOf date.
// Groups by Account type: ASSET, LIABILITY, EQUITY.
// Includes synthetic "Current Period Result" line in equity
// (net profit from INCOME/EXPENSE accounts).
//
// Hard rule: Assets = Liabilities + Equity (diff for debug).

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireTenant } from '@/lib/auth/requireTenant';

type RouteParams = {
  params: Promise<{ companyId: string }>;
};

type BalanceLine = {
  accountId: string;
  code: string;
  name: string;
  balance: number;
};

// ─── HELPER: Verify company belongs to tenant ────
async function verifyCompanyOwnership(companyId: string, tenantId: string) {
  const company = await prisma.company.findFirst({
    where: { id: companyId, tenantId },
    select: { id: true },
  });
  return company !== null;
}

// ─── GET /api/company/[companyId]/reports/balance-sheet ───
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { tenantId } = await requireTenant(request);
    const { companyId } = await params;

    const isOwner = await verifyCompanyOwnership(companyId, tenantId);
    if (!isOwner) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    // ─── Validate asOf param ─────────────────────
    const url = new URL(request.url);
    const asOfParam = url.searchParams.get('asOf');

    if (!asOfParam) {
      return NextResponse.json(
        { error: '"asOf" query parameter is required (YYYY-MM-DD)' },
        { status: 400 }
      );
    }

    const asOfDate = new Date(asOfParam);
    if (isNaN(asOfDate.getTime())) {
      return NextResponse.json(
        { error: 'Invalid date format. Use YYYY-MM-DD.' },
        { status: 400 }
      );
    }

    // End of day for inclusive range (UTC-safe — Task 26.1 fix)
    const asOfEnd = new Date(`${asOfParam}T23:59:59.999Z`);

    // ─── Fetch all accounts for this company ─────
    const accounts = await prisma.account.findMany({
      where: {
        companyId,
        company: { tenantId },
      },
      select: {
        id: true,
        code: true,
        nameDe: true,
        nameEn: true,
        type: true,
      }
    });

    const accountMap = new Map(accounts.map((a) => [a.id, a]));

    function resolveAccountName(a: {
      nameDe: string;
      nameEn: string;
    }) {
      return a.nameDe || a.nameEn;
    }

    // ─── Aggregate ALL journal lines up to asOf ──
    const aggregation = await prisma.journalLine.groupBy({
      by: ['accountId'],
      where: {
        entry: {
          companyId,
          company: { tenantId },
          date: { lte: asOfEnd },
        },
      },
      _sum: {
        debit: true,
        credit: true,
      },
    });

    // ─── Classify into ASSET / LIABILITY / EQUITY ─
    const assets: BalanceLine[] = [];
    const liabilities: BalanceLine[] = [];
    const equity: BalanceLine[] = [];

    // Track INCOME/EXPENSE for Current Period Result
    let totalIncomeAmount = 0;
    let totalExpenseAmount = 0;

    for (const agg of aggregation) {
      const account = accountMap.get(agg.accountId);
      if (!account) continue;

      const sumDebit = Number(agg._sum.debit || 0);
      const sumCredit = Number(agg._sum.credit || 0);
      const rawBalance = sumDebit - sumCredit;

      switch (account.type) {
        case 'ASSET': {
          const balance = Math.round(rawBalance * 100) / 100;
          if (balance !== 0) {
            assets.push({
              accountId: account.id,
              code: account.code,
              name: resolveAccountName(account),
              balance,
            });
          }
          break;
        }
        case 'LIABILITY': {
          const balance = Math.round(-rawBalance * 100) / 100;
          if (balance !== 0) {
            liabilities.push({
              accountId: account.id,
              code: account.code,
              name: resolveAccountName(account),
              balance,
            });
          }
          break;
        }
        case 'EQUITY': {
          const balance = Math.round(-rawBalance * 100) / 100;
          if (balance !== 0) {
            equity.push({
              accountId: account.id,
              code: account.code,
              name: resolveAccountName(account),
              balance,
            });
          }
          break;
        }
        case 'INCOME': {
          totalIncomeAmount += sumCredit - sumDebit;
          break;
        }
        case 'EXPENSE': {
          totalExpenseAmount += sumDebit - sumCredit;
          break;
        }
      }
    }

    // ─── Current Period Result (synthetic equity line) ───
    const netProfit = Math.round((totalIncomeAmount - totalExpenseAmount) * 100) / 100;

    if (netProfit !== 0) {
      equity.push({
        accountId: 'P&L',
        code: 'P&L',
        name: 'Current Period Result',
        balance: netProfit,
      });
    }

    // ─── Sort by code ASC ────────────────────────
    assets.sort((a, b) => a.code.localeCompare(b.code));
    liabilities.sort((a, b) => a.code.localeCompare(b.code));
    equity.sort((a, b) => a.code.localeCompare(b.code));

    // ─── Calculate totals ────────────────────────
    const totalAssets = Math.round(assets.reduce((s, l) => s + l.balance, 0) * 100) / 100;
    const totalLiabilities = Math.round(liabilities.reduce((s, l) => s + l.balance, 0) * 100) / 100;
    const totalEquity = Math.round(equity.reduce((s, l) => s + l.balance, 0) * 100) / 100;
    const liabilitiesPlusEquity = Math.round((totalLiabilities + totalEquity) * 100) / 100;
    const diff = Math.round((totalAssets - liabilitiesPlusEquity) * 100) / 100;

    return NextResponse.json({
      asOf: asOfParam,
      assets,
      liabilities,
      equity,
      totals: {
        assets: totalAssets,
        liabilities: totalLiabilities,
        equity: totalEquity,
        liabilitiesPlusEquity,
        diff,
      },
    });
  } catch (error) {
    // Task 26.1 fix: return original Response from requireTenant()
    if (error instanceof Response) {
      return error;
    }
    console.error('Balance sheet error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
