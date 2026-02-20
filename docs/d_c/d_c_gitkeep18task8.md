Отлично. Тогда даём Клауди чёткое, архитектурное ТЗ — без размытия, без “попробуй”.
Цель: **устранить cross-tenant риск в `[companyId]/route.ts` и выровнять стандарт безопасности для всех CRUD.**

Ниже — готовый текст для отправки Claude.

---

# 📌 D=>C — ТЗ: Tenant-Safe Company Route Refactor

**Контекст:**
После внедрения Session + Middleware усиления необходимо привести `app/api/account/companies/[companyId]/route.ts` к fully tenant-scoped DB operations.

Текущая проблема:
PATCH и DELETE выполняют `update` / `delete` по `id` без tenantId в `where`, что теоретически допускает cross-tenant mutation при ошибках логики.

---

## 🎯 Задача

Полностью переписать файл:

```
app/api/account/companies/[companyId]/route.ts
```

с соблюдением следующих правил:

---

## 🔐 1. Tenant-scope на уровне DB операции (обязательно)

Нельзя делать:

```ts
prisma.company.update({ where: { id } })
```

Нужно использовать один из двух вариантов:

### Вариант A (предпочтительный, без миграций)

Использовать `updateMany` / `deleteMany`:

```ts
await prisma.company.updateMany({
  where: { id, tenantId },
  data: {...}
})
```

И проверять `result.count === 0`.

---

## 🔒 2. requireTenant(request) — единственный источник tenantId

Никаких manual header parsing.
Только:

```ts
const { tenantId } = await requireTenant(request);
```

---

## 🧱 3. Поведение API

### GET

* вернуть 404 если не найдено
* tenant-scoped

### PATCH

* updateMany
* если count === 0 → 404
* вернуть обновлённую запись (findFirst с tenantId)

### DELETE

* deleteMany
* если count === 0 → 404
* вернуть 204

---

## 🚫 4. Убрать предварительный findFirst check

Не делать:

```ts
const existing = findFirst(...)
if (!existing) ...
```

Это двойной запрос.
Проверка должна строиться на `updateMany/deleteMany count`.

---

## 📦 5. Вывести полный финальный файл

Claude должен вывести:

* Полный файл целиком
* Без сокращений
* Production-ready
* С комментариями

---

## 📌 Дополнительно

После этого:

1. Просканировать проект на наличие:

   * `update({ where: { id } })`
   * `delete({ where: { id } })`
     без tenantId
2. Сформировать список потенциально небезопасных мест (если есть).

---

## 🧠 Цель

Привести весь уровень Company CRUD к tenant-safe архитектуре, соответствующей SaaS best practices.

---

Отправляй это Клауди.

Когда он пришлёт файл — скидывай сюда.
Я сделаю финальное security-ревью.

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
➜  solar-erp git:(main) ✗ cat app/api/account/companies/route.ts                                             
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
➜  solar-erp git:(main) ✗ cat app/api/auth/login/route.ts                                  
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
➜  solar-erp git:(main) ✗ cat app/api/auth/logout/route.ts                           
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
➜  solar-erp git:(main) ✗ cat app/api/auth/signup/route.ts                            
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

➜  solar-erp git:(main) ✗ cat app/api/account/companies/[companyId]/route.ts                            
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireTenant } from '@/lib/auth/requireTenant';

type RouteParams = {
  params: {
    companyId: string;
  };
};

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { tenantId } = await requireTenant(request);

    const company = await prisma.company.findFirst({
      where: {
        id: params.companyId,
        tenantId,
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

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { tenantId } = await requireTenant(request);
    const body = await request.json();

    const existing = await prisma.company.findFirst({
      where: {
        id: params.companyId,
        tenantId,
      },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    const company = await prisma.company.update({
      where: { id: params.companyId },
      data: {
        name: body.name ?? existing.name,
        code: body.code ?? existing.code,
        vatNumber: body.vatNumber ?? existing.vatNumber,
        country: body.country ?? existing.country,
        status: body.status ?? existing.status,
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

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { tenantId } = await requireTenant(request);

    const existing = await prisma.company.findFirst({
      where: {
        id: params.companyId,
        tenantId,
      },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    await prisma.company.delete({
      where: { id: params.companyId },
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    if (error instanceof Response) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Delete company error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

➜  solar-erp git:(main) ✗ cat lib/auth/getCurrentUser.ts                                              
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
➜  solar-erp git:(main) ✗ cat lib/auth/session.ts                          
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
➜  solar-erp git:(main) ✗ cat lib/auth/password.ts                   
import bcrypt from 'bcryptjs';

export const hashPassword = async (password: string): Promise<string> => {
  const saltRounds = 12;
  return await bcrypt.hash(password, saltRounds);
};

export const verifyPassword = async (password: string, hash: string): Promise<boolean> => {
  return await bcrypt.compare(password, hash);
};

➜  solar-erp git:(main) ✗ cat lib/auth/requireTenant.ts                    
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

➜  solar-erp git:(main) ✗ cat prisma/schema.prisma                         
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

  @@index([tenantId])
  @@map("companies")
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
  id        String   @id @default(cuid())
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
  automaticDebtRemind Boolean @default(false)

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
  id        String   @id @default(cuid())
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
  freePrice       Boolean @default(false)

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
  id        String   @id @default(cuid())
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

  intraTransactionCode  String?
  intraDeliveryTerms    String?
  intraTransportCode    String?
  intraCountryCode      String?
  intrastatWeightNetto  Decimal?
  vatRateName           String?

  sale SaleDocument @relation(fields: [saleId], references: [id], onDelete: Cascade)

  @@index([saleId])
  @@map("sale_items")
}

// ============================================
// ERP MODULE: PURCHASES
// ============================================

model PurchaseDocument {
  id        String   @id @default(cuid())
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

  notes         String?
  accComment    String?
  carRegNumber  String?
  fuelCard      String?

  intraTransactionCode    String?
  intraDeliveryTerms      String?
  intraTransportCode      String?
  intraCountryOfOriginCode String?
  intrastatWeightNetto    Decimal?

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
  id        String   @id @default(cuid())
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
  freePrice       Boolean @default(false)

  createdAt DateTime @default(now())

  company Company @relation(fields: [companyId], references: [id])

  @@index([companyId])
  @@index([documentDate])
  @@map("stock_movements")
}

// ============================================
// ERP MODULE: BANK STATEMENTS
// ============================================

model BankStatement {
  id        String   @id @default(cuid())
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
➜  solar-erp git:(main) ✗ cat middleware.ts                    
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
➜  solar-erp git:(main) ✗ cat lib/auth/session.ts      