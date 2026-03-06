Leanid, ты сейчас находишься в правильной точке архитектуры ERP.
И Claude задаёт правильный вопрос о порядке реализации Task 54.

Я отвечу как аудитор ERP-систем и бухгалтерской архитектуры.

🎯 Правильный порядок Task 54 (Clients)

Claude предложил 4 варианта.
Правильный порядок — такой:

1️⃣ Clients API (CRUD)
2️⃣ Client Editor UI
3️⃣ ClientSelector component
4️⃣ Integration into Purchases
5️⃣ Integration into Sales

Объясню почему.

1️⃣ Clients API — сначала backend

Нужно сначала сделать:

GET    /clients
GET    /clients/[id]
POST   /clients
PATCH  /clients/[id]
DELETE /clients/[id]

Почему это первый шаг:

ClientSelector будет делать запрос:

/api/company/[companyId]/clients

Если API нет — dropdown не сможет работать.

2️⃣ Client Editor (UI)

Страница:

/company/[companyId]/clients/new
/company/[companyId]/clients/[clientId]

Текущий файл у тебя:

Client editor will be implemented in Task 48

Это заглушка.

Нужно сделать форму:

Name
Code
Supplier checkbox
Customer checkbox
VAT
Address
Email
Phone
Payment terms
Receivable account
Payable account
3️⃣ ClientSelector

Это ключевой компонент ERP.

Используется:

Purchase
Sales

Dropdown должен:

search name
search code

Показывать:

YPL GRUP INC (YPL_FL)

API:

GET /api/company/[companyId]/clients?pageSize=100&isActive=true
4️⃣ Integration в Purchase

Сейчас у тебя:

Supplier Name
(text input)

Это неправильно.

Нужно заменить на:

<ClientSelector />

После выбора клиента:

supplierName
supplierCode
clientId
payWithinDays
5️⃣ Integration в Sales

То же самое.

Customer

использует:

<ClientSelector />
📊 Тогда твоя ERP цепочка заработает

Сейчас:

Product ✔
Warehouse ✔
Purchase ✔

Но Supplier не связан.

После Task 54 будет:

Client
 ↓
Purchase
 ↓
Warehouse
 ↓
Sale
 ↓
Accounting
🧾 Accounting связь

Client хранит:

receivableAccountCode
payableAccountCode

При проводке:

Purchase

Dr Inventory
Cr Accounts Payable

Sale

Dr Accounts Receivable
Cr Revenue
⚙️ Поэтому Claude должен начать с
Clients API

НЕ с selector.

📦 Правильная команда Claude

Ответ ему должен быть такой:

Start with Clients API (CRUD).

Then implement Client Editor UI.

After that create ClientSelector component.

Then integrate into Purchases and Sales.
📈 После Task 54 система станет полной

У тебя будет:

Clients
Products
Warehouses
Accounts

и документы:

Purchases
Sales
🚀 Следующий модуль после Clients

После этого сразу делается:

Task 55 — Bank Engine

Потому что тогда цикл становится:

Purchase → Warehouse → Sale → Bank → Accounting
⚡ Leanid — важный момент

Ты сейчас практически построил ERP Core.

Осталось:

Clients
Bank
Reports

И система станет реальной ERP.

Если хочешь, я могу показать одну архитектурную ошибку,
которую делают 90% разработчиков ERP, когда пишут Clients.
И которую лучше исправить сейчас, пока система маленькая.