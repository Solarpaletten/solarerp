D=>C ⚠️ Стоп. Корректировка по Task 24 — ты **расширил scope** без согласования.

Консультант-аудитор дал **чёткий MVP**:

* ✅ `AccountingPeriod` модель
* ✅ правило проверки “period closed” перед **созданием документов / journal / storno**
* ✅ один endpoint: **POST …/close**
* ✅ без UI
* ❌ без “open”
* ❌ без “list”
* ❌ без “closedBy”
* ❌ без “запрета будущих периодов” (не обсуждали)

Мы идём по доктрине: **минимум, атомарно, без распыления**.

---

# D=>C | ТЗ CORRECTION — Task 24 (Period Locking MVP)

## 0) Привести deliverable к согласованному объёму

Убрать из пакета/ветки:

* `POST .../open`
* `GET .../periods`
* поля/логику `closedBy`
* любые “future period” правила

Если хочешь оставить как optional — только отдельным `task24.x` после того как MVP принят. Сейчас — **нет**.

---

## 1) Prisma: модель строго как в ТЗ аудитора

```prisma
model AccountingPeriod {
  id        String   @id @default(cuid())
  companyId String
  year      Int
  month     Int
  isClosed  Boolean  @default(false)
  closedAt  DateTime?
  createdAt DateTime @default(now())

  company Company @relation(fields: [companyId], references: [id], onDelete: Cascade)

  @@unique([companyId, year, month])
  @@index([companyId])
  @@map("accounting_periods")
}
```

В `Company` добавить:

```prisma
accountingPeriods AccountingPeriod[]
```

Миграция — только под это.

---

## 2) Guard: одна функция, tx-only

Файл: `lib/accounting/periodLock.ts` (имя как в моём ТЗ)

* `getPeriodKey(date)` → `{ year, month }`
* `assertPeriodOpen(tx, { companyId, date })`

  * findUnique по (companyId, year, month)
  * если `isClosed` → throw `Error('PERIOD_CLOSED')`
  * если записи нет → open (MVP)

---

## 3) Enforcement: 2 контура (как я ставил)

### 3.1 В endpoints

Внутри `prisma.$transaction` **до** create/update:

* Sales POST: по `saleDate`
* Purchases POST: по `purchaseDate`
* Cancel sale/purchase: по дате документа (saleDate/purchaseDate)

### 3.2 В journalService (второй контур)

Перед созданием JournalEntry:

* `assertPeriodOpen(tx, { companyId: input.companyId, date: input.date })`

---

## 4) Endpoint: только CLOSE

Создать:
`app/api/company/[companyId]/periods/[year]/[month]/close/route.ts`

POST flow (tenant-safe):

* validate year/month (month 1..12)
* tx:

  * upsert по unique (companyId, year, month)
  * если уже closed → 409 `ALREADY_CLOSED`
  * иначе `isClosed=true, closedAt=now()`

---

## 5) Acceptance Criteria (строго)

* migration применена, таблица `accounting_periods` есть
* close endpoint работает и идемпотентен (409 при повторе)
* при закрытом периоде:

  * POST sales запрещён (`PERIOD_CLOSED`)
  * POST purchases запрещён (`PERIOD_CLOSED`)
  * POST cancel запрещён (`PERIOD_CLOSED`)
  * прямой вызов journalService тоже запрещён (`PERIOD_CLOSED`)

---

# D=>C | Что хочу от тебя сейчас

1. **Новый архив** `task24-period-locking-mvp.tar.gz` (очищенный scope)
2. `TASK24_REPORT.md`:

   * список изменённых файлов
   * команды migrate/generate
   * curl: close period + попытка создать sale/cancel в этом периоде

---

## Важное архитектурное примечание (для тебя)

“Open” и “List” мы сделаем, но **как отдельный таск** после принятия MVP. Сейчас задача — **закрыть период и заблокировать записи**. Всё.

D=>C — переделывай deliverable под MVP и сдавай повторно.
