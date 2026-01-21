import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireTenant } from '@/lib/auth/requireTenant';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { tenantId } = await requireTenant(request);

    const project = await prisma.project.findUnique({
      where: { id: params.id },
    });

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    if (project.tenantId !== tenantId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json(project, { status: 200 });
  } catch (error) {
    return NextResponse.error();
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { tenantId } = await requireTenant(request);
    const projectId = params.id;

    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      return NextResponse.json({ message: 'Project not found' }, { status: 404 });
    }

    if (project.tenantId !== tenantId) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    await prisma.project.delete({
      where: { id: projectId },
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('Error deleting project:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { tenantId } = await requireTenant(request);
    const projectId = params.id;
    const body = await request.json();

    if (!body.name && !body.description) {
      return NextResponse.json({ error: 'No fields provided' }, { status: 400 });
    }

    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    if (project.tenantId !== tenantId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const updatedProject = await prisma.project.update({
      where: { id: projectId },
      data: {
        ...(body.name && { name: body.name }),
        ...(body.description !== undefined && { description: body.description }),
      },
    });

    return NextResponse.json(updatedProject, { status: 200 });
  } catch (error) {
    console.error('Error updating project:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}