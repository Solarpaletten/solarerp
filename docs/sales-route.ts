// app/api/company/[companyId]/sales/route.ts
// ═══════════════════════════════════════════════════
// TENANT-SAFE Sales API with FIFO Journal Integration
// ═══════════════════════════════════════════════════
//
// Task 22: Document → Journal Integration
// Task 34: Stock Movements (OUT)
// Task 35: FIFO Allocation + 4-line COGS Journal
//
// POST creates SaleDocument + FIFO allocation + 4-line JournalEntry + StockMovement
// All in ONE transaction. If any step fails → full rollback.

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireTenant } from '@/lib/auth/requireTenant';
import { createJournalEntry } from '@/lib/accounting/journalService';
import { assertPeriodOpen } from '@/lib/accounting/periodLock';
import { createStockMovement } from '@/lib/accounting/stockService';
import { allocateFifoLots } from '@/lib/accounting/fifoService';
import { resolveFifoSaleAccounts, VatMode } from '@/lib/accounting/accountMapping';
import Decimal from 'decimal.js';

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
      include: { items: true },
      orderBy: { saleDate: 'desc' },
    });

    return NextResponse.json({ data: sales, count: sales.length });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error('List sales error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ─── POST /api/company/[companyId]/sales ─────────
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { tenantId } = await requireTenant(request);
    const { companyId } = await params;

    const isOwner = await verifyCompanyOwnership(companyId, tenantId);
    if (!isOwner) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    const body = await request.json();

    const {
      saleDate,
      series,
      number: docNumber,
      clientName,
      warehouseName,
      operationType,
      currencyCode,
      items,
    } = body;

    if (!saleDate || !series || !docNumber || !clientName || !warehouseName || !operationType || !currencyCode) {
      return NextResponse.json({ error: 'Missing required sale fields' }, { status: 400 });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'Sale must have at least one item' }, { status: 400 });
    }

    // ═══════════════════════════════════════════════
    // TRANSACTION: SaleDocument + FIFO + Journal + StockMovement
    // ═══════════════════════════════════════════════
    const result = await prisma.$transaction(async (tx) => {
      await assertPeriodOpen(tx, { companyId, date: new Date(saleDate) });

      // §7: Resolve all 4+ accounts via ACCOUNT_MAP (no hardcoded strings)
      const vatMode: VatMode = body.vatMode || 'VAT_19';
      const accounts = await resolveFifoSaleAccounts(tx, companyId, vatMode);

      // 1. Create SaleDocument
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

      // 2. FIFO Allocation per item (§3 + §6: FOR UPDATE SKIP LOCKED)
      let totalCogs = new Decimal(0);

      for (const item of sale.items) {
        const itemCode = item.itemCode || item.itemName;
        const fifoResult = await allocateFifoLots(tx, {
          companyId,
          warehouseName: sale.warehouseName,
          itemCode,
          itemName: item.itemName,
          quantity: item.quantity,
          documentType: 'SALE',
          documentId: sale.id,
          saleItemId: item.id,
        });
        totalCogs = totalCogs.plus(fifoResult.totalCogs);
      }

      // 3. Calculate revenue
      const totalRevenue = items.reduce(
        (sum: number, item: { quantity: number; priceWithoutVat: number }) =>
          sum + Number(item.quantity) * Number(item.priceWithoutVat),
        0
      );

      if (totalRevenue <= 0) {
        throw new Error('Total revenue must be positive');
      }

      // 4. Create 4-line JournalEntry (§3: DR AR, CR Revenue, DR COGS, CR Inventory)
      const journalLines = [
        { accountId: accounts.arAccountId, debit: totalRevenue, credit: 0 },
        { accountId: accounts.revenueAccountId, debit: 0, credit: totalRevenue },
        ...(totalCogs.gt(0) ? [
          { accountId: accounts.cogsAccountId, debit: Number(totalCogs.toFixed(2)), credit: 0 },
          { accountId: accounts.inventoryAccountId, debit: 0, credit: Number(totalCogs.toFixed(2)) },
        ] : []),
      ];

      const journalEntry = await createJournalEntry(tx, {
        companyId,
        date: new Date(saleDate),
        documentType: 'SALE',
        documentId: sale.id,
        lines: journalLines,
      });

      // 5. Stock Movements (OUT) — Task 34
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
  } catch (error: unknown) {
    if (error instanceof Response) return error;

    if (error && typeof error === 'object' && 'code' in error && (error as { code: string }).code === 'P2002') {
      return NextResponse.json({ error: 'Sale with this series/number already exists' }, { status: 409 });
    }

    const message = error instanceof Error ? error.message : 'Internal server error';

    if (message.startsWith('INSUFFICIENT_STOCK') || message.startsWith('FIFO_ALLOCATION_INCOMPLETE')) {
      return NextResponse.json({ error: message }, { status: 409 });
    }

    if (message.startsWith('ACCOUNT_CODE_NOT_FOUND')) {
      return NextResponse.json({ error: message }, { status: 400 });
    }

    console.error('Create sale error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
