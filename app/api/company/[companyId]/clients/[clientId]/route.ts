// app/api/company/[companyId]/clients/[clientId]/route.ts
// ═══════════════════════════════════════════════════
// Task 54 FINAL: Single client CRUD (all Dashka audit fixes)
// - Decimal for creditLimit
// - PATCH validation (name cannot be empty)
// - DELETE: soft + hard with proper reference checks
// - Email validation

import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';
import { requireTenant } from '@/lib/auth/requireTenant';

type RouteParams = {
  params: Promise<{ companyId: string; clientId: string }>;
};

const VALID_CLIENT_TYPES = ['COMPANY', 'SOLE_TRADER', 'INDIVIDUAL', 'GOVERNMENT', 'NON_PROFIT'];
const VALID_LOCATIONS = ['LOCAL', 'EU', 'FOREIGN'];
const VALID_ROLES = ['CUSTOMER', 'SUPPLIER', 'BOTH'];
const EMAIL_REGEX = /^\S+@\S+\.\S+$/;

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
    console.error('[GET /clients/[id]] Error:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// ─── PATCH — Update client ──────────────────────
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { tenantId } = await requireTenant(request);
    const { companyId, clientId } = await params;

    // Verify client exists
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

    // ──────────────────────────────────
    // Validation
    // ──────────────────────────────────

    // Name validation: cannot be empty if provided
    if (body.name !== undefined && String(body.name).trim().length === 0) {
      return NextResponse.json(
        { error: 'Name cannot be empty' },
        { status: 400 }
      );
    }

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

    if (body.role !== undefined && !VALID_ROLES.includes(body.role)) {
      return NextResponse.json(
        { error: `Invalid role. Must be one of: ${VALID_ROLES.join(', ')}` },
        { status: 400 }
      );
    }

    // Email validation (Dashka improvement)
    if (body.email !== undefined && body.email) {
      const email = String(body.email).trim();
      if (!EMAIL_REGEX.test(email)) {
        return NextResponse.json({ error: 'Invalid email format' }, { status: 400 });
      }
    }

    // paymentTermsDays validation (Dashka improvement: 0-365)
    if (body.paymentTermsDays !== undefined && body.paymentTermsDays !== null) {
      const days = Number(body.paymentTermsDays);
      if (days < 0 || days > 365) {
        return NextResponse.json(
          { error: 'Payment days must be between 0 and 365' },
          { status: 400 }
        );
      }
    }

    // Trim code before uniqueness check (Dashka improvement)
    const trimmedCode = body.code !== undefined ? (body.code ? String(body.code).trim() : null) : undefined;

    // If code is being updated, check uniqueness
    if (trimmedCode !== undefined && trimmedCode !== null && trimmedCode !== client.code) {
      const existing = await prisma.client.findFirst({
        where: {
          companyId,
          code: trimmedCode,
          id: { not: clientId },
        },
      });
      if (existing) {
        return NextResponse.json(
          { error: 'Client code already exists in this company' },
          { status: 409 }
        );
      }
    }

    // ──────────────────────────────────
    // Build update data
    // ──────────────────────────────────
    const updateData: Record<string, unknown> = {};

    if (body.name !== undefined) updateData.name = String(body.name).trim();
    if (body.shortName !== undefined) updateData.shortName = body.shortName ? String(body.shortName).trim() : null;
    if (trimmedCode !== undefined) updateData.code = trimmedCode;
    if (body.type !== undefined) updateData.type = body.type;
    if (body.location !== undefined) updateData.location = body.location;
    if (body.role !== undefined) updateData.role = body.role;
    if (body.isActive !== undefined) updateData.isActive = Boolean(body.isActive);
    if (body.notes !== undefined) updateData.notes = body.notes ? String(body.notes).trim() : null;

    // Legal & Tax
    if (body.vatCode !== undefined) updateData.vatCode = body.vatCode ? String(body.vatCode).trim() : null;
    if (body.businessLicenseCode !== undefined) updateData.businessLicenseCode = body.businessLicenseCode ? String(body.businessLicenseCode).trim() : null;
    if (body.residentTaxCode !== undefined) updateData.residentTaxCode = body.residentTaxCode ? String(body.residentTaxCode).trim() : null;

    // Contact
    if (body.email !== undefined) updateData.email = body.email ? String(body.email).trim() : null;
    if (body.phoneNumber !== undefined) updateData.phoneNumber = body.phoneNumber ? String(body.phoneNumber).trim() : null;
    if (body.faxNumber !== undefined) updateData.faxNumber = body.faxNumber ? String(body.faxNumber).trim() : null;
    if (body.contactInfo !== undefined) updateData.contactInfo = body.contactInfo ? String(body.contactInfo).trim() : null;

    // Financial (DECIMAL for creditLimit)
    if (body.paymentTermsDays !== undefined) updateData.paymentTermsDays = body.paymentTermsDays != null ? Number(body.paymentTermsDays) : null;
    if (body.creditLimit !== undefined) {
      updateData.creditLimit = body.creditLimit != null
        ? new Prisma.Decimal(String(body.creditLimit))
        : null;
    }
    if (body.creditLimitCurrency !== undefined) updateData.creditLimitCurrency = body.creditLimitCurrency || null;
    if (body.automaticDebtRemind !== undefined) updateData.automaticDebtRemind = Boolean(body.automaticDebtRemind);

    // Individual
    if (body.birthday !== undefined) updateData.birthday = body.birthday ? new Date(body.birthday) : null;

    // Registration
    if (body.registrationCountryCode !== undefined) updateData.registrationCountryCode = body.registrationCountryCode ? String(body.registrationCountryCode).trim() : null;
    if (body.registrationCity !== undefined) updateData.registrationCity = body.registrationCity ? String(body.registrationCity).trim() : null;
    if (body.registrationAddress !== undefined) updateData.registrationAddress = body.registrationAddress ? String(body.registrationAddress).trim() : null;
    if (body.registrationZipCode !== undefined) updateData.registrationZipCode = body.registrationZipCode ? String(body.registrationZipCode).trim() : null;

    // Correspondence
    if (body.correspondenceCountryCode !== undefined) updateData.correspondenceCountryCode = body.correspondenceCountryCode ? String(body.correspondenceCountryCode).trim() : null;
    if (body.correspondenceCity !== undefined) updateData.correspondenceCity = body.correspondenceCity ? String(body.correspondenceCity).trim() : null;
    if (body.correspondenceAddress !== undefined) updateData.correspondenceAddress = body.correspondenceAddress ? String(body.correspondenceAddress).trim() : null;
    if (body.correspondenceZipCode !== undefined) updateData.correspondenceZipCode = body.correspondenceZipCode ? String(body.correspondenceZipCode).trim() : null;

    // Banking
    if (body.bankAccount !== undefined) updateData.bankAccount = body.bankAccount ? String(body.bankAccount).trim() : null;
    if (body.bankName !== undefined) updateData.bankName = body.bankName ? String(body.bankName).trim() : null;
    if (body.bankCode !== undefined) updateData.bankCode = body.bankCode ? String(body.bankCode).trim() : null;
    if (body.bankSwiftCode !== undefined) updateData.bankSwiftCode = body.bankSwiftCode ? String(body.bankSwiftCode).trim() : null;

    // Accounting
    if (body.receivableAccountCode !== undefined) updateData.receivableAccountCode = body.receivableAccountCode ? String(body.receivableAccountCode).trim() : null;
    if (body.payableAccountCode !== undefined) updateData.payableAccountCode = body.payableAccountCode ? String(body.payableAccountCode).trim() : null;

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
    console.error('[PATCH /clients/[id]] Error:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// ─── DELETE ──────────────────────────────────────
// Enterprise Rule: Default = soft delete (isActive = false)
// Hard delete blocked if linked documents exist
// Query param ?hard=true attempts hard delete

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
      // DASHKA FIX: Removed fallback to name-based matching
      // Use direct FK relations (clientId, supplierId)
      // If relations don't exist in schema yet, migration handles it
      const [salesCount, purchasesCount] = await Promise.all([
        prisma.saleDocument.count({
          where: { companyId, clientId },
        }),
        prisma.purchaseDocument.count({
          where: { companyId, supplierId: clientId },
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
    console.error('[DELETE /clients/[id]] Error:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
