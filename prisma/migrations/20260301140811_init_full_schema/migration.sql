-- CreateEnum
CREATE TYPE "CompanyStatus" AS ENUM ('ACTIVE', 'FROZEN', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "AccountType" AS ENUM ('ASSET', 'LIABILITY', 'EQUITY', 'INCOME', 'EXPENSE');

-- CreateEnum
CREATE TYPE "JournalSource" AS ENUM ('SYSTEM', 'MANUAL');

-- CreateEnum
CREATE TYPE "ClientLocation" AS ENUM ('LOCAL', 'EU', 'FOREIGN');

-- CreateTable
CREATE TABLE "tenants" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "tenantId" TEXT NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "companies" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "vatNumber" TEXT,
    "country" TEXT,
    "status" "CompanyStatus" NOT NULL DEFAULT 'ACTIVE',
    "priority" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "companies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_lots" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "warehouseName" TEXT NOT NULL,
    "itemCode" TEXT NOT NULL,
    "itemName" TEXT NOT NULL,
    "sourceDocumentType" TEXT NOT NULL DEFAULT 'PURCHASE',
    "sourceDocumentId" TEXT NOT NULL,
    "purchaseDate" TIMESTAMP(3) NOT NULL,
    "unitCost" DECIMAL(18,2) NOT NULL,
    "qtyInitial" DECIMAL(18,4) NOT NULL,
    "qtyRemaining" DECIMAL(18,4) NOT NULL,
    "currencyCode" TEXT NOT NULL DEFAULT 'EUR',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stock_lots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_allocations" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "documentType" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "saleItemId" TEXT,
    "lotId" TEXT NOT NULL,
    "qty" DECIMAL(18,4) NOT NULL,
    "unitCost" DECIMAL(18,2) NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stock_allocations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accounts" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "nameDe" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "type" "AccountType" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "journal_entries" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "documentType" TEXT NOT NULL,
    "documentId" TEXT,
    "source" "JournalSource" NOT NULL DEFAULT 'SYSTEM',
    "description" TEXT,
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

-- CreateTable
CREATE TABLE "accounting_periods" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "isClosed" BOOLEAN NOT NULL DEFAULT false,
    "closedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "accounting_periods_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clients" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "shortName" TEXT,
    "code" TEXT,
    "notes" TEXT,
    "isJuridical" BOOLEAN NOT NULL,
    "location" "ClientLocation" NOT NULL,
    "vatCode" TEXT,
    "businessLicenseCode" TEXT,
    "residentTaxCode" TEXT,
    "email" TEXT,
    "phoneNumber" TEXT,
    "faxNumber" TEXT,
    "contactInfo" TEXT,
    "payWithinDays" INTEGER,
    "creditLimit" DECIMAL(65,30),
    "automaticDebtRemind" BOOLEAN NOT NULL DEFAULT false,
    "birthday" TIMESTAMP(3),
    "registrationCountryCode" TEXT,
    "registrationCity" TEXT,
    "registrationAddress" TEXT,
    "registrationZipCode" TEXT,
    "correspondenceCountryCode" TEXT,
    "correspondenceCity" TEXT,
    "correspondenceAddress" TEXT,
    "correspondenceZipCode" TEXT,
    "bankAccount" TEXT,
    "bankName" TEXT,
    "bankCode" TEXT,
    "bankSwiftCode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "items" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "barcode" TEXT,
    "vatRate" DECIMAL(65,30),
    "priceWithoutVat" DECIMAL(65,30),
    "priceWithVat" DECIMAL(65,30),
    "attributeName" TEXT,
    "groupName" TEXT,
    "manufacturer" TEXT,
    "countryOfOrigin" TEXT,
    "unitName" TEXT NOT NULL,
    "purchaseAccountCode" TEXT,
    "saleAccountCode" TEXT,
    "expenseAccountCode" TEXT,
    "minimumQuantity" DECIMAL(65,30),
    "description" TEXT,
    "externalId" TEXT,
    "freePrice" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sale_documents" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "saleDate" TIMESTAMP(3) NOT NULL,
    "payUntil" TIMESTAMP(3),
    "accountingDate" TIMESTAMP(3),
    "lockedAt" TIMESTAMP(3),
    "series" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "clientName" TEXT NOT NULL,
    "clientCode" TEXT,
    "payerName" TEXT,
    "payerCode" TEXT,
    "unloadAddress" TEXT,
    "unloadCity" TEXT,
    "warehouseName" TEXT NOT NULL,
    "operationType" TEXT NOT NULL,
    "currencyCode" TEXT NOT NULL,
    "employeeName" TEXT,
    "status" TEXT,
    "comments" TEXT,
    "debitAccountId" TEXT,
    "creditAccountId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sale_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sale_items" (
    "id" TEXT NOT NULL,
    "saleId" TEXT NOT NULL,
    "itemName" TEXT NOT NULL,
    "itemCode" TEXT,
    "barcode" TEXT,
    "quantity" DECIMAL(65,30) NOT NULL,
    "priceWithoutVat" DECIMAL(65,30) NOT NULL,
    "unitDiscount" DECIMAL(65,30),
    "vatRate" DECIMAL(65,30),
    "vatClassifier" TEXT,
    "salesAccountCode" TEXT,
    "expenseAccountCode" TEXT,
    "costCenter" TEXT,
    "postscript" TEXT,
    "accComment" TEXT,
    "intraTransactionCode" TEXT,
    "intraDeliveryTerms" TEXT,
    "intraTransportCode" TEXT,
    "intraCountryCode" TEXT,
    "intrastatWeightNetto" DECIMAL(65,30),
    "vatRateName" TEXT,

    CONSTRAINT "sale_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchase_documents" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "purchaseDate" TIMESTAMP(3) NOT NULL,
    "payUntil" TIMESTAMP(3),
    "advancePaymentDate" TIMESTAMP(3),
    "series" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "supplierName" TEXT NOT NULL,
    "supplierCode" TEXT,
    "advanceEmployee" TEXT,
    "warehouseName" TEXT NOT NULL,
    "operationType" TEXT NOT NULL,
    "currencyCode" TEXT NOT NULL,
    "employeeName" TEXT,
    "comments" TEXT,
    "status" TEXT,
    "debitAccountId" TEXT,
    "creditAccountId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "purchase_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchase_items" (
    "id" TEXT NOT NULL,
    "purchaseId" TEXT NOT NULL,
    "itemName" TEXT NOT NULL,
    "itemCode" TEXT,
    "barcode" TEXT,
    "quantity" DECIMAL(65,30) NOT NULL,
    "priceWithoutVat" DECIMAL(65,30) NOT NULL,
    "unitDiscount" DECIMAL(65,30),
    "vatRate" DECIMAL(65,30),
    "vatClassifier" TEXT,
    "corAccountCode" TEXT,
    "costCenter" TEXT,
    "notes" TEXT,
    "accComment" TEXT,
    "carRegNumber" TEXT,
    "fuelCard" TEXT,
    "intraTransactionCode" TEXT,
    "intraDeliveryTerms" TEXT,
    "intraTransportCode" TEXT,
    "intraCountryOfOriginCode" TEXT,
    "intrastatWeightNetto" DECIMAL(65,30),
    "vatRegister" TEXT,
    "gpaisMethod" TEXT,

    CONSTRAINT "purchase_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_movements" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "warehouseName" TEXT NOT NULL,
    "operationType" TEXT NOT NULL,
    "documentDate" TIMESTAMP(3) NOT NULL,
    "series" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "itemName" TEXT NOT NULL,
    "itemCode" TEXT,
    "barcode" TEXT,
    "quantity" DECIMAL(65,30) NOT NULL,
    "cost" DECIMAL(65,30) NOT NULL,
    "vatRate" DECIMAL(65,30),
    "priceWithoutVat" DECIMAL(65,30),
    "priceWithVat" DECIMAL(65,30),
    "attributeName" TEXT,
    "groupName" TEXT,
    "manufacturer" TEXT,
    "countryOfOrigin" TEXT,
    "unitName" TEXT,
    "purchaseAccountCode" TEXT,
    "saleAccountCode" TEXT,
    "expenseAccountCode" TEXT,
    "minimumQuantity" DECIMAL(65,30),
    "description" TEXT,
    "externalId" TEXT,
    "freePrice" BOOLEAN NOT NULL DEFAULT false,
    "direction" TEXT NOT NULL,
    "documentType" TEXT NOT NULL,
    "documentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stock_movements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bank_statements" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "accountNumber" TEXT NOT NULL,
    "currencyCode" TEXT NOT NULL,
    "period" TIMESTAMP(3) NOT NULL,
    "transactionNumber" TEXT NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "operationType" INTEGER NOT NULL,
    "clientName" TEXT NOT NULL,
    "clientCode" TEXT,
    "clientBankAccount" TEXT,
    "paymentPurpose" TEXT,
    "correspondenceAccountCode" TEXT,
    "correspondenceAccountName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bank_statements_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "users_tenantId_idx" ON "users"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "users_tenantId_email_key" ON "users"("tenantId", "email");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_token_key" ON "sessions"("token");

-- CreateIndex
CREATE INDEX "sessions_userId_idx" ON "sessions"("userId");

-- CreateIndex
CREATE INDEX "sessions_expiresAt_idx" ON "sessions"("expiresAt");

-- CreateIndex
CREATE INDEX "companies_tenantId_idx" ON "companies"("tenantId");

-- CreateIndex
CREATE INDEX "stock_lots_fifo_idx" ON "stock_lots"("companyId", "warehouseName", "itemCode", "purchaseDate", "id");

-- CreateIndex
CREATE INDEX "stock_lots_source_idx" ON "stock_lots"("companyId", "sourceDocumentId");

-- CreateIndex
CREATE INDEX "stock_lots_companyId_idx" ON "stock_lots"("companyId");

-- CreateIndex
CREATE INDEX "stock_allocations_doc_idx" ON "stock_allocations"("companyId", "documentType", "documentId");

-- CreateIndex
CREATE INDEX "stock_allocations_lot_idx" ON "stock_allocations"("companyId", "lotId");

-- CreateIndex
CREATE INDEX "stock_allocations_companyId_idx" ON "stock_allocations"("companyId");

-- CreateIndex
CREATE INDEX "accounts_companyId_idx" ON "accounts"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "accounts_companyId_code_key" ON "accounts"("companyId", "code");

-- CreateIndex
CREATE INDEX "journal_entries_companyId_idx" ON "journal_entries"("companyId");

-- CreateIndex
CREATE INDEX "journal_entries_date_idx" ON "journal_entries"("date");

-- CreateIndex
CREATE INDEX "journal_entries_documentType_idx" ON "journal_entries"("documentType");

-- CreateIndex
CREATE INDEX "journal_entries_documentId_idx" ON "journal_entries"("documentId");

-- CreateIndex
CREATE INDEX "journal_entries_companyId_date_idx" ON "journal_entries"("companyId", "date");

-- CreateIndex
CREATE INDEX "journal_entries_companyId_source_idx" ON "journal_entries"("companyId", "source");

-- CreateIndex
CREATE INDEX "journal_lines_accountId_idx" ON "journal_lines"("accountId");

-- CreateIndex
CREATE INDEX "journal_lines_entryId_idx" ON "journal_lines"("entryId");

-- CreateIndex
CREATE INDEX "accounting_periods_companyId_idx" ON "accounting_periods"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "accounting_periods_companyId_year_month_key" ON "accounting_periods"("companyId", "year", "month");

-- CreateIndex
CREATE INDEX "clients_companyId_idx" ON "clients"("companyId");

-- CreateIndex
CREATE INDEX "items_companyId_idx" ON "items"("companyId");

-- CreateIndex
CREATE INDEX "items_code_idx" ON "items"("code");

-- CreateIndex
CREATE INDEX "items_barcode_idx" ON "items"("barcode");

-- CreateIndex
CREATE INDEX "sale_documents_companyId_idx" ON "sale_documents"("companyId");

-- CreateIndex
CREATE INDEX "sale_documents_saleDate_idx" ON "sale_documents"("saleDate");

-- CreateIndex
CREATE UNIQUE INDEX "sale_documents_companyId_series_number_key" ON "sale_documents"("companyId", "series", "number");

-- CreateIndex
CREATE INDEX "sale_items_saleId_idx" ON "sale_items"("saleId");

-- CreateIndex
CREATE INDEX "purchase_documents_companyId_idx" ON "purchase_documents"("companyId");

-- CreateIndex
CREATE INDEX "purchase_documents_purchaseDate_idx" ON "purchase_documents"("purchaseDate");

-- CreateIndex
CREATE UNIQUE INDEX "purchase_documents_companyId_series_number_key" ON "purchase_documents"("companyId", "series", "number");

-- CreateIndex
CREATE INDEX "purchase_items_purchaseId_idx" ON "purchase_items"("purchaseId");

-- CreateIndex
CREATE INDEX "stock_movements_companyId_idx" ON "stock_movements"("companyId");

-- CreateIndex
CREATE INDEX "stock_movements_documentDate_idx" ON "stock_movements"("documentDate");

-- CreateIndex
CREATE INDEX "stock_movements_warehouseName_idx" ON "stock_movements"("warehouseName");

-- CreateIndex
CREATE INDEX "stock_movements_itemCode_idx" ON "stock_movements"("itemCode");

-- CreateIndex
CREATE INDEX "stock_movements_direction_idx" ON "stock_movements"("direction");

-- CreateIndex
CREATE INDEX "stock_movements_documentId_idx" ON "stock_movements"("documentId");

-- CreateIndex
CREATE INDEX "bank_statements_companyId_idx" ON "bank_statements"("companyId");

-- CreateIndex
CREATE INDEX "bank_statements_period_idx" ON "bank_statements"("period");

-- CreateIndex
CREATE UNIQUE INDEX "bank_statements_companyId_transactionNumber_key" ON "bank_statements"("companyId", "transactionNumber");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "companies" ADD CONSTRAINT "companies_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_lots" ADD CONSTRAINT "stock_lots_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_allocations" ADD CONSTRAINT "stock_allocations_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_allocations" ADD CONSTRAINT "stock_allocations_lotId_fkey" FOREIGN KEY ("lotId") REFERENCES "stock_lots"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journal_entries" ADD CONSTRAINT "journal_entries_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journal_lines" ADD CONSTRAINT "journal_lines_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "journal_entries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journal_lines" ADD CONSTRAINT "journal_lines_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounting_periods" ADD CONSTRAINT "accounting_periods_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clients" ADD CONSTRAINT "clients_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "items" ADD CONSTRAINT "items_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sale_documents" ADD CONSTRAINT "sale_documents_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sale_items" ADD CONSTRAINT "sale_items_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "sale_documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_documents" ADD CONSTRAINT "purchase_documents_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_items" ADD CONSTRAINT "purchase_items_purchaseId_fkey" FOREIGN KEY ("purchaseId") REFERENCES "purchase_documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bank_statements" ADD CONSTRAINT "bank_statements_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
