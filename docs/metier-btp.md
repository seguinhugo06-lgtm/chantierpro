# Référence métier et juridique — artisans du BTP

Ce que Mallettico doit savoir pour produire des devis et factures **justes**. Sert à l'agent `juriste-btp` et à toute tâche qui touche aux documents, à la TVA ou aux paiements.

Règles de lecture :
- Chaque point porte sa source. **(à vérifier)** = sources divergentes ou non vérifiées au texte : relire Légifrance / BOFiP avant de coder une règle bloquante.
- Mise à jour : 8 oct. 2026. Le droit bouge (loi de finances chaque année, réforme de la facture électronique) : dater toute vérification.
- Le texte exact d'une mention réglementaire vit dans le code (`src/lib/mentionTvaReduite.js`…) avec sa source, jamais seulement ici.

## 1. Vocabulaire

| Terme | Sens |
|---|---|
| Devis | Offre chiffrée ; signé « bon pour accord », il vaut contrat. |
| Acompte | Paiement partiel à la commande ; donne lieu à une **facture d'acompte** (TVA exigible à l'encaissement pour les prestations de services). |
| Situation de travaux | Facturation intermédiaire selon l'avancement (% du marché). |
| Avoir | Facture négative qui annule ou corrige une facture émise — on ne modifie ni ne supprime une facture émise. |
| Retenue de garantie | Jusqu'à 5 % retenus par le client pendant 1 an après la réception (loi n° 71-584 du 16 juil. 1971), libérable par caution. |
| Autoliquidation | Sous-traitance BTP : le sous-traitant facture **HT** avec la mention « Autoliquidation », le donneur d'ordre déclare la TVA (CGI art. 283-2 nonies). |
| Réception des travaux | Acte (PV, avec ou sans réserves) qui fait courir les garanties. |

## 2. Devis

- **Dépannage, réparation, entretien (bâtiment et équipement de la maison)** : devis détaillé avant intervention, avec date, nom et adresse de l'entreprise, nom du client, lieu d'exécution, nature exacte des travaux, décompte détaillé (quantités, prix unitaires), **frais de déplacement** le cas échéant (arrêté du 24 janv. 2017, art. 4). **Aucun seuil** : le devis est obligatoire avant toute prestation de dépannage, réparation ou entretien chez un particulier — le seuil de 150 € venait de l'arrêté de 1990, remplacé (tranché le 8 oct. 2026). Le devis dit s'il est **gratuit ou payant** (art. 2) et que le client peut **conserver les pièces remplacées** (art. 4 III). Taux horaires TTC, décompte du temps, frais de déplacement et forfaits s'affichent dans les locaux et sur tout espace en ligne (art. 3) ; la facture se remet dès la fin de l'intervention, avant le paiement (art. 5).
- **Assurance décennale** (travaux de construction) : l'obligation est de **joindre l'attestation d'assurance** (modèle de l'arrêté du 5 janv. 2016) aux devis et aux factures (C. assur. L243-2). Pour un client particulier, l'assureur, ses coordonnées et la couverture géographique font partie de l'information due avant contrat (C. conso. R111-2, 9°) : la ligne imprimée par Mallettico y répond, mais **l'attestation n'est pas encore jointe** (tâche `devis-mentions`). Le C. artisanat L132-1 (ex-art. 22-2 de la loi 96-603) **ne s'applique pas** à la décennale : il exclut les assurances des art. L241-1 et L241-2 du C. assur. (relecture juridique du 10 oct. 2026). Travailler sans décennale : 6 mois d'emprisonnement et 75 000 € d'amende (L243-3). Le dépannage, l'entretien et les petites réparations n'y sont pas soumis : l'artisan peut le déclarer dans Paramètres › Assurances, sous sa responsabilité, et l'envoi n'exige plus la décennale (D-24) ; rien n'est alors imprimé (aucune mention n'est due par qui n'est pas assujetti, et « non soumis » serait une affirmation trompeuse si elle était fausse, L121-2). Limites mouvantes **(à vérifier au texte)** : la réfection d'une toiture jugée ouvrage neuf (Cass. 3e civ., 30 mai 2024, n° 22-20.711) ; un équipement posé sur l'existant hors décennale (Cass. 3e civ., 21 mars 2024, n° 22-18.694).
- **Entrepreneur individuel** : son « nom ou nom d'usage » est « précédé ou suivi immédiatement » de « EI » ou « entrepreneur individuel » sur tous ses documents et correspondances (C. com. **R526-27**, pour L526-22, loi n° 2022-172). C'est le nom de la personne, pas le nom commercial : réglage « Votre prénom et nom » dans Paramètres, imprimé « Hugo Séguin EI ». EIRL : même exigence avec « EIRL » (ancien L526-6).
- **Coordonnées et immatriculation (client particulier)** : téléphone et e-mail de l'artisan font partie de l'information due avant contrat (C. conso. L111-1 4°, R111-1 1°) ; statut, forme juridique et n° d'immatriculation aussi (R111-2) ; hors établissement, le contrat les reprend, à peine de nullité (L221-9, L242-1). Entre professionnels : pas d'obligation. « RCS + ville du greffe » ne concerne que les inscrits au RCS (C. com. R123-237) : un artisan inscrit au seul RNE n'en a pas. Hors établissement, un professionnel d'au plus 5 salariés qui commande hors de son activité principale a les mêmes droits (L221-3). Dans l'app, la liste des informations exigées avant envoi vit dans `src/lib/profilLegal.js` : téléphone et e-mail y bloquent l'envoi pour tout client (D-23). La liste des factures de l'onglet « Facture 2026 » (`src/lib/mentionsFacture.js`) y ajoute capital et RCS pour une société, n° de TVA intracommunautaire hors franchise ; l'IBAN y est « utile », pas obligatoire. Vérifié au texte le 10 oct. 2026.
- **Contrat hors établissement** (signé chez le client, même s'il a appelé) avec un particulier : **aucun paiement ni contrepartie avant 7 jours** (C. conso. L221-10 ; délit : 2 ans et 150 000 €, L242-7) ; rétractation de **14 jours** avec formulaire (L221-18) ; pas de début des travaux dans ce délai sans demande écrite (L221-25) ; exception : réparation urgente demandée par le client (L221-28, 8°). Sans information sur la rétractation, le délai s'allonge de 12 mois (L221-20). Signé **en ligne** (lien de signature) = contrat à distance : 14 jours de rétractation, mais pas l'interdiction des 7 jours.
- **Déchets de chantier** : tout devis de construction, rénovation ou démolition indique les modalités d'enlèvement et de gestion des déchets, leur coût, les installations de collecte et une estimation de la quantité (C. env. L541-21-2-3, décret n° 2020-1817 ; amende jusqu'à 3 000 € pour une personne physique). **Absent des deux générateurs** (tâche `devis-mentions`).
- **Médiateur de la consommation** : l'artisan qui travaille pour des particuliers doit adhérer à un médiateur et en donner les coordonnées (C. conso. L612-1). Amende jusqu'à 3 000 € pour une entreprise individuelle (L641-1). C'est l'obligation de l'artisan (champ « médiateur » dans ses paramètres), pas de Mallettico (service B2B). Imprimé par les deux générateurs, **pour un client particulier seulement** : la médiation de la consommation ne couvre pas les litiges entre professionnels (L611-3, 1°). **Absent de la page de signature en ligne** : `get_devis_for_signature` ne renvoie pas les réglages de l'entreprise (tâche `documents-un-seul`).

## 3. Factures

Mentions de base (CGI ann. II art. 242 nonies A ; C. com. L441-9) : numéro unique d'une **séquence continue**, date d'émission, identités et adresses des parties, SIREN/SIRET, pour une société sa **forme juridique et le montant de son capital social** (service-public F31808), n° de TVA intracommunautaire (si assujetti ; celui du client s'il est assujetti), désignation, quantités, prix unitaires HT, taux et montant de TVA par taux, totaux HT / TVA / TTC, date d'exécution, date d'échéance, **pénalités de retard**, **indemnité forfaitaire de recouvrement de 40 €** (C. com. D441-5, entre professionnels), conditions d'escompte.

- Micro-entrepreneur en franchise : « TVA non applicable, art. 293 B du CGI » ; aucune TVA facturée, total = HT (« Net à payer » ; « Total » sur un devis ; « Total de l’avoir » sur un avoir) — `src/lib/franchiseTva.js`, relecture du 10 oct. 2026 (CGI art. 293 E ; ann. II art. 242 nonies A, I : taux et montant de TVA seulement si elle est due).
- **TVA portée par erreur par une micro-entreprise** : due du seul fait de la facture (CGI art. 283, 3 ; 293 E) ; régularisation par une facture rectificative ou un avoir qui l'annule (BOI-TVA-DED-40-10-10, 8 janv. 2025). Une facture, un avoir ou un devis signé déjà émis avec TVA se réimprime donc **tel qu'il a été émis** (`franchiseAppliquee`) ; l'app affiche « faites un avoir puis une nouvelle facture ». Un devis signé avec TVA : ses factures sont établies sans TVA (le client paie moins, permis sans son accord) ; garder le total signé exige un nouveau devis signé (C. civ. art. 1193).
- Nouvelles mentions de la réforme : SIREN du client, adresse de livraison si différente, **catégorie de l'opération** (biens / services / mixte), **option pour le paiement de la TVA d'après les débits**. Obligatoires pour les micro-entreprises et PME sur les factures émises **à compter du 1er sept. 2027** (CGI ann. II art. 242 nonies A et sa note d'application ; 1er sept. 2026 pour les grandes entreprises) — tranché le 8 oct. 2026 ; les ajouter dès maintenant est sans risque (tâche `mentions-2027`).
- Conservation : 10 ans (C. com. L123-22) — d'où l'invitation à exporter avant toute suppression de compte.
- **Remises** : prix unitaire HT « déterminé hors rabais, remises ou ristournes », la remise faisant l'objet d'une mention particulière, une remise globale aussi (BOFiP BOI-TVA-DECLA-30-20-20-10 § 220, 240, 480) ; « toute réduction de prix acquise » figure sur la facture (C. com. L441-9 I). D'où les lignes « Remise X % » de `src/lib/facturation.js` — jamais un prix net par ligne.
- **Avoir** : le document qui modifie la facture initiale et y fait référence de façon spécifique et non équivoque (CGI art. 289 I, 5e al., repris dans le CIBS au 1er sept. 2026) ; texte retenu : « Cet avoir rectifie la facture … ; il en réduit d'autant le montant dû ». Ne pas écrire « annule et remplace » (facture de remplacement) ni citer L441-3 : depuis l'ordonnance n° 2019-359, L441-3 et L441-6 traitent des conventions écrites ; la facturation relève de L441-9, les pénalités de L441-10 (relecture du 10 oct. 2026). « Solde de tout compte » est un terme du droit du travail (C. trav. L1234-20) : jamais sur une facture.
- **TVA recodifiée** dans le CIBS au 1er sept. 2026 ; les renvois au CGI (dont « art. 293 B du CGI ») restent admis sur les factures jusqu'au 31 déc. 2027 (BOI-RES-TVA-000253-20260218 § 3.1).

## 4. TVA dans le bâtiment

- **Franchise en base** : 37 500 € de prestations de services l'année précédente (seuil majoré 41 250 € en cours d'année) ; le seuil unique de 25 000 € a été abandonné (loi du 3 nov. 2025) ; pas de seuil spécial pour le bâtiment ; travaux avec fourniture du matériel = activité mixte, 85 000 € dont 37 500 € de services au plus (BOFiP BOI-TVA-DECLA-40-10-10, 1er juil. 2026, § 170).
- **« Système de caisse »** (CGI art. 286 I 3° bis ; BOFiP BOI-TVA-DECLA-30-10-30 du 25 mars 2026) : un logiciel de facturation qui enregistre des paiements reçus en est un ; l'artisan assujetti qui vend à des particuliers doit disposer d'un certificat ou d'une attestation individuelle de l'éditeur. Franchise en base et activité 100 % B2B exclues. Ne jamais délivrer d'attestation sans audit réel ; décision à prendre avec un expert-comptable (fiche du rendez-vous comptable).

| Taux | Quand | Source |
|---|---|---|
| 20 % | Construction neuve, agrandissement > 10 % de surface, travaux qui produisent un immeuble neuf, locaux non habitation | CGI art. 278 |
| 10 % | Amélioration, transformation, aménagement, entretien de **locaux d'habitation achevés depuis plus de 2 ans** | CGI art. 279-0 bis |
| 5,5 % | Travaux de **rénovation énergétique** sur ces mêmes locaux | CGI art. 278-0 bis A |

- Depuis la loi n° 2025-127 (art. 41), l'attestation Cerfa 1300-SD / 1301-SD est **supprimée** : le client **certifie sur le devis ou la facture** que les conditions sont remplies (modèles officiels : BOFiP, BOI-LETTRE-000280). Implémenté dans `src/lib/mentionTvaReduite.js`, dans les DEUX générateurs de PDF.
- Travaux d'entretien/réparation de moins de 1 000 € TTC : la mention n'est pas exigée (BOFiP) — Mallettico l'ajoute quand même, sans risque.
- Sans certification ou si elle est fausse : le taux normal (20 %) s'applique ; le client reste solidaire.
- Autoliquidation en sous-traitance : pas de TVA facturée, mention obligatoire (voir §1).

- **Exigibilité** : les travaux immobiliers sont des prestations de services (CGI art. 256 IV) ; leur TVA est due à l'**encaissement**, sauf option pour les débits (CGI art. 269, 2-c ; BOI-TVA-BASE-20-20). Finances affiche la TVA facturée (débits) avec cet avertissement (relecture du 10 oct. 2026, tâche `tva-encaissements`).
- **Régime simplifié (CA12) supprimé au 1er janv. 2027**, remplacé par la CA3 trimestrielle (loi de finances 2025, art. 38). CA3 millésime 2026 (cerfa 3310-CA3-SD n° 10963*31) : lignes 08 = 20 %, 09 = 5,5 %, 9B = 10 %, chacune en base HT ET taxe due ; ligne « 01 » devenue « A1 » ; 19 = immobilisations, 20 = autres biens et services ; crédit en ligne 25.
- **FEC** (LPF art. A.47 A-1) : toutes les écritures de tous les journaux de l'exercice, reprise des soldes en tête, nom à la date de clôture de l'exercice, `ValidDate` = date de validation, virgule décimale sans séparateur de milliers, dates AAAAMMJJ. L'export de l'app (une période, parfois un journal) n'est donc pas le FEC de l'exercice : il le dit.

## 5. Paiement

- **Acompte** : **aucun plafond légal** pour des travaux ; L214-1 à L214-3 du Code de la consommation (arrhes / acomptes) ne visent pas les commandes spéciales sur devis (L214-3). Le devis signé fait foi (C. civ. art. 1103) : facturer plus que l'acompte prévu demande l'accord du client. Chez un particulier, contrat hors établissement : aucun paiement avant 7 jours (L221-10, voir §2). Relecture du 10 oct. 2026 : l'app affichait à tort « limité à 30 % par la loi (art. L. 214-1) ».
- **Taux des pénalités de retard** (BCE + 10 points, fixé au 1er janvier et au 1er juillet, L441-10 II) : 12,15 % au 1er semestre 2026, 12,40 % au 2e (fiche F23211, BCE 2,40 % au 17 juin 2026) ; taux de refinancement à 2,65 % depuis le 16 sept. 2026, donc au moins 12,65 % au 1er semestre 2027 — relevé le 10 oct. 2026. Table `TAUX_PENALITES_PAR_SEMESTRE` (`src/lib/relanceUtils.js`, recopiée dans `send-scheduled-relances/regles.ts`) ; un test échoue si le semestre en cours manque. Pénalités et 40 € : clients professionnels seulement ; un particulier : intérêts au taux légal à compter de la mise en demeure (C. civ. art. 1231-6). Premier rappel : ne rien affirmer sur les pénalités (exigibles sans rappel, L441-10 II).
- **Surtaxe d'un paiement par carte interdite** (C. mon. fin. L112-12) → jamais de frais répercutés au client.
- Espèces entre un professionnel et un particulier : 1 000 € maximum (C. mon. fin. L112-6, D112-3).
- Délais entre professionnels : 30 jours après réception par défaut, 60 jours max (C. com. L441-10).

## 6. Garanties après réception

Parfait achèvement **1 an** (C. civ. 1792-6) · bon fonctionnement **2 ans** pour les équipements dissociables (1792-3) · décennale **10 ans** pour la solidité / l'impropriété à la destination (1792, 1792-4-1).

## 7. Électricité (Hugo, et les testeurs électriciens)

- Norme d'installation : **NF C 15-100** (logement).
- **Attestation de conformité Consuel** (C. énergie D342-19) : installation neuve raccordée au réseau ; installation de production (photovoltaïque) qui modifie l'installation intérieure ; installation entièrement rénovée après coupure par le distributeur à la demande du client ; bornes au-delà de 36 kW ou en immeuble collectif (décret 2017-26 art. 23). Envoyée au Consuel au moins 20 jours avant la mise en service.
- **Borne de recharge (IRVE)** > 3,7 kW : installateur qualifié IRVE obligatoire (décret n° 2017-26) — sinon pas d'aides et risque assurance.
- Exercer comme électricien : qualification requise — CAP, BEP ou titre RNCP de niveau égal ou supérieur, ou 3 ans d'expérience effective, ou contrôle permanent d'une personne qualifiée (code de l'artisanat L121-1 3°, L121-2, R121-1, R121-3 ; l'art. 16 de la loi 96-603 est abrogé depuis le 1er juil. 2023) ; sans qualification : 7 500 € d'amende.
- **Formation à la prévention des risques électriques** des travailleurs indépendants intervenant sur un chantier de bâtiment (C. trav. R4535-12-1, depuis le 19 déc. 2024 ; périmètre exact du dépannage chez un particulier **(à vérifier)**).

## 8. Facture électronique (réforme)

- **Réception** obligatoire pour toutes les entreprises au 1er sept. 2026 ; **émission** au 1er sept. 2027 pour PME/TPE/indépendants (sept. 2026 pour grandes entreprises et ETI).
- Le Portail Public de Facturation ne fait plus l'échange (annuaire + concentrateur seulement) : passage obligé par une **Plateforme Agréée (PA)**. Mallettico n'en est pas une → **ne jamais écrire « conforme facturation 2026 »**. Voie retenue : intégrer une PA par API (B2Brouter, Seqino, Tenor, Serensia — à contacter) ; ne rien coder sans leur documentation réelle.
- Format : Factur-X (PDF/A-3 + XML CII) existe déjà dans `src/lib/facturx*.js` ; il ne suffit pas sans transport par une PA et e-reporting. Ne citer « EN 16931 » qu'après validation d'un fichier produit.
- **Données de paiement** : pour les prestations de services (tous les travaux), transmettre aussi les **encaissements** (date, montant), tous les deux mois en franchise (FAQ DGFiP du 1er sept. 2026). Pour les particuliers : ventes agrégées par jour et par taux, sans donnée nominative.
- **Sanctions** : 50 € par facture non électronique, plafonnées à 15 000 € par an (première infraction non sanctionnée) ; sans plateforme de réception : mise en demeure, puis 500 €, puis 1 000 € par trimestre.
- **Mallettico lui-même** devra émettre ses factures d'abonnement (B2B) par une Plateforme Agréée au 1er sept. 2027 : les PDF de Stripe ne suffiront plus.

## 9. Ce que Mallettico, éditeur, doit lui-même

- Mentions légales de l'éditeur (LCEN art. 1-1, l'ancien art. 6 III depuis la loi SREN de 2024) : nom suivi de « EI », adresse, téléphone, e-mail, SIREN, immatriculation au RNE (RCS éventuel pour l'édition de logiciel **(à vérifier)**), mention TVA, directeur de la publication, hébergeur — **à fournir par Hugo** ; domicile ou domiciliation : question Q-adresse.
- **Statut de commerçant (DSA)** sur les stores : adresse, téléphone et e-mail publiés sur la fiche de l'app dans l'UE.
- RGPD : Mallettico est **sous-traitant** des artisans pour les données de leurs clients (accord art. 28 à annexer aux CGU), registre des traitements (art. 30), sous-traitants (Supabase Paris, Vercel, Stripe, Resend ; Sentry s'il est activé ; Anthropic si l'IA revient), droit d'accès/portabilité (export complet) et d'effacement (suppression de compte, migration 072). Tâche `rgpd-soustraitance`.
- Stores : suppression de compte dans l'app (Apple 5.1.1(v)), déclarations de confidentialité alignées sur le code.
- Honnêteté commerciale : pas de prix de référence fictif (prix barré jamais pratiqué), pas d'avis ou de statistiques inventés, pas d'attestation de conformité (CGI art. 286) sans audit réel.
