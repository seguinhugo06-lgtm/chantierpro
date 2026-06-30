# Prompt Claude Code — Modules 11 à 21 UX & Accessibility Fix

Copie ce prompt dans Claude Code. C'est un prompt groupé pour les composants secondaires.

---

## Le prompt

```
Tu vas corriger les problèmes communs d'accessibilité sur 11 composants secondaires identifiés dans `critique-10-remaining-modules.md`. Lis ce fichier d'abord.

IMPORTANT : Respecte CLAUDE.md. Après chaque groupe de tâches, `npm run build`.

## Tâche 1 — Ajouter Escape handlers sur les modals sans gestion clavier

Les modals suivants n'ont PAS d'Escape handler. Pour chaque fichier, ajoute un useEffect :

```jsx
useEffect(() => {
  const handleEsc = (e) => { if (e.key === 'Escape') closeModal(); };
  if (isOpen) document.addEventListener('keydown', handleEsc);
  return () => document.removeEventListener('keydown', handleEsc);
}, [isOpen]);
```

Fichiers et modals concernés :
1. `src/components/CommandesFournisseurs.jsx` — CatalogueModal (z-50)
2. `src/components/BibliothequeOuvrages.jsx` — modals multiples
3. `src/components/SousTraitantsModule.jsx` — 2+ form modals
4. `src/components/CarnetEntretien.jsx` — 3 modals (lignes ~726, 893, 1384)
5. `src/components/ChatPage.jsx` — NewChannelModal (overlay ligne ~559)
6. `src/components/SignatureModule.jsx` — 9 modals (lignes ~1061, 1339)
7. `src/components/AvisGoogle.jsx` — 1+ modal (ligne ~981)

Pour chaque modal trouvé, ajoute aussi `role="dialog"` et `aria-modal="true"` sur le container.

Commande pour identifier les modals : `grep -n "z-50\|z-40\|fixed inset-0\|bg-black/50" src/components/CommandesFournisseurs.jsx src/components/BibliothequeOuvrages.jsx src/components/SousTraitantsModule.jsx src/components/CarnetEntretien.jsx src/components/ChatPage.jsx src/components/SignatureModule.jsx src/components/AvisGoogle.jsx`

## Tâche 2 — Ajouter aria-labels sur les boutons icône

Pour chaque fichier, cherche les boutons avec une icône lucide-react mais sans `aria-label` :

```bash
grep -n "<button" src/components/PipelineKanban.jsx src/components/ChatPage.jsx src/components/IADevisAnalyse.jsx src/components/ProfilePage.jsx src/components/PlanPage.jsx | head -40
```

Ajoute un `aria-label` descriptif en français sur chaque bouton icône-only trouvé. Exemples :
- Bouton avec `<Trash2>` → `aria-label="Supprimer"`
- Bouton avec `<Edit>` ou `<Pencil>` → `aria-label="Modifier"`
- Bouton avec `<Plus>` → `aria-label="Ajouter"`
- Bouton avec `<Search>` → `aria-label="Rechercher"`
- Bouton avec `<X>` → `aria-label="Fermer"`
- Bouton avec `<ChevronLeft>` → `aria-label="Précédent"`
- Bouton avec `<GripVertical>` → `aria-label="Déplacer"`

## Tâche 3 — Corriger text-[9px] et text-[10px]

### 3a. ChatPage.jsx
`text-[9px]` (lignes ~90, 94, 114, 115) → `text-[11px]`

### 3b. PipelineKanban.jsx
`text-[10px]` (lignes ~96-102) → `text-[11px]`

### 3c. ProfilePage.jsx
`text-[10px]` (ligne ~507) → `text-[11px]`

### 3d. PlanPage.jsx
7 occurrences de `text-[10px]` (lignes ~127, 131, 206, 240, 248, 269, 340) → `text-[11px]`

Commande : `grep -rn "text-\[9px\]\|text-\[10px\]" src/components/PipelineKanban.jsx src/components/ChatPage.jsx src/components/ProfilePage.jsx src/components/PlanPage.jsx`

## Tâche 4 — Convertir le div cliquable PipelineKanban

Le composant draggable (lignes ~57-105 dans PipelineKanban.jsx) est un `<div onClick>`. Ajoute :
```jsx
role="button"
tabIndex={0}
aria-label={`Devis ${devis.numero} - ${devis.client}`}
onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); }}}
```

## Tâche 5 — Convertir le div cliquable CommandesFournisseurs

Ligne ~600 dans CommandesFournisseurs.jsx : div avec onClick sans role. Ajoute `role="button"` + `tabIndex={0}` + `onKeyDown`.

## Tâche 6 — Centraliser les couleurs hex (CommandesFournisseurs + SousTraitantsModule)

### 6a. CommandesFournisseurs
13 hex hardcodés pour les status colors. Crée un objet dans le fichier ou dans `src/constants/colors.js` :
```js
export const COMMANDE_STATUS_COLORS = {
  brouillon: { bg: 'bg-slate-100', text: 'text-slate-600' },
  envoyee: { bg: 'bg-blue-100', text: 'text-blue-600' },
  confirmee: { bg: 'bg-emerald-100', text: 'text-emerald-600' },
  livree: { bg: 'bg-green-100', text: 'text-green-600' },
  annulee: { bg: 'bg-red-100', text: 'text-red-600' },
};
```

### 6b. SousTraitantsModule
10+ hex pour les corps de métier (lignes 34-43). Crée :
```js
export const CORPS_METIER_COLORS = {
  maconnerie: '#f97316',
  electricite: '#3b82f6',
  plomberie: '#22c55e',
  // ... extraire les valeurs exactes du fichier
};
```

## Tâche 7 — Touch targets PipelineKanban

GripVertical `size={14}` (ligne ~76) : le drag handle est trop petit. Assure que le conteneur a `min-w-[44px] min-h-[44px]`.

## Validation finale

1. `npm run build` — sans erreurs
2. `npm run lint` — pas de nouvelles erreurs
3. Vérifications :
   - `grep -rn "text-\[9px\]" src/components/ChatPage.jsx` → 0
   - `grep -rn "text-\[10px\]" src/components/PipelineKanban.jsx src/components/PlanPage.jsx` → 0
   - `grep -rn "role=\"dialog\"" src/components/CarnetEntretien.jsx src/components/SignatureModule.jsx src/components/AvisGoogle.jsx` → augmenté
4. Commit : "fix(modules): accessibility — add Escape handlers, dialog roles, aria-labels, fix typography, centralize colors"
```
