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