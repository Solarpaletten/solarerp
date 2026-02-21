// middleware.ts
// ═══════════════════════════════════════════════════
// Route protection — runs BEFORE page render
// Checks for session cookie existence (fast, no DB call)
// DB validation happens in API routes via getCurrentUser()
// ═══════════════════════════════════════════════════
//
// FIXED (Task 18):
// - /api/auth/me added to PROTECTED_PREFIXES
//   Defense-in-depth: middleware returns 401 if no cookie,
//   handler also checks session validity in DB

import { NextRequest, NextResponse } from 'next/server';

const SESSION_COOKIE = 'solar_session';

// Routes that require authentication
const PROTECTED_PREFIXES = [
  '/account',
  '/company',
  '/api/account',
  '/api/company',
  '/api/auth/me',      // Task 18: explicit protection (defense-in-depth)
];

// Routes that are always public
const PUBLIC_ROUTES = [
  '/login',
  '/signup',
  '/api/auth/login',
  '/api/auth/signup',
  '/api/auth/logout',
  '/api/health',
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip public routes (checked first — explicit whitelist)
  if (PUBLIC_ROUTES.some(route => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  // Skip static assets and Next.js internals
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  // Check if route needs protection
  const needsAuth = PROTECTED_PREFIXES.some(prefix => pathname.startsWith(prefix));

  if (!needsAuth) {
    return NextResponse.next();
  }

  // Check for session cookie
  const sessionToken = request.cookies.get(SESSION_COOKIE)?.value;

  if (!sessionToken) {
    // No session → return 401 for API routes
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // No session → redirect to login for page routes
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('from', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Session cookie exists → allow through
  // Actual validation (expiry, DB check) happens in getCurrentUser() / getSession()
  return NextResponse.next();
}

export const config = {
  matcher: [
    // Match all paths except static files
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
