// ═══════════════════════════════════════════════════
// PATCH for: app/api/company/[companyId]/purchases/route.ts
// Task 34: Add StockMovement creation after JournalEntry
// ═══════════════════════════════════════════════════
//
// ADD this import at the top:
//
//   import { createStockMovement } from '@/lib/accounting/stockService';
//
// ADD this block INSIDE the $transaction, AFTER journalEntry creation
// and AFTER the purchaseDocument.update():
//
// ─── INSERTION POINT (after line ~"return { purchase, journalEntry }") ───

      // ─── Task 34: Stock Movements (IN) ─────────
      // Create one StockMovement per purchase item
      for (const item of purchase.items) {
        await createStockMovement({
          tx,
          companyId,
          warehouseName: purchase.warehouseName,
          itemName: item.itemName,
          itemCode: item.itemCode || item.itemName,
          quantity: Number(item.quantity),
          cost: Number(item.priceWithoutVat),
          direction: 'IN',
          documentType: 'PURCHASE',
          documentId: purchase.id,
          documentDate: purchase.purchaseDate,
          series: purchase.series,
          number: docNumber,
          barcode: item.barcode || undefined,
          vatRate: item.vatRate ? Number(item.vatRate) : undefined,
          priceWithoutVat: Number(item.priceWithoutVat),
          operationType: purchase.operationType,
        });
      }

      return { purchase, journalEntry };

// ═══════════════════════════════════════════════════
// FULL context: The transaction block should look like:
// ═══════════════════════════════════════════════════
//
// const result = await prisma.$transaction(async (tx) => {
//   await assertPeriodOpen(tx, { companyId, date: new Date(purchaseDate) });
//
//   // 1. Create PurchaseDocument
//   const purchase = await tx.purchaseDocument.create({ ... });
//
//   // 2. Create JournalEntry
//   const journalEntry = await createJournalEntry(tx, { ... });
//
//   // 3. Save posting profile
//   await tx.purchaseDocument.update({ ... });
//
//   // 4. Stock Movements (IN) — Task 34
//   for (const item of purchase.items) {
//     await createStockMovement({
//       tx, companyId,
//       warehouseName: purchase.warehouseName,
//       itemName: item.itemName,
//       itemCode: item.itemCode || item.itemName,
//       quantity: Number(item.quantity),
//       cost: Number(item.priceWithoutVat),
//       direction: 'IN',
//       documentType: 'PURCHASE',
//       documentId: purchase.id,
//       documentDate: purchase.purchaseDate,
//       series: purchase.series,
//       number: docNumber,
//       barcode: item.barcode || undefined,
//       vatRate: item.vatRate ? Number(item.vatRate) : undefined,
//       priceWithoutVat: Number(item.priceWithoutVat),
//       operationType: purchase.operationType,
//     });
//   }
//
//   return { purchase, journalEntry };
// });
