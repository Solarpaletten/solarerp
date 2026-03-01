ТЗ Task 38A получено. Но есть проблема — текущий POST `/purchases` требует body с обязательными полями (supplierName, warehouseName, series, items, journal accounts). Отправить пустой POST не получится.

Нужен отдельный draft-endpoint или минимальный body. Сделаю страницу `/new` которая отправляет минимальный draft body с дефолтами.Looking at the existing POST route requirements, a draft creation needs a separate lightweight endpoint:## C=>D — Task 38A: New Purchase Draft Redirect — READY

### 2 файла для деплоя

| Файл | Куда | Строк | Назначение |
|------|------|-------|------------|
| `new-purchase-page.tsx` | `app/(dashboard)/company/[companyId]/purchases/new/page.tsx` | 85 | Frontend — loader + create + redirect |
| `draft-purchase-route.ts` | `app/api/company/[companyId]/purchases/draft/route.ts` | 73 | Backend — lightweight DRAFT creation |

### Деплой

```bash
# 1. Frontend page
mkdir -p app/\(dashboard\)/company/\[companyId\]/purchases/new
cp new-purchase-page.tsx app/\(dashboard\)/company/\[companyId\]/purchases/new/page.tsx

# 2. Backend draft API
mkdir -p app/api/company/\[companyId\]/purchases/draft
cp draft-purchase-route.ts app/api/company/\[companyId\]/purchases/draft/route.ts
```

### Архитектурное решение

Существующий `POST /purchases` требует обязательные поля (supplierName, items, journal accounts) и создаёт journal entry + stock movement. Он не подходит для draft.

Поэтому создан **отдельный endpoint** `POST /purchases/draft`:

| | POST /purchases | POST /purchases/draft |
|---|---|---|
| Body | Full (supplier, items, journal) | None |
| Journal Entry | ✅ Creates | ❌ No |
| Stock Movement | ✅ Creates | ❌ No |
| FIFO Lot | ✅ Creates | ❌ No |
| Status | POSTED (implicit) | DRAFT |
| Use case | Полная проводка | Пустой черновик |

### Workflow после деплоя

```
Purchases List → ➕ Create
  → /purchases/new
  → POST /api/.../purchases/draft
  → { data: { id: "..." } }
  → router.replace → /purchases/[id]
  → Shows Header + empty Items + empty Totals
```

| Требование | Статус |
|---|---|
| `'use client'` | ✅ |
| useEffect → createDraft | ✅ |
| POST без body | ✅ |
| json.data.id → router.replace | ✅ |
| Error state | ✅ |
| Loader UI | ✅ Loader2 + "Creating document..." |
| Cleanup on unmount | ✅ `cancelled` flag |
| Auto-number (P-0002, P-0003...) | ✅ |
| Tenant check | ✅ |

Готов к Gate Review → затем 38B (Editable Draft Form).