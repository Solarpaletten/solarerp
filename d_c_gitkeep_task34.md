 D=>C
Task 34 — **StockMovements Engine + Warehouse Aggregation (Core)**
Дата: 01.03.2026
Статус: START

---

# 🎯 Цель Task 34

Замкнуть контур:

```
Purchase → JournalEntry → StockMovement(IN)
Sale → JournalEntry → StockMovement(OUT)
Warehouse → Aggregate SUM movements
```

Без отдельной stock-таблицы.
Только история движений.

---

# 🧱 1️⃣ DATABASE LAYER

## A. Новая модель: StockMovement

Prisma model:

```ts
model StockMovement {
  id           String   @id @default(cuid())
  companyId    String
  warehouseId  String
  productId    String
  documentType String   // PURCHASE | SALE | ADJUSTMENT
  documentId   String
  direction    String   // IN | OUT
  quantity     Decimal
  createdAt    DateTime @default(now())

  company   Company   @relation(fields: [companyId], references: [id])
  warehouse Warehouse @relation(fields: [warehouseId], references: [id])
  product   Product   @relation(fields: [productId], references: [id])

  @@index([companyId])
  @@index([warehouseId])
  @@index([productId])
}
```

Миграция:

```
npx prisma migrate dev --name stock_movements
```

---

## B. Warehouse модель (если нет)

```ts
model Warehouse {
  id        String   @id @default(cuid())
  companyId String
  name      String
  isDefault Boolean  @default(false)

  company Company @relation(fields: [companyId], references: [id])
}
```

---

# ⚙ 2️⃣ SERVICE LAYER

Создаём:

```
lib/accounting/stockService.ts
```

---

## A. createStockMovement()

```ts
async function createStockMovement({
  tx,
  companyId,
  warehouseId,
  productId,
  documentType,
  documentId,
  direction,
  quantity
})
```

Просто insert.

---

## B. getWarehouseBalance()

```ts
async function getWarehouseBalance(companyId, warehouseId)
```

Logic:

```
SUM(CASE WHEN direction='IN' THEN quantity ELSE -quantity END)
GROUP BY productId
```

Возвращает:

```
[
  { productId, quantity }
]
```

---

# 📦 3️⃣ PURCHASE INTEGRATION

В route Purchase → POST → когда статус = POSTED:

После создания journalEntry:

```ts
await stockService.createStockMovement({
  tx,
  companyId,
  warehouseId,
  productId,
  documentType: 'PURCHASE',
  documentId,
  direction: 'IN',
  quantity
});
```

---

# 🧾 4️⃣ SALES INTEGRATION

Перед созданием OUT:

### Проверка остатка:

```ts
const balance = await stockService.getProductBalance(...)
if (balance < quantity) throw new Error('Insufficient stock');
```

После journalEntry:

```ts
direction: 'OUT'
```

---

# 🏪 5️⃣ WAREHOUSE PAGE

Новый endpoint:

```
GET /api/company/:id/warehouse/:warehouseId/balance
```

Возвращает агрегированный остаток.

UI:

| Product | Quantity |

Без цены.
Без себестоимости.
Только количество.

---

# 🔐 6️⃣ Критические правила

1. StockMovement создаётся ТОЛЬКО при POSTED.
2. Если документ отменяется — создаём reverse movement.
3. Нельзя делать delete document без reverse.

---

# 🧠 Архитектурная чистота

Мы не:

* дублируем stock
* не делаем manual sync
* не делаем update quantity

Мы всегда считаем из движения.

Это бухгалтерски корректно.

---

# 📋 Критерий завершения Task 34

✔ Purchase увеличивает склад
✔ Sale уменьшает склад
✔ Нельзя продать больше остатка
✔ Warehouse page показывает правильный баланс
✔ Journal entries создаются

---

D=>C
Приступай к:

1. Prisma model
2. stockService
3. Integration в purchase
4. Integration в sales
5. Warehouse endpoint

После выполнения — C=>D отчёт.

Работаем спокойно, без суеты.


D=>L

Отличное решение. Это уже уровень системного архитектора.

Ты прав:
у нас уже есть фундамент, и главная опасность сейчас — не “не доделать”, а переписать лишнее и сломать консистентность.

Поэтому фиксируем правило.

🧠 Добавка к ТЗ (обязательная)
⚠ Правило перед реализацией

Claude перед созданием новых моделей, сервисов или миграций ОБЯЗАН:

Перепроверить существующие Prisma модели

Проверить, нет ли уже нужной логики в:

journalService

postingService

ACCOUNT_MAP

existing routes

Предложить модификацию существующего кода, если это возможно

Делать новые сущности только если это действительно необходимо

📌 Формулировка для GitHub (жёсткая версия)

Добавляем в начало Task 34:

⚠ BEFORE IMPLEMENTATION:

Claude must review:
- current Prisma schema
- existing StockMovement model
- existing purchase/sale routes
- journalService
- ACCOUNT_MAP

If functionality can be implemented by extending existing models —
DO NOT create new tables.

Avoid duplicate logic.
Avoid stock duplication tables.
Keep accounting engine consistent.
🧱 Почему это критично

Сейчас проект уже имеет:

StockMovement модель

SaleDocument

PurchaseDocument

JournalEntry

ACCOUNT_MAP

bilingual accounts

bulk endpoints

Если Claude начнёт создавать:

новую stock table

новый warehouse model без необходимости

дублирующий сервис

→ мы получим рассинхронизацию.

А бухгалтерия не прощает рассинхронизацию.

🎯 Архитектурный принцип Solar

Модифицируй существующее ядро.

Не создавай второе ядро.