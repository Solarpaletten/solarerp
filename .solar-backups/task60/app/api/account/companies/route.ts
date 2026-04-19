// app/api/account/companies/route.ts
// TASK 59 — Companies list via CompanyUser membership

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireTenant } from '@/lib/auth/requireTenant';

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
