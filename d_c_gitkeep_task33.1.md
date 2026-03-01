D=>C (ТЗ для Claude) — **Аудит и доведение `skr03-import-route.ts` до DATEV+ уровня**

## 0) Цель

Сделать импорт SKR03 в Solar ERP **безопасным как в DATEV**: tenant-safe, идемпотентным, с корректными режимами merge/reset, и с защитой Stammkonten и счетов с проводками.

**Файл в фокусе:**
`app/api/company/[companyId]/chart-of-accounts/import/skr03/route.ts` (skr03-import-route.ts)

---

## 1) Обязательные инварианты (не обсуждаются)

### 1.1 Tenant isolation

* Импорт выполняется **только** внутри текущего tenant.
* Company должна принадлежать tenant.

✅ Требование:

* `requireTenant()` обязателен.
* `verifyCompanyOwnership(companyId, tenantId)` или equivalent — обязателен.
* Никаких операций по `companyId` без tenant-check.

### 1.2 Источник Stammkonten — единый

* Список защищённых системных счетов берётся **только** из:
  `lib/accounting/protectedAccounts.ts`
* Никаких локальных копий массива в route.

---

## 2) Идемпотентность (5 кликов Import ≠ 2000 счетов)

Импорт должен быть защищён в 3 слоя:

### Layer A — pre-filter

* Загрузи существующие счета компании (`select code`)
* Отфильтруй новые из CSV, чтобы не создавать уже существующие.

### Layer B — createMany skipDuplicates

* `createMany({ skipDuplicates: true })`

### Layer C — DB-level unique

* В Prisma schema должен быть уникальный индекс:
  `@@unique([companyId, code])`

Если индекса нет — добавить миграцию.
(Иначе race-condition при параллельных импортах.)

---

## 3) Режимы импорта (DATEV+)

Поддержать параметр:

* `?mode=merge` **(default)**
* `?mode=reset`

### 3.1 mode=merge (default)

* **Add-only**
* Ничего не удаляет
* Просто добавляет отсутствующие счета из SKR03 CSV
* Возвращает статистику:

  * `totalInFile`
  * `created`
  * `skippedExisting`
  * `mode`

### 3.2 mode=reset (enterprise)

**Это самый рискованный режим — должен быть “safe reset”.**

Reset должен:

* **Никогда** не удалять Stammkonten (protected)
* **Никогда** не удалять счета, у которых есть проводки (used accounts)
* Удалять можно только:

  * не protected
  * и не used

✅ Алгоритм reset:

1. Получить `protectedCodes` из `protectedAccounts.ts`
2. Найти `usedCodes`:

   * все account codes, которые фигурируют в journal lines (или entries) в рамках companyId
3. Выполнить `deleteMany` только по разрешённым кодам:

   * `code NOT IN protectedCodes`
   * `code NOT IN usedCodes`
4. Затем выполнить merge-импорт (добавление SKR03 отсутствующих)

⚠️ Запрещено:

* `deleteMany({ where: { companyId } })` — это удаляет всё и ломает систему.

---

## 4) Транзакционность

Операции reset должны выполняться в **одной транзакции**:

* вычисления used/protected (можно до транзакции)
* `deleteMany` (safe)
* `createMany` (merge)

✅ Требование:

* `prisma.$transaction(async (tx) => { ... })`

---

## 5) Валидация и форматы

* Endpoint читает `lib/accounting/data/skr03.csv` с диска (server-side).
* CSV parser должен валидировать:

  * `code` обязателен, строка, trim
  * `type` в enum: Asset/Liability/Equity/Income/Expense (или ваш текущий)
  * nameDe/nameEn — допускаются пустые, но не должны ломать типы

---

## 6) Ответ API (для фронта)

Вернуть JSON:

```json
{
  "mode": "merge",
  "totalInFile": 413,
  "created": 413,
  "skippedExisting": 0,
  "deleted": 0,
  "protectedCount": 20,
  "usedCount": 7
}
```

Для reset добавь:

* `deleted`
* `usedCount` (сколько защитили из-за проводок)
* `protectedCount`

---

## 7) Acceptance Tests (ручные)

Claude обязан прогнать руками/через curl:

### Test A — idempotent merge

* 5 раз подряд вызвать `mode=merge`
* результат: 1-й created ~413, остальные created 0.

### Test B — reset в пустой компании

* `mode=reset`
* protected остаются, итоговый план = SKR03 + protected (если protected входят в SKR03 — просто без дублей)

### Test C — reset при наличии проводок

* создать проводку на счёт 8400
* `mode=reset`
* 8400 не удаляется
* protected не удаляются
* удаляются только свободные неиспользуемые счета

### Test D — tenant isolation

* попытка дернуть endpoint с чужим `companyId`
* ожидаем 403/404 (как принято у вас), **без побочных эффектов**

---

## 8) Что прислать обратно (C=>D)

В ответе ты присылаешь:

1. короткий отчёт “что было / что исправил”
2. дифф по `route.ts`
3. если добавлял `@@unique` — дифф по Prisma schema + миграция
4. результаты 4 тестов (A–D) с цифрами created/skipped/deleted

---

**Важно:** это бухгалтерское ядро. Любая ошибка в reset = потенциальная потеря данных.
Сделай “safe reset” строго по правилам выше.
