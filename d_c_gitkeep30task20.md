Отлично. Даем четкое ТЗ.

---

# D=>C

## TASK 19.2 — Fix Dynamic Routing + Sidebar Integration

### 🎯 Цель

1. Убрать возможность открытия страницы:

```
/company/[companyId]/chart-of-accounts
```

в статическом виде.

2. Гарантировать, что:

```
/company/{REAL_COMPANY_ID}/chart-of-accounts
```

всегда получает настоящий companyId из params.

3. Добавить пункт в Sidebar для перехода в Chart of Accounts.

---

# 📌 ЧАСТЬ 1 — Fix Dynamic Routing

### 1️⃣ В файле:

```
app/(dashboard)/company/[companyId]/chart-of-accounts/page.tsx
```

Убедиться, что используется:

```ts
import { useParams } from 'next/navigation';

const params = useParams();
const companyId = params.companyId as string;
```

И НЕТ хардкода вида:

```ts
/company/[companyId]/
```

---

### 2️⃣ Добавить защиту

Если:

```ts
if (!companyId || companyId.includes('['))
```

→ показать:

```tsx
<div className="text-red-500">Invalid company context</div>
```

Чтобы исключить ошибочный вызов API.

---

# 📌 ЧАСТЬ 2 — Sidebar Integration

В файле:

```
app/(dashboard)/company/[companyId]/layout.tsx
или
components/layouts/CompanySidebar.tsx
```

Добавить пункт:

```tsx
<Link
  href={`/company/${companyId}/chart-of-accounts`}
  className={pathname.includes('chart-of-accounts') ? activeClass : defaultClass}
>
  📒 Chart of Accounts
</Link>
```

companyId берётся из:

```ts
const params = useParams();
const companyId = params.companyId as string;
```

---

# 📌 ЧАСТЬ 3 — Проверка

После реализации должно работать:

1. Зайти в:

```
/account/companies
```

2. Enter Company

3. В sidebar нажать:

```
Chart of Accounts
```

4. URL должен быть:

```
/company/cmlwm3yut0003426qbswrxf54/chart-of-accounts
```

5. POST /api/company/{REAL_ID}/accounts → 201

---

# 🚫 ВАЖНО

Нельзя допускать:

```
/company/[companyId]/chart-of-accounts
```

в production UI.

---

# 🧠 Архитектурная цель

Контекст компании должен:

* передаваться только через params
* никогда не быть строковым placeholder
* быть обязательным для всех ERP модулей

---

После выполнения:

C=>D отчет:

* Routing fixed
* Sidebar integrated
* API calls using real companyId
* Manual test passed

---

Даем запуск.

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
│   │   │       ├── chart-of-accounts
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
│   │   │   └── [companyId]
│   │   │       └── accounts
│   │   │           ├── [accountId]
│   │   │           │   └── route.ts
│   │   │           └── route.ts
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
├── d_c_gitkeep30task20.md
├── docs
│   └── task19-chart-of-accounts.tar.gz
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

66 directories, 57 files
➜  solar-erp git:(main) ✗ app                                                             
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
│   │       ├── chart-of-accounts
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
│   │   └── [companyId]
│   │       └── accounts
│   │           ├── [accountId]
│   │           │   └── route.ts
│   │           └── route.ts
│   └── health
│       └── route.ts
├── globals.css
├── layout.tsx
└── page.tsx

33 directories, 29 files
➜  app git:(main) ✗ ls -la 
total 40
drwxr-xr-x@  4 leanid  staff   128 Feb 19 17:57 (auth)
drwxr-xr-x@  5 leanid  staff   160 Feb 20 01:28 (dashboard)
drwxr-xr-x@  9 leanid  staff   288 Feb 20 01:30 .
drwxr-xr-x@ 25 leanid  staff   800 Feb 21 19:00 ..
-rw-r--r--@  1 leanid  staff  6148 Feb 19 17:00 .DS_Store
drwxr-xr-x@  6 leanid  staff   192 Feb 20 00:06 api
-rw-r--r--@  1 leanid  staff    59 Jan 27 01:23 globals.css
-rw-r--r--@  1 leanid  staff   590 Jan 27 00:51 layout.tsx
-rw-r--r--@  1 leanid  staff   695 Feb 20 01:30 page.tsx
➜  app git:(main) ✗ cd ..                   
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
drwxr-xr-x@ 25 leanid  staff  800 Feb 21 19:00 ..
drwxr-xr-x@  3 leanid  staff   96 Jan 27 00:44 forms
drwxr-xr-x@  4 leanid  staff  128 Feb 21 17:39 layouts
drwxr-xr-x@  5 leanid  staff  160 Jan 27 00:43 ui
➜  components git:(main) ✗ 