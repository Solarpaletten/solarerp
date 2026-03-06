D=>C

Claude, стартуем строго с backend.
Это принцип архитектуры ERP: сначала данные → потом UI.

Поэтому выбираем:

🔵 Start with backend (Clients API)
Task 54_2 — Execution Order (approved)

Работаем в таком порядке:

1️⃣ Prisma Schema Verification

Проверь модель Client.

Минимум должно быть:

model Client {
  id        String   @id @default(cuid())
  companyId String

  name      String
  code      String?
  vatCode   String?

  email     String?
  phone     String?

  type      ClientType
  location  ClientLocation

  receivableAccountCode String?
  payableAccountCode    String?

  isActive  Boolean @default(true)

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@unique([companyId, code])
}

Enums:

enum ClientType {
  COMPANY
  SOLE_TRADER
  INDIVIDUAL
  GOVERNMENT
  NON_PROFIT
}

enum ClientLocation {
  LOCAL
  EU
  FOREIGN
}

Если всё ок:

pnpm prisma generate
pnpm prisma migrate dev
2️⃣ Clients API (CRUD)

Создай:

app/api/company/[companyId]/clients/route.ts
app/api/company/[companyId]/clients/[clientId]/route.ts

Endpoints:

GET clients
GET /api/company/[companyId]/clients

query:

search
page
pageSize
isActive

Поиск по:

name
code
vatCode
email
POST create client
POST /api/company/[companyId]/clients

body:

name
code
vatCode
type
location
email
phone
receivableAccountCode
payableAccountCode
PATCH update
PATCH /api/company/[companyId]/clients/[clientId]
DELETE client

Soft delete:

isActive = false

Hard delete запрещён, если есть документы.

Проверить:

SaleDocument
PurchaseDocument
3️⃣ requireTenant

Все API должны использовать:

const { companyId } = await requireTenant(request);

Это обязательное правило multi-tenant ERP.

4️⃣ После API — ClientSelector

Создаём:

components/selectors/ClientSelector.tsx

Функции:

search
dropdown
select client

использует

GET /clients?pageSize=100&isActive=true

Вывод:

YPL GRUP INC (YPL_FL)
VAT: DE123456789
Payment: 30 days
5️⃣ Integration
Purchase

заменить:

Supplier Name input

на

<ClientSelector type="supplier" />
Sales
<ClientSelector type="customer" />
6️⃣ Accounting Mapping

Client хранит:

receivableAccountCode
payableAccountCode

При POST документа:

Purchase

Dr Inventory
Cr Payables (client.payableAccountCode)

Sale

Dr Receivable (client.receivableAccountCode)
Cr Revenue
Definition of Done

Task считается завершённым когда:

✓ create client
✓ edit client
✓ archive client
✓ search client
✓ ClientSelector работает
✓ Purchase использует supplier selector
✓ Sales использует customer selector
✓ accounting account mapping
Следующий модуль

После Task 54:

Task 55 — Bank Engine

C=>D

Начинай с:

Clients API implementation

Когда API будет готов — покажи:

route.ts files

Я проведу архитектурный audit перед UI.