// ═══════════════════════════════════════════════════
// PATCH for BOTH cancel routes:
//   app/api/company/[companyId]/sales/[saleId]/cancel/route.ts
//   app/api/company/[companyId]/purchases/[purchaseId]/cancel/route.ts
// ═══════════════════════════════════════════════════
//
// ADD import at top:
//
//   import { createReverseMovements } from '@/lib/accounting/stockService';
//
// ADD this INSIDE the $transaction, AFTER creating reversal JournalEntry,
// BEFORE updating document status:

      // ─── Task 34: Reverse Stock Movements ──────
      // Create opposite movements to cancel stock impact
      await createReverseMovements(
        tx,
        companyId,
        saleId,          // or purchaseId
        'SALE_REVERSAL'  // or 'PURCHASE_REVERSAL'
      );

// ═══════════════════════════════════════════════════
// For SALE cancel (sales/[saleId]/cancel/route.ts):
//   documentId = saleId
//   reversalType = 'SALE_REVERSAL'
//
// For PURCHASE cancel (purchases/[purchaseId]/cancel/route.ts):
//   documentId = purchaseId
//   reversalType = 'PURCHASE_REVERSAL'
// ═══════════════════════════════════════════════════
