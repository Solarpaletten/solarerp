Отлично.
Работаем строго по протоколу.

D=>C
Задача уровня ядра. Без UI. Без лишних сущностей. Только бухгалтерский фундамент.

---

# 📘 ТЗ для Claude

**Task 21 — Accounting Core: JournalEntry + JournalLine (Schema Only)**

Версия: v0.4.0-accounting-core-base
Тип: Structural / Prisma Layer
UI: ❌
API: ❌
Service Layer: ❌
Только Prisma + миграция + индексы.

---

## 🎯 Цель

Создать бухгалтерское ядро системы.

После выполнения:

* ERP получает ledger (журнал проводок)
* Любой документ в будущем сможет создавать проводки
* ОСВ будет вычисляться из JournalLine
* Банк сможет закрывать задолженность

---

## 🧱 1️⃣ Обязательные модели в Prisma

Добавить в `schema.prisma`:

```prisma
model JournalEntry {
  id           String   @id @default(cuid())
  companyId    String
  date         DateTime
  documentType String
  documentId   String?
  createdAt    DateTime @default(now())

  lines    JournalLine[]
  company  Company @relation(fields: [companyId], references: [id], onDelete: Cascade)

  @@index([companyId])
  @@index([date])
}

model JournalLine {
  id        String   @id @default(cuid())
  entryId   String
  accountId String
  debit     Decimal  @default(0)
  credit    Decimal  @default(0)

  entry   JournalEntry @relation(fields: [entryId], references: [id], onDelete: Cascade)
  account Account      @relation(fields: [accountId], references: [id])

  @@index([accountId])
  @@index([entryId])
}
```

---

## ⚙️ 2️⃣ Требования к Decimal

Убедиться, что используется:

```prisma
Decimal @db.Decimal(18, 2)
```

Для `debit` и `credit`.

---

## 🔐 3️⃣ Архитектурные правила

Claude должен:

* ❌ НЕ создавать API
* ❌ НЕ создавать UI
* ❌ НЕ менять существующие документы
* ❌ НЕ добавлять Payment, OpenBalance
* ❌ НЕ менять Account модель

Только добавить JournalEntry + JournalLine.

---

## 🧪 4️⃣ После изменения схемы

Выполнить:

```bash
npx prisma migrate dev
npx prisma generate
```

Имя миграции:

```
accounting_core_journal_base
```

---

## 🧠 5️⃣ Проверка после миграции

Claude обязан проверить:

* таблица journal_entries существует
* таблица journal_lines существует
* FK работают
* cascade delete работает

---

## 📦 6️⃣ Ожидаемый результат

В базе появятся:

```
public.journal_entries
public.journal_lines
```

И всё.

Никакой логики.

---

## 📌 Acceptance Criteria

* [ ] Prisma schema обновлён
* [ ] Миграция применена
* [ ] Prisma client пересобран
* [ ] Индексы созданы
* [ ] FK связи работают
* [ ] Dev server стартует без ошибок

---

## 🏗 Версия

После завершения:

```
git commit -m "Task 21: Accounting core (JournalEntry + JournalLine)"
git tag v0.4.0-accounting-core-base
```

---

D=>C
Сделать строго по ТЗ.
Без расширений.
Без инициативы вне задачи.
Сначала фундамент.

---

Когда Claude ответит — я проверю архитектурно.
