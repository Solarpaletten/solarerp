# Solar ERP Architecture Rules

Solar ERP is a multi-tenant SaaS ERP system.

---

## Tech Stack

- Next.js 14 (App Router)
- TypeScript
- Prisma ORM
- PostgreSQL
- TailwindCSS
- PNPM workspace

The system implements ERP modules for accounting, warehouse, sales and purchases.

---

## Core ERP Modules

The ERP consists of the following modules:

### Core

- companies
- users
- authentication
- onboarding

### Master data

- clients
- products
- employees
- chart-of-accounts
- vat-rates
- operation-types

### Business documents

- purchases
- sales

### Warehouse

- warehouses
- warehouse movements
- warehouse balance

### Accounting

- journal entries
- reposting
- FIFO inventory accounting
- accounting periods
- balance sheet
- profit and loss
- trial balance

---

## Multi-tenant Architecture

Solar ERP is a **multi-tenant system**.

### Tenant Model


Tenant = Company


Rules:

- Every business entity must contain `tenantId`
- All database queries must filter by `tenantId`
- Users can only access data of their tenant

Example:


users → belong to tenant
clients → belong to tenant
products → belong to tenant
documents → belong to tenant
journal entries → belong to tenant


All Prisma queries must include tenant filtering.

---

## Project Structure

### System Architecture Flow

Solar ERP follows this architecture pipeline:

React UI
↓
Next.js Route Handlers (API)
↓
Business Services (lib/)
↓
Prisma ORM
↓
PostgreSQL

Rules:

- UI must never access database directly
- API routes must remain thin controllers
- Business logic must live inside `lib/`
- Database access must happen only through Prisma

### Frontend

Next.js App Router is used.

Frontend pages:


app/


Important route groups:


(auth) → authentication pages
(dashboard) → ERP application UI


Company-scoped pages:


/company/[companyId]/


Example modules:


clients
products
sales
purchases
warehouse
reports


UI components are located in:


components/

### Backend

API endpoints are implemented using **Next.js Route Handlers**.

Location:


app/api/


Important structure:


/api/company/[companyId]/*


Example APIs:


clients
products
purchases
sales
warehouse
reports
accounts

---

## Business Logic Layer

All business logic must live inside:


lib/


Important services:


lib/accounting
lib/auth
lib/company
lib/onboarding
lib/services


Examples:


fifoService
journalService
repostingService
stockService
periodLock
documentNumberService


Rules:

- No business logic inside React components
- API routes should call services from `lib/`
- Accounting logic must stay inside `lib/accounting`

---

## Database

Database schema is defined using:


prisma/schema.prisma


Migrations are located in:


prisma/migrations


Rules:

- Prisma models must enforce tenant isolation
- Relations must respect tenant boundaries
- Use Decimal for monetary values

---

## Accounting Engine

Solar ERP contains a built-in accounting engine.

Core components:


journalService
fifoService
repostingService
periodLock


Accounting features:

- FIFO inventory valuation
- automatic journal entries
- reposting of documents
- accounting periods locking
- balance sheet
- profit & loss
- trial balance

Accounting logic must never be implemented in UI.

---

## Document Lifecycle

Business documents follow lifecycle stages.

Example purchase lifecycle:

draft
→ posted
→ accounting entry
→ warehouse movement

Responsible services:

- journalService
- stockService
- fifoService
- repostingService

---

## UI Architecture

Reusable UI components:


components/ui


ERP components:


components/erp


Domain components:


components/clients
components/products
components/purchases


Tables configuration:


config/


Example:


config/purchases/columns.tsx


---

## Code Guidelines

When generating code follow these rules:

1. Always enforce tenant isolation
2. Use Prisma ORM for database operations
3. Place business logic inside `lib/`
4. Avoid logic in React UI components
5. Follow ERP module separation
6. Accounting logic must use existing accounting services
7. API routes should remain thin controllers