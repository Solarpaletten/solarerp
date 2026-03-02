// app/api/company/[companyId]/purchases/route.ts
// ═══════════════════════════════════════════════════
// Purchases API: GET (list) + POST (legacy full create)
// ═══════════════════════════════════════════════════
// GET:  List all purchases for company
// POST: Full create with journal + stock + FIFO (legacy)
//       New flow uses: draft → edit → post

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
      include: {
        items: true,
      },
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
// Legacy full-create endpoint. New flow: draft → edit → post
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { tenantId } = await requireTenant(request);
    const { companyId } = await params;

    const isOwner = await verifyCompanyOwnership(companyId, tenantId);
    if (!isOwner) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    const contentLength = request.headers.get('content-length');

    // Draft mode: no body — redirect to draft endpoint
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

    const body = await request.json();

    const {
      purchaseDate, series, number: docNumber, supplierName,
      warehouseName, operationType, currencyCode, items, journal,
    } = body;

    if (!purchaseDate || !series || !docNumber || !supplierName || !warehouseName || !operationType || !currencyCode) {
      return NextResponse.json({ error: 'Missing required purchase fields' }, { status: 400 });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'Purchase must have at least one item' }, { status: 400 });
    }

    if (!journal?.debitAccountId || !journal?.creditAccountId) {
      return NextResponse.json({ error: 'Missing journal accounts: debitAccountId and creditAccountId required' }, { status: 400 });
    }

    const totalAmount = items.reduce(
      (sum: number, item: { quantity: number; priceWithoutVat: number }) =>
        sum + Number(item.quantity) * Number(item.priceWithoutVat), 0
    );

    if (totalAmount <= 0) {
      return NextResponse.json({ error: 'Total amount must be positive' }, { status: 400 });
    }

    const result = await prisma.$transaction(async (tx) => {
      await assertPeriodOpen(tx, { companyId, date: new Date(purchaseDate) });

      const purchase = await tx.purchaseDocument.create({
        data: {
          companyId,
          purchaseDate: new Date(purchaseDate),
          payUntil: body.payUntil ? new Date(body.payUntil) : null,
          series,
          number: docNumber,
          supplierName,
          supplierCode: body.supplierCode || null,
          warehouseName,
          operationType,
          currencyCode,
          employeeName: body.employeeName || null,
          comments: body.comments || null,
          debitAccountId: journal.debitAccountId,
          creditAccountId: journal.creditAccountId,
          status: 'POSTED',
          items: {
            create: items.map((item: {
              itemName: string; itemCode?: string; barcode?: string;
              quantity: number; priceWithoutVat: number; vatRate?: number;
            }) => ({
              itemName: item.itemName,
              itemCode: item.itemCode || null,
              barcode: item.barcode || null,
              quantity: item.quantity,
              priceWithoutVat: item.priceWithoutVat,
              vatRate: item.vatRate || null,
            })),
          },
        },
        include: { items: true },
      });

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

      await tx.purchaseDocument.update({
        where: { id: purchase.id },
        data: {
          debitAccountId: journal.debitAccountId,
          creditAccountId: journal.creditAccountId,
        },
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
          number: docNumber,
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

      return { purchase, journalEntry };
    });

    return NextResponse.json(
      {
        data: result.purchase,
        journal: { id: result.journalEntry.id, linesCount: result.journalEntry.lines.length },
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
