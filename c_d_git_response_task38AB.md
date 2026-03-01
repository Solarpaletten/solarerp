Полное ТЗ получено — Task 38B.A (валидация PUT) + Task 39 (Posting Engine). Два файла: обновлённый API route + обновлённая page + post endpoint. Приступаю.Clean outputsClean outputsClean outputsScriptDoneLet me check existing imports for journal/stock/fifo services:Searched project for “createJournalEntry createStockMovement createStockLot import purchase route”Searched project for “createJournalEntry createStockMovement createStockLot import purchase route”Searched project for “createJournalEntry createStockMovement createStockLot import purchase route”4 resultsd_c_gitkeep_task38AB.mdtextsmart/kodrewyu.md2 relevant sectionstextmiddleware.tstextapp/api/company/[companyId]/sales/route.tstextDoneNow I have all context. Let me check existing imports used in the purchase route:Searched project for “createStockLot fifoService import purchase FIFO lot creation”Searched project for “createStockLot fifoService import purchase FIFO lot creation”Searched project for “createStockLot fifoService import purchase FIFO lot creation”2 resultslib/accounting/fifoService.ts2 relevant sectionstextapp/api/company/[companyId]/purchases/[purchaseId]/cancel/route.tstextDoneNow I have full context on imports and service signatures. Let me build all 3 files:Updated PUT with validation + GET — purchase [purchaseId] route (Task 38B.A)Updated PUT with validation + GET — purchase [purchaseId] route (Task 38B.A)Updated PUT with validation + GET — purchase [purchaseId] route (Task 38B.A)purchase-api-route.tsDoneNow the Posting Engine endpoint:Task 39 — POST /post endpoint: DRAFT → POSTED with journal + stock + FIFO in single transactionTask 39 — POST /post endpoint: DRAFT → POSTED with journal + stock + FIFO in single transactionTask 39 — POST /post endpoint: DRAFT → POSTED with journal + stock + FIFO in single transactionpost-purchase-route.tsDoneNow update the page with active Post button:Created a file, read a fileCreated a file, read a fileUpdated page — Post button active, calls /post endpoint, transitions to read-only on successpurchase-document-page.tsxPresented 3 filesDoneC=>D — Task 38B.A + Task 39: Validation + Posting Engine — READY
3 файла для деплоя
ФайлКудаСтрокНазначениеpurchase-api-route.tsapp/api/company/[companyId]/purchases/[purchaseId]/route.ts175GET + PUT with validation (replaces 38B)post-purchase-route.tsapp/api/company/[companyId]/purchases/[purchaseId]/post/route.ts210NEW — Posting Enginepurchase-document-page.tsxapp/(dashboard)/company/[companyId]/purchases/[purchaseId]/page.tsx270Updated page — active Post button
Деплой
bash# 1. Updated PUT with validation
cp purchase-api-route.ts app/api/company/\[companyId\]/purchases/\[purchaseId\]/route.ts

# 2. NEW Posting Engine endpoint
mkdir -p app/api/company/\[companyId\]/purchases/\[purchaseId\]/post
cp post-purchase-route.ts app/api/company/\[companyId\]/purchases/\[purchaseId\]/post/route.ts

# 3. Updated page with active Post
cp purchase-document-page.tsx app/\(dashboard\)/company/\[companyId\]/purchases/\[purchaseId\]/page.tsx
```

---

### A) PUT Validation (38B.A)

Валидация выполняется **ДО транзакции** — мусорные данные не попадают в БД:

| Проверка | Ошибка | Код |
|---|---|---|
| Невалидная дата | `INVALID_PURCHASE_DATE` | 400 |
| Пустое itemName | `ITEM_NAME_REQUIRED (row N)` | 400 |
| quantity ≤ 0 | `ITEM_QTY_MUST_BE_POSITIVE (row N)` | 400 |
| price < 0 | `ITEM_PRICE_MUST_BE_NON_NEGATIVE (row N)` | 400 |
| vatRate 0-100 | `ITEM_VAT_RATE_INVALID (row N)` | 400 |
| Items present → supplierName empty | `SUPPLIER_NAME_REQUIRED_WITH_ITEMS` | 400 |
| Items present → warehouseName empty | `WAREHOUSE_NAME_REQUIRED_WITH_ITEMS` | 400 |

---

### B) Posting Engine (Task 39)

`POST /api/company/[companyId]/purchases/[purchaseId]/post`

Single `$transaction`:
```
1. Load document + items
2. Guard: status must be DRAFT
3. Validate header + items (strict)
4. assertPeriodOpen
5. Resolve debitAccountId / creditAccountId
6. Calculate totalAmount (net)
7. createJournalEntry (DR Inventory / CR Payable)
8. createStockMovement IN × each item
9. createStockLot × each item (FIFO)
10. status → POSTED
```

| Error | HTTP | When |
|---|---|---|
| `ALREADY_POSTED` | 409 | Re-posting attempt |
| `MISSING_POSTING_ACCOUNTS` | 400 | No debit/credit accounts |
| `AT_LEAST_ONE_ITEM_REQUIRED` | 400 | Empty document |
| `PERIOD_CLOSED` | 409 | Period locked |
| All item validations | 400 | Bad data |

### UI: Post Button Flow
```
[Save] [Post]
  ↓ Post clicked
  ↓ confirm() dialog
  ↓ auto-save (PUT) → persist latest edits
  ↓ POST /post → journal + stock + FIFO + POSTED
  ↓ UI transitions to read-only
  ↓ "Posted ✓" flash
ТребованиеСтатусPUT validates items before save✅Mусор не попадает в БД✅ validation before txPost creates journal entry✅Post creates stock movements IN✅Post creates FIFO lots✅Post changes status → POSTED✅All in single transaction✅POSTED → read-only (no re-edit)✅POSTED → no re-post (409)✅Front-end pre-validation✅ items + supplierAuto-save before post✅Tenant isolation✅
Готов к Gate Review.Purchase document pageCode · TSX DownloadPurchase api routeTS DownloadPost purchase routeTS 