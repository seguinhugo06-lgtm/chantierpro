# Prompt Claude Code — FinancesPage UX & Accessibility Fix

Copie ce prompt dans Claude Code pour lancer les corrections.

---

## Le prompt

```
Tu vas corriger les problèmes UX et accessibilité du module Finances identifiés dans `critique-06-finances.md`. Lis ce fichier d'abord.

Fichiers concernés :
- `src/components/TresorerieModule.jsx` (3 081 lignes) — le plus gros
- `src/components/BankModule.jsx` (975 lignes)
- `src/components/PaiementsTab.jsx` (431 lignes)

IMPORTANT : Respecte les conventions du projet (voir CLAUDE.md).

Après chaque tâche, lance `npm run build`.

## Tâche 1 — Focus trap + ARIA modals (TresorerieModule)

3 modals dans TresorerieModule sans focus trap :
- Add/Edit prévisions (lignes ~388-450)
- Solde initial + charges config (lignes ~514-615)
- Prefill confirmation (lignes ~3022-3074)

Pour chacun :
1. Ajoute `role="dialog"` + `aria-modal="true"` sur le container modal
2. Ajoute `role="presentation"` sur le backdrop
3. Utilise le hook `useFocusTrap` si créé dans la tâche Catalogue, sinon crée-le dans `src/hooks/useFocusTrap.js`
4. Ajoute `autoFocus` sur le premier input de chaque modal

## Tâche 2 — Touch targets (TresorerieModule)

| Élément | Lignes | Actuel | Cible |
|---------|--------|--------|-------|
| Close buttons | ~395, 521, 1746, 1877 | `p-1.5` (~28px) | `min-w-[44px] min-h-[44px]` |
| Info button | ~1684 | `p-1` (~20px) | `min-w-[44px] min-h-[44px]` |
| Checkbox | ~1814 | `w-5 h-5` (20px) | Wrapper 44px autour |

Pour le checkbox, crée un wrapper cliquable invisible :
```jsx
<button type="button" className="min-w-[44px] min-h-[44px] flex items-center justify-center -m-2.5" onClick={toggle}>
  <div className="w-5 h-5 rounded border-2 ...">...</div>
</button>
```

## Tâche 3 — Convertir les divs cliquables

### 3a. TresorerieModule ligne ~1802
`<div onClick={...} className="cursor-pointer">` → ajoute `role="button"` + `tabIndex={0}` + `onKeyDown`

### 3b. BankModule divs cliquables
Cherche les divs avec onClick + cursor-pointer dans BankModule.jsx et applique le même traitement.

## Tâche 4 — Ajouter aria-expanded sur les dropdowns

| Fichier | Lignes | Dropdown |
|---------|--------|----------|
| TresorerieModule | ~1597 | Filter dropdown |
| BankModule | ~541, 589 | Dropdowns |

Ajoute `aria-expanded={isOpen}` sur le bouton trigger de chaque dropdown.

## Tâche 5 — Status dots avec texte alternatif

Ligne ~1889 dans TresorerieModule : le dot de statut overdue est couleur-seule.

**Ajoute** :
```jsx
<span className="w-2.5 h-2.5 rounded-full ..." aria-hidden="true" />
<span className="sr-only">{isOverdue ? 'En retard' : 'À jour'}</span>
```

## Tâche 6 — Ajouter aria-labels sur les close buttons

Tous les boutons X (close) des modals doivent avoir :
```jsx
aria-label="Fermer"
```

Vérifie chaque modal dans TresorerieModule et BankModule.

## Validation finale

1. `npm run build` — sans erreurs
2. Vérifications :
   - `grep -n "role=\"dialog\"" src/components/TresorerieModule.jsx` → au moins 3
   - `grep -n "aria-expanded" src/components/TresorerieModule.jsx src/components/BankModule.jsx` → augmenté
   - `grep -n "min-w-\[44px\]" src/components/TresorerieModule.jsx` → augmenté
3. Commit : "fix(finances): accessibility — add focus trap, fix touch targets, add ARIA expanded, convert clickable divs"
```
