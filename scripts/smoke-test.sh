#!/bin/bash
# ============================================================
# BatiGesti Smoke Test — catches regressions before they ship
# ============================================================
# Run: npm run smoke  (or bash scripts/smoke-test.sh)
# Exit code 0 = all good, non-zero = problems found
#
# Checks:
# 1. Critical imports point to correct files
# 2. Supabase table names are correct (no plural typos)
# 3. No orphaned components (created but never imported)
# 4. Required patterns present (dark mode, demo mode, etc.)
# 5. No secrets/tokens in source code

set -euo pipefail

RED='\033[0;31m'
YELLOW='\033[0;33m'
GREEN='\033[0;32m'
NC='\033[0m' # No Color

ERRORS=0
WARNINGS=0

error() {
  echo -e "${RED}  ✗ ERREUR: $1${NC}"
  ERRORS=$((ERRORS + 1))
}

warn() {
  echo -e "${YELLOW}  ⚠ WARNING: $1${NC}"
  WARNINGS=$((WARNINGS + 1))
}

ok() {
  echo -e "${GREEN}  ✓ $1${NC}"
}

echo ""
echo "═══════════════════════════════════════════════"
echo "  🔍 BatiGesti Smoke Test"
echo "═══════════════════════════════════════════════"
echo ""

# ─── 1. Critical imports ─────────────────────────
echo "📦 1. Vérification des imports critiques..."

# Landing page must come from landing/ directory
if grep -rn "from.*['\"]\.\/components\/LandingPage['\"]" src/App.jsx > /dev/null 2>&1; then
  error "App.jsx importe l'ancien LandingPage.jsx au lieu de ./components/landing/LandingPage"
else
  ok "LandingPage importé depuis landing/"
fi

# subscriptionStore must exist and export PLANS
if ! grep -q "export const PLANS" src/stores/subscriptionStore.js 2>/dev/null; then
  error "subscriptionStore.js ne contient pas 'export const PLANS'"
else
  ok "PLANS exporté depuis subscriptionStore"
fi

# CGU_VERSION must be exported from CGUAcceptanceModal
if ! grep -q "export.*CGU_VERSION\|export { CGU_VERSION" src/components/CGUAcceptanceModal.jsx 2>/dev/null; then
  error "CGU_VERSION non exporté depuis CGUAcceptanceModal"
else
  ok "CGU_VERSION exporté"
fi

# ─── 2. Supabase table names ─────────────────────
echo ""
echo "🗄️  2. Vérification des noms de tables Supabase..."

# Known correct table names (singular in this project)
TABLES_SHOULD_BE_SINGULAR=(
  "entreprise"
)

for table in "${TABLES_SHOULD_BE_SINGULAR[@]}"; do
  plural="${table}s"
  matches=$(grep -rn "from('${plural}')\|from(\"${plural}\")" src/ --include="*.js" --include="*.jsx" 2>/dev/null || true)
  if [ -n "$matches" ]; then
    error "Table '${plural}' (pluriel) trouvée — devrait être '${table}':"
    echo "$matches" | head -5 | sed 's/^/         /'
  else
    ok "Pas de référence à '${plural}' (correct: '${table}')"
  fi
done

# Check for any .from('xxx') calls with common typos
if grep -rn "from('entreprises')" src/ --include="*.js" --include="*.jsx" > /dev/null 2>&1; then
  error "Trouvé 'entreprises' (pluriel) dans les appels Supabase"
fi

# ─── 3. Orphaned components ──────────────────────
echo ""
echo "👻 3. Détection des composants orphelins..."

# Build import index once (much faster than grep per file)
# Includes static imports, dynamic imports, and lazyWithRetry references
IMPORT_INDEX=$(grep -roh "import.*from\|import(.*)\|lazyWithRetry.*import.*" src/ --include="*.jsx" --include="*.js" 2>/dev/null || true)

ORPHAN_COUNT=0
for file in src/components/*.jsx; do
  [ -f "$file" ] || continue
  basename=$(basename "$file" .jsx)

  # Skip index files and non-component files
  [[ "$basename" == "index" ]] && continue
  [[ "$basename" == "App" ]] && continue

  # Check if this component name appears in the import index
  if ! echo "$IMPORT_INDEX" | grep -q "$basename"; then
    warn "Composant orphelin: ${file} (jamais importé)"
    ORPHAN_COUNT=$((ORPHAN_COUNT + 1))
  fi
done

if [ "$ORPHAN_COUNT" -eq 0 ]; then
  ok "Aucun composant orphelin détecté"
fi

# ─── 4. Required patterns ────────────────────────
echo ""
echo "🎨 4. Vérification des patterns obligatoires..."

# No dark: Tailwind classes (should use isDark prop)
dark_classes=$(grep -rn "className=.*dark:" src/components/ --include="*.jsx" 2>/dev/null | grep -v "node_modules" | grep -v ".test." || true)
if [ -n "$dark_classes" ]; then
  count=$(echo "$dark_classes" | wc -l)
  warn "Trouvé ${count} utilisation(s) de classes 'dark:' Tailwind (utiliser isDark prop à la place)"
fi

# No console.log in production code (except commented out)
console_logs=$(grep -rn "console\.log(" src/ --include="*.js" --include="*.jsx" | grep -v "node_modules" | grep -v "\/\/" | grep -v ".test." | grep -v "console.log(\[" || true)
if [ -n "$console_logs" ]; then
  count=$(echo "$console_logs" | wc -l)
  warn "Trouvé ${count} console.log() dans le code (utiliser captureException en prod)"
fi

# Edge functions must have corsHeaders
for fn_dir in supabase/functions/*/; do
  [ -d "$fn_dir" ] || continue
  fn_name=$(basename "$fn_dir")
  [[ "$fn_name" == "_shared" ]] && continue

  index_file="${fn_dir}index.ts"
  [ -f "$index_file" ] || continue

  if ! grep -q "corsHeaders" "$index_file" 2>/dev/null; then
    error "Edge Function '${fn_name}' manque corsHeaders"
  fi
done
ok "Edge Functions vérifiées"

# ─── 5. Security checks ──────────────────────────
echo ""
echo "🔒 5. Vérification de sécurité..."

# No hardcoded secrets/tokens
secrets_pattern='(sk_live|sk_test|SUPABASE_SERVICE_ROLE|eyJhbGciOiJ|ghp_|gho_|Bearer [a-zA-Z0-9]{20,})'
secret_matches=$(grep -rEn "$secrets_pattern" src/ --include="*.js" --include="*.jsx" 2>/dev/null || true)
if [ -n "$secret_matches" ]; then
  error "Secrets/tokens potentiels trouvés dans le code source:"
  echo "$secret_matches" | head -3 | sed 's/^/         /'
else
  ok "Aucun secret détecté dans le code source"
fi

# No dangerouslySetInnerHTML without sanitization
dangerous_html=$(grep -rn "dangerouslySetInnerHTML" src/ --include="*.jsx" 2>/dev/null || true)
if [ -n "$dangerous_html" ]; then
  count=$(echo "$dangerous_html" | wc -l)
  warn "Trouvé ${count} usage(s) de dangerouslySetInnerHTML — vérifier la sanitization"
fi

# ─── 6. Dead imports check ────────────────────────
echo ""
echo "📎 6. Vérification des imports morts (build)..."

build_output=$(npm run build 2>&1)
if echo "$build_output" | grep -q "error"; then
  error "Le build a échoué"
  echo "$build_output" | grep "error" | head -5 | sed 's/^/         /'
else
  ok "Build réussi sans erreur"
fi

# ─── Summary ──────────────────────────────────────
echo ""
echo "═══════════════════════════════════════════════"
if [ "$ERRORS" -gt 0 ]; then
  echo -e "  ${RED}✗ ${ERRORS} erreur(s), ${WARNINGS} warning(s)${NC}"
  echo -e "  ${RED}Corrigez les erreurs avant de commit.${NC}"
  echo "═══════════════════════════════════════════════"
  exit 1
elif [ "$WARNINGS" -gt 0 ]; then
  echo -e "  ${YELLOW}⚠ 0 erreur(s), ${WARNINGS} warning(s)${NC}"
  echo -e "  ${YELLOW}Considérez corriger les warnings.${NC}"
  echo "═══════════════════════════════════════════════"
  exit 0
else
  echo -e "  ${GREEN}✓ Tout est bon ! 0 erreur, 0 warning${NC}"
  echo "═══════════════════════════════════════════════"
  exit 0
fi
