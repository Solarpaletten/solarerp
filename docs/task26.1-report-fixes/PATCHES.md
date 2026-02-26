# Task 26.1: Balance Sheet — Pre-merge Fixes

## Fix 1: UTC date boundary (timezone safety)

**Problem:** `new Date("YYYY-MM-DD")` parses as UTC midnight, but `setHours(23,59,59,999)` applies in server local timezone → can shift the day boundary.

**File:** `app/api/company/[companyId]/reports/balance-sheet/route.ts`

### Replace:
```ts
    // End of day for inclusive range
    const asOfEnd = new Date(asOfDate);
    asOfEnd.setHours(23, 59, 59, 999);
```

### With:
```ts
    // End of day for inclusive range (UTC-safe)
    const asOfEnd = new Date(`${asOfParam}T23:59:59.999Z`);
```

---

## Fix 2: Auth error handling — return original Response

**Problem:** `requireTenant()` throws `new Response('Unauthorized', { status: 401 })`. Current catch creates a new NextResponse.json instead of returning the original. Should return the thrown Response directly.

### Replace:
```ts
    if (error instanceof Response) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
```

### With:
```ts
    if (error instanceof Response) {
      return error;
    }
```

---

## Same fix applies to P&L (Task 25) and OSV (Task 22)

These endpoints have the same 2 patterns. For consistency, apply both fixes to:

1. `app/api/company/[companyId]/reports/pnl/route.ts`
   - Replace `setHours` with UTC string for `toDateEnd`
   - Replace `NextResponse.json({ error: 'Unauthorized' }, { status: 401 })` with `return error`

2. `app/api/company/[companyId]/reports/osv/route.ts`
   - OSV uses optional dates so no setHours issue, but fix auth handler
   - Replace `NextResponse.json({ error: 'Unauthorized' }, { status: 401 })` with `return error`

---

## After these fixes: Task 26 ready to merge.
