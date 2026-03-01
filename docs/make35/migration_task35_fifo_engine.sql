-- Task 35: Industrial FIFO Engine — StockLot + StockAllocation
-- Gate 1: Database Layer

-- ============================================
-- TABLE: stock_lots (FIFO partitions)
-- ============================================
CREATE TABLE IF NOT EXISTS "stock_lots" (
  "id"                  TEXT NOT NULL DEFAULT gen_random_uuid()::TEXT,
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

  CONSTRAINT "stock_lots_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "stock_lots_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE
);

-- FIFO ordering index (critical for SELECT ... ORDER BY purchaseDate, id)
CREATE INDEX IF NOT EXISTS "stock_lots_fifo_idx"
  ON "stock_lots" ("companyId", "warehouseName", "itemCode", "purchaseDate", "id");

-- Lookup by source document (for cancel purchase check)
CREATE INDEX IF NOT EXISTS "stock_lots_source_idx"
  ON "stock_lots" ("companyId", "sourceDocumentId");

-- General
CREATE INDEX IF NOT EXISTS "stock_lots_companyId_idx"
  ON "stock_lots" ("companyId");

-- ============================================
-- TABLE: stock_allocations (FIFO consumption)
-- ============================================
CREATE TABLE IF NOT EXISTS "stock_allocations" (
  "id"            TEXT NOT NULL DEFAULT gen_random_uuid()::TEXT,
  "companyId"     TEXT NOT NULL,
  "documentType"  TEXT NOT NULL,
  "documentId"    TEXT NOT NULL,
  "saleItemId"    TEXT,
  "lotId"         TEXT NOT NULL,
  "qty"           DECIMAL(18,4) NOT NULL,
  "unitCost"      DECIMAL(18,2) NOT NULL,
  "amount"        DECIMAL(18,2) NOT NULL,
  "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "stock_allocations_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "stock_allocations_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE,
  CONSTRAINT "stock_allocations_lotId_fkey" FOREIGN KEY ("lotId") REFERENCES "stock_lots"("id") ON DELETE RESTRICT
);

-- Find allocations by document (for cancel sale)
CREATE INDEX IF NOT EXISTS "stock_allocations_doc_idx"
  ON "stock_allocations" ("companyId", "documentType", "documentId");

-- Find allocations by lot (for audit)
CREATE INDEX IF NOT EXISTS "stock_allocations_lot_idx"
  ON "stock_allocations" ("companyId", "lotId");

CREATE INDEX IF NOT EXISTS "stock_allocations_companyId_idx"
  ON "stock_allocations" ("companyId");
