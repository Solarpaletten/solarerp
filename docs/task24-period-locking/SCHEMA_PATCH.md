# Task 24: Schema Patch — Period Locking

## 1. Add AccountingPeriod model (after JournalLine model):

```prisma
// ============================================
// ACCOUNTING: PERIOD LOCKING
// ============================================

model AccountingPeriod {
  id        String    @id @default(cuid())
  companyId String
  year      Int
  month     Int
  isClosed  Boolean   @default(false)
  closedAt  DateTime?
  closedBy  String?
  createdAt DateTime  @default(now())

  company Company @relation(fields: [companyId], references: [id], onDelete: Cascade)

  @@unique([companyId, year, month])
  @@index([companyId])
  @@map("accounting_periods")
}
```

## 2. Add relation to Company model:

In the Company model relations block, add:

```prisma
  accountingPeriods AccountingPeriod[]
```

After `journalEntries JournalEntry[]` line.

## 3. Apply migration:

```bash
npx prisma migrate dev --name accounting_periods
npx prisma generate
```

## Architecture

Period check is enforced at the **journalService** level:
- `createJournalEntry()` now calls `assertPeriodOpen()` BEFORE creating any entry
- This automatically protects ALL flows that create journal entries:
  - POST /sales (creates SALE journal entry)
  - POST /purchases (creates PURCHASE journal entry)
  - POST /sales/:id/cancel (creates SALE_REVERSAL journal entry)
  - POST /purchases/:id/cancel (creates PURCHASE_REVERSAL journal entry)

**No period record = OPEN** (default behavior, no lock until explicitly closed).

## Enforcement chain:

```
POST /sales → prisma.$transaction() → createJournalEntry() → assertPeriodOpen() → ✅ or ❌ PERIOD_CLOSED
POST /sales/:id/cancel → prisma.$transaction() → createJournalEntry() → assertPeriodOpen() → ✅ or ❌ PERIOD_CLOSED
POST /periods/:year/:month/close → set isClosed=true
POST /periods/:year/:month/open → set isClosed=false (reopen)
GET /periods → list all periods with status
```

## Error responses:

- `PERIOD_CLOSED` → 500 (from journal service, caught by route handler)
- `ALREADY_CLOSED` → 409 (close endpoint)
- `ALREADY_OPEN` → 409 (open endpoint)
- `PERIOD_NOT_FOUND` → 404 (open endpoint)
- Future period close → 400

## Verification:

```bash
# 1. Close January 2025
curl -X POST http://localhost:3000/api/company/{id}/periods/2025/1/close

# 2. Try to create a sale in January 2025 → should fail with PERIOD_CLOSED
curl -X POST http://localhost:3000/api/company/{id}/sales \
  -H 'Content-Type: application/json' \
  -d '{"saleDate": "2025-01-15T00:00:00Z", ...}'

# 3. List periods
curl http://localhost:3000/api/company/{id}/periods

# 4. Reopen January 2025
curl -X POST http://localhost:3000/api/company/{id}/periods/2025/1/open

# 5. Now sale in January 2025 should succeed
```
