D=>L

Leanid, отлично. Я **интегрирую предложение Claude в наш архитектурный протокол**, чтобы всё осталось структурно и понятно для команды. Я не меняю логику — просто **добавляю и фиксирую решения Claude внутри нашего Task-flow**.

---

# SOLAR ERP

## Phase 2 — Client Editor UI

### 🎯 Цель

Убрать заглушку:

```text
/company/[companyId]/clients/new
```

И реализовать полноценный **Client Editor UI**, чтобы увидеть реальное создание клиента во фронтенде.

Это позволит проверить полный цикл:

```text
create → read → update → select in documents
```

---

# Task 55 — Client Editor UI

### Компоненты (предложение Claude)

Claude предложил **разделить форму на модули**, что архитектурно правильно.

```
ClientEditorPage
 ├── ClientGeneralForm
 ├── ClientContactForm
 ├── ClientAddressForm
 ├── ClientAccountingForm
 └── ClientActions
```

Это даёт:

```
чистую архитектуру
повторное использование компонентов
легкую поддержку
```

---

# Sections формы

## 1️⃣ General

```text
name
shortName
code
type
role
location
vatCode
```

---

## 2️⃣ Contact

```text
email
phoneNumber
contactInfo
notes
```

---

## 3️⃣ Financial / Accounting

```text
payWithinDays
creditLimit
creditLimitCurrency
receivableAccountCode
payableAccountCode
automaticDebtRemind
```

---

## 4️⃣ Registration Address

```text
registrationCountryCode
registrationCity
registrationAddress
registrationZipCode
```

---

## 5️⃣ Correspondence Address

```text
correspondenceCountryCode
correspondenceCity
correspondenceAddress
correspondenceZipCode
```

---

## 6️⃣ Banking

```text
bankAccount
bankName
bankCode
bankSwiftCode
```

---

# API интеграция

Использовать существующий backend.

### Create

```
POST /api/company/[companyId]/clients
```

### Load

```
GET /api/company/[companyId]/clients/[clientId]
```

### Update

```
PATCH /api/company/[companyId]/clients/[clientId]
```

---

# UX правила

Claude правильно предложил минимальные ограничения.

Обязательно:

```
name required
```

Дополнительно:

```
Save disabled during request
prevent double submit
Cancel button
```

---

# Result Task 55

После выполнения должно работать:

```
Clients list
   ↓
New Client
   ↓
Fill form
   ↓
Save
   ↓
Client created
   ↓
Client selectable in Sales / Purchases
```

---

# Phase 2.5 — Demo Data Concept

(идея из голосового аудита Leanid + Claude)

Это **очень сильное UX-решение**.

### Demo Clients

Seed данные:

```
Demo Supplier
Demo Customer
Demo Bank
Demo Government
```

---

### Demo Product

```
Demo Product
unit: pcs
price: 100
VAT: 19
```

---

# Как будет работать документ

При создании Purchase:

```
Supplier не выбран
 → Demo Supplier
```

Если товар не выбран:

```
Product → Demo Product
Quantity → 1
VAT → 19%
```

Результат:

```
документ сразу имеет сумму
```

Бухгалтер:

```
исправляет 5 демо полей
вместо заполнения 50
```

Это **очень сильный ERP UX-паттерн**.

---

# Phase Roadmap

```
Phase 2
Client Editor UI
(Task 55)

Phase 2.5
Demo Data
(Task 56)

Phase 3
Purchase Product Select
Supplier Select
Auto Defaults
```

---

# Новый рабочий протокол команды

```
Task → Claude implementation
↓
Voice audit (Leanid + Dashka)
↓
Architectural adjustments
↓
Next Task defined
↓
Deploy
```

Это **очень эффективный цикл разработки ERP**.

---

# Мой архитектурный комментарий

Claude предложил **правильную декомпозицию формы**:

```
ClientEditorPage
+ modular forms
```

Это **enterprise-подход**, потому что позже можно:

```
reuse ContactForm
reuse AddressForm
reuse AccountingForm
```

в:

```
Suppliers
Banks
Employees
Partners
```

---

# L=>D

Leanid, сейчас есть **два возможных хода**, и один из них лучше.

### Вариант 1 (быстрый)

Сразу делать Task 55.

### Вариант 2 (правильнее)

Перед Task 55 добавить **один маленький слой**:

```
ClientForm.tsx (единая форма)
```

и использовать её и для:

```
/clients/new
/clients/[id]
```

Это уменьшит код **в 2 раза**.

---

Если хотите, я могу сразу дать **Task 55 v2 (production-уровня)** —
Claude сделает **весь Client UI за один проход без доработок**.
