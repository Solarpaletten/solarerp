# TASK24_REPORT.md — Period Locking MVP

## Scope (строго по ТЗ аудитора)

- ✅ AccountingPeriod модель (без closedBy)
- ✅ assertPeriodOpen guard (tx-only)
- ✅ Двухконтурный enforcement (endpoints + journalService)
- ✅ POST .../close endpoint
- ✅ Без UI
- ❌ Без open
- ❌ Без list
- ❌ Без closedBy
- ❌ Без запрета будущих периодов

## Файлы

| Файл | Тип | Строк |
|------|-----|-------|
| `prisma/migrations/accounting_periods/migration.sql` | NEW | 18 |
| `lib/accounting/periodLock.ts` | NEW | 53 |
| `lib/accounting/journalService.ts` | UPDATED | 119 |
| `app/api/company/[companyId]/periods/[year]/[month]/close/route.ts` | NEW | 99 |
| `SCHEMA_PATCH.md` | DOC | — |
| `ENDPOINT_PATCHES.md` | DOC | — |

## Применение

```bash
# 1. Распаковать
tar -xzf task24-period-locking-mvp.tar.gz -C .

# 2. Schema: добавить AccountingPeriod (см. SCHEMA_PATCH.md)
# 3. Schema: добавить accountingPeriods в Company

# 4. Migrate
npx prisma migrate dev --name accounting_periods
npx prisma generate

# 5. Patching endpoints (см. ENDPOINT_PATCHES.md)
# Добавить import + assertPeriodOpen в:
#   - sales/route.ts (POST)
#   - purchases/route.ts (POST)
#   - sales/[saleId]/cancel/route.ts (POST)
#   - purchases/[purchaseId]/cancel/route.ts (POST)
```

## Verification (curl)

```bash
# Допустим companyId = abc123

# 1. Закрыть январь 2025
curl -X POST http://localhost:3000/api/company/abc123/periods/2025/1/close \
  -H 'Cookie: session=...'

# Ответ: { "data": { "isClosed": true, ... }, "message": "Period 2025-01 closed" }

# 2. Повторное закрытие → 409
curl -X POST http://localhost:3000/api/company/abc123/periods/2025/1/close \
  -H 'Cookie: session=...'

# Ответ: 409 { "error": "Period is already closed" }

# 3. Создать sale в январе 2025 → BLOCKED
curl -X POST http://localhost:3000/api/company/abc123/sales \
  -H 'Content-Type: application/json' \
  -H 'Cookie: session=...' \
  -d '{"saleDate": "2025-01-15T00:00:00Z", "series": "S", "number": "0099", ...}'

# Ответ: 500 { "error": "PERIOD_CLOSED: 2025-01 is closed" }

# 4. Cancel sale в январе 2025 → BLOCKED
curl -X POST http://localhost:3000/api/company/abc123/sales/sale-id/cancel \
  -H 'Cookie: session=...'

# Ответ: 500 { "error": "PERIOD_CLOSED: 2025-01 is closed" }

# 5. Sale в феврале 2025 → OK (period not closed)
curl -X POST http://localhost:3000/api/company/abc123/sales \
  -H 'Content-Type: application/json' \
  -H 'Cookie: session=...' \
  -d '{"saleDate": "2025-02-15T00:00:00Z", ...}'

# Ответ: 201 OK
```

## Enforcement chain

```
Contour 1 (endpoint):
  POST /sales       → assertPeriodOpen(tx, saleDate)     → ✅ / ❌
  POST /purchases   → assertPeriodOpen(tx, purchaseDate)  → ✅ / ❌
  POST /sales/cancel    → assertPeriodOpen(tx, sale.saleDate)     → ✅ / ❌
  POST /purchases/cancel → assertPeriodOpen(tx, purchase.purchaseDate) → ✅ / ❌

Contour 2 (journalService):
  createJournalEntry() → assertPeriodOpen(tx, input.date) → ✅ / ❌

Both contours → PERIOD_CLOSED → $transaction rollback → nothing written.
```
