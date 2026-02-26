# Task 24 MVP: Endpoint Patches — First Contour Enforcement

Period lock must be checked in TWO contours:
1. **Endpoint level** (before document creation) — first contour
2. **journalService level** (before journal entry) — second contour (already done in journalService.ts)

Below are the exact patches for each endpoint.

---

## PATCH 1: `app/api/company/[companyId]/sales/route.ts`

### Add import (top of file):

```ts
import { assertPeriodOpen } from '@/lib/accounting/periodLock';
```

### Inside POST handler, add period check as FIRST line inside `prisma.$transaction()`:

Find this line inside the transaction:
```ts
const result = await prisma.$transaction(async (tx) => {
```

Add immediately after:
```ts
      // Task 24: First contour — period lock
      await assertPeriodOpen(tx, { companyId, date: new Date(saleDate) });
```

Before `const sale = await tx.saleDocument.create(...)`.

---

## PATCH 2: `app/api/company/[companyId]/purchases/route.ts`

### Add import (top of file):

```ts
import { assertPeriodOpen } from '@/lib/accounting/periodLock';
```

### Inside POST handler, add period check as FIRST line inside `prisma.$transaction()`:

```ts
      // Task 24: First contour — period lock
      await assertPeriodOpen(tx, { companyId, date: new Date(purchaseDate) });
```

Before `const purchase = await tx.purchaseDocument.create(...)`.

---

## PATCH 3: `app/api/company/[companyId]/sales/[saleId]/cancel/route.ts`

### Add import (top of file):

```ts
import { assertPeriodOpen } from '@/lib/accounting/periodLock';
```

### Inside POST handler, add period check after finding the sale document, BEFORE creating reversal:

After `if (sale.status === 'CANCELLED')` check, add:

```ts
      // Task 24: First contour — period lock (check against document date)
      await assertPeriodOpen(tx, { companyId, date: sale.saleDate });
```

Before `const originalEntry = await tx.journalEntry.findFirst(...)`.

---

## PATCH 4: `app/api/company/[companyId]/purchases/[purchaseId]/cancel/route.ts`

### Add import (top of file):

```ts
import { assertPeriodOpen } from '@/lib/accounting/periodLock';
```

### Inside POST handler, add period check after finding the purchase document:

After `if (purchase.status === 'CANCELLED')` check, add:

```ts
      // Task 24: First contour — period lock (check against document date)
      await assertPeriodOpen(tx, { companyId, date: purchase.purchaseDate });
```

Before `const originalEntry = await tx.journalEntry.findFirst(...)`.

---

## Why two contours?

First contour (endpoint) catches PERIOD_CLOSED **before** document creation.
→ Better error: no orphan document created then rolled back.

Second contour (journalService) catches any **direct** journalService call.
→ Defense in depth: even if someone bypasses endpoint logic, journal is protected.

Both throw `PERIOD_CLOSED` → transaction rollback → nothing written.
