🚧 Solar Sprint v0.2.0 — Roadmap

🎯 Основные цели v0.2.0

Усилить модель доступа (roles & permissions)

Добавить основной домен: Tasks

Подготовить backend к реальному UI

Повысить наблюдаемость и стабильность

Сохранить Engine-driven конвейер

✅ 2. Tasks Domain (MVP)
New model

Task

id

title

description?

status (TODO / IN_PROGRESS / DONE)

projectId

tenantId

createdAt / updatedAt

API

GET /api/projects/{id}/tasks

POST /api/projects/{id}/tasks

PATCH /api/tasks/{id}

DELETE /api/tasks/{id}

Rules

Tasks всегда scoped к:

Project

Tenant

Полная tenant isolation


🧪 8. Audit & Quality Gate

Claude audit pass:

tenant leaks

role bypass

Prisma misuse

Engine regression check

🏁 Definition of Done (v0.2.0)

 Tasks CRUD работает

 Roles enforced server-side

 No tenant leaks

 API ready for real frontend

 Документация актуальна

 Engine pipeline сохранён и усилен

⏭️ После v0.2.0

v0.3.0:

invitations

user management

soft-delete

audit logs


