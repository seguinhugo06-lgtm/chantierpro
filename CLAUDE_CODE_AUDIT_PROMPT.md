# Audit UI/UX ChantierPro - Prompt Claude Code

## Contexte

Tu travailles sur **ChantierPro**, une application React de gestion pour entreprises BTP (devis, factures, chantiers, planning, clients, catalogue, équipe). L'app utilise Tailwind CSS, Lucide icons, et suit un design system avec la couleur primaire orange (#F97316).

---

## Scores Actuels

| Domaine | Score | Objectif |
|---------|-------|----------|
| UI Design | 8.5/10 | 9.5/10 |
| UX/Ergonomie | 8/10 | 9/10 |
| Accessibilité | 7/10 | 9/10 |
| Wording FR | 7.5/10 | 9/10 |

---

## 🔴 PRIORITÉ HAUTE - À corriger immédiatement

### 1. Accessibilité - aria-labels manquants
**Fichiers concernés:** `src/components/ui/Button.jsx`, `src/App.jsx`, composants avec IconButton

```jsx
// ❌ Actuel
<IconButton onClick={...}><Bell size={20} /></IconButton>

// ✅ Corrigé
<IconButton onClick={...} aria-label="Notifications (3 non lues)"><Bell size={20} /></IconButton>
```

**Action:** Ajouter `aria-label` descriptif sur TOUS les boutons icône sans texte visible.

---

### 2. Accessibilité - Focus ring invisible en mode sombre
**Fichier:** `src/components/ui/Button.jsx`, `tailwind.config.js`

```jsx
// ❌ Actuel
'focus-visible:ring-2 focus-visible:ring-offset-2'

// ✅ Corrigé - ajouter offset pour dark mode
'focus-visible:ring-2 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900 dark:focus-visible:ring-white'
```

---

### 3. Contraste des montants en orange
**Fichiers:** Tous les composants affichant des montants (Dashboard, DevisPage, Clients...)

```jsx
// ❌ Actuel - contraste insuffisant
<span className="text-orange-500">3 740 €</span>

// ✅ Corrigé - meilleur contraste WCAG AA
<span className="text-orange-600">3 740 €</span>
```

**Action:** Remplacer `text-orange-500` par `text-orange-600` (#EA580C) pour tous les montants.

---

### 4. Confirmation actions destructives
**Fichier:** Créer/modifier `src/components/ui/ConfirmDialog.jsx`

```jsx
// Avant toute suppression, demander confirmation:
const handleDelete = async (id) => {
  const confirmed = await confirm({
    title: "Supprimer ce devis ?",
    message: "Cette action est irréversible. Le devis DEV-2026-003 sera définitivement supprimé.",
    confirmText: "Supprimer",
    cancelText: "Annuler",
    variant: "danger"
  });
  if (confirmed) {
    // procéder à la suppression
  }
};
```

---

## 🟡 PRIORITÉ MOYENNE - Sprint suivant

### 5. Tri cliquable sur tableaux
**Fichiers:** `src/components/DevisPage.jsx`, `src/components/Catalogue.jsx`

```jsx
// Ajouter des headers cliquables avec indicateur de tri
<th
  onClick={() => handleSort('montant')}
  className="cursor-pointer hover:bg-slate-100 select-none"
  aria-sort={sortColumn === 'montant' ? sortDirection : 'none'}
>
  Montant {sortColumn === 'montant' && (sortDirection === 'asc' ? '↑' : '↓')}
</th>
```

---

### 6. Harmonisation du wording

| Remplacer | Par | Fichiers |
|-----------|-----|----------|
| `"Voir détails"` | `"Voir les détails"` | Dashboard, tous widgets |
| `"Relancer"` | `"Envoyer une relance"` | DevisPage, boutons |
| `"4 dispo"` | `"4 disponibles"` | Équipe badges |
| `"marge moy."` | `"marge moyenne"` | Catalogue |
| `"1 facture en attente"` | `"1 facture à encaisser"` | Dashboard |

---

### 7. Navigation clavier dropdowns
**Fichier:** Tous les composants dropdown/select

```jsx
const handleKeyDown = (e) => {
  switch(e.key) {
    case 'ArrowDown':
      e.preventDefault();
      setHighlightedIndex(i => Math.min(i + 1, options.length - 1));
      break;
    case 'ArrowUp':
      e.preventDefault();
      setHighlightedIndex(i => Math.max(i - 1, 0));
      break;
    case 'Enter':
      selectOption(options[highlightedIndex]);
      break;
    case 'Escape':
      closeDropdown();
      break;
  }
};
```

---

### 8. Graphiques - alternatives textuelles
**Fichier:** `src/components/Dashboard.jsx` (section Performance)

```jsx
<div
  role="img"
  aria-label="Graphique de performance: Septembre 0€, Octobre 2000€, Novembre 8000€, Décembre 12000€, Janvier 45000€, Février 0€. Objectif mensuel: 10461€"
>
  {/* Recharts component */}
</div>
```

---

## 🟢 PRIORITÉ BASSE - Améliorations futures

### 9. Skip link pour accessibilité
**Fichier:** `src/App.jsx` (tout en haut du return)

```jsx
<a
  href="#main-content"
  className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-white focus:text-slate-900 focus:rounded-lg focus:shadow-lg"
>
  Aller au contenu principal
</a>
```

---

### 10. Skeleton loaders
**Créer:** `src/components/ui/Skeleton.jsx`

```jsx
export const Skeleton = ({ className }) => (
  <div className={cn("animate-pulse bg-slate-200 dark:bg-slate-700 rounded", className)} />
);

export const CardSkeleton = () => (
  <div className="p-4 border rounded-xl">
    <Skeleton className="h-4 w-1/3 mb-2" />
    <Skeleton className="h-8 w-1/2 mb-4" />
    <Skeleton className="h-4 w-full" />
  </div>
);
```

---

### 11. Persistance des filtres
**Fichier:** Hook personnalisé `src/hooks/usePersistedFilters.js`

```jsx
export const usePersistedFilters = (key, defaultFilters) => {
  const [filters, setFilters] = useState(() => {
    const saved = localStorage.getItem(`filters_${key}`);
    return saved ? JSON.parse(saved) : defaultFilters;
  });

  useEffect(() => {
    localStorage.setItem(`filters_${key}`, JSON.stringify(filters));
  }, [key, filters]);

  return [filters, setFilters];
};
```

---

### 12. Raccourcis clavier globaux
**Fichier:** `src/App.jsx` ou hook dédié

```jsx
useEffect(() => {
  const handleKeyboard = (e) => {
    // Ignorer si focus dans input/textarea
    if (['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) return;

    if (e.key === 'n' && !e.metaKey && !e.ctrlKey) {
      e.preventDefault();
      openNewModal();
    }
    if (e.key === '?' && e.shiftKey) {
      e.preventDefault();
      showKeyboardShortcuts();
    }
  };

  window.addEventListener('keydown', handleKeyboard);
  return () => window.removeEventListener('keydown', handleKeyboard);
}, []);
```

---

## Responsive - Améliorations tablette/mobile

### Tableaux en cards sur mobile
```jsx
// Dans Catalogue.jsx
<div className="hidden md:block">
  <Table>...</Table>
</div>
<div className="md:hidden space-y-3">
  {articles.map(article => (
    <ArticleCard key={article.id} article={article} />
  ))}
</div>
```

### Planning - vue liste sur mobile
```jsx
// Dans Planning.jsx
<div className="hidden lg:block">
  <CalendarGrid />
</div>
<div className="lg:hidden">
  <AgendaList events={events} />
</div>
```

---

## Checklist de validation

Après chaque modification, vérifier :

- [ ] Pas de régression visuelle (desktop + mobile)
- [ ] Navigation clavier fonctionnelle (Tab, Enter, Escape)
- [ ] Contrastes WCAG AA (ratio 4.5:1 pour texte, 3:1 pour grands textes)
- [ ] Labels accessibles présents (aria-label, aria-describedby)
- [ ] Mode sombre fonctionne correctement
- [ ] Pas d'erreurs console
- [ ] Tests unitaires passent

---

## Commandes utiles

```bash
# Lancer l'app en mode démo
npm run dev
# Accéder à http://localhost:5173/?demo=true

# Vérifier l'accessibilité avec axe
npx @axe-core/cli http://localhost:5173/?demo=true

# Audit Lighthouse
npx lighthouse http://localhost:5173/?demo=true --view
```

---

## Ordre d'implémentation recommandé

1. **Sprint 1 (Critique):** Points 1-4 (accessibilité + contraste + confirmations)
2. **Sprint 2 (Important):** Points 5-8 (UX + wording)
3. **Sprint 3 (Nice-to-have):** Points 9-12 (améliorations)
4. **Backlog:** Responsive avancé

---

*Généré le 4 février 2026 - Audit complet de l'application ChantierPro*
