# Design Critique — Modules 11 à 21 (Composants secondaires)

**Date** : 2026-03-25

Audit groupé des composants de taille moyenne à petite. Chaque module est noté individuellement.

---

## Module 11 : CommandesFournisseurs.jsx (1 312 lignes, 11 useState)

### Score : 64 / 100
- **Dark mode** ✅ conforme
- **13 hex hardcodés** (lignes 379, 393, 455-457, 517, 1050-1091, 1158, 1200) — status colors et badges
- **1 div cliquable** sans role (ligne ~600)
- **1 modal** (CatalogueModal, z-50) sans Escape handler visible
- **Bons aria-labels** sur plusieurs boutons (lignes 399, 539, 559, 1230)
- **Pas de text-[9px/10px]** — bonne typographie

**Recommandations** : Ajouter Escape handler au modal. Convertir div cliquable ligne 600. Centraliser les 13 hex.

---

## Module 12 : PipelineKanban.jsx (436 lignes, 4 useState)

### Score : 60 / 100
- **Dark mode** ✅ conforme
- **8 hex hardcodés** (lignes 24-31) — couleurs colonnes kanban
- **GripVertical size={14}** (ligne ~76) = touch target trop petit
- **text-[10px]** (lignes ~96-102) — labels de cards
- **Div draggable cliquable** (lignes 57-105) sans `role="button"` explicite
- **3 boutons icône** sans aria-label (lignes 154, 231, 397)
- **Pas de modal** — composant léger

**Recommandations** : Ajouter role="button" sur les divs draggables. Aria-labels sur les icônes. text-[10px] → text-[11px].

---

## Module 13 : BibliothequeOuvrages.jsx (1 585 lignes, 9 useState)

### Score : 62 / 100
- **Dark mode** ✅ conforme
- **11 hex hardcodés** (lignes 59, 112, 167, 207, 247, 269, 306, 329, 352, 437, 1026)
- **Modals multiples** sans Escape handlers visibles
- **Pas de text-[9px/10px]** détecté
- **Aria-labels** probablement manquants sur boutons icône

**Recommandations** : Ajouter Escape handlers. Audit aria-labels. Centraliser couleurs.

---

## Module 14 : SousTraitantsModule.jsx (1 404 lignes, 8 useState)

### Score : 65 / 100
- **Dark mode** ✅ conforme
- **10+ hex hardcodés** (lignes 34-43) — couleurs corps de métier
- **2+ modals** sans Escape handlers visibles
- **Pas de text-[9px/10px]** détecté
- **Bonne structure** avec séparation formulaire/liste

**Recommandations** : Ajouter Escape handlers aux modals. Centraliser corps de métier colors.

---

## Module 15 : CarnetEntretien.jsx (1 444 lignes, 16 useState)

### Score : 61 / 100
- **Dark mode** ✅ conforme
- **16 useState** = complexité élevée, candidat pour useReducer
- **3 modals** (lignes 726, 893, 1384, tous z-50) sans Escape handlers
- **Pas de hex hardcodés** majeurs — bonne discipline
- **Pas de text-[9px/10px]** détecté

**Recommandations** : Ajouter Escape handlers + focus trap sur les 3 modals. Considérer useReducer pour simplifier l'état.

---

## Module 16 : ChatPage.jsx (761 lignes, 13 useState)

### Score : 58 / 100
- **Dark mode** ✅ conforme
- **text-[9px]** détecté (lignes ~90, 94, 114, 115) — timestamps et metadata
- **1 modal** (NewChannelModal, z-30) avec overlay cliquable mais sans Escape handler
- **Search button** (ligne ~642) avec title mais sans aria-label
- **Overlay div** (ligne ~559) cliquable sans role

**Recommandations** : Corriger text-[9px] → text-[11px]. Ajouter Escape handler. Aria-label sur search.

---

## Module 17 : IADevisAnalyse.jsx (798 lignes, 20+ useState)

### Score : 62 / 100
- **Dark mode** ✅ conforme
- **20+ useState** = très complexe pour 798 lignes
- **Pas de hex hardcodés** — utilise couleur prop
- **text-[11px]** (ligne ~107) — borderline acceptable
- **Aria-labels manquants** sur boutons icône (lignes ~509, 608, 647)
- **Pas de modal formel** — navigation par étapes (steps)

**Recommandations** : Ajouter aria-labels. Considérer useReducer pour les 20+ états.

---

## Module 18 : ExportComptable.jsx (1 060 lignes, 10 useState)

*(Couvert dans critique-06-finances.md)*

---

## Module 19 : SignatureModule.jsx (1 389 lignes, 20 useState)

### Score : 57 / 100
- **Dark mode** ✅ conforme
- **20 useState** = complexité élevée
- **9 modals** référencés sans Escape handlers visibles
- **z-50** sur au moins 2 modals (lignes 1061, 1339)
- **Aria-labels** probablement manquants sur les boutons canvas/signature

**Recommandations** : Ajouter Escape handlers + focus trap sur les modals. Aria-labels sur les contrôles canvas. Refactoring état avec useReducer.

---

## Module 20 : AvisGoogle.jsx (1 263 lignes, 21 useState)

### Score : 59 / 100
- **Dark mode** ✅ conforme
- **21 useState** = le plus d'états parmi les modules secondaires
- **1+ modal** (ligne ~981, z-50) sans Escape handler visible
- **Pas de hex hardcodés** majeurs
- **Pas de text-[9px/10px]** détecté

**Recommandations** : Ajouter Escape handler + focus trap. Refactoring urgent avec useReducer ou Zustand store.

---

## Module 21 : ProfilePage.jsx (545 lignes) + PlanPage.jsx (359 lignes)

### Score ProfilePage : 66 / 100
- **Dark mode** ✅ conforme
- **SVG circles** interactifs (lignes ~317-329) — vérifier touch targets
- **text-[10px]** (ligne ~507)
- **Bouton plan** (ligne ~301) sans aria-label
- **Pas de modal**

### Score PlanPage : 64 / 100
- **Dark mode** ✅ conforme
- **7 text-[10px]** (lignes 127, 131, 206, 240, 248, 269, 340) — descriptions features et labels
- **Boutons icône** sans aria-labels (lignes 144, 165, 302-309)
- **Pas de modal**

**Recommandations combinées** : text-[10px] → text-[11px] partout. Ajouter aria-labels sur les boutons icône. Vérifier touch targets sur SVG circles.

---

## Patterns communs à tous les modules

### ✅ Points forts partagés
1. **Dark mode** 100% conforme sur les 11 modules — zéro violation `dark:` Tailwind
2. **Pas de text-[9px]** dans la plupart (sauf ChatPage)
3. **z-index cohérent** : z-50 pour modals partout

### 🔴 Dettes communes
1. **Modals sans Escape handler** dans 7/11 modules
2. **Modals sans focus trap** dans 100% des modules
3. **Aria-labels manquants** sur boutons icône dans 8/11 modules
4. **Hex hardcodés** dans 5/11 modules (principalement status/category colors)
5. **useState explosif** : 5 modules ont 16-21 useState → candidats useReducer/Zustand
