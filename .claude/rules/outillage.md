---
paths:
  - "scripts/**"
  - ".github/**"
  - ".claude/**"
  - "package.json"
---

# Outillage (scripts, CI, configuration Claude)

- Les outils sont la garantie de qualité du projet : ne pas les affaiblir pour faire passer un changement. Un contrôle rouge se corrige à la cause.
- `scripts/verifier.mjs` : chaîne unique (rapide / standard / complet), écrit `audit-ui/derniere-verification.json` lu par le garde-fou de livraison (`scripts/claude/garde.mjs`) et la ligne d'état.
- `scripts/lib/navigateur.cjs` : base commune de la sonde et des parcours (build `dist/` servi sans serveur ; mode « réel simulé » avec faux Supabase).
- Après toute modification de `scripts/claude/` ou des hooks de `.claude/settings.json` : `npm run hooks:tester`.
- Le hook git de pre-push est une copie figée de `scripts/pre-push.sh` : après modification, `npm run setup-hooks`.
- CI : `.github/workflows/verifications.yml` (chaque push et PR) et `sante-hebdomadaire.yml` (lundi, ouvre une issue si échec). Garder les deux alignés sur `npm run verifier -- --complet`.
- Agents (`.claude/agents/`) et skills (`.claude/skills/`) : en français, une mission claire, les fichiers de référence à lire, le format de rendu attendu. Un agent qui relit ne modifie pas le code.
- Ce dossier est ignoré par git : `audit-ui/` (rapports, captures, sondes jetables, build réel simulé).
- `scripts/pilote/preparer.mjs` (`npm run pilote -- …`) : tout ce que Claude écrit dans le Pilote en dérive (attentes ← `docs/etat-production.md`, prochaines tâches ← `docs/feuille-de-route.md` au format « **titre** — contexte. Critère : … Vérification : … Taille … », livraisons ← git). Garder ces formats ; procédure dans `docs/pilote.md`.
