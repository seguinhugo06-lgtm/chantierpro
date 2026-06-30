# Design Critique — Module 9 : AnalyticsPremium + AnalyticsPage

**Fichiers** : `AnalyticsPremium.jsx` (570 l.), `AnalyticsPage.jsx` (786 l.)
**Total** : 1 356 lignes — 3 useState, 0 modals
**Date** : 2026-03-25

---

## Score global : 55 / 100

| Dimension | Score | Commentaire |
|-----------|-------|-------------|
| Utilisabilité | 14/20 | Charts SVG bien structurés, grids responsive |
| Hiérarchie visuelle | 13/20 | KPI cards clairs, funnel visuel, mais texte trop petit |
| Cohérence | 14/20 | Dark mode ✅, colors centralisées dans AnalyticsPage |
| Accessibilité | 5/20 | text-[9px], couleur seule partout, tooltips inaccessibles, touch targets |
| Responsive | 9/20 | Grids OK mais boutons/badges trop petits sur mobile |

---

## Problèmes principaux

### 🔴 Critiques
- **text-[9px]** dans AnalyticsPage (ligne 705) : labels dans les barres — illisible
- **15+ text-[10px]** dans AnalyticsPremium : badges conversion, productivité, prestations, rôles
- **Couleur seule** pour marge (vert/amber/rouge) et productivité — échoue WCAG 1.4.1
- **Tooltips inaccessibles** (ligne 315) : `pointer-events-none` + hover-only = aucun accès clavier
- **Period buttons ~24px** (lignes 189-200, 246-257) : `py-1.5` bien sous 44px
- **Info icon** est un `<div>` au lieu d'un `<button>` (ligne 314)

### 🟡 Importants
- **"Relancer" button** (ligne 408) : 22px height + text-[11px] = inaccessible
- **Export PDF button** (ligne 263-273) : ~24px height
- **Table rentabilité** `min-w-[640px]` sans vue card mobile
- **SVG gauge** (ligne 90) sans aria-label ni role
- **Hardcoded colors** dans AnalyticsPremium (inline chart colors)

## 5 Recommandations

### P0 — Corriger text-[9px] et text-[10px]
Éliminer text-[9px] (ligne 705). Passer les 15+ text-[10px] à text-[11px] minimum.

### P1 — Ajouter indicateurs non-couleur
Les barres marge/productivité utilisent vert/amber/rouge seuls. Ajouter des icônes (✓/⚠/✗) ou labels texte à côté.

### P2 — Touch targets 44px
Period buttons, Export button, "Relancer" button : tous doivent atteindre `min-h-[44px]`.

### P3 — Rendre les tooltips accessibles
Remplacer hover-only + pointer-events-none par un bouton focusable avec `aria-describedby` et Escape handler.

### P4 — Ajouter ARIA sur les charts
SVG gauges : `role="img"` + `aria-label="Score: X%"`. Bars : `role="graphics-document"` + description.
