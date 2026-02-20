// app/api/auth/login/route.ts
// Factory Login — creates session + HttpOnly cookie
// Also returns id/email/tenantId in body for mobile client backward compat

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyPassword } from '@/lib/auth/password';
import { createSession } from '@/lib/auth/session';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }

    const user = await prisma.user.findFirst({
      where: { email },
    });

    if (!user) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const isValid = await verifyPassword(password, user.passwordHash);
    if (!isValid) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    // ═══════════════════════════════════════════════
    // NEW: Create session in DB + set HttpOnly cookie
    // The cookie is set automatically by createSession()
    // ═══════════════════════════════════════════════
    await createSession(user.id, user.tenantId);

    // Response body for backward compatibility (mobile clients)
    return NextResponse.json({
      id: user.id,
      email: user.email,
      tenantId: user.tenantId,
    });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
