// app/api/company/[companyId]/accounts/[accountId]/route.ts
// ═══════════════════════════════════════════════════
// TENANT-SAFE Individual Account CRUD
// ═══════════════════════════════════════════════════
//
// Security architecture:
// ┌─────────────────────────────────────────────────┐
// │ RULE 1: Every WHERE includes company.tenantId   │
// │ RULE 2: updateMany/deleteMany = atomic scope    │
// │ RULE 3: count === 0 → 404 (no info leak)        │
// │ RULE 4: No findUnique({ id }) — ever            │
// └─────────────────────────────────────────────────┘

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireTenant } from '@/lib/auth/requireTenant';

type RouteParams = {
  params: Promise<{ companyId: string; accountId: string }>;
};

const VALID_TYPES = ['ASSET', 'LIABILITY', 'EQUITY', 'INCOME', 'EXPENSE'];

// ─── GET /api/company/[companyId]/accounts/[accountId] ───
// Read single account. Tenant-scoped via findFirst.
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { tenantId } = await requireTenant(request);
    const { companyId, accountId } = await params;

    const account = await prisma.account.findFirst({
      where: {
        id: accountId,
        companyId,
        company: { tenantId }, // TENANT SCOPE
      },
    });

    if (!account) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }

    return NextResponse.json({ data: account });
  } catch (error) {
    if (error instanceof Response) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Get account error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ─── PATCH /api/company/[companyId]/accounts/[accountId] ───
// Update account. Uses updateMany for atomic tenant scope.
// Body: { name?, code?, type?, isActive? }
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { tenantId } = await requireTenant(request);
    const { companyId, accountId } = await params;

    const body = await request.json();
    const { name, code, type, isActive } = body;

    // Validate type if provided
    if (type && !VALID_TYPES.includes(type)) {
      return NextResponse.json(
        { error: `Invalid type. Must be one of: ${VALID_TYPES.join(', ')}` },
        { status: 400 }
      );
    }

    // Build update data (only provided fields)
    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name.trim();
    if (code !== undefined) updateData.code = code.trim();
    if (type !== undefined) updateData.type = type;
    if (isActive !== undefined) updateData.isActive = Boolean(isActive);

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    // Atomic tenant-scoped update
    // First verify ownership, then update
    const account = await prisma.account.findFirst({
      where: {
        id: accountId,
        companyId,
        company: { tenantId }, // TENANT SCOPE
      },
    });

    if (!account) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }

    const updated = await prisma.account.update({
      where: { id: accountId },
      data: updateData,
    });

    return NextResponse.json({ data: updated });
  } catch (error: unknown) {
    if (error instanceof Response) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Handle unique constraint violation
    if (
      error &&
      typeof error === 'object' &&
      'code' in error &&
      (error as { code: string }).code === 'P2002'
    ) {
      return NextResponse.json(
        { error: 'Account code already exists in this company' },
        { status: 409 }
      );
    }

    console.error('Update account error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ─── DELETE /api/company/[companyId]/accounts/[accountId] ───
// Delete account. Tenant-scoped via deleteMany.
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { tenantId } = await requireTenant(request);
    const { companyId, accountId } = await params;

    // Verify ownership first
    const account = await prisma.account.findFirst({
      where: {
        id: accountId,
        companyId,
        company: { tenantId }, // TENANT SCOPE
      },
    });

    if (!account) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }

    await prisma.account.delete({
      where: { id: accountId },
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    if (error instanceof Response) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Delete account error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
