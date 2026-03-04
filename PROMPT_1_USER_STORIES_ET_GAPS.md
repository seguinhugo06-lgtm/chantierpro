# PROMPT 1: User Stories et Gap Analysis - ChantierPro

## 📋 Vue d'ensemble
Document complet pour Prompt 1 d'une série de 5 prompts de développement pour **ChantierPro**, une application web de gestion pour entreprises de construction (BTP) en France.

**Stack technologique :**
- React 18 + Vite 5
- Supabase (BDD + authentification)
- Zustand (state management)
- Tailwind CSS (styles)
- Autres : TypeScript, Shadcn/ui, Recharts

---

## 🎯 SECTION 1 : Histoires Utilisateur Par Catégorie

### **A. Gestion Commerciale (Devis & Factures)**

#### US-A1 : Créer un devis en moins de 5 minutes avec bibliothèque d'ouvrages
**Acteur :** Commercial/Artisan
**Objectif :** Rédiger rapidement un devis professionnel sans recourir à Excel
**Détails :**
- Sélectionner client existant ou créer rapide
- Ajouter articles/ouvrages depuis catalogue (230+ templates)
- Editer prix unitaires et quantités
- Voir total TTC en temps réel
- Bouton "Transformer en facture" disponible dès signature
- Délai cible : < 5 min pour devis simple

#### US-A2 : Envoyer un devis par email avec suivi de lecture
**Acteur :** Commercial
**Objectif :** Transmettre devis et savoir s'il est lu
**Détails :**
- Envoyer PDF devis par email depuis l'app
- Recevoir notification : "Devis ouvert par X à HH:MM"
- Voir métrique : nombre d'ouvertures + timestamps
- Relance automatique si pas ouvert après 3j
- Template email personnalisable (logo, couleur)
- Historique d'envoi complet

#### US-A3 : Transformer un devis signé en facture en 1 clic
**Acteur :** Commercial/Facturation
**Objectif :** Passer du devis signé à facture automatiquement
**Détails :**
- Devis signé = état "Signé" dans pipeline
- Bouton "Créer facture" → crée doc identique numéroté
- TVA, adresse, articles conservés
- Facture créée en état "Brouillon" → prête à valider
- Traçabilité : lien bidirectionnel devis ↔ facture

#### US-A4 : Dupliquer un devis existant pour créer une variante
**Acteur :** Commercial
**Objectif :** Réutiliser structure d'un ancien devis
**Détails :**
- Action "Dupliquer" sur devis existant (brouillon/signé/facturé)
- Clone 100% sauf n° devis/facture (nouveau n°)
- Possibilité de modifier client, articles, prix avant sauver
- Conserve les ouvrages composites et coefficients

#### US-A5 : Gérer les acomptes et situations de travaux
**Acteur :** Commercial/Chef de chantier
**Objectif :** Facturer par étapes (acompte initial, situation de travaux)
**Détails :**
- Créer facture "Acompte" = facture partielle (ex: 30% du devis)
- Créer "Situation de travaux" = progression % du devis
- Lier situation à chantier (avancement physique)
- Calcul automatique : reste facturé
- Évite doublon facture

#### US-A6 : Relancer automatiquement les devis non signés
**Acteur :** Commercial
**Objectif :** Augmenter taux signature devis
**Détails :**
- Configuration : relancer après X jours (default 3j)
- Envoyer email relance auto + notification app
- Ne pas relancer après 5 tentatives
- Log de chaque tentative
- Arrêt manuel possible

#### US-A7 : Facturer les travaux supplémentaires (avenants)
**Acteur :** Chef de chantier/Commercial
**Objectif :** Ajouter coûts supplémentaires après démarrage chantier
**Détails :**
- Créer "Avenant" lié à devis existant
- Ajouter articles supplémentaires
- Facture avenant = n° séquentiel (ex: FAC-001-AVENANT-1)
- Lien transparent : devis principal + avenants = total facturé
- Signature électronique requise pour avenant

#### US-A8 : Appliquer les taux TVA corrects selon type de travaux
**Acteur :** Système (auto)
**Objectif :** Respecter réglementation TVA France
**Détails :**
- TVA 20% : travaux généraux neufs
- TVA 10% : rénovation, amélioration
- TVA 5.5% : rénovation logement principal + certains travaux
- TVA 0% : aveuglément à certaines conditions
- Saisie semi-auto : catégorie ouvrage → propose taux
- Modification possible avant validation

#### US-A9 : Gérer l'auto-liquidation pour sous-traitance
**Acteur :** Système + Commercial
**Objectif :** Appliquer auto-liquidation TVA sous-traitance
**Détails :**
- Sur facture : cocher "Facture sous-traitant"
- TVA = 0% sur facture + note "Auto-liquidation"
- Entreprise responsable de déclaration TVA
- Vérification URSSAF prestataire automatique
- Alerte si URSSAF non à jour

#### US-A10 : Numérotation légale séquentielle
**Acteur :** Système (auto)
**Objectif :** Respecter exigences légales de numérotation
**Détails :**
- Devis : DEV-2025-0001, DEV-2025-0002...
- Facture : FAC-2025-0001, FAC-2025-0002...
- Avenant : FAC-2025-0001-AVENANT-1
- Pas de trou numérotation
- Réinitialisation automatique 1er janvier
- Export audit trail numérotation

---

### **B. Gestion de Chantier**

#### US-B1 : Suivre l'avancement en temps réel
**Acteur :** Chef de chantier/Client
**Objectif :** Visualiser progression physique chantier
**Détails :**
- Dashboard chantier : % avancement global (0-100%)
- Barre visuelle par phase (fondations, gros œuvre, finitions...)
- Dernière mise à jour : "il y a 2h"
- Photo avant/après chaque phase
- Historique avancement (courbe temps)
- Client accès en lecture seule

#### US-B2 : Gérer les tâches par phase de chantier
**Acteur :** Chef de chantier
**Objectif :** Organiser travaux par étapes logiques
**Détails :**
- Créer phases : Préparation → Gros œuvre → Finitions → Livraison
- Ajouter tâches à chaque phase (ex: fondations = 5 tâches)
- État tâche : À faire → En cours → Terminé
- Assigner tâche à employé
- Durée estimée vs réelle
- Blocage tâche (dépendance) : ne peut démarrer que si précédente finie

#### US-B3 : Photographier et documenter l'avancement
**Acteur :** Chef de chantier
**Objectif :** Prouver progression physique
**Détails :**
- Capturer photos depuis app mobile
- Localiser photo sur plan du chantier (géolocalisation)
- Ajouter date/heure/description automatique
- IA analyse photo : détecte type travaux, étape projet
- Galerie chronologique + plan interactif
- Export album PDF pour client

#### US-B4 : Gérer les dépenses par chantier
**Acteur :** Chef de chantier/Commercial
**Objectif :** Tracker coûts réels vs prévus
**Détails :**
- Saisir dépense : montant + catégorie (matériaux, sous-traitant, main d'œuvre)
- Lier facture fournisseur automatique
- Voir cumul dépenses par catégorie
- Comparer devis initial vs dépenses réelles
- Alertes : "vous avez dépassé budget matériaux de 15%"

#### US-B5 : Calculer la rentabilité en temps réel
**Acteur :** Chef de projet/Gérant
**Objectif :** Savoir si chantier rentable
**Détails :**
- Montant facturé (devis + avenants)
- Coûts totaux (dépenses + main d'œuvre calculée)
- Marge = facturé - coûts
- % de marge sur devis initial
- Tendance : "marge diminue si vous continuez au rythme actuel"
- Alerte si marge devient négative

#### US-B6 : Alerter si dépassement budget
**Acteur :** Système
**Objectif :** Signaler dérapages budgétaires
**Détails :**
- Alerte rouge si dépenses > 90% budget par catégorie
- Notification push + email gérant
- Suggestion : réduire heures manuelles ou commander moins
- Historique alertes pour analyse

#### US-B7 : Générer un rapport de chantier PDF
**Acteur :** Chef de chantier
**Objectif :** Livrer document complet au client
**Détails :**
- PDF inclut : photos, avancement %, factures, signatures, notes
- Format professionnel : logo, couleurs, branding
- Sections : Résumé → Physique → Financier → Annexes photos
- Exportable + envoyable par email
- Archivable dans chantier

#### US-B8 : Liaison devis → chantier → facture complète
**Acteur :** Système
**Objectif :** Traçabilité commerciale complète
**Détails :**
- Devis signé → crée chantier automatique (option)
- Chantier lié à devis affiche articles identiques
- Dépenses chantier comparées aux articles devis
- Facture générée depuis chantier, montant = devis + avenants
- Graphique flux : devis → avancement → facture

---

### **C. Gestion Clients**

#### US-C1 : Base de données centralisée
**Acteur :** Tous
**Objectif :** Avoir une source unique client
**Détails :**
- Fiche client complète : coordonnées, historique devis/factures
- Searchable par nom, prénom, email, téléphone
- Import CSV depuis CRM existant
- Duplication prevention (doublon détecté)
- Dernière interaction : "dernière devis envoyée il y a 3 mois"

#### US-C2 : Historique complet par client
**Acteur :** Commercial
**Objectif :** Voir toutes interactions client
**Détails :**
- Timeline client : devis envoyés → signés → factures → paiements
- Notes privées : "paye en retard, relancer souvent"
- Montant total devis historique + facturé
- Documents (devis/factures/contrats) listés et téléchargeables
- Alertes : "contrat maintenance expire le 15/02"

#### US-C3 : Tags/Catégories (particulier, pro, syndic, VIP)
**Acteur :** Commercial
**Objectif :** Segmenter base client
**Détails :**
- Tags prédéfinis : Particulier / Professionnel / Syndic / VIP / Rénovation / Neuf
- Tags customisables par entreprise
- Filtrer clients par tag (ex: "tous les syndics")
- Alertes spécifiques par tag (ex: syndic → relance plus fréquente)

#### US-C4 : Score fiabilité paiement
**Acteur :** Commercial/Gérant
**Objectif :** Identifier clients payeurs vs mauvais payeurs
**Détails :**
- Score 0-100 basé sur : délais paiement, retards, impayés
- Visuel : couleur verte (bon) à rouge (mauvais)
- Historique : "3 retards en 6 mois"
- Alerte si client dépasse J+30
- Configuration : conditions paiement par client

#### US-C5 : Import CSV
**Acteur :** Administrateur
**Objectif :** Charger clients existants rapidement
**Détails :**
- Uploader fichier CSV (nom, prénom, email, téléphone, adresse)
- Preview avant import
- Détection doublons automatique
- Mapping champs personnalisable
- Validation erreurs (emails invalides...)

#### US-C6 : Communication (email, SMS)
**Acteur :** Commercial
**Objectif :** Contacter clients depuis app
**Détails :**
- Envoyer email devis/facture depuis fiche client
- SMS relance possible (opt-in client)
- Template préfabriqué avec merge fields
- Log de chaque communication
- Statistiques : email ouvert, SMS reçu

---

### **D. Planning & Équipe**

#### US-D1 : Calendrier multi-vues (jour/semaine/mois)
**Acteur :** Chef de chantier
**Objectif :** Planifier interventions flexiblement
**Détails :**
- Vue mois : grille calendrier, événements carrés
- Vue semaine : timeline 7j avec heures (8h-18h)
- Vue jour : détail heures par employé
- Drag&drop d'événement pour reprogrammer
- Couleurs par chantier ou employé

#### US-D2 : Planifier interventions par chantier
**Acteur :** Chef de chantier
**Objectif :** Assigner tâches/phases à dates
**Détails :**
- Créer événement "Intervention" : chantier + date/heure début/fin
- Assigner 1+ employés à intervention
- Définir type : Chantier (facturable) / Formation (interne) / Absence (congé)
- Chevauchement : alerte si employé double-booké
- Durée prévisionnelle vs réelle (renseignée après)

#### US-D3 : Pointage heures par employé
**Acteur :** Chef de chantier / Employé
**Objectif :** Tracker temps travaillé
**Détails :**
- Démarrer "Chrono" pour chantier X le matin
- Pause/Reprise pendant journée
- Arrêt en fin de journée → enregistre heures
- Gérant voit : heures pointées par employé et chantier
- Export heures pour paie

#### US-D4 : Calcul coût main d'œuvre chargé
**Acteur :** Système
**Objectif :** Connaître vrai coût employé sur chantier
**Détails :**
- Salaire brut base (config employé)
- Charges patronales (42% France)
- Coût chargé = salaire brut * (1 + 0.42)
- Appliqué aux heures pointées
- Comparé au tarif facturation client (voir rentabilité)

#### US-D5 : Gestion absences/congés
**Acteur :** RH/Gérant
**Objectif :** Bloquer calendrier sur jours off
**Détails :**
- Demande congé : employé demande, gérant approuve
- Créer absence : maladie, congé, formation
- Calendrier affiche "Congé J.Dupont" en grisé
- Impossible planifier intervention employé absent
- Décompte RTT/congés automatique

#### US-D6 : Attribution employés aux chantiers
**Acteur :** Chef de chantier
**Objectif :** Assigner effectif à chantier
**Détails :**
- Chantier = équipe : J.Dupont (électricien), M.Martin (plombier)
- Modifier équipe en cours chantier (ajouter/retirer)
- Vue planning : ne montrer que chantier attribué
- Notation : "équipe excellente pour ce chantier"

#### US-D7 : Export heures pour paie
**Acteur :** Paie/RH
**Objectif :** Transmettre heures au logiciel paie
**Détails :**
- Export CSV/Excel : employé, semaine, heures, chantiers
- Format compatible logiciel paie (ADP, Paunch...)
- Certifier export = signature numérique
- Archivé pour audit

#### US-D8 : Vue multi-employés
**Acteur :** Chef de projet
**Objectif :** Voir planning collectif
**Détails :**
- Afficher 5-10 employés en parallèle
- Horizontal : employé | vertical : temps
- Identifier vides capacité (jours sous-chargés)
- Glisser intervention d'un employé à autre

---

### **E. Finances & Trésorerie**

#### US-E1 : Dashboard trésorerie temps réel
**Acteur :** Gérant/Comptable
**Objectif :** Voir santé financière instant T
**Détails :**
- Solde compte bancaire : montant + tendance
- Prévisions fin mois : encaissements (factures impayées) - décaissements
- Alertes : "rupture tréso prévue en 5j si pas paiement"
- Graphique : tréso sur 3 mois (courbe historique)
- KPI : ratio tréso/CA mensuel

#### US-E2 : Prévision fin de mois
**Acteur :** Gérant
**Objectif :** Anticiper besoin financement
**Détails :**
- Calcul automatique : somme factures impayées → quand réglées (délai moyen)
- Moins : charges fixes (paie, loyer, assurance) programmées
- Résultat : déficit ou excédent fin mois
- Scenario : "Si 2 clients ne paient pas on est en rupture"
- Rebalancer risque

#### US-E3 : Alertes seuil critique
**Acteur :** Système
**Objectif :** Prévenir dégâts
**Détails :**
- Configurable : alerte si tréso < X€ (ex: 5000€)
- Notification rouge + email gérant
- Suggestion : appeler clients pour paiements urgents
- Historique alertes pour retrouver causes

#### US-E4 : Charges récurrentes (loyer, assurance, salaires)
**Acteur :** Comptable
**Objectif :** Anticiper dépenses mensuelles
**Détails :**
- Créer charge récurrente : description, montant, fréquence (mensuelle/annuelle), jour prélèvement
- Auto-enregistrement le jour prévu
- Modification possible avant prélevement
- Historique charges versées

#### US-E5 : Rapprochement bancaire
**Acteur :** Comptable
**Objectif :** Réconcilier compte et app
**Détails :**
- Import relevé bancaire (CSV/OFX)
- Matching automatique : facture app ↔ virement relevé
- Correction manuelle pour non-matchés
- Validation : tout rapproché = compte sync
- Export rapport rapprochement

#### US-E6 : Catégorisation dépenses
**Acteur :** Comptable
**Objectif :** Analyser postes budgétaires
**Détails :**
- Catégories standards : Matériaux, Sous-traitance, Paie, Loyer, Assurance, Carburant, Outils
- Customisable
- Saisie dépense = auto-suggestion catégorie
- Rapport : cumul par catégorie sur période

#### US-E7 : Budget vs Réel
**Acteur :** Gérant
**Objectif :** Analyser écarts budgétaires
**Détails :**
- Entrer budget annuel par catégorie
- Comparer mensuel vs budgété
- Alertes : "Vous avez dépensé 120% du budget paie"
- Graphique : budget vs réel par catégorie
- Forecast : tendance fin année

#### US-E8 : Export comptable (CSV, FEC, Excel)
**Acteur :** Expert-comptable
**Objectif :** Importer en logiciel comptable
**Détails :**
- Format FEC (Fichier Échange Comptable) réglementaire France
- Export CSV standard (journal général)
- Export Excel avec mise en forme
- Sélectionner période + journal
- Vérification intégrité avant export

---

### **F. Conformité & Administratif**

#### US-F1 : Suivi assurance décennale + RC Pro
**Acteur :** Gérant/Admin
**Objectif :** Rester couvert légalement
**Détails :**
- Fiche assurance : type (décennale/RC Pro), montant couverture, date expiration
- Scan police d'assurance uploadable
- Alerte : 30j avant expiration
- Historique : changements assureur
- Certificat d'assurance générable PDF

#### US-F2 : Alertes expiration documents
**Acteur :** Système
**Objectif :** Aucun document important n'expire
**Détails :**
- Documents trackés : assurances, certifications, équipements (EPI)
- Dashboard : documents expirant dans 30j (orange), < 7j (rouge)
- Notifications email + app
- Requête facile : "renouveler X"

#### US-F3 : Vérification URSSAF sous-traitants
**Acteur :** Système
**Objectif :** Vérifier prestataires en règle
**Détails :**
- Saisir SIRET prestataire
- App requête API URSSAF → situation régularité
- Résultat : "À jour" / "Cotisations impayées" / "Alerte"
- Alerte : ne pas facturer auto-liquidation si URSSAF pas à jour
- Historique vérifications

#### US-F4 : Déclaration TVA pré-remplie
**Acteur :** Comptable
**Objectif :** Accélérer déclaration TVA
**Détails :**
- Récupérer automatiquement : montants TVA collectée (factures) + TVA déductible (factures reçues)
- Format CA3 (déclaration mensuelle) ou CA12 (annuelle)
- Pré-remplir CA : cases 01 (ventes), 02 (TVA collectée), 06 (TVA déductible)
- Export éditable (PDF remplissable)
- Calcul TVA nette automatique

#### US-F5 : Checklist conformité chantier
**Acteur :** Chef de chantier
**Objectif :** Respecter réglementations chantier
**Détails :**
- Template par type chantier (habitat, commercial, petit travaux)
- Items : murs de clôture, panneaux signalisation, piste d'accès, puit soins, éclairage, etc.
- Cocher items au fur et à mesure
- Photo preuve pour items critiques
- Pénalité : inspection trouvant manquement = photo non-conformité

#### US-F6 : Score conformité entreprise
**Acteur :** Gérant
**Objectif :** Auto-évaluer conformité
**Détails :**
- Calcul : documents en ordre (assurance, certifications, déclarations) / total = %
- Visuel graphique 0-100
- Détail : "Assurance décennale à jour" ✓, "Déclaration TVA retardataire" ✗
- Tendance : améliorant ou dégradant
- Recommandations pour augmenter score

#### US-F7 : Calendrier échéances administratives
**Acteur :** Gérant
**Objectif :** Ne rien oublier (TVA, paie, décennale)
**Détails :**
- Calendrier avec dates fixes : TVA (20 du mois), paie (25 du mois), décennale (anniversary)
- Icalendar exportable vers Outlook/Gmail
- Notifications escalade : 14j avant, 7j, 2j, veille
- Liens directs : cliquer notification → aller à formulaire (ex: déclaration TVA)

#### US-F8 : FAQ réglementaire intégrée
**Acteur :** Utilisateur
**Objectif :** Accès instant règles BTP
**Détails :**
- FAQ searchable : TVA, paie, assurance, conformité chantier, facturation
- Réponses mises à jour 2025 (législation)
- Links vers resources officielles (gouv.fr, SNCF...)
- Exemple concret pour chaque réponse
- Possibilité ajouter FAQ custom par entreprise

---

### **G. Catalogue & Ouvrages**

#### US-G1 : Bibliothèque articles avec prix
**Acteur :** Commercial
**Objectif :** Vite ajouter articles sans saisir prix
**Détails :**
- 230+ articles pré-chargés : matériaux (briques, ciment...), services (main d'œuvre...)
- Champ : description, unité (m2, ml, forfait), prix unitaire HT
- Recherche rapide : "Peinture", "Brique"
- Tagging : catégorie produit (électricité, plomberie...)
- Pris import : certains prix indexés sur référentiels publics (UNTEC...)

#### US-G2 : Ouvrages composites (matériaux + main d'œuvre)
**Acteur :** Commercial
**Objectif :** Créer devis complexes = ouvrage composite
**Détails :**
- Exemple ouvrage : "Carrelage salle bains" = matériaux (carreaux 30€/m2, colle 5€/m2) + main d'œuvre (12€/m2)
- Éditeur composite : ajouter articles, quantité automatique unifiée
- Prix total composite recalcule auto
- Réutilisable dans devis multiples
- Modifiable globalement (changement prix matériaux affecte tout)

#### US-G3 : Coefficient de marge
**Acteur :** Commercial
**Objectif :** Appliquer marge stratégique
**Détails :**
- Entrer "Coeff marge" par article (ex: 1.3 = marge 30%)
- Prix vente = prix revient * coeff
- Modifiable par article ou globalement (% remise client)
- Historique coeff (pour audit prix)
- Alerte : marge < 20% (seuil configurable)

#### US-G4 : Import/Export catalogue
**Acteur :** Administrateur
**Objectif :** Syncer catalogue entre instances/systèmes
**Détails :**
- Export : CSV tous articles + prix + coefficient + images
- Import : uploader CSV → validation → import atomique
- Détection doublons (même GTIN)
- Historique imports (qui, quand, combien articles)

#### US-G5 : Gestion stock
**Acteur :** Gestionnaire stock
**Objectif :** Savoir disponibilités matériaux
**Détails :**
- Ajouter stock par article : quantité, localisation (magasin A, chantier X)
- Décrémenter stock quand facture validée (ou manuel)
- Alertes : article < seuil minimum → Commander
- Historique mouvements stock (entrée/sortie)
- Fiche stock : fournisseur, prix achat, dernier prix, trend consommation

#### US-G6 : Référentiel prix BTP
**Acteur :** Système
**Objectif :** Bencher prix du marché
**Détails :**
- Integration indirecte : reference publique (UNTEC, CSTB) pour certains articles
- Notification : "votre prix peinture +15% vs marché"
- Suggestion : revoir prix pour rester compétitif
- Benchmark groupes : prix moyen artisans VS vôtre

---

### **H. Sous-Traitants & Commandes**

#### US-H1 : Fiches sous-traitants avec conformité
**Acteur :** Commercial/Chef de projet
**Objectif :** Gérer prestataires externes
**Détails :**
- Fiche : raison sociale, SIRET, contact, spécialité (électricité, plomberie...)
- Statut URSSAF : vérification auto
- Documents : assurance RC Pro, décompte TVA
- Pièces jointes : certifications (Qualibat, RGE...)
- Tarifs : montant horaire ou forfait
- Notes : "Fiable, + 5% pour urgence"

#### US-H2 : Bons de commande fournisseurs
**Acteur :** Chef de chantier
**Objectif :** Commander matériaux/prestations
**Détails :**
- Créer BC : fournisseur, articles, quantité, prix
- Numérotation : BC-2025-0001
- Signature électronique éventuelle
- Envoi email fournisseur (PDF)
- Suivi réception (en attente/reçu)

#### US-H3 : Suivi livraisons
**Acteur :** Chef de chantier
**Acteur :** Chef de chantier
**Objectif :** Vérifier matériaux reçus
**Détails :**
- Créer "Livraison" quand reçoit : scan code barre articles reçus
- Comparer avec BC : tout ok ou commentaire écart
- Photo bon de réception si demandé
- Facture fournisseur uploadable
- Historique livraisons par commande

#### US-H4 : Notation qualité
**Acteur :** Chef de projet
**Objectif :** Évaluer prestataires
**Détails :**
- Noter sous-traitant : 0-5 stars
- Critères : respect délais, qualité travaux, sérieux communication
- Commentaire libre
- Score global visible pour nouveaux projets
- Blocage : note < 2 = alerter avant réengagement

#### US-H5 : Historique par fournisseur
**Acteur :** Commercial
**Objectif :** Voir historique commandes/factures
**Détails :**
- Timeline : commandes passées, livraisons reçues, factures payées
- Analyse : fournisseur respecte délai livraison ?
- Montant total dépensé historique
- Résiliation : dates contrats éventuels

---

### **I. Fonctionnalités Transversales**

#### US-I1 : Signature électronique eIDAS
**Acteur :** Tous (devis/factures/contrats)
**Objectif :** Valider documents légalement
**Détails :**
- Devis → "À signer" → client reçoit lien
- Client signe depuis email/app (Docusign ou équivalent)
- Document timestampé + certifié eIDAS
- Proof : log signature (qui, quand, IP)
- Légalement reconnu France/EU

#### US-I2 : IA analyse photos chantier
**Acteur :** Système
**Objectif :** Auto-catégoriser avancement
**Détails :**
- Upload photo chantier → IA détecte : "Fondations en cours"
- Suggestion % avancement automatique
- Alerte si régression (photo montre moins d'avancement que logique)
- Tag auto : échafaudage, signalisation, sécurité OK/NOK

#### US-I3 : Carnet d'entretien
**Acteur :** Chef de chantier / Client
**Objectif :** Logger maintenance future
**Détails :**
- Créer "Engagement entretien" : item à maintenir (climatisation, volets, etc.)
- Fréquence : chaque 6 mois
- Client notifié : "entretien chaudière recommandé"
- App de client : "Contacter artisan"
- Nouvelle facture possible si client achète entretien

#### US-I4 : Mode hors-ligne
**Acteur :** Chef de chantier (surtout sur mobile)
**Objectif :** Continuer travail sans connexion
**Détails :**
- Chantier principal : infos synchronisées automatiquement
- Pointage heures : enregistrement local, sync quand connexion
- Photos : upload queued, envoyer quand internet
- Tout reconcilie quand retour connexion (pas de doublon)

#### US-I5 : Recherche globale (⌘K)
**Acteur :** Tous
**Objectif :** Retrouver n'importe quoi rapidement
**Détails :**
- Raccourci ⌘K ouvre recherche globale
- Chercher : clients, devis, factures, chantiers, employés, articles
- Résultats groupés : "Clients (2), Devis (3), Chantiers (1)"
- Fuzzy search : "carrea" → "carrelage"
- Historique recherches récentes

#### US-I6 : Notifications centralisées
**Acteur :** Tous
**Objectif :** Ne rater aucune alerte
**Détails :**
- Cloche notifications : alertes tréso, devis à relancer, commandes reçues
- Notification push mobile
- Email digest : résumé quotidien alertes
- Paramètres : silence X heures (nuit)
- Marquer lue/archivée

#### US-I7 : Dark mode
**Acteur :** Tous
**Objectif :** Confort de nuit / moins d'énergie
**Détails :**
- Toggle dark/light mode
- Mémorisation préférence par utilisateur
- Auto : suit système d'exploitation (si activé)
- Tous charts/images adaptés (contraste)

#### US-I8 : Responsive mobile
**Acteur :** Chef de chantier (surtout)
**Objectif :** Utiliser app sur terrain
**Détails :**
- Navigation bottom bar mobile (lieu des tabs desktop)
- Pointage heures : grand bouton chrono
- Photos : caméra intégrée app
- Signature : pad tactile
- Chantier : vue simplifiée (essentiels)

---

## 📊 SECTION 2 : Gap Analysis vs État Actuel

Tableau détaillé comparant chaque user story avec l'implémentation actuelle de ChantierPro (chantierpro.vercel.app).

### **État Actuel (Recap)**
L'app actuelle inclut :
- Dashboard avec KPIs, Score Santé, Météo, 9 widgets configurable
- Devis & Factures : pipeline complet, Devis Express wizard, 230+ templates
- Chantiers : page détail, IA task generation, 6 tabs (Finances, Situations, Rapports, Photos, Notes, Messages)
- Planning : calendrier mois/semaine/jour, 5 types événements
- Clients : fiches, recherche, ajout rapide
- Catalogue : onglets catégories, Référentiel BTP, gestion stock
- Ouvrages : composants, prix revient, coefficient vente, marge
- Sous-Traitants : conformité (RC Pro, URSSAF), notation qualité
- Commandes : KPIs, filtres, form création
- Trésorerie : graphique, charges pré-remplies, 3 onglets
- IA Devis : analyse photos
- Entretien : carnets, garanties
- Signatures : eIDAS, documents à signer
- Export Compta : CSV/FEC/Excel, sélecteur période, filtre journal
- Équipe : concept chronomètre (empty state)
- Administratif : TVA, audit conformité, FAQ, échéances
- Paramètres : 10+ onglets, 7% profil complété, logo/couleur

### **Tableau Gap Analysis**

| # | Catégorie | User Story | Status | Détails |
|---|-----------|-----------|--------|---------|
| A1 | Gestion Commerciale | Créer devis en <5min | ✅ Implémenté | Devis Express wizard, 230+ templates disponibles |
| A2 | Gestion Commerciale | Envoyer devis par email + suivi | ⚠️ Partiellement | Envoi email OK, suivi lecture manquant |
| A3 | Gestion Commerciale | Transform devis signé en facture 1 clic | ✅ Implémenté | Bouton présent, pipeline complet |
| A4 | Gestion Commerciale | Dupliquer devis pour variante | ❌ Non implémenté | Nécessite action CLI/API |
| A5 | Gestion Commerciale | Gérer acomptes & situations | ⚠️ Partiellement | Situations onglet chantier, acomptes manquent |
| A6 | Gestion Commerciale | Relancer devis non signés auto | ❌ Non implémenté | Nécessite automation serveur |
| A7 | Gestion Commerciale | Facturer avenants | ❌ Non implémenté | Structure présente, UI manquante |
| A8 | Gestion Commerciale | TVA selon type travaux | ⚠️ Partiellement | TVA saisie manuelle, pas suggestion auto |
| A9 | Gestion Commerciale | Auto-liquidation sous-traitance | ⚠️ Partiellement | TVA = 0% possible, vérif URSSAF séparée |
| A10 | Gestion Commerciale | Numérotation légale séquentielle | ✅ Implémenté | Devis & factures numérotées DEV-/FAC- séquentiels |
| B1 | Gestion Chantier | Suivre avancement temps réel | ⚠️ Partiellement | Photos OK, % avancement manuel |
| B2 | Gestion Chantier | Gérer tâches par phase | ⚠️ Partiellement | IA génère tâches, pas de phases explicites |
| B3 | Gestion Chantier | Photos & documentation | ✅ Implémenté | Tab Photos, IA analyse, timestamps |
| B4 | Gestion Chantier | Dépenses par chantier | ✅ Implémenté | Tab Finances, saisie dépenses |
| B5 | Gestion Chantier | Rentabilité temps réel | ⚠️ Partiellement | Calcul possible, UI limitée |
| B6 | Gestion Chantier | Alertes dépassement budget | ⚠️ Partiellement | Possible en param, pas notif auto |
| B7 | Gestion Chantier | Rapport chantier PDF | ✅ Implémenté | Tab Rapports, export PDF |
| B8 | Gestion Chantier | Liaison devis→chantier→facture | ⚠️ Partiellement | Lien possible, workflow pas fluide |
| C1 | Gestion Clients | Base centralisée | ✅ Implémenté | Page Clients, CRUD complet |
| C2 | Gestion Clients | Historique client | ⚠️ Partiellement | Fiches basiques, timeline manquante |
| C3 | Gestion Clients | Tags/catégories | ❌ Non implémenté | Nécessite table tags + UI |
| C4 | Gestion Clients | Score fiabilité paiement | ❌ Non implémenté | Calcul nécessiterait historique paiements |
| C5 | Gestion Clients | Import CSV | ⚠️ Partiellement | Upload structure, logic manquante |
| C6 | Gestion Clients | Communication email/SMS | ❌ Non implémenté | Send email fait, SMS = tiers services manquant |
| D1 | Planning & Équipe | Calendrier multi-vues | ✅ Implémenté | Mois/semaine/jour, drag&drop |
| D2 | Planning & Équipe | Planifier interventions | ✅ Implémenté | Événements avec chantier/employés |
| D3 | Planning & Équipe | Pointage heures | ⚠️ Partiellement | Concept chronomètre existe, manque persistance |
| D4 | Planning & Équipe | Coût main d'œuvre chargé | ❌ Non implémenté | Formule exists, UI pour calcul manquante |
| D5 | Planning & Équipe | Gestion absences/congés | ❌ Non implémenté | Nécessite statut absence + PTO config |
| D6 | Planning & Équipe | Attribution équipe chantier | ⚠️ Partiellement | Possible via événements, pas liaison chantier |
| D7 | Planning & Équipe | Export heures paie | ⚠️ Partiellement | Possible exporter, format paie pas standard |
| D8 | Planning & Équipe | Vue multi-employés | ⚠️ Partiellement | Planning existe, vue collectif limitée |
| E1 | Finances & Trésorerie | Dashboard tréso temps réel | ⚠️ Partiellement | KPI existe, prévision fin mois manquante |
| E2 | Finances & Trésorerie | Prévision fin de mois | ❌ Non implémenté | Calcul possible, UI manquante |
| E3 | Finances & Trésorerie | Alertes seuil critique | ❌ Non implémenté | Nécessite rule engine |
| E4 | Finances & Trésorerie | Charges récurrentes | ✅ Implémenté | Charges pré-remplies, édition possible |
| E5 | Finances & Trésorerie | Rapprochement bancaire | ❌ Non implémenté | Import OFX possible, matching manquant |
| E6 | Finances & Trésorerie | Catégorisation dépenses | ⚠️ Partiellement | Catégories existent, pas de report analyse |
| E7 | Finances & Trésorerie | Budget vs Réel | ⚠️ Partiellement | Données existent, comparison UI basique |
| E8 | Finances & Trésorerie | Export compta (FEC) | ✅ Implémenté | CSV/FEC/Excel dispo, sélecteur période |
| F1 | Conformité & Admin | Suivi assurance décennale | ✅ Implémenté | Docs uploadables, alertes expiration |
| F2 | Conformité & Admin | Alertes expiration docs | ✅ Implémenté | Notifications 30j avant |
| F3 | Conformité & Admin | Vérif URSSAF sous-traitants | ✅ Implémenté | API check dispo |
| F4 | Conformité & Admin | Déclaration TVA pré-remplie | ⚠️ Partiellement | CA3 template, pas data auto-fill |
| F5 | Conformité & Admin | Checklist conformité chantier | ⚠️ Partiellement | Concept exists, templates limités |
| F6 | Conformité & Admin | Score conformité entreprise | ⚠️ Partiellement | Audit dispo, score pas calculé |
| F7 | Conformité & Admin | Calendrier échéances | ✅ Implémenté | Dates fixes, ical export |
| F8 | Conformité & Admin | FAQ réglementaire | ✅ Implémenté | Content statique, searchable |
| G1 | Catalogue | Bibliothèque articles | ✅ Implémenté | 230+ articles, search, prix |
| G2 | Catalogue | Ouvrages composites | ✅ Implémenté | Composants + main d'œuvre |
| G3 | Catalogue | Coefficient marge | ✅ Implémenté | Configurable par article |
| G4 | Catalogue | Import/Export catalogue | ⚠️ Partiellement | Export CSV OK, import validation manquante |
| G5 | Catalogue | Gestion stock | ⚠️ Partiellement | Quantités trackées, alertes basiques |
| G6 | Catalogue | Référentiel prix BTP | ⚠️ Partiellement | Import data, pas benchmark/alertes |
| H1 | Sous-Traitants | Fiches avec conformité | ✅ Implémenté | Fiche complète, RC Pro + URSSAF |
| H2 | Sous-Traitants | Bons de commande | ✅ Implémenté | Création + envoi email |
| H3 | Sous-Traitants | Suivi livraisons | ⚠️ Partiellement | Possible noter, UI limitée |
| H4 | Sous-Traitants | Notation qualité | ✅ Implémenté | Stars + commentaires |
| H5 | Sous-Traitants | Historique fournisseur | ⚠️ Partiellement | Possible via recherche, pas timeline |
| I1 | Transversal | Signature eIDAS | ✅ Implémenté | Documents à signer, flow complet |
| I2 | Transversal | IA analyse photos | ⚠️ Partiellement | IA fait scan, output limité |
| I3 | Transversal | Carnet d'entretien | ✅ Implémenté | Carnets + garanties |
| I4 | Transversal | Mode hors-ligne | ❌ Non implémenté | Sync basé cloud, pas offline-first |
| I5 | Transversal | Recherche globale ⌘K | ⚠️ Partiellement | Commande exists, scope limité |
| I6 | Transversal | Notifications centralisées | ⚠️ Partiellement | Toast basiques, pas digest email |
| I7 | Transversal | Dark mode | ✅ Implémenté | Toggle + auto détection |
| I8 | Transversal | Responsive mobile | ⚠️ Partiellement | Desktop-first, mobile improvements nécessaires |

---

## 🎯 SECTION 3 : Matrice de Priorité pour Commercialisation

Classement de tous les gaps par criticité pour lancer l'app en production.

### **P0 : Bloquant Commercialisation**
*Doit être corrigé avant lancement public*

#### Gestion Commerciale (A)
- **A2-Suivi lecture devis** : Augmente taux signature +15-20%, valeur commerciale clé
- **A4-Dupliquer devis** : Feature attendue par 90% utilisateurs
- **A6-Relance auto devis** : Peut doubler signature non-signés
- **A7-Avenants/suppléments** : Cas réel très fréquent (30% devis)

#### Gestion Chantier (B)
- **B2-Phases chantier** : Nécessaire pour B1 (avancement % = somme phases)
- **B5-Rentabilité** : KPI fondamental pour gérant

#### Gestion Clients (C)
- **C3-Tags clients** : Segmentation pour relances auto

#### Planning & Équipe (D)
- **D3-Pointage heures persistant** : Critère majeur différenciation

#### Finances (E)
- **E2-Prévision tréso** : Valeur majeure pour petit artisan (cash = roi)
- **E3-Alertes tréso** : Paire avec E2

#### Conformité (F)
- **F4-TVA auto-fill CA3** : Obligation légale, gain temps comptable
- **F6-Score conformité** : Auto-audit réglementaire (pain point France)

#### Transversal (I)
- **I4-Mode hors-ligne** : Chef chantier = terrain (pas toujours wifi)
- **I5-Recherche ⌘K étendu** : "Feature popcorn" utilisateurs

**Total P0 : ~11 items**

---

### **P1 : Important - Priorité Mois 1 Post-Launch**
*Lancer avec MVP, corriger dans 30j*

#### Gestion Commerciale (A)
- **A5-Acomptes situations** : Cas légitime, moins urgent que avenants
- **A8-TVA auto-suggestion** : Comfort feature, correction manuelle acceptable
- **A9-Auto-liquidation** : Niche (sous-traitants), peut être spécifié post-launch

#### Gestion Chantier (B)
- **B6-Alertes budget** : Important, mais data-driven (attendre quelques chantiers)
- **B8-Workflow devis→chantier→facture** : Liaison existe, needs UX pass

#### Gestion Clients (C)
- **C2-Timeline historique** : Utile, pas bloquant
- **C4-Score paiement** : Intéressant, calcul peut être simplifié
- **C5-Import CSV** : Formation utilisateurs acceptable
- **C6-SMS/Communication** : Email suffit pour démarrage

#### Planning & Équipe (D)
- **D4-Coût main d'œuvre chargé** : Calcul, nécessite paramétrage paie
- **D5-Absence/congés** : Peu urgent mois 1, meilleur début Q2
- **D6-Attribution équipe chantier** : Lien faible, plus tard ok
- **D7-Export paie format** : Peut se faire manuellement début
- **D8-Vue multi-employés** : Nice to have, UI polish

#### Finances (E)
- **E1-Dashboard tréso enrichi** : Existe, besoin polish/perfs
- **E5-Rapprochement bancaire** : Cas niche, attendre cas réels
- **E6-Analyse dépenses** : Reporting, moins temps-critique

#### Conformité (F)
- **F1-F2-F3** : Mostly OK, petites améliorations
- **F5-Checklist conformité** : Templates limités, valide itérer
- **F7-Calendrier échéances** : Existe, need intégration plus serrée

#### Sous-Traitants (H)
- **H3-H5-Suivi livraisons** : Niche début, iterez après

#### Transversal (I)
- **I2-IA photos** : Marque, mais output limité pour P0
- **I6-Notif digest email** : Toast suffisent début
- **I8-Mobile UX** : Important mais pas bloquant (tableau desktop ok)

**Total P1 : ~18 items**

---

### **P2 : Nice to Have - Priorité Q2**
*Amélioration produit, itération basée feedback utilisateurs*

#### Gestion Commerciale (A)
- Variants sous-produits (détail pricing)

#### Gestion Chantier (B)
- IA task generation avancée (dépendances auto)

#### Gestion Clients (C)
- Communication email/SMS avancée (marketing automation)
- Intégration CRM externe

#### Planning & Équipe (D)
- Planning visuel avancé (gantt, ressources heatmap)
- Calcul RTT automatique

#### Finances (E)
- Budget dynamique (forecasting ML)
- Integration bancaire directe (Open Banking)

#### Catalogue (G)
- Benchmark marché (prix référentiel alertes)
- Gestion stock avancée (précommande, alerte fournisseur)

#### Sous-Traitants (H)
- Portal fournisseur (suivre commandes côté prestataire)

#### Transversal (I)
- PWA offline avancée (cache tous données)
- Analytics custom (heatmaps, rage clicks)

**Total P2 : ~12 items**

---

### **P3 : Long Term - Roadmap Future**
*Vision produit, pas sur 2025*

- **Intégration comptable** : Sync auto Sage/Ciel/Paunch
- **BI/Analytics avancées** : Dashboard gérant prédictif
- **API ouverte** : Intégrations tierces
- **Marketplace** : Extensions/plugins tiers
- **Intelligence artificielle avancée** : Pricing auto, prévision devis
- **Mobile app native** : iOS/Android apps de qualité appstore
- **Multi-entité** : Holding de plusieurs entreprises
- **International** : Versioning autre pays EU

**Total P3 : ~8 items**

---

## 📈 Récapitulatif Priorisation

```
┌─────────────────────────────────────────────────────────┐
│ IMPACT vs EFFORT (Eisenhower Matrix)                    │
├─────────────────────────────────────────────────────────┤
│ P0 (Must Have) .................... ~11 features        │
│ P1 (Should Have) .................. ~18 features        │
│ P2 (Nice to Have) ................. ~12 features        │
│ P3 (Later) ........................ ~8 features         │
├─────────────────────────────────────────────────────────┤
│ Total Features (cumul devis) = 80+                      │
│ Actuellement implémentés = ~45                          │
│ Gaps à couvrir = ~35                                    │
│ % MVP (P0 only) = 11/35 = 31% of gaps                  │
└─────────────────────────────────────────────────────────┘
```

---

## 🔧 Guide d'Utilisation de Ce Document

1. **Pour équipe dev** : Utiliser Section 1 comme brief complet des user stories
2. **Pour product manager** : Section 2 (Gap Analysis) identifie blockers
3. **Pour roadmap** : Section 3 priorise sprints (P0 = sprint prochain, P1 = mois 1)
4. **Pour stakeholders** : P0 = what's needed to launch, P1 = first update post-launch
5. **Pour QA** : Chaque US = critères acceptance (Given/When/Then)

---

## 📞 Notes Finales

- **Document évolutif** : Mettre à jour après chaque session dev (cocher ✅)
- **Priorisation peut changer** : User feedback → reclasser P0 ↔ P1
- **Non exhaustif** : Liste couvre core domaine, considérer features transversales
- **Basepoint** : État app snapshot 06/02/2025

---

---

# 🎨 CLAUDE CODE PROMPT (Wrappé - À Utiliser)

```
# ChantierPro - Prompt 1 : Histoires Utilisateur & Analyse des Gaps

## 🎯 Objectif
Être un expert produit BTP pour l'équipe ChantierPro. Vous maîtrisez :
- Métier construction française (devis, factures, TVA, conformité)
- Product management (user stories, roadmap, prioritization)
- UX/CX pour artisans (simplicité, vitesse, mobile-first)
- Stack: React 18 + Vite 5 + Supabase + Zustand + Tailwind

## 📋 Contexte
ChantierPro = app web gestion BTP (React 18, Vite 5, Supabase, Zustand, Tailwind CSS)
- Actuel : MVP avec 45/80 features
- Client : artisans/PME bâtiment France
- Launch : avant Q2 2025

## 🔑 Votre Rôle
1. **Valider** user stories contre métier BTP réalité
2. **Identifier** gaps critiques avant launch
3. **Prioriser** features par impact/effort
4. **Proposer** solutions minimalistes (MVP = 70% value, 30% effort)
5. **Challenger** assumptions si contraires à règles France

## 📊 Données de Référence

### Catégories User Stories (80 total)
A. Gestion Commerciale (Devis/Factures) - 10 stories
B. Gestion Chantier - 8 stories
C. Gestion Clients - 6 stories
D. Planning & Équipe - 8 stories
E. Finances & Trésorerie - 8 stories
F. Conformité & Administratif - 8 stories
G. Catalogue & Ouvrages - 6 stories
H. Sous-Traitants & Commandes - 6 stories
I. Fonctionnalités Transversales - 8 stories

### État Actuel (Snapshot 06/02/2025)
**Implémenté (✅)** : 45 features partiellement/complètement
- Dashboard KPIs + Score Santé + widgets configurable
- Devis/Factures pipeline, Devis Express, 230+ templates
- Chantiers + IA task generation + 6 tabs
- Planning multi-vues + calendar
- Clients CRUD
- Catalogue 230+ articles + stock
- Ouvrages composites + marge
- Sous-traitants + notation + conformité check
- Trésorerie chart + charges + export FEC
- eIDAS signatures
- Carnets entretien
- Paramètres 10+ tabs (7% profil)

**Partiellement (⚠️)** : 20 features 50-90% complètes
**Manquant (❌)** : 15 features critiques 0% = P0 priorities

## 🎬 Instructions Spécifiques

Quand on vous pose une question :

1. **Si clarification user story** :
   - Reformuler story en terms métier (devis, chantier, tréso)
   - Lister acteur(s), objectif, détails acceptance
   - Donner exemple concret cas usage France

2. **Si analyse gap** :
   - Comparer story VS code/déploiement
   - Identifier blockers à launch
   - Proposer MVP minimal (feature must-have vs nice-to-have)

3. **Si priorisation** :
   - Évaluer par : impact utilisateur × difficulté implémentation
   - P0 = bloquant launch (core value / high risk)
   - P1 = mois 1 post-launch (polish / user feedback)
   - P2 = Q2 (optimisation / nice to have)

4. **Si design/UX** :
   - Proposer wireframe mental en texte (pas Figma)
   - Pensez mobile-first (chef chantier = terrain)
   - Accessibility : 18-65 ans, pas tous tech-savvy

5. **Si réglementaire** :
   - Vérifier vs loi France (TVA, paie, signature)
   - Donner source (code.gouv.fr, urssaf, etc.)
   - Proposer implementation simple & compliant

6. **Si architecture/tech** :
   - React 18 patterns (hooks, suspense, concurrent)
   - Supabase queries optimized
   - Zustand state structure
   - Tailwind responsive design

## ⚠️ Rappels Clés
- Métier BTP = "temps = argent". Priorité = rapidité saisie (<5min devis)
- Utilisateur = artisan occupé, pas informaticien. UX doit être évidente
- France = réglementations strictes. TVA, signatures, conformité non-négo
- Mobile = critère must-have (50% usage terrain)
- Données = sauver régulièrement. Offline mode ≠ perte data

## 💬 Exemple Conversations Attendues

**Q:** "Comment implémenter relance auto devis non signés ?"
**A:** "Workflow : Admin config → trigger email jour X → log tentative → max 5 relances. DB: colonne last_reminder_date, reminder_count. Cron job Supabase. Email template personnalisable."

**Q:** "User story C4 (Score paiement) est-ce P0 ?"
**A:** "Non, P1. MVP = suivi délai paiement simple (J+30 = alerte). Score complexe = attendre data réelles 30j après launch."

**Q:** "Mobile mode hors-ligne possible ?"
**A:** "Complexe. MVP = sync aggressive (queue requests), fallback web simple. Offline-first = Q2 (PWA cache strategy)."

## 🎯 Succès = Équipe peut
- Planifier Prompt 2 (architecture database)
- Préparer Prompt 3 (composants React)
- Décider Prompt 4 (API endpoints)
- Construire Prompt 5 (checklist deployment)

Sans revenir Prompt 1 pour clarifications.
```

---

**Fin du document. Format : Markdown formaté, sections numérotées, liens logiques clairs.**
