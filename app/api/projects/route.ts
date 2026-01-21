import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireTenant } from '@/lib/auth/requireTenant';

export async function GET(request: NextRequest) {
  try {
    const { tenantId } = await requireTenant(request);

    const projects = await prisma.project.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(projects, { status: 200 });
  } catch (error) {
    if (error instanceof Response) {
      return error;
    }
    return NextResponse.error();
  }
}

export async function POST(request: NextRequest) {
  try {
    const { tenantId } = await requireTenant(request);

    const body = await request.json();
    const { name, description } = body;

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    const project = await prisma.project.create({
      data: {
        name,
        description,
        tenantId,
      },
    });

    return NextResponse.json(project, { status: 201 });
  } catch (error) {
    if (error instanceof Response) {
      return error;
    }
    return NextResponse.error();
  }
}