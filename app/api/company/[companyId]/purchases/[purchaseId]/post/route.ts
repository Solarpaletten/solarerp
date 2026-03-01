// app/api/company/[companyId]/purchases/[purchaseId]/post/route.ts
// ═══════════════════════════════════════════════════
// Task 39: Posting Engine — DRAFT → POSTED
// ═══════════════════════════════════════════════════
// Single transaction:
//   1. Validate document + items
//   2. assertPeriodOpen
//   3. createJournalEntry (DR Inventory / CR Payable)
//   4. createStockMovement IN per item
//   5. createStockLot per item (FIFO)
//   6. status → POSTED
//
// NO partial writes. All or nothing.

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireTenant } from '@/lib/auth/requireTenant';
import { createJournalEntry } from '@/lib/accounting/journalService';
import { assertPeriodOpen } from '@/lib/accounting/periodLock';
import { createStockMovement } from '@/lib/accounting/stockService';
import { createStockLot } from '@/lib/accounting/fifoService';

type RouteParams = {
  params: Promise<{ companyId: string; purchaseId: string }>;
};

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { tenantId } = await requireTenant(request);
    const { companyId, purchaseId } = await params;

    const company = await prisma.company.findFirst({
      where: { id: companyId, tenantId },
      select: { id: true },
    });
    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    // Optional: posting accounts from body
    let bodyAccounts: { debitAccountId?: string; creditAccountId?: string } = {};
    try {
      const body = await request.json();
      bodyAccounts = body || {};
    } catch {
      // No body is ok — will use accounts from document
    }

    const result = await prisma.$transaction(async (tx) => {
      // ── 1. Load document + items ──────────────
      const purchase = await tx.purchaseDocument.findFirst({
        where: {
          id: purchaseId,
          companyId,
          company: { tenantId },
        },
        include: { items: true },
      });

      if (!purchase) throw new Error('PURCHASE_NOT_FOUND');

      // ── 2. Status guard ───────────────────────
      if (purchase.status === 'POSTED') throw new Error('ALREADY_POSTED');
      if (purchase.status === 'CANCELLED') throw new Error('ALREADY_CANCELLED');
      if (purchase.status === 'LOCKED') throw new Error('LOCKED');
      if (purchase.status !== 'DRAFT') throw new Error('ONLY_DRAFT_CAN_POST');

      // ── 3. Validate header ────────────────────
      if (!purchase.supplierName || purchase.supplierName.trim().length === 0) {
        throw new Error('SUPPLIER_NAME_REQUIRED');
      }
      if (!purchase.warehouseName || purchase.warehouseName.trim().length === 0) {
        throw new Error('WAREHOUSE_NAME_REQUIRED');
      }
      if (!purchase.currencyCode) throw new Error('CURRENCY_CODE_REQUIRED');
      if (!purchase.operationType) throw new Error('OPERATION_TYPE_REQUIRED');
      if (!purchase.purchaseDate) throw new Error('PURCHASE_DATE_REQUIRED');

      // ── 4. Validate items ─────────────────────
      if (!purchase.items || purchase.items.length === 0) {
        throw new Error('AT_LEAST_ONE_ITEM_REQUIRED');
      }

      for (const item of purchase.items) {
        if (!item.itemName || item.itemName.trim().length === 0) {
          throw new Error('ITEM_NAME_REQUIRED');
        }
        if (Number(item.quantity) <= 0) {
          throw new Error('ITEM_QTY_MUST_BE_POSITIVE');
        }
        if (Number(item.priceWithoutVat) < 0) {
          throw new Error('ITEM_PRICE_MUST_BE_NON_NEGATIVE');
        }
      }

      // ── 5. Period lock check ──────────────────
      await assertPeriodOpen(tx, { companyId, date: purchase.purchaseDate });

      // ── 6. Resolve posting accounts ───────────
      const debitAccountId =
        bodyAccounts.debitAccountId || purchase.debitAccountId;
      const creditAccountId =
        bodyAccounts.creditAccountId || purchase.creditAccountId;

      if (!debitAccountId || !creditAccountId) {
        throw new Error('MISSING_POSTING_ACCOUNTS');
      }

      // ── 7. Calculate total ────────────────────
      const totalAmount = purchase.items.reduce(
        (sum, item) => sum + Number(item.quantity) * Number(item.priceWithoutVat),
        0
      );

      if (totalAmount <= 0) {
        throw new Error('TOTAL_AMOUNT_MUST_BE_POSITIVE');
      }

      // ── 8. Create Journal Entry ───────────────
      const journalEntry = await createJournalEntry(tx, {
        companyId,
        date: purchase.purchaseDate,
        documentType: 'PURCHASE',
        documentId: purchase.id,
        lines: [
          { accountId: debitAccountId, debit: totalAmount, credit: 0 },
          { accountId: creditAccountId, debit: 0, credit: totalAmount },
        ],
      });

      // ── 9. Stock Movements IN + FIFO Lots ─────
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
          number: purchase.number,
          barcode: item.barcode || undefined,
          vatRate: item.vatRate ? Number(item.vatRate) : undefined,
          priceWithoutVat: Number(item.priceWithoutVat),
          operationType: purchase.operationType,
        });

        await createStockLot(tx, {
          companyId,
          warehouseName: purchase.warehouseName,
          itemCode: item.itemCode || item.itemName,
          itemName: item.itemName,
          sourceDocumentId: purchase.id,
          purchaseDate: purchase.purchaseDate,
          unitCost: Number(item.priceWithoutVat),
          quantity: Number(item.quantity),
          currencyCode: purchase.currencyCode,
        });
      }

      // ── 10. Update status → POSTED ────────────
      const postedDoc = await tx.purchaseDocument.update({
        where: { id: purchaseId },
        data: {
          status: 'POSTED',
          debitAccountId,
          creditAccountId,
        },
        include: { items: { orderBy: { id: 'asc' } } },
      });

      return { purchase: postedDoc, journalEntry };
    });

    return NextResponse.json(
      {
        data: result.purchase,
        journal: {
          id: result.journalEntry.id,
          linesCount: result.journalEntry.lines.length,
        },
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    if (error instanceof Response) return error;

    const msg = error instanceof Error ? error.message : 'Unknown error';

    // Client errors (400)
    const badRequest = [
      'PURCHASE_NOT_FOUND',
      'ONLY_DRAFT_CAN_POST',
      'SUPPLIER_NAME_REQUIRED',
      'WAREHOUSE_NAME_REQUIRED',
      'CURRENCY_CODE_REQUIRED',
      'OPERATION_TYPE_REQUIRED',
      'PURCHASE_DATE_REQUIRED',
      'AT_LEAST_ONE_ITEM_REQUIRED',
      'ITEM_NAME_REQUIRED',
      'ITEM_QTY_MUST_BE_POSITIVE',
      'ITEM_PRICE_MUST_BE_NON_NEGATIVE',
      'MISSING_POSTING_ACCOUNTS',
      'TOTAL_AMOUNT_MUST_BE_POSITIVE',
    ];

    if (badRequest.includes(msg)) {
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    // Conflict errors (409)
    if (msg === 'ALREADY_POSTED') {
      return NextResponse.json({ error: 'Document is already posted' }, { status: 409 });
    }
    if (msg === 'ALREADY_CANCELLED') {
      return NextResponse.json({ error: 'Document is cancelled' }, { status: 409 });
    }
    if (msg === 'LOCKED') {
      return NextResponse.json({ error: 'Document is locked' }, { status: 409 });
    }
    if (msg === 'PERIOD_CLOSED') {
      return NextResponse.json({ error: 'Accounting period is closed for this date' }, { status: 409 });
    }

    if (
      error &&
      typeof error === 'object' &&
      'code' in error &&
      (error as { code: string }).code === 'P2002'
    ) {
      return NextResponse.json({ error: 'Duplicate posting detected' }, { status: 409 });
    }

    console.error('Post purchase error:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
