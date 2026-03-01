// ═══════════════════════════════════════════════════
// PATCH for: app/api/company/[companyId]/sales/route.ts
// Task 34: Add stock check + StockMovement creation
// ═══════════════════════════════════════════════════
//
// ADD these imports at the top:
//
//   import { createStockMovement, getProductBalance } from '@/lib/accounting/stockService';
//
// ADD this block INSIDE the $transaction, BEFORE creating SaleDocument:
//
// ─── INSERTION POINT (after assertPeriodOpen, BEFORE sale creation) ───

      // ─── Task 34: Stock availability check ─────
      // Verify sufficient stock before allowing sale
      for (const item of items) {
        const itemCode = item.itemCode || item.itemName;
        const balance = await getProductBalance(tx, companyId, warehouseName, itemCode);
        const requestedQty = Number(item.quantity);

        if (balance < requestedQty) {
          throw new Error(
            `INSUFFICIENT_STOCK: ${item.itemName} (${itemCode}) — available: ${balance}, requested: ${requestedQty} in warehouse "${warehouseName}"`
          );
        }
      }

// ─── INSERTION POINT (after journalEntry + saleDocument.update, BEFORE return) ───

      // ─── Task 34: Stock Movements (OUT) ────────
      for (const item of sale.items) {
        await createStockMovement({
          tx,
          companyId,
          warehouseName: sale.warehouseName,
          itemName: item.itemName,
          itemCode: item.itemCode || item.itemName,
          quantity: Number(item.quantity),
          cost: Number(item.priceWithoutVat),
          direction: 'OUT',
          documentType: 'SALE',
          documentId: sale.id,
          documentDate: sale.saleDate,
          series: sale.series,
          number: docNumber,
          barcode: item.barcode || undefined,
          vatRate: item.vatRate ? Number(item.vatRate) : undefined,
          priceWithoutVat: Number(item.priceWithoutVat),
          operationType: sale.operationType,
        });
      }

      return { sale, journalEntry };

// ═══════════════════════════════════════════════════
// FULL context: The transaction block should look like:
// ═══════════════════════════════════════════════════
//
// const result = await prisma.$transaction(async (tx) => {
//   await assertPeriodOpen(tx, { companyId, date: new Date(saleDate) });
//
//   // STEP 0: Stock availability check — Task 34
//   for (const item of items) {
//     const itemCode = item.itemCode || item.itemName;
//     const balance = await getProductBalance(tx, companyId, warehouseName, itemCode);
//     if (balance < Number(item.quantity)) {
//       throw new Error(`INSUFFICIENT_STOCK: ${item.itemName} — available: ${balance}, requested: ${item.quantity}`);
//     }
//   }
//
//   // 1. Create SaleDocument
//   const sale = await tx.saleDocument.create({ ... });
//
//   // 2. Create JournalEntry
//   const journalEntry = await createJournalEntry(tx, { ... });
//
//   // 3. Save posting profile
//   await tx.saleDocument.update({ ... });
//
//   // 4. Stock Movements (OUT) — Task 34
//   for (const item of sale.items) {
//     await createStockMovement({
//       tx, companyId,
//       warehouseName: sale.warehouseName,
//       itemName: item.itemName,
//       itemCode: item.itemCode || item.itemName,
//       quantity: Number(item.quantity),
//       cost: Number(item.priceWithoutVat),
//       direction: 'OUT',
//       documentType: 'SALE',
//       documentId: sale.id,
//       documentDate: sale.saleDate,
//       series: sale.series,
//       number: docNumber,
//     });
//   }
//
//   return { sale, journalEntry };
// });
//
// ERROR HANDLING:
// In the catch block, handle INSUFFICIENT_STOCK:
//
//   if (message.startsWith('INSUFFICIENT_STOCK')) {
//     return NextResponse.json({ error: message }, { status: 409 });
//   }
