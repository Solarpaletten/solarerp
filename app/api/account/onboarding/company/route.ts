// app/api/account/onboarding/company/route.ts
// ═══════════════════════════════════════════════════════════════
// TASK 58 FIX — Onboarding route (patched)
// Change: passes userId to initializeCompanyFromTemplate (FIX1)
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

    if (!companyName?.trim()) return NextResponse.json({ error: 'Company name is required' }, { status: 400 });
    if (!country?.trim())     return NextResponse.json({ error: 'Country is required' }, { status: 400 });
    if (!legalType?.trim())   return NextResponse.json({ error: 'Legal type is required' }, { status: 400 });
    if (typeof vatPayer !== 'boolean') return NextResponse.json({ error: 'vatPayer must be boolean' }, { status: 400 });

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, surname: true },
    });
    const createdByUserName = [user?.name, user?.surname].filter(Boolean).join(' ') || undefined;

    const company = await prisma.company.create({
      data: {
        tenantId,
        name:           companyName.trim(),
        country:        country.trim().toUpperCase(),
        legalType:      legalType.trim(),
        vatPayer,
        currencyCode:   getCurrencyForCountry(country),
        status:         'ACTIVE',
        createdByUserId: userId,
      },
    });

    console.log(`[Onboarding] Company created: ${company.id} "${company.name}" userId=${userId}`);

    // ── FIX: userId now passed into bootstrap ─────────────
    const bootstrapResult = await initializeCompanyFromTemplate({
      companyId:        company.id,
      companyName:      company.name,
      country:          country.trim().toUpperCase(),
      legalType:        legalType.trim(),
      vatPayer,
      userId,                   // ← FIX1: CompanyUser OWNER
      createdByUserName,
    });

    if (!bootstrapResult.success) {
      console.error(`[Onboarding] Bootstrap failed for ${company.id}: ${bootstrapResult.error}`);
      return NextResponse.json({
        data: { companyId: company.id, status: 'BOOTSTRAP_FAILED',
                error: 'Company created but initial data setup failed.' },
      }, { status: 207 });
    }

    return NextResponse.json({
      data: {
        companyId:   company.id,
        status:      'READY',
        templateKey: bootstrapResult.templateKey,
        created:     bootstrapResult.created,
      },
    }, { status: 201 });

  } catch (error) {
    if (error instanceof Response) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    console.error('[Onboarding/company] Error:', error);
    return NextResponse.json({ error: 'Failed to create company' }, { status: 500 });
  }
}
