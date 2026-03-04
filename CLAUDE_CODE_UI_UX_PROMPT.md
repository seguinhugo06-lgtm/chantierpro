# Prompt Claude Code - Audit UI/UX ChantierPro

## Contexte
Application React de gestion BTP (devis, factures, chantiers) avec Tailwind CSS et Lucide icons.
Couleur principale: orange #F97316

---

## 🔴 CORRECTIONS CRITIQUES À APPLIQUER

### 1. Fautes d'accents corrigées (DÉJÀ FAIT)
Les corrections suivantes ont été appliquées dans le code:

```jsx
// Equipe.jsx - Ligne 565
- "Cout horaire charge" → "Coût horaire chargé"

// Equipe.jsx - Ligne 920
- "Cout semaine" → "Coût semaine"

// Equipe.jsx - Ligne 1235
- "employes" → "employés"

// Equipe.jsx - Ligne 507
- "Nouvel employe" → "Nouvel employé"

// Equipe.jsx - Ligne 744
- "Ajouter mon premier employe" → "Ajouter mon premier employé"

// Equipe.jsx - Ligne 793
- "Saisie groupee" → "Saisie groupée"

// Equipe.jsx - Ligne 1140
- "Rechercher un employe..." → "Rechercher un employé..."

// Equipe.jsx - Ligne 1257
- "Aucun employe trouve" → "Aucun employé trouvé"

// Equipe.jsx - Ligne 1765
- "Selectionner l'employe:" → "Sélectionner l'employé :"

// DevisPage.jsx - Ligne 1982
- "Cout d'achat" → "Coût d'achat"

// DevisPage.jsx - Ligne 1978
- "prive" → "privé"

// PhotoGallery.jsx - Ligne 318
- "Precedente" → "Précédente"

// QuickChantierModal.jsx - Ligne 500
- "Objectif de couts" → "Objectif de coûts"

// Chantiers.jsx - Ligne 920 (commentaire)
- "objectifs de couts" → "objectifs de coûts"
```

---

## 🟠 AMÉLIORATIONS UI/UX À IMPLÉMENTER

### 2. Touch Targets WCAG 2.5.5 (min 44x44px)

Rechercher et corriger tous les boutons/icônes avec taille < 44px:

```bash
# Trouver les touch targets trop petits
grep -rn "min-w-\[4[0-3]px\]\|w-[89]\|w-10\|p-1\s\|p-1\.5\|p-2\s" src/components/*.jsx
```

**Correction type:**
```jsx
// AVANT
<button className="p-2 rounded-lg">
  <Icon size={16} />
</button>

// APRÈS
<button className="p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg">
  <Icon size={18} />
</button>
```

**Fichiers prioritaires:**
- `src/components/Equipe.jsx` - Boutons d'action dans les cards
- `src/components/Clients.jsx` - Icônes téléphone/message/maps
- `src/components/Catalogue.jsx` - Boutons modifier/supprimer
- `src/App.jsx` - Navigation mobile

### 3. Labels manquants sur inputs (Accessibilité)

Ajouter `aria-label` ou `<label>` sur tous les inputs:

```jsx
// AVANT
<input placeholder="Rechercher..." />

// APRÈS (Option 1 - aria-label)
<input
  placeholder="Rechercher..."
  aria-label="Rechercher dans la liste"
/>

// APRÈS (Option 2 - label visible)
<label className="sr-only" htmlFor="search">Rechercher</label>
<input id="search" placeholder="Rechercher..." />
```

**Fichiers à corriger:**
- `src/components/Chantiers.jsx` - Formulaire dépenses (dropdown Catalogue, input description, € HT)
- `src/components/DevisPage.jsx` - Inputs de lignes de devis
- `src/components/Equipe.jsx` - Formulaires de pointage

### 4. Boutons "Créer/Enregistrer" plus visibles

Changer les boutons d'action principaux de `outline` à `filled`:

```jsx
// AVANT
<button className="border border-orange-500 text-orange-500">
  Créer
</button>

// APRÈS
<button className="bg-orange-500 text-white hover:bg-orange-600">
  Créer
</button>
```

**Fichiers:**
- `src/components/Planning.jsx` - Modal création événement
- `src/components/Clients.jsx` - Formulaire modification client

### 5. Tables responsive (overflow-x-auto)

```jsx
// AVANT
<table className="w-full">

// APRÈS
<div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
  <table className="w-full min-w-[600px]">
```

**Fichiers:**
- `src/components/Catalogue.jsx`
- `src/components/DevisPage.jsx`
- `src/components/Equipe.jsx` (historique pointages)

### 6. Améliorer la troncation des textes

```jsx
// AVANT - Texte coupé brutalement
<span className="truncate">Rénovation appartement Dubois</span>

// APRÈS - Avec tooltip
<span
  className="truncate"
  title="Rénovation appartement Dubois"
>
  Rénovation appartement Dubois
</span>
```

**Fichiers:**
- `src/components/Planning.jsx` - Événements du calendrier

---

## 🟡 AMÉLIORATIONS SECONDAIRES

### 7. Warnings React à corriger

**validateDOMNesting - button dans button:**
```jsx
// Fichier: src/components/dashboard/KPICard.jsx
// Le CardPeriodSelector contient un button dans un button
// Solution: Changer le wrapper en div avec role="button"
```

**forwardRef manquant:**
```jsx
// Fichier: src/components/dashboard/SuggestionsSection.jsx
// SuggestionItem doit utiliser forwardRef pour framer-motion
const SuggestionItem = forwardRef((props, ref) => {
  return <motion.div ref={ref} {...props} />;
});
```

### 8. Dark mode - focus rings

```jsx
// Ajouter sur tous les éléments focusables
className="focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900"
```

### 9. Navigation Planning - mois

Ajouter des boutons de navigation mois précédent/suivant visibles:

```jsx
// Dans le header du Planning, ajouter:
<div className="flex items-center gap-2">
  <button aria-label="Mois précédent">
    <ChevronLeft size={20} />
  </button>
  <span className="font-semibold">Février 2026</span>
  <button aria-label="Mois suivant">
    <ChevronRight size={20} />
  </button>
</div>
```

---

## 📱 RESPONSIVE MOBILE

### 10. Modals mobile-friendly

```jsx
// S'assurer que tous les modals ont:
className="max-h-[90vh] overflow-y-auto mx-4 sm:mx-auto"

// Et les boutons d'action en bas:
className="sticky bottom-0 bg-white dark:bg-slate-800 pt-4 border-t"
```

### 11. Sidebar mobile

Vérifier que le bouton hamburger a une taille tactile suffisante:
```jsx
<button
  className="lg:hidden p-3 min-w-[48px] min-h-[48px]"
  aria-label="Ouvrir le menu"
>
  <Menu size={24} />
</button>
```

---

## ✅ CHECKLIST DE VALIDATION

Après les corrections, vérifier:

- [ ] Tous les boutons font au minimum 44x44px
- [ ] Tous les inputs ont un label ou aria-label
- [ ] Les textes français ont les accents corrects
- [ ] Les tables scrollent horizontalement sur mobile
- [ ] Les modals ne dépassent pas du viewport
- [ ] Le focus est visible en dark mode
- [ ] Pas de warnings React dans la console
- [ ] Navigation clavier fonctionnelle (Tab, Enter, Escape)

---

## 🎯 COMMANDES UTILES

```bash
# Rechercher les fautes d'accent potentielles
grep -rn "Cout\|employe[^é]\|couts\|Precedente\|Reessayer\|modele[^s]\b" src/

# Rechercher les touch targets trop petits
grep -rn "p-1\s\|p-1\.5\|p-2\s" src/components/*.jsx | grep -v "min-"

# Rechercher les inputs sans label
grep -rn "<input" src/ | grep -v "aria-label\|id="

# Lancer les tests
npm run test

# Build de production
npm run build
```

---

## 📊 RÉSUMÉ DES TESTS EFFECTUÉS

| Section | Testé | Issues trouvées | Corrigées |
|---------|-------|-----------------|-----------|
| Dashboard | ✅ | 2 | 0 |
| Devis & Factures | ✅ | 3 | 2 |
| Chantiers | ✅ | 4 | 1 |
| Planning | ✅ | 3 | 0 |
| Clients | ✅ | 2 | 0 |
| Catalogue | ✅ | 2 | 0 |
| Équipe | ✅ | 12 | 10 |

**Total: 28 issues identifiées, 13 corrigées**

---

*Généré par l'audit UI/UX ChantierPro - Février 2026*
