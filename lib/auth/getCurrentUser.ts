// lib/auth/getCurrentUser.ts
// Gets current user from session cookie (HttpOnly)
// Falls back to x-user-id header for backward compatibility
// Priority: cookie > x-user-id header

import prisma from '@/lib/prisma';
import { cookies } from 'next/headers';

const SESSION_COOKIE = 'solar_session';

type AuthUser = {
  id: string;
  email: string;
  tenantId: string;
} | null;

export async function getCurrentUser(request?: Request): Promise<AuthUser> {
  try {
    // ─── METHOD 1: HttpOnly cookie (preferred) ───
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get(SESSION_COOKIE);

    if (sessionCookie?.value) {
      const session = await prisma.session.findUnique({
        where: { token: sessionCookie.value },
        include: {
          user: {
            select: { id: true, email: true, tenantId: true },
          },
        },
      });

      if (session && session.expiresAt > new Date()) {
        return session.user;
      }
    }

    // ─── METHOD 2: x-user-id header (backward compat) ───
    // Allows existing mobile clients and old web code to still work
    if (request) {
      const userId = request.headers.get('x-user-id');
      if (userId) {
        const user = await prisma.user.findUnique({
          where: { id: userId },
          select: { id: true, email: true, tenantId: true },
        });
        return user ?? null;
      }
    }

    return null;
  } catch {
    return null;
  }
}
