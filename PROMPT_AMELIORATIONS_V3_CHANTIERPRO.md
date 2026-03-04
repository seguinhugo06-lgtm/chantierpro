# Prompt Claude Code — Améliorations UX/UI V3 de ChantierPro

Copie-colle ce prompt dans Claude Code pour implémenter les améliorations identifiées lors du deep dive complet de chaque page.

---

```
Tu es un développeur senior React/TypeScript. Je viens de faire un audit UX approfondi de mon app ChantierPro (React 18, Vite 5, Supabase, Zustand, Tailwind CSS) déployée sur goofy-perlman.vercel.app.

Les bugs V2 (unicode, accents) sont traités dans un prompt séparé. Ce prompt concerne les AMÉLIORATIONS UX/UI pour chaque page.

IMPORTANT : implémente les améliorations par page, dans l'ordre. Commite après chaque page terminée. Priorise les améliorations marquées ⭐ (quick wins à fort impact).

---

## PAGE 1 — ACCUEIL (Dashboard)

**Fichier principal :** `src/pages/Dashboard.jsx` ou `src/components/Dashboard.jsx`

### Améliorations :

1. ⭐ **Section "Devis à relancer"** — Ajouter un widget qui liste les devis au statut "Envoyé" depuis plus de 7 jours. Afficher : numéro, client, montant, nombre de jours depuis envoi. Bouton "Relancer" qui redirige vers le devis.

2. ⭐ **Raccourcis rapides** — Ajouter une barre de raccourcis sous le greeting : "Nouveau devis", "Nouveau client", "Nouvelle dépense". Icônes + texte, cliquables, redirigeant vers les formulaires correspondants.

3. **KPI "Taux de conversion"** — Ajouter un KPI card montrant le ratio devis signés / devis envoyés du mois en cours, en pourcentage avec tendance vs mois précédent.

4. **KPI "Marge moyenne"** — Afficher la marge moyenne pondérée sur les devis facturés du mois.

5. **Notification badge** — Activer le badge sur l'icône cloche (🔔) dans le header. Compter : devis en attente > 7j + factures impayées > 30j + documents conformité expirés.

6. **Graphique comparatif** — Dans le widget Performance, ajouter une option toggle pour comparer le mois en cours vs le mois précédent (ligne pointillée).

---

## PAGE 2 — DEVIS & FACTURES

**Fichier principal :** `src/pages/DevisPage.jsx` ou `src/components/DevisFactures.jsx`

### Améliorations :

1. ⭐ **Dupliquer un devis** — Ajouter un bouton "Dupliquer" dans le menu d'actions de chaque devis (à côté de Modifier/Supprimer). Crée une copie avec nouveau numéro, date du jour, statut "Brouillon".

2. ⭐ **Templates favoris** — En haut du wizard de création, afficher les 5 templates les plus utilisés comme chips cliquables pour accès rapide.

3. **Filtres avancés** — Ajouter des filtres par : date de création (période), client, fourchette de montant, statut. Utiliser des dropdowns/date pickers dans une barre de filtre.

4. **Vue Kanban** — Ajouter un toggle vue "Liste / Kanban". En Kanban, colonnes = statuts (Brouillon, Envoyé, Signé, Facturé). Les devis sont des cards déplaçables par drag & drop.

5. **Prévisualisation PDF** — Avant d'envoyer un devis, bouton "Aperçu PDF" qui génère un preview dans une modale.

6. **Numérotation factures** — S'assurer que la numérotation des factures suit le format FAC-YYYY-NNNNN séparé des devis DEV-YYYY-NNNNN.

7. **Historique relances** — Dans la vue détail d'un devis envoyé, afficher un timeline des relances envoyées (date, canal).

8. **Option paiement échelonné** — Dans le devis, ajouter un champ optionnel "Paiement en X fois" avec échéancier auto-calculé.

---

## PAGE 3 — CHANTIERS

**Fichier principal :** `src/pages/Chantiers.jsx` ou `src/components/Chantiers.jsx`

### Améliorations :

1. ⭐ **Alerte dépassement budget** — Si les dépenses dépassent 80% du budget estimé, afficher un bandeau d'alerte rouge dans la fiche chantier avec le pourcentage consommé.

2. ⭐ **Export fiche chantier PDF** — Bouton "Exporter PDF" dans la fiche chantier qui génère un résumé : infos client, adresse, avancement, finances, tâches.

3. **Vue carte** — Ajouter un toggle "Liste / Carte" sur la page principale. La vue carte affiche les chantiers sur une map (Leaflet/OpenStreetMap) en utilisant l'adresse.

4. **Timeline / Journal de chantier** — Dans l'onglet existant, ajouter une vue chronologique de toutes les actions : création, modifications, dépenses ajoutées, photos uploadées, notes.

5. **Barre d'avancement interactive** — Permettre de cliquer sur la barre d'avancement pour mettre à jour le % directement (slider ou input rapide).

6. **Widget météo chantier** — Utiliser l'adresse du chantier pour afficher la météo locale dans un mini-widget (réutiliser l'API météo déjà intégrée dans le dashboard).

7. **Liaison devis→chantier→facture** — Afficher visuellement la chaîne complète : quel devis a généré ce chantier, quelles factures y sont liées. Breadcrumb cliquable.

---

## PAGE 4 — PLANNING

**Fichier principal :** `src/pages/Planning.jsx` ou `src/components/Planning.jsx`

### Améliorations :

1. ⭐ **Vue jour** — Ajouter une vue "Jour" avec des slots horaires (7h-20h) en plus de Mois et Semaine.

2. ⭐ **Drag & drop** — Permettre de déplacer les événements par drag & drop dans la vue semaine/mois pour changer la date.

3. **Créer depuis chantier** — Quand on est dans la fiche d'un chantier, bouton "Planifier une intervention" qui ouvre le formulaire de création d'événement pré-rempli avec le chantier.

4. **Vue multi-employés** — Si l'entreprise a des employés (module Équipe), permettre de voir les plannings côte à côte par colonne.

5. **Sync calendrier** — Ajouter un bouton "Exporter iCal" qui génère un fichier .ics téléchargeable pour synchroniser avec Google Calendar / Apple Calendar.

6. **Alertes rappel** — Option de notification/rappel X heures avant un rendez-vous (stocké en préférence utilisateur).

---

## PAGE 5 — CLIENTS

**Fichier principal :** `src/pages/Clients.jsx` ou `src/components/Clients.jsx`

### Améliorations :

1. ⭐ **Historique client complet** — Dans la fiche client, ajouter un onglet "Historique" listant : tous les devis, factures, chantiers associés, avec statut et montant.

2. ⭐ **Tags / Catégories** — Ajouter un système de tags : "Particulier", "Professionnel", "Syndic", "Architecte", etc. Filtrable dans la liste.

3. **Vue tableau alternative** — Toggle "Cards / Tableau" pour afficher les clients en table (nom, téléphone, email, devis en cours, montant total).

4. **Import CSV** — Bouton "Importer" qui accepte un fichier CSV avec colonnes : nom, prénom, email, téléphone, adresse. Mapping de colonnes interactif.

5. **Score fiabilité** — Afficher un indicateur de fiabilité paiement par client : ratio factures payées dans les délais. Vert/Orange/Rouge.

6. **Fiche client enrichie** — Ajouter champs : date de naissance (optionnel), notes internes, source d'acquisition (bouche à oreille, web, recommandation).

---

## PAGE 6 — CATALOGUE

**Fichier principal :** `src/pages/Catalogue.jsx` ou `src/components/Catalogue.jsx`

### Améliorations :

1. ⭐ **Import CSV/Excel** — Bouton "Importer" pour ajouter des articles en masse depuis un fichier CSV/Excel. Colonnes : désignation, catégorie, prix HT, unité, TVA.

2. ⭐ **Alerte stock bas** — Pour les articles avec gestion de stock activée, afficher un badge d'alerte quand le stock passe sous le seuil min configurable.

3. **Fournisseur par article** — Ajouter un champ "Fournisseur" et "Référence fournisseur" à chaque article pour faciliter les commandes.

4. **Historique prix** — Tracker l'évolution du prix d'achat par article (date, ancien prix, nouveau prix) pour voir les tendances.

5. **Unités personnalisables** — Au-delà des unités standard (u, m², ml, kg, m³), permettre d'ajouter des unités customs (forfait, lot, palette).

6. **Scan code-barres** — En mode mobile, bouton pour scanner un code-barres et retrouver l'article correspondant dans le catalogue.

---

## PAGE 7 — OUVRAGES

**Fichier principal :** `src/components/BibliothequeOuvrages.jsx`

### Améliorations :

1. ⭐ **Dupliquer un ouvrage** — Bouton "Dupliquer" sur chaque ouvrage pour créer une variante rapidement (ex: "Pose carrelage sol 60x60" → "Pose carrelage mural 30x60").

2. ⭐ **Templates prédéfinis** — Proposer des ouvrages types par corps de métier (Plomberie, Électricité, Maçonnerie...) avec composants pré-remplis et prix moyens du marché.

3. **Lien catalogue** — Quand on ajoute un composant, permettre de chercher dans le catalogue existant pour auto-remplir prix et description.

4. **Bouton "Utiliser dans un devis"** — Depuis la fiche ouvrage, bouton qui redirige vers la création de devis avec cet ouvrage pré-ajouté en ligne.

5. **Historique d'utilisation** — Afficher dans quels devis cet ouvrage a été utilisé (numéro, client, date).

6. **Temps de pose → Main d'œuvre** — Quand le temps de pose est renseigné (heures), calculer automatiquement le coût main d'œuvre en utilisant le taux horaire de l'entreprise (à configurer dans Paramètres > Rentabilité).

7. **Photos / Pièces jointes** — Permettre d'ajouter des photos de référence à un ouvrage (résultat attendu, matériaux).

---

## PAGE 8 — SOUS-TRAITANTS

**Fichier principal :** `src/components/SousTraitantsModule.jsx`

### Bugs accents à corriger (en plus du prompt V2-4) :

- `"documents expires"` → `"documents expirés"`
- `"conformite"` (dans sous-titre) → `"conformité"`
- `"eviter"` → `"éviter"`
- `"CONFORMITE"` (en-tête section) → `"CONFORMITÉ"`
- `"Non recue"` → `"Non reçue"`
- `"CHANTIERS ASSIGNES"` → `"CHANTIERS ASSIGNÉS"`
- `"Aucun chantier assigne."` → `"Aucun chantier assigné."`
- `"Cree le"` → `"Créé le"`

### Améliorations :

1. ⭐ **Upload documents** — Ajouter un bouton d'upload pour RC Pro et URSSAF. Stocker le fichier (PDF/image) avec date d'expiration. Afficher l'icône vert/rouge selon validité.

2. ⭐ **Alertes expiration** — Notification automatique 30 jours avant l'expiration d'un document obligatoire. Bannière d'alerte en haut de la page.

3. **SIRET auto-fill** — Champ SIRET avec appel API INSEE/Pappers pour auto-remplir : raison sociale, adresse, code APE, forme juridique.

4. **Historique paiements** — Onglet dans la fiche sous-traitant listant les paiements effectués (date, montant, chantier associé).

5. **Notation qualité** — Système de notation multi-critères : ponctualité, qualité du travail, rapport qualité/prix. Moyenne affichée dans la liste.

6. **Contrats modèles** — Proposition de modèle de contrat de sous-traitance pré-rempli avec les informations du sous-traitant.

---

## PAGE 9 — COMMANDES FOURNISSEURS

**Fichier principal :** `src/components/CommandesFournisseurs.jsx`

### Bugs accents à corriger (en plus du prompt V2-4) :

- `"Gerez"` (sous-titre) → `"Gérez"`
- `"Telephone"` → `"Téléphone"`
- `"RECAPITULATIF"` → `"RÉCAPITULATIF"`
- `"Rechercher numero"` → `"Rechercher numéro"`
- `"Creez votre premiere"` → `"Créez votre première"`
- `"particulieres"` → `"particulières"`

### Améliorations :

1. ⭐ **Auto-complétion fournisseur** — Quand on tape le nom du fournisseur, proposer en auto-complétion les sous-traitants existants. Au clic, remplir automatiquement contact, email, téléphone.

2. ⭐ **Lignes depuis catalogue** — Ajouter un bouton "Depuis le catalogue" sur chaque ligne de commande pour sélectionner un article existant (description, réf, prix auto-remplis).

3. **Workflow statuts** — Implémenter un pipeline : Brouillon → Envoyé → Confirmé → Livré partiellement → Livré → Clôturé. Badge couleur par statut.

4. **Génération PDF** — Bouton "Générer PDF" qui produit un bon de commande professionnel avec les infos entreprise, fournisseur, lignes, totaux.

5. **Réception partielle** — Permettre de marquer une commande comme "partiellement livrée" en cochant les lignes reçues. Calcul automatique du restant.

6. **Historique fournisseur** — Voir toutes les commandes passées avec un fournisseur (montant total, nombre de commandes, dernier achat).

---

## PAGE 10 — TRÉSORERIE

**Fichier principal :** `src/components/TresorerieModule.jsx`

### Bugs accents à corriger (en plus du prompt V2-5) :

- `"entrees"` (dans le texte sous PROJECTION) → `"entrées"`
- `"Apercu"` (nom d'onglet) → `"Aperçu"`
- `"DATE PREVUE"` (en-tête colonne) → `"DATE PRÉVUE"`
- `"Paye"` (statut) → `"Payé"`
- `"Prevu"` (statut) → `"Prévu"`
- `"depot"` (dans "Loyer local / depot") → `"dépôt"`
- `"decennale"` → `"décennale"`
- `"vehicules"` → `"véhicules"`

### Améliorations :

1. ⭐ **Alerte seuil critique** — Configurer un seuil de trésorerie minimum. Si la projection passe en dessous, afficher une alerte rouge sur le dashboard et dans cette page.

2. ⭐ **Catégorisation dépenses** — Ajouter une catégorie à chaque entrée/sortie (Loyer, Assurance, Salaires, Véhicules, Fournitures, Divers). Filtre par catégorie + camembert répartition.

3. **Budget vs Réel** — Pour chaque mois, comparer le budget prévu vs le réel. Afficher l'écart en positif/négatif avec code couleur.

4. **Import relevé bancaire** — Bouton "Importer relevé" acceptant un CSV bancaire (format standard) pour rapprochement automatique avec les entrées/sorties.

5. **Export relevé** — Bouton "Exporter" la trésorerie en CSV ou PDF pour transmission au comptable.

6. **Prévision IA** — En se basant sur l'historique des 6 derniers mois, proposer une prévision automatique des charges récurrentes du mois suivant.

---

## PAGE 11 — IA DEVIS (Analyses IA)

**Fichier principal :** `src/components/IADevisAnalyse.jsx`

### Améliorations :

1. ⭐ **Historique des analyses** — Lister les analyses précédentes avec miniature photo, date, type de travaux détecté, montant estimé. Clic pour revoir le détail.

2. ⭐ **Convertir en devis** — Après une analyse, bouton "Créer un devis" qui pré-remplit un devis avec les lignes estimées par l'IA.

3. **Multi-photos** — Permettre d'uploader plusieurs photos par analyse (ex: différents angles d'une pièce) pour une estimation plus précise.

4. **Ajustement manuel** — Après l'estimation IA, permettre de modifier les quantités, prix unitaires, ajouter/supprimer des lignes avant de convertir en devis.

5. **Comparaison prix régionaux** — Afficher les prix estimés avec une fourchette (bas/moyen/haut) basée sur la région de l'entreprise.

6. **Annotations photo** — Permettre de dessiner/annoter sur la photo pour indiquer les zones de travaux spécifiques.

---

## PAGE 12 — CARNET D'ENTRETIEN

**Fichier principal :** `src/components/CarnetEntretien.jsx`

### Améliorations :

1. ⭐ **Templates par type de bien** — Proposer des modèles de carnet pré-remplis : "Maison individuelle", "Appartement", "Local commercial", "Copropriété". Avec tâches récurrentes types.

2. ⭐ **Notifications tâches** — Envoyer une notification (in-app + email optionnel) X jours avant une tâche d'entretien planifiée.

3. **Historique interventions** — Pour chaque tâche, log des interventions passées : date, qui, coût, commentaire.

4. **Photos par intervention** — Joindre des photos avant/après pour chaque intervention réalisée.

5. **Garanties avec alerte** — Section garanties avec date début/fin. Alerte automatique 3 mois avant expiration.

6. **QR code par bien** — Générer un QR code unique par carnet qui permet d'accéder rapidement au carnet en scannant avec un mobile.

---

## PAGE 13 — SIGNATURES ÉLECTRONIQUES

**Fichier principal :** `src/components/SignatureModule.jsx`

### Améliorations :

1. ⭐ **Envoi par email** — Bouton "Envoyer pour signature" qui envoie un email au client avec un lien sécurisé pour signer en ligne.

2. ⭐ **Relance automatique** — Si un document n'est pas signé après X jours (configurable), envoyer une relance automatique par email.

3. **Signature tablette** — Interface de signature tactile optimisée pour tablette/smartphone (canvas plein écran avec stylet).

4. **Multi-signataires** — Gérer les cas où plusieurs personnes doivent signer (ex: le client ET le chef d'entreprise, ou co-propriétaires).

5. **Audit trail** — Afficher un log détaillé : envoyé le, ouvert le, signé le, IP, navigateur. Conforme eIDAS.

6. **Archivage légal** — Stocker les documents signés avec horodatage et hash pour valeur probante. Indication durée de conservation légale.

7. **Afficher nom complet client** — Le document DEV-2026-00001 affiche "Dupont" mais devrait afficher "Dupont Jean" (nom + prénom).

---

## PAGE 14 — EXPORT COMPTABLE

**Fichier principal :** `src/components/ExportComptable.jsx`

### Améliorations :

1. ⭐ **Aperçu des écritures** — Développer la section "Aperçu des écritures" pour montrer un tableau complet : date, journal, compte, libellé, débit, crédit. Permettre de vérifier avant export.

2. **Export par journal** — Permettre de sélectionner le journal à exporter : Ventes (VE), Achats (HA), Banque (BQ), Opérations diverses (OD).

3. **Plan comptable personnalisable** — Dans les paramètres, permettre de mapper les catégories ChantierPro vers les comptes comptables de l'entreprise (ex: 706000 pour Prestations de services).

4. **Rapprochement TVA** — Vérifier automatiquement que les montants TVA exportés correspondent aux déclarations TVA de la page Administratif.

5. **Export automatique programmé** — Option pour programmer un export automatique chaque fin de mois, envoyé par email au comptable.

6. **Intégrations comptables** — API pour export direct vers logiciels comptables populaires (Sage, EBP, Cegid, etc.) - en V4.

---

## PAGE 15 — ÉQUIPE & HEURES

**Fichier principal :** `src/components/EquipeModule.jsx` (ou à créer)

### Bug accent :
- `"Ajouter mon premier employe"` → `"Ajouter mon premier employé"`

### Améliorations :

1. ⭐ **Fiche employé complète** — Formulaire avec : nom, prénom, poste, téléphone, email, compétences/certifications, taux horaire chargé, date d'embauche.

2. ⭐ **Pointage mobile** — Chronomètre de pointage : bouton Start/Stop pour enregistrer les heures travaillées par chantier. Géolocalisation optionnelle.

3. **Planning individuel** — Calendrier par employé montrant les interventions planifiées, avec vue multi-employés côte à côte.

4. **Attribution chantier** — Depuis la fiche chantier, assigner des employés aux interventions. Calcul automatique du coût main d'œuvre.

5. **Gestion absences** — Mini-module pour enregistrer congés, arrêts maladie, RTT. Visible dans le planning.

6. **Export fiche de paie** — Export CSV des heures pointées par employé et par mois pour transmission au cabinet comptable.

---

## PAGE 16 — ADMINISTRATIF

**Fichier principal :** `src/components/AdministratifModule.jsx` (ou à créer)

### Améliorations :

1. ⭐ **Alertes email échéances** — Envoyer un email de rappel 7 jours et 1 jour avant chaque échéance administrative (TVA, DSN, renouvellement assurance).

2. ⭐ **Pré-remplissage TVA** — Dans l'onglet TVA, calculer automatiquement TVA collectée (depuis factures) et TVA déductible (depuis dépenses/commandes) pour pré-remplir la déclaration.

3. **Documents modèles** — Proposer des modèles téléchargeables : attestation de vigilance, attestation TVA simplifiée, PPSPS simplifié, fiche de chantier.

4. **Liens directs** — Dans chaque section de conformité, ajouter un lien direct vers le site officiel correspondant (URSSAF, impots.gouv.fr, net-entreprises.fr).

5. **Historique déclarations** — Tracker les déclarations passées : date, montant, statut (envoyé, en attente, validé).

6. **Conseil personnalisé** — En fonction du statut juridique et du CA de l'entreprise (depuis Paramètres), afficher des conseils adaptés (ex: seuil franchise TVA, régime micro vs réel).

7. **Cohérence tutoiement** — Le sous-titre "Vérifie ta conformité réglementaire" utilise le tutoiement alors que toute l'app utilise le vouvoiement. Corriger en : "Vérifiez votre conformité réglementaire".

---

## PAGE 17 — PARAMÈTRES

**Fichier principal :** `src/pages/Parametres.jsx` ou `src/components/Parametres.jsx`

### Améliorations :

1. ⭐ **Assistant de configuration** — Au premier lancement (profil < 30%), proposer un wizard guidé étape par étape pour remplir : identité → légal → assurances → banque. Avec barre de progression.

2. ⭐ **SIRET auto-fill** — Ajouter un champ SIRET avec bouton "Rechercher". Appel API (INSEE/Pappers) pour remplir automatiquement : raison sociale, adresse, code APE, forme juridique.

3. **Prévisualisation documents** — Dans l'onglet "Facture 2026", montrer un aperçu live du devis/facture avec les paramètres en cours (logo, couleur, mentions).

4. **Modèles personnalisables** — Permettre de modifier les textes par défaut des conditions générales, mentions légales, texte de pied de page des devis/factures.

5. **Sauvegarde/restauration** — Bouton "Exporter mes paramètres" (JSON) et "Importer" pour backup ou migration.

6. **Multi-entreprise** — Développer l'onglet Multi-entreprise : switch entre entreprises, paramètres indépendants par entreprise, tableau de bord consolidé.

---

## AMÉLIORATIONS GLOBALES (transversales)

### Priorité haute :

1. ⭐ **Palette de commandes (⌘K)** — La barre de recherche existe déjà. L'enrichir en "command palette" : taper "nouveau devis", "client dupont", "chantier renovation" pour actions + navigation rapide.

2. ⭐ **Onboarding guidé** — Pour les nouvelles inscriptions, proposer un tour guidé interactif (tooltip step-by-step) couvrant : créer un client → créer un devis → envoyer → signer → facturer.

3. ⭐ **Notifications centralisées** — Créer un centre de notifications accessible via la cloche. Types : échéances admin, devis à relancer, factures impayées, documents expirés, stock bas.

### Priorité moyenne :

4. **Mode hors-ligne robuste** — Renforcer l'IndexedDB pour queuer les créations/modifications offline. Sync automatique au retour en ligne avec gestion des conflits.

5. **Import/Export global** — Dans Paramètres, ajouter "Exporter toutes mes données" (ZIP avec clients, devis, factures en JSON/CSV) et "Importer" pour migration depuis un autre logiciel.

6. **Raccourcis clavier** — Implémenter les raccourcis courants : N pour nouveau, E pour éditer, S pour sauvegarder, Esc pour annuler/fermer.

7. **Tutoriels contextuels** — Sur chaque page vide (état initial), ajouter un mini-tutoriel vidéo ou GIF montrant comment utiliser la fonctionnalité.

### Priorité basse :

8. **Multi-langue** — Préparer l'internationalisation (i18n) pour une future version anglaise/espagnole.

9. **API publique** — Documenter et exposer une API REST pour intégrations tierces.

10. **Audit trail global** — Logger toutes les modifications importantes (création, édition, suppression de documents) avec qui/quand/quoi.

---

## RÉSUMÉ DES FICHIERS À MODIFIER

| Page | Fichier principal | Nb améliorations |
|------|-------------------|------------------|
| Accueil | `src/pages/Dashboard.jsx` | 6 |
| Devis & Factures | `src/pages/DevisPage.jsx` | 8 |
| Chantiers | `src/pages/Chantiers.jsx` | 7 |
| Planning | `src/pages/Planning.jsx` | 6 |
| Clients | `src/pages/Clients.jsx` | 6 |
| Catalogue | `src/pages/Catalogue.jsx` | 6 |
| Ouvrages | `src/components/BibliothequeOuvrages.jsx` | 7 |
| Sous-Traitants | `src/components/SousTraitantsModule.jsx` | 6 + accents |
| Commandes | `src/components/CommandesFournisseurs.jsx` | 6 + accents |
| Trésorerie | `src/components/TresorerieModule.jsx` | 6 + accents |
| IA Devis | `src/components/IADevisAnalyse.jsx` | 6 |
| Entretien | `src/components/CarnetEntretien.jsx` | 6 |
| Signatures | `src/components/SignatureModule.jsx` | 7 |
| Export Compta | `src/components/ExportComptable.jsx` | 6 |
| Équipe | `src/components/EquipeModule.jsx` | 6 + accent |
| Administratif | `src/components/AdministratifModule.jsx` | 7 |
| Paramètres | `src/pages/Parametres.jsx` | 6 |
| **Global** | Plusieurs fichiers | 10 |

**Total : 118 améliorations** dont **~25 quick wins ⭐**

---

## ORDRE D'IMPLÉMENTATION RECOMMANDÉ

### Sprint 1 — Quick Wins ⭐ (1-2 jours)
1. Tous les bugs accents restants (pages 8, 9, 10, 15, 16)
2. Dashboard : raccourcis rapides + section devis à relancer
3. Devis : bouton dupliquer
4. Chantiers : alerte dépassement budget
5. Paramètres : assistant de configuration

### Sprint 2 — Core UX (3-5 jours)
6. Palette de commandes enrichie
7. Notifications centralisées
8. Clients : historique + tags
9. Planning : vue jour + drag & drop
10. Ouvrages : templates + dupliquer

### Sprint 3 — Fonctionnalités métier (5-7 jours)
11. Sous-traitants : upload documents + alertes expiration
12. Commandes : auto-complétion + workflow statuts
13. Trésorerie : catégorisation + alerte seuil
14. IA Devis : historique + convertir en devis
15. Signatures : envoi email + relance auto

### Sprint 4 — Advanced (7-10 jours)
16. Export compta : aperçu écritures + export par journal
17. Équipe : fiches employé + pointage
18. Administratif : alertes email + pré-remplissage TVA
19. Entretien : templates + notifications
20. Import/Export global + onboarding
```
