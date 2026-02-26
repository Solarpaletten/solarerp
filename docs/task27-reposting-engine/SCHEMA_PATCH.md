# Task 27: Schema Patch — Reposting Engine

## 1. Add JournalSource enum (before JournalEntry model):

```prisma
enum JournalSource {
  SYSTEM
  MANUAL
}
```

## 2. Update JournalEntry model — add `source` field:

```prisma
model JournalEntry {
  id           String        @id @default(cuid())
  companyId    String
  date         DateTime
  documentType String
  documentId   String?
  source       JournalSource @default(SYSTEM)   // NEW — Task 27
  createdAt    DateTime      @default(now())

  lines   JournalLine[]
  company Company       @relation(fields: [companyId], references: [id], onDelete: Cascade)

  @@index([companyId])
  @@index([date])
  @@index([documentType])
  @@index([documentId])
  @@index([companyId, date])     // NEW — Task 27
  @@index([companyId, source])   // NEW — Task 27
  @@map("journal_entries")
}
```

## 3. Update SaleDocument model — add account mapping:

After `comments String?` add:

```prisma
  debitAccountId  String?   // NEW — Task 27 (posting profile)
  creditAccountId String?   // NEW — Task 27 (posting profile)
```

## 4. Update PurchaseDocument model — add account mapping:

After `status String?` add:

```prisma
  debitAccountId  String?   // NEW — Task 27 (posting profile)
  creditAccountId String?   // NEW — Task 27 (posting profile)
```

## 5. Update sales/purchases POST routes:

In `app/api/company/[companyId]/sales/route.ts`, inside the transaction after creating the sale document, add:

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

Same pattern for purchases route.

## 6. Apply:

```bash
npx prisma migrate dev --name reposting_engine
npx prisma generate

# Run backfill for existing documents
psql $DATABASE_URL < prisma/migrations/reposting_engine/backfill.sql
```
