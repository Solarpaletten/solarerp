Идеально.
Не правим руками. Формируем **чёткое ТЗ для Claude**.

Ниже готовый текст для gitkeep / Claude.

---

# 📄 ТЗ для Claude

**Task: Fix Auth Entry Logic (Factory Layer Only)**

C=>D

## Контекст

Factory проект: `projects/solar-erp`

Текущее поведение:

* `/` редиректит на `/account/dashboard`
* `/account/dashboard` делает запросы к `/api/companies`
* При отсутствии `x-user-id` → 401
* Login UI работает, но entry logic некорректная

---

## 🎯 Задача

Реализовать корректную entry-логику для Factory auth flow.

---

## 🧠 Требуемое поведение

### 1️⃣ При заходе на `/`

Проверить:

```
localStorage.getItem('userId')
```

---

### 2️⃣ Если userId существует:

→ redirect(`/account/dashboard`)

---

### 3️⃣ Если userId НЕ существует:

→ redirect(`/login`)

---

### 4️⃣ Страница `/login`

* Показывает форму входа
* Если логин успешен → сохраняет:

  * userId
  * userEmail
  * tenantId
* Затем redirect(`/account/dashboard`)

---

### 5️⃣ Страница `/signup`

* Показывается ТОЛЬКО если пользователь нажал "Create account"
* После успешной регистрации → redirect(`/login`)

---

# ⚠️ Ограничения

* ❌ Не трогать Runtime layer
* ❌ Не добавлять JWT
* ❌ Не добавлять cookies
* ❌ Не менять API contract
* ❌ Не менять backend auth
* ❌ Не менять prisma schema

Работаем только на уровне:

* `app/page.tsx`
* возможно `app/layout.tsx`
* возможно auth pages

---

# 📌 Важно

Factory использует `x-user-id` header.

Entry logic должна быть клиентской (через localStorage),
не через middleware.

---

# 🧩 Проверить

1. Новый пользователь → `/signup` → `/login`
2. Логин → `/account/dashboard`
3. Перезагрузка страницы → остаёмся в dashboard
4. Очистка localStorage → при заходе `/` → редирект на `/login`

---

# ✅ Deliverable

* Исправленный `app/page.tsx`
* Краткое описание что было изменено
* Подтверждение happy-path

---

Вот это даём Claude.

И ты абсолютно правильно мыслишь:
мы не правим руками — мы управляем архитектурой.

☕ Теперь можно спокойно пить кофе.


➜  AI-SERVER_solarerp git:(main) ✗ cd projects/solar-erp
➜  solar-erp git:(main) ✗ tree -L 2

 
.
├── README.md
├── app
│   ├── (auth)
│   ├── account
│   ├── api
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
├── components
│   ├── forms
│   ├── layouts
│   └── ui
├── docs
│   └── d_c
├── lib
│   ├── auth
│   └── prisma.ts
├── next-env.d.ts
├── next.config.js
├── node_modules
│   ├── @prisma
│   ├── @types
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
│   ├── schema.prisma
│   └── seed.ts
├── regenerate.sh
├── runtime
│   └── src
├── tailwind.config.js
└── tsconfig.json

31 directories, 16 files
➜  solar-erp git:(main) ✗ ls -la
total 376
drwxr-xr-x@ 25 leanid  staff     800 Feb 19 17:03 .
drwxr-xr-x@  4 leanid  staff     128 Feb 12 02:59 ..
-rw-r--r--@  1 leanid  staff    6148 Feb 19 15:33 .DS_Store
-rw-r--r--@  1 leanid  staff      90 Jan 27 01:22 .env
-rw-r--r--@  1 leanid  staff      40 Jan 27 01:22 .eslintrc.json
drwxr-xr-x@ 13 leanid  staff     416 Feb 19 16:51 .git
-rw-r--r--@  1 leanid  staff     478 Jan 27 01:22 .gitignore
drwxr-xr-x@ 11 leanid  staff     352 Feb 19 17:08 .next
-rw-r--r--@  1 leanid  staff    5509 Jan 27 00:26 README.md
drwxr-xr-x@  9 leanid  staff     288 Feb 19 17:00 app
drwxr-xr-x@  5 leanid  staff     160 Jan 27 00:40 components
drwxr-xr-x@  4 leanid  staff     128 Feb 19 15:08 docs
drwxr-xr-x@  4 leanid  staff     128 Jan 27 00:40 lib
-rw-r--r--@  1 leanid  staff     201 Jan 27 01:22 next-env.d.ts
-rw-r--r--@  1 leanid  staff       0 Jan 15 22:06 next.config.js
drwxr-xr-x@ 19 leanid  staff     608 Feb 19 17:03 node_modules
-rw-r--r--@  1 leanid  staff     772 Jan 27 01:22 package.json
-rw-r--r--@  1 leanid  staff  128900 Jan 27 01:22 pnpm-lock.yaml
-rw-r--r--@  1 leanid  staff      98 Jan 27 01:22 pnpm-workspace.yaml
-rw-r--r--@  1 leanid  staff      82 Jan 27 01:22 postcss.config.js
drwxr-xr-x@  5 leanid  staff     160 Jan 27 01:39 prisma
-rwxr-xr-x@  1 leanid  staff    5998 Jan 27 00:26 regenerate.sh
drwxr-xr-x@  3 leanid  staff      96 Feb 19 14:55 runtime
-rw-r--r--@  1 leanid  staff     213 Jan 27 01:22 tailwind.config.js
-rw-r--r--@  1 leanid  staff     643 Jan 27 01:22 tsconfig.json
➜  solar-erp git:(main) ✗ cd app/\(auth\) 
➜  (auth) git:(main) ✗ ls -la
total 0
drwxr-xr-x@ 4 leanid  staff  128 Feb 19 17:00 .
drwxr-xr-x@ 9 leanid  staff  288 Feb 19 17:00 ..
drwxr-xr-x@ 3 leanid  staff   96 Feb 19 17:00 login
drwxr-xr-x@ 3 leanid  staff   96 Feb 19 17:00 signup
➜  (auth) git:(main) ✗ tree     
.
├── login
│   └── page.tsx
└── signup
    └── page.tsx

3 directories, 2 files
➜  (auth) git:(main) ✗ ls -la login  
total 16
drwxr-xr-x@ 3 leanid  staff    96 Feb 19 17:00 .
drwxr-xr-x@ 4 leanid  staff   128 Feb 19 17:00 ..
-rw-r--r--@ 1 leanid  staff  6974 Feb 19 17:00 page.tsx
➜  (auth) git:(main) ✗ ls -la signup                   
total 16
drwxr-xr-x@ 3 leanid  staff    96 Feb 19 17:00 .
drwxr-xr-x@ 4 leanid  staff   128 Feb 19 17:00 ..
-rw-r--r--@ 1 leanid  staff  6329 Feb 19 17:00 page.tsx
➜  (auth) git:(main) ✗ 