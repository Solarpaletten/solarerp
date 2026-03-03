Принято.
Роль: **Консультант-аудитор → инженер Claude**
Формат: точечный, минимальный, без побочных эффектов.

---

# 🔷 D=>C — MINI PATCH

## Task 43A — FK Hardening Fix

---

# 🎯 Цель

Исправить:

1️⃣ BUG — supplierId/clientId clearing в PUT
2️⃣ Усилить DB-level защиту: composite FK (companyId + clientId)

Без изменения бизнес-логики.
Без затрагивания Journal / FIFO / Posting.

---

# ═══════════════════════════════════════════

# 🩹 PATCH 1 — FIX FK CLEARING (Purchase PUT)

# ═══════════════════════════════════════════

Файл:

```
app/api/company/[companyId]/purchases/[purchaseId]/route.ts
```

## ❌ Сейчас (логическая ошибка)

```ts
if (body.supplierId === null) {
  resolvedSupplierId = undefined;
}
```

и далее:

```ts
if (resolvedSupplierId !== undefined) {
  updateData.supplierId = resolvedSupplierId;
}
```

→ FK не очищается.

---

## ✅ Исправить на:

### 1. Упростить логику resolution

Заменить весь блок supplier resolution на:

```ts
// Task 43A: Resolve supplier FK correctly
let updateSupplierId: string | null | undefined = undefined;
let updateSupplierName: string | undefined = undefined;
let updateSupplierCode: string | undefined = undefined;

if (body.supplierId !== undefined) {
  if (body.supplierId === null) {
    // Explicit FK clearing
    updateSupplierId = null;
    updateSupplierName = body.supplierName ?? '';
    updateSupplierCode = body.supplierCode ?? null;
  } else {
    const supplier = await prisma.client.findFirst({
      where: { id: body.supplierId, companyId, company: { tenantId } },
      select: { id: true, name: true, code: true, isActive: true },
    });

    if (!supplier) {
      return NextResponse.json({ error: 'Supplier not found in this company' }, { status: 404 });
    }
    if (!supplier.isActive) {
      return NextResponse.json({ error: 'Supplier is deactivated' }, { status: 400 });
    }

    updateSupplierId = supplier.id;
    updateSupplierName = supplier.name;
    updateSupplierCode = supplier.code ?? null;
  }
}
```

---

### 2. Update section

Заменить supplier update block на:

```ts
if (updateSupplierId !== undefined) {
  updateData.supplierId = updateSupplierId;
  updateData.supplierName = updateSupplierName;
  updateData.supplierCode = updateSupplierCode;
}
```

---

✔ Теперь:

* supplierId = null → FK очищается
* supplierId = value → snapshot обновляется
* supplierId omitted → ничего не меняется

Это корректная трёхсостояниевая логика.

---

# ═══════════════════════════════════════════

# 🛡 PATCH 2 — COMPOSITE FK HARDENING

# ═══════════════════════════════════════════

Цель:

Запретить ситуацию:

```
SaleDocument.companyId = A
clientId → Client.companyId = B
```

Даже если API ошибётся.

---

# 🔧 Prisma schema изменение

В SaleDocument:

Заменить relation на:

```prisma
client   Client? @relation(
  "SaleClient",
  fields: [companyId, clientId],
  references: [companyId, id],
  onDelete: Restrict
)
```

И удалить старый single-field relation.

---

В PurchaseDocument:

```prisma
supplier Client? @relation(
  "PurchaseSupplier",
  fields: [companyId, supplierId],
  references: [companyId, id],
  onDelete: Restrict
)
```

---

# ⚠ Важно

Для этого нужно:

## В Client model добавить composite unique:

```prisma
@@unique([companyId, id])
```

id уже уникален глобально,
но Prisma требует composite reference target.

Это не меняет данных.
Это структурное усиление.

---

# 🧱 Migration SQL

Claude должен сгенерировать новую миграцию:

```bash
npx prisma migrate dev --name fk_composite_hardening
```

В SQL должно быть:

```sql
ALTER TABLE "sale_documents" DROP CONSTRAINT "sale_documents_clientId_fkey";

ALTER TABLE "sale_documents"
ADD CONSTRAINT "sale_documents_company_client_fkey"
FOREIGN KEY ("companyId", "clientId")
REFERENCES "clients"("companyId", "id")
ON DELETE RESTRICT ON UPDATE CASCADE;
```

И аналогично для purchase_documents.

---

# ✅ Acceptance Check

После patch:

1. Создать Client в Company A
2. Попробовать вручную вставить sale с clientId из Company B
   → БД должна выдать FK error

Это Enterprise уровень защиты.

---

# 📊 Результат

После применения:

| Блок                   | Уровень    |
| ---------------------- | ---------- |
| FK integrity           | Enterprise |
| Multi-tenant isolation | DB-level   |
| Snapshot logic         | Correct    |
| API safety             | Strong     |

Task 43 станет 99% production-ready.

---

Даю оценку:
После этого патча — финансовое ядро устойчиво.

Готов проверить diff Claude после применения.
