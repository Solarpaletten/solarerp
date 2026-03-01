Отлично.Формулируем строго, без расплывчатости.

Ниже готовое ТЗ для Claude.

---

# D => C

# Task 33 — Chart of Accounts: Selection + Toolbar(Frontend Only)

## Цель

Добавить в Chart of Accounts:

1. Чекбоксы на строках
2. Select All в header
3. Toolbar при выборе
4. Copy Selected → CSV
5. UI - архитектура без backend - изменений

⚠️ Bulk delete endpoint не делаем в этом таске.
⚠️ Delete All не делаем в этом таске.
⚠️ Только frontend + существующие DELETE по одному.

---

## Файл

  ```
app/(dashboard)/company/[companyId]/chart-of-accounts/page.tsx
```

---

## 1️⃣ State управления выбором

Добавить:

```ts
const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
```

Использовать Set, не Array.

---

## 2️⃣ Select All(header checkbox)

В `<thead>` добавить первую колонку:

* Checkbox
  * checked если selectedIds.size === filteredAccounts.length
    * indeterminate если часть выбрана
      * onChange → выбрать все filteredAccounts или очистить

---

## 3️⃣ Row checkbox

В каждой строке:

* Checkbox
  * checked = selectedIds.has(account.id)
    * toggle через новый Set(immutability)

---

## 4️⃣ Подсветка выбранных строк

Если selectedIds.has(account.id):

```
bg-blue-50
```

---

## 5️⃣ Toolbar(показывать если selectedIds.size > 0)

Разместить над таблицей.

  UI:

```
{N} selected

[ Copy CSV ]
[ Clear Selection ]
[ Delete Selected ]
```

Delete Selected пока использует существующий DELETE по одному(цикл).

---

## 6️⃣ Copy CSV

Формат:

```
code,nameDe,nameEn,type
1000,Kasse,Cash,ASSET
```

  * Только выбранные
    * Использовать navigator.clipboard
      * Показывать временный banner "Copied"

---

## 7️⃣ Delete Selected

Поведение:

* confirm()
  * DELETE по одному через существующий endpoint
    * собрать статистику deleted / failed
      * alert или banner
        * очистить selectedIds
          * вызвать fetchAccounts()

⚠️ Не падать если один из счетов не удалился.

---

## 8️⃣ Архитектурные требования

  * Никаких any
    * Никакого дублирования логики
      * Никакого ломания существующего CRUD
        * Не менять API

---

## 9️⃣ НЕ ДЕЛАТЬ

❌ Backend изменения
❌ Delete All
❌ System account protection
❌ Migration

---

## Ожидаемый результат

  * Рабочий selection
    * Чистый state
      * Профессиональный toolbar
        * Код без хаоса

---

  Это Task 33.

После выполнения → будем делать Task 34(Safe Bulk Delete backend).

Передаю инженеру.
