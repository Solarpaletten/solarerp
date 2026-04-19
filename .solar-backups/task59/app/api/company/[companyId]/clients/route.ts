// app/api/company/[companyId]/clients/route.ts
// ═══════════════════════════════════════════════════
// Task 54 FINAL: Clients API with all Dashka audit fixes
// ═══════════════════════════════════════════════════
// GET: List clients with search, sort, pagination, filters
// POST: Create client with full validation

import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';
import { requireTenant } from '@/lib/auth/requireTenant';

type RouteParams = {
  params: Promise<{ companyId: string }>;
};

const VALID_CLIENT_TYPES = ['COMPANY', 'SOLE_TRADER', 'INDIVIDUAL', 'GOVERNMENT', 'NON_PROFIT'];
const VALID_LOCATIONS = ['LOCAL', 'EU', 'FOREIGN'];
const VALID_ROLES = ['CUSTOMER', 'SUPPLIER', 'BOTH'];
const SORTABLE_FIELDS = ['name', 'code', 'createdAt', 'type', 'isActive', 'vatCode', 'email'];

// Email validation regex
const EMAIL_REGEX = /^\S+@\S+\.\S+$/;

// ─── GET: List clients ───────────────────────────
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { tenantId } = await requireTenant(request);
    const { companyId } = await params;

    // Verify company exists and belongs to tenant
    const company = await prisma.company.findFirst({
      where: { id: companyId, tenantId },
      select: { id: true },
    });
    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    // Parse query parameters
    const url = new URL(request.url);
    const search = url.searchParams.get('search') || '';
    const typeFilter = url.searchParams.get('type') || '';
    const roleFilter = url.searchParams.get('role') || '';
    const isActiveFilter = url.searchParams.get('isActive');
    const sortBy = url.searchParams.get('sortBy') || 'createdAt';
    const sortDir = url.searchParams.get('sortDir') === 'asc' ? 'asc' : 'desc';
    const page = Math.max(1, parseInt(url.searchParams.get('page') || '1'));
    const pageSize = Math.min(100, Math.max(1, parseInt(url.searchParams.get('pageSize') || '20')));

    // DOS protection: max page = 10000
    if (page > 10000) {
      return NextResponse.json({ error: 'Page number too high' }, { status: 400 });
    }

    // Build where clause
    const where: Record<string, unknown> = {
      companyId,
      company: { tenantId },
    };

    // Search filter (require >= 2 characters to prevent full-table scan)
    if (search && search.length >= 2) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { code: { contains: search, mode: 'insensitive' } },
        { vatCode: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { shortName: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Type filter
    if (typeFilter && VALID_CLIENT_TYPES.includes(typeFilter)) {
      where.type = typeFilter;
    }

    // Role filter (Dashka fix: no else clause)
    if (roleFilter === 'CUSTOMER') {
      where.role = { in: ['CUSTOMER', 'BOTH'] };
    } else if (roleFilter === 'SUPPLIER') {
      where.role = { in: ['SUPPLIER', 'BOTH'] };
    }
    // If roleFilter === 'BOTH' or empty: show all (no where clause for role)

    // Active filter
    if (isActiveFilter === 'true') where.isActive = true;
    if (isActiveFilter === 'false') where.isActive = false;

    // Validate sort field (prevent injection)
    const orderField = SORTABLE_FIELDS.includes(sortBy) ? sortBy : 'createdAt';

    // Count + fetch with pagination
    const [total, clients] = await Promise.all([
      prisma.client.count({ where: where as any }),
      prisma.client.findMany({
        where: where as any,
        orderBy: { [orderField]: sortDir },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    return NextResponse.json({
      data: clients,
      count: total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (error: unknown) {
    if (error instanceof Response) return error;
    const msg = error instanceof Error ? error.message : 'Unknown error';
    console.error('[GET /clients] Error:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// ─── POST: Create client ─────────────────────────
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { tenantId } = await requireTenant(request);
    const { companyId } = await params;

    // Verify company exists
    const company = await prisma.company.findFirst({
      where: { id: companyId, tenantId },
      select: { id: true },
    });
    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    const body = await request.json();

    // ──────────────────────────────────
    // Validation
    // ──────────────────────────────────
    if (!body.name || String(body.name).trim().length === 0) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    if (!body.type || !VALID_CLIENT_TYPES.includes(body.type)) {
      return NextResponse.json(
        { error: `Invalid type. Must be one of: ${VALID_CLIENT_TYPES.join(', ')}` },
        { status: 400 }
      );
    }

    if (!body.location || !VALID_LOCATIONS.includes(body.location)) {
      return NextResponse.json(
        { error: `Invalid location. Must be one of: ${VALID_LOCATIONS.join(', ')}` },
        { status: 400 }
      );
    }

    if (body.role && !VALID_ROLES.includes(body.role)) {
      return NextResponse.json(
        { error: `Invalid role. Must be one of: ${VALID_ROLES.join(', ')}` },
        { status: 400 }
      );
    }

    // Email validation (Dashka improvement)
    if (body.email) {
      const email = String(body.email).trim();
      if (!EMAIL_REGEX.test(email)) {
        return NextResponse.json({ error: 'Invalid email format' }, { status: 400 });
      }
    }

    // Trim code before uniqueness check (Dashka improvement)
    const trimmedCode = body.code ? String(body.code).trim() : null;

    // Code must be unique within company
    if (trimmedCode) {
      const existing = await prisma.client.findFirst({
        where: { companyId, code: trimmedCode },
      });
      if (existing) {
        return NextResponse.json(
          { error: 'Client code already exists in this company' },
          { status: 409 }
        );
      }
    }

    // paymentTermsDays validation (Dashka improvement)
    if (body.paymentTermsDays !== undefined && body.paymentTermsDays !== null) {
      const days = Number(body.paymentTermsDays);
      if (days < 0 || days > 365) {
        return NextResponse.json(
          { error: 'Payment days must be between 0 and 365' },
          { status: 400 }
        );
      }
    }

    // ──────────────────────────────────
    // Create client with Decimal for financial data
    // ──────────────────────────────────
    const client = await prisma.client.create({
      data: {
        company: {
          connect: { id: companyId }
        },

        tenantId,
        name: String(body.name).trim(),
        shortName: body.shortName ? String(body.shortName).trim() : null,
        code: trimmedCode,
        type: "BANANA", 
        location: body.location,
        role: body.role || 'BOTH',
        isActive: body.isActive !== false,

        // Legal & Tax
        vatCode: body.vatCode ? String(body.vatCode).trim() : null,
        businessLicenseCode: body.businessLicenseCode ? String(body.businessLicenseCode).trim() : null,
        residentTaxCode: body.residentTaxCode ? String(body.residentTaxCode).trim() : null,

        // Contact
        email: body.email ? String(body.email).trim() : null,
        phoneNumber: body.phoneNumber ? String(body.phoneNumber).trim() : null,
        faxNumber: body.faxNumber ? String(body.faxNumber).trim() : null,
        contactInfo: body.contactInfo ? String(body.contactInfo).trim() : null,
        notes: body.notes ? String(body.notes).trim() : null,

        // Financial (DECIMAL for precision)
        paymentTermsDays: body.paymentTermsDays != null ? Number(body.paymentTermsDays) : null,
        creditLimit:
          body.creditLimit != null
            ? new Prisma.Decimal(String(body.creditLimit))
            : null,
        creditLimitCurrency: body.creditLimitCurrency ? String(body.creditLimitCurrency) : 'EUR',
        automaticDebtRemind: body.automaticDebtRemind === true,

        // Individual
        birthday: body.birthday ? new Date(body.birthday) : null,

        // Registration address
        registrationCountryCode: body.registrationCountryCode ? String(body.registrationCountryCode).trim() : null,
        registrationCity: body.registrationCity ? String(body.registrationCity).trim() : null,
        registrationAddress: body.registrationAddress ? String(body.registrationAddress).trim() : null,
        registrationZipCode: body.registrationZipCode ? String(body.registrationZipCode).trim() : null,

        // Correspondence address
        correspondenceCountryCode: body.correspondenceCountryCode ? String(body.correspondenceCountryCode).trim() : null,
        correspondenceCity: body.correspondenceCity ? String(body.correspondenceCity).trim() : null,
        correspondenceAddress: body.correspondenceAddress ? String(body.correspondenceAddress).trim() : null,
        correspondenceZipCode: body.correspondenceZipCode ? String(body.correspondenceZipCode).trim() : null,

        // Banking
        bankAccount: body.bankAccount ? String(body.bankAccount).trim() : null,
        bankName: body.bankName ? String(body.bankName).trim() : null,
        bankCode: body.bankCode ? String(body.bankCode).trim() : null,
        bankSwiftCode: body.bankSwiftCode ? String(body.bankSwiftCode).trim() : null,

        // Accounting
        receivableAccountId: body.receivableAccountId
          ? String(body.receivableAccountId).trim()
          : null,

        payableAccountId: body.payableAccountId
          ? String(body.payableAccountId).trim()
          : null,
      },
    });

    return NextResponse.json({ data: client }, { status: 201 });
  } catch (error: unknown) {
    if (error instanceof Response) return error;

    // Handle unique constraint violation
    if (
      error && typeof error === 'object' && 'code' in error &&
      (error as { code: string }).code === 'P2002'
    ) {
      return NextResponse.json(
        { error: 'Client code already exists in this company' },
        { status: 409 }
      );
    }

    const msg = error instanceof Error ? error.message : 'Unknown error';
    console.error('[POST /clients] Error:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
