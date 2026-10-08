---
name: sonde
description: Constate dans un vrai navigateur (build de démo, sans serveur) ce qu'un artisan voit et peut faire sur une page de Mallettico, à une largeur donnée — texte affiché, clic, modale, fichier remis, capture. À utiliser pour prouver un changement visible au lieu de le supposer.
argument-hint: "<page> <largeur> <ce qu'il faut constater>"
---

# Sonde : $ARGUMENTS

1. `npm run build` si le code a changé depuis le dernier build.
2. Résumé de la page : `node scripts/sonde.cjs <page> <largeur>` (titres, alertes, dialogues, boutons, débordement, erreurs JS).
3. Pour constater un comportement : écrire un scénario dans `audit-ui/sonde-<sujet>.js` — le CORPS d'une fonction async exécutée dans la page, qui `return` un objet de constats. Aides utiles :
   - cliquer : `[...document.querySelectorAll('button')].find(b => b.innerText.trim() === 'Texte').click()` puis `await new Promise(r => setTimeout(r, 500))` ;
   - saisir dans un champ React : `Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(el, 'valeur'); el.dispatchEvent(new Event('input', { bubbles: true }))` ;
   - limiter les sélecteurs d'une modale à `[role="dialog"]`.
   Puis : `node scripts/sonde.cjs <page> <largeur> --script=audit-ui/sonde-<sujet>.js --capture=audit-ui/<sujet>.png` (options : `--plan=gratuit|artisan|equipe`).
4. Regarder la capture (outil Read sur l'image). Conclure sur ce qui est OBSERVÉ.
5. Si le constat doit tenir dans le temps (parcours critique), le transformer en parcours dans `scripts/parcours/` (voir `lancer.cjs`).

Pages : `cp_current_page` de `src/App.jsx` (dashboard, devis, chantiers, clients, catalogue, finances, equipe, settings, plan, planning, memos…). Largeurs : 375, 768, 1024, 1440.
