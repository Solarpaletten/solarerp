// ═══════════════════════════════════════════════════
// PATCH for: app/api/company/[companyId]/sales/[saleId]/cancel/route.ts
// Task 35: Restore FIFO lots + 4-line reversal journal
// ═══════════════════════════════════════════════════
//
// ADD imports:
//   import { reverseSaleAllocations } from '@/lib/accounting/fifoService';
//   import { createReverseMovements } from '@/lib/accounting/stockService';
//
// REPLACE the section after finding original journal entry with:

      // §4: Restore FIFO lot allocations
      const { totalCogs } = await reverseSaleAllocations(tx, companyId, saleId);

      // §4: Create reverse stock movements
      await createReverseMovements(tx, companyId, saleId, 'SALE_REVERSAL');

      // §4: Create reversal JournalEntry (mirror ALL lines from original)
      if (!originalEntry || !originalEntry.lines?.length) {
        throw new Error('JOURNAL_LINES_EMPTY');
      }

      const reversalEntry = await createJournalEntry(tx, {
        companyId,
        date: sale.saleDate,
        documentType: 'SALE_REVERSAL',
        documentId: saleId,
        lines: originalEntry.lines.map((line) => ({
          accountId: line.accountId,
          debit: Number(line.credit),   // swap debit ↔ credit
          credit: Number(line.debit),
        })),
      });

      // Update document status
      const updated = await tx.saleDocument.update({
        where: { id: saleId },
        data: { status: 'CANCELLED' },
      });

      return { sale: updated, reversalEntry };

// ═══════════════════════════════════════════════════
// The reversal mirrors all 4 lines:
//   Original:              Reversal:
//   DR AR      → Revenue   CR AR      → Revenue (as debit=0, credit=X)
//   CR Revenue → AR        DR Revenue → AR
//   DR COGS    → Inv       CR COGS    → Inv
//   CR Inv     → COGS      DR Inv     → COGS
//
// Net effect: all 4 accounts return to pre-sale state.
// ═══════════════════════════════════════════════════
