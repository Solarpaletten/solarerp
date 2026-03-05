D=>C Task 49 — Purchase Editor (production quality) | Solar ERP (Next.js + Prisma)

Цель: сделать полноценный Purchase Document Editor (карточка документа покупки) по паттерну “ERPGrid list → Document Editor”, как “жемчужина” системы. Важно: Document = event, Journal = truth. Редактор должен позволять: создать draft, заполнить, сохранить, провести (Post), отменить (Cancel), копировать, смотреть бухгалтерский эффект (Accounting View), работать tenant-safe.

0) Контекст и текущее состояние (обязательно учесть)

Уже есть список покупок ERPGrid: /company/[companyId]/purchases — оставляем.

Есть маршрут(ы) API для purchases, включая draft/post/cancel/copy/accounting/receipt.

Сейчас при создании draft иногда падаем на unique constraint (companyId,series,number). Это блокер для UX “+ New purchase”.

Клиентский редактор (Task 48) уже разбит на компоненты. Покупки делаем сразу компонентно, без монолита.

1) Маршруты UI (App Router)
1.1 Purchase Editor

app/(dashboard)/company/[companyId]/purchases/[purchaseId]/page.tsx

Это основная карточка документа.

1.2 New Purchase (create draft → redirect)

app/(dashboard)/company/[companyId]/purchases/new/page.tsx

При открытии страницы: POST /api/company/${companyId}/purchases/draft → router.replace(/company/${companyId}/purchases/${id})

Если ошибка → показать error banner + кнопка “Back to Purchases”.

2) UI-архитектура (компоненты)

Сделать модуль components/purchases/* по схеме:

Block A — PurchaseHeader

Компонент: components/purchases/PurchaseHeader.tsx
Показывает:

Back link: “← Purchases”

Title: Purchase <SERIES>-<NUMBER> или “New Purchase (Draft)”

Status badge: DRAFT | POSTED | CANCELED (цвета)

Supplier mini: name + code (если выбран)

Metadata: date, due date, currency

В правой части: быстрые кнопки Copy, Cancel (если posted), Receipt (если есть)

Block B — PurchaseForm (левая колонка)

Компонент: components/purchases/PurchaseForm.tsx
Поля (минимум):

Supplier (clientId) — селект/поиск (можно простой select пока)

Document date

Posting date (если нужно)

Payment terms / dueDate (авто из supplier payWithinDays, если есть)

Invoice number (входящий номер счета)

Notes

Warehouse (warehouseId) — селект (подготовка, если складов несколько)

Currency (EUR по умолчанию)

Block C — PurchaseItems (центр/низ, основной блок)

Компонент: components/purchases/PurchaseItems.tsx
Требования:

Таблица items: productId, description, qty, unit, netPrice, vatRate, vatAmount, netAmount, grossAmount

Автоподстановка: при выборе productId — название/ставка НДС по продукту (если есть)

Кнопки: “+ Add line”, “Remove line”

Валидация: qty > 0, price >= 0, productId обязателен (для складского учета)

Block D — PurchaseTotals (правая колонка)

Компонент: components/purchases/PurchaseTotals.tsx
Показывает:

Subtotal (net)

VAT total

Total gross

(опционально) discount/rounding, если есть

Block E — PurchaseAccountingView (после Posted)

Компонент: components/purchases/PurchaseAccountingView.tsx
Отображение результата проводки:

Журнал (debit/credit lines), суммы, accounts, links

Если документ draft → блок скрыт или placeholder “Post to generate accounting”.

Block F — PurchaseActions (низ страницы)

Компонент: components/purchases/PurchaseActions.tsx
Кнопки:

Close → back to list

Save (PATCH) — активна только если dirty

Post (если draft) — вызывает /post

Cancel (если posted) — вызывает /cancel

Copy → /copy → redirect to new draft id

Upload receipt / View receipt (если API есть)

3) Data model (минимум полей, но tenant-safe)
3.1 PurchaseDocument (ожидаемая модель)

Поля (ориентир, не ломай существующее):

id, companyId

status: DRAFT|POSTED|CANCELED

series (например “PU”)

number (int) — уникально в паре companyId+series+number

clientId (supplier)

warehouseId (optional пока)

documentDate, dueDate

currency (EUR)

netTotal, vatTotal, grossTotal

notes, invoiceNumber

createdAt/updatedAt

3.2 PurchaseItem

id, documentId

productId

description

qty

unit

netPrice

vatRate

computed totals per line

4) Ключевой блокер: draft creation и уникальный номер

Сейчас: POST /purchases/draft иногда падает на unique (companyId, series, number).

Решение (обязательное в Task 49, иначе UX не работает):

Draft должен создаваться без коллизий.

Вариант A (предпочтительно): выделить таблицу-счетчик DocumentSequence:

ключ: (companyId, docType, series)

поле: nextNumber

при создании draft: транзакция → update ... increment → получить number → создать документ.

Вариант B: для draft ставить number = NULL, а номер присваивать только при Post.
Но если unique индекс не допускает NULL/логика UI требует номер сразу — используем вариант A.

Acceptance: 50 быстрых кликов “New purchase” не должны вызвать 409.

5) API (что должен уметь UI дергать)

Проверить/довести до стабильного контракта:

GET /api/company/[companyId]/purchases/[purchaseId]

returns { data: PurchaseDocument + items[] }

PATCH /api/company/[companyId]/purchases/[purchaseId]

сохраняет draft/editable поля + items

tenant-safe: requireTenant + companyId scope

POST /api/company/[companyId]/purchases/draft

создаёт draft документ (и пустые items = [])

возвращает { data: { id } }

не падает на unique

POST /api/company/[companyId]/purchases/[purchaseId]/post

атомарно: создаёт JournalEntry + StockMovement (если предусмотрено)

если journal fails → документ не posted (или транзакция откатывается)

POST /api/company/[companyId]/purchases/[purchaseId]/cancel

отмена posted документа (reversal journal) или перевод в canceled по правилам

POST /api/company/[companyId]/purchases/[purchaseId]/copy

создаёт новый draft-клон (без posting/journal), возвращает new id

GET /api/company/[companyId]/purchases/[purchaseId]/accounting

returns lines (для AccountingView)

POST /api/company/[companyId]/purchases/[purchaseId]/receipt

загрузка/привязка файла (если уже есть инфраструктура)

6) UX/Rules

Draft редактируем полностью.

Posted:

редактирование ключевых полей блокируем (items нельзя менять напрямую)

доступно: Cancel, View Accounting, Receipt

Cancelled:

read-only, можно Copy.

7) Tech requirements

No monolith: page orchestrator ≤ ~150 строк, логика в хуках/компонентах.

Общие примитивы формы использовать из components/ui/FormField.tsx.

Все fetch: показывать error banner.

Dirty-tracking: любое изменение → dirty=true, после Save → dirty=false.

router.replace для навигации после create/copy/cancel, чтобы back не уводил в “создание”.

8) Definition of Done (DoD)

“+ New purchase” работает: создаёт draft и открывает editor.

Draft можно заполнить, сохранить, обновить, перезагрузить страницу — данные остаются.

Post создаёт journal (и stock movement если включено) в одной транзакции.

После Post доступен Accounting View, документ read-only.

Copy создаёт новый draft и открывает его.

Cancel работает по правилам (reversal/статус) и отражается в UI.

Нет 409 unique на draft creation при частых кликах.

Tenant isolation соблюдён везде.

9) Deliverables (что ты коммитишь)

components/purchases/* (6–8 файлов)

app/(dashboard)/company/[companyId]/purchases/[purchaseId]/page.tsx (orchestrator)

app/(dashboard)/company/[companyId]/purchases/new/page.tsx (create+redirect)

(если нужно) Prisma migration + service для sequence

(если нужно) фиксы API draft/post

10) Порядок выполнения (рекомендуемый)

Починить draft creation (sequence/NULL number) → снять блокер.

Собрать UI каркас (Header/Form/Items/Totals/Actions).

Подключить GET/PATCH (persist).

Подключить Post/Accounting.

Подключить Copy/Cancel.

Причесать UX (disable states, banners).

L=>D (для тебя, Leanid): двигаемся правильно. Сейчас главное — Task 49 сделать как эталон, и потом по этому шаблону пойдут Sales + Warehouse editors.