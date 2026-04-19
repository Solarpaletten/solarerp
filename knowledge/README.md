# Solar AI Lab — Knowledge Base

## Purpose
Project-specific memory for Solar ERP + ICoder development team.
Agents (Claude, Qwen, Dashka) read this before answering.

## Structure
```
knowledge/
  task-history/     ← Completed tasks with decisions and fixes
  patterns/         ← Accepted solutions for recurring problems
  failures/         ← What didn't work and why
```

## Team
| Role | Agent | Provider |
|------|-------|----------|
| Architect | Leanid (L) | — |
| Super-Senior / Auditor | Dashka (D) | ChatGPT |
| Engineer | Claude (C) | Anthropic API |
| Local Engineer | Qwen (Q) | Ollama :11434 |

## Task Protocol
- Task files: `d_c_gitkeeptask{N}.md` (Dashka → Claude)
- Response files: `c_d_gitresponsetask{N}.md` (Claude → Dashka)
- Tags: `L=>C`, `C=>D`, `D=>C`, `L=>D/C/Q`

## Current Task Index
| Task | Status | Summary |
|------|--------|---------|
| 57 | ✅ | Reference data: Warehouse, OperationType, VatRate, Employee |
| 57.5 | ✅ | initialize-defaults endpoint (idempotent) |
| 58 | ✅ | Google OAuth, company onboarding wizard, accounting bootstrap |
| ICoder MVP-1 | ✅ | Qwen/Ollama provider added to ICoder |
| ICoder MVP-2 | 🔜 | Task Memory (this file) |
| 59 | 🔜 | Account Workspace / Company Switcher |

## Key Invariants (never violate)
1. Counterparty role = document-scoped, not entity-scoped (SAP standard)
2. Reference tables scope to Company, not Client
3. Seed must be idempotent (upsert + fixed IDs)
4. pnpm build must pass before closing any task
5. Schema changes: patch → migrate → generate → seed → build

## Stack
- Next.js 14.2, Prisma 5.22, PostgreSQL, TypeScript
- Auth: HttpOnly cookie `solar_session`
- Auth pattern: `requireTenant(request)` → `{ userId, tenantId }`
- DB: PostgreSQL at 207.154.220.86:5433, database `solarerp`
- Repo: Solarpaletten/solarerp
