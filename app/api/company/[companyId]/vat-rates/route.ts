// app/api/company/[companyId]/vat-rates/route.ts
// ═══════════════════════════════════════════════════
// TASK 68A — migrated to requireCompanyContext
// ═══════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import {
  requireCompanyContext,
  companyContextErrorResponse,
} from '@/lib/auth/requireCompanyContext';

type RouteParams = { params: Promise<{ companyId: string }> };


// ─── GET: List VAT rates ─────────────────────────
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { companyId, tenantId } = await requireCompanyContext(request);


    const url = new URL(request.url);
    const isActive = url.searchParams.get('isActive');

    const where: Record<string, unknown> = { companyId };
    if (isActive === 'true') where.isActive = true;

    const data = await prisma.vatRate.findMany({
      where,
      orderBy: [{ isDefault: 'desc' }, { rate: 'desc' }, { name: 'asc' }],
    });

    return NextResponse.json({ data });
  } catch (error) {
    const errRes = companyContextErrorResponse(error); if (errRes) return errRes;
    console.error('VatRates GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ─── POST: Create VAT rate ───────────────────────
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { companyId, tenantId } = await requireCompanyContext(request);


    const body = await request.json();
    if (!body.name?.trim()) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }
    if (body.rate == null || isNaN(Number(body.rate))) {
      return NextResponse.json({ error: 'Rate is required and must be a number' }, { status: 400 });
    }

    const VALID_CATEGORIES = ['STANDARD', 'REDUCED', 'ZERO_EXPORT', 'ZERO_INTRACOM', 'REVERSE_CHARGE', 'NO_VAT'];
    const category = (body.category || 'STANDARD').toUpperCase();
    if (!VALID_CATEGORIES.includes(category)) {
      return NextResponse.json({ error: `Category must be one of: ${VALID_CATEGORIES.join(', ')}` }, { status: 400 });
    }

    const data = await prisma.vatRate.create({
      data: {
        companyId,
        name: body.name.trim(),
        rate: Number(body.rate),
        code: body.code?.trim() || null,
        category,
        isDefault: Boolean(body.isDefault),
        isActive: body.isActive !== false,
        effectiveFrom: body.effectiveFrom ? new Date(body.effectiveFrom) : null,
      },
    });

    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    const errRes = companyContextErrorResponse(error); if (errRes) return errRes;
    console.error('VatRates POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
