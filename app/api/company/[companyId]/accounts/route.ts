// app/api/company/[companyId]/accounts/route.ts
// ═══════════════════════════════════════════════════
// TENANT-SAFE Chart of Accounts API
// ═══════════════════════════════════════════════════
//
// Security: Two-level isolation
//   1. requireTenant() → tenantId from session
//   2. Every query includes company: { tenantId }
//
// Pattern: company belongs to tenant → accounts belong to company
//   Tenant → Company → Account (ownership chain verified)

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireTenant } from '@/lib/auth/requireTenant';

type RouteParams = {
  params: Promise<{ companyId: string }>;
};

// Valid account types (matches Prisma enum)
const VALID_TYPES = ['ASSET', 'LIABILITY', 'EQUITY', 'INCOME', 'EXPENSE'];

// ─── HELPER: Verify company belongs to tenant ────
async function verifyCompanyOwnership(companyId: string, tenantId: string) {
  const company = await prisma.company.findFirst({
    where: { id: companyId, tenantId },
    select: { id: true },
  });
  return company !== null;
}

// ─── GET /api/company/[companyId]/accounts ───────
// List all accounts for this company
// Tenant-safe: only accounts of companies owned by current tenant
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { tenantId } = await requireTenant(request);
    const { companyId } = await params;

    // Verify company belongs to tenant
    const isOwner = await verifyCompanyOwnership(companyId, tenantId);
    if (!isOwner) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    const accounts = await prisma.account.findMany({
      where: {
        companyId,
        company: { tenantId }, // TENANT SCOPE (defense-in-depth)
      },
      orderBy: { code: 'asc' },
    });

    return NextResponse.json({ data: accounts, count: accounts.length });
  } catch (error) {
    if (error instanceof Response) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('List accounts error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ─── POST /api/company/[companyId]/accounts ──────
// Create a new account in this company's chart
// Body: { code: string, name: string, type: AccountType }
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { tenantId } = await requireTenant(request);
    const { companyId } = await params;

    // Verify company belongs to tenant
    const isOwner = await verifyCompanyOwnership(companyId, tenantId);
    if (!isOwner) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    const body = await request.json();
    const { code, name, type } = body;

    // Validate required fields
    if (!code || !name || !type) {
      return NextResponse.json(
        { error: 'Missing required fields: code, name, type' },
        { status: 400 }
      );
    }

    // Validate account type
    if (!VALID_TYPES.includes(type)) {
      return NextResponse.json(
        { error: `Invalid type. Must be one of: ${VALID_TYPES.join(', ')}` },
        { status: 400 }
      );
    }

    // Create account (@@unique([companyId, code]) prevents duplicates)
    const account = await prisma.account.create({
      data: {
        companyId,
        code: code.trim(),
        nameDe: nameDe.trim(),
        nameEn: (nameEn || nameDe).trim(),
        type,
      },
    });

    return NextResponse.json({ data: account }, { status: 201 });
  } catch (error: unknown) {
    if (error instanceof Response) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Handle unique constraint violation (duplicate code)
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

    console.error('Create account error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
