// ═══════════════════════════════════════════════════════════════
// FILE 1: app/api/auth/forgot-password/route.ts
// TASK 58 — Forgot Password (scaffold — NOT implemented yet)
// ═══════════════════════════════════════════════════════════════

// app/api/auth/forgot-password/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function POST(_request: NextRequest) {
  // TODO: Implement email reset flow
  // 1. Find user by email
  // 2. Generate secure reset token
  // 3. Store in DB with expiry
  // 4. Send email via mail service
  // 5. Return success (don't leak if email exists)
  return NextResponse.json(
    { error: 'Password reset is not yet available. Please use Google sign-in.' },
    { status: 501 }
  );
}

// ═══════════════════════════════════════════════════════════════
// FILE 2: app/api/auth/reset-password/route.ts
// TASK 58 — Reset Password (scaffold — NOT implemented yet)
// ═══════════════════════════════════════════════════════════════

// import { NextRequest, NextResponse } from 'next/server';
// export async function POST(_request: NextRequest) {
//   // TODO: Implement password reset
//   // 1. Validate token from body
//   // 2. Check expiry
//   // 3. Hash new password
//   // 4. Update user.passwordHash
//   // 5. Invalidate reset token
//   return NextResponse.json({ error: 'Not implemented' }, { status: 501 });
// }

// ═══════════════════════════════════════════════════════════════
// FILE 3: middleware.ts (UPDATED REDIRECT RULES for Task 58)
// Add to existing middleware.ts in root
// ═══════════════════════════════════════════════════════════════

// Add these redirect rules to your existing middleware.ts:
//
// RULE: /account/onboarding — only accessible when logged in
// RULE: / → /account/companies (if logged in) or /login (if not)
//
// The session check already exists in your middleware.
// Add the onboarding route to the protected list:
//
// const PROTECTED_ROUTES = [
//   '/account',
//   '/company',
//   '/api/account',     ← already protected
//   '/api/company',     ← already protected
// ];

// ═══════════════════════════════════════════════════════════════
// FILE 4: .env additions for Task 58
// ═══════════════════════════════════════════════════════════════
//
// Add to .env.local:
//
// # Google OAuth (required for Task 58)
// GOOGLE_CLIENT_ID=your_google_client_id_here
// GOOGLE_CLIENT_SECRET=your_google_client_secret_here
//
// # Base URL (already should exist)
// NEXTAUTH_URL=http://localhost:3000
//
// # Setup instructions:
// # 1. Go to https://console.cloud.google.com/
// # 2. Create project (or use existing)
// # 3. APIs & Services → Credentials → Create OAuth 2.0 Client ID
// # 4. Application type: Web application
// # 5. Authorized redirect URIs:
// #    - http://localhost:3000/api/auth/google/callback      ← development
// #    - https://yourdomain.com/api/auth/google/callback    ← production
// # 6. Copy Client ID and Client Secret to .env

// ═══════════════════════════════════════════════════════════════
// FILE 5: QA Manual Test Checklist (copy to docs)
// ═══════════════════════════════════════════════════════════════
//
// ## TASK 58 Manual QA Checklist
//
// ### New User via Google
// [ ] Click "Continue with Google" on /login
// [ ] Google consent screen appears
// [ ] After consent → redirect to /account/onboarding
// [ ] Form shows: Company name, Country dropdown, Legal type, VAT checkbox
// [ ] Select Lithuania → EUR auto-fills, legal types = UAB/MB/AB/IV/VšĮ
// [ ] Submit → loading screen with steps appears
// [ ] After ~3-5s → "Company created successfully!" screen
// [ ] Click "Proceed to Dashboard" → /company/{id}/dashboard
//
// ### Verify created data (Prisma Studio or API)
// [ ] User exists with googleId filled
// [ ] Company exists with onboardingCompletedAt set
// [ ] Accounts created (17+ rows)
// [ ] VAT rates created (6-7 rows)
// [ ] Operation types created (5 rows)
// [ ] Warehouses created (2 rows: Main + Office)
// [ ] Employees created (3 rows: Director/Manager/Warehouse)
// [ ] Clients created (4+ rows: self + gov + demo)
// [ ] Items created (5 rows: products + services)
//
// ### Re-login test
// [ ] Sign out
// [ ] Click "Continue with Google" again with same account
// [ ] → Should redirect to /account/companies (NOT onboarding)
// [ ] No duplicate data created
//
// ### Idempotency test
// [ ] Call POST /api/account/onboarding twice for same company
// [ ] No duplicate VAT rates, warehouses, clients, etc.
//
// ### Email/password still works
// [ ] Use existing test credentials → still logs in fine
// [ ] Session cookie set correctly
