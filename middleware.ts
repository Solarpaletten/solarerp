// middleware.ts
// Route protection — runs BEFORE page render
// Checks for session cookie existence (fast, no DB call)
// DB validation happens in API routes via getCurrentUser()

import { NextRequest, NextResponse } from 'next/server';

const SESSION_COOKIE = 'solar_session';

// Routes that require authentication
const PROTECTED_PREFIXES = [
  '/account',
  '/company',
  '/api/account',
  '/api/company',
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

  // Skip public routes
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
    // No session → redirect to login (for pages)
    // Return 401 for API routes
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('from', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Session cookie exists → allow through
  // Actual validation (expiry, DB check) happens in getCurrentUser()
  return NextResponse.next();
}

export const config = {
  matcher: [
    // Match all paths except static files
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
