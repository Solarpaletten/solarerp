// app/api/company/[companyId]/purchases/[purchaseId]/accounting/route.ts
// ═══════════════════════════════════════════════════
// Task 41: Accounting Data for Posted Purchase
// ═══════════════════════════════════════════════════
// Returns: journal entry + lines (with account codes/names),
//          stock movements, FIFO lots

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireTenant } from '@/lib/auth/requireTenant';

type RouteParams = {
  params: Promise<{ companyId: string; purchaseId: string }>;
};

export async function GET(request: NextRequest, { params }: RouteParams) {
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

    // ── Journal Entry + Lines ───────────────────
    const journalEntries = await prisma.journalEntry.findMany({
      where: {
        companyId,
        documentType: { in: ['PURCHASE', 'PURCHASE_REVERSAL'] },
        documentId: purchaseId,
      },
      include: {
        lines: {
          include: {
            account: {
              select: { code: true, nameDe: true, nameEn: true, type: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    // ── Stock Movements ─────────────────────────
    const stockMovements = await prisma.stockMovement.findMany({
      where: {
        companyId,
        documentId: purchaseId,
      },
      select: {
        id: true,
        itemName: true,
        itemCode: true,
        quantity: true,
        cost: true,
        direction: true,
        documentType: true,
        warehouseName: true,
        documentDate: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    // ── FIFO Lots ───────────────────────────────
    const stockLots = await prisma.stockLot.findMany({
      where: {
        companyId,
        sourceDocumentId: purchaseId,
      },
      select: {
        id: true,
        itemCode: true,
        itemName: true,
        warehouseName: true,
        unitCost: true,
        qtyInitial: true,
        qtyRemaining: true,
        currencyCode: true,
        purchaseDate: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    // Format journal entries with readable account info
    const formattedEntries = journalEntries.map((entry) => ({
      id: entry.id,
      date: entry.date,
      documentType: entry.documentType,
      source: entry.source,
      description: entry.description,
      createdAt: entry.createdAt,
      lines: entry.lines.map((line) => ({
        id: line.id,
        accountCode: line.account.code,
        accountNameDe: line.account.nameDe,
        accountNameEn: line.account.nameEn,
        accountType: line.account.type,
        debit: Number(line.debit),
        credit: Number(line.credit),
      })),
    }));

    return NextResponse.json({
      journal: formattedEntries,
      stockMovements: stockMovements.map((m) => ({
        ...m,
        quantity: Number(m.quantity),
        cost: Number(m.cost),
      })),
      stockLots: stockLots.map((l) => ({
        ...l,
        unitCost: Number(l.unitCost),
        qtyInitial: Number(l.qtyInitial),
        qtyRemaining: Number(l.qtyRemaining),
      })),
    });
  } catch (error: unknown) {
    if (error instanceof Response) return error;
    const msg = error instanceof Error ? error.message : 'Unknown error';
    console.error('Get accounting data error:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
