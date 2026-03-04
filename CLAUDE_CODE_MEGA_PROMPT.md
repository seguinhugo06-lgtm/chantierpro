# MÉGA PROMPT CLAUDE CODE - AUDIT CHANTIERPRO

## Contexte
Application React de gestion BTP. Stack: React, Tailwind CSS, Lucide icons.
Couleur primaire: orange #F97316.

---

## 🔴 SPRINT 1 - CRITIQUES (Priorité Max)

### 1. Touch Targets < 44px (WCAG 2.5.5)

**Fichiers à modifier:**

```jsx
// src/App.jsx - Lignes 602, 655, 656, 665, 685
// Remplacer TOUS les min-w-[40px] min-h-[40px] par:
className="min-w-[44px] min-h-[44px]"

// src/components/Planning.jsx - Ligne 299
// Event badges trop petits
// Avant:
<div className="px-1.5 sm:px-2 py-1 text-[10px]">

// Après:
<div className="px-2 py-1.5 text-xs min-h-[44px] flex items-center">

// src/components/DevisPage.jsx - Ligne 1213
// Payment button
// Avant:
className="min-h-[40px]"

// Après:
className="min-h-[44px]"

// src/components/ui/Input.jsx - Select component ~ligne 543
// Avant:
className="h-10"

// Après:
className="h-12 sm:h-10"
```

---

### 2. Tables Sans Scroll Horizontal

```jsx
// src/components/DevisPage.jsx - Lignes 656, 1452
// Wrapper TOUTES les tables avec:
<div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
  <table className="w-full min-w-[600px]">
    {/* contenu table */}
  </table>
</div>

// src/components/Catalogue.jsx - Ligne 350
// Même pattern
```

---

### 3. ~70 Inputs Sans Labels (Accessibilité Critique)

**Pattern à appliquer sur TOUS les inputs raw:**

```jsx
// AVANT (NON ACCESSIBLE):
<input
  placeholder="Ex: Dupont Rénovation"
  className="..."
/>

// APRÈS (ACCESSIBLE):
<div>
  <label htmlFor="entreprise-nom" className="sr-only">
    Nom de l'entreprise
  </label>
  <input
    id="entreprise-nom"
    aria-label="Nom de l'entreprise"
    placeholder="Ex: Dupont Rénovation"
    className="..."
  />
</div>

// OU mieux: migrer vers le composant Input.jsx
<Input
  label="Nom de l'entreprise"
  placeholder="Ex: Dupont Rénovation"
/>
```

**Fichiers concernés:**
- `src/components/Settings.jsx` (~30 inputs)
- `src/components/Equipe.jsx` (~20 inputs)
- `src/components/QuickChantierModal.jsx` (~15 inputs)
- `src/components/QuickClientModal.jsx` (~10 inputs)
- `src/components/Chantiers.jsx` (~5 inputs)

---

### 4. Images alt="" → alt descriptif

```jsx
// src/components/Chantiers.jsx - Lignes 1118, 1227
// Avant:
<img src={p.src} alt="" />

// Après:
<img src={p.src} alt={`Photo du chantier ${chantier.nom}`} />

// src/components/Clients.jsx - Ligne 466
<img src={p.src} alt={`Photo de ${client.nom}`} />
```

---

### 5. Modals Dépassent Viewport Mobile

```jsx
// src/components/DevisWizard.jsx - Ligne 283
// Avant:
className="max-h-[95vh]"

// Après:
className="max-h-[85vh] sm:max-h-[95vh]"

// src/components/DevisPage.jsx - Ligne 1672
// Avant:
className="h-[90vh]"

// Après:
className="max-h-[80vh] sm:max-h-[90vh] w-[95vw] max-w-4xl"

// Pattern général pour modals mobile:
<div className={cn(
  "fixed inset-0 z-50 flex",
  "items-end sm:items-center justify-center",
  "p-0 sm:p-4"
)}>
  <div className={cn(
    "w-full sm:max-w-lg",
    "max-h-[85vh] sm:max-h-[90vh]",
    "rounded-t-2xl sm:rounded-2xl",
    "overflow-y-auto"
  )}>
    {/* content */}
  </div>
</div>
```

---

## 🟡 SPRINT 2 - IMPORTANTS

### 6. Centraliser Z-Index

```javascript
// Créer src/constants/zIndex.js
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

// Usage:
import { Z_INDEX } from '@/constants/zIndex';
className={`z-[${Z_INDEX.modal}]`}
// ou
style={{ zIndex: Z_INDEX.modal }}
```

---

### 7. Fix Breakpoint xs Inexistant

```jsx
// src/App.jsx - Ligne 622
// Avant:
className="hidden xs:flex"

// Après:
className="hidden sm:flex"
```

---

### 8. Corriger 9 Fautes d'Accents

```bash
# Exécuter ces remplacements:
sed -i 's/precedente/précédente/g' src/components/Equipe.jsx
sed -i 's/Reessayer/Réessayer/g' src/components/chantiers/PhotoUpload.jsx
sed -i 's/scannee/scannée/g' src/components/InvoiceScanner.jsx
sed -i 's/Reduire/Réduire/g' src/components/MorningBrief.jsx
sed -i 's/supplementaires/supplémentaires/g' src/components/GanttView.jsx
sed -i 's/Decrivez/Décrivez/g' src/components/DesignSystemDemo.jsx
sed -i "s/Retour a l'accueil/Retour à l'accueil/g" src/components/layout/Header.jsx
sed -i 's/cet employe/cet employé/g' src/components/Equipe.jsx
sed -i "s/l'equipe/l'équipe/g" src/components/planning/EquipesManager.jsx
```

---

### 9. Boutons Modals Empilés Mobile

```jsx
// src/components/QuickClientModal.jsx - Ligne 330
// src/components/DevisWizard.jsx - Ligne 727
// Avant:
<div className="flex gap-3">
  <Button>Annuler</Button>
  <Button>Confirmer</Button>
</div>

// Après:
<div className="flex flex-col-reverse sm:flex-row gap-3 sm:gap-2">
  <Button className="w-full sm:w-auto" variant="ghost">
    Annuler
  </Button>
  <Button className="w-full sm:w-auto">
    Confirmer
  </Button>
</div>
```

---

### 10. Ajouter Skip Link

```jsx
// src/App.jsx - Tout en haut du return, avant tout autre élément
<a
  href="#main-content"
  className={cn(
    "sr-only focus:not-sr-only",
    "focus:absolute focus:top-4 focus:left-4 focus:z-[100]",
    "focus:px-4 focus:py-2 focus:bg-white focus:text-slate-900",
    "focus:rounded-lg focus:shadow-lg focus:outline-none"
  )}
>
  Aller au contenu principal
</a>

// Et sur le main:
<main id="main-content" tabIndex={-1} className="...">
```

---

## 🟢 SPRINT 3 - AMÉLIORATIONS

### 11. Hook Keyboard Avoiding (iOS)

```jsx
// Créer src/hooks/useKeyboardAvoiding.js
import { useEffect } from 'react';

export function useKeyboardAvoiding() {
  useEffect(() => {
    const handleFocus = (e) => {
      const target = e.target;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
        // Attendre que le clavier s'ouvre
        setTimeout(() => {
          target.scrollIntoView({
            block: 'center',
            behavior: 'smooth'
          });
        }, 300);
      }
    };

    document.addEventListener('focusin', handleFocus);
    return () => document.removeEventListener('focusin', handleFocus);
  }, []);
}

// Usage dans les modals avec formulaires:
function QuickClientModal() {
  useKeyboardAvoiding();
  // ...
}
```

---

### 12. Skeleton Loaders

```jsx
// Créer src/components/ui/Skeleton.jsx
import { cn } from '@/lib/utils';

export function Skeleton({ className }) {
  return (
    <div
      className={cn(
        "animate-pulse rounded bg-slate-200 dark:bg-slate-700",
        className
      )}
    />
  );
}

export function CardSkeleton() {
  return (
    <div className="p-4 border rounded-xl space-y-3">
      <Skeleton className="h-4 w-1/3" />
      <Skeleton className="h-8 w-1/2" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-3/4" />
    </div>
  );
}

export function TableRowSkeleton() {
  return (
    <tr>
      <td className="py-3"><Skeleton className="h-4 w-24" /></td>
      <td className="py-3"><Skeleton className="h-4 w-32" /></td>
      <td className="py-3"><Skeleton className="h-4 w-20" /></td>
    </tr>
  );
}
```

---

### 13. Persistance Filtres URL

```jsx
// Créer src/hooks/useUrlFilters.js
import { useSearchParams } from 'react-router-dom';
import { useMemo, useCallback } from 'react';

export function useUrlFilters(defaults = {}) {
  const [searchParams, setSearchParams] = useSearchParams();

  const filters = useMemo(() => {
    const result = { ...defaults };
    for (const [key, value] of searchParams.entries()) {
      result[key] = value;
    }
    return result;
  }, [searchParams, defaults]);

  const setFilter = useCallback((key, value) => {
    setSearchParams(prev => {
      if (value === null || value === undefined || value === '') {
        prev.delete(key);
      } else {
        prev.set(key, value);
      }
      return prev;
    });
  }, [setSearchParams]);

  return [filters, setFilter];
}

// Usage:
function DevisPage() {
  const [filters, setFilter] = useUrlFilters({
    type: 'tous',
    sort: 'recent'
  });

  return (
    <select
      value={filters.type}
      onChange={e => setFilter('type', e.target.value)}
    >
      {/* options */}
    </select>
  );
}
```

---

### 14. Raccourcis Clavier

```jsx
// src/hooks/useKeyboardShortcuts.js
import { useEffect } from 'react';

export function useKeyboardShortcuts(shortcuts) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ignorer si dans un input/textarea
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)) {
        return;
      }

      const key = e.key.toLowerCase();
      const combo = [
        e.metaKey && 'cmd',
        e.ctrlKey && 'ctrl',
        e.shiftKey && 'shift',
        e.altKey && 'alt',
        key
      ].filter(Boolean).join('+');

      const handler = shortcuts[combo] || shortcuts[key];
      if (handler) {
        e.preventDefault();
        handler();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [shortcuts]);
}

// Usage:
function App() {
  useKeyboardShortcuts({
    'n': () => openNewModal(),
    'shift+?': () => showShortcutsHelp(),
    'cmd+k': () => openCommandPalette(),
    'escape': () => closeAllModals()
  });
}
```

---

### 15. Harmoniser Wording

```jsx
// Créer src/constants/wording.js
export const WORDING = {
  actions: {
    view: 'Voir les détails',
    edit: 'Modifier',
    delete: 'Supprimer',
    cancel: 'Annuler',
    confirm: 'Confirmer',
    save: 'Enregistrer',
    send: 'Envoyer',
    create: 'Créer',
    add: 'Ajouter'
  },
  status: {
    pending: 'En attente',
    inProgress: 'En cours',
    completed: 'Terminé',
    cancelled: 'Annulé'
  },
  empty: {
    devis: 'Aucun devis pour le moment. Créez votre premier devis !',
    clients: 'Aucun client enregistré. Ajoutez votre premier client !',
    chantiers: 'Aucun chantier en cours.'
  }
};

// Usage:
import { WORDING } from '@/constants/wording';
<Button>{WORDING.actions.view}</Button>
```

---

## CHECKLIST VALIDATION

```bash
# Après modifications, vérifier:

# 1. Touch targets
grep -rn "min-w-\[40px\]" src/
grep -rn "min-h-\[40px\]" src/
# Résultat attendu: 0 occurrences

# 2. Tables sans scroll
grep -rn "<table" src/ | grep -v "overflow"
# Vérifier manuellement

# 3. Inputs sans labels
grep -rn "placeholder=" src/ | grep -v "label" | wc -l
# Résultat attendu: 0 ou très peu

# 4. Images alt=""
grep -rn 'alt=""' src/
# Résultat attendu: 0

# 5. Accents
grep -rn "precedente\|Reessayer\|supplementaires" src/
# Résultat attendu: 0

# 6. Audit Lighthouse
npx lighthouse http://localhost:5173/?demo=true --view
# Objectif: Accessibility > 90
```

---

## TESTS MANUELS REQUIS

1. **Mobile Safari iOS**
   - [ ] Vérifier zoom auto sur inputs (font-size >= 16px)
   - [ ] Tester clavier virtuel ne cache pas inputs
   - [ ] Modals scrollables avec clavier ouvert

2. **Mobile Chrome Android**
   - [ ] Touch targets facilement cliquables
   - [ ] Tables scrollables horizontalement
   - [ ] Pas de dépassement horizontal

3. **Desktop**
   - [ ] Navigation clavier (Tab, Enter, Escape)
   - [ ] Focus visible sur tous éléments interactifs
   - [ ] Skip link fonctionne

4. **Screen Reader (NVDA/VoiceOver)**
   - [ ] Tous les boutons ont un label
   - [ ] Images décrites
   - [ ] Formulaires navigables

---

*Prompt généré le 4 février 2026 - Méga Audit ChantierPro*
