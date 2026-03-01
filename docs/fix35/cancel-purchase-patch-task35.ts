// ═══════════════════════════════════════════════════
// PATCH for: app/api/company/[companyId]/purchases/[purchaseId]/cancel/route.ts
// Task 35: Block cancel if lots are consumed
// ═══════════════════════════════════════════════════
//
// ADD import:
//   import { assertPurchaseLotsNotConsumed } from '@/lib/accounting/fifoService';
//
// ADD this INSIDE $transaction, AFTER finding the purchase document,
// BEFORE creating reversal journal entry:

      // §5: Block cancel if any lot from this purchase has been consumed
      await assertPurchaseLotsNotConsumed(tx, companyId, purchaseId);

      // ... then proceed with reversal as before

// ═══════════════════════════════════════════════════
// If lots are consumed, this throws:
//   PURCHASE_LOTS_ALREADY_CONSUMED
//
// Add to catch block:
//   if (message.startsWith('PURCHASE_LOTS_ALREADY_CONSUMED')) {
//     return NextResponse.json({ error: message }, { status: 409 });
//   }
// ═══════════════════════════════════════════════════
