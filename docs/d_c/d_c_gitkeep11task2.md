Отлично. Значит действуем **архитектурно**, не руками.

Ты прав — мы не правим сами.
Мы даём Клауди точное ТЗ.

Сейчас симптом такой:

* Login → 200 ✅
* `/account/dashboard` открывается ✅
* `/api/companies` → 401 ❌
* Страница визуально не обновляется

Это означает:

> Dashboard рендерится, но данные не загружаются из-за отсутствия `x-user-id` в header.

---

# 📦 Готовое ТЗ для Claude

Скопируй и отправь ему:

---

## C=>D TASK

### Проблема

После успешного login (`POST /api/auth/login 200`)
Dashboard (`/account/dashboard`) загружается,
но `/api/companies` возвращает `401 Unauthorized`.

Причина предположительно:

* `x-user-id` header не передаётся
* либо Dashboard является Server Component
* либо fetch вызывается до доступа к localStorage

---

### Задача

1️⃣ Проверить файл:

```
app/account/dashboard/page.tsx
```

2️⃣ Убедиться, что:

* файл начинается с `'use client'`
* `localStorage.getItem('userId')` читается внутри `useEffect`
* fetch к `/api/companies` содержит:

```ts
headers: {
  'x-user-id': userId
}
```

3️⃣ Если fetch выполняется на сервере — перенести его в клиентский `useEffect`.

4️⃣ Ничего не менять в:

* runtime
* prisma
* backend
* login API

Только dashboard client-side logic.

---

### Ожидаемый результат

После login:

* `localStorage.userId` существует
* `/api/companies` возвращает 200
* Companies отображаются
* 401 исчезает

---

Factory architecture must remain:

* localStorage auth
* x-user-id header
* no JWT
* no cookies

---

# 🎯 Почему страница «не меняется»

Потому что UI уже рендерится.
Но данные не подгружаются.

Это не redirect-проблема.
Это header-проблема.

---

Ты всё сделал правильно.

Теперь мы просто даём инженеру точную задачу.

🚀

➜  AI-SERVER_solarerp git:(main) ✗ cd projects/solar-erp
➜  solar-erp git:(main) ✗ pnpm dev             

> solarerp@0.1.0 dev /Users/leanid/Projects/AI-SERVER_solarerp/projects/solar-erp
> next dev

  ▲ Next.js 14.2.0
  - Local:        http://localhost:3000
  - Environments: .env

 ✓ Starting...
npm warn Unknown env config "npm-globalconfig". This will stop working in the next major version of npm.
npm warn Unknown env config "verify-deps-before-run". This will stop working in the next major version of npm.
npm warn Unknown env config "_jsr-registry". This will stop working in the next major version of npm.
 ✓ Ready in 1574ms
 ○ Compiling / ...
 ✓ Compiled / in 2s (470 modules)
 GET / 200 in 2104ms
 ✓ Compiled /account/dashboard in 136ms (513 modules)
 ✓ Compiled /api/companies in 47ms (286 modules)
 GET /api/companies 401 in 100ms
 GET /api/companies 401 in 100ms
 GET /account/dashboard 200 in 50ms
 ✓ Compiled /_not-found in 118ms (536 modules)
 GET /.well-known/appspecific/com.chrome.devtools.json 404 in 142ms
 GET /api/companies 401 in 11ms
 GET /api/companies 401 in 5ms
 GET /account/dashboard 200 in 26ms
 GET /.well-known/appspecific/com.chrome.devtools.json 404 in 15ms
 GET /api/companies 401 in 5ms
 GET /api/companies 401 in 5ms
 ✓ Compiled /login in 101ms (542 modules)
 GET /login 200 in 134ms
 GET /.well-known/appspecific/com.chrome.devtools.json 404 in 13ms
 ✓ Compiled /api/auth/login in 88ms (296 modules)
 POST /api/auth/login 200 in 1071ms
 GET /api/companies 401 in 5ms
 GET /api/companies 401 in 3ms
 ✓ Compiled /account/companies in 151ms (553 modules)
 GET /api/companies 200 in 491ms
 GET /api/companies 200 in 240ms
 POST /api/companies 201 in 426ms
 GET /api/companies 200 in 193ms
 GET /api/companies 401 in 7ms
 GET /api/companies 401 in 7ms
 GET /api/companies 200 in 226ms
 GET /api/companies 200 in 192ms
 POST /api/auth/login 200 in 300ms
 GET /api/companies 401 in 3ms
 GET /api/companies 401 in 5ms

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
│   ├── ts-node -> .pnpm/ts-node@10.9.2_@types+node@20.19.30_typescript@5.9.3/node_modules/ts-node
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

32 directories, 16 files
➜  solar-erp git:(main) ✗ ls -la       
total 384
drwxr-xr-x@ 25 leanid  staff     800 Feb 19 18:08 .
drwxr-xr-x@  4 leanid  staff     128 Feb 12 02:59 ..
-rw-r--r--@  1 leanid  staff    6148 Feb 19 15:33 .DS_Store
-rw-r--r--@  1 leanid  staff      90 Jan 27 01:22 .env
-rw-r--r--@  1 leanid  staff      40 Jan 27 01:22 .eslintrc.json
drwxr-xr-x@ 13 leanid  staff     416 Feb 19 17:39 .git
-rw-r--r--@  1 leanid  staff     478 Jan 27 01:22 .gitignore
drwxr-xr-x@ 11 leanid  staff     352 Feb 19 18:16 .next
-rw-r--r--@  1 leanid  staff    5509 Jan 27 00:26 README.md
drwxr-xr-x@  9 leanid  staff     288 Feb 19 17:58 app
drwxr-xr-x@  5 leanid  staff     160 Jan 27 00:40 components
drwxr-xr-x@  4 leanid  staff     128 Feb 19 15:08 docs
drwxr-xr-x@  4 leanid  staff     128 Jan 27 00:40 lib
-rw-r--r--@  1 leanid  staff     201 Jan 27 01:22 next-env.d.ts
-rw-r--r--@  1 leanid  staff       0 Jan 15 22:06 next.config.js
drwxr-xr-x@ 20 leanid  staff     640 Feb 19 18:08 node_modules
-rw-r--r--@  1 leanid  staff     853 Feb 19 18:08 package.json
-rw-r--r--@  1 leanid  staff  132542 Feb 19 18:08 pnpm-lock.yaml
-rw-r--r--@  1 leanid  staff      98 Jan 27 01:22 pnpm-workspace.yaml
-rw-r--r--@  1 leanid  staff      82 Jan 27 01:22 postcss.config.js
drwxr-xr-x@  5 leanid  staff     160 Jan 27 01:39 prisma
-rwxr-xr-x@  1 leanid  staff    5998 Jan 27 00:26 regenerate.sh
drwxr-xr-x@  3 leanid  staff      96 Feb 19 14:55 runtime
-rw-r--r--@  1 leanid  staff     213 Jan 27 01:22 tailwind.config.js
-rw-r--r--@  1 leanid  staff     643 Jan 27 01:22 tsconfig.json
➜  solar-erp git:(main) ✗ 