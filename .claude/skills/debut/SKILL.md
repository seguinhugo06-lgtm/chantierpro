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
3. **Pilote** : `/pilote lire` (procédure dans `.claude/skills/pilote/SKILL.md`), **avant toute tâche**. Cela couvre :
   - les notes de la boîte d'Hugo (demandes, frictions, idées) ;
   - ses réponses aux questions, à consigner dans `docs/decisions.md` avant d'agir ;
   - les actions qu'il a cochées, à constater sur la preuve collée.

   Chaque note reçoit une réponse et un statut dans le Pilote ; aucune ne reste « nouvelle ». Les frictions vécues sur chantier et les notes acceptées passent avant la feuille de route.
4. **Feuille de route** : `docs/feuille-de-route.md` (phase en cours, prochaines tâches) et `docs/decisions.md` (décisions attendues d'Hugo ; une décision qui bloque et n'y figure pas s'y ajoute au format fixe : le prochain `sync` la pose dans le Pilote).
5. **Proposer** à Hugo, en quelques lignes :
   - ce qui est bloqué chez lui, avec l'action exacte ;
   - ce que tu as répondu à ses notes, et ce que tu as consigné ;
   - les 3 prochaines tâches recommandées (pourquoi celles-là, critère d'acceptation, taille).

   Attendre son feu vert, puis enchaîner sur la première avec `/tache`.
