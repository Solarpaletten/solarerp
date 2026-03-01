// app/api/company/[companyId]/accounts/bulk/route.ts
// ═══════════════════════════════════════════════════
// Bulk Account Operations — Check Usage + Bulk Delete
// ═══════════════════════════════════════════════════
//
// POST /api/company/:id/accounts/bulk
//   body: { action: "check-usage" | "delete", ids: string[] }
//
// check-usage → { deletable, protected (journal lines), system (Stammkonten) }
// delete      → deletes only deletable accounts, skips protected + system

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireTenant } from '@/lib/auth/requireTenant';
import { PROTECTED_ACCOUNT_CODES } from '@/lib/accounting/protectedAccounts';

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

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { tenantId } = await requireTenant(request);
    const { companyId } = await params;

    const isOwner = await verifyCompanyOwnership(companyId, tenantId);
    if (!isOwner) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    const body = await request.json();
    const { action, ids } = body;

    if (!action || !ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { error: 'Required: action ("check-usage" | "delete"), ids (string[])' },
        { status: 400 }
      );
    }

    // ─── Load all requested accounts ─────────────
    const accounts = await prisma.account.findMany({
      where: { id: { in: ids }, companyId },
      select: { id: true, code: true, nameDe: true },
    });

    const accountMap = new Map(accounts.map(a => [a.id, a]));
    const validIds = new Set(accounts.map(a => a.id));

    // ─── Classify: system (Stammkonten) ──────────
    const systemAccounts: { id: string; code: string; nameDe: string }[] = [];
    const nonSystemIds: string[] = [];

    for (const acc of accounts) {
      if (PROTECTED_ACCOUNT_CODES.has(acc.code)) {
        systemAccounts.push(acc);
      } else {
        nonSystemIds.push(acc.id);
      }
    }

    // ─── Classify: journal line usage ────────────
    const lineCounts = nonSystemIds.length > 0
      ? await prisma.journalLine.groupBy({
          by: ['accountId'],
          where: { accountId: { in: nonSystemIds } },
          _count: { id: true },
        })
      : [];

    const lineCountMap = new Map(lineCounts.map(lc => [lc.accountId, lc._count.id]));

    const usedAccounts: { id: string; code: string; nameDe: string; lineCount: number }[] = [];
    const deletableIds: string[] = [];

    for (const id of nonSystemIds) {
      const count = lineCountMap.get(id) || 0;
      const acc = accountMap.get(id)!;
      if (count > 0) {
        usedAccounts.push({ id, code: acc.code, nameDe: acc.nameDe, lineCount: count });
      } else {
        deletableIds.push(id);
      }
    }

    // Sort for display
    systemAccounts.sort((a, b) => a.code.localeCompare(b.code));
    usedAccounts.sort((a, b) => a.code.localeCompare(b.code));

    // ─── CHECK-USAGE ─────────────────────────────
    if (action === 'check-usage') {
      return NextResponse.json({
        total: validIds.size,
        deletable: deletableIds.length,
        system: systemAccounts,    // Stammkonten — never deletable
        protected: usedAccounts,   // have journal entries
      });
    }

    // ─── DELETE ──────────────────────────────────
    if (action === 'delete') {
      if (deletableIds.length === 0) {
        return NextResponse.json({
          deleted: 0,
          systemCount: systemAccounts.length,
          protectedCount: usedAccounts.length,
          message: 'No accounts can be deleted',
        });
      }

      const result = await prisma.account.deleteMany({
        where: { id: { in: deletableIds }, companyId },
      });

      return NextResponse.json({
        deleted: result.count,
        systemCount: systemAccounts.length,
        protectedCount: usedAccounts.length,
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error('Bulk accounts error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
