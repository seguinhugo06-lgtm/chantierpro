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
3. **Pilote** : `/pilote lire` (procédure dans `.claude/skills/pilote/SKILL.md`). Cela couvre les demandes d'Hugo, ses réponses aux questions, les actions qu'il a cochées (à constater) et le journal de terrain. Répondre dans le Pilote à chaque demande nouvelle. Les irritants vécus sur chantier et les demandes passent avant les idées.
4. **Feuille de route** : `docs/feuille-de-route.md` (phase en cours, prochaines tâches) et `docs/decisions.md` (décisions attendues d'Hugo ; si l'une bloque, la poser avec `/pilote question`).
5. **Proposer** à Hugo, en quelques lignes :
   - ce qui est bloqué chez lui, avec l'action exacte ;
   - ce que tu as répondu à ses demandes ;
   - les 3 prochaines tâches recommandées (pourquoi celles-là, critère d'acceptation, taille).

   Attendre son feu vert, puis enchaîner sur la première avec `/tache`.
