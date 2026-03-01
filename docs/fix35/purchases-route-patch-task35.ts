// ═══════════════════════════════════════════════════
// PATCH for: app/api/company/[companyId]/purchases/route.ts
// Task 35: Add StockLot creation per purchase item
// ═══════════════════════════════════════════════════
//
// ADD import:
//   import { createStockLot } from '@/lib/accounting/fifoService';
//
// ADD this block INSIDE $transaction, AFTER stock movements (Task 34),
// BEFORE return:

      // ─── Task 35: Create FIFO Lots ─────────────
      for (const item of purchase.items) {
        await createStockLot(tx, {
          companyId,
          warehouseName: purchase.warehouseName,
          itemCode: item.itemCode || item.itemName,
          itemName: item.itemName,
          sourceDocumentId: purchase.id,
          purchaseDate: purchase.purchaseDate,
          unitCost: item.priceWithoutVat,
          quantity: item.quantity,
          currencyCode: purchase.currencyCode || 'EUR',
        });
      }

      return { purchase, journalEntry };
