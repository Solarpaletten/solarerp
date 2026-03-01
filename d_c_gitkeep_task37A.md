Отлично. Foundation стабилен. Идём к 37A.

---

# 📘 TASK 37A — Purchase Document Header (Enterprise Version)

## 🎯 Цель

Реализовать **верхнюю часть страницы Purchase Document**:

```
/company/[companyId]/purchases/[purchaseId]
```

Это НЕ items.
Это НЕ totals.
Это только документная шапка (как в настоящем ERP).

---

# 🏗 Архитектура

Создать:

```
components/purchases/PurchaseHeader.tsx
```

И подключить в:

```
app/(dashboard)/company/[companyId]/purchases/[purchaseId]/page.tsx
```

---

# 📋 Что должно быть в Header

## 1️⃣ Document Identity Block

Слева:

* Series
* Number
* Purchase Date
* Due Date
* Status Badge

Формат:

```
SW-311225
31.12.2025
Due: 05.01.2026
[ DRAFT ]
```

---

## 2️⃣ Supplier Block

* Supplier Name
* Supplier Code (если есть)
* Валюта

---

## 3️⃣ Meta Block

* Warehouse
* Operation Type
* Employee
* Comments (если есть)

---

# 🧠 Статусы

Поддерживаем:

```
DRAFT
POSTED
CANCELLED
LOCKED
```

Badge цвет:

```
DRAFT      → gray
POSTED     → green
CANCELLED  → red
LOCKED     → blue
```

---

# 📦 API

Создать route:

```
GET /api/company/[companyId]/purchases/[purchaseId]
```

Возвращает:

```ts
{
  id
  series
  number
  purchaseDate
  payUntil
  supplierName
  supplierCode
  warehouseName
  operationType
  currencyCode
  employeeName
  comments
  status
}
```

Tenant check обязателен.

---

# 🖥 UI Требования

* Tailwind
* Чистый ERP layout
* Без карточек с тенями
* Белый фон
* Тонкая граница
* Сетка 3 колонки на desktop
* 1 колонка на mobile

---

# 🔒 Правила

* Если document not found → 404
* Если tenant mismatch → 404
* Если status CANCELLED → поля readonly (пока просто визуально)

---

# 📂 Структура страницы

```
Purchases/[purchaseId]/page.tsx
   ├── PurchaseHeader
   ├── PurchaseItemsTable (37B)
   └── PurchaseTotals (37C)
```

Сейчас делаем только Header.

---

# 🚫 Не делать сейчас

* Не делать edit
* Не делать form state
* Не делать save
* Не делать validation
* Не делать items
* Не делать totals

Это только Read View.

---

# 🧪 Acceptance Criteria

* Документ открывается
* Header отображается корректно
* Status badge корректный
* Нет console errors
* Нет hydration warnings

---

# 🎯 Цель 37A

Сделать ощущение настоящего ERP документа,
а не "страницы формы".

---

Скопируй это как ТЗ для Claude.

Когда будет код — делаем Gate Review.
