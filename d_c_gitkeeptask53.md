Leanid, сейчас **самое правильное время вернуться к Clients**.
Ты правильно заметил: раньше это был **placeholder (заглушка)**, но теперь система уже имеет:

* Products
* Purchases
* Warehouse
* Chart of Accounts
* Journal Entries

Поэтому **Clients должны стать полноценным Master Data**, иначе:

* Purchase не сможет выбирать Supplier
* Sales не сможет выбирать Customer
* Journal не сможет вести AR/AP

Я дам **полное production-ТЗ для Claude — Task: Clients Engine**.

---

# Task — Clients Engine (Master Data)

Цель:

```text
Create full Clients master data module:
- create / edit / delete clients
- support supplier + customer roles
- integrate with Purchases and Sales
- link to accounting (AR/AP accounts)
```

Clients — это **контрагенты ERP**.

---

# 1️⃣ Prisma Model (если уже есть — проверить поля)

Модель должна выглядеть примерно так:

```prisma
model Client {
  id        String @id @default(cuid())

  tenantId  String
  companyId String

  name      String
  code      String?

  isSupplier Boolean @default(false)
  isCustomer Boolean @default(false)

  vatCode        String?
  registrationNo String?

  country String?
  city    String?
  address String?

  email String?
  phone String?

  payWithinDays Int?

  receivableAccountCode String?
  payableAccountCode    String?

  isActive Boolean @default(true)

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([tenantId])
  @@index([companyId])
}
```

---

# 2️⃣ Clients List Page

Route:

```
/company/[companyId]/clients
```

UI таблица:

| Code | Name | Type | VAT | Country | Payment terms |
| ---- | ---- | ---- | --- | ------- | ------------- |

Type:

```
Supplier
Customer
Both
```

Toolbar:

```
+ New Client
Search
Filter Supplier / Customer
```

Search fields:

```
name
code
vatCode
```

API:

```
GET /api/company/[companyId]/clients
```

---

# 3️⃣ Create Client Page

Route:

```
/company/[companyId]/clients/new
```

Форма:

### Basic

```
Name *
Code
```

### Roles

```
☑ Supplier
☑ Customer
```

### Company Data

```
VAT Code
Registration number
Country
City
Address
```

### Contacts

```
Email
Phone
```

### Payment Terms

```
Pay within days
```

### Accounting

```
Receivable account
Payable account
```

Эти счета берутся из:

```
Chart of Accounts
```

---

# 4️⃣ Client Editor

Route:

```
/company/[companyId]/clients/[clientId]
```

Должно поддерживать:

```
Save
Copy
Delete
Deactivate
```

Delete запрещен если клиент используется:

```
Purchase
Sale
```

---

# 5️⃣ API

## GET list

```
GET /api/company/[companyId]/clients
```

filters:

```
search
isSupplier
isCustomer
isActive
```

---

## GET single

```
GET /api/company/[companyId]/clients/[clientId]
```

---

## POST create

```
POST /api/company/[companyId]/clients
```

validation:

```
name required
```

---

## PATCH update

```
PATCH /api/company/[companyId]/clients/[clientId]
```

partial update.

---

## DELETE

```
DELETE /api/company/[companyId]/clients/[clientId]
```

reject если используется.

---

# 6️⃣ ClientSelector (для документов)

Это **ключевой компонент**.

Используется в:

```
Purchases
Sales
```

Dropdown должен показывать:

```
Name
Code
VAT
```

пример:

```
YPL GRUP INC (YPL_FL)
```

API:

```
/api/company/[companyId]/clients?pageSize=100&isActive=true
```

Search:

```
name
code
```

---

# 7️⃣ Purchases Integration

В Purchase header заменить:

```
Supplier Name (text input)
```

на

```
ClientSelector
```

При выборе клиента автоматически:

```
supplierName
supplierCode
clientId
payWithinDays
```

---

# 8️⃣ Sales Integration

В Sales header:

```
Customer
```

использует тот же selector.

---

# 9️⃣ Accounting Integration

Client хранит:

```
receivableAccountCode
payableAccountCode
```

При POST:

Purchase:

```
Dr Inventory
Cr PayableAccount
```

Sale:

```
Dr ReceivableAccount
Cr Revenue
```

---

# 🔟 UX принцип ERP

Из документа можно:

```
Create client
```

без выхода.

Inline creation:

```
+ New Client
```

в dropdown.

---

# 11️⃣ Security

Все API должны использовать:

```
requireTenant()
```

и проверку:

```
companyId
tenantId
```

---

# 12️⃣ Definition of Done

Claude должен обеспечить:

```
✓ Create client
✓ Edit client
✓ Delete client
✓ Search clients
✓ Client selector
✓ Supplier selection in Purchase
✓ Customer selection in Sales
✓ Accounting account mapping
```

---

# 13️⃣ После этого заработает

ERP цепочка:

```
Client
↓
Purchase
↓
Warehouse
↓
Sale
↓
Accounting
```

---

# 14️⃣ Архитектура Solar ERP

После этого у тебя будет:

```
Master Data

Clients
Products
Accounts
Warehouses

Documents

Purchases
Sales

Engines

Warehouse
Accounting
```

Это **полноценный ERP Core**.

---

💡 Leanid, следующий шаг после Clients будет логичный:

```
Bank Engine
```

потому что тогда цепочка станет полной:

```
Purchase → Warehouse → Sale → Bank → Accounting
```
