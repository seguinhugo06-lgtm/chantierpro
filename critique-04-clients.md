# Design Critique — Module 4 : Clients

**Fichiers** : `src/components/Clients.jsx` (2 419 lignes), `src/components/QuickClientModal.jsx` (602 lignes), `src/components/dashboard/TopClientsWidget.jsx` (112 lignes)
**Total** : 3 133 lignes — 3 fichiers
**Date** : 2026-03-25

---

## Score global : 66 / 100

| Dimension | Score | Commentaire |
|-----------|-------|-------------|
| Utilisabilité | 15/20 | Bonne architecture liste/detail/form, KPI cliquables, détection doublons |
| Hiérarchie visuelle | 14/20 | Cards bien structurées, tabs detail clairs, mais cards un peu chargées |
| Cohérence | 16/20 | Dark mode ✅ parfait, z-index bien géré, spacing régulier |
| Accessibilité | 9/20 | Touch targets 32-40px, divs cliquables, text-[9px], aria-labels manquants |
| Responsive | 12/20 | Bon effort mobile, mais touch targets desktop sous-dimensionnés |

---

## 1. Utilisabilité

### Forces
- **Architecture 3 vues** (liste / detail / formulaire) bien structurée et intuitive
- **KPI cards cliquables** pour filtrer la liste — excellent pattern de progressive disclosure
- **Détection de doublons** avec banner intelligent et actions guidées (Merge/Compare)
- **QuickClientModal** avec retry de focus et portail — UX soignée
- **Escape handler hiérarchique** (ligne 132-145) : ferme le modal le plus intérieur d'abord
- **Vue grille / liste** toggle — offre le choix à l'utilisateur

### Problèmes
- **Cards trop chargées** : avatar + nom + entreprise + 4-5 badges + téléphone + 2 boutons action + 4 stats = beaucoup d'info par carte
- **Pas de compteur de résultats** visible lors d'une recherche filtrée — l'utilisateur doit compter visuellement
- **Filtre type** en dropdown vs **filtre statut** en pills : UX incohérente entre deux filtres au même niveau

---

## 2. Hiérarchie visuelle

### Forces
- **Header sticky** dans la vue detail avec nom + badges = repère permanent
- **Tabs dans le detail** (Historique, Documents, Chantiers, Memos, Activité, Photos) bien organisés
- **3 boutons d'action featured** (GPS, Appel, SMS) avec gradients — visuellement prioritaires
- **Duplicate banner** avec couleur orange — attire l'attention au bon moment

### Problèmes
- **Score badge** (VIP/Régulier/Occasionnel/Dormant) utilise des couleurs hex hardcodées (ligne 2139) sans explication de la signification pour l'utilisateur
- **Stats dans les cards** (Devis/Factures/CA/Chantiers) toutes au même poids visuel — le CA devrait être plus proéminent

---

## 3. Cohérence

### Forces
- **Dark mode 100% conforme** : zéro violation `dark:` Tailwind. Utilise `isDark` + ternaire partout.
- **Z-index bien stratifié** : z-20 (sticky) → z-30 (dropdown backdrop) → z-40 (dropdown content) → z-50 (modals)
- **Spacing régulier** : gap-1 à gap-4, p-1.5 à p-6, border-radius cohérent
- **Modals bien gérés** : Escape hiérarchique, backdrop click, focus auto dans QuickClientModal

### Problèmes
- **20+ couleurs hex hardcodées** dans le composant :
  - `CHANNEL_CONFIG` (lignes 94-100) : 5 hex pour email/sms/whatsapp/appel/visite
  - Gradients boutons action (lignes 625-655) : 6 hex
  - KPI / timeline (lignes 709-717) : 4 hex
  - Score badges (ligne 2139) : 5 hex pour vip/regulier/occasionnel/dormant/nouveau
- **Tailles d'icônes incohérentes** : size={10}, size={12}, size={14}, size={18}, size={20} sans convention claire

---

## 4. Accessibilité (point faible)

### 🔴 Critiques

| Problème | Fichier | Lignes | Détail |
|----------|---------|--------|--------|
| Text 9px | Clients | ~1812 | `text-[9px]` sur sous-titre KPI — illisible |
| Divs cliquables | Clients | ~1035 | Card chantier avec `onClick` + `cursor-pointer`, pas de role/tabIndex |
| Divs cliquables | Clients | ~1091 | Card document avec `onClick`, pas de sémantique |
| Divs cliquables | Clients | ~1505 | Card photo avec `onClick`, pas de sémantique |

### 🟡 Importants

| Problème | Fichier | Lignes | Détail |
|----------|---------|--------|--------|
| Touch target 40px | Clients | ~585 | Back button `min-w-[40px] min-h-[40px]` → 44px |
| Touch target 40px | Clients | ~609 | Delete button `min-w-[40px] min-h-[40px]` → 44px |
| Toggle buttons ~24px | Clients | ~1915, 1923 | Grid/List toggle `p-1.5` = ~28px |
| Desktop buttons 32px | Clients | ~2190, 2193 | Call/WhatsApp `sm:w-8 sm:h-8` = 32px desktop |
| Checkbox 20px | Clients | ~1401 | `w-5 h-5` — juste au minimum |
| Close echange sans size | Clients | ~1268 | `p-2` sans min-w/min-h explicite |
| 12+ text-[10px] | Clients | multiples | Badges, labels, compteurs à 10px |
| 6+ aria-labels manquants | Clients | ~585, 609, 1758, 1767, 1906, 1915 | Boutons icône sans description |
| Indicateurs couleur seule | Clients | ~1037, 1091 | Status dots sans texte alternatif |

### ✅ Bonnes pratiques
- Client card principale (ligne 2116) : `role="article"`, `aria-label`, `tabIndex={0}`, `onKeyDown` — exemplaire
- Checkbox memo : `aria-label="Marquer comme fait"`
- QuickClientModal : focus auto avec retry, Escape handler, backdrop click

---

## 5. Responsive

### Forces
- **Grid responsive** : 1 col mobile → 2 cols tablet → 3 cols desktop
- **Status pills** avec `overflow-x-auto` sur mobile
- **Call/WhatsApp buttons** : `w-11 h-11 sm:w-8 sm:h-8` — plus grand en mobile (bon)
- **QuickClientModal** : bottom sheet mobile, centered dialog desktop
- **Search** : full width mobile, flex-1 tablet+

### Problèmes
- **Desktop call/WhatsApp** à 32px (sm:w-8) reste sous les 44px minimum pour les utilisateurs tactiles sur laptop
- **Grid/List toggle** à ~28px — difficile à toucher sur écran tactile
- **Cards denses** : sur mobile 320px, le contenu (badges + stats + boutons) peut se comprimer

---

## 5 Recommandations prioritaires

### P0 — Touch targets et sémantique HTML
**Corriger les divs cliquables et les touch targets sous-dimensionnés.**
3 divs cliquables sans role/tabIndex (chantier, document, photo cards) + 4 boutons sous 44px. La card client principale est exemplaire (role="article", tabIndex, onKeyDown) — appliquer ce même pattern partout.

### P1 — Typographie minimum
**Éliminer text-[9px] et réduire les text-[10px].**
1 occurrence de 9px (KPI sous-titre) + 12+ de 10px. Minimum 11px partout, idéalement 12px pour les labels informatifs.

### P2 — Aria-labels sur boutons icône
**Ajouter aria-label sur les 6+ boutons sans description.**
Back, Delete, Import, Nouveau client, Clear search, Grid/List toggle — tous manquent de label accessible.

### P3 — Centraliser les couleurs
**Extraire les 20+ hex hardcodés dans un fichier constants/colors.js.**
CHANNEL_CONFIG, score badges, KPI colors, gradient colors — tout devrait être dans un objet centralisé et partagé.

### P4 — Ajouter un compteur de résultats
**Afficher "X clients" à côté de la barre de recherche** quand un filtre est actif.
L'utilisateur ne sait pas combien de résultats sa recherche retourne sans compter manuellement.
