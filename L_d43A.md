➜  solar-erp git:(main) ✗ cat app/api/company/[companyId]/purchases/[purchaseId]/route.ts                    
// app/api/company/[companyId]/purchases/[purchaseId]/route.ts
// Task 37A: GET | Task 38B + 43A: PUT
// Daria audit: 3-state FK clearing + company check before tx

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireTenant } from '@/lib/auth/requireTenant';

type RouteParams = {
  params: Promise<{ companyId: string; purchaseId: string }>;
};

// GET - Read single document
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

    const purchase = await prisma.purchaseDocument.findFirst({
      where: { id: purchaseId, companyId, company: { tenantId } },
      include: { items: { orderBy: { id: 'asc' } } },
    });

    if (!purchase) {
      return NextResponse.json({ error: 'Purchase not found' }, { status: 404 });
    }

    return NextResponse.json({ data: purchase });
  } catch (error: unknown) {
    if (error instanceof Response) return error;
    const msg = error instanceof Error ? error.message : 'Unknown error';
    console.error('Get purchase error:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// PUT - Update DRAFT document
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { tenantId } = await requireTenant(request);
    const { companyId, purchaseId } = await params;

    // Company ownership BEFORE transaction (Daria audit #2)
    const company = await prisma.company.findFirst({
      where: { id: companyId, tenantId },
      select: { id: true },
    });
    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    const body = await request.json();

    // Validation BEFORE transaction
    if (body.purchaseDate) {
      const d = new Date(body.purchaseDate);
      if (isNaN(d.getTime())) {
        return NextResponse.json({ error: 'INVALID_PURCHASE_DATE' }, { status: 400 });
      }
    }

    if (Array.isArray(body.items) && body.items.length > 0) {
      for (let i = 0; i < body.items.length; i++) {
        const item = body.items[i];
        if (!item.itemName || String(item.itemName).trim().length === 0) {
          return NextResponse.json({ error: `ITEM_NAME_REQUIRED (row ${i + 1})` }, { status: 400 });
        }
        if (Number(item.quantity) <= 0 || isNaN(Number(item.quantity))) {
          return NextResponse.json({ error: `ITEM_QTY_MUST_BE_POSITIVE (row ${i + 1})` }, { status: 400 });
        }
        if (Number(item.priceWithoutVat) < 0 || isNaN(Number(item.priceWithoutVat))) {
          return NextResponse.json({ error: `ITEM_PRICE_MUST_BE_NON_NEGATIVE (row ${i + 1})` }, { status: 400 });
        }
        if (item.vatRate != null) {
          const vr = Number(item.vatRate);
          if (isNaN(vr) || vr < 0 || vr > 100) {
            return NextResponse.json({ error: `ITEM_VAT_RATE_INVALID (row ${i + 1})` }, { status: 400 });
          }
        }
      }

      if (!body.supplierId && (!body.supplierName || String(body.supplierName).trim().length === 0)) {
        return NextResponse.json({ error: 'SUPPLIER_NAME_REQUIRED_WITH_ITEMS' }, { status: 400 });
      }
      if (!body.warehouseName || String(body.warehouseName).trim().length === 0) {
        return NextResponse.json({ error: 'WAREHOUSE_NAME_REQUIRED_WITH_ITEMS' }, { status: 400 });
      }
    }

    // Task 43A: 3-state supplier FK (Daria audit #1 fix)
    // undefined = skip (no FK change, legacy string mode)
    // null = clear FK explicitly
    // string = set FK + auto-snapshot
    let updateSupplierId: string | null | undefined = undefined;
    let updateSupplierName: string | undefined = undefined;
    let updateSupplierCode: string | null | undefined = undefined;

    if (body.supplierId !== undefined) {
      if (body.supplierId === null) {
        // Explicit FK clearing
        updateSupplierId = null;
        updateSupplierName = body.supplierName ?? '';
        updateSupplierCode = body.supplierCode ?? null;
      } else {
        const supplier = await prisma.client.findFirst({
          where: { id: body.supplierId, companyId, company: { tenantId } },
          select: { id: true, name: true, code: true, isActive: true },
        });

        if (!supplier) {
          return NextResponse.json({ error: 'Supplier not found in this company' }, { status: 404 });
        }
        if (!supplier.isActive) {
          return NextResponse.json({ error: 'Supplier is deactivated' }, { status: 400 });
        }

        updateSupplierId = supplier.id;
        updateSupplierName = supplier.name;
        updateSupplierCode = supplier.code ?? null;
      }
    }

    // Transaction
    const result = await prisma.$transaction(async (tx) => {
      const purchase = await tx.purchaseDocument.findFirst({
        where: { id: purchaseId, companyId },
        select: { id: true, status: true },
      });

      if (!purchase) throw new Error('PURCHASE_NOT_FOUND');
      if (purchase.status !== 'DRAFT') throw new Error('ONLY_DRAFT_EDITABLE');

      const updateData: Record<string, unknown> = {};
      if (body.purchaseDate) updateData.purchaseDate = new Date(body.purchaseDate);
      if (body.warehouseName !== undefined) updateData.warehouseName = body.warehouseName;
      if (body.currencyCode !== undefined) updateData.currencyCode = body.currencyCode;
      if (body.operationType !== undefined) updateData.operationType = body.operationType;
      if (body.comments !== undefined) updateData.comments = body.comments;

      // Task 43A: Apply supplier FK based on resolution
      if (updateSupplierId !== undefined) {
        updateData.supplierId = updateSupplierId;
        updateData.supplierName = updateSupplierName;
        updateData.supplierCode = updateSupplierCode;
      } else {
        // Legacy string mode
        if (body.supplierName !== undefined) updateData.supplierName = body.supplierName;
        if (body.supplierCode !== undefined) updateData.supplierCode = body.supplierCode;
      }

      await tx.purchaseDocument.update({
        where: { id: purchaseId },
        data: updateData,
      });

      if (Array.isArray(body.items)) {
        await tx.purchaseItem.deleteMany({ where: { purchaseId } });

        if (body.items.length > 0) {
          await tx.purchaseItem.createMany({
            data: body.items.map((item: {
              itemName: string; itemCode?: string; quantity: number;
              priceWithoutVat: number; vatRate?: number;
            }) => ({
              purchaseId,
              itemName: String(item.itemName).trim(),
              itemCode: item.itemCode || null,
              quantity: Number(item.quantity),
              priceWithoutVat: Number(item.priceWithoutVat),
              vatRate: item.vatRate != null ? Number(item.vatRate) : null,
            })),
          });
        }
      }

      return tx.purchaseDocument.findUniqueOrThrow({
        where: { id: purchaseId },
        include: { items: { orderBy: { id: 'asc' } } },
      });
    });

    return NextResponse.json({ data: result });
  } catch (error: unknown) {
    if (error instanceof Response) return error;
    const msg = error instanceof Error ? error.message : 'Unknown error';

    if (msg === 'PURCHASE_NOT_FOUND') return NextResponse.json({ error: 'Purchase not found' }, { status: 404 });
    if (msg === 'ONLY_DRAFT_EDITABLE') return NextResponse.json({ error: 'Only DRAFT documents can be edited' }, { status: 400 });

    console.error('Update purchase error:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}%                                                                                                                                                      
➜  solar-erp git:(main) ✗ cat app/api/company/[companyId]/purchases/draft/route.ts                                                           
// app/api/company/[companyId]/purchases/draft/route.ts
// Task 36 + 43: Create DRAFT Purchase Document
// Task 43: supplierId FK + snapshot fields

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireTenant } from '@/lib/auth/requireTenant';

type RouteParams = {
  params: Promise<{ companyId: string }>;
};

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { tenantId } = await requireTenant(request);
    const { companyId } = await params;

    const company = await prisma.company.findFirst({
      where: { id: companyId, tenantId },
      select: { id: true },
    });
    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    const body = await request.json();

    // Task 43: Resolve supplier via FK or legacy string
    let resolvedSupplierId: string | null = null;
    let resolvedSupplierName: string = body.supplierName || '';
    let resolvedSupplierCode: string | null = body.supplierCode || null;

    if (body.supplierId) {
      const supplier = await prisma.client.findFirst({
        where: { id: body.supplierId, companyId, company: { tenantId } },
        select: { id: true, name: true, code: true, isActive: true },
      });

      if (!supplier) {
        return NextResponse.json({ error: 'Supplier not found in this company' }, { status: 404 });
      }
      if (!supplier.isActive) {
        return NextResponse.json({ error: 'Supplier is deactivated' }, { status: 400 });
      }

      // Snapshot: freeze current supplier data
      resolvedSupplierId = supplier.id;
      resolvedSupplierName = supplier.name;
      resolvedSupplierCode = supplier.code;
    }

    // Generate next number
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
        purchaseDate: body.purchaseDate ? new Date(body.purchaseDate) : new Date(),
        supplierName: resolvedSupplierName || 'New Supplier',
        supplierCode: resolvedSupplierCode,
        supplierId: resolvedSupplierId,    // Task 43: FK
        warehouseName: body.warehouseName || 'Main',
        operationType: body.operationType || 'PURCHASE',
        currencyCode: body.currencyCode || 'EUR',
        status: 'DRAFT',
        comments: body.comments || null,
      },
    });

    return NextResponse.json({ data: draft }, { status: 201 });
  } catch (error: unknown) {
    if (error instanceof Response) return error;

    if (error && typeof error === 'object' && 'code' in error && (error as { code: string }).code === 'P2002') {
      return NextResponse.json({ error: 'Document number conflict' }, { status: 409 });
    }

    const msg = error instanceof Error ? error.message : 'Unknown error';
    console.error('Create draft error:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}%                                                                                                                                                      
➜  solar-erp git:(main) ✗ 

3
➜  solar-erp git:(main) ✗ cat app/api/company/[companyId]/purchases/[purchaseId]/route.ts                    
// app/api/company/[companyId]/purchases/[purchaseId]/route.ts
// Task 37A: GET | Task 38B + 43A: PUT
// Daria audit: 3-state FK clearing + company check before tx

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireTenant } from '@/lib/auth/requireTenant';

type RouteParams = {
  params: Promise<{ companyId: string; purchaseId: string }>;
};

// GET - Read single document
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

    const purchase = await prisma.purchaseDocument.findFirst({
      where: { id: purchaseId, companyId, company: { tenantId } },
      include: { items: { orderBy: { id: 'asc' } } },
    });

    if (!purchase) {
      return NextResponse.json({ error: 'Purchase not found' }, { status: 404 });
    }

    return NextResponse.json({ data: purchase });
  } catch (error: unknown) {
    if (error instanceof Response) return error;
    const msg = error instanceof Error ? error.message : 'Unknown error';
    console.error('Get purchase error:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// PUT - Update DRAFT document
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { tenantId } = await requireTenant(request);
    const { companyId, purchaseId } = await params;

    // Company ownership BEFORE transaction (Daria audit #2)
    const company = await prisma.company.findFirst({
      where: { id: companyId, tenantId },
      select: { id: true },
    });
    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    const body = await request.json();

    // Validation BEFORE transaction
    if (body.purchaseDate) {
      const d = new Date(body.purchaseDate);
      if (isNaN(d.getTime())) {
        return NextResponse.json({ error: 'INVALID_PURCHASE_DATE' }, { status: 400 });
      }
    }

    if (Array.isArray(body.items) && body.items.length > 0) {
      for (let i = 0; i < body.items.length; i++) {
        const item = body.items[i];
        if (!item.itemName || String(item.itemName).trim().length === 0) {
          return NextResponse.json({ error: `ITEM_NAME_REQUIRED (row ${i + 1})` }, { status: 400 });
        }
        if (Number(item.quantity) <= 0 || isNaN(Number(item.quantity))) {
          return NextResponse.json({ error: `ITEM_QTY_MUST_BE_POSITIVE (row ${i + 1})` }, { status: 400 });
        }
        if (Number(item.priceWithoutVat) < 0 || isNaN(Number(item.priceWithoutVat))) {
          return NextResponse.json({ error: `ITEM_PRICE_MUST_BE_NON_NEGATIVE (row ${i + 1})` }, { status: 400 });
        }
        if (item.vatRate != null) {
          const vr = Number(item.vatRate);
          if (isNaN(vr) || vr < 0 || vr > 100) {
            return NextResponse.json({ error: `ITEM_VAT_RATE_INVALID (row ${i + 1})` }, { status: 400 });
          }
        }
      }

      if (!body.supplierId && (!body.supplierName || String(body.supplierName).trim().length === 0)) {
        return NextResponse.json({ error: 'SUPPLIER_NAME_REQUIRED_WITH_ITEMS' }, { status: 400 });
      }
      if (!body.warehouseName || String(body.warehouseName).trim().length === 0) {
        return NextResponse.json({ error: 'WAREHOUSE_NAME_REQUIRED_WITH_ITEMS' }, { status: 400 });
      }
    }

    // Task 43A: 3-state supplier FK (Daria audit #1 fix)
    // undefined = skip (no FK change, legacy string mode)
    // null = clear FK explicitly
    // string = set FK + auto-snapshot
    let updateSupplierId: string | null | undefined = undefined;
    let updateSupplierName: string | undefined = undefined;
    let updateSupplierCode: string | null | undefined = undefined;

    if (body.supplierId !== undefined) {
      if (body.supplierId === null) {
        // Explicit FK clearing
        updateSupplierId = null;
        updateSupplierName = body.supplierName ?? '';
        updateSupplierCode = body.supplierCode ?? null;
      } else {
        const supplier = await prisma.client.findFirst({
          where: { id: body.supplierId, companyId, company: { tenantId } },
          select: { id: true, name: true, code: true, isActive: true },
        });

        if (!supplier) {
          return NextResponse.json({ error: 'Supplier not found in this company' }, { status: 404 });
        }
        if (!supplier.isActive) {
          return NextResponse.json({ error: 'Supplier is deactivated' }, { status: 400 });
        }

        updateSupplierId = supplier.id;
        updateSupplierName = supplier.name;
        updateSupplierCode = supplier.code ?? null;
      }
    }

    // Transaction
    const result = await prisma.$transaction(async (tx) => {
      const purchase = await tx.purchaseDocument.findFirst({
        where: { id: purchaseId, companyId },
        select: { id: true, status: true },
      });

      if (!purchase) throw new Error('PURCHASE_NOT_FOUND');
      if (purchase.status !== 'DRAFT') throw new Error('ONLY_DRAFT_EDITABLE');

      const updateData: Record<string, unknown> = {};
      if (body.purchaseDate) updateData.purchaseDate = new Date(body.purchaseDate);
      if (body.warehouseName !== undefined) updateData.warehouseName = body.warehouseName;
      if (body.currencyCode !== undefined) updateData.currencyCode = body.currencyCode;
      if (body.operationType !== undefined) updateData.operationType = body.operationType;
      if (body.comments !== undefined) updateData.comments = body.comments;

      // Task 43A: Apply supplier FK based on resolution
      if (updateSupplierId !== undefined) {
        updateData.supplierId = updateSupplierId;
        updateData.supplierName = updateSupplierName;
        updateData.supplierCode = updateSupplierCode;
      } else {
        // Legacy string mode
        if (body.supplierName !== undefined) updateData.supplierName = body.supplierName;
        if (body.supplierCode !== undefined) updateData.supplierCode = body.supplierCode;
      }

      await tx.purchaseDocument.update({
        where: { id: purchaseId },
        data: updateData,
      });

      if (Array.isArray(body.items)) {
        await tx.purchaseItem.deleteMany({ where: { purchaseId } });

        if (body.items.length > 0) {
          await tx.purchaseItem.createMany({
            data: body.items.map((item: {
              itemName: string; itemCode?: string; quantity: number;
              priceWithoutVat: number; vatRate?: number;
            }) => ({
              purchaseId,
              itemName: String(item.itemName).trim(),
              itemCode: item.itemCode || null,
              quantity: Number(item.quantity),
              priceWithoutVat: Number(item.priceWithoutVat),
              vatRate: item.vatRate != null ? Number(item.vatRate) : null,
            })),
          });
        }
      }

      return tx.purchaseDocument.findUniqueOrThrow({
        where: { id: purchaseId },
        include: { items: { orderBy: { id: 'asc' } } },
      });
    });

    return NextResponse.json({ data: result });
  } catch (error: unknown) {
    if (error instanceof Response) return error;
    const msg = error instanceof Error ? error.message : 'Unknown error';

    if (msg === 'PURCHASE_NOT_FOUND') return NextResponse.json({ error: 'Purchase not found' }, { status: 404 });
    if (msg === 'ONLY_DRAFT_EDITABLE') return NextResponse.json({ error: 'Only DRAFT documents can be edited' }, { status: 400 });

    console.error('Update purchase error:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}%                                                                                                                                                      
➜  solar-erp git:(main) ✗ cat app/api/company/[companyId]/purchases/draft/route.ts                                                           
// app/api/company/[companyId]/purchases/draft/route.ts
// Task 36 + 43: Create DRAFT Purchase Document
// Task 43: supplierId FK + snapshot fields

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireTenant } from '@/lib/auth/requireTenant';

type RouteParams = {
  params: Promise<{ companyId: string }>;
};

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { tenantId } = await requireTenant(request);
    const { companyId } = await params;

    const company = await prisma.company.findFirst({
      where: { id: companyId, tenantId },
      select: { id: true },
    });
    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    const body = await request.json();

    // Task 43: Resolve supplier via FK or legacy string
    let resolvedSupplierId: string | null = null;
    let resolvedSupplierName: string = body.supplierName || '';
    let resolvedSupplierCode: string | null = body.supplierCode || null;

    if (body.supplierId) {
      const supplier = await prisma.client.findFirst({
        where: { id: body.supplierId, companyId, company: { tenantId } },
        select: { id: true, name: true, code: true, isActive: true },
      });

      if (!supplier) {
        return NextResponse.json({ error: 'Supplier not found in this company' }, { status: 404 });
      }
      if (!supplier.isActive) {
        return NextResponse.json({ error: 'Supplier is deactivated' }, { status: 400 });
      }

      // Snapshot: freeze current supplier data
      resolvedSupplierId = supplier.id;
      resolvedSupplierName = supplier.name;
      resolvedSupplierCode = supplier.code;
    }

    // Generate next number
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
        purchaseDate: body.purchaseDate ? new Date(body.purchaseDate) : new Date(),
        supplierName: resolvedSupplierName || 'New Supplier',
        supplierCode: resolvedSupplierCode,
        supplierId: resolvedSupplierId,    // Task 43: FK
        warehouseName: body.warehouseName || 'Main',
        operationType: body.operationType || 'PURCHASE',
        currencyCode: body.currencyCode || 'EUR',
        status: 'DRAFT',
        comments: body.comments || null,
      },
    });

    return NextResponse.json({ data: draft }, { status: 201 });
  } catch (error: unknown) {
    if (error instanceof Response) return error;

    if (error && typeof error === 'object' && 'code' in error && (error as { code: string }).code === 'P2002') {
      return NextResponse.json({ error: 'Document number conflict' }, { status: 409 });
    }

    const msg = error instanceof Error ? error.message : 'Unknown error';
    console.error('Create draft error:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}%                                                                                                                                                      
➜  solar-erp git:(main) ✗ cat app/api/company/[companyId]/sales/route.ts                                                    
// app/api/company/[companyId]/sales/route.ts
// Task 22 + 34 + 35 + 43: Sales API
// Task 43: clientId FK + snapshot fields

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

async function verifyCompanyOwnership(companyId: string, tenantId: string) {
  const company = await prisma.company.findFirst({
    where: { id: companyId, tenantId },
    select: { id: true },
  });
  return company !== null;
}

// GET /api/company/[companyId]/sales
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { tenantId } = await requireTenant(request);
    const { companyId } = await params;

    const isOwner = await verifyCompanyOwnership(companyId, tenantId);
    if (!isOwner) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    const sales = await prisma.saleDocument.findMany({
      where: { companyId, company: { tenantId } },
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

// POST /api/company/[companyId]/sales
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
      saleDate, series, number: docNumber,
      clientName: rawClientName, warehouseName,
      operationType, currencyCode, items,
    } = body;

    // Task 43: Resolve client via FK or legacy string
    let resolvedClientId: string | null = null;
    let resolvedClientName: string = rawClientName || '';
    let resolvedClientCode: string | null = body.clientCode || null;

    if (body.clientId) {
      const client = await prisma.client.findFirst({
        where: { id: body.clientId, companyId, company: { tenantId } },
        select: { id: true, name: true, code: true, isActive: true },
      });

      if (!client) {
        return NextResponse.json({ error: 'Client not found in this company' }, { status: 404 });
      }
      if (!client.isActive) {
        return NextResponse.json({ error: 'Client is deactivated' }, { status: 400 });
      }

      // Snapshot: freeze current client data into document
      resolvedClientId = client.id;
      resolvedClientName = client.name;
      resolvedClientCode = client.code;
    }

    if (!saleDate || !series || !docNumber || !resolvedClientName || !warehouseName || !operationType || !currencyCode) {
      return NextResponse.json({ error: 'Missing required sale fields' }, { status: 400 });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'Sale must have at least one item' }, { status: 400 });
    }

    const result = await prisma.$transaction(async (tx) => {
      await assertPeriodOpen(tx, { companyId, date: new Date(saleDate) });

      const vatMode: VatMode = body.vatMode || 'VAT_19';
      const accounts = await resolveFifoSaleAccounts(tx, companyId, vatMode);

      const sale = await tx.saleDocument.create({
        data: {
          companyId,
          saleDate: new Date(saleDate),
          payUntil: body.payUntil ? new Date(body.payUntil) : null,
          accountingDate: body.accountingDate ? new Date(body.accountingDate) : null,
          series, number: docNumber,
          clientName: resolvedClientName,
          clientCode: resolvedClientCode,
          clientId: resolvedClientId,       // Task 43: FK
          payerName: body.payerName || null,
          payerCode: body.payerCode || null,
          unloadAddress: body.unloadAddress || null,
          unloadCity: body.unloadCity || null,
          warehouseName, operationType, currencyCode,
          employeeName: body.employeeName || null,
          comments: body.comments || null,
          debitAccountId: accounts.arAccountId,
          creditAccountId: accounts.revenueAccountId,
          items: {
            create: items.map((item: {
              itemName: string; itemCode?: string; barcode?: string;
              quantity: number; priceWithoutVat: number; unitDiscount?: number;
              vatRate?: number; vatClassifier?: string;
              salesAccountCode?: string; expenseAccountCode?: string; costCenter?: string;
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

      let totalCogs = new Decimal(0);
      for (const item of sale.items) {
        const itemCode = item.itemCode || item.itemName;
        const fifoResult = await allocateFifoLots(tx, {
          companyId, warehouseName: sale.warehouseName,
          itemCode, itemName: item.itemName,
          quantity: item.quantity, documentType: 'SALE',
          documentId: sale.id, saleItemId: item.id,
        });
        totalCogs = totalCogs.plus(fifoResult.totalCogs);
      }

      const totalRevenue = items.reduce(
        (sum: number, item: { quantity: number; priceWithoutVat: number }) =>
          sum + Number(item.quantity) * Number(item.priceWithoutVat), 0
      );

      if (totalRevenue <= 0) throw new Error('Total revenue must be positive');

      const journalLines = [
        { accountId: accounts.arAccountId, debit: totalRevenue, credit: 0 },
        { accountId: accounts.revenueAccountId, debit: 0, credit: totalRevenue },
        ...(totalCogs.gt(0) ? [
          { accountId: accounts.cogsAccountId, debit: Number(totalCogs.toFixed(2)), credit: 0 },
          { accountId: accounts.inventoryAccountId, debit: 0, credit: Number(totalCogs.toFixed(2)) },
        ] : []),
      ];

      const journalEntry = await createJournalEntry(tx, {
        companyId, date: new Date(saleDate),
        documentType: 'SALE', documentId: sale.id, lines: journalLines,
      });

      for (const item of sale.items) {
        await createStockMovement({
          tx, companyId, warehouseName: sale.warehouseName,
          itemName: item.itemName, itemCode: item.itemCode || item.itemName,
          quantity: Number(item.quantity), cost: Number(item.priceWithoutVat),
          direction: 'OUT', documentType: 'SALE', documentId: sale.id,
          documentDate: sale.saleDate, series: sale.series, number: docNumber,
        });
      }

      return { sale, journalEntry, totalCogs: Number(totalCogs.toFixed(2)) };
    });

    return NextResponse.json({
      data: result.sale,
      journal: { id: result.journalEntry.id, linesCount: result.journalEntry.lines.length },
      cogs: result.totalCogs,
    }, { status: 201 });
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
➜  solar-erp git:(main) ✗ 
4
➜  solar-erp git:(main) ✗ cat prisma/schema.prisma                                          
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ============================================
// LEVEL 1: ACCOUNT / TENANT
// ============================================

model Tenant {
  id        String   @id @default(cuid())
  name      String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  companies Company[]
  users     User[]

  @@map("tenants")
}

model User {
  id           String   @id @default(cuid())
  email        String
  passwordHash String
  name         String?
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  tenantId String
  tenant   Tenant @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  sessions Session[]

  @@unique([tenantId, email])
  @@index([tenantId])
  @@map("users")
}

// ============================================
// AUTH: SESSION (HttpOnly cookie auth)
// ============================================

model Session {
  id        String   @id @default(cuid())
  token     String   @unique
  userId    String
  tenantId  String
  expiresAt DateTime
  createdAt DateTime @default(now())

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([expiresAt])
  @@map("sessions")
}

// ============================================
// LEVEL 2: COMPANY / ERP CONTEXT
// ============================================

enum CompanyStatus {
  ACTIVE
  FROZEN
  ARCHIVED
}

enum AccountType {
  ASSET
  LIABILITY
  EQUITY
  INCOME
  EXPENSE
}

model Company {
  id        String        @id @default(cuid())
  tenantId  String
  name      String
  code      String?
  vatNumber String?
  country   String?
  status    CompanyStatus @default(ACTIVE)
  priority  Int           @default(0)
  createdAt DateTime      @default(now())
  updatedAt DateTime      @updatedAt

  tenant Tenant @relation(fields: [tenantId], references: [id])

  // ERP Relations
  clients           Client[]
  items             Item[]
  saleDocuments     SaleDocument[]
  purchaseDocuments PurchaseDocument[]
  stockMovements    StockMovement[]
  bankStatements    BankStatement[]
  accounts          Account[]
  journalEntries    JournalEntry[]
  accountingPeriods AccountingPeriod[]
  stockLots         StockLot[]
  stockAllocations  StockAllocation[]

  @@index([tenantId])
  @@map("companies")
}

model StockLot {
  id                 String   @id @default(cuid())
  companyId          String
  warehouseName      String
  itemCode           String
  itemName           String
  sourceDocumentType String   @default("PURCHASE")
  sourceDocumentId   String
  purchaseDate       DateTime
  unitCost           Decimal  @db.Decimal(18, 2)
  qtyInitial         Decimal  @db.Decimal(18, 4)
  qtyRemaining       Decimal  @db.Decimal(18, 4)
  currencyCode       String   @default("EUR")
  createdAt          DateTime @default(now())
  updatedAt          DateTime @updatedAt

  company     Company           @relation(fields: [companyId], references: [id], onDelete: Cascade)
  allocations StockAllocation[]

  // FIFO ordering index — critical for deterministic allocation
  @@index([companyId, warehouseName, itemCode, purchaseDate, id], name: "stock_lots_fifo_idx")
  @@index([companyId, sourceDocumentId], name: "stock_lots_source_idx")
  @@index([companyId])
  @@map("stock_lots")
}

model StockAllocation {
  id           String   @id @default(cuid())
  companyId    String
  documentType String // SALE | SALE_REVERSAL
  documentId   String
  saleItemId   String?
  lotId        String
  qty          Decimal  @db.Decimal(18, 4)
  unitCost     Decimal  @db.Decimal(18, 2)
  amount       Decimal  @db.Decimal(18, 2)
  createdAt    DateTime @default(now())

  company Company  @relation(fields: [companyId], references: [id], onDelete: Cascade)
  lot     StockLot @relation(fields: [lotId], references: [id], onDelete: Restrict)

  @@index([companyId, documentType, documentId], name: "stock_allocations_doc_idx")
  @@index([companyId, lotId], name: "stock_allocations_lot_idx")
  @@index([companyId])
  @@map("stock_allocations")
}

model Account {
  id        String      @id @default(cuid())
  companyId String
  code      String
  nameDe    String
  nameEn    String
  type      AccountType
  isActive  Boolean     @default(true)
  createdAt DateTime    @default(now())
  updatedAt DateTime    @updatedAt

  company      Company       @relation(fields: [companyId], references: [id], onDelete: Cascade)
  journalLines JournalLine[]

  @@unique([companyId, code])
  @@index([companyId])
  @@map("accounts")
}

// ============================================
// ACCOUNTING CORE: JOURNAL (LEDGER)
// ============================================

enum JournalSource {
  SYSTEM
  MANUAL
}

model JournalEntry {
  id           String        @id @default(cuid())
  companyId    String
  date         DateTime
  documentType String
  documentId   String?
  source       JournalSource @default(SYSTEM)
  description  String?
  createdAt    DateTime      @default(now())

  lines   JournalLine[]
  company Company       @relation(fields: [companyId], references: [id], onDelete: Cascade)

  @@index([companyId])
  @@index([date])
  @@index([documentType])
  @@index([documentId])
  @@index([companyId, date])
  @@index([companyId, source])
  @@map("journal_entries")
}

model JournalLine {
  id        String  @id @default(cuid())
  entryId   String
  accountId String
  debit     Decimal @default(0) @db.Decimal(18, 2)
  credit    Decimal @default(0) @db.Decimal(18, 2)

  entry   JournalEntry @relation(fields: [entryId], references: [id], onDelete: Cascade)
  account Account      @relation(fields: [accountId], references: [id])

  @@index([accountId])
  @@index([entryId])
  @@map("journal_lines")
}

// ============================================
// ACCOUNTING: PERIOD LOCKING
// ============================================

model AccountingPeriod {
  id        String    @id @default(cuid())
  companyId String
  year      Int
  month     Int
  isClosed  Boolean   @default(false)
  closedAt  DateTime?
  createdAt DateTime  @default(now())

  company Company @relation(fields: [companyId], references: [id], onDelete: Cascade)

  @@unique([companyId, year, month])
  @@index([companyId])
  @@map("accounting_periods")
}

// ============================================
// ERP MODULE: CLIENTS (COUNTERPARTIES)
// ============================================

enum ClientType {
  COMPANY
  SOLE_TRADER
  INDIVIDUAL
  GOVERNMENT
  NON_PROFIT
}

// ============================================
// ERP MODULE: CLIENTS (COUNTERPARTIES)
// ============================================
// Task 42: Enterprise Client Model v2
// - isJuridical removed → type ClientType
// - isActive added
// - creditLimit precision enforced
// - creditLimitCurrency for multi-currency prep
// - unique(companyId, code) for deduplication
// - index(companyId, vatCode) for tax lookups

enum ClientLocation {
  LOCAL
  EU
  FOREIGN
}

model Client {
  id        String @id @default(cuid())
  companyId String

  // Identity
  name      String
  shortName String?
  code      String?
  type      ClientType
  isActive  Boolean    @default(true)

  // Legal & Tax
  vatCode             String?
  businessLicenseCode String?
  residentTaxCode     String?
  location            ClientLocation

  // Contact
  email       String?
  phoneNumber String?
  faxNumber   String?
  contactInfo String?
  notes       String?

  // Financial
  payWithinDays       Int?
  creditLimit         Decimal? @db.Decimal(18, 2)
  creditLimitCurrency String?
  automaticDebtRemind Boolean  @default(false)

  // Individual
  birthday DateTime?

  // Registration
  registrationCountryCode String?
  registrationCity        String?
  registrationAddress     String?
  registrationZipCode     String?

  // Correspondence
  correspondenceCountryCode String?
  correspondenceCity        String?
  correspondenceAddress     String?
  correspondenceZipCode     String?

  // Banking
  bankAccount   String?
  bankName      String?
  bankCode      String?
  bankSwiftCode String?

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  company Company @relation(fields: [companyId], references: [id])

  salesAsClient       SaleDocument[]     @relation("SaleClient")
  purchasesAsSupplier PurchaseDocument[] @relation("PurchaseSupplier")

  @@unique([companyId, code])
  @@unique([companyId, id]) // Task 43: composite FK target
  @@index([companyId])
  @@index([companyId, vatCode])
  @@map("clients")
}

// ============================================
// ERP MODULE: ITEMS (PRODUCTS / SERVICES)
// ============================================

model Item {
  id        String @id @default(cuid())
  companyId String

  name    String
  code    String?
  barcode String?

  vatRate         Decimal?
  priceWithoutVat Decimal?
  priceWithVat    Decimal?

  attributeName   String?
  groupName       String?
  manufacturer    String?
  countryOfOrigin String?

  unitName String

  purchaseAccountCode String?
  saleAccountCode     String?
  expenseAccountCode  String?

  minimumQuantity Decimal?
  description     String?
  externalId      String?
  freePrice       Boolean  @default(false)

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  company Company @relation(fields: [companyId], references: [id])

  @@index([companyId])
  @@index([code])
  @@index([barcode])
  @@map("items")
}

// ============================================
// ERP MODULE: SALES
// ============================================

model SaleDocument {
  id        String @id @default(cuid())
  companyId String

  saleDate       DateTime
  payUntil       DateTime?
  accountingDate DateTime?
  lockedAt       DateTime?

  series String
  number String

  clientName String
  clientCode String?
  clientId   String?
  payerName  String?
  payerCode  String?

  unloadAddress String?
  unloadCity    String?
  warehouseName String

  operationType   String
  currencyCode    String
  employeeName    String?
  status          String?
  comments        String?
  debitAccountId  String?
  creditAccountId String?

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  items   SaleItem[]
  company Company    @relation(fields: [companyId], references: [id])
  client  Client?    @relation("SaleClient", fields: [companyId, clientId], references: [companyId, id], onDelete: Restrict)

  @@unique([companyId, series, number])
  @@index([companyId])
  @@index([saleDate])
  @@index([companyId, clientId])
  @@map("sale_documents")
}

model SaleItem {
  id     String @id @default(cuid())
  saleId String

  itemName String
  itemCode String?
  barcode  String?

  quantity        Decimal
  priceWithoutVat Decimal
  unitDiscount    Decimal?
  vatRate         Decimal?
  vatClassifier   String?

  salesAccountCode   String?
  expenseAccountCode String?
  costCenter         String?

  postscript String?
  accComment String?

  intraTransactionCode String?
  intraDeliveryTerms   String?
  intraTransportCode   String?
  intraCountryCode     String?
  intrastatWeightNetto Decimal?
  vatRateName          String?

  sale SaleDocument @relation(fields: [saleId], references: [id], onDelete: Cascade)

  @@index([saleId])
  @@map("sale_items")
}

// ============================================
// ERP MODULE: PURCHASES
// ============================================

model PurchaseDocument {
  id        String @id @default(cuid())
  companyId String

  purchaseDate       DateTime
  payUntil           DateTime?
  advancePaymentDate DateTime?

  series String
  number String

  supplierName    String
  supplierCode    String?
  supplierId      String?
  advanceEmployee String?

  warehouseName String

  operationType   String
  currencyCode    String
  employeeName    String?
  comments        String?
  status          String?
  debitAccountId  String?
  creditAccountId String?

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  items    PurchaseItem[]
  company  Company        @relation(fields: [companyId], references: [id])
  supplier Client?        @relation("PurchaseSupplier", fields: [companyId, supplierId], references: [companyId, id], onDelete: Restrict)

  @@unique([companyId, series, number])
  @@index([companyId])
  @@index([purchaseDate])
  @@index([companyId, supplierId])
  @@map("purchase_documents")
}

model PurchaseItem {
  id         String @id @default(cuid())
  purchaseId String

  itemName String
  itemCode String?
  barcode  String?

  quantity        Decimal
  priceWithoutVat Decimal
  unitDiscount    Decimal?
  vatRate         Decimal?
  vatClassifier   String?

  corAccountCode String?
  costCenter     String?

  notes        String?
  accComment   String?
  carRegNumber String?
  fuelCard     String?

  intraTransactionCode     String?
  intraDeliveryTerms       String?
  intraTransportCode       String?
  intraCountryOfOriginCode String?
  intrastatWeightNetto     Decimal?

  vatRegister String?
  gpaisMethod String?

  purchase PurchaseDocument @relation(fields: [purchaseId], references: [id], onDelete: Cascade)

  @@index([purchaseId])
  @@map("purchase_items")
}

// ============================================
// ERP MODULE: STOCK MOVEMENTS
// ============================================

model StockMovement {
  id        String @id @default(cuid())
  companyId String

  warehouseName String
  operationType String
  documentDate  DateTime
  series        String
  number        String

  itemName String
  itemCode String?
  barcode  String?

  quantity        Decimal
  cost            Decimal
  vatRate         Decimal?
  priceWithoutVat Decimal?
  priceWithVat    Decimal?

  attributeName   String?
  groupName       String?
  manufacturer    String?
  countryOfOrigin String?
  unitName        String?

  purchaseAccountCode String?
  saleAccountCode     String?
  expenseAccountCode  String?

  minimumQuantity Decimal?
  description     String?
  externalId      String?
  freePrice       Boolean  @default(false)

  // ─── Task 34: Stock Engine additions ───────────
  direction    String // IN | OUT
  documentType String // PURCHASE | SALE | ADJUSTMENT | PURCHASE_REVERSAL | SALE_REVERSAL
  documentId   String? // FK to PurchaseDocument.id or SaleDocument.id

  createdAt DateTime @default(now())

  company Company @relation(fields: [companyId], references: [id])

  @@index([companyId])
  @@index([documentDate])
  @@index([warehouseName])
  @@index([itemCode])
  @@index([direction])
  @@index([documentId])
  @@map("stock_movements")
}

// ============================================
// ERP MODULE: BANK STATEMENTS
// ============================================

model BankStatement {
  id        String @id @default(cuid())
  companyId String

  accountNumber String
  currencyCode  String
  period        DateTime

  transactionNumber String
  amount            Decimal
  operationType     Int

  clientName        String
  clientCode        String?
  clientBankAccount String?

  paymentPurpose String?

  correspondenceAccountCode String?
  correspondenceAccountName String?

  createdAt DateTime @default(now())

  company Company @relation(fields: [companyId], references: [id])

  @@unique([companyId, transactionNumber])
  @@index([companyId])
  @@index([period])
  @@map("bank_statements")
}
➜  solar-erp git:(main) ✗                         

➜  solar-erp git:(main) ✗ npx prisma migrate dev --name init_full_schema
Environment variables loaded from .env
Prisma schema loaded from prisma/schema.prisma
Datasource "db": PostgreSQL database "solarerp", schema "public" at "207.154.220.86:5433"

- Drift detected: Your database schema is not in sync with your migration history.

The following is a summary of the differences between the expected database schema given your migrations files, and the actual schema of the database.

It should be understood as the set of changes to get from the expected schema to the actual schema.

[+] Added enums
  - AccountType
  - ClientLocation
  - ClientType
  - CompanyStatus
  - JournalSource

[+] Added tables
  - accounting_periods
  - accounts
  - bank_statements
  - clients
  - companies
  - items
  - journal_entries
  - journal_lines
  - purchase_documents
  - purchase_items
  - sale_documents
  - sale_items
  - sessions
  - stock_allocations
  - stock_lots
  - stock_movements
  - tenants
  - users

[*] Changed the `accounting_periods` table
  [+] Added index on columns (companyId)
  [+] Added unique index on columns (companyId, year, month)
  [+] Added foreign key on columns (companyId)

[*] Changed the `accounts` table
  [+] Added unique index on columns (companyId, code)
  [+] Added index on columns (companyId)
  [+] Added foreign key on columns (companyId)

[*] Changed the `bank_statements` table
  [+] Added index on columns (companyId)
  [+] Added unique index on columns (companyId, transactionNumber)
  [+] Added index on columns (period)
  [+] Added foreign key on columns (companyId)

[*] Changed the `clients` table
  [+] Added unique index on columns (companyId, code)
  [+] Added unique index on columns (companyId, id)
  [+] Added index on columns (companyId)
  [+] Added index on columns (companyId, vatCode)
  [+] Added foreign key on columns (companyId)

[*] Changed the `companies` table
  [+] Added index on columns (tenantId)
  [+] Added foreign key on columns (tenantId)

[*] Changed the `items` table
  [+] Added index on columns (barcode)
  [+] Added index on columns (code)
  [+] Added index on columns (companyId)
  [+] Added foreign key on columns (companyId)

[*] Changed the `journal_entries` table
  [+] Added index on columns (companyId, date)
  [+] Added index on columns (companyId)
  [+] Added index on columns (companyId, source)
  [+] Added index on columns (date)
  [+] Added index on columns (documentId)
  [+] Added index on columns (documentType)
  [+] Added foreign key on columns (companyId)

[*] Changed the `journal_lines` table
  [+] Added index on columns (accountId)
  [+] Added index on columns (entryId)
  [+] Added foreign key on columns (accountId)
  [+] Added foreign key on columns (entryId)

[*] Changed the `purchase_documents` table
  [+] Added index on columns (companyId)
  [+] Added unique index on columns (companyId, series, number)
  [+] Added index on columns (companyId, supplierId)
  [+] Added index on columns (purchaseDate)
  [+] Added foreign key on columns (companyId)
  [+] Added foreign key on columns (companyId, supplierId)

[*] Changed the `purchase_items` table
  [+] Added index on columns (purchaseId)
  [+] Added foreign key on columns (purchaseId)

[*] Changed the `sale_documents` table
  [+] Added index on columns (companyId, clientId)
  [+] Added index on columns (companyId)
  [+] Added unique index on columns (companyId, series, number)
  [+] Added index on columns (saleDate)
  [+] Added foreign key on columns (companyId, clientId)
  [+] Added foreign key on columns (companyId)

[*] Changed the `sale_items` table
  [+] Added index on columns (saleId)
  [+] Added foreign key on columns (saleId)

[*] Changed the `sessions` table
  [+] Added index on columns (expiresAt)
  [+] Added unique index on columns (token)
  [+] Added index on columns (userId)
  [+] Added foreign key on columns (userId)

[*] Changed the `stock_allocations` table
  [+] Added index on columns (companyId)
  [+] Added index on columns (companyId, documentType, documentId)
  [+] Added index on columns (companyId, lotId)
  [+] Added foreign key on columns (companyId)
  [+] Added foreign key on columns (lotId)

[*] Changed the `stock_lots` table
  [+] Added index on columns (companyId)
  [+] Added index on columns (companyId, warehouseName, itemCode, purchaseDate, id)
  [+] Added index on columns (companyId, sourceDocumentId)
  [+] Added foreign key on columns (companyId)

[*] Changed the `stock_movements` table
  [+] Added index on columns (companyId)
  [+] Added index on columns (direction)
  [+] Added index on columns (documentDate)
  [+] Added index on columns (documentId)
  [+] Added index on columns (itemCode)
  [+] Added index on columns (warehouseName)
  [+] Added foreign key on columns (companyId)

[*] Changed the `users` table
  [+] Added unique index on columns (tenantId, email)
  [+] Added index on columns (tenantId)
  [+] Added foreign key on columns (tenantId)

- The following migration(s) are applied to the database but missing from the local migrations directory: 20260303123603_init_full_schema, 20260303141617_migration_composite_fk

✔ We need to reset the "public" schema at "207.154.220.86:5433"
Do you want to continue? All data will be lost. … yes


Applying migration `20260303143525_init_full_schema`

The following migration(s) have been created and applied from new schema changes:

migrations/
  └─ 20260303143525_init_full_schema/
    └─ migration.sql

Your database is now in sync with your schema.

✔ Generated Prisma Client (v5.22.0) to ./node_modules/.pnpm/@prisma+client@5.22.0_prisma@5.22.0/node_modules/@prisma/client in 83ms


Running seed command `ts-node prisma/seed.ts` ...
(node:32061) [MODULE_TYPELESS_PACKAGE_JSON] Warning: Module type of file:///Users/leanid/Projects/AI-SERVER_solarerp/projects/solar-erp/prisma/seed.ts is not specified and it doesn't parse as CommonJS.
Reparsing as ES module because module syntax was detected. This incurs a performance overhead.
To eliminate this warning, add "type": "module" to /Users/leanid/Projects/AI-SERVER_solarerp/projects/solar-erp/package.json.
(Use `node --trace-warnings ...` to show where the warning was created)
🌱 Seeding Solar ERP database...
✅ Seed completed successfully
--------------------------------
Tenant: Solar Group
User: solar@solar.com (password: pass123)
Company: Solar ERP Demo

🌱  The seed command has been executed.

➜  solar-erp git:(main) ✗ 
➜  solar-erp git:(main) ✗ npx prisma migrate reset
Environment variables loaded from .env
Prisma schema loaded from prisma/schema.prisma
Datasource "db": PostgreSQL database "solarerp", schema "public" at "207.154.220.86:5433"

✔ Are you sure you want to reset your database? All data will be lost. … yes


Database reset successful


✔ Generated Prisma Client (v5.22.0) to ./node_modules/.pnpm/@prisma+client@5.22.0_prisma@5.22.0/node_modules/@prisma/client in 86ms

Running seed command `ts-node prisma/seed.ts` ...
(node:32321) [MODULE_TYPELESS_PACKAGE_JSON] Warning: Module type of file:///Users/leanid/Projects/AI-SERVER_solarerp/projects/solar-erp/prisma/seed.ts is not specified and it doesn't parse as CommonJS.
Reparsing as ES module because module syntax was detected. This incurs a performance overhead.
To eliminate this warning, add "type": "module" to /Users/leanid/Projects/AI-SERVER_solarerp/projects/solar-erp/package.json.
(Use `node --trace-warnings ...` to show where the warning was created)
🌱 Seeding Solar ERP database...
❌ Seed error: PrismaClientKnownRequestError: 
Invalid `prisma.tenant.create()` invocation:


The table `public.tenants` does not exist in the current database.
    at $n.handleRequestError (/Users/leanid/Projects/AI-SERVER_solarerp/projects/solar-erp/node_modules/.pnpm/@prisma+client@5.22.0_prisma@5.22.0/node_modules/@prisma/client/runtime/library.js:121:7315)
    at $n.handleAndLogRequestError (/Users/leanid/Projects/AI-SERVER_solarerp/projects/solar-erp/node_modules/.pnpm/@prisma+client@5.22.0_prisma@5.22.0/node_modules/@prisma/client/runtime/library.js:121:6623)
    at $n.request (/Users/leanid/Projects/AI-SERVER_solarerp/projects/solar-erp/node_modules/.pnpm/@prisma+client@5.22.0_prisma@5.22.0/node_modules/@prisma/client/runtime/library.js:121:6307)
    at async l (/Users/leanid/Projects/AI-SERVER_solarerp/projects/solar-erp/node_modules/.pnpm/@prisma+client@5.22.0_prisma@5.22.0/node_modules/@prisma/client/runtime/library.js:130:9633)
    at async main (file:///Users/leanid/Projects/AI-SERVER_solarerp/projects/solar-erp/prisma/seed.ts:15:6) {
  code: 'P2021',
  clientVersion: '5.22.0',
  meta: { modelName: 'Tenant', table: 'public.tenants' }
}

An error occurred while running the seed command:
Error: Command failed with exit code 1: ts-node prisma/seed.ts
➜  solar-erp git:(main) ✗ 
➜  solar-erp git:(main) ✗ npx prisma migrate dev --name init_full_schema
Environment variables loaded from .env
Prisma schema loaded from prisma/schema.prisma
Datasource "db": PostgreSQL database "solarerp", schema "public" at "207.154.220.86:5433"

Applying migration `20260303143650_init_full_schema`

The following migration(s) have been created and applied from new schema changes:

migrations/
  └─ 20260303143650_init_full_schema/
    └─ migration.sql

Your database is now in sync with your schema.

✔ Generated Prisma Client (v5.22.0) to ./node_modules/.pnpm/@prisma+client@5.22.0_prisma@5.22.0/node_modules/@prisma/client in 77ms


➜  solar-erp git:(main) ✗ npx prisma validate                           
Environment variables loaded from .env
Prisma schema loaded from prisma/schema.prisma
The schema at prisma/schema.prisma is valid 🚀
➜  solar-erp git:(main) ✗ npx prisma format  
Prisma schema loaded from prisma/schema.prisma
Formatted prisma/schema.prisma in 19ms 🚀
➜  solar-erp git:(main) ✗ 