// lib/auth/googleAuthService.ts
// ═══════════════════════════════════════════════════════════════
// TASK 58 — Google OAuth Service
// Handles Google user lookup/creation within existing Tenant→User architecture
//
// Architecture decision:
//   Each Google user gets their own Tenant (same as email registration).
//   This maintains 1:1 Tenant→User ratio for new registrations.
//   Existing users: if googleId matches → update session.
//   If email matches but no googleId → link Google to existing account.
// ═══════════════════════════════════════════════════════════════

import prisma from '@/lib/prisma';
import { createSession } from './session';

export interface GoogleProfile {
  googleId: string;     // profile.sub
  email: string;
  name: string;         // full name from Google
  firstName: string;
  lastName: string;
  avatarUrl?: string;
}

export interface GoogleAuthResult {
  userId: string;
  tenantId: string;
  sessionToken: string;
  isNewUser: boolean;
  hasCompany: boolean;
}

export async function handleGoogleAuth(profile: GoogleProfile): Promise<GoogleAuthResult> {
  // ── CASE 1: Find by googleId (returning Google user) ──────
  const existingByGoogleId = await prisma.user.findFirst({
    where: { googleId: profile.googleId },
    include: { tenant: { include: { companies: { select: { id: true } } } } },
  });

  if (existingByGoogleId) {
    // Update avatar if changed
    if (profile.avatarUrl && existingByGoogleId.avatarUrl !== profile.avatarUrl) {
      await prisma.user.update({
        where: { id: existingByGoogleId.id },
        data: { avatarUrl: profile.avatarUrl },
      });
    }
    const sessionToken = await createSession(existingByGoogleId.id, existingByGoogleId.tenantId);
    const hasCompany = existingByGoogleId.tenant.companies.length > 0;
    console.log(`[GoogleAuth] Returning user: ${profile.email} tenant:${existingByGoogleId.tenantId}`);
    return { userId: existingByGoogleId.id, tenantId: existingByGoogleId.tenantId, sessionToken, isNewUser: false, hasCompany };
  }

  // ── CASE 2: Find by email (existing email/password user) ──
  // Link Google to their existing account
  const existingByEmail = await prisma.user.findFirst({
    where: { email: profile.email },
    include: { tenant: { include: { companies: { select: { id: true } } } } },
  });

  if (existingByEmail) {
    // Link Google ID to existing account
    await prisma.user.update({
      where: { id: existingByEmail.id },
      data: {
        googleId: profile.googleId,
        avatarUrl: profile.avatarUrl ?? existingByEmail.avatarUrl,
        name: existingByEmail.name ?? profile.firstName,
        surname: (existingByEmail as any).surname ?? profile.lastName,
      },
    });
    const sessionToken = await createSession(existingByEmail.id, existingByEmail.tenantId);
    const hasCompany = existingByEmail.tenant.companies.length > 0;
    console.log(`[GoogleAuth] Linked Google to existing user: ${profile.email}`);
    return { userId: existingByEmail.id, tenantId: existingByEmail.tenantId, sessionToken, isNewUser: false, hasCompany };
  }

  // ── CASE 3: Brand new user — create Tenant + User ─────────
  const newTenantAndUser = await prisma.$transaction(async (tx) => {
    // Create Tenant (1:1 with User for new registrations)
    const tenant = await tx.tenant.create({
      data: { name: profile.name || profile.email },
    });

    // Create User linked to Tenant
    const user = await tx.user.create({
      data: {
        email: profile.email,
        name: profile.firstName,
        surname: profile.lastName,
        googleId: profile.googleId,
        avatarUrl: profile.avatarUrl ?? null,
        passwordHash: null,  // Google users have no password
        tenantId: tenant.id,
      },
    });

    return { tenant, user };
  });

  const sessionToken = await createSession(newTenantAndUser.user.id, newTenantAndUser.tenant.id);
  console.log(`[GoogleAuth] New user created: ${profile.email} tenant:${newTenantAndUser.tenant.id}`);

  return {
    userId: newTenantAndUser.user.id,
    tenantId: newTenantAndUser.tenant.id,
    sessionToken,
    isNewUser: true,
    hasCompany: false,
  };
}

// ─── Parse Google name → firstName + lastName ────────────────
export function parseGoogleName(fullName: string): { firstName: string; lastName: string } {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) return { firstName: parts[0], lastName: '' };
  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(' '),
  };
}
