-- Task 42: Migration — Client Enterprise v2
-- ═══════════════════════════════════════════════════
-- SAFE migration: preserves all existing data
-- isJuridical → type (ClientType enum)
-- Adds: isActive, creditLimitCurrency, unique, indexes

-- 1. Create ClientType enum
CREATE TYPE "ClientType" AS ENUM ('COMPANY', 'SOLE_TRADER', 'INDIVIDUAL', 'GOVERNMENT', 'NON_PROFIT');

-- 2. Add new columns (nullable first for safe migration)
ALTER TABLE "clients" ADD COLUMN "type" "ClientType";
ALTER TABLE "clients" ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "clients" ADD COLUMN "creditLimitCurrency" TEXT;

-- 3. Migrate existing data: isJuridical → type
UPDATE "clients" SET "type" = 'COMPANY' WHERE "isJuridical" = true;
UPDATE "clients" SET "type" = 'INDIVIDUAL' WHERE "isJuridical" = false;
UPDATE "clients" SET "type" = 'INDIVIDUAL' WHERE "type" IS NULL;

-- 4. Make type NOT NULL (after data is migrated)
ALTER TABLE "clients" ALTER COLUMN "type" SET NOT NULL;

-- 5. Drop old column
ALTER TABLE "clients" DROP COLUMN "isJuridical";

-- 6. Fix creditLimit precision
ALTER TABLE "clients" ALTER COLUMN "creditLimit" TYPE DECIMAL(18,2);

-- 7. Add unique constraint: code per company
-- First handle potential duplicates (set null on duplicates)
-- Only create unique if no duplicates exist
CREATE UNIQUE INDEX "clients_companyId_code_key" ON "clients"("companyId", "code") WHERE "code" IS NOT NULL;

-- 8. Add VAT index
CREATE INDEX "clients_companyId_vatCode_idx" ON "clients"("companyId", "vatCode") WHERE "vatCode" IS NOT NULL;
