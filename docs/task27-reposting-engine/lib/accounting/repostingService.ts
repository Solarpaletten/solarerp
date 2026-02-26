// lib/accounting/repostingService.ts
// ═══════════════════════════════════════════════════
// Reposting Engine — Aggressive Rebuild (SYSTEM-only)
// ═══════════════════════════════════════════════════
//
// Task 27: Rebuilds all SYSTEM journal entries in a date range
// from the source documents (SaleDocument, PurchaseDocument).
//
// Steps:
//   A) Collect documents in range
//   B) Delete SYSTEM journal entries in range
//   C) Recreate SYSTEM entries from documents
//
// MANUAL entries are never touched.
// Idempotent: repeated calls produce the same result.

import { PrismaClient } from '@prisma/client';
import { createJournalEntry } from './journalService';

type TxClient = Omit<
  PrismaClient,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
>;

export type RepostInput = {
  companyId: string;
  tenantId: string;
  from: Date;
  to: Date;
};

export type RepostResult = {
  range: { from: string; to: string };
  deletedEntries: number;
  recreatedEntries: number;
  documentsProcessed: {
    sales: number;
    purchases: number;
    cancelledSales: number;
    cancelledPurchases: number;
  };
};

/**
 * Rebuild all SYSTEM journal entries in the given date range.
 * Must be called inside prisma.$transaction().
 */
export async function repostRange(
  tx: TxClient,
  input: RepostInput
): Promise<RepostResult> {
  const { companyId, tenantId, from, to } = input;
  const fromDate = from;
  const toDate = new Date(`${to.toISOString().split('T')[0]}T23:59:59.999Z`);

  // ═══════════════════════════════════════════════
  // STEP A: Collect documents in range
  // ═══════════════════════════════════════════════

  const sales = await tx.saleDocument.findMany({
    where: {
      companyId,
      company: { tenantId },
      saleDate: { gte: fromDate, lte: toDate },
    },
    include: { items: true },
  });

  const purchases = await tx.purchaseDocument.findMany({
    where: {
      companyId,
      company: { tenantId },
      purchaseDate: { gte: fromDate, lte: toDate },
    },
    include: { items: true },
  });

  // Statistics
  const stats = {
    sales: sales.filter((s) => s.status !== 'CANCELLED').length,
    purchases: purchases.filter((p) => p.status !== 'CANCELLED').length,
    cancelledSales: sales.filter((s) => s.status === 'CANCELLED').length,
    cancelledPurchases: purchases.filter((p) => p.status === 'CANCELLED').length,
  };

  // ═══════════════════════════════════════════════
  // STEP B: Delete SYSTEM journal entries in range
  // ═══════════════════════════════════════════════
  // JournalLine cascade deletes automatically (onDelete: Cascade)

  const deleteResult = await tx.journalEntry.deleteMany({
    where: {
      companyId,
      source: 'SYSTEM',
      date: { gte: fromDate, lte: toDate },
    },
  });

  // ═══════════════════════════════════════════════
  // STEP C: Recreate SYSTEM entries from documents
  // ═══════════════════════════════════════════════

  let recreatedCount = 0;

  // ─── Sales ─────────────────────────────────────
  for (const sale of sales) {
    // Validate account mapping exists
    if (!sale.debitAccountId || !sale.creditAccountId) {
      throw new Error(
        `MISSING_POSTING_PROFILE: SaleDocument ${sale.id} (${sale.series}-${sale.number}) missing debitAccountId or creditAccountId`
      );
    }

    // Calculate total from items
    const totalAmount = sale.items.reduce(
      (sum, item) => sum + Number(item.quantity) * Number(item.priceWithoutVat),
      0
    );

    if (totalAmount <= 0) continue;

    // Create SALE entry (always, even for cancelled)
    await createJournalEntry(tx, {
      companyId,
      date: sale.saleDate,
      documentType: 'SALE',
      documentId: sale.id,
      lines: [
        { accountId: sale.debitAccountId, debit: totalAmount, credit: 0 },
        { accountId: sale.creditAccountId, debit: 0, credit: totalAmount },
      ],
    });
    recreatedCount++;

    // If cancelled → also create SALE_REVERSAL
    if (sale.status === 'CANCELLED') {
      await createJournalEntry(tx, {
        companyId,
        date: sale.saleDate,
        documentType: 'SALE_REVERSAL',
        documentId: sale.id,
        lines: [
          { accountId: sale.creditAccountId, debit: totalAmount, credit: 0 },
          { accountId: sale.debitAccountId, debit: 0, credit: totalAmount },
        ],
      });
      recreatedCount++;
    }
  }

  // ─── Purchases ─────────────────────────────────
  for (const purchase of purchases) {
    if (!purchase.debitAccountId || !purchase.creditAccountId) {
      throw new Error(
        `MISSING_POSTING_PROFILE: PurchaseDocument ${purchase.id} (${purchase.series}-${purchase.number}) missing debitAccountId or creditAccountId`
      );
    }

    const totalAmount = purchase.items.reduce(
      (sum, item) => sum + Number(item.quantity) * Number(item.priceWithoutVat),
      0
    );

    if (totalAmount <= 0) continue;

    // Create PURCHASE entry
    await createJournalEntry(tx, {
      companyId,
      date: purchase.purchaseDate,
      documentType: 'PURCHASE',
      documentId: purchase.id,
      lines: [
        { accountId: purchase.debitAccountId, debit: totalAmount, credit: 0 },
        { accountId: purchase.creditAccountId, debit: 0, credit: totalAmount },
      ],
    });
    recreatedCount++;

    // If cancelled → also create PURCHASE_REVERSAL
    if (purchase.status === 'CANCELLED') {
      await createJournalEntry(tx, {
        companyId,
        date: purchase.purchaseDate,
        documentType: 'PURCHASE_REVERSAL',
        documentId: purchase.id,
        lines: [
          { accountId: purchase.creditAccountId, debit: totalAmount, credit: 0 },
          { accountId: purchase.debitAccountId, debit: 0, credit: totalAmount },
        ],
      });
      recreatedCount++;
    }
  }

  return {
    range: {
      from: fromDate.toISOString().split('T')[0],
      to: to.toISOString().split('T')[0],
    },
    deletedEntries: deleteResult.count,
    recreatedEntries: recreatedCount,
    documentsProcessed: stats,
  };
}
