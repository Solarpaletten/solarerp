// app/api/company/[companyId]/sales/draft/route.ts
// ═══════════════════════════════════════════════════
// Task 50: Create DRAFT Sale — collision-safe
// ═══════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireTenant } from '@/lib/auth/requireTenant';

type RouteParams = { params: Promise<{ companyId: string }> };
const MAX_RETRIES = 5;

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { tenantId } = await requireTenant(request);
    const { companyId } = await params;

    const company = await prisma.company.findFirst({ where: { id: companyId, tenantId }, select: { id: true } });
    if (!company) return NextResponse.json({ error: 'Company not found' }, { status: 404 });

    let body: Record<string, unknown> = {};
    try { body = await request.json(); } catch { /* empty OK */ }

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        const lastDoc = await prisma.saleDocument.findFirst({
          where: { companyId, series: 'S' },
          orderBy: { number: 'desc' },
          select: { number: true },
        });
        const nextNum = String(Number(lastDoc?.number || '0') + 1).padStart(4, '0');

        const draft = await prisma.saleDocument.create({
          data: {
            companyId,
            series: 'S',
            number: nextNum,
            saleDate: body.saleDate ? new Date(String(body.saleDate)) : new Date(),
            clientName: String(body.clientName || 'New Customer'),
            clientCode: body.clientCode ? String(body.clientCode) : null,
            clientId: body.clientId ? String(body.clientId) : null,
            warehouseName: String(body.warehouseName || 'Main'),
            operationType: String(body.operationType || 'SALE'),
            currencyCode: String(body.currencyCode || 'EUR'),
            status: 'DRAFT',
            comments: body.comments ? String(body.comments) : null,
          },
        });

        return NextResponse.json({ data: draft }, { status: 201 });
      } catch (err: unknown) {
        if (err && typeof err === 'object' && 'code' in err && (err as { code: string }).code === 'P2002') {
          if (attempt < MAX_RETRIES - 1) continue;
          return NextResponse.json({ error: 'Failed to generate unique number after retries' }, { status: 409 });
        }
        throw err;
      }
    }
    return NextResponse.json({ error: 'Unexpected error' }, { status: 500 });
  } catch (error: unknown) {
    if (error instanceof Response) return error;
    const msg = error instanceof Error ? error.message : 'Unknown error';
    console.error('Create sale draft error:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
