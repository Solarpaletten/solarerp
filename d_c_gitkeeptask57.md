Отвечаю как **консультант-аудитор ERP-архитектуры и бухгалтерского учёта (IFRS / DATEV / EU VAT)**.
Это будет **полное техническое задание TASK 57**, которое вы можете **напрямую отдать Claude**.
ТЗ учитывает всё, что вы показали на скринах.

---

# TASK 57

# PURCHASE DOCUMENT — FULL ACCOUNTING STRUCTURE

Цель:

Сделать **профессиональный документ поступления товаров/услуг**, который:

* поддерживает **модальные селекты**
* поддерживает **склад**
* поддерживает **тип операции**
* поддерживает **VAT engine**
* поддерживает **двойную бухгалтерскую запись**
* готов к **journal posting**

---

# 1. ОБЩАЯ АРХИТЕКТУРА ДОКУМЕНТА

Документ:

```
PurchaseDocument
```

состоит из:

```
HEADER
LINES
TOTALS
POSTING DATA
```

---

# 2. HEADER ДОКУМЕНТА

Верхняя часть документа должна содержать:

```
Purchase Date
Supplier
Warehouse
Operation Type
Responsible Employee
Currency
Comments
```

---

# 3. SELECT DIALOGS (МОДАЛЬНЫЕ ОКНА)

Все ключевые сущности выбираются **через модальные окна**.

Не через обычный dropdown.

Использовать общий компонент:

```
EntitySelectDialog
```

---

# 4. СПИСОК СЕЛЕКТОВ

## 4.1 Supplier Select

Поле:

```
Supplier
```

Открывает:

```
ClientSelectDialog
```

Внутри:

```
name
clientCode
VAT number
payment terms
country
```

Выбор сохраняет:

```
supplierId
```

---

## 4.2 Warehouse Select

Поле:

```
Warehouse
```

Открывает:

```
WarehouseSelectDialog
```

Список:

```
id
warehouseName
isDefault
active
responsibleEmployeeId
```

После выбора:

```
warehouseId
```

и автоматически подтягивается:

```
responsibleEmployeeId
```

---

# 5. RESPONSIBLE EMPLOYEE

Поле:

```
Responsible Employee
```

Открывает:

```
EmployeeSelectDialog
```

Таблица сотрудников:

```
id
name
position
department
active
```

Выбор сохраняет:

```
employeeId
```

---

# 6. OPERATION TYPE (КЛЮЧЕВАЯ ЛОГИКА)

Поле:

```
Operation Type
```

Открывает:

```
OperationTypeSelectDialog
```

Таблица:

```
operation_types
```

Поля:

```
id
operationName
operationCode

debitAccount
creditAccount
vatAccount
expenseAccount
advanceAccount
revenueAccount

responsibleEmployee
active
priority
```

---

# Operation Type определяет

```
какие счета использовать
есть ли склад
есть ли VAT
тип документа печати
тип бухгалтерской операции
```

---

# ПРИМЕРЫ OPERATION TYPE

### Purchase goods

```
DR Inventory
DR VAT Input
CR Supplier
```

### Purchase services

```
DR Expense
DR VAT Input
CR Supplier
```

### Advance invoice

```
DR Advances paid
CR Supplier
```

---

# 7. PURCHASE LINES

Каждая строка содержит:

```
Product
Code
Unit
Qty
Price
VAT Rate
Account
Net
Gross
```

---

# 8. PRODUCT SELECT

Поле:

```
Product
```

Открывает:

```
ProductSelectDialog
```

Поля:

```
productId
productName
productCode
unit
type (goods / service)
defaultVatRateId
```

---

# После выбора продукта:

автоматически заполняются:

```
unit
vatRate
account (если задан default)
```

---

# 9. VAT RATE SELECT

В строке:

```
VAT Rate
```

Открывает:

```
VATRateSelectDialog
```

Таблица:

```
vat_rates
```

Поля:

```
id
name
ratePercent
category
code
isDefault
active
effectiveFrom
```

---

# VAT категории

```
STANDARD
REDUCED
ZERO_EXPORT
ZERO_INTRACOM
REVERSE_CHARGE
NO_VAT
```

---

# В строке хранить

```
vatRateId
vatPercent
vatCategory
```

---

# 10. ACCOUNT SELECT

Поле:

```
Account
```

Открывает:

```
AccountSelectDialog
```

Таблица:

```
chart_of_accounts
```

Поля:

```
accountNumber
accountName
type
active
```

---

# Логика счета

Если:

```
operationType = goods
```

использовать:

```
inventoryAccount
```

Если:

```
operationType = services
```

использовать:

```
expenseAccount
```

---

# 11. TOTALS ENGINE

Внизу документа рассчитывается:

```
Net Total
VAT Total
Grand Total
```

Формулы:

```
net = qty * price
vat = net * vatPercent / 100
gross = net + vat
```

---

# 12. HEADER TOTALS

Блок:

```
Net Total
VAT 19%
Grand Total
```

---

# 13. JOURNAL PREPARATION

Документ должен быть готов к posting.

При нажатии:

```
POST
```

система вызывает:

```
createPurchaseJournalEntry()
```

---

# 14. JOURNAL ENTRY СТРУКТУРА

```
journal_entries
```

```
id
companyId
date
documentType
documentId
description
```

---

# 15. JOURNAL LINES

```
journal_lines
```

```
accountId
debit
credit
description
```

---

# Пример

Покупка услуги:

```
DR 6002 Services expense
DR 2441 VAT input
CR 4430 Supplier
```

---

# 16. STOCK MOVEMENT

Если:

```
operationType.affectsWarehouse = true
```

создать:

```
stock_movement
```

```
IN
warehouseId
productId
qty
price
```

---

# 17. FIFO LAYER

Для товаров создать:

```
stock_lots
```

```
productId
warehouseId
qty
cost
```

---

# 18. ДОКУМЕНТЫ ПЕЧАТИ

Operation Type определяет:

```
Purchase invoice
Goods receipt
Advance invoice
Service receipt
```

---

# 19. UI ТРЕБОВАНИЯ

Использовать:

```
Dialog
Search
Keyboard navigation
ESC close
Enter select
```

---

# 20. СЕЛЕКТЫ КОТОРЫЕ ДОЛЖНЫ РАБОТАТЬ

```
SupplierSelectDialog
ProductSelectDialog
WarehouseSelectDialog
EmployeeSelectDialog
AccountSelectDialog
OperationTypeSelectDialog
VATRateSelectDialog
```

---

# 21. БИЗНЕС ЛОГИКА

Document → Operation Type → Posting Rules → Journal Entry

---

# 22. ВАЛИДАЦИИ

Перед POST:

проверить:

```
supplierId
warehouseId
operationTypeId
items.length > 0
qty > 0
```

---

# 23. БАЛАНС

Перед сохранением journal:

```
sum(debit) == sum(credit)
```

---

# 24. РЕЗУЛЬТАТ TASK 57

После реализации:

Solar ERP сможет:

```
✔ делать приход товаров
✔ учитывать услуги
✔ учитывать авансы
✔ учитывать VAT
✔ учитывать склад
✔ создавать бухгалтерские проводки
✔ готовить отчеты
```

---

# Архитектурный итог

Это превращает Solar ERP из:

```
UI приложения
```

в

```
настоящую бухгалтерскую ERP систему
```

---

Если хочешь, я ещё покажу **одну вещь**, которую **99% ERP делают неправильно**,
и которая может сделать **Solar ERP сильнее SAP и Odoo архитектурно**.
