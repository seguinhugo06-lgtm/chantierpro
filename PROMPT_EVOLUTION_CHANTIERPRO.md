# Prompt Claude Code — Évolution ChantierPro vers l'outil tout-en-un BTP

> Ce prompt est issu d'un audit fonctionnel complet, d'une recherche de marché approfondie sur les besoins des artisans/TPE BTP en France, et d'un benchmark de 12 concurrents (Obat, Batappli, EBP, Tolteck, Vertuoza, Construtor, Synobat, Sage Batigest, Mediabat, Henrri, ProGBat, Alobees).

---

```
Tu es un développeur senior React/Supabase. Tu travailles sur ChantierPro, une app de gestion complète pour artisans et petites entreprises du BTP en France.

Stack : React 18, Vite 5, Supabase (PostgreSQL + Auth + Edge Functions), Tailwind CSS, Zustand, PWA offline-first.

L'app a déjà 120+ features implémentées (devis, factures, clients, chantiers, planning, équipe, catalogue, conformité, portail client, marketplace, OCR, PWA...).

Voici les GAPS identifiés après comparaison avec le marché et les besoins réels des artisans BTP français. Implémente-les dans l'ordre de priorité.

---

## PRIORITÉ 1 — DIFFÉRENCIATEURS CRITIQUES (avantage concurrentiel)

### 1.1 — Situations de Travaux (Facturation Intermédiaire)

**Contexte métier :** Les chantiers longs (>1 mois) nécessitent des factures intermédiaires mensuelles appelées "situations de travaux". C'est un flux financier VITAL pour la trésorerie des artisans. Aucun concurrent léger ne le fait bien.

**À implémenter :**
- Nouveau composant `SituationTravaux.jsx` dans le détail d'un chantier
- Système de pourcentage d'avancement par ligne de devis (0-100% par poste)
- Calcul automatique : montant situation = % avancement × montant devis - cumul des situations précédentes
- Gestion des acomptes : déduction automatique de l'acompte initial sur la 1ère situation
- Retenue de garantie : déduction automatique de 5% sur chaque situation (configurable dans Paramètres)
- Libération automatique de la retenue de garantie après 12 mois (avec alerte)
- Numérotation séquentielle : SIT-{ANNÉE}-{CHANTIER}-{N°}
- Génération PDF de la situation (format similaire aux factures)
- Timeline visuelle des situations sur la fiche chantier
- **Table Supabase :** `situations_travaux` (id, chantier_id, devis_id, numero, date, lignes JSON avec pourcentages, montant_ht, montant_ttc, acompte_deduit, retenue_garantie, statut, user_id)

### 1.2 — Bibliothèque d'Ouvrages avec Prix Unitaires

**Contexte métier :** Les artisans facturent les mêmes prestations régulièrement. Obat domine grâce à BatiChiffrage (30 000 ouvrages). On doit offrir une alternative gratuite et personnalisable.

**À implémenter :**
- Étendre le Catalogue existant avec une section "Bibliothèque d'ouvrages"
- Structure : ouvrage = description + composants (main d'œuvre + matériaux + matériel)
- Chaque composant a : désignation, unité, quantité, prix unitaire d'achat, coefficient de vente
- Calcul automatique : déboursé sec = somme des composants ; prix de vente = déboursé sec × coefficient
- Import depuis les templates de devis existants (230+) pour pré-remplir la bibliothèque
- Fonction "Créer un ouvrage depuis une ligne de devis" (sauvegarder pour réutilisation)
- Recherche full-text dans la bibliothèque
- Catégorisation par métier (reprendre les 17 métiers existants)
- Prix de vente conseillé avec calcul de marge intégré
- Mise à jour en lot des prix (inflation annuelle, +X% sur tous les prix)
- **Table Supabase :** `ouvrages` (id, nom, description, categorie, composants JSON, debourse_sec, coefficient_vente, prix_vente, unite, user_id, created_at)

### 1.3 — Facturation Électronique 2026 (Conformité PDP)

**Contexte métier :** Obligation légale au 1er septembre 2026 pour TOUTES les entreprises : émettre et recevoir des factures via une plateforme agréée (PDP). C'est dans 7 mois. Les artisans ne sont PAS prêts. C'est un argument de vente massif.

**À implémenter :**
- Banner d'alerte sur le Dashboard : "Facturation électronique obligatoire en sept. 2026 — Vous êtes prêt avec ChantierPro ✓"
- Génération de factures au format Factur-X / ZUGFeRD (PDF/A-3 avec XML embarqué)
- Le composant FacturX existe déjà dans `src/lib/facturx/` — vérifier qu'il est complet et fonctionnel
- Ajouter un bouton "Envoyer via PDP" sur chaque facture (pour l'instant, lien vers Chorus Pro pour B2G)
- Archivage légal des factures : 10 ans minimum, horodatage, intégrité SHA-256
- Champ SIREN/SIRET obligatoire sur la fiche entreprise (Settings) avec validation format
- Nouveau tab dans Paramètres > "Facturation 2026" avec checklist de conformité
- Widget Dashboard : "Score conformité 2026" (% de complétion des prérequis)
- **Table Supabase :** `factures_electroniques` (id, facture_id, format, xml_data, hash_sha256, date_emission, date_archivage, statut_pdp, user_id)

---

## PRIORITÉ 2 — FONCTIONNALITÉS MÉTIER MANQUANTES

### 2.1 — Gestion des Sous-Traitants

**Contexte :** 60% des artisans sous-traitent une partie de leurs chantiers. L'autoliquidation de TVA est obligatoire.

**À implémenter :**
- Section "Sous-traitants" dans la page Équipe (onglet supplémentaire)
- Fiche sous-traitant : nom, SIRET, assurance décennale (date expiration + alerte), qualifications RGE, tarif horaire/journalier
- Affectation sous-traitant à un chantier (comme les employés)
- Mention automatique "Autoliquidation de TVA (art. 283-2 nonies du CGI)" sur les factures quand un sous-traitant est affecté
- Suivi des factures sous-traitant (dépense du chantier)
- Impact sur le calcul de marge du chantier
- Alerte expiration assurance décennale (30 jours avant)
- **Table Supabase :** `sous_traitants` (id, nom, siret, telephone, email, assurance_decennale_date, rge, tarif, specialite, user_id)

### 2.2 — Gestion de Trésorerie (Cash Flow)

**Contexte :** Un artisan sur 3 a des problèmes de trésorerie. Le décalage entre paiements fournisseurs (30j) et encaissements clients (60j+) est le premier tueur de TPE BTP.

**À implémenter :**
- Nouveau widget Dashboard "Trésorerie" (remplacer ou compléter le widget existant)
- Vue graphique : entrées (encaissements) vs sorties (fournisseurs, salaires, charges) par mois
- Prévisionnel à 3 mois basé sur : devis acceptés non facturés + factures non payées + situations en cours + retenues de garantie à libérer
- Alerte "Trésorerie critique" quand le solde prévisionnel passe sous un seuil (configurable)
- DSO (Days Sales Outstanding) : nombre moyen de jours pour être payé
- Aging report : factures par tranche de retard (0-30j, 30-60j, 60-90j, 90j+)
- **Table Supabase :** `mouvements_tresorerie` (id, type, montant, date, libelle, categorie, chantier_id, facture_id, user_id)

### 2.3 — Relance Automatique Intelligente (upgrade)

**Contexte :** La relance existe déjà mais elle est basique. Les artisans perdent 15-20% de CA à cause d'impayés non relancés.

**Amélioration :**
- Scénarios de relance configurables par étapes :
  - J+7 après envoi devis : relance douce (SMS/Email : "Avez-vous pu consulter notre devis ?")
  - J+3 après consultation (tracking pixel) : relance ciblée ("Nous restons à votre disposition pour toute question")
  - J+30 après facture : 1ère relance paiement (courtoise)
  - J+45 : 2ème relance (ferme)
  - J+60 : mise en demeure (template juridique)
- Envoi automatique si activé (opt-in par client)
- Historique complet des relances sur la fiche client
- Statistiques : taux de conversion après relance, délai moyen de paiement
- Templates personnalisables par étape
- Relance WhatsApp en plus de SMS/Email

### 2.4 — Rapport de Chantier / Compte-Rendu

**Contexte :** Les artisans doivent documenter l'avancement. Aujourd'hui ils le font sur papier ou pas du tout.

**À implémenter :**
- Nouveau composant `RapportChantier.jsx` accessible depuis la fiche chantier
- Création rapide en mode terrain : date, météo (auto depuis WeatherService), personnel présent (auto depuis pointage), travaux réalisés (texte + photos), problèmes/incidents, matériaux utilisés, observations
- Génération PDF automatique avec photos intégrées
- Envoi automatique au client via portail client
- Historique chrono des rapports sur la fiche chantier
- Template pré-rempli avec les infos du jour (météo, équipe pointée, tâches planifiées)
- **Table Supabase :** `rapports_chantier` (id, chantier_id, date, meteo, personnel JSON, travaux_realises, problemes, materiaux JSON, photos JSON, observations, user_id)

### 2.5 — Commandes Fournisseurs & Bons de Commande

**Contexte :** Les artisans commandent des matériaux pour chaque chantier. Pas de suivi = surcoûts + oublis.

**À implémenter :**
- Section "Achats" dans la page chantier (onglet)
- Création de bons de commande (BC-{ANNÉE}-{N°}) depuis le catalogue
- Statut : Brouillon → Commandé → Livré → Facturé
- Lien avec le budget chantier : commandes = dépenses réelles vs budget estimé
- Alert quand dépenses > 80% du budget
- Fournisseurs : mini-carnet d'adresses (nom, tel, email, spécialité)
- Impact automatique sur le calcul de marge
- **Tables Supabase :** `commandes` (id, chantier_id, fournisseur_id, numero, lignes JSON, montant_ht, statut, date, user_id) + `fournisseurs` (id, nom, telephone, email, specialite, user_id)

---

## PRIORITÉ 3 — INNOVATIONS DIFFÉRENCIANTES

### 3.1 — IA Devis Express V2 : Génération par Description Texte

**Contexte :** Mediabat propose déjà une IA qui génère un devis depuis une description texte. ChantierPro a le Devis Express par template — on peut aller plus loin.

**À implémenter :**
- Dans le wizard Devis Express, ajouter une option "Décrire vos travaux" en haut
- Textarea libre : "Rénovation complète salle de bain 6m², remplacement baignoire par douche italienne, nouveau carrelage sol et murs, meuble vasque double, WC suspendu"
- Parser la description pour identifier : métier(s), type de travaux, surface, équipements mentionnés
- Matcher avec les templates existants (230+) et pré-remplir les lignes du devis
- Permettre l'édition manuelle après génération
- Utiliser un matching par mots-clés côté client (pas besoin d'API IA externe pour V1)
- Dictée vocale : bouton micro pour dicter au lieu de taper (Web Speech API)
- **Fichier :** `src/lib/devis-ai-parser.js` — logique de parsing NLP simplifiée

### 3.2 — Mode Photo-Devis : Estimer depuis une Photo

**Contexte :** Sur le terrain, l'artisan prend une photo et veut un devis rapide. Aucun concurrent ne fait ça.

**À implémenter (V1 simplifiée) :**
- Bouton "Photo → Devis" dans l'écran mobile
- Upload photo → l'artisan annote (dessine des zones, ajoute des labels)
- Sélection du type de travaux associé à chaque zone annotée
- Pré-remplissage du devis depuis les zones annotées + templates
- La photo annotée est jointe au devis comme "Relevé terrain"
- Stockage dans la photo gallery du chantier
- **Pas de vision IA pour V1** — juste annotation manuelle + templates

### 3.3 — Carnet d'Entretien Client (Fidélisation)

**Contexte :** Un artisan plombier installe une chaudière. Dans 1 an, il faut un entretien. 90% des artisans oublient de relancer. C'est du CA perdu.

**À implémenter :**
- Section "Entretiens" sur la fiche client
- Possibilité de planifier un entretien récurrent (annuel, semestriel, etc.)
- Alerte automatique 30 jours avant l'échéance
- Email/SMS automatique au client : "Votre entretien annuel de chaudière arrive à échéance"
- Bouton "Créer un devis d'entretien" en 1 clic (template pré-rempli)
- Dashboard widget : "X entretiens à planifier ce mois"
- **Table Supabase :** `entretiens` (id, client_id, chantier_id, type, description, periodicite, prochaine_date, alerte_envoyee, user_id)

### 3.4 — Score Santé Entreprise (Cockpit Dirigeant)

**Contexte :** Les artisans n'ont aucune visibilité sur la santé globale de leur entreprise. Vertuoza fait du reporting mais c'est cher.

**À implémenter :**
- Nouveau widget Dashboard "Score Santé" (jauge circulaire 0-100)
- Calcul basé sur 6 indicateurs pondérés :
  1. Trésorerie : solde prévisionnel 30j (25%)
  2. Carnet de commandes : devis signés non commencés (20%)
  3. Taux de conversion devis (15%)
  4. Marge moyenne des chantiers en cours (15%)
  5. Impayés : montant factures >30j non payées (15%)
  6. Conformité : profil complet + assurances à jour (10%)
- Code couleur : Vert (>70), Orange (40-70), Rouge (<40)
- Conseils contextuels : "Votre taux de conversion est bas (15%). Relancez vos 3 devis en attente."
- Historique mensuel du score (graphique sparkline)

### 3.5 — Signature Électronique Avancée

**Contexte :** La signature sur le portail client existe mais n'est pas conforme eIDAS. C'est un argument de vente.

**À améliorer :**
- Horodatage certifié (timestamp RFC 3161)
- Hash SHA-256 du document signé
- Certificat de signature PDF (intégré au PDF généré)
- Log d'audit : IP, user-agent, date/heure, géolocalisation
- Email de confirmation automatique au client après signature
- Stockage du certificat de signature dans la fiche devis
- Badge "Signé électroniquement" visible sur le document

---

## PRIORITÉ 4 — POLISH & OPTIMISATIONS UX

### 4.1 — Recherche Globale Améliorée (Cmd+K)

**Upgrade :**
- La recherche Cmd+K existe — l'améliorer pour chercher dans : clients, devis, chantiers, factures, catalogue, équipe
- Résultats groupés par type avec icônes
- Actions rapides : "Créer un devis pour [client]", "Appeler [client]", "Voir chantier [nom]"
- Historique des recherches récentes
- Raccourcis : "d:dupont" pour chercher un devis pour Dupont

### 4.2 — Tableau de Bord Personnalisable

**À implémenter :**
- Drag & drop pour réorganiser les widgets du Dashboard
- Show/hide des widgets selon préférences
- Choix entre vue "Terrain" (agenda + tâches + météo) et vue "Bureau" (KPI + finances + pipeline)
- Sauvegarde de la disposition dans les préférences utilisateur

### 4.3 — Export Comptable Amélioré

**Amélioration :**
- Export FEC (Fichier des Écritures Comptables) — format obligatoire pour le contrôle fiscal
- Export compatible SAGE, EBP, Ciel, Quadratus (formats spécifiques)
- Ventilation automatique par code comptable (706 prestations, 707 ventes, 401 fournisseurs...)
- Export des journaux : Ventes, Achats, Banque
- Période sélectionnable (mois, trimestre, année)

### 4.4 — Notifications Push Intelligentes

**À implémenter :**
- Notifications push via Service Worker (déjà PWA)
- Événements : nouveau devis signé, paiement reçu, facture en retard, alerte météo, entretien à planifier, retenue de garantie à libérer
- Configuration granulaire dans Paramètres (activer/désactiver par type)
- Badge sur l'icône de l'app avec le nombre de notifications non lues

### 4.5 — Mode Multi-Entreprise

**Contexte :** Certains artisans ont 2 structures (SARL + auto-entrepreneur). Rare chez les concurrents.

**À implémenter :**
- Sélecteur d'entreprise dans le header (à côté du nom actuel)
- Chaque entreprise a ses propres : paramètres, clients, devis, chantiers
- Switch rapide sans déconnexion
- **Table Supabase :** `entreprises` (id, nom, siret, adresse, logo, couleur, user_id) — déjà partiellement couvert par les settings

---

## INSTRUCTIONS GÉNÉRALES

### Ordre d'implémentation recommandé :
1. **Sprint 1 (1 semaine)** : 1.3 (Facture 2026 — urgence légale), 2.3 (Relance améliorée), 3.4 (Score Santé)
2. **Sprint 2 (1 semaine)** : 1.1 (Situations de travaux), 2.2 (Trésorerie), 2.4 (Rapport chantier)
3. **Sprint 3 (1 semaine)** : 1.2 (Bibliothèque ouvrages), 2.1 (Sous-traitants), 2.5 (Commandes)
4. **Sprint 4 (1 semaine)** : 3.1 (IA Devis), 3.3 (Carnet entretien), 3.5 (Signature avancée)
5. **Sprint 5 (1 semaine)** : 4.1-4.5 (Polish UX), 3.2 (Photo-Devis)

### Règles de développement :
- Chaque feature = 1 commit avec message clair : `feat(situations): add situations de travaux module`
- Chaque nouvelle table Supabase = 1 migration SQL dans `supabase/migrations/`
- Respecter le design system existant (orange accent, cards, badges, dark mode support)
- Tout doit fonctionner en mode offline (IndexedDB fallback)
- Mobile-first : tester sur viewport 375px
- Réutiliser les composants UI existants (`src/components/ui/`)
- Ajouter les nouvelles entrées dans la navigation sidebar (suivre le pattern existant)
- Les nouveaux widgets Dashboard doivent s'intégrer dans la grille existante
- Support dark mode obligatoire sur chaque nouveau composant
- Tests : ajouter les calculs critiques dans validation.js (TVA, marge, situations)

### Ce qui fait la différence par rapport aux concurrents :
- **Devis Express** est déjà un killer feature (230 templates). L'enrichir avec l'IA et la dictée vocale.
- **Mode terrain** (offline, géofencing, pointage) est un avantage mobile rare.
- **Situations de travaux** + **trésorerie** = combo qui résout le problème #1 des artisans (cash flow).
- **Score Santé** = tableau de bord dirigeant que seuls les outils enterprise proposent.
- **Carnet d'entretien** = fidélisation automatique, unique sur le marché.
- **Conformité 2026** = argument commercial immédiat ("Soyez prêt avec ChantierPro").
```
