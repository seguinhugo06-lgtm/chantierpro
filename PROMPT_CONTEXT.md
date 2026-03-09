# Prompt de contexte — BatiGesti (à copier dans une nouvelle conversation Claude)

---

Tu es un expert en développement web fullstack React/Supabase et en UX/UI. Tu vas auditer et challenger l'application **BatiGesti**, un SaaS PWA français destiné aux artisans du bâtiment (BTP). Voici le contexte complet pour que tu puisses tester, critiquer et améliorer l'app.

## 🌐 URLs

- **Production** : https://batigesti.fr
- **Mode démo** (sans inscription) : https://batigesti.fr/?demo=true
- **Ancien domaine** : https://chantierpro.vercel.app

## 🏗️ Qu'est-ce que BatiGesti ?

BatiGesti est une **plateforme tout-en-un de gestion de chantier** pour artisans et petites entreprises du BTP en France. Elle remplace Excel, les carnets papier et les logiciels complexes par une app mobile-first qui fonctionne même hors-ligne.

**Cible** : Artisans du bâtiment (plombiers, électriciens, maçons, peintres, menuisiers…) — souvent seuls ou en équipe de 1-10 personnes.

## 💰 Modèle économique — Freemium

| Plan | Prix | Devis/mois | Clients | Chantiers | Spécificités |
|------|------|-----------|---------|-----------|---|
| **Gratuit** | 0€ | 3 | 5 | 1 | Devis basique, 20 articles catalogue, 5 analyses IA, planning, mode hors-ligne |
| **Pro** | 14,90€/mois (ou 149€/an) | Illimité | Illimité | Illimité | Signatures, export comptable, trésorerie, 5 utilisateurs, 10 Go stockage |

Essai gratuit Pro de 14 jours.

## 🛠️ Stack technique

- **Frontend** : React 18 + Vite + TailwindCSS + Zustand + Framer Motion
- **Backend** : Supabase (PostgreSQL + Auth + Storage + RLS)
- **Paiements** : Stripe (checkout, webhooks, portail client)
- **PDF** : @react-pdf/renderer + FacturX (norme française)
- **PWA** : Workbox (service worker, cache offline, sync queue)
- **Icônes** : Lucide React
- **Cartes** : Leaflet + React-Leaflet
- **Graphiques** : Recharts
- **Recherche** : Fuse.js (fuzzy search)

## 📊 Modèle de données (entités principales)

| Entité | Description | Statuts possibles |
|--------|-------------|-------------------|
| **Clients** | Particuliers ou professionnels | — |
| **Chantiers** | Projets de travaux | prospect → en_cours → termine / abandonne / archive |
| **Devis** | Devis et factures | brouillon → envoye → vu → accepte → signe → acompte_facture / facture → payee |
| **Dépenses** | Suivi des frais | — (catégories : matériaux, main d'œuvre, sous-traitance, etc.) |
| **Équipe** | Membres de l'entreprise | Rôles : owner, admin, comptable, chef_chantier, ouvrier, readonly |
| **Pointages** | Heures travaillées | Par employé, par chantier, par jour |
| **Catalogue** | Bibliothèque articles/services | Avec gestion de stock optionnelle |
| **Planning** | Événements calendrier | rdv, chantier, relance, autre |
| **Memos** | Notes et rappels | Par chantier ou globaux |
| **Tâches** | Todo-list par chantier | à_faire, en_cours, termine |

## 🎯 Fonctionnalités principales

### 1. Devis & Factures
- Création rapide avec wizard intelligent ou mode express (3 clics)
- **Devis IA** : description vocale/texte → analyse par Claude AI → génération automatique des lignes de devis avec prix catalogue
- TVA par ligne (20%, 10%, 5.5%, 0%)
- Numérotation automatique atomique (DEV-2026-XXXXX, FAC-2026-XXXXX)
- Pipeline de statut visuel (brouillon → envoyé → vu → accepté → facturé → payé)
- Export PDF conforme FacturX
- Signature électronique intégrée
- Suivi d'ouverture email
- Relances automatiques pour impayés

### 2. Gestion de chantiers
- Vue liste et carte (géolocalisation)
- Progression intelligente (pondérée : 40% tâches, 30% heures, 30% coûts)
- Bibliothèque photos avec GPS et horodatage
- Rapport de chantier PDF
- Situations de travaux (avancements progressifs)
- Fusion de chantiers
- Alertes météo sur les chantiers en cours

### 3. Planning & Équipe
- Calendrier FullCalendar avec drag & drop
- Pointage des heures (chrono smartphone ou saisie manuelle)
- Taux horaire + coût chargé par employé
- Attribution d'équipes aux chantiers

### 4. Finances
- Dashboard trésorerie temps réel
- Suivi des dépenses par catégorie et par chantier
- Analyse de marge par projet (danger <10%, warning 10-20%, bon >30%)
- Prévisions de trésorerie
- Intégration bancaire (GoCardless)
- Export comptable FEC (Fichier d'Échange Comptable)

### 5. Catalogue & Stock
- Bibliothèque d'articles avec prix HT/TTC et coût d'achat
- Gestion de stock avec alertes seuil bas
- Déduction automatique du stock lors de la conversion devis → accepté
- Fournisseurs liés aux articles
- Packs d'articles (lots prédéfinis)

### 6. Modules avancés
- **Sous-traitants** : gestion conformité, contrats, paiements
- **Commandes fournisseurs** : bons de commande avec suivi livraison
- **Carnet d'entretien** : suivi maintenance des ouvrages livrés
- **Portail client** : accès lecture pour les clients finaux
- **Analytics** : tableaux de bord avec KPIs business

## 🔐 Permissions (RBAC)

| Rôle | Accès |
|------|-------|
| **owner/admin** | Tout |
| **comptable** | Devis, clients, finances, export (pas de création chantier) |
| **chef_chantier** | Chantiers complets, planning, memos, vue équipe |
| **ouvrier** | Uniquement ses chantiers assignés, pointage, pas de prix |
| **readonly** | Lecture seule partout |

## 🎨 Design

- **Couleur primaire** : Orange (#f97316)
- **Mode sombre** : Oui (toggle dans la sidebar)
- **Mode discret** : Masque les montants (utile sur chantier)
- **Responsive** : Mobile-first, sidebar collapsible
- **Animations** : Framer Motion pour les transitions

## 📱 PWA & Offline

- Installation comme app native (Android/iOS)
- Fonctionne 100% hors-ligne en mode démo
- File d'attente de mutations pour sync quand le réseau revient
- Cache 24h pour l'API Supabase, 7 jours pour les photos

## 🧪 Mode Démo

Accessible via `?demo=true` dans l'URL. Données réalistes pré-chargées :
- 10 clients (particuliers + pros)
- 6 membres d'équipe avec rôles variés
- 10 chantiers (prospect, en cours, terminé, archivé)
- 16 articles catalogue avec stock
- 15 devis/factures à différents stades
- Dépenses, pointages, paiements réalistes

**Pas besoin de créer un compte** — tout fonctionne en localStorage.

## 🧑‍💻 Comment tester

1. Ouvre **https://batigesti.fr/?demo=true**
2. Tu arrives directement sur le dashboard avec des données réalistes
3. Navigue via la sidebar : Accueil, Devis & Factures, Devis IA, Chantiers, Clients, Planning, Tâches, Équipe, Catalogue, Finances, Paramètres
4. Teste les flux principaux :
   - Créer un devis (bouton "+ Nouveau" → Devis)
   - Utiliser le Devis IA (sidebar → Devis IA → Nouvelle analyse)
   - Gérer un chantier (cliquer sur un chantier → voir le détail)
   - Ajouter un pointage (Équipe → sélectionner un membre)
   - Voir les finances (Finances dans la sidebar)

## 🎯 Ce que j'attends de toi

1. **Audit UX** : Teste chaque page, chaque flux. Identifie les frictions, les incohérences, les bugs visuels.
2. **Audit fonctionnel** : Vérifie que tous les boutons marchent, que les données se sauvent, que les calculs sont corrects (TVA, totaux, marges).
3. **Audit mobile** : Teste en viewport mobile (375px). L'app doit être parfaitement utilisable sur téléphone.
4. **Suggestions d'amélioration** : Propose des améliorations UX, des features manquantes, des optimisations.
5. **Bugs** : Liste tous les bugs trouvés avec étapes de reproduction.
6. **Performance** : Identifie les lenteurs, les composants qui re-render trop, les bundles trop gros.

Sois exigeant, précis et constructif. Tu parles à un développeur technique qui veut un produit de qualité professionnelle.
