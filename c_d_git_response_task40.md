Выдаю все файлы Purchase модуля — полные финальные версии после Task 40 аудита.
FRONTEND PAGES (3 файла)Created 3 filesCreated 3 filesPurchases list page — Task 36Apurchases-page.tsxNew purchase draft redirect — Task 38Anew-purchase-page.tsxPurchase document page — dual mode — Task 37+38+39+40 finalpurchase-document-page.tsxDoneCOMPONENTS (6 файлов)Created 4 filesCreated 4 filesPurchaseActionBar — Task 36APurchaseActionBar.tsxPurchaseTable — Task 36A list tablePurchaseTable.tsxPurchaseHeader — read-only — Task 37APurchaseHeader.tsxPurchaseHeaderEdit — editable DRAFT header — Task 38BPurchaseHeaderEdit.tsxDoneПродолжаю выдачу — оставшиеся компоненты + все API routes.
COMPONENTS (продолжение)Created 3 filesCreated 3 filesPurchaseItemsTable — read-only items — Task 37BPurchaseItemsTable.tsxPurchaseItemsEdit — editable items grid — Task 38BPurchaseItemsEdit.tsxPurchaseTotals — accounting totals block with VAT grouping — Task 37CPurchaseTotals.tsxDoneAPI BACKEND (5 файлов)Created 5 filesCreated 5 filesGET + POST /purchases — list + heavy create (legacy) — original routepurchases-route.tsPOST /purchases/draft — lightweight draft creation — Task 38Adraft-purchase-route.tsGET + PUT /purchases/[purchaseId] — read + update DRAFT — Task 37A + 38B.Apurchase-id-route.tsPOST /purchases/[purchaseId]/post — Posting Engine — Task 39+40post-purchase-route.tsPOST /purchases/[purchaseId]/cancel — STORNO — existing cancel routecancel-purchase-route.tsDoneNow present all files:Presented 15 filesPresented 15 filesPresented 15 filesDoneC=>D — Полный комплект Purchase модуля: 15 файлов
Деплой карта
bash# ═══ PAGES (3) ═══════════════════════════════════
cp pages/purchases-page.tsx \
   app/\(dashboard\)/company/\[companyId\]/purchases/page.tsx

cp pages/new-purchase-page.tsx \
   app/\(dashboard\)/company/\[companyId\]/purchases/new/page.tsx

cp pages/purchase-document-page.tsx \
   app/\(dashboard\)/company/\[companyId\]/purchases/\[purchaseId\]/page.tsx

# ═══ COMPONENTS (6) ══════════════════════════════
cp components/PurchaseActionBar.tsx    components/purchases/PurchaseActionBar.tsx
cp components/PurchaseTable.tsx        components/purchases/PurchaseTable.tsx
cp components/PurchaseHeader.tsx       components/purchases/PurchaseHeader.tsx
cp components/PurchaseHeaderEdit.tsx   components/purchases/PurchaseHeaderEdit.tsx
cp components/PurchaseItemsTable.tsx   components/purchases/PurchaseItemsTable.tsx
cp components/PurchaseItemsEdit.tsx    components/purchases/PurchaseItemsEdit.tsx
cp components/PurchaseTotals.tsx       components/purchases/PurchaseTotals.tsx

# ═══ API ROUTES (5+cancel) ══════════════════════
cp api/purchases-route.ts \
   app/api/company/\[companyId\]/purchases/route.ts

cp api/draft-purchase-route.ts \
   app/api/company/\[companyId\]/purchases/draft/route.ts

cp api/purchase-id-route.ts \
   app/api/company/\[companyId\]/purchases/\[purchaseId\]/route.ts

cp api/post-purchase-route.ts \
   app/api/company/\[companyId\]/purchases/\[purchaseId\]/post/route.ts

cp api/cancel-purchase-route.ts \
   app/api/company/\[companyId\]/purchases/\[purchaseId\]/cancel/route.ts
Сводная таблица
#ФайлНазначениеTasksPages1purchases/page.tsxList + selection + actions36A2purchases/new/page.tsxDraft create + redirect38A3purchases/[id]/page.tsxDual mode (DRAFT/POSTED)37+38+39+40Components4PurchaseActionBar.tsxToolbar (Create/Edit/Delete/Copy)36A5PurchaseTable.tsxList table with status badges36A6PurchaseHeader.tsxRead-only header37A7PurchaseHeaderEdit.tsxEditable header (DRAFT)38B8PurchaseItemsTable.tsxRead-only items37B9PurchaseItemsEdit.tsxEditable items + Add/Delete38B10PurchaseTotals.tsxTotals with VAT grouping37CAPI11GET+POST /purchasesList + legacy full createbase12POST /purchases/draftLightweight DRAFT creation38A13GET+PUT /purchases/[id]Read + update DRAFT (validated)37A+38B.A14POST /purchases/[id]/postPosting Engine (auto accounts)39+4015POST /purchases/[id]/cancelSTORNO reversal23+24+34+35Purchases pageCode · TSX DownloadNew purchase pageCode · TSX DownloadPurchase document pageCode · TSX DownloadPurchaseactionbarCode · TSX DownloadPurchasetableCode · TSX DownloadPurchaseheaderCode · TSX DownloadPurchaseheadereditCode · TSX DownloadPurchaseitemstableCode · TSX DownloadPurchaseitemseditCode · TSX DownloadPurchasetotalsCode · TSX DownloadPurchases routeTS DownloadDraft purchase routeTS DownloadPurchase id routeTS DownloadPost purchase routeTS DownloadCancel purchase routeTS DownloadDownload all