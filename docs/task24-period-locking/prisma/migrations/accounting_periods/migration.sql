-- Task 24: Period Locking — AccountingPeriod table
-- Prevents journal entries in closed accounting periods

-- CreateTable
CREATE TABLE "accounting_periods" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "isClosed" BOOLEAN NOT NULL DEFAULT false,
    "closedAt" TIMESTAMP(3),
    "closedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "accounting_periods_pkey" PRIMARY KEY ("id")
);

-- CreateIndex (unique: one period per company per month)
CREATE UNIQUE INDEX "accounting_periods_companyId_year_month_key" ON "accounting_periods"("companyId", "year", "month");

-- CreateIndex
CREATE INDEX "accounting_periods_companyId_idx" ON "accounting_periods"("companyId");

-- AddForeignKey
ALTER TABLE "accounting_periods" ADD CONSTRAINT "accounting_periods_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
