#!/bin/sh
# Ligne d'état Claude Code : branche, retard/avance sur main, fichiers modifiés, dernière vérification.
# Purement local (aucun accès réseau) : elle est recalculée souvent.
cat > /dev/null
cd "${CLAUDE_PROJECT_DIR:-.}" 2>/dev/null || exit 0
BRANCHE=$(git branch --show-current 2>/dev/null)
COMPTES=$(git rev-list --left-right --count origin/main...HEAD 2>/dev/null)
RETARD=$(echo "$COMPTES" | awk '{print $1}')
AVANCE=$(echo "$COMPTES" | awk '{print $2}')
MODIFS=$(git status --porcelain 2>/dev/null | wc -l | tr -d ' ')
HEAD=$(git rev-parse HEAD 2>/dev/null)
VERIF="vérif –"
if [ -f audit-ui/derniere-verification.json ]; then
  V_HEAD=$(sed -n 's/.*"head": "\([0-9a-f]*\)".*/\1/p' audit-ui/derniere-verification.json)
  V_OK=$(sed -nE 's/.*"reussi": (true|false).*/\1/p' audit-ui/derniere-verification.json)
  V_NIV=$(sed -n 's/.*"niveau": "\([a-z]*\)".*/\1/p' audit-ui/derniere-verification.json)
  if [ "$V_HEAD" = "$HEAD" ]; then
    [ "$V_OK" = "true" ] && VERIF="vérif ✓ $V_NIV" || VERIF="vérif ✗ $V_NIV"
  else
    VERIF="vérif ancienne"
  fi
fi
printf "Mallettico · ⎇ %s · ↓%s ↑%s main · ✎%s · %s" "$BRANCHE" "${RETARD:-?}" "${AVANCE:-?}" "$MODIFS" "$VERIF"
