D=>L

Принято. Делаем как по протоколу: фиксируем Sprint 5 в GitKeep → пуш в GitHub → даём Claude чёткое ТЗ: iOS(Swift) + Android(Kotlin) по factory-архитектуре.

Ниже — готовый пакет.

1) GitKeep файл Sprint 5 (кладём в docs/d-c/ и коммитим)

Создай файл:

docs/d-c/d_c_gitkeep_sprint5.md

Содержимое:

# d_c_gitkeep_sprint5 — Sprint 5: Mobile Clients (iOS + Android) on Factory Architecture

**Date:** 2026-02-12  
**Repo:** Solarpaletten/solarerp  
**Canonical source:** `projects/solar-erp` (factory prompts-based architecture)

## Goal
Build **mobile clients**:
- iOS (SwiftUI) — recorder + upload + transcribe + history
- Android (Kotlin) — same feature parity

## Non-goals (for Sprint 5)
- No runtime merge
- No migration to JWT/cookies yet (use existing factory API contract)
- No deep backend refactor unless required for mobile parity

## Deliverables
### A) API Contract (must be documented)
- Base URL / endpoints list
- Auth method (what headers / tokens)
- Payload schemas (login/signup, companies, health)
- Error format standard

### B) iOS (SwiftUI)
- Auth flow (login/signup)
- Company list + company details
- Record audio memo
- Upload audio to backend
- Request transcription
- Display transcription history
- Local storage for tokens/headers (Keychain if token exists; else simple storage)

### C) Android (Kotlin)
Same as iOS feature parity.

### D) Shared rules
- Use one API client abstraction
- One config file for base URL / auth
- Clear separation: UI ↔ ViewModel ↔ Network ↔ Models

## Acceptance Criteria
- iOS builds and runs on device
- Android builds and runs on emulator/device
- End-to-end happy path:
  Login → List companies → Record → Upload → Transcribe → Show history

## Notes
Factory architecture is canonical. Runtime folder is reference only and must not be used in Sprint 5.

2) Команды Git (внутри projects/solar-erp)
# внутри projects/solar-erp
git status
git add docs/d-c/d_c_gitkeep_sprint5.md
git commit -m "d_c_gitkeep_sprint5: Sprint 5 mobile clients (iOS+Android)"
git push

3) D=>C ТЗ Claude (готовый текст, просто отправляешь ему)

D=>C | Sprint 5 — Mobile Clients (Swift + Kotlin) from Factory Architecture

Source of truth: репозиторий Solarpaletten/solarerp, папка factory architecture (текущий main).
Runtime НЕ использовать.

Задача: по существующей архитектуре и API в factory-коде подготовить:

iOS SwiftUI app skeleton

Android Kotlin app skeleton
с одинаковым функционалом.

Сначала: извлеки и зафиксируй API Contract (в markdown):

endpoints

auth flow (headers/tokens)

request/response schemas

error format

Далее iOS (SwiftUI):

экран Login/Signup

Companies list + Company detail

Audio recorder (мемо)

Upload аудио

Transcribe request

History view (список)

единый APIClient + модели + конфиг

Далее Android (Kotlin):
то же самое по структуре (MVVM / repository), единый ApiClient, модели, конфиг.

Output:

docs/MOBILE/API_CONTRACT.md

ios/SolarERP/ (проект)

android/SolarERP/ (проект)

docs/MOBILE/RUNBOOK.md (как запустить оба проекта)

Правило: если чего-то не хватает в backend для мобильного пути — не переписывай всё, а предложи минимальные патчи (1–3 файла) и зафиксируй их списком.

4) Мини-контроль (чтобы Claude не “уплыл”)

Три жёстких ограничения, которые ты можешь добавить в конце:

❌ не менять структуру factory без необходимости

✅ сначала API_CONTRACT.md, потом код

✅ iOS и Android должны быть симметричны по фичам

Если хочешь — я прямо сейчас сформирую ещё короткий “контрольный чек-лист ревью” (что именно ты проверяешь в PR Claude за 2 минуты).

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
│   └── d-_c
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
├── tailwind.config.js
└── tsconfig.json

29 directories, 16 files
➜  solar-erp git:(main) ✗ ls -la 
total 376
drwxr-xr-x@ 24 leanid  staff     768 Feb 12 03:07 .
drwxr-xr-x@  4 leanid  staff     128 Feb 12 02:59 ..
-rw-r--r--@  1 leanid  staff    6148 Feb 12 02:55 .DS_Store
-rw-r--r--@  1 leanid  staff      90 Jan 27 01:22 .env
-rw-r--r--@  1 leanid  staff      40 Jan 27 01:22 .eslintrc.json
drwxr-xr-x@ 12 leanid  staff     384 Feb 12 03:09 .git
-rw-r--r--@  1 leanid  staff     478 Jan 27 01:22 .gitignore
drwxr-xr-x@ 11 leanid  staff     352 Jan 27 01:48 .next
-rw-r--r--@  1 leanid  staff    5509 Jan 27 00:26 README.md
drwxr-xr-x@  9 leanid  staff     288 Feb 12 02:55 app
drwxr-xr-x@  5 leanid  staff     160 Jan 27 00:40 components
drwxr-xr-x@  3 leanid  staff      96 Feb 12 03:18 docs
drwxr-xr-x@  4 leanid  staff     128 Jan 27 00:40 lib
-rw-r--r--@  1 leanid  staff     201 Jan 27 01:22 next-env.d.ts
-rw-r--r--@  1 leanid  staff       0 Jan 15 22:06 next.config.js
drwxr-xr-x@ 19 leanid  staff     608 Jan 27 01:42 node_modules
-rw-r--r--@  1 leanid  staff     772 Jan 27 01:22 package.json
-rw-r--r--@  1 leanid  staff  128900 Jan 27 01:22 pnpm-lock.yaml
-rw-r--r--@  1 leanid  staff      98 Jan 27 01:22 pnpm-workspace.yaml
-rw-r--r--@  1 leanid  staff      82 Jan 27 01:22 postcss.config.js
drwxr-xr-x@  5 leanid  staff     160 Jan 27 01:39 prisma
-rwxr-xr-x@  1 leanid  staff    5998 Jan 27 00:26 regenerate.sh
-rw-r--r--@  1 leanid  staff     213 Jan 27 01:22 tailwind.config.js
-rw-r--r--@  1 leanid  staff     643 Jan 27 01:22 tsconfig.json
➜  solar-erp git:(main) ✗ 