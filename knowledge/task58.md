# Task 58 — Google OAuth + Company Onboarding + Accounting Bootstrap

## Status
✅ CLOSED | Verified on 2 machines

## Problem
After git reset, 17 of 18 Task 58 files were missing from project.
Migration history deleted. Only schema.prisma and seed.ts remained.

## Architecture Decisions
- `passwordHash String?` — nullable for Google users (no password)
- `CompanyUser` model — links User↔Company with role (OWNER/ACCOUNTANT/etc)
- `DocumentSequence` model — PUR-2026-00001 counter per company
- `googleId @unique` + `@@index([googleId])` — fast Google lookup
- Counterparty role is document-scoped, not entity-scoped (SAP standard)

## Files Changed (17 files)
```
lib/auth/googleAuthService.ts
lib/company/companyAccessService.ts
lib/onboarding/companyBootstrapService.ts
lib/onboarding/templateResolver.ts
lib/onboarding/templates/types.ts
lib/onboarding/templates/lt_uab_vat.ts
lib/onboarding/templates/global_default.ts
lib/onboarding/templates/chart_of_accounts/global_default.ts
lib/onboarding/templates/chart_of_accounts/lt_uab.ts
lib/onboarding/templates/chart_of_accounts/de_gmbh.ts
lib/services/documentNumberService.ts
app/api/auth/google/route.ts
app/api/auth/google/callback/route.ts
app/api/auth/forgot-password/SCAFFOLDS_AND_ENV.ts
app/api/account/onboarding/route.ts
app/api/account/onboarding/company/route.ts
app/(auth)/onboarding/page.tsx
```

## Schema Additions
```prisma
model User {
  passwordHash String?   // was String (required)
  surname      String?
  phone        String?
  googleId     String?  @unique
  avatarUrl    String?
  companyUsers CompanyUser[]
  @@index([googleId])
}

model Company {
  legalType             String?
  currencyCode          String   @default("EUR")
  vatPayer              Boolean  @default(true)
  onboardingCompletedAt DateTime?
  createdByUserId       String?
  companyUsers          CompanyUser[]
  documentSequences     DocumentSequence[]
}

model CompanyUser {
  companyId String
  userId    String
  role      String  @default("OWNER")
  isOwner   Boolean @default(false)
  @@unique([companyId, userId])
  @@map("company_users")
}

model DocumentSequence {
  companyId String
  prefix    String
  year      Int
  lastSeq   Int @default(0)
  @@unique([companyId, prefix, year])
  @@map("document_sequences")
}
```

## Migration Fix
```bash
npx prisma migrate dev --name task58_google_auth
# Prisma detected drift → reset public schema → applied migration
npx prisma generate
npx prisma db seed
```

## Seed Fix (idempotent)
Changed all `create` → `upsert` with fixed `seed-*` IDs.
Added `companyUser.create` for OWNER role.
Key: `where: { companyId_userId: { companyId, userId } }`

## Build Verification
```
✓ Compiled successfully
✓ Checking validity of types
✓ Generating static pages (19/19)
```

## Accepted Pattern
1. Schema patch → `prisma migrate dev` → `prisma generate` → `prisma db seed`
2. Seed must be idempotent — use `upsert` + fixed IDs
3. Always verify with `pnpm build` before closing task
4. `tsconfig.json` must exclude `task58/` reference directory

## Bootstrap Flow (new company via Google OAuth)
```
Google Login → handleGoogleAuth() → createSession()
→ hasCompany? → /account/companies : /account/onboarding
→ POST /api/account/onboarding/company
→ initializeCompanyFromTemplate() — 8 steps:
   1. createCompanyOwner()
   2. createDefaultAccounts() → 17-21 CoA
   3. createDefaultVatRates() → 6-7 rates
   4. createDefaultOperationTypes() → 5
   5. createDefaultWarehouses() → 2
   6. createDefaultEmployees() → 3
   7. createDefaultClients() → 5
   8. createDefaultProducts() → 4
   9. markOnboardingComplete()
```
