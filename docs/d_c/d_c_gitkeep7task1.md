Отлично. Сейчас соберём **жёсткое, архитектурное ТЗ для Claude**, без хаоса и без смешивания слоёв.

Ты правильно понял ключевую вещь:

> Runtime — это отдельный слой.
> Factory — это база.
> Сейчас задача — корректно интегрировать runtime в проект, не разрушив Factory.

---

# 📄 ТЗ для Claude — Sprint 6

## 🔥 Solar ERP — Runtime Integration

---

## 1️⃣ Контекст

В проекте `solar-erp` сейчас:

* Factory слой (основная архитектура)
* Runtime слой расположен в:
  `runtime/src/...`
* Структуры отличаются
* Смысловые файлы совпадают (auth, dashboard, company, API)

Наша задача — **профессионально интегрировать Runtime как отдельный продуктовый слой**, не ломая Factory.

---

## 2️⃣ Важные ограничения

Claude должен соблюдать:

```
1. Factory layer НЕ модифицируется.
2. Runtime НЕ внедряется напрямую в root app/.
3. Никакие файлы не копируются хаотично.
4. Не смешивать x-user-id и JWT.
5. Не ломать prisma schema.
6. Не трогать mobile clients.
```

---

## 3️⃣ Цель

Сделать архитектурно чистую интеграцию runtime.

Вариант A (предпочтительный):

```
/apps
  /factory
  /runtime
```

Или

Вариант B:

```
/runtime-app
```

НО:

* Runtime должен быть изолирован
* Не смешивать layouts
* Не смешивать middleware
* Не смешивать auth механизмы

---

## 4️⃣ Что Claude должен сделать

### Шаг 1 — Анализ

Claude должен:

* Сравнить структуры:

  * `/app` (Factory)
  * `/runtime/src/app` (Runtime)

* Построить таблицу соответствия:

| Factory       | Runtime               | Action |
| ------------- | --------------------- | ------ |
| app/(auth)    | (products)/(auth)     | ?      |
| api/companies | api/account/companies | ?      |
| prisma        | lib/prisma.ts         | ?      |

---

### Шаг 2 — Предложить архитектуру

Claude должен выдать:

1. Финальную структуру
2. Схему роутинга
3. Схему auth
4. Как runtime будет запускаться

---

### Шаг 3 — Refactor plan

Без выполнения.

Только:

* план переноса
* список файлов
* риски
* breaking changes

---

## 5️⃣ Чётко запрещено

Claude НЕ должен:

* копировать runtime в root
* менять prisma
* менять mobile contract
* менять Factory API
* объединять middleware

---

## 6️⃣ Результат

Claude должен выдать:

```
docs/RUNTIME_INTEGRATION_PLAN.md
```

В нём:

* Архитектура
* Сравнение структур
* План миграции
* Риски
* Без кода
* Без копипаста

```

---

# ✍️ Готовый текст для Claude

Ты можешь отправить ему это:

---

C=>D  

Начинаем Sprint 6 — Runtime Integration.

В репозитории `solar-erp` есть два слоя:

1. Factory (root `/app`)
2. Runtime (`/runtime/src`)

Структуры отличаются, но смысловые файлы совпадают (auth, dashboard, company, API).

Задача:

1. Проанализировать различия.
2. Построить таблицу соответствия Factory ↔ Runtime.
3. Предложить чистую архитектуру интеграции runtime как отдельного слоя.
4. НЕ переносить файлы.
5. НЕ менять Factory.
6. НЕ менять prisma.
7. НЕ смешивать auth (x-user-id vs JWT).
8. НЕ писать код.
9. Выдать документ:
   `docs/RUNTIME_INTEGRATION_PLAN.md`

Документ должен содержать:
- финальную структуру
- роутинг стратегию
- auth стратегию
- миграционный план
- риски
- breaking points

Это архитектурный спринт. Без имплементации.

Работай как senior architect.

---

# 🎯 Почему это правильно

Ты сейчас не просто переносишь код.

Ты делаешь:

```

Factory → Core
Runtime → Product Layer
Mobile → Clients

```

Это уже enterprise архитектура.

---

# ☕ А теперь кофе.

Сегодня 19 февраля 2026.
14:10.
Ты делаешь правильные решения.

Это уже не хаос.
Это система.

Скажешь:

C=>D  
Отправляем ТЗ.

И мы идём дальше. 🚀
```


➜  AI-SERVER_solarerp git:(main) ✗ cd projects/solar-erp
➜  solar-erp git:(main) ✗ cd runtime           
➜  runtime git:(main) ✗ tree
.
└── src
    ├── app
    │   ├── (products)
    │   │   ├── (auth)
    │   │   │   ├── login
    │   │   │   │   └── page.tsx
    │   │   │   └── register
    │   │   │       └── page.tsx
    │   │   └── (dashboard)
    │   │       ├── account
    │   │       │   └── companies
    │   │       │       └── page.tsx
    │   │       ├── company
    │   │       │   └── [companyId]
    │   │       │       ├── CompanyHeader.tsx
    │   │       │       ├── CompanySidebar.tsx
    │   │       │       ├── clients
    │   │       │       │   ├── new
    │   │       │       │   │   └── page.tsx
    │   │       │       │   └── page.tsx
    │   │       │       ├── dashboard
    │   │       │       │   ├── layout.tsx
    │   │       │       │   └── page.tsx
    │   │       │       ├── layout.tsx
    │   │       │       ├── page.tsx
    │   │       │       └── products
    │   │       │           └── page.tsx
    │   │       └── layout.tsx
    │   ├── api
    │   │   ├── account
    │   │   │   ├── companies
    │   │   │   │   ├── [companyId]
    │   │   │   │   │   └── route.ts
    │   │   │   │   ├── route.ts
    │   │   │   │   └── stats
    │   │   │   │       └── route.ts
    │   │   │   └── switch-to-company
    │   │   │       └── route.ts
    │   │   ├── auth
    │   │   │   ├── login
    │   │   │   │   └── route.ts
    │   │   │   ├── logout
    │   │   │   │   └── route.ts
    │   │   │   └── register
    │   │   │       └── route.ts
    │   │   └── company
    │   │       └── [companyId]
    │   │           ├── clients
    │   │           │   ├── [clientId]
    │   │           │   │   └── route.ts
    │   │           │   └── route.ts
    │   │           ├── products
    │   │           │   ├── [productId]
    │   │           │   │   └── route.ts
    │   │           │   └── route.ts
    │   │           ├── purchases
    │   │           │   └── route.ts
    │   │           ├── sales
    │   │           │   └── route.ts
    │   │           └── warehouse
    │   │               └── route.ts
    │   ├── favicon.ico
    │   ├── globals.css
    │   ├── layout.tsx
    │   └── page.tsx
    ├── components
    │   └── clients
    │       └── GridConfigModal.tsx
    ├── config
    │   └── clients
    │       └── columnsConfig.ts
    ├── lib
    │   ├── auth.ts
    │   ├── db.ts
    │   ├── prisma.ts
    │   └── rate-limit.ts
    ├── middleware.ts
    ├── styles
    │   └── clients-table.css
    └── types

42 directories, 39 files
➜  runtime git:(main) ✗ cd ..     
➜  solar-erp git:(main) ✗ tree
.
├── README.md
├── app
│   ├── (auth)
│   │   ├── login
│   │   │   └── page.tsx
│   │   └── signup
│   │       └── page.tsx
│   ├── account
│   │   ├── companies
│   │   │   ├── [companyId]
│   │   │   │   ├── layout.tsx
│   │   │   │   └── page.tsx
│   │   │   └── page.tsx
│   │   ├── dashboard
│   │   │   └── page.tsx
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── api
│   │   ├── auth
│   │   │   ├── login
│   │   │   │   └── route.ts
│   │   │   └── signup
│   │   │       └── route.ts
│   │   ├── companies
│   │   │   ├── [companyId]
│   │   │   │   └── route.ts
│   │   │   └── route.ts
│   │   └── health
│   │       └── route.ts
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
├── components
│   ├── forms
│   │   └── AuthForm.tsx
│   ├── layouts
│   │   ├── AccountSidebar.tsx
│   │   └── CompanySidebar.tsx
│   └── ui
│       ├── Button.tsx
│       ├── Card.tsx
│       └── Input.tsx
├── docs
│   └── d-_c
│       └── d_c_gitkeep144task28.md
├── lib
│   ├── auth
│   │   ├── getCurrentUser.ts
│   │   ├── password.ts
│   │   ├── requireTenant.ts
│   │   └── session.ts
│   └── prisma.ts
├── next-env.d.ts
├── next.config.js
├── node_modules
│   ├── @prisma
│   │   └── client -> ../.pnpm/@prisma+client@5.22.0_prisma@5.22.0/node_modules/@prisma/client
│   ├── @types
│   │   ├── bcryptjs -> ../.pnpm/@types+bcryptjs@3.0.0/node_modules/@types/bcryptjs
│   │   ├── node -> ../.pnpm/@types+node@20.19.30/node_modules/@types/node
│   │   ├── react -> ../.pnpm/@types+react@18.3.27/node_modules/@types/react
│   │   └── react-dom -> ../.pnpm/@types+react-dom@18.3.7_@types+react@18.3.27/node_modules/@types/react-dom
│   ├── autoprefixer -> .pnpm/autoprefixer@10.4.23_postcss@8.5.6/node_modules/autoprefixer
│   ├── bcryptjs -> .pnpm/bcryptjs@3.0.3/node_modules/bcryptjs
│   ├── eslint -> .pnpm/eslint@8.57.1/node_modules/eslint
│   ├── eslint-config-next -> .pnpm/eslint-config-next@16.1.3_@typescript-eslint+parser@8.53.0_eslint@8.57.1_typescript@5.9_6d8f0b625e6b54b2936ad9d614f49437/node_modules/eslint-config-next
│   ├── next -> .pnpm/next@14.2.0_@babel+core@7.28.6_react-dom@18.3.1_react@18.3.1__react@18.3.1/node_modules/next
│   ├── postcss -> .pnpm/postcss@8.5.6/node_modules/postcss
│   ├── prisma -> .pnpm/prisma@5.22.0/node_modules/prisma
│   ├── react -> .pnpm/react@18.3.1/node_modules/react
│   ├── react-dom -> .pnpm/react-dom@18.3.1_react@18.3.1/node_modules/react-dom
│   ├── tailwindcss -> .pnpm/tailwindcss@3.4.19/node_modules/tailwindcss
│   └── typescript -> .pnpm/typescript@5.9.3/node_modules/typescript
├── package.json
├── pnpm-lock.yaml
├── pnpm-workspace.yaml
├── postcss.config.js
├── prisma
│   ├── migrations
│   │   ├── 20260127003906_init
│   │   │   └── migration.sql
│   │   └── migration_lock.toml
│   ├── schema.prisma
│   └── seed.ts
├── regenerate.sh
├── runtime
│   └── src
│       ├── app
│       │   ├── (products)
│       │   │   ├── (auth)
│       │   │   │   ├── login
│       │   │   │   │   └── page.tsx
│       │   │   │   └── register
│       │   │   │       └── page.tsx
│       │   │   └── (dashboard)
│       │   │       ├── account
│       │   │       │   └── companies
│       │   │       │       └── page.tsx
│       │   │       ├── company
│       │   │       │   └── [companyId]
│       │   │       │       ├── CompanyHeader.tsx
│       │   │       │       ├── CompanySidebar.tsx
│       │   │       │       ├── clients
│       │   │       │       │   ├── new
│       │   │       │       │   │   └── page.tsx
│       │   │       │       │   └── page.tsx
│       │   │       │       ├── dashboard
│       │   │       │       │   ├── layout.tsx
│       │   │       │       │   └── page.tsx
│       │   │       │       ├── layout.tsx
│       │   │       │       ├── page.tsx
│       │   │       │       └── products
│       │   │       │           └── page.tsx
│       │   │       └── layout.tsx
│       │   ├── api
│       │   │   ├── account
│       │   │   │   ├── companies
│       │   │   │   │   ├── [companyId]
│       │   │   │   │   │   └── route.ts
│       │   │   │   │   ├── route.ts
│       │   │   │   │   └── stats
│       │   │   │   │       └── route.ts
│       │   │   │   └── switch-to-company
│       │   │   │       └── route.ts
│       │   │   ├── auth
│       │   │   │   ├── login
│       │   │   │   │   └── route.ts
│       │   │   │   ├── logout
│       │   │   │   │   └── route.ts
│       │   │   │   └── register
│       │   │   │       └── route.ts
│       │   │   └── company
│       │   │       └── [companyId]
│       │   │           ├── clients
│       │   │           │   ├── [clientId]
│       │   │           │   │   └── route.ts
│       │   │           │   └── route.ts
│       │   │           ├── products
│       │   │           │   ├── [productId]
│       │   │           │   │   └── route.ts
│       │   │           │   └── route.ts
│       │   │           ├── purchases
│       │   │           │   └── route.ts
│       │   │           ├── sales
│       │   │           │   └── route.ts
│       │   │           └── warehouse
│       │   │               └── route.ts
│       │   ├── favicon.ico
│       │   ├── globals.css
│       │   ├── layout.tsx
│       │   └── page.tsx
│       ├── components
│       │   └── clients
│       │       └── GridConfigModal.tsx
│       ├── config
│       │   └── clients
│       │       └── columnsConfig.ts
│       ├── lib
│       │   ├── auth.ts
│       │   ├── db.ts
│       │   ├── prisma.ts
│       │   └── rate-limit.ts
│       ├── middleware.ts
│       ├── styles
│       │   └── clients-table.css
│       └── types
├── tailwind.config.js
└── tsconfig.json

88 directories, 81 files
➜  solar-erp git:(main) ✗ 