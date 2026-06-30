# Design Critique — Module 8 : Settings

**Fichiers** : `Settings.jsx` (2 238 l.), `PostChantierSettings.jsx` (530 l.), `EntrepriseSettingsPage.jsx` (332 l.)
**Total** : 3 100 lignes — 14 useState, 3 modals
**Date** : 2026-03-25

---

## Score global : 63 / 100

| Dimension | Score | Commentaire |
|-----------|-------|-------------|
| Utilisabilité | 15/20 | Wizard onboarding bien conçu, tabs mobile en accordéon |
| Hiérarchie visuelle | 14/20 | Groupes de tabs clairs, complétion visuelle |
| Cohérence | 15/20 | Dark mode ✅, z-index OK, mais 9+ hex hardcodés |
| Accessibilité | 8/20 | Toggles div au lieu d'input, pas de focus trap, touch targets 36px |
| Responsive | 11/20 | Accordéon mobile bon, mais color pickers 36px |

---

## Problèmes principaux

### 🔴 Critiques
- **Toggles non-sémantiques** (lignes ~2101-2104, 2144-2147) : `<div onClick>` au lieu de `<input type="checkbox">`. Le même fichier a un bon pattern checkbox (ligne 1111) — incohérence.
- **Color picker buttons 36px** (lignes ~704-706, 2028) : `w-9 h-9` = 36px, sous les 44px minimum.
- **Close buttons trop petits** : `p-1` (ligne ~477, ~24px) et `p-1.5` (ligne ~1988, ~28px).
- **Pas de focus trap** dans le Setup Wizard ni l'Export Modal.

### 🟡 Importants
- **text-[10px]** sur badges (lignes ~194, 1932)
- **9+ hex hardcodés** : completion meter (463-466), couleurs palette (279), stats (1573-1575)
- **Export Modal sans Escape handler** dédié
- **PostChantierSettings** : modal edit sans Escape handler

## 5 Recommandations

### P0 — Convertir les toggles div en checkbox
Remplacer les `<div onClick>` toggles par `<input type="checkbox" role="switch">` styled, comme le pattern existant ligne 1111.

### P1 — Touch targets 44px
Color pickers `w-9 h-9` → `w-11 h-11`. Close buttons `p-1` → `min-w-[44px] min-h-[44px]`.

### P2 — Focus trap + Escape sur tous les modals
Setup Wizard, Export Modal, PostChantier edit modal : ajouter focus trap et Escape handler.

### P3 — Centraliser les hex hardcodés
Extraire completion colors, stats colors, palette colors dans constants.

### P4 — Typography minimum
`text-[10px]` badges → `text-[11px]` minimum.
