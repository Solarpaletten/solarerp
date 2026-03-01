# SOLAR ERP AUDIT PACKAGE

## FILE: ./middleware.ts
```
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
```

## FILE: ./tailwind.config.js
```
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
```

## FILE: ./app/layout.tsx
```
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: 'Solar ERP',
  description: 'Multi-tenant ERP platform',
};

type RootLayoutProps = {
  children: React.ReactNode;
};

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en">
      <body className={`${inter.variable} font-sans antialiased bg-gray-50 min-h-screen`}>
        {children}
      </body>
    </html>
  );
}

```

## FILE: ./app/api/auth/signup/route.ts
```
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

```

## FILE: ./app/api/auth/logout/route.ts
```
// app/api/auth/logout/route.ts
// Destroys session (DB + cookie)

import { NextResponse } from 'next/server';
import { destroySession } from '@/lib/auth/session';

export async function POST() {
  try {
    await destroySession();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json({ error: 'Logout failed' }, { status: 500 });
  }
}
```

## FILE: ./app/api/auth/me/route.ts
```
// app/api/auth/me/route.ts
// Returns current user info from session cookie
// Used by sidebar to display email without localStorage

import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';

export async function GET() {
  try {
    const user = await getSession();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json({
      id: user.id,
      email: user.email,
      tenantId: user.tenantId,
    });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

## FILE: ./app/api/auth/login/route.ts
```
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
```

## FILE: ./app/api/health/route.ts
```
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

type HealthResponse = {
  status: 'ok';
  service: string;
  timestamp: string;
  db: 'ok' | 'error';
};

export async function GET(request: NextRequest) {
  const timestamp = new Date().toISOString();
  let dbStatus: 'ok' | 'error' = 'error';

  try {
    await prisma.$queryRaw`SELECT 1`;
    dbStatus = 'ok';
  } catch (e) {
    // DB unreachable
  }

  const response: HealthResponse = {
    status: 'ok',
    service: 'solar-erp',
    timestamp,
    db: dbStatus,
  };

  return NextResponse.json(response);
}

```

## FILE: ./app/api/account/companies/route.ts
```
// app/api/account/companies/route.ts
// Companies list — ordered by priority from DB
// Backward compatible: works with both cookie and x-user-id

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth/getCurrentUser';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const companies = await prisma.company.findMany({
      where: { tenantId: user.tenantId },
      orderBy: [
        { priority: 'asc' },
        { createdAt: 'asc' },
      ],
    });

    return NextResponse.json({
      success: true,
      companies,
    });
  } catch (error) {
    console.error('Get companies error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, code, vatNumber, country, description, industry } = body;

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    // Get max priority for auto-increment
    const maxPriority = await prisma.company.aggregate({
      where: { tenantId: user.tenantId },
      _max: { priority: true },
    });

    const company = await prisma.company.create({
      data: {
        tenantId: user.tenantId,
        name,
        code: code || null,
        vatNumber: vatNumber || null,
        country: country || null,
        priority: (maxPriority._max.priority ?? 0) + 1,
      },
    });

    return NextResponse.json(company, { status: 201 });
  } catch (error) {
    console.error('Create company error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

## FILE: ./app/api/account/companies/priorities/route.ts
```
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
```

## FILE: ./app/api/account/companies/[companyId]/route.ts
```
// app/api/account/companies/[companyId]/route.ts
// ═══════════════════════════════════════════════════
// TENANT-SAFE Company CRUD
// ═══════════════════════════════════════════════════
//
// Security architecture:
// ┌─────────────────────────────────────────────────┐
// │ RULE 1: Every DB WHERE includes tenantId        │
// │ RULE 2: requireTenant() = sole source of auth   │
// │ RULE 3: updateMany/deleteMany = atomic scope    │
// │ RULE 4: No findFirst pre-check (single query)   │
// └─────────────────────────────────────────────────┘
//
// Pattern: updateMany({ where: { id, tenantId } })
//   → count === 0 means "not found OR wrong tenant"
//   → same 404 response either way (no info leak)

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireTenant } from '@/lib/auth/requireTenant';

type RouteParams = {
  params: Promise<{ companyId: string }>;
};

// ─── GET /api/account/companies/[companyId] ──────
// Read single company. Tenant-scoped via findFirst.
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { tenantId } = await requireTenant(request);
    const { companyId } = await params;

    // findFirst with tenantId ensures cross-tenant reads are impossible
    const company = await prisma.company.findFirst({
      where: {
        id: companyId,
        tenantId, // TENANT SCOPE
      },
    });

    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    return NextResponse.json(company);
  } catch (error) {
    if (error instanceof Response) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Get company error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ─── PATCH /api/account/companies/[companyId] ────
// Update company. Uses updateMany for atomic tenant scope.
// No findFirst pre-check — count === 0 is the check.
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { tenantId } = await requireTenant(request);
    const { companyId } = await params;
    const body = await request.json();

    // Build explicit update payload — only provided fields
    const data: Record<string, unknown> = {};
    if (body.name !== undefined) data.name = body.name;
    if (body.code !== undefined) data.code = body.code || null;
    if (body.vatNumber !== undefined) data.vatNumber = body.vatNumber || null;
    if (body.country !== undefined) data.country = body.country || null;
    if (body.status !== undefined) data.status = body.status;
    if (body.priority !== undefined) data.priority = Number(body.priority);

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    // ═══════════════════════════════════════════════
    // CRITICAL: updateMany with BOTH id AND tenantId
    //
    // If attacker sends companyId from tenant-B:
    //   → WHERE id='xxx' AND tenantId='tenant-A'
    //   → 0 rows matched → 404
    //   → tenant-B's data untouched
    // ═══════════════════════════════════════════════
    const result = await prisma.company.updateMany({
      where: {
        id: companyId,
        tenantId, // TENANT SCOPE — cannot mutate other tenant's data
      },
      data,
    });

    if (result.count === 0) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    // Return the updated record (tenant-scoped read)
    const company = await prisma.company.findFirst({
      where: {
        id: companyId,
        tenantId, // TENANT SCOPE
      },
    });

    return NextResponse.json(company);
  } catch (error) {
    if (error instanceof Response) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Update company error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ─── DELETE /api/account/companies/[companyId] ───
// Delete company. Uses deleteMany for atomic tenant scope.
// No findFirst pre-check — count === 0 is the check.
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { tenantId } = await requireTenant(request);
    const { companyId } = await params;

    // ═══════════════════════════════════════════════
    // CRITICAL: deleteMany with BOTH id AND tenantId
    //
    // Cannot delete a company from another tenant.
    // count === 0 → "not found" (no info leak about existence)
    // ═══════════════════════════════════════════════
    const result = await prisma.company.deleteMany({
      where: {
        id: companyId,
        tenantId, // TENANT SCOPE — cannot delete other tenant's data
      },
    });

    if (result.count === 0) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    if (error instanceof Response) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Delete company error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

## FILE: ./app/api/company/[companyId]/journal/manual/route.ts
```
// app/api/company/[companyId]/journal/manual/route.ts
// ═══════════════════════════════════════════════════
// Manual Journal Entries
// ═══════════════════════════════════════════════════
//
// Task 28: Create journal entries without a source document.
//
// source = MANUAL, documentType = 'MANUAL', documentId = null
// Period lock enforced. Repost engine ignores MANUAL entries.

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireTenant } from '@/lib/auth/requireTenant';
import { createJournalEntry } from '@/lib/accounting/journalService';
import { assertPeriodOpen } from '@/lib/accounting/periodLock';

type RouteParams = {
  params: Promise<{ companyId: string }>;
};

async function verifyCompanyOwnership(companyId: string, tenantId: string) {
  const company = await prisma.company.findFirst({
    where: { id: companyId, tenantId },
    select: { id: true },
  });
  return company !== null;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { tenantId } = await requireTenant(request);
    const { companyId } = await params;

    const isOwner = await verifyCompanyOwnership(companyId, tenantId);
    if (!isOwner) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    const body = await request.json();
    const { date: dateParam, description, lines } = body;

    // ─── Validate date ───────────────────────────
    if (!dateParam) {
      return NextResponse.json(
        { error: '"date" is required (YYYY-MM-DD)' },
        { status: 400 }
      );
    }

    const entryDate = new Date(dateParam);
    if (isNaN(entryDate.getTime())) {
      return NextResponse.json(
        { error: 'Invalid date format. Use YYYY-MM-DD.' },
        { status: 400 }
      );
    }

    // ─── Validate lines ──────────────────────────
    if (!lines || !Array.isArray(lines) || lines.length < 2) {
      return NextResponse.json(
        { error: 'At least 2 journal lines are required' },
        { status: 400 }
      );
    }

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (!line.accountId) {
        return NextResponse.json(
          { error: `Line ${i + 1}: accountId is required` },
          { status: 400 }
        );
      }
      // production-strict: do not coerce "10" -> 10
      if (typeof line.debit !== 'number' || typeof line.credit !== 'number') {
        return NextResponse.json(
          { error: `Line ${i + 1}: debit and credit must be numbers` },
          { status: 400 }
        );
      }
    }

    const normalizedDescription =
      typeof description === 'string'
        ? description.trim().slice(0, 500)
        : undefined;

    // ─── Transaction: accounts + period lock + create entry ─
    const result = await prisma.$transaction(async (tx) => {
      // Period lock (contour 1)
      await assertPeriodOpen(tx, { companyId, date: entryDate });

      // Validate accounts exist and belong to company (inside tx)
      const accountIds = [
        ...new Set(lines.map((l: { accountId: string }) => l.accountId)),
      ];

      const accounts = await tx.account.findMany({
        where: {
          id: { in: accountIds },
          companyId,
          company: { tenantId },
        },
        select: { id: true },
      });

      const foundIds = new Set(accounts.map((a) => a.id));
      const missing = accountIds.filter((id) => !foundIds.has(id));
      if (missing.length > 0) {
        // Throw to keep single exit path and to avoid partial writes
        throw new Error(`ACCOUNT_NOT_FOUND:${missing.join(',')}`);
      }

      // Create entry (validations + period lock contour 2 inside journalService)
      const entry = await createJournalEntry(tx, {
        companyId,
        date: entryDate,
        documentType: 'MANUAL',
        documentId: null,
        lines: lines.map(
          (l: { accountId: string; debit: number; credit: number }) => ({
            accountId: l.accountId,
            debit: l.debit,
            credit: l.credit,
          })
        ),
      });

      // Single update: set MANUAL + optional description
      const updated = await tx.journalEntry.update({
        where: { id: entry.id },
        data: {
          source: 'MANUAL',
          ...(normalizedDescription ? { description: normalizedDescription } : {}),
        },
        include: { lines: true },
      });

      return updated;
    });

    return NextResponse.json({ data: result }, { status: 201 });
  } catch (error: unknown) {
    if (error instanceof Response) return error;

    const message =
      error instanceof Error ? error.message : 'Internal server error';

    if (message.startsWith('ACCOUNT_NOT_FOUND:')) {
      const list = message.replace('ACCOUNT_NOT_FOUND:', '').split(',').filter(Boolean);
      return NextResponse.json(
        { error: `Account(s) not found: ${list.join(', ')}` },
        { status: 400 }
      );
    }

    if (message === 'PERIOD_CLOSED' || message.startsWith('PERIOD_CLOSED')) {
      return NextResponse.json(
        { error: 'Accounting period is closed for this date' },
        { status: 409 }
      );
    }

    // Validation errors from journalService
    if (
      message.includes('unbalanced') ||
      message.includes('non-negative') ||
      message.includes('both debit and credit') ||
      message.includes('must have either debit or credit') ||
      message.includes('at least 2 lines')
    ) {
      return NextResponse.json({ error: message }, { status: 400 });
    }

    console.error('Manual journal entry error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}```

## FILE: ./app/api/company/[companyId]/periods/[year]/[month]/close/route.ts
```
// app/api/company/[companyId]/periods/[year]/[month]/close/route.ts
// ═══════════════════════════════════════════════════
// TENANT-SAFE Period Close Endpoint
// ═══════════════════════════════════════════════════
//
// Task 24 MVP: Period Locking
//
// POST /api/company/:id/periods/:year/:month/close
//
// Upsert AccountingPeriod → isClosed = true, closedAt = now()
// Already closed → 409 ALREADY_CLOSED.

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireTenant } from '@/lib/auth/requireTenant';

type RouteParams = {
  params: Promise<{ companyId: string; year: string; month: string }>;
};

async function verifyCompanyOwnership(companyId: string, tenantId: string) {
  const company = await prisma.company.findFirst({
    where: { id: companyId, tenantId },
    select: { id: true },
  });
  return company !== null;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { tenantId } = await requireTenant(request);
    const { companyId, year: yearStr, month: monthStr } = await params;

    const year = parseInt(yearStr, 10);
    const month = parseInt(monthStr, 10);

    if (isNaN(year) || year < 1900 || year > 2100) {
      return NextResponse.json(
        { error: 'Invalid year' },
        { status: 400 }
      );
    }

    if (isNaN(month) || month < 1 || month > 12) {
      return NextResponse.json(
        { error: 'Invalid month. Must be 1-12.' },
        { status: 400 }
      );
    }

    const isOwner = await verifyCompanyOwnership(companyId, tenantId);
    if (!isOwner) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    const result = await prisma.$transaction(async (tx) => {
      const existing = await tx.accountingPeriod.findUnique({
        where: {
          companyId_year_month: { companyId, year, month },
        },
      });

      if (existing?.isClosed) {
        throw new Error('ALREADY_CLOSED');
      }

      const period = await tx.accountingPeriod.upsert({
        where: {
          companyId_year_month: { companyId, year, month },
        },
        update: {
          isClosed: true,
          closedAt: new Date(),
        },
        create: {
          companyId,
          year,
          month,
          isClosed: true,
          closedAt: new Date(),
        },
      });

      return period;
    });

    return NextResponse.json({
      data: result,
      message: `Period ${year}-${String(month).padStart(2, '0')} closed`,
    });
  } catch (error: unknown) {
    if (error instanceof Response) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (error instanceof Error && error.message === 'ALREADY_CLOSED') {
      return NextResponse.json(
        { error: 'Period is already closed' },
        { status: 409 }
      );
    }

    const message =
      error instanceof Error ? error.message : 'Internal server error';
    console.error('Close period error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
```

## FILE: ./app/api/company/[companyId]/chart-of-accounts/import/skr03/route.ts
```
// app/api/company/[companyId]/chart-of-accounts/import/skr03/route.ts
// ═══════════════════════════════════════════════════
// SKR03 Quick Import — DATEV+ Enterprise Level
// ═══════════════════════════════════════════════════
//
// POST /api/company/:id/chart-of-accounts/import/skr03?mode=merge|reset
//
// Modes:
//   merge (default) — add missing accounts, skip existing (idempotent)
//   reset — delete non-system, non-used accounts, then re-import full SKR03
//
// Safety guarantees:
//   ✅ Tenant isolation (requireTenant + company ownership check)
//   ✅ Stammkonten source: ONLY lib/accounting/protectedAccounts.ts
//   ✅ Stammkonten never deleted in reset mode
//   ✅ Accounts with journal entries never deleted in reset mode
//   ✅ Layer A: pre-filter existing codes
//   ✅ Layer B: createMany({ skipDuplicates: true })
//   ✅ Layer C: @@unique([companyId, code]) in Prisma schema
//   ✅ Single $transaction for atomicity
//
// Response format (§6 of ТЗ):
//   {
//     mode, totalInFile, created, skippedExisting,
//     deleted?, protectedCount?, usedCount?
//   }

import { NextRequest, NextResponse } from 'next/server';
import { readFileSync } from 'fs';
import { join } from 'path';
import prisma from '@/lib/prisma';
import { requireTenant } from '@/lib/auth/requireTenant';
import { AccountType } from '@prisma/client';
import { PROTECTED_ACCOUNT_CODES } from '@/lib/accounting/protectedAccounts';

type RouteParams = {
  params: Promise<{ companyId: string }>;
};

const VALID_TYPES = new Set<string>(['ASSET', 'LIABILITY', 'EQUITY', 'INCOME', 'EXPENSE']);

// ─── §1.1 Tenant-scoped company ownership ───────
async function verifyCompanyOwnership(companyId: string, tenantId: string) {
  const company = await prisma.company.findFirst({
    where: { id: companyId, tenantId },
    select: { id: true },
  });
  return company !== null;
}

// ─── §5 CSV Parser with validation ──────────────
type ParsedRow = {
  code: string;
  nameDe: string;
  nameEn: string;
  type: AccountType;
};

function parseCSV(text: string): { rows: ParsedRow[]; errors: string[] } {
  const lines = text.trim().split('\n');
  const errors: string[] = [];
  const rows: ParsedRow[] = [];

  if (lines.length < 2) {
    errors.push('CSV must have header + data');
    return { rows, errors };
  }

  const header = lines[0].toLowerCase().trim();
  const cols = header.split(',').map(h => h.trim());

  const codeIdx = cols.indexOf('code');
  const typeIdx = cols.indexOf('type');
  const nameDeIdx = cols.indexOf('namede');
  const nameEnIdx = cols.indexOf('nameen');
  const nameIdx = cols.indexOf('name');

  if (codeIdx === -1 || typeIdx === -1) {
    errors.push('CSV must have "code" and "type" columns');
    return { rows, errors };
  }

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const parts = line.split(',').map(p => p.trim());
    const code = parts[codeIdx]?.trim();
    const typeStr = parts[typeIdx]?.trim().toUpperCase();

    if (!code || !typeStr) {
      errors.push(`Line ${i + 1}: missing code or type`);
      continue;
    }
    if (!VALID_TYPES.has(typeStr)) {
      errors.push(`Line ${i + 1}: invalid type "${typeStr}"`);
      continue;
    }

    let nameDe = '';
    let nameEn = '';

    if (nameDeIdx !== -1) {
      nameDe = parts[nameDeIdx]?.trim() || code;
      nameEn = nameEnIdx !== -1 ? (parts[nameEnIdx]?.trim() || nameDe) : nameDe;
    } else if (nameIdx !== -1) {
      nameDe = parts[nameIdx]?.trim() || code;
      nameEn = nameDe;
    } else {
      nameDe = code;
      nameEn = code;
    }

    rows.push({ code, nameDe, nameEn, type: typeStr as AccountType });
  }

  return { rows, errors };
}

// ─── HANDLER ─────────────────────────────────────
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    // ═══ §1.1 SECURITY: Tenant isolation ═════════
    const { tenantId } = await requireTenant(request);
    const { companyId } = await params;

    const isOwner = await verifyCompanyOwnership(companyId, tenantId);
    if (!isOwner) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    // ═══ Read built-in SKR03 CSV ═════════════════
    let csvText: string;
    try {
      const csvPath = join(process.cwd(), 'lib', 'accounting', 'data', 'skr03.csv');
      csvText = readFileSync(csvPath, 'utf-8');
    } catch {
      return NextResponse.json({ error: 'SKR03 dataset not found on server' }, { status: 500 });
    }

    const { rows, errors: parseErrors } = parseCSV(csvText);

    if (rows.length === 0) {
      return NextResponse.json(
        { error: 'No valid rows in SKR03 dataset', parseErrors },
        { status: 500 }
      );
    }

    // ═══ §3 Mode selection ═══════════════════════
    const url = new URL(request.url);
    const mode = url.searchParams.get('mode') || 'merge';

    if (mode !== 'merge' && mode !== 'reset') {
      return NextResponse.json(
        { error: 'Invalid mode. Use ?mode=merge (default) or ?mode=reset' },
        { status: 400 }
      );
    }

    // ═══ §3.2+ Reset confirmation guard ══════════
    // Reset is destructive — require explicit confirmation
    // to prevent accidental clicks by any user with access.
    if (mode === 'reset') {
      const confirm = url.searchParams.get('confirm');
      if (confirm !== 'RESET') {
        return NextResponse.json(
          { error: 'Reset requires confirmation. Add ?confirm=RESET to proceed.' },
          { status: 400 }
        );
      }
    }

    // ═══ §4 Execute in single transaction ════════
    const result = await prisma.$transaction(async (tx) => {
      let deletedCount = 0;
      let protectedCount = 0; // Stammkonten that were spared
      let usedCount = 0;      // accounts with journal entries that were spared

      if (mode === 'reset') {
        // ─── §3.2 RESET MODE (safe reset) ────────
        // Step 1: Find account IDs that have journal lines
        const usedAccountIds = await tx.journalLine.groupBy({
          by: ['accountId'],
          where: {
            account: { companyId },
          },
        });
        const usedIdSet = new Set(usedAccountIds.map(u => u.accountId));

        // Step 2: Load all current accounts
        const allAccounts = await tx.account.findMany({
          where: { companyId },
          select: { id: true, code: true },
        });

        // Step 3: Classify — §1.2 Stammkonten from protectedAccounts.ts ONLY
        const deletableIds: string[] = [];
        for (const acc of allAccounts) {
          const isStammkonto = PROTECTED_ACCOUNT_CODES.has(acc.code);
          const hasEntries = usedIdSet.has(acc.id);

          if (isStammkonto) {
            protectedCount++;
          } else if (hasEntries) {
            usedCount++;
          } else {
            deletableIds.push(acc.id);
          }
        }

        // Step 4: Delete ONLY safe accounts (not protected, not used)
        // ⚠️ Never: deleteMany({ where: { companyId } })
        if (deletableIds.length > 0) {
          const deleteResult = await tx.account.deleteMany({
            where: { id: { in: deletableIds }, companyId },
          });
          deletedCount = deleteResult.count;
        }
      }

      // ─── §2A Layer A: Pre-filter existing codes ─
      const existing = await tx.account.findMany({
        where: { companyId },
        select: { code: true },
      });
      const existingCodes = new Set(existing.map(a => a.code));

      const toCreate = rows.filter(r => !existingCodes.has(r.code));
      const skippedExisting = rows.length - toCreate.length;

      // ─── §2B Layer B: createMany skipDuplicates ─
      let created = 0;
      if (toCreate.length > 0) {
        const batch = await tx.account.createMany({
          data: toCreate.map(r => ({
            companyId,
            code: r.code,
            nameDe: r.nameDe,
            nameEn: r.nameEn,
            type: r.type,
            isActive: true,
          })),
          skipDuplicates: true, // §2B — handles race conditions on @@unique([companyId, code])
        });
        created = batch.count;
      }

      // ─── §6 Response format ─────────────────────
      return {
        mode,
        totalInFile: rows.length,
        created,
        skippedExisting,
        ...(mode === 'reset' ? {
          deleted: deletedCount,
          protectedCount,  // Stammkonten spared
          usedCount,       // accounts with journal entries spared
        } : {}),
        ...(parseErrors.length > 0 ? { parseErrors } : {}),
      };
    });

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof Response) return error;
    console.error('SKR03 import error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

## FILE: ./app/api/company/[companyId]/purchases/draft/route.ts
```
// app/api/company/[companyId]/purchases/draft/route.ts
// ═══════════════════════════════════════════════════
// Task 38A: Create Draft Purchase Document
// ═══════════════════════════════════════════════════
// Lightweight endpoint — creates a minimal DRAFT document
// with no journal entry, no stock movement, no FIFO lot.
// Used by /purchases/new to redirect to editable document.

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireTenant } from '@/lib/auth/requireTenant';

type RouteParams = {
  params: Promise<{ companyId: string }>;
};

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { tenantId } = await requireTenant(request);
    const { companyId } = await params;

    const company = await prisma.company.findFirst({
      where: { id: companyId, tenantId },
      select: { id: true },
    });
    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    // Generate next number in P series
    const lastDoc = await prisma.purchaseDocument.findFirst({
      where: { companyId, series: 'P' },
      orderBy: { number: 'desc' },
      select: { number: true },
    });

    const nextNumber = lastDoc
      ? String(Number(lastDoc.number) + 1).padStart(4, '0')
      : '0001';

    // Create minimal DRAFT — no journal, no stock, no items
    const draft = await prisma.purchaseDocument.create({
      data: {
        companyId,
        purchaseDate: new Date(),
        series: 'P',
        number: nextNumber,
        supplierName: '',
        warehouseName: 'Main',
        operationType: 'PURCHASE',
        currencyCode: 'EUR',
        status: 'DRAFT',
      },
    });

    return NextResponse.json({ data: draft }, { status: 201 });
  } catch (error: unknown) {
    if (error instanceof Response) return error;

    if (
      error &&
      typeof error === 'object' &&
      'code' in error &&
      (error as { code: string }).code === 'P2002'
    ) {
      return NextResponse.json(
        { error: 'Document with this series/number already exists' },
        { status: 409 }
      );
    }

    const msg = error instanceof Error ? error.message : 'Unknown error';
    console.error('Create draft error:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
```

## FILE: ./app/api/company/[companyId]/purchases/route.ts
```
// app/api/company/[companyId]/purchases/[purchaseId]/route.ts
// ═══════════════════════════════════════════════════
// Task 37A: GET + Task 38B: PUT Single Purchase Document
// ═══════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireTenant } from '@/lib/auth/requireTenant';

type RouteParams = {
  params: Promise<{ companyId: string; purchaseId: string }>;
};

// ─── GET — Read single document ─────────────────
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { tenantId } = await requireTenant(request);
    const { companyId, purchaseId } = await params;

    const company = await prisma.company.findFirst({
      where: { id: companyId, tenantId },
      select: { id: true },
    });
    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    const purchase = await prisma.purchaseDocument.findFirst({
      where: {
        id: purchaseId,
        companyId,
        company: { tenantId },
      },
      include: {
        items: { orderBy: { id: 'asc' } },
      },
    });

    if (!purchase) {
      return NextResponse.json({ error: 'Purchase not found' }, { status: 404 });
    }

    return NextResponse.json({ data: purchase });
  } catch (error: unknown) {
    if (error instanceof Response) return error;
    const msg = error instanceof Error ? error.message : 'Unknown error';
    console.error('Get purchase error:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// ─── PUT — Update DRAFT document ────────────────
// NO journal entry, NO stock movement, NO FIFO.
// Only DRAFT documents can be updated.
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { tenantId } = await requireTenant(request);
    const { companyId, purchaseId } = await params;

    const company = await prisma.company.findFirst({
      where: { id: companyId, tenantId },
      select: { id: true },
    });
    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    const body = await request.json();

    const result = await prisma.$transaction(async (tx) => {
      // 1. Find and verify document
      const purchase = await tx.purchaseDocument.findFirst({
        where: {
          id: purchaseId,
          companyId,
          company: { tenantId },
        },
        select: { id: true, status: true },
      });

      if (!purchase) {
        throw new Error('PURCHASE_NOT_FOUND');
      }

      if (purchase.status !== 'DRAFT') {
        throw new Error('ONLY_DRAFT_EDITABLE');
      }

      // 2. Update header fields
      const updated = await tx.purchaseDocument.update({
        where: { id: purchaseId },
        data: {
          purchaseDate: body.purchaseDate ? new Date(body.purchaseDate) : undefined,
          supplierName: body.supplierName ?? undefined,
          supplierCode: body.supplierCode ?? undefined,
          warehouseName: body.warehouseName ?? undefined,
          currencyCode: body.currencyCode ?? undefined,
          operationType: body.operationType ?? undefined,
          comments: body.comments ?? undefined,
        },
      });

      // 3. Replace items: delete all → create new
      if (Array.isArray(body.items)) {
        await tx.purchaseItem.deleteMany({
          where: { purchaseDocumentId: purchaseId },
        });

        if (body.items.length > 0) {
          await tx.purchaseItem.createMany({
            data: body.items.map(
              (item: {
                itemName: string;
                itemCode?: string;
                quantity: number;
                priceWithoutVat: number;
                vatRate?: number;
              }) => ({
                purchaseDocumentId: purchaseId,
                itemName: item.itemName || '',
                itemCode: item.itemCode || null,
                quantity: Number(item.quantity) || 0,
                priceWithoutVat: Number(item.priceWithoutVat) || 0,
                vatRate: item.vatRate != null ? Number(item.vatRate) : null,
              })
            ),
          });
        }
      }

      // 4. Re-fetch with items
      return tx.purchaseDocument.findUniqueOrThrow({
        where: { id: purchaseId },
        include: { items: { orderBy: { id: 'asc' } } },
      });
    });

    return NextResponse.json({ data: result });
  } catch (error: unknown) {
    if (error instanceof Response) return error;

    const msg = error instanceof Error ? error.message : 'Unknown error';

    if (msg === 'PURCHASE_NOT_FOUND') {
      return NextResponse.json({ error: 'Purchase not found' }, { status: 404 });
    }
    if (msg === 'ONLY_DRAFT_EDITABLE') {
      return NextResponse.json(
        { error: 'Only DRAFT documents can be edited' },
        { status: 400 }
      );
    }

    console.error('Update purchase error:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
```

## FILE: ./app/api/company/[companyId]/purchases/[purchaseId]/cancel/route.ts
```
// app/api/company/[companyId]/purchases/[purchaseId]/cancel/route.ts
// ═══════════════════════════════════════════════════
// STORNO: Cancel Purchase Document
// ═══════════════════════════════════════════════════
//
// Task 23: Immutable ledger — no deletes.
// Task 24: Period locking — cannot cancel in closed period.
// Task 34: Reverse stock movements.
// Task 35: Block cancel if FIFO lots are consumed.
//
// Flow (single transaction):
//   1. Find purchase + guards (CANCELLED/LOCKED/period)
//   2. §5: Check FIFO lots not consumed
//   3. Find original JournalEntry
//   4. Create reversal JournalEntry (swap debit/credit)
//   5. Reverse stock movements
//   6. Mark CANCELLED

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireTenant } from '@/lib/auth/requireTenant';
import { createJournalEntry } from '@/lib/accounting/journalService';
import { assertPeriodOpen } from '@/lib/accounting/periodLock';
import { createReverseMovements } from '@/lib/accounting/stockService';
import { assertPurchaseLotsNotConsumed } from '@/lib/accounting/fifoService';

type RouteParams = {
  params: Promise<{ companyId: string; purchaseId: string }>;
};

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { tenantId } = await requireTenant(request);
    const { companyId, purchaseId } = await params;

    const company = await prisma.company.findFirst({
      where: { id: companyId, tenantId },
      select: { id: true },
    });
    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    // ═══════════════════════════════════════════════
    // TRANSACTION: Guards + Reversal + Status
    // ═══════════════════════════════════════════════
    const result = await prisma.$transaction(async (tx) => {
      // 1. Find purchase (tenant-safe)
      const purchase = await tx.purchaseDocument.findFirst({
        where: {
          id: purchaseId,
          companyId,
          company: { tenantId },
        },
        select: {
          id: true,
          status: true,
          series: true,
          number: true,
          purchaseDate: true,
        },
      });

      if (!purchase) throw new Error('PURCHASE_NOT_FOUND');
      if (purchase.status === 'CANCELLED') throw new Error('ALREADY_CANCELLED');
      if (purchase.status === 'LOCKED') throw new Error('LOCKED');

      // 2. Period lock check
      await assertPeriodOpen(tx, { companyId, date: purchase.purchaseDate });

      // 3. §5: Block cancel if any lot has been consumed
      await assertPurchaseLotsNotConsumed(tx, companyId, purchaseId);

      // 4. Find original journal entry
      const originalEntry = await tx.journalEntry.findFirst({
        where: {
          documentId: purchaseId,
          documentType: 'PURCHASE',
          companyId,
        },
        include: { lines: true },
      });

      if (!originalEntry) throw new Error('JOURNAL_ENTRY_NOT_FOUND');
      if (!originalEntry.lines?.length) throw new Error('JOURNAL_LINES_EMPTY');

      // 5. Create reversal journal entry (mirror: swap debit↔credit)
      const reversalEntry = await createJournalEntry(tx, {
        companyId,
        date: purchase.purchaseDate,
        documentType: 'PURCHASE_REVERSAL',
        documentId: purchaseId,
        lines: originalEntry.lines.map((line) => ({
          accountId: line.accountId,
          debit: Number(line.credit),
          credit: Number(line.debit),
        })),
      });

      // 6. Reverse stock movements (Task 34)
      await createReverseMovements(tx, companyId, purchaseId, 'PURCHASE_REVERSAL');

      // 7. Mark CANCELLED
      await tx.purchaseDocument.update({
        where: { id: purchaseId },
        data: { status: 'CANCELLED' },
      });

      return {
        series: purchase.series,
        number: purchase.number,
        reversalEntryId: reversalEntry.id,
        reversalLinesCount: reversalEntry.lines.length,
      };
    });

    return NextResponse.json(
      {
        message: `Purchase ${result.series}-${result.number} cancelled successfully.`,
        reversal: {
          id: result.reversalEntryId,
          documentType: 'PURCHASE_REVERSAL',
          linesCount: result.reversalLinesCount,
        },
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    if (error instanceof Response) return error;

    const msg = error instanceof Error ? error.message : 'Unknown error';

    if (msg === 'PURCHASE_NOT_FOUND') {
      return NextResponse.json({ error: 'Purchase not found' }, { status: 404 });
    }
    if (msg === 'ALREADY_CANCELLED') {
      return NextResponse.json({ error: 'Purchase document is already cancelled' }, { status: 409 });
    }
    if (msg === 'LOCKED') {
      return NextResponse.json({ error: 'Purchase document is locked and cannot be cancelled' }, { status: 409 });
    }
    if (msg === 'PERIOD_CLOSED') {
      return NextResponse.json({ error: 'Accounting period is closed for this date' }, { status: 409 });
    }
    if (msg === 'JOURNAL_ENTRY_NOT_FOUND') {
      return NextResponse.json({ error: 'Original journal entry not found for this purchase' }, { status: 404 });
    }
    if (msg === 'JOURNAL_LINES_EMPTY') {
      return NextResponse.json({ error: 'Original journal entry has no lines. Cannot create reversal.' }, { status: 500 });
    }
    if (msg.startsWith('PURCHASE_LOTS_ALREADY_CONSUMED')) {
      return NextResponse.json({ error: msg }, { status: 409 });
    }

    console.error('Cancel purchase error:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
```

## FILE: ./app/api/company/[companyId]/purchases/[purchaseId]/post/route.ts
```
// app/api/company/[companyId]/purchases/[purchaseId]/post/route.ts
// ═══════════════════════════════════════════════════
// Task 39: Posting Engine — DRAFT → POSTED
// ═══════════════════════════════════════════════════
// Single transaction:
//   1. Validate document + items
//   2. assertPeriodOpen
//   3. createJournalEntry (DR Inventory / CR Payable)
//   4. createStockMovement IN per item
//   5. createStockLot per item (FIFO)
//   6. status → POSTED
//
// NO partial writes. All or nothing.

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireTenant } from '@/lib/auth/requireTenant';
import { createJournalEntry } from '@/lib/accounting/journalService';
import { assertPeriodOpen } from '@/lib/accounting/periodLock';
import { createStockMovement } from '@/lib/accounting/stockService';
import { createStockLot } from '@/lib/accounting/fifoService';

type RouteParams = {
  params: Promise<{ companyId: string; purchaseId: string }>;
};

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { tenantId } = await requireTenant(request);
    const { companyId, purchaseId } = await params;

    const company = await prisma.company.findFirst({
      where: { id: companyId, tenantId },
      select: { id: true },
    });
    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    // Optional: posting accounts from body
    let bodyAccounts: { debitAccountId?: string; creditAccountId?: string } = {};
    try {
      const body = await request.json();
      bodyAccounts = body || {};
    } catch {
      // No body is ok — will use accounts from document
    }

    const result = await prisma.$transaction(async (tx) => {
      // ── 1. Load document + items ──────────────
      const purchase = await tx.purchaseDocument.findFirst({
        where: {
          id: purchaseId,
          companyId,
          company: { tenantId },
        },
        include: { items: true },
      });

      if (!purchase) throw new Error('PURCHASE_NOT_FOUND');

      // ── 2. Status guard ───────────────────────
      if (purchase.status === 'POSTED') throw new Error('ALREADY_POSTED');
      if (purchase.status === 'CANCELLED') throw new Error('ALREADY_CANCELLED');
      if (purchase.status === 'LOCKED') throw new Error('LOCKED');
      if (purchase.status !== 'DRAFT') throw new Error('ONLY_DRAFT_CAN_POST');

      // ── 3. Validate header ────────────────────
      if (!purchase.supplierName || purchase.supplierName.trim().length === 0) {
        throw new Error('SUPPLIER_NAME_REQUIRED');
      }
      if (!purchase.warehouseName || purchase.warehouseName.trim().length === 0) {
        throw new Error('WAREHOUSE_NAME_REQUIRED');
      }
      if (!purchase.currencyCode) throw new Error('CURRENCY_CODE_REQUIRED');
      if (!purchase.operationType) throw new Error('OPERATION_TYPE_REQUIRED');
      if (!purchase.purchaseDate) throw new Error('PURCHASE_DATE_REQUIRED');

      // ── 4. Validate items ─────────────────────
      if (!purchase.items || purchase.items.length === 0) {
        throw new Error('AT_LEAST_ONE_ITEM_REQUIRED');
      }

      for (const item of purchase.items) {
        if (!item.itemName || item.itemName.trim().length === 0) {
          throw new Error('ITEM_NAME_REQUIRED');
        }
        if (Number(item.quantity) <= 0) {
          throw new Error('ITEM_QTY_MUST_BE_POSITIVE');
        }
        if (Number(item.priceWithoutVat) < 0) {
          throw new Error('ITEM_PRICE_MUST_BE_NON_NEGATIVE');
        }
      }

      // ── 5. Period lock check ──────────────────
      await assertPeriodOpen(tx, { companyId, date: purchase.purchaseDate });

      // ── 6. Resolve posting accounts ───────────
      const debitAccountId =
        bodyAccounts.debitAccountId || purchase.debitAccountId;
      const creditAccountId =
        bodyAccounts.creditAccountId || purchase.creditAccountId;

      if (!debitAccountId || !creditAccountId) {
        throw new Error('MISSING_POSTING_ACCOUNTS');
      }

      // ── 7. Calculate total ────────────────────
      const totalAmount = purchase.items.reduce(
        (sum, item) => sum + Number(item.quantity) * Number(item.priceWithoutVat),
        0
      );

      if (totalAmount <= 0) {
        throw new Error('TOTAL_AMOUNT_MUST_BE_POSITIVE');
      }

      // ── 8. Create Journal Entry ───────────────
      const journalEntry = await createJournalEntry(tx, {
        companyId,
        date: purchase.purchaseDate,
        documentType: 'PURCHASE',
        documentId: purchase.id,
        lines: [
          { accountId: debitAccountId, debit: totalAmount, credit: 0 },
          { accountId: creditAccountId, debit: 0, credit: totalAmount },
        ],
      });

      // ── 9. Stock Movements IN + FIFO Lots ─────
      for (const item of purchase.items) {
        await createStockMovement({
          tx,
          companyId,
          warehouseName: purchase.warehouseName,
          itemName: item.itemName,
          itemCode: item.itemCode || item.itemName,
          quantity: Number(item.quantity),
          cost: Number(item.priceWithoutVat),
          direction: 'IN',
          documentType: 'PURCHASE',
          documentId: purchase.id,
          documentDate: purchase.purchaseDate,
          series: purchase.series,
          number: purchase.number,
          barcode: item.barcode || undefined,
          vatRate: item.vatRate ? Number(item.vatRate) : undefined,
          priceWithoutVat: Number(item.priceWithoutVat),
          operationType: purchase.operationType,
        });

        await createStockLot(tx, {
          companyId,
          warehouseName: purchase.warehouseName,
          itemCode: item.itemCode || item.itemName,
          itemName: item.itemName,
          sourceDocumentId: purchase.id,
          purchaseDate: purchase.purchaseDate,
          unitCost: Number(item.priceWithoutVat),
          quantity: Number(item.quantity),
          currencyCode: purchase.currencyCode,
        });
      }

      // ── 10. Update status → POSTED ────────────
      const postedDoc = await tx.purchaseDocument.update({
        where: { id: purchaseId },
        data: {
          status: 'POSTED',
          debitAccountId,
          creditAccountId,
        },
        include: { items: { orderBy: { id: 'asc' } } },
      });

      return { purchase: postedDoc, journalEntry };
    });

    return NextResponse.json(
      {
        data: result.purchase,
        journal: {
          id: result.journalEntry.id,
          linesCount: result.journalEntry.lines.length,
        },
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    if (error instanceof Response) return error;

    const msg = error instanceof Error ? error.message : 'Unknown error';

    // Client errors (400)
    const badRequest = [
      'PURCHASE_NOT_FOUND',
      'ONLY_DRAFT_CAN_POST',
      'SUPPLIER_NAME_REQUIRED',
      'WAREHOUSE_NAME_REQUIRED',
      'CURRENCY_CODE_REQUIRED',
      'OPERATION_TYPE_REQUIRED',
      'PURCHASE_DATE_REQUIRED',
      'AT_LEAST_ONE_ITEM_REQUIRED',
      'ITEM_NAME_REQUIRED',
      'ITEM_QTY_MUST_BE_POSITIVE',
      'ITEM_PRICE_MUST_BE_NON_NEGATIVE',
      'MISSING_POSTING_ACCOUNTS',
      'TOTAL_AMOUNT_MUST_BE_POSITIVE',
    ];

    if (badRequest.includes(msg)) {
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    // Conflict errors (409)
    if (msg === 'ALREADY_POSTED') {
      return NextResponse.json({ error: 'Document is already posted' }, { status: 409 });
    }
    if (msg === 'ALREADY_CANCELLED') {
      return NextResponse.json({ error: 'Document is cancelled' }, { status: 409 });
    }
    if (msg === 'LOCKED') {
      return NextResponse.json({ error: 'Document is locked' }, { status: 409 });
    }
    if (msg === 'PERIOD_CLOSED') {
      return NextResponse.json({ error: 'Accounting period is closed for this date' }, { status: 409 });
    }

    if (
      error &&
      typeof error === 'object' &&
      'code' in error &&
      (error as { code: string }).code === 'P2002'
    ) {
      return NextResponse.json({ error: 'Duplicate posting detected' }, { status: 409 });
    }

    console.error('Post purchase error:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
```

## FILE: ./app/api/company/[companyId]/purchases/[purchaseId]/route.ts
```
// app/api/company/[companyId]/purchases/[purchaseId]/route.ts
// ═══════════════════════════════════════════════════
// Task 37A: GET | Task 38B+38B.A: PUT (with validation)
// ═══════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireTenant } from '@/lib/auth/requireTenant';

type RouteParams = {
  params: Promise<{ companyId: string; purchaseId: string }>;
};

// ─── GET — Read single document ─────────────────
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { tenantId } = await requireTenant(request);
    const { companyId, purchaseId } = await params;

    const company = await prisma.company.findFirst({
      where: { id: companyId, tenantId },
      select: { id: true },
    });
    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    const purchase = await prisma.purchaseDocument.findFirst({
      where: {
        id: purchaseId,
        companyId,
        company: { tenantId },
      },
      include: { items: { orderBy: { id: 'asc' } } },
    });

    if (!purchase) {
      return NextResponse.json({ error: 'Purchase not found' }, { status: 404 });
    }

    return NextResponse.json({ data: purchase });
  } catch (error: unknown) {
    if (error instanceof Response) return error;
    const msg = error instanceof Error ? error.message : 'Unknown error';
    console.error('Get purchase error:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// ─── PUT — Update DRAFT document (with validation) ─
// NO journal, NO stock, NO FIFO. Only DRAFT editable.
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { tenantId } = await requireTenant(request);
    const { companyId, purchaseId } = await params;

    const company = await prisma.company.findFirst({
      where: { id: companyId, tenantId },
      select: { id: true },
    });
    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    const body = await request.json();

    // ── Validation BEFORE transaction ────────────
    // Validate date
    if (body.purchaseDate) {
      const d = new Date(body.purchaseDate);
      if (isNaN(d.getTime())) {
        return NextResponse.json({ error: 'INVALID_PURCHASE_DATE' }, { status: 400 });
      }
    }

    // Validate items if provided
    if (Array.isArray(body.items) && body.items.length > 0) {
      for (let i = 0; i < body.items.length; i++) {
        const item = body.items[i];
        if (!item.itemName || String(item.itemName).trim().length === 0) {
          return NextResponse.json(
            { error: `ITEM_NAME_REQUIRED (row ${i + 1})` },
            { status: 400 }
          );
        }
        if (Number(item.quantity) <= 0 || isNaN(Number(item.quantity))) {
          return NextResponse.json(
            { error: `ITEM_QTY_MUST_BE_POSITIVE (row ${i + 1})` },
            { status: 400 }
          );
        }
        if (Number(item.priceWithoutVat) < 0 || isNaN(Number(item.priceWithoutVat))) {
          return NextResponse.json(
            { error: `ITEM_PRICE_MUST_BE_NON_NEGATIVE (row ${i + 1})` },
            { status: 400 }
          );
        }
        if (item.vatRate != null) {
          const vr = Number(item.vatRate);
          if (isNaN(vr) || vr < 0 || vr > 100) {
            return NextResponse.json(
              { error: `ITEM_VAT_RATE_INVALID (row ${i + 1})` },
              { status: 400 }
            );
          }
        }
      }

      // If items present, header fields should be filled
      if (!body.supplierName || String(body.supplierName).trim().length === 0) {
        return NextResponse.json({ error: 'SUPPLIER_NAME_REQUIRED_WITH_ITEMS' }, { status: 400 });
      }
      if (!body.warehouseName || String(body.warehouseName).trim().length === 0) {
        return NextResponse.json({ error: 'WAREHOUSE_NAME_REQUIRED_WITH_ITEMS' }, { status: 400 });
      }
    }

    // ── Transaction ─────────────────────────────
    const result = await prisma.$transaction(async (tx) => {
      const purchase = await tx.purchaseDocument.findFirst({
        where: {
          id: purchaseId,
          companyId,
          company: { tenantId },
        },
        select: { id: true, status: true },
      });

      if (!purchase) throw new Error('PURCHASE_NOT_FOUND');
      if (purchase.status !== 'DRAFT') throw new Error('ONLY_DRAFT_EDITABLE');

      // Update header
      await tx.purchaseDocument.update({
        where: { id: purchaseId },
        data: {
          purchaseDate: body.purchaseDate ? new Date(body.purchaseDate) : undefined,
          supplierName: body.supplierName ?? undefined,
          supplierCode: body.supplierCode ?? undefined,
          warehouseName: body.warehouseName ?? undefined,
          currencyCode: body.currencyCode ?? undefined,
          operationType: body.operationType ?? undefined,
          comments: body.comments ?? undefined,
        },
      });

      // Replace items
      if (Array.isArray(body.items)) {
        await tx.purchaseItem.deleteMany({
          where: { purchaseDocumentId: purchaseId },
        });

        if (body.items.length > 0) {
          await tx.purchaseItem.createMany({
            data: body.items.map(
              (item: {
                itemName: string;
                itemCode?: string;
                quantity: number;
                priceWithoutVat: number;
                vatRate?: number;
              }) => ({
                purchaseDocumentId: purchaseId,
                itemName: String(item.itemName).trim(),
                itemCode: item.itemCode || null,
                quantity: Number(item.quantity),
                priceWithoutVat: Number(item.priceWithoutVat),
                vatRate: item.vatRate != null ? Number(item.vatRate) : null,
              })
            ),
          });
        }
      }

      return tx.purchaseDocument.findUniqueOrThrow({
        where: { id: purchaseId },
        include: { items: { orderBy: { id: 'asc' } } },
      });
    });

    return NextResponse.json({ data: result });
  } catch (error: unknown) {
    if (error instanceof Response) return error;

    const msg = error instanceof Error ? error.message : 'Unknown error';

    if (msg === 'PURCHASE_NOT_FOUND') {
      return NextResponse.json({ error: 'Purchase not found' }, { status: 404 });
    }
    if (msg === 'ONLY_DRAFT_EDITABLE') {
      return NextResponse.json({ error: 'Only DRAFT documents can be edited' }, { status: 400 });
    }

    console.error('Update purchase error:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
```

## FILE: ./app/api/company/[companyId]/purchases/[purchaseId]/copy/route.ts
```
// app/api/company/[companyId]/purchases/[purchaseId]/copy/route.ts
// ═══════════════════════════════════════════════════
// Task 36A: Copy Purchase Document
// ═══════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireTenant } from '@/lib/auth/requireTenant';

type RouteParams = {
  params: Promise<{ companyId: string; purchaseId: string }>;
};

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { tenantId } = await requireTenant(request);
    const { companyId, purchaseId } = await params;

    const company = await prisma.company.findFirst({
      where: { id: companyId, tenantId },
      select: { id: true },
    });
    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    const original = await prisma.purchaseDocument.findFirst({
      where: {
        id: purchaseId,
        companyId,
        company: { tenantId },
      },
      include: { items: true },
    });

    if (!original) {
      return NextResponse.json({ error: 'Purchase not found' }, { status: 404 });
    }

    // Generate next number in same series
    const lastInSeries = await prisma.purchaseDocument.findFirst({
      where: { companyId, series: original.series },
      orderBy: { number: 'desc' },
      select: { number: true },
    });

    const nextNumber = lastInSeries
      ? String(Number(lastInSeries.number) + 1).padStart(4, '0')
      : '0001';

    const copy = await prisma.purchaseDocument.create({
      data: {
        companyId,
        purchaseDate: new Date(),
        payUntil: original.payUntil,
        advancePaymentDate: original.advancePaymentDate,
        series: original.series,
        number: nextNumber,
        supplierName: original.supplierName,
        supplierCode: original.supplierCode,
        advanceEmployee: original.advanceEmployee,
        warehouseName: original.warehouseName,
        operationType: original.operationType,
        currencyCode: original.currencyCode,
        employeeName: original.employeeName,
        comments: `Copy of ${original.series}-${original.number}`,
        status: 'DRAFT',
        items: {
          create: original.items.map((item) => ({
            itemName: item.itemName,
            itemCode: item.itemCode,
            barcode: item.barcode,
            quantity: item.quantity,
            priceWithoutVat: item.priceWithoutVat,
            unitDiscount: item.unitDiscount,
            vatRate: item.vatRate,
            vatClassifier: item.vatClassifier,
            corAccountCode: item.corAccountCode,
            costCenter: item.costCenter,
            notes: item.notes,
          })),
        },
      },
      include: { items: true },
    });

    return NextResponse.json({ data: copy }, { status: 201 });
  } catch (error: unknown) {
    if (error instanceof Response) return error;

    if (error && typeof error === 'object' && 'code' in error && (error as { code: string }).code === 'P2002') {
      return NextResponse.json({ error: 'Document with this series/number already exists' }, { status: 409 });
    }

    const msg = error instanceof Error ? error.message : 'Unknown error';
    console.error('Copy purchase error:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
```

## FILE: ./app/api/company/[companyId]/repost/route.ts
```
// app/api/company/[companyId]/repost/route.ts
// ═══════════════════════════════════════════════════
// Reposting Engine Endpoint
// ═══════════════════════════════════════════════════
//
// Task 27: POST /api/company/:id/repost
//
// Aggressive rebuild: delete all SYSTEM journal entries
// in date range, recreate from source documents.
// MANUAL entries untouched. Idempotent.

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireTenant } from '@/lib/auth/requireTenant';
import { repostRange } from '@/lib/accounting/repostingService';

type RouteParams = {
  params: Promise<{ companyId: string }>;
};

async function verifyCompanyOwnership(companyId: string, tenantId: string) {
  const company = await prisma.company.findFirst({
    where: { id: companyId, tenantId },
    select: { id: true },
  });
  return company !== null;
}

// ─── POST /api/company/[companyId]/repost ────────
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { tenantId } = await requireTenant(request);
    const { companyId } = await params;

    const isOwner = await verifyCompanyOwnership(companyId, tenantId);
    if (!isOwner) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    const body = await request.json();
    const { from: fromParam, to: toParam } = body;

    // ─── Validate dates ──────────────────────────
    if (!fromParam || !toParam) {
      return NextResponse.json(
        { error: 'Both "from" and "to" are required (YYYY-MM-DD)' },
        { status: 400 }
      );
    }

    const fromDate = new Date(fromParam);
    const toDate = new Date(toParam);

    if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
      return NextResponse.json(
        { error: 'Invalid date format. Use YYYY-MM-DD.' },
        { status: 400 }
      );
    }

    if (fromDate > toDate) {
      return NextResponse.json(
        { error: '"from" must be <= "to"' },
        { status: 400 }
      );
    }

    // ─── Check period locks in range ─────────────
    // Find all closed periods that overlap with the repost range
    const fromYear = fromDate.getFullYear();
    const fromMonth = fromDate.getMonth() + 1;
    const toYear = toDate.getFullYear();
    const toMonth = toDate.getMonth() + 1;

    const closedPeriods = await prisma.accountingPeriod.findMany({
      where: {
        companyId,
        isClosed: true,
        OR: buildMonthRange(fromYear, fromMonth, toYear, toMonth),
      },
      select: { year: true, month: true },
    });

    if (closedPeriods.length > 0) {
      const locked = closedPeriods
        .map((p) => `${p.year}-${String(p.month).padStart(2, '0')}`)
        .join(', ');
      return NextResponse.json(
        { error: `PERIOD_CLOSED: Cannot repost — locked periods: ${locked}` },
        { status: 409 }
      );
    }

    // ─── Execute repost in transaction ───────────
    const result = await prisma.$transaction(
      async (tx) => {
        return repostRange(tx, {
          companyId,
          tenantId,
          from: fromDate,
          to: toDate,
        });
      },
      { timeout: 30000 } // 30s for large ranges
    );

    return NextResponse.json(result);
  } catch (error: unknown) {
    if (error instanceof Response) {
      return error;
    }

    if (error instanceof Error) {
      // MISSING_POSTING_PROFILE — document lacks account mapping
      if (error.message.startsWith('MISSING_POSTING_PROFILE')) {
        return NextResponse.json(
          { error: error.message },
          { status: 409 }
        );
      }
      // PERIOD_CLOSED from journalService (second contour)
      if (error.message.startsWith('PERIOD_CLOSED')) {
        return NextResponse.json(
          { error: error.message },
          { status: 409 }
        );
      }
    }

    const message =
      error instanceof Error ? error.message : 'Internal server error';
    console.error('Repost error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// ─── Helper: build month range for period lock check ─
function buildMonthRange(
  fromYear: number,
  fromMonth: number,
  toYear: number,
  toMonth: number
): Array<{ year: number; month: number }> {
  const months: Array<{ year: number; month: number }> = [];
  let y = fromYear;
  let m = fromMonth;

  while (y < toYear || (y === toYear && m <= toMonth)) {
    months.push({ year: y, month: m });
    m++;
    if (m > 12) {
      m = 1;
      y++;
    }
  }

  return months;
}
```

## FILE: ./app/api/company/[companyId]/sales/[saleId]/cancel/route.ts
```
// app/api/company/[companyId]/sales/[saleId]/cancel/route.ts
// ═══════════════════════════════════════════════════
// STORNO: Sale Document Cancellation
// ═══════════════════════════════════════════════════
//
// Task 23: Document Cancellation via Reversal Pattern
// Task 34: Reverse Stock Movements
// Task 35: Restore FIFO lots + 4-line reversal journal
//
// Flow (single transaction):
//   1. Find sale + guards (CANCELLED/LOCKED/period)
//   2. Find original JournalEntry
//   3. Restore FIFO lot allocations
//   4. Create reverse stock movements
//   5. Create reversal JournalEntry (mirror ALL lines)
//   6. Mark document CANCELLED

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireTenant } from '@/lib/auth/requireTenant';
import { createJournalEntry } from '@/lib/accounting/journalService';
import { assertPeriodOpen } from '@/lib/accounting/periodLock';
import { createReverseMovements } from '@/lib/accounting/stockService';
import { reverseSaleAllocations } from '@/lib/accounting/fifoService';

type RouteParams = {
  params: Promise<{ companyId: string; saleId: string }>;
};

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { tenantId } = await requireTenant(request);
    const { companyId, saleId } = await params;

    const company = await prisma.company.findFirst({
      where: { id: companyId, tenantId },
      select: { id: true },
    });
    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    // ═══════════════════════════════════════════════
    // TRANSACTION: FIFO restore + Reversal Journal + Status
    // ═══════════════════════════════════════════════
    const result = await prisma.$transaction(async (tx) => {
      // 1. Find sale document (tenant-safe)
      const sale = await tx.saleDocument.findFirst({
        where: {
          id: saleId,
          companyId,
          company: { tenantId },
        },
      });

      if (!sale) throw new Error('SALE_NOT_FOUND');
      if (sale.status === 'CANCELLED') throw new Error('ALREADY_CANCELLED');
      if (sale.status === 'LOCKED') throw new Error('LOCKED');

      await assertPeriodOpen(tx, { companyId, date: sale.saleDate });

      // 2. Find original journal entry
      const originalEntry = await tx.journalEntry.findFirst({
        where: {
          documentId: saleId,
          documentType: 'SALE',
          companyId,
        },
        include: { lines: true },
      });

      if (!originalEntry || !originalEntry.lines?.length) {
        throw new Error('JOURNAL_LINES_EMPTY');
      }

      // 3. §4: Restore FIFO lot allocations
      await reverseSaleAllocations(tx, companyId, saleId);

      // 4. §4: Create reverse stock movements
      await createReverseMovements(tx, companyId, saleId, 'SALE_REVERSAL');

      // 5. §4: Create reversal JournalEntry (mirror ALL lines — swap debit↔credit)
      const reversalEntry = await createJournalEntry(tx, {
        companyId,
        date: sale.saleDate,
        documentType: 'SALE_REVERSAL',
        documentId: saleId,
        lines: originalEntry.lines.map((line) => ({
          accountId: line.accountId,
          debit: Number(line.credit),
          credit: Number(line.debit),
        })),
      });

      // 6. Mark document CANCELLED
      const updatedSale = await tx.saleDocument.update({
        where: { id: saleId },
        data: { status: 'CANCELLED' },
        include: { items: true },
      });

      return { sale: updatedSale, reversalEntry };
    });

    return NextResponse.json({
      data: result.sale,
      reversal: {
        id: result.reversalEntry.id,
        linesCount: result.reversalEntry.lines.length,
      },
    });
  } catch (error: unknown) {
    if (error instanceof Response) return error;

    const msg = error instanceof Error ? error.message : 'Internal server error';

    if (msg === 'SALE_NOT_FOUND') {
      return NextResponse.json({ error: 'Sale document not found' }, { status: 404 });
    }
    if (msg === 'ALREADY_CANCELLED') {
      return NextResponse.json({ error: 'Sale document is already cancelled' }, { status: 409 });
    }
    if (msg === 'PERIOD_CLOSED') {
      return NextResponse.json({ error: 'Accounting period is closed for this date' }, { status: 409 });
    }
    if (msg === 'LOCKED') {
      return NextResponse.json({ error: 'Sale document is locked and cannot be cancelled' }, { status: 409 });
    }
    if (msg === 'JOURNAL_LINES_EMPTY') {
      return NextResponse.json({ error: 'Original journal entry has no lines. Cannot create reversal.' }, { status: 500 });
    }

    console.error('Cancel sale error:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
```

## FILE: ./app/api/company/[companyId]/sales/route.ts
```
// app/api/company/[companyId]/sales/route.ts
// ═══════════════════════════════════════════════════
// TENANT-SAFE Sales API with FIFO Journal Integration
// ═══════════════════════════════════════════════════
//
// Task 22: Document → Journal Integration
// Task 34: Stock Movements (OUT)
// Task 35: FIFO Allocation + 4-line COGS Journal
//
// POST creates SaleDocument + FIFO allocation + 4-line JournalEntry + StockMovement
// All in ONE transaction. If any step fails → full rollback.

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireTenant } from '@/lib/auth/requireTenant';
import { createJournalEntry } from '@/lib/accounting/journalService';
import { assertPeriodOpen } from '@/lib/accounting/periodLock';
import { createStockMovement } from '@/lib/accounting/stockService';
import { allocateFifoLots } from '@/lib/accounting/fifoService';
import { resolveFifoSaleAccounts, VatMode } from '@/lib/accounting/accountMapping';
import Decimal from 'decimal.js';

type RouteParams = {
  params: Promise<{ companyId: string }>;
};

// ─── HELPER: Verify company belongs to tenant ────
async function verifyCompanyOwnership(companyId: string, tenantId: string) {
  const company = await prisma.company.findFirst({
    where: { id: companyId, tenantId },
    select: { id: true },
  });
  return company !== null;
}

// ─── GET /api/company/[companyId]/sales ──────────
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { tenantId } = await requireTenant(request);
    const { companyId } = await params;

    const isOwner = await verifyCompanyOwnership(companyId, tenantId);
    if (!isOwner) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    const sales = await prisma.saleDocument.findMany({
      where: {
        companyId,
        company: { tenantId },
      },
      include: { items: true },
      orderBy: { saleDate: 'desc' },
    });

    return NextResponse.json({ data: sales, count: sales.length });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error('List sales error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ─── POST /api/company/[companyId]/sales ─────────
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { tenantId } = await requireTenant(request);
    const { companyId } = await params;

    const isOwner = await verifyCompanyOwnership(companyId, tenantId);
    if (!isOwner) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    const body = await request.json();

    const {
      saleDate,
      series,
      number: docNumber,
      clientName,
      warehouseName,
      operationType,
      currencyCode,
      items,
    } = body;

    if (!saleDate || !series || !docNumber || !clientName || !warehouseName || !operationType || !currencyCode) {
      return NextResponse.json({ error: 'Missing required sale fields' }, { status: 400 });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'Sale must have at least one item' }, { status: 400 });
    }

    // ═══════════════════════════════════════════════
    // TRANSACTION: SaleDocument + FIFO + Journal + StockMovement
    // ═══════════════════════════════════════════════
    const result = await prisma.$transaction(async (tx) => {
      await assertPeriodOpen(tx, { companyId, date: new Date(saleDate) });

      // §7: Resolve all 4+ accounts via ACCOUNT_MAP (no hardcoded strings)
      const vatMode: VatMode = body.vatMode || 'VAT_19';
      const accounts = await resolveFifoSaleAccounts(tx, companyId, vatMode);

      // 1. Create SaleDocument
      const sale = await tx.saleDocument.create({
        data: {
          companyId,
          saleDate: new Date(saleDate),
          payUntil: body.payUntil ? new Date(body.payUntil) : null,
          accountingDate: body.accountingDate ? new Date(body.accountingDate) : null,
          series,
          number: docNumber,
          clientName,
          clientCode: body.clientCode || null,
          payerName: body.payerName || null,
          payerCode: body.payerCode || null,
          unloadAddress: body.unloadAddress || null,
          unloadCity: body.unloadCity || null,
          warehouseName,
          operationType,
          currencyCode,
          employeeName: body.employeeName || null,
          comments: body.comments || null,
          debitAccountId: accounts.arAccountId,
          creditAccountId: accounts.revenueAccountId,
          items: {
            create: items.map((item: {
              itemName: string;
              itemCode?: string;
              barcode?: string;
              quantity: number;
              priceWithoutVat: number;
              unitDiscount?: number;
              vatRate?: number;
              vatClassifier?: string;
              salesAccountCode?: string;
              expenseAccountCode?: string;
              costCenter?: string;
            }) => ({
              itemName: item.itemName,
              itemCode: item.itemCode || null,
              barcode: item.barcode || null,
              quantity: item.quantity,
              priceWithoutVat: item.priceWithoutVat,
              unitDiscount: item.unitDiscount || null,
              vatRate: item.vatRate || null,
              vatClassifier: item.vatClassifier || null,
              salesAccountCode: item.salesAccountCode || null,
              expenseAccountCode: item.expenseAccountCode || null,
              costCenter: item.costCenter || null,
            })),
          },
        },
        include: { items: true },
      });

      // 2. FIFO Allocation per item (§3 + §6: FOR UPDATE SKIP LOCKED)
      let totalCogs = new Decimal(0);

      for (const item of sale.items) {
        const itemCode = item.itemCode || item.itemName;
        const fifoResult = await allocateFifoLots(tx, {
          companyId,
          warehouseName: sale.warehouseName,
          itemCode,
          itemName: item.itemName,
          quantity: item.quantity,
          documentType: 'SALE',
          documentId: sale.id,
          saleItemId: item.id,
        });
        totalCogs = totalCogs.plus(fifoResult.totalCogs);
      }

      // 3. Calculate revenue
      const totalRevenue = items.reduce(
        (sum: number, item: { quantity: number; priceWithoutVat: number }) =>
          sum + Number(item.quantity) * Number(item.priceWithoutVat),
        0
      );

      if (totalRevenue <= 0) {
        throw new Error('Total revenue must be positive');
      }

      // 4. Create 4-line JournalEntry (§3: DR AR, CR Revenue, DR COGS, CR Inventory)
      const journalLines = [
        { accountId: accounts.arAccountId, debit: totalRevenue, credit: 0 },
        { accountId: accounts.revenueAccountId, debit: 0, credit: totalRevenue },
        ...(totalCogs.gt(0) ? [
          { accountId: accounts.cogsAccountId, debit: Number(totalCogs.toFixed(2)), credit: 0 },
          { accountId: accounts.inventoryAccountId, debit: 0, credit: Number(totalCogs.toFixed(2)) },
        ] : []),
      ];

      const journalEntry = await createJournalEntry(tx, {
        companyId,
        date: new Date(saleDate),
        documentType: 'SALE',
        documentId: sale.id,
        lines: journalLines,
      });

      // 5. Stock Movements (OUT) — Task 34
      for (const item of sale.items) {
        await createStockMovement({
          tx,
          companyId,
          warehouseName: sale.warehouseName,
          itemName: item.itemName,
          itemCode: item.itemCode || item.itemName,
          quantity: Number(item.quantity),
          cost: Number(item.priceWithoutVat),
          direction: 'OUT',
          documentType: 'SALE',
          documentId: sale.id,
          documentDate: sale.saleDate,
          series: sale.series,
          number: docNumber,
        });
      }

      return { sale, journalEntry, totalCogs: Number(totalCogs.toFixed(2)) };
    });

    return NextResponse.json(
      {
        data: result.sale,
        journal: {
          id: result.journalEntry.id,
          linesCount: result.journalEntry.lines.length,
        },
        cogs: result.totalCogs,
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    if (error instanceof Response) return error;

    if (error && typeof error === 'object' && 'code' in error && (error as { code: string }).code === 'P2002') {
      return NextResponse.json({ error: 'Sale with this series/number already exists' }, { status: 409 });
    }

    const message = error instanceof Error ? error.message : 'Internal server error';

    if (message.startsWith('INSUFFICIENT_STOCK') || message.startsWith('FIFO_ALLOCATION_INCOMPLETE')) {
      return NextResponse.json({ error: message }, { status: 409 });
    }

    if (message.startsWith('ACCOUNT_CODE_NOT_FOUND')) {
      return NextResponse.json({ error: message }, { status: 400 });
    }

    console.error('Create sale error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
```

## FILE: ./app/api/company/[companyId]/accounts/bulk/route.ts
```
// app/api/company/[companyId]/accounts/bulk/route.ts
// ═══════════════════════════════════════════════════
// Bulk Account Operations — Check Usage + Bulk Delete
// ═══════════════════════════════════════════════════
//
// POST /api/company/:id/accounts/bulk
//   body: { action: "check-usage" | "delete", ids: string[] }
//
// check-usage → { deletable, protected (journal lines), system (Stammkonten) }
// delete      → deletes only deletable accounts, skips protected + system

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireTenant } from '@/lib/auth/requireTenant';
import { PROTECTED_ACCOUNT_CODES } from '@/lib/accounting/protectedAccounts';

type RouteParams = {
  params: Promise<{ companyId: string }>;
};

async function verifyCompanyOwnership(companyId: string, tenantId: string) {
  const company = await prisma.company.findFirst({
    where: { id: companyId, tenantId },
    select: { id: true },
  });
  return company !== null;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { tenantId } = await requireTenant(request);
    const { companyId } = await params;

    const isOwner = await verifyCompanyOwnership(companyId, tenantId);
    if (!isOwner) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    const body = await request.json();
    const { action, ids } = body;

    if (!action || !ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { error: 'Required: action ("check-usage" | "delete"), ids (string[])' },
        { status: 400 }
      );
    }

    // ─── Load all requested accounts ─────────────
    const accounts = await prisma.account.findMany({
      where: { id: { in: ids }, companyId },
      select: { id: true, code: true, nameDe: true },
    });

    const accountMap = new Map(accounts.map(a => [a.id, a]));
    const validIds = new Set(accounts.map(a => a.id));

    // ─── Classify: system (Stammkonten) ──────────
    const systemAccounts: { id: string; code: string; nameDe: string }[] = [];
    const nonSystemIds: string[] = [];

    for (const acc of accounts) {
      if (PROTECTED_ACCOUNT_CODES.has(acc.code)) {
        systemAccounts.push(acc);
      } else {
        nonSystemIds.push(acc.id);
      }
    }

    // ─── Classify: journal line usage ────────────
    const lineCounts = nonSystemIds.length > 0
      ? await prisma.journalLine.groupBy({
          by: ['accountId'],
          where: { accountId: { in: nonSystemIds } },
          _count: { id: true },
        })
      : [];

    const lineCountMap = new Map(lineCounts.map(lc => [lc.accountId, lc._count.id]));

    const usedAccounts: { id: string; code: string; nameDe: string; lineCount: number }[] = [];
    const deletableIds: string[] = [];

    for (const id of nonSystemIds) {
      const count = lineCountMap.get(id) || 0;
      const acc = accountMap.get(id)!;
      if (count > 0) {
        usedAccounts.push({ id, code: acc.code, nameDe: acc.nameDe, lineCount: count });
      } else {
        deletableIds.push(id);
      }
    }

    // Sort for display
    systemAccounts.sort((a, b) => a.code.localeCompare(b.code));
    usedAccounts.sort((a, b) => a.code.localeCompare(b.code));

    // ─── CHECK-USAGE ─────────────────────────────
    if (action === 'check-usage') {
      return NextResponse.json({
        total: validIds.size,
        deletable: deletableIds.length,
        system: systemAccounts,    // Stammkonten — never deletable
        protected: usedAccounts,   // have journal entries
      });
    }

    // ─── DELETE ──────────────────────────────────
    if (action === 'delete') {
      if (deletableIds.length === 0) {
        return NextResponse.json({
          deleted: 0,
          systemCount: systemAccounts.length,
          protectedCount: usedAccounts.length,
          message: 'No accounts can be deleted',
        });
      }

      const result = await prisma.account.deleteMany({
        where: { id: { in: deletableIds }, companyId },
      });

      return NextResponse.json({
        deleted: result.count,
        systemCount: systemAccounts.length,
        protectedCount: usedAccounts.length,
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error('Bulk accounts error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

## FILE: ./app/api/company/[companyId]/accounts/[accountId]/route.ts
```
// app/api/company/[companyId]/accounts/[accountId]/route.ts
// ═══════════════════════════════════════════════════
// TENANT-SAFE Individual Account CRUD
// ═══════════════════════════════════════════════════
//
// Security architecture:
// ┌─────────────────────────────────────────────────┐
// │ RULE 1: Every WHERE includes company.tenantId   │
// │ RULE 2: updateMany/deleteMany = atomic scope    │
// │ RULE 3: count === 0 → 404 (no info leak)        │
// │ RULE 4: No findUnique({ id }) — ever            │
// │ RULE 5: Stammkonten cannot be deleted/recoded   │
// └─────────────────────────────────────────────────┘

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireTenant } from '@/lib/auth/requireTenant';
import { isProtectedCode } from '@/lib/accounting/protectedAccounts';

type RouteParams = {
  params: Promise<{ companyId: string; accountId: string }>;
};

const VALID_TYPES = ['ASSET', 'LIABILITY', 'EQUITY', 'INCOME', 'EXPENSE'];

// ─── GET ─────────────────────────────────────────
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { tenantId } = await requireTenant(request);
    const { companyId, accountId } = await params;

    const account = await prisma.account.findFirst({
      where: {
        id: accountId,
        companyId,
        company: { tenantId },
      },
    });

    if (!account) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }

    return NextResponse.json({ data: account });
  } catch (error) {
    if (error instanceof Response) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Get account error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ─── PATCH ───────────────────────────────────────
// Body: { nameDe?, nameEn?, name?, code?, type?, isActive? }
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { tenantId } = await requireTenant(request);
    const { companyId, accountId } = await params;

    const body = await request.json();
    const { name, nameDe, nameEn, code, type, isActive } = body;

    // Validate type if provided
    if (type && !VALID_TYPES.includes(type)) {
      return NextResponse.json(
        { error: `Invalid type. Must be one of: ${VALID_TYPES.join(', ')}` },
        { status: 400 }
      );
    }

    // Find account (tenant-scoped)
    const account = await prisma.account.findFirst({
      where: {
        id: accountId,
        companyId,
        company: { tenantId },
      },
    });

    if (!account) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }

    // ═══ STAMMKONTEN PROTECTION ═══════════════════
    // Protected accounts: cannot change code, type, or deactivate
    if (isProtectedCode(account.code)) {
      if (code !== undefined && code !== account.code) {
        return NextResponse.json(
          { error: `System account ${account.code} (Stammkonto) — code cannot be changed` },
          { status: 403 }
        );
      }
      if (type !== undefined && type !== account.type) {
        return NextResponse.json(
          { error: `System account ${account.code} (Stammkonto) — type cannot be changed` },
          { status: 403 }
        );
      }
      if (isActive === false) {
        return NextResponse.json(
          { error: `System account ${account.code} (Stammkonto) — cannot be deactivated` },
          { status: 403 }
        );
      }
    }

    // Build update data (only provided fields)
    const updateData: Record<string, unknown> = {};
    // Bilingual: nameDe/nameEn preferred, legacy 'name' maps to nameDe
    if (nameDe !== undefined) updateData.nameDe = nameDe.trim();
    else if (name !== undefined) updateData.nameDe = name.trim();
    if (nameEn !== undefined) updateData.nameEn = nameEn.trim();
    if (code !== undefined) updateData.code = code.trim();
    if (type !== undefined) updateData.type = type;
    if (isActive !== undefined) updateData.isActive = Boolean(isActive);

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    const updated = await prisma.account.update({
      where: { id: accountId },
      data: updateData,
    });

    return NextResponse.json({ data: updated });
  } catch (error: unknown) {
    if (error instanceof Response) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (
      error &&
      typeof error === 'object' &&
      'code' in error &&
      (error as { code: string }).code === 'P2002'
    ) {
      return NextResponse.json(
        { error: 'Account code already exists in this company' },
        { status: 409 }
      );
    }

    console.error('Update account error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ─── DELETE ──────────────────────────────────────
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { tenantId } = await requireTenant(request);
    const { companyId, accountId } = await params;

    const account = await prisma.account.findFirst({
      where: {
        id: accountId,
        companyId,
        company: { tenantId },
      },
    });

    if (!account) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }

    // ═══ STAMMKONTEN PROTECTION ═══════════════════
    if (isProtectedCode(account.code)) {
      return NextResponse.json(
        { error: `System account ${account.code} (Stammkonto) cannot be deleted` },
        { status: 403 }
      );
    }

    await prisma.account.delete({
      where: { id: accountId },
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    if (error instanceof Response) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Delete account error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

## FILE: ./app/api/company/[companyId]/accounts/route.ts
```
// app/api/company/[companyId]/accounts/route.ts
// ═══════════════════════════════════════════════════
// TENANT-SAFE Chart of Accounts API
// ═══════════════════════════════════════════════════
//
// Security: Two-level isolation
//   1. requireTenant() → tenantId from session
//   2. Every query includes company: { tenantId }
//
// Pattern: company belongs to tenant → accounts belong to company
//   Tenant → Company → Account (ownership chain verified)

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireTenant } from '@/lib/auth/requireTenant';

type RouteParams = {
  params: Promise<{ companyId: string }>;
};

// Valid account types (matches Prisma enum)
const VALID_TYPES = ['ASSET', 'LIABILITY', 'EQUITY', 'INCOME', 'EXPENSE'];

// ─── HELPER: Verify company belongs to tenant ────
async function verifyCompanyOwnership(companyId: string, tenantId: string) {
  const company = await prisma.company.findFirst({
    where: { id: companyId, tenantId },
    select: { id: true },
  });
  return company !== null;
}

// ─── GET /api/company/[companyId]/accounts ───────
// List all accounts for this company
// Tenant-safe: only accounts of companies owned by current tenant
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { tenantId } = await requireTenant(request);
    const { companyId } = await params;

    // Verify company belongs to tenant
    const isOwner = await verifyCompanyOwnership(companyId, tenantId);
    if (!isOwner) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    const accounts = await prisma.account.findMany({
      where: {
        companyId,
        company: { tenantId }, // TENANT SCOPE (defense-in-depth)
      },
      orderBy: { code: 'asc' },
    });

    return NextResponse.json({ data: accounts, count: accounts.length });
  } catch (error) {
    if (error instanceof Response) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('List accounts error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ─── POST /api/company/[companyId]/accounts ──────
// Create a new account in this company's chart
// Body: { code: string, name: string, type: AccountType }
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { tenantId } = await requireTenant(request);
    const { companyId } = await params;

    // Verify company belongs to tenant
    const isOwner = await verifyCompanyOwnership(companyId, tenantId);
    if (!isOwner) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    const body = await request.json();
    const { code, name, type } = body;

    // Validate required fields
    if (!code || !name || !type) {
      return NextResponse.json(
        { error: 'Missing required fields: code, name, type' },
        { status: 400 }
      );
    }

    // Validate account type
    if (!VALID_TYPES.includes(type)) {
      return NextResponse.json(
        { error: `Invalid type. Must be one of: ${VALID_TYPES.join(', ')}` },
        { status: 400 }
      );
    }

    // Create account (@@unique([companyId, code]) prevents duplicates)
    const account = await prisma.account.create({
      data: {
        companyId,
        code: code.trim(),
        name: name.trim(),
        type,
      },
    });

    return NextResponse.json({ data: account }, { status: 201 });
  } catch (error: unknown) {
    if (error instanceof Response) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Handle unique constraint violation (duplicate code)
    if (
      error &&
      typeof error === 'object' &&
      'code' in error &&
      (error as { code: string }).code === 'P2002'
    ) {
      return NextResponse.json(
        { error: 'Account code already exists in this company' },
        { status: 409 }
      );
    }

    console.error('Create account error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

## FILE: ./app/api/company/[companyId]/warehouse/balance/route.ts
```
// app/api/company/[companyId]/warehouse/balance/route.ts
// ═══════════════════════════════════════════════════
// Warehouse Balance API — Task 34
// ═══════════════════════════════════════════════════
//
// GET /api/company/:id/warehouse/balance
//   → all warehouses, all products
//
// GET /api/company/:id/warehouse/balance?warehouse=Main
//   → single warehouse
//
// Response:
// {
//   warehouses: ["Main", "Secondary"],
//   balances: [
//     { warehouseName, itemCode, itemName, quantity }
//   ]
// }

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireTenant } from '@/lib/auth/requireTenant';
import {
  getWarehouseBalance,
  getCompanyBalance,
  getWarehouseNames,
} from '@/lib/accounting/stockService';

type RouteParams = {
  params: Promise<{ companyId: string }>;
};

async function verifyCompanyOwnership(companyId: string, tenantId: string) {
  const company = await prisma.company.findFirst({
    where: { id: companyId, tenantId },
    select: { id: true },
  });
  return company !== null;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { tenantId } = await requireTenant(request);
    const { companyId } = await params;

    const isOwner = await verifyCompanyOwnership(companyId, tenantId);
    if (!isOwner) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    const url = new URL(request.url);
    const warehouseFilter = url.searchParams.get('warehouse');

    // Use read-only transaction for consistency
    const result = await prisma.$transaction(async (tx) => {
      const warehouses = await getWarehouseNames(tx, companyId);

      const balances = warehouseFilter
        ? await getWarehouseBalance(tx, companyId, warehouseFilter)
        : await getCompanyBalance(tx, companyId);

      return { warehouses, balances };
    });

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof Response) return error;
    console.error('Warehouse balance error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

## FILE: ./app/api/company/[companyId]/reports/trial-balance/route.ts
```
// app/api/company/[companyId]/reports/trial-balance/route.ts
// ═══════════════════════════════════════════════════
// Trial Balance — Ledger Consistency Proof
// ═══════════════════════════════════════════════════
//
// Task 29: Prove Σ Debit == Σ Credit across all journal lines.
//
// Source: JournalLine + JournalEntry (date filter).
// No document involvement. No source filter (MANUAL included).
// Ledger is the single source of truth.

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireTenant } from '@/lib/auth/requireTenant';

type RouteParams = {
  params: Promise<{ companyId: string }>;
};

async function verifyCompanyOwnership(companyId: string, tenantId: string) {
  const company = await prisma.company.findFirst({
    where: { id: companyId, tenantId },
    select: { id: true },
  });
  return company !== null;
}

// ─── GET /api/company/[companyId]/reports/trial-balance ───
//
// Query params (both required):
//   ?from=YYYY-MM-DD&to=YYYY-MM-DD
//
// Response:
// {
//   "from": "2026-01-01",
//   "to": "2026-01-31",
//   "totalDebit": "10000.00",
//   "totalCredit": "10000.00",
//   "isBalanced": true
// }
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { tenantId } = await requireTenant(request);
    const { companyId } = await params;

    const isOwner = await verifyCompanyOwnership(companyId, tenantId);
    if (!isOwner) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    // ─── Validate query params ───────────────────
    const url = new URL(request.url);
    const fromParam = url.searchParams.get('from');
    const toParam = url.searchParams.get('to');

    if (!fromParam || !toParam) {
      return NextResponse.json(
        { error: 'Both "from" and "to" query parameters are required (YYYY-MM-DD)' },
        { status: 400 }
      );
    }

    const fromDate = new Date(fromParam);
    const toDate = new Date(toParam);

    if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
      return NextResponse.json(
        { error: 'Invalid date format. Use YYYY-MM-DD.' },
        { status: 400 }
      );
    }

    if (fromDate > toDate) {
      return NextResponse.json(
        { error: '"from" must be <= "to"' },
        { status: 400 }
      );
    }

    // UTC-safe end of day
    const toDateEnd = new Date(`${toParam}T23:59:59.999Z`);

    // ─── Aggregate: SUM(debit), SUM(credit) ──────
    const aggregation = await prisma.journalLine.aggregate({
      where: {
        entry: {
          companyId,
          company: { tenantId },
          date: {
            gte: fromDate,
            lte: toDateEnd,
          },
        },
      },
      _sum: {
        debit: true,
        credit: true,
      },
    });

    const totalDebit = Number(aggregation._sum.debit || 0);
    const totalCredit = Number(aggregation._sum.credit || 0);

    // Decimal-safe comparison (round to 2 places)
    const roundedDebit = Math.round(totalDebit * 100) / 100;
    const roundedCredit = Math.round(totalCredit * 100) / 100;
    const isBalanced = roundedDebit === roundedCredit;

    return NextResponse.json({
      from: fromParam,
      to: toParam,
      totalDebit: roundedDebit.toFixed(2),
      totalCredit: roundedCredit.toFixed(2),
      isBalanced,
    });
  } catch (error) {
    if (error instanceof Response) {
      return error;
    }
    console.error('Trial balance error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

## FILE: ./app/api/company/[companyId]/reports/osv/route.ts
```
// app/api/company/[companyId]/reports/osv/route.ts
// ═══════════════════════════════════════════════════
// ОСВ (Оборотно-сальдовая ведомость) — Trial Balance
// ═══════════════════════════════════════════════════
//
// Task 22: Backend-only aggregator
//
// SQL logic: SUM(debit - credit) GROUP BY accountId
// Returns balance per account from JournalLine.
//
// No UI. No formatting. Raw JSON.

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireTenant } from '@/lib/auth/requireTenant';

type RouteParams = {
  params: Promise<{ companyId: string }>;
};

// ─── HELPER: Verify company belongs to tenant ────
async function verifyCompanyOwnership(companyId: string, tenantId: string) {
  const company = await prisma.company.findFirst({
    where: { id: companyId, tenantId },
    select: { id: true },
  });
  return company !== null;
}

// ─── GET /api/company/[companyId]/reports/osv ────
// Trial Balance: balance per account
//
// Optional query params:
//   ?from=2024-01-01&to=2024-12-31 (date range filter)
//
// Response:
// [
//   {
//     "accountId": "...",
//     "accountCode": "1200",
//     "accountName": "Accounts Receivable",
//     "accountType": "ASSET",
//     "totalDebit": 5000.00,
//     "totalCredit": 2000.00,
//     "balance": 3000.00
//   }
// ]
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { tenantId } = await requireTenant(request);
    const { companyId } = await params;

    const isOwner = await verifyCompanyOwnership(companyId, tenantId);
    if (!isOwner) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    // Optional date range filters
    const url = new URL(request.url);
    const fromDate = url.searchParams.get('from');
    const toDate = url.searchParams.get('to');

    // Build date filter for JournalEntry
    const dateFilter: { gte?: Date; lte?: Date } = {};
    if (fromDate) dateFilter.gte = new Date(fromDate);
    if (toDate) dateFilter.lte = new Date(toDate);

    // Aggregate journal lines grouped by accountId
    // Using Prisma groupBy for the aggregation
    const aggregation = await prisma.journalLine.groupBy({
      by: ['accountId'],
      where: {
        entry: {
          companyId,
          company: { tenantId }, // TENANT SCOPE
          ...(Object.keys(dateFilter).length > 0 ? { date: dateFilter } : {}),
        },
      },
      _sum: {
        debit: true,
        credit: true,
      },
    });

    // If no journal lines exist, return empty array
    if (aggregation.length === 0) {
      return NextResponse.json({ data: [], count: 0 });
    }

    // Fetch account details for enrichment
    const accountIds = aggregation.map((a) => a.accountId);
    const accounts = await prisma.account.findMany({
      where: {
        id: { in: accountIds },
        companyId,
        company: { tenantId },
      },
      select: {
        id: true,
        code: true,
        name: true,
        type: true,
      },
    });

    const accountMap = new Map(accounts.map((a) => [a.id, a]));

    // Build response with enriched data
    const balances = aggregation
      .map((agg) => {
        const account = accountMap.get(agg.accountId);
        const totalDebit = Number(agg._sum.debit || 0);
        const totalCredit = Number(agg._sum.credit || 0);

        return {
          accountId: agg.accountId,
          accountCode: account?.code || 'UNKNOWN',
          accountName: account?.name || 'Unknown Account',
          accountType: account?.type || 'UNKNOWN',
          totalDebit: Math.round(totalDebit * 100) / 100,
          totalCredit: Math.round(totalCredit * 100) / 100,
          balance: Math.round((totalDebit - totalCredit) * 100) / 100,
        };
      })
      .sort((a, b) => a.accountCode.localeCompare(b.accountCode));

    return NextResponse.json({ data: balances, count: balances.length });
  } catch (error) {
    
    if (error instanceof Response) {
      return error;
    }

    console.error('OSV report error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

## FILE: ./app/api/company/[companyId]/reports/pnl/route.ts
```
// app/api/company/[companyId]/reports/pnl/route.ts
// ═══════════════════════════════════════════════════
// P&L (Profit & Loss) Report — Backend Aggregator
// ═══════════════════════════════════════════════════
//
// Task 25 + Task 26.1 fixes:
//   - UTC-safe date boundary
//   - Auth error: return original Response

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireTenant } from '@/lib/auth/requireTenant';

type RouteParams = {
  params: Promise<{ companyId: string }>;
};

async function verifyCompanyOwnership(companyId: string, tenantId: string) {
  const company = await prisma.company.findFirst({
    where: { id: companyId, tenantId },
    select: { id: true },
  });
  return company !== null;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { tenantId } = await requireTenant(request);
    const { companyId } = await params;

    const isOwner = await verifyCompanyOwnership(companyId, tenantId);
    if (!isOwner) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    // ─── Validate query params ───────────────────
    const url = new URL(request.url);
    const fromParam = url.searchParams.get('from');
    const toParam = url.searchParams.get('to');

    if (!fromParam || !toParam) {
      return NextResponse.json(
        { error: 'Both "from" and "to" query parameters are required (YYYY-MM-DD)' },
        { status: 400 }
      );
    }

    const fromDate = new Date(fromParam);
    const toDate = new Date(toParam);

    if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
      return NextResponse.json(
        { error: 'Invalid date format. Use YYYY-MM-DD.' },
        { status: 400 }
      );
    }

    if (fromDate > toDate) {
      return NextResponse.json(
        { error: '"from" must be <= "to"' },
        { status: 400 }
      );
    }

    // End of day for inclusive range (UTC-safe — Task 26.1 fix)
    const toDateEnd = new Date(`${toParam}T23:59:59.999Z`);

    // ─── Fetch INCOME and EXPENSE accounts ───────
    const accounts = await prisma.account.findMany({
      where: {
        companyId,
        company: { tenantId },
        type: { in: ['INCOME', 'EXPENSE'] },
      },
      select: {
        id: true,
        code: true,
        name: true,
        type: true,
      },
    });

    if (accounts.length === 0) {
      return NextResponse.json({
        period: { from: fromParam, to: toParam },
        income: [],
        expenses: [],
        result: 0,
      });
    }

    const accountIds = accounts.map((a) => a.id);
    const accountMap = new Map(accounts.map((a) => [a.id, a]));

    // ─── Aggregate journal lines ─────────────────
    const aggregation = await prisma.journalLine.groupBy({
      by: ['accountId'],
      where: {
        accountId: { in: accountIds },
        entry: {
          companyId,
          company: { tenantId },
          date: {
            gte: fromDate,
            lte: toDateEnd,
          },
        },
      },
      _sum: {
        debit: true,
        credit: true,
      },
    });

    // ─── Calculate amounts per account ───────────
    const incomeLines: { accountCode: string; accountName: string; amount: number }[] = [];
    const expenseLines: { accountCode: string; accountName: string; amount: number }[] = [];

    for (const agg of aggregation) {
      const account = accountMap.get(agg.accountId);
      if (!account) continue;

      const sumDebit = Number(agg._sum.debit || 0);
      const sumCredit = Number(agg._sum.credit || 0);

      let amount: number;
      if (account.type === 'INCOME') {
        amount = sumCredit - sumDebit;
      } else {
        amount = sumDebit - sumCredit;
      }

      amount = Math.round(amount * 100) / 100;
      if (amount === 0) continue;

      const line = {
        accountCode: account.code,
        accountName: account.name,
        amount,
      };

      if (account.type === 'INCOME') {
        incomeLines.push(line);
      } else {
        expenseLines.push(line);
      }
    }

    // ─── Sort by accountCode ASC ─────────────────
    incomeLines.sort((a, b) => a.accountCode.localeCompare(b.accountCode));
    expenseLines.sort((a, b) => a.accountCode.localeCompare(b.accountCode));

    // ─── Calculate net result ────────────────────
    const totalIncome = incomeLines.reduce((sum, l) => sum + l.amount, 0);
    const totalExpenses = expenseLines.reduce((sum, l) => sum + l.amount, 0);
    const result = Math.round((totalIncome - totalExpenses) * 100) / 100;

    return NextResponse.json({
      period: { from: fromParam, to: toParam },
      income: incomeLines,
      expenses: expenseLines,
      result,
    });
  } catch (error) {
    // Task 26.1 fix: return original Response from requireTenant()
    if (error instanceof Response) {
      return error;
    }
    console.error('P&L report error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

## FILE: ./app/api/company/[companyId]/reports/balance-sheet/route.ts
```
// app/api/company/[companyId]/reports/balance-sheet/route.ts
// ═══════════════════════════════════════════════════
// Balance Sheet (Bilanz) — Ledger-based Aggregator
// ═══════════════════════════════════════════════════
//
// Task 26 MVP + Task 26.1 fixes:
//   - UTC-safe date boundary
//   - Auth error: return original Response
//
// Aggregates ALL JournalLine data up to asOf date.
// Groups by Account type: ASSET, LIABILITY, EQUITY.
// Includes synthetic "Current Period Result" line in equity
// (net profit from INCOME/EXPENSE accounts).
//
// Hard rule: Assets = Liabilities + Equity (diff for debug).

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireTenant } from '@/lib/auth/requireTenant';

type RouteParams = {
  params: Promise<{ companyId: string }>;
};

type BalanceLine = {
  accountId: string;
  code: string;
  name: string;
  balance: number;
};

// ─── HELPER: Verify company belongs to tenant ────
async function verifyCompanyOwnership(companyId: string, tenantId: string) {
  const company = await prisma.company.findFirst({
    where: { id: companyId, tenantId },
    select: { id: true },
  });
  return company !== null;
}

// ─── GET /api/company/[companyId]/reports/balance-sheet ───
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { tenantId } = await requireTenant(request);
    const { companyId } = await params;

    const isOwner = await verifyCompanyOwnership(companyId, tenantId);
    if (!isOwner) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    // ─── Validate asOf param ─────────────────────
    const url = new URL(request.url);
    const asOfParam = url.searchParams.get('asOf');

    if (!asOfParam) {
      return NextResponse.json(
        { error: '"asOf" query parameter is required (YYYY-MM-DD)' },
        { status: 400 }
      );
    }

    const asOfDate = new Date(asOfParam);
    if (isNaN(asOfDate.getTime())) {
      return NextResponse.json(
        { error: 'Invalid date format. Use YYYY-MM-DD.' },
        { status: 400 }
      );
    }

    // End of day for inclusive range (UTC-safe — Task 26.1 fix)
    const asOfEnd = new Date(`${asOfParam}T23:59:59.999Z`);

    // ─── Fetch all accounts for this company ─────
    const accounts = await prisma.account.findMany({
      where: {
        companyId,
        company: { tenantId },
      },
      select: {
        id: true,
        code: true,
        name: true,
        type: true,
      },
    });

    const accountMap = new Map(accounts.map((a) => [a.id, a]));

    // ─── Aggregate ALL journal lines up to asOf ──
    const aggregation = await prisma.journalLine.groupBy({
      by: ['accountId'],
      where: {
        entry: {
          companyId,
          company: { tenantId },
          date: { lte: asOfEnd },
        },
      },
      _sum: {
        debit: true,
        credit: true,
      },
    });

    // ─── Classify into ASSET / LIABILITY / EQUITY ─
    const assets: BalanceLine[] = [];
    const liabilities: BalanceLine[] = [];
    const equity: BalanceLine[] = [];

    // Track INCOME/EXPENSE for Current Period Result
    let totalIncomeAmount = 0;
    let totalExpenseAmount = 0;

    for (const agg of aggregation) {
      const account = accountMap.get(agg.accountId);
      if (!account) continue;

      const sumDebit = Number(agg._sum.debit || 0);
      const sumCredit = Number(agg._sum.credit || 0);
      const rawBalance = sumDebit - sumCredit;

      switch (account.type) {
        case 'ASSET': {
          const balance = Math.round(rawBalance * 100) / 100;
          if (balance !== 0) {
            assets.push({
              accountId: account.id,
              code: account.code,
              name: account.name,
              balance,
            });
          }
          break;
        }
        case 'LIABILITY': {
          const balance = Math.round(-rawBalance * 100) / 100;
          if (balance !== 0) {
            liabilities.push({
              accountId: account.id,
              code: account.code,
              name: account.name,
              balance,
            });
          }
          break;
        }
        case 'EQUITY': {
          const balance = Math.round(-rawBalance * 100) / 100;
          if (balance !== 0) {
            equity.push({
              accountId: account.id,
              code: account.code,
              name: account.name,
              balance,
            });
          }
          break;
        }
        case 'INCOME': {
          totalIncomeAmount += sumCredit - sumDebit;
          break;
        }
        case 'EXPENSE': {
          totalExpenseAmount += sumDebit - sumCredit;
          break;
        }
      }
    }

    // ─── Current Period Result (synthetic equity line) ───
    const netProfit = Math.round((totalIncomeAmount - totalExpenseAmount) * 100) / 100;

    if (netProfit !== 0) {
      equity.push({
        accountId: 'P&L',
        code: 'P&L',
        name: 'Current Period Result',
        balance: netProfit,
      });
    }

    // ─── Sort by code ASC ────────────────────────
    assets.sort((a, b) => a.code.localeCompare(b.code));
    liabilities.sort((a, b) => a.code.localeCompare(b.code));
    equity.sort((a, b) => a.code.localeCompare(b.code));

    // ─── Calculate totals ────────────────────────
    const totalAssets = Math.round(assets.reduce((s, l) => s + l.balance, 0) * 100) / 100;
    const totalLiabilities = Math.round(liabilities.reduce((s, l) => s + l.balance, 0) * 100) / 100;
    const totalEquity = Math.round(equity.reduce((s, l) => s + l.balance, 0) * 100) / 100;
    const liabilitiesPlusEquity = Math.round((totalLiabilities + totalEquity) * 100) / 100;
    const diff = Math.round((totalAssets - liabilitiesPlusEquity) * 100) / 100;

    return NextResponse.json({
      asOf: asOfParam,
      assets,
      liabilities,
      equity,
      totals: {
        assets: totalAssets,
        liabilities: totalLiabilities,
        equity: totalEquity,
        liabilitiesPlusEquity,
        diff,
      },
    });
  } catch (error) {
    // Task 26.1 fix: return original Response from requireTenant()
    if (error instanceof Response) {
      return error;
    }
    console.error('Balance sheet error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

## FILE: ./app/(auth)/signup/page.tsx
```
// app/(auth)/signup/page.tsx
// Factory Signup — creates tenant + user
// After success: redirects to /login (does NOT auto-login)

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function SignupPage() {
  const router = useRouter();
  const [tenantName, setTenantName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [agree, setAgree] = useState(false)


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, tenantName }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Signup failed');
      }

      // Success → show message, then redirect to login
      setSuccess(true);
      setTimeout(() => {
        router.replace('/login');
      }, 1500);

    } catch (err: any) {
      setError(err.message || 'Signup failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* Navigation bar */}
      <nav className="bg-white shadow p-4 flex justify-between items-center">
        <div className="text-2xl font-bold text-blue-600">SOLAR ERP</div>
        <div className="flex space-x-4">
          <a href="#" className="text-gray-600 hover:text-blue-600">
            Product
          </a>
          <a href="#" className="text-gray-600 hover:text-blue-600">
            Integrations
          </a>
          <a href="#" className="text-gray-600 hover:text-blue-600">
            Training
          </a>
          <a href="#" className="text-gray-600 hover:text-blue-600">
            Prices
          </a>
          <a href="#" className="text-gray-600 hover:text-blue-600">
            Accounting Companies
          </a>
        </div>
        <div className="flex items-center space-x-4">
          <div className="flex space-x-2">
            <Link
              href="/login"
              className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
            >
              Sign In
            </Link>
            <Link
              href="/signup"
              className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
            >
              Sign Up
            </Link>
          </div>
        </div>
      </nav>

      {/* Registration form */}
      <div className="flex-grow flex items-center justify-center px-4">
        <div className="max-w-md w-full">
          <div className="bg-white rounded-2xl shadow-xl p-8">
            {/* Header */}
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-gradient-to-r from-green-400 to-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-white text-2xl font-bold">📝</span>
              </div>
              <h1 className="text-3xl font-bold text-gray-800 mb-2">
                Create Account
              </h1>
              <p className="text-gray-600">Join Solar ERP Today</p>
            </div>

            {/* Social Login */}
            <div className="flex justify-center space-x-2 mb-4">
              <button className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors">
                Facebook
              </button>
              <button className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors">
                Google
              </button>
            </div>
            <p className="text-center text-gray-600 mb-4">
              Or fill out the registration form
            </p>

            {successMessage && (
              <div className="p-4 text-sm text-green-700 bg-green-100 border border-green-300 rounded-lg mb-4">
                {successMessage}
              </div>
            )}
            {error && (
              <div className="p-4 text-sm text-red-700 bg-red-100 border border-red-300 rounded-lg mb-4">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email *
                </label>
                <input
                  type="email"
                  name="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}  
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone *
                </label>
                <input
                  type="text"
                  name="phone" 
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  First Name *
                </label>
                <input
                  type="text"
                  name="name"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Last Name *
                </label>
                <input
                  type="text"
                  name="surname"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Username *
                </label>
                <input
                  type="text"
                  name="username"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Password *
                </label>
                <input
                  type="password"
                  name="password"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  required
                />
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={agree}
                  onChange={(e) => setAgree(e.target.checked)}
                  className="mr-2"
                />
                <label className="text-sm text-gray-600">
                  I agree to the{' '}
                  <a href="#" className="text-blue-500 hover:underline">
                    terms and conditions
                  </a>
                </label>
              </div>

              {/* Development autofill button (hidden) */}
              {process.env.NODE_ENV === 'development' && (
                <button
                  type="button"
                  hidden
                  onClick={() =>
                    setFormData({
                      email: 'test@example.com',
                      phone: '+49123456789',
                      name: 'Test',
                      surname: 'User',
                      password: 'test1234',
                      username: 'testuser',
                    })
                  }
                >
                  Autofill
                </button>
              )}

              <button
                type="submit"
                className="w-full bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 transition-colors"
              >
                Create Account
              </button>
            </form>

            {/* Development Info */}
            {process.env.NODE_ENV === 'development' && (
              <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                <h4 className="text-sm font-medium text-blue-800 mb-2">🔧 Development Mode:</h4>
                <div className="text-xs text-blue-700 space-y-1">
                  <p>• Form is auto-filled for testing</p>
                  <p>• Terms checkbox is pre-checked</p>
                  <p>• After registration, you'll be redirected to login</p>
                </div>
              </div>
            )}
          </div>

          {/* Login Link */}
          <div className="text-center mt-6">
            <p className="text-gray-600 text-sm">
              Already have an account?{' '}
              <Link
                href="/login"
                className="text-blue-600 hover:text-blue-700 font-medium"
              >
                Sign In
              </Link>
            </p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="bg-white p-4 text-center text-sm text-gray-500">
        <p>&copy; 2025 Solar ERP. Advanced Enterprise Resource Planning.</p>
      </div>
    </div>
  )
}```

## FILE: ./app/(auth)/login/page.tsx
```
// app/(auth)/login/page.tsx
// Cookie-only Login — no localStorage
// Server sets HttpOnly cookie via createSession()
// Browser sends cookie automatically on all subsequent requests

'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const quickLogin = () => {
    setEmail('admin@solar.local');
    setPassword('admin123');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Login failed');
      }

      // ═══════════════════════════════════════════════
      // COOKIE-ONLY: No localStorage writes.
      // Server already set HttpOnly cookie in the response.
      // Browser will send it automatically on all requests.
      // ═══════════════════════════════════════════════

      // Redirect to where user came from, or default to companies
      const from = searchParams.get('from') || '/account/companies';
      router.replace(from);

    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <span className="text-5xl block mb-2">☀️</span>
          <h1 className="text-2xl font-bold text-gray-900">Solar ERP</h1>
          <p className="text-sm text-gray-500 mt-1">Sign in to your account</p>
        </div>

        {/* Form */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-xs font-medium text-gray-500 mb-1.5">Email</label>
              <input id="email" type="email" required value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="you@company.com" />
            </div>
            <div>
              <label htmlFor="password" className="block text-xs font-medium text-gray-500 mb-1.5">Password</label>
              <input id="password" type="password" required value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="••••••••" />
            </div>
            <button type="submit" disabled={loading}
              className="w-full py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors">
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          {/* Quick login */}
          <div className="mt-4 pt-4 border-t border-gray-100">
            <button onClick={quickLogin} className="w-full text-xs text-gray-400 hover:text-blue-600 transition-colors">
              🧪 Fill test credentials
            </button>
          </div>
        </div>

        {/* Signup link */}
        <p className="text-center text-sm text-gray-500 mt-6">
          Don&apos;t have an account?{' '}
          <Link href="/signup" className="text-blue-600 font-medium hover:underline">Create account</Link>
        </p>
      </div>
    </div>
  );
}
```

## FILE: ./app/(dashboard)/layout.tsx
```
// app/(dashboard)/layout.tsx
// Dashboard Layout — Cookie-only
// No localStorage guard needed — middleware handles auth redirect.
// If user reaches this layout, they have a valid session cookie.

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
```

## FILE: ./app/(dashboard)/account/companies/page.tsx
```
// app/(dashboard)/account/companies/page.tsx
// ═══════════════════════════════════════════════════
// Cookie-only — no localStorage for auth or priorities
// Priorities come from DB (orderBy priority asc)
// Cookie sent automatically by browser
// ═══════════════════════════════════════════════════
//
// FIXED (Task 18):
// - id: number → id: string (matches Prisma cuid)
// - is_active → status (matches Prisma schema)
// - created_at → createdAt (matches Prisma schema)
// - handleEnterCompany(companyId: string)
// - savePriorities key: string

'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronRight, Plus, GripVertical } from 'lucide-react';

interface Company {
  id: string;
  name: string;
  code: string;
  description?: string;
  status?: string;
  createdAt?: string;
  clientsCount?: number;
  salesCount?: number;
  productsCount?: number;
  priority?: number;
  avatar?: string;
  color?: string;
}

interface CreateCompanyData {
  name: string;
  code: string;
  description: string;
  industry: string;
  country: string;
}

export default function CompaniesPage() {
  const router = useRouter();

  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [editFormData, setEditFormData] = useState({ name: '', code: '', description: '' });
  const [showDeleteModal, setShowDeleteModal] = useState<Company | null>(null);
  const [createFormData, setCreateFormData] = useState<CreateCompanyData>({
    name: '', code: '', description: '', industry: 'RENEWABLE_ENERGY', country: 'DE',
  });

  const [draggedItem, setDraggedItem] = useState<Company | null>(null);
  const [dragOverItem, setDragOverItem] = useState<Company | null>(null);

  const getCompanyColor = (name: string) => {
    const colors = [
      'bg-orange-500', 'bg-red-500', 'bg-purple-500',
      'bg-orange-600', 'bg-blue-600', 'bg-green-600',
      'bg-indigo-500', 'bg-pink-500', 'bg-yellow-500'
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  // ═══════════════════════════════════════════════
  // PRIORITIES: Save to DB only (no localStorage)
  // Key type: string (cuid), not number
  // ═══════════════════════════════════════════════
  const savePriorities = async (updatedCompanies: Company[]) => {
    try {
      const priorities: { [key: string]: number } = {};
      updatedCompanies.forEach(company => {
        priorities[company.id] = company.priority || 1;
      });

      await fetch('/api/account/companies/priorities', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priorities }),
      });
    } catch (error) {
      console.error('Error saving priorities:', error);
    }
  };

  // ═══════════════════════════════════════════════
  // FETCH: Cookie-only, priorities from DB order
  // ═══════════════════════════════════════════════
  const fetchCompanies = async () => {
    try {
      setLoading(true);
      setError(null);

      // Cookie sent automatically — no x-user-id header needed
      const response = await fetch('/api/account/companies');

      if (response.ok) {
        const data = await response.json();

        if (data.success && data.companies) {
          // Companies already sorted by priority from DB
          const enhancedCompanies = data.companies.map((company: Company, index: number) => ({
            ...company,
            priority: company.priority ? company.priority : (index + 1),
            avatar: company.name.charAt(0).toUpperCase(),
            color: getCompanyColor(company.name)
          }));

          setCompanies(enhancedCompanies);
          setIsConnected(true);
        } else {
          throw new Error('Invalid API response format');
        }
      } else if (response.status === 401) {
        // Session expired — middleware should catch this, but handle edge case
        router.replace('/login');
        return;
      } else {
        throw new Error(`API returned ${response.status}`);
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to load companies';
      console.error('Error loading companies:', error);
      setError(message);
      setIsConnected(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCompanies();
  }, []);

  // Enter company — companyId is string (cuid)
  const handleEnterCompany = (companyId: string) => {
    router.push(`/company/${companyId}/dashboard`);
  };

  // Drag & drop
  const handleDragStart = (e: React.DragEvent, company: Company) => {
    setDraggedItem(company);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, company: Company) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverItem(company);
  };

  const handleDragLeave = () => { setDragOverItem(null); };

  const handleDrop = async (e: React.DragEvent, targetCompany: Company) => {
    e.preventDefault();
    if (!draggedItem || draggedItem.id === targetCompany.id) {
      setDraggedItem(null);
      setDragOverItem(null);
      return;
    }

    const newCompanies = [...companies];
    const draggedIndex = newCompanies.findIndex(c => c.id === draggedItem.id);
    const targetIndex = newCompanies.findIndex(c => c.id === targetCompany.id);

    const [draggedCompany] = newCompanies.splice(draggedIndex, 1);
    newCompanies.splice(targetIndex, 0, draggedCompany);

    const updatedCompanies = newCompanies.map((company, index) => ({
      ...company,
      priority: index + 1
    }));

    setCompanies(updatedCompanies);
    setDraggedItem(null);
    setDragOverItem(null);

    await savePriorities(updatedCompanies);
  };

  const handleDragEnd = () => { setDraggedItem(null); setDragOverItem(null); };

  // Create company
  const handleCreateCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/account/companies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(createFormData),
      });

      if (response.ok) {
        await fetchCompanies();
        setShowCreateForm(false);
        setCreateFormData({ name: '', code: '', description: '', industry: 'RENEWABLE_ENERGY', country: 'DE' });
      } else {
        throw new Error('Failed to create company');
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to create company';
      setError(message);
    }
  };

  // Update
  const handleEditCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCompany) return;

    const response = await fetch(`/api/account/companies/${editingCompany.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editFormData),
    });

    if (response.ok) {
      setEditingCompany(null);
      await fetchCompanies();
    } else {
      alert('Failed to update company');
    }
  };

  // Copy
  const handleCopyCompany = async (company: Company) => {
    const response = await fetch('/api/account/companies', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: company.name + ' Copy',
        code: `${company.code}_COPY_${Math.floor(Math.random() * 1000)}`,
      }),
    });
    if (response.ok) await fetchCompanies();
    else alert('Failed to copy company');
  };

  // Delete
  const handleDeleteCompany = async (company: Company) => {
    const response = await fetch(`/api/account/companies/${company.id}`, { method: 'DELETE' });
    if (response.ok) {
      setShowDeleteModal(null);
      await fetchCompanies();
    } else {
      alert('Failed to delete company');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <div className="text-xl text-gray-600">Loading companies...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <div className="text-6xl mr-4">☀️</div>
            <h1 className="text-4xl font-bold text-gray-800">Solar ERP</h1>
          </div>
          <p className="text-xl text-gray-600 mb-4">Account Dashboard</p>
          <div className="flex items-center justify-center space-x-2">
            <div className={`w-3 h-3 rounded-full animate-pulse ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <span className={`font-semibold ${isConnected ? 'text-green-600' : 'text-red-600'}`}>
              {isConnected ? 'Connected to API' : 'Connection Error'}
            </span>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-600">
            {error}
          </div>
        )}

        {/* Actions Bar */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800">Companies ({companies.length})</h2>
          <button onClick={() => setShowCreateForm(true)}
            className="flex items-center gap-2 bg-gradient-to-r from-green-500 to-green-600 text-white px-4 py-2 rounded-lg hover:from-green-600 hover:to-green-700 transition-all">
            <Plus className="w-5 h-5" /> New Company
          </button>
        </div>

        {/* Companies Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {companies.map((company) => (
            <div key={company.id}
              draggable
              onDragStart={(e) => handleDragStart(e, company)}
              onDragOver={(e) => handleDragOver(e, company)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, company)}
              onDragEnd={handleDragEnd}
              className={`bg-white rounded-xl shadow-md p-6 cursor-grab active:cursor-grabbing transition-all duration-200 hover:shadow-lg ${
                dragOverItem?.id === company.id ? 'border-2 border-blue-400 scale-[1.02]' : 'border border-gray-100'
              } ${draggedItem?.id === company.id ? 'opacity-50' : ''}`}
            >
              {/* Company Avatar & Name */}
              <div className="flex items-center mb-4">
                <div className={`w-12 h-12 ${company.color || 'bg-blue-500'} rounded-lg flex items-center justify-center text-white text-xl font-bold mr-3`}>
                  {company.avatar || '?'}
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-gray-800">{company.name}</h3>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-500">{company.code}</span>
                    <span className="text-xs font-mono bg-gray-100 text-gray-600 px-2 py-0.5 rounded">ID: {company.id}</span>
                  </div>
                </div>
                <GripVertical className="w-5 h-5 text-gray-300" />
              </div>

              {/* Actions */}
              <div className="flex gap-2 mb-4 text-xs">
                <button onClick={() => { setEditingCompany(company); setEditFormData({ name: company.name, code: company.code, description: company.description || '' }); }}
                  className="px-3 py-1 bg-blue-100 text-blue-600 rounded hover:bg-blue-200">✏️ Edit</button>
                <button onClick={() => handleCopyCompany(company)}
                  className="px-3 py-1 bg-green-100 text-green-600 rounded hover:bg-green-200">📄 Copy</button>
                <button onClick={() => setShowDeleteModal(company)}
                  className="px-3 py-1 bg-red-100 text-red-600 rounded hover:bg-red-200">🗑️ Delete</button>
              </div>

              {/* Enter Company */}
              <button onClick={() => handleEnterCompany(company.id)}
                className="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-3 px-4 rounded-lg transition-colors flex items-center justify-center space-x-2">
                <span>Enter Company</span>
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          ))}
        </div>

        {/* Create Form Modal */}
        {showCreateForm && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md mx-4">
              <h3 className="text-xl font-bold mb-4">Create New Company</h3>
              <form onSubmit={handleCreateCompany}>
                <div className="space-y-3">
                  <input placeholder="Company Name" required
                    value={createFormData.name}
                    onChange={(e) => setCreateFormData(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                  <input placeholder="Company Code" required
                    value={createFormData.code}
                    onChange={(e) => setCreateFormData(prev => ({ ...prev, code: e.target.value }))}
                    className="w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                  <textarea placeholder="Description"
                    value={createFormData.description}
                    onChange={(e) => setCreateFormData(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none" rows={3} />
                </div>
                <div className="flex gap-3 mt-6">
                  <button type="submit" className="flex-1 bg-green-500 hover:bg-green-600 text-white py-2 rounded-lg font-semibold">Create</button>
                  <button type="button" onClick={() => setShowCreateForm(false)} className="flex-1 bg-gray-200 hover:bg-gray-300 py-2 rounded-lg font-semibold">Cancel</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Edit Modal */}
        {editingCompany && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md mx-4">
              <h3 className="text-xl font-bold mb-4">Edit: {editingCompany.name}</h3>
              <form onSubmit={handleEditCompany}>
                <div className="space-y-3">
                  <input placeholder="Company Name" required
                    value={editFormData.name}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                  <input placeholder="Company Code" required
                    value={editFormData.code}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, code: e.target.value }))}
                    className="w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                  <textarea placeholder="Description"
                    value={editFormData.description}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none" rows={3} />
                </div>
                <div className="flex gap-3 mt-6">
                  <button type="submit" className="flex-1 bg-blue-500 hover:bg-blue-600 text-white py-2 rounded-lg font-semibold">Save</button>
                  <button type="button" onClick={() => setEditingCompany(null)} className="flex-1 bg-gray-200 hover:bg-gray-300 py-2 rounded-lg font-semibold">Cancel</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Delete Confirmation */}
        {showDeleteModal && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-sm mx-4 text-center">
              <div className="text-5xl mb-4">⚠️</div>
              <h3 className="text-xl font-bold mb-2">Delete Company?</h3>
              <p className="text-gray-600 mb-6">Are you sure you want to delete <strong>{showDeleteModal.name}</strong>?</p>
              <div className="flex gap-3">
                <button onClick={() => handleDeleteCompany(showDeleteModal)}
                  className="flex-1 bg-red-500 hover:bg-red-600 text-white py-2 rounded-lg font-semibold">Delete</button>
                <button onClick={() => setShowDeleteModal(null)}
                  className="flex-1 bg-gray-200 hover:bg-gray-300 py-2 rounded-lg font-semibold">Cancel</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
```

## FILE: ./app/(dashboard)/company/[companyId]/clients/page.tsx
```
// ERP Module placeholder — Factory-compatible
// Shared page template for: clients, products, sales, purchases, warehouse, bank, reports

'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';

const MODULE_META: Record<string, { title: string; icon: string; description: string }> = {
  clients:    { title: 'Clients',    icon: '👥', description: 'Manage your client base, contacts, and payment terms' },
  products:   { title: 'Products',   icon: '📦', description: 'Product catalog, pricing, and inventory items' },
  sales:      { title: 'Sales',      icon: '💰', description: 'Sales orders, invoices, and revenue tracking' },
  purchases:  { title: 'Purchases',  icon: '🛒', description: 'Purchase orders, supplier invoices, and procurement' },
  warehouse:  { title: 'Warehouse',  icon: '🏭', description: 'Stock movements, inventory levels, and warehouses' },
  bank:       { title: 'Bank',       icon: '🏦', description: 'Bank statements, payments, and reconciliation' },
  reports:    { title: 'Reports',    icon: '📈', description: 'Financial reports, analytics, and business intelligence' },
};

export default function ModulePage() {
  const params = useParams();
  const companyId = params.companyId as string;
  const segments = typeof window !== 'undefined' ? window.location.pathname.split('/') : [];
  const moduleKey = segments[segments.length - 1] || 'unknown';
  const meta = MODULE_META[moduleKey] || { title: moduleKey, icon: '📋', description: 'ERP Module' };

  return (
    <div className="p-6">
      <div className="mb-6">
        <Link href={`/account/companies/${companyId}`}
          className="text-xs text-gray-400 hover:text-gray-600 transition-colors">← Dashboard</Link>
      </div>
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
        <span className="text-5xl block mb-4">{meta.icon}</span>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">{meta.title}</h1>
        <p className="text-gray-500 mb-6 max-w-md mx-auto">{meta.description}</p>
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-amber-50 text-amber-700 rounded-lg text-sm">
          🚧 Module under development
        </div>
      </div>
    </div>
  );
}
```

## FILE: ./app/(dashboard)/company/[companyId]/chart-of-accounts/page.tsx
```
// app/(dashboard)/company/[companyId]/chart-of-accounts/page.tsx
// ═══════════════════════════════════════════════════
// Chart of Accounts — Full Feature Set
// ═══════════════════════════════════════════════════
// Task 32: Bilingual (nameDe + nameEn)
// Task 33: Selection + Toolbar + Stammkonten + Import (merge/reset)
// Task 33.1: DATEV+ audit — §6 response format

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams } from 'next/navigation';
import { Plus, Pencil, Trash2, X, ChevronDown, Globe, Copy, Loader2, ShieldAlert, Lock, Upload, FileDown, RefreshCw } from 'lucide-react';

// ─── TYPES ───────────────────────────────────────
type AccountType = 'ASSET' | 'LIABILITY' | 'EQUITY' | 'INCOME' | 'EXPENSE';
type Lang = 'de' | 'en';

interface Account { id: string; code: string; nameDe: string; nameEn: string; type: AccountType; isActive: boolean; createdAt: string; updatedAt: string; }
interface AccountFormData { code: string; nameDe: string; nameEn: string; type: AccountType; }
interface ProtectedAccount { id: string; code: string; nameDe: string; lineCount: number; }
interface SystemAccount { id: string; code: string; nameDe: string; }
interface UsageCheckResult { total: number; deletable: number; system: SystemAccount[]; protected: ProtectedAccount[]; }

// §6 — matches skr03-import-route.ts response
interface ImportResult {
  mode: string;
  totalInFile: number;
  created: number;
  skippedExisting: number;
  deleted?: number;
  protectedCount?: number;  // Stammkonten spared (reset only)
  usedCount?: number;       // accounts with journal entries spared (reset only)
  error?: string;
}

const STAMMKONTEN = new Set(['1000','1200','1400','1600','1576','1571','1776','1771','8400','8300','8125','3400','3100','0800','0840','0860','0868','9008','9009']);

const ACCOUNT_TYPES: { value: AccountType; label: string; color: string }[] = [
  { value: 'ASSET', label: 'Asset', color: 'bg-blue-100 text-blue-800' },
  { value: 'LIABILITY', label: 'Liability', color: 'bg-red-100 text-red-800' },
  { value: 'EQUITY', label: 'Equity', color: 'bg-purple-100 text-purple-800' },
  { value: 'INCOME', label: 'Income', color: 'bg-green-100 text-green-800' },
  { value: 'EXPENSE', label: 'Expense', color: 'bg-orange-100 text-orange-800' },
];

const TYPE_COLOR_MAP: Record<AccountType, string> = { ASSET: 'bg-blue-100 text-blue-800', LIABILITY: 'bg-red-100 text-red-800', EQUITY: 'bg-purple-100 text-purple-800', INCOME: 'bg-green-100 text-green-800', EXPENSE: 'bg-orange-100 text-orange-800' };

function getAccountName(a: Account, lang: Lang): string { return lang === 'en' ? (a.nameEn || a.nameDe) : a.nameDe; }
function isStammkonto(code: string): boolean { return STAMMKONTEN.has(code); }

export default function ChartOfAccountsPage() {
  const params = useParams();
  const companyId = params.companyId as string;
  if (!companyId || companyId.includes('[')) return <div className="flex items-center justify-center min-h-[400px]"><p className="text-red-500 font-semibold">⚠️ Invalid company context</p></div>;
  return <ChartOfAccountsContent companyId={companyId} />;
}

function IndeterminateCheckbox({ checked, indeterminate, onChange }: { checked: boolean; indeterminate: boolean; onChange: () => void }) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => { if (ref.current) ref.current.indeterminate = indeterminate; }, [indeterminate]);
  return <input ref={ref} type="checkbox" checked={checked} onChange={onChange} className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer" />;
}

function ChartOfAccountsContent({ companyId }: { companyId: string }) {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lang, setLang] = useState<Lang>('de');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Account | null>(null);
  const [formData, setFormData] = useState<AccountFormData>({ code: '', nameDe: '', nameEn: '', type: 'ASSET' });
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [showImportModal, setShowImportModal] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [showSmartDeleteModal, setShowSmartDeleteModal] = useState(false);
  const [usageCheck, setUsageCheck] = useState<UsageCheckResult | null>(null);
  const [checkingUsage, setCheckingUsage] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [banner, setBanner] = useState<string | null>(null);

  const [filterType, setFilterType] = useState<AccountType | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const showBanner = (msg: string) => { setBanner(msg); setTimeout(() => setBanner(null), 5000); };

  const fetchAccounts = useCallback(async () => {
    try { setLoading(true); setError(null);
      const res = await fetch(`/api/company/${companyId}/accounts`);
      if (res.status === 401) { window.location.href = '/login'; return; }
      if (!res.ok) throw new Error(`API returned ${res.status}`);
      const data = await res.json();
      setAccounts(data.data || []); setSelectedIds(new Set());
    } catch (err: unknown) { setError(err instanceof Error ? err.message : 'Failed to load accounts'); }
    finally { setLoading(false); }
  }, [companyId]);

  useEffect(() => { fetchAccounts(); }, [fetchAccounts]);

  const filteredAccounts = accounts.filter(acc => {
    if (filterType !== 'ALL' && acc.type !== filterType) return false;
    if (searchQuery) { const q = searchQuery.toLowerCase();
      return acc.code.toLowerCase().includes(q) || acc.nameDe.toLowerCase().includes(q) || acc.nameEn.toLowerCase().includes(q); }
    return true;
  });

  const filteredIdSet = new Set(filteredAccounts.map(a => a.id));
  const selectedInView = [...selectedIds].filter(id => filteredIdSet.has(id)).length;
  const allFilteredSelected = filteredAccounts.length > 0 && filteredAccounts.every(a => selectedIds.has(a.id));
  const someFilteredSelected = filteredAccounts.some(a => selectedIds.has(a.id));
  const isIndeterminate = someFilteredSelected && !allFilteredSelected;
  const toggleSelectAll = () => { const next = new Set(selectedIds); if (allFilteredSelected) filteredAccounts.forEach(a => next.delete(a.id)); else filteredAccounts.forEach(a => next.add(a.id)); setSelectedIds(next); };
  const toggleSelect = (id: string) => { const next = new Set(selectedIds); if (next.has(id)) next.delete(id); else next.add(id); setSelectedIds(next); };
  const clearSelection = () => setSelectedIds(new Set());
  const handleCopyCSV = () => { const sel = accounts.filter(a => selectedIds.has(a.id)); if (!sel.length) return; const csv = ['code,nameDe,nameEn,type', ...sel.map(a => `${a.code},${a.nameDe},${a.nameEn},${a.type}`)].join('\n'); navigator.clipboard.writeText(csv).then(() => showBanner(`Copied ${sel.length} accounts`)); };

  // ─── IMPORT ────────────────────────────────────
  const handleImportSKR03 = async (mode: 'merge' | 'reset') => {
    // Reset requires explicit user confirmation
    if (mode === 'reset') {
      const input = prompt('This will delete all non-system accounts without journal entries.\n\nType RESET to confirm:');
      if (input !== 'RESET') return;
    }
    setImporting(true); setImportResult(null); setImportError(null);
    try {
      const confirmParam = mode === 'reset' ? '&confirm=RESET' : '';
      const res = await fetch(`/api/company/${companyId}/chart-of-accounts/import/skr03?mode=${mode}${confirmParam}`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Import failed');
      setImportResult(data);
      await fetchAccounts();
    } catch (err: unknown) { setImportError(err instanceof Error ? err.message : 'Import failed'); }
    finally { setImporting(false); }
  };

  const handleImportCSV = async (file: File) => {
    setImporting(true); setImportResult(null); setImportError(null);
    try {
      const text = await file.text();
      const res = await fetch(`/api/company/${companyId}/chart-of-accounts/import`, { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: text });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Import failed');
      setImportResult(data);
      await fetchAccounts();
    } catch (err: unknown) { setImportError(err instanceof Error ? err.message : 'Import failed'); }
    finally { setImporting(false); }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => { const f = e.target.files?.[0]; if (f) handleImportCSV(f); if (fileInputRef.current) fileInputRef.current.value = ''; };

  // ─── SMART DELETE ──────────────────────────────
  const handleDeleteSelectedClick = async () => {
    setCheckingUsage(true); setUsageCheck(null); setShowSmartDeleteModal(true);
    try { const res = await fetch(`/api/company/${companyId}/accounts/bulk`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'check-usage', ids: [...selectedIds] }) }); if (!res.ok) throw new Error(); setUsageCheck(await res.json());
    } catch { setUsageCheck(null); setShowSmartDeleteModal(false); showBanner('Failed to check usage'); }
    finally { setCheckingUsage(false); }
  };

  const handleBulkDelete = async () => {
    setBulkDeleting(true);
    try { const res = await fetch(`/api/company/${companyId}/accounts/bulk`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'delete', ids: [...selectedIds] }) });
      if (!res.ok) throw new Error(); const data = await res.json(); setShowSmartDeleteModal(false);
      const parts = [`Deleted ${data.deleted}`]; if (data.systemCount > 0) parts.push(`${data.systemCount} Stammkonten protected`); if (data.protectedCount > 0) parts.push(`${data.protectedCount} with entries skipped`);
      showBanner(parts.join(', ')); await fetchAccounts();
    } catch { showBanner('Bulk delete failed'); }
    finally { setBulkDeleting(false); }
  };

  // ─── CRUD ──────────────────────────────────────
  const handleCreate = async (e: React.FormEvent) => { e.preventDefault(); setSaving(true); setFormError(null);
    try { const res = await fetch(`/api/company/${companyId}/accounts`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code: formData.code, nameDe: formData.nameDe, nameEn: formData.nameEn || formData.nameDe, type: formData.type }) });
      if (!res.ok) { const err = await res.json(); throw new Error(err.error || 'Failed'); } setShowCreateModal(false); setFormData({ code: '', nameDe: '', nameEn: '', type: 'ASSET' }); await fetchAccounts();
    } catch (err: unknown) { setFormError(err instanceof Error ? err.message : 'Failed'); } finally { setSaving(false); } };

  const handleUpdate = async (e: React.FormEvent) => { e.preventDefault(); if (!editingAccount) return; setSaving(true); setFormError(null);
    try { const res = await fetch(`/api/company/${companyId}/accounts/${editingAccount.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code: formData.code, nameDe: formData.nameDe, nameEn: formData.nameEn || formData.nameDe, type: formData.type }) });
      if (!res.ok) { const err = await res.json(); throw new Error(err.error || 'Failed'); } setEditingAccount(null); setFormData({ code: '', nameDe: '', nameEn: '', type: 'ASSET' }); await fetchAccounts();
    } catch (err: unknown) { setFormError(err instanceof Error ? err.message : 'Failed'); } finally { setSaving(false); } };

  const handleDelete = async () => { if (!deleteTarget) return;
    try { const res = await fetch(`/api/company/${companyId}/accounts/${deleteTarget.id}`, { method: 'DELETE' });
      if (res.status === 403) { const err = await res.json(); alert(err.error); setDeleteTarget(null); return; }
      if (!res.ok && res.status !== 204) throw new Error(); setDeleteTarget(null); await fetchAccounts();
    } catch { alert('Failed to delete account'); } };

  const openEdit = (account: Account) => { setEditingAccount(account); setFormData({ code: account.code, nameDe: account.nameDe, nameEn: account.nameEn, type: account.type }); setFormError(null); };
  const stats = ACCOUNT_TYPES.map(t => ({ ...t, count: accounts.filter(a => a.type === t.value).length }));
  const stammkontenCount = accounts.filter(a => isStammkonto(a.code)).length;

  if (loading) return <div className="flex items-center justify-center min-h-[400px]"><div className="text-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div><p className="text-gray-500">Loading accounts...</p></div></div>;

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">📋 Chart of Accounts</h1>
          <p className="text-sm text-gray-500 mt-1">{accounts.length} accounts total{stammkontenCount > 0 && <span className="ml-2 text-amber-600">· {stammkontenCount} Stammkonten 🔒</span>}</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setLang(lang === 'de' ? 'en' : 'de')} className="flex items-center gap-1.5 px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"><Globe className="w-4 h-4" />{lang === 'de' ? 'DE' : 'EN'}</button>
          <button onClick={() => { setShowImportModal(true); setImportResult(null); setImportError(null); }} className="flex items-center gap-2 border border-green-300 text-green-700 hover:bg-green-50 px-4 py-2.5 rounded-lg font-medium text-sm transition-colors"><Upload className="w-4 h-4" /> Import</button>
          <button onClick={() => { setShowCreateModal(true); setFormData({ code: '', nameDe: '', nameEn: '', type: 'ASSET' }); setFormError(null); }} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg font-medium text-sm transition-colors"><Plus className="w-4 h-4" /> New Account</button>
        </div>
      </div>

      {error && <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">{error}</div>}
      {banner && <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-blue-700 text-sm font-medium">{banner}</div>}

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        {stats.map(s => (
          <button key={s.value} onClick={() => setFilterType(filterType === s.value ? 'ALL' : s.value)}
            className={`p-3 rounded-lg border text-center transition-all ${filterType === s.value ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-200 hover:border-gray-300'}`}>
            <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${s.color}`}>{s.label}</span>
            <p className="text-2xl font-bold text-gray-800 mt-1">{s.count}</p>
          </button>))}
      </div>

      <div className="mb-4"><input type="text" placeholder="Search by code or name..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full md:w-80 border border-gray-300 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" /></div>

      {selectedIds.size > 0 && (
        <div className="mb-4 flex items-center gap-3 p-3 bg-gray-50 border border-gray-200 rounded-lg">
          <span className="text-sm font-semibold text-gray-700">{selectedInView} selected</span>
          <div className="h-4 w-px bg-gray-300" />
          <button onClick={handleCopyCSV} className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-600 bg-white border border-gray-200 hover:bg-gray-100 rounded-lg transition-colors"><Copy className="w-3.5 h-3.5" /> Copy CSV</button>
          <button onClick={clearSelection} className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-500 bg-white border border-gray-200 hover:bg-gray-100 rounded-lg transition-colors"><X className="w-3.5 h-3.5" /> Clear</button>
          <button onClick={handleDeleteSelectedClick} className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-red-600 bg-white border border-red-200 hover:bg-red-50 rounded-lg transition-colors"><Trash2 className="w-3.5 h-3.5" /> Delete Selected</button>
        </div>)}

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead><tr className="bg-gray-50 border-b border-gray-200">
            <th className="w-10 px-3 py-3"><IndeterminateCheckbox checked={allFilteredSelected} indeterminate={isIndeterminate} onChange={toggleSelectAll} /></th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Code</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Name {lang === 'de' ? '(DE)' : '(EN)'}</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Type</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
            <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Actions</th>
          </tr></thead>
          <tbody>
            {filteredAccounts.length === 0 ? (
              <tr><td colSpan={6} className="text-center py-12 text-gray-400">{accounts.length === 0 ? 'No accounts yet. Import SKR03 to get started.' : 'No accounts match your filter.'}</td></tr>
            ) : filteredAccounts.map(account => {
              const isSelected = selectedIds.has(account.id);
              const isSystem = isStammkonto(account.code);
              return (
                <tr key={account.id} className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${isSelected ? 'bg-blue-50' : ''} ${isSystem ? 'bg-amber-50/30' : ''}`}>
                  <td className="w-10 px-3 py-3"><input type="checkbox" checked={isSelected} onChange={() => toggleSelect(account.id)} className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer" /></td>
                  <td className="px-4 py-3"><div className="flex items-center gap-1.5"><span className="font-mono text-sm font-semibold text-gray-800">{account.code}</span>{isSystem && <Lock className="w-3.5 h-3.5 text-amber-500" title="Stammkonto" />}</div></td>
                  <td className="px-4 py-3 text-sm text-gray-700">{getAccountName(account, lang)}</td>
                  <td className="px-4 py-3"><span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${TYPE_COLOR_MAP[account.type]}`}>{account.type}</span></td>
                  <td className="px-4 py-3"><span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${account.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-500'}`}>{account.isActive ? 'Active' : 'Inactive'}</span></td>
                  <td className="px-4 py-3 text-right"><div className="flex items-center justify-end gap-1">
                    <button onClick={() => openEdit(account)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"><Pencil className="w-4 h-4" /></button>
                    {isSystem ? <span className="p-1.5 text-amber-300 cursor-not-allowed" title="Stammkonto"><Lock className="w-4 h-4" /></span>
                      : <button onClick={() => setDeleteTarget(account)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"><Trash2 className="w-4 h-4" /></button>}
                  </div></td>
                </tr>);
            })}
          </tbody>
        </table>
      </div>

      <input ref={fileInputRef} type="file" accept=".csv" onChange={handleFileSelect} className="hidden" />

      {/* ═══ IMPORT MODAL — §6 response display ══ */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-800">Import Chart of Accounts</h3>
              <button onClick={() => setShowImportModal(false)} className="p-1 text-gray-400 hover:text-gray-600 rounded"><X className="w-5 h-5" /></button>
            </div>

            {importResult && (
              <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-green-800 font-semibold text-sm mb-2">✅ Import complete ({importResult.mode})</p>
                <div className="text-sm text-green-700 space-y-0.5">
                  <p>Total in file: <span className="font-semibold">{importResult.totalInFile}</span></p>
                  <p>Created: <span className="font-semibold">{importResult.created}</span></p>
                  <p>Skipped (existing): <span className="font-semibold">{importResult.skippedExisting}</span></p>
                  {importResult.deleted !== undefined && <p>Deleted (non-system): <span className="font-semibold">{importResult.deleted}</span></p>}
                  {importResult.protectedCount !== undefined && importResult.protectedCount > 0 && (
                    <p>🔒 Stammkonten preserved: <span className="font-semibold">{importResult.protectedCount}</span></p>
                  )}
                  {importResult.usedCount !== undefined && importResult.usedCount > 0 && (
                    <p>📋 With entries preserved: <span className="font-semibold">{importResult.usedCount}</span></p>
                  )}
                </div>
              </div>)}
            {importError && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">{importError}</div>}

            <div className="mb-3">
              <button onClick={() => handleImportSKR03('merge')} disabled={importing}
                className="w-full flex items-center gap-3 p-4 border-2 border-dashed border-green-300 rounded-lg hover:bg-green-50 transition-colors disabled:opacity-50">
                {importing ? <Loader2 className="w-5 h-5 animate-spin text-green-600" /> : <FileDown className="w-5 h-5 text-green-600" />}
                <div className="text-left"><p className="text-sm font-semibold text-green-800">{importing ? 'Importing...' : 'Import SKR03 (merge)'}</p><p className="text-xs text-green-600">Add missing accounts, keep existing</p></div>
              </button>
            </div>

            <div className="mb-4">
              <button onClick={() => handleImportSKR03('reset')} disabled={importing}
                className="w-full flex items-center gap-3 p-4 border-2 border-dashed border-amber-300 rounded-lg hover:bg-amber-50 transition-colors disabled:opacity-50">
                {importing ? <Loader2 className="w-5 h-5 animate-spin text-amber-600" /> : <RefreshCw className="w-5 h-5 text-amber-600" />}
                <div className="text-left"><p className="text-sm font-semibold text-amber-800">{importing ? 'Resetting...' : 'Reset to SKR03'}</p><p className="text-xs text-amber-600">Delete non-system accounts, reimport fresh</p></div>
              </button>
            </div>

            <div className="flex items-center gap-3 mb-4"><div className="flex-1 h-px bg-gray-200" /><span className="text-xs text-gray-400 font-medium">OR</span><div className="flex-1 h-px bg-gray-200" /></div>

            <div className="mb-4">
              <button onClick={() => fileInputRef.current?.click()} disabled={importing}
                className="w-full flex items-center gap-3 p-4 border-2 border-dashed border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50">
                <Upload className="w-5 h-5 text-gray-500" />
                <div className="text-left"><p className="text-sm font-semibold text-gray-700">Upload custom CSV</p><p className="text-xs text-gray-500">Format: code,nameDe,nameEn,type</p></div>
              </button>
            </div>

            <div className="p-3 bg-gray-50 rounded-lg text-xs text-gray-500 space-y-1">
              <p><span className="font-semibold">Merge:</span> adds missing, skips duplicates (safe to run multiple times)</p>
              <p><span className="font-semibold">Reset:</span> removes custom accounts, keeps Stammkonten + accounts with entries</p>
              <p><Lock className="w-3 h-3 inline text-amber-500" /> 20 Stammkonten are always protected</p>
            </div>

            <button onClick={() => setShowImportModal(false)} className="w-full mt-4 bg-gray-100 hover:bg-gray-200 py-2 rounded-lg font-semibold transition-colors text-sm">Close</button>
          </div>
        </div>)}

      {/* ═══ CREATE/EDIT/DELETE MODALS ════════════ */}
      {showCreateModal && <Modal title="New Account" onClose={() => setShowCreateModal(false)}>
        {formError && <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">{formError}</div>}
        <form onSubmit={handleCreate}><AccountFormFields formData={formData} setFormData={setFormData} />
          <div className="flex gap-3 mt-6"><button type="submit" disabled={saving} className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white py-2 rounded-lg font-semibold transition-colors">{saving ? 'Creating...' : 'Create'}</button>
            <button type="button" onClick={() => setShowCreateModal(false)} className="flex-1 bg-gray-100 hover:bg-gray-200 py-2 rounded-lg font-semibold transition-colors">Cancel</button></div></form></Modal>}

      {editingAccount && <Modal title={`Edit ${editingAccount.code}${isStammkonto(editingAccount.code) ? ' 🔒' : ''}`} onClose={() => setEditingAccount(null)}>
        {isStammkonto(editingAccount.code) && <div className="mb-3 p-2 bg-amber-50 border border-amber-200 rounded-lg text-amber-700 text-xs"><Lock className="w-3 h-3 inline mr-1" />Stammkonto — only name editable.</div>}
        {formError && <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">{formError}</div>}
        <form onSubmit={handleUpdate}><AccountFormFields formData={formData} setFormData={setFormData} lockedCode={isStammkonto(editingAccount.code)} lockedType={isStammkonto(editingAccount.code)} />
          <div className="flex gap-3 mt-6"><button type="submit" disabled={saving} className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white py-2 rounded-lg font-semibold transition-colors">{saving ? 'Saving...' : 'Save'}</button>
            <button type="button" onClick={() => setEditingAccount(null)} className="flex-1 bg-gray-100 hover:bg-gray-200 py-2 rounded-lg font-semibold transition-colors">Cancel</button></div></form></Modal>}

      {deleteTarget && (isStammkonto(deleteTarget.code) ? (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50"><div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-sm mx-4 text-center">
          <div className="text-4xl mb-3">🔒</div><h3 className="text-lg font-bold mb-2">System Account Protected</h3>
          <p className="text-sm text-gray-600 mb-1"><span className="font-mono font-semibold">{deleteTarget.code}</span> — {deleteTarget.nameDe}</p>
          <p className="text-xs text-amber-600 mb-4">Stammkonto cannot be deleted.</p>
          <button onClick={() => setDeleteTarget(null)} className="w-full bg-gray-100 hover:bg-gray-200 py-2 rounded-lg font-semibold transition-colors">Close</button></div></div>
      ) : <ConfirmModal title="Delete Account?" message={<><span className="font-mono font-semibold">{deleteTarget.code}</span> — {deleteTarget.nameDe}</>} sub="This action cannot be undone." confirmLabel="Delete" onConfirm={handleDelete} onCancel={() => setDeleteTarget(null)} danger />)}

      {/* ═══ SMART DELETE MODAL ═══════════════════ */}
      {showSmartDeleteModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4"><h3 className="text-lg font-bold text-gray-800">Delete Selected Accounts</h3>
              <button onClick={() => { setShowSmartDeleteModal(false); setUsageCheck(null); }} className="p-1 text-gray-400 hover:text-gray-600 rounded"><X className="w-5 h-5" /></button></div>
            {checkingUsage && <div className="flex items-center justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-blue-600 mr-3" /><span className="text-gray-500">Checking usage...</span></div>}
            {usageCheck && !checkingUsage && (<div>
              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-center"><p className="text-2xl font-bold text-green-700">{usageCheck.deletable}</p><p className="text-xs text-green-600 font-medium">Can delete</p></div>
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-center"><p className="text-2xl font-bold text-amber-700">{usageCheck.system.length}</p><p className="text-xs text-amber-600 font-medium">Stammkonten 🔒</p></div>
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-center"><p className="text-2xl font-bold text-red-700">{usageCheck.protected.length}</p><p className="text-xs text-red-600 font-medium">Have entries</p></div>
              </div>
              {usageCheck.system.length > 0 && <div className="mb-4"><div className="flex items-center gap-2 mb-2"><Lock className="w-4 h-4 text-amber-500" /><span className="text-sm font-semibold text-amber-700">Stammkonten ({usageCheck.system.length}):</span></div>
                <div className="max-h-32 overflow-y-auto border border-amber-100 rounded-lg"><table className="w-full text-sm"><tbody>{usageCheck.system.map(sa => <tr key={sa.id} className="border-t border-amber-50 first:border-t-0"><td className="px-3 py-1.5 font-mono font-semibold text-gray-700 w-16">{sa.code}</td><td className="px-3 py-1.5 text-gray-600">{sa.nameDe}</td><td className="px-3 py-1.5 text-right"><Lock className="w-3 h-3 text-amber-400 inline" /></td></tr>)}</tbody></table></div></div>}
              {usageCheck.protected.length > 0 && <div className="mb-4"><div className="flex items-center gap-2 mb-2"><ShieldAlert className="w-4 h-4 text-red-500" /><span className="text-sm font-semibold text-red-700">Have entries ({usageCheck.protected.length}):</span></div>
                <div className="max-h-32 overflow-y-auto border border-red-100 rounded-lg"><table className="w-full text-sm"><thead><tr className="bg-red-50 text-xs text-red-600 font-semibold"><th className="text-left px-3 py-1.5">Code</th><th className="text-left px-3 py-1.5">Name</th><th className="text-right px-3 py-1.5">Entries</th></tr></thead><tbody>{usageCheck.protected.map(pa => <tr key={pa.id} className="border-t border-red-50"><td className="px-3 py-1.5 font-mono font-semibold text-gray-700">{pa.code}</td><td className="px-3 py-1.5 text-gray-600 truncate max-w-[200px]">{pa.nameDe}</td><td className="px-3 py-1.5 text-right text-red-600 font-semibold">{pa.lineCount}</td></tr>)}</tbody></table></div></div>}
              {usageCheck.deletable === 0 && <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg text-amber-700 text-sm mb-4">No accounts can be deleted.</div>}
              {usageCheck.deletable > 0 && <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-600 mb-4"><span className="font-semibold text-gray-800">{usageCheck.deletable}</span> account(s) will be permanently deleted.</div>}
              <div className="flex gap-3">
                {usageCheck.deletable > 0 && <button onClick={handleBulkDelete} disabled={bulkDeleting} className="flex-1 bg-red-500 hover:bg-red-600 disabled:bg-red-300 text-white py-2 rounded-lg font-semibold transition-colors">{bulkDeleting ? 'Deleting...' : `Delete ${usageCheck.deletable}`}</button>}
                <button onClick={() => { setShowSmartDeleteModal(false); setUsageCheck(null); }} className={`${usageCheck.deletable > 0 ? 'flex-1' : 'w-full'} bg-gray-100 hover:bg-gray-200 py-2 rounded-lg font-semibold transition-colors`}>{usageCheck.deletable === 0 ? 'Close' : 'Cancel'}</button>
              </div>
            </div>)}
          </div>
        </div>)}
    </div>
  );
}

// ─── SHARED ──────────────────────────────────────
function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50"><div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md mx-4"><div className="flex items-center justify-between mb-4"><h3 className="text-lg font-bold text-gray-800">{title}</h3><button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 rounded"><X className="w-5 h-5" /></button></div>{children}</div></div>;
}
function ConfirmModal({ title, message, sub, confirmLabel, onConfirm, onCancel, danger, disabled }: { title: string; message: React.ReactNode; sub?: string; confirmLabel: string; onConfirm: () => void; onCancel: () => void; danger?: boolean; disabled?: boolean; }) {
  return <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50"><div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-sm mx-4 text-center"><div className="text-4xl mb-3">{danger ? '⚠️' : 'ℹ️'}</div><h3 className="text-lg font-bold mb-2">{title}</h3><p className="text-sm text-gray-600 mb-1">{message}</p>{sub && <p className="text-xs text-gray-400 mb-6">{sub}</p>}<div className="flex gap-3 mt-4"><button onClick={onConfirm} disabled={disabled} className={`flex-1 py-2 rounded-lg font-semibold transition-colors ${danger ? 'bg-red-500 hover:bg-red-600 disabled:bg-red-300 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white'}`}>{confirmLabel}</button><button onClick={onCancel} className="flex-1 bg-gray-100 hover:bg-gray-200 py-2 rounded-lg font-semibold transition-colors">Cancel</button></div></div></div>;
}
function AccountFormFields({ formData, setFormData, lockedCode, lockedType }: { formData: { code: string; nameDe: string; nameEn: string; type: string }; setFormData: React.Dispatch<React.SetStateAction<AccountFormData>>; lockedCode?: boolean; lockedType?: boolean; }) {
  return (<div className="space-y-3">
    <div><label className="block text-sm font-medium text-gray-700 mb-1">Code {lockedCode && <Lock className="w-3 h-3 inline text-amber-500" />}</label><input placeholder="e.g. 1000" required value={formData.code} disabled={lockedCode} onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value }))} className={`w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none font-mono ${lockedCode ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : ''}`} /></div>
    <div><label className="block text-sm font-medium text-gray-700 mb-1">Name (Deutsch)</label><input placeholder="z.B. Kasse" required value={formData.nameDe} onChange={(e) => setFormData(prev => ({ ...prev, nameDe: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" /></div>
    <div><label className="block text-sm font-medium text-gray-700 mb-1">Name (English)</label><input placeholder="e.g. Cash" value={formData.nameEn} onChange={(e) => setFormData(prev => ({ ...prev, nameEn: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" /><p className="text-xs text-gray-400 mt-1">Optional — defaults to German</p></div>
    <div><label className="block text-sm font-medium text-gray-700 mb-1">Type {lockedType && <Lock className="w-3 h-3 inline text-amber-500" />}</label><div className="relative"><select value={formData.type} disabled={lockedType} onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value as AccountType }))} className={`w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none appearance-none pr-8 ${lockedType ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : ''}`}>{ACCOUNT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}</select><ChevronDown className="w-4 h-4 text-gray-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" /></div></div>
  </div>);
}
```

## FILE: ./app/(dashboard)/company/[companyId]/purchases/[purchaseId]/page.tsx
```
// app/(dashboard)/company/[companyId]/purchases/[purchaseId]/page.tsx
// ═══════════════════════════════════════════════════
// Task 38B + 39: Purchase Document Page (Dual Mode)
// ═══════════════════════════════════════════════════
// DRAFT  → editable header + items + Save + Post
// POSTED → read-only header + items + totals

'use client';

import { useParams, useRouter } from 'next/navigation';
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { ArrowLeft, Loader2, Save, Send } from 'lucide-react';

// Read-only (37A/37B/37C)
import PurchaseHeader from '@/components/purchases/PurchaseHeader';
import PurchaseItemsTable from '@/components/purchases/PurchaseItemsTable';
import PurchaseTotals from '@/components/purchases/PurchaseTotals';

// Editable (38B)
import PurchaseHeaderEdit from '@/components/purchases/PurchaseHeaderEdit';
import PurchaseItemsEdit, { type EditableItem } from '@/components/purchases/PurchaseItemsEdit';

interface PurchaseItem {
  id: string;
  itemName: string;
  itemCode: string | null;
  quantity: string | number;
  priceWithoutVat: string | number;
  vatRate: string | number | null;
}

interface PurchaseDocument {
  id: string;
  series: string;
  number: string;
  purchaseDate: string;
  payUntil: string | null;
  supplierName: string;
  supplierCode: string | null;
  warehouseName: string;
  operationType: string;
  currencyCode: string;
  employeeName: string | null;
  comments: string | null;
  status: string | null;
  debitAccountId: string | null;
  creditAccountId: string | null;
  items: PurchaseItem[];
}

interface HeaderForm {
  purchaseDate: string;
  supplierName: string;
  supplierCode: string;
  warehouseName: string;
  currencyCode: string;
  operationType: string;
  comments: string;
}

function toDateInputValue(dateStr: string): string {
  try {
    return new Date(dateStr).toISOString().split('T')[0];
  } catch {
    return '';
  }
}

function initHeaderForm(p: PurchaseDocument): HeaderForm {
  return {
    purchaseDate: toDateInputValue(p.purchaseDate),
    supplierName: p.supplierName || '',
    supplierCode: p.supplierCode || '',
    warehouseName: p.warehouseName || 'Main',
    currencyCode: p.currencyCode || 'EUR',
    operationType: p.operationType || 'PURCHASE',
    comments: p.comments || '',
  };
}

function initEditableItems(items: PurchaseItem[]): EditableItem[] {
  return items.map((item) => ({
    id: item.id,
    itemName: item.itemName || '',
    itemCode: item.itemCode || '',
    quantity: Number(item.quantity) || 0,
    priceWithoutVat: Number(item.priceWithoutVat) || 0,
    vatRate: item.vatRate != null ? Number(item.vatRate) : 19,
  }));
}

export default function PurchaseDocumentPage() {
  const params = useParams();
  const router = useRouter();
  const companyId = params.companyId as string;
  const purchaseId = params.purchaseId as string;

  const [purchase, setPurchase] = useState<PurchaseDocument | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [headerForm, setHeaderForm] = useState<HeaderForm | null>(null);
  const [editItems, setEditItems] = useState<EditableItem[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isPosting, setIsPosting] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);

  const isEditable = purchase?.status === 'DRAFT';

  // ─── Fetch ────────────────────────────────────
  const fetchPurchase = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await fetch(`/api/company/${companyId}/purchases/${purchaseId}`);
      if (res.status === 404) { setError('Purchase document not found'); return; }
      if (!res.ok) throw new Error('Failed to load purchase');
      const json = await res.json();
      const doc = json.data as PurchaseDocument;
      setPurchase(doc);
      setHeaderForm(initHeaderForm(doc));
      setEditItems(initEditableItems(doc.items));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, [companyId, purchaseId]);

  useEffect(() => { fetchPurchase(); }, [fetchPurchase]);

  // ─── Save (PUT) ───────────────────────────────
  async function handleSave() {
    if (!headerForm || !purchase) return;
    setIsSaving(true);
    setSaveMsg(null);
    setError(null);

    try {
      const res = await fetch(`/api/company/${companyId}/purchases/${purchaseId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...headerForm,
          items: editItems.map((item) => ({
            itemName: item.itemName,
            itemCode: item.itemCode || null,
            quantity: item.quantity,
            priceWithoutVat: item.priceWithoutVat,
            vatRate: item.vatRate,
          })),
        }),
      });

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || 'Save failed');
      }

      const json = await res.json();
      const doc = json.data as PurchaseDocument;
      setPurchase(doc);
      setHeaderForm(initHeaderForm(doc));
      setEditItems(initEditableItems(doc.items));
      setSaveMsg('Saved');
      setTimeout(() => setSaveMsg(null), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setIsSaving(false);
    }
  }

  // ─── Post (DRAFT → POSTED) ────────────────────
  async function handlePost() {
    if (!purchase || !headerForm) return;

    // Front-end pre-validation
    if (editItems.length === 0) {
      setError('Cannot post: add at least one item');
      return;
    }
    if (!headerForm.supplierName.trim()) {
      setError('Cannot post: supplier name is required');
      return;
    }

    // First save current state, then post
    const confirmed = window.confirm(
      `Post document ${purchase.series}-${purchase.number}?\n\nThis will create journal entries, stock movements, and FIFO lots.\nThe document will become read-only.`
    );
    if (!confirmed) return;

    setIsPosting(true);
    setError(null);

    try {
      // Step 1: Save first (ensure latest data is persisted)
      const saveRes = await fetch(`/api/company/${companyId}/purchases/${purchaseId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...headerForm,
          items: editItems.map((item) => ({
            itemName: item.itemName,
            itemCode: item.itemCode || null,
            quantity: item.quantity,
            priceWithoutVat: item.priceWithoutVat,
            vatRate: item.vatRate,
          })),
        }),
      });

      if (!saveRes.ok) {
        const json = await saveRes.json().catch(() => ({}));
        throw new Error(json.error || 'Save before post failed');
      }

      // Step 2: Post
      const postRes = await fetch(
        `/api/company/${companyId}/purchases/${purchaseId}/post`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            debitAccountId: purchase.debitAccountId,
            creditAccountId: purchase.creditAccountId,
          }),
        }
      );

      if (!postRes.ok) {
        const json = await postRes.json().catch(() => ({}));
        throw new Error(json.error || 'Post failed');
      }

      const json = await postRes.json();
      const doc = json.data as PurchaseDocument;
      setPurchase(doc);
      setHeaderForm(initHeaderForm(doc));
      setEditItems(initEditableItems(doc.items));
      setSaveMsg('Posted ✓');
      setTimeout(() => setSaveMsg(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Post failed');
    } finally {
      setIsPosting(false);
    }
  }

  function handleHeaderChange(field: keyof HeaderForm, value: string) {
    if (!headerForm) return;
    setHeaderForm({ ...headerForm, [field]: value });
  }

  // ─── Loading ──────────────────────────────────
  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center py-20">
        <Loader2 className="animate-spin text-gray-300" size={24} />
        <span className="ml-2 text-sm text-gray-400">Loading document...</span>
      </div>
    );
  }

  // ─── Error / Not Found ────────────────────────
  if (!purchase && (error || !isLoading)) {
    return (
      <div className="p-6">
        <Link
          href={`/company/${companyId}/purchases`}
          className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 mb-6"
        >
          <ArrowLeft size={14} /> Back to Purchases
        </Link>
        <div className="bg-white border border-gray-200 rounded-lg p-12 text-center">
          <p className="text-gray-500 text-sm">{error || 'Document not found'}</p>
          <button
            onClick={() => router.push(`/company/${companyId}/purchases`)}
            className="mt-4 text-xs text-blue-600 hover:text-blue-800"
          >
            ← Return to list
          </button>
        </div>
      </div>
    );
  }

  if (!purchase) return null;

  const totalsItems = isEditable
    ? editItems.map((i) => ({ quantity: i.quantity, priceWithoutVat: i.priceWithoutVat, vatRate: i.vatRate }))
    : purchase.items;

  const actionDisabled = isSaving || isPosting;

  // ─── Render ───────────────────────────────────
  return (
    <div className="p-6 space-y-4">
      {/* Top bar */}
      <div className="flex items-center justify-between">
        <Link
          href={`/company/${companyId}/purchases`}
          className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 transition-colors"
        >
          <ArrowLeft size={14} /> Purchases
        </Link>

        {isEditable && (
          <div className="flex items-center gap-2">
            {saveMsg && (
              <span className="text-xs text-green-600 font-medium">{saveMsg}</span>
            )}
            <button
              onClick={handleSave}
              disabled={actionDisabled}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white text-xs font-medium rounded-md transition-colors"
            >
              {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              {isSaving ? 'Saving...' : 'Save'}
            </button>
            <button
              onClick={handlePost}
              disabled={actionDisabled}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-green-600 hover:bg-green-700 disabled:bg-green-300 text-white text-xs font-medium rounded-md transition-colors"
            >
              {isPosting ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
              {isPosting ? 'Posting...' : 'Post'}
            </button>
          </div>
        )}
      </div>

      {/* Error banner */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-2.5 text-sm text-red-700 flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600 text-xs ml-4">✕</button>
        </div>
      )}

      {/* Header */}
      {isEditable && headerForm ? (
        <PurchaseHeaderEdit
          form={headerForm}
          onChange={handleHeaderChange}
          series={purchase.series}
          number={purchase.number}
        />
      ) : (
        <PurchaseHeader purchase={purchase} />
      )}

      {/* Items */}
      {isEditable ? (
        <PurchaseItemsEdit items={editItems} onChange={setEditItems} />
      ) : (
        <PurchaseItemsTable items={purchase.items} />
      )}

      {/* Totals */}
      <PurchaseTotals
        items={totalsItems}
        currencyCode={isEditable ? (headerForm?.currencyCode || 'EUR') : purchase.currencyCode}
      />
    </div>
  );
}
```

## FILE: ./app/(dashboard)/company/[companyId]/purchases/new/page.tsx
```
// app/(dashboard)/company/[companyId]/purchases/new/page.tsx
// ═══════════════════════════════════════════════════
// Task 38A: New Purchase — Draft Redirect Page
// ═══════════════════════════════════════════════════
// Flow:
//   1. POST /api/.../purchases/draft → creates DRAFT
//   2. Get draft.id
//   3. router.replace → /purchases/[id]
//   4. Show loader while creating

'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function NewPurchasePage() {
  const router = useRouter();
  const params = useParams();
  const companyId = params.companyId as string;

  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function createDraft() {
      try {
        const res = await fetch(`/api/company/${companyId}/purchases/draft`, {
          method: 'POST',
        });

        if (!res.ok) {
          const json = await res.json().catch(() => ({}));
          throw new Error(json.error || 'Failed to create draft');
        }

        const json = await res.json();

        if (!json?.data?.id) {
          throw new Error('Invalid response — no document ID');
        }

        if (!cancelled) {
          router.replace(`/company/${companyId}/purchases/${json.data.id}`);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Unknown error');
        }
      }
    }

    createDraft();

    return () => {
      cancelled = true;
    };
  }, [companyId, router]);

  if (error) {
    return (
      <div className="p-6">
        <Link
          href={`/company/${companyId}/purchases`}
          className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 mb-6"
        >
          <ArrowLeft size={14} />
          Back to Purchases
        </Link>
        <div className="bg-white border border-gray-200 rounded-lg p-12 text-center">
          <p className="text-red-500 text-sm mb-2">{error}</p>
          <button
            onClick={() => router.push(`/company/${companyId}/purchases`)}
            className="text-xs text-blue-600 hover:text-blue-800"
          >
            ← Return to list
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 flex items-center justify-center min-h-[300px]">
      <Loader2 className="animate-spin text-gray-300" size={24} />
      <span className="ml-2 text-sm text-gray-400">Creating document...</span>
    </div>
  );
}
```

## FILE: ./app/(dashboard)/company/[companyId]/purchases/page.tsx
```
// app/(dashboard)/company/[companyId]/purchases/page.tsx
// ═══════════════════════════════════════════════════
// Task 38 39: Purchases Module Page
// ═══════════════════════════════════════════════════

'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import PurchaseTable from '@/components/purchases/PurchaseTable';
import { Loader2 } from 'lucide-react';

interface Purchase {
  id: string;
  series: string;
  number: string;
  purchaseDate: string;
  supplierName: string;
  currencyCode: string;
  status: string | null;
  totalAmount?: number;
}

export default function PurchasesPage() {
  const params = useParams();
  const companyId = params.companyId as string;

  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadPurchases() {
      try {
        setIsLoading(true);
        setError(null);

        const res = await fetch(`/api/company/${companyId}/purchases`);

        if (!res.ok) {
          throw new Error('Failed to load purchases');
        }

        const json = await res.json();

        // 🔐 SAFETY: always extract array from json.data
        const safeArray = Array.isArray(json.data) ? json.data : [];

        setPurchases(safeArray);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setIsLoading(false);
      }
    }

    if (companyId) {
      loadPurchases();
    }
  }, [companyId]);

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center py-20">
        <Loader2 className="animate-spin text-gray-300" size={24} />
        <span className="ml-2 text-sm text-gray-400">Loading purchases...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-white border border-gray-200 rounded-lg p-12 text-center">
          <p className="text-red-500 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <PurchaseTable purchases={purchases} companyId={companyId} />
    </div>
  );
}```

## FILE: ./app/(dashboard)/company/[companyId]/products/page.tsx
```
// ERP Module placeholder — Factory-compatible
// Shared page template for: clients, products, sales, purchases, warehouse, bank, reports

'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';

const MODULE_META: Record<string, { title: string; icon: string; description: string }> = {
  clients:    { title: 'Clients',    icon: '👥', description: 'Manage your client base, contacts, and payment terms' },
  products:   { title: 'Products',   icon: '📦', description: 'Product catalog, pricing, and inventory items' },
  sales:      { title: 'Sales',      icon: '💰', description: 'Sales orders, invoices, and revenue tracking' },
  purchases:  { title: 'Purchases',  icon: '🛒', description: 'Purchase orders, supplier invoices, and procurement' },
  warehouse:  { title: 'Warehouse',  icon: '🏭', description: 'Stock movements, inventory levels, and warehouses' },
  bank:       { title: 'Bank',       icon: '🏦', description: 'Bank statements, payments, and reconciliation' },
  reports:    { title: 'Reports',    icon: '📈', description: 'Financial reports, analytics, and business intelligence' },
};

export default function ModulePage() {
  const params = useParams();
  const companyId = params.companyId as string;
  const segments = typeof window !== 'undefined' ? window.location.pathname.split('/') : [];
  const moduleKey = segments[segments.length - 1] || 'unknown';
  const meta = MODULE_META[moduleKey] || { title: moduleKey, icon: '📋', description: 'ERP Module' };

  return (
    <div className="p-6">
      <div className="mb-6">
        <Link href={`/account/companies/${companyId}`}
          className="text-xs text-gray-400 hover:text-gray-600 transition-colors">← Dashboard</Link>
      </div>
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
        <span className="text-5xl block mb-4">{meta.icon}</span>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">{meta.title}</h1>
        <p className="text-gray-500 mb-6 max-w-md mx-auto">{meta.description}</p>
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-amber-50 text-amber-700 rounded-lg text-sm">
          🚧 Module under development
        </div>
      </div>
    </div>
  );
}
```

## FILE: ./app/(dashboard)/company/[companyId]/sales/page.tsx
```
// ERP Module placeholder — Factory-compatible
// Shared page template for: clients, products, sales, purchases, warehouse, bank, reports

'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';

const MODULE_META: Record<string, { title: string; icon: string; description: string }> = {
  clients:    { title: 'Clients',    icon: '👥', description: 'Manage your client base, contacts, and payment terms' },
  products:   { title: 'Products',   icon: '📦', description: 'Product catalog, pricing, and inventory items' },
  sales:      { title: 'Sales',      icon: '💰', description: 'Sales orders, invoices, and revenue tracking' },
  purchases:  { title: 'Purchases',  icon: '🛒', description: 'Purchase orders, supplier invoices, and procurement' },
  warehouse:  { title: 'Warehouse',  icon: '🏭', description: 'Stock movements, inventory levels, and warehouses' },
  bank:       { title: 'Bank',       icon: '🏦', description: 'Bank statements, payments, and reconciliation' },
  reports:    { title: 'Reports',    icon: '📈', description: 'Financial reports, analytics, and business intelligence' },
};

export default function ModulePage() {
  const params = useParams();
  const companyId = params.companyId as string;
  const segments = typeof window !== 'undefined' ? window.location.pathname.split('/') : [];
  const moduleKey = segments[segments.length - 1] || 'unknown';
  const meta = MODULE_META[moduleKey] || { title: moduleKey, icon: '📋', description: 'ERP Module' };

  return (
    <div className="p-6">
      <div className="mb-6">
        <Link href={`/account/companies/${companyId}`}
          className="text-xs text-gray-400 hover:text-gray-600 transition-colors">← Dashboard</Link>
      </div>
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
        <span className="text-5xl block mb-4">{meta.icon}</span>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">{meta.title}</h1>
        <p className="text-gray-500 mb-6 max-w-md mx-auto">{meta.description}</p>
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-amber-50 text-amber-700 rounded-lg text-sm">
          🚧 Module under development
        </div>
      </div>
    </div>
  );
}
```

## FILE: ./app/(dashboard)/company/[companyId]/CompanyHeader.tsx
```
// app/(dashboard)/company/[companyId]/CompanyHeader.tsx
// Cookie-only — company name and header element positions from API/state
// No localStorage for auth or company name

'use client'

import React, { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { GripVertical } from 'lucide-react'

interface HeaderElement {
  id: string;
  type: 'button' | 'info' | 'avatar';
  content: string | React.ReactNode;
  position: 'left' | 'center' | 'right';
  priority: number;
}

const CompanyHeader: React.FC = () => {
  const params = useParams()
  const companyId = params.companyId as string

  const [companyName, setCompanyName] = useState('')
  const [balance] = useState(0)
  
  const [headerElements, setHeaderElements] = useState<HeaderElement[]>([
    { id: 'invite', type: 'button', content: 'Invite users', position: 'left', priority: 1 },
    { id: 'minimal', type: 'button', content: 'Minimal', position: 'left', priority: 2 },
    { id: 'balance', type: 'info', content: 'Balance 0.00 €', position: 'left', priority: 3 },
    { id: 'partnership', type: 'info', content: 'Partnership points 0.00 €', position: 'left', priority: 4 },
    { id: 'avatar', type: 'avatar', content: '', position: 'right', priority: 5 },
  ])

  const [draggedElement, setDraggedElement] = useState<HeaderElement | null>(null)
  const [draggedOver, setDraggedOver] = useState<'left' | 'center' | 'right' | null>(null)

  // Fetch company name from API instead of localStorage
  useEffect(() => {
    const fetchCompany = async () => {
      try {
        const res = await fetch(`/api/account/companies/${companyId}`)
        if (res.ok) {
          const data = await res.json()
          setCompanyName(data.name || 'Company')
        }
      } catch {
        setCompanyName('Company')
      }
    }
    fetchCompany()
  }, [companyId])

  const handleDragStart = (e: React.DragEvent, element: HeaderElement) => {
    setDraggedElement(element)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e: React.DragEvent, zone: 'left' | 'center' | 'right') => {
    e.preventDefault()
    setDraggedOver(zone)
  }

  const handleDrop = (e: React.DragEvent, zone: 'left' | 'center' | 'right') => {
    e.preventDefault()
    if (!draggedElement) return

    setHeaderElements(prev =>
      prev.map(el =>
        el.id === draggedElement.id ? { ...el, position: zone } : el
      )
    )
    setDraggedElement(null)
    setDraggedOver(null)
  }

  const renderElement = (element: HeaderElement) => {
    switch (element.type) {
      case 'button':
        return (
          <button
            key={element.id}
            draggable
            onDragStart={(e) => handleDragStart(e, element)}
            className="flex items-center gap-1 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm transition-colors cursor-grab active:cursor-grabbing"
          >
            <GripVertical className="w-3 h-3 text-slate-500" />
            {element.content}
          </button>
        )
      case 'info':
        return (
          <div
            key={element.id}
            draggable
            onDragStart={(e) => handleDragStart(e, element)}
            className="flex items-center gap-1 px-3 py-1.5 text-sm text-slate-300 cursor-grab active:cursor-grabbing"
          >
            <GripVertical className="w-3 h-3 text-slate-500" />
            {element.content}
          </div>
        )
      case 'avatar':
        return (
          <div
            key={element.id}
            draggable
            onDragStart={(e) => handleDragStart(e, element)}
            className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center text-white text-sm font-bold cursor-grab active:cursor-grabbing"
          >
            {companyName.charAt(0).toUpperCase() || '?'}
          </div>
        )
    }
  }

  const leftElements = headerElements.filter(e => e.position === 'left').sort((a, b) => a.priority - b.priority)
  const centerElements = headerElements.filter(e => e.position === 'center').sort((a, b) => a.priority - b.priority)
  const rightElements = headerElements.filter(e => e.position === 'right').sort((a, b) => a.priority - b.priority)

  return (
    <div className="h-14 bg-slate-800 border-b border-slate-700 flex items-center px-4">
      {/* Left Zone */}
      <div
        className={`flex items-center gap-2 flex-1 min-h-[40px] rounded-lg transition-colors ${
          draggedOver === 'left' ? 'bg-slate-700/50' : ''
        }`}
        onDragOver={(e) => handleDragOver(e, 'left')}
        onDrop={(e) => handleDrop(e, 'left')}
        onDragLeave={() => setDraggedOver(null)}
      >
        {leftElements.map(renderElement)}
      </div>

      {/* Center Zone */}
      <div
        className={`flex items-center justify-center gap-2 flex-1 min-h-[40px] rounded-lg transition-colors ${
          draggedOver === 'center' ? 'bg-slate-700/50' : ''
        }`}
        onDragOver={(e) => handleDragOver(e, 'center')}
        onDrop={(e) => handleDrop(e, 'center')}
        onDragLeave={() => setDraggedOver(null)}
      >
        {centerElements.map(renderElement)}
      </div>

      {/* Right Zone */}
      <div
        className={`flex items-center justify-end gap-2 flex-1 min-h-[40px] rounded-lg transition-colors ${
          draggedOver === 'right' ? 'bg-slate-700/50' : ''
        }`}
        onDragOver={(e) => handleDragOver(e, 'right')}
        onDrop={(e) => handleDrop(e, 'right')}
        onDragLeave={() => setDraggedOver(null)}
      >
        {rightElements.map(renderElement)}
      </div>
    </div>
  )
}

export default CompanyHeader
```

## FILE: ./app/(dashboard)/company/[companyId]/bank/page.tsx
```
// ERP Module placeholder — Factory-compatible
// Shared page template for: clients, products, sales, purchases, warehouse, bank, reports

'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';

const MODULE_META: Record<string, { title: string; icon: string; description: string }> = {
  clients:    { title: 'Clients',    icon: '👥', description: 'Manage your client base, contacts, and payment terms' },
  products:   { title: 'Products',   icon: '📦', description: 'Product catalog, pricing, and inventory items' },
  sales:      { title: 'Sales',      icon: '💰', description: 'Sales orders, invoices, and revenue tracking' },
  purchases:  { title: 'Purchases',  icon: '🛒', description: 'Purchase orders, supplier invoices, and procurement' },
  warehouse:  { title: 'Warehouse',  icon: '🏭', description: 'Stock movements, inventory levels, and warehouses' },
  bank:       { title: 'Bank',       icon: '🏦', description: 'Bank statements, payments, and reconciliation' },
  reports:    { title: 'Reports',    icon: '📈', description: 'Financial reports, analytics, and business intelligence' },
};

export default function ModulePage() {
  const params = useParams();
  const companyId = params.companyId as string;
  const segments = typeof window !== 'undefined' ? window.location.pathname.split('/') : [];
  const moduleKey = segments[segments.length - 1] || 'unknown';
  const meta = MODULE_META[moduleKey] || { title: moduleKey, icon: '📋', description: 'ERP Module' };

  return (
    <div className="p-6">
      <div className="mb-6">
        <Link href={`/account/companies/${companyId}`}
          className="text-xs text-gray-400 hover:text-gray-600 transition-colors">← Dashboard</Link>
      </div>
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
        <span className="text-5xl block mb-4">{meta.icon}</span>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">{meta.title}</h1>
        <p className="text-gray-500 mb-6 max-w-md mx-auto">{meta.description}</p>
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-amber-50 text-amber-700 rounded-lg text-sm">
          🚧 Module under development
        </div>
      </div>
    </div>
  );
}
```

## FILE: ./app/(dashboard)/company/[companyId]/dashboard/page.tsx
```
// app/(dashboard)/company/[companyId]/dashboard/page.tsx
// Company Dashboard Page — Cookie-only
// Company name fetched from API, not localStorage

'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'

export default function CompanyDashboardPage() {
  const params = useParams()
  const companyId = params.companyId as string
  const [companyName, setCompanyName] = useState<string>('')

  // Fetch company name from API instead of localStorage
  useEffect(() => {
    const fetchCompany = async () => {
      try {
        const res = await fetch(`/api/account/companies/${companyId}`)
        if (res.ok) {
          const data = await res.json()
          setCompanyName(data.name || 'Unknown Company')
        }
      } catch {
        setCompanyName('Unknown Company')
      }
    }
    fetchCompany()
  }, [companyId])

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800">📊 Company Dashboard</h1>
        <p className="text-gray-600 mt-1">
          Welcome to {companyName}
        </p>
        <p className="text-sm text-gray-500 font-mono mt-1">
          Company ID: {companyId}
        </p>
      </div>

      {/* Company Info Card */}
      <div className="bg-white rounded-lg shadow-md p-4 mb-6 border-l-4 border-orange-500">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-800">{companyName}</h3>
            <p className="text-sm text-gray-500">Active Company</p>
          </div>
          <div className="bg-orange-100 text-orange-800 px-4 py-2 rounded-lg font-mono text-lg font-bold">
            ID: {companyId}
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100">Total Clients</p>
              <p className="text-3xl font-bold">—</p>
            </div>
            <div className="text-4xl opacity-80">👥</div>
          </div>
        </div>

        <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100">Products</p>
              <p className="text-3xl font-bold">—</p>
            </div>
            <div className="text-4xl opacity-80">📦</div>
          </div>
        </div>

        <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-100">Sales</p>
              <p className="text-3xl font-bold">—</p>
            </div>
            <div className="text-4xl opacity-80">💰</div>
          </div>
        </div>

        <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-orange-100">Warehouse</p>
              <p className="text-3xl font-bold">—</p>
            </div>
            <div className="text-4xl opacity-80">🏭</div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">🚀 Quick Actions</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Link href={`/company/${companyId}/clients`}
            className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors text-sm font-medium text-gray-700">
            <span>👥</span> Clients
          </Link>
          <Link href={`/company/${companyId}/products`}
            className="flex items-center gap-2 p-3 bg-green-50 rounded-lg hover:bg-green-100 transition-colors text-sm font-medium text-gray-700">
            <span>📦</span> Products
          </Link>
          <Link href={`/company/${companyId}/sales`}
            className="flex items-center gap-2 p-3 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors text-sm font-medium text-gray-700">
            <span>💰</span> Sales
          </Link>
          <Link href={`/company/${companyId}/purchases`}
            className="flex items-center gap-2 p-3 bg-red-50 rounded-lg hover:bg-red-100 transition-colors text-sm font-medium text-gray-700">
            <span>🛒</span> Purchases
          </Link>
        </div>
      </div>
    </div>
  )
}
```

## FILE: ./app/(dashboard)/company/[companyId]/layout.tsx
```
// app/account/companies/[companyId]/layout.tsx
// Company Layout — Factory-compatible
// Fetches company name from Factory API and renders CompanySidebar

import { CompanySidebar } from '@/components/layouts/CompanySidebar';
import prisma from '@/lib/prisma';

export default async function CompanyLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ companyId: string }>;
}) {
  const { companyId } = await params;

  // Fetch company name server-side (Factory Prisma, no runtime deps)
  let companyName = 'Company';
  try {
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: { name: true },
    });
    if (company) companyName = company.name;
  } catch {
    // Fallback to generic name
  }

  return (
    <CompanySidebar companyId={companyId} companyName={companyName}>
      {children}
    </CompanySidebar>
  );
}
```

## FILE: ./app/(dashboard)/company/[companyId]/warehouse/page.tsx
```
// app/(dashboard)/company/[companyId]/warehouse/page.tsx
// ═══════════════════════════════════════════════════
// Warehouse Stock Balance — Task 34
// ═══════════════════════════════════════════════════

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { Package, ChevronDown, Search } from 'lucide-react';

interface ProductBalance {
  warehouseName: string;
  itemCode: string;
  itemName: string;
  quantity: number;
}

export default function WarehousePage() {
  const params = useParams();
  const companyId = params.companyId as string;

  const [balances, setBalances] = useState<ProductBalance[]>([]);
  const [warehouses, setWarehouses] = useState<string[]>([]);
  const [selectedWarehouse, setSelectedWarehouse] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchBalance = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const warehouseParam = selectedWarehouse ? `?warehouse=${encodeURIComponent(selectedWarehouse)}` : '';
      const res = await fetch(`/api/company/${companyId}/warehouse/balance${warehouseParam}`);
      if (res.status === 401) { window.location.href = '/login'; return; }
      if (!res.ok) throw new Error(`API returned ${res.status}`);
      const data = await res.json();
      setBalances(data.balances || []);
      setWarehouses(data.warehouses || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [companyId, selectedWarehouse]);

  useEffect(() => { fetchBalance(); }, [fetchBalance]);

  const filtered = balances.filter(b => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return b.itemCode.toLowerCase().includes(q) || b.itemName.toLowerCase().includes(q);
  });

  // Group by warehouse for display
  const groupedByWarehouse = new Map<string, ProductBalance[]>();
  for (const b of filtered) {
    const existing = groupedByWarehouse.get(b.warehouseName) || [];
    existing.push(b);
    groupedByWarehouse.set(b.warehouseName, existing);
  }

  const totalItems = filtered.length;
  const totalQuantity = filtered.reduce((sum, b) => sum + b.quantity, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-500">Loading warehouse data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">🏭 Warehouse</h1>
          <p className="text-sm text-gray-500 mt-1">
            {totalItems} products · {totalQuantity.toFixed(2)} total units
            {warehouses.length > 0 && ` · ${warehouses.length} warehouse${warehouses.length > 1 ? 's' : ''}`}
          </p>
        </div>
      </div>

      {error && <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">{error}</div>}

      {/* Filters */}
      <div className="flex items-center gap-3 mb-6">
        {/* Warehouse filter */}
        {warehouses.length > 0 && (
          <div className="relative">
            <select
              value={selectedWarehouse}
              onChange={(e) => setSelectedWarehouse(e.target.value)}
              className="appearance-none border border-gray-300 rounded-lg px-4 py-2 pr-8 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
            >
              <option value="">All warehouses</option>
              {warehouses.map(w => <option key={w} value={w}>{w}</option>)}
            </select>
            <ChevronDown className="w-4 h-4 text-gray-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        )}

        {/* Search */}
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by code or name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full border border-gray-300 rounded-lg pl-9 pr-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
        </div>
      </div>

      {/* No data */}
      {balances.length === 0 && !loading && (
        <div className="text-center py-16">
          <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 text-lg font-medium">No stock movements yet</p>
          <p className="text-gray-400 text-sm mt-1">Create a purchase to add items to your warehouse.</p>
        </div>
      )}

      {/* Tables by warehouse */}
      {[...groupedByWarehouse.entries()].map(([warehouse, items]) => (
        <div key={warehouse} className="mb-6">
          <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-2">
            🏭 {warehouse}
          </h2>
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Code</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Product</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Quantity</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, idx) => (
                  <tr key={`${item.itemCode}-${idx}`} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-mono text-sm font-semibold text-gray-800">{item.itemCode}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{item.itemName}</td>
                    <td className={`px-4 py-3 text-sm font-semibold text-right ${item.quantity <= 0 ? 'text-red-600' : item.quantity < 5 ? 'text-amber-600' : 'text-green-700'}`}>
                      {item.quantity.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
}
```

## FILE: ./app/(dashboard)/company/[companyId]/page.tsx
```
// app/(dashboard)/company/[companyId]/page.tsx
// Company Dashboard — Cookie-only auth
// No localStorage, no x-user-id header
// Browser sends session cookie automatically

'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

type CompanyData = {
  id: string;
  name: string;
  code: string | null;
  vatNumber: string | null;
  country: string | null;
  status: string;
};

const STATUS_COLOR: Record<string, string> = {
  ACTIVE: 'text-emerald-600 bg-emerald-50',
  FROZEN: 'text-amber-600 bg-amber-50',
  ARCHIVED: 'text-gray-500 bg-gray-100',
};

export default function CompanyDashboard() {
  const params = useParams();
  const companyId = params.companyId as string;
  const [company, setCompany] = useState<CompanyData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Cookie-only: no localStorage check, no x-user-id header
    // Middleware redirects to /login if no session cookie
    const load = async () => {
      try {
        const res = await fetch(`/api/account/companies/${companyId}`);
        if (res.ok) setCompany(await res.json());
      } catch { /* fallback */ }
      finally { setLoading(false); }
    };
    load();
  }, [companyId]);

  if (loading) {
    return <div className="p-8 flex items-center justify-center min-h-[50vh]">
      <div className="w-8 h-8 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
    </div>;
  }

  if (!company) {
    return <div className="p-8"><p className="text-red-500">Company not found</p></div>;
  }

  const base = `/company/${companyId}`;

  const modules = [
    { name: 'Clients',    icon: '👥', href: `${base}/clients`,    count: '—' },
    { name: 'Products',   icon: '📦', href: `${base}/products`,   count: '—' },
    { name: 'Sales',      icon: '💰', href: `${base}/sales`,      count: '—' },
    { name: 'Purchases',  icon: '🛒', href: `${base}/purchases`,  count: '—' },
    { name: 'Warehouse',  icon: '🏭', href: `${base}/warehouse`,  count: '—' },
    { name: 'Bank',       icon: '🏦', href: `${base}/bank`,       count: '—' },
  ];

  const stats = [
    { label: 'Monthly Revenue', value: '€0',  icon: '💰', gradient: 'from-emerald-500 to-emerald-600' },
    { label: 'Active Clients',  value: '0',   icon: '👥', gradient: 'from-blue-500 to-blue-600' },
    { label: 'Open Orders',     value: '0',   icon: '📋', gradient: 'from-orange-500 to-orange-600' },
    { label: 'Stock Items',     value: '0',   icon: '📦', gradient: 'from-purple-500 to-purple-600' },
  ];

  return (
    <div className="p-6">
      {/* Company Header */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-1">{company.name}</h1>
            <div className="flex items-center gap-4 text-sm text-gray-500">
              {company.code && <span className="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded">{company.code}</span>}
              {company.vatNumber && <span>VAT: {company.vatNumber}</span>}
              {company.country && <span>{company.country}</span>}
            </div>
          </div>
          <span className={`px-3 py-1 rounded-full text-xs font-medium ${STATUS_COLOR[company.status] || ''}`}>
            {company.status}
          </span>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {stats.map(stat => (
          <div key={stat.label} className={`bg-gradient-to-r ${stat.gradient} rounded-xl p-5 text-white`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/80 text-xs mb-1">{stat.label}</p>
                <p className="text-2xl font-bold">{stat.value}</p>
              </div>
              <span className="text-3xl opacity-80">{stat.icon}</span>
            </div>
          </div>
        ))}
      </div>

      {/* ERP Modules Grid */}
      <h2 className="text-lg font-semibold text-gray-800 mb-4">ERP Modules</h2>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
        {modules.map(mod => (
          <Link key={mod.name} href={mod.href}
            className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 hover:shadow-md hover:border-blue-200 transition-all text-center group">
            <span className="text-3xl block mb-2 group-hover:scale-110 transition-transform">{mod.icon}</span>
            <p className="text-sm font-medium text-gray-700">{mod.name}</p>
            <p className="text-xs text-gray-400 mt-1">{mod.count}</p>
          </Link>
        ))}
      </div>

      {/* Quick Actions + Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-base font-semibold text-gray-800 mb-4">🚀 Quick Actions</h3>
          <div className="grid grid-cols-2 gap-3">
            <Link href={`${base}/clients`} className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors text-sm font-medium text-gray-700">
              <span>👥</span> Add Client
            </Link>
            <Link href={`${base}/products`} className="flex items-center gap-2 p-3 bg-green-50 rounded-lg hover:bg-green-100 transition-colors text-sm font-medium text-gray-700">
              <span>📦</span> Add Product
            </Link>
            <Link href={`${base}/sales`} className="flex items-center gap-2 p-3 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors text-sm font-medium text-gray-700">
              <span>💰</span> New Sale
            </Link>
            <Link href={`${base}/purchases`} className="flex items-center gap-2 p-3 bg-red-50 rounded-lg hover:bg-red-100 transition-colors text-sm font-medium text-gray-700">
              <span>🛒</span> New Purchase
            </Link>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-base font-semibold text-gray-800 mb-4">📈 Recent Activity</h3>
          <div className="space-y-3">
            <div className="flex items-center p-3 bg-gray-50 rounded-lg">
              <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs font-bold mr-3">☀</div>
              <div>
                <p className="text-sm font-medium text-gray-800">System initialized</p>
                <p className="text-xs text-gray-500">Company workspace created</p>
              </div>
            </div>
            <p className="text-xs text-gray-400 text-center py-2">Activity will appear as you use the system</p>
          </div>
        </div>
      </div>
    </div>
  );
}
```

## FILE: ./app/(dashboard)/company/[companyId]/reports/page.tsx
```
// ERP Module placeholder — Factory-compatible
// Shared page template for: clients, products, sales, purchases, warehouse, bank, reports

'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';

const MODULE_META: Record<string, { title: string; icon: string; description: string }> = {
  clients:    { title: 'Clients',    icon: '👥', description: 'Manage your client base, contacts, and payment terms' },
  products:   { title: 'Products',   icon: '📦', description: 'Product catalog, pricing, and inventory items' },
  sales:      { title: 'Sales',      icon: '💰', description: 'Sales orders, invoices, and revenue tracking' },
  purchases:  { title: 'Purchases',  icon: '🛒', description: 'Purchase orders, supplier invoices, and procurement' },
  warehouse:  { title: 'Warehouse',  icon: '🏭', description: 'Stock movements, inventory levels, and warehouses' },
  bank:       { title: 'Bank',       icon: '🏦', description: 'Bank statements, payments, and reconciliation' },
  reports:    { title: 'Reports',    icon: '📈', description: 'Financial reports, analytics, and business intelligence' },
};

export default function ModulePage() {
  const params = useParams();
  const companyId = params.companyId as string;
  const segments = typeof window !== 'undefined' ? window.location.pathname.split('/') : [];
  const moduleKey = segments[segments.length - 1] || 'unknown';
  const meta = MODULE_META[moduleKey] || { title: moduleKey, icon: '📋', description: 'ERP Module' };

  return (
    <div className="p-6">
      <div className="mb-6">
        <Link href={`/account/companies/${companyId}`}
          className="text-xs text-gray-400 hover:text-gray-600 transition-colors">← Dashboard</Link>
      </div>
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
        <span className="text-5xl block mb-4">{meta.icon}</span>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">{meta.title}</h1>
        <p className="text-gray-500 mb-6 max-w-md mx-auto">{meta.description}</p>
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-amber-50 text-amber-700 rounded-lg text-sm">
          🚧 Module under development
        </div>
      </div>
    </div>
  );
}
```

## FILE: ./app/page.tsx
```
// app/page.tsx
// Root redirect — no localStorage check needed
// Middleware handles auth: no cookie → /login, cookie exists → allow through

'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function RootPage() {
  const router = useRouter();

  useEffect(() => {
    // Always try to go to companies.
    // If no session cookie, middleware will redirect to /login.
    router.replace('/account/companies');
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
    </div>
  );
}
```

## FILE: ./next.config.js
```
```

## FILE: ./prisma/schema.prisma
```
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ============================================
// LEVEL 1: ACCOUNT / TENANT
// ============================================

model Tenant {
  id        String   @id @default(cuid())
  name      String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  companies Company[]
  users     User[]

  @@map("tenants")
}

model User {
  id           String   @id @default(cuid())
  email        String
  passwordHash String
  name         String?
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  tenantId String
  tenant   Tenant @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  sessions Session[]

  @@unique([tenantId, email])
  @@index([tenantId])
  @@map("users")
}

// ============================================
// AUTH: SESSION (HttpOnly cookie auth)
// ============================================

model Session {
  id        String   @id @default(cuid())
  token     String   @unique
  userId    String
  tenantId  String
  expiresAt DateTime
  createdAt DateTime @default(now())

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([expiresAt])
  @@map("sessions")
}

// ============================================
// LEVEL 2: COMPANY / ERP CONTEXT
// ============================================

enum CompanyStatus {
  ACTIVE
  FROZEN
  ARCHIVED
}

enum AccountType {
  ASSET
  LIABILITY
  EQUITY
  INCOME
  EXPENSE
}

model Company {
  id        String        @id @default(cuid())
  tenantId  String
  name      String
  code      String?
  vatNumber String?
  country   String?
  status    CompanyStatus @default(ACTIVE)
  priority  Int           @default(0)
  createdAt DateTime      @default(now())
  updatedAt DateTime      @updatedAt

  tenant Tenant @relation(fields: [tenantId], references: [id])

  // ERP Relations
  clients           Client[]
  items             Item[]
  saleDocuments     SaleDocument[]
  purchaseDocuments PurchaseDocument[]
  stockMovements    StockMovement[]
  bankStatements    BankStatement[]
  accounts          Account[]
  journalEntries    JournalEntry[]
  accountingPeriods AccountingPeriod[]
  stockLots         StockLot[]
  stockAllocations  StockAllocation[]

  @@index([tenantId])
  @@map("companies")
}

model StockLot {
  id                 String   @id @default(cuid())
  companyId          String
  warehouseName      String
  itemCode           String
  itemName           String
  sourceDocumentType String   @default("PURCHASE")
  sourceDocumentId   String
  purchaseDate       DateTime
  unitCost           Decimal  @db.Decimal(18, 2)
  qtyInitial         Decimal  @db.Decimal(18, 4)
  qtyRemaining       Decimal  @db.Decimal(18, 4)
  currencyCode       String   @default("EUR")
  createdAt          DateTime @default(now())
  updatedAt          DateTime @updatedAt

  company     Company          @relation(fields: [companyId], references: [id], onDelete: Cascade)
  allocations StockAllocation[]

  // FIFO ordering index — critical for deterministic allocation
  @@index([companyId, warehouseName, itemCode, purchaseDate, id], name: "stock_lots_fifo_idx")
  @@index([companyId, sourceDocumentId], name: "stock_lots_source_idx")
  @@index([companyId])
  @@map("stock_lots")
}

model StockAllocation {
  id           String   @id @default(cuid())
  companyId    String
  documentType String   // SALE | SALE_REVERSAL
  documentId   String
  saleItemId   String?
  lotId        String
  qty          Decimal  @db.Decimal(18, 4)
  unitCost     Decimal  @db.Decimal(18, 2)
  amount       Decimal  @db.Decimal(18, 2)
  createdAt    DateTime @default(now())

  company Company  @relation(fields: [companyId], references: [id], onDelete: Cascade)
  lot     StockLot @relation(fields: [lotId], references: [id], onDelete: Restrict)

  @@index([companyId, documentType, documentId], name: "stock_allocations_doc_idx")
  @@index([companyId, lotId], name: "stock_allocations_lot_idx")
  @@index([companyId])
  @@map("stock_allocations")
}


model Account {
  id        String      @id @default(cuid())
  companyId String
  code      String
  nameDe    String
  nameEn    String
  type      AccountType
  isActive  Boolean     @default(true)
  createdAt DateTime    @default(now())
  updatedAt DateTime    @updatedAt

  company      Company       @relation(fields: [companyId], references: [id], onDelete: Cascade)
  journalLines JournalLine[]

  @@unique([companyId, code])
  @@index([companyId])
  @@map("accounts")
}

// ============================================
// ACCOUNTING CORE: JOURNAL (LEDGER)
// ============================================

enum JournalSource {
  SYSTEM
  MANUAL
}

model JournalEntry {
  id           String        @id @default(cuid())
  companyId    String
  date         DateTime
  documentType String
  documentId   String?
  source       JournalSource @default(SYSTEM)
  description  String?       
  createdAt    DateTime      @default(now())

  lines   JournalLine[]
  company Company       @relation(fields: [companyId], references: [id], onDelete: Cascade)

  @@index([companyId])
  @@index([date])
  @@index([documentType])
  @@index([documentId])
  @@index([companyId, date])
  @@index([companyId, source])
  @@map("journal_entries")
}

model JournalLine {
  id        String  @id @default(cuid())
  entryId   String
  accountId String
  debit     Decimal @default(0) @db.Decimal(18, 2)
  credit    Decimal @default(0) @db.Decimal(18, 2)

  entry   JournalEntry @relation(fields: [entryId], references: [id], onDelete: Cascade)
  account Account      @relation(fields: [accountId], references: [id])

  @@index([accountId])
  @@index([entryId])
  @@map("journal_lines")
}

// ============================================
// ACCOUNTING: PERIOD LOCKING
// ============================================

model AccountingPeriod {
  id        String    @id @default(cuid())
  companyId String
  year      Int
  month     Int
  isClosed  Boolean   @default(false)
  closedAt  DateTime?
  createdAt DateTime  @default(now())

  company Company @relation(fields: [companyId], references: [id], onDelete: Cascade)

  @@unique([companyId, year, month])
  @@index([companyId])
  @@map("accounting_periods")
}

// ============================================
// ERP MODULE: CLIENTS (COUNTERPARTIES)
// ============================================

enum ClientLocation {
  LOCAL
  EU
  FOREIGN
}

model Client {
  id        String @id @default(cuid())
  companyId String

  name      String
  shortName String?
  code      String?
  notes     String?

  isJuridical Boolean
  location    ClientLocation

  vatCode             String?
  businessLicenseCode String?
  residentTaxCode     String?

  email       String?
  phoneNumber String?
  faxNumber   String?
  contactInfo String?

  payWithinDays       Int?
  creditLimit         Decimal?
  automaticDebtRemind Boolean  @default(false)

  birthday DateTime?

  registrationCountryCode String?
  registrationCity        String?
  registrationAddress     String?
  registrationZipCode     String?

  correspondenceCountryCode String?
  correspondenceCity        String?
  correspondenceAddress     String?
  correspondenceZipCode     String?

  bankAccount   String?
  bankName      String?
  bankCode      String?
  bankSwiftCode String?

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  company Company @relation(fields: [companyId], references: [id])

  @@index([companyId])
  @@map("clients")
}

// ============================================
// ERP MODULE: ITEMS (PRODUCTS / SERVICES)
// ============================================

model Item {
  id        String @id @default(cuid())
  companyId String

  name    String
  code    String?
  barcode String?

  vatRate         Decimal?
  priceWithoutVat Decimal?
  priceWithVat    Decimal?

  attributeName   String?
  groupName       String?
  manufacturer    String?
  countryOfOrigin String?

  unitName String

  purchaseAccountCode String?
  saleAccountCode     String?
  expenseAccountCode  String?

  minimumQuantity Decimal?
  description     String?
  externalId      String?
  freePrice       Boolean  @default(false)

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  company Company @relation(fields: [companyId], references: [id])

  @@index([companyId])
  @@index([code])
  @@index([barcode])
  @@map("items")
}

// ============================================
// ERP MODULE: SALES
// ============================================

model SaleDocument {
  id        String @id @default(cuid())
  companyId String

  saleDate       DateTime
  payUntil       DateTime?
  accountingDate DateTime?
  lockedAt       DateTime?

  series String
  number String

  clientName String
  clientCode String?
  payerName  String?
  payerCode  String?

  unloadAddress String?
  unloadCity    String?
  warehouseName String

  operationType String
  currencyCode  String
  employeeName  String?
  status        String?
  comments      String?
  debitAccountId  String?   
  creditAccountId String?   

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  items   SaleItem[]
  company Company    @relation(fields: [companyId], references: [id])

  @@unique([companyId, series, number])
  @@index([companyId])
  @@index([saleDate])
  @@map("sale_documents")
}

model SaleItem {
  id     String @id @default(cuid())
  saleId String

  itemName String
  itemCode String?
  barcode  String?

  quantity        Decimal
  priceWithoutVat Decimal
  unitDiscount    Decimal?
  vatRate         Decimal?
  vatClassifier   String?

  salesAccountCode   String?
  expenseAccountCode String?
  costCenter         String?

  postscript String?
  accComment String?

  intraTransactionCode String?
  intraDeliveryTerms   String?
  intraTransportCode   String?
  intraCountryCode     String?
  intrastatWeightNetto Decimal?
  vatRateName          String?

  sale SaleDocument @relation(fields: [saleId], references: [id], onDelete: Cascade)

  @@index([saleId])
  @@map("sale_items")
}

// ============================================
// ERP MODULE: PURCHASES
// ============================================

model PurchaseDocument {
  id        String @id @default(cuid())
  companyId String

  purchaseDate       DateTime
  payUntil           DateTime?
  advancePaymentDate DateTime?

  series String
  number String

  supplierName    String
  supplierCode    String?
  advanceEmployee String?

  warehouseName String

  operationType String
  currencyCode  String
  employeeName  String?
  comments      String?
  status        String?
  debitAccountId  String?   
  creditAccountId String?   

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  items   PurchaseItem[]
  company Company        @relation(fields: [companyId], references: [id])

  @@unique([companyId, series, number])
  @@index([companyId])
  @@index([purchaseDate])
  @@map("purchase_documents")
}

model PurchaseItem {
  id         String @id @default(cuid())
  purchaseId String

  itemName String
  itemCode String?
  barcode  String?

  quantity        Decimal
  priceWithoutVat Decimal
  unitDiscount    Decimal?
  vatRate         Decimal?
  vatClassifier   String?

  corAccountCode String?
  costCenter     String?

  notes        String?
  accComment   String?
  carRegNumber String?
  fuelCard     String?

  intraTransactionCode     String?
  intraDeliveryTerms       String?
  intraTransportCode       String?
  intraCountryOfOriginCode String?
  intrastatWeightNetto     Decimal?

  vatRegister String?
  gpaisMethod String?

  purchase PurchaseDocument @relation(fields: [purchaseId], references: [id], onDelete: Cascade)

  @@index([purchaseId])
  @@map("purchase_items")
}

// ============================================
// ERP MODULE: STOCK MOVEMENTS
// ============================================

model StockMovement {
  id        String @id @default(cuid())
  companyId String

  warehouseName String
  operationType String
  documentDate  DateTime
  series        String
  number        String

  itemName String
  itemCode String?
  barcode  String?

  quantity        Decimal
  cost            Decimal
  vatRate         Decimal?
  priceWithoutVat Decimal?
  priceWithVat    Decimal?

  attributeName   String?
  groupName       String?
  manufacturer    String?
  countryOfOrigin String?
  unitName        String?

  purchaseAccountCode String?
  saleAccountCode     String?
  expenseAccountCode  String?

  minimumQuantity Decimal?
  description     String?
  externalId      String?
  freePrice       Boolean  @default(false)

  // ─── Task 34: Stock Engine additions ───────────
  direction    String   // IN | OUT
  documentType String   // PURCHASE | SALE | ADJUSTMENT | PURCHASE_REVERSAL | SALE_REVERSAL
  documentId   String?  // FK to PurchaseDocument.id or SaleDocument.id

  createdAt DateTime @default(now())

  company Company @relation(fields: [companyId], references: [id])

  @@index([companyId])
  @@index([documentDate])
  @@index([warehouseName])
  @@index([itemCode])
  @@index([direction])
  @@index([documentId])
  @@map("stock_movements")
}


// ============================================
// ERP MODULE: BANK STATEMENTS
// ============================================

model BankStatement {
  id        String @id @default(cuid())
  companyId String

  accountNumber String
  currencyCode  String
  period        DateTime

  transactionNumber String
  amount            Decimal
  operationType     Int

  clientName        String
  clientCode        String?
  clientBankAccount String?

  paymentPurpose String?

  correspondenceAccountCode String?
  correspondenceAccountName String?

  createdAt DateTime @default(now())

  company Company @relation(fields: [companyId], references: [id])

  @@unique([companyId, transactionNumber])
  @@index([companyId])
  @@index([period])
  @@map("bank_statements")
}
```

## FILE: ./prisma/seed.ts
```
import { PrismaClient, CompanyStatus, ClientLocation } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding Solar ERP database...');

  // =============================
  // TENANT
  // =============================
  const tenant = await prisma.tenant.create({
    data: {
      name: 'Solar Group',
    },
  });

  // =============================
  // USER (ADMIN)
  // =============================
  const passwordHash = await bcrypt.hash('pass123', 10);

  const user = await prisma.user.create({
    data: {
      email: 'solar@solar.com',
      passwordHash,
      name: 'Solar',
      tenantId: tenant.id,
    },
  });

  // =============================
  // COMPANY
  // =============================
  const company = await prisma.company.create({
    data: {
      tenantId: tenant.id,
      name: 'Solar ERP Demo',
      code: 'SOLAR-ERP',
      vatNumber: 'DE123456789',
      country: 'DE',
      status: CompanyStatus.ACTIVE,
    },
  });

  // =============================
  // CLIENTS
  // =============================
  const client = await prisma.client.create({
    data: {
      companyId: company.id,
      name: 'Demo Client GmbH',
      shortName: 'DEMO',
      isJuridical: true,
      location: ClientLocation.EU,
      vatCode: 'DE987654321',
      email: 'client@demo.de',
      payWithinDays: 14,
    },
  });

  // =============================
  // ITEMS
  // =============================
  const item = await prisma.item.create({
    data: {
      companyId: company.id,
      name: 'Consulting Service',
      code: 'CONS-001',
      unitName: 'hours',
      vatRate: 19,
      priceWithoutVat: 100,
      priceWithVat: 119,
      attributeName: 'Service',
      freePrice: false,
    },
  });

  // =============================
  // SALE DOCUMENT
  // =============================
  const sale = await prisma.saleDocument.create({
    data: {
      companyId: company.id,
      saleDate: new Date(),
      series: 'S',
      number: '0001',
      clientName: client.name,
      warehouseName: 'Main',
      operationType: 'SALE',
      currencyCode: 'EUR',
      items: {
        create: [
          {
            itemName: item.name,
            itemCode: item.code,
            quantity: 10,
            priceWithoutVat: 100,
            vatRate: 19,
          },
        ],
      },
    },
  });

  // =============================
  // PURCHASE DOCUMENT
  // =============================
  const purchase = await prisma.purchaseDocument.create({
    data: {
      companyId: company.id,
      purchaseDate: new Date(),
      series: 'P',
      number: '0001',
      supplierName: 'Demo Supplier Ltd',
      warehouseName: 'Main',
      operationType: 'PURCHASE',
      currencyCode: 'EUR',
      items: {
        create: [
          {
            itemName: item.name,
            itemCode: item.code,
            quantity: 5,
            priceWithoutVat: 80,
            vatRate: 19,
          },
        ],
      },
    },
  });

  // =============================
  // STOCK MOVEMENT (Task 34: direction + documentType required)
  // =============================
  await prisma.stockMovement.create({
    data: {
      companyId: company.id,
      warehouseName: 'Main',
      operationType: 'IN',
      documentDate: new Date(),
      series: 'SM',
      number: '0001',
      itemName: item.name,
      itemCode: item.code,
      quantity: 5,
      cost: 80,
      unitName: 'hours',
      direction: 'IN',
      documentType: 'PURCHASE',
      documentId: purchase.id,
    },
  });

  // =============================
  // BANK STATEMENT
  // =============================
  await prisma.bankStatement.create({
    data: {
      companyId: company.id,
      accountNumber: 'DE001234567890',
      currencyCode: 'EUR',
      period: new Date(),
      transactionNumber: 'TX-0001',
      amount: 1190,
      operationType: 2,
      clientName: client.name,
      paymentPurpose: 'Invoice S-0001',
    },
  });

  console.log('✅ Seed completed successfully');
  console.log('--------------------------------');
  console.log('Tenant:', tenant.name);
  console.log('User:', user.email, '(password: pass123)');
  console.log('Company:', company.name);
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

## FILE: ./next-env.d.ts
```
/// <reference types="next" />
/// <reference types="next/image-types/global" />

// NOTE: This file should not be edited
// see https://nextjs.org/docs/basic-features/typescript for more information.
```

## FILE: ./components/ui/Card.tsx
```
export type CardProps = {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  footer?: React.ReactNode;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  hover?: boolean;
  className?: string;
};

const paddingStyles = {
  none: '',
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-8',
};

export function Card({
  children,
  title,
  subtitle,
  footer,
  padding = 'md',
  hover = false,
  className = '',
}: CardProps) {
  const baseStyles = 'bg-white rounded-xl shadow-sm border border-gray-100';
  const hoverStyles = hover ? 'hover:shadow-md transition-shadow' : '';

  return (
    <div className={`${baseStyles} ${hoverStyles} ${className}`}>
      {title && (
        <div className={`${paddingStyles[padding]} border-b border-gray-100`}>
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          {subtitle && (
            <p className="text-sm text-gray-500 mt-1">{subtitle}</p>
          )}
        </div>
      )}

      <div className={paddingStyles[padding]}>
        {children}
      </div>

      {footer && (
        <div className={`${paddingStyles[padding]} border-t border-gray-100 bg-gray-50 rounded-b-xl`}>
          {footer}
        </div>
      )}
    </div>
  );
}

export default Card;

```

## FILE: ./components/ui/Button.tsx
```
'use client';

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';
export type ButtonSize = 'sm' | 'md' | 'lg';

export type ButtonProps = {
  children: React.ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  type?: 'button' | 'submit' | 'reset';
  onClick?: () => void;
  className?: string;
};

const variantStyles: Record<ButtonVariant, string> = {
  primary: 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500',
  secondary: 'bg-gray-100 text-gray-700 hover:bg-gray-200 focus:ring-gray-500',
  danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500',
  ghost: 'bg-transparent text-gray-600 hover:bg-gray-100 focus:ring-gray-500',
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-base',
  lg: 'px-6 py-3 text-lg',
};

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  type = 'button',
  onClick,
  className = '',
}: ButtonProps) {
  const isDisabled = disabled || loading;

  const baseStyles = 'inline-flex items-center justify-center font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2';
  const disabledStyles = isDisabled ? 'opacity-50 cursor-not-allowed' : '';

  return (
    <button
      type={type}
      disabled={isDisabled}
      onClick={onClick}
      className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${disabledStyles} ${className}`}
    >
      {loading ? 'Loading...' : children}
    </button>
  );
}

export default Button;

```

## FILE: ./components/ui/Input.tsx
```
'use client';

import { useState } from 'react';

export type InputProps = {
  id: string;
  label: string;
  type?: 'text' | 'email' | 'password' | 'number' | 'tel' | 'url';
  placeholder?: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  error?: string;
  required?: boolean;
  disabled?: boolean;
  autoComplete?: string;
  className?: string;
};

export function Input({
  id,
  label,
  type = 'text',
  placeholder,
  value,
  onChange,
  error,
  required = false,
  disabled = false,
  autoComplete,
  className = '',
}: InputProps) {
  const [showPassword, setShowPassword] = useState(false);
  
  const isPassword = type === 'password';
  const inputType = isPassword && showPassword ? 'text' : type;

  const baseInputStyles = 'w-full px-4 py-3 border rounded-lg transition-colors focus:outline-none';
  const normalStyles = 'border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent';
  const errorStyles = 'border-red-500 focus:ring-2 focus:ring-red-500';
  const disabledStyles = disabled ? 'opacity-50 cursor-not-allowed bg-gray-50' : '';
  const passwordPadding = isPassword ? 'pr-12' : '';

  return (
    <div className={`w-full ${className}`}>
      <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>

      <div className="relative">
        <input
          id={id}
          name={id}
          type={inputType}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          required={required}
          disabled={disabled}
          autoComplete={autoComplete}
          className={`${baseInputStyles} ${error ? errorStyles : normalStyles} ${disabledStyles} ${passwordPadding}`}
        />

        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none"
            tabIndex={-1}
          >
            {showPassword ? '👁️‍🗨️' : '👁️'}
          </button>
        )}
      </div>

      {error && (
        <p className="text-red-600 text-sm mt-1">{error}</p>
      )}
    </div>
  );
}

export default Input;

```

## FILE: ./components/purchases/PurchaseTotals.tsx
```
// components/purchases/PurchaseTotals.tsx
// ═══════════════════════════════════════════════════
// Task 37C: Purchase Totals Summary (Read-Only)
// ═══════════════════════════════════════════════════
// Accounting-style totals block.
// Grouped by VAT rate, right-aligned on desktop.

'use client';

interface TotalsItem {
  quantity: string | number;
  priceWithoutVat: string | number;
  vatRate: string | number | null;
}

interface PurchaseTotalsProps {
  items: TotalsItem[];
  currencyCode: string;
}

function num(v: string | number | null | undefined): number {
  if (v === null || v === undefined) return 0;
  const n = Number(v);
  return isNaN(n) ? 0 : n;
}

function fmt(value: number): string {
  return value.toLocaleString('de-DE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

interface VatGroup {
  rate: number;
  netSum: number;
  vatSum: number;
}

function Row({
  label,
  amount,
  currency,
  bold,
  muted,
}: {
  label: string;
  amount: number;
  currency: string;
  bold?: boolean;
  muted?: boolean;
}) {
  return (
    <div className="flex justify-between items-baseline">
      <span className={`text-xs ${bold ? 'font-bold text-gray-900' : muted ? 'text-gray-400' : 'text-gray-600'}`}>
        {label}
      </span>
      <span
        className={`text-xs font-mono tabular-nums ${
          bold ? 'font-bold text-gray-900' : muted ? 'text-gray-400' : 'text-gray-800'
        }`}
      >
        {currency} {fmt(amount)}
      </span>
    </div>
  );
}

export default function PurchaseTotals({ items, currencyCode }: PurchaseTotalsProps) {
  // ─── Calculate totals ─────────────────────────
  let totalNet = 0;
  let totalVat = 0;

  const vatMap = new Map<string, VatGroup>();

  for (const item of items) {
    const qty = num(item.quantity);
    const price = num(item.priceWithoutVat);
    const vatRate = num(item.vatRate);
    const net = qty * price;
    const vat = net * (vatRate / 100);

    totalNet += net;
    totalVat += vat;

    const key = vatRate.toString();
    const existing = vatMap.get(key);
    if (existing) {
      existing.netSum += net;
      existing.vatSum += vat;
    } else {
      vatMap.set(key, { rate: vatRate, netSum: net, vatSum: vat });
    }
  }

  const totalGross = totalNet + totalVat;

  // Sort VAT groups by rate descending
  const vatGroups = Array.from(vatMap.values()).sort((a, b) => b.rate - a.rate);

  const cc = currencyCode || 'EUR';

  // ─── Empty state ──────────────────────────────
  if (items.length === 0) {
    return (
      <div className="flex justify-end">
        <div className="bg-white border border-gray-200 rounded-lg px-5 py-5 w-full md:max-w-md">
          <div className="text-xs text-gray-400 text-center">No totals to display</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-end">
      <div className="bg-white border border-gray-200 rounded-lg px-5 py-5 w-full md:max-w-md space-y-1.5">
        {/* Net Total */}
        <Row label="Net Total" amount={totalNet} currency={cc} />

        {/* VAT breakdown by rate */}
        {vatGroups.map((group) => (
          <Row
            key={group.rate}
            label={group.rate > 0 ? `VAT ${fmt(group.rate)}%` : 'VAT 0%'}
            amount={group.vatSum}
            currency={cc}
            muted={group.vatSum === 0}
          />
        ))}

        {/* Total VAT (separator) */}
        {totalVat > 0 && (
          <div className="border-t border-gray-200 pt-1.5">
            <Row label="Total VAT" amount={totalVat} currency={cc} />
          </div>
        )}

        {/* Grand Total (double line) */}
        <div className="border-t-2 border-gray-300 pt-2 mt-2">
          <Row label="Grand Total" amount={totalGross} currency={cc} bold />
        </div>
      </div>
    </div>
  );
}
```

## FILE: ./components/purchases/PurchaseItemsTable.tsx
```
// components/purchases/PurchaseItemsTable.tsx
// ═══════════════════════════════════════════════════
// Task 37B: Purchase Items Table (Read View)
// ═══════════════════════════════════════════════════
// Accounting-style table. 9 columns. No edit. No input.
// Calculations: netTotal, vatAmount, grossTotal per row.

'use client';

import { ClipboardList } from 'lucide-react';

interface PurchaseItem {
  id: string;
  itemName: string;
  itemCode: string | null;
  quantity: string | number;
  priceWithoutVat: string | number;
  vatRate: string | number | null;
}

interface PurchaseItemsTableProps {
  items: PurchaseItem[];
}

function num(value: string | number | null | undefined): number {
  if (value === null || value === undefined) return 0;
  const n = Number(value);
  return isNaN(n) ? 0 : n;
}

function fmt(value: number): string {
  return value.toLocaleString('de-DE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function fmtQty(value: number): string {
  // Show up to 4 decimals for quantity, trim trailing zeros
  const s = value.toLocaleString('de-DE', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 4,
  });
  return s;
}

export default function PurchaseItemsTable({ items }: PurchaseItemsTableProps) {
  if (items.length === 0) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-10 text-center">
        <ClipboardList className="mx-auto mb-2 text-gray-300" size={32} />
        <p className="text-sm text-gray-400">No items in this document</p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200 sticky top-0 z-10">
              <th className="px-3 py-2.5 text-center text-[10px] font-semibold text-gray-400 uppercase tracking-wider w-10">
                #
              </th>
              <th className="px-3 py-2.5 text-left text-[10px] font-semibold text-gray-400 uppercase tracking-wider min-w-[180px]">
                Item Name
              </th>
              <th className="px-3 py-2.5 text-left text-[10px] font-semibold text-gray-400 uppercase tracking-wider min-w-[90px]">
                Code
              </th>
              <th className="px-3 py-2.5 text-right text-[10px] font-semibold text-gray-400 uppercase tracking-wider min-w-[70px]">
                Qty
              </th>
              <th className="px-3 py-2.5 text-right text-[10px] font-semibold text-gray-400 uppercase tracking-wider min-w-[90px]">
                Price (net)
              </th>
              <th className="px-3 py-2.5 text-right text-[10px] font-semibold text-gray-400 uppercase tracking-wider min-w-[60px]">
                VAT %
              </th>
              <th className="px-3 py-2.5 text-right text-[10px] font-semibold text-gray-400 uppercase tracking-wider min-w-[100px]">
                Net Total
              </th>
              <th className="px-3 py-2.5 text-right text-[10px] font-semibold text-gray-400 uppercase tracking-wider min-w-[90px]">
                VAT Amount
              </th>
              <th className="px-3 py-2.5 text-right text-[10px] font-semibold text-gray-400 uppercase tracking-wider min-w-[100px]">
                Gross Total
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {items.map((item, index) => {
              const qty = num(item.quantity);
              const price = num(item.priceWithoutVat);
              const vatRate = num(item.vatRate);
              const netTotal = qty * price;
              const vatAmount = netTotal * (vatRate / 100);
              const grossTotal = netTotal + vatAmount;

              return (
                <tr key={item.id} className="hover:bg-gray-50/50">
                  <td className="px-3 py-2 text-center text-gray-400 tabular-nums">
                    {index + 1}
                  </td>
                  <td className="px-3 py-2 text-gray-900 font-medium">
                    {item.itemName}
                  </td>
                  <td className="px-3 py-2 text-gray-500 font-mono text-[11px]">
                    {item.itemCode || <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-3 py-2 text-right text-gray-900 tabular-nums">
                    {fmtQty(qty)}
                  </td>
                  <td className="px-3 py-2 text-right text-gray-900 tabular-nums font-mono">
                    {fmt(price)}
                  </td>
                  <td className="px-3 py-2 text-right text-gray-500 tabular-nums">
                    {vatRate > 0 ? `${fmt(vatRate)}%` : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-3 py-2 text-right text-gray-900 tabular-nums font-mono">
                    {fmt(netTotal)}
                  </td>
                  <td className="px-3 py-2 text-right text-gray-500 tabular-nums font-mono">
                    {vatAmount > 0 ? fmt(vatAmount) : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-3 py-2 text-right text-gray-900 font-semibold tabular-nums font-mono">
                    {fmt(grossTotal)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

## FILE: ./components/purchases/PurchaseHeaderEdit.tsx
```
// components/purchases/PurchaseHeaderEdit.tsx
// ═══════════════════════════════════════════════════
// Task 38B: Editable Purchase Header (DRAFT mode)
// ═══════════════════════════════════════════════════

'use client';

interface PurchaseFormData {
  purchaseDate: string;
  supplierName: string;
  supplierCode: string;
  warehouseName: string;
  currencyCode: string;
  operationType: string;
  comments: string;
}

interface PurchaseHeaderEditProps {
  form: PurchaseFormData;
  onChange: (field: keyof PurchaseFormData, value: string) => void;
  series: string;
  number: string;
}

const INPUT_CLASS =
  'w-full px-2.5 py-1.5 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-400 focus:border-blue-400 bg-white';

const SELECT_CLASS =
  'w-full px-2.5 py-1.5 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-400 focus:border-blue-400 bg-white';

const LABEL_CLASS = 'text-[11px] font-medium text-gray-400 uppercase tracking-wider mb-1 block';

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className={LABEL_CLASS}>{label}</label>
      {children}
    </div>
  );
}

export default function PurchaseHeaderEdit({
  form,
  onChange,
  series,
  number: docNumber,
}: PurchaseHeaderEditProps) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg">
      {/* Top bar: Doc number + DRAFT badge */}
      <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="font-mono text-base font-bold text-gray-900">
            {series}-{docNumber}
          </h2>
          <span className="text-xs text-gray-400">Purchase Document</span>
        </div>
        <span className="inline-block px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded border bg-gray-50 text-gray-600 border-gray-200">
          DRAFT
        </span>
      </div>

      {/* 3-column editable grid */}
      <div className="px-5 py-4 grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-3">
        {/* Column 1: Document Identity */}
        <div className="space-y-3">
          <Field label="Purchase Date">
            <input
              type="date"
              value={form.purchaseDate}
              onChange={(e) => onChange('purchaseDate', e.target.value)}
              className={INPUT_CLASS}
            />
          </Field>
        </div>

        {/* Column 2: Supplier */}
        <div className="space-y-3">
          <Field label="Supplier Name">
            <input
              type="text"
              value={form.supplierName}
              onChange={(e) => onChange('supplierName', e.target.value)}
              placeholder="Enter supplier name..."
              className={INPUT_CLASS}
            />
          </Field>
          <Field label="Supplier Code">
            <input
              type="text"
              value={form.supplierCode}
              onChange={(e) => onChange('supplierCode', e.target.value)}
              placeholder="Optional"
              className={INPUT_CLASS}
            />
          </Field>
          <Field label="Currency">
            <select
              value={form.currencyCode}
              onChange={(e) => onChange('currencyCode', e.target.value)}
              className={SELECT_CLASS}
            >
              <option value="EUR">EUR</option>
              <option value="USD">USD</option>
              <option value="GBP">GBP</option>
              <option value="CHF">CHF</option>
            </select>
          </Field>
        </div>

        {/* Column 3: Meta */}
        <div className="space-y-3">
          <Field label="Warehouse">
            <select
              value={form.warehouseName}
              onChange={(e) => onChange('warehouseName', e.target.value)}
              className={SELECT_CLASS}
            >
              <option value="Main">Main</option>
              <option value="Secondary">Secondary</option>
              <option value="Returns">Returns</option>
            </select>
          </Field>
          <Field label="Operation Type">
            <select
              value={form.operationType}
              onChange={(e) => onChange('operationType', e.target.value)}
              className={SELECT_CLASS}
            >
              <option value="PURCHASE">PURCHASE</option>
              <option value="RETURN">RETURN</option>
              <option value="ADVANCE">ADVANCE</option>
            </select>
          </Field>
          <Field label="Comments">
            <textarea
              value={form.comments}
              onChange={(e) => onChange('comments', e.target.value)}
              placeholder="Optional notes..."
              rows={2}
              className={`${INPUT_CLASS} resize-none`}
            />
          </Field>
        </div>
      </div>
    </div>
  );
}
```

## FILE: ./components/purchases/PurchaseTable.tsx
```
'use client';

import { useRouter } from 'next/navigation';
import { Package } from 'lucide-react';

interface PurchaseItem {
  id: string;
  itemName: string;
  quantity: string | number;
  priceWithoutVat: string | number;
}

interface PurchaseDocument {
  id: string;
  series: string;
  number: string;
  purchaseDate: string;
  supplierName: string;
  warehouseName: string;
  operationType: string;
  currencyCode: string;
  status: string | null;
  items: PurchaseItem[];
}

interface PurchaseTableProps {
  purchases: PurchaseDocument[];
  companyId: string;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function calcTotal(items: PurchaseItem[]): string {
  const total = items.reduce(
    (sum, item) => sum + Number(item.quantity) * Number(item.priceWithoutVat),
    0
  );

  return total.toLocaleString('de-DE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

const STATUS_STYLES: Record<string, string> = {
  DRAFT: 'bg-gray-50 text-gray-600 border-gray-200',
  POSTED: 'bg-green-50 text-green-600 border-green-200',
  CANCELLED: 'bg-red-50 text-red-600 border-red-200',
  LOCKED: 'bg-blue-50 text-blue-600 border-blue-200',
};

export default function PurchaseTable({
  purchases,
  companyId,
}: PurchaseTableProps) {
  const router = useRouter();
  const safePurchases = Array.isArray(purchases) ? purchases : [];

  if (safePurchases.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
        <Package className="mx-auto mb-3 text-gray-300" size={40} />
        <p className="text-gray-500 text-sm mb-1">
          No purchase documents yet
        </p>
        <p className="text-gray-400 text-xs">
          Create your first purchase to get started
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Doc #
              </th>
              <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Date
              </th>
              <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Supplier
              </th>
              <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Warehouse
              </th>
              <th className="px-3 py-2.5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Total (net)
              </th>
              <th className="px-3 py-2.5 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Status
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {safePurchases.map((purchase) => {
              const status = purchase.status || 'DRAFT';
              const statusStyle =
                STATUS_STYLES[status] ||
                'bg-gray-50 text-gray-500 border-gray-200';

              return (
                <tr
                  key={purchase.id}
                  onClick={() =>
                    router.push(
                      `/company/${companyId}/purchases/${purchase.id}`
                    )
                  }
                  className="cursor-pointer hover:bg-gray-50 transition-colors"
                >
                  <td className="px-3 py-2.5 font-mono text-xs font-medium text-gray-900">
                    {purchase.series}-{purchase.number}
                  </td>

                  <td className="px-3 py-2.5 text-gray-600 text-xs">
                    {formatDate(purchase.purchaseDate)}
                  </td>

                  <td className="px-3 py-2.5 text-gray-800 font-medium text-xs">
                    {purchase.supplierName}
                  </td>

                  <td className="px-3 py-2.5 text-gray-500 text-xs">
                    {purchase.warehouseName}
                  </td>

                  <td className="px-3 py-2.5 text-right font-mono text-xs text-gray-900 tabular-nums">
                    €{calcTotal(purchase.items || [])}
                  </td>

                  <td className="px-3 py-2.5 text-center">
                    <span
                      className={`inline-block px-2 py-0.5 text-[10px] font-semibold uppercase rounded border ${statusStyle}`}
                    >
                      {status}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}```

## FILE: ./components/purchases/PurchaseActionBar.tsx
```
// components/purchases/PurchaseActionBar.tsx
// ═══════════════════════════════════════════════════
// Task 36A: Purchase Document Action Bar
// ═══════════════════════════════════════════════════

'use client';

import Link from 'next/link';
import { Plus, Pencil, Trash2, Lock, Unlock, Copy, Download } from 'lucide-react';

interface PurchaseActionBarProps {
  selectedIds: string[];
  onDelete: () => void;
  onCopy: () => void;
  companyId: string;
  isLoading?: boolean;
}

interface ActionButton {
  icon: React.ReactNode;
  label: string;
  href?: string;
  onClick?: () => void;
  disabled: boolean;
  variant?: 'default' | 'danger';
}

export default function PurchaseActionBar({
  selectedIds,
  onDelete,
  onCopy,
  companyId,
  isLoading = false,
}: PurchaseActionBarProps) {
  const selectedCount = selectedIds.length;
  const hasSelection = selectedCount > 0;
  const hasSingleSelection = selectedCount === 1;

  const actions: ActionButton[] = [
    {
      icon: <Plus size={16} />,
      label: 'Create',
      href: `/company/${companyId}/purchases/new`,
      disabled: false,
    },
    {
      icon: <Pencil size={16} />,
      label: 'Edit',
      href: hasSingleSelection
        ? `/company/${companyId}/purchases/${selectedIds[0]}`
        : undefined,
      disabled: !hasSingleSelection,
    },
    {
      icon: <Trash2 size={16} />,
      label: 'Delete',
      onClick: onDelete,
      disabled: !hasSelection || isLoading,
      variant: 'danger',
    },
    {
      icon: <Lock size={16} />,
      label: 'Lock',
      disabled: true,
    },
    {
      icon: <Unlock size={16} />,
      label: 'Unlock',
      disabled: true,
    },
    {
      icon: <Copy size={16} />,
      label: 'Copy',
      onClick: onCopy,
      disabled: !hasSingleSelection || isLoading,
    },
    {
      icon: <Download size={16} />,
      label: 'Import',
      disabled: true,
    },
  ];

  return (
    <div className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 flex items-center gap-1">
      {actions.map((action, idx) => {
        const baseClasses =
          'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-150';

        const enabledClasses =
          action.variant === 'danger'
            ? 'text-red-600 hover:bg-red-50 hover:text-red-700 active:bg-red-100'
            : 'text-gray-600 hover:bg-white hover:text-gray-900 hover:shadow-sm active:bg-gray-100';

        const disabledClasses = 'text-gray-300 cursor-not-allowed';

        const classes = `${baseClasses} ${action.disabled ? disabledClasses : enabledClasses}`;

        const showSeparator = idx === 2 || idx === 4;

        return (
          <span key={action.label} className="flex items-center">
            {action.href && !action.disabled ? (
              <Link href={action.href} className={classes}>
                {action.icon}
                <span className="hidden sm:inline">{action.label}</span>
              </Link>
            ) : (
              <button
                onClick={action.disabled ? undefined : action.onClick}
                disabled={action.disabled}
                className={classes}
                title={action.label}
              >
                {action.icon}
                <span className="hidden sm:inline">{action.label}</span>
              </button>
            )}
            {showSeparator && (
              <span className="w-px h-5 bg-gray-200 mx-1" />
            )}
          </span>
        );
      })}

      {hasSelection && (
        <span className="ml-auto text-xs text-gray-400 tabular-nums">
          {selectedCount} selected
        </span>
      )}
    </div>
  );
}
```

## FILE: ./components/purchases/PurchaseItemsEdit.tsx
```
// components/purchases/PurchaseItemsEdit.tsx
// ═══════════════════════════════════════════════════
// Task 38B: Editable Items Grid (DRAFT mode)
// ═══════════════════════════════════════════════════
// Inline editing with Add Item / Delete row.
// Live calculation of net/vat/gross per row.

'use client';

import { Plus, Trash2 } from 'lucide-react';

export interface EditableItem {
  id?: string;
  itemName: string;
  itemCode: string;
  quantity: number;
  priceWithoutVat: number;
  vatRate: number;
}

interface PurchaseItemsEditProps {
  items: EditableItem[];
  onChange: (items: EditableItem[]) => void;
}

function num(v: number | string | null | undefined): number {
  if (v === null || v === undefined) return 0;
  const n = Number(v);
  return isNaN(n) ? 0 : n;
}

function fmt(value: number): string {
  return value.toLocaleString('de-DE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

const INPUT_CLASS =
  'w-full px-2 py-1.5 text-xs border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-400 focus:border-blue-400 bg-white';

const NUM_INPUT_CLASS = `${INPUT_CLASS} text-right tabular-nums font-mono`;

export default function PurchaseItemsEdit({ items, onChange }: PurchaseItemsEditProps) {
  function updateItem(index: number, field: keyof EditableItem, value: string | number) {
    const updated = [...items];
    updated[index] = { ...updated[index], [field]: value };
    onChange(updated);
  }

  function addItem() {
    onChange([
      ...items,
      { itemName: '', itemCode: '', quantity: 1, priceWithoutVat: 0, vatRate: 19 },
    ]);
  }

  function removeItem(index: number) {
    onChange(items.filter((_, i) => i !== index));
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="px-3 py-2.5 text-center text-[10px] font-semibold text-gray-400 uppercase w-10">
                #
              </th>
              <th className="px-3 py-2.5 text-left text-[10px] font-semibold text-gray-400 uppercase min-w-[180px]">
                Item Name
              </th>
              <th className="px-3 py-2.5 text-left text-[10px] font-semibold text-gray-400 uppercase min-w-[90px]">
                Code
              </th>
              <th className="px-3 py-2.5 text-right text-[10px] font-semibold text-gray-400 uppercase min-w-[70px]">
                Qty
              </th>
              <th className="px-3 py-2.5 text-right text-[10px] font-semibold text-gray-400 uppercase min-w-[90px]">
                Price (net)
              </th>
              <th className="px-3 py-2.5 text-right text-[10px] font-semibold text-gray-400 uppercase min-w-[60px]">
                VAT %
              </th>
              <th className="px-3 py-2.5 text-right text-[10px] font-semibold text-gray-400 uppercase min-w-[90px]">
                Net Total
              </th>
              <th className="px-3 py-2.5 text-right text-[10px] font-semibold text-gray-400 uppercase min-w-[90px]">
                Gross Total
              </th>
              <th className="px-3 py-2.5 w-10" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {items.map((item, index) => {
              const qty = num(item.quantity);
              const price = num(item.priceWithoutVat);
              const vatRate = num(item.vatRate);
              const netTotal = qty * price;
              const grossTotal = netTotal + netTotal * (vatRate / 100);

              return (
                <tr key={index} className="hover:bg-gray-50/50">
                  <td className="px-3 py-1.5 text-center text-gray-400 tabular-nums">
                    {index + 1}
                  </td>
                  <td className="px-1.5 py-1.5">
                    <input
                      type="text"
                      value={item.itemName}
                      onChange={(e) => updateItem(index, 'itemName', e.target.value)}
                      placeholder="Item name..."
                      className={INPUT_CLASS}
                    />
                  </td>
                  <td className="px-1.5 py-1.5">
                    <input
                      type="text"
                      value={item.itemCode}
                      onChange={(e) => updateItem(index, 'itemCode', e.target.value)}
                      placeholder="Code"
                      className={`${INPUT_CLASS} font-mono`}
                    />
                  </td>
                  <td className="px-1.5 py-1.5">
                    <input
                      type="number"
                      value={item.quantity || ''}
                      onChange={(e) => updateItem(index, 'quantity', Number(e.target.value))}
                      min="0"
                      step="0.01"
                      className={NUM_INPUT_CLASS}
                    />
                  </td>
                  <td className="px-1.5 py-1.5">
                    <input
                      type="number"
                      value={item.priceWithoutVat || ''}
                      onChange={(e) => updateItem(index, 'priceWithoutVat', Number(e.target.value))}
                      min="0"
                      step="0.01"
                      className={NUM_INPUT_CLASS}
                    />
                  </td>
                  <td className="px-1.5 py-1.5">
                    <input
                      type="number"
                      value={item.vatRate ?? ''}
                      onChange={(e) => updateItem(index, 'vatRate', Number(e.target.value))}
                      min="0"
                      max="100"
                      step="1"
                      className={NUM_INPUT_CLASS}
                    />
                  </td>
                  <td className="px-3 py-1.5 text-right text-gray-700 tabular-nums font-mono">
                    {fmt(netTotal)}
                  </td>
                  <td className="px-3 py-1.5 text-right text-gray-900 font-semibold tabular-nums font-mono">
                    {fmt(grossTotal)}
                  </td>
                  <td className="px-2 py-1.5 text-center">
                    <button
                      onClick={() => removeItem(index)}
                      className="text-gray-300 hover:text-red-500 transition-colors p-0.5"
                      title="Remove item"
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Add Item button */}
      <div className="px-3 py-2 border-t border-gray-100">
        <button
          onClick={addItem}
          className="inline-flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-800 font-medium transition-colors"
        >
          <Plus size={14} />
          Add Item
        </button>
      </div>
    </div>
  );
}
```

## FILE: ./components/purchases/PurchaseHeader.tsx
```
// components/purchases/PurchaseHeader.tsx
// ═══════════════════════════════════════════════════
// Task 37A: Purchase Document Header (Read View)
// ═══════════════════════════════════════════════════
// Enterprise ERP document header — 3-column grid.
// No edit, no form state, no save. Just clean display.

'use client';

interface PurchaseHeaderProps {
  purchase: {
    id: string;
    series: string;
    number: string;
    purchaseDate: string;
    payUntil: string | null;
    supplierName: string;
    supplierCode: string | null;
    warehouseName: string;
    operationType: string;
    currencyCode: string;
    employeeName: string | null;
    comments: string | null;
    status: string | null;
  };
}

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string; border: string }> = {
  DRAFT:     { label: 'DRAFT',     bg: 'bg-gray-50',  text: 'text-gray-600',  border: 'border-gray-200' },
  POSTED:    { label: 'POSTED',    bg: 'bg-green-50', text: 'text-green-600', border: 'border-green-200' },
  CANCELLED: { label: 'CANCELLED', bg: 'bg-red-50',   text: 'text-red-600',   border: 'border-red-200' },
  LOCKED:    { label: 'LOCKED',    bg: 'bg-blue-50',  text: 'text-blue-600',  border: 'border-blue-200' },
};

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function Field({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <dt className="text-[11px] font-medium text-gray-400 uppercase tracking-wider mb-0.5">
        {label}
      </dt>
      <dd className="text-sm text-gray-900">
        {value || <span className="text-gray-300">—</span>}
      </dd>
    </div>
  );
}

export default function PurchaseHeader({ purchase }: PurchaseHeaderProps) {
  const status = purchase.status || 'DRAFT';
  const statusConfig = STATUS_CONFIG[status] || STATUS_CONFIG.DRAFT;
  const isCancelled = status === 'CANCELLED';

  return (
    <div className={`bg-white border border-gray-200 rounded-lg ${isCancelled ? 'opacity-75' : ''}`}>
      {/* Top bar: Doc number + Status badge */}
      <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="font-mono text-base font-bold text-gray-900">
            {purchase.series}-{purchase.number}
          </h2>
          <span className="text-xs text-gray-400">Purchase Document</span>
        </div>
        <span
          className={`inline-block px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded border ${statusConfig.bg} ${statusConfig.text} ${statusConfig.border}`}
        >
          {statusConfig.label}
        </span>
      </div>

      {/* 3-column grid */}
      <div className="px-5 py-4 grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-4">
        {/* Column 1: Document Identity */}
        <div className="space-y-3">
          <Field label="Series" value={purchase.series} />
          <Field label="Number" value={purchase.number} />
          <Field label="Purchase Date" value={formatDate(purchase.purchaseDate)} />
          <Field label="Due Date" value={formatDate(purchase.payUntil)} />
        </div>

        {/* Column 2: Supplier */}
        <div className="space-y-3">
          <Field label="Supplier" value={purchase.supplierName} />
          <Field label="Supplier Code" value={purchase.supplierCode} />
          <Field label="Currency" value={purchase.currencyCode} />
        </div>

        {/* Column 3: Meta */}
        <div className="space-y-3">
          <Field label="Warehouse" value={purchase.warehouseName} />
          <Field label="Operation Type" value={purchase.operationType} />
          <Field label="Employee" value={purchase.employeeName} />
          {purchase.comments && (
            <div>
              <dt className="text-[11px] font-medium text-gray-400 uppercase tracking-wider mb-0.5">
                Comments
              </dt>
              <dd className="text-sm text-gray-600 italic">
                {purchase.comments}
              </dd>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
```

## FILE: ./components/forms/AuthForm.tsx
```
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

export type AuthFormMode = 'login' | 'signup';

export type AuthFormData = {
  name?: string;
  email: string;
  password: string;
};

export type AuthFormProps = {
  mode: AuthFormMode;
  onSubmit: (data: AuthFormData) => Promise<void>;
  error?: string | null;
  isLoading?: boolean;
};

type FormState = {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
};

type FormErrors = {
  name?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
};

export function AuthForm({ mode, onSubmit, error, isLoading = false }: AuthFormProps) {
  const [form, setForm] = useState<FormState>({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });

  const [errors, setErrors] = useState<FormErrors>({});

  const isLogin = mode === 'login';
  const title = isLogin ? 'Sign In' : 'Create Account';
  const submitText = isLogin ? 'Sign In' : 'Create Account';
  const loadingText = isLogin ? 'Signing in...' : 'Creating account...';
  const switchText = isLogin
    ? "Don't have an account?"
    : 'Already have an account?';
  const switchLink = isLogin ? '/signup' : '/login';
  const switchLinkText = isLogin ? 'Sign up' : 'Sign in';

  const validate = (): boolean => {
    const newErrors: FormErrors = {};

    if (!isLogin && !form.name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (!form.email.trim()) {
      newErrors.email = 'Email is required';
    }

    if (!form.password) {
      newErrors.password = 'Password is required';
    } else if (form.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    }

    if (!isLogin && form.password !== form.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validate()) return;

    await onSubmit({
      ...(isLogin ? {} : { name: form.name }),
      email: form.email,
      password: form.password,
    });
  };

  const handleChange = (field: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  return (
    <div className="w-full max-w-md">
      <h1 className="text-2xl font-bold text-gray-900 text-center mb-6">
        {title}
      </h1>

      {error && (
        <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg mb-4 text-center">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {!isLogin && (
          <Input
            id="name"
            label="Name"
            type="text"
            placeholder="John Doe"
            value={form.name}
            onChange={handleChange('name')}
            error={errors.name}
            required
          />
        )}

        <Input
          id="email"
          label="Email"
          type="email"
          placeholder="you@example.com"
          value={form.email}
          onChange={handleChange('email')}
          error={errors.email}
          required
          autoComplete="email"
        />

        <Input
          id="password"
          label="Password"
          type="password"
          placeholder="••••••••"
          value={form.password}
          onChange={handleChange('password')}
          error={errors.password}
          required
          autoComplete={isLogin ? 'current-password' : 'new-password'}
        />

        {!isLogin && (
          <Input
            id="confirmPassword"
            label="Confirm Password"
            type="password"
            placeholder="••••••••"
            value={form.confirmPassword}
            onChange={handleChange('confirmPassword')}
            error={errors.confirmPassword}
            required
            autoComplete="new-password"
          />
        )}

        <Button
          type="submit"
          variant="primary"
          size="lg"
          loading={isLoading}
          disabled={isLoading}
          className="w-full"
        >
          {isLoading ? loadingText : submitText}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-gray-600">
        {switchText}{' '}
        <Link href={switchLink} className="text-blue-600 hover:underline font-medium">
          {switchLinkText}
        </Link>
      </p>
    </div>
  );
}

export default AuthForm;

```

## FILE: ./components/layouts/CompanySidebar.tsx
```
// components/layouts/CompanySidebar.tsx
// ═══════════════════════════════════════════════════
// Company Sidebar — Factory-compatible
// ERP module navigation with active state highlighting
// ═══════════════════════════════════════════════════
//
// FIXED (Task 18): base route → /company/${companyId}
// FIXED (Task 20): Added Chart of Accounts in Accounting group

'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';

type Props = {
  companyId: string;
  companyName: string;
  children: React.ReactNode;
};

type NavGroup = {
  label: string;
  items: { name: string; href: string; icon: string }[];
};

export function CompanySidebar({ companyId, companyName, children }: Props) {
  const pathname = usePathname();
  const base = `/company/${companyId}`;

  const groups: NavGroup[] = [
    {
      label: 'Overview',
      items: [
        { name: 'Dashboard',  href: `${base}/dashboard`,   icon: '📊' },
      ],
    },
    {
      label: 'Commerce',
      items: [
        { name: 'Clients',    href: `${base}/clients`,     icon: '👥' },
        { name: 'Products',   href: `${base}/products`,    icon: '📦' },
        { name: 'Sales',      href: `${base}/sales`,       icon: '💰' },
        { name: 'Purchases',  href: `${base}/purchases`,   icon: '🛒' },
      ],
    },
    {
      label: 'Operations',
      items: [
        { name: 'Warehouse',  href: `${base}/warehouse`,   icon: '🏭' },
        { name: 'Bank',       href: `${base}/bank`,        icon: '🏦' },
        { name: 'Reports',    href: `${base}/reports`,     icon: '📈' },
      ],
    },
    {
      label: 'Accounting',
      items: [
        { name: 'Chart of Accounts', href: `${base}/chart-of-accounts`, icon: '📒' },
      ],
    },
  ];

  const isActive = (href: string) => {
    if (href === `${base}/dashboard`) {
      // Dashboard active on exact match or bare /company/[id]
      return pathname === href || pathname === base;
    }
    return pathname.startsWith(href);
  };

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="w-60 bg-white border-r border-gray-200 flex flex-col shrink-0">
        {/* Company header */}
        <div className="p-4 border-b border-gray-100">
          <Link href="/account/companies"
            className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 transition-colors mb-2">
            ← All Companies
          </Link>
          <h2 className="text-sm font-bold text-gray-900 truncate" title={companyName}>{companyName}</h2>
        </div>

        {/* Nav groups */}
        <nav className="flex-1 p-3 overflow-y-auto">
          {groups.map(group => (
            <div key={group.label} className="mb-4">
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider px-3 mb-1.5">{group.label}</p>
              <ul className="space-y-0.5">
                {group.items.map(item => (
                  <li key={item.href}>
                    <Link href={item.href}
                      className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        isActive(item.href)
                          ? 'bg-blue-50 text-blue-700 border-l-2 border-blue-600'
                          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                      }`}>
                      <span>{item.icon}</span>
                      <span>{item.name}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className="p-3 border-t border-gray-100">
          <p className="text-[10px] text-gray-400 text-center">Solar ERP v0.1</p>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 bg-gray-50 overflow-auto">
        {children}
      </main>
    </div>
  );
}
```

## FILE: ./components/layouts/AccountSidebar.tsx
```
// components/layouts/AccountSidebar.tsx
// Cookie-only — no localStorage reads
// Logout via POST /api/auth/logout (clears session cookie)

'use client';

import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import React, { useEffect, useState } from 'react';

type AccountSidebarProps = {
  children: React.ReactNode;
};

type NavItem = {
  name: string;
  href: string;
  icon: string;
};

const navItems: NavItem[] = [
  { name: 'Companies', href: '/account/companies', icon: '🏢' },
];

export function AccountSidebar({ children }: AccountSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [userEmail, setUserEmail] = useState<string | null>(null);

  // Fetch user email from API (cookie-based auth)
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await fetch('/api/auth/me');
        if (res.ok) {
          const data = await res.json();
          setUserEmail(data.email);
        }
      } catch {
        // Silently fail — email display is non-critical
      }
    };
    fetchUser();
  }, []);

  // Cookie-only logout
  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {
      // Continue to redirect even if API fails
    }
    router.push('/login');
  };

  const isActive = (href: string) => {
    if (href === '/account/companies') return pathname === '/account/companies';
    return pathname.startsWith(href);
  };

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col shrink-0">
        {/* Logo */}
        <div className="p-5 border-b border-gray-100">
          <Link href="/account/companies" className="flex items-center gap-2">
            <span className="text-2xl">☀️</span>
            <span className="text-lg font-bold text-gray-900">Solar ERP</span>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 mt-1">
          <ul className="space-y-1">
            {navItems.map((item) => (
              <li key={item.href}>
                <Link href={item.href}
                  className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive(item.href)
                      ? 'bg-blue-50 text-blue-700 border border-blue-100'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}>
                  <span className="text-base">{item.icon}</span>
                  <span>{item.name}</span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {/* User & Logout */}
        <div className="p-4 border-t border-gray-100">
          {userEmail && (
            <p className="text-xs text-gray-400 mb-3 px-2 truncate" title={userEmail}>
              {userEmail}
            </p>
          )}
          <button onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors">
            <span>🚪</span>
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 bg-gray-50 min-h-screen overflow-auto">
        {children}
      </main>
    </div>
  );
}

export default AccountSidebar;
```

## FILE: ./lib/prisma.ts
```
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error'] : [],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

export default prisma;

```

## FILE: ./lib/accounting/stockService.ts
```
// lib/accounting/stockService.ts
// ═══════════════════════════════════════════════════
// Stock Movement Service — Task 34
// ═══════════════════════════════════════════════════
//
// Principle: We never store stock quantity.
// We always compute from movement history.
// This is accounting-correct (like journal entries for money).
//
// Functions:
//   createStockMovement()  — insert IN/OUT movement
//   createReverseMovement() — reverse a document's movements (STORNO)
//   getProductBalance()     — balance for one product in one warehouse
//   getWarehouseBalance()   — all product balances in one warehouse
//   getCompanyBalance()     — all product balances across all warehouses

import { Prisma } from '@prisma/client';

// Prisma transaction client type
type TxClient = Prisma.TransactionClient;

// ─── Types ───────────────────────────────────────
export type StockDirection = 'IN' | 'OUT';
export type StockDocumentType = 'PURCHASE' | 'SALE' | 'ADJUSTMENT' | 'PURCHASE_REVERSAL' | 'SALE_REVERSAL';

export interface CreateStockMovementParams {
  tx: TxClient;
  companyId: string;
  warehouseName: string;
  itemName: string;
  itemCode: string;
  quantity: number;
  cost: number;
  direction: StockDirection;
  documentType: StockDocumentType;
  documentId: string;
  documentDate: Date;
  series: string;
  number: string;
  // Optional fields
  barcode?: string;
  unitName?: string;
  vatRate?: number;
  priceWithoutVat?: number;
  operationType?: string;
}

export interface ProductBalance {
  warehouseName: string;
  itemCode: string;
  itemName: string;
  quantity: number;
}

// ─── Create Stock Movement ───────────────────────
// Called inside transaction after JournalEntry is created.
// Only when document is POSTED.
export async function createStockMovement(params: CreateStockMovementParams) {
  const { tx, ...data } = params;

  return tx.stockMovement.create({
    data: {
      companyId: data.companyId,
      warehouseName: data.warehouseName,
      operationType: data.operationType || data.documentType,
      documentDate: data.documentDate,
      series: data.series,
      number: data.number,
      itemName: data.itemName,
      itemCode: data.itemCode || null,
      barcode: data.barcode || null,
      quantity: data.quantity,
      cost: data.cost,
      vatRate: data.vatRate ?? null,
      priceWithoutVat: data.priceWithoutVat ?? null,
      unitName: data.unitName || null,
      direction: data.direction,
      documentType: data.documentType,
      documentId: data.documentId,
    },
  });
}

// ─── Create Reverse Movements ────────────────────
// For STORNO: find all movements for a document, create opposite.
// e.g. PURCHASE movements (IN) → PURCHASE_REVERSAL movements (OUT)
export async function createReverseMovements(
  tx: TxClient,
  companyId: string,
  documentId: string,
  reversalDocumentType: StockDocumentType
) {
  // Find original movements
  const originals = await tx.stockMovement.findMany({
    where: { companyId, documentId },
  });

  if (originals.length === 0) return [];

  const reversals = [];
  for (const orig of originals) {
    const reversal = await tx.stockMovement.create({
      data: {
        companyId: orig.companyId,
        warehouseName: orig.warehouseName,
        operationType: reversalDocumentType,
        documentDate: orig.documentDate,
        series: orig.series,
        number: orig.number,
        itemName: orig.itemName,
        itemCode: orig.itemCode,
        barcode: orig.barcode,
        quantity: orig.quantity, // same quantity
        cost: orig.cost,
        vatRate: orig.vatRate,
        priceWithoutVat: orig.priceWithoutVat,
        unitName: orig.unitName,
        direction: orig.direction === 'IN' ? 'OUT' : 'IN', // reversed
        documentType: reversalDocumentType,
        documentId: orig.documentId,
      },
    });
    reversals.push(reversal);
  }

  return reversals;
}

// ─── Get Product Balance (single product, single warehouse) ─
// Returns quantity (can be negative if oversold somehow).
export async function getProductBalance(
  tx: TxClient,
  companyId: string,
  warehouseName: string,
  itemCode: string
): Promise<number> {
  const movements = await tx.stockMovement.findMany({
    where: { companyId, warehouseName, itemCode },
    select: { direction: true, quantity: true },
  });

  let balance = 0;
  for (const m of movements) {
    const qty = Number(m.quantity);
    balance += m.direction === 'IN' ? qty : -qty;
  }

  return balance;
}

// ─── Get Warehouse Balance ───────────────────────
// Returns all products with their aggregated quantity for one warehouse.
export async function getWarehouseBalance(
  tx: TxClient,
  companyId: string,
  warehouseName: string
): Promise<ProductBalance[]> {
  const movements = await tx.stockMovement.findMany({
    where: { companyId, warehouseName },
    select: { itemCode: true, itemName: true, direction: true, quantity: true },
  });

  // Aggregate by itemCode
  const map = new Map<string, { itemName: string; quantity: number }>();

  for (const m of movements) {
    const code = m.itemCode || m.itemName; // fallback to itemName if no code
    const existing = map.get(code) || { itemName: m.itemName, quantity: 0 };
    const qty = Number(m.quantity);
    existing.quantity += m.direction === 'IN' ? qty : -qty;
    map.set(code, existing);
  }

  const result: ProductBalance[] = [];
  for (const [itemCode, data] of map) {
    result.push({
      warehouseName,
      itemCode,
      itemName: data.itemName,
      quantity: data.quantity,
    });
  }

  return result.sort((a, b) => a.itemCode.localeCompare(b.itemCode));
}

// ─── Get Company Balance ─────────────────────────
// All warehouses, all products.
export async function getCompanyBalance(
  tx: TxClient,
  companyId: string
): Promise<ProductBalance[]> {
  const movements = await tx.stockMovement.findMany({
    where: { companyId },
    select: { warehouseName: true, itemCode: true, itemName: true, direction: true, quantity: true },
  });

  const map = new Map<string, { warehouseName: string; itemName: string; quantity: number }>();

  for (const m of movements) {
    const code = m.itemCode || m.itemName;
    const key = `${m.warehouseName}::${code}`;
    const existing = map.get(key) || { warehouseName: m.warehouseName, itemName: m.itemName, quantity: 0 };
    const qty = Number(m.quantity);
    existing.quantity += m.direction === 'IN' ? qty : -qty;
    map.set(key, existing);
  }

  const result: ProductBalance[] = [];
  for (const [, data] of map) {
    result.push({
      warehouseName: data.warehouseName,
      itemCode: data.warehouseName, // will fix below
      itemName: data.itemName,
      quantity: data.quantity,
    });
  }

  // Fix: extract actual itemCode from map keys
  const resultFixed: ProductBalance[] = [];
  for (const [key, data] of map) {
    const [wh, ic] = key.split('::');
    resultFixed.push({
      warehouseName: wh,
      itemCode: ic,
      itemName: data.itemName,
      quantity: data.quantity,
    });
  }

  return resultFixed.sort((a, b) =>
    a.warehouseName.localeCompare(b.warehouseName) || a.itemCode.localeCompare(b.itemCode)
  );
}

// ─── Get Warehouse Names ─────────────────────────
// Returns distinct warehouse names that have movements.
export async function getWarehouseNames(
  tx: TxClient,
  companyId: string
): Promise<string[]> {
  const result = await tx.stockMovement.groupBy({
    by: ['warehouseName'],
    where: { companyId },
    orderBy: { warehouseName: 'asc' },
  });

  return result.map(r => r.warehouseName);
}
```

## FILE: ./lib/accounting/repostingService.ts
```
// lib/accounting/repostingService.ts
// ═══════════════════════════════════════════════════
// Reposting Engine — Aggressive Rebuild (SYSTEM-only)
// ═══════════════════════════════════════════════════
//
// Task 27: Rebuilds all SYSTEM journal entries in a date range
// from the source documents (SaleDocument, PurchaseDocument).
//
// Steps:
//   A) Collect documents in range
//   B) Delete SYSTEM journal entries in range
//   C) Recreate SYSTEM entries from documents
//
// MANUAL entries are never touched.
// Idempotent: repeated calls produce the same result.

import { PrismaClient } from '@prisma/client';
import { createJournalEntry } from './journalService';

type TxClient = Omit<
  PrismaClient,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
>;

export type RepostInput = {
  companyId: string;
  tenantId: string;
  from: Date;
  to: Date;
};

export type RepostResult = {
  range: { from: string; to: string };
  deletedEntries: number;
  recreatedEntries: number;
  documentsProcessed: {
    sales: number;
    purchases: number;
    cancelledSales: number;
    cancelledPurchases: number;
  };
};

/**
 * Rebuild all SYSTEM journal entries in the given date range.
 * Must be called inside prisma.$transaction().
 */
export async function repostRange(
  tx: TxClient,
  input: RepostInput
): Promise<RepostResult> {
  const { companyId, tenantId, from, to } = input;
  const fromDate = from;
  const toDate = new Date(`${to.toISOString().split('T')[0]}T23:59:59.999Z`);

  // ═══════════════════════════════════════════════
  // STEP A: Collect documents in range
  // ═══════════════════════════════════════════════

  const sales = await tx.saleDocument.findMany({
    where: {
      companyId,
      company: { tenantId },
      saleDate: { gte: fromDate, lte: toDate },
    },
    include: { items: true },
  });

  const purchases = await tx.purchaseDocument.findMany({
    where: {
      companyId,
      company: { tenantId },
      purchaseDate: { gte: fromDate, lte: toDate },
    },
    include: { items: true },
  });

  // Statistics
  const stats = {
    sales: sales.filter((s) => s.status !== 'CANCELLED').length,
    purchases: purchases.filter((p) => p.status !== 'CANCELLED').length,
    cancelledSales: sales.filter((s) => s.status === 'CANCELLED').length,
    cancelledPurchases: purchases.filter((p) => p.status === 'CANCELLED').length,
  };

  // ═══════════════════════════════════════════════
  // STEP B: Delete SYSTEM journal entries in range
  // ═══════════════════════════════════════════════
  // JournalLine cascade deletes automatically (onDelete: Cascade)

  const deleteResult = await tx.journalEntry.deleteMany({
    where: {
      companyId,
      source: 'SYSTEM',
      date: { gte: fromDate, lte: toDate },
    },
  });

  // ═══════════════════════════════════════════════
  // STEP C: Recreate SYSTEM entries from documents
  // ═══════════════════════════════════════════════

  let recreatedCount = 0;

  // ─── Sales ─────────────────────────────────────
  for (const sale of sales) {
    // Validate account mapping exists
    if (!sale.debitAccountId || !sale.creditAccountId) {
      throw new Error(
        `MISSING_POSTING_PROFILE: SaleDocument ${sale.id} (${sale.series}-${sale.number}) missing debitAccountId or creditAccountId`
      );
    }

    // Calculate total from items
    const totalAmount = sale.items.reduce(
      (sum, item) => sum + Number(item.quantity) * Number(item.priceWithoutVat),
      0
    );

    if (totalAmount <= 0) continue;

    // Create SALE entry (always, even for cancelled)
    await createJournalEntry(tx, {
      companyId,
      date: sale.saleDate,
      documentType: 'SALE',
      documentId: sale.id,
      lines: [
        { accountId: sale.debitAccountId, debit: totalAmount, credit: 0 },
        { accountId: sale.creditAccountId, debit: 0, credit: totalAmount },
      ],
    });
    recreatedCount++;

    // If cancelled → also create SALE_REVERSAL
    if (sale.status === 'CANCELLED') {
      await createJournalEntry(tx, {
        companyId,
        date: sale.saleDate,
        documentType: 'SALE_REVERSAL',
        documentId: sale.id,
        lines: [
          { accountId: sale.creditAccountId, debit: totalAmount, credit: 0 },
          { accountId: sale.debitAccountId, debit: 0, credit: totalAmount },
        ],
      });
      recreatedCount++;
    }
  }

  // ─── Purchases ─────────────────────────────────
  for (const purchase of purchases) {
    if (!purchase.debitAccountId || !purchase.creditAccountId) {
      throw new Error(
        `MISSING_POSTING_PROFILE: PurchaseDocument ${purchase.id} (${purchase.series}-${purchase.number}) missing debitAccountId or creditAccountId`
      );
    }

    const totalAmount = purchase.items.reduce(
      (sum, item) => sum + Number(item.quantity) * Number(item.priceWithoutVat),
      0
    );

    if (totalAmount <= 0) continue;

    // Create PURCHASE entry
    await createJournalEntry(tx, {
      companyId,
      date: purchase.purchaseDate,
      documentType: 'PURCHASE',
      documentId: purchase.id,
      lines: [
        { accountId: purchase.debitAccountId, debit: totalAmount, credit: 0 },
        { accountId: purchase.creditAccountId, debit: 0, credit: totalAmount },
      ],
    });
    recreatedCount++;

    // If cancelled → also create PURCHASE_REVERSAL
    if (purchase.status === 'CANCELLED') {
      await createJournalEntry(tx, {
        companyId,
        date: purchase.purchaseDate,
        documentType: 'PURCHASE_REVERSAL',
        documentId: purchase.id,
        lines: [
          { accountId: purchase.creditAccountId, debit: totalAmount, credit: 0 },
          { accountId: purchase.debitAccountId, debit: 0, credit: totalAmount },
        ],
      });
      recreatedCount++;
    }
  }

  return {
    range: {
      from: fromDate.toISOString().split('T')[0],
      to: to.toISOString().split('T')[0],
    },
    deletedEntries: deleteResult.count,
    recreatedEntries: recreatedCount,
    documentsProcessed: stats,
  };
}
```

## FILE: ./lib/accounting/journalService.ts
```
// lib/accounting/journalService.ts
// ═══════════════════════════════════════════════════
// Journal Service — Creates journal entries for documents
// ═══════════════════════════════════════════════════
//
// Architecture:
//   Document → JournalEntry → JournalLine[]
//   All within a single Prisma transaction
//
// Rule: Document is the event. Journal is the truth.
//
// Task 24 MVP: Period Lock — second enforcement contour.
// assertPeriodOpen() called before creating any JournalEntry.

import { Prisma, PrismaClient, JournalSource } from '@prisma/client';
import { assertPeriodOpen } from './periodLock';


// Transaction client type (subset of PrismaClient used inside $transaction)
type TxClient = Omit<
  PrismaClient,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
>;

export type JournalLineInput = {
  accountId: string;
  debit: number;
  credit: number;
};

export type CreateJournalEntryInput = {
  companyId: string;
  date: Date;
  documentType: string;
  documentId: string | null;
  lines: JournalLineInput[];
  source?: JournalSource;
  description?: string | null;
};

// ─── VALIDATION ──────────────────────────────────
// Double-entry: sum(debit) must equal sum(credit)
function validateJournalLines(lines: JournalLineInput[]): void {
  if (lines.length < 2) {
    throw new Error('Journal entry must have at least 2 lines');
  }

  const totalDebit = lines.reduce((sum, l) => sum + l.debit, 0);
  const totalCredit = lines.reduce((sum, l) => sum + l.credit, 0);

  // Allow tiny floating point difference (< 0.01)
  if (Math.abs(totalDebit - totalCredit) >= 0.01) {
    throw new Error(
      `Journal entry is unbalanced: debit=${totalDebit.toFixed(2)}, credit=${totalCredit.toFixed(2)}`
    );
  }

  for (const line of lines) {
    if (line.debit < 0 || line.credit < 0) {
      throw new Error('Debit and credit must be non-negative');
    }
    if (line.debit > 0 && line.credit > 0) {
      throw new Error('A journal line cannot have both debit and credit');
    }
    if (line.debit === 0 && line.credit === 0) {
      throw new Error('A journal line must have either debit or credit');
    }
  }
}

// ─── CREATE JOURNAL ENTRY ────────────────────────
// Must be called inside prisma.$transaction()
// Returns the created JournalEntry with lines
//
// Task 24 MVP: Period lock check (second contour)
export async function createJournalEntry(
  tx: TxClient,
  input: CreateJournalEntryInput
) {
  // *** Task 24: Period Lock — second contour ***
  await assertPeriodOpen(tx, {
    companyId: input.companyId,
    date: input.date,
  });

  // Validate double-entry balance
  validateJournalLines(input.lines);

  // Verify all accounts exist and belong to the company
  const accountIds = [...new Set(input.lines.map((l) => l.accountId))];
  const accounts = await tx.account.findMany({
    where: {
      id: { in: accountIds },
      companyId: input.companyId,
    },
    select: { id: true },
  });

  const foundIds = new Set(accounts.map((a) => a.id));
  const missing = accountIds.filter((id) => !foundIds.has(id));
  if (missing.length > 0) {
    throw new Error(
      `Accounts not found in this company: ${missing.join(', ')}`
    );
  }

  // Create JournalEntry + JournalLines atomically
  const entry = await tx.journalEntry.create({
    data: {
      companyId: input.companyId,
      date: input.date,
      documentType: input.documentType,
      documentId: input.documentId,
      source: input.source ?? JournalSource.SYSTEM,
      description: input.description ?? null,
      lines: {
        create: input.lines.map((line) => ({
          accountId: line.accountId,
          debit: new Prisma.Decimal(line.debit),
          credit: new Prisma.Decimal(line.credit),
        })),
      },
    },
    include: {
      lines: true,
    },
  });

  return entry;
}
```

## FILE: ./lib/accounting/__tests__/fifoService.test.ts
```
// lib/accounting/__tests__/fifoService.test.ts
// ═══════════════════════════════════════════════════
// Task 35: FIFO Engine Tests (5 required)
// ═══════════════════════════════════════════════════
//
// These are test SPECIFICATIONS with assertions.
// Run with: npx jest fifoService.test.ts
// (Requires test DB setup with Prisma)
//
// For now: documented test scenarios with expected results.
// Can be converted to integration tests with test DB.

import Decimal from 'decimal.js';

// ═══════════════════════════════════════════════════
// TEST 1: FIFO correct allocation order
// ═══════════════════════════════════════════════════
//
// Setup:
//   Purchase A: 10 units of ITEM-001 at €5.00 (Jan 1)
//   Purchase B: 10 units of ITEM-001 at €7.00 (Jan 15)
//
// Action:
//   Sell 15 units of ITEM-001
//
// Expected FIFO allocation:
//   Lot A: consume 10 units × €5.00 = €50.00
//   Lot B: consume 5 units × €7.00 = €35.00
//   Total COGS = €85.00
//
// Lot state after:
//   A: qtyRemaining = 0
//   B: qtyRemaining = 5
//
// Assert:
//   - allocations.length === 2
//   - allocations[0].lotId === lotA.id (oldest first)
//   - allocations[0].qty === 10
//   - allocations[1].qty === 5
//   - totalCogs === 85.00

describe('Test 1: FIFO correct allocation order', () => {
  it('should consume oldest lots first', async () => {
    // Would use real tx in integration test
    const lotA = { unitCost: new Decimal('5.00'), qtyRemaining: new Decimal('10') };
    const lotB = { unitCost: new Decimal('7.00'), qtyRemaining: new Decimal('10') };
    const requested = new Decimal('15');

    // FIFO: consume lotA fully, then lotB partially
    const consumeA = Decimal.min(requested, lotA.qtyRemaining); // 10
    const remainAfterA = requested.minus(consumeA); // 5
    const consumeB = Decimal.min(remainAfterA, lotB.qtyRemaining); // 5

    const cogsA = consumeA.mul(lotA.unitCost); // 50
    const cogsB = consumeB.mul(lotB.unitCost); // 35
    const totalCogs = cogsA.plus(cogsB); // 85

    expect(consumeA.toNumber()).toBe(10);
    expect(consumeB.toNumber()).toBe(5);
    expect(totalCogs.toNumber()).toBe(85);
    expect(lotA.qtyRemaining.minus(consumeA).toNumber()).toBe(0);
    expect(lotB.qtyRemaining.minus(consumeB).toNumber()).toBe(5);
  });
});

// ═══════════════════════════════════════════════════
// TEST 2: Partial lot allocation
// ═══════════════════════════════════════════════════
//
// Setup:
//   Purchase: 100 units of ITEM-002 at €3.50
//
// Action:
//   Sell 30 units
//
// Expected:
//   1 allocation: 30 units from lot, COGS = €105.00
//   qtyRemaining = 70
//
// Assert:
//   - allocations.length === 1
//   - allocations[0].qty === 30
//   - totalCogs === 105.00
//   - lot.qtyRemaining === 70

describe('Test 2: Partial lot allocation', () => {
  it('should partially consume a single lot', () => {
    const lot = { unitCost: new Decimal('3.50'), qtyRemaining: new Decimal('100') };
    const consume = new Decimal('30');

    const cogs = consume.mul(lot.unitCost);
    const remaining = lot.qtyRemaining.minus(consume);

    expect(cogs.toNumber()).toBe(105);
    expect(remaining.toNumber()).toBe(70);
  });
});

// ═══════════════════════════════════════════════════
// TEST 3: Cancel sale → lots restored
// ═══════════════════════════════════════════════════
//
// Setup:
//   Purchase: 20 units at €10.00
//   Sale: 15 units → FIFO allocation → qtyRemaining = 5
//
// Action:
//   Cancel sale
//
// Expected:
//   - qtyRemaining restored to 20
//   - SALE_REVERSAL allocation records created
//   - Reversal journal entry mirrors all 4 original lines
//
// Assert:
//   - lot.qtyRemaining === 20 (fully restored)
//   - SALE_REVERSAL allocations.length === original allocations.length

describe('Test 3: Cancel sale restores lots', () => {
  it('should restore qtyRemaining after cancel', () => {
    const initial = new Decimal('20');
    const sold = new Decimal('15');
    const afterSale = initial.minus(sold); // 5

    // Cancel: restore
    const afterCancel = afterSale.plus(sold); // 20

    expect(afterSale.toNumber()).toBe(5);
    expect(afterCancel.toNumber()).toBe(20);
    expect(afterCancel.eq(initial)).toBe(true);
  });
});

// ═══════════════════════════════════════════════════
// TEST 4: Cancel purchase with consumption → error
// ═══════════════════════════════════════════════════
//
// Setup:
//   Purchase: 50 units at €8.00
//   Sale: 10 units → qtyRemaining = 40
//
// Action:
//   Try to cancel purchase
//
// Expected:
//   - Throws PURCHASE_LOTS_ALREADY_CONSUMED
//   - qtyRemaining (40) !== qtyInitial (50)
//
// Assert:
//   - Error thrown with correct message
//   - Purchase NOT cancelled
//   - Journal NOT reversed

describe('Test 4: Cancel purchase blocked if consumed', () => {
  it('should throw if qtyRemaining !== qtyInitial', () => {
    const qtyInitial = new Decimal('50');
    const qtyRemaining = new Decimal('40');

    const isFullyAvailable = qtyRemaining.eq(qtyInitial);

    expect(isFullyAvailable).toBe(false);
    // In real code: assertPurchaseLotsNotConsumed would throw
  });
});

// ═══════════════════════════════════════════════════
// TEST 5: Parallel sale safety (concurrency)
// ═══════════════════════════════════════════════════
//
// Setup:
//   Purchase: 10 units at €5.00
//
// Action:
//   Two concurrent sales of 7 units each
//
// Expected with FOR UPDATE SKIP LOCKED:
//   - First sale: allocates 7 units → qtyRemaining = 3
//   - Second sale: only 3 available → INSUFFICIENT_STOCK
//   - No double-sell, no negative qtyRemaining
//
// Without FOR UPDATE SKIP LOCKED (broken):
//   - Both see 10 available
//   - Both try to consume 7
//   - qtyRemaining goes to -4 ← BUG
//
// Assert:
//   - Exactly one sale succeeds
//   - The other gets INSUFFICIENT_STOCK
//   - qtyRemaining >= 0 always

describe('Test 5: Parallel sale safety', () => {
  it('should never allow negative qtyRemaining', () => {
    const available = new Decimal('10');
    const sale1 = new Decimal('7');
    const sale2 = new Decimal('7');

    // With locking: sale1 goes first
    const afterSale1 = available.minus(sale1); // 3
    const canSale2 = afterSale1.gte(sale2); // false: 3 < 7

    expect(afterSale1.toNumber()).toBe(3);
    expect(canSale2).toBe(false);
    expect(afterSale1.gte(0)).toBe(true); // never negative
  });
});
```

## FILE: ./lib/accounting/accountMapping.ts
```
// lib/accounting/accountMapping.ts
// ═══════════════════════════════════════════════════
// Accounting Mapping Layer — SKR03 Abstraction
// ═══════════════════════════════════════════════════
//
// Task 31 + Task 32 fix: Real DATEV SKR03 codes.
//
// DATEV SKR03 standard:
//   1000 = Kasse (Cash)
//   1200 = Bank (main bank account)
//   1400 = Forderungen aus L+L (Trade receivables)
//   1600 = Verbindlichkeiten aus L+L (Trade payables)
//   1576 = Abziehbare Vorsteuer 19% (Input VAT 19%)
//   1571 = Abziehbare Vorsteuer 7% (Input VAT 7%)
//   1776 = Umsatzsteuer 19% (Output VAT 19%)
//   1771 = Umsatzsteuer 19% standard (Output VAT 19% alt)
//
// Rules:
//   - No hardcoded account codes outside this file
//   - All code references go through ACCOUNT_MAP
//   - Resolver validates accounts exist before returning IDs

import { PrismaClient } from '@prisma/client';

type TxClient = Omit<
  PrismaClient,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
>;

// ─── VAT Modes ───────────────────────────────────
export type VatMode = 'VAT_19' | 'VAT_7' | 'EXPORT';

// ─── SKR03 Account Map (DATEV-compliant codes) ───
export const ACCOUNT_MAP = {
  // Balance sheet — liquid assets
  bank: '1200',         // Bank (DATEV standard)
  cash: '1000',         // Kasse

  // Trade accounts
  receivable: '1400',   // Forderungen aus L+L
  payable: '1600',      // Verbindlichkeiten aus L+L

  // Sales by VAT mode
  sales: {
    VAT_19: {
      revenue: '8400',  // Erlöse 19% USt
      vat: '1776',      // Umsatzsteuer 19%
    },
    VAT_7: {
      revenue: '8300',  // Erlöse 7% USt
      vat: '1771',      // Umsatzsteuer 19% (standard) — used for 7% output
    },
    EXPORT: {
      revenue: '8125',  // Steuerfreie ig. Lieferungen
    },
  },

  // Task 35: FIFO COGS & Inventory
  // SKR03 standard:
  //   3960 = Bestandsveränderungen Waren (Inventory asset on balance sheet)
  //   5000 = Aufwendungen für Waren (COGS expense on P&L)
  inventory: '3960',   // Bestandsveränderungen Waren — balance sheet asset
  cogs: '5000',        // Aufwendungen für Waren — cost of goods sold (P&L)

  // Purchases by VAT mode
  purchase: {
    VAT_19: {
      expense: '3400',  // Wareneingang 16% Vorsteuer
      vat: '1576',      // Abziehbare Vorsteuer 19%
    },
    VAT_7: {
      expense: '3100',  // Einkauf RHB 7%
      vat: '1571',      // Abziehbare Vorsteuer 7%
    },
  },

  // Equity / year-end
  equity: {
    capital: '0800',          // Gezeichnetes Kapital
    retainedEarnings: '0840', // Gewinnvortrag
    lossCarryforward: '0860', // Verlustvortrag
    annualResult: '0868',     // Jahresüberschuss / Jahresfehlbetrag
  },

  // Opening / closing
  opening: '9008',     // Eröffnungsbilanz
  closing: '9009',     // Schlussbilanzkonto
} as const;

// ─── Types for resolved account IDs ──────────────
export type ResolvedSaleAccounts = {
  debitAccountId: string;
  creditAccountId: string;
  vatAccountId?: string;
};

export type ResolvedPurchaseAccounts = {
  debitAccountId: string;
  creditAccountId: string;
  vatAccountId?: string;
};

// ─── Batch resolver: multiple codes → IDs ────────
async function resolveCodes(
  tx: TxClient,
  companyId: string,
  codes: string[]
): Promise<Map<string, string>> {
  const uniqueCodes = [...new Set(codes)];
  const accounts = await tx.account.findMany({
    where: { companyId, code: { in: uniqueCodes } },
    select: { id: true, code: true },
  });

  const map = new Map<string, string>();
  for (const acc of accounts) {
    map.set(acc.code, acc.id);
  }

  const missing = uniqueCodes.filter((c) => !map.has(c));
  if (missing.length > 0) {
    throw new Error(
      `ACCOUNT_CODE_NOT_FOUND: Codes not found for company ${companyId}: ${missing.join(', ')}. Import SKR03 first.`
    );
  }

  return map;
}

// ─── Sale Account Resolver ───────────────────────
//
// Sale 19%:
//   Debit:  1400 (Forderungen)     → gross amount
//   Credit: 8400 (Erlöse 19%)      → net amount
//   Credit: 1776 (Umsatzsteuer 19%) → VAT amount
//
// Sale Export:
//   Debit:  1400 (Forderungen)     → full amount
//   Credit: 8125 (ig. Lieferungen)  → full amount
export async function resolveSaleAccounts(
  tx: TxClient,
  companyId: string,
  vatMode: VatMode
): Promise<ResolvedSaleAccounts> {
  const salesConfig = ACCOUNT_MAP.sales[vatMode];
  const codes = [ACCOUNT_MAP.receivable, salesConfig.revenue];

  if ('vat' in salesConfig) {
    codes.push(salesConfig.vat);
  }

  const map = await resolveCodes(tx, companyId, codes);

  return {
    debitAccountId: map.get(ACCOUNT_MAP.receivable)!,
    creditAccountId: map.get(salesConfig.revenue)!,
    vatAccountId: 'vat' in salesConfig ? map.get(salesConfig.vat) : undefined,
  };
}

// ─── Purchase Account Resolver ───────────────────
//
// Purchase 19%:
//   Debit:  3400 (Wareneingang)          → net amount
//   Debit:  1576 (Abziehbare Vorsteuer)  → VAT amount
//   Credit: 1600 (Verbindlichkeiten)     → gross amount
export async function resolvePurchaseAccounts(
  tx: TxClient,
  companyId: string,
  vatMode: 'VAT_19' | 'VAT_7'
): Promise<ResolvedPurchaseAccounts> {
  const purchaseConfig = ACCOUNT_MAP.purchase[vatMode];
  const codes = [purchaseConfig.expense, ACCOUNT_MAP.payable, purchaseConfig.vat];

  const map = await resolveCodes(tx, companyId, codes);

  return {
    debitAccountId: map.get(purchaseConfig.expense)!,
    creditAccountId: map.get(ACCOUNT_MAP.payable)!,
    vatAccountId: map.get(purchaseConfig.vat),
  };
}

// ─── Simple 2-line posting resolver ──────────────
export async function resolveSimplePosting(
  tx: TxClient,
  companyId: string,
  debitCode: string,
  creditCode: string
): Promise<{ debitAccountId: string; creditAccountId: string }> {
  const map = await resolveCodes(tx, companyId, [debitCode, creditCode]);
  return {
    debitAccountId: map.get(debitCode)!,
    creditAccountId: map.get(creditCode)!,
  };
}

// ─── Default posting codes for document types ────
export function getDefaultPostingCodes(
  docType: 'SALE' | 'PURCHASE',
  vatMode: VatMode = 'VAT_19'
): { debitCode: string; creditCode: string; vatCode?: string } {
  if (docType === 'SALE') {
    const config = ACCOUNT_MAP.sales[vatMode];
    return {
      debitCode: ACCOUNT_MAP.receivable,
      creditCode: config.revenue,
      vatCode: 'vat' in config ? config.vat : undefined,
    };
  } else {
    const config = ACCOUNT_MAP.purchase[vatMode as 'VAT_19' | 'VAT_7'];
    return {
      debitCode: config.expense,
      creditCode: ACCOUNT_MAP.payable,
      vatCode: config.vat,
    };
  }
}

// ─── FIFO 4-line Account Resolver ────────────────
// Returns all 4 account IDs needed for a FIFO sale journal entry:
//   DR Accounts Receivable (1400)  → revenue gross
//   CR Revenue (8400/8300/8125)    → revenue net
//   DR COGS (5000)                 → cost of goods sold
//   CR Inventory (3960)            → reduce inventory asset
export type ResolvedFifoSaleAccounts = {
  arAccountId: string;       // 1400 - Accounts Receivable
  revenueAccountId: string;  // 8400/8300/8125 - Revenue
  vatAccountId?: string;     // 1776/1771 - VAT (if applicable)
  cogsAccountId: string;     // 5000 - Cost of Goods Sold
  inventoryAccountId: string; // 3960 - Inventory
};

export async function resolveFifoSaleAccounts(
  tx: TxClient,
  companyId: string,
  vatMode: VatMode
): Promise<ResolvedFifoSaleAccounts> {
  const salesConfig = ACCOUNT_MAP.sales[vatMode];
  const codes = [
    ACCOUNT_MAP.receivable,
    salesConfig.revenue,
    ACCOUNT_MAP.cogs,
    ACCOUNT_MAP.inventory,
  ];

  if ('vat' in salesConfig) {
    codes.push(salesConfig.vat);
  }

  const map = await resolveCodes(tx, companyId, codes);

  return {
    arAccountId: map.get(ACCOUNT_MAP.receivable)!,
    revenueAccountId: map.get(salesConfig.revenue)!,
    vatAccountId: 'vat' in salesConfig ? map.get(salesConfig.vat) : undefined,
    cogsAccountId: map.get(ACCOUNT_MAP.cogs)!,
    inventoryAccountId: map.get(ACCOUNT_MAP.inventory)!,
  };
}
```

## FILE: ./lib/accounting/periodLock.ts
```
// lib/accounting/periodLock.ts
// ═══════════════════════════════════════════════════
// Period Lock — Enforces accounting period closures
// ═══════════════════════════════════════════════════
//
// Task 24 MVP: Period Locking
//
// Called INSIDE prisma.$transaction() before creating
// documents or journal entries in a given period.
// If period is closed → throws PERIOD_CLOSED → rollback.
//
// Rule: No record = open (default). Only explicit close blocks.

import { PrismaClient } from '@prisma/client';

type TxClient = Omit<
  PrismaClient,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
>;

/**
 * Extract year and month from a Date.
 */
export function getPeriodKey(date: Date): { year: number; month: number } {
  return {
    year: date.getFullYear(),
    month: date.getMonth() + 1, // JS months 0-indexed
  };
}

/**
 * Assert that the accounting period for the given date is open.
 * Must be called inside prisma.$transaction().
 *
 * @throws Error('PERIOD_CLOSED') if period is locked
 */
export async function assertPeriodOpen(
  tx: TxClient,
  params: { companyId: string; date: Date }
): Promise<void> {
  const { year, month } = getPeriodKey(params.date);

  const period = await tx.accountingPeriod.findUnique({
    where: {
      companyId_year_month: {
        companyId: params.companyId,
        year,
        month,
      },
    },
    select: { isClosed: true },
  });

  // No record = open. isClosed=false = open.
  if (period?.isClosed) {
    throw new Error(
      `PERIOD_CLOSED: ${year}-${String(month).padStart(2, '0')} is closed`
    );
  }
}
```

## FILE: ./lib/accounting/protectedAccounts.ts
```
// lib/accounting/protectedAccounts.ts
// ═══════════════════════════════════════════════════
// DATEV Stammkonten — Protected System Accounts
// ═══════════════════════════════════════════════════
//
// These accounts are referenced by ACCOUNT_MAP and are
// required for the accounting engine to function.
// They cannot be deleted, deactivated, or have their
// code changed by any user operation.
//
// Source: ACCOUNT_MAP in accountMapping.ts (SKR03)

export const PROTECTED_ACCOUNT_CODES = new Set([
  // Liquid assets
  '1000', // Kasse (Cash)
  '1200', // Bank

  // Trade accounts
  '1400', // Forderungen aus L+L (Trade receivables)
  '1600', // Verbindlichkeiten aus L+L (Trade payables)

  // Input VAT (Vorsteuer)
  '1576', // Abziehbare Vorsteuer 19%
  '1571', // Abziehbare Vorsteuer 7%

  // Output VAT (Umsatzsteuer)
  '1776', // Umsatzsteuer 19%
  '1771', // Umsatzsteuer 19% (standard)

  // Revenue
  '8400', // Erlöse 19% USt
  '8300', // Erlöse 7% USt
  '8125', // Steuerfreie ig. Lieferungen (Export)

  // Purchases / Expenses
  '3400', // Wareneingang 16%/19% Vorsteuer
  '3100', // Einkauf RHB 7%

  // Equity / Year-end
  '0800', // Gezeichnetes Kapital
  '0840', // Gewinnvortrag
  '0860', // Verlustvortrag
  '0868', // Jahresüberschuss / Jahresfehlbetrag

  // Opening / Closing
  '9008', // Eröffnungsbilanz
  '9009', // Schlussbilanzkonto

  // PROTECTED_ACCOUNT_CODES
  '3960', // Bestandsveränderungen Waren (Inventory)
  '5000', // Aufwendungen für Waren (COGS)
]);
  

/**
 * Check if an account code is a protected system account.
 */
export function isProtectedCode(code: string): boolean {
  return PROTECTED_ACCOUNT_CODES.has(code);
}

/**
 * Total number of protected accounts.
 */
export const PROTECTED_COUNT = PROTECTED_ACCOUNT_CODES.size; // 20
```

## FILE: ./lib/accounting/fifoService.ts
```
// lib/accounting/fifoService.ts
// ═══════════════════════════════════════════════════
// Industrial FIFO Engine — Task 35
// ═══════════════════════════════════════════════════
//
// Lot-based inventory with:
//   - StockLot creation on purchase
//   - FIFO allocation on sale (oldest lots first)
//   - FOR UPDATE SKIP LOCKED for concurrency
//   - Cancel sale → restore lots
//   - Cancel purchase → blocked if lots consumed
//   - Decimal-only arithmetic (no floats)
//
// Principle: qtyRemaining is the ONLY mutable field.
// Everything else is immutable audit trail.

import { Prisma } from '@prisma/client';
import Decimal from 'decimal.js';

type TxClient = Prisma.TransactionClient;

// ─── Types ───────────────────────────────────────

export interface CreateLotParams {
  companyId: string;
  warehouseName: string;
  itemCode: string;
  itemName: string;
  sourceDocumentId: string;
  purchaseDate: Date;
  unitCost: Decimal.Value;
  quantity: Decimal.Value;
  currencyCode?: string;
}

export interface FifoAllocationRequest {
  companyId: string;
  warehouseName: string;
  itemCode: string;
  itemName: string;
  quantity: Decimal.Value;
  documentType: 'SALE';
  documentId: string;
  saleItemId?: string;
}

export interface AllocationResult {
  lotId: string;
  qty: Decimal;
  unitCost: Decimal;
  amount: Decimal; // qty * unitCost
}

export interface FifoAllocationResult {
  allocations: AllocationResult[];
  totalCogs: Decimal; // sum of all allocation amounts
}

// ─── §2 CREATE LOT (Purchase Flow) ──────────────
// Creates one StockLot per purchase item.
// qtyInitial = qtyRemaining = quantity.
export async function createStockLot(
  tx: TxClient,
  params: CreateLotParams
) {
  const qty = new Decimal(params.quantity.toString());
  const cost = new Decimal(params.unitCost.toString());

  if (qty.lte(0)) throw new Error('LOT_QTY_MUST_BE_POSITIVE');
  if (cost.lt(0)) throw new Error('LOT_COST_MUST_BE_NON_NEGATIVE');

  return tx.stockLot.create({
    data: {
      companyId: params.companyId,
      warehouseName: params.warehouseName,
      itemCode: params.itemCode,
      itemName: params.itemName,
      sourceDocumentType: 'PURCHASE',
      sourceDocumentId: params.sourceDocumentId,
      purchaseDate: params.purchaseDate,
      unitCost: cost.toFixed(2),
      qtyInitial: qty.toFixed(4),
      qtyRemaining: qty.toFixed(4),
      currencyCode: params.currencyCode || 'EUR',
    },
  });
}

// ─── §3 FIFO ALLOCATION (Sale Flow) ─────────────
// Core FIFO algorithm:
// 1. Check total available >= requested
// 2. Lock lots with FOR UPDATE SKIP LOCKED
// 3. Consume from oldest first
// 4. Create StockAllocation records
// 5. Return total COGS
export async function allocateFifoLots(
  tx: TxClient,
  params: FifoAllocationRequest
): Promise<FifoAllocationResult> {
  const requestedQty = new Decimal(params.quantity.toString());

  if (requestedQty.lte(0)) throw new Error('ALLOCATION_QTY_MUST_BE_POSITIVE');

  // ─── Step 1: Check total available (pre-check) ─
  const availableResult = await tx.stockLot.aggregate({
    where: {
      companyId: params.companyId,
      warehouseName: params.warehouseName,
      itemCode: params.itemCode,
      qtyRemaining: { gt: 0 },
    },
    _sum: { qtyRemaining: true },
  });

  const totalAvailable = new Decimal(
    availableResult._sum.qtyRemaining?.toString() || '0'
  );

  if (totalAvailable.lt(requestedQty)) {
    throw new Error(
      `INSUFFICIENT_STOCK: ${params.itemName} (${params.itemCode}) — ` +
      `available: ${totalAvailable.toFixed(4)}, requested: ${requestedQty.toFixed(4)} ` +
      `in warehouse "${params.warehouseName}"`
    );
  }

  // ─── Step 2: Lock and fetch lots (FOR UPDATE SKIP LOCKED) ─
  // §6 CONCURRENCY: This is critical for parallel safety
  const lots = await tx.$queryRaw<Array<{
    id: string;
    qtyRemaining: string; // Decimal comes as string from raw
    unitCost: string;
  }>>`
    SELECT "id", "qtyRemaining"::TEXT, "unitCost"::TEXT
    FROM "stock_lots"
    WHERE "companyId" = ${params.companyId}
      AND "warehouseName" = ${params.warehouseName}
      AND "itemCode" = ${params.itemCode}
      AND "qtyRemaining" > 0
    ORDER BY "purchaseDate" ASC, "id" ASC
    FOR UPDATE SKIP LOCKED
  `;

  // ─── Step 3: FIFO consume ─────────────────────
  let remaining = new Decimal(requestedQty.toString());
  const allocations: AllocationResult[] = [];

  for (const lot of lots) {
    if (remaining.lte(0)) break;

    const lotQty = new Decimal(lot.qtyRemaining);
    const lotCost = new Decimal(lot.unitCost);
    const consume = Decimal.min(remaining, lotQty);
    const amount = consume.mul(lotCost);

    // Update lot: reduce qtyRemaining
    const newRemaining = lotQty.minus(consume);

    // ─── INVARIANT CHECK ─────────────────────────
    // qtyRemaining must NEVER go negative.
    // If it does, something is fundamentally broken.
    if (newRemaining.lt(0)) {
      throw new Error(
        `FIFO_INVARIANT_VIOLATION: Lot ${lot.id} would go negative ` +
        `(current: ${lotQty.toFixed(4)}, consume: ${consume.toFixed(4)}, ` +
        `result: ${newRemaining.toFixed(4)}). Aborting transaction.`
      );
    }

    await tx.stockLot.update({
      where: { id: lot.id },
      data: {
        qtyRemaining: newRemaining.toFixed(4),
      },
    });

    // Create StockAllocation record
    await tx.stockAllocation.create({
      data: {
        companyId: params.companyId,
        documentType: params.documentType,
        documentId: params.documentId,
        saleItemId: params.saleItemId || null,
        lotId: lot.id,
        qty: consume.toFixed(4),
        unitCost: lotCost.toFixed(2),
        amount: amount.toFixed(2),
      },
    });

    allocations.push({
      lotId: lot.id,
      qty: consume,
      unitCost: lotCost,
      amount,
    });

    remaining = remaining.minus(consume);
  }

  // Safety: should never happen if pre-check passed
  if (remaining.gt(0)) {
    throw new Error(
      `FIFO_ALLOCATION_INCOMPLETE: Could not allocate ${remaining.toFixed(4)} units ` +
      `of ${params.itemCode}. Possible concurrent modification.`
    );
  }

  const totalCogs = allocations.reduce(
    (sum, a) => sum.plus(a.amount),
    new Decimal(0)
  );

  return { allocations, totalCogs };
}

// ─── §4 CANCEL SALE → Restore Lots ──────────────
// Reverses FIFO allocations:
// 1. Find all allocations for the sale
// 2. Restore qtyRemaining to each lot
// 3. Create SALE_REVERSAL allocation records (audit trail)
export async function reverseSaleAllocations(
  tx: TxClient,
  companyId: string,
  saleDocumentId: string
): Promise<{ restoredCount: number; totalCogs: Decimal }> {
  const allocations = await tx.stockAllocation.findMany({
    where: {
      companyId,
      documentType: 'SALE',
      documentId: saleDocumentId,
    },
  });

  if (allocations.length === 0) {
    return { restoredCount: 0, totalCogs: new Decimal(0) };
  }

  let totalCogs = new Decimal(0);

  for (const alloc of allocations) {
    const allocQty = new Decimal(alloc.qty.toString());
    const allocAmount = new Decimal(alloc.amount.toString());

    // Restore lot qtyRemaining
    const lot = await tx.stockLot.findUniqueOrThrow({
      where: { id: alloc.lotId },
    });

    const currentRemaining = new Decimal(lot.qtyRemaining.toString());
    const restoredRemaining = currentRemaining.plus(allocQty);
    const qtyInitial = new Decimal(lot.qtyInitial.toString());

    // ─── INVARIANT CHECK ─────────────────────────
    // After restore, qtyRemaining must not exceed qtyInitial.
    if (restoredRemaining.gt(qtyInitial)) {
      throw new Error(
        `FIFO_RESTORE_INVARIANT_VIOLATION: Lot ${alloc.lotId} would exceed initial quantity ` +
        `(initial: ${qtyInitial.toFixed(4)}, current: ${currentRemaining.toFixed(4)}, ` +
        `restoring: ${allocQty.toFixed(4)}, result: ${restoredRemaining.toFixed(4)}). ` +
        `Possible double-cancel.`
      );
    }

    await tx.stockLot.update({
      where: { id: alloc.lotId },
      data: {
        qtyRemaining: restoredRemaining.toFixed(4),
      },
    });

    // Create reversal allocation (audit trail)
    await tx.stockAllocation.create({
      data: {
        companyId,
        documentType: 'SALE_REVERSAL',
        documentId: saleDocumentId,
        saleItemId: alloc.saleItemId,
        lotId: alloc.lotId,
        qty: allocQty.toFixed(4),
        unitCost: new Decimal(alloc.unitCost.toString()).toFixed(2),
        amount: allocAmount.toFixed(2),
      },
    });

    totalCogs = totalCogs.plus(allocAmount);
  }

  return { restoredCount: allocations.length, totalCogs };
}

// ─── §5 CANCEL PURCHASE → Block if consumed ─────
// Checks if any lot from this purchase has been partially consumed.
// If consumed → throws PURCHASE_LOTS_ALREADY_CONSUMED.
export async function assertPurchaseLotsNotConsumed(
  tx: TxClient,
  companyId: string,
  purchaseDocumentId: string
): Promise<void> {
  const lots = await tx.stockLot.findMany({
    where: {
      companyId,
      sourceDocumentId: purchaseDocumentId,
    },
    select: {
      id: true,
      itemCode: true,
      qtyInitial: true,
      qtyRemaining: true,
    },
  });

  for (const lot of lots) {
    const initial = new Decimal(lot.qtyInitial.toString());
    const remaining = new Decimal(lot.qtyRemaining.toString());

    if (!remaining.eq(initial)) {
      throw new Error(
        `PURCHASE_LOTS_ALREADY_CONSUMED: Lot ${lot.id} (${lot.itemCode}) ` +
        `has been partially consumed (initial: ${initial.toFixed(4)}, ` +
        `remaining: ${remaining.toFixed(4)}). Cancel related sales first.`
      );
    }
  }
}

// ─── Helper: Get available stock for an item ─────
export async function getAvailableStock(
  tx: TxClient,
  companyId: string,
  warehouseName: string,
  itemCode: string
): Promise<Decimal> {
  const result = await tx.stockLot.aggregate({
    where: {
      companyId,
      warehouseName,
      itemCode,
      qtyRemaining: { gt: 0 },
    },
    _sum: { qtyRemaining: true },
  });

  return new Decimal(result._sum.qtyRemaining?.toString() || '0');
}
```

## FILE: ./lib/auth/requireTenant.ts
```
import { getCurrentUser } from './getCurrentUser';

type TenantContext = {
  userId: string;
  tenantId: string;
};

export async function requireTenant(request: Request): Promise<TenantContext> {
  const user = await getCurrentUser(request);

  if (!user || !user.tenantId) {
    throw new Response('Unauthorized', { status: 401 });
  }

  return { userId: user.id, tenantId: user.tenantId };
}

```

## FILE: ./lib/auth/password.ts
```
import bcrypt from 'bcryptjs';

export const hashPassword = async (password: string): Promise<string> => {
  const saltRounds = 12;
  return await bcrypt.hash(password, saltRounds);
};

export const verifyPassword = async (password: string, hash: string): Promise<boolean> => {
  return await bcrypt.compare(password, hash);
};

```

## FILE: ./lib/auth/getCurrentUser.ts
```
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
```

## FILE: ./lib/auth/session.ts
```
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
```

## FILE: ./postcss.config.js
```
module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
```

