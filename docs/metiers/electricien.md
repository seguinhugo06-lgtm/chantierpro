# Électricien (dont IRVE et photovoltaïque) — ce que Mallettico doit savoir

> Recherche du 03/11/2026 (session cloud « metiers »). Sources lues par moteur de recherche : textes officiels non ouverts,
> tout est à relire au texte avant de coder une règle bloquante. Relecture juriste-btp : voir la fin du fichier.

**Codes NAF** : 43.21A (travaux d'installation électrique dans tous locaux), 43.21B (équipements électriques de voie publique) — nomenclature NAF rév. 2 ; l'effet de la NAF 2025 n'a pas été vérifié **(à vérifier)**.
**Variantes couvertes** : électricien du bâtiment (neuf, rénovation, dépannage), installateur de bornes de recharge (IRVE), installateur photovoltaïque (partie électrique).

Déjà vérifié au texte dans `docs/metier-btp.md` § 7 : qualification pour exercer (code de l'artisanat L121-1 3°, L121-2, R121-1, R121-3), cas où l'attestation Consuel est due (C. énergie D342-19), seuil IRVE de 3,7 kW (décret 2017-26), formation aux risques électriques des indépendants (C. trav. R4535-12-1). Cette fiche ne les contredit pas ; elle complète.

## 1. Assurances

Décennale, RC pro, attestation jointe au devis : voir `commun.md`.
Propre au métier : une borne de plus de 3,7 kW posée sans qualification IRVE fait perdre les aides et expose à un refus de l'assureur (`metier-btp.md` § 7). Vérifier que l'activité « IRVE » ou « photovoltaïque » figure bien dans les activités déclarées à l'assureur décennal : ce sont souvent des activités à part dans les contrats **(à vérifier auprès des assureurs, aucune source officielle)**.

## 2. Qualifications et ce qu'elles ouvrent au client

| Qualification | Organisme | Obligatoire ? | Ce qu'elle permet au client | Source |
|---|---|---|---|---|
| CAP/BEP/titre RNCP ou 3 ans d'expérience | — (code de l'artisanat) | Oui, pour exercer | Rien de plus ; c'est la condition d'exercice | `metier-btp.md` § 7 |
| IRVE (niveaux appelés P1, P2, P3 ; maintenance MA1 à MA3) | Qualifelec, AFNOR Certification, Qualit'EnR | Oui pour toute borne > 3,7 kW | Borne posée dans les règles ; TVA à 5,5 % (condition à vérifier, voir § 5) ; aides éventuelles (ADVENIR en collectif) | [8], [9] |
| QualiPV « Électricité » (et « Bâtiment » pour l'intégration des modules) | Qualit'EnR | Non pour poser ; oui pour les aides et l'obligation d'achat < 9 kWc (seuil à vérifier, ne pas l'imprimer) | Contrat d'obligation d'achat, prime à l'autoconsommation | [19], [21] |
| RGE (chauffe-eau thermodynamique, PAC) | Qualifelec, Qualibat, Qualit'EnR | Non | MaPrimeRénov', CEE, éco-PTZ : voir `chauffagiste.md` | `chauffagiste.md` |
| Habilitation électrique (NF C 18-510) | Délivrée par l'employeur après formation | Oui pour les salariés qui interviennent sur ou près d'une installation | Rien pour le client | [17], [18] |

Précisions :
- Les niveaux IRVE : les sources parlent de P1, P2 et P3, et non de « niveaux 1, 2, 3 ». Aucune source officielle trouvée sur la correspondance exacte avec le texte du décret **(à vérifier)**. Le niveau de base couvre la pose sans configuration de communication ou de supervision [9].
- Habilitation : c'est l'employeur qui la délivre, la maintient et la renouvelle (C. trav. R4544-10, selon [18]). Le recyclage tous les 3 ans est une recommandation de la norme, pas une durée du code du travail [17], [18]. Depuis octobre 2024, la norme s'applique avec ses amendements A1 (2020) et A2 (2023) [17]. Pour un artisan seul, l'obligation propre est la formation de R4535-12-1 (`metier-btp.md` § 7).

## 3. Documents remis au client

### 3.1 Attestation de conformité Consuel
- **Quand** : installation neuve raccordée ; production (photovoltaïque) qui modifie l'installation intérieure ; installation entièrement rénovée après coupure à la demande du client ; borne > 36 kW ou en immeuble collectif quelle que soit la puissance (D342-19, `metier-btp.md` § 7). Pas de Consuel pour un simple dépannage ou une rénovation partielle sans coupure du réseau.
- **Qui la remplit** : l'installateur. Il fait d'abord son autocontrôle, remplit le formulaire officiel, puis l'envoie au Consuel pour visa [5], [6]. Le Consuel peut décider d'une visite ; elle n'est pas systématique pour un professionnel, elle l'est pour un particulier qui a fait lui-même [6] **(à vérifier : taux de visite non publié)**.
- **Modèles** (fiche Consuel SC 170 [1]) :

| Couleur | CERFA | Pour quoi |
|---|---|---|
| Jaune | 12506*03 | Installation neuve ou entièrement rénovée d'un local d'habitation individuel |
| Verte | 12507*03 | Locaux autres qu'habitation individuelle : collectifs, parties communes, entreprises, ERP |
| Bleue | 15523*01 | Production d'électricité (photovoltaïque) sans stockage |
| Violette | 15524*01 | Production d'électricité avec stockage (batterie) |

  Définitions des attestations bleue et violette : à relire sur la fiche SC 170 avant d'imprimer une couleur.
  Pour le photovoltaïque, un dossier technique accompagne la demande : SC 144, ou SC 143 au-delà de 36 kVA [5], [7] **(à vérifier)**.
- **Délai** : à envoyer au Consuel au moins 20 jours avant la mise en service (`metier-btp.md` § 7). Depuis le 1er janv. 2025 (décret 2024-1122 modifiant D342-19), le Consuel met l'attestation visée à disposition du gestionnaire de réseau en 1 à 2 jours [3], [4]. Aucun délai réglementaire de visite trouvé ; les sites commerciaux disent 5 à 20 jours ouvrés **(à vérifier)**.
- **Validité** : le formulaire d'attestation est valable un an à compter de sa date d'émission par le Consuel (CGV Consuel SC 178) ; il n'est ensuite ni repris ni échangé [2].
- **Conservation** : aucun texte trouvé. Utile au client : une attestation Consuel de moins de 3 ans dispense du diagnostic électricité à la vente, selon une source commerciale **(à vérifier)** [16].
- **Coût** : payé au Consuel par l'installateur, refacturé au client ; montant variable selon la couleur et le mode d'envoi (voir consuel.com) **(à vérifier)**.

### 3.2 Diagnostic électricité : ce n'est pas l'électricien
Le diagnostic de l'état de l'installation intérieure d'électricité, pour une vente ou une location d'un logement dont l'installation a plus de 15 ans, est fait par un **diagnostiqueur certifié**, pas par l'électricien qui travaille dessus. Validité : 3 ans (vente), 6 ans (location) [16]. Ce n'est pas un certificat de conformité aux normes actuelles. Un électricien ne doit pas vendre un « diagnostic électrique » au sens du dossier de diagnostic technique ; il peut faire un état des lieux commercial, sous un autre nom.

### 3.3 Documents de fin de chantier (aucune obligation légale trouvée)
Schéma de l'installation, repérage du tableau, notices des appareils, résultats des mesures d'autocontrôle (terre, différentiels, continuité), dossier des ouvrages exécutés (DOE) en marché pro. La NF C 15-100 contient des exigences de repérage et de documentation, mais le texte de la norme n'a pas été consulté **(à vérifier, norme payante)**. Pour une borne : la notice et le certificat de qualification IRVE sont demandés pour les aides [12], [13].
Règle de rédaction : jamais « certifié conforme » sur un document de l'artisan. Écrire « autocontrôle réalisé le … : résultats ci-dessous ».

### 3.4 Photovoltaïque : attestation sur l'honneur
Pour signer le contrat d'obligation d'achat, le producteur remet à l'acheteur obligé une **attestation sur l'honneur de conformité** (C. énergie R314-7), sur un modèle approuvé par le ministre, établie par l'installateur et le producteur ; à défaut, une attestation d'un organisme agréé [19], [20]. Dans certains cas (augmentation de puissance), elle doit être validée par un organisme d'inspection [19] **(à vérifier pour un contrat neuf)**. Les arrêtés tarifaires ont changé en 2026 : vérifier celui applicable à la date de la demande **(à vérifier)**.

## 4. Obligations périodiques du client que l'artisan peut rappeler

| Obligation | Fréquence | Qui | Texte | Source |
|---|---|---|---|---|
| Diagnostic électricité (vente) | Validité 3 ans | Vendeur, par un diagnostiqueur | CCH (dossier de diagnostic technique) | [16] |
| Diagnostic électricité (location) | Validité 6 ans | Bailleur, par un diagnostiqueur | Idem | [16] |
| Entretien de la borne | Aucune périodicité légale trouvée pour un particulier | — | — | **(à vérifier)** |
| Vérification périodique des installations électriques en ERP ou lieu de travail | Annuelle en général, par un organisme ou une personne qualifiée | Exploitant, employeur | C. trav. (non vérifié ici) | **(à vérifier)** |

Pour un particulier, il n'existe pas d'équivalent du ramonage annuel en électricité. Un rappel « contrôle de votre installation » ne doit jamais se dire obligatoire (C. conso. L. 121-2 ; règles de prospection : `metier-btp.md` § 10).

## 5. TVA propre au métier

- Règles générales 10 % / 5,5 % / 20 % et certification : voir `commun.md`.
- Borne de recharge dans un local à usage d'habitation, destinée aux résidents : 5,5 % sur la pose, l'installation et l'entretien (CGI art. 278-0 bis, N), si la configuration respecte l'art. 30-0 H de l'annexe IV (arrêté du 22 juin 2023 : socle ou connecteur de type 2, ou prise de type E dite « renforcée », d'au moins 14 A) et si l'installateur a l'habilitation et, le cas échéant, la qualification de l'art. 22 du décret n° 2017-26 (erratum du 4 nov. 2026 : l'art. 22 du décret n° 2017-26 est abrogé depuis le 1er juil. 2024 ; la règle est à l'art. D. 353-2 du code de l'énergie, voir `avis-juriste-2026-11-04-electricien.md`, point 3). Aucune condition d'ancienneté : logements neufs ou anciens. Le critère est la nature du local, pas la qualité du client. Taux de la part « fourniture » de la borne : à confirmer au BOFiP. [14], [15]
- **Mise en sécurité, rénovation électrique** d'un logement de plus de 2 ans : 10 % (`commun.md`).
- **Photovoltaïque** : selon le juriste, la loi de finances 2025 a créé un 5,5 % pour les installations de 9 kWc au plus, sous critères, à partir du 1er oct. 2025 **(à vérifier)**. Ne proposer aucun taux PV avant lecture.
- **Chauffe-eau thermodynamique, PAC posés par un électricien** : voir `chauffagiste.md` et `plombier.md`.

## 6. Mentions particulières sur le devis et la facture

- Dépannage : devis préalable et affichage des prix (arrêté du 24 janv. 2017) : voir `commun.md`. La DGCCRF relève dans ce secteur la mise en avant de qualifications ou de labels que le professionnel n'a pas [23] : n'imprimer que des qualifications saisies avec un numéro.
- Borne : numéro et organisme de la qualification IRVE ; puissance de la borne (kW) ; type de point de charge (socle ou connecteur de type 2, ou prise de type E « renforcée » d'au moins 14 A), car l'obligation de qualification dépend de la puissance et le 5,5 % de la configuration (ann. IV art. 30-0 H ; prise renforcée admise, relu au texte le 3 nov. 2026 : voir l. 75) [14], [15].
- Consuel : ligne distincte « attestation Consuel (frais de visa) » quand elle est due, avec la couleur.
- Photovoltaïque : puissance crête (kWc), qualification QualiPV, mention de l'attestation sur l'honneur à cosigner [19].
- Jamais « installation conforme NF C 15-100 » comme promesse invérifiable ; préférer « réalisée selon la norme NF C 15-100 » (engagement de l'artisan) : acceptable selon juriste-btp ; décision d'Hugo.

## 7. Aides du client et pièces que l'artisan fournit

- **Crédit d'impôt borne de recharge** (CGI art. 200 quater C, 500 € par borne) : non reconduit après le 31 déc. 2025 ; seules les dépenses payées avant cette date se déclarent en 2026 [10], [11] **(à vérifier sur la loi de finances 2026 : sources commerciales concordantes, texte non lu)**. Ne plus l'afficher sur un devis de 2026.
- **ADVENIR** : pas d'aide pour une maison individuelle ; réservé au résidentiel collectif et aux entreprises. Barèmes revalorisés au 1er avr. 2026 selon une source commerciale (jusqu'à 1 000 € par point individuel en copropriété) [12] **(à vérifier sur advenir.mobi)**. L'artisan fournit facture, qualification IRVE et devis selon le programme.
- **Photovoltaïque** : prime à l'autoconsommation et obligation d'achat conditionnées à la qualification de l'installateur pour les petites installations [21] ; pièces : attestation sur l'honneur [19], attestation Consuel bleue ou violette [1].

## 8. Le terrain : problèmes concrets et ce qu'un logiciel simple devrait faire

Problèmes réels :
- Le Consuel oublié ou envoyé trop tard bloque la mise en service et donc le paiement du solde.
- Le client confond attestation Consuel, diagnostic électricité et « certificat de conformité » ; il demande un « papier » à l'électricien après coup.
- Le taux de TVA d'une borne dépend de plusieurs conditions (local d'habitation destiné aux résidents, configuration de l'ann. IV art. 30-0 H, qualification de l'installateur ; part « fourniture » à confirmer au BOFiP : voir l. 75) : erreur facile.
- Des devis 2026 affichent encore le crédit d'impôt borne.
- Le Pilote d'Hugo n'est pas consulté ici ; aucune donnée d'usage citée.

Propositions :

| Priorité | Proposition | Effort | Risque juridique |
|---|---|---|---|
| Indispensable | Champ « qualification IRVE » (n°, organisme, niveau, validité) distinct du champ RGE ; imprimé sur les devis contenant une borne | S | Faible ; supprime le risque de qualification affichée sans numéro |
| Indispensable | Modèle de devis borne : puissance obligatoire ; si > 3,7 kW et pas de qualification IRVE saisie, avertissement (pas de blocage tant que le texte n'est pas relu) | S | Moyen si bloquant ; faible en avertissement |
| Indispensable | TVA borne : proposer 5,5 % pour une borne dans un local d'habitation, fourniture et pose par la même entreprise, prise renforcée de type E (≥ 14 A) admise (CGI ann. IV art. 30-0 H) ; aucune condition sur la qualité du client (syndic, SCI, bailleur compris) ; sans condition d'ancienneté ; habilitation et, le cas échéant, qualification de l'installateur exigées (C. énergie D. 353-2 ; l'art. 22 du décret n° 2017-26 est abrogé) ; ligne de pose seule (la fourniture sur une autre ligne, taux non suggéré : décision n° 2 d'Hugo) ; certification du client : **retirée** pour une ligne de pose marquée à 5,5 % dans le code de `cloud/metier-electricien`, confirmé par juriste-btp au texte le 4 nov. 2026 (le 278-0 bis N ne demande aucune certification) mais **en attente de la décision n° 6 d'Hugo** (règle documents-legal : ne pas retirer une mention sans décision) ; à aligner ici une fois tranché | M | Moyen : BOFiP sans paragraphe sur le N (recherche du 4 nov. 2026) |
| Utile | Ligne « attestation Consuel » avec la couleur (définitions à relire sur la SC 170), et une tâche de chantier « envoyer au Consuel » à J-20 de la mise en service prévue | S | Faible |
| Utile | « Compte rendu d'intervention et d'autocontrôle » numéroté et figé, sur le modèle de l'attestation de ramonage : mesures relevées, réserves, photos du tableau ; jamais le mot « conforme » ; jamais appelé « attestation de conformité » ; ni les couleurs ni la mise en page du Consuel | M | Faible si le vocabulaire est respecté |
| Utile | Dossier de fin de chantier en un PDF : schéma (photo ou fichier), notices, compte rendu, attestation Consuel visée (fichier joint) | M | Faible |
| Plus tard | Photovoltaïque : pré-remplir les données de l'attestation sur l'honneur (puissance, onduleur, n° QualiPV) | M | Moyen : modèle officiel à suivre à la lettre |
| Plus tard | Rappel « borne : vérification » à 1 ou 2 ans, présenté comme conseil, jamais comme obligation | S | Faible (règles de prospection de `metier-btp.md` § 10) |

## Sources

1. Consuel, fiche SC 170 (modèles d'attestations et CERFA) — https://www.consuel.com/wp-content/uploads/2021/02/SC170_5.pdf — consulté le 03/11/2026 — [résumé]
2. Selectra, « À quoi ressemble l'attestation de conformité électrique ? » — https://selectra.info/energie/guides/demenagement/attestation-de-conformite — consulté le 03/11/2026 — (à vérifier)
3. Consuel, InfoConsuel n° 11, déc. 2024 (décret 2024-1122, D342-19) — https://www.consuel.com/wp-content/uploads/2024/12/INFOCONSUEL11-DEC-2024.pdf — consulté le 03/11/2026 — [résumé]
4. Consuel, InfoConsuel n° 10, mise à disposition de l'AC au GRD — https://actualites.consuel.com/wp-content/uploads/2025/07/infoconsuel10-MISE-A-DISPO-AC-AU-GRD-V6.pdf — consulté le 03/11/2026 — [résumé]
5. photovoltaique.info, « Attestation Consuel et rapport de contrôle » — https://www.photovoltaique.info/fr/realiser-une-installation/regles-conception-mise-en-oeuvre/normes-electriques-applicables-aux-systemes-pv/attestation-consuel-et-rapport-de-controle/ — consulté le 03/11/2026 — [résumé]
6. EDF, « Le Consuel » — https://particulier.edf.fr/fr/accueil/guide-energie/electricite/consuel.html — consulté le 03/11/2026 — (à vérifier)
7. IZI by EDF, « Comment remplir une attestation Consuel » — https://izi-by-edf.fr/blog/consuel-remplir-tuto — consulté le 03/11/2026 — (à vérifier)
8. Xpair, « Décret 2017-26 bornes de recharge » — https://conseils.xpair.com/consulter_savoir_faire/bornes-charge-vehicules-electriques-multi-residentiel/decret-201726-bornes-recharges-electriques.htm — consulté le 03/11/2026 — (à vérifier)
9. Tesla Mag, « Devenir installateur certifié IRVE en 2026 » — https://www.tesla-mag.com/comment-devenir-un-installateur-certifie-irve/ — consulté le 03/11/2026 — (à vérifier)
10. IZI by EDF, « Y aura-t-il un crédit d'impôt borne de recharge en 2026 ? » — https://izi-by-edf.fr/blog/fin-dispositif-credit-impot-borne-recharge — consulté le 03/11/2026 — (à vérifier)
11. Hellowatt, « Bornes de recharge : fin du crédit d'impôt en 2026 » — https://www.hellowatt.fr/blog/bornes-de-recharge-fin-credit-impot/ — consulté le 03/11/2026 — (à vérifier)
12. TotalEnergies, « La prime Advenir » — https://www.totalenergies.fr/particuliers/recharge-voiture-electrique/la-prime-advenir — consulté le 03/11/2026 — (à vérifier)
13. Ministère de la Transition écologique, fiche borne électrique en résidentiel — https://www.ecologie.gouv.fr/sites/default/files/VDEF%2022056_Borne-électrique-résidentiel.pdf — consulté le 03/11/2026 — [résumé]
14. FFB, « Installation de bornes de recharge pour véhicule électrique » (TVA) — https://www.ffbatiment.fr/actualites-batiment/actualite-ba/installation-de-bornes-de-recharge-pour-vehicule-electrique — consulté le 03/11/2026 — [résumé]
15. TotalEnergies, « Quelle TVA pour votre borne de recharge en 2026 ? » — https://www.totalenergies.fr/particuliers/recharge-voiture-electrique/borne-a-domicile/aides/tva — consulté le 03/11/2026 — (à vérifier)
16. Service-public.fr, F18692, « Diagnostic immobilier : état de l'installation intérieure d'électricité » — https://www.service-public.gouv.fr/particuliers/vosdroits/F18692 — consulté le 03/11/2026 — [résumé] (dispense par Consuel : source commerciale, à vérifier)
17. Consuel, « Sécurité électrique au travail » (NF C 18-510, A1, A2) — https://actualites.consuel.com/wp-content/uploads/2025/04/11-SECURITE-ELECTRIQUE-AU-TRAVAIL.pdf — consulté le 03/11/2026 — [résumé]
18. Xpair, « Habilitation électrique obligatoire » — https://conseils.xpair.com/analyse_reglementation/habilitation-electrique-obligatoire.htm — consulté le 03/11/2026 — (à vérifier)
19. EDF OA, S17, « Attestations de conformité sur l'honneur » — https://www.edf-oa.fr/sites/default/files/uploads/contributeur/s17_-_attestations_de_conformite_sur_honneur.pdf — consulté le 03/11/2026 — [résumé]
20. Légifrance, JORF, article 6 d'un arrêté tarifaire (renvoi à C. énergie R314-7) — https://www.legifrance.gouv.fr/jorf/article_jo/JORFARTI000054190700 — consulté le 03/11/2026 — [résumé] (arrêté exact à identifier)
21. CAPEB Drôme, « Maîtriser les démarches administratives QualiPV » — https://www.capeb.fr/www/capeb/media//drome/document/sp-demarches-admin-qualipv-1j.pdf — consulté le 03/11/2026 — [résumé]
22. `docs/metier-btp.md` § 7 et § 10 (vérifiés au texte) — interne
23. DGCCRF, « Dépannage à domicile : gare aux arnaques » (08/07/2025) — https://www.economie.gouv.fr/dgccrf/depannage-domicile-gare-aux-arnaques — consulté le 03/11/2026 — [résumé]

## Relecture juriste-btp

Relue par juriste-btp le 03/11/2026, sans texte officiel ouvert (avis : `avis-juriste-2026-11-03.md`). Corrections appliquées. Restent à vérifier au texte :
- borne : relue au texte le 3 nov. 2026 (CGI 278-0 bis, N ; ann. IV art. 30-0 H, prise renforcée admise ; aucune condition d'ancienneté ; qualification de l'installateur, décret n° 2017-26, art. 22 ; voir l. 75) ; reste le taux de la part « fourniture » (BOFiP) ;
- photovoltaïque : 5,5 % pour 9 kWc au plus depuis le 1er oct. 2025 ; seuil QualiPV de l'obligation d'achat ;
- définitions des attestations Consuel bleue et violette (SC 170) ;
- fin du crédit d'impôt borne (loi de finances 2026) ; correspondance P1/P2/P3 avec le décret 2017-26.
