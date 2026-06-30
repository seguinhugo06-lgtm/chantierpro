# Prompt Claude Code — Dashboard UX Cleanup

Copie ce prompt dans Claude Code pour lancer le refactoring.

---

## Le prompt

```
Tu vas corriger les problèmes UX du Dashboard identifiés dans `dashboard-design-critique.md`. Lis ce fichier d'abord pour le contexte complet. Les changements sont organisés en 5 tâches ordonnées par impact. Après chaque tâche, lance `npm run build` pour vérifier qu'il n'y a pas de régression.

IMPORTANT : Respecte les conventions du projet (voir CLAUDE.md) :
- Dark mode via prop `isDark` + ternaire, JAMAIS `dark:` Tailwind
- Couleur accent via prop `couleur` + `style={{ }}` inline
- Icônes : `lucide-react` uniquement
- Navigation : `setPage('nom')`, pas de React Router

## Tâche 1 — Supprimer le code mort et réduire le bruit

Dans `src/components/Dashboard.jsx` :

1. **Supprime le bloc "Hero Duo" désactivé** (~lignes 1255-1299) — le bloc entier enveloppé dans `{false && canCreateDevis && (`. Supprime le JSX et les imports inutilisés que ça libère (`MessageCircle`, `Sparkles` si plus utilisé ailleurs, `Zap` si plus utilisé).

2. **Supprime le bloc "Secondary Shortcuts" caché** (~lignes 1648-1676) — la `<section className="hidden">` avec les boutons +Client, +Chantier, +Mémo, +Devis rapide. Code mort.

3. **Supprime `Dashboard.jsx.backup`** :
   ```bash
   rm src/components/Dashboard.jsx.backup
   ```

4. **Vérifie** que tous les imports en haut du fichier sont encore utilisés après les suppressions. Supprime les imports orphelins.

Vérifie avec : `npm run build`

## Tâche 2 — Restructurer le layout "above the fold"

L'objectif : un utilisateur voit en un coup d'oeil (sans scroll) les 4 infos essentielles : salutation, KPIs financiers, actions urgentes, chantiers en cours.

### 2a. Déplacer le sparkline dans la section collapsible

Le sparkline "CA 6 derniers mois" (l'IIFE `{(() => { const months = []; ...` ~lignes 1399-1504) est actuellement entre les KPIs et les actions du jour. C'est une information de tendance, pas d'action immédiate.

**Action :** Déplace ce bloc APRÈS la section `{/* Vue d'ensemble header */}` (~ligne 1870), juste avant le `{showOverviewSection && (<>` wrapper. Ainsi il apparaît dans la zone "Tableau de bord" avec les autres widgets analytiques.

### 2b. Fusionner les deux banners de profil

Il y a actuellement :
- Un banner compact (lignes ~1208-1227) qui s'affiche si `profileCompletude < 80`
- Un banner détaillé dans la colonne droite (lignes ~1771-1821) qui s'affiche si `profileCompletude >= 50 && < 80`

Ils se chevauchent quand le profil est entre 50-80%.

**Action :** Garde uniquement le banner compact. Supprime le banner détaillé de la colonne droite (le bloc `{profileCompletude >= 50 && profileCompletude < 80 && (`). Le compact est suffisant — il a déjà le bouton "Compléter" qui navigue vers Settings.

### 2c. Rendre "Tableau de bord" ouvert par défaut

Ligne ~602 : `const [showOverviewSection, setShowOverviewSection] = useState(false);`

**Change en :** `useState(true)`

Les widgets opérationnels (Devis, Chantiers, Trésorerie, etc.) ne doivent pas être cachés par défaut — c'est le coeur de l'app.

### 2d. Augmenter les actions du jour de 3 à 5

Ligne ~1561 : `const sorted = allSorted.slice(0, 3);`

**Change en :** `allSorted.slice(0, 5)`

## Tâche 3 — Élever visuellement les KPI duo

Les KPIs "À encaisser" et "Ce mois" sont les chiffres les plus importants du dashboard mais ressemblent à des cartes secondaires.

### 3a. Agrandir la typographie des valeurs

Dans les deux `<button>` KPI (~lignes 1306-1362), change la taille de la valeur principale :

**Avant :**
```jsx
<p className={`text-lg font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
```

**Après :**
```jsx
<p className={`text-2xl font-bold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
```

### 3b. Agrandir le label

**Avant :** `text-xs font-medium`
**Après :** `text-sm font-medium`

### 3c. Augmenter le padding

**Avant :** `p-3.5`
**Après :** `p-4 sm:p-5`

### 3d. Ajouter un fond teinté avec la couleur accent

**Avant (les deux boutons KPI) :**
```jsx
className={`rounded-xl border p-3.5 text-left ...`}
```

**Après :** Ajoute un style inline pour le fond teinté :
```jsx
style={{
  borderLeftWidth: '3px',
  borderLeftColor: couleur,
  background: isDark ? `${couleur}08` : `${couleur}04`
}}
```

Cela donne un léger halo de couleur qui attire l'oeil sans être agressif. Applique-le sur les DEUX cartes KPI ("À encaisser" et "Ce mois"). Pour la carte "Ce mois", garde la logique existante de `borderLeftColor` basée sur la tendance.

## Tâche 4 — Unifier le styling des cartes

### 4a. Standardiser les border-radius

Cherche dans Dashboard.jsx et ses sous-composants dashboard/ :
- `rounded-lg` sur des cartes → remplace par `rounded-xl`
- `rounded-2xl` sur des cartes individuelles → remplace par `rounded-xl`

Garde `rounded-2xl` UNIQUEMENT pour les containers pleine largeur (le wrapper principal, la section "Vue d'ensemble").

Fichiers à vérifier : `Dashboard.jsx`, `HeroSection.jsx`, `KPICard.jsx`, `DevisWidget.jsx`, `ChantiersWidget.jsx`, `TresorerieWidget.jsx`, `SuggestionsSection.jsx`, `Widget.jsx`.

### 4b. Standardiser les conteneurs d'icônes

Deux tailles standard :
- **Standard** : `w-8 h-8 rounded-lg flex items-center justify-center` (icône 16px)
- **Hero** : `w-10 h-10 rounded-xl flex items-center justify-center` (icône 20px)

Cherche les variantes `w-7 h-7`, `w-9 h-9`, `w-11 h-11` dans le dashboard et normalise :
- `w-7 h-7` dans les KPIs et banners → `w-8 h-8`
- `w-9 h-9` dans les widget headers → `w-8 h-8`
- `w-14 h-14` dans les empty states → `w-12 h-12` (réduire légèrement)

### 4c. Standardiser le espacement entre sections

Cherche les `mb-2`, `mb-3`, `pb-2`, `pb-3` incohérents entre les sections du dashboard.

**Standard :** `mb-4` (16px) entre les sections principales. `gap-3` (12px) pour le grid interne.

Applique `mb-4` sur chaque `<section>` de premier niveau dans le render du Dashboard (profile banner, urgent action, KPI duo, actions du jour, grid layout).

## Tâche 5 — Corriger les problèmes d'accessibilité

### 5a. Contraste dark mode

Dans tout `Dashboard.jsx` et ses sous-composants `src/components/dashboard/*.jsx` :

Cherche les occurrences de `text-slate-400` utilisées en dark mode comme texte secondaire :
```
isDark ? 'text-slate-400' : 'text-slate-500'
```

**Remplace TOUTES par :**
```
isDark ? 'text-slate-300' : 'text-slate-500'
```

`text-slate-300` (#cbd5e1) sur `bg-slate-800` (#1e293b) = 5.8:1 (passe AA).
`text-slate-400` (#94a3b8) sur `bg-slate-800` (#1e293b) = 3.6:1 (échoue AA).

Fais attention à ne PAS changer les occurrences où `text-slate-400` est utilisée en mode LIGHT (ex: pour les dividers, les icônes décoratives). Change uniquement les patterns `isDark ? 'text-slate-400'`.

Fichiers concernés :
- `Dashboard.jsx`
- `HeroSection.jsx`
- `KPICard.jsx`
- `DevisWidget.jsx`
- `ChantiersWidget.jsx`
- `TresorerieWidget.jsx`
- `SuggestionsSection.jsx`
- `RevenueChartWidget.jsx`
- `ActivityFeedWidget.jsx`
- `ScoreSanteWidget.jsx`
- `OverviewWidget.jsx`
- `Widget.jsx`

### 5b. Touch targets minimum

Cherche les boutons/liens interactifs sans `min-h-[44px]` dans Dashboard.jsx :

- Les pills "missing field" du profile banner (`px-2.5 py-1`) → ajoute `min-h-[44px] min-w-[44px]`
- Le lien "Voir détails →" du sparkline → ajoute `min-h-[44px] flex items-center`
- Les boutons de la barre d'actions "Personnaliser" → vérifie qu'ils ont tous `min-h-[44px]`

### 5c. ARIA manquants

1. **Sparkline chart** : Ajoute un `aria-label` sur le container :
```jsx
<div style={{ width: '100%', height: 110 }} role="img" aria-label={`Graphique du chiffre d'affaires sur 6 mois : total ${formatMoney(totalCA)}`}>
```

2. **Toggle "Personnaliser"** : Ajoute `aria-expanded` :
```jsx
<button
  onClick={() => setShowWidgetConfig(!showWidgetConfig)}
  aria-expanded={showWidgetConfig}
  ...
```

3. **Toggle "Tableau de bord"** : Ajoute `aria-expanded` :
```jsx
<button onClick={() => setShowOverviewSection(p => !p)} aria-expanded={showOverviewSection} ...
```

## Validation finale

Après toutes les tâches :
1. `npm run build` — doit passer sans erreurs
2. `npm run lint` — pas de nouvelles erreurs
3. Vérifie qu'il n'y a plus de code mort :
   - `grep -n "false &&" src/components/Dashboard.jsx` → 0 résultats
   - `grep -n 'className="hidden"' src/components/Dashboard.jsx` → 0 résultats
   - `ls src/components/Dashboard.jsx.backup` → fichier absent
4. Vérifie le contraste : `grep -n "text-slate-400" src/components/Dashboard.jsx` → uniquement en mode light
5. Crée un commit : "refactor(dashboard): UX cleanup — reduce density, elevate KPIs, fix a11y contrast"
```
