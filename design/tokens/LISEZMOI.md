# Jetons d'interface Mallettico

Format standard **W3C Design Tokens (DTCG)**, la norme que lisent les outils de design.

| Fichier | Contenu |
|---|---|
| `mallettico.base.tokens.json` | Police, tailles de texte, graisses, arrondis, espacements, tailles de cible tactile |
| `mallettico.clair.tokens.json` | Couleurs et élévations du mode clair |
| `mallettico.sombre.tokens.json` | Les mêmes noms en mode sombre |

Les deux fichiers de couleurs portent **exactement les mêmes noms** : dans Figma, ils deviennent deux modes (Clair, Sombre) d'une même collection de variables.

## Importer dans Figma (environ 5 minutes)

- **Avec le plugin Tokens Studio** (gratuit), qui lit le format DTCG :
  1. Ouvrir le plugin, puis Tools › Load from file, et choisir les trois fichiers.
  2. Créer deux thèmes, `Clair` (base + clair) et `Sombre` (base + sombre).
  3. Lancer « Export to Figma » › Variables : une collection avec deux modes est créée.
- **Par l'import de variables de Figma**, si le compte le propose : importer `clair` puis `sombre` comme deux modes de la même collection, et `base` à part.

Je n'ai pas pu tester l'import dans Figma lui-même. Le format a été vérifié par un test (couleurs hexadécimales valides, fichiers identiques au thème).

## Source et mise à jour

- Ne pas modifier ces fichiers à la main. Ils sont générés depuis le vrai thème de l'app, `src/styles/theme.css`, par :
  ```bash
  npm run jetons
  ```
- Un test (`src/lib/__tests__/jetons.test.js`) échoue dès qu'ils ne correspondent plus au CSS. Ils ne peuvent donc pas être en retard sur l'app.
- **L'accent** est la couleur choisie par chaque entreprise. Les fichiers donnent celui de l'orange par défaut. Dans l'app, `src/lib/theme.js` recalcule le texte posé sur l'accent et l'accent écrit en texte pour qu'ils restent lisibles (4,5:1 au moins).
- **La bibliothèque vivante** des composants, en clair et en sombre, est sur la page cachée `/styleguide` de l'app.
