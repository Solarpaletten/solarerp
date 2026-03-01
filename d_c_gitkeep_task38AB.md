Принято. Даём **D=>C ТЗ для Claude**: делаем **A (валидация PUT)** + сразу стартуем **B (Task 39 Posting Engine)**.

> ⚠️ Тех. ремарка: часть ранее загруженных файлов в tool-архиве уже “expired”. Если надо, чтобы я сослался/проверил конкретные файлы — просто перезагрузи их сюда.

---

## D=>C — ТЗ Claude: Task 38B.A (PUT validation) + Task 39 (Posting Engine)

### Контекст

* Уже есть:

  * **38A**: `/api/company/[companyId]/purchases/draft` создаёт **минимальный DRAFT** и `/purchases/new` редиректит на `/purchases/[id]`.
  * **37A/37B/37C**: read-view (Header, Items Table, Totals).
  * **38B**: dual-mode page (DRAFT editable, POSTED read-only) + PUT update (черновик).

Сейчас критично:

1. **A:** защитить PUT от мусора (иначе потом можно “Post” пустого документа).
2. **B:** сделать Posting (DRAFT → POSTED) с созданием Journal + StockMovement(IN) + FIFO lots в транзакции.

---

# A) Task 38B.A — Валидация в PUT `/api/company/[companyId]/purchases/[purchaseId]`

### Цель

Перед сохранением черновика гарантировать **минимально корректную структуру**, чтобы Task 39 мог безопасно “постить”.

### Требования к валидации (server-side)

В PUT (только для `status === 'DRAFT'`):

**1) Header validation (минимум):**

* `purchaseDate` — валидная дата (если пришла пустая/битая → 400)
* `supplierName` — не пустая строка (trim > 0) **если items не пустые**
  (разрешаем сохранять пустого поставщика, если пока нет items — но см. п.2)
* `warehouseName` — не пустая строка (если items не пустые)
* `currencyCode` — не пустая строка (если items не пустые)
* `operationType` — не пустая строка (если items не пустые)

**2) Items validation:**
Если `items` переданы:

* `items` может быть пустым массивом **только** если это “пустой черновик” (без заполнения) — но тогда:

  * header поля можно сохранять, но **posting потом должен запрещать**
* Для каждого item:

  * `itemName` trim > 0
  * `quantity > 0`
  * `priceWithoutVat >= 0` (лучше `> 0` — но минимум `>=0` ок)
  * `vatRate` если передан → `0..100`

**3) Ошибки:**

* Возвращать `400 { error: '...' }` с понятным текстом, например:

  * `INVALID_PURCHASE_DATE`
  * `ITEM_NAME_REQUIRED`
  * `ITEM_QTY_MUST_BE_POSITIVE`
  * `ITEM_PRICE_MUST_BE_NON_NEGATIVE`
  * и т.д.

**4) Транзакция items:**
Оставляем “deleteMany → createMany” (норм для MVP). Но валидируем ДО deleteMany, чтобы не стереть строки при плохом payload.

### Acceptance Criteria (A)

* PUT с мусорными items возвращает 400 и **не трогает** БД.
* PUT с валидными данными обновляет header + items, возвращает doc with items.
* PUT на `POSTED` возвращает 400 `Only DRAFT documents can be edited`.

---

# B) Task 39 — Posting Engine (DRAFT → POSTED)

### Цель

Добавить кнопку **Post** (в UI уже disabled) и API endpoint, который:

* проверяет документ,
* создаёт **journal entry**,
* создаёт **stock movements IN**,
* создаёт **FIFO lots**,
* ставит `status = 'POSTED'`,
* всё **в одной транзакции**.

---

## B1) API: POST `/api/company/[companyId]/purchases/[purchaseId]/post`

### Поведение

1. Tenant-safe проверка companyId принадлежит tenant.
2. Найти PurchaseDocument + items.
3. Проверить:

   * статус строго `DRAFT`
   * items.length > 0
   * header обязательные поля заполнены:

     * supplierName, warehouseName, currencyCode, operationType, purchaseDate
   * каждая позиция валидна (как в A, но жёстче: qty > 0, price >=0, itemName required)
4. Проверить период: `assertPeriodOpen(tx, { companyId, date: purchaseDate })`
5. Определить проводку:

   * На MVP: взять **debitAccountId/creditAccountId** из body запроса или из purchaseDocument (если уже сохранены).
   * Если нет — вернуть 400 `MISSING_POSTING_ACCOUNTS`.
6. Посчитать totals:

   * `totalNet = sum(qty*priceWithoutVat)`
   * `totalVat = sum(totalNet*(vatRate/100))` (если в модели VAT применяется)
   * `totalAmount = totalNet + totalVat` **или** только net (как сейчас в purchases POST) — выбрать одну схему и держать consistently.
   * Для MVP можно продолжить как “net only”, но лучше сразу “gross” если VAT нужен в totals.
7. Создать:

   * `createJournalEntry(tx, ...)`
   * `createStockMovement` IN по каждой позиции
   * `createStockLot` по каждой позиции
8. Обновить purchaseDocument:

   * `status: 'POSTED'`
   * сохранить posting profile (если требуется): debitAccountId/creditAccountId
9. Вернуть `{ data: postedDoc, journal: {...} }`

### Важно

* **Idempotency:** если документ уже POSTED → 400/409 `ALREADY_POSTED`.
* Ошибки Prisma P2002 → 409, как у тебя в других роутах.
* Никаких “частичных” записей: всё строго в `$transaction`.

---

## B2) UI: включить кнопку Post на странице документа (38B page)

В dual-mode:

* Если `status === 'DRAFT'`:

  * кнопка **Save** активна
  * кнопка **Post** активна (после выполнения минимальной проверки на фронте)
* Если `POSTED`:

  * read-only компоненты + totals

Поведение кнопки Post:

* вызывает `POST /api/company/${companyId}/purchases/${purchaseId}/post`
* показывает loading (Loader2) + success msg “Posted”
* после успеха: обновляет `purchase` в state и переводит страницу в read-only режим (т.к. статус станет POSTED)

### Минимальная фронт-валидация перед Post

* items.length > 0
* supplierName not empty
  (остальное можно доверить серверу)

---

## Acceptance Criteria (B)

* DRAFT с пустыми items → Post возвращает 400.
* DRAFT с валидными items → Post:

  * создаёт journal entry
  * создаёт stock movements IN
  * создаёт fifo lots
  * меняет статус на POSTED
* POSTED нельзя редактировать PUT и нельзя постить повторно.
* Всё tenant-safe.

---

### Вывод для Claude

1. **Сделать A (валидация PUT)** — обязательно, быстро.
2. **Сделать B (Task 39 Posting Engine)** — endpoint + включение кнопки Post + переход в read-only.

Если хочешь — я могу сразу следующим сообщением дать “скелет” файлов/путей (точные пути, имена, сигнатуры) под Task 39 в стиле вашего репо.
