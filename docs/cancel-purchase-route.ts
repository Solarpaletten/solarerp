// app/api/company/[companyId]/purchases/[purchaseId]/cancel/route.ts
// ═══════════════════════════════════════════════════
// STORNO: Cancel Purchase Document
// ═══════════════════════════════════════════════════
//
// Task 23: Immutable ledger — no deletes.
// Task 24: Period locking — cannot cancel in closed period.
// Task 34: Reverse stock movements.
// Task 35: Block cancel if FIFO lots are consumed.
//
// Flow (single transaction):
//   1. Find purchase + guards (CANCELLED/LOCKED/period)
//   2. §5: Check FIFO lots not consumed
//   3. Find original JournalEntry
//   4. Create reversal JournalEntry (swap debit/credit)
//   5. Reverse stock movements
//   6. Mark CANCELLED

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireTenant } from '@/lib/auth/requireTenant';
import { createJournalEntry } from '@/lib/accounting/journalService';
import { assertPeriodOpen } from '@/lib/accounting/periodLock';
import { createReverseMovements } from '@/lib/accounting/stockService';
import { assertPurchaseLotsNotConsumed } from '@/lib/accounting/fifoService';

type RouteParams = {
  params: Promise<{ companyId: string; purchaseId: string }>;
};

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { tenantId } = await requireTenant(request);
    const { companyId, purchaseId } = await params;

    const company = await prisma.company.findFirst({
      where: { id: companyId, tenantId },
      select: { id: true },
    });
    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    // ═══════════════════════════════════════════════
    // TRANSACTION: Guards + Reversal + Status
    // ═══════════════════════════════════════════════
    const result = await prisma.$transaction(async (tx) => {
      // 1. Find purchase (tenant-safe)
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

      if (!purchase) throw new Error('PURCHASE_NOT_FOUND');
      if (purchase.status === 'CANCELLED') throw new Error('ALREADY_CANCELLED');
      if (purchase.status === 'LOCKED') throw new Error('LOCKED');

      // 2. Period lock check
      await assertPeriodOpen(tx, { companyId, date: purchase.purchaseDate });

      // 3. §5: Block cancel if any lot has been consumed
      await assertPurchaseLotsNotConsumed(tx, companyId, purchaseId);

      // 4. Find original journal entry
      const originalEntry = await tx.journalEntry.findFirst({
        where: {
          documentId: purchaseId,
          documentType: 'PURCHASE',
          companyId,
        },
        include: { lines: true },
      });

      if (!originalEntry) throw new Error('JOURNAL_ENTRY_NOT_FOUND');
      if (!originalEntry.lines?.length) throw new Error('JOURNAL_LINES_EMPTY');

      // 5. Create reversal journal entry (mirror: swap debit↔credit)
      const reversalEntry = await createJournalEntry(tx, {
        companyId,
        date: purchase.purchaseDate,
        documentType: 'PURCHASE_REVERSAL',
        documentId: purchaseId,
        lines: originalEntry.lines.map((line) => ({
          accountId: line.accountId,
          debit: Number(line.credit),
          credit: Number(line.debit),
        })),
      });

      // 6. Reverse stock movements (Task 34)
      await createReverseMovements(tx, companyId, purchaseId, 'PURCHASE_REVERSAL');

      // 7. Mark CANCELLED
      await tx.purchaseDocument.update({
        where: { id: purchaseId },
        data: { status: 'CANCELLED' },
      });

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
    if (error instanceof Response) return error;

    const msg = error instanceof Error ? error.message : 'Unknown error';

    if (msg === 'PURCHASE_NOT_FOUND') {
      return NextResponse.json({ error: 'Purchase not found' }, { status: 404 });
    }
    if (msg === 'ALREADY_CANCELLED') {
      return NextResponse.json({ error: 'Purchase document is already cancelled' }, { status: 409 });
    }
    if (msg === 'LOCKED') {
      return NextResponse.json({ error: 'Purchase document is locked and cannot be cancelled' }, { status: 409 });
    }
    if (msg === 'PERIOD_CLOSED') {
      return NextResponse.json({ error: 'Accounting period is closed for this date' }, { status: 409 });
    }
    if (msg === 'JOURNAL_ENTRY_NOT_FOUND') {
      return NextResponse.json({ error: 'Original journal entry not found for this purchase' }, { status: 404 });
    }
    if (msg === 'JOURNAL_LINES_EMPTY') {
      return NextResponse.json({ error: 'Original journal entry has no lines. Cannot create reversal.' }, { status: 500 });
    }
    if (msg.startsWith('PURCHASE_LOTS_ALREADY_CONSUMED')) {
      return NextResponse.json({ error: msg }, { status: 409 });
    }

    console.error('Cancel purchase error:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
