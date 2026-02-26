Принято. ТЗ **консолидировано правильно** и в нужной логике: **Task 27 = Aggressive Rebuild (SYSTEM-only) + `JournalEntry.source`**, с обязательным условием **account mapping хранится в документах**, иначе rebuild “из документов” физически невозможен.

Чтобы у нас не было разночтений при передаче инженеру, фиксирую **финальный “single source of truth”** в 10 пунктах (это и есть то самое обобщённое ТЗ, которое можно копировать 1:1).

---

## ✅ FINAL SPEC — Task 27: Reposting Engine (Aggressive Rebuild, SYSTEM-only)

### 1) Prisma: `JournalEntry.source`

Добавить `JournalSource { SYSTEM, MANUAL }` и поле `source` в `JournalEntry` (default SYSTEM), индексы:

* `@@index([companyId, date])`
* `@@index([companyId, source])`

### 2) Preconditions: Account Mapping в документах (обязательно)

Чтобы rebuild строился “из документов”, документы должны хранить счёта проводки:

* `SaleDocument.debitAccountId`
* `SaleDocument.creditAccountId`
* `PurchaseDocument.debitAccountId`
* `PurchaseDocument.creditAccountId`

Если этих полей нет → добавить миграцией + backfill из текущего ledger **один раз**.

### 3) Endpoint

`POST /api/company/[companyId]/repost`

Body:

```json
{ "from": "YYYY-MM-DD", "to": "YYYY-MM-DD" }
```

### 4) Safety / Guards

* `requireTenant`
* company принадлежит tenant
* validate dates
* Проверка period lock: если диапазон пересекает закрытый месяц → `409 PERIOD_CLOSED`
* Всё выполняется внутри `prisma.$transaction`

### 5) Step A: собрать документы в диапазоне

* Sales: `saleDate between from..to` (включая CANCELLED)
* Purchases: `purchaseDate between from..to` (включая CANCELLED)
  Собрать статистику (sales/purchases/cancelledSales/cancelledPurchases)

### 6) Step B: удалить SYSTEM journal entries в диапазоне

В транзакции удалить только:

* `companyId = ...`
* `source = SYSTEM`
* `date in range`

Важно: MANUAL не трогать. JournalLine должны удаляться каскадом.

### 7) Step C: пересоздать SYSTEM entries из документов

Только через `createJournalEntry(tx, ...)`:

**Sale:**

* если `status !== CANCELLED` → `SALE`
* если `status === CANCELLED` → `SALE` + `SALE_REVERSAL` (зеркальные линии)

**Purchase:**

* аналогично `PURCHASE` + `PURCHASE_REVERSAL`

Счета берём из `debitAccountId/creditAccountId`.

### 8) Data integrity rule (MVP)

Если в документе отсутствуют debit/credit accountId → прекращаем rebuild и возвращаем ошибку:

* `409 MISSING_POSTING_PROFILE` (лучше) + `documentId`

### 9) Idempotency

Повторный вызов `/repost` даёт тот же итог (удалили SYSTEM → создали SYSTEM заново).

### 10) Response

```json
{
  "range": { "from": "...", "to": "..." },
  "deletedEntries": 42,
  "recreatedEntries": 42,
  "documentsProcessed": {
    "sales": 12,
    "purchases": 8,
    "cancelledSales": 2,
    "cancelledPurchases": 1
  }
}
```

Deliverables:

* `app/api/company/[companyId]/repost/route.ts`
* `lib/accounting/repostingService.ts`
* prisma migration (source + indexes)
* (если надо) migration + backfill accountId в documents
* `TASK27_REPORT.md` (migrate, backfill, curl tests, expected outputs)

---

## D=>L (Dashka=>Leanid) — статус

✅ ТЗ собрано и зафиксировано.
⚠️ Ключевая “точка истины”: **без accountId в документах rebuild не восстановит проводки** — это мы правильно включили как precondition.

Если хочешь — дальше я сразу дам **Gate-checklist для аудита Task 27** (чтобы на приёмке за 3 минуты понять: “принять/вернуть”).
