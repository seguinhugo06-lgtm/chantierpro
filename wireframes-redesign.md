# Wireframes textuels — Redesign BatiGesti

Référence : `principes-redesign-ux.md`

---

## 1. DASHBOARD — De 15+ sections à 5 zones

### Structure actuelle (problème)
```
Hero (80px)
  Profile Banner (48px) — conditionnel
  Urgent Action (80px) — conditionnel
  Hero Duo Devis (100px) — conditionnel <5 devis
  Mini KPI Duo finances (250px) — conditionnel
    → Avoirs banner (50px)
    → Chantiers facturation banner (50px)
    → Sparkline 6 mois (170px)
    → Pipeline commercial (140px)
  Actions du jour (180px)
  2-column grid :
    LEFT: (hidden shortcuts)
    RIGHT: Chantiers en cours (220px)
           OnboardingChecklist (150px)
           Profile Banner duplicate (48px)
           Facture 2026 countdown (48px)
  Section collapsible "Tableau de bord" :
    Widget config panel (400px)
    OverviewWidget (300px)
    ConsolidatedWidget (200px)
    RevenueChartWidget (400px)
    Grid 3 colonnes :
      DevisWidget (220px)
      RelanceWidget (220px)
      ChantiersWidget (220px)
      TresorerieWidget (220px)
      AcomptesWidget (220px)
      ReportsWidget (180px)
      ScoreSanteWidget (200px)
      ActivityFeedWidget (220px)
      WeatherAlertsWidget (200px)
      Team Widget (320px)
      UsageAlerts (150px)
      StockWidget (200px)
      ConformityWidget (240px)
      SousTraitantsAlerts (180px)
      BankWidget (200px)
= ~4000px+ de scroll potentiel
```

### Structure cible
```
┌─────────────────────────────────────────────────┐
│ 1. HEADER COMPACT (56px)                         │
│ ┌──────────────────────────────────────────────┐ │
│ │ 👋 Bonjour Hugo · Mar 25 mars    [⚙] [🔔3] │ │
│ └──────────────────────────────────────────────┘ │
│                                                   │
│ 2. NOTIFICATION STRIP (0 ou 56px, 1 seul max)   │
│ ┌──────────────────────────────────────────────┐ │
│ │ 🔴 2 factures en retard (4 320€)    [Voir →]│ │
│ └──────────────────────────────────────────────┘ │
│ (priorité: urgent rouge > profil amber > info)   │
│                                                   │
│ 3. KPI STRIP (88px)                              │
│ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐            │
│ │ 💰   │ │ 📊   │ │ 📋   │ │ 🏗️   │            │
│ │12 340│ │8 200 │ │  5   │ │  3   │            │
│ │À enc.│ │CA    │ │Devis │ │Chant.│            │
│ │+12%↑ │ │mois  │ │attente│ │actifs│            │
│ └──────┘ └──────┘ └──────┘ └──────┘            │
│ Mobile: 2 colonnes scroll horizontal             │
│ Desktop: 4 colonnes                              │
│                                                   │
│ 4. ACTIONS DU JOUR (max 3 items, ~180px)         │
│ ┌──────────────────────────────────────────────┐ │
│ │ 📌 Actions du jour (3)                       │ │
│ │                                               │ │
│ │ 🔴 Relancer Devis #42 — 3j         [Relancer]│ │
│ │ 🟠 Mémo: Commander ferraille        [Voir]   │ │
│ │ 🔵 Facture #18 à envoyer           [Envoyer] │ │
│ └──────────────────────────────────────────────┘ │
│ Si 0 actions → cette section disparaît           │
│                                                   │
│ 5. DASHBOARD GRID (2x2, ~480px)                  │
│ ┌──────────────────┬──────────────────┐          │
│ │ DEVIS RÉCENTS    │ CHANTIERS ACTIFS │          │
│ │                  │                  │          │
│ │ • #42 Dupont     │ • Résidence Parc │          │
│ │   2 340€ envoyé  │   72% ████▓░░   │          │
│ │ • #41 Martin     │ • Maison Leblanc │          │
│ │   5 600€ signé   │   45% ███░░░░   │          │
│ │ • #40 Leroy      │ • Rénov. Centre  │          │
│ │   890€ brouillon │   28% ██░░░░░   │          │
│ │                  │                  │          │
│ │ [+ Nouveau devis]│ [Voir tous →]    │          │
│ ├──────────────────┼──────────────────┤          │
│ │ TRÉSORERIE       │ ALERTES          │          │
│ │                  │                  │          │
│ │ Solde: 24 500€   │ 🔴 Stock bas (2) │          │
│ │ Trend: ↗ +8%     │ 🟠 RC Pro expire │          │
│ │ Prévision 30j:   │    dans 15j      │          │
│ │ 18 200€          │ 🔵 Météo: pluie  │          │
│ │                  │    demain        │          │
│ │ [Détails →]      │ [Voir tout →]    │          │
│ └──────────────────┴──────────────────┘          │
│ Mobile: stack vertical (1 colonne)               │
│ Desktop: 2x2 grid                                │
│                                                   │
│ FIN — pas de scroll supplémentaire nécessaire     │
└─────────────────────────────────────────────────┘
```

### Ce qui est SUPPRIMÉ du Dashboard :
- Hero Duo (Devis IA / Express) → boutons dans la page Devis
- Profile Banner → déplacé dans Settings avec badge ⚙️
- Sparkline 6 mois → Analytics
- Pipeline commercial → Analytics
- Widget config/drag-drop → supprimé
- OverviewWidget → supprimé (redondant avec KPI strip)
- ConsolidatedWidget → page dédiée (Settings > Multi-entreprise)
- RevenueChartWidget → Analytics
- 15 widgets individuels → fusionnés en 4 cards (Devis, Chantiers, Trésorerie, Alertes)
- ScoreSanteWidget → Analytics
- ActivityFeedWidget → fusionné dans "Actions du jour"
- Section collapsible → supprimée entièrement
- Duplicate banners (profile, facture 2026) → Notification Strip unique

### Ce qui est CONSOLIDÉ :
- Profile Banner + Urgent Action + Facture 2026 → **1 Notification Strip** (le plus urgent gagne)
- Mini KPIs + Overview → **1 KPI Strip** (4 métriques fixes)
- DevisWidget + RelanceWidget → **1 card "Devis récents"**
- ChantiersWidget + Chantiers en cours → **1 card "Chantiers actifs"**
- TresorerieWidget + AcomptesWidget + BankWidget → **1 card "Trésorerie"**
- StockWidget + WeatherAlerts + ConformityWidget + SousTraitantsAlerts → **1 card "Alertes"**
- Team Widget → accessible via page Equipe (pas le dashboard)

---

## 2. EQUIPE — De 9 tabs à 5 + menu

### Actuel : 9 tabs
Équipe | Planning | Pointage | Validation | Congés | WhatsApp | Compétences | Productivité | Export

### Cible : 5 tabs visibles + "..." menu

**Tabs principaux (toujours visibles) :**
1. **Équipe** — vue par défaut, liste des employés
2. **Planning** — calendrier des affectations
3. **Pointage** — saisie des heures terrain
4. **Congés** — demandes et soldes
5. **Validation** — pointages à valider (badge compteur)

**Menu "..." (plus) :**
6. WhatsApp (→ renommé "Communication")
7. Compétences
8. Productivité (→ déplacé dans Analytics)
9. Export

### Layout cible par tab
```
HEADER (56px) : ← Retour | Équipe (12) | [+ Employé]
METRICS (optionnel, 72px) : ■ 12 actifs  ■ 3 sur chantier  ■ 2 en congé
─────────────────────────────────────────────
TABS (48px) : [Équipe] [Planning] [Pointage] [Congés] [Validation•3] [...]
─────────────────────────────────────────────
CONTENT : (variable par tab)
```

---

## 3. CATALOGUE — De 7 tabs à 5 + menu

### Actuel : 7 tabs
Articles | Fournisseurs | Mouvements | Packs | Favoris | Inventaire | Coefs

### Cible : 5 tabs visibles + "..." menu

**Tabs principaux :**
1. **Articles** — catalogue principal
2. **Fournisseurs** — gestion des fournisseurs
3. **Mouvements** — historique stock
4. **Packs** — lots pré-configurés
5. **Inventaire** — gestion de stock

**Menu "..." :**
6. Favoris (→ filtre dans Articles avec ★)
7. Coefs (→ section dans Settings ou modal)

### Layout cible
```
HEADER (56px) : ← Retour | Catalogue (2 847) | [Scanner] [Import CSV] [+ Article]
METRICS (72px) : ■ 2 847 articles  ■ Marge moy 32%  ■ 3 alertes stock
─────────────────────────────────────────────
TABS (48px) : [Articles] [Fournisseurs] [Mouvements] [Packs] [Inventaire] [...]
─────────────────────────────────────────────
CONTENT : Table articles (desktop) / Cards (mobile)
```

---

## 4. DEVISPAGE — 3 vues (déjà OK) + nettoyage

Les 3 modes (Cards / Table / Pipeline) sont bons. Le problème est dans chaque vue :
- **52 useState** → réduire
- **18 modals** → consolider en 3 (Nouveau devis, Aperçu, Actions)
- **80 inline styles** → classes Tailwind

### Layout cible
```
HEADER (56px) : ← Retour | Devis (42) | [Devis IA] [+ Devis Express]
METRICS (72px) : ■ 12 en attente  ■ 24 320€ pipeline  ■ 68% taux conversion
─────────────────────────────────────────────
TOOLBAR (48px) : [🃏 Cards] [📋 Table] [📊 Pipeline] | 🔍 Recherche | Filtres ▼
─────────────────────────────────────────────
CONTENT : (variable par mode)
```

Note : les boutons "Devis IA" et "Devis Express" qui étaient dans le Dashboard Hero Duo sont maintenant ici, dans leur contexte logique.

---

## 5. CHANTIERS — De 11 tabs à 6 + menu

### Actuel : 8 visibles + 3 dropdown
Photos | Finances | Situations | Messages | Documents | Sous-traitants | Garanties | Notes | (Rapports) | (Mémos) | (Journal)

### Cible : 6 tabs visibles + "..." menu

**Tabs principaux :**
1. **Vue d'ensemble** (nouveau) — résumé KPIs + timeline
2. **Photos** — galerie chantier
3. **Finances** — budget, situations, facturation
4. **Documents** — plans, pièces jointes
5. **Messages** — communication équipe
6. **Sous-traitants** — gestion intervenants

**Menu "..." :**
7. Notes
8. Garanties (conditionnel, post-réception)
9. Rapports
10. Mémos
11. Journal

### Layout cible
```
HEADER (64px) : ← | Résidence du Parc | Status: En cours ▼ | [📸] [✏️]
PROGRESS (48px) : ████████████▓▓░░░░░ 72% | Étape: Gros œuvre
─────────────────────────────────────────────
TABS (48px) : [Vue d'ensemble] [Photos] [Finances] [Documents] [Messages] [S-T] [...]
─────────────────────────────────────────────
CONTENT : (variable par tab)
```

---

## 6. FINANCES — De 6 tabs à 4 + menu

### Actuel : 6 tabs
Aperçu | Trésorerie | Banque | Paiements | Rapports | Export

### Cible : 4 tabs visibles + "..." menu

**Tabs principaux :**
1. **Aperçu** — KPIs globaux + charts
2. **Trésorerie** — prévisions et flux
3. **Paiements** — suivi factures
4. **Banque** — rapprochement bancaire

**Menu "..." :**
5. Rapports
6. Export comptable

---

## 7. ANALYTICS — De scroll infini à 3 sections avec tabs

### Layout cible
```
HEADER (56px) : ← | Analytics | Période: [Ce mois ▼] | [Export PDF]
─────────────────────────────────────────────
TABS (48px) : [Performance] [Commercial] [Opérationnel]
─────────────────────────────────────────────
CONTENT par tab :

Performance : KPIs CA + charts
Commercial  : Pipeline + conversion + top clients
Opérationnel: Chantiers rentabilité + productivité équipe
```

---

## Spacing cible (rappel)

| Zone | Avant | Après |
|------|-------|-------|
| Entre sections | gap-2/gap-3 (8-12px) | gap-5/gap-6 (20-24px) |
| Padding cards | p-3/p-4 (12-16px) | p-5/p-6 (20-24px) |
| Sous les headers | mb-2/mb-3 (8-12px) | mb-5/mb-6 (20-24px) |
| Items de liste | py-2 (8px) | py-3/py-4 (12-16px) |
| KPI cards | Variable | h-20 (80px) fixe |
