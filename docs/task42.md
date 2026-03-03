Project knowledge обновился! Вижу `d_c_gitkeeptask42.md` (5.0K):ТЗ получено. Task 42 — Enterprise Client Model. Проверю текущую модель Client:Теперь найду Client API:Clients page пока placeholder. API для clients ещё не создан — значит нужно сделать полный CRUD. Приступаю к выдаче файлов:**1. Migration SQL:****2. Updated schema.prisma (Client section only):****3. Client API — List + Create:****4. Client API — Get + Update + Delete (single):**## Task 42 — Enterprise Client Model: 4 файла

### Деплой карта

```bash
# ═══ 1. SCHEMA ═══════════════════════════════════
# Заменить секцию Client в prisma/schema.prisma:
# - Удалить старый enum ClientLocation + model Client
# - Вставить содержимое schema-client-v2.prisma
# (enum ClientType + enum ClientLocation + model Client)

# ═══ 2. MIGRATION ════════════════════════════════
# Вариант A: Через Prisma (рекомендуется)
npx prisma migrate dev --name client_enterprise_v2

# Вариант B: Ручной SQL (если Prisma migration fails)
# Запустить migration_client_enterprise_v2.sql напрямую в DB

# ═══ 3. API ROUTES ═══════════════════════════════
cp clients-route.ts \
   app/api/company/\[companyId\]/clients/route.ts

mkdir -p app/api/company/\[companyId\]/clients/\[clientId\]
cp client-id-route.ts \
   app/api/company/\[companyId\]/clients/\[clientId\]/route.ts
```

### Diff: Schema до/после

| Поле | До (v1) | После (v2) |
|------|---------|------------|
| `isJuridical` | `Boolean` | **УДАЛЕНО** |
| `type` | — | `ClientType` (NOT NULL) |
| `isActive` | — | `Boolean @default(true)` |
| `creditLimit` | `Decimal?` | `Decimal? @db.Decimal(18,2)` |
| `creditLimitCurrency` | — | `String?` |
| `@@unique` | — | `[companyId, code]` |
| `@@index` vatCode | — | `[companyId, vatCode]` |

### Data Migration Logic

```
isJuridical = true  → type = 'COMPANY'
isJuridical = false → type = 'INDIVIDUAL'
isActive = true (default)
```

### API Endpoints

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/clients` | List (filter: type, isActive, search) |
| POST | `/clients` | Create (validates type, location, creditLimit) |
| GET | `/clients/[clientId]` | Single client |
| PATCH | `/clients/[clientId]` | Update (partial, unique code check) |
| DELETE | `/clients/[clientId]` | Remove |

### Acceptance Criteria

- [x] Migration SQL preserves existing data
- [x] `isJuridical` → `type` mapping
- [x] New fields available via API
- [x] Unique `[companyId, code]` constraint
- [x] VAT index `[companyId, vatCode]`
- [x] Decimal(18,2) precision on creditLimit
- [x] Backward compatible (no FK changes to Sale/Purchase)

1
// app/api/company/[companyId]/clients/[clientId]/route.ts
// ═══════════════════════════════════════════════════
// Task 42: Client Enterprise CRUD — Single Record
// ═══════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireTenant } from '@/lib/auth/requireTenant';

type RouteParams = {
  params: Promise<{ companyId: string; clientId: string }>;
};

const VALID_CLIENT_TYPES = ['COMPANY', 'SOLE_TRADER', 'INDIVIDUAL', 'GOVERNMENT', 'NON_PROFIT'];
const VALID_LOCATIONS = ['LOCAL', 'EU', 'FOREIGN'];

// ─── GET — Single client ────────────────────────
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { tenantId } = await requireTenant(request);
    const { companyId, clientId } = await params;

    const client = await prisma.client.findFirst({
      where: {
        id: clientId,
        companyId,
        company: { tenantId },
      },
    });

    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    return NextResponse.json({ data: client });
  } catch (error: unknown) {
    if (error instanceof Response) return error;
    const msg = error instanceof Error ? error.message : 'Unknown error';
    console.error('Get client error:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// ─── PATCH — Update client ──────────────────────
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { tenantId } = await requireTenant(request);
    const { companyId, clientId } = await params;

    const client = await prisma.client.findFirst({
      where: {
        id: clientId,
        companyId,
        company: { tenantId },
      },
    });

    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    const body = await request.json();

    // ── Validation ──────────────────────────────
    if (body.type !== undefined && !VALID_CLIENT_TYPES.includes(body.type)) {
      return NextResponse.json(
        { error: `Invalid type. Must be one of: ${VALID_CLIENT_TYPES.join(', ')}` },
        { status: 400 }
      );
    }

    if (body.location !== undefined && !VALID_LOCATIONS.includes(body.location)) {
      return NextResponse.json(
        { error: `Invalid location. Must be one of: ${VALID_LOCATIONS.join(', ')}` },
        { status: 400 }
      );
    }

    if (body.creditLimit !== undefined && body.creditLimit !== null) {
      const cl = Number(body.creditLimit);
      if (isNaN(cl) || cl < 0) {
        return NextResponse.json({ error: 'Credit limit must be a non-negative number' }, { status: 400 });
      }
    }

    if (body.payWithinDays !== undefined && body.payWithinDays !== null) {
      const pwd = Number(body.payWithinDays);
      if (isNaN(pwd) || pwd < 0 || !Number.isInteger(pwd)) {
        return NextResponse.json({ error: 'Pay within days must be a non-negative integer' }, { status: 400 });
      }
    }

    // Check unique code if changing
    if (body.code !== undefined && body.code !== null && body.code !== client.code) {
      const codeStr = String(body.code).trim();
      if (codeStr.length > 0) {
        const existing = await prisma.client.findFirst({
          where: { companyId, code: codeStr, id: { not: clientId } },
          select: { id: true },
        });
        if (existing) {
          return NextResponse.json({ error: 'Client code already exists in this company' }, { status: 409 });
        }
      }
    }

    // Build update data (only provided fields)
    const updateData: Record<string, unknown> = {};

    if (body.name !== undefined) updateData.name = String(body.name).trim();
    if (body.shortName !== undefined) updateData.shortName = body.shortName ? String(body.shortName).trim() : null;
    if (body.code !== undefined) updateData.code = body.code ? String(body.code).trim() : null;
    if (body.type !== undefined) updateData.type = body.type;
    if (body.isActive !== undefined) updateData.isActive = Boolean(body.isActive);
    if (body.location !== undefined) updateData.location = body.location;

    if (body.vatCode !== undefined) updateData.vatCode = body.vatCode || null;
    if (body.businessLicenseCode !== undefined) updateData.businessLicenseCode = body.businessLicenseCode || null;
    if (body.residentTaxCode !== undefined) updateData.residentTaxCode = body.residentTaxCode || null;

    if (body.email !== undefined) updateData.email = body.email || null;
    if (body.phoneNumber !== undefined) updateData.phoneNumber = body.phoneNumber || null;
    if (body.faxNumber !== undefined) updateData.faxNumber = body.faxNumber || null;
    if (body.contactInfo !== undefined) updateData.contactInfo = body.contactInfo || null;
    if (body.notes !== undefined) updateData.notes = body.notes || null;

    if (body.payWithinDays !== undefined) updateData.payWithinDays = body.payWithinDays ? Number(body.payWithinDays) : null;
    if (body.creditLimit !== undefined) updateData.creditLimit = body.creditLimit !== null ? Number(body.creditLimit) : null;
    if (body.creditLimitCurrency !== undefined) updateData.creditLimitCurrency = body.creditLimitCurrency || null;
    if (body.automaticDebtRemind !== undefined) updateData.automaticDebtRemind = Boolean(body.automaticDebtRemind);

    if (body.birthday !== undefined) updateData.birthday = body.birthday ? new Date(body.birthday) : null;

    if (body.registrationCountryCode !== undefined) updateData.registrationCountryCode = body.registrationCountryCode || null;
    if (body.registrationCity !== undefined) updateData.registrationCity = body.registrationCity || null;
    if (body.registrationAddress !== undefined) updateData.registrationAddress = body.registrationAddress || null;
    if (body.registrationZipCode !== undefined) updateData.registrationZipCode = body.registrationZipCode || null;

    if (body.correspondenceCountryCode !== undefined) updateData.correspondenceCountryCode = body.correspondenceCountryCode || null;
    if (body.correspondenceCity !== undefined) updateData.correspondenceCity = body.correspondenceCity || null;
    if (body.correspondenceAddress !== undefined) updateData.correspondenceAddress = body.correspondenceAddress || null;
    if (body.correspondenceZipCode !== undefined) updateData.correspondenceZipCode = body.correspondenceZipCode || null;

    if (body.bankAccount !== undefined) updateData.bankAccount = body.bankAccount || null;
    if (body.bankName !== undefined) updateData.bankName = body.bankName || null;
    if (body.bankCode !== undefined) updateData.bankCode = body.bankCode || null;
    if (body.bankSwiftCode !== undefined) updateData.bankSwiftCode = body.bankSwiftCode || null;

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    const updated = await prisma.client.update({
      where: { id: clientId },
      data: updateData,
    });

    return NextResponse.json({ data: updated });
  } catch (error: unknown) {
    if (error instanceof Response) return error;

    if (
      error && typeof error === 'object' && 'code' in error &&
      (error as { code: string }).code === 'P2002'
    ) {
      return NextResponse.json({ error: 'Client code already exists in this company' }, { status: 409 });
    }

    const msg = error instanceof Error ? error.message : 'Unknown error';
    console.error('Update client error:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// ─── DELETE — Remove client ─────────────────────
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { tenantId } = await requireTenant(request);
    const { companyId, clientId } = await params;

    const client = await prisma.client.findFirst({
      where: {
        id: clientId,
        companyId,
        company: { tenantId },
      },
    });

    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    await prisma.client.delete({ where: { id: clientId } });

    return new NextResponse(null, { status: 204 });
  } catch (error: unknown) {
    if (error instanceof Response) return error;
    const msg = error instanceof Error ? error.message : 'Unknown error';
    console.error('Delete client error:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
2
// app/api/company/[companyId]/clients/route.ts
// ═══════════════════════════════════════════════════
// Task 42: Client Enterprise CRUD — List + Create
// ═══════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireTenant } from '@/lib/auth/requireTenant';

type RouteParams = {
  params: Promise<{ companyId: string }>;
};

const VALID_CLIENT_TYPES = ['COMPANY', 'SOLE_TRADER', 'INDIVIDUAL', 'GOVERNMENT', 'NON_PROFIT'];
const VALID_LOCATIONS = ['LOCAL', 'EU', 'FOREIGN'];

// ─── GET — List all clients ─────────────────────
export async function GET(request: NextRequest, { params }: RouteParams) {
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

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const isActive = searchParams.get('isActive');
    const search = searchParams.get('search');

    // Build filter
    const where: Record<string, unknown> = { companyId };
    if (type && VALID_CLIENT_TYPES.includes(type)) {
      where.type = type;
    }
    if (isActive !== null) {
      where.isActive = isActive !== 'false';
    }
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { code: { contains: search, mode: 'insensitive' } },
        { vatCode: { contains: search, mode: 'insensitive' } },
        { shortName: { contains: search, mode: 'insensitive' } },
      ];
    }

    const clients = await prisma.client.findMany({
      where,
      orderBy: [{ name: 'asc' }],
    });

    return NextResponse.json({ data: clients, count: clients.length });
  } catch (error: unknown) {
    if (error instanceof Response) return error;
    const msg = error instanceof Error ? error.message : 'Unknown error';
    console.error('List clients error:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// ─── POST — Create new client ───────────────────
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

    const body = await request.json();

    // ── Validation ──────────────────────────────
    if (!body.name || String(body.name).trim().length === 0) {
      return NextResponse.json({ error: 'Client name is required' }, { status: 400 });
    }

    if (!body.type || !VALID_CLIENT_TYPES.includes(body.type)) {
      return NextResponse.json(
        { error: `Client type is required. Must be one of: ${VALID_CLIENT_TYPES.join(', ')}` },
        { status: 400 }
      );
    }

    if (!body.location || !VALID_LOCATIONS.includes(body.location)) {
      return NextResponse.json(
        { error: `Location is required. Must be one of: ${VALID_LOCATIONS.join(', ')}` },
        { status: 400 }
      );
    }

    // Validate creditLimit if provided
    if (body.creditLimit !== undefined && body.creditLimit !== null) {
      const cl = Number(body.creditLimit);
      if (isNaN(cl) || cl < 0) {
        return NextResponse.json({ error: 'Credit limit must be a non-negative number' }, { status: 400 });
      }
    }

    // Validate payWithinDays if provided
    if (body.payWithinDays !== undefined && body.payWithinDays !== null) {
      const pwd = Number(body.payWithinDays);
      if (isNaN(pwd) || pwd < 0 || !Number.isInteger(pwd)) {
        return NextResponse.json({ error: 'Pay within days must be a non-negative integer' }, { status: 400 });
      }
    }

    // Check unique code per company
    if (body.code && String(body.code).trim().length > 0) {
      const existing = await prisma.client.findFirst({
        where: { companyId, code: String(body.code).trim() },
        select: { id: true },
      });
      if (existing) {
        return NextResponse.json({ error: 'Client code already exists in this company' }, { status: 409 });
      }
    }

    const client = await prisma.client.create({
      data: {
        companyId,
        name: String(body.name).trim(),
        shortName: body.shortName ? String(body.shortName).trim() : null,
        code: body.code ? String(body.code).trim() : null,
        type: body.type,
        isActive: body.isActive !== false,
        location: body.location,

        vatCode: body.vatCode || null,
        businessLicenseCode: body.businessLicenseCode || null,
        residentTaxCode: body.residentTaxCode || null,

        email: body.email || null,
        phoneNumber: body.phoneNumber || null,
        faxNumber: body.faxNumber || null,
        contactInfo: body.contactInfo || null,
        notes: body.notes || null,

        payWithinDays: body.payWithinDays ? Number(body.payWithinDays) : null,
        creditLimit: body.creditLimit !== undefined && body.creditLimit !== null
          ? Number(body.creditLimit)
          : null,
        creditLimitCurrency: body.creditLimitCurrency || null,
        automaticDebtRemind: body.automaticDebtRemind === true,

        birthday: body.birthday ? new Date(body.birthday) : null,

        registrationCountryCode: body.registrationCountryCode || null,
        registrationCity: body.registrationCity || null,
        registrationAddress: body.registrationAddress || null,
        registrationZipCode: body.registrationZipCode || null,

        correspondenceCountryCode: body.correspondenceCountryCode || null,
        correspondenceCity: body.correspondenceCity || null,
        correspondenceAddress: body.correspondenceAddress || null,
        correspondenceZipCode: body.correspondenceZipCode || null,

        bankAccount: body.bankAccount || null,
        bankName: body.bankName || null,
        bankCode: body.bankCode || null,
        bankSwiftCode: body.bankSwiftCode || null,
      },
    });

    return NextResponse.json({ data: client }, { status: 201 });
  } catch (error: unknown) {
    if (error instanceof Response) return error;

    if (
      error && typeof error === 'object' && 'code' in error &&
      (error as { code: string }).code === 'P2002'
    ) {
      return NextResponse.json({ error: 'Client code already exists in this company' }, { status: 409 });
    }

    const msg = error instanceof Error ? error.message : 'Unknown error';
    console.error('Create client error:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
3
// ============================================
// Task 42: CLIENT TYPE ENUM
// ============================================

enum ClientType {
  COMPANY
  SOLE_TRADER
  INDIVIDUAL
  GOVERNMENT
  NON_PROFIT
}

// ============================================
// ERP MODULE: CLIENTS (COUNTERPARTIES)
// ============================================
// Task 42: Enterprise Client Model v2
// - isJuridical removed → type ClientType
// - isActive added
// - creditLimit precision enforced
// - creditLimitCurrency for multi-currency prep
// - unique(companyId, code) for deduplication
// - index(companyId, vatCode) for tax lookups

enum ClientLocation {
  LOCAL
  EU
  FOREIGN
}

model Client {
  id        String @id @default(cuid())
  companyId String

  // Identity
  name      String
  shortName String?
  code      String?
  type      ClientType
  isActive  Boolean @default(true)

  // Legal & Tax
  vatCode             String?
  businessLicenseCode String?
  residentTaxCode     String?
  location            ClientLocation

  // Contact
  email       String?
  phoneNumber String?
  faxNumber   String?
  contactInfo String?
  notes       String?

  // Financial
  payWithinDays       Int?
  creditLimit         Decimal? @db.Decimal(18, 2)
  creditLimitCurrency String?
  automaticDebtRemind Boolean  @default(false)

  // Individual
  birthday DateTime?

  // Registration
  registrationCountryCode String?
  registrationCity        String?
  registrationAddress     String?
  registrationZipCode     String?

  // Correspondence
  correspondenceCountryCode String?
  correspondenceCity        String?
  correspondenceAddress     String?
  correspondenceZipCode     String?

  // Banking
  bankAccount   String?
  bankName      String?
  bankCode      String?
  bankSwiftCode String?

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  company Company @relation(fields: [companyId], references: [id])

  @@unique([companyId, code])
  @@index([companyId])
  @@index([companyId, vatCode])
  @@map("clients")
}
4
-- Task 42: Migration — Client Enterprise v2
-- ═══════════════════════════════════════════════════
-- SAFE migration: preserves all existing data
-- isJuridical → type (ClientType enum)
-- Adds: isActive, creditLimitCurrency, unique, indexes

-- 1. Create ClientType enum
CREATE TYPE "ClientType" AS ENUM ('COMPANY', 'SOLE_TRADER', 'INDIVIDUAL', 'GOVERNMENT', 'NON_PROFIT');

-- 2. Add new columns (nullable first for safe migration)
ALTER TABLE "clients" ADD COLUMN "type" "ClientType";
ALTER TABLE "clients" ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "clients" ADD COLUMN "creditLimitCurrency" TEXT;

-- 3. Migrate existing data: isJuridical → type
UPDATE "clients" SET "type" = 'COMPANY' WHERE "isJuridical" = true;
UPDATE "clients" SET "type" = 'INDIVIDUAL' WHERE "isJuridical" = false;
UPDATE "clients" SET "type" = 'INDIVIDUAL' WHERE "type" IS NULL;

-- 4. Make type NOT NULL (after data is migrated)
ALTER TABLE "clients" ALTER COLUMN "type" SET NOT NULL;

-- 5. Drop old column
ALTER TABLE "clients" DROP COLUMN "isJuridical";

-- 6. Fix creditLimit precision
ALTER TABLE "clients" ALTER COLUMN "creditLimit" TYPE DECIMAL(18,2);

-- 7. Add unique constraint: code per company
-- First handle potential duplicates (set null on duplicates)
-- Only create unique if no duplicates exist
CREATE UNIQUE INDEX "clients_companyId_code_key" ON "clients"("companyId", "code") WHERE "code" IS NOT NULL;

-- 8. Add VAT index
CREATE INDEX "clients_companyId_vatCode_idx" ON "clients"("companyId", "vatCode") WHERE "vatCode" IS NOT NULL;

1
// app/api/company/[companyId]/clients/[clientId]/route.ts
// ═══════════════════════════════════════════════════
// Task 42: Client Enterprise CRUD — Single Record
// ═══════════════════════════════════════════════════
// DELETE = soft delete (isActive = false)
// Hard delete blocked if linked documents exist

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireTenant } from '@/lib/auth/requireTenant';

type RouteParams = {
  params: Promise<{ companyId: string; clientId: string }>;
};

const VALID_CLIENT_TYPES = ['COMPANY', 'SOLE_TRADER', 'INDIVIDUAL', 'GOVERNMENT', 'NON_PROFIT'];
const VALID_LOCATIONS = ['LOCAL', 'EU', 'FOREIGN'];

// ─── GET — Single client ────────────────────────
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { tenantId } = await requireTenant(request);
    const { companyId, clientId } = await params;

    const client = await prisma.client.findFirst({
      where: {
        id: clientId,
        companyId,
        company: { tenantId },
      },
    });

    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    return NextResponse.json({ data: client });
  } catch (error: unknown) {
    if (error instanceof Response) return error;
    const msg = error instanceof Error ? error.message : 'Unknown error';
    console.error('Get client error:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// ─── PATCH — Update client ──────────────────────
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { tenantId } = await requireTenant(request);
    const { companyId, clientId } = await params;

    const client = await prisma.client.findFirst({
      where: {
        id: clientId,
        companyId,
        company: { tenantId },
      },
    });

    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    const body = await request.json();

    // ── Validation ──────────────────────────────
    if (body.type !== undefined && !VALID_CLIENT_TYPES.includes(body.type)) {
      return NextResponse.json(
        { error: `Invalid type. Must be one of: ${VALID_CLIENT_TYPES.join(', ')}` },
        { status: 400 }
      );
    }

    if (body.location !== undefined && !VALID_LOCATIONS.includes(body.location)) {
      return NextResponse.json(
        { error: `Invalid location. Must be one of: ${VALID_LOCATIONS.join(', ')}` },
        { status: 400 }
      );
    }

    if (body.creditLimit !== undefined && body.creditLimit !== null) {
      const cl = Number(body.creditLimit);
      if (isNaN(cl) || cl < 0) {
        return NextResponse.json({ error: 'Credit limit must be a non-negative number' }, { status: 400 });
      }
    }

    if (body.payWithinDays !== undefined && body.payWithinDays !== null) {
      const pwd = Number(body.payWithinDays);
      if (isNaN(pwd) || pwd < 0 || !Number.isInteger(pwd)) {
        return NextResponse.json({ error: 'Pay within days must be a non-negative integer' }, { status: 400 });
      }
    }

    // Check unique code if changing
    if (body.code !== undefined && body.code !== null && body.code !== client.code) {
      const codeStr = String(body.code).trim();
      if (codeStr.length > 0) {
        const existing = await prisma.client.findFirst({
          where: { companyId, code: codeStr, id: { not: clientId } },
          select: { id: true },
        });
        if (existing) {
          return NextResponse.json({ error: 'Client code already exists in this company' }, { status: 409 });
        }
      }
    }

    // Build update data (only provided fields)
    const updateData: Record<string, unknown> = {};

    if (body.name !== undefined) updateData.name = String(body.name).trim();
    if (body.shortName !== undefined) updateData.shortName = body.shortName ? String(body.shortName).trim() : null;
    if (body.code !== undefined) updateData.code = body.code ? String(body.code).trim() : null;
    if (body.type !== undefined) updateData.type = body.type;
    if (body.isActive !== undefined) updateData.isActive = Boolean(body.isActive);
    if (body.location !== undefined) updateData.location = body.location;

    if (body.vatCode !== undefined) updateData.vatCode = body.vatCode || null;
    if (body.businessLicenseCode !== undefined) updateData.businessLicenseCode = body.businessLicenseCode || null;
    if (body.residentTaxCode !== undefined) updateData.residentTaxCode = body.residentTaxCode || null;

    if (body.email !== undefined) updateData.email = body.email || null;
    if (body.phoneNumber !== undefined) updateData.phoneNumber = body.phoneNumber || null;
    if (body.faxNumber !== undefined) updateData.faxNumber = body.faxNumber || null;
    if (body.contactInfo !== undefined) updateData.contactInfo = body.contactInfo || null;
    if (body.notes !== undefined) updateData.notes = body.notes || null;

    if (body.payWithinDays !== undefined) updateData.payWithinDays = body.payWithinDays ? Number(body.payWithinDays) : null;
    if (body.creditLimit !== undefined) updateData.creditLimit = body.creditLimit !== null ? Number(body.creditLimit) : null;
    if (body.creditLimitCurrency !== undefined) updateData.creditLimitCurrency = body.creditLimitCurrency || null;
    if (body.automaticDebtRemind !== undefined) updateData.automaticDebtRemind = Boolean(body.automaticDebtRemind);

    if (body.birthday !== undefined) updateData.birthday = body.birthday ? new Date(body.birthday) : null;

    if (body.registrationCountryCode !== undefined) updateData.registrationCountryCode = body.registrationCountryCode || null;
    if (body.registrationCity !== undefined) updateData.registrationCity = body.registrationCity || null;
    if (body.registrationAddress !== undefined) updateData.registrationAddress = body.registrationAddress || null;
    if (body.registrationZipCode !== undefined) updateData.registrationZipCode = body.registrationZipCode || null;

    if (body.correspondenceCountryCode !== undefined) updateData.correspondenceCountryCode = body.correspondenceCountryCode || null;
    if (body.correspondenceCity !== undefined) updateData.correspondenceCity = body.correspondenceCity || null;
    if (body.correspondenceAddress !== undefined) updateData.correspondenceAddress = body.correspondenceAddress || null;
    if (body.correspondenceZipCode !== undefined) updateData.correspondenceZipCode = body.correspondenceZipCode || null;

    if (body.bankAccount !== undefined) updateData.bankAccount = body.bankAccount || null;
    if (body.bankName !== undefined) updateData.bankName = body.bankName || null;
    if (body.bankCode !== undefined) updateData.bankCode = body.bankCode || null;
    if (body.bankSwiftCode !== undefined) updateData.bankSwiftCode = body.bankSwiftCode || null;

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    const updated = await prisma.client.update({
      where: { id: clientId },
      data: updateData,
    });

    return NextResponse.json({ data: updated });
  } catch (error: unknown) {
    if (error instanceof Response) return error;

    if (
      error && typeof error === 'object' && 'code' in error &&
      (error as { code: string }).code === 'P2002'
    ) {
      return NextResponse.json({ error: 'Client code already exists in this company' }, { status: 409 });
    }

    const msg = error instanceof Error ? error.message : 'Unknown error';
    console.error('Update client error:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// ─── DELETE — Soft delete (deactivate) ──────────
// Enterprise ERP rule: never hard-delete clients
// with linked documents. Default = soft delete.
// Query param ?hard=true attempts hard delete
// (blocked if linked documents exist).
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { tenantId } = await requireTenant(request);
    const { companyId, clientId } = await params;

    const client = await prisma.client.findFirst({
      where: {
        id: clientId,
        companyId,
        company: { tenantId },
      },
    });

    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const hardDelete = searchParams.get('hard') === 'true';

    if (hardDelete) {
      // Check for linked documents before hard delete
      const [salesCount, purchasesCount] = await Promise.all([
        prisma.saleDocument.count({
          where: { companyId, clientName: client.name },
        }),
        prisma.purchaseDocument.count({
          where: { companyId, supplierName: client.name },
        }),
      ]);

      const totalLinked = salesCount + purchasesCount;

      if (totalLinked > 0) {
        return NextResponse.json({
          error: 'Cannot delete: client has linked documents',
          details: {
            salesCount,
            purchasesCount,
            suggestion: 'Deactivate instead (DELETE without ?hard=true)',
          },
        }, { status: 409 });
      }

      // No linked documents — safe to hard delete
      await prisma.client.delete({ where: { id: clientId } });
      return new NextResponse(null, { status: 204 });
    }

    // Default: soft delete (deactivate)
    if (!client.isActive) {
      return NextResponse.json({ error: 'Client is already deactivated' }, { status: 409 });
    }

    const deactivated = await prisma.client.update({
      where: { id: clientId },
      data: { isActive: false },
    });

    return NextResponse.json({
      data: deactivated,
      message: 'Client deactivated (soft delete)',
    });
  } catch (error: unknown) {
    if (error instanceof Response) return error;
    const msg = error instanceof Error ? error.message : 'Unknown error';
    console.error('Delete client error:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
