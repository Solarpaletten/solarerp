#!/bin/bash
# =============================================================================
# SOLAR ERP - PROMPT-FIRST REGENERATION SCRIPT
# =============================================================================
# Usage: ./regenerate.sh [model]
# Default model: qwen2.5-coder:14b
# =============================================================================

set -e

MODEL="${1:-qwen2.5-coder:14b}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROMPTS_DIR="$SCRIPT_DIR/prompts"

# Colors
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${YELLOW}🚀 SOLAR ERP - Code Generation${NC}"
echo -e "${YELLOW}Model: $MODEL${NC}"
echo ""

# Create directories
mkdir -p lib/auth
mkdir -p components/ui
mkdir -p components/forms
mkdir -p components/layouts
mkdir -p app/api/auth/login
mkdir -p app/api/auth/signup
mkdir -p app/api/health
mkdir -p app/api/companies/\[companyId\]
mkdir -p app/\(auth\)/login
mkdir -p app/\(auth\)/signup
mkdir -p app/account/dashboard
mkdir -p app/account/companies/\[companyId\]
mkdir -p prisma

# Generate function
generate() {
    local prompt_file="$1"
    local output_file="$2"
    
    if [ ! -f "$prompt_file" ]; then
        echo -e "${RED}❌ PROMPT not found: $prompt_file${NC}"
        return 1
    fi
    
    echo -e "${YELLOW}⏳ Generating: $output_file${NC}"
    ollama run "$MODEL" < "$prompt_file" | sed '/^```/d' > "$output_file"
    echo -e "${GREEN}✅ Generated: $output_file${NC}"
}

# =============================================================================
# LIB
# =============================================================================
echo -e "\n${YELLOW}📁 LIB${NC}"
generate "$PROMPTS_DIR/lib/PROMPT_PRISMA.md" "lib/prisma.ts"
generate "$PROMPTS_DIR/lib/auth/PROMPT_PASSWORD.md" "lib/auth/password.ts"
generate "$PROMPTS_DIR/lib/auth/PROMPT_GETCURRENTUSER.md" "lib/auth/getCurrentUser.ts"
generate "$PROMPTS_DIR/lib/auth/PROMPT_REQUIRETENANT.md" "lib/auth/requireTenant.ts"
generate "$PROMPTS_DIR/lib/auth/PROMPT_SESSION.md" "lib/auth/session.ts"

# =============================================================================
# COMPONENTS/UI
# =============================================================================
echo -e "\n${YELLOW}📁 COMPONENTS/UI${NC}"
generate "$PROMPTS_DIR/ui/PROMPT_BUTTON.md" "components/ui/Button.tsx"
generate "$PROMPTS_DIR/ui/PROMPT_INPUT.md" "components/ui/Input.tsx"
generate "$PROMPTS_DIR/ui/PROMPT_CARD.md" "components/ui/Card.tsx"

# =============================================================================
# COMPONENTS/FORMS
# =============================================================================
echo -e "\n${YELLOW}📁 COMPONENTS/FORMS${NC}"
generate "$PROMPTS_DIR/components/forms/PROMPT_AUTHFORM.md" "components/forms/AuthForm.tsx"

# =============================================================================
# COMPONENTS/LAYOUTS
# =============================================================================
echo -e "\n${YELLOW}📁 COMPONENTS/LAYOUTS${NC}"
generate "$PROMPTS_DIR/components/layouts/PROMPT_ACCOUNTSIDEBAR.md" "components/layouts/AccountSidebar.tsx"
generate "$PROMPTS_DIR/components/layouts/PROMPT_COMPANYSIDEBAR.md" "components/layouts/CompanySidebar.tsx"

# =============================================================================
# API ROUTES
# =============================================================================
echo -e "\n${YELLOW}📁 API ROUTES${NC}"
generate "$PROMPTS_DIR/api/PROMPT_AUTH_SIGNUP.md" "app/api/auth/signup/route.ts"
generate "$PROMPTS_DIR/api/PROMPT_AUTH_LOGIN.md" "app/api/auth/login/route.ts"
generate "$PROMPTS_DIR/api/PROMPT_HEALTH.md" "app/api/health/route.ts"
generate "$PROMPTS_DIR/api/PROMPT_COMPANIES.md" "app/api/companies/route.ts"
generate "$PROMPTS_DIR/api/PROMPT_COMPANIES_ID.md" "app/api/companies/[companyId]/route.ts"

# =============================================================================
# APP PAGES
# =============================================================================
echo -e "\n${YELLOW}📁 APP PAGES${NC}"
generate "$PROMPTS_DIR/app/PROMPT_ROOT_LAYOUT.md" "app/layout.tsx"
generate "$PROMPTS_DIR/app/PROMPT_ROOT_PAGE.md" "app/page.tsx"
generate "$PROMPTS_DIR/app/PROMPT_AUTH_LOGIN.md" "app/(auth)/login/page.tsx"
generate "$PROMPTS_DIR/app/PROMPT_AUTH_SIGNUP.md" "app/(auth)/signup/page.tsx"
generate "$PROMPTS_DIR/app/PROMPT_ACCOUNT_LAYOUT.md" "app/account/layout.tsx"
generate "$PROMPTS_DIR/app/PROMPT_ACCOUNT_PAGE.md" "app/account/page.tsx"
generate "$PROMPTS_DIR/app/PROMPT_ACCOUNT_DASHBOARD.md" "app/account/dashboard/page.tsx"
generate "$PROMPTS_DIR/app/PROMPT_COMPANIES_LIST.md" "app/account/companies/page.tsx"
generate "$PROMPTS_DIR/app/PROMPT_COMPANY_LAYOUT.md" "app/account/companies/[companyId]/layout.tsx"
generate "$PROMPTS_DIR/app/PROMPT_COMPANY_PAGE.md" "app/account/companies/[companyId]/page.tsx"

# =============================================================================
# PRISMA
# =============================================================================
echo -e "\n${YELLOW}📁 PRISMA${NC}"
generate "$PROMPTS_DIR/prisma/PROMPT_SEED.md" "prisma/seed.ts"

# =============================================================================
# SUMMARY
# =============================================================================
echo ""
echo -e "${GREEN}=============================================${NC}"
echo -e "${GREEN}✅ GENERATION COMPLETE${NC}"
echo -e "${GREEN}=============================================${NC}"
echo ""
echo "Generated files:"
echo "  lib/           - 5 files"
echo "  components/    - 6 files"
echo "  app/api/       - 5 files"
echo "  app/           - 10 files"
echo "  prisma/        - 1 file"
echo "  ─────────────────────"
echo "  TOTAL:         27 files"
echo ""
echo "Next steps:"
echo "  1. npx prisma generate"
echo "  2. npx prisma db push"
echo "  3. npx ts-node prisma/seed.ts"
echo "  4. npm run dev"
