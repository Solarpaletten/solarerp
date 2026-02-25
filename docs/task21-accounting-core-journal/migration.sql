-- Task 21: Accounting Core — JournalEntry + JournalLine
-- Migration: accounting_core_journal_base
-- 
-- Creates the double-entry bookkeeping ledger foundation.
-- JournalEntry = document header (date, type, ref)
-- JournalLine = debit/credit lines linked to Account
--
-- Ownership chain: Tenant → Company → JournalEntry → JournalLine → Account

-- CreateTable
CREATE TABLE "journal_entries" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "documentType" TEXT NOT NULL,
    "documentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "journal_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "journal_lines" (
    "id" TEXT NOT NULL,
    "entryId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "debit" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "credit" DECIMAL(18,2) NOT NULL DEFAULT 0,

    CONSTRAINT "journal_lines_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "journal_entries_companyId_idx" ON "journal_entries"("companyId");

-- CreateIndex
CREATE INDEX "journal_entries_date_idx" ON "journal_entries"("date");

-- CreateIndex
CREATE INDEX "journal_lines_accountId_idx" ON "journal_lines"("accountId");

-- CreateIndex
CREATE INDEX "journal_lines_entryId_idx" ON "journal_lines"("entryId");

-- AddForeignKey: JournalEntry → Company (CASCADE)
ALTER TABLE "journal_entries" ADD CONSTRAINT "journal_entries_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: JournalLine → JournalEntry (CASCADE)
ALTER TABLE "journal_lines" ADD CONSTRAINT "journal_lines_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "journal_entries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: JournalLine → Account (RESTRICT — cannot delete account with journal lines)
ALTER TABLE "journal_lines" ADD CONSTRAINT "journal_lines_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
