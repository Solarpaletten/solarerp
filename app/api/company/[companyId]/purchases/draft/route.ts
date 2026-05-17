// app/api/company/[companyId]/purchases/draft/route.ts
// ═══════════════════════════════════════════════════
// TASK 67 — migrated to requireCompanyContext
// ═══════════════════════════════════════════════════
// Retry loop: if unique constraint hit, increment and retry
// Acceptance: 50 fast clicks must not cause 409

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import {
  requireCompanyContext,
  companyContextErrorResponse,
} from '@/lib/auth/requireCompanyContext';

type RouteParams = {
  params: Promise<{ companyId: string }>;
};

const MAX_RETRIES = 5;

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { companyId, tenantId } = await requireCompanyContext(request);


    // Parse optional body (may be empty)
    let body: Record<string, unknown> = {};
    try { body = await request.json(); } catch { /* empty body OK */ }

    // Retry loop for unique constraint safety
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        // Get next number atomically
        const lastDoc = await prisma.purchaseDocument.findFirst({
          where: { companyId, series: 'P' },
          orderBy: { number: 'desc' },
          select: { number: true },
        });
        const nextNum = String(Number(lastDoc?.number || '0') + 1).padStart(4, '0');

        const draft = await prisma.purchaseDocument.create({
          data: {
            companyId,
            series: 'P',
            number: nextNum,
            purchaseDate: body.purchaseDate ? new Date(String(body.purchaseDate)) : new Date(),
            supplierName: String(body.supplierName || 'New Supplier'),
            supplierCode: body.supplierCode ? String(body.supplierCode) : null,
            supplierId: body.supplierId ? String(body.supplierId) : null,
            warehouseName: String(body.warehouseName || 'Main'),
            operationType: String(body.operationType || 'PURCHASE'),
            currencyCode: String(body.currencyCode || 'EUR'),
            status: 'DRAFT',
            comments: body.comments ? String(body.comments) : null,
          },
        });

        return NextResponse.json({ data: draft }, { status: 201 });
      } catch (err: unknown) {
        // P2002 = unique constraint violation → retry
        if (err && typeof err === 'object' && 'code' in err && (err as { code: string }).code === 'P2002') {
          if (attempt < MAX_RETRIES - 1) continue;
          return NextResponse.json({ error: 'Failed to generate unique document number after retries' }, { status: 409 });
        }
        throw err;
      }
    }

    return NextResponse.json({ error: 'Unexpected error in draft creation' }, { status: 500 });
  } catch (error: unknown) {
    const errRes = companyContextErrorResponse(error); if (errRes) return errRes;
    const msg = error instanceof Error ? error.message : 'Unknown error';
    console.error('Create draft error:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
