// app/api/auth/google/route.ts
// ═══════════════════════════════════════════════════════════════
// TASK 58 — Google OAuth Initiation
// GET /api/auth/google → redirects to Google consent screen
// ═══════════════════════════════════════════════════════════════
//
// SETUP REQUIRED:
//   1. Go to https://console.cloud.google.com/
//   2. Create OAuth 2.0 credentials (Web application)
//   3. Add Authorized redirect URI: http://localhost:3000/api/auth/google/callback
//   4. Add to .env:
//      GOOGLE_CLIENT_ID=your_client_id
//      GOOGLE_CLIENT_SECRET=your_client_secret
//      NEXTAUTH_URL=http://localhost:3000
//      GOOGLE_OAUTH_STATE_SECRET=random-32-char-string

import { NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import { cookies } from 'next/headers';

export async function GET() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    console.error('[GoogleOAuth] GOOGLE_CLIENT_ID not set');
    return NextResponse.json({ error: 'Google OAuth not configured' }, { status: 503 });
  }

  const redirectUri = `${process.env.NEXTAUTH_URL ?? 'http://localhost:3000'}/api/auth/google/callback`;

  // CSRF protection: generate and store state
  const state = randomBytes(16).toString('hex');
  const cookieStore = await cookies();
  cookieStore.set('oauth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 600, // 10 min
    path: '/',
  });

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    state,
    access_type: 'online',
    prompt: 'select_account',
  });

  const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
  return NextResponse.redirect(googleAuthUrl);
}
