# Prompt Claude Code — Corriger les violations du Design System

Copie ce prompt dans Claude Code pour lancer la correction.

---

## Le prompt

```
Tu vas corriger les violations du design system identifiées dans l'audit `design-system-audit.md`. Lis ce fichier d'abord, puis exécute les tâches ci-dessous dans l'ordre. Après chaque tâche, lance `npm run build` pour vérifier qu'il n'y a pas de régression.

## Tâche 1 — Supprimer toutes les classes Tailwind `dark:`

**Règle** : le dark mode passe par la prop `isDark` + ternaire, jamais `dark:`.

Fichiers concernés (12 fichiers, 42+ instances) :
- src/components/Chantiers.jsx (8)
- src/components/Settings.jsx (6)
- src/components/bank/BankConnectionModal.jsx
- src/components/bank/BankTransactionsModal.jsx
- src/components/bibliotheque/OuvrageCard.jsx
- src/components/bibliotheque/OuvrageDetail.jsx
- src/components/tresorerie/TresorerieModule.jsx
- src/components/legal/MaPrimeRenovAssistant.jsx
- src/components/MemosPage.jsx (2)
- src/components/Planning.jsx (1)
- src/components/ui/ToastContainer.jsx

Pour chaque occurrence :
1. Trouve la classe `dark:xxx`
2. Regarde si le composant reçoit `isDark` en prop (il devrait — 79% des composants l'ont)
3. Remplace par un ternaire : `className={isDark ? 'classe-dark' : 'classe-light'}`
4. Si le composant n'a pas `isDark`, ajoute-le aux props et vérifie que le parent le passe

Supprime aussi `src/components/Dashboard.jsx.backup` — c'est un fichier legacy inutile avec 49 violations `dark:`.

Vérifie avec : `grep -r "dark:" src/components/ --include="*.jsx" | grep -v node_modules | grep -v ".backup"`

## Tâche 2 — Unifier le système de z-index

Il y a actuellement 3 systèmes concurrents. On garde uniquement les tokens Tailwind dans `tailwind.config.js`.

**Étape 1** : Supprime `src/constants/zIndex.js` (jamais importé nulle part, vérifie avec grep avant).

**Étape 2** : Remplace les z-index arbitraires par les tokens Tailwind :

| Valeur actuelle | Fichier | Remplacer par |
|---|---|---|
| `z-[9999]` | CGUAcceptanceModal.jsx | `z-modal` |
| `z-[9999]` | Tooltip.jsx | `z-tooltip` |
| `z-[999]` | Chantiers.jsx | `z-modal` |
| `z-[200]` | ToastContainer.jsx | `z-toast` |
| `z-[100]` | App.jsx, CommandPalette.jsx | `z-fixed` |
| `z-[60]` | App.jsx, modals divers | `z-modal` |
| `z-[1000]` | ChantierMap.jsx (×4) | `z-modal-backdrop` ou `z-fixed` selon contexte |

Tokens disponibles dans `tailwind.config.js` :
- `z-dropdown` (1000), `z-sticky` (1020), `z-fixed` (1030)
- `z-modal-backdrop` (1040), `z-modal` (1050)
- `z-popover` (1060), `z-tooltip` (1070), `z-toast` (1080)

Vérifie avec : `grep -rn "z-\[" src/ --include="*.jsx"`

## Tâche 3 — Ajouter les tokens de couleur manquants (blue / purple)

Blue et purple sont utilisés dans 30+ fichiers mais n'ont pas de token.

**Étape 1** : Ajoute dans `src/styles/design-tokens.css` :

```css
/* Info - Bleu */
--color-info-50: #eff6ff;
--color-info-100: #dbeafe;
--color-info-500: #3b82f6;
--color-info-600: #2563eb;
--color-info-700: #1d4ed8;

/* Accent - Violet */
--color-accent-50: #f5f3ff;
--color-accent-100: #ede9fe;
--color-accent-500: #8b5cf6;
--color-accent-600: #7c3aed;
--color-accent-700: #6d28d9;
```

**Étape 2** : Ajoute les palettes correspondantes dans `tailwind.config.js` sous `theme.extend.colors` :

```js
info: {
  50: '#eff6ff',
  100: '#dbeafe',
  200: '#bfdbfe',
  300: '#93c5fd',
  400: '#60a5fa',
  500: '#3b82f6',
  600: '#2563eb',
  700: '#1d4ed8',
  800: '#1e40af',
  900: '#1e3a8a',
},
accent: {
  50: '#f5f3ff',
  100: '#ede9fe',
  200: '#ddd6fe',
  300: '#c4b5fd',
  400: '#a78bfa',
  500: '#8b5cf6',
  600: '#7c3aed',
  700: '#6d28d9',
  800: '#5b21b6',
  900: '#4c1d95',
},
```

## Tâche 4 — Créer les color maps partagées

Crée `src/constants/colors.js` avec les maps de couleurs sémantiques partagées, en centralisant les couleurs de statut/priorité/catégorie actuellement dupliquées dans 10+ fichiers.

Étapes :
1. Cherche tous les objets de mapping couleur dans : ContractsPage.jsx, PipelineKanban.jsx, Planning.jsx, DevisPage.jsx (STATUS_BAR_COLORS), SousTraitantsModule.jsx, CarnetEntretien.jsx
2. Crée un fichier centralisé qui exporte : STATUS_COLORS, PRIORITY_COLORS, DEVIS_STATUS_COLORS, CATEGORY_COLORS
3. Les valeurs doivent utiliser les classes Tailwind (ex: `bg-success-500`, `text-danger-600`) ou les nouvelles classes `info-*` / `accent-*` — PAS des hex hardcodés
4. Refactore les fichiers source pour importer depuis `src/constants/colors.js`

## Tâche 5 — Convertir DevisForm.jsx en Tailwind

Le fichier `src/components/DevisForm.jsx` contient un objet `styles` complet (lignes 3-127) avec 20+ valeurs hardcodées en inline. Convertis tout en classes Tailwind :

| Inline style | Classe Tailwind |
|---|---|
| `padding: '30px'` | `p-8` (32px, le plus proche) |
| `padding: '12px'` | `p-3` |
| `padding: '20px'` | `p-5` |
| `gap: '20px'` | `gap-5` |
| `gap: '12px'` | `gap-3` |
| `marginBottom: '30px'` | `mb-8` |
| `marginBottom: '16px'` | `mb-4` |
| `marginBottom: '8px'` | `mb-2` |
| `borderRadius: '12px'` | `rounded-xl` |
| `borderRadius: '8px'` | `rounded-lg` |
| `borderRadius: '6px'` | `rounded-md` |
| `fontSize: '14px'` | `text-sm` |
| `fontSize: '16px'` | `text-base` |
| `fontSize: '18px'` | `text-lg` |
| `fontSize: '12px'` | `text-xs` |

Supprime l'objet `styles` et applique les classes directement sur les éléments JSX. Assure-toi que le composant supporte `isDark` et `couleur` correctement.

## Validation finale

Après toutes les tâches :
1. `npm run build` — doit passer sans erreurs
2. `npm run lint` — pas de nouvelles erreurs
3. `grep -r "dark:" src/components/ --include="*.jsx" | grep -v node_modules | grep -v ".backup"` — doit retourner 0 résultats
4. `grep -rn "z-\[" src/ --include="*.jsx"` — doit retourner 0 résultats (ou uniquement des valeurs justifiées comme les dimensions CSS print)
5. Crée un commit avec le message : "refactor: design system cleanup — fix dark mode, z-index, color tokens"
```
