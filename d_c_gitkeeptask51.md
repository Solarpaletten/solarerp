D=>C
Task 51 — Products Master Data (Solar ERP)
Консультант-аудитор бухгалтерского учёта подготовил production-level ТЗ. Цель — создать Master Data модуль Products, который будет использоваться в Purchases, Sales и Warehouse.

🎯 Цель Task 51

Создать Products Master Data:

Products
 ├ Create product
 ├ Edit product
 ├ Delete product
 ├ Select product in documents
 └ Product code/SKU support

Products должны использоваться в:

Purchases
Sales
Warehouse
FIFO
Stock
Архитектура (ERP правило)

Documents НЕ хранят текст продукта.

Документы должны хранить:

productId

UI показывает:

product.name
product.sku
1️⃣ Prisma Schema

Добавить модель:

model Product {
  id         String   @id @default(cuid())
  tenantId   String
  companyId  String

  name       String
  sku        String?
  unit       String   @default("pcs")
  vatRate    Decimal  @default(19)

  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt

  itemsPurchase PurchaseItem[]
  itemsSales    SalesItem[]

  @@index([tenantId])
  @@index([companyId])
}
2️⃣ API Endpoints

Создать:

/api/company/[companyId]/products
GET Products
GET /api/company/[companyId]/products

Возвращает список.

Response:

{
  "data": [
    {
      "id": "prod1",
      "name": "Rapeseed Oil",
      "sku": "OIL001",
      "unit": "ton",
      "vatRate": 19
    }
  ]
}
POST Product
POST /api/company/[companyId]/products

Body:

{
  "name": "Rapeseed Oil",
  "sku": "OIL001",
  "unit": "ton",
  "vatRate": 19
}

Validation:

name required
vatRate default 19
unit default pcs
GET Product
GET /api/company/[companyId]/products/[productId]
PUT Product
PUT /api/company/[companyId]/products/[productId]

Редактирование.

DELETE Product
DELETE /api/company/[companyId]/products/[productId]

Правило:

нельзя удалить если используется в документах
3️⃣ UI Pages

Страница:

/company/[companyId]/products

Файл:

app/(dashboard)/company/[companyId]/products/page.tsx
Таблица

Columns:

Name
SKU
Unit
VAT
Actions

Пример:

Rapeseed Oil      OIL001     ton     19%     Edit Delete
Soapstock         SOAP01     ton     19%     Edit Delete
4️⃣ Create Product Page
/products/new

Форма:

Name *
SKU
Unit
VAT rate

Default:

VAT 19
Unit pcs
5️⃣ Edit Product Page
/products/[productId]

Редактирование.

6️⃣ Purchase Integration

PurchaseItemsEdit должен использовать:

Product SELECT

Не текст.

Dropdown:

Rapeseed Oil (OIL001)
Soapstock (SOAP01)

После выбора:

itemName = product.name
itemCode = product.sku
productId = product.id
vatRate = product.vatRate
7️⃣ Sales Integration

То же самое.

Product SELECT
8️⃣ Performance

Products должны загружаться:

once per page

Кешировать:

useSWR
or React state
9️⃣ Tenant Security

Все запросы используют:

requireTenant()

И проверяют:

tenantId
companyId
🔟 UX правила

Dropdown должен поддерживать:

search

Пример:

Search product...
11️⃣ DoD (Definition of Done)

Система должна позволять:

✓ Create product
✓ Edit product
✓ Delete product
✓ List products
✓ Select product in purchase
✓ Select product in sale
✓ Product VAT autofill
✓ Product SKU autofill
12️⃣ После Task 51

Можно реализовать:

Task 52
Warehouse Stock

Потому что появится:

productId
📊 Оценка сложности

Claude должен выполнить:

~600 строк кода
Финальный результат

Solar ERP получит Master Data Layer.

Clients
Products
Warehouses

Это основа любой ERP.

L=>D
Если хотите, я могу также подготовить архитектуру Product Selector (dropdown компонент) — это позволит подключить Products к Purchases и Sales за 1 файл без дублирования кода.