-- Task 23.2: Add indexes for STORNO lookup performance
-- Without these, findFirst by documentId+documentType does full table scan

CREATE INDEX "journal_entries_documentType_idx" ON "journal_entries"("documentType");
CREATE INDEX "journal_entries_documentId_idx" ON "journal_entries"("documentId");
