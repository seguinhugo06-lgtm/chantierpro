# MÉGA AUDIT UI/UX - CHANTIERPRO
## Rapport Complet Mobile, Accessibilité & Wording

**Date:** 4 février 2026
**Version:** 2.0
**Auditeur:** Claude

---

## RÉSUMÉ EXÉCUTIF

| Domaine | Score | Problèmes | Critiques |
|---------|-------|-----------|-----------|
| **Mobile/Responsive** | 6.5/10 | 28 | 8 |
| **Formulaires Mobile** | 6/10 | 14 | 6 |
| **Accessibilité** | 7/10 | 15 | 3 |
| **Wording FR** | 8.5/10 | 9 | 0 |
| **TOTAL** | **7/10** | **66** | **17** |

### Problèmes Critiques Identifiés
1. **Touch targets < 44px** sur mobile (WCAG AA non conforme)
2. **Tables sans scroll horizontal** (dépassement sur mobile)
3. **~70 inputs sans `<label>` associé** (accessibilité critique)
4. **5 images avec alt=""** (lecteurs d'écran)
5. **Modals dépassent viewport** sur petits écrans
6. **Z-index incohérents** (40, 50, 60, 100 mélangés)

---

## PARTIE 1: AUDIT MOBILE/RESPONSIVE

### 1.1 Touch Targets (CRITIQUE - WCAG 2.5.5)

**Norme:** Minimum 44x44px pour tous les éléments interactifs

| Fichier | Ligne | Élément | Taille Actuelle | Recommandation |
|---------|-------|---------|-----------------|----------------|
| App.jsx | 602 | Menu button mobile | 40x40px | `min-w-[44px] min-h-[44px]` |
| App.jsx | 655-656 | Search button | 40x40px | `min-w-[44px] min-h-[44px]` |
| App.jsx | 665 | Theme toggle | 40x40px | `min-w-[44px] min-h-[44px]` |
| App.jsx | 685 | Mode discret | 40x40px | `min-w-[44px] min-h-[44px]` |
| Planning.jsx | 299 | Event badge | ~32px hauteur | `py-2 min-h-[44px]` |
| DevisPage.jsx | 1213 | Payment button | 40px | `min-h-[44px]` |
| Input.jsx | 543 | Select dropdown | h-10 (40px) | `min-h-[48px]` |

**Fix global recommandé:**
```jsx
// tailwind.config.js - Ajouter utility
theme: {
  extend: {
    minHeight: { 'touch': '44px' },
    minWidth: { 'touch': '44px' }
  }
}

// Utilisation
<button className="min-w-touch min-h-touch">
```

---

### 1.2 Tables Sans Scroll Horizontal (CRITIQUE)

| Fichier | Ligne | Table | Problème |
|---------|-------|-------|----------|
| DevisPage.jsx | 656 | Table HTML PDF | Pas de `overflow-x-auto` wrapper |
| DevisPage.jsx | 1452 | Table lignes devis | Pas de scroll wrapper |
| Catalogue.jsx | 350 | Table articles | Colonnes fixes débordent |

**Fix:**
```jsx
// Avant
<table className="w-full">...</table>

// Après
<div className="overflow-x-auto -mx-4 px-4">
  <table className="w-full min-w-[600px]">...</table>
</div>
```

---

### 1.3 Z-Index Chaos

**Hiérarchie actuelle (incohérente):**
```
z-10  → Hero section login
z-30  → Header sticky
z-40  → Overlays (backdrop)
z-50  → Sidebar, dropdowns
z-60  → Help modal
z-100 → Notifications
```

**Solution - Créer `/src/constants/zIndex.js`:**
```javascript
export const Z_INDEX = {
  base: 0,
  dropdown: 10,
  sticky: 20,
  overlay: 30,
  sidebar: 40,
  modal: 50,
  toast: 60,
  tooltip: 70
};
```

---

### 1.4 Breakpoints Problématiques

| Fichier | Ligne | Problème | Fix |
|---------|-------|----------|-----|
| App.jsx | 622 | `hidden xs:flex` - breakpoint `xs` n'existe pas | `hidden sm:flex` |
| App.jsx | 643 | Search bar `w-[280px]` fixe | `w-full max-w-[280px]` |
| Planning.jsx | 291-292 | Calendar cells `min-h-[80px]` trop grand | `min-h-[60px] sm:min-h-[80px]` |
| Planning.jsx | 330 | Week sidebar `w-20` trop étroit | `w-16 sm:w-24` |

---

### 1.5 Modals Viewport (CRITIQUE)

**Problème:** Sur iPhone SE (375x667), les modals dépassent l'écran

| Fichier | Ligne | Modal | Problème | Fix |
|---------|-------|-------|----------|-----|
| DevisWizard.jsx | 283 | Wizard | `max-h-[95vh]` sans keyboard | `max-h-[85vh] sm:max-h-[95vh]` |
| DevisPage.jsx | 1672 | PDF preview | `h-[90vh]` fixe | `max-h-[80vh] sm:max-h-[90vh]` |
| DevisPage.jsx | 1585 | Modal PDF | `max-w-4xl` sur mobile | `w-[95vw] max-w-4xl` |

**Pattern recommandé pour modals mobile:**
```jsx
<div className={cn(
  "fixed inset-0 z-50",
  "flex items-end sm:items-center justify-center",
  "p-0 sm:p-4"
)}>
  <div className={cn(
    "w-full sm:max-w-lg",
    "max-h-[85vh] sm:max-h-[90vh]",
    "rounded-t-2xl sm:rounded-2xl",
    "overflow-hidden"
  )}>
```

---

## PARTIE 2: AUDIT FORMULAIRES MOBILE

### 2.1 Inputs Taille Tactile

**Problème:** Inputs `h-10` (40px) difficiles à toucher

| Composant | Hauteur Actuelle | Recommandation |
|-----------|------------------|----------------|
| Input.jsx (text) | h-10 | `h-12 sm:h-10` |
| Input.jsx (select) | h-10 | `h-12 sm:h-10` |
| QuickClientModal | py-3 (~40px) | `py-4 sm:py-3` |

**Important iOS:** Inputs < 16px font-size causent zoom automatique
```jsx
// Ajouter sur tous les inputs mobile
className="text-base sm:text-sm" // 16px mobile, 14px desktop
```

---

### 2.2 Boutons Modals Trop Proches

| Fichier | Ligne | Gap | Problème |
|---------|-------|-----|----------|
| QuickClientModal.jsx | 330 | `gap-3` (12px) | Boutons côte à côte difficiles |
| DevisWizard.jsx | 727 | `gap-3` (12px) | Actions navigation serrées |

**Fix - Empiler sur mobile:**
```jsx
<div className="flex flex-col sm:flex-row gap-3 sm:gap-2">
  <Button className="w-full sm:w-auto">Annuler</Button>
  <Button className="w-full sm:w-auto">Confirmer</Button>
</div>
```

---

### 2.3 Labels et Espacement

**Problème:** Labels `mb-1` ou `mb-2` trop serrés sur mobile

```jsx
// Avant
<label className="text-sm mb-1">Nom</label>
<input />

// Après
<label className="text-sm mb-2 sm:mb-1.5 block">Nom</label>
<input className="h-12 sm:h-10" />
```

---

### 2.4 Keyboard Avoiding (iOS)

**Problème:** Pas de gestion du clavier virtuel

**Solution:**
```jsx
// Hook useKeyboardAvoiding
useEffect(() => {
  const handleFocus = (e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
      setTimeout(() => {
        e.target.scrollIntoView({ block: 'center', behavior: 'smooth' });
      }, 300);
    }
  };
  document.addEventListener('focusin', handleFocus);
  return () => document.removeEventListener('focusin', handleFocus);
}, []);
```

---

## PARTIE 3: AUDIT ACCESSIBILITÉ

### 3.1 Inputs Sans Labels (CRITIQUE)

**~70 inputs sans `<label htmlFor>` associé**

| Fichier | Nombre | Exemple |
|---------|--------|---------|
| Settings.jsx | ~30 | `<input placeholder="Ex: Dupont">` |
| Equipe.jsx | ~20 | `<input placeholder="Dupont">` |
| QuickChantierModal.jsx | ~15 | `<input placeholder="...">` |
| Chantiers.jsx | ~5 | `<input placeholder="€ HT">` |

**Fix Pattern:**
```jsx
// Avant (NON ACCESSIBLE)
<input placeholder="Nom" />

// Après (ACCESSIBLE)
<label htmlFor="client-name" className="sr-only">Nom du client</label>
<input id="client-name" placeholder="Nom" aria-label="Nom du client" />

// Ou utiliser le composant Input.jsx qui gère tout
<Input label="Nom" id="client-name" />
```

---

### 3.2 Images Sans Alt Text

| Fichier | Ligne | Type | Fix |
|---------|-------|------|-----|
| Chantiers.jsx | 1118 | Photo aperçu | `alt="Photo du chantier - [description]"` |
| Chantiers.jsx | 1227 | Lightbox | `alt={photo.description || "Photo chantier"}` |
| Clients.jsx | 466 | Photo client | `alt="Photo de ${client.nom}"` |
| marketplace/TransactionFlow.jsx | 803, 988 | Images | `alt="Image de la transaction"` |

---

### 3.3 Aria-labels Manquants

**Bonne couverture générale, mais quelques manques:**

```jsx
// Exemples à ajouter
<IconButton aria-label="Supprimer l'élément">
  <Trash2 />
</IconButton>

<IconButton aria-label="Modifier">
  <Edit2 />
</IconButton>
```

---

### 3.4 Focus Visible Mode Sombre

**Déjà corrigé dans Button.jsx** (ligne 57, 112):
```jsx
'focus-visible:ring-2 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900'
```

**À ajouter sur autres éléments interactifs** (liens, cards cliquables)

---

### 3.5 Skip Link Manquant

**Ajouter en haut de App.jsx:**
```jsx
<a
  href="#main-content"
  className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4
             focus:z-[100] focus:px-4 focus:py-2 focus:bg-white focus:text-slate-900
             focus:rounded-lg focus:shadow-lg focus:outline-none"
>
  Aller au contenu principal
</a>

// Et sur le main content
<main id="main-content" tabIndex={-1}>
```

---

## PARTIE 4: AUDIT WORDING FRANÇAIS

### 4.1 Accents Manquants (9 fautes)

| Texte Actuel | Texte Correct | Fichier | Ligne |
|--------------|---------------|---------|-------|
| "Semaine precedente" | "Semaine précédente" | Equipe.jsx | 821 |
| "Semaine suivante" | "Semaine suivante" | Equipe.jsx | 835 |
| "Reessayer" | "Réessayer" | PhotoUpload.jsx | 814 |
| "Facture scannee" | "Facture scannée" | InvoiceScanner.jsx | 265 |
| "Reduire" | "Réduire" | MorningBrief.jsx | 211 |
| "Notes supplementaires" | "Notes supplémentaires" | GanttView.jsx | 553 |
| "Decrivez" | "Décrivez" | DesignSystemDemo.jsx | 151 |
| "Retour a l'accueil" | "Retour à l'accueil" | Header.jsx | 156 |
| "cet employe" | "cet employé" | Equipe.jsx | 416 |

**Script de correction rapide:**
```bash
# Rechercher et remplacer
grep -rn "precedente" src/ | grep -v node_modules
grep -rn "Reessayer" src/ | grep -v node_modules
grep -rn "supplementaires" src/ | grep -v node_modules
```

---

### 4.2 Incohérences Terminologiques

| Actuel | Recommandé | Raison |
|--------|------------|--------|
| "Voir tout" / "Voir détails" | "Voir les détails" | Cohérence article défini |
| "Relancer" | "Envoyer une relance" | Action plus explicite |
| "4 dispo" | "4 disponibles" | Éviter abréviations |
| "marge moy." | "marge moyenne" | Éviter abréviations |
| "1 facture en attente" | "1 facture à encaisser" | Plus clair |

---

### 4.3 Messages UX à Améliorer

```jsx
// Avant
"Profil complété 7%"

// Après
"Complétez votre profil pour débloquer toutes les fonctionnalités (7%)"

// Avant
"2 actions en attente"

// Après
"2 actions à traiter aujourd'hui"

// Avant (état vide)
""

// Après
"Aucun devis pour le moment. Créez votre premier devis pour commencer !"
```

---

## PARTIE 5: PLAN D'ACTION PRIORISÉ

### Sprint 1 - CRITIQUES (Semaine 1)

| # | Tâche | Effort | Impact |
|---|-------|--------|--------|
| 1 | Standardiser touch targets 44x44px | 2h | Élevé |
| 2 | Wrapper tables `overflow-x-auto` | 1h | Élevé |
| 3 | Ajouter labels aux 70 inputs | 4h | Élevé |
| 4 | Corriger alt="" sur images | 30min | Moyen |
| 5 | Fix modals viewport mobile | 2h | Élevé |

**Total Sprint 1:** ~10h

---

### Sprint 2 - IMPORTANTS (Semaine 2)

| # | Tâche | Effort | Impact |
|---|-------|--------|--------|
| 6 | Centraliser z-index | 1h | Moyen |
| 7 | Corriger breakpoint xs→sm | 30min | Faible |
| 8 | Corriger 9 fautes accents | 30min | Faible |
| 9 | Boutons modals empilés mobile | 1h | Moyen |
| 10 | Skip link accessibilité | 30min | Moyen |

**Total Sprint 2:** ~4h

---

### Sprint 3 - AMÉLIORATIONS (Semaine 3-4)

| # | Tâche | Effort | Impact |
|---|-------|--------|--------|
| 11 | Hook keyboard avoiding | 2h | Moyen |
| 12 | Skeleton loaders | 3h | Faible |
| 13 | Persistance filtres URL | 2h | Moyen |
| 14 | Raccourcis clavier | 3h | Faible |
| 15 | Harmoniser wording | 2h | Faible |

**Total Sprint 3:** ~12h

---

## ANNEXES

### A. Commandes de Test

```bash
# Audit Lighthouse
npx lighthouse http://localhost:5173/?demo=true --view --preset=desktop
npx lighthouse http://localhost:5173/?demo=true --view --preset=mobile

# Audit accessibilité axe
npx @axe-core/cli http://localhost:5173/?demo=true

# Recherche de problèmes
grep -rn "min-w-\[40px\]" src/
grep -rn "min-h-\[40px\]" src/
grep -rn 'alt=""' src/
grep -rn "placeholder=" src/ | grep -v "label"
```

### B. Breakpoints Tailwind Référence

```
sm: 640px   → Tablette portrait
md: 768px   → Tablette paysage
lg: 1024px  → Desktop petit
xl: 1280px  → Desktop standard
2xl: 1536px → Desktop large
```

### C. Checklist Validation

- [ ] Tous les touch targets >= 44x44px
- [ ] Toutes les tables scrollables horizontalement
- [ ] Tous les inputs ont un label associé
- [ ] Toutes les images ont un alt text
- [ ] Modals ne dépassent pas sur mobile
- [ ] Focus visible sur tous les éléments interactifs
- [ ] Skip link fonctionnel
- [ ] Aucune faute d'accent
- [ ] Wording cohérent

---

*Rapport généré le 4 février 2026 - Audit complet ChantierPro v2.0*
