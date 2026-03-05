L=>C (Leanid → Claude)
Task 48 — Client Detail Form (production quality)
Dashka подготовила чёткое ТЗ, чтобы больше не создавать пустые страницы, а сразу сделать полноценный ERP-editor.

🎯 Цель Task 48

Сделать Client Detail Editor для:

/company/[companyId]/clients/[clientId]

Это будет первая master-data карточка ERP.

Она должна работать как:

ERPGrid (clients/page.tsx)
        ↓ click
Client Editor
📁 Файл который нужно реализовать
app/(dashboard)/company/[companyId]/clients/[clientId]/page.tsx
⚙️ Требования архитектуры

Использовать:

React Client Component
Next.js 14
fetch API
useParams
useEffect
🧩 Структура страницы

Client Editor должен содержать 4 блока:

ClientHeader
ClientForm
ClientAccounting
ClientActions
1️⃣ Header
Client name
Status badge
Client code

пример:

ACME GmbH
Client code: C-1001
Type: Customer / Supplier
2️⃣ Основная форма

Поля:

name
code
vatNumber
email
phone
address
country
city
postalCode
3️⃣ Бухгалтерский блок

ERP поле:

receivableAccount
payableAccount
vatId
currency
paymentTerms

Это подготовка для:

SKR03
DATEV
4️⃣ Actions

Кнопки:

Save
Archive
Delete
🔄 API

Использовать существующий API:

GET
/api/company/[companyId]/clients/[clientId]
PATCH
/api/company/[companyId]/clients/[clientId]
DELETE
/api/company/[companyId]/clients/[clientId]
📡 Data loading
useEffect → fetch client
const res = await fetch(
`/api/company/${companyId}/clients/${clientId}`
)
💾 Save
PATCH
fetch(
`/api/company/${companyId}/clients/${clientId}`,
{
 method: 'PATCH'
}
)
🧠 UX

Пока данные грузятся:

Loading spinner

Если ошибка:

Error panel
🎨 Layout

Tailwind

max-w-3xl
space-y-6
border
rounded-lg
📊 Полный layout
Client Editor

[Header]

General Information
--------------------------------
Name
Code
Email
Phone

Address
--------------------------------
Country
City
Address

Accounting
--------------------------------
Receivable account
Payable account
Payment terms

[ Save ] [ Delete ]
🚫 Важно

НЕ использовать:

ERPGrid

Это не список, это document editor.

📦 После Task 48

Следующие задачи:

Task 49 — Purchase UI polish
Task 50 — Sale Document Editor
Task 51 — Bank UI
Task 52 — Product Editor
Task 53 — Warehouse Editor
🧠 Архитектурный принцип

Solar ERP строится так:

ERPGrid (list)
        ↓
Document Editor

Ты уже это правильно выстроил.

🚀 Команда для Claude
L=>C

Implement Task 48.

Create a full Client Editor page:

app/(dashboard)/company/[companyId]/clients/[clientId]/page.tsx

Requirements:
• fetch client
• editable form
• PATCH save
• DELETE client
• loading and error states
• Tailwind layout
• production quality

Leanid, после Task 48 + Task 50 у тебя появится полный ERP цикл:

Client
↓
Purchase
↓
Warehouse
↓
Sale
↓
Bank

И тогда можно будет сделать реальный тест-кейс:

1000 MacBook
purchase
warehouse stock
sale
bank payment

— ровно тот замкнутый бухгалтерский цикл, который ты хотел увидеть.