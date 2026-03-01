// lib/accounting/fifoService.ts
// ═══════════════════════════════════════════════════
// Industrial FIFO Engine — Task 35
// ═══════════════════════════════════════════════════
//
// Lot-based inventory with:
//   - StockLot creation on purchase
//   - FIFO allocation on sale (oldest lots first)
//   - FOR UPDATE SKIP LOCKED for concurrency
//   - Cancel sale → restore lots
//   - Cancel purchase → blocked if lots consumed
//   - Decimal-only arithmetic (no floats)
//
// Principle: qtyRemaining is the ONLY mutable field.
// Everything else is immutable audit trail.

import { Prisma } from '@prisma/client';
import Decimal from 'decimal.js';

type TxClient = Prisma.TransactionClient;

// ─── Types ───────────────────────────────────────

export interface CreateLotParams {
  companyId: string;
  warehouseName: string;
  itemCode: string;
  itemName: string;
  sourceDocumentId: string;
  purchaseDate: Date;
  unitCost: Decimal.Value;
  quantity: Decimal.Value;
  currencyCode?: string;
}

export interface FifoAllocationRequest {
  companyId: string;
  warehouseName: string;
  itemCode: string;
  itemName: string;
  quantity: Decimal.Value;
  documentType: 'SALE';
  documentId: string;
  saleItemId?: string;
}

export interface AllocationResult {
  lotId: string;
  qty: Decimal;
  unitCost: Decimal;
  amount: Decimal; // qty * unitCost
}

export interface FifoAllocationResult {
  allocations: AllocationResult[];
  totalCogs: Decimal; // sum of all allocation amounts
}

// ─── §2 CREATE LOT (Purchase Flow) ──────────────
// Creates one StockLot per purchase item.
// qtyInitial = qtyRemaining = quantity.
export async function createStockLot(
  tx: TxClient,
  params: CreateLotParams
) {
  const qty = new Decimal(params.quantity.toString());
  const cost = new Decimal(params.unitCost.toString());

  if (qty.lte(0)) throw new Error('LOT_QTY_MUST_BE_POSITIVE');
  if (cost.lt(0)) throw new Error('LOT_COST_MUST_BE_NON_NEGATIVE');

  return tx.stockLot.create({
    data: {
      companyId: params.companyId,
      warehouseName: params.warehouseName,
      itemCode: params.itemCode,
      itemName: params.itemName,
      sourceDocumentType: 'PURCHASE',
      sourceDocumentId: params.sourceDocumentId,
      purchaseDate: params.purchaseDate,
      unitCost: cost.toFixed(2),
      qtyInitial: qty.toFixed(4),
      qtyRemaining: qty.toFixed(4),
      currencyCode: params.currencyCode || 'EUR',
    },
  });
}

// ─── §3 FIFO ALLOCATION (Sale Flow) ─────────────
// Core FIFO algorithm:
// 1. Check total available >= requested
// 2. Lock lots with FOR UPDATE SKIP LOCKED
// 3. Consume from oldest first
// 4. Create StockAllocation records
// 5. Return total COGS
export async function allocateFifoLots(
  tx: TxClient,
  params: FifoAllocationRequest
): Promise<FifoAllocationResult> {
  const requestedQty = new Decimal(params.quantity.toString());

  if (requestedQty.lte(0)) throw new Error('ALLOCATION_QTY_MUST_BE_POSITIVE');

  // ─── Step 1: Check total available (pre-check) ─
  const availableResult = await tx.stockLot.aggregate({
    where: {
      companyId: params.companyId,
      warehouseName: params.warehouseName,
      itemCode: params.itemCode,
      qtyRemaining: { gt: 0 },
    },
    _sum: { qtyRemaining: true },
  });

  const totalAvailable = new Decimal(
    availableResult._sum.qtyRemaining?.toString() || '0'
  );

  if (totalAvailable.lt(requestedQty)) {
    throw new Error(
      `INSUFFICIENT_STOCK: ${params.itemName} (${params.itemCode}) — ` +
      `available: ${totalAvailable.toFixed(4)}, requested: ${requestedQty.toFixed(4)} ` +
      `in warehouse "${params.warehouseName}"`
    );
  }

  // ─── Step 2: Lock and fetch lots (FOR UPDATE SKIP LOCKED) ─
  // §6 CONCURRENCY: This is critical for parallel safety
  const lots = await tx.$queryRaw<Array<{
    id: string;
    qtyRemaining: string; // Decimal comes as string from raw
    unitCost: string;
  }>>`
    SELECT "id", "qtyRemaining"::TEXT, "unitCost"::TEXT
    FROM "stock_lots"
    WHERE "companyId" = ${params.companyId}
      AND "warehouseName" = ${params.warehouseName}
      AND "itemCode" = ${params.itemCode}
      AND "qtyRemaining" > 0
    ORDER BY "purchaseDate" ASC, "id" ASC
    FOR UPDATE SKIP LOCKED
  `;

  // ─── Step 3: FIFO consume ─────────────────────
  let remaining = new Decimal(requestedQty.toString());
  const allocations: AllocationResult[] = [];

  for (const lot of lots) {
    if (remaining.lte(0)) break;

    const lotQty = new Decimal(lot.qtyRemaining);
    const lotCost = new Decimal(lot.unitCost);
    const consume = Decimal.min(remaining, lotQty);
    const amount = consume.mul(lotCost);

    // Update lot: reduce qtyRemaining
    const newRemaining = lotQty.minus(consume);

    // ─── INVARIANT CHECK ─────────────────────────
    // qtyRemaining must NEVER go negative.
    // If it does, something is fundamentally broken.
    if (newRemaining.lt(0)) {
      throw new Error(
        `FIFO_INVARIANT_VIOLATION: Lot ${lot.id} would go negative ` +
        `(current: ${lotQty.toFixed(4)}, consume: ${consume.toFixed(4)}, ` +
        `result: ${newRemaining.toFixed(4)}). Aborting transaction.`
      );
    }

    await tx.stockLot.update({
      where: { id: lot.id },
      data: {
        qtyRemaining: newRemaining.toFixed(4),
      },
    });

    // Create StockAllocation record
    await tx.stockAllocation.create({
      data: {
        companyId: params.companyId,
        documentType: params.documentType,
        documentId: params.documentId,
        saleItemId: params.saleItemId || null,
        lotId: lot.id,
        qty: consume.toFixed(4),
        unitCost: lotCost.toFixed(2),
        amount: amount.toFixed(2),
      },
    });

    allocations.push({
      lotId: lot.id,
      qty: consume,
      unitCost: lotCost,
      amount,
    });

    remaining = remaining.minus(consume);
  }

  // Safety: should never happen if pre-check passed
  if (remaining.gt(0)) {
    throw new Error(
      `FIFO_ALLOCATION_INCOMPLETE: Could not allocate ${remaining.toFixed(4)} units ` +
      `of ${params.itemCode}. Possible concurrent modification.`
    );
  }

  const totalCogs = allocations.reduce(
    (sum, a) => sum.plus(a.amount),
    new Decimal(0)
  );

  return { allocations, totalCogs };
}

// ─── §4 CANCEL SALE → Restore Lots ──────────────
// Reverses FIFO allocations:
// 1. Find all allocations for the sale
// 2. Restore qtyRemaining to each lot
// 3. Create SALE_REVERSAL allocation records (audit trail)
export async function reverseSaleAllocations(
  tx: TxClient,
  companyId: string,
  saleDocumentId: string
): Promise<{ restoredCount: number; totalCogs: Decimal }> {
  const allocations = await tx.stockAllocation.findMany({
    where: {
      companyId,
      documentType: 'SALE',
      documentId: saleDocumentId,
    },
  });

  if (allocations.length === 0) {
    return { restoredCount: 0, totalCogs: new Decimal(0) };
  }

  let totalCogs = new Decimal(0);

  for (const alloc of allocations) {
    const allocQty = new Decimal(alloc.qty.toString());
    const allocAmount = new Decimal(alloc.amount.toString());

    // Restore lot qtyRemaining
    const lot = await tx.stockLot.findUniqueOrThrow({
      where: { id: alloc.lotId },
    });

    const currentRemaining = new Decimal(lot.qtyRemaining.toString());
    const restoredRemaining = currentRemaining.plus(allocQty);
    const qtyInitial = new Decimal(lot.qtyInitial.toString());

    // ─── INVARIANT CHECK ─────────────────────────
    // After restore, qtyRemaining must not exceed qtyInitial.
    if (restoredRemaining.gt(qtyInitial)) {
      throw new Error(
        `FIFO_RESTORE_INVARIANT_VIOLATION: Lot ${alloc.lotId} would exceed initial quantity ` +
        `(initial: ${qtyInitial.toFixed(4)}, current: ${currentRemaining.toFixed(4)}, ` +
        `restoring: ${allocQty.toFixed(4)}, result: ${restoredRemaining.toFixed(4)}). ` +
        `Possible double-cancel.`
      );
    }

    await tx.stockLot.update({
      where: { id: alloc.lotId },
      data: {
        qtyRemaining: restoredRemaining.toFixed(4),
      },
    });

    // Create reversal allocation (audit trail)
    await tx.stockAllocation.create({
      data: {
        companyId,
        documentType: 'SALE_REVERSAL',
        documentId: saleDocumentId,
        saleItemId: alloc.saleItemId,
        lotId: alloc.lotId,
        qty: allocQty.toFixed(4),
        unitCost: new Decimal(alloc.unitCost.toString()).toFixed(2),
        amount: allocAmount.toFixed(2),
      },
    });

    totalCogs = totalCogs.plus(allocAmount);
  }

  return { restoredCount: allocations.length, totalCogs };
}

// ─── §5 CANCEL PURCHASE → Block if consumed ─────
// Checks if any lot from this purchase has been partially consumed.
// If consumed → throws PURCHASE_LOTS_ALREADY_CONSUMED.
export async function assertPurchaseLotsNotConsumed(
  tx: TxClient,
  companyId: string,
  purchaseDocumentId: string
): Promise<void> {
  const lots = await tx.stockLot.findMany({
    where: {
      companyId,
      sourceDocumentId: purchaseDocumentId,
    },
    select: {
      id: true,
      itemCode: true,
      qtyInitial: true,
      qtyRemaining: true,
    },
  });

  for (const lot of lots) {
    const initial = new Decimal(lot.qtyInitial.toString());
    const remaining = new Decimal(lot.qtyRemaining.toString());

    if (!remaining.eq(initial)) {
      throw new Error(
        `PURCHASE_LOTS_ALREADY_CONSUMED: Lot ${lot.id} (${lot.itemCode}) ` +
        `has been partially consumed (initial: ${initial.toFixed(4)}, ` +
        `remaining: ${remaining.toFixed(4)}). Cancel related sales first.`
      );
    }
  }
}

// ─── Helper: Get available stock for an item ─────
export async function getAvailableStock(
  tx: TxClient,
  companyId: string,
  warehouseName: string,
  itemCode: string
): Promise<Decimal> {
  const result = await tx.stockLot.aggregate({
    where: {
      companyId,
      warehouseName,
      itemCode,
      qtyRemaining: { gt: 0 },
    },
    _sum: { qtyRemaining: true },
  });

  return new Decimal(result._sum.qtyRemaining?.toString() || '0');
}
