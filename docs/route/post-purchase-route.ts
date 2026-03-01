// app/api/company/[companyId]/purchases/[purchaseId]/post/route.ts
// ═══════════════════════════════════════════════════
// Task 39 + Task 40: Posting Engine — DRAFT → POSTED
// ═══════════════════════════════════════════════════
// Auto-resolves accounts via ACCOUNT_MAP (SKR03).
// Single transaction: validate → period → journal → stock → FIFO → POSTED

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireTenant } from '@/lib/auth/requireTenant';
import { createJournalEntry } from '@/lib/accounting/journalService';
import { assertPeriodOpen } from '@/lib/accounting/periodLock';
import { createStockMovement } from '@/lib/accounting/stockService';
import { createStockLot } from '@/lib/accounting/fifoService';
import { resolvePurchaseAccounts } from '@/lib/accounting/accountMapping';

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

    const result = await prisma.$transaction(async (tx) => {
      const purchase = await tx.purchaseDocument.findFirst({
        where: { id: purchaseId, companyId, company: { tenantId } },
        include: { items: true },
      });

      if (!purchase) throw new Error('PURCHASE_NOT_FOUND');
      if (purchase.status === 'POSTED') throw new Error('ALREADY_POSTED');
      if (purchase.status === 'CANCELLED') throw new Error('ALREADY_CANCELLED');
      if (purchase.status === 'LOCKED') throw new Error('LOCKED');
      if (purchase.status !== 'DRAFT') throw new Error('ONLY_DRAFT_CAN_POST');

      if (!purchase.supplierName || purchase.supplierName.trim().length === 0) throw new Error('SUPPLIER_NAME_REQUIRED');
      if (!purchase.warehouseName || purchase.warehouseName.trim().length === 0) throw new Error('WAREHOUSE_NAME_REQUIRED');
      if (!purchase.currencyCode) throw new Error('CURRENCY_CODE_REQUIRED');
      if (!purchase.operationType) throw new Error('OPERATION_TYPE_REQUIRED');
      if (!purchase.purchaseDate) throw new Error('PURCHASE_DATE_REQUIRED');

      if (!purchase.items || purchase.items.length === 0) throw new Error('AT_LEAST_ONE_ITEM_REQUIRED');

      for (const item of purchase.items) {
        if (!item.itemName || item.itemName.trim().length === 0) throw new Error('ITEM_NAME_REQUIRED');
        if (Number(item.quantity) <= 0) throw new Error('ITEM_QTY_MUST_BE_POSITIVE');
        if (Number(item.priceWithoutVat) < 0) throw new Error('ITEM_PRICE_MUST_BE_NON_NEGATIVE');
      }

      await assertPeriodOpen(tx, { companyId, date: purchase.purchaseDate });

      // Auto-resolve: DR 3400 (Wareneingang) / CR 1600 (Verbindlichkeiten)
      const accounts = await resolvePurchaseAccounts(tx, companyId, 'VAT_19');

      const totalAmount = purchase.items.reduce(
        (sum, item) => sum + Number(item.quantity) * Number(item.priceWithoutVat), 0
      );
      if (totalAmount <= 0) throw new Error('TOTAL_AMOUNT_MUST_BE_POSITIVE');

      const journalEntry = await createJournalEntry(tx, {
        companyId,
        date: purchase.purchaseDate,
        documentType: 'PURCHASE',
        documentId: purchase.id,
        lines: [
          { accountId: accounts.debitAccountId, debit: totalAmount, credit: 0 },
          { accountId: accounts.creditAccountId, debit: 0, credit: totalAmount },
        ],
      });

      for (const item of purchase.items) {
        await createStockMovement({
          tx, companyId,
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

      const postedDoc = await tx.purchaseDocument.update({
        where: { id: purchaseId },
        data: { status: 'POSTED', debitAccountId: accounts.debitAccountId, creditAccountId: accounts.creditAccountId },
        include: { items: { orderBy: { id: 'asc' } } },
      });

      return { purchase: postedDoc, journalEntry };
    });

    return NextResponse.json({
      data: result.purchase,
      journal: { id: result.journalEntry.id, linesCount: result.journalEntry.lines.length },
    }, { status: 200 });
  } catch (error: unknown) {
    if (error instanceof Response) return error;
    const msg = error instanceof Error ? error.message : 'Unknown error';

    const badRequest = [
      'PURCHASE_NOT_FOUND', 'ONLY_DRAFT_CAN_POST', 'SUPPLIER_NAME_REQUIRED', 'WAREHOUSE_NAME_REQUIRED',
      'CURRENCY_CODE_REQUIRED', 'OPERATION_TYPE_REQUIRED', 'PURCHASE_DATE_REQUIRED',
      'AT_LEAST_ONE_ITEM_REQUIRED', 'ITEM_NAME_REQUIRED', 'ITEM_QTY_MUST_BE_POSITIVE',
      'ITEM_PRICE_MUST_BE_NON_NEGATIVE', 'TOTAL_AMOUNT_MUST_BE_POSITIVE',
    ];
    if (badRequest.includes(msg)) return NextResponse.json({ error: msg }, { status: 400 });

    if (msg === 'ALREADY_POSTED') return NextResponse.json({ error: 'Document is already posted' }, { status: 409 });
    if (msg === 'ALREADY_CANCELLED') return NextResponse.json({ error: 'Document is cancelled' }, { status: 409 });
    if (msg === 'LOCKED') return NextResponse.json({ error: 'Document is locked' }, { status: 409 });
    if (msg === 'PERIOD_CLOSED') return NextResponse.json({ error: 'Accounting period is closed' }, { status: 409 });

    if (msg.startsWith('ACCOUNT_CODE_NOT_FOUND')) {
      return NextResponse.json({ error: `Posting accounts not found. Import SKR03 first. (${msg})` }, { status: 400 });
    }

    if (error && typeof error === 'object' && 'code' in error && (error as { code: string }).code === 'P2002') {
      return NextResponse.json({ error: 'Duplicate posting detected' }, { status: 409 });
    }

    console.error('Post purchase error:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
