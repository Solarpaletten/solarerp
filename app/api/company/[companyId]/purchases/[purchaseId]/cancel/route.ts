// app/api/company/[companyId]/purchases/[purchaseId]/cancel/route.ts
// =================================================================
// STORNO: Cancel Purchase Document
// =================================================================
//
// Task 23: Immutable ledger — no deletes.
// Task 24: Period locking — cannot cancel in closed period.
//
// Flow (single Prisma transaction):
//   1. Find purchase (tenant-safe)
//   2. Guards: CANCELLED / LOCKED
//   3. Period lock check against purchaseDate
//   4. Find original JournalEntry (PURCHASE)
//   5. Create reversal JournalEntry (swap debit/credit) PURCHASE_REVERSAL
//   6. Mark PurchaseDocument status = CANCELLED

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireTenant } from '@/lib/auth/requireTenant';
import { createJournalEntry } from '@/lib/accounting/journalService';
import { assertPeriodOpen } from '@/lib/accounting/periodLock';
import { createReverseMovements } from '@/lib/accounting/stockService';

type RouteParams = {
  params: Promise<{ companyId: string; purchaseId: string }>;
};

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { tenantId } = await requireTenant(request);
    const { companyId, purchaseId } = await params;

    // Fast ownership check (optional, but keeps errors clean)
    const company = await prisma.company.findFirst({
      where: { id: companyId, tenantId },
      select: { id: true },
    });
    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    const result = await prisma.$transaction(async (tx) => {
      // 1) Load purchase inside tx (tenant-safe)
      const purchase = await tx.purchaseDocument.findFirst({
        where: {
          id: purchaseId,
          companyId,
          company: { tenantId },
        },
        select: {
          id: true,
          status: true,
          series: true,
          number: true,
          purchaseDate: true,
        },
      });

      if (!purchase) {
        throw new Error('PURCHASE_NOT_FOUND');
      }

      // 2) Guards
      if (purchase.status === 'CANCELLED') {
        throw new Error('ALREADY_CANCELLED');
      }
      if (purchase.status === 'LOCKED') {
        throw new Error('LOCKED');
      }

      // 3) Task 24: period lock (check by document date)
      await assertPeriodOpen(tx, { companyId, date: purchase.purchaseDate });

      // 4) Original journal entry
      const originalEntry = await tx.journalEntry.findFirst({
        where: {
          documentId: purchaseId,
          documentType: 'PURCHASE',
          companyId,
        },
        include: { lines: true },
      });

      if (!originalEntry) {
        throw new Error('JOURNAL_ENTRY_NOT_FOUND');
      }

  
      if (!originalEntry.lines?.length) {
        throw new Error('JOURNAL_LINES_EMPTY');
      }

      // 5) Reversal lines (mirror, do NOT recalc)
      const reversedLines = originalEntry.lines.map((line) => ({
        accountId: line.accountId,
        debit: Number(line.credit),
        credit: Number(line.debit),
      }));

      // 6) Create reversal journal entry
      const reversalEntry = await createJournalEntry(tx, {
        companyId,
        date: purchase.purchaseDate,
        documentType: 'PURCHASE_REVERSAL',
        documentId: purchaseId,
        lines: reversedLines,
      });

      // 7) Mark purchase CANCELLED
      await tx.purchaseDocument.update({
        where: { id: purchaseId },
        data: { status: 'CANCELLED' },
      });

      // ─── Task 34: Reverse Stock Movements ──────
      // Create opposite movements to cancel stock impact

      await createReverseMovements(
        tx,
        companyId,
        purchaseId,
        'PURCHASE_REVERSAL'
      );

      return {
        series: purchase.series,
        number: purchase.number,
        reversalEntryId: reversalEntry.id,
        reversalLinesCount: reversalEntry.lines.length,
      };
    });

    return NextResponse.json(
      {
        message: `Purchase ${result.series}-${result.number} cancelled successfully.`,
        reversal: {
          id: result.reversalEntryId,
          documentType: 'PURCHASE_REVERSAL',
          linesCount: result.reversalLinesCount,
        },
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    if (error instanceof Response) {
      return error;
    }

    const msg = error instanceof Error ? error.message : 'Unknown error';

    if (msg === 'PURCHASE_NOT_FOUND') {
      return NextResponse.json({ error: 'Purchase not found' }, { status: 404 });
    }
    if (msg === 'ALREADY_CANCELLED') {
      return NextResponse.json(
        { error: 'Purchase document is already cancelled' },
        { status: 409 }
      );
    }

    if (msg === 'PERIOD_CLOSED') {
      return NextResponse.json(
        { error: 'Accounting period is closed for this date' },
        { status: 409 }
      );
    }

    if (msg === 'LOCKED') {
      return NextResponse.json(
        { error: 'Purchase document is locked and cannot be cancelled' },
        { status: 409 }
      );
    }
    if (msg === 'JOURNAL_ENTRY_NOT_FOUND') {
      return NextResponse.json(
        { error: 'Original journal entry not found for this purchase' },
        { status: 404 }
      );
    }
    if (msg === 'JOURNAL_LINES_EMPTY') {
      return NextResponse.json(
        { error: 'Original journal entry has no lines. Cannot create reversal.' },
        { status: 500 }
      );
    }
    
    // PERIOD_CLOSED should bubble from assertPeriodOpen / journalService
    console.error('Cancel purchase error:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}