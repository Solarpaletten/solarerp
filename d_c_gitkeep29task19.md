🔥 Отлично.
Работаем строго по протоколу.

---

# D=>C

## Task 19 — Chart of Accounts (ERP Core Foundation)

Claude, начинаем настоящий бухгалтерский слой.

Это не UI-задача.
Это **архитектурный фундамент ERP.**

---

# 🎯 Цель

Реализовать полноценный Chart of Accounts для каждой Company:

```
Tenant
 └── Company
      └── Accounts (Chart of Accounts)
```

---

# 1️⃣ Prisma Schema

Добавить:

```prisma
enum AccountType {
  ASSET
  LIABILITY
  EQUITY
  INCOME
  EXPENSE
}

model Account {
  id          String      @id @default(cuid())

  companyId   String
  company     Company     @relation(fields: [companyId], references: [id], onDelete: Cascade)

  code        String
  name        String
  type        AccountType
  isActive    Boolean     @default(true)

  createdAt   DateTime    @default(now())
  updatedAt   DateTime    @updatedAt

  @@index([companyId])
  @@unique([companyId, code])
}
```

⚠ Важно:

* Уникальность кода только внутри компании
* Cascade delete при удалении Company

---

# 2️⃣ Миграция

Создать новую migration:

```
prisma migrate dev --name add_chart_of_accounts
```

Claude должен приложить:

* SQL migration
* Diff изменения

---

# 3️⃣ API (Tenant-safe)

Все маршруты:

```
/api/company/[companyId]/accounts
```

---

## GET

Возвращает список счетов компании

Tenant-safe:

```ts
where: {
  companyId,
  company: {
    tenantId: session.tenantId
  }
}
```

---

## POST

Создание счёта

Body:

```json
{
  "code": "1000",
  "name": "Cash",
  "type": "ASSET"
}
```

---

## PATCH

Редактирование счёта

---

## DELETE

Удаление счёта

---

# 4️⃣ UI

Страница:

```
/company/[companyId]/chart-of-accounts
```

Требования:

* Таблица
* New Account button
* Modal create
* Edit
* Delete
* useCompany() из CompanyContext
* Zero localStorage
* Cookie-only

---

# 5️⃣ Tenant Hard Rule

Никаких:

```
findUnique({ id })
```

Только:

```
findFirst({
  where: {
    id,
    company: {
      tenantId: session.tenantId
    }
  }
})
```

Defense-in-depth обязателен.

---

# 6️⃣ Deliverables

Claude должен выдать:

1. prisma/schema additions
2. migration SQL
3. API routes (4)
4. UI page
5. Type definitions
6. Proof of tenant-safety

---

# Архитектурный статус

После Task 19:

Solar ERP переходит из "интерфейсного SaaS"
в **бухгалтерское ядро.**

---

C=>D
**Execute Task 19.**

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
│   └── d_c
│       └── d_c_gitkeep29task19.md
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
│   │   ├── 20260220004505_add_sessions_and_priority
│   │   │   └── migration.sql
│   │   └── migration_lock.toml
│   ├── schema.prisma
│   └── seed.ts
├── tailwind.config.js
└── tsconfig.json

63 directories, 53 files
➜  solar-erp git:(main) ✗ ls -la 
total 384
drwxr-xr-x@ 24 leanid  staff     768 Feb 21 17:41 .
drwxr-xr-x@  4 leanid  staff     128 Feb 12 02:59 ..
-rw-r--r--@  1 leanid  staff    8196 Feb 21 17:13 .DS_Store
-rw-r--r--@  1 leanid  staff      90 Jan 27 01:22 .env
-rw-r--r--@  1 leanid  staff      40 Jan 27 01:22 .eslintrc.json
drwxr-xr-x@ 13 leanid  staff     416 Feb 21 17:24 .git
-rw-r--r--@  1 leanid  staff     478 Jan 27 01:22 .gitignore
drwxr-xr-x@ 11 leanid  staff     352 Feb 21 17:42 .next
-rw-r--r--@  1 leanid  staff    5500 Feb 19 23:41 README.md
drwxr-xr-x@  9 leanid  staff     288 Feb 20 01:30 app
drwxr-xr-x@  5 leanid  staff     160 Jan 27 00:40 components
drwxr-xr-x@  4 leanid  staff     128 Feb 21 17:40 docs
drwxr-xr-x@  4 leanid  staff     128 Jan 27 00:40 lib
-rw-r--r--@  1 leanid  staff    2589 Feb 21 17:40 middleware.ts
-rw-r--r--@  1 leanid  staff     201 Jan 27 01:22 next-env.d.ts
-rw-r--r--@  1 leanid  staff       0 Jan 15 22:06 next.config.js
drwxr-xr-x@ 21 leanid  staff     672 Feb 21 17:41 node_modules
-rw-r--r--@  1 leanid  staff     885 Feb 19 22:54 package.json
-rw-r--r--@  1 leanid  staff  132932 Feb 19 22:54 pnpm-lock.yaml
-rw-r--r--@  1 leanid  staff      98 Jan 27 01:22 pnpm-workspace.yaml
-rw-r--r--@  1 leanid  staff      82 Jan 27 01:22 postcss.config.js
drwxr-xr-x@  5 leanid  staff     160 Feb 20 00:51 prisma
-rw-r--r--@  1 leanid  staff     213 Jan 27 01:22 tailwind.config.js
-rw-r--r--@  1 leanid  staff     643 Jan 27 01:22 tsconfig.json
➜  solar-erp git:(main) ✗ cd components    
➜  components git:(main) ✗ tree   
.
├── forms
│   └── AuthForm.tsx
├── layouts
│   ├── AccountSidebar.tsx
│   └── CompanySidebar.tsx
└── ui
    ├── Button.tsx
    ├── Card.tsx
    └── Input.tsx

4 directories, 6 files
➜  components git:(main) ✗ ls -la 
total 0
drwxr-xr-x@  5 leanid  staff  160 Jan 27 00:40 .
drwxr-xr-x@ 24 leanid  staff  768 Feb 21 17:41 ..
drwxr-xr-x@  3 leanid  staff   96 Jan 27 00:44 forms
drwxr-xr-x@  4 leanid  staff  128 Feb 21 17:39 layouts
drwxr-xr-x@  5 leanid  staff  160 Jan 27 00:43 ui
➜  components git:(main) ✗ cd ..        
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

29 directories, 26 files
➜  app git:(main) ✗ ls -la 
total 40
drwxr-xr-x@  4 leanid  staff   128 Feb 19 17:57 (auth)
drwxr-xr-x@  5 leanid  staff   160 Feb 20 01:28 (dashboard)
drwxr-xr-x@  9 leanid  staff   288 Feb 20 01:30 .
drwxr-xr-x@ 24 leanid  staff   768 Feb 21 17:41 ..
-rw-r--r--@  1 leanid  staff  6148 Feb 19 17:00 .DS_Store
drwxr-xr-x@  6 leanid  staff   192 Feb 20 00:06 api
-rw-r--r--@  1 leanid  staff    59 Jan 27 01:23 globals.css
-rw-r--r--@  1 leanid  staff   590 Jan 27 00:51 layout.tsx
-rw-r--r--@  1 leanid  staff   695 Feb 20 01:30 page.tsx
➜  app git:(main) ✗ 