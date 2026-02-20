# 🔐 AUDIT REPORT — Solar ERP Gate Review
**Date:** 2026-02-20
**Scope:** Full repo security + architecture check before production start
**Verdict:** 3 P0 fixes required, 4 P1 improvements. No critical auth bypass found.

---

## 1. AUTH FLOW

### Login → Cookie → /api/auth/me → Logout

| Step | Status | Notes |
|------|--------|-------|
| POST /api/auth/login | ✅ OK | Validates email+password, calls createSession(), cookie set HttpOnly |
| Cookie attributes | ✅ OK | httpOnly=true, secure=production, sameSite=lax, maxAge=7d, path=/ |
| GET /api/auth/me | ✅ OK | Uses getSession() which validates token in DB, returns 401 if no/expired session |
| POST /api/auth/logout | ✅ OK | destroySession() deletes DB record + clears cookie |
| getCurrentUser() | ✅ OK | Priority: cookie → x-user-id header fallback (mobile compat preserved) |
| Session expiry | ✅ OK | Checked on every getSession() call, expired sessions auto-deleted |

### Risk: Login doesn't scope email by tenant
- `findFirst({ where: { email } })` — if two tenants have same email, first match wins
- **Severity: P1** — acceptable for now due to `@@unique([tenantId, email])` but login doesn't include tenant context
- **Future fix:** Add tenant identifier to login flow or enforce globally unique emails

---

## 2. MIDDLEWARE COVERAGE

### Protected vs Public routes

| Path | Middleware | Handler Auth | Status |
|------|-----------|-------------|--------|
| `/account/*` | ✅ Cookie check | ✅ getCurrentUser() | OK |
| `/company/*` | ✅ Cookie check | ✅ requireTenant() | OK |
| `/api/account/*` | ✅ Cookie check → 401 | ✅ getCurrentUser() | OK |
| `/api/company/*` | ✅ Cookie check → 401 | (no handlers yet) | OK |
| `/api/auth/login` | ✅ Public | N/A | OK |
| `/api/auth/signup` | ✅ Public | N/A | OK |
| `/api/auth/logout` | ✅ Public | Handler checks session | OK |
| `/api/auth/me` | ⚠️ **NOT in protected prefixes** | ✅ Handler returns 401 if no session | **P0 — see below** |
| `/api/health` | ✅ Public | N/A | OK |

### ⚠️ P0 FINDING: `/api/auth/me` middleware gap

**Issue:** `/api/auth/me` is NOT covered by middleware protected prefixes (`/api/account`, `/api/company`).
It falls into the "not protected, not public" category → middleware passes through.

**Impact:** Low — the handler itself calls `getSession()` and returns 401 if no valid session.
But this breaks the defense-in-depth pattern.

**Fix:** Either:
- (A) Add `/api/auth/me` to PUBLIC_ROUTES explicitly (since handler self-protects) — **recommended, cleaner intent**
- (B) Add `/api/auth` prefix to PROTECTED_PREFIXES and keep login/signup/logout in PUBLIC_ROUTES

**Recommendation:** Option A — add to PUBLIC_ROUTES for explicit documentation of intent.

---

## 3. TENANT ISOLATION

### All mutation routes scanned:

| Route | Method | Tenant Scope | Status |
|-------|--------|-------------|--------|
| `/api/account/companies` | GET | `where: { tenantId }` | ✅ |
| `/api/account/companies` | POST | `data: { tenantId }` | ✅ |
| `/api/account/companies/[id]` | GET | `findFirst({ where: { id, tenantId } })` | ✅ |
| `/api/account/companies/[id]` | PATCH | `updateMany({ where: { id, tenantId } })` | ✅ |
| `/api/account/companies/[id]` | DELETE | `deleteMany({ where: { id, tenantId } })` | ✅ |
| `/api/account/companies/priorities` | PUT | `updateMany({ where: { id, tenantId } })` in $transaction | ✅ |
| `/api/auth/signup` | POST | Creates new tenant (isolated by design) | ✅ |
| `/api/auth/login` | POST | Reads user, no tenant mutation | ✅ |

### Unsafe pattern scan: `update({ where: { id } })` / `delete({ where: { id } })`
**Result: ZERO unsafe patterns found** — all mutations use `updateMany/deleteMany` with tenantId or are auth operations.

### Future ERP modules (Client, Item, Sale, Purchase, Stock, Bank)
- No API routes exist yet — only Prisma schema models
- **Pattern for implementation:** Verify company ownership via `findFirst({ where: { id: companyId, tenantId } })` then query within that company's scope
- Company→Tenant FK chain provides second isolation layer

---

## 4. API CONSISTENCY

| Issue | Details | Severity |
|-------|---------|----------|
| Response format inconsistency | GET /api/account/companies returns `{ success, companies }` but GET /[id] returns company directly | P1 |
| PATCH method | Companies page calls `method: 'PATCH'` but some older code might still use `'PUT'` — verify consistency | P1 |
| Status codes | 200/201/204/401/404 used correctly across all routes | ✅ OK |
| Error format | All routes return `{ error: string }` on failure | ✅ OK |

---

## 5. DATABASE

### Schema vs Migrations MISMATCH — P0

**schema.prisma** defines:
- `Session` model with token, userId, tenantId, expiresAt
- `Company.priority Int @default(0)`

**Migrations folder** has only:
- `20260127003906_init` — which does NOT contain sessions table or priority column

**Impact:** `prisma migrate deploy` on a fresh DB will NOT create the sessions table or priority column.
The app will crash on first login attempt.

**Fix required:**
```bash
npx prisma migrate dev --name add_sessions_and_priority
```
This generates the migration SQL for:
- CREATE TABLE sessions (...)
- ALTER TABLE companies ADD COLUMN "priority" INTEGER NOT NULL DEFAULT 0
- CREATE UNIQUE INDEX sessions_token_key
- CREATE INDEX sessions_userId_idx
- CREATE INDEX sessions_expiresAt_idx

**Severity: P0** — deployment blocker.

---

## 6. FRONTEND

### localStorage / x-user-id usage
**Zero localStorage auth usage in web code** — confirmed in Task 9 delivery.
All auth is cookie-based. ✅

### Company name fetching — N+1 issue

**Issue:** When user enters a company, these components each independently fetch `/api/account/companies/${companyId}`:
- `CompanySidebar.tsx` — useEffect fetch
- `CompanyHeader.tsx` — useEffect fetch  
- `dashboard/page.tsx` — useEffect fetch
- `page.tsx` (company root) — useEffect fetch

That's **4 duplicate API calls** for the same data on every company page load.

**Severity: P1** — not a security issue but creates unnecessary load.
**Fix:** React Context or server-side layout data passing.

### ⚠️ P0 FINDING: companyId type mismatch

**Prisma:** `Company.id String @id @default(cuid())` → string like `"clg2abc..."``
**UI (companies/page.tsx):** `interface Company { id: number; }` → treats ID as number
**handleEnterCompany:** `(companyId: number)` → passes number to router

**Impact:** JavaScript is loosely typed so `router.push(\`/company/${companyId}/dashboard\`)` works with either type at runtime. But TypeScript types are wrong, PATCH/DELETE will send string IDs in URL, and `priorities` map uses `{ [key: number]: number }` which should be `{ [key: string]: number }`.

**Fix:** Change `interface Company { id: number }` → `id: string` and update all number references.

---

## 7. RISKS & FIXES SUMMARY

| # | Risk | Severity | File | Fix |
|---|------|----------|------|-----|
| 1 | **Missing migration** for Session + Company.priority | **P0** | `prisma/migrations/` | Run `npx prisma migrate dev --name add_sessions_and_priority` |
| 2 | **companyId type mismatch** — `number` in UI, `string` in DB | **P0** | `app/(dashboard)/account/companies/page.tsx` | Change `id: number` → `id: string` throughout interface + handlers |
| 3 | **`/api/auth/me` middleware gap** — not explicitly categorized | **P0** | `middleware.ts` | Add to PUBLIC_ROUTES (handler self-protects) |
| 4 | Company name N+1 fetching | P1 | CompanySidebar, CompanyHeader, dashboard, page | Add React Context or server layout |
| 5 | Response format inconsistency | P1 | `/api/account/companies/route.ts` | Standardize all responses |
| 6 | Login email not tenant-scoped | P1 | `/api/auth/login/route.ts` | Future: add tenant context or enforce unique emails globally |
| 7 | No session cleanup cron | P1 | `lib/auth/session.ts` | Add cleanupExpiredSessions() to login or cron |
