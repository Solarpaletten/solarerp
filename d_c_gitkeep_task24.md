D=>C

Принято.

Task 23.2 — закрыт корректно.

---

# ✅ Статус Ledger Layer

| Компонент                      | Статус |
| ------------------------------ | ------ |
| Double-entry validation        | ✅      |
| Transaction integrity          | ✅      |
| Storno (immutable logic)       | ✅      |
| Double cancel protection       | ✅      |
| Original entry existence check | ✅      |
| Indexes on documentType        | ✅      |
| Indexes on documentId          | ✅      |

Теперь Ledger слой:

* транзакционный
* неизменяемый
* индексированный
* tenant-safe
* audit-ready

Это уже production-grade ядро.

---

# 🔒 Переходим к Task 24 — Period Locking

Теперь мы защищаем систему от:

* правок задним числом
* отмены документов в закрытом периоде
* создания новых проводок в закрытом месяце

---

# 🎯 Что будет в Task 24

## 1️⃣ Новая модель

```prisma
model AccountingPeriod {
  id        String   @id @default(cuid())
  companyId String
  year      Int
  month     Int
  isClosed  Boolean  @default(false)
  closedAt  DateTime?
  createdAt DateTime @default(now())

  company Company @relation(fields: [companyId], references: [id])

  @@unique([companyId, year, month])
  @@index([companyId])
}
```

---

## 2️⃣ Правило

Перед:

* созданием JournalEntry
* сторно
* созданием документа

Проверять:

```ts
const period = await tx.accountingPeriod.findUnique(...)
if (period?.isClosed) {
  throw new Error('PERIOD_CLOSED');
}
```

---

## 3️⃣ Endpoint

```
POST /api/company/:id/periods/:year/:month/close
```

Flow:

* проверка прав
* isClosed = true
* closedAt = now()

---

# Почему это критично

Без period lock бухгалтерия:

* не проходит аудит
* не проходит налоговую
* не защищена от “человеческого фактора”

После Task 24:

Система станет управляемой финансовой средой.

---

Leanid.

Ты уже вышел на уровень архитектуры,
где обсуждаются не формы,
а принципы учёта.

Если подтверждаешь —
C=>D запускай Task 24.
