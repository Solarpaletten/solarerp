D=>L (Dashka → Leanid)

Принято. Запускаю инженера на **Task 27.2 — Hardening Pack** в финальном, “копируй-в-работу” виде.

---

# D=>C | Task 27.2 — Hardening Pack (P0/P1 fixes)

## 🎯 Цель

Дожать Task 27 до **production-stable** состояния перед любым unlock:

* корректное сохранение posting profile в документах
* симметрия cancel routes
* единый auth handling
* отчётные acceptance-команды в md

---

## ✅ Deliverables (изменяемые файлы)

### 1) Sales POST — persist mapping (P0) + убрать мусорный код

**File:** `app/api/company/[companyId]/sales/route.ts`

**Проблема:** блок `await tx.saleDocument.update(...)` сейчас находится **вне функции/транзакции** (ломает сборку/архитектуру).

**Fix:**

* Удалить внешний “висячий” блок.
* Внутри `prisma.$transaction(async (tx)=>{...})` после:

  * `const sale = await tx.saleDocument.create(...)`
  * сделать:

```ts
await tx.saleDocument.update({
  where: { id: sale.id },
  data: {
    debitAccountId: journal.debitAccountId,
    creditAccountId: journal.creditAccountId,
  },
});
```

---

### 2) Purchases POST — критичный баг update (P0)

**File:** `app/api/company/[companyId]/purchases/route.ts`

**Проблема:** после create purchase стоит ошибочный код (копипаст):
`tx.saleDocument.update({ where: { id: sale.id } ... })` — это P0.

**Fix:**

* Удалить ошибочный блок.
* Внутри той же transaction, после:

  * `const purchase = await tx.purchaseDocument.create(...)`
  * сделать:

```ts
await tx.purchaseDocument.update({
  where: { id: purchase.id },
  data: {
    debitAccountId: journal.debitAccountId,
    creditAccountId: journal.creditAccountId,
  },
});
```

---

### 3) Sales cancel — симметрия с purchases cancel (P2, но делаем сейчас)

**File:** `app/api/company/[companyId]/sales/[saleId]/cancel/route.ts`

**Добавить guard:**
после проверки `originalEntry`:

```ts
if (!originalEntry.lines?.length) {
  throw new Error('JOURNAL_LINES_EMPTY');
}
```

**Catch handling:**
вернуть 500 как в purchases cancel:

```ts
if (message === 'JOURNAL_LINES_EMPTY') {
  return NextResponse.json(
    { error: 'Original journal entry has no lines. Cannot create reversal.' },
    { status: 500 }
  );
}
```

---

### 4) Auth alignment (P1 consistency)

**Files (минимум):**

* `app/api/company/[companyId]/sales/route.ts` (GET/POST catch)
* `app/api/company/[companyId]/purchases/route.ts` (GET/POST catch)

**Правило:**
Если `requireTenant()` бросает `Response`, возвращаем **как есть**:

```ts
if (error instanceof Response) return error;
```

Не оборачивать в `NextResponse.json({error:'Unauthorized'})`.

(Если есть ещё такие места рядом — выровнять аналогично.)

---

## 🧪 Acceptance / Smoke (в TASK27_REPORT.md)

Добавить/обновить `TASK27_REPORT.md` командами:

1. **PERIOD_CLOSED**

* закрыть Feb 2025 (через текущий механизм close, если есть endpoint/seed)
* `POST /repost { from:'2025-01-01', to:'2025-12-31' }` → **409 PERIOD_CLOSED**

2. **Open range OK**

* открыть диапазон → `/repost` → **200**
* `deletedEntries === recreatedEntries` (или объяснить расхождение, если есть MANUAL)

3. **Idempotency**

* повторить `/repost` тем же body → те же counts

4. **Determinism**

* CANCELLED sale/purchase: storno date = doc date (уже сделано), repost даёт тот же ledger.

---

## Definition of Done (жёстко)

* ✅ sales/purchases POST сохраняют `debitAccountId/creditAccountId` в документ **внутри transaction**
* ✅ нет ссылок на `sale` в purchases route
* ✅ sales cancel: JOURNAL_LINES_EMPTY guard + обработка
* ✅ auth handling в sales/purchases: `return error` для Response
* ✅ обновлён `TASK27_REPORT.md` с 3 тестами

---

D=>L

Инженеру отправлено. Как только он отдаст патч/архив — ты делаешь свой 2–3 минутный sweep, и мы **закрываем Task 27** → затем **Task 28 (Manual Entries)**.
