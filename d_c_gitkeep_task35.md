🔵 **L=>C — ТЗ 35 | Industrial FIFO Engine + COGS Layer**

Claude, задача уровня production.
Это не эксперимент. Это ядро финансового двигателя.

---

# 🎯 Цель Task 35

Реализовать **промышленный FIFO-партионный учёт** с:

* Lot-based inventory
* FIFO allocation при продаже
* Автоматическим COGS
* 4-проводочным Journal
* Полным reversal pattern
* Защитой от race conditions
* Запретом cancel purchase при consumption

---

# 1️⃣ DATABASE LAYER

### Создать модели:

## Model: `StockLot`

```ts
id: string (uuid)
companyId: string
warehouseName: string
itemCode: string
itemName: string
sourceDocumentType: 'PURCHASE'
sourceDocumentId: string
purchaseDate: Date
unitCost: Decimal
qtyInitial: Decimal
qtyRemaining: Decimal
currencyCode: string
createdAt
updatedAt
```

### Индексы:

* (companyId, warehouseName, itemCode, purchaseDate, id)
* (companyId, sourceDocumentId)

---

## Model: `StockAllocation`

```ts
id: string (uuid)
companyId: string
documentType: 'SALE' | 'SALE_REVERSAL'
documentId: string
saleItemId?: string
lotId: string
qty: Decimal
unitCost: Decimal
amount: Decimal
createdAt
```

### Индексы:

* (companyId, documentType, documentId)
* (companyId, lotId)

---

# 2️⃣ PURCHASE FLOW (изменения)

При создании Purchase:

Для каждого item:

* Создать StockLot:

  * qtyInitial = quantity
  * qtyRemaining = quantity
  * unitCost = priceWithoutVat
  * purchaseDate = purchaseDate

StockMovement IN оставить как журнал.

---

# 3️⃣ SALES FLOW (критично)

## Заменить текущий stock check

Вместо balance-based проверки:

* Считать SUM(qtyRemaining) по StockLot
* Если < requested → INSUFFICIENT_STOCK

---

## FIFO Allocation Engine

Создать service:

```ts
allocateFifoLots(tx, params)
```

Алгоритм:

1. Выбрать лоты по:

   * companyId
   * warehouseName
   * itemCode
   * qtyRemaining > 0
   * ORDER BY purchaseDate ASC, id ASC

2. SELECT ... FOR UPDATE SKIP LOCKED

3. Списывать qtyRemaining

4. Создавать StockAllocation

5. Создавать StockMovement OUT с unitCost из lot

6. Возвращать allocation result

---

## JournalEntry при продаже

Создавать ОДИН JournalEntry с 4 строками:

```
DR Accounts Receivable     (Revenue)
CR Revenue

DR COGS                    (sum allocations)
CR Inventory
```

COGS = сумма allocation.amount

---

# 4️⃣ CANCEL SALE

При cancel:

1. Найти StockAllocation по documentId
2. Для каждого allocation:

   * вернуть qtyRemaining обратно в lot
3. Создать StockMovement IN (reverse)
4. Создать reversal JournalEntry (зеркалить ВСЕ 4 строки)

---

# 5️⃣ CANCEL PURCHASE

Перед отменой:

Проверить:

```
qtyRemaining === qtyInitial
```

Если нет → throw `PURCHASE_LOTS_ALREADY_CONSUMED`

---

# 6️⃣ CONCURRENCY

Обязательно использовать:

```
FOR UPDATE SKIP LOCKED
```

через tx.$queryRaw

Без этого задача считается НЕ выполненной.

---

# 7️⃣ ACCOUNT RESOLVER

Добавить обязательные accountId:

* revenueAccountId
* arAccountId
* cogsAccountId
* inventoryAccountId

Не хардкодить строки.
Не использовать string literals.

---

# 8️⃣ ТЕСТЫ (минимум 5)

1. FIFO правильная аллокация
2. Partial lot allocation
3. Cancel sale → lot restored
4. Purchase cancel with consumption → error
5. Parallel sale safety (mock tx)

---

# ⚙️ Ограничения

* Decimal строго использовать
* Никаких float
* Никаких перерасчётов задним числом
* Никаких пересозданий journal

---

# Definition of Done

* Sale создаёт 4 проводки
* COGS считается корректно
* FIFO детерминирован
* Cancel восстанавливает lot
* Purchase cancel защищён
* Нет race condition
* Нет отрицательных qtyRemaining

---

Claude, это Task 35.
Industrial level.

Dashka ждёт C=>D Gate 1 (schema + migration).
