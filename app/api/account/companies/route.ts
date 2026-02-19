import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireTenant } from '@/lib/auth/requireTenant';

export async function GET(request: NextRequest) {
  try {
    const { tenantId } = await requireTenant(request);

    const companies = await prisma.company.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(companies);
  } catch (error) {
    if (error instanceof Response) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Get companies error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { tenantId } = await requireTenant(request);
    const body = await request.json();

    if (!body.name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    const company = await prisma.company.create({
      data: {
        tenantId,
        name: body.name,
        code: body.code || null,
        vatNumber: body.vatNumber || null,
        country: body.country || null,
      },
    });

    return NextResponse.json(company, { status: 201 });
  } catch (error) {
    if (error instanceof Response) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Create company error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

