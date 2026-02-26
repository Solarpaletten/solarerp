-- Task 27: Reposting Engine — Schema changes
-- 1) JournalEntry.source (SYSTEM/MANUAL)
-- 2) Account mapping on SaleDocument/PurchaseDocument
-- 3) New indexes

-- CreateEnum
CREATE TYPE "JournalSource" AS ENUM ('SYSTEM', 'MANUAL');

-- Add source to journal_entries (default SYSTEM for all existing)
ALTER TABLE "journal_entries" ADD COLUMN "source" "JournalSource" NOT NULL DEFAULT 'SYSTEM';

-- Add account mapping to sale_documents
ALTER TABLE "sale_documents" ADD COLUMN "debitAccountId" TEXT;
ALTER TABLE "sale_documents" ADD COLUMN "creditAccountId" TEXT;

-- Add account mapping to purchase_documents
ALTER TABLE "purchase_documents" ADD COLUMN "debitAccountId" TEXT;
ALTER TABLE "purchase_documents" ADD COLUMN "creditAccountId" TEXT;

-- New indexes for reposting queries
CREATE INDEX "journal_entries_companyId_date_idx" ON "journal_entries"("companyId", "date");
CREATE INDEX "journal_entries_companyId_source_idx" ON "journal_entries"("companyId", "source");
