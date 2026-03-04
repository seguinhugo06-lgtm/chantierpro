# 🎯 Prompt Claude Code - Corrections Accessibilité & UI/UX ChantierPro

## Contexte
Application React BTP avec Tailwind CSS. Audit réalisé le 5 février 2026.
**Standard cible**: WCAG 2.1 AA

---

## 🔴 CORRECTIONS CRITIQUES (Priorité 1)

### 1. Touch Targets trop petits (min 44x44px requis)

**Problème**: Boutons avec `w-8 h-8` (32px), `p-1`, `p-1.5`, `p-2` sans dimensions minimales.

#### Fichiers à corriger:

**src/components/Clients.jsx** - Lignes 691, 694, 710
```jsx
// AVANT (ligne 691)
<button className="w-8 h-8 rounded-lg...">

// APRÈS
<button className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-lg flex items-center justify-center...">
```

**src/components/Catalogue.jsx** - Lignes 372, 393, 397
```jsx
// AVANT (ligne 372)
<button className="w-8 h-8 flex items-center...">

// APRÈS
<button className="w-11 h-11 min-w-[44px] min-h-[44px] flex items-center justify-center...">
```

**src/components/Toast.jsx** - Lignes 115, 216
```jsx
// AVANT
<button className="ml-2 p-1 rounded-lg...">

// APRÈS
<button className="ml-2 p-2.5 min-w-[44px] min-h-[44px] rounded-lg flex items-center justify-center...">
```

**src/components/Chantiers.jsx** - Lignes 1169, 2229, 2232, 2253, 2256
```jsx
// AVANT
<button className="p-1.5 rounded...">

// APRÈS
<button className="p-2.5 min-w-[44px] min-h-[44px] rounded flex items-center justify-center...">
```

**src/components/ArticlePicker.jsx** - Lignes 137, 156
**src/components/DevisExpressModal.jsx** - Lignes 187, 204
**src/components/SmartTemplateWizard.jsx** - Ligne 193
**src/components/PointageNotification.jsx** - Ligne 233
**src/components/MessageThread.jsx** - Ligne 303

---

### 2. Aria-labels manquants sur boutons icône

**Problème**: Boutons avec uniquement une icône SVG, sans texte accessible.

#### Corrections:

**src/components/Clients.jsx**
```jsx
// Ligne 691 - Bouton appeler
<button
  aria-label="Appeler le client"
  title="Appeler"
  className="...">
  <Phone size={16} />
</button>

// Ligne 694 - Bouton WhatsApp
<button
  aria-label="Contacter par WhatsApp"
  title="WhatsApp"
  className="...">
  <MessageCircle size={16} />
</button>

// Ligne 710 - Bouton GPS
<button
  aria-label="Ouvrir l'adresse dans Google Maps"
  title="Voir sur Google Maps"
  className="...">
  <MapPin size={16} />
</button>
```

**src/components/Catalogue.jsx** - Ligne 372
```jsx
<button
  aria-label={isFavorite ? "Retirer des favoris" : "Ajouter aux favoris"}
  className="...">
  <Star size={16} />
</button>
```

**src/components/Chantiers.jsx**
```jsx
// Ligne 1169 - Supprimer message
<button aria-label="Supprimer le message" className="...">
  <Trash2 size={14} />
</button>

// Lignes 2229, 2253 - Marquer critique
<button aria-label="Marquer comme prioritaire" className="...">
  <AlertCircle size={14} />
</button>

// Lignes 2232, 2256 - Supprimer tâche
<button aria-label="Supprimer la tâche" className="...">
  <Trash2 size={14} />
</button>
```

---

### 3. Focus states manquants

**Problème**: Éléments interactifs sans indicateur de focus visible.

#### Pattern à appliquer sur TOUS les boutons:
```jsx
// Ajouter ces classes à tous les boutons interactifs:
className="... focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900"
```

#### Fichiers prioritaires:
- `src/components/Clients.jsx` - Boutons icônes (691, 694, 710)
- `src/components/Catalogue.jsx` - Bouton favoris (372)
- `src/components/Chantiers.jsx` - Boutons inline (1169, 2229, 2232, etc.)
- `src/components/Planning.jsx` - Boutons navigation (149, 432)
- `src/components/PointageNotification.jsx` - Tous les boutons

---

### 4. Inputs sans labels

**Problème**: Champs de recherche sans label accessible.

**src/components/Clients.jsx** - Ligne 555
```jsx
// AVANT
<input type="text" placeholder="Rechercher un client..." className="..." />

// APRÈS
<input
  type="text"
  placeholder="Rechercher un client..."
  aria-label="Rechercher un client"
  className="..."
/>
```

**src/components/DevisPage.jsx** - Input recherche
```jsx
<input
  type="text"
  placeholder="Rechercher..."
  aria-label="Rechercher dans les documents"
  className="..."
/>
```

---

## 🟠 CORRECTIONS IMPORTANTES (Priorité 2)

### 5. Fautes d'accents restantes

**src/components/TemplateSelector.jsx**
```jsx
// Ligne 130 - AVANT
{metier.templatesCount} modeles

// APRÈS
{metier.templatesCount} modèles

// Ligne 201 - AVANT
Utiliser ce modele

// APRÈS
Utiliser ce modèle
```

### 6. Structure des headings

**Problème**: Pages avec 2 `<h1>` ou sauts de niveaux (h1 → h3 sans h2).

```jsx
// Chaque page doit avoir UN SEUL h1
// Utiliser h2 pour les sections principales
// Utiliser h3 pour les sous-sections

// Exemple structure correcte:
<h1>Dashboard</h1>
  <h2>À encaisser</h2>
  <h2>Facturé ce mois</h2>
    <h3>Détails</h3>
```

### 7. Contraste texte gris

**Problème**: `text-slate-400` sur fond clair peut avoir un contraste insuffisant.

```jsx
// AVANT - contraste potentiellement faible
<span className="text-slate-400">Texte secondaire</span>

// APRÈS - meilleur contraste
<span className="text-slate-500 dark:text-slate-400">Texte secondaire</span>
```

---

## 🟡 AMÉLIORATIONS (Priorité 3)

### 8. Navigation clavier dans les modals

Vérifier que tous les modals ont:
```jsx
// Focus trap
// Fermeture avec Escape
// Focus initial sur le premier élément interactif
// Retour du focus à l'élément déclencheur après fermeture
```

### 9. Skip link

Vérifier que le skip link fonctionne:
```jsx
// Dans App.jsx ou Layout
<a
  href="#main-content"
  className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-orange-500 focus:text-white focus:rounded"
>
  Aller au contenu principal
</a>

// Sur le contenu principal
<main id="main-content" tabIndex={-1}>
```

### 10. Animations réduites

```jsx
// Respecter prefers-reduced-motion
<motion.div
  initial={{ opacity: 0 }}
  animate={{ opacity: 1 }}
  className="motion-reduce:transition-none"
>
```

---

## ✅ CHECKLIST DE VALIDATION

Après corrections, vérifier:

- [ ] Tous les boutons font minimum 44x44px
- [ ] Tous les boutons icône ont un aria-label
- [ ] Tous les inputs ont un label ou aria-label
- [ ] Focus visible sur tous les éléments interactifs
- [ ] Navigation complète au clavier (Tab, Shift+Tab, Enter, Escape)
- [ ] Pas de skip de niveau de heading (h1→h2→h3)
- [ ] Contraste minimum 4.5:1 pour le texte normal
- [ ] Animations respectent prefers-reduced-motion

---

## 🔧 COMMANDES UTILES

```bash
# Trouver les touch targets trop petits
grep -rn "w-8\|h-8\|p-1\s\|p-1\.\|p-2\s" src/components/*.jsx | grep -v "min-w\|min-h"

# Trouver les boutons sans aria-label
grep -rn "<button" src/components/*.jsx | grep -v "aria-label"

# Trouver les inputs sans label
grep -rn "<input" src/components/*.jsx | grep -v "aria-label\|id="

# Vérifier les focus states
grep -rn "focus:" src/components/*.jsx | wc -l

# Trouver les fautes d'accent
grep -rn "modele[^s]\|Cout\s\|couts\|employe[^é]" src/components/*.jsx
```

---

## 📊 RÉSUMÉ DE L'AUDIT

| Catégorie | Problèmes | Fichiers impactés |
|-----------|-----------|-------------------|
| Touch targets < 44px | 14+ boutons | 8 fichiers |
| Aria-labels manquants | 8+ boutons | 3 fichiers |
| Focus states manquants | ~20 boutons | 5 fichiers |
| Inputs sans labels | 2 inputs | 2 fichiers |
| Fautes d'accents | 3 occurrences | 1 fichier |

**Temps estimé**: 2-3 heures de corrections

---

## ✨ POINTS POSITIFS

- ✅ Button.jsx - Composant bien construit avec focus states
- ✅ Input.jsx - Accessibilité excellente (labels, aria-describedby)
- ✅ Modal.jsx - Gestion du focus appropriée
- ✅ Skip link présent
- ✅ Dark mode bien implémenté
- ✅ 27 fichiers ont des focus states appropriés

---

## 📱 TESTS MOBILE (375x812px - iPhone)

### Résultats des tests du 5 février 2026

#### ✅ POINTS POSITIFS MOBILE

| Composant | Statut | Détails |
|-----------|--------|---------|
| Menu hamburger | ✅ OK | Slide depuis la gauche, animation fluide |
| FAB (bouton +) | ✅ OK | 56x56px, aria-label présent |
| Bottom sheets | ✅ OK | Pattern mobile bien implémenté |
| Modals | ✅ OK | Full-screen, scroll interne, boutons sticky |
| Dropdowns | ✅ OK | S'affichent correctement |
| Tables Catalogue | ✅ OK | Boutons 44x44px, overflow-x: auto |
| Navigation par étapes | ✅ OK | Progress indicator visible |
| Cards clients | ✅ OK | Grid 2 colonnes adapté |

#### 🔴 CORRECTIONS MOBILE REQUISES

**1. Bouton fermeture (X) des modals - 34x34px**
```jsx
// src/components/DevisExpressModal.jsx (et autres modals)
// AVANT
<button className="...">
  <X size={20} />
</button>

// APRÈS - Augmenter la taille du touch target
<button className="p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700">
  <X size={20} />
</button>
```

**2. Input recherche dans ArticlePicker**
```jsx
// aria-label dit "Rechercher un article" mais on cherche un client
// Corriger pour correspondre au contexte
aria-label="Rechercher un client"  // dans modal sélection client
aria-label="Rechercher un article" // dans modal catalogue
```

#### 📋 FLOW DEVIS EXPRESS - TESTÉ OK

1. ✅ FAB → Menu speed dial (blur background)
2. ✅ Sélection client → Cards grid 2 colonnes
3. ✅ Ajout articles → Bottom sheet catalogue
4. ✅ Quantité/remises → Contrôles +/- fonctionnels
5. ✅ Navigation Retour/Continuer → Sticky footer

---

## 📊 RÉSUMÉ FINAL DE L'AUDIT

| Catégorie | Problèmes | Fichiers impactés | Statut |
|-----------|-----------|-------------------|--------|
| Touch targets < 44px | 14+ boutons | 8 fichiers | 🔴 À corriger |
| Aria-labels manquants | 8+ boutons | 3 fichiers | 🔴 À corriger |
| Focus states manquants | ~20 boutons | 5 fichiers | 🟠 Partiel |
| Inputs sans labels | 2 inputs | 2 fichiers | 🔴 À corriger |
| Fautes d'accents | 3 occurrences | 1 fichier | 🟠 À corriger |
| Bouton X modals | 34x34px | Tous modals | 🔴 À corriger |
| Mobile responsive | - | - | ✅ OK |
| Dark mode | - | - | ✅ OK |

**Temps estimé total**: 3-4 heures de corrections

---

*Audit réalisé le 5 février 2026 - ChantierPro v1.0*
*Tests mobile effectués sur viewport 375x812px*
