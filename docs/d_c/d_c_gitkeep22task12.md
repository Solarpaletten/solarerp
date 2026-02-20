D=>C (Dashka=>Claude)

Leanid дал команду: **финальный аудит всего собранного проекта** перед стартом. Нужен короткий, но жёсткий security+архитектурный чек и список “что делать завтра” (P0/P1). Без лишнего.

## 🎯 Цель аудита (Gate Review перед стартом)

Подтвердить, что текущий Solar-ERP:

1. **tenant-safe** (нет cross-tenant mutations),
2. **cookie-only web auth** работает end-to-end,
3. middleware/роуты/handlers согласованы,
4. Prisma schema + migrations не сломаны,
5. нет “скрытых” localStorage/x-user-id в web,
6. есть ясный список следующих шагов (Task 10).

## ✅ Deliverables (2 артефакта)

### A) `AUDIT_REPORT.md` (1–2 страницы)

Структура:

1. **Auth**: login → cookie → /api/auth/me → logout (что ок/что риск)
2. **Middleware**: coverage (что protected/public), важные edge-cases

   * проверить: `/api/auth/me` защищён? (если нет — отметить P0 fix)
3. **Tenant Isolation**:

   * все routes mutation (POST/PUT/PATCH/DELETE) имеют `tenantId` scope в WHERE
   * для company-level модулей (clients/items/sales/...) — правило Company→Tenant scope
4. **API consistency**:

   * единый формат ответов (success/error), статусы (200/201/204/401/404)
5. **DB**:

   * schema.prisma соответствует миграциям
   * есть ли миграция для Session + Company.priority (если нет — P0)
6. **Frontend**:

   * отсутствуют localStorage/x-user-id usage в web
   * company name fetching не вызывает спам запросов
7. **Риски + фиксы**

   * таблица: Risk / Severity / Fix / File

### B) `TASK10_PLAN.md`

Короткий план “завтра стартуем”:

* **P0 (must)**: контекст компании + уменьшение fetch + server layout cache (или API context)
* **P0 (must)**: unify companyId param type (string cuid) во всех местах UI/API
* **P1**: mobile auth стратегия (Bearer), cleanup expired sessions cron/job
* **P1**: module routes scaffolding: `/api/company/[companyId]/clients`, items, etc (tenant+company safe)

## 🔎 Audit checklist (что именно проверить)

1. **Search patterns**

   * `prisma.*.update({ where: { id` без tenantId/companyId
   * `prisma.*.delete({ where: { id`
   * любые `findUnique({ where: { id } })` в multi-tenant контексте
2. **companyId type**

   * schema: `Company.id String @default(cuid())`
   * UI: везде companyId должен быть **string**, не number
   * API routes: `params.companyId` string → Prisma where id: string
3. **middleware coverage**

   * `/api/auth/me` должен быть защищён (или handler должен гарантировать 401)
   * protected prefixes совпадают с реальными api путями
4. **session lifecycle**

   * createSession sets cookie HttpOnly
   * getCurrentUser предпочитает cookie, fallback x-user-id (не ломаем)
   * logout удаляет cookie + DB session
5. **priorities**

   * UI не хранит приоритет в localStorage
   * `PUT /api/account/companies/priorities` scopes by tenantId

## 📦 Формат ответа

Верни:

* `AUDIT_REPORT.md`
* `TASK10_PLAN.md`
* (если найдёшь P0 bug) **точечный diff**: какой файл/какую строку поменять (без лишней генерации всего проекта).

Срок: в рамках текущей сессии, результат одним сообщением.

---

L=>D (Dashka=>Leanid)

Готово: я дала Клауде финальное ТЗ на **Gate Review аудит** всего репо + план Task 10 на завтра.
Пока он делает — две вещи у нас уже “на радаре” как P0:

1. **middleware и `/api/auth/me`** — проверь, что он реально защищён (если нет — добавим в protected).
2. **companyId тип** — в Prisma `Company.id` сейчас `String(cuid)`. Если где-то в UI остались `number` (старый мок) — завтра надо унифицировать на string.

Доброй ночи команде. Завтра стартуем с чистым фундаментом. 🚀

➜  solar-erp git:(main) ✗ tree
.
├── README.md
├── app
│   ├── (auth)
│   │   ├── login
│   │   │   └── page.tsx
│   │   └── signup
│   │       └── page.tsx
│   ├── (dashboard)
│   │   ├── account
│   │   │   └── companies
│   │   │       └── page.tsx
│   │   ├── company
│   │   │   └── [companyId]
│   │   │       ├── CompanyHeader.tsx
│   │   │       ├── CompanySidebar.tsx
│   │   │       ├── bank
│   │   │       │   └── page.tsx
│   │   │       ├── clients
│   │   │       │   └── page.tsx
│   │   │       ├── dashboard
│   │   │       │   └── page.tsx
│   │   │       ├── layout.tsx
│   │   │       ├── page.tsx
│   │   │       ├── products
│   │   │       │   └── page.tsx
│   │   │       ├── purchases
│   │   │       │   └── page.tsx
│   │   │       ├── reports
│   │   │       │   └── page.tsx
│   │   │       ├── sales
│   │   │       │   └── page.tsx
│   │   │       └── warehouse
│   │   │           └── page.tsx
│   │   └── layout.tsx
│   ├── api
│   │   ├── account
│   │   │   └── companies
│   │   │       ├── [companyId]
│   │   │       │   └── route.ts
│   │   │       ├── priorities
│   │   │       │   └── route.ts
│   │   │       └── route.ts
│   │   ├── auth
│   │   │   ├── login
│   │   │   │   └── route.ts
│   │   │   ├── logout
│   │   │   │   └── route.ts
│   │   │   ├── me
│   │   │   │   └── route.ts
│   │   │   └── signup
│   │   │       └── route.ts
│   │   ├── company
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
│   ├── d_c
│   │   └── d_c_gitkeep22task12.md
│   └── task9-cookie-only-web-auth.tar.gz
├── lib
│   ├── auth
│   │   ├── getCurrentUser.ts
│   │   ├── password.ts
│   │   ├── requireTenant.ts
│   │   └── session.ts
│   └── prisma.ts
├── middleware.ts
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
│   ├── lucide-react -> .pnpm/lucide-react@0.575.0_react@18.3.1/node_modules/lucide-react
│   ├── next -> .pnpm/next@14.2.0_@babel+core@7.28.6_react-dom@18.3.1_react@18.3.1__react@18.3.1/node_modules/next
│   ├── postcss -> .pnpm/postcss@8.5.6/node_modules/postcss
│   ├── prisma -> .pnpm/prisma@5.22.0/node_modules/prisma
│   ├── react -> .pnpm/react@18.3.1/node_modules/react
│   ├── react-dom -> .pnpm/react-dom@18.3.1_react@18.3.1/node_modules/react-dom
│   ├── tailwindcss -> .pnpm/tailwindcss@3.4.19/node_modules/tailwindcss
│   ├── ts-node -> .pnpm/ts-node@10.9.2_@types+node@20.19.30_typescript@5.9.3/node_modules/ts-node
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
├── tailwind.config.js
└── tsconfig.json

62 directories, 54 files
➜  solar-erp git:(main) ✗ cd app/api       
➜  api git:(main) ✗ tree
.
├── account
│   └── companies
│       ├── [companyId]
│       │   └── route.ts
│       ├── priorities
│       │   └── route.ts
│       └── route.ts
├── auth
│   ├── login
│   │   └── route.ts
│   ├── logout
│   │   └── route.ts
│   ├── me
│   │   └── route.ts
│   └── signup
│       └── route.ts
├── company
└── health
    └── route.ts

12 directories, 8 files
➜  api git:(main) ✗ cd ..     
➜  app git:(main) ✗ tree
.
├── (auth)
│   ├── login
│   │   └── page.tsx
│   └── signup
│       └── page.tsx
├── (dashboard)
│   ├── account
│   │   └── companies
│   │       └── page.tsx
│   ├── company
│   │   └── [companyId]
│   │       ├── CompanyHeader.tsx
│   │       ├── CompanySidebar.tsx
│   │       ├── bank
│   │       │   └── page.tsx
│   │       ├── clients
│   │       │   └── page.tsx
│   │       ├── dashboard
│   │       │   └── page.tsx
│   │       ├── layout.tsx
│   │       ├── page.tsx
│   │       ├── products
│   │       │   └── page.tsx
│   │       ├── purchases
│   │       │   └── page.tsx
│   │       ├── reports
│   │       │   └── page.tsx
│   │       ├── sales
│   │       │   └── page.tsx
│   │       └── warehouse
│   │           └── page.tsx
│   └── layout.tsx
├── api
│   ├── account
│   │   └── companies
│   │       ├── [companyId]
│   │       │   └── route.ts
│   │       ├── priorities
│   │       │   └── route.ts
│   │       └── route.ts
│   ├── auth
│   │   ├── login
│   │   │   └── route.ts
│   │   ├── logout
│   │   │   └── route.ts
│   │   ├── me
│   │   │   └── route.ts
│   │   └── signup
│   │       └── route.ts
│   ├── company
│   └── health
│       └── route.ts
├── globals.css
├── layout.tsx
└── page.tsx

29 directories, 27 files
➜  app git:(main) ✗ 