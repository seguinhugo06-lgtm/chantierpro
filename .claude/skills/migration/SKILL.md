---
name: migration
description: Écrit une migration SQL Mallettico idempotente avec ses vérifications d'effet au banc PostgreSQL, prête à être appliquée à la main par Hugo (jamais appliquée par Claude).
argument-hint: "<ce que la migration doit faire>"
context: fork
agent: architecte-donnees
background: false
---

Migration à écrire : $ARGUMENTS

Suivre ta méthode (`.claude/rules/migrations.md`) :
1. `npm run migration:nouvelle -- "<description courte>"`.
2. SQL idempotent et défensif, en-tête avec la requête de vérification après application.
3. Vérifications d'EFFET dans `scripts/banc/NNN.mjs` (utilisateur, collaborateur, visiteur, cas limites).
4. `npm run banc:migrations` jusqu'au vert.
5. Ajouter la migration à « En attente côté Hugo » dans `docs/etat-production.md`.

Rendre : chemins des fichiers, sortie du banc, requête de contrôle, impacts côté app à traiter.
