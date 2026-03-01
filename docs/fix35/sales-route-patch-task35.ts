// ═══════════════════════════════════════════════════
// PATCH for: app/api/company/[companyId]/sales/route.ts
// Task 35: Replace simple stock check with FIFO allocation + 4-line journal
// ═══════════════════════════════════════════════════
//
// ADD imports:
//   import { allocateFifoLots } from '@/lib/accounting/fifoService';
//   import { resolveFifoSaleAccounts, VatMode } from '@/lib/accounting/accountMapping';
//   import Decimal from 'decimal.js';
//
// REMOVE old imports:
//   - getProductBalance (from stockService — no longer needed for sales)
//   - old journal.debitAccountId / journal.creditAccountId usage
//
// The body should now accept optional vatMode (default 'VAT_19'):
//   const vatMode: VatMode = body.vatMode || 'VAT_19';
//
// REPLACE the entire transaction body with:

    const result = await prisma.$transaction(async (tx) => {
      await assertPeriodOpen(tx, { companyId, date: new Date(saleDate) });

      // ─── §7 Resolve all 4+ accounts via ACCOUNT_MAP ───
      const vatMode: VatMode = body.vatMode || 'VAT_19';
      const accounts = await resolveFifoSaleAccounts(tx, companyId, vatMode);

      // ─── 1. Create SaleDocument ────────────────
      const sale = await tx.saleDocument.create({
        data: {
          companyId,
          saleDate: new Date(saleDate),
          payUntil: body.payUntil ? new Date(body.payUntil) : null,
          accountingDate: body.accountingDate ? new Date(body.accountingDate) : null,
          series,
          number: docNumber,
          clientName,
          clientCode: body.clientCode || null,
          payerName: body.payerName || null,
          payerCode: body.payerCode || null,
          unloadAddress: body.unloadAddress || null,
          unloadCity: body.unloadCity || null,
          warehouseName,
          operationType,
          currencyCode,
          employeeName: body.employeeName || null,
          comments: body.comments || null,
          debitAccountId: accounts.arAccountId,
          creditAccountId: accounts.revenueAccountId,
          items: {
            create: items.map((item: {
              itemName: string;
              itemCode?: string;
              barcode?: string;
              quantity: number;
              priceWithoutVat: number;
              unitDiscount?: number;
              vatRate?: number;
              vatClassifier?: string;
              salesAccountCode?: string;
              expenseAccountCode?: string;
              costCenter?: string;
            }) => ({
              itemName: item.itemName,
              itemCode: item.itemCode || null,
              barcode: item.barcode || null,
              quantity: item.quantity,
              priceWithoutVat: item.priceWithoutVat,
              unitDiscount: item.unitDiscount || null,
              vatRate: item.vatRate || null,
              vatClassifier: item.vatClassifier || null,
              salesAccountCode: item.salesAccountCode || null,
              expenseAccountCode: item.expenseAccountCode || null,
              costCenter: item.costCenter || null,
            })),
          },
        },
        include: { items: true },
      });

      // ─── 2. FIFO Allocation per item ───────────
      // §3: allocateFifoLots handles stock check + FOR UPDATE SKIP LOCKED
      let totalCogs = new Decimal(0);

      for (const item of sale.items) {
        const itemCode = item.itemCode || item.itemName;
        const result = await allocateFifoLots(tx, {
          companyId,
          warehouseName: sale.warehouseName,
          itemCode,
          itemName: item.itemName,
          quantity: item.quantity,
          documentType: 'SALE',
          documentId: sale.id,
          saleItemId: item.id,
        });
        totalCogs = totalCogs.plus(result.totalCogs);
      }

      // ─── 3. Calculate revenue ──────────────────
      const totalRevenue = items.reduce(
        (sum: number, item: { quantity: number; priceWithoutVat: number }) =>
          sum + Number(item.quantity) * Number(item.priceWithoutVat),
        0
      );

      if (totalRevenue <= 0) {
        throw new Error('Total revenue must be positive');
      }

      // ─── 4. Create 4-line JournalEntry ─────────
      // §3: DR AR, CR Revenue, DR COGS, CR Inventory
      const journalLines = [
        // Revenue side
        { accountId: accounts.arAccountId, debit: totalRevenue, credit: 0 },
        { accountId: accounts.revenueAccountId, debit: 0, credit: totalRevenue },
        // COGS side (only if COGS > 0)
        ...(totalCogs.gt(0) ? [
          { accountId: accounts.cogsAccountId, debit: Number(totalCogs.toFixed(2)), credit: 0 },
          { accountId: accounts.inventoryAccountId, debit: 0, credit: Number(totalCogs.toFixed(2)) },
        ] : []),
      ];

      // Add VAT line if applicable
      // (VAT handling can be extended later — for now keeping revenue-only)

      const journalEntry = await createJournalEntry(tx, {
        companyId,
        date: new Date(saleDate),
        documentType: 'SALE',
        documentId: sale.id,
        lines: journalLines,
      });

      // ─── 5. Stock Movements (OUT) — Task 34 ───
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
        });
      }

      return { sale, journalEntry, totalCogs: Number(totalCogs.toFixed(2)) };
    });

    return NextResponse.json(
      {
        data: result.sale,
        journal: {
          id: result.journalEntry.id,
          linesCount: result.journalEntry.lines.length,
        },
        cogs: result.totalCogs,
      },
      { status: 201 }
    );

// ═══════════════════════════════════════════════════
// ERROR HANDLING: Add to catch block:
//
//   if (message.startsWith('INSUFFICIENT_STOCK') ||
//       message.startsWith('FIFO_ALLOCATION_INCOMPLETE')) {
//     return NextResponse.json({ error: message }, { status: 409 });
//   }
// ═══════════════════════════════════════════════════
