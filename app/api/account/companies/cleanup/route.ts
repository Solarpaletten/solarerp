// app/api/account/companies/cleanup/route.ts
// ═══════════════════════════════════════════════════════════════
// TASK 62 — Delete test/junk companies (name < 3 chars)
// DELETE /api/account/companies/cleanup
// ═══════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireTenant } from '@/lib/auth/requireTenant';

export async function DELETE(request: NextRequest) {
  try {
    const { tenantId } = await requireTenant(request);

    // Find junk companies: name < 3 chars, belonging to this tenant
    const junkCompanies = await prisma.company.findMany({
      where: { tenantId },
      select: { id: true, name: true },
    });

    const toDelete = junkCompanies.filter(c => c.name.trim().length < 3);

    if (toDelete.length === 0) {
      return NextResponse.json({
        data: { deleted: 0, message: 'No junk companies found' }
      });
    }

    const ids = toDelete.map(c => c.id);

    // Delete CompanyUser records first (FK constraint)
    await (prisma as any).companyUser.deleteMany({
      where: { companyId: { in: ids } },
    });

    // Delete companies
    const result = await prisma.company.deleteMany({
      where: { id: { in: ids }, tenantId },
    });

    console.log(`[Cleanup] Deleted ${result.count} junk companies for tenant ${tenantId}`);

    return NextResponse.json({
      data: {
        deleted: result.count,
        names: toDelete.map(c => c.name),
        message: `Deleted ${result.count} junk companies`,
      }
    });
  } catch (err) {
    if (err instanceof Response) {
      return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
    }
    console.error('[DELETE /api/account/companies/cleanup]', err);
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
