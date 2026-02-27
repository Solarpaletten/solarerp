# TASK27.2_REPORT.md — Hardening Pack

## Fixes Applied

| # | Fix | Severity | File |
|---|-----|----------|------|
| 1 | Sales POST: dangling update → inside tx | 🔴 P0 | sales/route.ts |
| 2 | Purchases POST: `saleDocument` → `purchaseDocument` | 🔴 P0 | purchases/route.ts |
| 3 | Sales cancel: JOURNAL_LINES_EMPTY guard | 🟡 P2 | sales/cancel/route.ts |
| 4 | Auth alignment: `return error` in sales/purchases | 🟠 P1 | sales/route.ts, purchases/route.ts |
| 5 | Purchases cancel: already correct | ✅ | — |

## Apply

```bash
# Apply patches per PATCHES.md instructions
# All changes are str-replace style — find exact block, replace
```

## Acceptance Smoke Tests

### Test 1: PERIOD_CLOSED blocks repost

```bash
# Close Feb 2025
curl -X POST http://localhost:3000/api/company/{id}/periods/2025/2/close \
  -H 'Cookie: session=...'

# Repost range that includes Feb 2025 → 409
curl -X POST http://localhost:3000/api/company/{id}/repost \
  -H 'Content-Type: application/json' \
  -H 'Cookie: session=...' \
  -d '{"from": "2025-01-01", "to": "2025-12-31"}'

# Expected: 409 { "error": "PERIOD_CLOSED: Cannot repost — locked periods: 2025-02" }
```

### Test 2: Open range repost → 200

```bash
# Repost a range with no closed periods
curl -X POST http://localhost:3000/api/company/{id}/repost \
  -H 'Content-Type: application/json' \
  -H 'Cookie: session=...' \
  -d '{"from": "2026-01-01", "to": "2026-01-31"}'

# Expected: 200
# {
#   "range": { "from": "2026-01-01", "to": "2026-01-31" },
#   "deletedEntries": N,
#   "recreatedEntries": N,
#   "documentsProcessed": { ... }
# }
# deletedEntries === recreatedEntries (no MANUAL entries in range)
```

### Test 3: Idempotency

```bash
# Same request again → same counts
curl -X POST http://localhost:3000/api/company/{id}/repost \
  -H 'Content-Type: application/json' \
  -H 'Cookie: session=...' \
  -d '{"from": "2026-01-01", "to": "2026-01-31"}'

# Expected: identical response
```

### Test 4: Determinism — CANCELLED storno date

```bash
# Create a sale, cancel it, then repost
# After repost: SALE_REVERSAL.date === SALE.date === saleDate
# NOT today's date

# Verify via OSV or direct DB query:
# SELECT date, "documentType" FROM journal_entries
# WHERE "documentId" = '{saleId}'
# Both SALE and SALE_REVERSAL should have same date
```

### Test 5: Account mapping persisted

```bash
# Create a new sale with journal accounts
curl -X POST http://localhost:3000/api/company/{id}/sales \
  -H 'Content-Type: application/json' \
  -H 'Cookie: session=...' \
  -d '{
    "saleDate": "2026-02-01",
    "series": "T", "number": "0001",
    "clientName": "Test", "warehouseName": "Main",
    "operationType": "SALE", "currencyCode": "EUR",
    "items": [{"itemName": "Test", "quantity": 1, "priceWithoutVat": 100}],
    "journal": {"debitAccountId": "{arId}", "creditAccountId": "{revId}"}
  }'

# Verify document has debitAccountId/creditAccountId:
# SELECT "debitAccountId", "creditAccountId"
# FROM sale_documents WHERE series='T' AND number='0001'
# Both should be non-NULL
```

## DoD Checklist

| # | Check | Status |
|---|-------|--------|
| 1 | Sales POST persists debit/creditAccountId inside tx | ✅ |
| 2 | No `saleDocument` references in purchases route | ✅ |
| 3 | Sales cancel: JOURNAL_LINES_EMPTY guard | ✅ |
| 4 | Auth: `return error` in sales/purchases routes | ✅ |
| 5 | 3 smoke tests documented | ✅ |
