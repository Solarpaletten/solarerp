# 📋 TASK 10 PLAN — Solar ERP Next Sprint
**Date:** 2026-02-20
**Goal:** Fix P0 blockers + establish company-level architecture

---

## P0 — MUST DO FIRST (blocks everything)

### P0.1: Generate missing migration
```bash
npx prisma migrate dev --name add_sessions_and_priority
```
Generates SQL for:
- CREATE TABLE sessions (id, token, userId, tenantId, expiresAt, createdAt)
- ALTER TABLE companies ADD COLUMN priority INTEGER DEFAULT 0
- Indexes on sessions(token UNIQUE, userId, expiresAt)

**Without this:** App crashes on login, priorities don't work on fresh DB.
**Time:** 5 min

### P0.2: Fix companyId type mismatch
File: `app/(dashboard)/account/companies/page.tsx`

Change:
```ts
// BEFORE
interface Company {
  id: number;          // ❌ wrong — Prisma uses String cuid
  ...
}
const handleEnterCompany = (companyId: number) => { ... }
const savePriorities = async (updatedCompanies: Company[]) => {
  const priorities: { [key: number]: number } = {};  // ❌ key should be string
  ...
}

// AFTER
interface Company {
  id: string;          // ✅ matches Prisma String cuid
  ...
}
const handleEnterCompany = (companyId: string) => { ... }
const savePriorities = async (updatedCompanies: Company[]) => {
  const priorities: { [key: string]: number } = {};  // ✅ string keys
  ...
}
```

Also check: `is_active` → should be `status` (CompanyStatus enum), `created_at` → `createdAt` (Prisma convention).

**Time:** 15 min

### P0.3: Middleware — clarify /api/auth/me
File: `middleware.ts`

Add to PUBLIC_ROUTES:
```ts
const PUBLIC_ROUTES = [
  '/login',
  '/signup',
  '/api/auth/login',
  '/api/auth/signup',
  '/api/auth/logout',
  '/api/auth/me',      // ← ADD: self-protected, explicitly public
  '/api/health',
];
```

Handler already returns 401 for unauthenticated requests. This just makes the intent explicit.

**Time:** 2 min

---

## P0.4: Company Context (reduce N+1 fetching)

**Problem:** CompanySidebar, CompanyHeader, dashboard page, company page — each fetches `/api/account/companies/${companyId}` independently = 4 duplicate requests.

**Solution:** Company layout fetches once, passes via React Context.

Create:
```
app/(dashboard)/company/[companyId]/CompanyContext.tsx  — React context + provider
app/(dashboard)/company/[companyId]/layout.tsx          — wraps children in CompanyProvider
```

Pattern:
```tsx
// CompanyContext.tsx
const CompanyContext = createContext<CompanyData | null>(null);
export function CompanyProvider({ companyId, children }) {
  const [company, setCompany] = useState(null);
  useEffect(() => { fetch(`/api/account/companies/${companyId}`).then(...) }, [companyId]);
  return <CompanyContext.Provider value={company}>{children}</CompanyContext.Provider>
}
export const useCompany = () => useContext(CompanyContext);

// layout.tsx
export default function CompanyLayout({ children, params }) {
  return <CompanyProvider companyId={params.companyId}>{children}</CompanyProvider>
}

// All child components:
const company = useCompany(); // ← no fetch, just context read
```

**Time:** 30 min

---

## P1 — IMPORTANT (next session)

### P1.1: Standardize API response format
All routes should return:
```ts
// Success
{ data: {...} }           // single entity
{ data: [...], count: N } // list

// Error
{ error: "message" }
```
Currently mixed: some return `{ success, companies }`, some return entity directly.

### P1.2: Session cleanup
Add to login flow or create separate endpoint:
```ts
// In POST /api/auth/login, after createSession():
cleanupExpiredSessions().catch(() => {}); // fire-and-forget
```
Or create `/api/cron/cleanup-sessions` for external cron trigger.

### P1.3: Module routes scaffolding
Create tenant+company-safe CRUD for first ERP module:
```
/api/company/[companyId]/clients  — GET, POST
/api/company/[companyId]/clients/[clientId]  — GET, PATCH, DELETE
```

Pattern (two-level isolation):
```ts
export async function GET(request, { params }) {
  const { tenantId } = await requireTenant(request);
  const { companyId } = await params;

  // Step 1: Verify tenant owns this company
  const company = await prisma.company.findFirst({
    where: { id: companyId, tenantId }
  });
  if (!company) return 404;

  // Step 2: Query within company scope
  const clients = await prisma.client.findMany({
    where: { companyId: company.id }
  });
  return NextResponse.json({ data: clients });
}
```

### P1.4: Mobile auth strategy
- Keep x-user-id header fallback in getCurrentUser() — no changes needed
- Future: add JWT Bearer token as third auth method
- Add token refresh endpoint: POST /api/auth/refresh

---

## Sprint estimate

| Task | Time | Priority |
|------|------|----------|
| P0.1 Migration | 5 min | P0 |
| P0.2 companyId type | 15 min | P0 |
| P0.3 Middleware clarification | 2 min | P0 |
| P0.4 Company Context | 30 min | P0 |
| P1.1 API format | 30 min | P1 |
| P1.2 Session cleanup | 10 min | P1 |
| P1.3 Clients module scaffold | 1-2 hrs | P1 |
| P1.4 Mobile auth docs | 15 min | P1 |

**Total P0:** ~50 min
**Total P1:** ~2-3 hrs
