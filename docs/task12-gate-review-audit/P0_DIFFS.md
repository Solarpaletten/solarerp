# 🔧 P0 DIFFS — Exact changes required

---

## P0.3 FIX: middleware.ts — add /api/auth/me to PUBLIC_ROUTES

### File: `middleware.ts`
### Line: ~24 (PUBLIC_ROUTES array)

```diff
 const PUBLIC_ROUTES = [
   '/login',
   '/signup',
   '/api/auth/login',
   '/api/auth/signup',
   '/api/auth/logout',
+  '/api/auth/me',
   '/api/health',
 ];
```

---

## P0.2 FIX: companies/page.tsx — companyId type string

### File: `app/(dashboard)/account/companies/page.tsx`
### Lines: interface + handlers

```diff
 interface Company {
-  id: number;
+  id: string;
   name: string;
   code: string;
   description?: string;
-  is_active: boolean;
-  created_at: string;
+  status?: string;
+  createdAt?: string;
   clientsCount?: number;
   salesCount?: number;
   productsCount?: number;
   priority?: number;
   avatar?: string;
   color?: string;
 }
```

```diff
-  const handleEnterCompany = (companyId: number) => {
+  const handleEnterCompany = (companyId: string) => {
     router.push(`/company/${companyId}/dashboard`);
   };
```

```diff
   const savePriorities = async (updatedCompanies: Company[]) => {
     try {
-      const priorities: { [key: number]: number } = {};
+      const priorities: { [key: string]: number } = {};
       updatedCompanies.forEach(company => {
```

---

## P0.1 FIX: Generate missing migration

### Command:
```bash
cd projects/solar-erp
npx prisma migrate dev --name add_sessions_and_priority
```

### Expected generated SQL (verify after generation):
```sql
-- AlterTable
ALTER TABLE "companies" ADD COLUMN "priority" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "sessions_token_key" ON "sessions"("token");

-- CreateIndex
CREATE INDEX "sessions_userId_idx" ON "sessions"("userId");

-- CreateIndex
CREATE INDEX "sessions_expiresAt_idx" ON "sessions"("expiresAt");

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_userId_fkey" 
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
```
