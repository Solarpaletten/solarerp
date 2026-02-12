import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { hashPassword } from '@/lib/auth/password';

export async function POST(request: NextRequest) {
  const body = await request.json();

  if (!body.email || !body.password || !body.tenantName) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  try {
    const tenant = await prisma.tenant.create({
      data: {
        name: body.tenantName,
      },
    });

    const hashedPassword = await hashPassword(body.password);

    const user = await prisma.user.create({
      data: {
        email: body.email,
        passwordHash: hashedPassword,
        tenantId: tenant.id,
      },
    });

    return NextResponse.json(
      {
        userId: user.id,
        email: user.email,
        tenantId: user.tenantId,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Signup error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

