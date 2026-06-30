# Prompt Claude Code — Settings UX & Accessibility Fix

Copie ce prompt dans Claude Code.

---

## Le prompt

```
Corrige les problèmes de `src/components/Settings.jsx` (2 238 lignes), `src/components/settings/PostChantierSettings.jsx` (530 l.) et `src/components/settings/EntrepriseSettingsPage.jsx` (332 l.) selon `critique-08-settings.md`. Lis ce fichier d'abord.

Respecte CLAUDE.md. Après chaque tâche, `npm run build`.

## Tâche 1 — Convertir les toggles div en checkbox (Settings.jsx)

Lignes ~2101-2104 et ~2144-2147 : des `<div onClick>` servent de toggle switch. Le même fichier a un bon pattern checkbox (ligne ~1111).

Remplace les toggles div par :
```jsx
<label className="relative inline-flex items-center cursor-pointer">
  <input
    type="checkbox"
    role="switch"
    checked={value}
    onChange={() => updateEntreprise(...)}
    className="sr-only peer"
    aria-label={toggle.label}
  />
  <div className={`w-11 h-6 rounded-full peer ${isDark ? 'bg-slate-600' : 'bg-slate-300'} peer-checked:bg-emerald-500 after:content-[''] after:absolute after:top-0.5 after:start-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full`} />
</label>
```

Supprime le `style={{ backgroundColor: '#22c55e' }}` hardcodé (lignes ~2145, 2202).

## Tâche 2 — Touch targets 44px

| Élément | Lignes | Actuel | Cible |
|---------|--------|--------|-------|
| Color picker buttons | ~704-706, 2028 | `w-9 h-9` (36px) | `w-11 h-11` (44px) |
| Close profile detail | ~477 | `p-1` (~24px) | `min-w-[44px] min-h-[44px]` |
| Close wizard | ~1988 | `p-1.5` (~28px) | `min-w-[44px] min-h-[44px]` |
| EntrepriseSettings actions | ~217, 227, 236 | `p-2` (32px) | `min-w-[44px] min-h-[44px]` |
| PostChantier close | ~399 | `p-1.5` (~28px) | `min-w-[44px] min-h-[44px]` |
| PostChantier pencil | ~335 | `px-2.5 py-1.5` (~27px) | `min-h-[44px]` |

## Tâche 3 — Focus trap + Escape modals

### 3a. Setup Wizard (lignes ~1942-2211)
Utilise `useFocusTrap` hook. Ajoute `role="dialog"` + `aria-modal="true"`.

### 3b. Export Modal (lignes ~2213-2235)
Ajoute un Escape handler si absent. Ajoute `role="dialog"` + `aria-modal="true"`.

### 3c. PostChantier edit modal (lignes ~377-527)
Ajoute un Escape handler. Ajoute `role="dialog"` + `aria-modal="true"`.

## Tâche 4 — Typography
`text-[10px]` (lignes ~194, 1932) → `text-[11px]`

## Tâche 5 — Aria-labels
Ajoute `aria-label="Fermer"` sur les boutons close qui en manquent (lignes ~477, 1988, 399).

## Validation

1. `npm run build` — sans erreurs
2. `grep -n "div.*onClick.*toggle\|div.*onClick.*switch" src/components/Settings.jsx` → 0 résultats
3. `grep -n "w-9 h-9" src/components/Settings.jsx` → 0 résultats
4. Commit : "fix(settings): accessibility — replace toggle divs with checkbox, fix touch targets, add focus trap"
```
