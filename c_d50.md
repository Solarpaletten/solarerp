D=>C Task 50 — Sales Editor (production quality) | Solar ERP

Leanid, идём дальше по правильной архитектурной линии.
Sales Editor должен зеркалить Purchase Editor, но с отличиями по бухгалтерии:

Purchase  → Inventory ↑  → AP (Accounts Payable)
Sales     → Inventory ↓  → AR (Accounts Receivable)

Поэтому Sales Editor = симметричный модуль, но с:

клиентом (customer)

revenue accounts

COGS

stock decrease

Task 50 — Sales Editor
Цель

Создать полноценный Sales Document Editor:

Draft
Edit
Save
Post
Cancel
Copy
Accounting View

UI и архитектура должны повторять Purchase Editor, чтобы Solar ERP имел единый Document Engine.

1️⃣ UI Routes
Sales list (уже есть)
/company/[companyId]/sales

ERPGrid — не трогаем.

Sales editor
app/(dashboard)/company/[companyId]/sales/[saleId]/page.tsx
New sale
app/(dashboard)/company/[companyId]/sales/new/page.tsx

Логика:

POST /api/company/${companyId}/sales/draft
↓
router.replace(/sales/${id})
2️⃣ UI Components

Создать модуль:

components/sales/
SalesHeader
components/sales/SalesHeader.tsx

Показывает:

Sales S-0001
Customer
Status
Date
Currency
SalesHeaderEdit
components/sales/SalesHeaderEdit.tsx

Поля:

customerId
saleDate
dueDate
currency
warehouse
comments

customer — select из clients.

SalesItemsEdit
components/sales/SalesItemsEdit.tsx

Таблица:

product
description
qty
unit
price
vat
net
gross
Автоподстановка

При выборе product:

name
vatRate
price
SalesItemsTable
components/sales/SalesItemsTable.tsx

Read-only после Post.

SalesTotals
components/sales/SalesTotals.tsx

Показывает:

Net total
VAT total
Gross total
SalesAccountingView
components/sales/SalesAccountingView.tsx

Отображает:

Journal entries
COGS
Revenue
VAT
SalesActions
components/sales/SalesActions.tsx

Кнопки:

Close
Save
Post
Copy
Cancel
3️⃣ Document Status

Использовать ту же модель:

DRAFT
POSTED
CANCELLED

Правила:

DRAFT
editable
Save
Post
POSTED
read-only
Copy
Cancel
Accounting View
CANCELLED
read-only
Copy
4️⃣ API Endpoints

Создать / проверить:

GET
GET /api/company/[companyId]/sales/[saleId]

return

SaleDocument
items[]
Save
PATCH /api/company/[companyId]/sales/[saleId]
Draft
POST /api/company/[companyId]/sales/draft

создает

series: "S"
number
status: DRAFT
Post
POST /api/company/[companyId]/sales/[saleId]/post
Cancel
POST /api/company/[companyId]/sales/[saleId]/cancel
Copy
POST /api/company/[companyId]/sales/[saleId]/copy
Accounting
GET /api/company/[companyId]/sales/[saleId]/accounting
5️⃣ Бухгалтерская логика (самое важное)

При POST Sales создаются Journal Entries:

Revenue entry
DR 1200 Accounts Receivable
CR 8400 Revenue
CR 1776 VAT Payable
COGS entry
DR 5000 Cost of Goods Sold
CR 1400 Inventory
Stock movement
Inventory ↓

через:

stockMovement table
6️⃣ Validation

Перед Post:

customer required
items ≥ 1
qty > 0
price ≥ 0
7️⃣ UX Requirements
Dirty tracking
dirty
saving
posting
Save button

disabled если:

!dirty
Confirm dialogs
Post document?
Cancel document (Storno)?
8️⃣ Security

Обязательно:

requireTenant
companyId scope
9️⃣ Definition of Done

Sales Editor готов если:

+ New sale → создаёт draft
Draft editable
Save работает
Post создаёт journal + stock movement
Accounting View показывает проводки
Cancel делает storno
Copy создаёт новый draft
Tenant isolation соблюден
🔟 Deliverables

Claude должен создать:

components/sales/
   SalesHeader
   SalesHeaderEdit
   SalesItemsEdit
   SalesItemsTable
   SalesTotals
   SalesAccountingView
   SalesActions

и страницы:

/sales/new/page.tsx
/sales/[saleId]/page.tsx
🧠 Архитектурная цель Task 50

После этого Solar ERP будет иметь полный торговый цикл:

Purchase → Stock ↑
Sales    → Stock ↓

и бухгалтерию:

AP
AR
Revenue
COGS
VAT
🚀 После Task 50

Следующий модуль логично:

Task 51
Bank Module

Потому что тогда получится полный бизнес-цикл:

Purchase
Stock
Sales
Bank
Accounting

Leanid, если хотите — после Task 50 я покажу одну архитектурную схему ERP, которая позволит:

Purchases
Sales
Warehouse
Payments

подключать через один общий Document Engine.

Это тот же принцип, который используют SAP и Odoo,
и ваш код уже почти готов к этому.