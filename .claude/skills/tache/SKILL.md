---
name: tache
description: Mène une tâche Mallettico de bout en bout — cadrer avec un critère d'acceptation observable, implémenter, vérifier selon la matrice, faire relire par les agents du domaine, livrer, consigner. À utiliser pour toute demande de correction ou d'évolution du produit.
argument-hint: "<la tâche, en une phrase>"
---

# Tâche : $ARGUMENTS

Suivre `docs/organisation.md` §3. Ne sauter aucune étape ; chaque étape laisse une trace vérifiable.

## 1. Cadrer (avant d'écrire du code)
- Reformuler le problème avec sa **preuve** (retour, capture, requête, ligne de code). Sans preuve : la chercher (sonde, lecture du code) avant de corriger.
- Si c'est une **nouvelle fonctionnalité** ou un élargissement : demander l'avis de l'agent `critique-produit` d'abord, et s'en tenir à sa version minimale.
- Écrire le **critère d'acceptation observable** (« l'artisan voit… à 375 px », « un collaborateur ne peut plus… ») et la **vérification prévue** (test unitaire, parcours, banc, sonde).
- Vérifier que ce n'est pas déjà tranché (`docs/decisions.md`) ni déjà fait (chercher dans le code : beaucoup de choses existent, parfois fusionnées).

## 2. Implémenter
- Branche à jour avec `origin/main`. Petits commits en anglais (`fix:`, `feat:`, `refactor:`, `test:`, `docs:`), messages qui disent POURQUOI.
- Respecter les règles du domaine (`.claude/rules/` se chargent selon les fichiers touchés). Le hook de lint signale les erreurs à chaque écriture : les corriger tout de suite.
- Ajouter le test ou le parcours qui aurait attrapé le problème.

## 3. Vérifier (matrice de `docs/organisation.md`)
- `npm run verifier` ; `npm run verifier -- --complet` si l'affichage, une migration ou un parcours critique est touché.
- Constater le critère d'acceptation lui-même (sonde, capture, parcours) — un build vert ne prouve pas le comportement.

## 4. Faire relire (en parallèle, selon les fichiers touchés)
- Migrations, policies, fonctions Edge, auth, paiements → `gardien-securite` (et `architecte-donnees` pour écrire le SQL).
- Devis, factures, TVA, mentions, textes commerciaux → `juriste-btp`.
- Affichage téléphone, natif → `ingenieur-mobile`.
- Toujours avant de livrer → `verificateur` sur le diff.
Corriger ce qui est remonté, revérifier.

## 5. Livrer
Utiliser `/livrer`.

## 6. Consigner
`docs/etat-production.md` (migrations ou fonctions en attente), `docs/feuille-de-route.md` (avancement), `docs/decisions.md` (si une décision a été prise), Pilote (étape concernée, via ArtifactData), mémoire si une leçon non évidente a été apprise. Dire à Hugo en clair : ce qui a changé pour l'artisan, comment c'est prouvé, ce qu'il lui reste à faire.
