Ты сейчас показал **очень правильный референс ERP UX**. Фактически это классический **ERP Selection Dialog** — так работают SAP, Odoo, Site.pro, 1C, Business Central. И твоя идея абсолютно правильная: **выбор сущностей должен происходить через полноценное окно выбора, а не маленький dropdown**.

Я соберу **финальное ТЗ TASK 57 PRODUCTION UX**, опираясь на то, что ты показал.

---

# TASK 57 — Entity Selection Windows (ERP UX)

Цель:
сделать **профессиональный ERP-интерфейс выбора сущностей**:

* Products
* Clients
* Units
* Accounts
* Warehouses

через **модальные окна выбора (Selection Dialog)**.

---

# 1. PRODUCT SELECTION WINDOW

Открывается при:

```
Add Item
```

или

```
Item field click
```

---

## UX

Открывается **модальное окно**:

```
Select Product
────────────────────────────

Search...

MacBook Pro
MacBook Air
Consulting Service
Hosting
Import Duty
Custom Service

────────────────────────────
+ Create Product
────────────────────────────
```

Выбор:

```
select product
↓
Add
↓
item добавляется в документ
```

---

## Интерфейс как у Site.pro

Таблица:

| Item | Code | Unit | VAT | Price |
| ---- | ---- | ---- | --- | ----- |

Пример:

```
MacBook Pro     MAC-PRO   pcs   19%   2700
Consulting      CONS001   hours 19%   120
Import Duty     DUTY001   pcs   0%    0
```

---

# 2. CREATE PRODUCT FROM WINDOW

Внизу:

```
+ Create Product
```

Открывается:

```
Create Product

Name
Code
Unit
VAT rate
Default price
Category
```

После сохранения:

```
product автоматически выбран
```

---

# 3. CLIENT SELECTION WINDOW

При клике:

```
Supplier field
```

Открывается:

```
Select Client
```

Таблица:

| Name | Code | VAT | Country | Payment |
| ---- | ---- | --- | ------- | ------- |

Пример:

```
SWAPOIL GmbH
Amazon EU
Apple GmbH
Demo Supplier Ltd
```

---

Выбор:

```
select client
↓
supplierId обновляется
```

---

# 4. CREATE CLIENT FROM WINDOW

Кнопка:

```
+ Create Client
```

Форма:

```
Client name
Code
VAT number
Country
Payment terms
Email
Phone
```

После сохранения:

```
client выбран автоматически
```

---

# 5. UNIT OF MEASURE SELECTION

Это ты очень правильно заметил.

Тоже **selection window**.

```
Select Unit

pcs
kg
ton
liter
hour
day
```

---

# 6. ACCOUNT SELECTION

В ERP это важно.

```
Select Account
```

| Code | Name |
| ---- | ---- |

```
6000 Purchases
6001 Services
6002 Import expenses
7000 Sales
```

---

# 7. SEARCH UX

Поиск должен работать:

```
by name
by code
by barcode
```

Пример:

```
type: mac
```

результат:

```
MacBook Pro
MacBook Air
```

---

# 8. ДВА РЕЖИМА ВЫБОРА

### Быстрый (autocomplete)

```
type mac
↓
dropdown
↓
select
```

### Полный

```
click icon
↓
open selection window
```

---

# 9. API

### products

```
GET /api/products?search=
```

---

### clients

```
GET /api/clients?search=
```

---

### units

```
GET /api/units
```

---

### accounts

```
GET /api/accounts
```

---

# 10. REACT COMPONENTS

Создать универсальный компонент:

```
EntitySelectDialog
```

используется для:

```
products
clients
units
accounts
warehouses
```

---

Структура:

```
components/select/

EntitySelectDialog.tsx
EntityTable.tsx
EntitySearch.tsx
EntityCreateModal.tsx
```

---

# 11. PURCHASE ITEMS INTEGRATION

После выбора продукта:

```
{
 itemName
 itemCode
 unit
 vatRate
 price
}
```

заполняются автоматически.

---

# 12. ПРИМЕР UX

Добавление товара:

```
Add Item
↓
Product Selection Window
↓
Select Product
↓
Add
```

---

# 13. ПРОФЕССИОНАЛЬНЫЙ ERP UX

Это дает:

✔ большие списки товаров
✔ удобный поиск
✔ создание прямо из документа
✔ редактирование

Именно так работают:

```
SAP
Odoo
Business Central
Site.pro
1C
```

---

# 14. ЧТО МЫ ПОЛУЧАЕМ

Solar ERP становится:

```
Production-ready ERP UI
```

---

# 15. СЛОЖНОСТЬ

Примерно:

```
700–900 строк кода
```

Но это **фундамент всей системы**.

---

💡 И ещё важный момент из твоих скринов.

Ты показал очень правильную вещь:

**строка позиции должна быть редактируемой прямо в таблице**
как здесь:

```
Item | Qty | Price | VAT
```

Это следующий этап — **TASK 58 (Editable Grid)**.

---

Если хочешь, я дальше могу сразу сделать:

**TASK 58 — ERP Editable Grid (как в SAP / Site.pro)**

Это сделает Solar ERP **в 5 раз мощнее UX**, чем сейчас.
