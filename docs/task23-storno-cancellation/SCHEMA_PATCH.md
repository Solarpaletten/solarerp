# Schema Patch — Task 23: Storno Cancel Support

## Change: Add status to PurchaseDocument

In `prisma/schema.prisma`, model `PurchaseDocument`, add after `comments`:

```prisma
status    String?
```

**SaleDocument** already has `status String?` — no change needed.

## No Other Schema Changes

- `JournalEntry.documentType` is `String` — already accepts `'SALE_REVERSAL'`, `'PURCHASE_REVERSAL'`
- `JournalEntry.documentId` is `String?` — reversal points to same document id
- No new models, no new enums, no new relations

## Apply

```bash
# 1. Edit schema.prisma (add status to PurchaseDocument)
# 2. Run migration
npx prisma migrate dev --name storno_cancel_support
# 3. Generate client
npx prisma generate
```
