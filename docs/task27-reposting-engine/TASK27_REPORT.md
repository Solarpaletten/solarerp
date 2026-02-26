# TASK27_REPORT.md — Reposting Engine (Aggressive Rebuild)

## Scope

- ✅ `JournalSource` enum (SYSTEM / MANUAL)
- ✅ `JournalEntry.source` field (default SYSTEM)
- ✅ `SaleDocument.debitAccountId / creditAccountId`
- ✅ `PurchaseDocument.debitAccountId / creditAccountId`
- ✅ Backfill SQL for existing documents
- ✅ `repostingService.ts` — core rebuild logic (tx-only)
- ✅ `POST /api/company/:id/repost` — endpoint with guards
- ✅ Period lock check before repost
- ✅ MISSING_POSTING_PROFILE → 409
- ✅ MANUAL entries never touched
- ✅ Idempotent
- ✅ No UI

## Files

| File | Type | Lines |
|------|------|-------|
| `prisma/migrations/reposting_engine/migration.sql` | NEW | 17 |
| `prisma/migrations/reposting_engine/backfill.sql` | NEW | 45 |
| `lib/accounting/repostingService.ts` | NEW | 179 |
| `app/api/company/[companyId]/repost/route.ts` | NEW | 143 |
| `SCHEMA_PATCH.md` | DOC | — |

## Apply

```bash
# 1. Unpack
tar -xzf task27-reposting-engine.tar.gz -C .

# 2. Schema changes (see SCHEMA_PATCH.md)
#    - Add JournalSource enum
#    - Add source to JournalEntry
#    - Add debit/creditAccountId to SaleDocument & PurchaseDocument
#    - Add new indexes

# 3. Migrate
npx prisma migrate dev --name reposting_engine
npx prisma generate

# 4. Backfill existing documents
psql $DATABASE_URL < prisma/migrations/reposting_engine/backfill.sql

# 5. Patch sales/purchases POST routes (see SCHEMA_PATCH.md §5)
```

## Repost Flow

```
POST /api/company/:id/repost
  Body: { "from": "2026-01-01", "to": "2026-01-31" }

  ├─ Auth + tenant check
  ├─ Validate dates
  ├─ Check period locks → 409 if any closed month in range
  │
  └─ prisma.$transaction (30s timeout):
       │
       ├─ STEP A: Collect documents in range
       │    Sales: saleDate between from..to (including CANCELLED)
       │    Purchases: purchaseDate between from..to
       │
       ├─ STEP B: Delete SYSTEM entries in range
       │    deleteMany WHERE source=SYSTEM, date in range
       │    JournalLines cascade-delete
       │
       └─ STEP C: Recreate from documents
            For each sale:
              - Validate debitAccountId/creditAccountId exist → else 409
              - createJournalEntry(SALE)
              - if CANCELLED → also createJournalEntry(SALE_REVERSAL)
            For each purchase:
              - Same pattern with PURCHASE / PURCHASE_REVERSAL
```

## Verification (curl)

```bash
# 1. Repost January 2026
curl -X POST http://localhost:3000/api/company/{companyId}/repost \
  -H 'Content-Type: application/json' \
  -H 'Cookie: session=...' \
  -d '{"from": "2026-01-01", "to": "2026-01-31"}'

# Expected response:
# {
#   "range": { "from": "2026-01-01", "to": "2026-01-31" },
#   "deletedEntries": 4,
#   "recreatedEntries": 4,
#   "documentsProcessed": {
#     "sales": 2,
#     "purchases": 1,
#     "cancelledSales": 1,
#     "cancelledPurchases": 0
#   }
# }

# 2. Idempotency — repost again → same result
curl -X POST http://localhost:3000/api/company/{companyId}/repost \
  -H 'Content-Type: application/json' \
  -H 'Cookie: session=...' \
  -d '{"from": "2026-01-01", "to": "2026-01-31"}'

# Same response (idempotent)

# 3. Closed period → 409
# First close January:
curl -X POST http://localhost:3000/api/company/{companyId}/periods/2026/1/close \
  -H 'Cookie: session=...'
# Then repost:
curl -X POST http://localhost:3000/api/company/{companyId}/repost \
  -H 'Content-Type: application/json' \
  -H 'Cookie: session=...' \
  -d '{"from": "2026-01-01", "to": "2026-01-31"}'

# → 409 { "error": "PERIOD_CLOSED: Cannot repost — locked periods: 2026-01" }

# 4. Missing account mapping → 409
# (If a document has NULL debit/creditAccountId)
# → 409 { "error": "MISSING_POSTING_PROFILE: SaleDocument ... missing ..." }
```

## Key Architecture Decisions

| Decision | Rationale |
|----------|-----------|
| SYSTEM vs MANUAL source | Repost only destroys auto-generated entries |
| Account mapping on documents | Without it, rebuild can't know which accounts to use |
| Backfill SQL | One-time migration for existing data |
| Period lock check BEFORE transaction | Fail fast, don't start heavy work if blocked |
| 30s transaction timeout | Large date ranges may process many documents |
| createJournalEntry reuse | Leverages existing validation + period lock (2nd contour) |
