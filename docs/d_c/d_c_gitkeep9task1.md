Отлично. Вот сейчас ты подошёл к сути.

---

## 📍 Что произошло

Ты перенёс дашборды.
Но логин-страница осталась старая.

Почему?

Потому что в Factory активный файл логина — это:

```
app/(auth)/login/page.tsx
```

А в Runtime логин находится здесь:

```
runtime/src/app/(products)/(auth)/login/page.tsx
```

Это два разных слоя.
Factory не знает ничего про runtime/src.

---

# 🧠 Главное правило

Next.js рендерит только то, что лежит в `app/` корня проекта.

`runtime/src/app` — вообще не участвует в сборке.

---

# 🎯 Что ты хочешь сделать

> Вернуть красивую форму логина из Runtime в Factory.

Правильно.

Но:

❌ Не копируем весь runtime
❌ Не трогаем middleware
❌ Не переносим JWT

Нам нужно только UI.

---

# ✅ Правильная формула действий

### 1️⃣ Найти runtime login

Файл:

```
runtime/src/app/(products)/(auth)/login/page.tsx
```

---

### 2️⃣ Сравнить с factory login

Factory:

```
app/(auth)/login/page.tsx
```

---

### 3️⃣ Перенести только UI-часть

Оставляем:

* fetch на `/api/auth/login`
* x-user-id flow
* localStorage

Удаляем из runtime login:

* JWT
* cookies logic
* redirect middleware
* server actions

---

# ⚠️ Почему старый логин остался

Потому что ты перенёс дашборды,
но не тронул файл:

```
app/(auth)/login/page.tsx
```

Он до сих пор старый.

---

# 📌 Тебе сейчас нужно

Сформулировать Клауди ТЗ:

---

## ТЗ для Claude

```
Задача:

1. Взять UI логина из:
   runtime/src/app/(products)/(auth)/login/page.tsx

2. Адаптировать под Factory:

   - auth через x-user-id
   - без JWT
   - без cookies
   - без middleware
   - использовать /api/auth/login (Factory endpoint)
   - сохранить localStorage flow

3. Заменить:
   app/(auth)/login/page.tsx

4. Никакие другие файлы не трогать.
```

---

# 🔥 Важный момент

Factory логин работает по схеме:

```
POST /api/auth/login
→ возвращает user.id
→ сохранить в localStorage
→ дальше x-user-id header
```

Runtime логин работает по JWT.

Нельзя просто скопировать runtime файл.

Нужно адаптировать.

---

# 🧩 Хочешь — могу помочь тебе самому найти нужный файл

В терминале:

```
cd runtime/src/app
find . -name "page.tsx" | grep login
```

---

# 🧠 Архитектурно ты сейчас сделал важную вещь

Ты отделил:

Factory = чистый API слой
Runtime = продуктовый слой

Теперь UI переносится вручную, аккуратно.

---

Скажи мне:

Ты хочешь:

* 🔧 дать Клауди ТЗ и ждать
* или 🧠 разобрать файл runtime login вместе и перенести руками?

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
➜  solar-erp git:(main) ✗ 