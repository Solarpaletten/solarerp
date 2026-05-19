-- ═══════════════════════════════════════════════════════════════════════════
-- TASK 68B.2 — Financial Snapshot Persistence
-- Adds frozen totals + journal linkage + postedAt to purchase/sale documents
-- ═══════════════════════════════════════════════════════════════════════════
-- All fields are NULLABLE — backward compatible with existing DRAFT documents.
-- Snapshot is populated only at POSTED transition.
-- ═══════════════════════════════════════════════════════════════════════════

BEGIN;

-- ─── PurchaseDocument ──────────────────────────────────────────────────────
ALTER TABLE "purchase_documents"
  ADD COLUMN IF NOT EXISTS "totalNetAmount"   DECIMAL(18, 4),
  ADD COLUMN IF NOT EXISTS "totalVatAmount"   DECIMAL(18, 4),
  ADD COLUMN IF NOT EXISTS "totalGrossAmount" DECIMAL(18, 4),
  ADD COLUMN IF NOT EXISTS "journalEntryId"   TEXT,
  ADD COLUMN IF NOT EXISTS "postedAt"         TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "purchase_documents_journalEntryId_idx"
  ON "purchase_documents" ("journalEntryId");

-- ─── SaleDocument ──────────────────────────────────────────────────────────
ALTER TABLE "sale_documents"
  ADD COLUMN IF NOT EXISTS "totalNetAmount"   DECIMAL(18, 4),
  ADD COLUMN IF NOT EXISTS "totalVatAmount"   DECIMAL(18, 4),
  ADD COLUMN IF NOT EXISTS "totalGrossAmount" DECIMAL(18, 4),
  ADD COLUMN IF NOT EXISTS "journalEntryId"   TEXT,
  ADD COLUMN IF NOT EXISTS "postedAt"         TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "sale_documents_journalEntryId_idx"
  ON "sale_documents" ("journalEntryId");

COMMIT;

-- ─── Rollback (manual, if ever needed) ─────────────────────────────────────
-- BEGIN;
-- ALTER TABLE "purchase_documents"
--   DROP COLUMN IF EXISTS "totalNetAmount",
--   DROP COLUMN IF EXISTS "totalVatAmount",
--   DROP COLUMN IF EXISTS "totalGrossAmount",
--   DROP COLUMN IF EXISTS "journalEntryId",
--   DROP COLUMN IF EXISTS "postedAt";
-- ALTER TABLE "sale_documents"
--   DROP COLUMN IF EXISTS "totalNetAmount",
--   DROP COLUMN IF EXISTS "totalVatAmount",
--   DROP COLUMN IF EXISTS "totalGrossAmount",
--   DROP COLUMN IF EXISTS "journalEntryId",
--   DROP COLUMN IF EXISTS "postedAt";
-- COMMIT;
