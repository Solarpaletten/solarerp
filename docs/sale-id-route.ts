// app/api/company/[companyId]/sales/[saleId]/route.ts
// ═══════════════════════════════════════════════════
// Task 50: Sales Document — GET + PATCH
// ═══════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireTenant } from '@/lib/auth/requireTenant';

type RouteParams = { params: Promise<{ companyId: string; saleId: string }> };

// GET — single sale with items
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { tenantId } = await requireTenant(request);
    const { companyId, saleId } = await params;

    const company = await prisma.company.findFirst({ where: { id: companyId, tenantId }, select: { id: true } });
    if (!company) return NextResponse.json({ error: 'Company not found' }, { status: 404 });

    const sale = await prisma.saleDocument.findFirst({
      where: { id: saleId, companyId },
      include: { items: { orderBy: { id: 'asc' } } },
    });
    if (!sale) return NextResponse.json({ error: 'Sale not found' }, { status: 404 });

    return NextResponse.json({ data: sale });
  } catch (error: unknown) {
    if (error instanceof Response) return error;
    const msg = error instanceof Error ? error.message : 'Unknown error';
    console.error('Get sale error:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// PATCH — update DRAFT sale
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { tenantId } = await requireTenant(request);
    const { companyId, saleId } = await params;

    const company = await prisma.company.findFirst({ where: { id: companyId, tenantId }, select: { id: true } });
    if (!company) return NextResponse.json({ error: 'Company not found' }, { status: 404 });

    const body = await request.json();

    const result = await prisma.$transaction(async (tx) => {
      const sale = await tx.saleDocument.findFirst({
        where: { id: saleId, companyId },
        select: { id: true, status: true },
      });
      if (!sale) throw new Error('SALE_NOT_FOUND');
      if (sale.status !== 'DRAFT') throw new Error('ONLY_DRAFT_EDITABLE');

      const updateData: Record<string, unknown> = {};
      if (body.saleDate) updateData.saleDate = new Date(body.saleDate);
      if (body.payUntil !== undefined) updateData.payUntil = body.payUntil ? new Date(body.payUntil) : null;
      if (body.clientName !== undefined) updateData.clientName = body.clientName;
      if (body.clientCode !== undefined) updateData.clientCode = body.clientCode || null;
      if (body.clientId !== undefined) updateData.clientId = body.clientId || null;
      if (body.warehouseName !== undefined) updateData.warehouseName = body.warehouseName;
      if (body.currencyCode !== undefined) updateData.currencyCode = body.currencyCode;
      if (body.operationType !== undefined) updateData.operationType = body.operationType;
      if (body.employeeName !== undefined) updateData.employeeName = body.employeeName || null;
      if (body.comments !== undefined) updateData.comments = body.comments || null;

      await tx.saleDocument.update({ where: { id: saleId }, data: updateData });

      if (Array.isArray(body.items)) {
        await tx.saleItem.deleteMany({ where: { saleId } });
        if (body.items.length > 0) {
          await tx.saleItem.createMany({
            data: body.items.map((item: { itemName: string; itemCode?: string; quantity: number; priceWithoutVat: number; vatRate?: number }) => ({
              saleId,
              itemName: String(item.itemName).trim(),
              itemCode: item.itemCode || null,
              quantity: Number(item.quantity),
              priceWithoutVat: Number(item.priceWithoutVat),
              vatRate: item.vatRate != null ? Number(item.vatRate) : null,
            })),
          });
        }
      }

      return tx.saleDocument.findUniqueOrThrow({
        where: { id: saleId },
        include: { items: { orderBy: { id: 'asc' } } },
      });
    });

    return NextResponse.json({ data: result });
  } catch (error: unknown) {
    if (error instanceof Response) return error;
    const msg = error instanceof Error ? error.message : 'Unknown error';
    if (msg === 'SALE_NOT_FOUND') return NextResponse.json({ error: 'Sale not found' }, { status: 404 });
    if (msg === 'ONLY_DRAFT_EDITABLE') return NextResponse.json({ error: 'Only DRAFT can be edited' }, { status: 400 });
    console.error('Update sale error:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
