# Task 23.2: Schema Patch — JournalEntry Indexes

## In model JournalEntry — add 2 indexes (after existing @@index([date])):

```prisma
model JournalEntry {
  id           String   @id @default(cuid())
  companyId    String
  date         DateTime
  documentType String
  documentId   String?
  createdAt    DateTime @default(now())

  lines   JournalLine[]
  company Company       @relation(fields: [companyId], references: [id], onDelete: Cascade)

  @@index([companyId])
  @@index([date])
  @@index([documentType])    // NEW — Task 23.2
  @@index([documentId])      // NEW — Task 23.2
  @@map("journal_entries")
}
```

## Migration

```bash
npx prisma migrate dev --name journal_document_indexes
npx prisma generate
```

## Why

Cancel endpoints use:
```ts
tx.journalEntry.findFirst({
  where: { documentId: saleId, documentType: 'SALE' }
})
```

Without indexes → full table scan on journal_entries.
With indexes → B-tree lookup, O(log n).
