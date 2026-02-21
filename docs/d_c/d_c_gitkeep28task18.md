Отлично. Структура чистая. Дубликатов Sidebar больше нет.
Теперь даём Claude **финальное ТЗ на стабилизацию UI + типов + middleware**.

Ниже — текст, который отправляешь Claude без изменений.

---

# D=>C

## Task 18 — Company UI Stabilization + Types + Middleware Hardening

### 🎯 Цель

Финально стабилизировать Company UI слой после рефакторов:

* единая навигация
* корректные маршруты
* `companyId` только `string (cuid)`
* middleware предсказуем

---

## 1️⃣ CompanySidebar — исправить маршруты

Файл:

```
components/layouts/CompanySidebar.tsx
```

### Требуется:

1. Исправить base:

Было:

```ts
const base = `/account/companies/${companyId}`;
```

Должно быть:

```ts
const base = `/company/${companyId}`;
```

2. Привести маршруты к текущей структуре:

```
/company/[companyId]/dashboard
/company/[companyId]/clients
/company/[companyId]/products
/company/[companyId]/sales
/company/[companyId]/purchases
/company/[companyId]/warehouse
/company/[companyId]/bank
/company/[companyId]/reports
```

3. Проверить подсветку active через usePathname()

---

## 2️⃣ Types: companyId только string

Просканировать UI:

* никаких `id: number`
* никаких `companyId: number`
* никаких `/company/1`

Исправить:

Файл:

```
app/(dashboard)/account/companies/page.tsx
```

Интерфейс Company:

```ts
interface Company {
  id: string
}
```

`handleEnterCompany(companyId: string)`

```ts
router.push(`/company/${companyId}/dashboard`)
```

---

## 3️⃣ Middleware: /api/auth/me

В `middleware.ts`:

Явно определить поведение для:

```
/api/auth/me
```

Вариант А (рекомендуется):

* добавить в protected API
* если нет cookie → 401 JSON

Главное:

* предсказуемое поведение
* defense-in-depth

---

## 4️⃣ Regression Checklist

Проверить:

* Login → cookie появляется
* /account/companies → OK
* Enter company → /company/{cuid}/dashboard
* Sidebar ссылки работают
* Нет 404
* Нет /company/1
* Нет id:number

---

## 5️⃣ Output

1. Список изменённых файлов
2. grep-доказательство:

```
grep -R "id: number" .
grep -R "/company/1" .
```

Ожидается: пусто.

---

После этого проект считается стабилизированным по UI + routing.

---

Отправляй Claude.
Когда вернётся отчёт — я проверю финально и закроем этап.


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
│   ├── d_c
│   │   └── d_c_gitkeep24task14.md
│   └── task14-company-context-refactor (1).tar.gz
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

63 directories, 54 files
➜  solar-erp git:(main) ✗ ls -la                                        
total 384
drwxr-xr-x@ 24 leanid  staff     768 Feb 20 00:52 .
drwxr-xr-x@  4 leanid  staff     128 Feb 12 02:59 ..
-rw-r--r--@  1 leanid  staff    8196 Feb 20 13:34 .DS_Store
-rw-r--r--@  1 leanid  staff      90 Jan 27 01:22 .env
-rw-r--r--@  1 leanid  staff      40 Jan 27 01:22 .eslintrc.json
drwxr-xr-x@ 13 leanid  staff     416 Feb 21 00:01 .git
-rw-r--r--@  1 leanid  staff     478 Jan 27 01:22 .gitignore
drwxr-xr-x@ 11 leanid  staff     352 Feb 20 11:09 .next
-rw-r--r--@  1 leanid  staff    5500 Feb 19 23:41 README.md
drwxr-xr-x@  9 leanid  staff     288 Feb 20 01:30 app
drwxr-xr-x@  5 leanid  staff     160 Jan 27 00:40 components
drwxr-xr-x@  5 leanid  staff     160 Feb 21 00:22 docs
drwxr-xr-x@  4 leanid  staff     128 Jan 27 00:40 lib
-rw-r--r--@  1 leanid  staff    1951 Feb 20 00:52 middleware.ts
-rw-r--r--@  1 leanid  staff     201 Jan 27 01:22 next-env.d.ts
-rw-r--r--@  1 leanid  staff       0 Jan 15 22:06 next.config.js
drwxr-xr-x@ 21 leanid  staff     672 Feb 19 22:54 node_modules
-rw-r--r--@  1 leanid  staff     885 Feb 19 22:54 package.json
-rw-r--r--@  1 leanid  staff  132932 Feb 19 22:54 pnpm-lock.yaml
-rw-r--r--@  1 leanid  staff      98 Jan 27 01:22 pnpm-workspace.yaml
-rw-r--r--@  1 leanid  staff      82 Jan 27 01:22 postcss.config.js
drwxr-xr-x@  5 leanid  staff     160 Feb 20 00:51 prisma
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
➜  components git:(main) ✗ 

d_c_gitkeep1task2.md