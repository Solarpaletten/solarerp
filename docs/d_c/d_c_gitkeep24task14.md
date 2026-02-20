🔥 Отлично. Работаем чётко.

Копируй и отправляй Claude **без изменений**.

---

# D=>C

## Task 10 — Company Context Refactor (Eliminate N+1 Fetch)

### 🎯 Цель

Внутри `/company/[companyId]/*` данные компании загружаются **один раз в layout**,
все дочерние компоненты используют React Context.

Никаких повторных GET `/api/account/companies/:id`.

---

## 📦 1. Создать CompanyContext

Создать файл:

```
app/(dashboard)/company/[companyId]/CompanyContext.tsx
```

### Требования:

* React context
* Type-safe
* Экспортировать:

  * `CompanyProvider`
  * `useCompany()`

### Тип:

```ts
type CompanyContextType = {
  id: string
  name: string
  status: string
}
```

Если useCompany вызывается вне provider — бросать ошибку.

---

## 🧠 2. Layout-level fetch (Server Component)

Изменить:

```
app/(dashboard)/company/[companyId]/layout.tsx
```

### Логика:

* Это Server Component
* Получить `companyId` из params
* Сделать server-side fetch:

```ts
await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/account/companies/${companyId}`, {
  cache: 'no-store',
})
```

* Если 404 → notFound()

* Если 401 → redirect('/login')

* Обернуть children в `<CompanyProvider value={company}>`

---

## 🧹 3. Убрать fetch из:

* CompanyHeader.tsx
* CompanySidebar.tsx
* dashboard/page.tsx

Удалить:

* useEffect fetch company
* local state companyName
* повторные GET запросы

Заменить на:

```ts
const company = useCompany()
```

---

## 🔍 4. Проверка

После рефактора:

В логах должен быть:

```
GET /api/account/companies/:id 200
```

Только **один раз на переход**.

Не 4.

---

## 🚫 5. Не трогать

* API routes
* Middleware
* Tenant logic
* Session auth

---

## 🧾 Deliverables

1. CompanyContext.tsx (новый файл)
2. Обновлённый layout.tsx
3. Обновлённый CompanyHeader.tsx
4. Обновлённый CompanySidebar.tsx
5. Обновлённый dashboard/page.tsx

Полные файлы, production-ready, без заглушек.

---

🚀 Даем ход.

Когда Claude вернёт файлы — я проверю архитектурно перед запуском.

