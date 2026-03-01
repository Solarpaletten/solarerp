1 

➜  solar-erp git:(main) ✗ cat app/api/company/[companyId]/purchases/route.ts                                                              
// app/api/company/[companyId]/purchases/route.ts
// ═══════════════════════════════════════════════════
// TENANT-SAFE Purchases API with Journal Integration
// ═══════════════════════════════════════════════════
//
// Task 22: Document → Journal Integration
//
// POST creates PurchaseDocument + JournalEntry in ONE transaction.
// If journal creation fails → document is NOT created.
//
// Rule: Document is the event. Journal is the truth.

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireTenant } from '@/lib/auth/requireTenant';
import { createJournalEntry } from '@/lib/accounting/journalService';
import { assertPeriodOpen } from '@/lib/accounting/periodLock';
import { createStockMovement } from '@/lib/accounting/stockService';


type RouteParams = {
  params: Promise<{ companyId: string }>;
};

// ─── HELPER: Verify company belongs to tenant ────
async function verifyCompanyOwnership(companyId: string, tenantId: string) {
  const company = await prisma.company.findFirst({
    where: { id: companyId, tenantId },
    select: { id: true },
  });
  return company !== null;
}

// ─── GET /api/company/[companyId]/purchases ──────
// List all purchases for this company
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { tenantId } = await requireTenant(request);
    const { companyId } = await params;

    const isOwner = await verifyCompanyOwnership(companyId, tenantId);
    if (!isOwner) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    const purchases = await prisma.purchaseDocument.findMany({
      where: {
        companyId,
        company: { tenantId },
      },
      include: {
        items: true,
      },
      orderBy: { purchaseDate: 'desc' },
    });

    return NextResponse.json({ data: purchases, count: purchases.length });
  } catch (error) {
    if (error instanceof Response) {
      return error;
    }
    console.error('List purchases error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}



export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { tenantId } = await requireTenant(request);
    const { companyId } = await params;

    const isOwner = await verifyCompanyOwnership(companyId, tenantId);
    if (!isOwner) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    const body = await request.json();

    // Validate required fields
    const {
      purchaseDate,
      series,
      number: docNumber,
      supplierName,
      warehouseName,
      operationType,
      currencyCode,
      items,
      journal,
    } = body;

    if (
      !purchaseDate ||
      !series ||
      !docNumber ||
      !supplierName ||
      !warehouseName ||
      !operationType ||
      !currencyCode
    ) {
      return NextResponse.json(
        { error: 'Missing required purchase fields' },
        { status: 400 }
      );
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: 'Purchase must have at least one item' },
        { status: 400 }
      );
    }

    if (!journal?.debitAccountId || !journal?.creditAccountId) {
      return NextResponse.json(
        {
          error:
            'Missing journal accounts: debitAccountId and creditAccountId required',
        },
        { status: 400 }
      );
    }

    // Calculate total amount from items
    const totalAmount = items.reduce(
      (sum: number, item: { quantity: number; priceWithoutVat: number }) => {
        return sum + (Number(item.quantity) * Number(item.priceWithoutVat));
      },
      0
    );

    if (totalAmount <= 0) {
      return NextResponse.json(
        { error: 'Total amount must be positive' },
        { status: 400 }
      );
    }

    // ═══════════════════════════════════════════════
    // TRANSACTION: PurchaseDocument + JournalEntry
    // If either fails → both roll back
    // ═══════════════════════════════════════════════
    const result = await prisma.$transaction(async (tx) => {

      await assertPeriodOpen(tx, { companyId, date: new Date(purchaseDate) });

      // 1. Create PurchaseDocument

      // 1. Create PurchaseDocument with items
      const purchase = await tx.purchaseDocument.create({
        data: {
          companyId,
          purchaseDate: new Date(purchaseDate),
          payUntil: body.payUntil ? new Date(body.payUntil) : null,
          advancePaymentDate: body.advancePaymentDate
            ? new Date(body.advancePaymentDate)
            : null,
          series,
          number: docNumber,
          supplierName,
          supplierCode: body.supplierCode || null,
          advanceEmployee: body.advanceEmployee || null,
          warehouseName,
          operationType,
          currencyCode,
          employeeName: body.employeeName || null,
          comments: body.comments || null,
          items: {
            create: items.map(
              (item: {
                itemName: string;
                itemCode?: string;
                barcode?: string;
                quantity: number;
                priceWithoutVat: number;
                unitDiscount?: number;
                vatRate?: number;
                vatClassifier?: string;
                corAccountCode?: string;
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
                corAccountCode: item.corAccountCode || null,
                costCenter: item.costCenter || null,
              })
            ),
          },
        },
        include: { items: true },
      });

      

      // 2. Create JournalEntry
      // PURCHASE: Debit Inventory/Expense, Credit Accounts Payable
      const journalEntry = await createJournalEntry(tx, {
        companyId,
        date: new Date(purchaseDate),
        documentType: 'PURCHASE',
        documentId: purchase.id,
        lines: [
          {
            accountId: journal.debitAccountId,
            debit: totalAmount,
            credit: 0,
          },
          {
            accountId: journal.creditAccountId,
            debit: 0,
            credit: totalAmount,
          },
        ],
      });

      // 3. Save posting profile

      await tx.purchaseDocument.update({
        where: { id: purchase.id },
        data: {
          debitAccountId: journal.debitAccountId,
          creditAccountId: journal.creditAccountId,
        },
      });

      // 4. Stock Movements (IN) — Task 34
      
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
    });

    return NextResponse.json(
      {
        data: result.purchase,
        journal: {
          id: result.journalEntry.id,
          linesCount: result.journalEntry.lines.length,
        },
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    if (error instanceof Response) {
      return error;
    }

    // Handle unique constraint (duplicate series+number)
    if (
      error &&
      typeof error === 'object' &&
      'code' in error &&
      (error as { code: string }).code === 'P2002'
    ) {
      return NextResponse.json(
        { error: 'Purchase with this series/number already exists' },
        { status: 409 }
      );
    }

    const message =
      error instanceof Error ? error.message : 'Internal server error';
    console.error('Create purchase error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
➜  solar-erp git:(main) ✗ cat app/api/company/[companyId]/sales/route.ts                                              
// app/api/company/[companyId]/sales/route.ts
// ═══════════════════════════════════════════════════
// TENANT-SAFE Sales API with Journal Integration
// ═══════════════════════════════════════════════════
//
// Task 22: Document → Journal Integration
//
// POST creates SaleDocument + JournalEntry in ONE transaction.
// If journal creation fails → document is NOT created.
//
// Rule: Document is the event. Journal is the truth.

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireTenant } from '@/lib/auth/requireTenant';
import { createJournalEntry } from '@/lib/accounting/journalService';
import { assertPeriodOpen } from '@/lib/accounting/periodLock';
import { createStockMovement, getProductBalance } from '@/lib/accounting/stockService';

type RouteParams = {
  params: Promise<{ companyId: string }>;
};

// ─── HELPER: Verify company belongs to tenant ────
async function verifyCompanyOwnership(companyId: string, tenantId: string) {
  const company = await prisma.company.findFirst({
    where: { id: companyId, tenantId },
    select: { id: true },
  });
  return company !== null;
}

// ─── GET /api/company/[companyId]/sales ──────────
// List all sales for this company
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { tenantId } = await requireTenant(request);
    const { companyId } = await params;

    const isOwner = await verifyCompanyOwnership(companyId, tenantId);
    if (!isOwner) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    const sales = await prisma.saleDocument.findMany({
      where: {
        companyId,
        company: { tenantId },
      },
      include: {
        items: true,
      },
      orderBy: { saleDate: 'desc' },
    });

    return NextResponse.json({ data: sales, count: sales.length });
  } catch (error) {
    if (error instanceof Response) {
      return error;
    }
    console.error('List sales error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// ─── POST /api/company/[companyId]/sales ─────────
// Create SaleDocument + JournalEntry in ONE transaction
//
// Body:
// {
//   saleDate: string (ISO),
//   series: string,
//   number: string,
//   clientName: string,
//   warehouseName: string,
//   operationType: string,
//   currencyCode: string,
//   items: [{ itemName, quantity, priceWithoutVat, ... }],
//   journal: {
//     debitAccountId: string,
//     creditAccountId: string,
//   }
// }



export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { tenantId } = await requireTenant(request);
    const { companyId } = await params;

    const isOwner = await verifyCompanyOwnership(companyId, tenantId);
    if (!isOwner) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    const body = await request.json();

    // Validate required fields
    const {
      saleDate,
      series,
      number: docNumber,
      clientName,
      warehouseName,
      operationType,
      currencyCode,
      items,
      journal,
    } = body;

    if (
      !saleDate ||
      !series ||
      !docNumber ||
      !clientName ||
      !warehouseName ||
      !operationType ||
      !currencyCode
    ) {
      return NextResponse.json(
        { error: 'Missing required sale fields' },
        { status: 400 }
      );
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: 'Sale must have at least one item' },
        { status: 400 }
      );
    }

    if (!journal?.debitAccountId || !journal?.creditAccountId) {
      return NextResponse.json(
        {
          error:
            'Missing journal accounts: debitAccountId and creditAccountId required',
        },
        { status: 400 }
      );
    }

    

    // Calculate total amount from items
    const totalAmount = items.reduce(
      (sum: number, item: { quantity: number; priceWithoutVat: number }) => {
        return sum + (Number(item.quantity) * Number(item.priceWithoutVat));
      },
      0
    );

    if (totalAmount <= 0) {
      return NextResponse.json(
        { error: 'Total amount must be positive' },
        { status: 400 }
      );
    }



    // ═══════════════════════════════════════════════
    // TRANSACTION: SaleDocument + JournalEntry
    // If either fails → both roll back
    // ═══════════════════════════════════════════════
    const result = await prisma.$transaction(async (tx) => {

      await assertPeriodOpen(tx, { companyId, date: new Date(saleDate) });

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


      // 1. Create SaleDocument

      // 1. Create SaleDocument with items
      const sale = await tx.saleDocument.create({
        data: {
          companyId,
          saleDate: new Date(saleDate),

          payUntil: body.payUntil ? new Date(body.payUntil) : null,
          series,
          number: docNumber,
          clientName,
          clientCode: body.clientCode || null,
          payerName: body.payerName || null,
          payerCode: body.payerCode || null,
          warehouseName,
          operationType,
          currencyCode,
          employeeName: body.employeeName || null,
          status: body.status || null,
          comments: body.comments || null,
          items: {
            create: items.map(
              (item: {
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
              })
            ),
          },
        },
        include: { items: true },
      });
      



      // 2. Create JournalEntry

      // SALE: Debit Accounts Receivable, Credit Revenue

      const journalEntry = await createJournalEntry(tx, {
        companyId,
        date: new Date(saleDate),
        documentType: 'SALE',
        documentId: sale.id,
        lines: [
          {
            accountId: journal.debitAccountId,
            debit: totalAmount,
            credit: 0,
          },
          {
            accountId: journal.creditAccountId,
            debit: 0,
            credit: totalAmount,
          },
        ],
      });
      
      
      // 3. Save posting profile 

      await tx.saleDocument.update({
        where: { id: sale.id },
        data: {
          debitAccountId: journal.debitAccountId,
          creditAccountId: journal.creditAccountId,
        },
      });
      
      // 4. Stock Movements (OUT) — Task 34
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
    });

    

    return NextResponse.json(
      {
        data: result.sale,
        journal: {
          id: result.journalEntry.id,
          linesCount: result.journalEntry.lines.length,
        },
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    if (error instanceof Response) {
      return error;
    }

    // Handle unique constraint (duplicate series+number)
    if (
      error &&
      typeof error === 'object' &&
      'code' in error &&
      (error as { code: string }).code === 'P2002'
    ) {
      return NextResponse.json(
        { error: 'Sale with this series/number already exists' },
        { status: 409 }
      );
    }

    const message =
      error instanceof Error ? error.message : 'Internal server error';

    console.error('Create sale error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
➜  solar-erp git:(main) ✗ 

2

➜  solar-erp git:(main) ✗ cat app/api/company/[companyId]/purchases/[purchaseId]/cancel/route.ts                                          
// app/api/company/[companyId]/purchases/[purchaseId]/cancel/route.ts
// =================================================================
// STORNO: Cancel Purchase Document
// =================================================================
//
// Task 23: Immutable ledger — no deletes.
// Task 24: Period locking — cannot cancel in closed period.
//
// Flow (single Prisma transaction):
//   1. Find purchase (tenant-safe)
//   2. Guards: CANCELLED / LOCKED
//   3. Period lock check against purchaseDate
//   4. Find original JournalEntry (PURCHASE)
//   5. Create reversal JournalEntry (swap debit/credit) PURCHASE_REVERSAL
//   6. Mark PurchaseDocument status = CANCELLED

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireTenant } from '@/lib/auth/requireTenant';
import { createJournalEntry } from '@/lib/accounting/journalService';
import { assertPeriodOpen } from '@/lib/accounting/periodLock';
import { createReverseMovements } from '@/lib/accounting/stockService';

type RouteParams = {
  params: Promise<{ companyId: string; purchaseId: string }>;
};

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { tenantId } = await requireTenant(request);
    const { companyId, purchaseId } = await params;

    // Fast ownership check (optional, but keeps errors clean)
    const company = await prisma.company.findFirst({
      where: { id: companyId, tenantId },
      select: { id: true },
    });
    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    const result = await prisma.$transaction(async (tx) => {
      // 1) Load purchase inside tx (tenant-safe)
      const purchase = await tx.purchaseDocument.findFirst({
        where: {
          id: purchaseId,
          companyId,
          company: { tenantId },
        },
        select: {
          id: true,
          status: true,
          series: true,
          number: true,
          purchaseDate: true,
        },
      });

      if (!purchase) {
        throw new Error('PURCHASE_NOT_FOUND');
      }

      // 2) Guards
      if (purchase.status === 'CANCELLED') {
        throw new Error('ALREADY_CANCELLED');
      }
      if (purchase.status === 'LOCKED') {
        throw new Error('LOCKED');
      }

      // 3) Task 24: period lock (check by document date)
      await assertPeriodOpen(tx, { companyId, date: purchase.purchaseDate });

      // 4) Original journal entry
      const originalEntry = await tx.journalEntry.findFirst({
        where: {
          documentId: purchaseId,
          documentType: 'PURCHASE',
          companyId,
        },
        include: { lines: true },
      });

      if (!originalEntry) {
        throw new Error('JOURNAL_ENTRY_NOT_FOUND');
      }

  
      if (!originalEntry.lines?.length) {
        throw new Error('JOURNAL_LINES_EMPTY');
      }

      // 5) Reversal lines (mirror, do NOT recalc)
      const reversedLines = originalEntry.lines.map((line) => ({
        accountId: line.accountId,
        debit: Number(line.credit),
        credit: Number(line.debit),
      }));

      // 6) Create reversal journal entry
      const reversalEntry = await createJournalEntry(tx, {
        companyId,
        date: purchase.purchaseDate,
        documentType: 'PURCHASE_REVERSAL',
        documentId: purchaseId,
        lines: reversedLines,
      });

      // 7) Mark purchase CANCELLED
      await tx.purchaseDocument.update({
        where: { id: purchaseId },
        data: { status: 'CANCELLED' },
      });

      // ─── Task 34: Reverse Stock Movements ──────
      // Create opposite movements to cancel stock impact

      await createReverseMovements(
        tx,
        companyId,
        purchaseId,
        'PURCHASE_REVERSAL'
      );

      return {
        series: purchase.series,
        number: purchase.number,
        reversalEntryId: reversalEntry.id,
        reversalLinesCount: reversalEntry.lines.length,
      };
    });

    return NextResponse.json(
      {
        message: `Purchase ${result.series}-${result.number} cancelled successfully.`,
        reversal: {
          id: result.reversalEntryId,
          documentType: 'PURCHASE_REVERSAL',
          linesCount: result.reversalLinesCount,
        },
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    if (error instanceof Response) {
      return error;
    }

    const msg = error instanceof Error ? error.message : 'Unknown error';

    if (msg === 'PURCHASE_NOT_FOUND') {
      return NextResponse.json({ error: 'Purchase not found' }, { status: 404 });
    }
    if (msg === 'ALREADY_CANCELLED') {
      return NextResponse.json(
        { error: 'Purchase document is already cancelled' },
        { status: 409 }
      );
    }

    if (msg === 'PERIOD_CLOSED') {
      return NextResponse.json(
        { error: 'Accounting period is closed for this date' },
        { status: 409 }
      );
    }

    if (msg === 'LOCKED') {
      return NextResponse.json(
        { error: 'Purchase document is locked and cannot be cancelled' },
        { status: 409 }
      );
    }
    if (msg === 'JOURNAL_ENTRY_NOT_FOUND') {
      return NextResponse.json(
        { error: 'Original journal entry not found for this purchase' },
        { status: 404 }
      );
    }
    if (msg === 'JOURNAL_LINES_EMPTY') {
      return NextResponse.json(
        { error: 'Original journal entry has no lines. Cannot create reversal.' },
        { status: 500 }
      );
    }
    
    // PERIOD_CLOSED should bubble from assertPeriodOpen / journalService
    console.error('Cancel purchase error:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}%                                                                                                                                                                                       
➜  solar-erp git:(main) ✗ cat app/api/company/[companyId]/sales/[saleId]/cancel/route.ts                                                                  
// app/api/company/[companyId]/sales/[saleId]/cancel/route.ts
// ═══════════════════════════════════════════════════
// STORNO: Sale Document Cancellation
// ═══════════════════════════════════════════════════
//
// Task 23: Document Cancellation via Reversal Pattern
//
// Flow (in ONE transaction):
//   1. Find original JournalEntry for this document
//   2. Create REVERSAL JournalEntry (swap debit/credit)
//   3. Mark document status = 'CANCELLED'
//
// Rule: Ledger is immutable. Cancellation = reversal entry.
// Rule: Nachvollziehbarkeit — full audit trail preserved.

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireTenant } from '@/lib/auth/requireTenant';
import { createJournalEntry } from '@/lib/accounting/journalService';
import { assertPeriodOpen } from '@/lib/accounting/periodLock';
import { createReverseMovements } from '@/lib/accounting/stockService';

type RouteParams = {
  params: Promise<{ companyId: string; saleId: string }>;
};

// ─── POST /api/company/[companyId]/sales/[saleId]/cancel ───
// Cancel a sale document via STORNO (reversal journal entry)
//
// Response:
// {
//   "data": { ...updatedSaleDocument },
//   "reversal": { "id": "...", "linesCount": 2 }
// }
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { tenantId } = await requireTenant(request);
    const { companyId, saleId } = await params;

    // Verify company belongs to tenant
    const company = await prisma.company.findFirst({
      where: { id: companyId, tenantId },
      select: { id: true },
    });
    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    // ═══════════════════════════════════════════════
    // TRANSACTION: Reversal JournalEntry + status update
    // ═══════════════════════════════════════════════
    const result = await prisma.$transaction(async (tx) => {
      // 1. Find the sale document (tenant-safe)
      const sale = await tx.saleDocument.findFirst({
        where: {
          id: saleId,
          companyId,
          company: { tenantId },
        },
      });

      if (!sale) {
        throw new Error('SALE_NOT_FOUND');
      }

      // 2. Check if already cancelled
      if (sale.status === 'CANCELLED') {
        throw new Error('ALREADY_CANCELLED');
      }

      if (sale.status === 'LOCKED') {
        throw new Error('LOCKED');
      }

      await assertPeriodOpen(tx, { companyId, date: sale.saleDate });

      // 3. Find the original journal entry for this document
      const originalEntry = await tx.journalEntry.findFirst({
        where: {
          documentId: saleId,
          documentType: 'SALE',
          companyId,
        },
        include: {
          lines: true,
        },
      });

      if (!originalEntry.lines?.length) {
        throw new Error('JOURNAL_LINES_EMPTY');
      }
  
      // 4. Create REVERSAL journal entry (swap debit/credit)
      const reversedLines = originalEntry.lines.map((line) => ({
        accountId: line.accountId,
        debit: Number(line.credit),   // swap: original credit → reversal debit
        credit: Number(line.debit),   // swap: original debit → reversal credit
      }));

      const reversalEntry = await createJournalEntry(tx, {
        companyId,
        date: sale.saleDate,
        documentType: 'SALE_REVERSAL',
        documentId: saleId,
        lines: reversedLines,
      });

      // 5. Mark document as CANCELLED
      const updatedSale = await tx.saleDocument.update({
        where: { id: saleId },
        data: { status: 'CANCELLED' },
        include: { items: true },
      });

      // ─── Task 34: Reverse Stock Movements ──────
      // Create opposite movements to cancel stock impact
      await createReverseMovements(
        tx,
        companyId,
        saleId,
        'SALE_REVERSAL'
      );

      return { sale: updatedSale, reversalEntry };
    });

    return NextResponse.json({
      data: result.sale,
      reversal: {
        id: result.reversalEntry.id,
        linesCount: result.reversalEntry.lines.length,
      },
    });
  } catch (error: unknown) {
    if (error instanceof Response) {
      return error; 
    }

   
    const msg = error instanceof Error ? error.message : 'Internal server error';

    // Friendly error msg based on known error codes
    if (msg=== 'SALE_NOT_FOUND') {
      return NextResponse.json({ error: 'Sale document not found' }, { status: 404 });
    }
    if (msg === 'ALREADY_CANCELLED') {
      return NextResponse.json({ error: 'Sale document is already cancelled' }, { status: 409 });
    }

    if (msg === 'PERIOD_CLOSED') {
      return NextResponse.json(
        { error: 'Accounting period is closed for this date' },
        { status: 409 }
      );
    }

    if (msg === 'LOCKED') {
      return NextResponse.json(
        { error: 'Sale document is locked and cannot be cancelled' },
        { status: 409 }
      );
    }

    if (msg === 'JOURNAL_ENTRY_NOT_FOUND') {
      return NextResponse.json(
        { error: 'Original journal entry not found for this sale' },
        { status: 404 }
      );
    }

    if (msg === 'JOURNAL_LINES_EMPTY') {
      return NextResponse.json(
        { error: 'Original journal entry has no lines. Cannot create reversal.' },
        { status: 500 }
      );
    }

    console.error('Cancel sale error:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
➜  solar-erp git:(main) ✗ 

3 

➜  solar-erp git:(main) ✗ cat app/(dashboard)/company/[companyId]/warehouse/page.tsx                                                          
// app/(dashboard)/company/[companyId]/warehouse/page.tsx
// ═══════════════════════════════════════════════════
// Warehouse Stock Balance — Task 34
// ═══════════════════════════════════════════════════

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { Package, ChevronDown, Search } from 'lucide-react';

interface ProductBalance {
  warehouseName: string;
  itemCode: string;
  itemName: string;
  quantity: number;
}

export default function WarehousePage() {
  const params = useParams();
  const companyId = params.companyId as string;

  const [balances, setBalances] = useState<ProductBalance[]>([]);
  const [warehouses, setWarehouses] = useState<string[]>([]);
  const [selectedWarehouse, setSelectedWarehouse] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchBalance = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const warehouseParam = selectedWarehouse ? `?warehouse=${encodeURIComponent(selectedWarehouse)}` : '';
      const res = await fetch(`/api/company/${companyId}/warehouse/balance${warehouseParam}`);
      if (res.status === 401) { window.location.href = '/login'; return; }
      if (!res.ok) throw new Error(`API returned ${res.status}`);
      const data = await res.json();
      setBalances(data.balances || []);
      setWarehouses(data.warehouses || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [companyId, selectedWarehouse]);

  useEffect(() => { fetchBalance(); }, [fetchBalance]);

  const filtered = balances.filter(b => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return b.itemCode.toLowerCase().includes(q) || b.itemName.toLowerCase().includes(q);
  });

  // Group by warehouse for display
  const groupedByWarehouse = new Map<string, ProductBalance[]>();
  for (const b of filtered) {
    const existing = groupedByWarehouse.get(b.warehouseName) || [];
    existing.push(b);
    groupedByWarehouse.set(b.warehouseName, existing);
  }

  const totalItems = filtered.length;
  const totalQuantity = filtered.reduce((sum, b) => sum + b.quantity, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-500">Loading warehouse data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">🏭 Warehouse</h1>
          <p className="text-sm text-gray-500 mt-1">
            {totalItems} products · {totalQuantity.toFixed(2)} total units
            {warehouses.length > 0 && ` · ${warehouses.length} warehouse${warehouses.length > 1 ? 's' : ''}`}
          </p>
        </div>
      </div>

      {error && <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">{error}</div>}

      {/* Filters */}
      <div className="flex items-center gap-3 mb-6">
        {/* Warehouse filter */}
        {warehouses.length > 0 && (
          <div className="relative">
            <select
              value={selectedWarehouse}
              onChange={(e) => setSelectedWarehouse(e.target.value)}
              className="appearance-none border border-gray-300 rounded-lg px-4 py-2 pr-8 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
            >
              <option value="">All warehouses</option>
              {warehouses.map(w => <option key={w} value={w}>{w}</option>)}
            </select>
            <ChevronDown className="w-4 h-4 text-gray-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        )}

        {/* Search */}
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by code or name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full border border-gray-300 rounded-lg pl-9 pr-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
        </div>
      </div>

      {/* No data */}
      {balances.length === 0 && !loading && (
        <div className="text-center py-16">
          <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 text-lg font-medium">No stock movements yet</p>
          <p className="text-gray-400 text-sm mt-1">Create a purchase to add items to your warehouse.</p>
        </div>
      )}

      {/* Tables by warehouse */}
      {[...groupedByWarehouse.entries()].map(([warehouse, items]) => (
        <div key={warehouse} className="mb-6">
          <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-2">
            🏭 {warehouse}
          </h2>
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Code</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Product</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Quantity</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, idx) => (
                  <tr key={`${item.itemCode}-${idx}`} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-mono text-sm font-semibold text-gray-800">{item.itemCode}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{item.itemName}</td>
                    <td className={`px-4 py-3 text-sm font-semibold text-right ${item.quantity <= 0 ? 'text-red-600' : item.quantity < 5 ? 'text-amber-600' : 'text-green-700'}`}>
                      {item.quantity.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
}
➜  solar-erp git:(main) ✗ cat app/api/company/[companyId]/warehouse/balance/route.ts                                                      
// app/api/company/[companyId]/warehouse/balance/route.ts
// ═══════════════════════════════════════════════════
// Warehouse Balance API — Task 34
// ═══════════════════════════════════════════════════
//
// GET /api/company/:id/warehouse/balance
//   → all warehouses, all products
//
// GET /api/company/:id/warehouse/balance?warehouse=Main
//   → single warehouse
//
// Response:
// {
//   warehouses: ["Main", "Secondary"],
//   balances: [
//     { warehouseName, itemCode, itemName, quantity }
//   ]
// }

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireTenant } from '@/lib/auth/requireTenant';
import {
  getWarehouseBalance,
  getCompanyBalance,
  getWarehouseNames,
} from '@/lib/accounting/stockService';

type RouteParams = {
  params: Promise<{ companyId: string }>;
};

async function verifyCompanyOwnership(companyId: string, tenantId: string) {
  const company = await prisma.company.findFirst({
    where: { id: companyId, tenantId },
    select: { id: true },
  });
  return company !== null;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { tenantId } = await requireTenant(request);
    const { companyId } = await params;

    const isOwner = await verifyCompanyOwnership(companyId, tenantId);
    if (!isOwner) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    const url = new URL(request.url);
    const warehouseFilter = url.searchParams.get('warehouse');

    // Use read-only transaction for consistency
    const result = await prisma.$transaction(async (tx) => {
      const warehouses = await getWarehouseNames(tx, companyId);

      const balances = warehouseFilter
        ? await getWarehouseBalance(tx, companyId, warehouseFilter)
        : await getCompanyBalance(tx, companyId);

      return { warehouses, balances };
    });

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof Response) return error;
    console.error('Warehouse balance error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
➜  solar-erp git:(main) ✗ 

4

➜  solar-erp git:(main) ✗ cat prisma/schema.prisma                                  
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ============================================
// LEVEL 1: ACCOUNT / TENANT
// ============================================

model Tenant {
  id        String   @id @default(cuid())
  name      String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  companies Company[]
  users     User[]

  @@map("tenants")
}

model User {
  id           String   @id @default(cuid())
  email        String
  passwordHash String
  name         String?
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  tenantId String
  tenant   Tenant @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  sessions Session[]

  @@unique([tenantId, email])
  @@index([tenantId])
  @@map("users")
}

// ============================================
// AUTH: SESSION (HttpOnly cookie auth)
// ============================================

model Session {
  id        String   @id @default(cuid())
  token     String   @unique
  userId    String
  tenantId  String
  expiresAt DateTime
  createdAt DateTime @default(now())

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([expiresAt])
  @@map("sessions")
}

// ============================================
// LEVEL 2: COMPANY / ERP CONTEXT
// ============================================

enum CompanyStatus {
  ACTIVE
  FROZEN
  ARCHIVED
}

enum AccountType {
  ASSET
  LIABILITY
  EQUITY
  INCOME
  EXPENSE
}

model Company {
  id        String        @id @default(cuid())
  tenantId  String
  name      String
  code      String?
  vatNumber String?
  country   String?
  status    CompanyStatus @default(ACTIVE)
  priority  Int           @default(0)
  createdAt DateTime      @default(now())
  updatedAt DateTime      @updatedAt

  tenant Tenant @relation(fields: [tenantId], references: [id])

  // ERP Relations
  clients           Client[]
  items             Item[]
  saleDocuments     SaleDocument[]
  purchaseDocuments PurchaseDocument[]
  stockMovements    StockMovement[]
  bankStatements    BankStatement[]
  accounts          Account[]
  journalEntries    JournalEntry[]
  accountingPeriods AccountingPeriod[]

  @@index([tenantId])
  @@map("companies")
}

model Account {
  id        String      @id @default(cuid())
  companyId String
  code      String
  nameDe    String
  nameEn    String
  type      AccountType
  isActive  Boolean     @default(true)
  createdAt DateTime    @default(now())
  updatedAt DateTime    @updatedAt

  company      Company       @relation(fields: [companyId], references: [id], onDelete: Cascade)
  journalLines JournalLine[]

  @@unique([companyId, code])
  @@index([companyId])
  @@map("accounts")
}

// ============================================
// ACCOUNTING CORE: JOURNAL (LEDGER)
// ============================================

enum JournalSource {
  SYSTEM
  MANUAL
}

model JournalEntry {
  id           String        @id @default(cuid())
  companyId    String
  date         DateTime
  documentType String
  documentId   String?
  source       JournalSource @default(SYSTEM)
  description  String?       
  createdAt    DateTime      @default(now())

  lines   JournalLine[]
  company Company       @relation(fields: [companyId], references: [id], onDelete: Cascade)

  @@index([companyId])
  @@index([date])
  @@index([documentType])
  @@index([documentId])
  @@index([companyId, date])
  @@index([companyId, source])
  @@map("journal_entries")
}

model JournalLine {
  id        String  @id @default(cuid())
  entryId   String
  accountId String
  debit     Decimal @default(0) @db.Decimal(18, 2)
  credit    Decimal @default(0) @db.Decimal(18, 2)

  entry   JournalEntry @relation(fields: [entryId], references: [id], onDelete: Cascade)
  account Account      @relation(fields: [accountId], references: [id])

  @@index([accountId])
  @@index([entryId])
  @@map("journal_lines")
}

// ============================================
// ACCOUNTING: PERIOD LOCKING
// ============================================

model AccountingPeriod {
  id        String    @id @default(cuid())
  companyId String
  year      Int
  month     Int
  isClosed  Boolean   @default(false)
  closedAt  DateTime?
  createdAt DateTime  @default(now())

  company Company @relation(fields: [companyId], references: [id], onDelete: Cascade)

  @@unique([companyId, year, month])
  @@index([companyId])
  @@map("accounting_periods")
}

// ============================================
// ERP MODULE: CLIENTS (COUNTERPARTIES)
// ============================================

enum ClientLocation {
  LOCAL
  EU
  FOREIGN
}

model Client {
  id        String @id @default(cuid())
  companyId String

  name      String
  shortName String?
  code      String?
  notes     String?

  isJuridical Boolean
  location    ClientLocation

  vatCode             String?
  businessLicenseCode String?
  residentTaxCode     String?

  email       String?
  phoneNumber String?
  faxNumber   String?
  contactInfo String?

  payWithinDays       Int?
  creditLimit         Decimal?
  automaticDebtRemind Boolean  @default(false)

  birthday DateTime?

  registrationCountryCode String?
  registrationCity        String?
  registrationAddress     String?
  registrationZipCode     String?

  correspondenceCountryCode String?
  correspondenceCity        String?
  correspondenceAddress     String?
  correspondenceZipCode     String?

  bankAccount   String?
  bankName      String?
  bankCode      String?
  bankSwiftCode String?

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  company Company @relation(fields: [companyId], references: [id])

  @@index([companyId])
  @@map("clients")
}

// ============================================
// ERP MODULE: ITEMS (PRODUCTS / SERVICES)
// ============================================

model Item {
  id        String @id @default(cuid())
  companyId String

  name    String
  code    String?
  barcode String?

  vatRate         Decimal?
  priceWithoutVat Decimal?
  priceWithVat    Decimal?

  attributeName   String?
  groupName       String?
  manufacturer    String?
  countryOfOrigin String?

  unitName String

  purchaseAccountCode String?
  saleAccountCode     String?
  expenseAccountCode  String?

  minimumQuantity Decimal?
  description     String?
  externalId      String?
  freePrice       Boolean  @default(false)

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  company Company @relation(fields: [companyId], references: [id])

  @@index([companyId])
  @@index([code])
  @@index([barcode])
  @@map("items")
}

// ============================================
// ERP MODULE: SALES
// ============================================

model SaleDocument {
  id        String @id @default(cuid())
  companyId String

  saleDate       DateTime
  payUntil       DateTime?
  accountingDate DateTime?
  lockedAt       DateTime?

  series String
  number String

  clientName String
  clientCode String?
  payerName  String?
  payerCode  String?

  unloadAddress String?
  unloadCity    String?
  warehouseName String

  operationType String
  currencyCode  String
  employeeName  String?
  status        String?
  comments      String?
  debitAccountId  String?   
  creditAccountId String?   

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  items   SaleItem[]
  company Company    @relation(fields: [companyId], references: [id])

  @@unique([companyId, series, number])
  @@index([companyId])
  @@index([saleDate])
  @@map("sale_documents")
}

model SaleItem {
  id     String @id @default(cuid())
  saleId String

  itemName String
  itemCode String?
  barcode  String?

  quantity        Decimal
  priceWithoutVat Decimal
  unitDiscount    Decimal?
  vatRate         Decimal?
  vatClassifier   String?

  salesAccountCode   String?
  expenseAccountCode String?
  costCenter         String?

  postscript String?
  accComment String?

  intraTransactionCode String?
  intraDeliveryTerms   String?
  intraTransportCode   String?
  intraCountryCode     String?
  intrastatWeightNetto Decimal?
  vatRateName          String?

  sale SaleDocument @relation(fields: [saleId], references: [id], onDelete: Cascade)

  @@index([saleId])
  @@map("sale_items")
}

// ============================================
// ERP MODULE: PURCHASES
// ============================================

model PurchaseDocument {
  id        String @id @default(cuid())
  companyId String

  purchaseDate       DateTime
  payUntil           DateTime?
  advancePaymentDate DateTime?

  series String
  number String

  supplierName    String
  supplierCode    String?
  advanceEmployee String?

  warehouseName String

  operationType String
  currencyCode  String
  employeeName  String?
  comments      String?
  status        String?
  debitAccountId  String?   
  creditAccountId String?   

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  items   PurchaseItem[]
  company Company        @relation(fields: [companyId], references: [id])

  @@unique([companyId, series, number])
  @@index([companyId])
  @@index([purchaseDate])
  @@map("purchase_documents")
}

model PurchaseItem {
  id         String @id @default(cuid())
  purchaseId String

  itemName String
  itemCode String?
  barcode  String?

  quantity        Decimal
  priceWithoutVat Decimal
  unitDiscount    Decimal?
  vatRate         Decimal?
  vatClassifier   String?

  corAccountCode String?
  costCenter     String?

  notes        String?
  accComment   String?
  carRegNumber String?
  fuelCard     String?

  intraTransactionCode     String?
  intraDeliveryTerms       String?
  intraTransportCode       String?
  intraCountryOfOriginCode String?
  intrastatWeightNetto     Decimal?

  vatRegister String?
  gpaisMethod String?

  purchase PurchaseDocument @relation(fields: [purchaseId], references: [id], onDelete: Cascade)

  @@index([purchaseId])
  @@map("purchase_items")
}

// ============================================
// ERP MODULE: STOCK MOVEMENTS
// ============================================

model StockMovement {
  id        String @id @default(cuid())
  companyId String

  warehouseName String
  operationType String
  documentDate  DateTime
  series        String
  number        String

  itemName String
  itemCode String?
  barcode  String?

  quantity        Decimal
  cost            Decimal
  vatRate         Decimal?
  priceWithoutVat Decimal?
  priceWithVat    Decimal?

  attributeName   String?
  groupName       String?
  manufacturer    String?
  countryOfOrigin String?
  unitName        String?

  purchaseAccountCode String?
  saleAccountCode     String?
  expenseAccountCode  String?

  minimumQuantity Decimal?
  description     String?
  externalId      String?
  freePrice       Boolean  @default(false)

  // ─── Task 34: Stock Engine additions ───────────
  direction    String   // IN | OUT
  documentType String   // PURCHASE | SALE | ADJUSTMENT | PURCHASE_REVERSAL | SALE_REVERSAL
  documentId   String?  // FK to PurchaseDocument.id or SaleDocument.id

  createdAt DateTime @default(now())

  company Company @relation(fields: [companyId], references: [id])

  @@index([companyId])
  @@index([documentDate])
  @@index([warehouseName])
  @@index([itemCode])
  @@index([direction])
  @@index([documentId])
  @@map("stock_movements")
}


// ============================================
// ERP MODULE: BANK STATEMENTS
// ============================================

model BankStatement {
  id        String @id @default(cuid())
  companyId String

  accountNumber String
  currencyCode  String
  period        DateTime

  transactionNumber String
  amount            Decimal
  operationType     Int

  clientName        String
  clientCode        String?
  clientBankAccount String?

  paymentPurpose String?

  correspondenceAccountCode String?
  correspondenceAccountName String?

  createdAt DateTime @default(now())

  company Company @relation(fields: [companyId], references: [id])

  @@unique([companyId, transactionNumber])
  @@index([companyId])
  @@index([period])
  @@map("bank_statements")
}
➜  solar-erp git:(main) ✗ cat lib/accounting/stockService.ts                    
// lib/accounting/stockService.ts
// ═══════════════════════════════════════════════════
// Stock Movement Service — Task 34
// ═══════════════════════════════════════════════════
//
// Principle: We never store stock quantity.
// We always compute from movement history.
// This is accounting-correct (like journal entries for money).
//
// Functions:
//   createStockMovement()  — insert IN/OUT movement
//   createReverseMovement() — reverse a document's movements (STORNO)
//   getProductBalance()     — balance for one product in one warehouse
//   getWarehouseBalance()   — all product balances in one warehouse
//   getCompanyBalance()     — all product balances across all warehouses

import { Prisma } from '@prisma/client';

// Prisma transaction client type
type TxClient = Prisma.TransactionClient;

// ─── Types ───────────────────────────────────────
export type StockDirection = 'IN' | 'OUT';
export type StockDocumentType = 'PURCHASE' | 'SALE' | 'ADJUSTMENT' | 'PURCHASE_REVERSAL' | 'SALE_REVERSAL';

export interface CreateStockMovementParams {
  tx: TxClient;
  companyId: string;
  warehouseName: string;
  itemName: string;
  itemCode: string;
  quantity: number;
  cost: number;
  direction: StockDirection;
  documentType: StockDocumentType;
  documentId: string;
  documentDate: Date;
  series: string;
  number: string;
  // Optional fields
  barcode?: string;
  unitName?: string;
  vatRate?: number;
  priceWithoutVat?: number;
  operationType?: string;
}

export interface ProductBalance {
  warehouseName: string;
  itemCode: string;
  itemName: string;
  quantity: number;
}

// ─── Create Stock Movement ───────────────────────
// Called inside transaction after JournalEntry is created.
// Only when document is POSTED.
export async function createStockMovement(params: CreateStockMovementParams) {
  const { tx, ...data } = params;

  return tx.stockMovement.create({
    data: {
      companyId: data.companyId,
      warehouseName: data.warehouseName,
      operationType: data.operationType || data.documentType,
      documentDate: data.documentDate,
      series: data.series,
      number: data.number,
      itemName: data.itemName,
      itemCode: data.itemCode || null,
      barcode: data.barcode || null,
      quantity: data.quantity,
      cost: data.cost,
      vatRate: data.vatRate ?? null,
      priceWithoutVat: data.priceWithoutVat ?? null,
      unitName: data.unitName || null,
      direction: data.direction,
      documentType: data.documentType,
      documentId: data.documentId,
    },
  });
}

// ─── Create Reverse Movements ────────────────────
// For STORNO: find all movements for a document, create opposite.
// e.g. PURCHASE movements (IN) → PURCHASE_REVERSAL movements (OUT)
export async function createReverseMovements(
  tx: TxClient,
  companyId: string,
  documentId: string,
  reversalDocumentType: StockDocumentType
) {
  // Find original movements
  const originals = await tx.stockMovement.findMany({
    where: { companyId, documentId },
  });

  if (originals.length === 0) return [];

  const reversals = [];
  for (const orig of originals) {
    const reversal = await tx.stockMovement.create({
      data: {
        companyId: orig.companyId,
        warehouseName: orig.warehouseName,
        operationType: reversalDocumentType,
        documentDate: orig.documentDate,
        series: orig.series,
        number: orig.number,
        itemName: orig.itemName,
        itemCode: orig.itemCode,
        barcode: orig.barcode,
        quantity: orig.quantity, // same quantity
        cost: orig.cost,
        vatRate: orig.vatRate,
        priceWithoutVat: orig.priceWithoutVat,
        unitName: orig.unitName,
        direction: orig.direction === 'IN' ? 'OUT' : 'IN', // reversed
        documentType: reversalDocumentType,
        documentId: orig.documentId,
      },
    });
    reversals.push(reversal);
  }

  return reversals;
}

// ─── Get Product Balance (single product, single warehouse) ─
// Returns quantity (can be negative if oversold somehow).
export async function getProductBalance(
  tx: TxClient,
  companyId: string,
  warehouseName: string,
  itemCode: string
): Promise<number> {
  const movements = await tx.stockMovement.findMany({
    where: { companyId, warehouseName, itemCode },
    select: { direction: true, quantity: true },
  });

  let balance = 0;
  for (const m of movements) {
    const qty = Number(m.quantity);
    balance += m.direction === 'IN' ? qty : -qty;
  }

  return balance;
}

// ─── Get Warehouse Balance ───────────────────────
// Returns all products with their aggregated quantity for one warehouse.
export async function getWarehouseBalance(
  tx: TxClient,
  companyId: string,
  warehouseName: string
): Promise<ProductBalance[]> {
  const movements = await tx.stockMovement.findMany({
    where: { companyId, warehouseName },
    select: { itemCode: true, itemName: true, direction: true, quantity: true },
  });

  // Aggregate by itemCode
  const map = new Map<string, { itemName: string; quantity: number }>();

  for (const m of movements) {
    const code = m.itemCode || m.itemName; // fallback to itemName if no code
    const existing = map.get(code) || { itemName: m.itemName, quantity: 0 };
    const qty = Number(m.quantity);
    existing.quantity += m.direction === 'IN' ? qty : -qty;
    map.set(code, existing);
  }

  const result: ProductBalance[] = [];
  for (const [itemCode, data] of map) {
    result.push({
      warehouseName,
      itemCode,
      itemName: data.itemName,
      quantity: data.quantity,
    });
  }

  return result.sort((a, b) => a.itemCode.localeCompare(b.itemCode));
}

// ─── Get Company Balance ─────────────────────────
// All warehouses, all products.
export async function getCompanyBalance(
  tx: TxClient,
  companyId: string
): Promise<ProductBalance[]> {
  const movements = await tx.stockMovement.findMany({
    where: { companyId },
    select: { warehouseName: true, itemCode: true, itemName: true, direction: true, quantity: true },
  });

  const map = new Map<string, { warehouseName: string; itemName: string; quantity: number }>();

  for (const m of movements) {
    const code = m.itemCode || m.itemName;
    const key = `${m.warehouseName}::${code}`;
    const existing = map.get(key) || { warehouseName: m.warehouseName, itemName: m.itemName, quantity: 0 };
    const qty = Number(m.quantity);
    existing.quantity += m.direction === 'IN' ? qty : -qty;
    map.set(key, existing);
  }

  const result: ProductBalance[] = [];
  for (const [, data] of map) {
    result.push({
      warehouseName: data.warehouseName,
      itemCode: data.warehouseName, // will fix below
      itemName: data.itemName,
      quantity: data.quantity,
    });
  }

  // Fix: extract actual itemCode from map keys
  const resultFixed: ProductBalance[] = [];
  for (const [key, data] of map) {
    const [wh, ic] = key.split('::');
    resultFixed.push({
      warehouseName: wh,
      itemCode: ic,
      itemName: data.itemName,
      quantity: data.quantity,
    });
  }

  return resultFixed.sort((a, b) =>
    a.warehouseName.localeCompare(b.warehouseName) || a.itemCode.localeCompare(b.itemCode)
  );
}

// ─── Get Warehouse Names ─────────────────────────
// Returns distinct warehouse names that have movements.
export async function getWarehouseNames(
  tx: TxClient,
  companyId: string
): Promise<string[]> {
  const result = await tx.stockMovement.groupBy({
    by: ['warehouseName'],
    where: { companyId },
    orderBy: { warehouseName: 'asc' },
  });

  return result.map(r => r.warehouseName);
}
➜  solar-erp git:(main) ✗ 

