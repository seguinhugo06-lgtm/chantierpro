# Prompt Claude Code — DevisPage UX & Accessibility Fix

Copie ce prompt dans Claude Code pour lancer les corrections.

---

## Le prompt

```
Tu vas corriger les problèmes UX et accessibilité critiques de `src/components/DevisPage.jsx` identifiés dans l'audit `critique-01-devispage.md`. Lis ce fichier d'abord. Le fichier fait 5 691 lignes — travaille avec précaution.

IMPORTANT : Respecte les conventions du projet (voir CLAUDE.md) :
- Dark mode via prop `isDark` + ternaire, JAMAIS `dark:` Tailwind
- Couleur accent via prop `couleur` + `style={{ }}` inline
- Icônes : `lucide-react` uniquement
- Navigation : `setPage('nom')`

Après chaque tâche, lance `npm run build` pour vérifier.

## Tâche 1 — Remplacer les divs cliquables par des boutons (Accessibilité critique)

Cherche tous les `<div` avec un `onClick` dans DevisPage.jsx, en particulier dans la zone de liste des devis (autour de la ligne 5198+).

Pour chaque div cliquable trouvée :
1. Remplace `<div` par `<button`
2. Ajoute `type="button"` pour éviter les soumissions de formulaire
3. Assure-toi que le `className` inclut `focus-visible:ring-2 focus-visible:ring-offset-2 outline-none`
4. Ajoute `style={{ '--tw-ring-color': couleur }}` pour le focus ring
5. Si le div avait un `cursor-pointer`, retire-le (les boutons l'ont par défaut)

Vérifie aussi les éléments interactifs similaires dans :
- Les items de la liste de devis/factures
- Les cards de la vue grille
- Les status selectors dans le mode preview

Commande de vérification : `grep -n "div.*onClick\|div.*cursor-pointer" src/components/DevisPage.jsx | head -30`

## Tâche 2 — Corriger les touch targets (WCAG 2.5.5)

Cherche les boutons avec `min-w-[40px] min-h-[40px]` ou `p-1` seul dans DevisPage.jsx.

Remplace TOUS les `min-w-[40px] min-h-[40px]` par `min-w-[44px] min-h-[44px]`.

Boutons spécifiques à corriger :
- "Vue client" button (~ligne 2710) : `min-w-[40px]` → `min-w-[44px]`
- Chantier button (~ligne 2718) : `min-w-[40px]` → `min-w-[44px]`
- WhatsApp/Email icon buttons (~lignes 2732-2744) : `min-w-[40px]` → `min-w-[44px]`
- Line move buttons (monte/descend ~ligne 4252) : `p-1` → `p-2 min-h-[44px] min-w-[44px]`

Commande : `grep -n "min-w-\[40px\]\|min-h-\[40px\]" src/components/DevisPage.jsx`

## Tâche 3 — Corriger la taille minimum de la typographie

Cherche les tailles `text-[9px]` et `text-[10px]` dans DevisPage.jsx. Ce sont des tailles en dessous du minimum lisible.

**Remplace :**
- `text-[9px]` → `text-[11px]`
- `text-[10px]` → `text-xs` (12px)

Ne touche PAS aux tailles dans les blocs de génération PDF (lignes ~1300-1630) — le PDF a ses propres contraintes de mise en page.

Commande : `grep -n 'text-\[9px\]\|text-\[10px\]' src/components/DevisPage.jsx | grep -v "PDF\|pdf\|generatePdf"`

## Tâche 4 — Ajouter les ARIA manquants

### 4a. Status selector dans le mode preview
Cherche le dropdown/selector de statut (autour des lignes 2195-2210). Ajoute :
```jsx
aria-label="Changer le statut du devis"
aria-expanded={isStatusOpen}
```

### 4b. Actions menu (three-dot)
Cherche le bouton trois-points (autour de la ligne 2369). Ajoute :
```jsx
aria-label="Plus d'actions"
aria-expanded={showActionsMenu}
```

### 4c. Personnaliser toggle
Si le menu des actions est un dropdown/popover, ajoute `aria-haspopup="true"`.

## Tâche 5 — Améliorer la grille KPI responsive

Cherche la grille des KPIs (autour de la ligne 4688). Le pattern actuel est probablement :
```jsx
grid-cols-2 sm:grid-cols-5
```

**Remplace par :**
```jsx
grid-cols-2 md:grid-cols-3 lg:grid-cols-5
```

Ça ajoute un breakpoint intermédiaire pour les tablettes.

## Tâche 6 — Consolider les couleurs de statut

Le fichier contient un objet `STATUS_BAR_COLORS` (ligne ~227) avec des hex hardcodés.

**Étape 1** : Vérifie si `src/constants/colors.js` existe déjà (il a pu être créé par un prompt précédent). Si oui, ajoute les status colors dedans. Si non, crée-le.

**Étape 2** : Dans `src/constants/colors.js`, ajoute (ou merge) :

```js
export const DEVIS_STATUS_COLORS = {
  brouillon: { bar: 'bg-slate-400', bg: 'bg-slate-50', text: 'text-slate-700', darkBg: 'bg-slate-500/15', darkText: 'text-slate-400' },
  envoye: { bar: 'bg-blue-500', bg: 'bg-blue-50', text: 'text-blue-700', darkBg: 'bg-blue-500/15', darkText: 'text-blue-400' },
  vu: { bar: 'bg-sky-500', bg: 'bg-sky-50', text: 'text-sky-700', darkBg: 'bg-sky-500/15', darkText: 'text-sky-400' },
  accepte: { bar: 'bg-emerald-500', bg: 'bg-emerald-50', text: 'text-emerald-700', darkBg: 'bg-emerald-500/15', darkText: 'text-emerald-400' },
  refuse: { bar: 'bg-red-500', bg: 'bg-red-50', text: 'text-red-700', darkBg: 'bg-red-500/15', darkText: 'text-red-400' },
  expire: { bar: 'bg-amber-500', bg: 'bg-amber-50', text: 'text-amber-700', darkBg: 'bg-amber-500/15', darkText: 'text-amber-400' },
  signe: { bar: 'bg-emerald-600', bg: 'bg-emerald-50', text: 'text-emerald-700', darkBg: 'bg-emerald-500/15', darkText: 'text-emerald-400' },
  facture: { bar: 'bg-violet-500', bg: 'bg-violet-50', text: 'text-violet-700', darkBg: 'bg-violet-500/15', darkText: 'text-violet-400' },
  payee: { bar: 'bg-green-600', bg: 'bg-green-50', text: 'text-green-700', darkBg: 'bg-green-500/15', darkText: 'text-green-400' },
  acompte_facture: { bar: 'bg-teal-500', bg: 'bg-teal-50', text: 'text-teal-700', darkBg: 'bg-teal-500/15', darkText: 'text-teal-400' },
};
```

**Étape 3** : Dans DevisPage.jsx, remplace `STATUS_BAR_COLORS` par un import et adapte les endroits qui l'utilisent. Par exemple, si actuellement on a :
```jsx
style={{ backgroundColor: STATUS_BAR_COLORS[statut] || '#94a3b8' }}
```
Remplace par :
```jsx
className={DEVIS_STATUS_COLORS[statut]?.bar || 'bg-slate-400'}
```

Note : adapte au contexte exact — le `bar` est pour les barres de statut (petite barre colorée à gauche des cards). Les `bg`/`text` sont pour les badges et backgrounds.

## Tâche 7 — Contraste dark mode

Cherche dans DevisPage.jsx les patterns :
```
isDark ? 'text-slate-400'
isDark ? 'text-slate-500'
```
utilisés pour du texte secondaire lisible (PAS des icônes décoratives ou des dividers).

**Remplace par :**
- `isDark ? 'text-slate-400'` → `isDark ? 'text-slate-300'` (pour le texte secondaire important)
- `isDark ? 'text-slate-500'` → `isDark ? 'text-slate-400'` (pour le texte tertiaire/muted)

Cible spécifiquement les labels, descriptions, dates, et montants secondaires. Ne change PAS les couleurs des icônes ou des séparateurs visuels.

Commande de vérification : `grep -c "text-slate-400\|text-slate-500" src/components/DevisPage.jsx` (compare avant/après)

## Validation finale

1. `npm run build` — doit passer sans erreurs
2. `npm run lint` — pas de nouvelles erreurs
3. Vérifie l'accessibilité :
   - `grep -n "div.*onClick" src/components/DevisPage.jsx | grep -v "button\|role"` → devrait être minimal
   - `grep -n "min-w-\[40px\]" src/components/DevisPage.jsx` → 0 résultats
   - `grep -n "text-\[9px\]" src/components/DevisPage.jsx` → 0 résultats (hors PDF)
4. Crée un commit : "fix(devis): accessibility — replace clickable divs, fix touch targets, add ARIA, improve contrast"
```
