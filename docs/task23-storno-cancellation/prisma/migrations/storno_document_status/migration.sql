-- Task 23: Storno Document Cancellation
-- Add status field to purchase_documents (sale_documents already has it)

ALTER TABLE "purchase_documents" ADD COLUMN "status" TEXT;
