# Design Critique — Module 5 : Catalogue

**Fichier** : `src/components/Catalogue.jsx` (2 971 lignes, 60 useState, 9 modals)
**Date** : 2026-03-25

---

## Score global : 58 / 100

| Dimension | Score | Commentaire |
|-----------|-------|-------------|
| Utilisabilité | 13/20 | 7 tabs riches, scanner barcode innovant, mais table non mobile-friendly |
| Hiérarchie visuelle | 13/20 | Stats bar utile, tabs avec badges, mais actions table invisibles au clavier |
| Cohérence | 14/20 | Dark mode ✅, z-index OK, mais 16+ hex hardcodés et icônes incohérentes |
| Accessibilité | 8/20 | Bons ARIA tabs (role=tablist), mais modals sans focus trap, divs cliquables |
| Responsive | 10/20 | Tabs scrollables OK, mais table sans vue card mobile |

---

## 1. Utilisabilité

### Forces
- **7 tabs** (Articles, Fournisseurs, Mouvements, Packs, Favoris, Inventaire, Coefs) couvrent tous les workflows catalogue
- **Scanner barcode** intégré — feature différenciante pour le BTP
- **CSV import/export** bien intégré
- **Onboarding** avec étapes guidées
- **Prix flash** et gestion multi-fournisseurs

### Problèmes
- **60 useState** = composant ingérable. Refactoring urgent nécessaire.
- **Table articles** sans vue card mobile : sur écran <640px l'utilisateur doit scroller horizontalement
- **Actions table** (edit/delete/devis) en `opacity-0 group-hover:opacity-100` → invisibles au clavier et inaccessibles au touch mobile
- **9 modals** empilés dans un seul composant sans gestion de priorité

---

## 2. Hiérarchie visuelle

### Forces
- **Stats bar 5 colonnes** (Total, Stock, Marge moy, Alertes, Favoris) — bon overview
- **Category filter** en chips scrollables avec gradient fade
- **Badges compteurs** sur les tabs

### Problèmes
- **Actions cachées** : les boutons edit/delete/add-to-devis ne sont visibles qu'au hover de la ligne table
- **Stock low indicator** (ligne ~1822) = point rouge seul sans texte ni aria-label
- **Trop d'info par ligne table** : nom + prix vente + prix achat + marge + stock + actions

---

## 3. Cohérence

### Forces
- **Dark mode 100% conforme** — aucune violation `dark:`
- **Escape handler hiérarchique** couvre les 9 modals (lignes 188-204)

### Problèmes
- **16+ hex hardcodés** : marge colors (lignes 476-481), stock colors (ligne 2563), boutons (ligne 990)
- **Tailles d'icônes très dispersées** : 10, 12, 14, 16, 18, 20, 22, 24, 32, 40, 48px — 11 tailles différentes
- **Tous les modals en z-50** : si un modal s'ouvre au-dessus d'un autre, pas de distinction

---

## 4. Accessibilité

### ✅ Bonnes pratiques
- `role="tablist"` / `role="tab"` / `aria-selected` sur les tabs (ligne 1696-1707)
- `role="progressbar"` avec aria-valuenow/min/max (ligne 1226)
- `aria-expanded` sur les filtres (ligne 1642)
- `aria-pressed` sur favoris (ligne 1816)
- `aria-live="polite"` + `role="status"` sur compteur (ligne 2649)

### 🔴 Problèmes critiques
- **Modals sans focus trap** : le focus peut s'échapper vers le contenu derrière
- **Pas d'autoFocus** cohérent : certains modals l'ont (lien search, prix), d'autres non (article form, fournisseur form)
- **Ligne ~1556** : div cliquable avec onClick mais sans role="button"
- **Ligne ~1813** : `<tr>` cliquable avec onClick mais sans role
- **Actions table** (lignes 1854-1857) en opacity-0 = inaccessibles au clavier
- **Boutons close modals** (lignes 2043, 2797) à ~28-32px — sous 44px
- **Stock buttons** (lignes 1296, 1298) à 40px — sous 44px

---

## 5. Responsive

### Forces
- Tabs scrollables avec gradient fade sur mobile
- Stats bar responsive (5→2 colonnes)
- `min-h-[44px]` sur les tab buttons

### Problèmes
- **Table articles** : `hidden sm:table-cell` masque les colonnes mais pas de vue card alternative
- **Menu mobile** (w-56) peut déborder sur petits écrans (<360px)
- **Close banner** (ligne 1759) à ~28px touch target

---

## 5 Recommandations prioritaires

### P0 — Focus trap modals + actions table accessibles
Implémenter un focus trap sur les 9 modals. Rendre les actions table (edit/delete/devis) visibles et accessibles au clavier (retirer le pattern opacity-0 hover-only).

### P1 — Touch targets
Corriger les boutons close modals (~28px → 44px), stock +/- (40px → 44px), et banner close.

### P2 — Vue card mobile pour la table articles
Ajouter une alternative card pour mobile au lieu du scroll horizontal table.

### P3 — Centraliser les couleurs
Extraire les 16+ hex dans un objet constants (marge colors, stock colors, prix).

### P4 — Standardiser les icônes
Réduire de 11 tailles à 3 paliers : 14px (compact), 18px (standard), 24px (hero).
