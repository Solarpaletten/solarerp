-- Task 28: Manual Journal Entries
-- Add optional description field to journal_entries

ALTER TABLE "journal_entries" ADD COLUMN "description" TEXT;
