# Prompt Claude Code — Planning + MemosPage UX & Accessibility Fix

Copie ce prompt dans Claude Code pour lancer les corrections.

---

## Le prompt

```
Tu vas corriger les problèmes UX et accessibilité de 3 fichiers identifiés dans `critique-03-planning.md`. Lis ce fichier d'abord.

Fichiers concernés :
- `src/components/Planning.jsx` (1 681 lignes)
- `src/components/MemosPage.jsx` (1 884 lignes)
- `src/components/Calendar.jsx` (899 lignes)

IMPORTANT : Respecte les conventions du projet (voir CLAUDE.md) :
- Dark mode via prop `isDark` + ternaire, JAMAIS `dark:` Tailwind
- Couleur accent via prop `couleur` + `style={{ }}` inline
- Icônes : `lucide-react` uniquement

Après chaque tâche, lance `npm run build` pour vérifier.

## Tâche 1 — Corriger les subtask checkboxes et delete buttons (MemosPage — CRITIQUE)

### 1a. Subtask checkbox (ligne ~289)
Le checkbox des sous-tâches fait `w-4 h-4` = 16×16px. C'est inaccessible.

**Remplace** par `w-5 h-5` avec un wrapper cliquable :
```jsx
<button
  type="button"
  onClick={toggleSubtask}
  className="min-w-[44px] min-h-[44px] flex items-center justify-center -m-2.5"
  aria-label={subtask.done ? "Marquer comme non fait" : "Marquer comme fait"}
>
  <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ...`}>
    {subtask.done && <Check size={12} />}
  </div>
</button>
```
Le wrapper invisible de 44px crée une zone de tap suffisante autour du checkbox visuel de 20px.

### 1b. Delete subtask button (ligne ~306)
Le bouton de suppression fait `p-0.5` = ~16px.

**Remplace** par :
```jsx
<button
  type="button"
  onClick={deleteSubtask}
  className="min-w-[44px] min-h-[44px] flex items-center justify-center -m-2"
  aria-label="Supprimer la sous-tâche"
>
  <X size={14} className="text-red-400" />
</button>
```

Commande de vérification : `grep -n "w-4 h-4.*checkbox\|p-0.5" src/components/MemosPage.jsx`

## Tâche 2 — Remplacer les divs cliquables par des boutons

### 2a. Planning.jsx — Cellules jour (ligne ~606)
Les cellules du calendrier mois sont des `<div onClick>`. Ajoute :
```jsx
role="button"
tabIndex={0}
onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleDayClick(day); }}}
aria-label={`${day.getDate()} ${day.toLocaleDateString('fr-FR', { month: 'long' })}`}
```

### 2b. Planning.jsx — Items agenda (ligne ~1071)
Les items dans la vue agenda sont des `<div onClick>`. Même traitement : ajoute `role="button"`, `tabIndex={0}`, `onKeyDown`.

### 2c. MemosPage.jsx — MemoItem (ligne ~121)
Le composant MemoItem utilise un `<div onClick>`. Remplace le `<div>` racine par un `<button>` ou ajoute `role="button"` + `tabIndex={0}` + `onKeyDown`.

Si tu choisis `<button>`, assure `text-left w-full` pour conserver le layout.

Commande : `grep -n "div.*onClick" src/components/Planning.jsx src/components/MemosPage.jsx | head -20`

## Tâche 3 — Corriger la typographie 9px (Planning.jsx)

3 occurrences de `text-[9px]` :

| Ligne | Contexte | Remplacement |
|-------|----------|--------------|
| ~635 | Titres événements vue mois | `text-[11px] sm:text-xs` |
| ~1077 | Heures vue agenda | `text-[11px]` |
| ~1079 | Heures vue agenda | `text-[11px]` |

**Commande** : `grep -n "text-\[9px\]" src/components/Planning.jsx`

Remplace aussi les `text-[10px]` qui sont dans des contextes non-responsive par `text-[11px]` minimum. Les `text-[10px] sm:text-xs` déjà responsive sont OK.

## Tâche 4 — Corriger les touch targets < 44px (Planning.jsx)

### 4a. Back button (ligne ~442)
`min-w-[40px] min-h-[40px]` → `min-w-[44px] min-h-[44px]`

### 4b. Event button (ligne ~555)
`w-10 h-10` (40px) → `w-11 h-11` (44px)

### 4c. Month nav buttons (lignes ~568, 580)
`w-9 h-9` (36px) → `min-w-[44px] min-h-[44px]`

### 4d. Day circles dans le calendrier mois (ligne ~609)
`w-5 h-5 sm:w-6 sm:h-6` (20-24px) = trop petit pour le tap.

Solution : garder le cercle visuel à 20-24px mais ajouter un wrapper tap :
```jsx
<div className="min-w-[44px] min-h-[44px] flex items-center justify-center">
  <span className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full ...`}>
    {day.getDate()}
  </span>
</div>
```

### 4e. Day selector récurrence (ligne ~1602)
`w-8 h-8` (32px) → `min-w-[44px] min-h-[44px]`

### 4f. Close detail button (ligne ~1230)
`min-w-[40px] min-h-[40px]` → `min-w-[44px] min-h-[44px]`

**Commande** : `grep -n "w-9 h-9\|w-10 h-10\|min-w-\[40px\]\|w-8 h-8" src/components/Planning.jsx`

## Tâche 5 — Ajouter aria-labels sur les actions emoji (MemosPage.jsx)

### 5a. Quick action buttons (lignes ~214-228)
Ces boutons utilisent des emojis (🗑️📅🔴) sans labels. Ajoute :
```jsx
aria-label="Supprimer le mémo"   // 🗑️
aria-label="Planifier le mémo"   // 📅
aria-label="Priorité haute"      // 🔴
```

### 5b. Bulk action bar (lignes ~868-893)
Même problème en mode sélection multiple. Ajoute des `aria-label` descriptifs sur chaque bouton emoji.

### 5c. Navigation buttons Planning (lignes ~521, 568, 580)
Les boutons prev/next/today n'ont pas tous un aria-label. Ajoute :
```jsx
aria-label="Période précédente"  // ChevronLeft
aria-label="Période suivante"    // ChevronRight
aria-label="Aujourd'hui"         // bouton "Aujourd'hui"
```

Commande : `grep -n "aria-label" src/components/MemosPage.jsx src/components/Planning.jsx | wc -l`

## Tâche 6 — Focus trap + Escape sur Calendar.jsx RescheduleModal

Le modal `RescheduleModal` (lignes ~172-275 dans Calendar.jsx) n'a ni focus trap ni gestion Escape.

**Ajoute** :
```jsx
useEffect(() => {
  const handleEsc = (e) => {
    if (e.key === 'Escape') onClose();
  };
  document.addEventListener('keydown', handleEsc);
  return () => document.removeEventListener('keydown', handleEsc);
}, [onClose]);

useEffect(() => {
  if (isOpen) {
    const focusable = modalRef.current?.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    if (focusable?.length) focusable[0].focus();
  }
}, [isOpen]);
```

Ajoute aussi `role="dialog"` et `aria-modal="true"` sur le container du modal.

Commande : `grep -n "Escape\|focus\|role.*dialog" src/components/Calendar.jsx`

## Tâche 7 — Remplacer les couleurs hex inline (Planning.jsx)

### 7a. Border colors inline (ligne ~754)
```jsx
// AVANT
style={{ borderColor: isDark ? '#334155' : '#e2e8f0' }}
// APRÈS — utilise une classe Tailwind
className={`border ${isDark ? 'border-slate-700' : 'border-slate-200'}`}
```
Supprime le `style={{ borderColor: ... }}` et déplace dans className.

### 7b. Drag handle colors (ligne ~1139)
```jsx
// AVANT
style={{ backgroundColor: isDark ? '#475569' : '#cbd5e1' }}
// APRÈS
className={isDark ? 'bg-slate-600' : 'bg-slate-300'}
```

### 7c. Centraliser les event type colors
Crée ou mets à jour `src/constants/colors.js` avec un objet :
```js
export const EVENT_TYPE_COLORS = {
  rdv: { bg: 'bg-blue-500', text: 'text-blue-500', hex: '#3b82f6' },
  relance: { bg: 'bg-amber-500', text: 'text-amber-500', hex: '#f59e0b' },
  urgence: { bg: 'bg-red-500', text: 'text-red-500', hex: '#ef4444' },
  memo: { bg: 'bg-purple-500', text: 'text-purple-500', hex: '#8b5cf6' },
  deadline: { bg: 'bg-emerald-500', text: 'text-emerald-500', hex: '#10b981' },
};

export const MEMO_CATEGORIES = {
  // Extraire les constantes des lignes 17-28 de MemosPage.jsx
};

export const MEMO_PRIORITIES = {
  // Extraire les constantes des lignes 17-28 de MemosPage.jsx
};
```

Importe et utilise ces constantes dans Planning.jsx et MemosPage.jsx à la place des hex hardcodés.

**Note** : les couleurs utilisées dynamiquement avec `style={{ backgroundColor: couleur }}` (la prop accent) restent en inline.

Commande : `grep -n "#[0-9a-fA-F]\{6\}" src/components/Planning.jsx src/components/MemosPage.jsx`

## Tâche 8 — Améliorer le contraste dark mode sur les stats MemosPage

Les stats cards (lignes ~811-847) utilisent des bordures hex inline :
```jsx
style={{ borderColor: '#475569' }}  // dark
style={{ borderColor: '#cbd5e1' }}  // light
```

**Remplace** par des classes Tailwind :
```jsx
className={`border ${isDark ? 'border-slate-600' : 'border-slate-300'}`}
```

## Validation finale

1. `npm run build` — doit passer sans erreurs
2. `npm run lint` — pas de nouvelles erreurs
3. Vérifications :
   - `grep -n "text-\[9px\]" src/components/Planning.jsx` → 0 résultats
   - `grep -n "w-4 h-4" src/components/MemosPage.jsx | grep -i check` → 0 résultats
   - `grep -n "div.*onClick" src/components/Planning.jsx src/components/MemosPage.jsx | grep -v backdrop` → vérifie que les principaux sont convertis
   - `grep -n "min-w-\[40px\]" src/components/Planning.jsx` → 0 résultats
   - `grep -c "#[0-9a-fA-F]\{6\}" src/components/Planning.jsx` → significativement réduit
   - `grep -n "role=\"dialog\"\|aria-modal" src/components/Calendar.jsx` → au moins 1 résultat
4. Crée un commit : "fix(planning+memos): accessibility — fix touch targets, replace clickable divs, add ARIA labels, fix 9px text, centralize colors, add Calendar modal focus trap"
```
