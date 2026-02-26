# Task 24 MVP: Schema Patch

## 1. Add AccountingPeriod model (after JournalLine):

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
  createdAt DateTime  @default(now())

  company Company @relation(fields: [companyId], references: [id], onDelete: Cascade)

  @@unique([companyId, year, month])
  @@index([companyId])
  @@map("accounting_periods")
}
```

## 2. Add relation to Company model:

After `journalEntries JournalEntry[]` add:

```prisma
  accountingPeriods AccountingPeriod[]
```

## 3. Apply:

```bash
npx prisma migrate dev --name accounting_periods
npx prisma generate
```
