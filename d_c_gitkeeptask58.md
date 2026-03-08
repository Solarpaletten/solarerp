Leanid, держим фокус.
Ни шаг в сторону — **Solar ERP Phase 3**.

Я дам **полное ТЗ для Claude**, чтобы инженер **не задавал ни одного уточняющего вопроса**.

---

# TASK 58 — Phase 3

# SelectDialogs Integration in Purchase Editor

**Module:** Purchases
**Layer:** UI
**Goal:** заменить dropdown на ERP-стиль модальных селекторов.

---

# 1. Цель задачи

Интегрировать **4 SelectDialog компонента** в Purchase Editor.

В результате пользователь сможет выбирать:

* Supplier
* Warehouse
* Operation Type
* VAT Rate

через **модальные окна с поиском**, а не через dropdown.

---

# 2. Архитектурное правило Solar ERP

❗ Для всех справочников ERP используется **Dialog + Search**, а не dropdown.

Причины:

| Причина         | Объяснение                           |
| --------------- | ------------------------------------ |
| ERP масштаб     | может быть 10 000+ клиентов          |
| скорость        | поиск быстрее                        |
| UX              | стандарт SAP / Oracle / DATEV        |
| универсальность | один компонент для всех справочников |

---

# 3. Новый универсальный компонент

Создать компонент:

```
components/select-dialog/SelectDialog.tsx
```

Это **универсальный селектор**.

---

# 4. Props компонента

```
title: string
apiEndpoint: string
columns: { key: string; label: string }[]
valueField: string
labelField: string
onSelect: (row: any) => void
```

---

# 5. Поведение компонента

UI поток:

```
click field
     ↓
open modal
     ↓
search/filter
     ↓
select row
     ↓
return value
     ↓
close modal
```

---

# 6. Структура UI

```
+-----------------------------------+
| Select Supplier                   |
+-----------------------------------+

Search: [____________________]

------------------------------------
Code        Name
SUP-001     Demo Supplier Ltd
SUP-002     Oil Trading GmbH
SUP-003     Logistics Partner
------------------------------------

[Cancel]
```

---

# 7. API интеграция

Компонент делает:

```
GET apiEndpoint
```

и получает:

```
{ data: [...] }
```

---

# 8. Purchase Editor интеграция

Файл:

```
app/(dashboard)/company/[companyId]/purchases/new/page.tsx
```

Добавить селекторы.

---

# 9. Supplier Selector

API

```
GET /api/company/{companyId}/clients?role=SUPPLIER
```

Columns

```
code
name
email
```

Возвращает:

```
supplierId
supplierName
supplierCode
```

---

# 10. Warehouse Selector

API

```
GET /api/company/{companyId}/warehouses
```

Columns

```
code
name
responsibleEmployee.name
```

---

# 11. Operation Type Selector

API

```
GET /api/company/{companyId}/operation-types?module=PURCHASE
```

Columns

```
code
name
```

---

# 12. VAT Rate Selector

API

```
GET /api/company/{companyId}/vat-rates
```

Columns

```
code
rate
name
```

---

# 13. Purchase Editor state

Добавить state:

```
supplierId
supplierName

warehouseId
warehouseName

operationTypeCode

vatRateCode
vatRate
```

---

# 14. Пример использования

```
<SelectDialog
 title="Select Supplier"
 apiEndpoint={`/api/company/${companyId}/clients?role=SUPPLIER`}
 columns={[
   { key: 'code', label: 'Code' },
   { key: 'name', label: 'Name' },
 ]}
 valueField="id"
 labelField="name"
 onSelect={(row) => {
   setSupplierId(row.id)
   setSupplierName(row.name)
 }}
/>
```

---

# 15. UX детали

Добавить:

```
ESC — закрывает модалку
click outside — закрывает
Enter — выбирает строку
```

---

# 16. Поиск

Search должен фильтровать:

```
code
name
email
```

на frontend.

---

# 17. Таблица

Использовать Tailwind.

Стиль:

```
hover:bg-gray-100
cursor-pointer
```

---

# 18. Performance

Ограничить:

```
max-height: 400px
overflow-y: auto
```

---

# 19. После выбора

Поле в форме показывает:

```
SUP-001 — Demo Supplier Ltd
```

---

# 20. Проверка

Должно работать:

| Action         | Result              |
| -------------- | ------------------- |
| Click Supplier | открывается модалка |
| Search         | фильтрует           |
| Select         | возвращает данные   |
| ESC            | закрывает           |

---

# 21. Не ломать

❗ Не изменять:

```
API
Prisma schema
Seed
```

Работа только на UI.

---

# 22. Результат

Purchase Editor должен выглядеть так:

```
Supplier        [ SUP-001 Demo Supplier Ltd ]
Warehouse       [ WH-MAIN Main ]
Operation Type  [ PIRK Purchase goods ]
VAT Rate        [ 19% Standard ]
```

Все поля открывают **SelectDialog**.

---

# 23. Commit

После выполнения:

```
feat(purchases): add SelectDialog selectors for Supplier, Warehouse, OperationType and VAT
```

---

# 24. Definition of Done

Работают:

* Supplier selector
* Warehouse selector
* OperationType selector
* VAT selector

Dropdown полностью убраны.

---

Leanid, после этого шага:

```
Foundation
API
UI selectors
```

будут готовы.

И **следующий этап будет самым красивым модулем ERP**:

**Posting Engine (бухгалтерский движок).**

Если хочешь — после того как Claude это сделает,
я дам **архитектуру Posting Engine**, чтобы мы не делали его хаотично.
