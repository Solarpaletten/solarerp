Dashka отправляет мне задание. Нужно:

Посмотреть gitkeep*.md файлы
Подключиться через project_knowledge_search к GitHub репозиторию
Найти task1

Начну с поиска в project knowledge.C=>D Принял! Сейчас подключаюсь к project knowledge и ищу задание.2 stepsSearched project for “gitkeep3task1 task1 двухуровневая архитектура account companies”2 resultsdocs/gitkeep2task1.md9 relevant sectionstextdocs/references/sitepro-reference.mdtextЛокализовал нужный файл задания для выполнения.Теперь я вижу полную картину. Ищу конкретное задание gitkeep3task1.md - там должно быть актуальное ТЗ.Вижу контекст. Ищу конкретное текущее задание:Searched project for “gitkeep3task1 gitkeep1task1 текущее задание backend prompts”2 resultsdocs/gitkeep2task1.md8 relevant sectionstextdocs/ENGINE.md2 relevant sectionstextThought processТеперь я понял задачу полностью:
TASK 1: Переписать Backend Prompt Engine (A → I) для SolarERP с нуля.
Папка: prompts/solarerp/solarerp_Template_Engine_BE/
Файлы: PROMPT_TASK_PROD_02_A.md до PROMPT_TASK_PROD_02_I.md
Мне нужно:

Посмотреть текущую структуру проекта и Prisma schema
Написать 9 промптов с нуля (не редактировать старые, а переписать полностью)
Промпты должны быть System Prompts для AI, не документация

Начну с изучения текущей схемы Prisma и структуры, чтобы понять что там есть.C=>D ПРИНЯЛ ЗАДАНИЕ!
🎯 TASK 1: SolarERP Backend Prompt Engine (A → I)
Полностью переписать 9 backend-промптов с нуля.
Папка: prompts/solarerp/solarerp_Template_Engine_BE/
Сначала изучу текущую структуру проекта и Prisma schema:Смотрю структуру доступных файловplaintextHere are the files and directories up to 2 levels deep in /mnt/user-data/uploads, excluding hidden items and node_modules:
0	/mnt/user-data/uploads
Систематизировал архитектуру проекта и подготовил девять промптов.Нет загруженных файлов. Мне нужно работать на основе информации из project knowledge. Там я видел:

Prisma schema с 8 моделями (Client, Item, SaleDocument, PurchaseDocument, StockMovement, BankStatement, etc.)
Структура Next.js App Router
Двухуровневая архитектура (Account → Company)

Я должен написать 9 промптов (A-I) для Backend Engine. Создам их в рабочей директории и потом отдам пользователю.
Структура промптов по ТЗ:

A: SolarERP Backend Architecture — Canon
B: Prisma Canonical Model Rules
C: Auth, Tenant, Company Context
D: API Design Rules (App Router)
E: ERP Modules Logic (Backend View)
F: Database & Infrastructure Rules
G: Import Philosophy (CRITICAL)
H: Error Handling & Validation
I: Roadmap & AI Usage

Начну создавать файлы.Понял. Начинаю создавать 9 backend-промптов с нуля. Читаю skill для создания документов:Читаю skill для создания markdown документовСтруктурировал девять markdown-файлов как системные промпты для проекта.Это skill для docx, но мне нужно создавать markdown файлы (.md). Я создам 9 промптов напрямую как .md файлы. Начну создавать их.
Структура по ТЗ:

A: SolarERP Backend Architecture — Canon
B: Prisma Canonical Model Rules
C: Auth, Tenant, Company Context
D: API Design Rules (App Router)
E: ERP Modules Logic (Backend View)
F: Database & Infrastructure Rules
G: Import Philosophy (CRITICAL)
H: Error Handling & Validation
I: Roadmap & AI Usage

Создаю файлы как System Prompts для AI - не документацию!Для markdown файлов skill не нужен. Создаю 9 промптов напрямую:18 stepsCreating PROMPT I - Roadmap & AI UsagePROMPT_TASK_PROD_02_I.mdЗавершил создание промптов и подготовил результаты.Все 9 промптов созданы! Теперь копирую в outputs и создаю отчёт.Все 9 промптов созданы. Копирую в outputs:2 stepsPresented 9 filesПодготовился к выполнению задачи и готов приступить.Всё готово. Отчитываюсь.
C=>D PROMPT A–I REWRITTEN FROM SCRATCH, READY FOR REVIEW ✅
╔════════════════════════════════════════════════════════════════════════════╗
║                                                                            ║
║   🏆  SOLAR ERP — BACKEND PROMPT ENGINE v1.0                              ║
║                                                                            ║
║   ┌──────────────────────────────────────────────────────────────────┐    ║
║   │                                                                  │    ║
║   │   ✅ PROMPT_A — Backend Architecture (Canon)                    │    ║
║   │   ✅ PROMPT_B — Prisma Canonical Model Rules                    │    ║
║   │   ✅ PROMPT_C — Auth, Tenant, Company Context                   │    ║
║   │   ✅ PROMPT_D — API Design Rules (App Router)                   │    ║
║   │   ✅ PROMPT_E — ERP Modules Logic (Backend View)                │    ║
║   │   ✅ PROMPT_F — Database & Infrastructure Rules                 │    ║
║   │   ✅ PROMPT_G — Import Philosophy (CRITICAL)                    │    ║
║   │   ✅ PROMPT_H — Error Handling & Validation                     │    ║
║   │   ✅ PROMPT_I — Roadmap & AI Usage                              │    ║
║   │                                                                  │    ║
║   └──────────────────────────────────────────────────────────────────┘    ║
║                                                                            ║
║   📊 Total: 9 промптов | ~75KB | 100% с нуля                              ║
║                                                                            ║
╚════════════════════════════════════════════════════════════════════════════╝
📋 SUMMARY
PromptTopicSizeAArchitecture Canon5.8KBBPrisma Model Rules6.0KBCAuth/Tenant/Company10.4KBDAPI Design Rules8.0KBEERP Modules Logic9.6KBFDatabase & Infra7.8KBGImport Philosophy8.8KBHError Handling11.4KBIRoadmap & AI Usage6.9KB
✅ Что включено:

System Prompts для AI — не документация, а инструкции
Code examples — готовые к копированию
Architectural diagrams — ASCII для понимания
Business rules — ERP-специфичная логика
Output rules — как AI должен генерировать код

📁 Путь для копирования в проект:
bashprompts/solarerp/solarerp_Template_Engine_BE/
├── PROMPT_TASK_PROD_02_A.md
├── PROMPT_TASK_PROD_02_B.md
├── PROMPT_TASK_PROD_02_C.md
├── PROMPT_TASK_PROD_02_D.md
├── PROMPT_TASK_PROD_02_E.md
├── PROMPT_TASK_PROD_02_F.md
├── PROMPT_TASK_PROD_02_G.md
├── PROMPT_TASK_PROD_02_H.md
└── PROMPT_TASK_PROD_02_I.md
D=>C Готово к ревью! 🚀Prompt task prod 02 aDocument · MD DownloadPrompt task prod 02 bDocument · MD DownloadPrompt task prod 02 cDocument · MD DownloadPrompt task prod 02 dDocument · MD DownloadPrompt task prod 02 eDocument · MD DownloadPrompt task prod 02 fDocument · MD DownloadPrompt task prod 02 gDocument · MD DownloadPrompt task prod 02 hDocument · MD DownloadPrompt task prod 02 iDocument · MD DownloadDownload all

task1