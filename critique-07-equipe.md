# Design Critique — Module 7 : Equipe

**Fichier** : `src/components/Equipe.jsx` (5 129 lignes, 26 useState, 8 modals)
**Date** : 2026-03-25

---

## Score global : 52 / 100

| Dimension | Score | Commentaire |
|-----------|-------|-------------|
| Utilisabilité | 12/20 | 9 tabs couvrent tout, mais surcharge cognitive mobile |
| Hiérarchie visuelle | 12/20 | Cards employé bien structurées, mais 9 tabs = trop |
| Cohérence | 12/20 | Dark mode ✅, mais 40+ hex hardcodés, z-index dynamique risqué |
| Accessibilité | 6/20 | 8 modals sans focus trap, actions sans aria-label, couleur seule |
| Responsive | 10/20 | Labels tabs tronqués 10px, boutons 32px, nav semaine 32px |

---

## 1. Utilisabilité

### Forces
- **Chronomètre terrain** avec canvas SVG et pause/break tracking — feature puissante
- **Signature canvas** intégrée pour les pointages
- **Chat WhatsApp** intégré pour communication équipe
- **Congés management** avec historique et solde
- **Vue sous-traitants** en mode dédié

### Problèmes
- **5 129 lignes** = le plus gros composant de l'app. Ingérable.
- **9 tabs** (Overview, Planning, Pointage, Validation, Congés, WhatsApp, Compétences, Productivité, Export) — surcharge cognitive
- **Labels tabs** abrégés en mobile (`text-[10px]`) : "S-T", "Valid.", "Compét.", "Prod." — cryptiques
- **26 useState** + localStorage pour timers, signatures, congés, chat = état complexe

---

## 2. Accessibilité (score le plus bas)

### 🔴 Critiques

| Problème | Lignes | Détail |
|----------|--------|--------|
| 8 modals sans focus trap | 1399, 3130, 3683, 3850, 3987, 4116 | Focus peut s'échapper |
| 7 modals sans role="dialog" | Tous sauf Employee Detail (4135) | Manque aria-modal="true" |
| Quick actions sans aria-label | 2072-2100 | Play/Phone/Edit/Delete = title seulement |
| Backdrops sans role="presentation" | 1400, 3136, 3683, 3852, 3987, 4129 | 6 backdrops |
| Couleur seule status | 2061, 1854, 3430 | Dots vert/orange/rouge sans texte |
| Touch targets 32px | 1508, 1517 | Nav semaine w-8 h-8 |
| Touch targets actions | 2067-2100 | Quick actions p-2 sur icônes 14px |
| Tab min-h mobile 40px | 1819 | `min-h-[40px] sm:min-h-[44px]` → devrait être 44px partout |
| Text 10px mobile | 1831, 1835, 1600, 4878 | Labels tabs et badges |

### ✅ Bonnes pratiques
- `role="tablist"` / `role="tab"` sur la navigation tabs (ligne 1785-1807)
- `role="dialog"` sur Employee Detail modal (ligne 4135)
- Escape handler couvre les 8 modals (lignes 198-212)
- Dark mode 100% conforme — zéro `dark:`

---

## 3. Cohérence

### Problèmes majeurs
- **40+ hex hardcodés** : roleConfig (168-180), CONGE_TYPES (842-847), chrono gradients, WhatsApp colors, stats borders, chart palette (4450)
- **Tailles icônes** : 12, 14, 15, 16, 18, 20, 32px — 7 tailles différentes
- **z-index dynamique** (ligne 1601) : `zIndex: 3 - i` crée des valeurs 0-3 qui conflitent potentiellement

---

## 4. Responsive

### Forces
- Tabs scrollables avec gradient fade
- Boutons icon-only sur mobile (`w-11 h-11 sm:w-auto`)
- Canvas chronomètre responsive (`w-48 h-48 sm:w-56 sm:h-56`)

### Problèmes
- **Labels tabs 10px** = illisibles sur mobile
- **Nav semaine 32px** = trop petit pour le touch
- **9 tabs** dont 2-3 max visibles sur mobile = beaucoup de scroll

---

## 5 Recommandations prioritaires

### P0 — Focus trap + ARIA sur les 8 modals
Ajouter `role="dialog"`, `aria-modal="true"`, focus trap, et `role="presentation"` sur backdrops pour les 8 modals. Seul Employee Detail a role="dialog" actuellement.

### P1 — Aria-labels + touch targets
Ajouter aria-label sur les 4 quick action buttons (Play/Phone/Edit/Delete). Augmenter nav semaine de 32→44px. Tab min-height 40→44px sur mobile.

### P2 — Status indicators texte
Ajouter labels texte aux dots de statut couleur-seule (actif, en pause, pointage manuel).

### P3 — Centraliser les 40+ hex
Extraire roleConfig, CONGE_TYPES, chart palette, WhatsApp colors dans constants/colors.js.

### P4 — Labels tabs lisibles
Remplacer les abréviations cryptiques ("S-T", "Valid.") par des icônes avec tooltip, ou augmenter à text-xs (12px) minimum.
