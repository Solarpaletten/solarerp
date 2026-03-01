// app/api/company/[companyId]/purchases/route.ts
// ═══════════════════════════════════════════════════
// TENANT-SAFE Purchases API with Journal + FIFO Integration
// ═══════════════════════════════════════════════════
//
// Task 22: Document → Journal Integration
// Task 34: Stock Movements (IN)
// Task 35: FIFO Lot creation per purchase item
//
// POST creates PurchaseDocument + JournalEntry + StockMovement + StockLot
// All in ONE transaction.

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireTenant } from '@/lib/auth/requireTenant';
import { createJournalEntry } from '@/lib/accounting/journalService';
import { assertPeriodOpen } from '@/lib/accounting/periodLock';
import { createStockMovement } from '@/lib/accounting/stockService';
import { createStockLot } from '@/lib/accounting/fifoService';


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
      include: { items: true },
      orderBy: { purchaseDate: 'desc' },
    });

    return NextResponse.json({ data: purchases, count: purchases.length });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error('List purchases error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}



// ─── POST /api/company/[companyId]/purchases ─────
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { tenantId } = await requireTenant(request);
    const { companyId } = await params;

    const isOwner = await verifyCompanyOwnership(companyId, tenantId);
    if (!isOwner) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    const contentLength = request.headers.get('content-length');

    
    // Draft mode: no body
    if (!contentLength || contentLength === '0') {
      const draft = await prisma.purchaseDocument.create({
        data: {
          companyId,
          purchaseDate: new Date(),
          series: 'P',
          number: '0001',
          supplierName: '',
          warehouseName: '',
          operationType: 'PURCHASE',
          currencyCode: 'EUR',
          status: 'DRAFT',
        },
      });

      return NextResponse.json({ data: draft }, { status: 201 });
    }

    // Only now parse JSON
    const body = await request.json();
    

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

    

    if (!purchaseDate || !series || !docNumber || !supplierName || !warehouseName || !operationType || !currencyCode) {
      return NextResponse.json({ error: 'Missing required purchase fields' }, { status: 400 });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'Purchase must have at least one item' }, { status: 400 });
    }

    if (!journal?.debitAccountId || !journal?.creditAccountId) {
      return NextResponse.json(
        { error: 'Missing journal accounts: debitAccountId and creditAccountId required' },
        { status: 400 }
      );
    }

    const totalAmount = items.reduce(
      (sum: number, item: { quantity: number; priceWithoutVat: number }) =>
        sum + Number(item.quantity) * Number(item.priceWithoutVat),
      0
    );

    if (totalAmount <= 0) {
      return NextResponse.json({ error: 'Total amount must be positive' }, { status: 400 });
    }

    // ═══════════════════════════════════════════════
    // TRANSACTION: Document + Journal + StockMovement + FIFO Lot
    // ═══════════════════════════════════════════════
    const result = await prisma.$transaction(async (tx) => {
      await assertPeriodOpen(tx, { companyId, date: new Date(purchaseDate) });

      // 1. Create PurchaseDocument with items
      const purchase = await tx.purchaseDocument.create({
        data: {
          companyId,
          purchaseDate: new Date(purchaseDate),
          payUntil: body.payUntil ? new Date(body.payUntil) : null,
          advancePaymentDate: body.advancePaymentDate ? new Date(body.advancePaymentDate) : null,
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
            create: items.map((item: {
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
            })),
          },
        },
        include: { items: true },
      });

      // 2. Create JournalEntry
      const journalEntry = await createJournalEntry(tx, {
        companyId,
        date: new Date(purchaseDate),
        documentType: 'PURCHASE',
        documentId: purchase.id,
        lines: [
          { accountId: journal.debitAccountId, debit: totalAmount, credit: 0 },
          { accountId: journal.creditAccountId, debit: 0, credit: totalAmount },
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

      // 5. FIFO Lots — Task 35
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
    if (error instanceof Response) return error;

    if (error && typeof error === 'object' && 'code' in error && (error as { code: string }).code === 'P2002') {
      return NextResponse.json({ error: 'Purchase with this series/number already exists' }, { status: 409 });
    }

    const message = error instanceof Error ? error.message : 'Internal server error';
    console.error('Create purchase error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
