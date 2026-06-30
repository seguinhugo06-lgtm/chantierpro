# MEGA PROMPT — Redesign Dashboard & Layout Architecture

Copie ce prompt dans Claude Code. C'est un gros refactoring. Fais-le en plusieurs sessions si nécessaire.

---

## Le prompt

```
Tu vas restructurer le Dashboard et les layouts de navigation de BatiGesti pour aérer le design et réduire la surcharge d'information. Lis les fichiers suivants AVANT de commencer :
- `principes-redesign-ux.md` — les 10 règles de design
- `wireframes-redesign.md` — les wireframes cibles par module

Respecte ABSOLUMENT les conventions du projet (CLAUDE.md) :
- Dark mode via prop `isDark` + ternaire, JAMAIS `dark:` Tailwind
- Couleur accent via prop `couleur` + `style={{ }}` inline
- Icônes : `lucide-react` uniquement
- Navigation : `setPage('nom')`

Après chaque tâche, `npm run build`.

⚠️ CE PROMPT EST LONG. Exécute les tâches dans l'ordre. Si tu atteins ta limite de contexte, arrête-toi proprement avec un commit et indique où tu t'es arrêté.

---

## PHASE 1 — Dashboard : Supprimer le dead code et les sections cachées

### Tâche 1.1 — Supprimer la section collapsible "Tableau de bord"

Dans `src/components/Dashboard.jsx` :

1. Supprime l'état `showOverviewSection` (ligne ~595) et `showWidgetConfig` (ligne ~594)
2. Supprime le state `dragWidget` (ligne ~596)
3. Supprime `widgetConfig`, `updateWidgetConfig`, `toggleWidgetVisibility`, `moveWidget`, `isWidgetVisible` (lignes ~655-695)
4. Supprime le bouton toggle "Tableau de bord" (ligne ~1831-1850)
5. Supprime TOUT le bloc `{showOverviewSection && (<>...</>)}` (lignes ~1853-2284)
   Cela inclut :
   - Widget config panel
   - OverviewWidget
   - ConsolidatedWidget
   - RevenueChartWidget
   - La grid 3 colonnes avec les 15 widgets (DevisWidget, RelanceWidget, ChantiersWidget, TresorerieWidget, AcomptesWidget, ReportsWidget, ScoreSanteWidget, ActivityFeedWidget, WeatherAlertsWidget, Team Widget, UsageAlerts, StockWidget, ConformityWidget, SousTraitantsAlerts, BankWidget)
6. Supprime les imports inutilisés correspondants (lignes ~59-95)

**NE SUPPRIME PAS** les composants fichiers dans `src/components/dashboard/` — ils pourront être réutilisés dans les pages dédiées.

`npm run build` — corrige les erreurs d'imports.

### Tâche 1.2 — Supprimer les sections hidden et dead code

1. Supprime la section `<section className="hidden">` (lignes ~1648-1675) — les boutons shortcuts cachés
2. Supprime le block `{false && ...}` s'il existe
3. Supprime le wrapper 2-column grid (lignes ~1641-1828) — la sidebar RIGHT (OnboardingChecklist, Profile Banner duplicate, Facture 2026 countdown) sera remplacée
4. Supprime les imports qui ne sont plus utilisés
5. Retire `presets.js` et `widgetRegistry.js` des imports s'ils ne sont plus référencés

`npm run build`

### Tâche 1.3 — Supprimer le Hero Duo conditionnel

Supprime le bloc Hero Duo "Devis IA / Devis Express" (lignes ~1248-1292).
Ces boutons seront ajoutés dans DevisPage à la place.

`npm run build`

---

## PHASE 2 — Dashboard : Nouveau layout "5 zones"

### Tâche 2.1 — Refactorer le HeroSection en Header Compact

Dans `src/components/dashboard/HeroSection.jsx` :

Simplifie le composant pour qu'il rende UNIQUEMENT :
```jsx
<header className={`px-4 sm:px-6 py-3 flex items-center justify-between ${isDark ? 'bg-slate-900' : 'bg-[#F5F7FA]'}`}>
  <div>
    <h1 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>
      {greeting} {userName}
    </h1>
    <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
      {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
    </p>
  </div>
  <div className="flex items-center gap-2">
    {/* Bouton notifications si count > 0 */}
    {actionsCount > 0 && (
      <button className="relative min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl ..." aria-label="Notifications">
        <Bell size={20} />
        <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center">
          {actionsCount}
        </span>
      </button>
    )}
    <button onClick={() => setPage('settings')} className="min-w-[44px] min-h-[44px] ..." aria-label="Paramètres">
      <Settings size={20} />
    </button>
  </div>
</header>
```

Hauteur cible : **56px fixe**. Retire le greeting dynamique long, les compteurs détaillés, et les animations. Le header doit être minimal.

### Tâche 2.2 — Créer le Notification Strip

Crée un nouveau composant `src/components/dashboard/NotificationStrip.jsx` :

```jsx
/**
 * NotificationStrip — Affiche UN SEUL banner de notification, le plus prioritaire.
 * Priorité : urgent (rouge) > warning (amber) > info (bleu)
 */
export function NotificationStrip({ isDark, couleur, notifications, onAction, onDismiss }) {
  // notifications = [{ id, type: 'urgent'|'warning'|'info', title, cta, ctaAction }]
  // Trie par priorité et n'affiche que le premier
  const priority = { urgent: 3, warning: 2, info: 1 };
  const sorted = [...notifications].sort((a, b) => (priority[b.type] || 0) - (priority[a.type] || 0));
  const notif = sorted[0];
  if (!notif) return null;

  const colors = {
    urgent: { bg: isDark ? 'bg-red-500/10' : 'bg-red-50', border: 'border-l-4 border-red-500', text: isDark ? 'text-red-300' : 'text-red-800' },
    warning: { bg: isDark ? 'bg-amber-500/10' : 'bg-amber-50', border: 'border-l-4 border-amber-500', text: isDark ? 'text-amber-300' : 'text-amber-800' },
    info: { bg: isDark ? 'bg-blue-500/10' : 'bg-blue-50', border: 'border-l-4 border-blue-500', text: isDark ? 'text-blue-300' : 'text-blue-800' },
  };
  const c = colors[notif.type] || colors.info;

  return (
    <div className={`mx-4 sm:mx-6 mb-5 rounded-xl ${c.bg} ${c.border} overflow-hidden`}>
      <div className="flex items-center gap-3 px-4 py-3">
        <p className={`flex-1 text-sm font-medium ${c.text}`}>{notif.title}</p>
        {notif.cta && (
          <button
            onClick={notif.ctaAction}
            className="flex-shrink-0 px-4 py-2 rounded-lg text-xs font-semibold text-white min-h-[44px]"
            style={{ backgroundColor: notif.type === 'urgent' ? '#ef4444' : couleur }}
          >
            {notif.cta}
          </button>
        )}
        {onDismiss && (
          <button onClick={() => onDismiss(notif.id)} className="min-w-[44px] min-h-[44px] flex items-center justify-center" aria-label="Fermer">
            <X size={16} className={isDark ? 'text-slate-400' : 'text-slate-500'} />
          </button>
        )}
      </div>
    </div>
  );
}
```

### Tâche 2.3 — Créer le KPI Strip

Crée `src/components/dashboard/KPIStrip.jsx` :

```jsx
/**
 * KPIStrip — 4 métriques inline, 2 colonnes mobile / 4 desktop
 * Chaque KPI est cliquable et navigue vers la page dédiée.
 */
export function KPIStrip({ isDark, couleur, kpis }) {
  // kpis = [{ label, value, trend, trendUp, icon: LucideIcon, onClick }]
  return (
    <div className="px-4 sm:px-6 mb-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {kpis.map((kpi, i) => (
          <button
            key={i}
            onClick={kpi.onClick}
            className={`flex items-center gap-3 p-4 rounded-xl border transition-all hover:shadow-md active:scale-[0.98] text-left ${
              isDark ? 'bg-slate-800 border-slate-700 hover:bg-slate-750' : 'bg-white border-slate-200 hover:bg-slate-50'
            }`}
          >
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: `${couleur}15` }}>
              <kpi.icon size={20} style={{ color: couleur }} />
            </div>
            <div className="min-w-0">
              <p className={`text-lg font-bold leading-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                {kpi.value}
              </p>
              <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{kpi.label}</p>
              {kpi.trend && (
                <p className={`text-[11px] font-medium ${kpi.trendUp ? 'text-emerald-500' : 'text-red-500'}`}>
                  {kpi.trendUp ? '↗' : '↘'} {kpi.trend}
                </p>
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
```

### Tâche 2.4 — Refactorer les "Actions du jour"

Le composant "Actions du jour" (lignes ~1501-1638) existe déjà mais affiche trop d'items. Modifie-le :

1. Limite à **3 items maximum** (pas de scroll)
2. Supprime le "Voir toutes les X actions →" link
3. Ajoute `mb-6` (24px) après la section au lieu de `mb-3`
4. Chaque item : `py-4` au lieu de `py-2` (plus aéré)
5. Gap entre items : `gap-3` au lieu de `gap-1.5`

### Tâche 2.5 — Créer la Dashboard Grid 2x2

Crée `src/components/dashboard/DashboardGrid.jsx` :

Ce composant rend une grille 2x2 avec 4 cards :

1. **Devis récents** — reprend la logique de `DevisWidget` simplifié (3 items max + CTA "Voir tout" + CTA "+ Nouveau devis")
2. **Chantiers actifs** — reprend `ChantiersWidget` simplifié (3 items + progress bars + CTA)
3. **Trésorerie** — reprend `TresorerieWidget` simplifié (solde + trend + prévision 30j)
4. **Alertes** — agrège les alertes de StockWidget + WeatherAlerts + ConformityWidget (max 3 alertes + CTA)

Layout :
```jsx
<div className="px-4 sm:px-6 pb-6">
  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
    {/* 4 cards */}
  </div>
</div>
```

Chaque card utilise le pattern :
```jsx
<div className={`rounded-xl border p-5 ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
  <div className="flex items-center justify-between mb-4">
    <h3 className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>Titre</h3>
    <button onClick={navigateToPage} className="text-xs font-medium" style={{ color: couleur }}>
      Voir tout →
    </button>
  </div>
  <div className="space-y-3">
    {/* 3 items max */}
  </div>
</div>
```

Padding interne **p-5** (pas p-3). Espacement items **space-y-3** (pas space-y-1.5).

### Tâche 2.6 — Assembler le nouveau Dashboard

Dans `src/components/Dashboard.jsx`, le return doit maintenant être :

```jsx
return (
  <div className={`pb-20 lg:pb-0 min-h-screen ${isDark ? 'bg-slate-900' : 'bg-[#F5F7FA]'}`}>
    {/* 1. Header compact */}
    <HeroSection
      userName={...}
      isDark={isDark}
      couleur={couleur}
      actionsCount={actionsCount}
      setPage={setPage}
    />

    <div className="max-w-[1440px] mx-auto pt-4">
      {/* 2. Notification Strip (1 seul, le plus urgent) */}
      <NotificationStrip
        isDark={isDark}
        couleur={couleur}
        notifications={allNotifications}
        onAction={handleNotificationAction}
        onDismiss={dismissNotification}
      />

      {/* 3. KPI Strip */}
      <KPIStrip
        isDark={isDark}
        couleur={couleur}
        kpis={[
          { label: 'À encaisser', value: formatMontant(stats.aEncaisser), icon: Wallet, onClick: () => setShowEncaisser(true), trend: '+12%', trendUp: true },
          { label: 'CA ce mois', value: formatMontant(stats.caMois), icon: TrendingUp, onClick: () => setShowCeMois(true) },
          { label: 'Devis en attente', value: String(stats.devisEnAttente), icon: FileText, onClick: () => setPage('devis') },
          { label: 'Chantiers actifs', value: String(stats.chantiersActifs), icon: HardHat, onClick: () => setPage('chantiers') },
        ]}
      />

      {/* 4. Actions du jour (max 3) */}
      {sortedActions.length > 0 && (
        <ActionsSection actions={sortedActions.slice(0, 3)} isDark={isDark} couleur={couleur} />
      )}

      {/* 5. Dashboard Grid 2x2 */}
      <DashboardGrid
        isDark={isDark}
        couleur={couleur}
        devis={safeDevis}
        chantiers={chantiersEnCours}
        tresorerie={tresorerieData}
        alerts={consolidatedAlerts}
        setPage={setPage}
      />
    </div>

    {/* Modals existants — garder RelanceModal, EncaisserModal, CeMoisModal */}
    {showRelance && <RelanceModal ... />}
    {showEncaisser && <EncaisserModal ... />}
    {showCeMois && <CeMoisModal ... />}
  </div>
);
```

Supprime tout le reste du return actuel qui n'est pas dans cette structure.

`npm run build` — corrige toutes les erreurs.

---

## PHASE 3 — Spacing global "aérer"

### Tâche 3.1 — Augmenter le whitespace dans les composants partagés

Dans TOUS les fichiers modifiés et les modules principaux, fais un search & replace :

| Cherche | Remplace par | Contexte |
|---------|-------------|----------|
| `mb-2">` (fin de section) | `mb-5">` | Entre sections majeures |
| `mb-3">` (fin de section) | `mb-5">` | Entre sections majeures |
| `gap-2">` (grids) | `gap-4">` | Grids de cards |
| `gap-1.5">` (lists) | `gap-3">` | Listes d'items |
| `p-3">` (cards) | `p-5">` | Cards dashboard |
| `py-2 ` (list items) | `py-3 ` | Items de liste |
| `space-y-1.5` | `space-y-3` | Listes verticales dans les widgets |

**IMPORTANT** : Ne fais PAS ce remplacement aveuglément sur tout le projet. Applique-le uniquement sur :
- `src/components/Dashboard.jsx`
- `src/components/dashboard/*.jsx` (tous les fichiers du dossier dashboard)

Pour les autres modules, n'applique que `mb-2 → mb-5` et `mb-3 → mb-5` sur les sections de premier niveau (les `<section>` directement dans le return principal).

`npm run build`

---

## PHASE 4 — Tabs des modules intérieurs

### Tâche 4.1 — Créer un composant TabBar réutilisable

Crée `src/components/ui/TabBar.jsx` :

```jsx
import { MoreHorizontal } from 'lucide-react';
import { useState, useRef } from 'react';

/**
 * TabBar — Max 5 tabs visibles + menu "..." pour le reste.
 * @param {Array} tabs - [{ key, label, icon: LucideIcon, badge, alert }]
 * @param {string} activeTab
 * @param {Function} onTabChange
 * @param {number} maxVisible - default 5
 */
export function TabBar({ tabs, activeTab, onTabChange, maxVisible = 5, isDark, couleur }) {
  const [showMore, setShowMore] = useState(false);
  const moreRef = useRef(null);

  const visibleTabs = tabs.slice(0, maxVisible);
  const overflowTabs = tabs.slice(maxVisible);

  return (
    <div className="relative px-4 sm:px-6 mb-5">
      <div className={`flex items-center gap-1 border-b ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
        {visibleTabs.map(tab => (
          <button
            key={tab.key}
            role="tab"
            aria-selected={activeTab === tab.key}
            onClick={() => onTabChange(tab.key)}
            className={`flex items-center gap-2 px-4 min-h-[48px] text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              activeTab === tab.key
                ? 'border-current'
                : `border-transparent ${isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-700'}`
            }`}
            style={activeTab === tab.key ? { color: couleur, borderColor: couleur } : undefined}
          >
            {tab.icon && <tab.icon size={16} />}
            <span className="hidden sm:inline">{tab.label}</span>
            {tab.badge > 0 && (
              <span className={`ml-1 px-1.5 py-0.5 rounded-full text-[11px] font-bold ${
                tab.alert ? 'bg-red-500 text-white' : isDark ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-600'
              }`}>
                {tab.badge}
              </span>
            )}
          </button>
        ))}

        {overflowTabs.length > 0 && (
          <div className="relative ml-auto" ref={moreRef}>
            <button
              onClick={() => setShowMore(p => !p)}
              className={`flex items-center gap-1 px-3 min-h-[48px] text-sm ${isDark ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-900'}`}
              aria-expanded={showMore}
              aria-label="Plus d'onglets"
            >
              <MoreHorizontal size={18} />
            </button>
            {showMore && (
              <>
                <div className="fixed inset-0 z-30" onClick={() => setShowMore(false)} role="presentation" />
                <div className={`absolute right-0 top-full mt-1 z-40 rounded-xl border shadow-lg py-1 min-w-[180px] ${
                  isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
                }`}>
                  {overflowTabs.map(tab => (
                    <button
                      key={tab.key}
                      onClick={() => { onTabChange(tab.key); setShowMore(false); }}
                      className={`w-full flex items-center gap-3 px-4 py-3 text-sm text-left ${
                        activeTab === tab.key ? 'font-semibold' : ''
                      } ${isDark ? 'hover:bg-slate-700 text-slate-200' : 'hover:bg-slate-50 text-slate-700'}`}
                      style={activeTab === tab.key ? { color: couleur } : undefined}
                    >
                      {tab.icon && <tab.icon size={16} />}
                      {tab.label}
                      {tab.badge > 0 && (
                        <span className={`ml-auto px-1.5 py-0.5 rounded-full text-[11px] font-bold ${
                          tab.alert ? 'bg-red-500 text-white' : isDark ? 'bg-slate-700' : 'bg-slate-100'
                        }`}>{tab.badge}</span>
                      )}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
```

Ajoute l'export dans `src/components/ui/index.js`.

### Tâche 4.2 — Appliquer TabBar dans Equipe.jsx

Remplace la navigation tabs custom (lignes ~1785-1840) par :
```jsx
<TabBar
  tabs={[
    { key: 'overview', label: 'Équipe', icon: Users, badge: employesList.length },
    { key: 'planning', label: 'Planning', icon: CalendarDays },
    { key: 'pointage', label: 'Pointage', icon: Timer },
    { key: 'conges', label: 'Congés', icon: CalendarOff, badge: pendingConges },
    { key: 'validation', label: 'Validation', icon: CheckSquare, badge: pointagesEnAttente.length, alert: true },
    // Overflow →
    { key: 'chat', label: 'Communication', icon: Phone },
    { key: 'competences', label: 'Compétences', icon: Award },
    { key: 'productivite', label: 'Productivité', icon: BarChart3 },
    { key: 'historique', label: 'Export', icon: FileSpreadsheet },
  ]}
  activeTab={activeTab}
  onTabChange={setActiveTab}
  maxVisible={5}
  isDark={isDark}
  couleur={couleur}
/>
```

### Tâche 4.3 — Appliquer TabBar dans Catalogue.jsx

Même approche. maxVisible={5}. Tabs overflow : Favoris (→ filtre dans Articles), Coefs.

### Tâche 4.4 — Appliquer TabBar dans Chantiers.jsx (vue detail)

maxVisible={6}. Tabs overflow : Notes, Garanties, Rapports, Mémos, Journal.

### Tâche 4.5 — Appliquer TabBar dans FinancesPage.jsx

maxVisible={4}. Tabs overflow : Rapports, Export.

`npm run build` après chaque modification de module.

---

## PHASE 5 — Ajouter les boutons Devis dans DevisPage

### Tâche 5.1 — Ajouter "Devis IA" et "Devis Express" dans DevisPage header

Dans `src/components/DevisPage.jsx`, dans le header de la page (zone des boutons d'action), ajoute 2 boutons :

```jsx
<button onClick={() => setPage('ia-devis')} className="...rounded-xl px-4 py-2.5 min-h-[44px]..." style={{ backgroundColor: '#7c3aed' }}>
  <MessageCircle size={16} className="text-white" />
  <span className="text-white text-sm font-semibold">Devis IA</span>
</button>
<button onClick={() => setShowDevisExpress(true)} className="...rounded-xl px-4 py-2.5 min-h-[44px]..." style={{ backgroundColor: couleur }}>
  <Zap size={16} className="text-white" />
  <span className="text-white text-sm font-semibold">Devis Express</span>
</button>
```

Ces boutons remplacent le Hero Duo supprimé du Dashboard.

---

## PHASE 6 — Validation finale

### Tâche 6.1 — Build + Lint
```bash
npm run build
npm run lint
```

### Tâche 6.2 — Vérifications structurelles
```bash
# Dashboard ne doit plus avoir de widget config
grep -c "showWidgetConfig\|widgetConfig\|toggleWidgetVisibility\|moveWidget\|isWidgetVisible\|showOverviewSection\|dragWidget" src/components/Dashboard.jsx
# Résultat attendu : 0

# Dashboard ne doit plus avoir de Hero Duo
grep -c "Devis IA\|Devis Express\|safeDevis.length < 5" src/components/Dashboard.jsx
# Résultat attendu : 0

# TabBar est utilisé dans les modules
grep -rn "TabBar" src/components/Equipe.jsx src/components/Catalogue.jsx src/components/Chantiers.jsx src/components/FinancesPage.jsx
# Résultat attendu : 4+ résultats

# Spacing vérifié
grep -c "mb-2\b" src/components/Dashboard.jsx
# Résultat attendu : très peu (remplacé par mb-5)
```

### Tâche 6.3 — Commit
```
git add -A
git commit -m "refactor(dashboard+layout): restructure to 5-zone layout, create TabBar component, remove 15+ collapsed widgets, aerate spacing

- Dashboard: reduce from 15+ sections to 5 zones (header, notification, KPI strip, actions, 2x2 grid)
- Remove collapsible overview section with 15 individual widgets
- Create NotificationStrip (single priority-based banner)
- Create KPIStrip (4 inline metrics)
- Create DashboardGrid (2x2 consolidated cards)
- Create TabBar shared component with overflow menu
- Apply TabBar to Equipe (9→5+menu), Catalogue (7→5+menu), Chantiers (11→6+menu), Finances (6→4+menu)
- Move Devis IA/Express buttons to DevisPage header
- Increase whitespace: gap-3→gap-4, p-3→p-5, mb-2→mb-5"
```
```
