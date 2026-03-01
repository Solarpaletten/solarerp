// lib/accounting/stockService.ts
// ═══════════════════════════════════════════════════
// Stock Movement Service — Task 34
// ═══════════════════════════════════════════════════
//
// Principle: We never store stock quantity.
// We always compute from movement history.
// This is accounting-correct (like journal entries for money).
//
// Functions:
//   createStockMovement()  — insert IN/OUT movement
//   createReverseMovement() — reverse a document's movements (STORNO)
//   getProductBalance()     — balance for one product in one warehouse
//   getWarehouseBalance()   — all product balances in one warehouse
//   getCompanyBalance()     — all product balances across all warehouses

import { Prisma } from '@prisma/client';

// Prisma transaction client type
type TxClient = Prisma.TransactionClient;

// ─── Types ───────────────────────────────────────
export type StockDirection = 'IN' | 'OUT';
export type StockDocumentType = 'PURCHASE' | 'SALE' | 'ADJUSTMENT' | 'PURCHASE_REVERSAL' | 'SALE_REVERSAL';

export interface CreateStockMovementParams {
  tx: TxClient;
  companyId: string;
  warehouseName: string;
  itemName: string;
  itemCode: string;
  quantity: number;
  cost: number;
  direction: StockDirection;
  documentType: StockDocumentType;
  documentId: string;
  documentDate: Date;
  series: string;
  number: string;
  // Optional fields
  barcode?: string;
  unitName?: string;
  vatRate?: number;
  priceWithoutVat?: number;
  operationType?: string;
}

export interface ProductBalance {
  warehouseName: string;
  itemCode: string;
  itemName: string;
  quantity: number;
}

// ─── Create Stock Movement ───────────────────────
// Called inside transaction after JournalEntry is created.
// Only when document is POSTED.
export async function createStockMovement(params: CreateStockMovementParams) {
  const { tx, ...data } = params;

  return tx.stockMovement.create({
    data: {
      companyId: data.companyId,
      warehouseName: data.warehouseName,
      operationType: data.operationType || data.documentType,
      documentDate: data.documentDate,
      series: data.series,
      number: data.number,
      itemName: data.itemName,
      itemCode: data.itemCode || null,
      barcode: data.barcode || null,
      quantity: data.quantity,
      cost: data.cost,
      vatRate: data.vatRate ?? null,
      priceWithoutVat: data.priceWithoutVat ?? null,
      unitName: data.unitName || null,
      direction: data.direction,
      documentType: data.documentType,
      documentId: data.documentId,
    },
  });
}

// ─── Create Reverse Movements ────────────────────
// For STORNO: find all movements for a document, create opposite.
// e.g. PURCHASE movements (IN) → PURCHASE_REVERSAL movements (OUT)
export async function createReverseMovements(
  tx: TxClient,
  companyId: string,
  documentId: string,
  reversalDocumentType: StockDocumentType
) {
  // Find original movements
  const originals = await tx.stockMovement.findMany({
    where: { companyId, documentId },
  });

  if (originals.length === 0) return [];

  const reversals = [];
  for (const orig of originals) {
    const reversal = await tx.stockMovement.create({
      data: {
        companyId: orig.companyId,
        warehouseName: orig.warehouseName,
        operationType: reversalDocumentType,
        documentDate: orig.documentDate,
        series: orig.series,
        number: orig.number,
        itemName: orig.itemName,
        itemCode: orig.itemCode,
        barcode: orig.barcode,
        quantity: orig.quantity, // same quantity
        cost: orig.cost,
        vatRate: orig.vatRate,
        priceWithoutVat: orig.priceWithoutVat,
        unitName: orig.unitName,
        direction: orig.direction === 'IN' ? 'OUT' : 'IN', // reversed
        documentType: reversalDocumentType,
        documentId: orig.documentId,
      },
    });
    reversals.push(reversal);
  }

  return reversals;
}

// ─── Get Product Balance (single product, single warehouse) ─
// Returns quantity (can be negative if oversold somehow).
export async function getProductBalance(
  tx: TxClient,
  companyId: string,
  warehouseName: string,
  itemCode: string
): Promise<number> {
  const movements = await tx.stockMovement.findMany({
    where: { companyId, warehouseName, itemCode },
    select: { direction: true, quantity: true },
  });

  let balance = 0;
  for (const m of movements) {
    const qty = Number(m.quantity);
    balance += m.direction === 'IN' ? qty : -qty;
  }

  return balance;
}

// ─── Get Warehouse Balance ───────────────────────
// Returns all products with their aggregated quantity for one warehouse.
export async function getWarehouseBalance(
  tx: TxClient,
  companyId: string,
  warehouseName: string
): Promise<ProductBalance[]> {
  const movements = await tx.stockMovement.findMany({
    where: { companyId, warehouseName },
    select: { itemCode: true, itemName: true, direction: true, quantity: true },
  });

  // Aggregate by itemCode
  const map = new Map<string, { itemName: string; quantity: number }>();

  for (const m of movements) {
    const code = m.itemCode || m.itemName; // fallback to itemName if no code
    const existing = map.get(code) || { itemName: m.itemName, quantity: 0 };
    const qty = Number(m.quantity);
    existing.quantity += m.direction === 'IN' ? qty : -qty;
    map.set(code, existing);
  }

  const result: ProductBalance[] = [];
  for (const [itemCode, data] of map) {
    result.push({
      warehouseName,
      itemCode,
      itemName: data.itemName,
      quantity: data.quantity,
    });
  }

  return result.sort((a, b) => a.itemCode.localeCompare(b.itemCode));
}

// ─── Get Company Balance ─────────────────────────
// All warehouses, all products.
export async function getCompanyBalance(
  tx: TxClient,
  companyId: string
): Promise<ProductBalance[]> {
  const movements = await tx.stockMovement.findMany({
    where: { companyId },
    select: { warehouseName: true, itemCode: true, itemName: true, direction: true, quantity: true },
  });

  const map = new Map<string, { warehouseName: string; itemName: string; quantity: number }>();

  for (const m of movements) {
    const code = m.itemCode || m.itemName;
    const key = `${m.warehouseName}::${code}`;
    const existing = map.get(key) || { warehouseName: m.warehouseName, itemName: m.itemName, quantity: 0 };
    const qty = Number(m.quantity);
    existing.quantity += m.direction === 'IN' ? qty : -qty;
    map.set(key, existing);
  }

  const result: ProductBalance[] = [];
  for (const [, data] of map) {
    result.push({
      warehouseName: data.warehouseName,
      itemCode: data.warehouseName, // will fix below
      itemName: data.itemName,
      quantity: data.quantity,
    });
  }

  // Fix: extract actual itemCode from map keys
  const resultFixed: ProductBalance[] = [];
  for (const [key, data] of map) {
    const [wh, ic] = key.split('::');
    resultFixed.push({
      warehouseName: wh,
      itemCode: ic,
      itemName: data.itemName,
      quantity: data.quantity,
    });
  }

  return resultFixed.sort((a, b) =>
    a.warehouseName.localeCompare(b.warehouseName) || a.itemCode.localeCompare(b.itemCode)
  );
}

// ─── Get Warehouse Names ─────────────────────────
// Returns distinct warehouse names that have movements.
export async function getWarehouseNames(
  tx: TxClient,
  companyId: string
): Promise<string[]> {
  const result = await tx.stockMovement.groupBy({
    by: ['warehouseName'],
    where: { companyId },
    orderBy: { warehouseName: 'asc' },
  });

  return result.map(r => r.warehouseName);
}
