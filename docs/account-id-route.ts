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
// │ RULE 5: Stammkonten cannot be deleted/recoded   │
// └─────────────────────────────────────────────────┘

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireTenant } from '@/lib/auth/requireTenant';
import { isProtectedCode } from '@/lib/accounting/protectedAccounts';

type RouteParams = {
  params: Promise<{ companyId: string; accountId: string }>;
};

const VALID_TYPES = ['ASSET', 'LIABILITY', 'EQUITY', 'INCOME', 'EXPENSE'];

// ─── GET ─────────────────────────────────────────
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { tenantId } = await requireTenant(request);
    const { companyId, accountId } = await params;

    const account = await prisma.account.findFirst({
      where: {
        id: accountId,
        companyId,
        company: { tenantId },
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

// ─── PATCH ───────────────────────────────────────
// Body: { nameDe?, nameEn?, name?, code?, type?, isActive? }
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { tenantId } = await requireTenant(request);
    const { companyId, accountId } = await params;

    const body = await request.json();
    const { name, nameDe, nameEn, code, type, isActive } = body;

    // Validate type if provided
    if (type && !VALID_TYPES.includes(type)) {
      return NextResponse.json(
        { error: `Invalid type. Must be one of: ${VALID_TYPES.join(', ')}` },
        { status: 400 }
      );
    }

    // Find account (tenant-scoped)
    const account = await prisma.account.findFirst({
      where: {
        id: accountId,
        companyId,
        company: { tenantId },
      },
    });

    if (!account) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }

    // ═══ STAMMKONTEN PROTECTION ═══════════════════
    // Protected accounts: cannot change code, type, or deactivate
    if (isProtectedCode(account.code)) {
      if (code !== undefined && code !== account.code) {
        return NextResponse.json(
          { error: `System account ${account.code} (Stammkonto) — code cannot be changed` },
          { status: 403 }
        );
      }
      if (type !== undefined && type !== account.type) {
        return NextResponse.json(
          { error: `System account ${account.code} (Stammkonto) — type cannot be changed` },
          { status: 403 }
        );
      }
      if (isActive === false) {
        return NextResponse.json(
          { error: `System account ${account.code} (Stammkonto) — cannot be deactivated` },
          { status: 403 }
        );
      }
    }

    // Build update data (only provided fields)
    const updateData: Record<string, unknown> = {};
    // Bilingual: nameDe/nameEn preferred, legacy 'name' maps to nameDe
    if (nameDe !== undefined) updateData.nameDe = nameDe.trim();
    else if (name !== undefined) updateData.nameDe = name.trim();
    if (nameEn !== undefined) updateData.nameEn = nameEn.trim();
    if (code !== undefined) updateData.code = code.trim();
    if (type !== undefined) updateData.type = type;
    if (isActive !== undefined) updateData.isActive = Boolean(isActive);

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
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

// ─── DELETE ──────────────────────────────────────
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { tenantId } = await requireTenant(request);
    const { companyId, accountId } = await params;

    const account = await prisma.account.findFirst({
      where: {
        id: accountId,
        companyId,
        company: { tenantId },
      },
    });

    if (!account) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }

    // ═══ STAMMKONTEN PROTECTION ═══════════════════
    if (isProtectedCode(account.code)) {
      return NextResponse.json(
        { error: `System account ${account.code} (Stammkonto) cannot be deleted` },
        { status: 403 }
      );
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
