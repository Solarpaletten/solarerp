// app/api/account/companies/route.ts
// ═══════════════════════════════════════════════════════════════
// TASK 60 — Companies API
//
// GET  /api/account/companies  — list via CompanyUser membership
// POST /api/account/companies  — create new company for tenant
//
// NOTE: POST does NOT use requireCompanyContext (no companyId yet)
// POST uses requireTenant only — creates company + grants OWNER access
// ═══════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireTenant } from '@/lib/auth/requireTenant';

// ─── GET /api/account/companies ───────────────────────────────
// Returns companies where user has CompanyUser membership
export async function GET(request: NextRequest) {
  try {
    const { userId, tenantId } = await requireTenant(request);

    const memberships = await (prisma as any).companyUser.findMany({
      where: { userId },
      select: {
        role: true,
        isOwner: true,
        company: {
          select: {
            id: true, name: true, country: true,
            legalType: true, currencyCode: true,
            vatPayer: true, status: true,
            onboardingCompletedAt: true,
            priority: true, createdAt: true,
            tenantId: true,
          },
        },
      },
      orderBy: [
        { company: { priority: 'desc' } },
        { company: { createdAt: 'asc' } },
      ],
    });

    const companies = memberships
      .filter((m: any) => m.company.tenantId === tenantId)
      .map((m: any) => ({
        id:                  m.company.id,
        name:                m.company.name,
        country:             m.company.country,
        legalType:           m.company.legalType,
        currencyCode:        m.company.currencyCode,
        vatPayer:            m.company.vatPayer,
        status:              m.company.status,
        onboardingCompleted: !!m.company.onboardingCompletedAt,
        priority:            m.company.priority,
        createdAt:           m.company.createdAt,
        role:                m.role,
        isOwner:             m.isOwner,
      }));

    return NextResponse.json({ data: companies });
  } catch (err) {
    if (err instanceof Response) {
      return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
    }
    console.error('[GET /api/account/companies]', err);
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}

// ─── POST /api/account/companies ──────────────────────────────
// Creates a new company for the current tenant
// Automatically grants OWNER access to the creating user
export async function POST(request: NextRequest) {
  try {
    const { userId, tenantId } = await requireTenant(request);

    const body = await request.json();
    const { name, country, legalType, vatPayer, regNumber, code } = body;

    if (!name?.trim()) {
      return NextResponse.json(
        { error: 'name is required' },
        { status: 400 }
      );
    }

    // Get max priority for auto-increment within tenant
    const maxPriority = await prisma.company.aggregate({
      where: { tenantId },
      _max: { priority: true },
    });

    // Create company
    const company = await prisma.company.create({
      data: {
        tenantId,
        name:         name.trim(),
        country:      country?.trim().toUpperCase() || 'DE',
        legalType:    legalType?.trim()             || 'GmbH',
        vatPayer:     vatPayer !== false,
        currencyCode: body.currencyCode             || 'EUR',
        code:         code?.trim()                  || null,
        status:       'ACTIVE',
        priority:     (maxPriority._max.priority ?? 0) + 1,
        createdByUserId: userId,
      },
    });

    // Grant OWNER access via CompanyUser
    await (prisma as any).companyUser.upsert({
      where: {
        companyId_userId: { companyId: company.id, userId },
      },
      update: { role: 'OWNER', isOwner: true },
      create: {
        companyId: company.id,
        userId,
        role:      'OWNER',
        isOwner:   true,
      },
    });

    console.log(`[Companies] Created: ${company.id} "${company.name}" userId=${userId}`);

    return NextResponse.json({ data: company }, { status: 201 });
  } catch (err) {
    if (err instanceof Response) {
      return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
    }
    console.error('[POST /api/account/companies]', err);
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
