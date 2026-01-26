🚨 TASK 1 — NEW SYSTEM: SOLAR ERP
PROMPT-FIRST REPRODUCIBLE ARCHITECTURE

ZERO DEVIATION / ZERO MANUAL CODE

Статус: 🔴 CRITICAL
Уровень: ARCHITECTURAL
Допуск к отклонениям: ❌ НОЛЬ

🎯 ЦЕЛЬ ЗАДАЧИ

Построить воспроизводимую PROMPT-FIRST систему для SOLAR ERP, где:

КАЖДЫЙ файл проекта (кроме явно исключённых)

имеет собственный PROMPT

может быть воссоздан LLM 1:1

НЕ пишется вручную

НЕ содержит импровизаций

Если файл нельзя воспроизвести из PROMPT —
он считается архитектурно неверным и работа не принимается.

⛔ АБСОЛЮТНЫЕ ЗАПРЕТЫ

❌ Запрещено писать код вручную
❌ Запрещено менять логику без прямого указания
❌ Запрещено дополнять PROMPT «от себя»
❌ Запрещено:

as string

runtime casting

dynamic exports

любые «я решил, что так лучше»

❗ Любое нарушение = TASK FAILED без доработок

✅ ЧТО РАЗРЕШЕНО

✅ Генерация кода ТОЛЬКО через PROMPT
✅ 1 файл = 1 PROMPT
✅ Строгое следование инструкциям
✅ Генерация ТОЧНО того файла, который указан

🧠 КАНОН (SOURCE OF TRUTH)

Обязательные входные данные (НЕ ОБСУЖДАЮТСЯ):

Prisma schema SOLAR ERP
→ использовать как абсолютный канон, без изменений

MAX-SEED ERP (бизнес-реальность)

Tenant

Company

Clients (LOCAL / EU / FOREIGN)

Items

Sales

Purchases

Stock

Bank

Seed задаёт мышление ERP.
LLM обязан читать seed ПЕРВЫМ, затем писать PROMPT’ы.

📂 СТРУКТУРА, КОТОРУЮ НУЖНО СОЗДАТЬ
/prompts/
  /lib/
    prisma_schema.prompt.md
    seed_erp_max.prompt.md

  /api/
    auth_login.prompt.md
    auth_signup.prompt.md
    companies_route.prompt.md
    company_by_id_route.prompt.md

  /ui/
    AccountSidebar.prompt.md
    CompanySidebar.prompt.md
    DashboardPage.prompt.md
    CompanyPage.prompt.md

/scripts/
  regenerate.sh

⛔ ИСКЛЮЧЕНИЯ (НЕ ТРОГАТЬ, НЕ ГЕНЕРИРОВАТЬ)

Запрещено трогать и генерировать:

app/layout.tsx
app/page.tsx
app/globals.css


Это ручные bootstrap-файлы,
source of truth, НЕ PROMPT-FIRST.

🧾 СТАНДАРТ КАЖДОГО PROMPT

Каждый *.prompt.md ОБЯЗАН содержать:

Purpose — зачем файл существует

Exact Output Path — точный путь и имя файла

Inputs / Outputs — строгие контракты

Invariants — что запрещено нарушать

Allowed tools — Prisma, enums, types

Forbidden patterns — явный список запретов

CODE SPECIFICATION — полный код для генерации

❗ PROMPT без этих секций = НЕВАЛИДЕН

▶️ СКРИПТ regenerate.sh (ОБЯЗАТЕЛЕН)

Скрипт обязан:

Пройти по всем *.prompt.md

Сгенерировать файлы

Разложить их по реальным путям проекта

Проверить diff с текущими файлами

Если diff ≠ 0 → ❌ FAIL

📦 DELIVERABLE (СТРОГО)

ОДИН ZIP-АРХИВ:

TASK1_SOLAR_ERP_PROMPT_SYSTEM.zip
├── prompts/
├── scripts/
├── README.md   (как запускать regenerate.sh)


❌ Никаких отдельных файлов
❌ Никаких «пришлю позже»
❌ Никаких правок после

🚨 КРИТЕРИЙ ПРИЁМКИ

Все файлы (кроме исключений) воспроизводимы

Ни одного файла, написанного вручную

regenerate.sh даёт идентичный результат

Ноль импровизаций

Ноль отклонений

⚠️ ФИНАЛЬНОЕ ПРЕДУПРЕЖДЕНИЕ

Эта задача:

❌ НЕ про скорость

❌ НЕ про творчество

❌ НЕ про «как лучше»

Это задача про дисциплину, архитектуру и систему.

Если ты:

снова напишешь код вручную

изменишь логику без указания

попытаешься «улучшить»

➡️ Задача отклоняется полностью.

🛑 ФИНАЛ

Ты работаешь не как индивидуальный разработчик,
а как исполнитель в архитектурной системе.

Слушаешь ТОЛЬКО то, что написано выше.

📌 C=>D — Awaiting strict execution.