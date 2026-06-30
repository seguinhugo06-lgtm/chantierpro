# Design Critique — Module 3 : Planning + MemosPage

**Fichiers** : `src/components/Planning.jsx` (1 681 lignes), `src/components/MemosPage.jsx` (1 884 lignes), `src/components/Calendar.jsx` (899 lignes)
**Total** : 4 464 lignes — 3 composants interdépendants
**Date** : 2026-03-25

---

## Score global : 62 / 100

| Dimension | Score | Commentaire |
|-----------|-------|-------------|
| Utilisabilité | 14/20 | 4 vues planning bien conçues, mais Memos inbox surchargé (5 sections) |
| Hiérarchie visuelle | 13/20 | Bonne structure par vue, mais contrôles header trop denses |
| Cohérence | 15/20 | Dark mode ✅ parfait, z-index cohérent, icônes standards |
| Accessibilité | 8/20 | Checkboxes subtasks 16px, divs cliquables, 9px text, touch targets |
| Responsive | 12/20 | Bon effort mobile (bottom sheets, hidden actions), mais grilles serrées |

---

## 1. Utilisabilité

### Forces
- **4 vues planning distinctes** (mois, semaine, jour, agenda) couvrant tous les cas d'usage
- **Tooltips adaptatifs** : popovers en desktop, bottom sheets en mobile — excellent pattern
- **MemosPage tabs** (Inbox / Today) offrent un tri rapide
- **Voice input** via Web Speech API dans MemosPage — feature différenciante
- **Auto-save debounced** sur les memos — UX moderne

### Problèmes
- **Inbox surchargé** : 5 sections collapsibles (En retard / Aujourd'hui / À venir / Sans date / Terminées) = surcharge cognitive. Un nouvel utilisateur ne sait pas par où commencer.
- **Pas d'onboarding** pour expliquer les 4 vues du Planning ni les sections Memos
- **Quick add interaction** : cliquer sur un jour pour ajouter un événement est discoverable mais non indiqué (pas de hint visuel)
- **Bulk actions via emojis** (🗑️📅🔴) : peu conventionnel, manque de labels texte

---

## 2. Hiérarchie visuelle

### Forces
- **Header structuré** : titre + filtres + sélecteur de vue forment un flow logique
- **Légende couleur** des types d'événements (rdv, relance, urgence, memo, deadline)
- **KPI stats bar** dans MemosPage avec 4 cartes métriques

### Problèmes
- **3 zones de contrôle simultanées** dans Planning header : filtres + sélecteur de vue + légende → l'œil ne sait pas où se poser
- **Sections MemosPage** toutes visuellement identiques — les sections "En retard" et "Aujourd'hui" devraient être plus marquées visuellement (couleur de fond, bordure)
- **Stats bar** : 4 KPI cards en haut prennent de l'espace sur mobile avant même le contenu

---

## 3. Cohérence

### Forces
- **Dark mode 100% conforme** : aucune violation `dark:` Tailwind. Utilise `isDark` partout.
- **Z-index cohérent** : z-10 (sticky), z-40 (backdrop), z-50 (modals) — bien stratifié
- **Icônes standardisées** : tailles 10/12/14/16/18/20/32 via lucide-react
- **Spacing patterns** : gap-1.5 à gap-3, py-2.5 à py-4 — régulier

### Problèmes
- **Couleurs hex inline** dans Planning.jsx :
  - Ligne 754 : `style={{ borderColor: isDark ? '#334155' : '#e2e8f0' }}` — devrait être une classe Tailwind
  - Ligne 1139 : `style={{ backgroundColor: isDark ? '#475569' : '#cbd5e1' }}` — idem
- **Event type colors** (lignes 197-250) : hardcodées dans le composant au lieu d'un fichier de constantes partagé
- **MemosPage category/priority colors** (lignes 17-28) : aussi hardcodées localement

---

## 4. Accessibilité (point faible principal)

### 🔴 Critiques

| Problème | Fichier | Lignes | Détail |
|----------|---------|--------|--------|
| Subtask checkbox 16×16px | MemosPage | 289 | `w-4 h-4` = 16px, WCAG 2.5.5 exige 44px min |
| Delete subtask button ~16px | MemosPage | 306 | `p-0.5` = ~16px — inaccessible |
| Text 9px | Planning | 635, 1077, 1079 | `text-[9px]` dans vue mois et agenda — illisible |
| Divs cliquables sans role | Planning | 606, 1071 | `<div onClick>` sur cellules jour et items agenda |
| Divs cliquables sans role | MemosPage | 121 | MemoItem est un `<div onClick>` |
| Calendar modal sans focus trap | Calendar | 172-275 | RescheduleModal n'a ni Escape ni focus trap |

### 🟡 Importants

| Problème | Fichier | Lignes | Détail |
|----------|---------|--------|--------|
| Back button 40×40px | Planning | 442 | `min-w-[40px] min-h-[40px]` → devrait être 44px |
| Event button 40×40px | Planning | 555 | `w-10 h-10` = 40px |
| Nav buttons 36×36px | Planning | 568, 580 | `w-9 h-9` = 36px |
| Day circles 20-24px | Planning | 609 | `w-5 h-5 sm:w-6 sm:h-6` — trop petit pour le tap |
| Day selector 32px | Planning | 1602 | Jours de récurrence `w-8 h-8` |
| Quick action emojis sans aria-label | MemosPage | 214-228 | 🗑️📅🔴 non labellisés pour screen readers |
| Bulk action emojis sans aria-label | MemosPage | 868-893 | Même problème en mode sélection |
| Memo checkbox 20px | MemosPage | 126 | `w-5 h-5` au minimum — un peu juste |

### ✅ Bonnes pratiques constatées
- Focus trap implémenté sur les modals Planning et MemosPage
- Escape key handlers présents
- `aria-label="Retour au tableau de bord"` sur le bouton retour
- `aria-label="Marquer comme fait/non fait"` sur les checkboxes principaux

---

## 5. Responsive

### Forces
- **Planning** : viewMode auto détecté (`window.innerWidth < 640 → 'week'`)
- **MemosPage** : Quick actions hidden sur mobile (`hidden sm:flex`) — bon choix
- **Stats cards** : `grid-cols-2` s'adapte bien
- **Tooltip** : bottom sheet sur mobile, popover sur desktop
- **Detail panel** : `md:max-w-md` pour ne pas écraser sur mobile

### Problèmes
- **Vue semaine sur mobile** : 7 colonnes dans une grille hourly = texte tronqué à 9px
- **Day number circles** (20-24px) trop petits pour le tap mobile
- **Planning header** : filtres + sélecteur de vue + légende s'empilent mal sous 400px
- **Bulk action bar** en position `fixed bottom` peut confliter avec le clavier mobile

---

## 5 Recommandations prioritaires

### P0 — Accessibilité critique
**Corriger les touch targets sous-dimensionnés et les éléments non-sémantiques.**
Les subtask checkboxes à 16px et les divs cliquables sans role sont des violations d'accessibilité bloquantes. Toute la chaîne Memos (MemoItem, SubtaskList) et les cellules Calendar doivent être des boutons natifs.

### P1 — Typographie minimum
**Éliminer le text-[9px] dans Planning.**
3 occurrences de 9px font que les événements en vue mois et agenda sont illisibles sur mobile. Minimum 11px partout.

### P2 — Touch targets à 44px
**Harmoniser tous les boutons interactifs à 44px minimum.**
Back button, nav buttons, day circles, event color picker, day selector de récurrence — tous sous les 44px requis.

### P3 — Labels accessibles sur les actions emoji
**Ajouter aria-labels sur toutes les actions emoji** (quick actions + bulk actions dans MemosPage).
Les emojis 🗑️📅🔴 ne sont pas lus correctement par les screen readers.

### P4 — Centraliser les constantes couleur
**Extraire les couleurs event type et memo category/priority** dans un fichier `constants/colors.js` partagé.
Planning.jsx (lignes 197-250) et MemosPage.jsx (lignes 17-28) dupliquent des palettes similaires.
