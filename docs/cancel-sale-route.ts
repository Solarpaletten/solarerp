// app/api/company/[companyId]/sales/[saleId]/cancel/route.ts
// ═══════════════════════════════════════════════════
// STORNO: Sale Document Cancellation
// ═══════════════════════════════════════════════════
//
// Task 23: Document Cancellation via Reversal Pattern
// Task 34: Reverse Stock Movements
// Task 35: Restore FIFO lots + 4-line reversal journal
//
// Flow (single transaction):
//   1. Find sale + guards (CANCELLED/LOCKED/period)
//   2. Find original JournalEntry
//   3. Restore FIFO lot allocations
//   4. Create reverse stock movements
//   5. Create reversal JournalEntry (mirror ALL lines)
//   6. Mark document CANCELLED

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireTenant } from '@/lib/auth/requireTenant';
import { createJournalEntry } from '@/lib/accounting/journalService';
import { assertPeriodOpen } from '@/lib/accounting/periodLock';
import { createReverseMovements } from '@/lib/accounting/stockService';
import { reverseSaleAllocations } from '@/lib/accounting/fifoService';

type RouteParams = {
  params: Promise<{ companyId: string; saleId: string }>;
};

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { tenantId } = await requireTenant(request);
    const { companyId, saleId } = await params;

    const company = await prisma.company.findFirst({
      where: { id: companyId, tenantId },
      select: { id: true },
    });
    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    // ═══════════════════════════════════════════════
    // TRANSACTION: FIFO restore + Reversal Journal + Status
    // ═══════════════════════════════════════════════
    const result = await prisma.$transaction(async (tx) => {
      // 1. Find sale document (tenant-safe)
      const sale = await tx.saleDocument.findFirst({
        where: {
          id: saleId,
          companyId,
          company: { tenantId },
        },
      });

      if (!sale) throw new Error('SALE_NOT_FOUND');
      if (sale.status === 'CANCELLED') throw new Error('ALREADY_CANCELLED');
      if (sale.status === 'LOCKED') throw new Error('LOCKED');

      await assertPeriodOpen(tx, { companyId, date: sale.saleDate });

      // 2. Find original journal entry
      const originalEntry = await tx.journalEntry.findFirst({
        where: {
          documentId: saleId,
          documentType: 'SALE',
          companyId,
        },
        include: { lines: true },
      });

      if (!originalEntry || !originalEntry.lines?.length) {
        throw new Error('JOURNAL_LINES_EMPTY');
      }

      // 3. §4: Restore FIFO lot allocations
      await reverseSaleAllocations(tx, companyId, saleId);

      // 4. §4: Create reverse stock movements
      await createReverseMovements(tx, companyId, saleId, 'SALE_REVERSAL');

      // 5. §4: Create reversal JournalEntry (mirror ALL lines — swap debit↔credit)
      const reversalEntry = await createJournalEntry(tx, {
        companyId,
        date: sale.saleDate,
        documentType: 'SALE_REVERSAL',
        documentId: saleId,
        lines: originalEntry.lines.map((line) => ({
          accountId: line.accountId,
          debit: Number(line.credit),
          credit: Number(line.debit),
        })),
      });

      // 6. Mark document CANCELLED
      const updatedSale = await tx.saleDocument.update({
        where: { id: saleId },
        data: { status: 'CANCELLED' },
        include: { items: true },
      });

      return { sale: updatedSale, reversalEntry };
    });

    return NextResponse.json({
      data: result.sale,
      reversal: {
        id: result.reversalEntry.id,
        linesCount: result.reversalEntry.lines.length,
      },
    });
  } catch (error: unknown) {
    if (error instanceof Response) return error;

    const msg = error instanceof Error ? error.message : 'Internal server error';

    if (msg === 'SALE_NOT_FOUND') {
      return NextResponse.json({ error: 'Sale document not found' }, { status: 404 });
    }
    if (msg === 'ALREADY_CANCELLED') {
      return NextResponse.json({ error: 'Sale document is already cancelled' }, { status: 409 });
    }
    if (msg === 'PERIOD_CLOSED') {
      return NextResponse.json({ error: 'Accounting period is closed for this date' }, { status: 409 });
    }
    if (msg === 'LOCKED') {
      return NextResponse.json({ error: 'Sale document is locked and cannot be cancelled' }, { status: 409 });
    }
    if (msg === 'JOURNAL_LINES_EMPTY') {
      return NextResponse.json({ error: 'Original journal entry has no lines. Cannot create reversal.' }, { status: 500 });
    }

    console.error('Cancel sale error:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
