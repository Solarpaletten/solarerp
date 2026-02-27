# Task 27.2: Hardening Pack — Exact Patches

---

## 1) Sales POST — P0: fix dangling update block + persist mapping inside tx

**File:** `app/api/company/[companyId]/sales/route.ts`

### DELETE the dangling block between JSDoc and `export async function POST`:

Remove these lines that sit OUTSIDE any function:
```ts
// Task 27: Persist account mapping for reposting
await tx.saleDocument.update({
  where: { id: sale.id },
  data: {
    debitAccountId: journal.debitAccountId,
    creditAccountId: journal.creditAccountId,
  },
});
```

### ADD inside the transaction, AFTER `const entry = await createJournalEntry(tx, ...)`:

```ts
      // Task 27: Persist account mapping for reposting
      await tx.saleDocument.update({
        where: { id: sale.id },
        data: {
          debitAccountId: journal.debitAccountId,
          creditAccountId: journal.creditAccountId,
        },
      });
```

### FIX auth in GET catch:

Replace:
```ts
    if (error instanceof Response) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
```
With:
```ts
    if (error instanceof Response) return error;
```

### FIX auth in POST catch (same pattern):

Replace:
```ts
    if (error instanceof Response) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
```
With:
```ts
    if (error instanceof Response) return error;
```

---

## 2) Purchases POST — P0: fix copy-paste bug + persist mapping

**File:** `app/api/company/[companyId]/purchases/route.ts`

### REPLACE the wrong block (inside transaction, after purchase create):

Find:
```ts
      // Task 27: Persist account mapping for reposting
      await tx.saleDocument.update({
        where: { id: sale.id },
        data: {
          debitAccountId: journal.debitAccountId,
          creditAccountId: journal.creditAccountId,
        },
      });
```

Replace with:
```ts
      // Task 27: Persist account mapping for reposting
      await tx.purchaseDocument.update({
        where: { id: purchase.id },
        data: {
          debitAccountId: journal.debitAccountId,
          creditAccountId: journal.creditAccountId,
        },
      });
```

### FIX auth in GET catch:

Replace:
```ts
    if (error instanceof Response) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
```
With:
```ts
    if (error instanceof Response) return error;
```

### FIX auth in POST catch (same):

Replace:
```ts
    if (error instanceof Response) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
```
With:
```ts
    if (error instanceof Response) return error;
```

---

## 3) Sales cancel — add JOURNAL_LINES_EMPTY guard

**File:** `app/api/company/[companyId]/sales/[saleId]/cancel/route.ts`

### ADD after `if (!originalEntry)` check, BEFORE creating reversed lines:

```ts
      if (!originalEntry.lines?.length) {
        throw new Error('JOURNAL_LINES_EMPTY');
      }
```

### ADD in catch block, after JOURNAL_ENTRY_NOT_FOUND handler:

```ts
    if (message === 'JOURNAL_LINES_EMPTY') {
      return NextResponse.json(
        { error: 'Original journal entry has no lines. Cannot create reversal.' },
        { status: 500 }
      );
    }
```

Note: auth handler already correct (`return error`) per project knowledge.

---

## 4) Purchases cancel — already correct

Per project knowledge, `purchases/[purchaseId]/cancel/route.ts` already has:
- ✅ `date: purchase.purchaseDate` (not `new Date()`)
- ✅ JOURNAL_LINES_EMPTY guard
- ✅ `return error` for auth
- ✅ All error handlers

No changes needed.

---

## Summary of changes

| File | Fix | Severity |
|------|-----|----------|
| sales/route.ts | Remove dangling update, add inside tx, auth fix | 🔴 P0 |
| purchases/route.ts | Fix copy-paste `saleDocument` → `purchaseDocument`, auth fix | 🔴 P0 |
| sales/cancel/route.ts | Add JOURNAL_LINES_EMPTY guard + handler | 🟡 P2 |
| purchases/cancel/route.ts | No changes needed | ✅ OK |
