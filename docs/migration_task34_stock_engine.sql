-- Task 34: StockMovements Engine
-- Extend existing stock_movements table with direction tracking
-- NO new tables — reuse existing model

-- Step 1: Add direction column (IN | OUT)
ALTER TABLE "stock_movements" ADD COLUMN IF NOT EXISTS "direction" TEXT NOT NULL DEFAULT 'IN';

-- Step 2: Add documentType column (PURCHASE | SALE | ADJUSTMENT | PURCHASE_REVERSAL | SALE_REVERSAL)
ALTER TABLE "stock_movements" ADD COLUMN IF NOT EXISTS "documentType" TEXT NOT NULL DEFAULT 'PURCHASE';

-- Step 3: Add documentId column (links to PurchaseDocument.id or SaleDocument.id)
ALTER TABLE "stock_movements" ADD COLUMN IF NOT EXISTS "documentId" TEXT;

-- Step 4: Add index for aggregation queries
CREATE INDEX IF NOT EXISTS "stock_movements_warehouseName_idx" ON "stock_movements"("warehouseName");
CREATE INDEX IF NOT EXISTS "stock_movements_itemCode_idx" ON "stock_movements"("itemCode");
CREATE INDEX IF NOT EXISTS "stock_movements_direction_idx" ON "stock_movements"("direction");
CREATE INDEX IF NOT EXISTS "stock_movements_documentId_idx" ON "stock_movements"("documentId");

-- Step 5: Remove defaults (clean schema)
ALTER TABLE "stock_movements" ALTER COLUMN "direction" DROP DEFAULT;
ALTER TABLE "stock_movements" ALTER COLUMN "documentType" DROP DEFAULT;
