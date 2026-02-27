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

─── POST /api/company/[companyId]/sales ─────────
Create SaleDocument + JournalEntry in ONE transaction

Body:
{
  saleDate: string (ISO),
  series: string,
  number: string,
  clientName: string,
  warehouseName: string,
  operationType: string,
  currencyCode: string,
  items: [{ itemName, quantity, priceWithoutVat, ... }],
  journal: {
    debitAccountId: string,   // e.g. Accounts Receivable (1200)
    creditAccountId: string,  // e.g. Revenue (4000)
  }
}

// Task 27: Persist account mapping for reposting
await tx.saleDocument.update({
  where: { id: sale.id },
  data: {
    debitAccountId: journal.debitAccountId,
    creditAccountId: journal.creditAccountId,
  },
});

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

    // Task 27: Persist account mapping for reposting
    await tx.saleDocument.update({
      where: { id: sale.id },
      data: {
        debitAccountId: journal.debitAccountId,
        creditAccountId: journal.creditAccountId,
      },
    });

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
