-- Task 27: Backfill account mapping from existing journal entries
-- Run AFTER migration, BEFORE using repost endpoint
--
-- Logic: For each document that has a SALE/PURCHASE journal entry,
-- extract the debit/credit accountIds from the journal lines
-- and write them back to the document.
--
-- SALE: line with debit > 0 = debitAccountId, line with credit > 0 = creditAccountId
-- PURCHASE: same pattern

-- Backfill sale_documents
UPDATE "sale_documents" sd
SET
  "debitAccountId" = sub.debit_account,
  "creditAccountId" = sub.credit_account
FROM (
  SELECT
    je."documentId",
    MAX(CASE WHEN jl."debit" > 0 THEN jl."accountId" END) AS debit_account,
    MAX(CASE WHEN jl."credit" > 0 THEN jl."accountId" END) AS credit_account
  FROM "journal_entries" je
  JOIN "journal_lines" jl ON jl."entryId" = je."id"
  WHERE je."documentType" = 'SALE'
    AND je."documentId" IS NOT NULL
  GROUP BY je."documentId"
) sub
WHERE sd."id" = sub."documentId"
  AND sd."debitAccountId" IS NULL;

-- Backfill purchase_documents
UPDATE "purchase_documents" pd
SET
  "debitAccountId" = sub.debit_account,
  "creditAccountId" = sub.credit_account
FROM (
  SELECT
    je."documentId",
    MAX(CASE WHEN jl."debit" > 0 THEN jl."accountId" END) AS debit_account,
    MAX(CASE WHEN jl."credit" > 0 THEN jl."accountId" END) AS credit_account
  FROM "journal_entries" je
  JOIN "journal_lines" jl ON jl."entryId" = je."id"
  WHERE je."documentType" = 'PURCHASE'
    AND je."documentId" IS NOT NULL
  GROUP BY je."documentId"
) sub
WHERE pd."id" = sub."documentId"
  AND pd."debitAccountId" IS NULL;
