// app/api/account/companies/route.ts
// Companies list — ordered by priority from DB
// Backward compatible: works with both cookie and x-user-id

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth/getCurrentUser';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const companies = await prisma.company.findMany({
      where: { tenantId: user.tenantId },
      orderBy: [
        { priority: 'asc' },
        { createdAt: 'asc' },
      ],
    });

    return NextResponse.json({
      success: true,
      companies,
    });
  } catch (error) {
    console.error('Get companies error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, code, vatNumber, country, description, industry } = body;

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    // Get max priority for auto-increment
    const maxPriority = await prisma.company.aggregate({
      where: { tenantId: user.tenantId },
      _max: { priority: true },
    });

    const company = await prisma.company.create({
      data: {
        tenantId: user.tenantId,
        name,
        code: code || null,
        vatNumber: vatNumber || null,
        country: country || null,
        priority: (maxPriority._max.priority ?? 0) + 1,
      },
    });

    return NextResponse.json(company, { status: 201 });
  } catch (error) {
    console.error('Create company error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
