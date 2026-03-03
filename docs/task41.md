Полное ТЗ Task 41 получено. Это масштабная задача — Visible Accounting Layer. Нужно сначала проверить Posting Engine (VAT, 3-line journal), потом сделать UI блоки для POSTED документов.
Давай проверю текущие сервисы:Searched project for “journalEntry journalLines model prisma schema documentType documentId account”Searched project for “journalEntry journalLines model prisma schema documentType documentId account”Searched project for “journalEntry journalLines model prisma schema documentType documentId account”4 resultsprisma/schema.prisma3 relevant sectionstextlib/accounting/journalService.ts2 relevant sectionstextapp/api/company/[companyId]/sales/route.ts2 relevant sectionstextprisma/migrations/20260301140811_init_full_schema/migration.sqltextDoneТеперь у меня полная картина. Ключевые находки:

journalService уже имеет validateJournalLines с double-entry check ✅ (41.6 уже готов)
Post route — НДС не создаётся! Сейчас только 2 строки (DR Inventory / CR Payable), нужны 3 (+ DR Input VAT)
Schema — JournalEntry/JournalLine/StockMovement/StockLot все есть
resolvePurchaseAccounts возвращает {debitAccountId, creditAccountId, vatAccountId} — VAT поле уже есть!

Приступаю. Начну с файлов:Ran a command, viewed a fileRan a command, viewed a fileХорошо. Для ERP не нужен креативный дизайн — нужна утилитарная, чистая бухгалтерская эстетика, как в продакшене.
Теперь выдаю файлы — Post Engine с 3-line VAT + API для accounting data + UI компоненты + обновлённая page:Task 41: UPGRADED Post route with 3-line VAT journal (DR Wareneingang + DR Vorsteuer + CR Verbindlichkeiten)Task 41: UPGRADED Post route with 3-line VAT journal (DR Wareneingang + DR Vorsteuer + CR Verbindlichkeiten)Now the API endpoint for accounting data (journal + stock + lots):Task 41: GET /purchases/[purchaseId]/accounting — returns journal lines, stock movements, FIFO lots for a POSTED documentTask 41: GET /purchases/[purchaseId]/accounting — returns journal lines, stock movements, FIFO lots for a POSTED documentNow the UI components for posted documents:Task 41: PostedAccountingView — shows journal entries, VAT summary, stock movements, FIFO lots after postingTask 41: PostedAccountingView — shows journal entries, VAT summary, stock movements, FIFO lots after postingNow update the page to show accounting data for POSTED documents:Task 41: Updated purchase document page — shows PostedAccountingView for POSTED/CANCELLED documentsTask 41: Updated purchase document page — shows PostedAccountingView for POSTED/CANCELLED documentsНужно проверить resolvePurchaseAccounts — возвращает ли она vatAccountId:Searched project for “resolvePurchaseAccounts accountMapping vatAccountId ACCOUNT_MAP VAT_19 1576 Vorsteuer”Searched project for “resolvePurchaseAccounts accountMapping vatAccountId ACCOUNT_MAP VAT_19 1576 Vorsteuer”Отлично — полная картина подтверждена:

resolvePurchaseAccounts → возвращает vatAccountId (1576)
ACCOUNT_MAP.purchase.VAT_19.vat = '1576' (Abziehbare Vorsteuer 19%)
journalService.validateJournalLines уже проверяет double-entry balance ✅
SKR03 CSV содержит все нужные счета

Мои файлы из предыдущего ответа полностью корректны. Дополню receipt endpoint (41.7) и выдам всё:Task 41.7: GET /purchases/[purchaseId]/receipt — warehouse receipt data for goods receivedTask 41.7: GET /purchases/[purchaseId]/receipt — warehouse receipt data for goods receivedNow also fix the purchaseId issue in the PUT route:Created a file, read a fileCreated a file, read a fileTask 41 — Visible Accounting Layer: 6 файлов
Деплой карта
bash# ═══ API ROUTES ══════════════════════════════════
# 41.2 + 41.5 + 41.6: 3-line VAT journal + status guard + double-entry
cp post-purchase-route.ts \
   app/api/company/\[companyId\]/purchases/\[purchaseId\]/post/route.ts

# 41.1 + 41.3: Accounting data endpoint (journal + stock + FIFO)
cp accounting-route.ts \
   app/api/company/\[companyId\]/purchases/\[purchaseId\]/accounting/route.ts

# 41.7: Warehouse receipt endpoint
cp receipt-route.ts \
   app/api/company/\[companyId\]/purchases/\[purchaseId\]/receipt/route.ts

# Fix: purchaseId field name (from earlier bug)
cp purchase-id-route.ts \
   app/api/company/\[companyId\]/purchases/\[purchaseId\]/route.ts

# ═══ COMPONENT ═══════════════════════════════════
# 41.4: Visible accounting view
cp PostedAccountingView.tsx \
   components/purchases/PostedAccountingView.tsx

# ═══ PAGE ════════════════════════════════════════
# 41.4: Updated page with accounting layer
cp purchase-document-page.tsx \
   app/\(dashboard\)/company/\[companyId\]/purchases/\[purchaseId\]/page.tsx
```

### Чеклист Task 41

| Подзадача | Описание | Статус |
|-----------|----------|--------|
| **41.1** | Отображение проводок (Accounting Entries table) | ✅ `PostedAccountingView` |
| **41.2** | 3-line VAT journal: DR 3400 + DR 1576 + CR 1600 | ✅ `post route` |
| **41.3** | Warehouse Receipt + FIFO lots view | ✅ `PostedAccountingView` |
| **41.4** | UI блоки для POSTED/CANCELLED | ✅ `page.tsx` |
| **41.5** | Guard от повторного POST (status !== DRAFT → 409) | ✅ `post route` |
| **41.6** | Double-entry verification | ✅ `journalService` (уже было) + UI badge |
| **41.7** | Receipt API endpoint | ✅ `receipt/route.ts` |

### Ключевые изменения

**Post Engine (3-line VAT):**
```
DR 3400 Wareneingang         → net amount (3.997,00)
DR 1576 Abziehbare Vorsteuer → VAT 19%   (  759,43)
CR 1600 Verbindlichkeiten    → gross      (4.756,43)
Сумма дебетов = сумма кредитов → journalService.validateJournalLines проверяет автоматически. Если не сходится — transaction rollback.
UI после Post: таблица проводок с кодами счетов, суммами, badge "✓ Balanced", складские движения, FIFO lots с remaining qty.Post purchase routeTS DownloadAccounting routeTS DownloadReceipt routeTS DownloadPurchase id routeTS DownloadPostedaccountingviewCode · TSX DownloadPurchase document page



// app/api/company/[companyId]/purchases/[purchaseId]/accounting/route.ts
// ═══════════════════════════════════════════════════
// Task 41: Accounting Data for Posted Purchase
// ═══════════════════════════════════════════════════
// Returns: journal entry + lines (with account codes/names),
//          stock movements, FIFO lots

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireTenant } from '@/lib/auth/requireTenant';

type RouteParams = {
  params: Promise<{ companyId: string; purchaseId: string }>;
};

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { tenantId } = await requireTenant(request);
    const { companyId, purchaseId } = await params;

    const company = await prisma.company.findFirst({
      where: { id: companyId, tenantId },
      select: { id: true },
    });
    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    // ── Journal Entry + Lines ───────────────────
    const journalEntries = await prisma.journalEntry.findMany({
      where: {
        companyId,
        documentType: { in: ['PURCHASE', 'PURCHASE_REVERSAL'] },
        documentId: purchaseId,
      },
      include: {
        lines: {
          include: {
            account: {
              select: { code: true, nameDe: true, nameEn: true, type: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    // ── Stock Movements ─────────────────────────
    const stockMovements = await prisma.stockMovement.findMany({
      where: {
        companyId,
        documentId: purchaseId,
      },
      select: {
        id: true,
        itemName: true,
        itemCode: true,
        quantity: true,
        cost: true,
        direction: true,
        documentType: true,
        warehouseName: true,
        documentDate: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    // ── FIFO Lots ───────────────────────────────
    const stockLots = await prisma.stockLot.findMany({
      where: {
        companyId,
        sourceDocumentId: purchaseId,
      },
      select: {
        id: true,
        itemCode: true,
        itemName: true,
        warehouseName: true,
        unitCost: true,
        qtyInitial: true,
        qtyRemaining: true,
        currencyCode: true,
        purchaseDate: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    // Format journal entries with readable account info
    const formattedEntries = journalEntries.map((entry) => ({
      id: entry.id,
      date: entry.date,
      documentType: entry.documentType,
      source: entry.source,
      description: entry.description,
      createdAt: entry.createdAt,
      lines: entry.lines.map((line) => ({
        id: line.id,
        accountCode: line.account.code,
        accountNameDe: line.account.nameDe,
        accountNameEn: line.account.nameEn,
        accountType: line.account.type,
        debit: Number(line.debit),
        credit: Number(line.credit),
      })),
    }));

    return NextResponse.json({
      journal: formattedEntries,
      stockMovements: stockMovements.map((m) => ({
        ...m,
        quantity: Number(m.quantity),
        cost: Number(m.cost),
      })),
      stockLots: stockLots.map((l) => ({
        ...l,
        unitCost: Number(l.unitCost),
        qtyInitial: Number(l.qtyInitial),
        qtyRemaining: Number(l.qtyRemaining),
      })),
    });
  } catch (error: unknown) {
    if (error instanceof Response) return error;
    const msg = error instanceof Error ? error.message : 'Unknown error';
    console.error('Get accounting data error:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

2
// app/api/company/[companyId]/purchases/[purchaseId]/post/route.ts
// ═══════════════════════════════════════════════════
// Task 39 + 40 + 41: Posting Engine — DRAFT → POSTED
// ═══════════════════════════════════════════════════
// 3-line VAT journal:
//   DR 3400 (Wareneingang)         → net amount
//   DR 1576 (Abziehbare Vorsteuer) → VAT amount
//   CR 1600 (Verbindlichkeiten)    → gross amount
//
// + StockMovement IN + FIFO lots + status POSTED

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireTenant } from '@/lib/auth/requireTenant';
import { createJournalEntry } from '@/lib/accounting/journalService';
import { assertPeriodOpen } from '@/lib/accounting/periodLock';
import { createStockMovement } from '@/lib/accounting/stockService';
import { createStockLot } from '@/lib/accounting/fifoService';
import { resolvePurchaseAccounts } from '@/lib/accounting/accountMapping';

type RouteParams = {
  params: Promise<{ companyId: string; purchaseId: string }>;
};

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { tenantId } = await requireTenant(request);
    const { companyId, purchaseId } = await params;

    const company = await prisma.company.findFirst({
      where: { id: companyId, tenantId },
      select: { id: true },
    });
    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    const result = await prisma.$transaction(async (tx) => {
      // ── 1. Load document + items ──────────────
      const purchase = await tx.purchaseDocument.findFirst({
        where: { id: purchaseId, companyId, company: { tenantId } },
        include: { items: true },
      });

      if (!purchase) throw new Error('PURCHASE_NOT_FOUND');

      // ── 2. Status guard (41.5) ────────────────
      if (purchase.status === 'POSTED') throw new Error('ALREADY_POSTED');
      if (purchase.status === 'CANCELLED') throw new Error('ALREADY_CANCELLED');
      if (purchase.status === 'LOCKED') throw new Error('LOCKED');
      if (purchase.status !== 'DRAFT') throw new Error('ONLY_DRAFT_CAN_POST');

      // ── 3. Validate header ────────────────────
      if (!purchase.supplierName || purchase.supplierName.trim().length === 0) throw new Error('SUPPLIER_NAME_REQUIRED');
      if (!purchase.warehouseName || purchase.warehouseName.trim().length === 0) throw new Error('WAREHOUSE_NAME_REQUIRED');
      if (!purchase.currencyCode) throw new Error('CURRENCY_CODE_REQUIRED');
      if (!purchase.operationType) throw new Error('OPERATION_TYPE_REQUIRED');
      if (!purchase.purchaseDate) throw new Error('PURCHASE_DATE_REQUIRED');

      // ── 4. Validate items ─────────────────────
      if (!purchase.items || purchase.items.length === 0) throw new Error('AT_LEAST_ONE_ITEM_REQUIRED');

      for (const item of purchase.items) {
        if (!item.itemName || item.itemName.trim().length === 0) throw new Error('ITEM_NAME_REQUIRED');
        if (Number(item.quantity) <= 0) throw new Error('ITEM_QTY_MUST_BE_POSITIVE');
        if (Number(item.priceWithoutVat) < 0) throw new Error('ITEM_PRICE_MUST_BE_NON_NEGATIVE');
      }

      // ── 5. Period lock ────────────────────────
      await assertPeriodOpen(tx, { companyId, date: purchase.purchaseDate });

      // ── 6. Auto-resolve accounts (ACCOUNT_MAP → SKR03) ──
      // Returns: debitAccountId (3400), creditAccountId (1600), vatAccountId (1576)
      const accounts = await resolvePurchaseAccounts(tx, companyId, 'VAT_19');

      // ── 7. Calculate amounts ──────────────────
      let netTotal = 0;
      let vatTotal = 0;

      for (const item of purchase.items) {
        const qty = Number(item.quantity);
        const price = Number(item.priceWithoutVat);
        const vatRate = item.vatRate ? Number(item.vatRate) : 0;
        const itemNet = qty * price;
        const itemVat = itemNet * (vatRate / 100);
        netTotal += itemNet;
        vatTotal += itemVat;
      }

      const grossTotal = netTotal + vatTotal;

      if (netTotal <= 0) throw new Error('TOTAL_AMOUNT_MUST_BE_POSITIVE');

      // ── 8. Create 3-line Journal Entry (41.2) ─
      // DR 3400 Wareneingang         → net
      // DR 1576 Abziehbare Vorsteuer → VAT (if > 0)
      // CR 1600 Verbindlichkeiten    → gross
      const journalLines: { accountId: string; debit: number; credit: number }[] = [
        { accountId: accounts.debitAccountId, debit: netTotal, credit: 0 },
      ];

      if (vatTotal > 0 && accounts.vatAccountId) {
        journalLines.push({
          accountId: accounts.vatAccountId,
          debit: vatTotal,
          credit: 0,
        });
      }

      // Credit = gross (net + VAT)
      journalLines.push({
        accountId: accounts.creditAccountId,
        debit: 0,
        credit: vatTotal > 0 ? grossTotal : netTotal,
      });

      const journalEntry = await createJournalEntry(tx, {
        companyId,
        date: purchase.purchaseDate,
        documentType: 'PURCHASE',
        documentId: purchase.id,
        description: `Purchase ${purchase.series}-${purchase.number} — ${purchase.supplierName}`,
        lines: journalLines,
      });

      // ── 9. Stock Movements IN + FIFO Lots ─────
      for (const item of purchase.items) {
        await createStockMovement({
          tx, companyId,
          warehouseName: purchase.warehouseName,
          itemName: item.itemName,
          itemCode: item.itemCode || item.itemName,
          quantity: Number(item.quantity),
          cost: Number(item.priceWithoutVat),
          direction: 'IN',
          documentType: 'PURCHASE',
          documentId: purchase.id,
          documentDate: purchase.purchaseDate,
          series: purchase.series,
          number: purchase.number,
          barcode: item.barcode || undefined,
          vatRate: item.vatRate ? Number(item.vatRate) : undefined,
          priceWithoutVat: Number(item.priceWithoutVat),
          operationType: purchase.operationType,
        });

        await createStockLot(tx, {
          companyId,
          warehouseName: purchase.warehouseName,
          itemCode: item.itemCode || item.itemName,
          itemName: item.itemName,
          sourceDocumentId: purchase.id,
          purchaseDate: purchase.purchaseDate,
          unitCost: Number(item.priceWithoutVat),
          quantity: Number(item.quantity),
          currencyCode: purchase.currencyCode,
        });
      }

      // ── 10. Update status → POSTED ────────────
      const postedDoc = await tx.purchaseDocument.update({
        where: { id: purchaseId },
        data: {
          status: 'POSTED',
          debitAccountId: accounts.debitAccountId,
          creditAccountId: accounts.creditAccountId,
        },
        include: { items: { orderBy: { id: 'asc' } } },
      });

      return { purchase: postedDoc, journalEntry, netTotal, vatTotal, grossTotal };
    });

    return NextResponse.json({
      data: result.purchase,
      journal: {
        id: result.journalEntry.id,
        linesCount: result.journalEntry.lines.length,
      },
      accounting: {
        netTotal: result.netTotal,
        vatTotal: result.vatTotal,
        grossTotal: result.grossTotal,
      },
    }, { status: 200 });
  } catch (error: unknown) {
    if (error instanceof Response) return error;
    const msg = error instanceof Error ? error.message : 'Unknown error';

    const badRequest = [
      'PURCHASE_NOT_FOUND', 'ONLY_DRAFT_CAN_POST', 'SUPPLIER_NAME_REQUIRED', 'WAREHOUSE_NAME_REQUIRED',
      'CURRENCY_CODE_REQUIRED', 'OPERATION_TYPE_REQUIRED', 'PURCHASE_DATE_REQUIRED',
      'AT_LEAST_ONE_ITEM_REQUIRED', 'ITEM_NAME_REQUIRED', 'ITEM_QTY_MUST_BE_POSITIVE',
      'ITEM_PRICE_MUST_BE_NON_NEGATIVE', 'TOTAL_AMOUNT_MUST_BE_POSITIVE',
    ];
    if (badRequest.includes(msg)) return NextResponse.json({ error: msg }, { status: 400 });

    if (msg === 'ALREADY_POSTED') return NextResponse.json({ error: 'Document is already posted' }, { status: 409 });
    if (msg === 'ALREADY_CANCELLED') return NextResponse.json({ error: 'Document is cancelled' }, { status: 409 });
    if (msg === 'LOCKED') return NextResponse.json({ error: 'Document is locked' }, { status: 409 });
    if (msg === 'PERIOD_CLOSED') return NextResponse.json({ error: 'Accounting period is closed' }, { status: 409 });

    if (msg.startsWith('ACCOUNT_CODE_NOT_FOUND')) {
      return NextResponse.json({ error: `Posting accounts not found. Import SKR03 first. (${msg})` }, { status: 400 });
    }
    if (msg.startsWith('Journal entry is unbalanced')) {
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    if (error && typeof error === 'object' && 'code' in error && (error as { code: string }).code === 'P2002') {
      return NextResponse.json({ error: 'Duplicate posting detected' }, { status: 409 });
    }

    console.error('Post purchase error:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
3
// components/purchases/PostedAccountingView.tsx
// ═══════════════════════════════════════════════════
// Task 41: Visible Accounting Layer
// ═══════════════════════════════════════════════════
// Shows: Journal entries, VAT summary, Stock movements, FIFO lots

'use client';

import { useState, useEffect } from 'react';
import { BookOpen, Package, Layers, AlertCircle, Loader2 } from 'lucide-react';

interface JournalLine {
  id: string;
  accountCode: string;
  accountNameDe: string;
  accountNameEn: string;
  accountType: string;
  debit: number;
  credit: number;
}

interface JournalEntry {
  id: string;
  date: string;
  documentType: string;
  source: string;
  description: string | null;
  createdAt: string;
  lines: JournalLine[];
}

interface StockMovement {
  id: string;
  itemName: string;
  itemCode: string | null;
  quantity: number;
  cost: number;
  direction: string;
  documentType: string;
  warehouseName: string;
  documentDate: string;
}

interface StockLot {
  id: string;
  itemCode: string;
  itemName: string;
  warehouseName: string;
  unitCost: number;
  qtyInitial: number;
  qtyRemaining: number;
  currencyCode: string;
  purchaseDate: string;
}

interface AccountingData {
  journal: JournalEntry[];
  stockMovements: StockMovement[];
  stockLots: StockLot[];
}

function fmt(value: number): string {
  return value.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtQty(value: number): string {
  return value.toLocaleString('de-DE', { minimumFractionDigits: 0, maximumFractionDigits: 4 });
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

// ─── Section Wrapper ────────────────────────────
function Section({ title, icon, children, badge }: {
  title: string; icon: React.ReactNode; children: React.ReactNode; badge?: string;
}) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      <div className="px-4 py-2.5 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
        <div className="flex items-center gap-2">
          <span className="text-gray-400">{icon}</span>
          <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wider">{title}</h3>
        </div>
        {badge && (
          <span className="text-[10px] font-bold text-gray-400 bg-gray-100 px-2 py-0.5 rounded">{badge}</span>
        )}
      </div>
      <div className="p-0">{children}</div>
    </div>
  );
}

export default function PostedAccountingView({ companyId, purchaseId }: { companyId: string; purchaseId: string }) {
  const [data, setData] = useState<AccountingData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchAccounting() {
      try {
        setIsLoading(true);
        const res = await fetch(`/api/company/${companyId}/purchases/${purchaseId}/accounting`);
        if (!res.ok) {
          const json = await res.json().catch(() => ({}));
          throw new Error(json.error || 'Failed to load accounting data');
        }
        const json = await res.json();
        setData(json);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setIsLoading(false);
      }
    }

    fetchAccounting();
  }, [companyId, purchaseId]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="animate-spin text-gray-300" size={20} />
        <span className="ml-2 text-xs text-gray-400">Loading accounting data...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-700 flex items-center gap-2">
        <AlertCircle size={16} /> {error}
      </div>
    );
  }

  if (!data) return null;

  const hasReversal = data.journal.some((j) => j.documentType === 'PURCHASE_REVERSAL');

  return (
    <div className="space-y-3">
      {/* ── Journal Entries (41.1) ────────────── */}
      {data.journal.map((entry) => {
        const isReversal = entry.documentType === 'PURCHASE_REVERSAL';
        const totalDebit = entry.lines.reduce((s, l) => s + l.debit, 0);
        const totalCredit = entry.lines.reduce((s, l) => s + l.credit, 0);

        return (
          <Section
            key={entry.id}
            title={isReversal ? 'Reversal Entry (STORNO)' : 'Accounting Entries'}
            icon={<BookOpen size={14} />}
            badge={`${entry.lines.length} lines`}
          >
            {entry.description && (
              <div className="px-4 py-2 text-xs text-gray-500 italic border-b border-gray-50">{entry.description}</div>
            )}
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="px-4 py-2 text-left text-[10px] font-semibold text-gray-400 uppercase">Account</th>
                  <th className="px-4 py-2 text-left text-[10px] font-semibold text-gray-400 uppercase">Name</th>
                  <th className="px-4 py-2 text-right text-[10px] font-semibold text-gray-400 uppercase">Debit</th>
                  <th className="px-4 py-2 text-right text-[10px] font-semibold text-gray-400 uppercase">Credit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {entry.lines.map((line) => (
                  <tr key={line.id} className={`${isReversal ? 'bg-red-50/30' : ''} hover:bg-gray-50/50`}>
                    <td className="px-4 py-2 font-mono font-semibold text-gray-800">{line.accountCode}</td>
                    <td className="px-4 py-2 text-gray-600">{line.accountNameDe}</td>
                    <td className="px-4 py-2 text-right font-mono tabular-nums text-gray-900">
                      {line.debit > 0 ? fmt(line.debit) : <span className="text-gray-200">—</span>}
                    </td>
                    <td className="px-4 py-2 text-right font-mono tabular-nums text-gray-900">
                      {line.credit > 0 ? fmt(line.credit) : <span className="text-gray-200">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-gray-200 bg-gray-50/50">
                  <td colSpan={2} className="px-4 py-2 text-[10px] font-bold text-gray-500 uppercase">Total</td>
                  <td className="px-4 py-2 text-right font-mono font-bold tabular-nums text-gray-900">{fmt(totalDebit)}</td>
                  <td className="px-4 py-2 text-right font-mono font-bold tabular-nums text-gray-900">{fmt(totalCredit)}</td>
                </tr>
                <tr>
                  <td colSpan={4} className="px-4 py-1.5 text-right">
                    {Math.abs(totalDebit - totalCredit) < 0.01 ? (
                      <span className="text-[10px] font-semibold text-green-600">✓ Balanced (double-entry verified)</span>
                    ) : (
                      <span className="text-[10px] font-semibold text-red-600">✗ UNBALANCED — difference: {fmt(Math.abs(totalDebit - totalCredit))}</span>
                    )}
                  </td>
                </tr>
              </tfoot>
            </table>
          </Section>
        );
      })}

      {/* ── Warehouse Receipt (41.3) ─────────── */}
      {data.stockMovements.length > 0 && (
        <Section
          title={hasReversal ? 'Stock Movements (incl. Reversals)' : 'Warehouse Receipt'}
          icon={<Package size={14} />}
          badge={`${data.stockMovements.length} movements`}
        >
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="px-4 py-2 text-left text-[10px] font-semibold text-gray-400 uppercase">Item</th>
                <th className="px-4 py-2 text-left text-[10px] font-semibold text-gray-400 uppercase">Warehouse</th>
                <th className="px-4 py-2 text-center text-[10px] font-semibold text-gray-400 uppercase">Direction</th>
                <th className="px-4 py-2 text-right text-[10px] font-semibold text-gray-400 uppercase">Qty</th>
                <th className="px-4 py-2 text-right text-[10px] font-semibold text-gray-400 uppercase">Unit Cost</th>
                <th className="px-4 py-2 text-left text-[10px] font-semibold text-gray-400 uppercase">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {data.stockMovements.map((m) => {
                const isOut = m.direction === 'OUT';
                return (
                  <tr key={m.id} className={`hover:bg-gray-50/50 ${isOut ? 'bg-red-50/30' : ''}`}>
                    <td className="px-4 py-2 text-gray-900">
                      {m.itemName}
                      {m.itemCode && <span className="ml-1.5 text-gray-400 font-mono text-[10px]">{m.itemCode}</span>}
                    </td>
                    <td className="px-4 py-2 text-gray-500">{m.warehouseName}</td>
                    <td className="px-4 py-2 text-center">
                      <span className={`inline-block px-1.5 py-0.5 text-[10px] font-bold uppercase rounded ${isOut ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-700'}`}>
                        {m.direction}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-right font-mono tabular-nums text-gray-900">{fmtQty(m.quantity)}</td>
                    <td className="px-4 py-2 text-right font-mono tabular-nums text-gray-700">{fmt(m.cost)}</td>
                    <td className="px-4 py-2 text-gray-500">{formatDate(m.documentDate)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Section>
      )}

      {/* ── FIFO Lots (41.3) ─────────────────── */}
      {data.stockLots.length > 0 && (
        <Section
          title="FIFO Inventory Lots"
          icon={<Layers size={14} />}
          badge={`${data.stockLots.length} lots`}
        >
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="px-4 py-2 text-left text-[10px] font-semibold text-gray-400 uppercase">Item</th>
                <th className="px-4 py-2 text-left text-[10px] font-semibold text-gray-400 uppercase">Warehouse</th>
                <th className="px-4 py-2 text-right text-[10px] font-semibold text-gray-400 uppercase">Unit Cost</th>
                <th className="px-4 py-2 text-right text-[10px] font-semibold text-gray-400 uppercase">Initial Qty</th>
                <th className="px-4 py-2 text-right text-[10px] font-semibold text-gray-400 uppercase">Remaining</th>
                <th className="px-4 py-2 text-left text-[10px] font-semibold text-gray-400 uppercase">Purchase Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {data.stockLots.map((lot) => {
                const consumed = lot.qtyInitial - lot.qtyRemaining;
                const fullyConsumed = lot.qtyRemaining <= 0;
                return (
                  <tr key={lot.id} className={`hover:bg-gray-50/50 ${fullyConsumed ? 'bg-gray-50 opacity-60' : ''}`}>
                    <td className="px-4 py-2 text-gray-900">
                      {lot.itemName}
                      <span className="ml-1.5 text-gray-400 font-mono text-[10px]">{lot.itemCode}</span>
                    </td>
                    <td className="px-4 py-2 text-gray-500">{lot.warehouseName}</td>
                    <td className="px-4 py-2 text-right font-mono tabular-nums text-gray-700">{lot.currencyCode} {fmt(lot.unitCost)}</td>
                    <td className="px-4 py-2 text-right font-mono tabular-nums text-gray-700">{fmtQty(lot.qtyInitial)}</td>
                    <td className="px-4 py-2 text-right font-mono tabular-nums">
                      <span className={fullyConsumed ? 'text-red-500' : consumed > 0 ? 'text-amber-600' : 'text-green-700'}>
                        {fmtQty(lot.qtyRemaining)}
                      </span>
                      {consumed > 0 && !fullyConsumed && (
                        <span className="ml-1 text-[10px] text-gray-400">(-{fmtQty(consumed)})</span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-gray-500">{formatDate(lot.purchaseDate)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Section>
      )}
    </div>
  );
}
4
// app/(dashboard)/company/[companyId]/purchases/[purchaseId]/page.tsx
// ═══════════════════════════════════════════════════
// Task 41: Purchase Document Page + Visible Accounting
// ═══════════════════════════════════════════════════
// DRAFT     → editable header + items + Save + Post
// POSTED    → read-only + Accounting Entries + Stock + FIFO
// CANCELLED → read-only + Original + Reversal entries

'use client';

import { useParams, useRouter } from 'next/navigation';
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { ArrowLeft, Loader2, Save, Send } from 'lucide-react';

import PurchaseHeader from '@/components/purchases/PurchaseHeader';
import PurchaseItemsTable from '@/components/purchases/PurchaseItemsTable';
import PurchaseTotals from '@/components/purchases/PurchaseTotals';
import PurchaseHeaderEdit from '@/components/purchases/PurchaseHeaderEdit';
import PurchaseItemsEdit, { type EditableItem } from '@/components/purchases/PurchaseItemsEdit';
import PostedAccountingView from '@/components/purchases/PostedAccountingView';

interface PurchaseItem {
  id: string;
  itemName: string;
  itemCode: string | null;
  quantity: string | number;
  priceWithoutVat: string | number;
  vatRate: string | number | null;
}

interface PurchaseDocument {
  id: string;
  series: string;
  number: string;
  purchaseDate: string;
  payUntil: string | null;
  supplierName: string;
  supplierCode: string | null;
  warehouseName: string;
  operationType: string;
  currencyCode: string;
  employeeName: string | null;
  comments: string | null;
  status: string | null;
  items: PurchaseItem[];
}

interface HeaderForm {
  purchaseDate: string;
  supplierName: string;
  supplierCode: string;
  warehouseName: string;
  currencyCode: string;
  operationType: string;
  comments: string;
}

function toDateInputValue(dateStr: string): string {
  try { return new Date(dateStr).toISOString().split('T')[0]; }
  catch { return ''; }
}

function initHeaderForm(p: PurchaseDocument): HeaderForm {
  return {
    purchaseDate: toDateInputValue(p.purchaseDate),
    supplierName: p.supplierName || '',
    supplierCode: p.supplierCode || '',
    warehouseName: p.warehouseName || 'Main',
    currencyCode: p.currencyCode || 'EUR',
    operationType: p.operationType || 'PURCHASE',
    comments: p.comments || '',
  };
}

function initEditableItems(items: PurchaseItem[]): EditableItem[] {
  return items.map((item) => ({
    id: item.id,
    itemName: item.itemName || '',
    itemCode: item.itemCode || '',
    quantity: Number(item.quantity) || 0,
    priceWithoutVat: Number(item.priceWithoutVat) || 0,
    vatRate: item.vatRate != null ? Number(item.vatRate) : 19,
  }));
}

export default function PurchaseDocumentPage() {
  const params = useParams();
  const router = useRouter();
  const companyId = params.companyId as string;
  const purchaseId = params.purchaseId as string;

  const [purchase, setPurchase] = useState<PurchaseDocument | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [headerForm, setHeaderForm] = useState<HeaderForm | null>(null);
  const [editItems, setEditItems] = useState<EditableItem[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isPosting, setIsPosting] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);

  const isEditable = purchase?.status === 'DRAFT';
  const showAccounting = purchase?.status === 'POSTED' || purchase?.status === 'CANCELLED';

  const fetchPurchase = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await fetch(`/api/company/${companyId}/purchases/${purchaseId}`);
      if (res.status === 404) { setError('Purchase document not found'); return; }
      if (!res.ok) throw new Error('Failed to load purchase');
      const json = await res.json();
      const doc = json.data as PurchaseDocument;
      setPurchase(doc);
      setHeaderForm(initHeaderForm(doc));
      setEditItems(initEditableItems(doc.items));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, [companyId, purchaseId]);

  useEffect(() => { fetchPurchase(); }, [fetchPurchase]);

  async function handleSave() {
    if (!headerForm || !purchase) return;
    setIsSaving(true);
    setSaveMsg(null);
    setError(null);

    try {
      const res = await fetch(`/api/company/${companyId}/purchases/${purchaseId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...headerForm,
          items: editItems.map((item) => ({
            itemName: item.itemName,
            itemCode: item.itemCode || null,
            quantity: item.quantity,
            priceWithoutVat: item.priceWithoutVat,
            vatRate: item.vatRate,
          })),
        }),
      });

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || 'Save failed');
      }

      const json = await res.json();
      const doc = json.data as PurchaseDocument;
      setPurchase(doc);
      setHeaderForm(initHeaderForm(doc));
      setEditItems(initEditableItems(doc.items));
      setSaveMsg('Saved');
      setTimeout(() => setSaveMsg(null), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setIsSaving(false);
    }
  }

  async function handlePost() {
    if (!purchase || !headerForm) return;

    if (editItems.length === 0) {
      setError('Cannot post: add at least one item');
      return;
    }
    if (!headerForm.supplierName.trim()) {
      setError('Cannot post: supplier name is required');
      return;
    }

    const confirmed = window.confirm(
      `Post document ${purchase.series}-${purchase.number}?\n\nThis will create journal entries, stock movements, and FIFO lots.\nThe document will become read-only.`
    );
    if (!confirmed) return;

    setIsPosting(true);
    setError(null);

    try {
      const saveRes = await fetch(`/api/company/${companyId}/purchases/${purchaseId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...headerForm,
          items: editItems.map((item) => ({
            itemName: item.itemName,
            itemCode: item.itemCode || null,
            quantity: item.quantity,
            priceWithoutVat: item.priceWithoutVat,
            vatRate: item.vatRate,
          })),
        }),
      });

      if (!saveRes.ok) {
        const json = await saveRes.json().catch(() => ({}));
        throw new Error(json.error || 'Save before post failed');
      }

      const postRes = await fetch(
        `/api/company/${companyId}/purchases/${purchaseId}/post`,
        { method: 'POST' }
      );

      if (!postRes.ok) {
        const json = await postRes.json().catch(() => ({}));
        throw new Error(json.error || 'Post failed');
      }

      await fetchPurchase();
      setSaveMsg('Posted ✓');
      setTimeout(() => setSaveMsg(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Post failed');
      await fetchPurchase();
    } finally {
      setIsPosting(false);
    }
  }

  function handleHeaderChange(field: keyof HeaderForm, value: string) {
    if (!headerForm) return;
    setHeaderForm({ ...headerForm, [field]: value });
  }

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center py-20">
        <Loader2 className="animate-spin text-gray-300" size={24} />
        <span className="ml-2 text-sm text-gray-400">Loading document...</span>
      </div>
    );
  }

  if (!purchase && (error || !isLoading)) {
    return (
      <div className="p-6">
        <Link href={`/company/${companyId}/purchases`}
          className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 mb-6">
          <ArrowLeft size={14} /> Back to Purchases
        </Link>
        <div className="bg-white border border-gray-200 rounded-lg p-12 text-center">
          <p className="text-gray-500 text-sm">{error || 'Document not found'}</p>
          <button onClick={() => router.push(`/company/${companyId}/purchases`)}
            className="mt-4 text-xs text-blue-600 hover:text-blue-800">← Return to list</button>
        </div>
      </div>
    );
  }

  if (!purchase) return null;

  const totalsItems = isEditable
    ? editItems.map((i) => ({ quantity: i.quantity, priceWithoutVat: i.priceWithoutVat, vatRate: i.vatRate }))
    : purchase.items;

  const actionDisabled = isSaving || isPosting;

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <Link href={`/company/${companyId}/purchases`}
          className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 transition-colors">
          <ArrowLeft size={14} /> Purchases
        </Link>
        {isEditable && (
          <div className="flex items-center gap-2">
            {saveMsg && <span className="text-xs text-green-600 font-medium">{saveMsg}</span>}
            <button onClick={handleSave} disabled={actionDisabled}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white text-xs font-medium rounded-md transition-colors">
              {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              {isSaving ? 'Saving...' : 'Save'}
            </button>
            <button onClick={handlePost} disabled={actionDisabled}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-green-600 hover:bg-green-700 disabled:bg-green-300 text-white text-xs font-medium rounded-md transition-colors">
              {isPosting ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
              {isPosting ? 'Posting...' : 'Post'}
            </button>
          </div>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-2.5 text-sm text-red-700 flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600 text-xs ml-4">✕</button>
        </div>
      )}

      {isEditable && headerForm ? (
        <PurchaseHeaderEdit form={headerForm} onChange={handleHeaderChange}
          series={purchase.series} number={purchase.number} />
      ) : (
        <PurchaseHeader purchase={purchase} />
      )}

      {isEditable ? (
        <PurchaseItemsEdit items={editItems} onChange={setEditItems} />
      ) : (
        <PurchaseItemsTable items={purchase.items} />
      )}

      <PurchaseTotals items={totalsItems}
        currencyCode={isEditable ? (headerForm?.currencyCode || 'EUR') : purchase.currencyCode} />

      {/* ═══ Task 41: Accounting Layer (POSTED/CANCELLED only) ═══ */}
      {showAccounting && (
        <PostedAccountingView companyId={companyId} purchaseId={purchaseId} />
      )}
    </div>
  );
}
5
// app/api/company/[companyId]/purchases/[purchaseId]/route.ts
// ═══════════════════════════════════════════════════
// Task 37A: GET | Task 38B+38B.A: PUT (with validation)
// ═══════════════════════════════════════════════════
// FIX: purchaseDocumentId → purchaseId (matches Prisma schema)

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireTenant } from '@/lib/auth/requireTenant';

type RouteParams = {
  params: Promise<{ companyId: string; purchaseId: string }>;
};

// ─── GET — Read single document ─────────────────
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { tenantId } = await requireTenant(request);
    const { companyId, purchaseId } = await params;

    const company = await prisma.company.findFirst({
      where: { id: companyId, tenantId },
      select: { id: true },
    });
    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    const purchase = await prisma.purchaseDocument.findFirst({
      where: { id: purchaseId, companyId, company: { tenantId } },
      include: { items: { orderBy: { id: 'asc' } } },
    });

    if (!purchase) {
      return NextResponse.json({ error: 'Purchase not found' }, { status: 404 });
    }

    return NextResponse.json({ data: purchase });
  } catch (error: unknown) {
    if (error instanceof Response) return error;
    const msg = error instanceof Error ? error.message : 'Unknown error';
    console.error('Get purchase error:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// ─── PUT — Update DRAFT document (with validation) ─
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { tenantId } = await requireTenant(request);
    const { companyId, purchaseId } = await params;

    const company = await prisma.company.findFirst({
      where: { id: companyId, tenantId },
      select: { id: true },
    });
    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    const body = await request.json();

    // ── Validation BEFORE transaction ────────────
    if (body.purchaseDate) {
      const d = new Date(body.purchaseDate);
      if (isNaN(d.getTime())) {
        return NextResponse.json({ error: 'INVALID_PURCHASE_DATE' }, { status: 400 });
      }
    }

    if (Array.isArray(body.items) && body.items.length > 0) {
      for (let i = 0; i < body.items.length; i++) {
        const item = body.items[i];
        if (!item.itemName || String(item.itemName).trim().length === 0) {
          return NextResponse.json({ error: `ITEM_NAME_REQUIRED (row ${i + 1})` }, { status: 400 });
        }
        if (Number(item.quantity) <= 0 || isNaN(Number(item.quantity))) {
          return NextResponse.json({ error: `ITEM_QTY_MUST_BE_POSITIVE (row ${i + 1})` }, { status: 400 });
        }
        if (Number(item.priceWithoutVat) < 0 || isNaN(Number(item.priceWithoutVat))) {
          return NextResponse.json({ error: `ITEM_PRICE_MUST_BE_NON_NEGATIVE (row ${i + 1})` }, { status: 400 });
        }
        if (item.vatRate != null) {
          const vr = Number(item.vatRate);
          if (isNaN(vr) || vr < 0 || vr > 100) {
            return NextResponse.json({ error: `ITEM_VAT_RATE_INVALID (row ${i + 1})` }, { status: 400 });
          }
        }
      }

      if (!body.supplierName || String(body.supplierName).trim().length === 0) {
        return NextResponse.json({ error: 'SUPPLIER_NAME_REQUIRED_WITH_ITEMS' }, { status: 400 });
      }
      if (!body.warehouseName || String(body.warehouseName).trim().length === 0) {
        return NextResponse.json({ error: 'WAREHOUSE_NAME_REQUIRED_WITH_ITEMS' }, { status: 400 });
      }
    }

    // ── Transaction ─────────────────────────────
    const result = await prisma.$transaction(async (tx) => {
      const purchase = await tx.purchaseDocument.findFirst({
        where: { id: purchaseId, companyId, company: { tenantId } },
        select: { id: true, status: true },
      });

      if (!purchase) throw new Error('PURCHASE_NOT_FOUND');
      if (purchase.status !== 'DRAFT') throw new Error('ONLY_DRAFT_EDITABLE');

      await tx.purchaseDocument.update({
        where: { id: purchaseId },
        data: {
          purchaseDate: body.purchaseDate ? new Date(body.purchaseDate) : undefined,
          supplierName: body.supplierName ?? undefined,
          supplierCode: body.supplierCode ?? undefined,
          warehouseName: body.warehouseName ?? undefined,
          currencyCode: body.currencyCode ?? undefined,
          operationType: body.operationType ?? undefined,
          comments: body.comments ?? undefined,
        },
      });

      if (Array.isArray(body.items)) {
        await tx.purchaseItem.deleteMany({ where: { purchaseId } });

        if (body.items.length > 0) {
          await tx.purchaseItem.createMany({
            data: body.items.map((item: {
              itemName: string; itemCode?: string; quantity: number; priceWithoutVat: number; vatRate?: number;
            }) => ({
              purchaseId,      // ← matches Prisma schema field name
              itemName: String(item.itemName).trim(),
              itemCode: item.itemCode || null,
              quantity: Number(item.quantity),
              priceWithoutVat: Number(item.priceWithoutVat),
              vatRate: item.vatRate != null ? Number(item.vatRate) : null,
            })),
          });
        }
      }

      return tx.purchaseDocument.findUniqueOrThrow({
        where: { id: purchaseId },
        include: { items: { orderBy: { id: 'asc' } } },
      });
    });

    return NextResponse.json({ data: result });
  } catch (error: unknown) {
    if (error instanceof Response) return error;
    const msg = error instanceof Error ? error.message : 'Unknown error';

    if (msg === 'PURCHASE_NOT_FOUND') return NextResponse.json({ error: 'Purchase not found' }, { status: 404 });
    if (msg === 'ONLY_DRAFT_EDITABLE') return NextResponse.json({ error: 'Only DRAFT documents can be edited' }, { status: 400 });

    console.error('Update purchase error:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
6
// app/api/company/[companyId]/purchases/[purchaseId]/receipt/route.ts
// ═══════════════════════════════════════════════════
// Task 41.7: Purchase Receipt (Goods Received)
// ═══════════════════════════════════════════════════
// Returns structured data for warehouse receipt view/print

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireTenant } from '@/lib/auth/requireTenant';

type RouteParams = {
  params: Promise<{ companyId: string; purchaseId: string }>;
};

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { tenantId } = await requireTenant(request);
    const { companyId, purchaseId } = await params;

    const company = await prisma.company.findFirst({
      where: { id: companyId, tenantId },
      select: { id: true, name: true },
    });
    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    const purchase = await prisma.purchaseDocument.findFirst({
      where: { id: purchaseId, companyId, company: { tenantId } },
      include: { items: { orderBy: { id: 'asc' } } },
    });

    if (!purchase) {
      return NextResponse.json({ error: 'Purchase not found' }, { status: 404 });
    }

    if (purchase.status !== 'POSTED' && purchase.status !== 'CANCELLED') {
      return NextResponse.json({ error: 'Receipt only available for posted documents' }, { status: 400 });
    }

    // Build receipt data
    const items = purchase.items.map((item, idx) => ({
      line: idx + 1,
      itemName: item.itemName,
      itemCode: item.itemCode,
      quantity: Number(item.quantity),
      unitPrice: Number(item.priceWithoutVat),
      vatRate: item.vatRate ? Number(item.vatRate) : 0,
      netTotal: Number(item.quantity) * Number(item.priceWithoutVat),
    }));

    const netTotal = items.reduce((s, i) => s + i.netTotal, 0);
    const vatTotal = items.reduce((s, i) => s + i.netTotal * (i.vatRate / 100), 0);

    return NextResponse.json({
      receipt: {
        companyName: company.name,
        documentNumber: `${purchase.series}-${purchase.number}`,
        documentDate: purchase.purchaseDate,
        supplierName: purchase.supplierName,
        supplierCode: purchase.supplierCode,
        warehouseName: purchase.warehouseName,
        currencyCode: purchase.currencyCode,
        status: purchase.status,
        items,
        totals: {
          netTotal,
          vatTotal,
          grossTotal: netTotal + vatTotal,
          itemCount: items.length,
          totalQuantity: items.reduce((s, i) => s + i.quantity, 0),
        },
        meta: {
          type: 'GOODS_RECEIVED',
          generatedAt: new Date().toISOString(),
        },
      },
    });
  } catch (error: unknown) {
    if (error instanceof Response) return error;
    const msg = error instanceof Error ? error.message : 'Unknown error';
    console.error('Get receipt error:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
