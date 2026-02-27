# TASK28_REPORT.md — Manual Journal Entries

## Scope

- ✅ `POST /api/company/:id/journal/manual`
- ✅ `source = MANUAL`, `documentType = 'MANUAL'`, `documentId = null`
- ✅ `JournalEntry.description` field (optional, for manual entries)
- ✅ Period lock enforced (both contours)
- ✅ Double-entry validation via `createJournalEntry()`
- ✅ Account existence validated (tenant-scoped)
- ✅ Repost engine ignores MANUAL entries (already implemented)
- ✅ Tenant isolation
- ✅ No UI

## Files

| File | Type | Lines |
|------|------|-------|
| `app/api/company/[companyId]/journal/manual/route.ts` | NEW | 178 |
| `prisma/migrations/manual_journal_entries/migration.sql` | NEW | 4 |
| `SCHEMA_PATCH.md` | DOC | — |

## Architecture

```
POST /journal/manual
  Body: { date, description?, lines[] }

  ├─ Auth + tenant check
  ├─ Validate date
  ├─ Validate lines (min 2, accountId required, debit/credit numbers)
  ├─ Validate accounts exist (tenant-scoped)
  │
  └─ prisma.$transaction:
       ├─ assertPeriodOpen (1st contour)
       ├─ createJournalEntry (validates balance + 2nd contour period lock)
       │    → documentType: 'MANUAL'
       │    → documentId: null
       │    → source: defaults to SYSTEM initially
       ├─ Update: set source=MANUAL, description
       └─ Return entry with lines
```

### Why source is set after createJournalEntry:

`createJournalEntry()` creates with default `source=SYSTEM`. We immediately update to `MANUAL` + set `description` in the same transaction. This avoids modifying the shared `journalService` signature for an edge case.

### Repost safety:

Repost engine (`repostingService.ts`) does:
```ts
await tx.journalEntry.deleteMany({
  where: { companyId, source: 'SYSTEM', ... }
});
```
MANUAL entries have `source=MANUAL` → never deleted by repost. ✅

## Apply

```bash
tar -xzf task28-manual-journal.tar.gz -C .

# 1. Update schema.prisma (see SCHEMA_PATCH.md)
# 2. npx prisma migrate dev --name manual_journal_entries
# 3. npx prisma generate
```

## Verification (curl)

```bash
# 1. Create manual entry — 201
curl -X POST http://localhost:3000/api/company/{companyId}/journal/manual \
  -H 'Content-Type: application/json' \
  -H 'Cookie: session=...' \
  -d '{
    "date": "2026-02-15",
    "description": "Year-end depreciation",
    "lines": [
      { "accountId": "{expenseAccId}", "debit": 500, "credit": 0 },
      { "accountId": "{assetAccId}", "debit": 0, "credit": 500 }
    ]
  }'

# Expected: 201
# {
#   "data": {
#     "id": "...",
#     "date": "2026-02-15T...",
#     "documentType": "MANUAL",
#     "source": "MANUAL",
#     "description": "Year-end depreciation",
#     "lines": [...]
#   }
# }

# 2. Unbalanced entry — 400
curl -X POST http://localhost:3000/api/company/{companyId}/journal/manual \
  -H 'Content-Type: application/json' \
  -H 'Cookie: session=...' \
  -d '{
    "date": "2026-02-15",
    "lines": [
      { "accountId": "{id1}", "debit": 500, "credit": 0 },
      { "accountId": "{id2}", "debit": 0, "credit": 300 }
    ]
  }'

# Expected: 400 { "error": "Journal entry is unbalanced: debit=500.00, credit=300.00" }

# 3. Closed period — 409
curl -X POST http://localhost:3000/api/company/{companyId}/periods/2025/1/close \
  -H 'Cookie: session=...'

curl -X POST http://localhost:3000/api/company/{companyId}/journal/manual \
  -H 'Content-Type: application/json' \
  -H 'Cookie: session=...' \
  -d '{
    "date": "2025-01-15",
    "lines": [
      { "accountId": "{id1}", "debit": 100, "credit": 0 },
      { "accountId": "{id2}", "debit": 0, "credit": 100 }
    ]
  }'

# Expected: 409 { "error": "Accounting period is closed for this date" }

# 4. Invalid account — 400
curl -X POST http://localhost:3000/api/company/{companyId}/journal/manual \
  -H 'Content-Type: application/json' \
  -H 'Cookie: session=...' \
  -d '{
    "date": "2026-02-15",
    "lines": [
      { "accountId": "nonexistent", "debit": 100, "credit": 0 },
      { "accountId": "{id2}", "debit": 0, "credit": 100 }
    ]
  }'

# Expected: 400 { "error": "Account(s) not found: nonexistent" }

# 5. Single line — 400
curl -X POST http://localhost:3000/api/company/{companyId}/journal/manual \
  -H 'Content-Type: application/json' \
  -H 'Cookie: session=...' \
  -d '{
    "date": "2026-02-15",
    "lines": [
      { "accountId": "{id1}", "debit": 100, "credit": 0 }
    ]
  }'

# Expected: 400 { "error": "At least 2 journal lines are required" }

# 6. Repost does NOT destroy manual entry
curl -X POST http://localhost:3000/api/company/{companyId}/repost \
  -H 'Content-Type: application/json' \
  -H 'Cookie: session=...' \
  -d '{"from": "2026-02-01", "to": "2026-02-28"}'

# After repost: manual entry still in ledger
# SELECT * FROM journal_entries WHERE source='MANUAL' AND "companyId"='...'
# → entry still exists
```

## DoD Checklist

| # | Check | Status |
|---|-------|--------|
| 1 | Unbalanced → 400 | ✅ |
| 2 | Closed period → 409 | ✅ |
| 3 | Success → 201 | ✅ |
| 4 | Repost ignores MANUAL | ✅ |
| 5 | Invalid account → 400 | ✅ |
| 6 | Tenant isolation | ✅ |
| 7 | description field stored | ✅ |
