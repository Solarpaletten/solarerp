// app/api/account/companies/[companyId]/route.ts
// ═══════════════════════════════════════════════════
// TENANT-SAFE Company CRUD
// ═══════════════════════════════════════════════════
//
// Security architecture:
// ┌─────────────────────────────────────────────────┐
// │ RULE 1: Every DB WHERE includes tenantId        │
// │ RULE 2: requireTenant() = sole source of auth   │
// │ RULE 3: updateMany/deleteMany = atomic scope    │
// │ RULE 4: No findFirst pre-check (single query)   │
// └─────────────────────────────────────────────────┘
//
// Pattern: updateMany({ where: { id, tenantId } })
//   → count === 0 means "not found OR wrong tenant"
//   → same 404 response either way (no info leak)

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireTenant } from '@/lib/auth/requireTenant';

type RouteParams = {
  params: Promise<{ companyId: string }>;
};

// ─── GET /api/account/companies/[companyId] ──────
// Read single company. Tenant-scoped via findFirst.
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { tenantId } = await requireTenant(request);
    const { companyId } = await params;

    // findFirst with tenantId ensures cross-tenant reads are impossible
    const company = await prisma.company.findFirst({
      where: {
        id: companyId,
        tenantId, // TENANT SCOPE
      },
    });

    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    return NextResponse.json(company);
  } catch (error) {
    if (error instanceof Response) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Get company error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ─── PATCH /api/account/companies/[companyId] ────
// Update company. Uses updateMany for atomic tenant scope.
// No findFirst pre-check — count === 0 is the check.
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { tenantId } = await requireTenant(request);
    const { companyId } = await params;
    const body = await request.json();

    // Build explicit update payload — only provided fields
    const data: Record<string, unknown> = {};
    if (body.name !== undefined) data.name = body.name;
    if (body.code !== undefined) data.code = body.code || null;
    if (body.vatNumber !== undefined) data.vatNumber = body.vatNumber || null;
    if (body.country !== undefined) data.country = body.country || null;
    if (body.status !== undefined) data.status = body.status;
    if (body.priority !== undefined) data.priority = Number(body.priority);

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    // ═══════════════════════════════════════════════
    // CRITICAL: updateMany with BOTH id AND tenantId
    //
    // If attacker sends companyId from tenant-B:
    //   → WHERE id='xxx' AND tenantId='tenant-A'
    //   → 0 rows matched → 404
    //   → tenant-B's data untouched
    // ═══════════════════════════════════════════════
    const result = await prisma.company.updateMany({
      where: {
        id: companyId,
        tenantId, // TENANT SCOPE — cannot mutate other tenant's data
      },
      data,
    });

    if (result.count === 0) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    // Return the updated record (tenant-scoped read)
    const company = await prisma.company.findFirst({
      where: {
        id: companyId,
        tenantId, // TENANT SCOPE
      },
    });

    return NextResponse.json(company);
  } catch (error) {
    if (error instanceof Response) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Update company error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ─── DELETE /api/account/companies/[companyId] ───
// Delete company. Uses deleteMany for atomic tenant scope.
// No findFirst pre-check — count === 0 is the check.
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { tenantId } = await requireTenant(request);
    const { companyId } = await params;

    // ═══════════════════════════════════════════════
    // CRITICAL: deleteMany with BOTH id AND tenantId
    //
    // Cannot delete a company from another tenant.
    // count === 0 → "not found" (no info leak about existence)
    // ═══════════════════════════════════════════════
    const result = await prisma.company.deleteMany({
      where: {
        id: companyId,
        tenantId, // TENANT SCOPE — cannot delete other tenant's data
      },
    });

    if (result.count === 0) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    if (error instanceof Response) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Delete company error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
