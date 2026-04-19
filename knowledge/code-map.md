# Solar ERP Code Map

This document describes how the Solar ERP codebase is structured.

Solar ERP follows a layered architecture:

modules → services → API → database

---

## Modules (Domain Layer)

Business domains are organized as ERP modules.

Examples:

- clients
- products
- purchases
- sales
- warehouse
- accounting
- reports

Modules define business entities and workflows.

---

## Services (Business Logic Layer)

Business logic lives in:

lib/

Important service groups:

lib/accounting
lib/auth
lib/company
lib/onboarding
lib/services

Examples:

- fifoService
- journalService
- repostingService
- stockService
- periodLock
- documentNumberService

Services implement ERP rules and domain logic.

---

## API Layer

The API layer exposes services to the frontend.

Location:

app/api/

Main pattern:

/api/company/[companyId]/*

Example endpoints:

- clients
- products
- purchases
- sales
- warehouse
- reports

API routes should remain thin controllers.

They call services from lib/.

---

## Database Layer

Database schema is defined using Prisma.

Location:

prisma/schema.prisma

Migrations:

prisma/migrations

Rules:

- every entity contains tenantId
- Prisma enforces relations
- monetary values use Decimal