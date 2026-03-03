L=>D ✅ Принято. Я внимательно прочитала `task41.md` — там реально **всё собрано в одну пачку**: и ответ Claude, и готовые файлы для Task 41 (Visible Accounting Layer), и отдельный фикс под текущую ошибку.

Сейчас у нас **одна блокирующая проблема**, из-за которой “приход не проводится” и даже **Save (PUT)** падает:

### 🔥 Root cause (то, что ты видишь в ошибке)

`prisma.purchaseItem.createMany()` ругается: **Argument `purchaseId` is missing**.

В **Prisma schema** у `PurchaseItem` связь называется **purchaseId**, а не `purchaseDocumentId`.
А твой текущий PUT шлёт/создаёт `purchaseDocumentId`, из-за этого Prisma требует `purchaseId` и падает 500.

➡️ Фикс уже подготовлен Claude в файле **`purchase-id-route.ts`** (в составе Task 41 набора). Его надо применить.

---

## ✅ D=>C — ТЗ для Claude (сегодня закрываем Task 41 + блокер)

### Цель дня

1. **Стабилизировать Purchases Save (PUT)** — убрать `purchaseId missing`.
2. **Сделать “Visible Accounting Layer”**: после POST показать:

* проводки (дебет/кредит, 3 строки с НДС),
* складской приход (Stock Movement IN),
* FIFO lots,
* (опц.) “приходный ордер / receipt” endpoint.

---

## 1) FIX: PUT Purchase Items (блокер `purchaseId missing`)

**Внедрить файл из набора Task41:**

* взять `purchase-id-route.ts`
* заменить им:
  `app/api/company/[companyId]/purchases/[purchaseId]/route.ts`

**Acceptance criteria**

* Save на странице Purchase больше не даёт 500
* Items сохраняются, список items грузится обратно корректно

---

## 2) Posting Engine: 3-line VAT journal + stock + FIFO

**Внедрить:**

* `post-purchase-route.ts` →
  `app/api/company/[companyId]/purchases/[purchaseId]/post/route.ts`

**Ключевая логика**

* Journal lines должны быть **3 строки**:

  * DR Inventory (net)
  * DR Input VAT (vat)
  * CR Payables (gross)

**Acceptance criteria**

* POST переводит DRAFT → POSTED
* создаётся journal entry (3 lines, balanced)
* создаются stock movements IN
* создаются FIFO lots

---

## 3) Accounting API для просмотра после POST

**Внедрить:**

* `accounting-route.ts` →
  `app/api/company/[companyId]/purchases/[purchaseId]/accounting/route.ts`

**Acceptance criteria**

* GET возвращает:

  * journal entries + lines + account info
  * stockMovements
  * stockLots

---

## 4) Receipt API (приходный ордер товара)

**Внедрить:**

* `receipt-route.ts` →
  `app/api/company/[companyId]/purchases/[purchaseId]/receipt/route.ts`

**Acceptance criteria**

* GET отдаёт данные для “Goods Receipt” (для печати/экранного отображения)

---

## 5) UI: Visible Accounting View на POSTED документе

**Внедрить:**

* `PostedAccountingView.tsx` → `components/purchases/PostedAccountingView.tsx`
* `purchase-document-page.tsx` →
  `app/(dashboard)/company/[companyId]/purchases/[purchaseId]/page.tsx`

**Acceptance criteria**

* В режиме POSTED страница показывает:

  * таблицу проводок (debit/credit + коды счетов)
  * VAT summary
  * stock movements
  * FIFO lots
* В режиме DRAFT остаётся edit + Save + Post

---

## 6) Мини-план теста (Claude обязан пройти)

1. Создать DRAFT Purchase, добавить 1 item (qty=1, price=100, vat=19)
2. **Save** (PUT) → 200 OK
3. **Post** → 200 OK, статус POSTED
4. Открыть `/accounting` → видеть journal (3 lines), stock movement, lots
5. UI: POSTED показывает “двойную запись” и суммы совпадают

---

## Деплой-команды (как в `task41.md`)

Claude берёт файлы (они уже у тебя загружены) и копирует:

```bash
cp post-purchase-route.ts app/api/company/\[companyId\]/purchases/\[purchaseId\]/post/route.ts
cp accounting-route.ts    app/api/company/\[companyId\]/purchases/\[purchaseId\]/accounting/route.ts
cp receipt-route.ts       app/api/company/\[companyId\]/purchases/\[purchaseId\]/receipt/route.ts
cp purchase-id-route.ts   app/api/company/\[companyId\]/purchases/\[purchaseId\]/route.ts
cp PostedAccountingView.tsx components/purchases/PostedAccountingView.tsx
cp purchase-document-page.tsx app/\(dashboard\)/company/\[companyId\]/purchases/\[purchaseId\]/page.tsx
```

---

## D=>L (коротко, по ритму)

Сегодня закрываем **Task 41**. Это ровно то, что ты описал как бухгалтер:

* “провелось” → видно дебет/кредит, НДС, складской приход, ордер/receipt.

Если хочешь — следующим шагом после Task 41 я распишу **Task 42**: *Purchase Posting UX* (кнопка “Print receipt”, “View Journal”, “Reverse posting”, блок “Accounts used”).
