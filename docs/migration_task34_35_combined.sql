-- ============================================
-- Task 34 + 35: Combined Migration
-- ============================================
-- Fix: stock_movements has 1 row without direction/documentType
-- Then: create stock_lots + stock_allocations for FIFO

-- ─── STEP 1: Task 34 — Fix stock_movements ──────
-- Add columns with defaults first (safe for existing rows)
ALTER TABLE "stock_movements" ADD COLUMN IF NOT EXISTS "direction" TEXT;
ALTER TABLE "stock_movements" ADD COLUMN IF NOT EXISTS "documentType" TEXT;
ALTER TABLE "stock_movements" ADD COLUMN IF NOT EXISTS "documentId" TEXT;

-- Backfill existing rows with sensible defaults
UPDATE "stock_movements" SET "direction" = 'IN' WHERE "direction" IS NULL;
UPDATE "stock_movements" SET "documentType" = 'PURCHASE' WHERE "documentType" IS NULL;

-- Now make NOT NULL (safe — all rows have values)
ALTER TABLE "stock_movements" ALTER COLUMN "direction" SET NOT NULL;
ALTER TABLE "stock_movements" ALTER COLUMN "documentType" SET NOT NULL;

-- Indexes for Task 34
CREATE INDEX IF NOT EXISTS "stock_movements_warehouseName_idx" ON "stock_movements"("warehouseName");
CREATE INDEX IF NOT EXISTS "stock_movements_itemCode_idx" ON "stock_movements"("itemCode");
CREATE INDEX IF NOT EXISTS "stock_movements_direction_idx" ON "stock_movements"("direction");
CREATE INDEX IF NOT EXISTS "stock_movements_documentId_idx" ON "stock_movements"("documentId");

-- ─── STEP 2: Task 35 — FIFO tables ──────────────
CREATE TABLE IF NOT EXISTS "stock_lots" (
  "id"                  TEXT NOT NULL,
  "companyId"           TEXT NOT NULL,
  "warehouseName"       TEXT NOT NULL,
  "itemCode"            TEXT NOT NULL,
  "itemName"            TEXT NOT NULL,
  "sourceDocumentType"  TEXT NOT NULL DEFAULT 'PURCHASE',
  "sourceDocumentId"    TEXT NOT NULL,
  "purchaseDate"        TIMESTAMP(3) NOT NULL,
  "unitCost"            DECIMAL(18,2) NOT NULL,
  "qtyInitial"          DECIMAL(18,4) NOT NULL,
  "qtyRemaining"        DECIMAL(18,4) NOT NULL,
  "currencyCode"        TEXT NOT NULL DEFAULT 'EUR',
  "createdAt"           TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"           TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "stock_lots_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "stock_allocations" (
  "id"            TEXT NOT NULL,
  "companyId"     TEXT NOT NULL,
  "documentType"  TEXT NOT NULL,
  "documentId"    TEXT NOT NULL,
  "saleItemId"    TEXT,
  "lotId"         TEXT NOT NULL,
  "qty"           DECIMAL(18,4) NOT NULL,
  "unitCost"      DECIMAL(18,2) NOT NULL,
  "amount"        DECIMAL(18,2) NOT NULL,
  "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "stock_allocations_pkey" PRIMARY KEY ("id")
);

-- Foreign keys
ALTER TABLE "stock_lots" ADD CONSTRAINT "stock_lots_companyId_fkey"
  FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "stock_allocations" ADD CONSTRAINT "stock_allocations_companyId_fkey"
  FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "stock_allocations" ADD CONSTRAINT "stock_allocations_lotId_fkey"
  FOREIGN KEY ("lotId") REFERENCES "stock_lots"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Indexes for FIFO
CREATE INDEX IF NOT EXISTS "stock_lots_fifo_idx"
  ON "stock_lots" ("companyId", "warehouseName", "itemCode", "purchaseDate", "id");
CREATE INDEX IF NOT EXISTS "stock_lots_source_idx"
  ON "stock_lots" ("companyId", "sourceDocumentId");
CREATE INDEX IF NOT EXISTS "stock_lots_companyId_idx"
  ON "stock_lots" ("companyId");

CREATE INDEX IF NOT EXISTS "stock_allocations_doc_idx"
  ON "stock_allocations" ("companyId", "documentType", "documentId");
CREATE INDEX IF NOT EXISTS "stock_allocations_lot_idx"
  ON "stock_allocations" ("companyId", "lotId");
CREATE INDEX IF NOT EXISTS "stock_allocations_companyId_idx"
  ON "stock_allocations" ("companyId");
