🔷 D=>C — Task 43: Client FK Integration

(Enterprise AR/AP Foundation)

1️⃣ Цель задачи

Перевести Solar ERP с:

clientName / supplierName (string)

на:

clientId / supplierId (FK → Client.id)
+ snapshot полей

Это фундамент для:

Дебиторской задолженности (Accounts Receivable)

Кредиторской задолженности (Accounts Payable)

Aging отчетов

Контроля creditLimit

Корректных сверок

Без FK финансовое ядро неполноценное.

2️⃣ Изменения в schema.prisma
2.1 SaleDocument

Добавить:

clientId String?

client Client? @relation(
  fields: [clientId],
  references: [id],
  onDelete: Restrict
)

@@index([companyId, clientId])

❗ clientId nullable на этом этапе.

2.2 PurchaseDocument

Добавить:

supplierId String?

supplier Client? @relation(
  fields: [supplierId],
  references: [id],
  onDelete: Restrict
)

@@index([companyId, supplierId])
3️⃣ Принцип бухгалтерского snapshot

FK ≠ замена строк.

Мы сохраняем:

clientName

clientCode

supplierName

supplierCode

Правило:

При создании документа по clientId/supplierId
система автоматически заполняет snapshot поля.

Изменение Client в будущем
НЕ меняет исторический документ.

Это принцип бухгалтерской неизменяемости.

4️⃣ Migration Strategy
4.1 Фаза 1 — безопасное добавление

Добавить clientId и supplierId как nullable

Добавить индексы

Добавить FK с ON DELETE RESTRICT

Без backfill на этом этапе.

4.2 Никакого NOT NULL

NOT NULL вводится позже,
когда UI и импорт полностью переведены на FK.

5️⃣ API Изменения (обязательно tenant-safe)
5.1 SaleDocument API

При POST / PATCH:

Если передан clientId:

Проверить:

client.companyId == companyId

company.tenantId == tenantId

client.isActive == true

Заполнить snapshot:

clientName = client.name
clientCode = client.code

Если clientId не передан — допускается legacy режим (string only).

5.2 PurchaseDocument API

Аналогично:

supplierId

tenant validation

snapshot заполнение

6️⃣ Delete / Deactivate правила

Client DELETE уже soft.

Но теперь:

Если Client связан с SaleDocument или PurchaseDocument через FK —

❌ Hard delete невозможен
FK Restrict гарантирует это на уровне БД.

7️⃣ Acceptance Criteria

Claude должен выдать:

1️⃣ Обновлённый schema diff

(только SaleDocument и PurchaseDocument)

2️⃣ Migration SQL

add columns

add indexes

add FK constraints

3️⃣ Обновлённые API файлы

sales create/update

purchases create/update

4️⃣ Короткий README

Smoke test:

1. Создать Client
2. Создать SaleDocument с clientId
3. Проверить:
   - clientId сохранён
   - clientName заполнен
4. Попробовать удалить Client → ошибка
8️⃣ Бухгалтерский контроль (важно)

Claude обязан:

НЕ трогать JournalEntry

НЕ менять Posting Engine

НЕ менять Stock Engine

НЕ ломать seed

НЕ делать destructive changes

9️⃣ Результат после Task 43

Solar ERP становится:

Документ → Контрагент (FK) → Журнал → Дебиторка

Это переход от MVP ERP
к финансовому ядру.

Сигнал дан.
Можно передавать Claude.

После выполнения — проведём аудит на соответствие IFRS-логике и принципам двойной записи.