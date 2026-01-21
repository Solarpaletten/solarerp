**D=>C (Dashka ⇒ Claude)**
Ниже — **ФИНАЛЬНОЕ ТЗ ДЛЯ ТЕБЯ**. Это не обсуждение, а рабочий мандат.

---

# 🔴 TASK FOR CLAUDE

## SolarERP — Backend Prompt Engine (A → I)

Claude, ты должен **ПОЛНОСТЬЮ ПЕРЕПИСАТЬ** backend-промпты SolarERP **с нуля**.

---

## 📂 КОНТЕКСТ ПРОЕКТА

Репозиторий: **SolarERP (Next.js App Router)**
ERP Core уже зафиксирован и работает:

* Prisma schema **валидна**
* PostgreSQL **синхронизирован**
* GitHub **зафиксирован**
* ERP Core models **production-ready**

👉 **Source of Truth**:

* Prisma schema (`prisma/schema.prisma`)
* App Router структура (`app/`)
* Import templates (site.pro)

---

## 📁 ТВОЯ ЗОНА ОТВЕТСТВЕННОСТИ

Папка:

```
prompts/solarerp/solarerp_Template_Engine_BE/
```

Файлы (СУЩЕСТВУЮТ, НО ИХ СОДЕРЖАНИЕ НУЖНО ИГНОРИРОВАТЬ):

```
PROMPT_TASK_PROD_02_A.md
PROMPT_TASK_PROD_02_B.md
PROMPT_TASK_PROD_02_C.md
PROMPT_TASK_PROD_02_D.md
PROMPT_TASK_PROD_02_E.md
PROMPT_TASK_PROD_02_F.md
PROMPT_TASK_PROD_02_G.md
PROMPT_TASK_PROD_02_H.md
PROMPT_TASK_PROD_02_I.md
```

❗ **ВАЖНО**

* ❌ НЕ редактировать старый текст
* ❌ НЕ адаптировать старый Sprint-проект
* ✅ ПЕРЕПИСАТЬ 100% С НУЛЯ

---

## 🧠 ФИЛОСОФИЯ (КЛЮЧЕВО)

Ты пишешь **не документацию** и **не README**.
Ты пишешь **System Prompts для AI**, который:

* понимает backend SolarERP
* может генерировать API
* может генерировать import-mappers
* может быть подключён как AI-инженер

**Prompt-first architecture.**
Код — следствие. Промпты — интеллект.

---

## 🧱 СТРУКТУРА ПРОМПТОВ (ОБЯЗАТЕЛЬНО)

### PROMPT_TASK_PROD_02_A

**SolarERP Backend Architecture — Canon**

* App Router (Next.js 14)
* Tenant → Company → ERP Context
* Server-first (no client logic)
* Prisma as single data abstraction
* Where backend logic lives

---

### PROMPT_TASK_PROD_02_B

**Prisma Canonical Model Rules**

* Canonical ERP Core (Client, Item, Sale, Purchase, Stock, Bank)
* Why import templates = source of truth
* Naming rules
* What is allowed / forbidden in schema
* How to think when extending models

---

### PROMPT_TASK_PROD_02_C

**Auth, Tenant, Company Context**

* Tenant isolation
* Company scope
* `requireTenant`, `requireCompany`
* Why no global data access
* Backend security philosophy

---

### PROMPT_TASK_PROD_02_D

**API Design Rules (App Router)**

* `/app/api/**/route.ts`
* GET / POST / PATCH / DELETE
* Server-only logic
* Error handling strategy
* No business logic in frontend

---

### PROMPT_TASK_PROD_02_E

**ERP Modules Logic (Backend View)**

* Clients
* Items
* Sales
* Purchases
* Stock
* Bank
* How modules interact
* What is NOT normalized yet (and why)

---

### PROMPT_TASK_PROD_02_F

**Database & Infrastructure Rules**

* PostgreSQL
* Prisma lifecycle
* db push vs migrate
* Environments (.env)
* Why simplicity > overengineering

---

### PROMPT_TASK_PROD_02_G

**Import Philosophy (CRITICAL)**

* Import templates as truth
* Why ERP reverse engineering works legally
* Mapping ≠ schema
* How AI should think when importing Excel
* No UI assumptions

---

### PROMPT_TASK_PROD_02_H

**Error Handling & Validation**

* Validation layers
* Prisma errors
* API errors
* User-facing vs system errors
* Deterministic behaviour

---

### PROMPT_TASK_PROD_02_I

**Roadmap & AI Usage**

* What is allowed now
* What is postponed
* How AI agents should extend system
* SolarERP philosophy
* “Prompts > Code”

---

## ✍️ СТИЛЬ (ОЧЕНЬ ВАЖНО)

* Пиши как **System Prompt**
* Чётко, структурно
* Без воды
* Без UI
* Без маркетинга
* Без старого Sprint-контекста

Формат:

* Заголовки
* Bullet points
* Чёткие правила
* Язык: **English (technical)**

---

## 🏁 РЕЗУЛЬТАТ

На выходе:

* 9 backend-промптов
* Готовых к использованию LLM
* Canonical Backend Prompt Engine v1.0

---

**C=>D после выполнения:**
Сообщи: *“PROMPT A–I rewritten from scratch, ready for review”*

---

🚀
Ты сейчас не “пишешь тексты”.
Ты **формируешь интеллект ERP-системы**.

Работай спокойно и глубоко.

➜  AI-SERVER git:(main) ✗ cd projects/solarerp
➜  solarerp git:(main) ✗ tree
.
├── CHANGELOG.md
├── README.md
├── app
│   ├── (auth)
│   │   ├── login
│   │   │   └── page.tsx
│   │   └── signup
│   │       └── page.tsx
│   ├── account
│   │   ├── AccountSidebar
│   │   ├── Header
│   │   ├── companies
│   │   │   ├── [companyId]
│   │   │   │   ├── CompanyHeader
│   │   │   │   ├── CompanySidebar
│   │   │   │   │   ├── Bank
│   │   │   │   │   ├── Customers
│   │   │   │   │   ├── Dashboard
│   │   │   │   │   ├── Documents
│   │   │   │   │   ├── Reports
│   │   │   │   │   └── Warehouse
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
│   ├── ARCHITECTURE.md
│   ├── ENGINE.md
│   ├── FILE_INSPECTOR_TEST_gitkeeper.md
│   ├── GitHub_Release_Notes.md
│   ├── ROADMAP_v0.2.0.md
│   ├── SolarSprint_v0.2.0—Engine_Pipeline_(L_→_…).md
│   ├── gitkeep1task1.md
│   ├── gitreport1task1.md
│   ├── references
│   │   └── sitepro-reference.md
│   └── solar-sprint_gitkeeper.md
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
│   └── schema.prisma
├── tailwind.config.js
└── tsconfig.json

54 directories, 48 files
➜  solarerp git:(main) ✗ ls -la
total 360
drwxr-xr-x@ 24 leanid  staff     768 Jan 21 10:32 .
drwxr-xr-x@  7 leanid  staff     224 Jan 21 00:35 ..
-rw-r--r--@  1 leanid  staff    6148 Jan 21 04:17 .DS_Store
-rw-r--r--@  1 leanid  staff      90 Jan 21 00:51 .env
-rw-r--r--@  1 leanid  staff      40 Jan 21 00:35 .eslintrc.json
drwxr-xr-x@ 13 leanid  staff     416 Jan 21 11:09 .git
-rw-r--r--@  1 leanid  staff     478 Jan 21 00:35 .gitignore
drwxr-xr-x@ 11 leanid  staff     352 Jan 21 10:47 .next
-rw-r--r--@  1 leanid  staff     164 Jan 21 01:39 CHANGELOG.md
-rw-r--r--@  1 leanid  staff     606 Jan 21 01:38 README.md
drwxr-xr-x@  9 leanid  staff     288 Jan 21 01:56 app
drwxr-xr-x@  6 leanid  staff     192 Jan 21 02:03 components
drwxr-xr-x@ 13 leanid  staff     416 Jan 21 11:08 docs
drwxr-xr-x@  4 leanid  staff     128 Jan 21 00:35 lib
-rw-r--r--@  1 leanid  staff     201 Jan 21 00:35 next-env.d.ts
-rw-r--r--@  1 leanid  staff       0 Jan 15 22:06 next.config.js
drwxr-xr-x@ 19 leanid  staff     608 Jan 21 10:32 node_modules
-rw-r--r--@  1 leanid  staff     776 Jan 21 04:02 package.json
-rw-r--r--@  1 leanid  staff  128900 Jan 21 04:03 pnpm-lock.yaml
-rw-r--r--@  1 leanid  staff      98 Jan 21 00:35 pnpm-workspace.yaml
-rw-r--r--@  1 leanid  staff      82 Jan 21 00:35 postcss.config.js
drwxr-xr-x@  3 leanid  staff      96 Jan 21 00:35 prisma
-rw-r--r--@  1 leanid  staff     213 Jan 21 00:35 tailwind.config.js
-rw-r--r--@  1 leanid  staff     643 Jan 21 00:35 tsconfig.json
➜  solarerp git:(main) ✗ 

➜  solarerp git:(main) ✗ cat app/page.tsx                            


import { redirect } from 'next/navigation'

export default function Page() {
  redirect('/account/dashboard')
}%                                                                                                                                    
➜  solarerp git:(main) ✗ cat app/layout.tsx
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: 'Solar Sprint',
  description: 'Task management system for teams',
};

type RootLayoutProps = {
  children: React.ReactNode;
};

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en">
      <body className={`${inter.variable} font-sans antialiased bg-gray-50 min-h-screen`}>
        {children}
      </body>
    </html>
  );
}

➜  solarerp git:(main) ✗ 

➜  solarerp git:(main) ✗ cat package.json
{
  "name": "solarerp",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "postinstall": "prisma generate",
    "build": "next build",
    "start": "next start",
    "lint": "next lint"
  },
  "dependencies": {
    "bcryptjs": "^3.0.3",
    "next": "14.2.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "@prisma/client": "^5.22.0"
  },
  "devDependencies": {
    "@prisma/client": "5.22.0",
    "@types/bcryptjs": "^3.0.0",
    "@types/node": "^20.11.0",
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0",
    "autoprefixer": "^10.4.23",
    "eslint": "^8.57.1",
    "eslint-config-next": "16.1.3",
    "postcss": "^8.5.6",
    "prisma": "5.22.0",
    "tailwindcss": "^3.4.19",
    "typescript": "^5.3.0"
  }
}

➜  solarerp git:(main) ✗ 

task 1