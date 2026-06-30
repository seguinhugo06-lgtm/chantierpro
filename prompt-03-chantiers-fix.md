# Prompt Claude Code — Chantiers UX & Accessibility Fix

Copie ce prompt dans Claude Code pour lancer les corrections.

---

## Le prompt

```
Tu vas corriger les problèmes UX et accessibilité de `src/components/Chantiers.jsx` identifiés dans l'audit `critique-02-chantiers.md`. Lis ce fichier d'abord. Le fichier fait 3 676 lignes — travaille avec précaution.

IMPORTANT : Respecte les conventions du projet (voir CLAUDE.md) :
- Dark mode via prop `isDark` + ternaire, JAMAIS `dark:` Tailwind
- Couleur accent via prop `couleur` + `style={{ }}` inline
- Icônes : `lucide-react` uniquement
- Navigation : `setPage('nom')`

Après chaque tâche, lance `npm run build` pour vérifier.

## Tâche 1 — Remplacer les divs cliquables par des boutons (Accessibilité critique)

Cherche tous les `<div` avec un `onClick` dans Chantiers.jsx, en particulier dans la zone de liste des chantiers (autour de la ligne 3218+).

Pour chaque div cliquable trouvée :
1. Remplace `<div` par `<button`
2. Ajoute `type="button"`
3. Ajoute `className` avec `focus-visible:ring-2 focus-visible:ring-offset-2 outline-none`
4. Ajoute `style={{ '--tw-ring-color': couleur }}` pour le focus ring
5. Si le div avait un `cursor-pointer`, retire-le (les boutons l'ont par défaut)
6. Assure-toi que le `<button>` a `text-left w-full` pour conserver le layout

Vérifie aussi les éléments interactifs similaires dans :
- Les cards de la vue liste
- Les items dans les tabs du detail view
- Les éléments de la grille photo

Commande de vérification : `grep -n "div.*onClick\|div.*cursor-pointer" src/components/Chantiers.jsx | head -30`

## Tâche 2 — Corriger les touch targets (WCAG 2.5.5)

### 2a. Nav arrows (prev/next chantier)
Les flèches de navigation entre chantiers font 32px. Cherche les boutons avec des icônes `ChevronLeft`/`ChevronRight` pour la navigation entre chantiers.

**Remplace** le sizing par `min-h-[44px] min-w-[44px]` et assure-toi que le padding est suffisant (`p-2` minimum).

### 2b. Status dropdown
Le dropdown de statut fait 36px. Cherche le sélecteur de statut du chantier.

**Ajoute** `min-h-[44px]` sur le bouton trigger du dropdown.

### 2c. Autres boutons compacts
Cherche les boutons avec `p-1` seul ou des tailles inférieures à 44px :
```bash
grep -n "p-1\b" src/components/Chantiers.jsx | head -20
```

Pour chaque bouton interactif trouvé, assure un minimum de `min-h-[44px] min-w-[44px]`.

## Tâche 3 — Ajouter des labels texte pour la marge (WCAG 1.4.1)

La couleur de la marge (rouge/amber/vert) est le seul indicateur de santé financière. Ça échoue WCAG 1.4.1 (Use of Color).

Cherche la logique de couleur de marge (probablement un pattern comme `getMargeColor` ou des conditions sur le pourcentage de marge).

**Ajoute un label texte** à côté du pourcentage :
```jsx
// Exemple de logique à ajouter
const getMargeLabel = (marge) => {
  if (marge < 0) return 'Négatif';
  if (marge < 15) return 'Faible';
  if (marge < 30) return 'Bon';
  return 'Excellent';
};
```

Affiche ce label en `text-xs` à côté ou en dessous du pourcentage de marge, avec la même couleur que l'indicateur.

## Tâche 4 — Corriger la typographie minimum

Cherche les tailles `text-[9px]`, `text-[10px]` et `text-[11px]` dans Chantiers.jsx.

**Remplace :**
- `text-[9px]` → `text-[11px]`
- `text-[10px]` → `text-xs` (12px)

Les headers de section en `text-[10px] uppercase` devraient passer à `text-xs uppercase` minimum pour servir de repères visuels.

Commande : `grep -n 'text-\[9px\]\|text-\[10px\]' src/components/Chantiers.jsx`

## Tâche 5 — Remplacer les couleurs hex hardcodées

Le fichier contient 27 couleurs hex hardcodées. Remplace-les par des classes Tailwind sémantiques.

**Étape 1** : Vérifie si `src/constants/colors.js` existe déjà. Si oui, ajoute les constantes dedans. Si non, crée-le.

**Étape 2** : Mapping des remplacements :

| Hex hardcodé | Occurrences | Remplacement Tailwind |
|---|---|---|
| `#10b981` | 6x | `bg-emerald-500` / `text-emerald-500` |
| `#ef4444` | 4x | `bg-red-500` / `text-red-500` |
| `#3b82f6` | 2x | `bg-blue-500` / `text-blue-500` |
| `#22c55e` | 2x | `bg-green-500` / `text-green-500` |
| `#f59e0b` | 2x | `bg-amber-500` / `text-amber-500` |
| `#f97316` | 2x | `bg-orange-500` / `text-orange-500` |
| Autres hex isolés | ~9x | Trouver l'équivalent Tailwind le plus proche |

**Important** : Les couleurs utilisées dans des `style={{ }}` inline pour des éléments dynamiques (ex: `couleur` prop, progress bars avec valeur variable) peuvent rester en inline. Ne remplace que les couleurs statiques/constantes.

**Étape 3** : Pour les status de chantier, crée un objet centralisé :
```js
export const CHANTIER_STATUS_COLORS = {
  planifie: { bg: 'bg-blue-100', text: 'text-blue-700', darkBg: 'bg-blue-500/15', darkText: 'text-blue-400' },
  en_cours: { bg: 'bg-emerald-100', text: 'text-emerald-700', darkBg: 'bg-emerald-500/15', darkText: 'text-emerald-400' },
  en_pause: { bg: 'bg-amber-100', text: 'text-amber-700', darkBg: 'bg-amber-500/15', darkText: 'text-amber-400' },
  termine: { bg: 'bg-slate-100', text: 'text-slate-700', darkBg: 'bg-slate-500/15', darkText: 'text-slate-400' },
  annule: { bg: 'bg-red-100', text: 'text-red-700', darkBg: 'bg-red-500/15', darkText: 'text-red-400' },
};
```

Importe et utilise cet objet dans Chantiers.jsx à la place des hex inline.

Commande : `grep -n "#[0-9a-fA-F]\{6\}" src/components/Chantiers.jsx | head -30`

## Tâche 6 — Standardiser les tailles d'icônes

Actuellement 8 tailles différentes (9px, 12px, 15px, 16px, 18px, 20px, 28px, 32px).

**Définis 3 paliers :**
- **Compact** : `w-3.5 h-3.5` (14px) — badges, indicateurs inline
- **Standard** : `w-4.5 h-4.5` (18px) ou `w-4 h-4` (16px) — icônes dans les tabs, boutons
- **Hero** : `w-6 h-6` (24px) — FAB, empty states, headers

Cherche et normalise :
- `w-[9px]` ou `size={9}` → `w-3.5 h-3.5`
- `size={12}` → `w-3.5 h-3.5`
- `size={15}` → `w-4 h-4`
- `size={28}` → `w-6 h-6`
- `size={32}` → `w-6 h-6` (sauf empty states → `w-8 h-8`)

## Tâche 7 — Corriger le z-index du merge dialog

Ligne ~3630 : le merge dialog utilise `z-[1050]`, un z-index arbitraire.

**Remplace** `z-[1050]` par `z-50` pour s'aligner avec les autres modals du fichier. Si un z-index plus élevé est nécessaire (modal au-dessus d'un autre modal), utilise `z-[60]` ou le token `z-modal` si défini dans le Tailwind config.

Commande : `grep -n "z-\[" src/components/Chantiers.jsx`

## Tâche 8 — Ajouter les ARIA manquants

### 8a. Boutons de suppression dans les listes d'ajustement
Cherche les boutons de suppression (icône `Trash2` ou `X`) dans les listes d'ajustements financiers. Ajoute :
```jsx
aria-label="Supprimer l'ajustement"
```

### 8b. Labels de capture photo
Cherche les boutons de capture/upload de photo. Ajoute :
```jsx
aria-label="Prendre une photo" // ou "Ajouter une photo"
```

### 8c. Boutons cancel/add dans les modals
Cherche les modals avec des boutons "Annuler" et "Ajouter". Si ces boutons n'ont pas de texte visible clair, ajoute des `aria-label` appropriés.

### 8d. Contraste dark mode
Cherche les patterns :
```
isDark ? 'text-slate-400'
```
utilisés pour du texte secondaire lisible (labels, descriptions, dates).

**Remplace par :** `isDark ? 'text-slate-300'`

Ne change PAS les couleurs des icônes décoratives ou des séparateurs.

Commande : `grep -n "text-slate-400" src/components/Chantiers.jsx | head -20`

## Validation finale

1. `npm run build` — doit passer sans erreurs
2. `npm run lint` — pas de nouvelles erreurs
3. Vérifications :
   - `grep -n "div.*onClick" src/components/Chantiers.jsx | grep -v "button\|role"` → devrait être minimal
   - `grep -n "min-w-\[40px\]\|min-h-\[40px\]" src/components/Chantiers.jsx` → 0 résultats
   - `grep -n "text-\[9px\]\|text-\[10px\]" src/components/Chantiers.jsx` → 0 résultats
   - `grep -c "#[0-9a-fA-F]\{6\}" src/components/Chantiers.jsx` → réduit significativement
   - `grep -n "z-\[1050\]" src/components/Chantiers.jsx` → 0 résultats
4. Crée un commit : "fix(chantiers): accessibility — replace clickable divs, fix touch targets, add ARIA, replace hardcoded colors, standardize icons"
```
