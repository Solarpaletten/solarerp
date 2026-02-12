# SOLAR ERP — PROMPT-FIRST Regeneration System v2

## 📋 Полный список PROMPT файлов

### LIB (5 файлов)
| PROMPT | OUTPUT |
|--------|--------|
| `prompts/lib/PROMPT_PRISMA.md` | `lib/prisma.ts` |
| `prompts/lib/auth/PROMPT_PASSWORD.md` | `lib/auth/password.ts` |
| `prompts/lib/auth/PROMPT_GETCURRENTUSER.md` | `lib/auth/getCurrentUser.ts` |
| `prompts/lib/auth/PROMPT_REQUIRETENANT.md` | `lib/auth/requireTenant.ts` |
| `prompts/lib/auth/PROMPT_SESSION.md` | `lib/auth/session.ts` |

### COMPONENTS (6 файлов)
| PROMPT | OUTPUT |
|--------|--------|
| `prompts/ui/PROMPT_BUTTON.md` | `components/ui/Button.tsx` |
| `prompts/ui/PROMPT_INPUT.md` | `components/ui/Input.tsx` |
| `prompts/ui/PROMPT_CARD.md` | `components/ui/Card.tsx` |
| `prompts/components/forms/PROMPT_AUTHFORM.md` | `components/forms/AuthForm.tsx` |
| `prompts/components/layouts/PROMPT_ACCOUNTSIDEBAR.md` | `components/layouts/AccountSidebar.tsx` |
| `prompts/components/layouts/PROMPT_COMPANYSIDEBAR.md` | `components/layouts/CompanySidebar.tsx` |

### API (5 файлов)
| PROMPT | OUTPUT |
|--------|--------|
| `prompts/api/PROMPT_AUTH_SIGNUP.md` | `app/api/auth/signup/route.ts` |
| `prompts/api/PROMPT_AUTH_LOGIN.md` | `app/api/auth/login/route.ts` |
| `prompts/api/PROMPT_HEALTH.md` | `app/api/health/route.ts` |
| `prompts/api/PROMPT_COMPANIES.md` | `app/api/companies/route.ts` |
| `prompts/api/PROMPT_COMPANIES_ID.md` | `app/api/companies/[companyId]/route.ts` |

### APP (10 файлов)
| PROMPT | OUTPUT |
|--------|--------|
| `prompts/app/PROMPT_ROOT_LAYOUT.md` | `app/layout.tsx` |
| `prompts/app/PROMPT_ROOT_PAGE.md` | `app/page.tsx` |
| `prompts/app/PROMPT_AUTH_LOGIN.md` | `app/(auth)/login/page.tsx` |
| `prompts/app/PROMPT_AUTH_SIGNUP.md` | `app/(auth)/signup/page.tsx` |
| `prompts/app/PROMPT_ACCOUNT_LAYOUT.md` | `app/account/layout.tsx` |
| `prompts/app/PROMPT_ACCOUNT_PAGE.md` | `app/account/page.tsx` |
| `prompts/app/PROMPT_ACCOUNT_DASHBOARD.md` | `app/account/dashboard/page.tsx` |
| `prompts/app/PROMPT_COMPANIES_LIST.md` | `app/account/companies/page.tsx` |
| `prompts/app/PROMPT_COMPANY_LAYOUT.md` | `app/account/companies/[companyId]/layout.tsx` |
| `prompts/app/PROMPT_COMPANY_PAGE.md` | `app/account/companies/[companyId]/page.tsx` |

### PRISMA (1 файл)
| PROMPT | OUTPUT |
|--------|--------|
| `prompts/prisma/PROMPT_SEED.md` | `prisma/seed.ts` |

## 📊 ИТОГО: 27 PROMPT = 27 файлов

## 🚀 Использование

### Полная регенерация
```bash
chmod +x regenerate.sh
./regenerate.sh                      # qwen2.5-coder:14b
./regenerate.sh deepseek-coder:33b   # другая модель
```

### Генерация одного файла
```bash
ollama run qwen2.5-coder:14b < prompts/api/PROMPT_COMPANIES.md | sed '/^```/d' > app/api/companies/route.ts
```

## 🔒 Правила PROMPT-FIRST

1. **НИКОГДА** не редактировать сгенерированные файлы напрямую
2. **ВСЕГДА** редактировать только PROMPT
3. После изменения PROMPT → регенерировать файл
4. 1 PROMPT = 1 файл (строго)

## 📁 Структура

```
solar-erp-prompts/
├── regenerate.sh
├── README.md
└── prompts/
    ├── lib/
    │   ├── PROMPT_PRISMA.md
    │   └── auth/
    │       ├── PROMPT_PASSWORD.md
    │       ├── PROMPT_GETCURRENTUSER.md
    │       ├── PROMPT_REQUIRETENANT.md
    │       └── PROMPT_SESSION.md
    ├── ui/
    │   ├── PROMPT_BUTTON.md
    │   ├── PROMPT_INPUT.md
    │   └── PROMPT_CARD.md
    ├── components/
    │   ├── forms/
    │   │   └── PROMPT_AUTHFORM.md
    │   └── layouts/
    │       ├── PROMPT_ACCOUNTSIDEBAR.md
    │       └── PROMPT_COMPANYSIDEBAR.md
    ├── api/
    │   ├── PROMPT_AUTH_SIGNUP.md
    │   ├── PROMPT_AUTH_LOGIN.md
    │   ├── PROMPT_HEALTH.md
    │   ├── PROMPT_COMPANIES.md
    │   └── PROMPT_COMPANIES_ID.md
    ├── app/
    │   ├── PROMPT_ROOT_LAYOUT.md
    │   ├── PROMPT_ROOT_PAGE.md
    │   ├── PROMPT_AUTH_LOGIN.md
    │   ├── PROMPT_AUTH_SIGNUP.md
    │   ├── PROMPT_ACCOUNT_LAYOUT.md
    │   ├── PROMPT_ACCOUNT_PAGE.md
    │   ├── PROMPT_ACCOUNT_DASHBOARD.md
    │   ├── PROMPT_COMPANIES_LIST.md
    │   ├── PROMPT_COMPANY_LAYOUT.md
    │   └── PROMPT_COMPANY_PAGE.md
    └── prisma/
        └── PROMPT_SEED.md
```

## ⚡ Рекомендуемые модели

| Model | Size | Speed | Quality |
|-------|------|-------|---------|
| qwen2.5-coder:14b | 14B | ⭐⭐⭐ | ⭐⭐⭐⭐ |
| deepseek-coder:33b | 33B | ⭐⭐ | ⭐⭐⭐⭐⭐ |
| codellama:34b | 34B | ⭐⭐ | ⭐⭐⭐⭐ |
| qwen2.5-coder:7b | 7B | ⭐⭐⭐⭐ | ⭐⭐⭐ |

## 🎯 Seed — ТРЕНД ПРОЕКТА

`prisma/seed.ts` содержит полные тестовые данные ERP:
- 1 Tenant (Demo Organization)
- 2 Users (admin@demo.com, user@demo.com)
- 2 Companies (Demo Trading LLC, Demo Services Inc)

Для каждой Company:
- 5 Clients (LOCAL/EU/FOREIGN, juridical/private)
- 10 Items (goods + services)
- 3 Sale Documents с items
- 3 Purchase Documents с items
- 5 Stock Movements
- 10 Bank Statements

Тестовые credentials: `admin@demo.com` / `password123`
