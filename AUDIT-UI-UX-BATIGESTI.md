# Audit UI/UX Complet — BatiGesti

> Audit réalisé le 17 mars 2026 sur batigesti.fr (marketing + app)
> Chaque section contient un **prompt Claude Code** prêt à exécuter.

---

## Ordre de priorité recommandé

| Priorité | Module | Impact | Effort |
|-----------|--------|--------|--------|
| 1 | **Dark Mode Global** (#15) | Critique — bug visuel | Moyen |
| 2 | **Design System** (#14) | Fondation pour tout le reste | Moyen |
| 3 | **Landing Page** (#1) | Acquisition utilisateurs | Élevé |
| 4 | **Dashboard** (#3) | Première impression utilisateur | Moyen |
| 5 | **Devis & Factures** (#4) | Feature n°1 utilisée | Moyen |
| 6 | **Navigation** (#2) | Améliore toute l'app | Faible |
| 7 | **Paramètres** (#13) | Onboarding et complétion profil | Moyen |
| 8 | **Accessibilité** (#16) | Conformité et inclusion | Moyen |
| 9 | **Mobile** (#17) | Usage terrain artisans | Élevé |
| 10 | **Chantiers** (#5) | Feature coeur | Faible |
| 11 | **Clients** (#6) | Gestion de base | Faible |
| 12 | **Planning** (#7) | Organisation | Faible |
| 13 | **Tâches** (#8) | Productivité | Faible |
| 14 | **Finances** (#10) | Pilotage | Moyen |
| 15 | **Bibliothèque** (#11) | Déjà bien | Faible |
| 16 | **Messagerie** (#9) | Feature secondaire | Faible |
| 17 | **Catalogue & Stocks** (#12) | Feature secondaire | Faible |

---

## 1. Landing Page Marketing

### Constat

- **Hero** : titre clair "Gérez vos chantiers comme un pro" mais aucun mockup/screenshot de l'app visible (pas de social proof visuelle)
- **Nav** : seulement "Connexion" et "Essai gratuit" — pas de liens vers Fonctionnalités, Tarifs, FAQ (impossible de naviguer rapidement)
- **Features grid** : 9 cartes identiques sans hiérarchie visuelle
- **Pricing** : badges "POPULAIRE" et "RECOMMANDÉ" sur 2 plans différents = confusion. Pas de toggle annuel/mensuel
- **FAQ** : seulement 4 questions, pas de schéma FAQ pour le SEO
- **Footer** : minimaliste, manque réseaux sociaux, blog, ressources
- **Pas de témoignages** réels
- **SEO** : pas de JSON-LD, pas de balises sémantiques
- **Stats bar** : "PWA" est du jargon technique pour un artisan

### Prompt Claude Code

```
Refactore la landing page marketing de BatiGesti (src/components/landing/) avec les améliorations suivantes :

## Navigation (LandingNav.jsx)
- Ajouter des ancres scrollables : Fonctionnalités, Tarifs, FAQ, Contact
- Rendre la nav sticky avec un backdrop-blur au scroll
- Ajouter un menu hamburger mobile

## Hero (HeroSection.jsx)
- Ajouter un composant HeroMockup.jsx affichant un screenshot/mockup animé de l'app dans un cadre navigateur
- Remplacer "PWA" par "Mobile & tablette" dans le StatsBar (les artisans ne connaissent pas "PWA")
- Ajouter une animation d'entrée subtile (fade-up) sur le titre et le CTA

## Features (QuickFeaturesGrid.jsx / FeatureShowcase.jsx)
- Créer une hiérarchie : 3 features principales (Devis, Chantiers, Finances) en grand avec screenshots
- Les 6 features secondaires en grille plus petite en dessous
- Ajouter des illustrations ou screenshots réels pour chaque feature principale

## Pricing (PricingSection.jsx)
- Retirer le double badge : garder seulement "POPULAIRE" sur Artisan (plan le plus vendu)
- Ajouter un toggle Mensuel/Annuel (avec -20% sur l'annuel)
- Ajouter un bouton "Comparer les plans" qui ouvre un tableau comparatif détaillé

## Témoignages (TestimonialsSection.jsx)
- Créer 3-5 témoignages avec photo, nom, métier, ville et citation
- Ajouter une note étoiles et le nombre d'utilisateurs ("Rejoint par 500+ artisans")

## FAQ (FAQSection.jsx)
- Ajouter au moins 8 questions fréquentes
- Ajouter le schéma JSON-LD FAQPage dans le head

## Footer (FooterSection.jsx)
- Ajouter des colonnes : Produit | Ressources | Légal | Contact
- Liens vers : Blog, Centre d'aide, Changelog, CGV, Mentions légales, Confidentialité
- Ajouter les icônes réseaux sociaux (LinkedIn au minimum)

## SEO Global (LandingPage.jsx + index.html)
- Utiliser des balises sémantiques : <main>, <section>, <article>, <nav>, <footer>
- Ajouter le JSON-LD Organization + SoftwareApplication
- Vérifier la hiérarchie h1 > h2 > h3 (un seul h1 par page)

Règles : respecter le CLAUDE.md, utiliser isDark (jamais dark:), couleur via prop, icônes lucide-react uniquement.
```

---

## 2. Navigation & Sidebar

### Constat

- Sidebar bien organisée en catégories (principal, organisation, gestion, profil)
- **Badge "Paramètres (10)"** : 10 actions en attente donne une impression d'urgence/erreur, anxiogène
- **"NEW" sur Devis IA** : badge statique permanent = perd son sens
- Pas de collapse de la sidebar pour gagner de la place
- **Mode Discret/Clair/Sombre** en bas : "Discret" n'est pas clair. Différence Clair/Sombre presque imperceptible
- Icônes header peu claires (engrenage, ?, oeil, cloche) sans tooltips
- **Bouton "+ Nouveau"** ne précise pas quoi créer

### Prompt Claude Code

```
Améliore la navigation et la sidebar de BatiGesti :

## Sidebar (composant sidebar/layout)
- Remplacer le badge "(10)" sur Paramètres par un simple point orange indicatif (sans chiffre)
- Rendre le badge "NEW" sur Devis IA conditionnel : l'afficher seulement si l'utilisateur n'a jamais cliqué dessus (stocker dans localStorage/Supabase)
- Ajouter un bouton collapse (icône ChevronLeft) pour réduire la sidebar en mode icônes seules
- Renommer "Discret" en "Compact" ou le supprimer si redondant

## Header top bar
- Ajouter des tooltips sur toutes les icônes (engrenage = "Paramètres rapides", ? = "Aide", oeil = "Aperçu client", cloche = "Notifications")
- Transformer le bouton "+ Nouveau" en dropdown : Nouveau devis, Nouveau client, Nouveau chantier, Nouveau mémo
- Ajouter un indicateur de notifications non lues sur la cloche

## Mode sombre / clair
- Le fond principal en mode clair doit être blanc/gris très clair (#f8fafc), pas le bleu-gris foncé actuel
- La sidebar en mode clair doit être blanche avec du texte foncé

Règles : isDark prop (jamais dark: Tailwind), couleur prop, lucide-react.
```

---

## 3. Dashboard (Accueil)

### Constat

- **"Bonne nuit, BatiGesti"** : utilise le nom d'entreprise au lieu du prénom, impersonnel
- **Bannière orange "5 devis en attente"** : trop dominante visuellement
- **Cards "Devis IA" et "Devis Express"** : entièrement oranges, pas de différenciation
- **KPIs "À encaisser" / "Ce mois"** : manquent de contexte (pas de tendance)
- **Actions du jour** : toutes "Urgent" en rouge → pas de priorisation réelle
- **Quick actions** : "Paramètres" n'a rien à faire ici
- **Bannière "Complétez votre profil 7%"** : très bas dans la page, devrait être en haut

### Prompt Claude Code

```
Refactore le Dashboard (src/components/Dashboard.jsx + src/components/dashboard/) :

## Personnalisation du greeting
- Afficher "Bonjour [Prénom]" (ou Bonsoir selon l'heure) au lieu du nom d'entreprise
- Sous-titre dynamique : résumé contextuel ("3 devis à relancer, 1 facture à encaisser")

## Hiérarchie de la page
- SI profil < 50% complété : afficher la bannière profil EN PREMIER (au-dessus de tout)
- SI onboarding non terminé : afficher les étapes en deuxième position
- ENSUITE : les KPIs et actions du jour

## Bannière devis en attente
- Réduire la taille : en faire une carte compacte (pas une bannière pleine largeur)
- Utiliser la couleur accent de l'entreprise (prop couleur) au lieu d'orange hardcodé

## Cards Devis IA / Devis Express
- Différencier visuellement : Devis IA avec icône/gradient IA (violet/bleu), Devis Express en orange
- Réduire leur taille

## KPIs ("À encaisser", "Ce mois")
- Ajouter une flèche de tendance (vs mois précédent)
- Ajouter un mini sparkline chart sous le montant
- Ajouter un 3ème KPI : "Marge moyenne" ou "CA prévisionnel"

## Actions du jour
- Différencier les niveaux d'urgence visuellement (rouge = en retard >30j, orange = <30j, jaune = à surveiller)
- Limiter à 3 actions visibles avec "Voir toutes les X actions"
- Ajouter un timestamp relatif ("Il y a 2h", "Hier")

## Quick Actions
- Remplacer "Paramètres" par "+ Devis rapide" (action métier plus pertinente)

Règles : isDark prop, couleur prop via style inline, lucide-react, pas de dark: Tailwind.
```

---

## 4. Devis & Factures

### Constat

- KPI bar en haut : 4 métriques bien choisies
- **Bannière "Profil incomplet"** : répétitive avec Dashboard, ne peut pas être fermée
- **Trop de filtres** : Tout/Ce mois/Trim/Année + Tous/Devis/Factures/Acomptes/Situations/Avoirs/En attente/À traiter = surcharge cognitive
- Liste monotone, pas de différenciation visuelle devis/factures
- Boutons d'action tous orange = pas de hiérarchie
- Pas de vue Kanban accessible directement

### Prompt Claude Code

```
Améliore la page Devis & Factures (src/components/DevisPage.jsx) :

## Bannière profil
- Ajouter un bouton "X" pour dismiss la bannière (persister dans localStorage)
- Ne pas réafficher pendant 7 jours après dismiss

## Simplification des filtres
- Regrouper les filtres temporels (Tout/Mois/Trim/Année) dans un dropdown "Période"
- Garder les onglets principaux : Tous | Devis | Factures | En attente
- Déplacer Acomptes, Situations, Avoirs dans un filtre "Type" secondaire
- Afficher "À traiter (20)" comme une bannière d'alerte au-dessus, pas un onglet

## Différenciation visuelle devis/factures
- Devis : icône FileText avec bord gauche orange
- Factures : icône Receipt avec bord gauche bleu/vert
- Acomptes : icône CreditCard avec bord gauche violet
- Afficher le nom du client en plus gros que le numéro de document

## Boutons d'action contextuels
- "Envoyer" (brouillon) : bouton secondaire (outline)
- "Relancer" (envoyé sans réponse) : bouton warning orange
- "Facturer" (signé) : bouton primary vert

## Vue Kanban
- Ajouter un toggle vue Liste / Kanban
- Kanban : colonnes Brouillon > Envoyé > Signé > Facturé > Payé

Règles : isDark prop, couleur prop, lucide-react.
```

---

## 5. Chantiers

### Constat

- Bannière "Aujourd'hui · 1 chantier · 22 tâches" : bon résumé
- Chantiers "Prospect" : 2 gros boutons orange "Créer un devis" / "Démarrer" écrasent la card
- Barre de progression rouge à 0% = anxiogène
- Pas d'indicateur de rentabilité sur la card
- 4 vues (liste, Gantt, carte, timeline) non étiquetées

### Prompt Claude Code

```
Améliore la page Chantiers (src/components/Chantiers.jsx + src/components/chantiers/) :

## Cards chantier prospect
- Réduire les boutons "Créer un devis" / "Démarrer" : boutons compacts (sm) sur une seule ligne
- Ajouter "Prospect depuis le [date]"

## Barre de progression
- 0% : gris neutre (pas rouge)
- 1-30% : orange
- 31-70% : couleur accent (couleur prop)
- 71-99% : vert clair
- 100% : vert avec checkmark

## Indicateurs sur les cards
- Ajouter la marge prévisionnelle (petit badge "Marge: 25%")
- Indicateur de retard si date de fin dépassée
- Nombre de photos associées (icône Camera + count)

## Vues
- Tooltips sur les 4 icônes de vue
- Garder la vue sélectionnée en mémoire (localStorage)

## Filtre client
- Transformer le dropdown en autocomplete avec search

Règles : isDark prop, couleur prop, lucide-react.
```

---

## 6. Clients

### Constat

- KPI bar : 4 métriques pertinentes
- **Alerte doublons** : bon feature mais boutons "Fusionner" et "Comparer" trop proches = risque de clic erroné
- 2 clients "Hugo Seguin" identiques visuellement malgré la détection
- Icônes téléphone/message trop petites sur mobile
- Pas de vue tableau pour gestion de masse

### Prompt Claude Code

```
Améliore la page Clients (src/components/Clients.jsx) :

## Zone doublons
- Agrandir la zone d'alerte doublons : card dédiée avec fond jaune léger
- Séparer les boutons : "Comparer" d'abord (secondaire), "Fusionner" ensuite (primary avec confirmation)
- Ajouter un bouton "Ignorer" pour marquer des non-doublons

## Cards clients
- Bordure pointillée jaune sur les cards doublons
- Ajouter date du dernier contact/devis en bas de card
- Indicateur "Dernier devis il y a X jours"

## Vue tableau
- Ajouter toggle cards/tableau pour gestion de masse
- Colonnes : Nom, Tél, Email, Statut, Dernier devis, CA total
- Tri par colonne et sélection multiple

## Icônes d'action
- Espacer les icônes (gap-3 minimum)
- Tooltips ("Appeler", "Envoyer un SMS/email")
- Mobile : boutons pleine largeur empilés

Règles : isDark, couleur, lucide-react, ResponsiveTable existant dans ui/.
```

---

## 7. Planning

### Constat

- Calendrier mensuel clair et fonctionnel
- Événements tronqués sans tooltip ("Facture FAC-2026-00001 J...")
- Bannière "Bienvenue dans votre planning" prend trop de place
- Trop de filtres alignés horizontalement
- Pas de drag & drop, pas de vue équipe

### Prompt Claude Code

```
Améliore le Planning (src/components/Planning.jsx + src/components/planning/) :

## Événements
- Tooltip au hover avec détails : client, montant, statut
- Tronquer intelligemment : "FAC-00001 · Dupont" au lieu de "Facture FAC-2026-00001 J..."
- Au clic : mini-panel latéral avec les détails (pas de navigation)

## Bannière bienvenue
- Transformer en tooltip contextuel première utilisation (FirstTimeTooltip pattern)

## Filtres
- Regrouper "Tous / Tous types" dans un seul dropdown "Filtres"
- Garder les vues Mois/Sem/Jour/Agenda bien séparées (toggle group)
- "Aujourd'hui" = bouton distinct

## Vue équipe
- Toggle "Mon planning / Équipe" si plan équipe
- Vue équipe : lignes = membres, colonnes = jours de la semaine

## Améliorations UX
- Drag & drop pour déplacer un événement
- Double-clic sur jour vide = créer un événement
- Légende des couleurs en bas du calendrier

Règles : isDark, couleur, lucide-react.
```

---

## 8. Tâches

### Constat

- KPI bar : 4 métriques bien choisies
- Input "Nouvelle tâche" avec micro : feature différenciante
- Section "EN RETARD" : espace vide gaspillé
- "Archiver les 5 terminés" trop discret
- Pas de sous-tâches, pas de vue Kanban

### Prompt Claude Code

```
Améliore la page Tâches (src/components/MemosPage.jsx ou équivalent) :

## Layout
- EmptyState encourageant quand peu de tâches ("Tout est à jour !")
- Rapprocher les sections pour éviter le vide

## Tâches en retard
- Fond légèrement rouge/rosé sur la section EN RETARD
- "En retard de X jours" au lieu de la date brute

## Actions
- "Archiver les X terminés" en bouton secondaire visible
- Action "Snooze" (reporter à demain) sur les tâches en retard

## Sous-tâches
- Checkbox indentées par tâche
- Progression des sous-tâches (2/5 terminées)

## Vue Kanban
- Toggle Liste / Kanban
- Colonnes : À faire | En cours | Terminé
- Drag & drop entre colonnes

Règles : isDark, couleur, lucide-react.
```

---

## 9. Messagerie

### Constat

- "Aucun canal" + "Sélectionnez un canal" : aucun onboarding
- Empty state trop vide et froid
- Un nouvel utilisateur ne comprend pas le concept de "canaux"

### Prompt Claude Code

```
Améliore la page Messagerie (src/components/chat/ChatPage.jsx) :

## Empty state
- Onboarding en 3 étapes visuelles :
  1. "Créez un canal" (icône MessageSquarePlus)
  2. "Invitez votre équipe" (icône Users)
  3. "Communiquez en temps réel" (icône Zap)
- Bouton "Créer mon premier canal" orange bien visible
- Explication : "Créez des canaux par chantier ou par équipe pour centraliser vos échanges"

## Sidebar canaux
- Icônes par type de canal (chantier = HardHat, général = MessageCircle, urgent = AlertTriangle)
- Preview du dernier message sous le nom du canal
- Badge messages non lus

## Fonctionnalité
- Lier automatiquement les canaux aux chantiers existants
- Proposer "Créer un canal pour [nom du chantier]" depuis la page Chantiers

Règles : isDark, couleur, lucide-react. Vérifier FeatureGuard pour le plan équipe.
```

---

## 10. Finances / Trésorerie

### Constat

- Onglets bien organisés (Trésorerie / Paiements / Banque / Export / Analytique / Rapports)
- Onboarding wizard 2 étapes = bonne approche progressive
- 4 KPI cards toutes orange, pas de différenciation
- Bouton "Masquer" en haut à droite : pas clair (masquer quoi ?)

### Prompt Claude Code

```
Améliore la page Finances (src/components/FinancesPage.jsx + src/components/tresorerie/) :

## KPI cards
- Différencier par couleur :
  - Solde actuel : bleu (neutre)
  - Entrées prévues : vert (positif)
  - Sorties prévues : rouge/orange (attention)
  - Projection : couleur accent (résultat)
- Ajouter une flèche de tendance sur chaque KPI

## Bouton "Masquer"
- Renommer en "Masquer les montants" avec icône EyeOff
- Tooltip : "Masque tous les montants pour la confidentialité"

## Graphique de trésorerie
- Graphique en courbe de l'évolution du solde
- Zones colorées : vert au-dessus de 0, rouge en dessous

## Section TVA
- Remonter la TVA en onglet dédié ou card bien visible
- Rappel de date de déclaration TVA

## Onglets
- Compteur sur l'onglet "Paiements" (nombre en attente)

Règles : isDark, couleur, lucide-react. Utiliser recharts existant.
```

---

## 11. Bibliothèque de Prix

### Constat

- **Excellente page** : la plus aboutie visuellement
- Layout 2 colonnes : arbre navigation + grille de cards = bien
- Barre de progression F/MO/Mat colorée : excellente data-viz
- Tags prennent trop de place (parfois 2 lignes)
- Pas de bouton "Ajouter au devis" directement

### Prompt Claude Code

```
Améliore la Bibliothèque de Prix (src/components/bibliotheque/) :

## Tags
- Limiter à 3 tags max par card avec un "+X" cliquable
- Réduire la taille des tags (text-xs au lieu de text-sm)

## Action "Ajouter au devis"
- Bouton "+" discret en haut à droite de chaque card
- Au clic : dropdown "Ajouter au devis [DEV-XXX]" listant les devis brouillon

## Filtres avancés
- Filtre par complexité (Standard / Complexe)
- Filtre par fourchette de prix
- Filtre "Mes favoris"

## Détail ouvrage
- Mini pie-chart F/MO/Mat dans la décomposition
- Historique de prix si modifié

Règles : isDark, couleur, lucide-react.
```

---

## 12. Catalogue & Stocks

### Prompt Claude Code

```
Améliore le Catalogue et les Stocks (src/components/Catalogue.jsx + src/components/Stocks.jsx) :

## Catalogue
- Photos/thumbnails sur les articles
- Import catalogue fournisseur (CSV/Excel)
- Catégories visuelles avec icônes

## Stocks
- Dashboard stock : valeur totale, nombre d'alertes, articles en rupture
- Alertes visuelles sur articles proches du seuil minimum
- Vue rapide des mouvements récents inline
- Graphique d'évolution des stocks par catégorie

Règles : isDark, couleur, lucide-react.
```

---

## 13. Paramètres

### Constat

- Structure en onglets : Mon entreprise / Documents / Finance / Équipe / Intégrations / Avancé
- "Profil complété 7%" avec progress circle : bonne gamification
- Trop de champs sur une seule page, scroll infini
- Pas de custom color picker
- "Export comptable" ne devrait pas être dans le header Paramètres

### Prompt Claude Code

```
Améliore les Paramètres (src/components/Settings.jsx + src/components/settings/) :

## Layout
- Découper les longs formulaires en sections collapsibles (accordions)
- Barre de progression par section ("Identité : 3/5 champs remplis")
- Retirer le bouton "Export comptable" du header (déjà dans Finances)

## Assistant config
- En card fixe en haut de page si profil < 50%
- Wizard step-by-step guidé : "Étape 1/6 : Identité de votre entreprise"

## Couleur personnalisée
- Color picker custom en plus des couleurs prédéfinies
- Preview en temps réel sur un mini-mockup de devis

## Validation
- Validation en temps réel (SIRET, email, téléphone)
- Checkmarks verts à côté des champs valides
- Bordures rouges sur les champs obligatoires manquants

## Profil complété
- Pourcentage cliquable : scroller vers le premier champ manquant

Règles : isDark, couleur, lucide-react.
```

---

## 14. Design System (Composants UI)

### Constat

- Design system riche : Card, Button, Modal, Input, Badge, KPICard, PageHeader, EmptyState...
- **PROBLÈME MAJEUR** : mélange de classes `dark:` Tailwind ET prop `isDark` dans Card.jsx, Badge.jsx, Input.jsx, KPICard.jsx
- EmptyState.jsx n'a aucun support dark mode
- Couleurs hardcodées (`bg-orange-500`) dans EmptyState au lieu de prop `couleur`

### Prompt Claude Code

```
Nettoie et uniformise le Design System (src/components/ui/) :

## Suppression des classes dark: Tailwind (PRIORITÉ HAUTE)
Dans TOUS les fichiers de src/components/ui/, rechercher et remplacer :
- Supprimer toutes les classes "dark:xxx"
- Remplacer par la logique isDark ternaire : isDark ? 'classe-dark' : 'classe-light'
- Fichiers concernés : Card.jsx, Badge.jsx, Input.jsx, KPICard.jsx
- Vérifier : Button.jsx, Modal.jsx, Tabs.jsx, Progress.jsx

## EmptyState.jsx
- Ajouter le support isDark complet :
  - Fond : isDark ? 'bg-slate-800' : 'bg-white'
  - Texte titre : isDark ? 'text-white' : 'text-slate-900'
  - Texte description : isDark ? 'text-slate-400' : 'text-slate-500'
- Remplacer bg-orange-500 hardcodé par style={{ backgroundColor: couleur || '#f97316' }}

## Variables CSS globales
- Créer des CSS custom properties dans index.css :
  --color-accent, --color-card-bg, --color-input-bg, --color-text-primary, --color-text-secondary
- Mettre à jour les composants pour utiliser ces variables

## Padding uniformé
- Documenter l'échelle : sm=p-4, md=p-5, lg=p-6, xl=p-8
- Vérifier que Modal, EmptyState, PageHeader utilisent la même échelle

## Bouton aria
- Ajouter aria-busy={loading} sur Button.jsx quand loading=true
- Ajouter aria-hidden="true" sur le spinner de chargement

Règles : isDark prop UNIQUEMENT (jamais dark:), couleur prop, lucide-react.
Lancer `npm run check` après chaque fichier modifié.
```

---

## 15. Dark Mode Global

### Constat CRITIQUE

- Le mode clair et le mode sombre sont visuellement PRESQUE IDENTIQUES
- La sidebar reste sombre dans les deux modes
- Le fond principal ne change pas suffisamment

### Prompt Claude Code

```
Corrige le dark/light mode global dans l'application :

## Problème
Le mode clair (isDark=false) ne produit pas un vrai thème clair.
La sidebar, le header et le fond principal restent dans des tons sombres.

## Solution
1. Dans App.jsx (ou le composant layout principal) :
   - Mode clair : body background = #f8fafc (slate-50)
   - Mode clair : sidebar background = #ffffff avec border-r slate-200
   - Mode clair : header background = #ffffff avec border-b slate-200
   - Mode clair : texte principal = #1e293b (slate-800)

2. Dans le composant Sidebar :
   - Mode clair sidebar :
     - Fond : bg-white
     - Texte liens : text-slate-700
     - Lien actif : bg-[couleur]/10 text-[couleur]
     - Catégories : text-slate-400 uppercase
   - Mode sombre sidebar (actuel, à garder) :
     - Fond : bg-slate-900
     - Texte : text-slate-300

3. Vérifier page par page que isDark est propagé :
   Dashboard, DevisPage, Chantiers, Clients, Planning, FinancesPage, Settings + toutes les modals

4. Tester en basculant entre modes et vérifier visuellement chaque page.

Règles : JAMAIS de classes dark: Tailwind. Tout via isDark prop + ternaires.
Lancer `npm run build` pour vérifier pas de régression.
```

---

## 16. Accessibilité

### Prompt Claude Code

```
Améliore l'accessibilité (WCAG 2.1 AA) de BatiGesti :

## Composants UI (src/components/ui/)
- Button.jsx : ajouter aria-busy={loading}, aria-hidden="true" sur le spinner
- Badge.jsx : ajouter aria-hidden="true" sur le dot décoratif
- PageHeader.jsx : ajouter aria-hidden="true" sur le conteneur d'icône décoratif

## Landing page (src/components/landing/)
- Ajouter les landmarks ARIA : <main>, <nav>, <footer>
- Vérifier hiérarchie headings (un seul h1, puis h2, h3)
- Ajouter prefers-reduced-motion sur les animations Framer Motion

## Contrastes
- Vérifier texte orange sur fond sombre ratio >= 4.5:1
- Vérifier texte gris clair (slate-400) sur fond sombre
- Texte des badges (petit texte coloré) ratio >= 4.5:1

## Navigation clavier
- Tous les éléments interactifs focusables (tabindex)
- Styles :focus-visible distincts (outline-2 outline-offset-2 outline-[couleur])
- Sidebar : navigation au clavier entre les liens

## Skip links
- Lien "Aller au contenu principal" en début de page (visible au focus)

Règles : isDark, couleur, lucide-react.
```

---

## 17. Mobile / Responsive

### Prompt Claude Code

```
Améliore le responsive mobile de BatiGesti :

## Breakpoints
- Actuellement seul sm: (640px) est utilisé → ajouter md: (768px) et lg: (1024px)
- Tablette (768-1024px) : sidebar collapsée en icônes, contenu pleine largeur
- Mobile (<768px) : sidebar en drawer overlay, bottom navigation bar

## Bottom navigation mobile
- Créer BottomNav.jsx visible uniquement sur mobile :
  - 5 onglets : Accueil, Devis, Chantiers, Tâches, Plus (menu)
  - Icônes avec labels, badge de notifications
  - Masquer la sidebar complètement sur mobile

## Pages spécifiques mobile
- Dashboard : empiler KPIs en 2x2 grid, actions full width
- Devis & Factures : list view uniquement, boutons d'action en swipe
- Clients : 1 card par ligne, icônes action agrandies (48px tap targets)
- Planning : vue jour par défaut sur mobile (pas mois)
- Bibliothèque : arbre en dropdown au-dessus, cards en 1 colonne

## Touch targets
- Tous les boutons et liens : min 44x44px sur mobile
- Espacement entre éléments cliquables : min 8px

## Formulaires mobile
- DevisForm : étapes en fullscreen sur mobile (wizard plein écran)
- Inputs : font-size minimum 16px (empêcher le zoom iOS)
- Selects : bottom sheets au lieu de dropdowns natifs

Règles : isDark, couleur, lucide-react. Mobile-first approach.
```
