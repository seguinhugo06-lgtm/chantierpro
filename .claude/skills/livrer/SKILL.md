---
name: livrer
description: Livre le travail commité de la session sur main (production Mallettico) avec tous les garde-fous — branche à jour, vérification verte sur le commit exact, push, verdict Vercel et CI, mise à jour de l'état de la production.
disable-model-invocation: false
---

# Livraison en production

`main` se déploie automatiquement sur mallettico.fr (Vercel, deux projets). Livrer est autorisé sans redemander (décision D-10) **uniquement** si toutes les étapes ci-dessous sont vertes.

## État

```!
git status --short
git fetch -q origin main && git log --oneline origin/main..HEAD
git rev-list --count HEAD..origin/main
```

## Étapes
1. **Arbre propre** : tout est commité (sinon commiter ce qui doit l'être, ou demander).
2. **À jour** : 0 commit de retard sur `origin/main` (sinon mettre à jour puis revérifier).
3. **Niveau de vérification** : `--complet` si le diff touche `src/components/`, `src/index.css`, `src/App.jsx`, `supabase/migrations/`, un parcours critique (devis, facture, paiement, compte) ; sinon standard. Voir `git diff --stat origin/main...HEAD`.
4. `npm run verifier [-- --complet]` → doit être vert. Le garde-fou (`scripts/claude/garde.mjs`) refuse le push sinon.
5. `git push origin HEAD:main` (jamais de push forcé).
6. `npm run statut` → attendre le verdict Vercel ×2 + CI « Vérifications ». Rouge → diagnostiquer (`gh run view --log-failed`) et corriger immédiatement.
7. **Consigner** : `docs/etat-production.md` (commit en production, migrations / fonctions à appliquer par Hugo), Pilote (étapes concernées).
8. Rappeler à Hugo s'il doit mettre à jour sa copie locale : `git -C /Users/hugoseguin/Documents/chantierpro-app pull --ff-only` (le garde-fou du worktree empêche Claude de le faire).

Rendre : commits livrés, verdict de `npm run statut`, ce qui reste à faire par Hugo.
