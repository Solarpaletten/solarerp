# Task 21: Schema Patch Instructions

## 1. In model Company — add relation (after `accounts Account[]`):

```prisma
  journalEntries JournalEntry[]
```

## 2. In model Account — add relation (after `company Company ...`):

```prisma
  journalLines  JournalLine[]
```

## 3. Add new models BEFORE the ERP MODULE: CLIENTS section:

```prisma
// ============================================
// ACCOUNTING CORE: JOURNAL (LEDGER)
// ============================================

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
  @@map("journal_entries")
}

model JournalLine {
  id        String  @id @default(cuid())
  entryId   String
  accountId String
  debit     Decimal @default(0) @db.Decimal(18, 2)
  credit    Decimal @default(0) @db.Decimal(18, 2)

  entry   JournalEntry @relation(fields: [entryId], references: [id], onDelete: Cascade)
  account Account      @relation(fields: [accountId], references: [id])

  @@index([accountId])
  @@index([entryId])
  @@map("journal_lines")
}
```
