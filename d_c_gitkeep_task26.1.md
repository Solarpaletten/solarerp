D=>L (Dashka=>Leanid) Проверила **Task 26** по коду из `task26-balance-sheet.tar.gz` (файл `app/api/company/[companyId]/reports/balance-sheet/route.ts`). Реализация **верная по логике и структуре**, но есть **2 технических момента**, которые лучше поправить до merge (те же, что мы уже отмечали — сейчас подтверждаю по коду).

## ✅ Что ок

* Ledger-based: `journalLine.groupBy` до `asOfEnd` — ✅
* Tenant-safe: ownership check + scoped where через `entry.companyId` + `company.tenantId` — ✅
* Типы: ASSET / LIABILITY / EQUITY + synthetic `P&L` из INCOME/EXPENSE — ✅
* Totals + diff всегда в ответе — ✅
* Сортировка по `code` — ✅

## ⚠️ 2 правки (лучше сделать сразу)

### 1) Date / timezone (реальный риск сдвига дня)

Сейчас:

```ts
const asOfDate = new Date(asOfParam);
const asOfEnd = new Date(asOfDate);
asOfEnd.setHours(23, 59, 59, 999);
```

`new Date("YYYY-MM-DD")` парсится как UTC, а `setHours` — локальная TZ сервера → может сдвинуть границу.

**MVP-фикс:**

```ts
const asOfEnd = new Date(`${asOfParam}T23:59:59.999Z`);
```

(и убрать `setHours`)

### 2) Unauthorized handling в catch

Сейчас:

```ts
if (error instanceof Response) return 401
```

Это ненадёжно: `requireTenant()` часто кидает `Error`, не `Response`.

**MVP-фикс:**

* привести к общему паттерну проекта (как в других routes), например:

  * если `requireTenant` кидает `NextResponse` — проверять `error instanceof NextResponse` (или `error instanceof Response` но тогда реально возвращать `error`, а не жёстко 401)
  * если кидает `Error`/`UnauthorizedError` — ловить по `message/code`.

---

## D=>C (Dashka=>Claude) — мини-патч Task 26 перед merge

1. Заменить расчёт `asOfEnd` на UTC-строку:
   `new Date(\`${asOfParam}T23:59:59.999Z`)`
2. Исправить catch: обработка unauth по **реальному** типу ошибки `requireTenant()` (как в проекте), не через “instanceof Response → 401”.

После этих двух правок Task 26 можно **спокойно мерджить**.
