// app/api/account/onboarding/route.ts
// ═══════════════════════════════════════════════════════════════
// TASK 58 — Company Onboarding API
// POST /api/account/onboarding
// Creates company + runs full bootstrap initialization
// ═══════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireTenant } from '@/lib/auth/requireTenant';
import { initializeCompanyFromTemplate } from '@/lib/onboarding/companyBootstrapService';
import { getCurrencyForCountry } from '@/lib/onboarding/templateResolver';

export async function POST(request: NextRequest) {
  try {
    const { userId, tenantId } = await requireTenant(request);

    const body = await request.json();
    const { companyName, country, legalType, vatPayer } = body;

    // ── Validation ────────────────────────────────────────
    if (!companyName?.trim()) {
      return NextResponse.json({ error: 'Company name is required' }, { status: 400 });
    }
    if (!country?.trim()) {
      return NextResponse.json({ error: 'Country is required' }, { status: 400 });
    }
    if (!legalType?.trim()) {
      return NextResponse.json({ error: 'Legal type is required' }, { status: 400 });
    }
    if (typeof vatPayer !== 'boolean') {
      return NextResponse.json({ error: 'vatPayer must be boolean' }, { status: 400 });
    }

    // ── Get user name for Director employee ───────────────
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, surname: true },
    });
    const createdByUserName = [user?.name, user?.surname].filter(Boolean).join(' ') || undefined;

    // ── Create Company ────────────────────────────────────
    const currencyCode = getCurrencyForCountry(country);

    const company = await prisma.company.create({
      data: {
        tenantId,
        name: companyName.trim(),
        country: country.trim().toUpperCase(),
        legalType: legalType.trim(),
        vatPayer,
        currencyCode,
        status: 'ACTIVE',
        createdByUserId: userId,
      },
    });

    console.log(`[Onboarding] Company created: ${company.id} "${company.name}" by user ${userId}`);

    // ── Run Bootstrap ─────────────────────────────────────
    const bootstrapResult = await initializeCompanyFromTemplate({
      companyId:           company.id,
      companyName:         company.name,
      country:             country.trim().toUpperCase(),
      legalType:           legalType.trim(),
      vatPayer,
      userId,
      createdByUserName,
    });

    if (!bootstrapResult.success) {
      // Company created but bootstrap failed — still return companyId so user can retry
      console.error(`[Onboarding] Bootstrap failed for company ${company.id}: ${bootstrapResult.error}`);
      return NextResponse.json({
        data: {
          companyId: company.id,
          status: 'BOOTSTRAP_FAILED',
          error: 'Initial data setup failed. Please contact support or retry.',
        },
      }, { status: 207 }); // 207 Multi-Status: partial success
    }

    console.log(`[Onboarding] Bootstrap complete for company ${company.id}. Template: ${bootstrapResult.templateKey}`);

    return NextResponse.json({
      data: {
        companyId: company.id,
        status: 'READY',
        templateKey: bootstrapResult.templateKey,
        created: bootstrapResult.created,
      },
    }, { status: 201 });

  } catch (error) {
    if (error instanceof Response) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('[Onboarding] Error:', error);
    return NextResponse.json({ error: 'Failed to create company' }, { status: 500 });
  }
}

// ── GET: Check if user needs onboarding ──────────────────────
export async function GET(request: NextRequest) {
  try {
    const { tenantId } = await requireTenant(request);

    const companies = await prisma.company.findMany({
      where: { tenantId },
      select: { id: true, name: true, country: true, legalType: true, onboardingCompletedAt: true },
      orderBy: { createdAt: 'asc' },
    });

    return NextResponse.json({
      data: {
        needsOnboarding: companies.length === 0,
        companies,
      },
    });
  } catch (error) {
    if (error instanceof Response) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
