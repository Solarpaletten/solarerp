# Solar AI Dev System — Architecture & Team Doctrine

**Status:** ARCHITECTURE APPROVED
**Execution:** After current Solar ERP development cycle
**Date:** 2026-03-08
**Approved by:** Leanid (Architect)

---

## Team Structure

### Roles

| Role | Who | Platform | Responsibility |
|------|-----|----------|----------------|
| **Architect** | Leanid | — | Vision, approval, final gate |
| **Consultant-Auditor** | Dashka | ChatGPT | Writes ТЗ (d_c_gitkeeptask{N}.md), ERP architecture, IFRS/DATEV/EU VAT expertise |
| **Super Senior Reviewer** | Dashka | ChatGPT | Reviews ТЗ, audits deliverables, scores results, identifies patches |
| **Super Engineer** | Claude | Anthropic | Implements code, returns c_d_gitresponse{N}.md |

### Workflow

```
D (Consultant-Auditor, ChatGPT)
  │
  ├─ Writes ТЗ: d_c_gitkeeptask{N}.md
  │
  ├─ Reviews & refines ТЗ (Super Senior mode)
  │
  ▼
L (Architect, Leanid)
  │
  ├─ Reviews ТЗ
  ├─ APPROVAL = no additional questions / no stop signal
  │   (implicit approval — if Architect doesn't stop, ТЗ is approved)
  │
  ▼
C (Super Engineer, Claude Anthropic)
  │
  ├─ Receives approved ТЗ
  ├─ Implements: code + files + deploy instructions
  ├─ Returns: c_d_gitresponse{N}.md
  │
  ▼
D (Auditor mode)
  │
  ├─ Audits deliverable (score /100)
  ├─ Identifies issues → patches
  │
  ▼
L (Final gate)
  │
  └─ Deploy approval
```

### Implicit Approval Rule

> When Architect (Leanid) does NOT ask additional questions
> and does NOT issue a stop signal,
> the ТЗ is considered **automatically approved**
> and is forwarded to Claude (Super Engineer) for implementation.

---

## File Protocol

| Direction | File | Meaning |
|-----------|------|---------|
| D→C | `d_c_gitkeeptask{N}.md` | ТЗ from Dashka to Claude |
| C→D | `c_d_gitresponse{N}.md` | Deliverable from Claude to Dashka |
| L→D→C | Implicit via chat | Architect approval signal |

---

## Future: AI Dev System Components

### 1. Source of Truth
```
/ai-dev-system/standards/     — coding rules, architecture, naming
/ai-dev-system/playbooks/     — task lifecycle, review process
```

### 2. Task Packets (SDLC Pipeline)
```
/ai-dev-system/tasks/task-{N}/
  01-research.md    — context, docs, existing code
  02-design.md      — API contract, DB schema, architecture
  03-plan.md        — decomposition, dependencies, estimate
  04-implement.md   — code + tests
  05-verify.md      — build, tests, visual check
  06-review.md      — code review, MR, gates
```

### 3. Context Layer (Context7 pattern)
```
/context/
  architecture/    — ERP system design, multi-tenant
  domain/          — accounting rules, VAT, IFRS
  database/        — prisma schema summary
  api/             — contracts per module
  patterns/        — service layer, snapshot pattern
  decisions/       — architectural decision log
```

### 4. Quality Gates
```
Gate 1: Build       — pnpm build passes
Gate 2: Security    — auth, tenant isolation (PASS/BLOCK strict)
Gate 3: Test        — critical flows verified (PASS/WARN/BLOCK)
Gate 4: Docs Sync   — API/schema changes in docs (PASS/WARN/BLOCK)
Gate 5: Deploy      — production readiness (PASS/WARN/BLOCK)
```
Priority: Security → Tests → Docs → Deploy

### 5. Git Workflow (safest mode)
```
AI prepares patch/files → Human reviews → Human commits/merges
```

---

## Key Principles

1. **AI готовит изменения. Архитектор утверждает.**
2. **Документация обновляется вместе с кодом, не после.**
3. **Бухгалтерская логика = данные (templates), не код (if/else).**
4. **Каждый таск — атомарный. Сделали → проверили → пошли дальше.**

---

## Reference

- Коля (12y frontend): SDLC Pipeline, агенты синхронизируют docs после каждой задачи
- Context7: context management layer, база знаний постоянно обновляется
- Solar ERP L⇒D⇒C: already implements human orchestration layer
