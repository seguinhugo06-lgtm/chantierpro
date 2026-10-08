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

- **Dépannage, réparation, entretien (bâtiment et équipement de la maison)** : devis détaillé avant intervention, avec date, nom et adresse de l'entreprise, nom du client, lieu d'exécution, nature exacte des travaux, décompte détaillé (quantités, prix unitaires), **frais de déplacement** le cas échéant (arrêté du 24 janv. 2017, art. 4). Le seuil « obligatoire au-delà de 150 € TTC » est très cité mais contesté **(à vérifier)** : par prudence, Mallettico pousse toujours au devis.
- **Assurance décennale** (travaux de construction) : sur devis ET factures, nom et coordonnées de l'assureur, couverture géographique (loi n° 2014-626 « Pinel », art. 22 ; C. assur. L243-2).
- **Entrepreneur individuel** : mention « EI » ou « entrepreneur individuel » accolée au nom sur tous les documents (loi n° 2022-172, C. com. L526-22 et s.).
- **Contrat hors établissement** (signé chez le client, ou à distance) avec un particulier : droit de rétractation de **14 jours** (C. conso. L221-18) et formulaire de rétractation ; exception pour les travaux d'urgence demandés expressément par le client (L221-28, 8°).
- **Médiateur de la consommation** : l'artisan qui travaille pour des particuliers doit adhérer à un médiateur et en donner les coordonnées (C. conso. L612-1). C'est l'obligation de l'artisan (champ « médiateur » dans ses paramètres), pas de Mallettico (service B2B).

## 3. Factures

Mentions de base (CGI ann. II art. 242 nonies A ; C. com. L441-9) : numéro unique d'une **séquence continue**, date d'émission, identités et adresses des parties, SIREN/SIRET, n° de TVA intracommunautaire (si assujetti ; celui du client s'il est assujetti), désignation, quantités, prix unitaires HT, taux et montant de TVA par taux, totaux HT / TVA / TTC, date d'exécution, date d'échéance, **pénalités de retard**, **indemnité forfaitaire de recouvrement de 40 €** (C. com. D441-5, entre professionnels), conditions d'escompte.

- Micro-entrepreneur en franchise : « TVA non applicable, art. 293 B du CGI ».
- Nouvelles mentions de la réforme (décret n° 2022-1299) : SIREN du client, adresse de livraison si différente, **nature des opérations** (biens / services / mixte), **option pour le paiement de la TVA d'après les débits**. Date d'application : au plus tard avec l'obligation d'émission électronique (sept. 2027 pour TPE/PME), certaines sources disent 1er sept. 2026 pour tous **(à vérifier)** — les ajouter dès maintenant est sans risque.
- Conservation : 10 ans (C. com. L123-22) — d'où l'invitation à exporter avant toute suppression de compte.

## 4. TVA dans le bâtiment

| Taux | Quand | Source |
|---|---|---|
| 20 % | Construction neuve, agrandissement > 10 % de surface, travaux qui produisent un immeuble neuf, locaux non habitation | CGI art. 278 |
| 10 % | Amélioration, transformation, aménagement, entretien de **locaux d'habitation achevés depuis plus de 2 ans** | CGI art. 279-0 bis |
| 5,5 % | Travaux de **rénovation énergétique** sur ces mêmes locaux | CGI art. 278-0 bis A |

- Depuis la loi n° 2025-127 (art. 41), l'attestation Cerfa 1300-SD / 1301-SD est **supprimée** : le client **certifie sur le devis ou la facture** que les conditions sont remplies (modèles officiels : BOFiP, BOI-LETTRE-000280). Implémenté dans `src/lib/mentionTvaReduite.js`, dans les DEUX générateurs de PDF.
- Travaux d'entretien/réparation de moins de 1 000 € TTC : la mention n'est pas exigée (BOFiP) — Mallettico l'ajoute quand même, sans risque.
- Sans certification ou si elle est fausse : le taux normal (20 %) s'applique ; le client reste solidaire.
- Autoliquidation en sous-traitance : pas de TVA facturée, mention obligatoire (voir §1).

## 5. Paiement

- **Surtaxe d'un paiement par carte interdite** (C. mon. fin. L112-12) → jamais de frais répercutés au client.
- Espèces entre un professionnel et un particulier : 1 000 € maximum (C. mon. fin. L112-6, D112-3).
- Délais entre professionnels : 30 jours après réception par défaut, 60 jours max (C. com. L441-10).

## 6. Garanties après réception

Parfait achèvement **1 an** (C. civ. 1792-6) · bon fonctionnement **2 ans** pour les équipements dissociables (1792-3) · décennale **10 ans** pour la solidité / l'impropriété à la destination (1792, 1792-4-1).

## 7. Électricité (Hugo, et les testeurs électriciens)

- Norme d'installation : **NF C 15-100** (logement).
- **Attestation de conformité Consuel** : obligatoire avant mise sous tension d'une installation neuve ou entièrement rénovée avec mise hors tension (C. énergie D342-18 et s.) **(à vérifier : périmètre exact)**.
- **Borne de recharge (IRVE)** > 3,7 kW : installateur qualifié IRVE obligatoire (décret n° 2017-26) — sinon pas d'aides et risque assurance.
- Exercer comme électricien : qualification professionnelle requise (CAP/BEP ou 3 ans d'expérience, loi n° 96-603 art. 16).

## 8. Facture électronique (réforme)

- **Réception** obligatoire pour toutes les entreprises au 1er sept. 2026 ; **émission** au 1er sept. 2027 pour PME/TPE/indépendants (sept. 2026 pour grandes entreprises et ETI).
- Le Portail Public de Facturation ne fait plus l'échange (annuaire + concentrateur seulement) : passage obligé par une **Plateforme Agréée (PA)**. Mallettico n'en est pas une → **ne jamais écrire « conforme facturation 2026 »**. Voie retenue : intégrer une PA par API (B2Brouter, Seqino, Tenor, Serensia — à contacter) ; ne rien coder sans leur documentation réelle.
- Format : Factur-X (PDF/A-3 + XML CII, EN 16931) existe déjà dans `src/lib/facturx*.js` ; il ne suffit pas sans transport par une PA et e-reporting.

## 9. Ce que Mallettico, éditeur, doit lui-même

- Mentions légales de l'éditeur (LCEN art. 6) : identité réelle — **à fournir par Hugo** (les pages affichent « immatriculation en cours »).
- RGPD : registre, sous-traitants (Supabase Paris, Vercel, Stripe, Resend ; Anthropic si l'IA revient), droit d'accès/portabilité (export complet) et d'effacement (suppression de compte, migration 072).
- Stores : suppression de compte dans l'app (Apple 5.1.1(v)), déclarations de confidentialité alignées sur le code.
- Honnêteté commerciale : pas de prix de référence fictif (prix barré jamais pratiqué), pas d'avis ou de statistiques inventés, pas d'attestation de conformité (CGI art. 286) sans audit réel.
