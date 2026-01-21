🚧 Solar Sprint v0.2.0 — Engine Pipeline (L → …)
🧱 FOUNDATION
L — User Role (Prisma delta)

Цель: заложить роли в ядро

Prisma:

Добавить role в User

Enum: OWNER | ADMIN | MEMBER

Правила:

Только additive change

OWNER — роль по умолчанию при signup

📄 Артефакт:

prisma/schema.prisma (PATCH)

M — Role Assignment Logic

Цель: сервер сам управляет ролями

Signup:

Первый пользователь Tenant → OWNER

Запрет:

role не принимается из body

📄 Артефакт:

PATCH app/api/auth/signup/route.ts

🔐 AUTH CONTEXT v2
N — getAuthContext (v2)

Цель: единый источник auth-данных

Новый helper:

lib/auth/getAuthContext.ts

Возвращает:

{
  userId,
  tenantId,
  role
}


📄 Артефакт:

CREATE lib/auth/getAuthContext.ts

O — requireRole

Цель: role-based доступ

Helper:

requireRole(request, role)

Ошибка:

403 FORBIDDEN

📄 Артефакт:

CREATE lib/auth/requireRole.ts

P — requireAdmin

Цель: частый shortcut

ADMIN или OWNER

Использует requireRole

📄 Артефакт:

CREATE lib/auth/requireAdmin.ts

📋 TASKS DOMAIN (CORE)
Q — Task Model (Prisma)

Цель: основной домен v0.2.0

Model Task

Связи:

tenantId

projectId

📄 Артефакт:

PATCH prisma/schema.prisma

R — List & Create Tasks

Цель: базовый CRUD

GET /api/projects/{id}/tasks

POST /api/projects/{id}/tasks

Tenant + Project isolation

📄 Артефакт:

CREATE app/api/projects/[id]/tasks/route.ts

S — Update Task

Цель: PATCH

PATCH /api/tasks/{id}

Проверка tenantId

📄 Артефакт:

CREATE app/api/tasks/[id]/route.ts (PATCH only)

T — Delete Task

Цель: безопасное удаление

DELETE /api/tasks/{id}

Tenant isolation

📄 Артефакт:

PATCH app/api/tasks/[id]/route.ts

🧪 VALIDATION & ERRORS
U — Unified Error Format

Цель: единый контракт ошибок

Helper:

lib/http/errorResponse.ts

Формат:

{ "error": { "code", "message" } }


📄 Артефакт:

CREATE lib/http/errorResponse.ts

V — Validation Helpers

Цель: убрать копипасту

required fields

enum validation

📄 Артефакт:

CREATE lib/http/validate.ts

🩺 OPS & METADATA
W — Health v2

Цель: наблюдаемость

latency

uptime

📄 Артефакт:

PATCH /api/health

X — Version Endpoint

Цель: CI / prod info

/api/version

version, commit, buildTime

📄 Артефакт:

CREATE app/api/version/route.ts

📚 DOCUMENTATION & AUDIT
Y — Docs v2

Цель: зафиксировать систему

README v2

TASKS API

Roles matrix

📄 Артефакт:

PATCH README.md

CREATE ARCHITECTURE.md

CREATE SECURITY.md

Z — Audit Pass

Цель: закрыть v0.2.0

Claude audit:

tenant leaks

role bypass

Engine regression check

📄 Артефакт:

AUDIT.md

🏁 Итог v0.2.0

Полноценный backend

Роли

Tasks

Готов к реальному UI

Конвейер сохранён