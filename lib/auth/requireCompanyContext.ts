// lib/auth/requireCompanyContext.ts
// ═══════════════════════════════════════════════════════════════
// TASK 59 — Company Context Middleware
//
// Rules (HARD):
//   ❌ NO fallback
//   ❌ NO default company
//   ❌ NO backend state
//   ❌ NO bypass
//
// Flow:
//   1. requireTenant()  → { userId, tenantId }
//   2. X-Company-Id     → companyId (400 if missing)
//   3. company.tenantId === tenantId (403 TENANT_ACCESS_DENIED)
//   4. CompanyUser exists (403 COMPANY_ACCESS_DENIED)
// ═══════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireTenant } from './requireTenant';

export interface CompanyContext {
  userId: string;
  tenantId: string;
  companyId: string;
}

export class CompanyContextError extends Error {
  constructor(
    public readonly code:
      | 'COMPANY_CONTEXT_MISSING'
      | 'COMPANY_ACCESS_DENIED'
      | 'TENANT_ACCESS_DENIED',
    public readonly status: 400 | 403,
    message: string
  ) {
    super(message);
    this.name = 'CompanyContextError';
  }
}

export async function requireCompanyContext(
  request: NextRequest
): Promise<CompanyContext> {
  // Step 1: session → tenantId
  const { userId, tenantId } = await requireTenant(request);

  // Step 2: X-Company-Id header — mandatory
  const companyId = request.headers.get('X-Company-Id')?.trim();
  if (!companyId) {
    throw new CompanyContextError(
      'COMPANY_CONTEXT_MISSING',
      400,
      'X-Company-Id header is required'
    );
  }

  // Step 3: tenant isolation (CRITICAL)
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: { id: true, tenantId: true },
  });

  if (!company) {
    throw new CompanyContextError(
      'COMPANY_ACCESS_DENIED',
      403,
      'Company not found or access denied'
    );
  }

  if (company.tenantId !== tenantId) {
    console.warn(
      `[Security] TENANT_ACCESS_DENIED userId=${userId} ` +
      `tenantId=${tenantId} companyId=${companyId}`
    );
    throw new CompanyContextError(
      'TENANT_ACCESS_DENIED',
      403,
      'Access denied: company belongs to different tenant'
    );
  }

  // Step 4: CompanyUser check
  const membership = await (prisma as any).companyUser.findUnique({
    where: { companyId_userId: { companyId, userId } },
    select: { id: true },
  });

  if (!membership) {
    throw new CompanyContextError(
      'COMPANY_ACCESS_DENIED',
      403,
      'User does not have access to this company'
    );
  }

  return { userId, tenantId, companyId };
}

// Helper: error response builder
export function companyContextErrorResponse(err: unknown): NextResponse | null {
  if (err instanceof CompanyContextError) {
    return NextResponse.json(
      { error: err.code, message: err.message },
      { status: err.status }
    );
  }
  if (err instanceof Response) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  }
  return null;
}
