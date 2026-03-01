-- Task 32: Bilingual Account Model
-- Rename name → nameDe, add nameEn

-- Step 1: Rename name to nameDe
ALTER TABLE "accounts" RENAME COLUMN "name" TO "nameDe";

-- Step 2: Add nameEn column (initially copy from nameDe)
ALTER TABLE "accounts" ADD COLUMN "nameEn" TEXT NOT NULL DEFAULT '';

-- Step 3: Backfill nameEn from nameDe for existing rows
UPDATE "accounts" SET "nameEn" = "nameDe" WHERE "nameEn" = '';

-- Step 4: Remove default (clean schema)
ALTER TABLE "accounts" ALTER COLUMN "nameEn" DROP DEFAULT;
