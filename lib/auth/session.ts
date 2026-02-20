// lib/auth/session.ts
// Production-grade session management
// - Creates crypto-random token
// - Stores in DB (sessions table)
// - Sets HttpOnly cookie (cannot be stolen from JS)
// - Validates by reading cookie → DB lookup

import { cookies } from 'next/headers';
import { randomBytes } from 'crypto';
import prisma from '@/lib/prisma';

const SESSION_COOKIE = 'solar_session';
const SESSION_TTL = 7 * 24 * 60 * 60; // 7 days in seconds

export type SessionUser = {
  id: string;
  email: string;
  tenantId: string;
};

// ─── CREATE SESSION ──────────────────────────────
// Called after successful login
// Creates DB record + sets HttpOnly cookie
export async function createSession(userId: string, tenantId: string): Promise<string> {
  const token = randomBytes(32).toString('hex'); // 64-char hex token
  const expiresAt = new Date(Date.now() + SESSION_TTL * 1000);

  // Persist in DB
  await prisma.session.create({
    data: {
      token,
      userId,
      tenantId,
      expiresAt,
    },
  });

  // Set HttpOnly cookie
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSION_TTL,
    path: '/',
  });

  return token;
}

// ─── GET SESSION ─────────────────────────────────
// Reads cookie → validates token in DB → returns user
export async function getSession(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(SESSION_COOKIE);

  if (!sessionCookie?.value) {
    return null;
  }

  try {
    const session = await prisma.session.findUnique({
      where: { token: sessionCookie.value },
      include: {
        user: {
          select: { id: true, email: true, tenantId: true },
        },
      },
    });

    if (!session) return null;

    // Check expiration
    if (session.expiresAt < new Date()) {
      // Expired → clean up
      await prisma.session.delete({ where: { id: session.id } }).catch(() => {});
      return null;
    }

    return session.user;
  } catch {
    return null;
  }
}

// ─── DESTROY SESSION ─────────────────────────────
// Logout: delete from DB + clear cookie
export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(SESSION_COOKIE);

  if (sessionCookie?.value) {
    // Delete from DB
    await prisma.session
      .deleteMany({ where: { token: sessionCookie.value } })
      .catch(() => {});
  }

  // Clear cookie
  cookieStore.delete(SESSION_COOKIE);
}

// ─── HAS SESSION COOKIE ─────────────────────────
// Quick check for middleware (no DB call)
// Middleware can only check cookie existence, not validate it
export function hasSessionCookie(request: Request): boolean {
  const cookieHeader = request.headers.get('cookie') || '';
  return cookieHeader.includes(`${SESSION_COOKIE}=`);
}

// ─── CLEANUP EXPIRED ─────────────────────────────
// Batch delete expired sessions (run periodically)
export async function cleanupExpiredSessions(): Promise<number> {
  const result = await prisma.session.deleteMany({
    where: { expiresAt: { lt: new Date() } },
  });
  return result.count;
}
