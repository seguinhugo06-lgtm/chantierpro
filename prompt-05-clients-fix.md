# Prompt Claude Code — Clients UX & Accessibility Fix

Copie ce prompt dans Claude Code pour lancer les corrections.

---

## Le prompt

```
Tu vas corriger les problèmes UX et accessibilité de `src/components/Clients.jsx` (2 419 lignes) et `src/components/QuickClientModal.jsx` (602 lignes) identifiés dans `critique-04-clients.md`. Lis ce fichier d'abord.

IMPORTANT : Respecte les conventions du projet (voir CLAUDE.md) :
- Dark mode via prop `isDark` + ternaire, JAMAIS `dark:` Tailwind
- Couleur accent via prop `couleur` + `style={{ }}` inline
- Icônes : `lucide-react` uniquement

Après chaque tâche, lance `npm run build` pour vérifier.

## Tâche 1 — Convertir les divs cliquables en éléments sémantiques

La card client principale (ligne ~2116) est exemplaire : `role="article"`, `aria-label`, `tabIndex={0}`, `onKeyDown`. Applique ce même pattern aux 3 divs cliquables manquantes.

### 1a. Card chantier (ligne ~1035)
`<div onClick={...} className="...cursor-pointer...">` → ajoute :
```jsx
role="button"
tabIndex={0}
onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); /* même handler que onClick */ }}}
aria-label={`Voir le chantier ${chantier.nom}`}
```

### 1b. Card document (ligne ~1091)
`<div onClick={() => openDocument(d)} className="...cursor-pointer...">` → même traitement :
```jsx
role="button"
tabIndex={0}
onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openDocument(d); }}}
aria-label={`Ouvrir le document ${d.numero || d.nom}`}
```

### 1c. Card photo (ligne ~1505)
`<div onClick={...} className="...cursor-pointer...">` → même traitement avec `aria-label="Voir la photo"`.

Commande de vérification : `grep -n "div.*onClick.*cursor-pointer" src/components/Clients.jsx`

## Tâche 2 — Corriger les touch targets < 44px

### 2a. Back button (ligne ~585)
`min-w-[40px] min-h-[40px]` → `min-w-[44px] min-h-[44px]`

### 2b. Delete button (ligne ~609)
`min-w-[40px] min-h-[40px]` → `min-w-[44px] min-h-[44px]`

### 2c. Grid/List toggle (lignes ~1915, 1923)
`p-1.5` est trop petit (~28px). Remplace par :
```jsx
className="p-2 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg ..."
```

### 2d. Call/WhatsApp buttons desktop (lignes ~2190, 2193)
`w-11 h-11 sm:w-8 sm:h-8` — le 32px desktop est trop petit.
Remplace par `w-11 h-11 sm:w-10 sm:h-10` (44px mobile, 40px desktop — compromis acceptable).

### 2e. Close échange drawer (ligne ~1268)
`p-2` sans dimension minimale. Ajoute `min-w-[44px] min-h-[44px]`.

Commande : `grep -n "min-w-\[40px\]\|w-8 h-8\|p-1\.5" src/components/Clients.jsx | head -20`

## Tâche 3 — Corriger la typographie

### 3a. Éliminer text-[9px]
Ligne ~1812 : `text-[9px]` sur un sous-titre KPI → remplace par `text-[11px]`.

Commande : `grep -n "text-\[9px\]" src/components/Clients.jsx`

### 3b. Améliorer les text-[10px] les plus visibles
Il y a 12+ occurrences de `text-[10px]`. Ne les remplace pas toutes aveuglément — certaines sont OK pour des badges compacts. Remplace seulement celles qui servent de labels informatifs :

| Contexte | Action |
|----------|--------|
| KPI labels/subtitles (lignes ~835, 1811) | → `text-[11px]` |
| Direction badges (lignes ~1197, 1258) | → `text-[11px]` |
| Duplicate indicators (lignes ~1862-1884) | → `text-[11px]` |
| Clear filters label (ligne ~1997) | → `text-xs` (12px) pour visibilité |
| Character count (ligne ~1608) | OK à 10px (helper text) |
| Status/Type badges (ligne ~593-599) | OK à 10px (compact badges) |

Commande : `grep -n "text-\[10px\]" src/components/Clients.jsx`

## Tâche 4 — Ajouter les aria-labels manquants

Ajoute un `aria-label` descriptif sur chaque bouton icône-only :

| Ligne | Élément | aria-label |
|-------|---------|------------|
| ~585 | Back button (detail view) | `aria-label="Retour à la liste des clients"` |
| ~609 | Delete button | `aria-label="Supprimer ce client"` |
| ~1268 | Close échange drawer | `aria-label="Fermer le détail de l'échange"` |
| ~1758 | Import button | `aria-label="Importer des clients"` |
| ~1767 | New client button | `aria-label="Ajouter un nouveau client"` |
| ~1906 | Clear search | `aria-label="Effacer la recherche"` |
| ~1915 | Grid view toggle | `aria-label="Vue grille"` |
| ~1923 | List view toggle | `aria-label="Vue liste"` |

Aussi dans QuickClientModal.jsx :
| Ligne | Élément | aria-label |
|-------|---------|------------|
| ~254 | Close button | `aria-label="Fermer"` |

Commande : `grep -n "aria-label" src/components/Clients.jsx | wc -l` (avant/après pour comparer)

## Tâche 5 — Ajouter des textes alternatifs aux indicateurs couleur

### 5a. Status dots dans les cards chantier/document (lignes ~1037, 1091)
Ces dots colorés indiquent un statut par couleur seule. Ajoute un `aria-label` :
```jsx
<span className="..." aria-label={`Statut : ${status}`} role="img" />
```

Ou mieux, ajoute un texte visible en `sr-only` :
```jsx
<span className="...">●</span>
<span className="sr-only">{status}</span>
```

### 5b. Score badge (ligne ~2139)
Les badges VIP/Régulier/Occasionnel/Dormant/Nouveau ont déjà un texte visible — OK. Vérifie qu'un `aria-label` existe sur le badge parent si le texte est tronqué.

## Tâche 6 — Centraliser les couleurs hex hardcodées

### 6a. Crée ou mets à jour `src/constants/colors.js`

Ajoute ces objets :
```js
export const CHANNEL_COLORS = {
  email: { hex: '#3b82f6', bg: 'bg-blue-500', text: 'text-blue-500' },
  sms: { hex: '#22c55e', bg: 'bg-green-500', text: 'text-green-500' },
  whatsapp: { hex: '#25d366', bg: 'bg-emerald-500', text: 'text-emerald-500' },
  appel: { hex: '#8b5cf6', bg: 'bg-violet-500', text: 'text-violet-500' },
  visite: { hex: '#f97316', bg: 'bg-orange-500', text: 'text-orange-500' },
};

export const CLIENT_SCORE_COLORS = {
  vip: { hex: '#f59e0b', bg: 'bg-amber-500', text: 'text-amber-500' },
  regulier: { hex: '#10b981', bg: 'bg-emerald-500', text: 'text-emerald-500' },
  occasionnel: { hex: '#3b82f6', bg: 'bg-blue-500', text: 'text-blue-500' },
  dormant: { hex: '#ef4444', bg: 'bg-red-500', text: 'text-red-500' },
  nouveau: { hex: '#8b5cf6', bg: 'bg-violet-500', text: 'text-violet-500' },
};

export const TIMELINE_COLORS = {
  clock: { hex: '#f59e0b', bg: 'bg-amber-500' },
  zap: { hex: '#10b981', bg: 'bg-emerald-500' },
  alert: { hex: '#f97316', bg: 'bg-orange-500' },
  info: { hex: '#6b7280', bg: 'bg-gray-500' },
};
```

### 6b. Importe dans Clients.jsx
Remplace les hex inline du `CHANNEL_CONFIG` (lignes 94-100) et des score badges (ligne 2139) par ces constantes.

**Note** : les couleurs dans les `style={{ background: ... }}` pour les gradients (lignes 625-655) peuvent rester inline car elles utilisent des gradients CSS non exprimables en classes Tailwind.

Commande : `grep -c "#[0-9a-fA-F]\{6\}" src/components/Clients.jsx` (avant/après)

## Tâche 7 — Ajouter un compteur de résultats filtrés

Après la barre de recherche (vers ligne ~1900-1910), ajoute un compteur :
```jsx
{(search || filterCategorie || filterStatus || kpiFilter) && (
  <span className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
    {filteredClients.length} client{filteredClients.length > 1 ? 's' : ''}
  </span>
)}
```

Place-le à droite de la barre de recherche ou juste en dessous des filtres actifs. Assure-toi que `filteredClients` est le bon nom de la variable (vérifie dans le useMemo de filtrage).

## Tâche 8 — Ajouter aria-label sur le close button de QuickClientModal

Dans `src/components/QuickClientModal.jsx`, ligne ~254, le bouton de fermeture n'a pas d'aria-label.

Ajoute `aria-label="Fermer"` sur ce bouton.

## Validation finale

1. `npm run build` — doit passer sans erreurs
2. `npm run lint` — pas de nouvelles erreurs
3. Vérifications :
   - `grep -n "text-\[9px\]" src/components/Clients.jsx` → 0 résultats
   - `grep -n "min-w-\[40px\]" src/components/Clients.jsx` → 0 résultats (remplacé par 44px)
   - `grep -n "div.*onClick.*cursor-pointer" src/components/Clients.jsx` → tous avec role ou button
   - `grep -c "aria-label" src/components/Clients.jsx` → augmenté de 8+
   - `grep -c "#[0-9a-fA-F]\{6\}" src/components/Clients.jsx` → réduit
4. Crée un commit : "fix(clients): accessibility — fix touch targets, add ARIA labels, convert clickable divs, fix typography, centralize colors, add result counter"
```
