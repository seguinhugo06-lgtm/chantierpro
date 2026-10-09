# Design de Mallettico

Le système d'interface vient de la refonte du 9 octobre 2026. Les trois éléments ci-dessous sont produits par le vrai code de l'app : ils ne peuvent pas être en retard sur elle.

| Quoi | Où | Comment le mettre à jour |
|---|---|---|
| **Bibliothèque vivante** : tokens et dix composants de base, en clair et en sombre, avec le choix de la couleur d'entreprise | page cachée `/styleguide` de l'app (par exemple `https://mallettico.fr/styleguide`) ; non indexée, sans compte | rien à faire : la page affiche les composants de `src/components/ui/` tels qu'ils sont |
| **Tokens au format W3C (DTCG)**, importables dans Figma | `design/tokens/` (mode d'emploi : `tokens/LISEZMOI.md`) | `npm run jetons` ; un test échoue s'ils ne correspondent plus à `src/styles/theme.css` |
| **Captures annotées** (entretiens) : composant et tokens, zone par zone | `design/captures/` | `npm run build` puis `npm run captures` |

## Les règles en bref

- **Une palette neutre**, nommée par rôle :
  - fonds `fond` et `surface` ;
  - traits `bord` ;
  - textes `encre`, `encre-2` et `encre-3`.
- **L'accent** est la couleur de l'entreprise. Il sert à l'action et à la sélection, jamais à un statut. Le texte posé dessus est calculé pour rester lisible.
- **Cinq tons de sens** pour les statuts :
  - neutre : brouillon ou clos ;
  - info : chez le client ;
  - succès : acquis ;
  - alerte : à surveiller ;
  - danger : problème.

  Un statut reçoit toujours le même mot et le même ton (`src/lib/statuts.js`).
- **Un seul bouton plein par écran.** Tout texte fait au moins 12 px, toute cible au moins 44 px, et les champs font 16 px.
- **Le détail technique** est dans `.claude/rules/interface.md`. Le cliquet `src/lib/__tests__/plafondsDesign.test.js` empêche de réintroduire du texte trop petit, des gris hors palette et des classes `dark:`.
