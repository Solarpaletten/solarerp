// lib/company/companyAccessService.ts
// ═══════════════════════════════════════════════════════════════
// TASK 58 — Company Access Service
// Manages CompanyUser relation (owner/member access table)
// ═══════════════════════════════════════════════════════════════
//
// NOTE on current architecture:
// Solar ERP uses Tenant → Company → ERP data pattern.
// Currently there is no separate CompanyUser table.
// TASK 58 adds CompanyUser as the ownership/access layer.
//
// SCHEMA ADDITION required (see prisma/SCHEMA_ADDITIONS.prisma):
//   model CompanyUser { ... }
// ═══════════════════════════════════════════════════════════════

import prisma from '@/lib/prisma';

export type CompanyRole = 'OWNER' | 'ACCOUNTANT' | 'MANAGER' | 'EMPLOYEE' | 'VIEWER';

export interface CompanyMembership {
  id: string;
  companyId: string;
  userId: string;
  role: CompanyRole;
  isOwner: boolean;
  createdAt: Date;
}

// ─── Grant initial owner access ──────────────────────────────
// Called immediately after company creation
// Creates the owner relation for the user who created the company
export async function grantOwnerAccess(
  companyId: string,
  userId: string
): Promise<void> {
  // Upsert: safe to call multiple times
  await (prisma as any).companyUser.upsert({
    where: {
      companyId_userId: { companyId, userId },
    },
    update: {
      role: 'OWNER',
      isOwner: true,
    },
    create: {
      companyId,
      userId,
      role: 'OWNER',
      isOwner: true,
    },
  });
  console.log(`[CompanyAccess] Owner access granted: userId=${userId} companyId=${companyId}`);
}

// ─── Check if user has access to a company ───────────────────
export async function hasCompanyAccess(
  userId: string,
  companyId: string
): Promise<boolean> {
  // Strategy A: Use CompanyUser table if available
  try {
    const membership = await (prisma as any).companyUser.findUnique({
      where: { companyId_userId: { companyId, userId } },
    });
    if (membership !== undefined) return membership !== null;
  } catch {
    // CompanyUser table may not exist yet (migration not run) → fallback
  }

  // Strategy B: Fallback to Tenant-based check (current architecture)
  // User → tenantId → companies owned by that tenant
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { tenantId: true },
  });
  if (!user) return false;

  const company = await prisma.company.findFirst({
    where: { id: companyId, tenantId: user.tenantId },
    select: { id: true },
  });
  return company !== null;
}

// ─── Get all companies for a user ────────────────────────────
export async function getUserCompanies(userId: string, tenantId: string) {
  const companies = await prisma.company.findMany({
    where: { tenantId },
    select: {
      id: true,
      name: true,
      country: true,
      legalType: true,
      currencyCode: true,
      onboardingCompletedAt: true,
      status: true,
      createdAt: true,
    },
    orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
  });
  return companies;
}
