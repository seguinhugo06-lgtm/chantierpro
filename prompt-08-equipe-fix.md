# Prompt Claude Code — Equipe UX & Accessibility Fix

Copie ce prompt dans Claude Code pour lancer les corrections.

---

## Le prompt

```
Tu vas corriger les problèmes UX et accessibilité de `src/components/Equipe.jsx` (5 129 lignes) identifiés dans `critique-07-equipe.md`. Lis ce fichier d'abord.

IMPORTANT : Respecte les conventions du projet (voir CLAUDE.md).

Après chaque tâche, lance `npm run build`.

## Tâche 1 — role="dialog" + aria-modal sur les 8 modals

Seul Employee Detail (ligne ~4135) a `role="dialog"`. Ajoute sur les 7 autres :

| Modal | Ligne approx |
|-------|-------------|
| Note modal | ~1399 |
| Signature modal | ~3130 |
| Congé form | ~3683 |
| Pointer modal | ~3850 |
| Terrain view | ~3987 |
| Employee form | ~1007 |
| Bulk entry | via showBulkEntry |

Pour chacun, sur le div container (pas le backdrop) :
```jsx
role="dialog"
aria-modal="true"
aria-labelledby="modal-title-xxx"  // où xxx est un id unique
```

Et sur le backdrop :
```jsx
role="presentation"
aria-hidden="true"
```

## Tâche 2 — Focus trap sur les modals principaux

Utilise le hook `useFocusTrap` (dans `src/hooks/useFocusTrap.js` — crée-le s'il n'existe pas).

Applique au minimum sur :
- Signature modal (canvas + boutons)
- Congé form (formulaire)
- Pointer modal (formulaire)
- Employee form (formulaire)
- Employee detail (déjà role="dialog")

## Tâche 3 — Aria-labels sur quick actions

Lignes ~2072-2100 : les 4 boutons Play/Phone/Edit/Delete ont seulement `title`. Ajoute `aria-label` :

```jsx
aria-label="Démarrer le chrono"     // Play (ligne ~2072)
aria-label="Appeler"                // Phone (ligne ~2080)
aria-label="Modifier l'employé"     // Edit (ligne ~2088)
aria-label="Supprimer l'employé"    // Delete (ligne ~2095)
```

## Tâche 4 — Touch targets

### 4a. Nav semaine (lignes ~1508, 1517)
`w-8 h-8` (32px) → `min-w-[44px] min-h-[44px]`

### 4b. Tab min-height mobile (ligne ~1819)
`min-h-[40px] sm:min-h-[44px]` → `min-h-[44px]` partout

### 4c. Quick actions (lignes ~2067-2100)
`p-2` sur icônes 14px = ~36px total. Ajoute `min-w-[44px] min-h-[44px]`.

## Tâche 5 — Status indicators avec texte

### 5a. Online status (ligne ~2061)
```jsx
<span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
```
→ Ajoute `<span className="sr-only">En ligne</span>` à côté.

### 5b. Notification dot (ligne ~1854)
```jsx
<span className="absolute top-1 right-1 w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
```
→ Ajoute `aria-label="Notification en attente"` ou `<span className="sr-only">...</span>`.

### 5c. Pointage type dot (ligne ~3430)
Le dot orange distingue pointage manuel vs auto mais sans légende.
→ Ajoute un `<span className="sr-only">{isManual ? 'Pointage manuel' : 'Pointage automatique'}</span>`.

## Tâche 6 — Tab labels lisibles

Ligne ~1831 : les labels abrégés `text-[10px] sm:hidden` ("S-T", "Valid.", "Compét.", "Prod.") sont cryptiques.

**Option A** (recommandée) : Remplace `text-[10px]` par `text-[11px]` et garde les abréviations mais ajoute un `title` tooltip :
```jsx
<span className="text-[11px] sm:hidden" title={fullLabel}>{mobileLabel}</span>
```

**Option B** : Sur mobile, n'affiche que l'icône sans texte (supprime le label abrégé).

## Tâche 7 — Corriger le z-index dynamique

Ligne ~1601 : `zIndex: 3 - i` crée des valeurs 0-3.

**Remplace** par des valeurs Tailwind stables :
```jsx
style={{ zIndex: Math.max(1, 10 - i) }}
```
Ou utilise `className="z-10"` statique si le stacking n'est pas critique.

## Tâche 8 — Centraliser les couleurs (partiel)

Extrais au minimum les constantes les plus dupliquées dans `src/constants/colors.js` :

```js
export const ROLE_COLORS = {
  ouvrier: '#f59e0b',
  chef_equipe: '#6366f1',
  apprenti: '#eab308',
  conducteur: '#3b82f6',
  intérimaire: '#8b5cf6',
  // ... etc
};

export const CONGE_TYPE_COLORS = {
  cp: '#3b82f6',
  rtt: '#8b5cf6',
  maladie: '#ef4444',
  sans_solde: '#64748b',
  formation: '#f59e0b',
  autre: '#6b7280',
};
```

Importe et utilise dans Equipe.jsx aux lignes 168-180 et 842-847.

**Ne pas** toucher aux couleurs WhatsApp (#25D366) qui sont des brand colors fixes.

## Validation finale

1. `npm run build` — sans erreurs
2. Vérifications :
   - `grep -n "role=\"dialog\"" src/components/Equipe.jsx` → au moins 8 résultats
   - `grep -n "aria-label" src/components/Equipe.jsx` → augmenté significativement
   - `grep -n "min-h-\[40px\]" src/components/Equipe.jsx` → 0 résultats (remplacé par 44px)
   - `grep -n "sr-only" src/components/Equipe.jsx` → au moins 3 résultats
3. Commit : "fix(equipe): accessibility — add dialog roles, focus trap, aria-labels, fix touch targets, add status text, centralize colors"
```
