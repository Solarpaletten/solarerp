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
import {
  requireCompanyContext,
  companyContextErrorResponse,
} from '@/lib/auth/requireCompanyContext';
import {
  getWarehouseBalance,
  getCompanyBalance,
  getWarehouseNames,
} from '@/lib/accounting/stockService';

type RouteParams = {
  params: Promise<{ companyId: string }>;
};


export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { companyId, tenantId } = await requireCompanyContext(request);


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
    const errRes = companyContextErrorResponse(error); if (errRes) return errRes;
    console.error('Warehouse balance error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
