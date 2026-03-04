D=>C 🧭
**Task 44 — Code Review (Architect + Accounting ERP perspective)**
Leanid прав — архитектура правильная. Ниже **чёткий чек-лист аудита и мини-патчи**, чтобы сделать уровень **enterprise ERP**.

---

# ✅ Что уже сделано правильно (очень хорошо)

### 1️⃣ ERPGrid Engine

Очень сильная архитектура:

```
components/erp/
   ERPGrid.tsx
   ERPToolbar.tsx
   ERPDetailTabs.tsx
   index.ts
```

Это **правильный ERP pattern**:

```
ERPGrid → список
ERPDetailTabs → карточка сущности
ERPToolbar → действия
```

Так построены:

* SAP
* Odoo
* Microsoft Dynamics
* Datev UI

✔ **архитектура 9/10**

---

### 2️⃣ Column Config Pattern

```
config/clients/columns.ts
```

Это **идеальный ERP подход**.

Теперь любой модуль:

```
config/purchases/columns.ts
config/sales/columns.ts
config/bank/columns.ts
```

и UI работает сразу.

✔ **очень правильно**

---

### 3️⃣ API Architecture

```
/api/company/[companyId]/clients
```

поддерживает:

```
search
sort
pagination
filters
tenant validation
```

Это **enterprise уровень**.

✔ отлично.

---

# ⚠️ Что нужно исправить (важные моменты)

## 1️⃣ BUG — selected rows

В `ERPGrid`:

```ts
const rowId = String(row.id || idx);
```

Но `row.id` не типизирован.

Лучше:

```ts
T extends { id: string }
```

### Мини-патч

```ts
export function ERPGrid<T extends { id: string }>({
```

И тогда:

```ts
const rowId = row.id;
```

---

## 2️⃣ BUG — debounce search

Сейчас поиск:

```
onChange -> fetch
```

Это создаёт **100 API calls**.

Нужно debounce.

### Мини-патч

Добавить:

```ts
import { useDebounce } from 'use-debounce';
```

```
const [searchInput, setSearchInput] = useState('')
const [search] = useDebounce(searchInput, 400)
```

и

```
onChange={(e)=>setSearchInput(e.target.value)}
```

---

## 3️⃣ SECURITY — API sort field

Сейчас:

```ts
const SORTABLE_FIELDS = [...]
```

но Prisma:

```
orderBy: { [orderField]: sortDir }
```

Лучше добавить **type guard**.

Мини-патч:

```
const orderField: keyof Prisma.ClientOrderByWithRelationInput =
  SORTABLE_FIELDS.includes(sortBy) ? sortBy : 'createdAt';
```

---

## 4️⃣ ERP BUG — pagination reset

Сейчас:

```
search -> setPage(1)
```

но `sort` не делает reset.

Мини-патч:

```
setSortKey(key)
setSortDir('asc')
setPage(1)
```

---

## 5️⃣ UX — row click + checkbox

Сейчас:

```
checkbox click -> row click
```

иногда.

Нужно:

```
stopPropagation
```

для checkbox container.

---

# 📊 ERP Accounting Audit

С точки зрения **бухгалтерской ERP**.

Clients должны поддерживать:

```
creditLimit
payWithinDays
automaticDebtRemind
```

Это уже есть в API.

Очень хорошо.

---

### Что добавить позже (Task 47+)

#### Debtors aging

```
0-30
30-60
60-90
90+
```

#### Credit control

```
invoice create → check creditLimit
```

---

# 🧠 Архитектурная оценка

| компонент     | оценка |
| ------------- | ------ |
| ERPGrid       | ⭐⭐⭐⭐⭐  |
| ERPToolbar    | ⭐⭐⭐⭐   |
| ERPDetailTabs | ⭐⭐⭐⭐   |
| API           | ⭐⭐⭐⭐⭐  |
| Column config | ⭐⭐⭐⭐⭐  |

---

# 🚀 Что дальше (очень правильный порядок)

Leanid абсолютно правильно выбрал:

### Task 45

```
Purchases UI
```

---

### Task 46

```
Sales UI
```

---

### Task 47

```
Bank
```

---

### Task 48

```
Warehouse
```

---

# ⚡ Главный вывод

Solar ERP сейчас строится **правильно как настоящая ERP**, а не как CRUD приложение.

Ключевые признаки:

```
Journal Engine ✔
Posting Engine ✔
Tenant Isolation ✔
Chart of Accounts ✔
ERPGrid Engine ✔
```

Это уже **архитектура уровня Odoo / SAP lite**.

---

Leanid, если хочешь, я покажу **одну критически важную вещь**,
которую **95% ERP стартапов делают неправильно**.

Она называется:

**Document Engine**

и именно она делает ERP **в 10 раз мощнее**.

Очень рекомендую внедрить её **до Task 45 (Purchases)**.
