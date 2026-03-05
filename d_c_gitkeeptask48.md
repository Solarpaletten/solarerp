D=>C (Dashka → Claude)
Task 48 — Client Detail Form (Technical Specification)
Architect: Leanid
Coordinator: Dashka
Engineer: Claude

Цель: реализовать первый полноценный master-data editor в Solar ERP — карточку контрагента (Client).
Этот модуль станет основой для Purchases / Sales / Bank / Settlement.

1️⃣ Общая архитектура

Используем существующую структуру проекта Leanid.

UI путь:

app/(dashboard)/company/[companyId]/clients/new/page.tsx

API уже существует:

/api/company/[companyId]/clients

Поэтому задача — сделать UI Editor + POST integration.

2️⃣ Структура Client (ERP модель)

Минимально необходимая модель клиента:

Client
id
companyId

name
code
vatNumber
registrationNumber

country
city
address

email
phone

roles

createdAt
updatedAt
3️⃣ Roles (важно)

Контрагент может быть:

customer
supplier
both

UI реализовать через checkbox.

☑ Customer
☑ Supplier

Если выбраны оба → roles = both.

4️⃣ UI Layout

Страница:

/company/[companyId]/clients/new

Карточка:

Card
 ├─ Client Code
 ├─ Client Name
 ├─ VAT Number
 ├─ Registration Number
 ├─ Country
 ├─ City
 ├─ Address
 ├─ Email
 ├─ Phone
 ├─ Roles
 │   ├─ Customer
 │   └─ Supplier
 └─ Save Button

Использовать существующие компоненты:

components/ui/Input.tsx
components/ui/Button.tsx
components/ui/Card.tsx
5️⃣ File structure

Создать:

components/clients/ClientForm.tsx
6️⃣ ClientForm Component
type ClientFormData = {
  code: string
  name: string
  vatNumber?: string
  registrationNumber?: string
  country?: string
  city?: string
  address?: string
  email?: string
  phone?: string
  roles: string[]
}
7️⃣ Submit logic

POST:

POST /api/company/[companyId]/clients

Body:

{
 "code": "APPLE",
 "name": "Apple GmbH",
 "vatNumber": "DE123456789",
 "country": "Germany",
 "roles": ["customer","supplier"]
}

После success:

redirect:
/company/[companyId]/clients
8️⃣ Validation

Frontend:

name required
code required
roles required
9️⃣ UX правила ERP

Client Code:

UPPERCASE
no spaces
max 20
🔟 Toolbar

Использовать стандартную ERP navigation.

Page Header:

New Client
1️⃣1️⃣ Error handling

Если API вернул ошибку:

show error message
1️⃣2️⃣ После Task 48 система сможет
Create Client
View Client List
Use client in Purchase
Use client in Sale

Это открывает:

Task 49 — Purchase UI
1️⃣3️⃣ Definition of Done

Task считается завершённым если:

✔ можно создать клиента
✔ запись сохраняется в БД
✔ происходит redirect на clients grid
✔ tenant isolation соблюдён
✔ работает validation

1️⃣4️⃣ Архитектурное замечание

ClientForm должен быть переиспользуемым.

Позже использовать для:

Edit Client
1️⃣5️⃣ Ожидаемые новые файлы
components/clients/ClientForm.tsx

изменения:

clients/new/page.tsx
🚀 После Task 48

Solar ERP сможет впервые пройти полный торговый цикл:

Client
   ↓
Purchase
   ↓
Warehouse
   ↓
Sale
   ↓
Bank

Это первая замкнутая цепочка ERP.

Leanid — коротко как архитектору.

По текущему tree проекта:

структура очень чистая

ERPGrid — правильная

API — production level

accounting services — сильные

Вы сейчас реально строите ERP уровня SAP-lite.

Если хотите — я покажу архитектурную вещь, которую сейчас нужно добавить,
чтобы через 3 месяца Solar ERP мог обслуживать 100 000 компаний без переписывания ядра.