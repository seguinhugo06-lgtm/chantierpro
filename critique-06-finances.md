# Design Critique — Module 6 : FinancesPage (Trésorerie, Bank, Paiements, Rapports, Export)

**Fichiers** : `FinancesPage.jsx` (185 l.), `TresorerieModule.jsx` (3 081 l.), `BankModule.jsx` (975 l.), `ExportComptable.jsx` (1 060 l.), `PaiementsTab.jsx` (431 l.), `RapportsTab.jsx` (363 l.)
**Total** : 5 910 lignes — 6 fichiers, 72 useState, 6 modals
**Date** : 2026-03-25

---

## Score global : 60 / 100

| Dimension | Score | Commentaire |
|-----------|-------|-------------|
| Utilisabilité | 14/20 | Architecture 6 tabs lazy-loaded, wizard onboarding, charts SVG |
| Hiérarchie visuelle | 13/20 | KPI cards responsive, mais tables non mobile-friendly |
| Cohérence | 15/20 | Dark mode ✅, z-index bien stratifié, spacing régulier |
| Accessibilité | 7/20 | Pas de focus trap, touch targets <44px, text-[9px], divs cliquables |
| Responsive | 11/20 | SVG responsive viewBox OK, mais tables scrollables sans vue card |

---

## 1. Utilisabilité

### Forces
- **6 onglets lazy-loaded** : Aperçu, Trésorerie, Banque, Paiements, Rapports, Export — bonne séparation
- **Wizard onboarding** dans Trésorerie avec 2 étapes guidées
- **Charts SVG** avec viewBox responsive
- **Encaissement widget** avec progressive disclosure (caché pendant wizard)
- **FAB button** (z-40) pour actions rapides

### Problèmes
- **TresorerieModule 3 081 lignes** avec 24 useState — composant monolithique
- **Tables** à `min-w-[640px]` obligent le scroll horizontal sur mobile
- **Settings** enterrés dans un dropdown menu — pas assez discoverable
- **50+ hex hardcodés** dans les charts SVG et status badges

---

## 2. Accessibilité (point faible majeur)

### 🔴 Critiques

| Problème | Fichier | Détail |
|----------|---------|--------|
| Pas de focus trap modals | TresorerieModule | 3 modals sans capture du focus |
| Divs cliquables | TresorerieModule:1802, BankModule | cursor-pointer sans role/tabIndex |
| Text-[9px] | AnalyticsPage:705 | Labels charts sous minimum WCAG |
| Close buttons ~28px | TresorerieModule:395,521,1746,1877 | `p-1.5` = trop petit |
| Checkbox 20px | TresorerieModule:1814 | `w-5 h-5` sous minimum |
| Status dots couleur seule | TresorerieModule:1889 | Point rouge/vert sans texte |
| Pas d'aria-expanded | TresorerieModule:1597, BankModule:541,589 | Dropdowns sans attribut |

### ✅ Bonnes pratiques
- Escape handler hiérarchique (TresorerieModule ligne 742)
- Backdrop click-to-close sur tous les modals
- Z-index bien stratifié : z-20 → z-30 → z-40 → z-50

---

## 3. Responsive

### Forces
- Charts SVG avec `preserveAspectRatio="xMidYMid meet"` — bon
- KPI cards `p-3 sm:p-5` responsive
- Tabs labels cachés sur mobile (icônes seules)
- Font sizes responsive `text-lg sm:text-2xl`

### Problèmes
- **Tables min-w-[640px]** : scroll horizontal obligatoire sur mobile
- **Filter dropdown** à `minWidth: 260px` peut déborder sur petits écrans portrait
- **Wizard** plein width — devrait être modal sur mobile

---

## 5 Recommandations prioritaires

### P0 — Focus trap + ARIA modals
Ajouter focus trap, `role="dialog"`, `aria-modal="true"` sur les 3 modals TresorerieModule.

### P1 — Touch targets
Close buttons `p-1.5` → `min-w-[44px] min-h-[44px]`. Checkbox `w-5 h-5` → wrapper 44px. Info button `p-1` → `p-2.5`.

### P2 — Divs cliquables + aria-expanded
Convertir les divs cursor-pointer en boutons sémantiques. Ajouter `aria-expanded` sur les dropdowns.

### P3 — Status indicators texte
Ajouter labels texte ou aria-label aux dots de statut couleur-seule (ligne 1889).

### P4 — Vue card mobile tables
Ajouter une alternative card-based pour les tables sur écrans <640px.
