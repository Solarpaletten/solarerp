// app/api/company/[companyId]/clients/[clientId]/route.ts
// ═══════════════════════════════════════════════════
// Task 42: Client Enterprise CRUD — Single Record
// ═══════════════════════════════════════════════════
// DELETE = soft delete (isActive = false)
// Hard delete blocked if linked documents exist

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireTenant } from '@/lib/auth/requireTenant';

type RouteParams = {
  params: Promise<{ companyId: string; clientId: string }>;
};

const VALID_CLIENT_TYPES = ['COMPANY', 'SOLE_TRADER', 'INDIVIDUAL', 'GOVERNMENT', 'NON_PROFIT'];
const VALID_LOCATIONS = ['LOCAL', 'EU', 'FOREIGN'];

// ─── GET — Single client ────────────────────────
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { tenantId } = await requireTenant(request);
    const { companyId, clientId } = await params;

    const client = await prisma.client.findFirst({
      where: {
        id: clientId,
        companyId,
        company: { tenantId },
      },
    });

    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    return NextResponse.json({ data: client });
  } catch (error: unknown) {
    if (error instanceof Response) return error;
    const msg = error instanceof Error ? error.message : 'Unknown error';
    console.error('Get client error:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// ─── PATCH — Update client ──────────────────────
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { tenantId } = await requireTenant(request);
    const { companyId, clientId } = await params;

    const client = await prisma.client.findFirst({
      where: {
        id: clientId,
        companyId,
        company: { tenantId },
      },
    });

    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    const body = await request.json();

    // ── Validation ──────────────────────────────
    if (body.type !== undefined && !VALID_CLIENT_TYPES.includes(body.type)) {
      return NextResponse.json(
        { error: `Invalid type. Must be one of: ${VALID_CLIENT_TYPES.join(', ')}` },
        { status: 400 }
      );
    }

    if (body.location !== undefined && !VALID_LOCATIONS.includes(body.location)) {
      return NextResponse.json(
        { error: `Invalid location. Must be one of: ${VALID_LOCATIONS.join(', ')}` },
        { status: 400 }
      );
    }

    if (body.creditLimit !== undefined && body.creditLimit !== null) {
      const cl = Number(body.creditLimit);
      if (isNaN(cl) || cl < 0) {
        return NextResponse.json({ error: 'Credit limit must be a non-negative number' }, { status: 400 });
      }
    }

    if (body.payWithinDays !== undefined && body.payWithinDays !== null) {
      const pwd = Number(body.payWithinDays);
      if (isNaN(pwd) || pwd < 0 || !Number.isInteger(pwd)) {
        return NextResponse.json({ error: 'Pay within days must be a non-negative integer' }, { status: 400 });
      }
    }

    // Check unique code if changing
    if (body.code !== undefined && body.code !== null && body.code !== client.code) {
      const codeStr = String(body.code).trim();
      if (codeStr.length > 0) {
        const existing = await prisma.client.findFirst({
          where: { companyId, code: codeStr, id: { not: clientId } },
          select: { id: true },
        });
        if (existing) {
          return NextResponse.json({ error: 'Client code already exists in this company' }, { status: 409 });
        }
      }
    }

    // Build update data (only provided fields)
    const updateData: Record<string, unknown> = {};

    if (body.name !== undefined) updateData.name = String(body.name).trim();
    if (body.shortName !== undefined) updateData.shortName = body.shortName ? String(body.shortName).trim() : null;
    if (body.code !== undefined) updateData.code = body.code ? String(body.code).trim() : null;
    if (body.type !== undefined) updateData.type = body.type;
    if (body.isActive !== undefined) updateData.isActive = Boolean(body.isActive);
    if (body.location !== undefined) updateData.location = body.location;

    if (body.vatCode !== undefined) updateData.vatCode = body.vatCode || null;
    if (body.businessLicenseCode !== undefined) updateData.businessLicenseCode = body.businessLicenseCode || null;
    if (body.residentTaxCode !== undefined) updateData.residentTaxCode = body.residentTaxCode || null;

    if (body.email !== undefined) updateData.email = body.email || null;
    if (body.phoneNumber !== undefined) updateData.phoneNumber = body.phoneNumber || null;
    if (body.faxNumber !== undefined) updateData.faxNumber = body.faxNumber || null;
    if (body.contactInfo !== undefined) updateData.contactInfo = body.contactInfo || null;
    if (body.notes !== undefined) updateData.notes = body.notes || null;

    if (body.payWithinDays !== undefined) updateData.payWithinDays = body.payWithinDays ? Number(body.payWithinDays) : null;
    if (body.creditLimit !== undefined) updateData.creditLimit = body.creditLimit !== null ? Number(body.creditLimit) : null;
    if (body.creditLimitCurrency !== undefined) updateData.creditLimitCurrency = body.creditLimitCurrency || null;
    if (body.automaticDebtRemind !== undefined) updateData.automaticDebtRemind = Boolean(body.automaticDebtRemind);

    if (body.birthday !== undefined) updateData.birthday = body.birthday ? new Date(body.birthday) : null;

    if (body.registrationCountryCode !== undefined) updateData.registrationCountryCode = body.registrationCountryCode || null;
    if (body.registrationCity !== undefined) updateData.registrationCity = body.registrationCity || null;
    if (body.registrationAddress !== undefined) updateData.registrationAddress = body.registrationAddress || null;
    if (body.registrationZipCode !== undefined) updateData.registrationZipCode = body.registrationZipCode || null;

    if (body.correspondenceCountryCode !== undefined) updateData.correspondenceCountryCode = body.correspondenceCountryCode || null;
    if (body.correspondenceCity !== undefined) updateData.correspondenceCity = body.correspondenceCity || null;
    if (body.correspondenceAddress !== undefined) updateData.correspondenceAddress = body.correspondenceAddress || null;
    if (body.correspondenceZipCode !== undefined) updateData.correspondenceZipCode = body.correspondenceZipCode || null;

    if (body.bankAccount !== undefined) updateData.bankAccount = body.bankAccount || null;
    if (body.bankName !== undefined) updateData.bankName = body.bankName || null;
    if (body.bankCode !== undefined) updateData.bankCode = body.bankCode || null;
    if (body.bankSwiftCode !== undefined) updateData.bankSwiftCode = body.bankSwiftCode || null;

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    const updated = await prisma.client.update({
      where: { id: clientId },
      data: updateData,
    });

    return NextResponse.json({ data: updated });
  } catch (error: unknown) {
    if (error instanceof Response) return error;

    if (
      error && typeof error === 'object' && 'code' in error &&
      (error as { code: string }).code === 'P2002'
    ) {
      return NextResponse.json({ error: 'Client code already exists in this company' }, { status: 409 });
    }

    const msg = error instanceof Error ? error.message : 'Unknown error';
    console.error('Update client error:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// ─── DELETE — Soft delete (deactivate) ──────────
// Enterprise ERP rule: never hard-delete clients
// with linked documents. Default = soft delete.
// Query param ?hard=true attempts hard delete
// (blocked if linked documents exist).
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { tenantId } = await requireTenant(request);
    const { companyId, clientId } = await params;

    const client = await prisma.client.findFirst({
      where: {
        id: clientId,
        companyId,
        company: { tenantId },
      },
    });

    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const hardDelete = searchParams.get('hard') === 'true';

    if (hardDelete) {
      // Check for linked documents before hard delete
      const [salesCount, purchasesCount] = await Promise.all([
        prisma.saleDocument.count({
          where: { companyId, clientName: client.name },
        }),
        prisma.purchaseDocument.count({
          where: { companyId, supplierName: client.name },
        }),
      ]);

      const totalLinked = salesCount + purchasesCount;

      if (totalLinked > 0) {
        return NextResponse.json({
          error: 'Cannot delete: client has linked documents',
          details: {
            salesCount,
            purchasesCount,
            suggestion: 'Deactivate instead (DELETE without ?hard=true)',
          },
        }, { status: 409 });
      }

      // No linked documents — safe to hard delete
      await prisma.client.delete({ where: { id: clientId } });
      return new NextResponse(null, { status: 204 });
    }

    // Default: soft delete (deactivate)
    if (!client.isActive) {
      return NextResponse.json({ error: 'Client is already deactivated' }, { status: 409 });
    }

    const deactivated = await prisma.client.update({
      where: { id: clientId },
      data: { isActive: false },
    });

    return NextResponse.json({
      data: deactivated,
      message: 'Client deactivated (soft delete)',
    });
  } catch (error: unknown) {
    if (error instanceof Response) return error;
    const msg = error instanceof Error ? error.message : 'Unknown error';
    console.error('Delete client error:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
