// app/api/company/[companyId]/purchases/[purchaseId]/route.ts
// ═══════════════════════════════════════════════════
// Task 37A: GET Single Purchase Document
// ═══════════════════════════════════════════════════
// Tenant-safe. Returns header + items for document view.

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

    // Verify company ownership
    const company = await prisma.company.findFirst({
      where: { id: companyId, tenantId },
      select: { id: true },
    });
    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    const purchase = await prisma.purchaseDocument.findFirst({
      where: {
        id: purchaseId,
        companyId,
        company: { tenantId },
      },
      include: {
        items: {
          orderBy: { id: 'asc' },
        },
      },
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
