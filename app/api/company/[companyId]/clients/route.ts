// app/api/company/[companyId]/clients/route.ts
// ═══════════════════════════════════════════════════
// Task 42 + 44: Clients API (Enterprise + ERPGrid)
// ═══════════════════════════════════════════════════
// GET: list with search, sort, pagination, filters
// POST: create with validation

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireTenant } from '@/lib/auth/requireTenant';

type RouteParams = {
  params: Promise<{ companyId: string }>;
};

const VALID_CLIENT_TYPES = ['COMPANY', 'SOLE_TRADER', 'INDIVIDUAL', 'GOVERNMENT', 'NON_PROFIT'];
const VALID_LOCATIONS = ['LOCAL', 'EU', 'FOREIGN'];
const SORTABLE_FIELDS = ['name', 'code', 'createdAt', 'type', 'isActive', 'vatCode', 'email'];

// ─── GET: List clients ───────────────────────────

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { tenantId } = await requireTenant(request);
    const { companyId } = await params;

    const company = await prisma.company.findFirst({
      where: { id: companyId, tenantId },
      select: { id: true },
    });
    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    // Parse query params
    const url = new URL(request.url);
    const search = url.searchParams.get('search') || '';
    const typeFilter = url.searchParams.get('type') || '';
    const isActiveFilter = url.searchParams.get('isActive');
    const sortBy = url.searchParams.get('sortBy') || 'createdAt';
    const sortDir = url.searchParams.get('sortDir') === 'asc' ? 'asc' : 'desc';
    const page = Math.max(1, parseInt(url.searchParams.get('page') || '1'));
    const pageSize = Math.min(100, Math.max(1, parseInt(url.searchParams.get('pageSize') || '20')));

    // Build where clause
    const where: Record<string, unknown> = {
      companyId,
      company: { tenantId },
    };

    // Search filter (name, code, vatCode, email)
    if (search) {
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

    // Active filter
    if (isActiveFilter === 'true') where.isActive = true;
    if (isActiveFilter === 'false') where.isActive = false;

    // Validate sort field
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
    console.error('List clients error:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// ─── POST: Create client ─────────────────────────

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { tenantId } = await requireTenant(request);
    const { companyId } = await params;

    const company = await prisma.company.findFirst({
      where: { id: companyId, tenantId },
      select: { id: true },
    });
    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    const body = await request.json();

    // Validation
    if (!body.name || String(body.name).trim().length === 0) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    if (!body.type || !VALID_CLIENT_TYPES.includes(body.type)) {
      return NextResponse.json({ error: `Invalid type. Must be: ${VALID_CLIENT_TYPES.join(', ')}` }, { status: 400 });
    }

    if (!body.location || !VALID_LOCATIONS.includes(body.location)) {
      return NextResponse.json({ error: `Invalid location. Must be: ${VALID_LOCATIONS.join(', ')}` }, { status: 400 });
    }

    if (body.creditLimit !== undefined && body.creditLimit !== null) {
      const cl = Number(body.creditLimit);
      if (isNaN(cl) || cl < 0) {
        return NextResponse.json({ error: 'Credit limit must be non-negative' }, { status: 400 });
      }
    }

    if (body.payWithinDays !== undefined && body.payWithinDays !== null) {
      const pwd = Number(body.payWithinDays);
      if (isNaN(pwd) || pwd < 0 || !Number.isInteger(pwd)) {
        return NextResponse.json({ error: 'payWithinDays must be non-negative integer' }, { status: 400 });
      }
    }

    // Unique code check
    if (body.code) {
      const existing = await prisma.client.findFirst({
        where: { companyId, code: body.code },
        select: { id: true },
      });
      if (existing) {
        return NextResponse.json({ error: `Client with code "${body.code}" already exists` }, { status: 409 });
      }
    }

    const client = await prisma.client.create({
      data: {
        companyId,
        name: String(body.name).trim(),
        shortName: body.shortName || null,
        code: body.code || null,
        type: body.type,
        location: body.location,
        isActive: body.isActive !== false,
        vatCode: body.vatCode || null,
        businessLicenseCode: body.businessLicenseCode || null,
        residentTaxCode: body.residentTaxCode || null,
        email: body.email || null,
        phoneNumber: body.phoneNumber || null,
        faxNumber: body.faxNumber || null,
        contactInfo: body.contactInfo || null,
        notes: body.notes || null,
        payWithinDays: body.payWithinDays != null ? Number(body.payWithinDays) : null,
        creditLimit: body.creditLimit != null ? Number(body.creditLimit) : null,
        creditLimitCurrency: body.creditLimitCurrency || null,
        automaticDebtRemind: body.automaticDebtRemind || false,
        birthday: body.birthday ? new Date(body.birthday) : null,
        registrationCountryCode: body.registrationCountryCode || null,
        registrationCity: body.registrationCity || null,
        registrationAddress: body.registrationAddress || null,
        registrationZipCode: body.registrationZipCode || null,
        correspondenceCountryCode: body.correspondenceCountryCode || null,
        correspondenceCity: body.correspondenceCity || null,
        correspondenceAddress: body.correspondenceAddress || null,
        correspondenceZipCode: body.correspondenceZipCode || null,
        bankAccount: body.bankAccount || null,
        bankName: body.bankName || null,
        bankCode: body.bankCode || null,
        bankSwiftCode: body.bankSwiftCode || null,
      },
    });

    return NextResponse.json({ data: client }, { status: 201 });
  } catch (error: unknown) {
    if (error instanceof Response) return error;

    if (error && typeof error === 'object' && 'code' in error && (error as { code: string }).code === 'P2002') {
      return NextResponse.json({ error: 'Client with this code already exists in this company' }, { status: 409 });
    }

    const msg = error instanceof Error ? error.message : 'Unknown error';
    console.error('Create client error:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
