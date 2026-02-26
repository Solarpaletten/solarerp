// app/api/company/[companyId]/purchases/[purchaseId]/cancel/route.ts
// =================================================================
// STORNO: Cancel Purchase Document
// =================================================================
//
// Task 23: Immutable ledger — no deletes.
//
// Flow (single Prisma transaction):
//   1. Find original JournalEntry for this purchase
//   2. Create reversal JournalEntry (swap debit/credit)
//      documentType = 'PURCHASE_REVERSAL'
//   3. Mark PurchaseDocument status = 'CANCELLED'
//
// Result: OSV shows net-zero for cancelled purchase.
// Audit trail preserved: original + reversal both visible.

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireTenant } from '@/lib/auth/requireTenant';
import { createJournalEntry } from '@/lib/accounting/journalService';

type RouteParams = {
  params: Promise<{ companyId: string; purchaseId: string }>;
};

// --- POST /api/company/[companyId]/purchases/[purchaseId]/cancel ---
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { tenantId } = await requireTenant(request);
    const { companyId, purchaseId } = await params;

    // 1. Verify company ownership
    const company = await prisma.company.findFirst({
      where: { id: companyId, tenantId },
      select: { id: true },
    });

    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    // 2. Find the purchase document
    const purchase = await prisma.purchaseDocument.findFirst({
      where: {
        id: purchaseId,
        companyId,
        company: { tenantId }, // defense-in-depth
      },
      select: {
        id: true,
        status: true,
        series: true,
        number: true,
      },
    });

    if (!purchase) {
      return NextResponse.json({ error: 'Purchase not found' }, { status: 404 });
    }

    // 3. Guard: cannot cancel already cancelled
    if (purchase.status === 'CANCELLED') {
      return NextResponse.json(
        { error: `Purchase ${purchase.series}-${purchase.number} is already cancelled` },
        { status: 409 }
      );
    }

    // 4. Guard: cannot cancel locked document
    if (purchase.status === 'LOCKED') {
      return NextResponse.json(
        { error: `Purchase ${purchase.series}-${purchase.number} is locked and cannot be cancelled` },
        { status: 409 }
      );
    }

    // 5. Find original journal entry
    const originalEntry = await prisma.journalEntry.findFirst({
      where: {
        documentId: purchaseId,
        documentType: 'PURCHASE',
        companyId,
      },
      include: {
        lines: {
          select: {
            accountId: true,
            debit: true,
            credit: true,
          },
        },
      },
    });

    if (!originalEntry) {
      return NextResponse.json(
        { error: 'No journal entry found for this purchase. Cannot create reversal.' },
        { status: 404 }
      );
    }

    if (originalEntry.lines.length === 0) {
      return NextResponse.json(
        { error: 'Original journal entry has no lines. Cannot create reversal.' },
        { status: 500 }
      );
    }

    // 6. TRANSACTION: Reversal + Cancel
    // Atomic: if either fails -> both roll back
    const result = await prisma.$transaction(async (tx) => {
      // 6a. Create reversal journal entry
      //     Swap debit <-> credit on every line
      const reversedLines = originalEntry.lines.map((line) => ({
        accountId: line.accountId,
        debit: Number(line.credit),   // was credit -> now debit
        credit: Number(line.debit),   // was debit -> now credit
      }));

      const reversalEntry = await createJournalEntry(tx, {
        companyId,
        date: new Date(), // reversal date = now
        documentType: 'PURCHASE_REVERSAL',
        documentId: purchaseId, // points to same document
        lines: reversedLines,
      });

      // 6b. Mark purchase as CANCELLED
      await tx.purchaseDocument.update({
        where: { id: purchaseId },
        data: { status: 'CANCELLED' },
      });

      return { reversalEntry };
    });

    return NextResponse.json(
      {
        message: `Purchase ${purchase.series}-${purchase.number} cancelled via storno`,
        reversal: {
          id: result.reversalEntry.id,
          documentType: 'PURCHASE_REVERSAL',
          linesCount: result.reversalEntry.lines.length,
        },
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    if (error instanceof Response) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const message =
      error instanceof Error ? error.message : 'Internal server error';
    console.error('Cancel purchase error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
