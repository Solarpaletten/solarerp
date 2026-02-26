// app/api/company/[companyId]/sales/[saleId]/cancel/route.ts
// ═══════════════════════════════════════════════════
// STORNO: Sale Document Cancellation
// ═══════════════════════════════════════════════════
//
// Task 23: Document Cancellation via Reversal Pattern
//
// Flow (in ONE transaction):
//   1. Find original JournalEntry for this document
//   2. Create REVERSAL JournalEntry (swap debit/credit)
//   3. Mark document status = 'CANCELLED'
//
// Rule: Ledger is immutable. Cancellation = reversal entry.
// Rule: Nachvollziehbarkeit — full audit trail preserved.

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireTenant } from '@/lib/auth/requireTenant';
import { createJournalEntry } from '@/lib/accounting/journalService';
import { assertPeriodOpen } from '@/lib/accounting/periodLock';

type RouteParams = {
  params: Promise<{ companyId: string; saleId: string }>;
};

// ─── POST /api/company/[companyId]/sales/[saleId]/cancel ───
// Cancel a sale document via STORNO (reversal journal entry)
//
// Response:
// {
//   "data": { ...updatedSaleDocument },
//   "reversal": { "id": "...", "linesCount": 2 }
// }
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { tenantId } = await requireTenant(request);
    const { companyId, saleId } = await params;

    // Verify company belongs to tenant
    const company = await prisma.company.findFirst({
      where: { id: companyId, tenantId },
      select: { id: true },
    });
    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    // ═══════════════════════════════════════════════
    // TRANSACTION: Reversal JournalEntry + status update
    // ═══════════════════════════════════════════════
    const result = await prisma.$transaction(async (tx) => {
      // 1. Find the sale document (tenant-safe)
      const sale = await tx.saleDocument.findFirst({
        where: {
          id: saleId,
          companyId,
          company: { tenantId },
        },
      });

      if (!sale) {
        throw new Error('SALE_NOT_FOUND');
      }

      // 2. Check if already cancelled
      if (sale.status === 'CANCELLED') {
        throw new Error('ALREADY_CANCELLED');
      }

      if (sale.status === 'LOCKED') {
        throw new Error('LOCKED');
      }

      await assertPeriodOpen(tx, { companyId, date: sale.saleDate });

      // 3. Find the original journal entry for this document
      const originalEntry = await tx.journalEntry.findFirst({
        where: {
          documentId: saleId,
          documentType: 'SALE',
          companyId,
        },
        include: {
          lines: true,
        },
      });

      if (!originalEntry) {
        throw new Error('JOURNAL_ENTRY_NOT_FOUND');
      }

      // 4. Create REVERSAL journal entry (swap debit/credit)
      const reversedLines = originalEntry.lines.map((line) => ({
        accountId: line.accountId,
        debit: Number(line.credit),   // swap: original credit → reversal debit
        credit: Number(line.debit),   // swap: original debit → reversal credit
      }));

      const reversalEntry = await createJournalEntry(tx, {
        companyId,
        date: new Date(), // reversal date = now
        documentType: 'SALE_REVERSAL',
        documentId: saleId,
        lines: reversedLines,
      });

      // 5. Mark document as CANCELLED
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
    if (error instanceof Response) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
   
    const message = error instanceof Error ? error.message : 'Internal server error';

    // Friendly error messages
    if (message === 'SALE_NOT_FOUND') {
      return NextResponse.json({ error: 'Sale document not found' }, { status: 404 });
    }
    if (message === 'ALREADY_CANCELLED') {
      return NextResponse.json({ error: 'Sale document is already cancelled' }, { status: 409 });
    }
    
    if (message === 'LOCKED') {
      return NextResponse.json(
        { error: 'Sale document is locked and cannot be cancelled' },
        { status: 409 }
      );
    }

    if (message === 'PERIOD_CLOSED') {
      return NextResponse.json(
        { error: 'Accounting period is closed for this date' },
        { status: 409 }
      );
    }

    if (message === 'JOURNAL_ENTRY_NOT_FOUND') {
      return NextResponse.json(
        { error: 'Original journal entry not found for this sale' },
        { status: 404 }
      );
    }

    console.error('Cancel sale error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
