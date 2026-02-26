D=>L (Dashka=>Leanid) Принято. Да — фиксируем **Task 26 = Balance Sheet (Bilanz) агрегатор на дату (asOf) из Ledger** + **строка “Current Period Result”** (net profit до asOf). Это правильная последовательность: теперь мы “читаем” бухгалтерию полноценным отчётом.

Запускаю инженеру точное ТЗ (D=>C) + критерии теста.

---

## D=>C (Dashka=>Claude) — ТЗ Task 26 (MVP): Balance Sheet Aggregator (Ledger-based) + Current Period Result

### 1) Endpoint

`GET /api/company/[companyId]/reports/balance-sheet?asOf=YYYY-MM-DD`

### 2) Валидация

* `asOf` обязателен, формат `YYYY-MM-DD`
* `asOfDateEnd = 23:59:59.999` (лучше в UTC-формате, как договоримся для pnl/osv)

### 3) Данные и агрегация (ledger truth)

* Берём **все JournalLine** для `companyId` с `date <= asOfDateEnd`
* Группируем по `accountId`
* Суммы: `SUM(debit)`, `SUM(credit)`
* Базовый баланс:
  `rawBalance = sumDebit - sumCredit`

### 4) Классификация по Account.type

Подтянуть `Account` по `accountId`, и разложить:

* `ASSET`: `displayBalance = rawBalance`
* `LIABILITY` и `EQUITY`: `displayBalance = -rawBalance` *(чтобы в отчёте было “положительно”)*

Возвращаем массивы:

* `assets[]`, `liabilities[]`, `equity[]`
  Формат элемента:

```ts
{ accountId, code, name, balance }
```

Сортировка по `code` ASC.

### 5) Tenant safety

Как в pnl/osv:

* проверка company ownership tenant’ом
* where на lines через `companyId`
* (если в проекте принято) дополнительный scope через `company.tenantId`

### 6) Hard rule: баланс сходится

* totals:

  * `assets = sum(assets.balance)`
  * `liabilities = sum(liabilities.balance)`
  * `equity = sum(equity.balance)` *(включая строку прибыли, см. ниже)*
  * `liabilitiesPlusEquity = liabilities + equity`
  * `diff = assets - liabilitiesPlusEquity`
* MVP: допускаем `abs(diff) <= 0.01`
* Поведение:

  * **возвращаем 200 всегда**, но включаем `diff` (для дебага).
    *(Не 409 — иначе будем блокировать тестовые данные и разработку.)*

### 7) Интеграция P&L: “Current Period Result”

Добавить в `equity` отдельную строку:

* `code: "P&L"`
* `name: "Current Period Result"`
* `balance = netProfit(from: 1900-01-01, to: asOf)`
  Где `netProfit` считается **внутри этого endpoint** (не HTTP-call к pnl):
* по Account.type IN (INCOME, EXPENSE)
* groupBy/суммы как в pnl
* INCOME amount = credit - debit
* EXPENSE amount = debit - credit
* `netProfit = sum(income) - sum(expenses)`

### 8) Response (MVP)

```json
{
  "asOf": "2026-02-26",
  "assets": [],
  "liabilities": [],
  "equity": [],
  "totals": {
    "assets": 0,
    "liabilities": 0,
    "equity": 0,
    "liabilitiesPlusEquity": 0,
    "diff": 0
  }
}
```

### 9) Файл

`app/api/company/[companyId]/reports/balance-sheet/route.ts`

### 10) DoD / Тесты

* curl пример:

  * `GET .../reports/balance-sheet?asOf=2026-02-26`
* Проверки:

  1. tenant-safe (чужая company недоступна)
  2. equity содержит строку `Current Period Result`
  3. diff отображается и на seed `abs(diff) <= 0.01`

Формат отчёта: **C=>D** (файл, как тестировать, пример ответа).

---

D=>L: Task 26 зафиксирован и отдан инженеру. Следующий после этого логичный шаг будет **Task 27: Closing/Reposting Engine (period close → retained earnings)**, но пока не трогаем — сначала доводим Bilanz MVP.