import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireTenant } from '@/lib/auth/requireTenant';

type RouteParams = {
  params: {
    companyId: string;
  };
};

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { tenantId } = await requireTenant(request);

    const company = await prisma.company.findFirst({
      where: {
        id: params.companyId,
        tenantId,
      },
    });

    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    return NextResponse.json(company);
  } catch (error) {
    if (error instanceof Response) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Get company error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { tenantId } = await requireTenant(request);
    const body = await request.json();

    const existing = await prisma.company.findFirst({
      where: {
        id: params.companyId,
        tenantId,
      },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    const company = await prisma.company.update({
      where: { id: params.companyId },
      data: {
        name: body.name ?? existing.name,
        code: body.code ?? existing.code,
        vatNumber: body.vatNumber ?? existing.vatNumber,
        country: body.country ?? existing.country,
        status: body.status ?? existing.status,
      },
    });

    return NextResponse.json(company);
  } catch (error) {
    if (error instanceof Response) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Update company error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { tenantId } = await requireTenant(request);

    const existing = await prisma.company.findFirst({
      where: {
        id: params.companyId,
        tenantId,
      },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    await prisma.company.delete({
      where: { id: params.companyId },
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    if (error instanceof Response) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Delete company error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

