// app/api/account/companies/priorities/route.ts
// Batch update company priorities — stored in DB
// Per-tenant (shared for all users in tenant)

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth/getCurrentUser';

export async function PUT(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { priorities } = body;

    // priorities = { companyId: priority_number, ... }
    if (!priorities || typeof priorities !== 'object') {
      return NextResponse.json({ error: 'Invalid priorities format' }, { status: 400 });
    }

    // Batch update in transaction — all or nothing
    const updates = Object.entries(priorities).map(([companyId, priority]) =>
      prisma.company.updateMany({
        where: {
          id: companyId,
          tenantId: user.tenantId, // security: only own tenant
        },
        data: {
          priority: Number(priority),
        },
      })
    );

    await prisma.$transaction(updates);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Priority update error:', error);
    return NextResponse.json({ error: 'Failed to update priorities' }, { status: 500 });
  }
}
