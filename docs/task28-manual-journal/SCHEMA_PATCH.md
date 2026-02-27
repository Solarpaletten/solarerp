# Task 28: Schema Patch — Manual Journal Entries

## 1. Update JournalEntry model — add `description` field:

```prisma
model JournalEntry {
  id           String        @id @default(cuid())
  companyId    String
  date         DateTime
  documentType String
  documentId   String?
  source       JournalSource @default(SYSTEM)
  description  String?       // NEW — Task 28 (manual entry description)
  createdAt    DateTime      @default(now())

  lines   JournalLine[]
  company Company       @relation(fields: [companyId], references: [id], onDelete: Cascade)

  @@index([companyId])
  @@index([date])
  @@index([documentType])
  @@index([documentId])
  @@index([companyId, date])
  @@index([companyId, source])
  @@map("journal_entries")
}
```

## 2. Apply:

```bash
# Update schema.prisma first, then:
npx prisma migrate dev --name manual_journal_entries
npx prisma generate
```

No backfill needed — field is nullable, existing entries get NULL.
