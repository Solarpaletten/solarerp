// app/api/company/[companyId]/purchases/[purchaseId]/cancel/route.ts
// ═══════════════════════════════════════════════════
// STORNO: Cancel Purchase Document
// ═══════════════════════════════════════════════════
// Task 23: Immutable ledger — no deletes.
// Task 24: Period locking.
// Task 34: Reverse stock movements.
// Task 35: Block cancel if FIFO lots consumed.

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

    const result = await prisma.$transaction(async (tx) => {
      const purchase = await tx.purchaseDocument.findFirst({
        where: { id: purchaseId, companyId, company: { tenantId } },
        select: { id: true, status: true, series: true, number: true, purchaseDate: true },
      });

      if (!purchase) throw new Error('PURCHASE_NOT_FOUND');
      if (purchase.status === 'CANCELLED') throw new Error('ALREADY_CANCELLED');
      if (purchase.status === 'LOCKED') throw new Error('LOCKED');
      if (purchase.status === 'DRAFT') throw new Error('DRAFT_CANNOT_BE_CANCELLED');

      await assertPeriodOpen(tx, { companyId, date: purchase.purchaseDate });
      await assertPurchaseLotsNotConsumed(tx, companyId, purchaseId);

      // Find original journal entry
      const originalJournal = await tx.journalEntry.findFirst({
        where: { companyId, documentType: 'PURCHASE', documentId: purchaseId },
        include: { lines: true },
      });

      if (!originalJournal) throw new Error('ORIGINAL_JOURNAL_NOT_FOUND');

      // Create reversal (swap debit/credit)
      const reversalLines = originalJournal.lines.map((line) => ({
        accountId: line.accountId,
        debit: Number(line.credit),
        credit: Number(line.debit),
      }));

      const reversalEntry = await createJournalEntry(tx, {
        companyId,
        date: purchase.purchaseDate,
        documentType: 'PURCHASE_REVERSAL',
        documentId: purchaseId,
        lines: reversalLines,
      });

      // Reverse stock movements
      await createReverseMovements(tx, companyId, purchaseId, 'PURCHASE');

      // Mark as CANCELLED
      await tx.purchaseDocument.update({
        where: { id: purchaseId },
        data: { status: 'CANCELLED' },
      });

      return { reversalEntry };
    });

    return NextResponse.json({
      data: { status: 'CANCELLED' },
      reversal: { id: result.reversalEntry.id, linesCount: result.reversalEntry.lines.length },
    });
  } catch (error: unknown) {
    if (error instanceof Response) return error;
    const msg = error instanceof Error ? error.message : 'Unknown error';

    if (msg === 'PURCHASE_NOT_FOUND') return NextResponse.json({ error: msg }, { status: 404 });
    if (msg === 'ALREADY_CANCELLED') return NextResponse.json({ error: msg }, { status: 409 });
    if (msg === 'LOCKED') return NextResponse.json({ error: msg }, { status: 409 });
    if (msg === 'DRAFT_CANNOT_BE_CANCELLED') return NextResponse.json({ error: 'Draft documents cannot be cancelled — delete instead' }, { status: 400 });
    if (msg === 'PERIOD_CLOSED') return NextResponse.json({ error: 'Period is closed' }, { status: 409 });
    if (msg.startsWith('FIFO_LOTS_CONSUMED')) return NextResponse.json({ error: msg }, { status: 409 });
    if (msg === 'ORIGINAL_JOURNAL_NOT_FOUND') return NextResponse.json({ error: msg }, { status: 500 });

    console.error('Cancel purchase error:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
