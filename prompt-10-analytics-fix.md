# Prompt Claude Code — AnalyticsPremium + AnalyticsPage UX & Accessibility Fix

Copie ce prompt dans Claude Code.

---

## Le prompt

```
Corrige les problèmes de `src/components/AnalyticsPremium.jsx` (570 l.) et `src/components/AnalyticsPage.jsx` (786 l.) selon `critique-09-analytics.md`. Lis ce fichier d'abord.

Respecte CLAUDE.md. Après chaque tâche, `npm run build`.

## Tâche 1 — Éliminer text-[9px] et améliorer text-[10px]

### 1a. AnalyticsPage ligne ~705
`text-[9px]` dans barre rentabilité → `text-[11px]`

### 1b. AnalyticsPremium — 15+ text-[10px]
Lignes ~258, 352, 396, 436, 473, 486, 534, 538, 540, 542, 563 : `text-[10px]` → `text-[11px]`

### 1c. AnalyticsPage
Lignes ~85, 484, 683 : `text-[10px]` → `text-[11px]`

Commande : `grep -n "text-\[9px\]\|text-\[10px\]" src/components/AnalyticsPremium.jsx src/components/AnalyticsPage.jsx`

## Tâche 2 — Ajouter des indicateurs non-couleur

### 2a. Marge (AnalyticsPremium ligne ~463)
La couleur vert/amber/rouge est le seul indicateur. Ajoute un icône ou texte :
```jsx
const margeIndicator = margePct > 20 ? '✓' : margePct >= 0 ? '~' : '✗';
// Affiche à côté du pourcentage
<span className="sr-only">{margePct > 20 ? 'Bonne marge' : margePct >= 0 ? 'Marge faible' : 'Marge négative'}</span>
```

### 2b. Productivité (AnalyticsPremium ligne ~529)
Même pattern : ajoute un sr-only label.

### 2c. Cash flow (AnalyticsPage lignes ~343, 745, 760, 772)
Ajoute `<span className="sr-only">{value >= 0 ? 'Positif' : 'Négatif'}</span>` à côté des valeurs colorées.

## Tâche 3 — Touch targets 44px

### 3a. Period buttons (AnalyticsPremium ~189-200, AnalyticsPage ~246-257)
`px-3 py-1.5` (~24px) → `px-4 py-2.5 min-h-[44px]`

### 3b. Export PDF button (AnalyticsPage ~263-273)
`px-3 py-1.5` → `px-4 py-2.5 min-h-[44px]`

### 3c. "Relancer" button (AnalyticsPremium ~408)
`px-2 py-1 text-[11px]` → `px-3 py-2 text-xs min-h-[44px]`

### 3d. "Voir les brouillons" (AnalyticsPage ~380-384)
`px-4 py-2` → `min-h-[44px]`

## Tâche 4 — Rendre les tooltips accessibles

Les deux fichiers ont un tooltip (ligne ~315) avec `pointer-events-none` + hover-only.

Remplace le `<div>` info icon par un `<button>` :
```jsx
<button
  type="button"
  className="relative group"
  aria-describedby="tooltip-xxx"
>
  <Info size={16} />
  <div
    id="tooltip-xxx"
    role="tooltip"
    className="absolute ... opacity-0 group-hover:opacity-100 group-focus:opacity-100 transition-opacity"
  >
    {tooltipContent}
  </div>
</button>
```

Retire `pointer-events-none` et ajoute `group-focus:opacity-100` pour l'accès clavier.

## Tâche 5 — ARIA sur les charts SVG

### 5a. Gauge circulaire (AnalyticsPremium ~90)
Ajoute sur le `<svg>` :
```jsx
role="img"
aria-label={`Score de conversion : ${score}%`}
```

### 5b. Tables rentabilité (AnalyticsPage ~661)
Vérifie que `<table>` a un `aria-label` descriptif. Si absent, ajoute :
```jsx
aria-label="Rentabilité par chantier"
```

## Validation

1. `npm run build`
2. `grep -n "text-\[9px\]" src/components/AnalyticsPage.jsx` → 0
3. `grep -n "pointer-events-none" src/components/AnalyticsPremium.jsx src/components/AnalyticsPage.jsx` → 0 sur les tooltips
4. Commit : "fix(analytics): accessibility — fix tiny text, add non-color indicators, fix touch targets, make tooltips keyboard accessible"
```
