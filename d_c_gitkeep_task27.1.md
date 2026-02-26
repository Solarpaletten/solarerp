D=>L (Dashka=>Leanid) Принято. Аудитор прав: это **P0/P1** и их нужно закрыть до мержа. Я не буду “спорить” — фиксирую правки как обязательные и даю инженеру точную корректировку (D=>C), плюс твой acceptance checklist превращаю в DoD.

---

## D=>C (Dashka=>Claude) — Task 27: P0/P1 Fix Pack (обязателен до main)

### 🔴 P0-1: Дата CANCELLED / reversal должна быть детерминирована

**Запрещено** `new Date()` в rebuild.

**Правило:**

* `SALE.date = sale.saleDate`
* `SALE_REVERSAL.date = sale.saleDate`
* `PURCHASE.date = purchase.purchaseDate`
* `PURCHASE_REVERSAL.date = purchase.purchaseDate`

Где именно:

* в `repostingService.ts` при создании entries для CANCELLED (и базовых тоже) — указывать `date` явно из документа.

### 🔴 P0-2: Prisma-first migration (никаких “ручных 2 SQL” как deliverable)

Требование:

1. `schema.prisma` обновлён:

   * `JournalSource` enum
   * `JournalEntry.source`
   * account mapping поля в Sale/Purchase
2. миграция создана **через Prisma migrate**:

   * `prisma/migrations/<ts>_task27_reposting/.../migration.sql`

Backfill:

* либо **scripts/backfill_task27.ts** (PrismaClient) — рекомендовано
* либо SQL, но оформленный как **manual one-off** (docs + команда), не как “migration.sql №2”.

### 🟠 P1-1: Period lock check — строго по всем месяцам в диапазоне

Нельзя проверять только from/to месяц.

Алгоритм:

* построить список `{year, month}` для всех месяцев от from..to
* запрос:

  * `AccountingPeriod` (или ваша таблица lock’ов)
  * `companyId`, `isClosed=true`, `(year,month) in list`
* если найдено хоть одно → `409 PERIOD_CLOSED` до любых delete/create.

Положить в коде отдельную функцию, чтобы было прозрачно.

### 🟠 P1-2: Backfill deterministic (если используем из ledger)

Если сохраняем SQL/скрипт backfill:

* выбирать только `JournalEntry.source=SYSTEM`
* ограничить `documentType in ('SALE','PURCHASE')` (и purchase аналогично если типы разные)
* `debitAccountId` = line где `debit > 0`
* `creditAccountId` = line где `credit > 0`
* если entry отсутствует или не находится ровно 1 debit+1 credit → **abort** (409/throw) и вывести список documentId.

В `TASK27_REPORT.md` подробно описать:

* какие entries берём
* как выбираем debit/credit
* что делаем при ошибке

### 🟡 P2: to-date boundary

В delete и selection ranges:

* `toEnd = new Date(\`${to}T23:59:59.999Z`)`
* использовать `lte: toEnd`

---

## ✅ DoD / Acceptance (прямо по чек-листу Leanid)

1. CANCELLED rebuild не создаёт reversal с `today()`
2. пересечение с закрытым месяцем → `409 PERIOD_CLOSED`
3. deleteMany только `source=SYSTEM` (MANUAL остаётся)
4. повторный `/repost` даёт те же counts
5. backfill не оставляет NULL там, где проводка есть; при неопределённости — abort с указанием documentId

Формат ответа: **C=>D** с:

* ссылкой/путями миграции Prisma
* ключевыми фрагментами кода (period-check, cancelled recreate, deleteMany)
* `TASK27_REPORT.md`

---

D=>L: Я зафиксировала “Gate: FAIL until patched” по Task 27 из-за P0 дат и prisma-first миграции. Как Claude пришлёт патч/архив — я делаю один проход по 3 ключевым блокам и выношу PASS/FAIL.
