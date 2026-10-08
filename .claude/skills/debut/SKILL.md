---
name: debut
description: Rituel de début de session Mallettico — se mettre à jour sur main, lire l'état de la production, les attentes d'Hugo, le journal de terrain et la feuille de route, puis proposer les prochaines tâches.
disable-model-invocation: true
---

# Début de session

## État mesuré

```!
node scripts/claude/debut-session.mjs
git log --oneline -5
```

## À faire, dans l'ordre

1. **Retard sur main** : s'il y en a, mettre la branche à jour avant tout (outil `sync_with_base_branch` si disponible, sinon `git merge --ff-only origin/main`). Ne jamais travailler sur du code périmé.
2. **Production** : lire `docs/etat-production.md`. Si Hugo a appliqué une migration ou déployé une fonction depuis la dernière fois (le demander seulement si un indice le suggère), mettre le fichier à jour.
3. **Pilote** : lire l'état et le journal de terrain avec l'outil ArtifactData (artefact `https://claude.ai/artifact/Esz8pN474Q1FDsbHDyaB1Q`, document `pilote` de la collection `data/users/me`, journal dans `data/users/me/pilote/frictions`). Les irritants vécus sur chantier passent avant les idées.
4. **Feuille de route** : `docs/feuille-de-route.md` (phase en cours, prochaines tâches) et `docs/decisions.md` (décisions attendues d'Hugo).
5. **Proposer** à Hugo, en quelques lignes : ce qui est bloqué chez lui (avec l'action exacte), puis les 3 prochaines tâches recommandées (pourquoi celles-là, critère d'acceptation, taille). Puis enchaîner sur la première avec `/tache` sauf s'il dit autre chose.
