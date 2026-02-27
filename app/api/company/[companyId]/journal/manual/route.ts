// app/api/company/[companyId]/journal/manual/route.ts
// ═══════════════════════════════════════════════════
// Manual Journal Entries
// ═══════════════════════════════════════════════════
//
// Task 28: Create journal entries without a source document.
//
// source = MANUAL, documentType = 'MANUAL', documentId = null
// Period lock enforced. Repost engine ignores MANUAL entries.

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireTenant } from '@/lib/auth/requireTenant';
import { createJournalEntry } from '@/lib/accounting/journalService';
import { assertPeriodOpen } from '@/lib/accounting/periodLock';

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
    const { date: dateParam, description, lines } = body;

    // ─── Validate date ───────────────────────────
    if (!dateParam) {
      return NextResponse.json(
        { error: '"date" is required (YYYY-MM-DD)' },
        { status: 400 }
      );
    }

    const entryDate = new Date(dateParam);
    if (isNaN(entryDate.getTime())) {
      return NextResponse.json(
        { error: 'Invalid date format. Use YYYY-MM-DD.' },
        { status: 400 }
      );
    }

    // ─── Validate lines ──────────────────────────
    if (!lines || !Array.isArray(lines) || lines.length < 2) {
      return NextResponse.json(
        { error: 'At least 2 journal lines are required' },
        { status: 400 }
      );
    }

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (!line.accountId) {
        return NextResponse.json(
          { error: `Line ${i + 1}: accountId is required` },
          { status: 400 }
        );
      }
      // production-strict: do not coerce "10" -> 10
      if (typeof line.debit !== 'number' || typeof line.credit !== 'number') {
        return NextResponse.json(
          { error: `Line ${i + 1}: debit and credit must be numbers` },
          { status: 400 }
        );
      }
    }

    const normalizedDescription =
      typeof description === 'string'
        ? description.trim().slice(0, 500)
        : undefined;

    // ─── Transaction: accounts + period lock + create entry ─
    const result = await prisma.$transaction(async (tx) => {
      // Period lock (contour 1)
      await assertPeriodOpen(tx, { companyId, date: entryDate });

      // Validate accounts exist and belong to company (inside tx)
      const accountIds = [
        ...new Set(lines.map((l: { accountId: string }) => l.accountId)),
      ];

      const accounts = await tx.account.findMany({
        where: {
          id: { in: accountIds },
          companyId,
          company: { tenantId },
        },
        select: { id: true },
      });

      const foundIds = new Set(accounts.map((a) => a.id));
      const missing = accountIds.filter((id) => !foundIds.has(id));
      if (missing.length > 0) {
        // Throw to keep single exit path and to avoid partial writes
        throw new Error(`ACCOUNT_NOT_FOUND:${missing.join(',')}`);
      }

      // Create entry (validations + period lock contour 2 inside journalService)
      const entry = await createJournalEntry(tx, {
        companyId,
        date: entryDate,
        documentType: 'MANUAL',
        documentId: null,
        lines: lines.map(
          (l: { accountId: string; debit: number; credit: number }) => ({
            accountId: l.accountId,
            debit: l.debit,
            credit: l.credit,
          })
        ),
      });

      // Single update: set MANUAL + optional description
      const updated = await tx.journalEntry.update({
        where: { id: entry.id },
        data: {
          source: 'MANUAL',
          ...(normalizedDescription ? { description: normalizedDescription } : {}),
        },
        include: { lines: true },
      });

      return updated;
    });

    return NextResponse.json({ data: result }, { status: 201 });
  } catch (error: unknown) {
    if (error instanceof Response) return error;

    const message =
      error instanceof Error ? error.message : 'Internal server error';

    if (message.startsWith('ACCOUNT_NOT_FOUND:')) {
      const list = message.replace('ACCOUNT_NOT_FOUND:', '').split(',').filter(Boolean);
      return NextResponse.json(
        { error: `Account(s) not found: ${list.join(', ')}` },
        { status: 400 }
      );
    }

    if (message === 'PERIOD_CLOSED' || message.startsWith('PERIOD_CLOSED')) {
      return NextResponse.json(
        { error: 'Accounting period is closed for this date' },
        { status: 409 }
      );
    }

    // Validation errors from journalService
    if (
      message.includes('unbalanced') ||
      message.includes('non-negative') ||
      message.includes('both debit and credit') ||
      message.includes('must have either debit or credit') ||
      message.includes('at least 2 lines')
    ) {
      return NextResponse.json({ error: message }, { status: 400 });
    }

    console.error('Manual journal entry error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}