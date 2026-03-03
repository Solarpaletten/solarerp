// app/api/company/[companyId]/clients/route.ts
// ═══════════════════════════════════════════════════
// Task 42: Client Enterprise CRUD — List + Create
// ═══════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireTenant } from '@/lib/auth/requireTenant';

type RouteParams = {
  params: Promise<{ companyId: string }>;
};

const VALID_CLIENT_TYPES = ['COMPANY', 'SOLE_TRADER', 'INDIVIDUAL', 'GOVERNMENT', 'NON_PROFIT'];
const VALID_LOCATIONS = ['LOCAL', 'EU', 'FOREIGN'];

// ─── GET — List all clients ─────────────────────
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

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const isActive = searchParams.get('isActive');
    const search = searchParams.get('search');

    // Build filter
    const where: Record<string, unknown> = { companyId };
    if (type && VALID_CLIENT_TYPES.includes(type)) {
      where.type = type;
    }
    if (isActive !== null) {
      where.isActive = isActive !== 'false';
    }
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { code: { contains: search, mode: 'insensitive' } },
        { vatCode: { contains: search, mode: 'insensitive' } },
        { shortName: { contains: search, mode: 'insensitive' } },
      ];
    }

    const clients = await prisma.client.findMany({
      where,
      orderBy: [{ name: 'asc' }],
    });

    return NextResponse.json({ data: clients, count: clients.length });
  } catch (error: unknown) {
    if (error instanceof Response) return error;
    const msg = error instanceof Error ? error.message : 'Unknown error';
    console.error('List clients error:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// ─── POST — Create new client ───────────────────
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

    // ── Validation ──────────────────────────────
    if (!body.name || String(body.name).trim().length === 0) {
      return NextResponse.json({ error: 'Client name is required' }, { status: 400 });
    }

    if (!body.type || !VALID_CLIENT_TYPES.includes(body.type)) {
      return NextResponse.json(
        { error: `Client type is required. Must be one of: ${VALID_CLIENT_TYPES.join(', ')}` },
        { status: 400 }
      );
    }

    if (!body.location || !VALID_LOCATIONS.includes(body.location)) {
      return NextResponse.json(
        { error: `Location is required. Must be one of: ${VALID_LOCATIONS.join(', ')}` },
        { status: 400 }
      );
    }

    // Validate creditLimit if provided
    if (body.creditLimit !== undefined && body.creditLimit !== null) {
      const cl = Number(body.creditLimit);
      if (isNaN(cl) || cl < 0) {
        return NextResponse.json({ error: 'Credit limit must be a non-negative number' }, { status: 400 });
      }
    }

    // Validate payWithinDays if provided
    if (body.payWithinDays !== undefined && body.payWithinDays !== null) {
      const pwd = Number(body.payWithinDays);
      if (isNaN(pwd) || pwd < 0 || !Number.isInteger(pwd)) {
        return NextResponse.json({ error: 'Pay within days must be a non-negative integer' }, { status: 400 });
      }
    }

    // Check unique code per company
    if (body.code && String(body.code).trim().length > 0) {
      const existing = await prisma.client.findFirst({
        where: { companyId, code: String(body.code).trim() },
        select: { id: true },
      });
      if (existing) {
        return NextResponse.json({ error: 'Client code already exists in this company' }, { status: 409 });
      }
    }

    const client = await prisma.client.create({
      data: {
        companyId,
        name: String(body.name).trim(),
        shortName: body.shortName ? String(body.shortName).trim() : null,
        code: body.code ? String(body.code).trim() : null,
        type: body.type,
        isActive: body.isActive !== false,
        location: body.location,

        vatCode: body.vatCode || null,
        businessLicenseCode: body.businessLicenseCode || null,
        residentTaxCode: body.residentTaxCode || null,

        email: body.email || null,
        phoneNumber: body.phoneNumber || null,
        faxNumber: body.faxNumber || null,
        contactInfo: body.contactInfo || null,
        notes: body.notes || null,

        payWithinDays: body.payWithinDays ? Number(body.payWithinDays) : null,
        creditLimit: body.creditLimit !== undefined && body.creditLimit !== null
          ? Number(body.creditLimit)
          : null,
        creditLimitCurrency: body.creditLimitCurrency || null,
        automaticDebtRemind: body.automaticDebtRemind === true,

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

    if (
      error && typeof error === 'object' && 'code' in error &&
      (error as { code: string }).code === 'P2002'
    ) {
      return NextResponse.json({ error: 'Client code already exists in this company' }, { status: 409 });
    }

    const msg = error instanceof Error ? error.message : 'Unknown error';
    console.error('Create client error:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
