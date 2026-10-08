---
name: fin
description: Rituel de fin de session Mallettico — rien de non commité ni de non livré par oubli, documentation et Pilote à jour, mémoire enrichie des leçons, récapitulatif clair pour Hugo.
disable-model-invocation: true
---

# Fin de session

```!
git status --short
git log --oneline origin/main..HEAD
```

1. **Travail en cours** : commiter ce qui est fini ; ce qui ne l'est pas va dans un commit `wip:` sur la branche (jamais livré) et dans la feuille de route avec son état.
2. **Livraison** : ce qui est fini et vérifié est livré (`/livrer`) ; sinon dire pourquoi.
3. **Documentation** :
   - `docs/etat-production.md` : ce qui est en production, ce qu'Hugo doit appliquer ;
   - `docs/feuille-de-route.md` : avancement, prochaines tâches prêtes (critère d'acceptation, vérification prévue) ;
   - `docs/decisions.md` : décisions prises ou attendues ;
   - `CLAUDE.md` / `.claude/rules/` : un piège découvert qui reviendra → une ligne dans la règle du domaine.
4. **Pilote** (ArtifactData, `data/users/me` / `pilote`) : statut et note des étapes touchées, focus mis à jour.
5. **Mémoire** : les leçons non évidentes (pas ce que le dépôt contient déjà) dans la mémoire automatique.
6. **Récapitulatif pour Hugo** (court) : ce qui a changé pour l'artisan, ce qui est prouvé et comment, ce qu'il doit faire lui-même (actions exactes, dans l'ordre), ce qui est prévu ensuite.
