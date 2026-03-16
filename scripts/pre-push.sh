#!/bin/bash
# ============================================================
# BatiGesti pre-push hook
# Runs critical smoke tests before allowing push to remote
# ============================================================

echo ""
echo "🚀 Pre-push: running smoke tests..."
echo ""

# Run only the fast critical checks (no build — that's too slow for a hook)
# We extract just the error-producing checks from smoke-test.sh

RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m'

ERRORS=0

error() {
  echo -e "${RED}  ✗ $1${NC}"
  ERRORS=$((ERRORS + 1))
}

ok() {
  echo -e "${GREEN}  ✓ $1${NC}"
}

# 1. Landing page import
if grep -rn "from.*['\"]\.\/components\/LandingPage['\"]" src/App.jsx > /dev/null 2>&1; then
  error "App.jsx importe l'ancien LandingPage (devrait être ./components/landing/LandingPage)"
else
  ok "LandingPage import correct"
fi

# 2. Table names
if grep -rn "from('entreprises')" src/ --include="*.js" --include="*.jsx" > /dev/null 2>&1; then
  error "Table 'entreprises' (pluriel) trouvée — devrait être 'entreprise'"
else
  ok "Table names OK"
fi

# 3. Required exports
if ! grep -q "export const PLANS" src/stores/subscriptionStore.js 2>/dev/null; then
  error "PLANS manquant dans subscriptionStore.js"
else
  ok "PLANS export OK"
fi

# 4. Secrets in code
secrets_pattern='(sk_live_|sk_test_|SUPABASE_SERVICE_ROLE|ghp_|gho_)'
if grep -rEn "$secrets_pattern" src/ --include="*.js" --include="*.jsx" > /dev/null 2>&1; then
  error "Secrets/tokens détectés dans le code source!"
else
  ok "No secrets in code"
fi

# 5. Build check
echo ""
echo "  Building..."
if ! npm run build > /dev/null 2>&1; then
  error "Build failed!"
else
  ok "Build OK"
fi

echo ""
if [ "$ERRORS" -gt 0 ]; then
  echo -e "${RED}✗ Push bloqué: ${ERRORS} erreur(s) détectée(s)${NC}"
  echo -e "${RED}  Corrigez les erreurs puis réessayez.${NC}"
  echo ""
  exit 1
else
  echo -e "${GREEN}✓ Tous les checks passent — push autorisé${NC}"
  echo ""
  exit 0
fi
