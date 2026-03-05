Leanid, делаю production-уровневое ТЗ для Claude — Task 52: Warehouse Engine.
Это уже ядро ERP, потому что после этого появятся:

📦 Stock
📦 FIFO
📦 Inventory valuation
📦 COGS

Это критический слой между документами и бухгалтерией.

Task 52 — Warehouse Engine

Solar ERP

Goal:

Create warehouse stock engine:
- warehouse movements
- stock balance
- FIFO layers
- integration with Purchases and Sales
1️⃣ ERP архитектура склада

Warehouse работает через движения (movements).

НЕ через update stock.

Purchase POST
→ movement IN

Sale POST
→ movement OUT

Stock считается:

SUM(movements)
2️⃣ Prisma Schema

Добавить 3 таблицы.

Warehouse
model Warehouse {
  id        String   @id @default(cuid())

  tenantId  String
  companyId String

  name      String
  code      String?

  isDefault Boolean @default(false)

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  movements WarehouseMovement[]

  @@index([tenantId])
  @@index([companyId])
}
WarehouseMovement

Это ledger склада.

model WarehouseMovement {
  id          String   @id @default(cuid())

  tenantId    String
  companyId   String

  warehouseId String
  productId   String

  documentType String
  documentId   String

  qty         Decimal
  price       Decimal?

  direction   MovementDirection

  createdAt   DateTime @default(now())

  warehouse Warehouse @relation(fields: [warehouseId], references: [id])
}
MovementDirection
enum MovementDirection {
  IN
  OUT
}
WarehouseStock

Кеш баланса.

model WarehouseStock {
  id          String   @id @default(cuid())

  tenantId    String
  companyId   String

  warehouseId String
  productId   String

  qty         Decimal

  updatedAt   DateTime @updatedAt

  @@unique([warehouseId, productId])
}
3️⃣ Purchase integration

Когда purchase POSTED:

PurchaseItem
qty = 10
price = 2000
productId = macbook
warehouseId = main

Создается movement:

direction = IN
qty = 10
price = 2000
Код
await prisma.warehouseMovement.create({
 data: {
  tenantId,
  companyId,
  warehouseId,
  productId,
  documentType: 'PURCHASE',
  documentId: purchaseId,
  qty,
  price,
  direction: 'IN'
 }
})
4️⃣ Sales integration

Когда sale POSTED:

direction = OUT
qty = 3
await prisma.warehouseMovement.create({
 data: {
  tenantId,
  companyId,
  warehouseId,
  productId,
  documentType: 'SALE',
  documentId: saleId,
  qty,
  direction: 'OUT'
 }
})
5️⃣ Update WarehouseStock

После движения обновляем кеш.

await prisma.warehouseStock.upsert({
 where: {
  warehouseId_productId: {
   warehouseId,
   productId
  }
 },
 update: {
  qty: {
   increment: direction === 'IN' ? qty : -qty
  }
 },
 create: {
  tenantId,
  companyId,
  warehouseId,
  productId,
  qty: direction === 'IN' ? qty : -qty
 }
})
6️⃣ Stock API

Endpoint:

/api/company/[companyId]/warehouse/balance

Response:

{
 "data": [
  {
   "productId": "macbook",
   "warehouseId": "main",
   "qty": 7
  }
 ]
}
7️⃣ Warehouse UI

Page:

/company/[companyId]/warehouse

Таблица:

Product	Warehouse	Qty
MacBook Pro	Main	7
Mac Mini	Main	3
8️⃣ Stock calculation

Stock считается:

SUM(IN) - SUM(OUT)

Но UI использует:

WarehouseStock
9️⃣ FIFO

Пока не реализуем полностью.

Но movement должен хранить:

price

Чтобы потом сделать:

FIFO layers
🔟 Validation

При продаже:

if stock < qty
→ throw error
11️⃣ Security

Все запросы используют:

requireTenant()

и проверяют

tenantId
companyId
12️⃣ Definition of Done

Система должна уметь:

✓ create warehouse
✓ record purchase movement
✓ record sale movement
✓ calculate stock
✓ show warehouse balance
✓ prevent negative stock
13️⃣ После Task 52

Система сможет:

Stock
Inventory
Warehouse
14️⃣ Следующий этап
Task 53
FIFO cost engine

Для расчета:

COGS
Inventory valuation
📊 Размер задачи

Claude должен написать примерно:

900–1200 строк
Архитектура ERP после Task 52
Clients
Products
Warehouses

Purchases
Sales

Warehouse movements
Stock balance

Это уже настоящая ERP core.

Если хочешь — дальше я покажу критическую архитектуру FIFO (Task 53), которая превращает систему из CRM-подобной панели в настоящую бухгалтерскую ERP.