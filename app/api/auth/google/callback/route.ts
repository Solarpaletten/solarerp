// app/api/auth/google/callback/route.ts
// ═══════════════════════════════════════════════════════════════
// TASK 58 — Google OAuth Callback
// GET /api/auth/google/callback
// Exchanges code → tokens → user profile → create/find user → session
// ═══════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { handleGoogleAuth, parseGoogleName } from '@/lib/auth/googleAuthService';

const BASE_URL = process.env.NEXTAUTH_URL ?? 'http://localhost:3000';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');

  // ── Error from Google ─────────────────────────────────────
  if (error) {
    console.error(`[GoogleCallback] OAuth error: ${error}`);
    return NextResponse.redirect(`${BASE_URL}/login?error=google_denied`);
  }

  if (!code || !state) {
    return NextResponse.redirect(`${BASE_URL}/login?error=missing_params`);
  }

  // ── CSRF validation ───────────────────────────────────────
  const cookieStore = await cookies();
  const storedState = cookieStore.get('oauth_state')?.value;
  cookieStore.delete('oauth_state');

  if (!storedState || storedState !== state) {
    console.error('[GoogleCallback] CSRF state mismatch');
    return NextResponse.redirect(`${BASE_URL}/login?error=csrf_failure`);
  }

  try {
    // ── Exchange code for tokens ──────────────────────────
    const redirectUri = `${BASE_URL}/api/auth/google/callback`;
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenResponse.ok) {
      const err = await tokenResponse.text();
      console.error('[GoogleCallback] Token exchange failed:', err);
      return NextResponse.redirect(`${BASE_URL}/login?error=token_exchange_failed`);
    }

    const tokens = await tokenResponse.json();
    const accessToken: string = tokens.access_token;

    // ── Fetch user profile ────────────────────────────────
    const profileResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!profileResponse.ok) {
      console.error('[GoogleCallback] Profile fetch failed');
      return NextResponse.redirect(`${BASE_URL}/login?error=profile_fetch_failed`);
    }

    const googleProfile = await profileResponse.json();
    const { firstName, lastName } = parseGoogleName(googleProfile.name ?? '');

    // ── Create/find user in our DB ────────────────────────
    const authResult = await handleGoogleAuth({
      googleId:  googleProfile.id,
      email:     googleProfile.email,
      name:      googleProfile.name ?? googleProfile.email,
      firstName,
      lastName,
      avatarUrl: googleProfile.picture ?? undefined,
    });

    console.log(`[GoogleCallback] Auth success: userId=${authResult.userId} newUser=${authResult.isNewUser} hasCompany=${authResult.hasCompany}`);

    // ── Redirect based on state ───────────────────────────
    let redirectPath: string;
    if (!authResult.hasCompany) {
      // New user or user without a company → onboarding
      redirectPath = '/account/onboarding';
    } else {
      // Existing user with company → company list
      redirectPath = '/account/companies';
    }

    return NextResponse.redirect(`${BASE_URL}${redirectPath}`);

  } catch (err) {
    console.error('[GoogleCallback] Unexpected error:', err);
    return NextResponse.redirect(`${BASE_URL}/login?error=internal_error`);
  }
}
