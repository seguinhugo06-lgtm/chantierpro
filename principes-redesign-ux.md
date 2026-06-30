# Principes de Redesign UX — BatiGesti

Document de référence pour restructurer l'information et aérer le design de chaque module.

---

## Constat actuel

Le Dashboard empile **15+ sections verticales** : HeroSection → Profile Banner → Urgent Action → Hero Duo → Mini KPI Duo → Sparkline row → Actions du jour → 2-column grid (Devis + Chantiers) → Chantiers en cours → Trésorerie → Score Santé → Section collapsible (Overview + config widgets) → Revenue Chart → Activity Feed → Stock Alerts.

Les pages intérieures (Equipe 5 129 lignes / 9 tabs, Catalogue 2 971 lignes / 7 tabs, DevisPage 5 691 lignes / 6 modes) reproduisent ce pattern de surcharge.

**Problème principal** : chaque feature a été ajoutée en section verticale supplémentaire, sans jamais retirer ni consolider. L'utilisateur scrolle indéfiniment sans hiérarchie claire.

---

## 10 Principes de redesign

### 1. Règle des 3 zones max par viewport

Chaque écran visible (sans scroll) doit contenir **au maximum 3 zones d'information distinctes**. Au-delà, l'utilisateur ne sait plus où regarder.

**Avant** : Dashboard = Hero + Banner + KPIs + Actions + Widgets + Chantiers + Trésorerie = 7 zones visibles
**Après** : Dashboard = Hero compact (1) + KPI strip horizontal (2) + Zone de contenu principale (3)

### 2. Hiérarchie "Header → Metrics → Content → Actions"

Chaque page suit un flow unique :
1. **Header** (48-64px) : titre + navigation retour + 1-2 boutons primaires
2. **Metrics strip** (optionnel, 60-80px) : 2-4 KPIs inline horizontaux, jamais en cards séparées
3. **Content** : la zone principale (liste, formulaire, grille, etc.)
4. **Actions** : FAB mobile ou barre bottom, jamais dans le header ET dans le contenu

### 3. Fusion des micro-sections

Si deux sections font moins de 80px chacune, elles doivent fusionner en une seule. Les banners (profil, urgent, onboarding) se combinent en un seul "notification tray" dismissable.

**Dashboard concrètement** :
- Profile Banner + Urgent Action + Hero Duo → **1 seul "Action Strip"** avec priorité (rouge > amber > info)
- Mini KPI Duo + Sparkline → **1 KPI strip horizontal** (4 métriques inline)

### 4. Pas de section conditionnelle "cachée par défaut"

Si `showOverviewSection` est `false` par défaut (Dashboard ligne 595), c'est que la section n'est pas assez importante pour exister. Soit elle monte dans la hiérarchie (toujours visible), soit elle disparaît.

**Règle** : tout contenu caché par défaut dans un accordéon sera évalué. S'il n'est pas consulté régulièrement → supprimer. S'il est important → le rendre visible sans toggle.

### 5. Widgets consolidés, pas empilés

Au lieu de 6 widgets individuels (Devis, Chantiers, Trésorerie, Stock, Relances, Score Santé), créer un **Dashboard Grid de 4 cards maximum** en 2x2 desktop / stack mobile.

Chaque card = 1 titre + 1 métrique hero + 1-2 lignes de détail + 1 CTA. Pas plus.

### 6. Tabs : max 5 visibles, le reste en "More"

Equipe a 9 tabs, Catalogue en a 7. Sur mobile, la majorité sont illisibles ou tronquées.

**Règle** :
- Desktop : max 6 tabs visibles
- Mobile : max 4 tabs visibles + menu "..." pour le reste
- Chaque tab visible doit être un mot complet (pas d'abréviation "S-T", "Valid.")

### 7. Whitespace intentionnel

Espacement minimum entre sections : `gap-6` (24px) au lieu de `gap-3` (12px) actuel.
Padding interne des cards : `p-5` minimum au lieu de `p-3`.
Marge entre header et contenu : `mb-6` au lieu de `mb-2/mb-3`.

**Cible** : le contenu "respire". Un artisan sur chantier avec un écran sali ne doit jamais confondre deux zones.

### 8. Couleur fonctionnelle, pas décorative

Les couleurs ne servent qu'à 3 choses :
1. **Status** (rouge = urgent, amber = attention, vert = ok, bleu = info)
2. **Accent** (la prop `couleur` pour les CTA et éléments interactifs)
3. **Hiérarchie** (texte primary/secondary/muted)

Supprimer les gradients décoratifs sur les boutons Hero, les backgrounds colorés légers qui n'apportent rien, les dots de couleur sans texte.

### 9. Actions contextuelles, pas globales

Les boutons d'action apparaissent **là où l'utilisateur en a besoin**, pas dans un header global :
- "Nouveau devis" → dans la vue liste des devis, pas dans le dashboard
- "Ajouter employé" → dans la page Equipe, pas dans la barre de navigation
- Le Dashboard ne propose que 1-2 actions maximum (le plus urgent)

### 10. Mobile-first, pas mobile-adapted

Concevoir pour 375px d'abord, puis ajouter du contenu pour les écrans plus grands. Pas l'inverse.

**Concrètement** :
- KPIs : 2 sur mobile, 4 sur desktop (pas 4 partout avec text-[9px] pour que ça rentre)
- Widgets : stack vertical sur mobile, grid sur desktop
- Tables : vue card sur mobile, table sur desktop (jamais de scroll horizontal)

---

## Application au Dashboard (wireframe cible)

```
┌─────────────────────────────────────────────┐
│ HEADER (48px)                                │
│ "Bonjour Hugo" + date      [⚙️] [🔔 badge] │
├─────────────────────────────────────────────┤
│ NOTIFICATION STRIP (0-64px, conditionnel)    │
│ [🔴 2 factures en retard — Voir]            │
│ (un seul banner, le plus urgent)            │
├─────────────────────────────────────────────┤
│ KPI STRIP (80px)                             │
│ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐        │
│ │À enc.│ │CA mois│ │Devis │ │Chant.│        │
│ │12 340│ │ 8 200│ │  5   │ │  3   │        │
│ └──────┘ └──────┘ └──────┘ └──────┘        │
│ (2 sur mobile, 4 sur desktop)               │
├─────────────────────────────────────────────┤
│ ACTIONS DU JOUR (1-3 items max)              │
│ • Relancer Devis #42 (3j sans réponse)      │
│ • Mémo: Commander ferraille chantier Dupont  │
│ • Facture #18 à envoyer                      │
├─────────────────────────────────────────────┤
│ DASHBOARD GRID (2x2 desktop / stack mobile)  │
│ ┌─────────────────┬─────────────────┐        │
│ │ Devis récents   │ Chantiers actifs│        │
│ │ 3 items max     │ 3 items max     │        │
│ │ [Voir tout →]   │ [Voir tout →]   │        │
│ ├─────────────────┼─────────────────┤        │
│ │ Trésorerie      │ Stock / Alertes │        │
│ │ Solde + trend   │ 2 alertes max   │        │
│ │ [Détails →]     │ [Voir tout →]   │        │
│ └─────────────────┴─────────────────┘        │
│ (la ligne 2 est visible sans scroll          │
│  desktop, scroll 1x sur mobile)              │
├─────────────────────────────────────────────┤
│ FIN — pas de section supplémentaire          │
│ (ScoreSanté, RevenueChart, ActivityFeed,     │
│  WeatherAlerts → supprimés ou dans les       │
│  pages dédiées)                               │
└─────────────────────────────────────────────┘
```

**Ce qui disparaît du Dashboard** :
- Profile completion banner → Settings (avec badge notification)
- Hero Duo (Devis IA / Express) → reste uniquement si <5 devis, sinon supprimé
- Section collapsible Overview → supprimée
- Widget config/drag-drop → supprimé (complexité inutile)
- Score Santé → Analytics page
- Revenue Chart → Analytics page
- Activity Feed → devient les "Actions du jour" (max 3)
- Weather Alerts → notification strip si pertinent
- Consolidated Widget → page dédiée multi-entreprise

---

## Application aux modules intérieurs

### Principe commun : "Header → Metrics → Content"

Chaque module applique le même squelette :

```
HEADER (48-64px) : Titre + Back + 1-2 boutons
METRICS (optionnel, 60-80px) : 2-4 KPIs inline
CONTENT (le reste) : Tabs ou liste/detail
```

### Changements spécifiques :

| Module | Avant | Après |
|--------|-------|-------|
| **Equipe** | 9 tabs | 5 tabs max + "..." menu |
| **Catalogue** | 7 tabs + 5-stat bar + table | 5 tabs + 2 KPIs inline + table/card |
| **DevisPage** | 6 modes + 18 modals + 80 inline styles | 3 modes max (liste/edit/preview) |
| **Chantiers** | 11 tabs + 3 rare tabs | 6 tabs max + "..." |
| **Finances** | 6 tabs lazy-loaded | 4 tabs visibles + "..." |
| **Analytics** | Scroll infini de charts | 3 sections max avec tabs internes |

---

## Spacing tokens cibles

| Token | Actuel | Cible | Usage |
|-------|--------|-------|-------|
| Section gap | gap-2, gap-3 (8-12px) | gap-5, gap-6 (20-24px) | Entre sections majeures |
| Card padding | p-3, p-4 (12-16px) | p-5, p-6 (20-24px) | Intérieur des cards |
| Header margin bottom | mb-2, mb-3 (8-12px) | mb-5, mb-6 (20-24px) | Sous les headers |
| List item padding | py-2 (8px) | py-3, py-4 (12-16px) | Items de liste |
| KPI card height | Variable | 80px fixe | Uniformité |
