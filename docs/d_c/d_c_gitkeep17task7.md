Принял. Тогда усиливаем **сейчас** — но без «переписывания мира». Делаем ровно то, что даст фундамент и не сломает темп.

Ниже 3 пункта (как ты просил) — что делаем, зачем, и минимальная реализация.

---

## 1) Priorities в БД (убираем “mock” localStorage как источник истины)

### Что сейчас

* localStorage хранит `companyPriorities`
* API `PUT /api/account/companies/priorities` есть, но **TODO: сохранить в БД**
* Это нормально для демо, но не для SaaS

### Как правильно

Источник истины = БД.

**Самый простой фундамент:**

* добавить в таблицу `Company` поле `priority INT`
* в `GET /api/account/companies` отдавать `orderBy priority asc, createdAt asc`
* в `PUT /api/account/companies/priorities` обновлять priorities в транзакции

### Почему это важно

* одинаково на всех устройствах
* одинаково для всех пользователей (в рамках tenant)
* локалсторадж остаётся только как кеш (опционально)

---

## 2) Auth: убрать “userId в localStorage”, перейти на HttpOnly cookie (session)

### Что сейчас

* `localStorage.userId` = “авторизация”
* это легко подделать (DevTools → setItem)
* middleware не может это проверить

### Как правильно

Минимальный production-grade шаг:

* логин делает `Set-Cookie: session=...; HttpOnly; Secure; SameSite=Lax`
* сервер читает cookie и определяет user
* клиент вообще **не хранит** userId

**Минимум без JWT:**

* `session` = random token
* таблица `Session` в БД: token, userId, tenantId, expiresAt
* `getCurrentUser()` читает cookie → ищет session → получает user

### Почему это важно

* нельзя подделать через фронт
* можно включить middleware
* это настоящая архитектура SaaS

---

## 3) Middleware guard: редиректы до рендера

### Что сейчас

* редирект в `useEffect` в layout
* есть “flash” и лишние запросы
* прямые ссылки могут дергаться

### Как правильно

* `middleware.ts`:

  * если route начинается с `/account` или `/company`
  * и нет валидной session cookie → redirect `/login`
* `/login` публичный
* `/api/*` также защищаем (кроме `/api/health`, `/api/auth/login`)

### Почему это важно

* защита на входе
* чистые редиректы
* меньше багов “страница моргнула и ушла”

---

# Конкретный план “усиливаем сейчас” (в правильном порядке)

1. ✅ **Сделать priorities в БД** (малый риск, быстрый выигрыш)
2. ✅ **Сделать session cookie + Session table** (главный фундамент)
3. ✅ **Подключить middleware** (закрываем периметр)

---

# D=>C (задача инженеру Claude)

**D=>C:**

1. Prisma: добавить `priority Int @default(1)` в `Company` (или отдельную таблицу CompanyOrder, если приоритет должен быть per-user — но пока per-tenant/per-account).
2. `GET /api/account/companies`: `where tenantId`, `orderBy priority asc`.
3. `PUT /api/account/companies/priorities`: принять `{ priorities: Record<number, number> }`, обновить companies одним батчем/транзакцией.
4. Auth: внедрить HttpOnly cookie session:

   * Prisma `Session` model (token, userId, tenantId, expiresAt)
   * `/api/auth/login` создаёт session, ставит cookie, больше не пишет `localStorage.userId`
   * `lib/auth/getCurrentUser.ts` читает cookie, валидирует session
5. Middleware: защитить `/account/*`, `/company/*`, `/api/account/*`, `/api/company/*` (исключить `/login`, `/api/auth/*`, `/api/health/*`).

---

# Важно: про твой вопрос “это mock данные?”

Да: **localStorage сейчас — mock/кеш**.
Но `PUT /api/account/companies/priorities` — это уже правильный endpoint, просто нужно сделать его **реальным** (сохранение в БД).

---

Если хочешь — я дам готовые куски кода **точечно**:

* Prisma модели `Company.priority` + `Session`
* middleware.ts
* обновлённый `/api/auth/login` (cookie)
* обновлённый `getCurrentUser()`

Скажи только: приоритет компаний должен быть **общий для tenant** или **индивидуальный для каждого пользователя**?
(Я по умолчанию сделаю “общий для tenant” — быстрее и логичнее для MVP SaaS.)

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
│   └── d_c
│       └── d_c_gitkeep15task5.md
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

60 directories, 50 files
➜  solar-erp git:(main) ✗ ls -la
total 368
drwxr-xr-x@ 23 leanid  staff     736 Feb 19 23:37 .
drwxr-xr-x@  4 leanid  staff     128 Feb 12 02:59 ..
-rw-r--r--@  1 leanid  staff    6148 Feb 19 15:33 .DS_Store
-rw-r--r--@  1 leanid  staff      90 Jan 27 01:22 .env
-rw-r--r--@  1 leanid  staff      40 Jan 27 01:22 .eslintrc.json
drwxr-xr-x@ 13 leanid  staff     416 Feb 19 18:19 .git
-rw-r--r--@  1 leanid  staff     478 Jan 27 01:22 .gitignore
drwxr-xr-x@ 12 leanid  staff     384 Feb 20 00:02 .next
-rw-r--r--@  1 leanid  staff    5500 Feb 19 23:41 README.md
drwxr-xr-x@  9 leanid  staff     288 Feb 19 23:22 app
drwxr-xr-x@  5 leanid  staff     160 Jan 27 00:40 components
drwxr-xr-x@  4 leanid  staff     128 Feb 19 15:08 docs
drwxr-xr-x@  4 leanid  staff     128 Jan 27 00:40 lib
-rw-r--r--@  1 leanid  staff     201 Jan 27 01:22 next-env.d.ts
-rw-r--r--@  1 leanid  staff       0 Jan 15 22:06 next.config.js
drwxr-xr-x@ 21 leanid  staff     672 Feb 19 22:54 node_modules
-rw-r--r--@  1 leanid  staff     885 Feb 19 22:54 package.json
-rw-r--r--@  1 leanid  staff  132932 Feb 19 22:54 pnpm-lock.yaml
-rw-r--r--@  1 leanid  staff      98 Jan 27 01:22 pnpm-workspace.yaml
-rw-r--r--@  1 leanid  staff      82 Jan 27 01:22 postcss.config.js
drwxr-xr-x@  5 leanid  staff     160 Jan 27 01:39 prisma
-rw-r--r--@  1 leanid  staff     213 Jan 27 01:22 tailwind.config.js
-rw-r--r--@  1 leanid  staff     643 Jan 27 01:22 tsconfig.json
➜  solar-erp git:(main) ✗ cd app                                   
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
│   │   └── signup
│   │       └── route.ts
│   ├── company
│   └── health
│       └── route.ts
├── globals.css
├── layout.tsx
└── page.tsx

27 directories, 25 files
➜  app git:(main) ✗ cd api 
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
│   └── signup
│       └── route.ts
├── company
└── health
    └── route.ts

10 directories, 6 files
➜  api git:(main) ✗ 