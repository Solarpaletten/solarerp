// app/api/company/[companyId]/products/[productId]/route.ts
// ═══════════════════════════════════════════════════
// Task 47: Product CRUD — Single Record
// ═══════════════════════════════════════════════════
// GET — read single product
// PATCH — update product
// DELETE — delete product (blocked if used in documents)
// POST — copy product (inline create from existing)

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireTenant } from '@/lib/auth/requireTenant';

type RouteParams = {
  params: Promise<{ companyId: string; productId: string }>;
};

// ─── GET — Single product ────────────────────────

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { tenantId } = await requireTenant(request);
    const { companyId, productId } = await params;

    const product = await prisma.item.findFirst({
      where: { id: productId, companyId, company: { tenantId } },
    });

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    return NextResponse.json({ data: product });
  } catch (error: unknown) {
    if (error instanceof Response) return error;
    const msg = error instanceof Error ? error.message : 'Unknown error';
    console.error('Get product error:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// ─── PATCH — Update product ──────────────────────

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { tenantId } = await requireTenant(request);
    const { companyId, productId } = await params;

    const existing = await prisma.item.findFirst({
      where: { id: productId, companyId, company: { tenantId } },
      select: { id: true },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    const body = await request.json();
    const updateData: Record<string, unknown> = {};

    // Only update provided fields
    if (body.name !== undefined) updateData.name = String(body.name).trim();
    if (body.code !== undefined) updateData.code = body.code || null;
    if (body.barcode !== undefined) updateData.barcode = body.barcode || null;
    if (body.unitName !== undefined) updateData.unitName = String(body.unitName).trim();
    if (body.vatRate !== undefined) updateData.vatRate = body.vatRate != null ? Number(body.vatRate) : null;
    if (body.priceWithoutVat !== undefined) updateData.priceWithoutVat = body.priceWithoutVat != null ? Number(body.priceWithoutVat) : null;
    if (body.priceWithVat !== undefined) updateData.priceWithVat = body.priceWithVat != null ? Number(body.priceWithVat) : null;
    if (body.attributeName !== undefined) updateData.attributeName = body.attributeName || null;
    if (body.groupName !== undefined) updateData.groupName = body.groupName || null;
    if (body.manufacturer !== undefined) updateData.manufacturer = body.manufacturer || null;
    if (body.countryOfOrigin !== undefined) updateData.countryOfOrigin = body.countryOfOrigin || null;
    if (body.purchaseAccountCode !== undefined) updateData.purchaseAccountCode = body.purchaseAccountCode || null;
    if (body.saleAccountCode !== undefined) updateData.saleAccountCode = body.saleAccountCode || null;
    if (body.expenseAccountCode !== undefined) updateData.expenseAccountCode = body.expenseAccountCode || null;
    if (body.minimumQuantity !== undefined) updateData.minimumQuantity = body.minimumQuantity != null ? Number(body.minimumQuantity) : null;
    if (body.description !== undefined) updateData.description = body.description || null;
    if (body.freePrice !== undefined) updateData.freePrice = Boolean(body.freePrice);

    // Unique code check if code changed
    if (body.code) {
      const dup = await prisma.item.findFirst({
        where: { companyId, code: body.code, NOT: { id: productId } },
        select: { id: true },
      });
      if (dup) {
        return NextResponse.json({ error: `Product with code "${body.code}" already exists` }, { status: 409 });
      }
    }

    const product = await prisma.item.update({
      where: { id: productId },
      data: updateData,
    });

    return NextResponse.json({ data: product });
  } catch (error: unknown) {
    if (error instanceof Response) return error;
    const msg = error instanceof Error ? error.message : 'Unknown error';
    console.error('Update product error:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// ─── DELETE — Delete product ─────────────────────
// Blocked if product code is used in any document items

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { tenantId } = await requireTenant(request);
    const { companyId, productId } = await params;

    const product = await prisma.item.findFirst({
      where: { id: productId, companyId, company: { tenantId } },
      select: { id: true, code: true, name: true },
    });
    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    // Check if used in documents (by itemCode match)
    if (product.code) {
      const [saleCount, purchaseCount, stockCount] = await Promise.all([
        prisma.saleItem.count({ where: { itemCode: product.code, sale: { companyId } } }),
        prisma.purchaseItem.count({ where: { itemCode: product.code, purchase: { companyId } } }),
        prisma.stockMovement.count({ where: { companyId, itemCode: product.code } }),
      ]);

      if (saleCount + purchaseCount + stockCount > 0) {
        return NextResponse.json({
          error: 'Cannot delete product that is used in documents',
          details: {
            salesItems: saleCount,
            purchaseItems: purchaseCount,
            stockMovements: stockCount,
          },
          suggestion: 'Consider archiving instead of deleting',
        }, { status: 409 });
      }
    }

    await prisma.item.delete({ where: { id: productId } });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error: unknown) {
    if (error instanceof Response) return error;
    const msg = error instanceof Error ? error.message : 'Unknown error';
    console.error('Delete product error:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// ─── POST — Copy product ─────────────────────────
// Leanid's principle: inline create from existing
// Copy all fields, generate new code with " (Copy)" suffix

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { tenantId } = await requireTenant(request);
    const { companyId, productId } = await params;

    const source = await prisma.item.findFirst({
      where: { id: productId, companyId, company: { tenantId } },
    });
    if (!source) {
      return NextResponse.json({ error: 'Source product not found' }, { status: 404 });
    }

    // Optional overrides from body
    let body: Record<string, unknown> = {};
    try { body = await request.json(); } catch { /* empty body = pure copy */ }

    // Generate copy code
    const copyCode = body.code
      ? String(body.code)
      : source.code
      ? `${source.code}-COPY`
      : null;

    // Check code uniqueness
    if (copyCode) {
      const existing = await prisma.item.findFirst({
        where: { companyId, code: copyCode },
        select: { id: true },
      });
      if (existing) {
        return NextResponse.json({ error: `Product with code "${copyCode}" already exists` }, { status: 409 });
      }
    }

    const copy = await prisma.item.create({
      data: {
        companyId,
        name: String(body.name || `${source.name} (Copy)`),
        code: copyCode,
        barcode: (body.barcode as string) || null,
        unitName: String(body.unitName || source.unitName),
        vatRate: source.vatRate,
        priceWithoutVat: source.priceWithoutVat,
        priceWithVat: source.priceWithVat,
        attributeName: source.attributeName,
        groupName: source.groupName,
        manufacturer: source.manufacturer,
        countryOfOrigin: source.countryOfOrigin,
        purchaseAccountCode: source.purchaseAccountCode,
        saleAccountCode: source.saleAccountCode,
        expenseAccountCode: source.expenseAccountCode,
        minimumQuantity: source.minimumQuantity,
        description: source.description,
        freePrice: source.freePrice,
      },
    });

    return NextResponse.json({ data: copy }, { status: 201 });
  } catch (error: unknown) {
    if (error instanceof Response) return error;
    const msg = error instanceof Error ? error.message : 'Unknown error';
    console.error('Copy product error:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
