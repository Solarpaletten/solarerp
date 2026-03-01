// app/api/company/[companyId]/warehouse/balance/route.ts
// ═══════════════════════════════════════════════════
// Warehouse Balance API — Task 34
// ═══════════════════════════════════════════════════
//
// GET /api/company/:id/warehouse/balance
//   → all warehouses, all products
//
// GET /api/company/:id/warehouse/balance?warehouse=Main
//   → single warehouse
//
// Response:
// {
//   warehouses: ["Main", "Secondary"],
//   balances: [
//     { warehouseName, itemCode, itemName, quantity }
//   ]
// }

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireTenant } from '@/lib/auth/requireTenant';
import {
  getWarehouseBalance,
  getCompanyBalance,
  getWarehouseNames,
} from '@/lib/accounting/stockService';

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

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { tenantId } = await requireTenant(request);
    const { companyId } = await params;

    const isOwner = await verifyCompanyOwnership(companyId, tenantId);
    if (!isOwner) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    const url = new URL(request.url);
    const warehouseFilter = url.searchParams.get('warehouse');

    // Use read-only transaction for consistency
    const result = await prisma.$transaction(async (tx) => {
      const warehouses = await getWarehouseNames(tx, companyId);

      const balances = warehouseFilter
        ? await getWarehouseBalance(tx, companyId, warehouseFilter)
        : await getCompanyBalance(tx, companyId);

      return { warehouses, balances };
    });

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof Response) return error;
    console.error('Warehouse balance error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
