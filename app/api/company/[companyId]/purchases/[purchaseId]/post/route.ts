// app/api/company/[companyId]/purchases/[purchaseId]/post/route.ts
// ═══════════════════════════════════════════════════════════════════════════
// Task 56_9 — Purchase Posting Engine (Production)
// ═══════════════════════════════════════════════════════════════════════════
// Single transaction creates:
//   1. JournalEntry (DR Inventory / CR Accounts Payable)
//   2. JournalLines (balanced)
//   3. StockMovement IN (per item)
//   4. StockLot (FIFO allocation)
//   5. Updates status → POSTED
//   6. Double-post protection (409 Conflict)

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireTenant } from '@/lib/auth/requireTenant';
import { createJournalEntry } from '@/lib/accounting/journalService';
import { assertPeriodOpen } from '@/lib/accounting/periodLock';
import { createStockMovement } from '@/lib/accounting/stockService';
import { createStockLot } from '@/lib/accounting/fifoService';
import { calculateDocumentTotals } from '@/lib/accounting/totalsHelper';
import Decimal from 'decimal.js';

type RouteParams = {
  params: Promise<{ companyId: string; purchaseId: string }>;
};

/**
 * Helper: Get default posting accounts for purchase
 * Priority: 1. Item.purchaseAccountCode 2. Supplier.payableAccountId 3. Fallback defaults
 */
async function resolvePostingAccounts(
  tx: any,
  companyId: string,
  purchase: any
) {
  // Debit account: Inventory/Expense (from item or default)
  let debitAccountId = purchase.debitAccountId; // Might be pre-set
  if (!debitAccountId) {
    // Try to find default inventory/input account
    const inventoryAccount = await tx.account.findFirst({
      where: {
        companyId,
        type: { in: ['ASSET', 'EXPENSE'] },
        code: { in: ['1000', '6000'] }, // Common codes for inventory/input
      },
      select: { id: true },
    });
    if (!inventoryAccount) {
      throw new Error('INVENTORY_ACCOUNT_NOT_FOUND: Import SKR03 or set default posting accounts');
    }
    debitAccountId = inventoryAccount.id;
  }

  // Credit account: Accounts Payable (from supplier or default)
  let creditAccountId = purchase.creditAccountId; // Might be pre-set
  if (!creditAccountId) {
    // Try to find default payables account
    const payableAccount = await tx.account.findFirst({
      where: {
        companyId,
        type: 'LIABILITY',
        code: { in: ['2000', '5000'] }, // Common codes for payables
      },
      select: { id: true },
    });
    if (!payableAccount) {
      throw new Error('PAYABLE_ACCOUNT_NOT_FOUND: Import SKR03 or set default posting accounts');
    }
    creditAccountId = payableAccount.id;
  }

  return { debitAccountId, creditAccountId };
}

/**
 * Main POST handler — Create single posting transaction
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { tenantId } = await requireTenant(request);
    const { companyId, purchaseId } = await params;

    // ─── Verify company ownership ──────────────────
    const company = await prisma.company.findFirst({
      where: { id: companyId, tenantId },
      select: { id: true },
    });
    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    // ─── SINGLE TRANSACTION ────────────────────────
    const result = await prisma.$transaction(
      async (tx) => {
        // 1. Load document
        const purchase = await tx.purchaseDocument.findFirst({
          where: {
            id: purchaseId,
            companyId,
          },
          include: {
            items: { orderBy: { id: 'asc' } },
          },
        });

        if (!purchase) {
          throw new Error('PURCHASE_NOT_FOUND');
        }

        // 2. Validate status
        if (purchase.status === 'POSTED') {
          throw new Error('ALREADY_POSTED');
        }
        if (purchase.status === 'CANCELLED') {
          throw new Error('ALREADY_CANCELLED');
        }

        // 3. Validate items
        if (!purchase.items || purchase.items.length === 0) {
          throw new Error('AT_LEAST_ONE_ITEM_REQUIRED');
        }

        // 4. Validate header fields
        if (!purchase.supplierName?.trim()) {
          throw new Error('SUPPLIER_NAME_REQUIRED');
        }
        if (!purchase.warehouseName?.trim()) {
          throw new Error('WAREHOUSE_NAME_REQUIRED');
        }
        if (!purchase.currencyCode?.trim()) {
          throw new Error('CURRENCY_CODE_REQUIRED');
        }

        // 5. Check period is open
        await assertPeriodOpen(tx, {
          companyId,
          date: purchase.purchaseDate,
        });

        // 6. Validate each item
        for (const item of purchase.items) {
          if (!item.itemName?.trim()) {
            throw new Error(`ITEM_NAME_REQUIRED: row ${item.id}`);
          }
          const qty = Number(item.quantity);
          if (qty <= 0) {
            throw new Error(`ITEM_QTY_MUST_BE_POSITIVE: ${item.itemName}`);
          }
          const price = Number(item.priceWithoutVat);
          if (price < 0) {
            throw new Error(`ITEM_PRICE_MUST_BE_NON_NEGATIVE: ${item.itemName}`);
          }
        }

        // 7. Resolve posting accounts
        const { debitAccountId, creditAccountId } = await resolvePostingAccounts(
          tx,
          companyId,
          purchase
        );

        // 8. Calculate totals (Decimal-safe)
        const totals = calculateDocumentTotals(
          purchase.items.map((item) => ({
            itemName: item.itemName,                          // ✅ ADDED
            itemCode: item.itemCode || item.itemName,         // ✅ ADDED
            quantity: Number(item.quantity),
            priceWithoutVat: Number(item.priceWithoutVat),
            vatRate: Number(item.vatRate || 0),
          }))
        );

        const totalAmount = new Decimal(totals.grossTotal);

        if (totalAmount.lte(0)) {
          throw new Error('TOTAL_AMOUNT_MUST_BE_POSITIVE');
        }

        // 9. Create journal entry (DR / CR)
        const journalEntry = await createJournalEntry(tx, {
          companyId,
          date: purchase.purchaseDate,
          documentType: 'PURCHASE',
          documentId: purchase.id,
          description: `Purchase ${purchase.series}-${purchase.number} — ${purchase.supplierName}`,
          lines: [
            {
              accountId: debitAccountId,
              debit: totalAmount.toNumber(),
              credit: 0,
            },
            {
              accountId: creditAccountId,
              debit: 0,
              credit: totalAmount.toNumber(),
            },
          ],
        });

        // 10. Create stock movements IN + FIFO lots
        for (const item of purchase.items) {
          const qty = Number(item.quantity);
          const cost = Number(item.priceWithoutVat);

          // Stock movement
          await createStockMovement({
            tx,
            companyId,
            warehouseName: purchase.warehouseName,
            itemName: item.itemName,
            itemCode: item.itemCode || item.itemName,
            quantity: qty,
            cost,
            direction: 'IN',
            documentType: 'PURCHASE',
            documentId: purchase.id,
            documentDate: purchase.purchaseDate,
            series: purchase.series,
            number: purchase.number,
            barcode: item.barcode || undefined,
            vatRate: item.vatRate ? Number(item.vatRate) : undefined,
            priceWithoutVat: cost,
            operationType: purchase.operationType,
            unitName: undefined, // TODO: Get from Item master if available
          });

          // FIFO lot
          await createStockLot(tx, {
            companyId,
            warehouseName: purchase.warehouseName,
            itemCode: item.itemCode || item.itemName,
            itemName: item.itemName,
            sourceDocumentId: purchase.id,
            purchaseDate: purchase.purchaseDate,
            unitCost: cost,
            quantity: qty,
            currencyCode: purchase.currencyCode,
          });
        }

        // 11. Update purchase status → POSTED
        const postedDoc = await tx.purchaseDocument.update({
          where: { id: purchaseId },
          data: {
            status: 'POSTED',
            debitAccountId,
            creditAccountId,
          },
          include: {
            items: { orderBy: { id: 'asc' } },
          },
        });

        return {
          purchase: postedDoc,
          journalEntry,
          totals,
        };
      }
    );

    // ─── Success response ──────────────────────────
    return NextResponse.json(
      {
        message: `Purchase ${result.purchase.series}-${result.purchase.number} posted successfully`,
        data: result.purchase,
        accounting: {
          journalEntryId: result.journalEntry.id,
          journalLinesCount: result.journalEntry.lines?.length || 2,
          netAmount: result.totals.subtotal,
          vatAmount: result.totals.vatTotal,
          grossAmount: result.totals.grossTotal,
        },
        stock: {
          movementsCount: result.purchase.items.length,
          lotsCount: result.purchase.items.length,
        },
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    if (error instanceof Response) return error;

    const msg = error instanceof Error ? error.message : 'Unknown error';

    // Map error messages to HTTP responses
    if (msg === 'PURCHASE_NOT_FOUND') {
      return NextResponse.json({ error: 'Purchase not found' }, { status: 404 });
    }
    if (msg === 'ALREADY_POSTED') {
      return NextResponse.json(
        { error: 'Purchase already posted' },
        { status: 409 }
      );
    }
    if (msg === 'ALREADY_CANCELLED') {
      return NextResponse.json(
        { error: 'Purchase is cancelled' },
        { status: 409 }
      );
    }
    if (msg === 'PERIOD_CLOSED') {
      return NextResponse.json(
        { error: 'Accounting period is closed for this date' },
        { status: 409 }
      );
    }

    const badRequests = [
      'AT_LEAST_ONE_ITEM_REQUIRED',
      'SUPPLIER_NAME_REQUIRED',
      'WAREHOUSE_NAME_REQUIRED',
      'CURRENCY_CODE_REQUIRED',
      'ITEM_NAME_REQUIRED',
      'ITEM_QTY_MUST_BE_POSITIVE',
      'ITEM_PRICE_MUST_BE_NON_NEGATIVE',
      'TOTAL_AMOUNT_MUST_BE_POSITIVE',
    ];
    if (badRequests.some((m) => msg.includes(m))) {
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    if (msg.includes('ACCOUNT_NOT_FOUND') || msg.includes('SKR03')) {
      return NextResponse.json(
        { error: msg },
        { status: 400 }
      );
    }

    console.error('Post purchase error:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
