# BatiGesti — Design System Audit

**Date:** March 24, 2026
**Components reviewed:** ~304 | **Issues found:** 180+ | **Score: 52/100**

---

## Executive Summary

BatiGesti has a solid design token foundation — CSS custom properties in `design-tokens.css`, a well-structured Tailwind config, and a 30+ component UI library in `src/components/ui/`. However, adoption is inconsistent: hardcoded hex colors, arbitrary z-index values, and inline spacing bypass the token system across 50+ files. The `isDark` prop pattern has 79% adoption, but `dark:` Tailwind classes still appear in 12 files, violating a core architecture rule.

---

## 1. Token Coverage

| Category | Tokens Defined | Hardcoded Values Found | Severity |
|----------|---------------|----------------------|----------|
| **Colors** | 55 (primary, success, warning, danger, gray) | **100+ instances** of raw hex in 30+ files | Critical |
| **Z-Index** | 3 competing systems (CSS, JS, Tailwind) | **20+ arbitrary values** (z-[999], z-[9999]) | High |
| **Spacing** | 13 CSS vars + Tailwind scale | **52 files** with inline `padding`/`margin`/`gap` | High |
| **Typography** | 8 sizes, 4 weights | **12 instances** of hardcoded `fontSize` | Medium |
| **Border Radius** | 6 tokens | **16 instances** of hardcoded `borderRadius` | Medium |
| **Shadows** | 7 tokens + 2 card aliases | 2 instances of custom `boxShadow` | Low |
| **Transitions** | 3 tokens (fast/base/slow) | 3 inline `transition` values | Low |

---

## 2. Color Inconsistencies (CRITICAL)

### 2a. Hardcoded hex in inline styles — 30+ files

Colors that should be semantic tokens are hardcoded throughout the app. The most common offenders:

| Color | Hex | Occurrences | Should Be |
|-------|-----|-------------|-----------|
| Blue | `#3b82f6` | 15+ | Not in token palette — needs `--color-info-*` token |
| Purple | `#8b5cf6` / `#7c3aed` | 15+ | Not in token palette — needs semantic token |
| Green | `#22c55e` / `#10b981` | 15+ | Mix of `success-500` and `success-600` — use tokens |
| Orange | `#f97316` | 20+ | Matches `primary-500` — use token or `couleur` prop |
| Red | `#ef4444` | 15+ | Matches `danger-500` — use token |
| Amber | `#f59e0b` | 10+ | Matches `warning-500` — use token |

**Worst offenders:** `DevisPage.jsx` (10+), `Clients.jsx` (10+), `AnalyticsPage.jsx` (9+), `Planning.jsx` (8+), `CommandesFournisseurs.jsx` (5+), `Equipe.jsx` (6+)

### 2b. Status/category color maps — scattered constants

Multiple files define their own status-to-color mappings instead of sharing a single source:

- `ContractsPage.jsx` — `actif: '#22c55e'`, `expire: '#ef4444'`
- `PipelineKanban.jsx` — 7 status colors
- `Planning.jsx` — priority + task type colors (12 values)
- `DevisPage.jsx` — `STATUS_BAR_COLORS` with 10 values
- `SousTraitantsModule.jsx` — 13 trade category colors
- `CarnetEntretien.jsx` — 6 category colors

**Recommendation:** Create a shared `src/constants/colors.js` exporting semantic color maps (`STATUS_COLORS`, `PRIORITY_COLORS`, `CATEGORY_COLORS`) referencing CSS variables.

### 2c. Missing token: Blue and Purple

Blue (`#3b82f6`) and purple (`#8b5cf6`) are used in 30+ places but have no token in the design system. These need to be added as `--color-info-*` and `--color-accent-*` in `design-tokens.css` and `tailwind.config.js`.

---

## 3. Dark Mode Violations (CRITICAL)

**Rule:** Use `isDark` prop + conditional classes. Never use Tailwind `dark:` prefix.

**12 files with 42+ violations:**

| File | Count | Example |
|------|-------|---------|
| Chantiers.jsx | 8 | `dark:hover:bg-red-900/20`, `dark:focus-visible:ring-offset-slate-900` |
| Settings.jsx | 6 | `dark:bg-blue-900/30`, `dark:text-blue-400` |
| BankConnectionModal.jsx | 3+ | Various `dark:` classes |
| BankTransactionsModal.jsx | 3+ | Various `dark:` classes |
| OuvrageCard.jsx | 2+ | Various `dark:` classes |
| OuvrageDetail.jsx | 2+ | Various `dark:` classes |
| TresorerieModule.jsx | 2+ | Various `dark:` classes |
| MaPrimeRenovAssistant.jsx | 2+ | Various `dark:` classes |
| MemosPage.jsx | 2 | `dark:hover:bg-red-500/10` |
| Planning.jsx | 1 | `dark:divide-slate-700/50` |
| ToastContainer.jsx | 1+ | Various `dark:` classes |
| Dashboard.jsx.backup | 49 | Legacy file — full of `dark:` usage |

**Recommendation:** Refactor all to `isDark ? 'class-a' : 'class-b'` pattern. Delete `Dashboard.jsx.backup`.

---

## 4. Z-Index Chaos (HIGH)

Three conflicting z-index systems exist and none is consistently used:

| System | Location | Modal Value | Toast Value | Used? |
|--------|----------|-------------|-------------|-------|
| CSS Variables | `design-tokens.css` | 1050 | 1080 | Rarely |
| JS Constants | `constants/zIndex.js` | 50 | 60 | **Never imported** |
| Tailwind Config | `tailwind.config.js` | 1050 | 1080 | Rarely |

**Arbitrary values found in components:**

| Value | File | What it's for |
|-------|------|---------------|
| `z-[9999]` | CGUAcceptanceModal.jsx, Tooltip.jsx | Modal, tooltip |
| `z-[999]` | Chantiers.jsx | Merge dialog |
| `z-[200]` | ToastContainer.jsx | Toasts |
| `z-[100]` | App.jsx (x2), CommandPalette.jsx | Notifications, skip-link |
| `z-[60]` | App.jsx, multiple modals | Modals misclassified as toast-level |
| `z-[1000]` | ChantierMap.jsx (x4) | Map overlays |

**Recommendation:** Pick ONE system (Tailwind config tokens: `z-dropdown`, `z-modal`, `z-toast`, etc.), delete `constants/zIndex.js`, and refactor all arbitrary values.

---

## 5. Spacing & Typography Hardcodes (HIGH)

### 5a. Inline style spacing — 52 files

Files using `style={{ padding: '...', margin: '...' }}` instead of Tailwind classes:

| File | Severity | Examples |
|------|----------|---------|
| **DevisForm.jsx** | Extreme | Lines 3–127: entire styles object with 20+ hardcoded values (`padding: '30px'`, `gap: '20px'`, `borderRadius: '12px'`) |
| **ChantierMap.jsx** | High | `gap: '8px'`, `marginBottom: '6px'`, `padding: '6px 8px'` |
| **DevisPage.jsx** | High | 60+ arbitrary Tailwind bracket values (`min-h-[300px]`, `max-w-[160px]`) |
| **Dashboard.jsx** | Medium | 35+ arbitrary min-h/max-h values |

### 5b. Hardcoded font sizes — 12 instances

All in `DevisForm.jsx` and `ChantierMap.jsx`. Values like `fontSize: '14px'` should be `text-sm`, `fontSize: '11px'` has no Tailwind equivalent (needs a token or `text-xs`).

### 5c. Hardcoded border-radius — 16 instances

Mostly in `DevisForm.jsx` (7) and `ChantierMap.jsx` (4). All map directly to existing Tailwind classes (`rounded-md`, `rounded-lg`, `rounded-xl`).

---

## 6. Component Completeness

### UI Library (src/components/ui/)

| Component | Variants | States | isDark | Score |
|-----------|----------|--------|--------|-------|
| Button | 5 (primary, secondary, outline, ghost, danger) | default, hover, disabled, loading | Yes | 9/10 |
| Card | 3 (Card, StatCard, header/footer) | default, hover | Yes | 8/10 |
| Input | 5 (Input, Textarea, Select, Search, Password) | default, focus, error, disabled | Yes | 8/10 |
| Modal | compound (Header, Body, Footer, Title, etc.) | open, confirm, alert | Yes (via context) | 9/10 |
| Badge | multiple via className | default | Partial | 6/10 |
| Tabs | compound (List, Trigger, Content) | active, inactive | Yes | 8/10 |
| Tooltip | single | show/hide | Partial | 5/10 |
| Alert | multiple | default | Yes | 7/10 |
| Toast/ToastContainer | multiple | show, dismiss, auto-hide | Partial (`dark:` violation) | 6/10 |
| Avatar | stacked | single, group | Yes | 8/10 |
| EmptyState | configurable | default | Yes | 8/10 |
| Progress | single | determinate | Yes | 7/10 |
| Skeleton | single | loading | Partial | 6/10 |

### Prop Consistency

| Prop | Adoption | Notes |
|------|----------|-------|
| `isDark` | 241/304 (79%) | Good — most major pages comply |
| `couleur` | 199/304 (65%) | Good — properly applied via inline `style` |
| `setPage` | 63 files | 100% — no React Router detected |

### Naming

303/304 files use PascalCase. One exception: `animations.jsx` in `/ui/` (should be `Animations.jsx`).

---

## 7. Priority Actions

### P0 — Architecture violations (fix now)

1. **Eliminate `dark:` Tailwind classes** in 12 files (42 instances). Replace with `isDark` conditional pattern. Delete `Dashboard.jsx.backup`.
2. **Unify z-index system.** Pick Tailwind config tokens, delete `constants/zIndex.js`, refactor all `z-[9999]`/`z-[999]`/`z-[200]` to named tokens.
3. **Add missing color tokens** for blue (`info`) and purple (`accent`) to `design-tokens.css` and `tailwind.config.js`.

### P1 — Token adoption (next sprint)

4. **Create shared color maps** in `src/constants/colors.js` for status, priority, and category colors. Refactor the 10+ files with duplicated color objects.
5. **Refactor `DevisForm.jsx`** — replace entire inline styles object (lines 3–127) with Tailwind classes.
6. **Replace hardcoded hex in inline styles** across the top 10 offending files (DevisPage, Clients, AnalyticsPage, Planning, Equipe, CommandesFournisseurs).

### P2 — Polish (backlog)

7. **Replace inline spacing** (`padding`, `margin`, `gap`, `borderRadius`) with Tailwind classes in `ChantierMap.jsx` and remaining files.
8. **Increase UI library reuse** — only 17% of components import from `./ui`. Audit inline implementations and consolidate.
9. **Rename `animations.jsx`** to `Animations.jsx` for naming consistency.
10. **Document the design system** — the `DesignSystemDemo.jsx` exists but there's no written documentation for when to use which token or component.

---

## Appendix: Token Architecture

```
design-tokens.css (CSS custom properties)  ← source of truth
       ↓
tailwind.config.js (extends Tailwind)      ← maps tokens to utility classes
       ↓
components/ui/* (base components)          ← consume tokens via Tailwind + isDark prop
       ↓
components/* (page components)             ← compose UI components, pass isDark + couleur
```

**What's working well:**
- Token file is comprehensive (colors, spacing, typography, radius, shadows, z-index, transitions)
- Dark mode CSS variable inversion is elegant
- UI component library covers core needs (30+ components)
- `isDark` prop threading is well-established (79%)
- `couleur` accent system works correctly via inline styles
- Zero React Router leakage — `setPage` pattern is 100% consistent

**What needs fixing:**
- Tokens exist but aren't consistently consumed (hardcoded values bypass them)
- Three z-index systems create confusion
- Blue and purple colors are heavily used but have no tokens
- Status/category color maps are duplicated across 10+ files
- `dark:` Tailwind classes violate the architecture in 12 files
