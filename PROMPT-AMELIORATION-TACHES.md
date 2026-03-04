# Prompt d'Amélioration UX - Système de Tâches et Avancement (ChantierPro)

## 🎯 Contexte

Le système de gestion des tâches dans la vue détail d'un chantier présente plusieurs problèmes UX critiques identifiés lors de tests approfondis. Ce document fournit un prompt structuré pour améliorer cette fonctionnalité.

---

## 🐛 Problèmes UX Identifiés

### 1. **BUG CRITIQUE - Bouton "Voir les X autres tâches..." cassé**
- **Fichier**: `src/components/Chantiers.jsx` (ligne ~412)
- **Problème**: Le bouton appelle `setActiveTab('taches')` mais l'onglet `taches` n'existe pas dans les tabs disponibles (seulement: finances, photos, notes, messages)
- **Impact**: Les utilisateurs ne peuvent JAMAIS voir toutes leurs tâches quand il y en a plus de 7

### 2. **Zone de clic trop large sur les tâches**
- **Fichier**: `src/components/Chantiers.jsx` (lignes ~391-408)
- **Problème**: Les tâches sont enveloppées dans un `<label>` qui englobe checkbox ET texte. Cliquer n'importe où coche la tâche.
- **Impact**:
  - Impossible de cliquer sur le texte pour éditer
  - Impossible d'utiliser les icônes à droite (priorité) sans cocher
  - UX frustrante avec des tâches cochées par accident

### 3. **Pas de catégorisation visible des tâches**
- **Problème**: Les catégories (Préparation, Second œuvre, Finitions, Nettoyage/Réception) utilisées lors de la génération ne sont PAS affichées dans la liste
- **Impact**: L'utilisateur perd le contexte de progression par phase du chantier

### 4. **Tâches complétées disparaissent**
- **Problème**: Aucune section "Terminées" - les tâches cochées disparaissent
- **Impact**: Impossible de revoir l'historique ou de décocher une tâche cochée par erreur

### 5. **Ordre des tâches illogique**
- **Problème**: Les tâches ne suivent pas un ordre logique de chantier (ex: "Commander matériaux" avant "Visite technique préalable")
- **Impact**: Confusion sur la séquence des travaux

### 6. **Icônes de priorité non expliquées**
- **Problème**: Les icônes orange à droite de certaines tâches n'ont pas de tooltip/explication
- **Impact**: L'utilisateur ne comprend pas leur signification

### 7. **Pas de fonctionnalités d'édition/suppression**
- **Problème**: Aucun moyen de modifier le texte d'une tâche ou de la supprimer
- **Impact**: Gestion rigide des tâches

### 8. **Barre de progression peu visible**
- **Problème**: Barre orange très fine et peu informative
- **Impact**: Mauvaise visibilité de l'avancement global

---

## 📋 Prompt pour Claude Code

```
## Objectif
Refondre complètement le système de gestion des tâches dans la vue détail d'un chantier (fichier `src/components/Chantiers.jsx`) pour créer une expérience UX professionnelle et adaptée aux besoins des artisans du BTP.

## Fichiers à modifier
- `src/components/Chantiers.jsx` (principal)
- `src/lib/templates/task-templates.js` (si nécessaire pour les phases)

## Fonctionnalités à implémenter

### 1. Vue Liste de Tâches Améliorée

#### Structure visuelle
- Afficher TOUTES les tâches (pas de limite à 7) dans un conteneur scrollable avec hauteur max de 400px
- Grouper les tâches par PHASE (Préparation → Second œuvre → Finitions → Nettoyage/Réception)
- Chaque phase doit être collapsible avec un header montrant:
  - Nom de la phase + icône appropriée
  - Badge avec compteur (ex: "3/10 terminées")
  - Barre de progression mini pour cette phase
  - Chevron pour expand/collapse

#### Item de tâche
Chaque tâche doit avoir:
- Checkbox à GAUCHE (zone de clic UNIQUEMENT sur la checkbox, pas sur tout le label)
- Texte de la tâche (cliquable pour ouvrir modal d'édition)
- Indicateur de priorité (si critique: badge rouge "Prioritaire" avec tooltip)
- Menu contextuel (3 dots) avec options:
  - Modifier
  - Marquer comme prioritaire
  - Supprimer
  - Déplacer vers une autre phase

### 2. Section "Tâches Terminées"

- Ajouter une section collapsible "Tâches terminées (X)" en bas
- Par défaut repliée
- Permet de voir l'historique et de décocher si erreur
- Style différent (texte barré, opacité réduite)

### 3. Barre de Progression Améliorée

Remplacer la barre simple par un widget informatif:
```jsx
<div className="flex items-center justify-between mb-4">
  <div className="flex items-center gap-3">
    <div className="relative w-16 h-16">
      {/* Cercle de progression SVG */}
      <svg className="w-16 h-16 -rotate-90">
        <circle cx="32" cy="32" r="28" stroke="#e5e7eb" strokeWidth="6" fill="none" />
        <circle cx="32" cy="32" r="28" stroke="#f97316" strokeWidth="6" fill="none"
          strokeDasharray={`${2 * Math.PI * 28 * progress / 100} ${2 * Math.PI * 28}`}
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center font-bold text-lg">
        {Math.round(progress)}%
      </span>
    </div>
    <div>
      <p className="font-semibold text-lg">{completedCount}/{tasksTotal} tâches</p>
      <p className="text-sm text-slate-500">
        {completedCount === tasksTotal ? '✅ Chantier terminé !' :
         `${tasksTotal - completedCount} restantes`}
      </p>
    </div>
  </div>
</div>
```

### 4. Modal d'Édition de Tâche

Créer un composant `TaskEditModal` avec:
- Champ texte pour le nom de la tâche
- Sélecteur de phase (dropdown)
- Toggle "Tâche prioritaire"
- Champ notes (optionnel)
- Date d'échéance (optionnel)
- Boutons: Sauvegarder / Supprimer / Annuler

### 5. Tri et Filtres

Ajouter une barre de filtres au-dessus de la liste:
```jsx
<div className="flex gap-2 mb-3 flex-wrap">
  <button className={filterActive === 'all' ? 'active' : ''}>Toutes</button>
  <button className={filterActive === 'pending' ? 'active' : ''}>À faire</button>
  <button className={filterActive === 'critical' ? 'active' : ''}>Prioritaires</button>
</div>
```

### 6. Drag & Drop (bonus)

Permettre de réordonner les tâches par drag & drop:
- Utiliser `@dnd-kit/core` ou `react-beautiful-dnd`
- Handle de drag à gauche de chaque item
- Animation fluide lors du déplacement

## Code actuel à corriger

### Problème 1: Zone de clic
AVANT (problématique):
```jsx
<label key={t.id} className="flex items-center gap-3 p-2.5 rounded-xl cursor-pointer">
  <input type="checkbox" checked={t.done} onChange={() => toggleTache(t.id)} />
  <span>{t.text}</span>
</label>
```

APRÈS (corrigé):
```jsx
<div key={t.id} className="flex items-center gap-3 p-2.5 rounded-xl group">
  <input
    type="checkbox"
    checked={t.done}
    onChange={() => toggleTache(t.id)}
    className="w-5 h-5 cursor-pointer"
  />
  <span
    className="flex-1 cursor-pointer hover:text-orange-500"
    onClick={() => openTaskEditModal(t)}
  >
    {t.text}
  </span>
  <button onClick={() => openContextMenu(t)} className="opacity-0 group-hover:opacity-100">
    <MoreVertical size={16} />
  </button>
</div>
```

### Problème 2: Bouton "Voir les X autres tâches"
SUPPRIMER ce bouton et afficher toutes les tâches dans un conteneur scrollable:
```jsx
<div className="max-h-[400px] overflow-y-auto space-y-2 pr-2">
  {/* Toutes les tâches groupées par phase */}
</div>
```

## Structure de données des tâches

Mettre à jour le modèle de tâche:
```typescript
interface Task {
  id: string;
  text: string;
  done: boolean;
  critical: boolean;
  phase: 'preparation' | 'second-oeuvre' | 'finitions' | 'nettoyage';
  notes?: string;
  dueDate?: string;
  order: number; // Pour le tri
  createdAt: string;
  completedAt?: string;
}
```

## Tests à effectuer
1. Générer 24+ tâches et vérifier qu'elles sont TOUTES visibles
2. Cliquer sur le TEXTE d'une tâche → doit ouvrir l'édition, PAS cocher
3. Cocher une tâche → doit aller dans "Terminées", PAS disparaître
4. Vérifier l'affichage par phases
5. Tester sur mobile (touch targets de 44px minimum)

## Style et animations
- Utiliser les couleurs existantes du projet (orange: #f97316)
- Transitions smooth de 200ms
- Hover states sur tous les éléments interactifs
- Support du dark mode (utiliser les variables isDark existantes)
```

---

## 🎨 Maquette UX Suggérée

```
┌─────────────────────────────────────────────────────────┐
│ AVANCEMENT & TÂCHES                           ⚙️ Filtres │
├─────────────────────────────────────────────────────────┤
│  ┌────┐                                                 │
│  │ 42%│  10/24 tâches complétées                       │
│  │ ○  │  14 restantes                                   │
│  └────┘                                                 │
├─────────────────────────────────────────────────────────┤
│ [Toutes] [À faire] [Prioritaires]                       │
├─────────────────────────────────────────────────────────┤
│ ▼ PRÉPARATION                              3/10 ████░░  │
│ ├─ ☐ Visite technique préalable                    ⋮   │
│ ├─ ☑ Commander les matériaux                       ⋮   │
│ ├─ ☐ Vérifier livraison              🔴 Prioritaire ⋮   │
│ └─ ...                                                  │
│                                                         │
│ ▼ SECOND ŒUVRE                             1/5 ██░░░░  │
│ ├─ ☐ Installation plomberie                        ⋮   │
│ └─ ...                                                  │
│                                                         │
│ ► FINITIONS                                0/5 ░░░░░░  │
│ ► NETTOYAGE / RÉCEPTION                    0/4 ░░░░░░  │
├─────────────────────────────────────────────────────────┤
│ ► Tâches terminées (6)                                  │
├─────────────────────────────────────────────────────────┤
│ + Ajouter une tâche...                           [+]   │
└─────────────────────────────────────────────────────────┘
```

---

## 📱 Considérations Mobile

- Touch targets minimum 44x44px
- Swipe gauche sur tâche = menu contextuel
- Swipe droit = marquer comme terminée
- Pull to refresh (optionnel)
- Sticky header avec progression

---

## 🔧 Implémentation Suggérée

### Étape 1: Corriger les bugs critiques
1. Supprimer le `<label>` englobant et séparer checkbox/texte
2. Supprimer le bouton "Voir les X autres tâches" cassé
3. Afficher toutes les tâches dans un conteneur scrollable

### Étape 2: Ajouter le groupement par phases
1. Grouper les tâches par `task.phase`
2. Créer un composant `TaskPhaseGroup` collapsible
3. Afficher progression par phase

### Étape 3: Section tâches terminées
1. Filtrer `tasks.filter(t => t.done)`
2. Section collapsible en bas
3. Permettre de décocher

### Étape 4: Modal d'édition
1. Créer `TaskEditModal.jsx`
2. Intégrer dans Chantiers.jsx
3. Gérer création/modification/suppression

### Étape 5: Améliorations visuelles
1. Nouveau widget de progression circulaire
2. Filtres rapides
3. Animations et transitions

---

## ✅ Critères de Succès

- [ ] Toutes les tâches sont visibles (pas de limite)
- [ ] Clic sur texte ≠ cocher la tâche
- [ ] Tâches groupées par phase avec progression
- [ ] Section "Terminées" accessible
- [ ] Édition/suppression de tâches possible
- [ ] Fonctionne sur mobile
- [ ] Support dark mode
- [ ] Performance OK avec 50+ tâches
