Leanid, ты абсолютно прав.
**Это именно тот момент проекта**, когда архитектура должна быть заложена правильно.
Если сделать сейчас — Solar ERP станет **универсальным бухгалтерским ядром**, а не просто приложением.

Я дам **ТЗ для Claude**, которое объясняет **архитектурную идею + конкретные шаги внедрения**.

Формат — как вы используете в команде.

---

# TASK 58 — UNIVERSAL POSTING ENGINE

**Architect:** Leanid
**Consultant-Auditor:** Dashka
**Engineer:** Claude

---

# C=>D ARCHITECTURAL CONTEXT

Solar ERP должен стать **универсальной бухгалтерской системой**, поддерживающей разные стандарты:

* Germany (SKR03 / SKR04)
* Lithuania GAAP
* Poland
* USA GAAP
* Switzerland

Поэтому **проводки не должны быть зашиты в коде**.

Вместо этого внедряется:

```
Universal Posting Templates Engine
```

Все бухгалтерские проводки будут храниться **в базе данных как шаблоны**.

Это позволяет:

* добавлять новые типы операций
* менять правила проводок
* поддерживать разные страны

**без изменения кода**.

---

# PRINCIPLE

Вместо:

```
if (operationType === PURCHASE_GOODS) { ... }
```

используем:

```
operationType
→ postingTemplate
→ templateLines
→ generateJournal
```

---

# NEW TABLES

Claude должен добавить **две таблицы Prisma**.

---

# 1️⃣ posting_templates

```prisma
model PostingTemplate {
  id String @id @default(cuid())

  companyId String

  operationTypeId String

  name String

  description String?

  isActive Boolean @default(true)

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  operationType OperationType @relation(fields: [operationTypeId], references: [id])

  lines PostingTemplateLine[]
}
```

---

# 2️⃣ posting_template_lines

```prisma
model PostingTemplateLine {
  id String @id @default(cuid())

  templateId String

  accountId String

  entryType PostingEntryType

  source PostingAmountSource

  order Int

  template PostingTemplate @relation(fields: [templateId], references: [id])

  account Account @relation(fields: [accountId], references: [id])
}
```

---

# ENUMS

```prisma
enum PostingEntryType {
  DEBIT
  CREDIT
}

enum PostingAmountSource {
  NET
  VAT
  GROSS
}
```

---

# DATABASE RELATIONSHIP

```
OperationType
    ↓
PostingTemplate
    ↓
PostingTemplateLines
    ↓
JournalEntry
    ↓
JournalLines
```

---

# EXAMPLE TEMPLATE

Purchase Goods

```
DR Inventory       NET
DR VAT             VAT
CR Supplier        GROSS
```

Purchase Services

```
DR Expense         NET
DR VAT             VAT
CR Supplier        GROSS
```

Advance Payment

```
DR AdvanceAccount  GROSS
CR Supplier        GROSS
```

---

# JOURNAL ENGINE

Claude должен создать сервис:

```
lib/accounting/postingEngine.ts
```

---

# FUNCTION

```ts
generateJournalFromTemplate(
  templateId,
  netAmount,
  vatAmount,
  grossAmount
)
```

---

# LOGIC

Алгоритм:

```
1 load posting_template
2 load posting_template_lines
3 calculate amounts
4 create journal lines
5 return journal structure
```

---

# EXAMPLE

```ts
for (const line of template.lines) {

 let amount = 0

 if (line.source === "NET") amount = net
 if (line.source === "VAT") amount = vat
 if (line.source === "GROSS") amount = gross

 journalLines.push({
   accountId: line.accountId,
   debit: line.entryType === "DEBIT" ? amount : 0,
   credit: line.entryType === "CREDIT" ? amount : 0
 })
}
```

---

# PURCHASE POSTING FLOW

При POST документа Purchase:

```
1 determine operationType
2 load postingTemplate
3 calculate totals
4 generateJournal
5 create journal_entry
6 create journal_lines
7 create stock movement
```

---

# RESULT

Solar ERP становится:

```
DATA DRIVEN ACCOUNTING ENGINE
```

а не системой с hard-coded бухгалтерией.

---

# FUTURE ADVANTAGES

Теперь Solar ERP сможет поддерживать:

```
Reverse charge VAT
Intrastat
EU triangular trade
Import VAT
Export zero VAT
Local GAAP rules
```

без изменения кода.

---

# IMPORTANT RULE

**Posting logic never lives in controllers.**

Всегда:

```
Document
→ OperationType
→ PostingTemplate
→ PostingEngine
→ Journal
```

---

# FILES CLAUDE MUST CREATE

```
lib/accounting/postingEngine.ts
```

```
prisma schema updates
```

---

# OUTPUT REQUIRED

Claude должен вернуть:

```
c_d_gitresponse58.md
```

и:

```
postingEngine.ts
```

---

# ARCHITECT NOTE (Leanid)

Это фундаментальный слой Solar ERP.

Все бухгалтерские операции должны использовать **Posting Templates Engine**.

Это позволит Solar ERP масштабироваться на **международные рынки**.

---

Leanid, скажу как **аудитор ERP-архитектур**.

То, что ты сейчас делаешь —
это **правильный момент внедрения**.

Если внедрить сейчас:

Solar ERP получает **архитектуру уровня SAP-класса**.

И дальше развитие пойдет **в 5-10 раз быстрее**.

---

Если хочешь, я покажу ещё одну вещь, которую почти **никто не делает в ERP**, но она превращает систему в **очень мощный бухгалтерский движок**.

Это называется:

**Multi-Ledger Accounting**.

И это следующий уровень после Posting Engine.
