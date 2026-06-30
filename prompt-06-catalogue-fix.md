# Prompt Claude Code — Catalogue UX & Accessibility Fix

Copie ce prompt dans Claude Code pour lancer les corrections.

---

## Le prompt

```
Tu vas corriger les problèmes UX et accessibilité de `src/components/Catalogue.jsx` (2 971 lignes) identifiés dans `critique-05-catalogue.md`. Lis ce fichier d'abord.

IMPORTANT : Respecte les conventions du projet (voir CLAUDE.md) :
- Dark mode via prop `isDark` + ternaire, JAMAIS `dark:` Tailwind
- Couleur accent via prop `couleur` + `style={{ }}` inline
- Icônes : `lucide-react` uniquement

Après chaque tâche, lance `npm run build` pour vérifier.

## Tâche 1 — Rendre les actions table accessibles au clavier

Les boutons edit/delete/add-to-devis (lignes ~1854-1857) utilisent `opacity-0 group-hover:opacity-100`. Ce pattern les rend invisibles aux utilisateurs clavier et mobile.

**Remplace** le pattern opacity par :
```jsx
className="opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 focus-visible:opacity-100 transition-opacity"
```

Ajoute aussi `tabIndex={0}` sur la ligne `<tr>` et assure que les boutons ont chacun un `aria-label` :
- `aria-label="Modifier l'article"`
- `aria-label="Supprimer l'article"`
- `aria-label="Ajouter au devis"`

## Tâche 2 — Ajouter focus trap sur les modals

Le fichier a 9 modals. Pour chacun, ajoute un focus trap basique.

Crée un hook réutilisable `useFocusTrap(ref, isOpen)` dans `src/hooks/useFocusTrap.js` :
```js
import { useEffect } from 'react';

export function useFocusTrap(ref, isOpen) {
  useEffect(() => {
    if (!isOpen || !ref.current) return;
    const modal = ref.current;
    const focusable = modal.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
    if (focusable.length) focusable[0].focus();

    const handleTab = (e) => {
      if (e.key !== 'Tab') return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    modal.addEventListener('keydown', handleTab);
    return () => modal.removeEventListener('keydown', handleTab);
  }, [ref, isOpen]);
}
```

Applique ce hook sur au moins les modals principaux : article form, fournisseur form, CSV import, barcode scanner.

Ajoute aussi `role="dialog"` et `aria-modal="true"` sur le container de chaque modal.

## Tâche 3 — Corriger les touch targets

| Élément | Lignes | Actuel | Cible |
|---------|--------|--------|-------|
| Stock +/- buttons | ~1296, 1298 | `w-10 h-10` (40px) | `w-11 h-11` (44px) |
| Close buttons modals | ~2043, 2797 | `p-1.5` (~28px) | `min-w-[44px] min-h-[44px]` |
| Close banner | ~1759 | `p-1.5` (~28px) | `min-w-[44px] min-h-[44px]` |
| "Changer" button | ~2098 | ~24px | `min-h-[44px] px-3` |

## Tâche 4 — Convertir les éléments cliquables

### 4a. Div cliquable stats (ligne ~1556)
`<div onClick={s.onClick}>` → ajoute `role="button"` + `tabIndex={0}` + `onKeyDown`

### 4b. TR cliquable table (ligne ~1813)
`<tr onClick={...}>` → ajoute `role="button"` + `tabIndex={0}` + `onKeyDown` + `className="cursor-pointer focus-visible:ring-2"`

## Tâche 5 — Stock low indicator accessible (ligne ~1822)
Le point rouge `w-2 h-2 rounded-full bg-red-500` n'a aucun texte.

**Ajoute** :
```jsx
<span className="w-2 h-2 rounded-full bg-red-500" aria-hidden="true" />
<span className="sr-only">Stock bas</span>
```

## Tâche 6 — Centraliser les couleurs marge/stock

Crée ou mets à jour `src/constants/colors.js` :
```js
export const MARGE_COLORS = {
  undefined: { hex: '#94a3b8', label: 'Non définie' },
  excellent: { hex: '#8b5cf6', label: 'Excellente' },
  good: { hex: '#16a34a', label: 'Bonne' },
  correct: { hex: '#22c55e', label: 'Correcte' },
  low: { hex: '#f59e0b', label: 'Faible' },
  negative: { hex: '#ef4444', label: 'Négative' },
};

export const STOCK_COLORS = {
  out: { hex: '#94a3b8', label: 'Rupture' },
  low: { hex: '#f59e0b', label: 'Bas' },
  ok: { hex: '#22c55e', label: 'OK' },
};
```

Remplace les hex hardcodés des lignes 476-481 et 2563 par ces constantes.

## Tâche 7 — Standardiser les tailles d'icônes

Actuellement 11 tailles différentes (10-48px). Normalise :
- `size={10}` ou `size={12}` → `size={14}` (compact)
- `size={22}` → `size={20}` (standard)
- `size={40}` → `size={32}` (large, sauf empty states)

Garde `size={48}` pour l'onboarding et `size={24}` pour les résultats scanner.

Commande : `grep -n "size={10}\|size={12}\|size={22}\|size={40}" src/components/Catalogue.jsx`

## Validation finale

1. `npm run build` — sans erreurs
2. `npm run lint` — pas de nouvelles erreurs
3. Vérifications :
   - `grep -n "opacity-0 group-hover" src/components/Catalogue.jsx` → tous avec group-focus-within
   - `grep -n "role=\"dialog\"" src/components/Catalogue.jsx` → au moins 4 résultats
   - `grep -n "min-w-\[44px\]" src/components/Catalogue.jsx` → augmenté
4. Commit : "fix(catalogue): accessibility — add focus trap, fix table actions visibility, fix touch targets, centralize colors"
```
