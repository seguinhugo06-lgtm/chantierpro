# Carreleur — ce que Mallettico doit savoir

> Recherche du 03/11/2026 (session cloud « metiers »). Sources lues par moteur de recherche : textes officiels non ouverts,
> tout est à relire au texte avant de coder une règle bloquante. Relecture juriste-btp : voir la fin du fichier.

**Codes NAF** : 43.33Z « Travaux de revêtement des sols et des murs » [1] (libellé à confirmer sur insee.fr) · **Variantes couvertes** : carreleur, faïencier, chapiste, poseur de salle de bain (souvent en sous-traitance d'un plombier ou d'une entreprise de rénovation), adaptation de salle de bain pour personne âgée ou handicapée (« salle de bain PMR »).

Règles transverses (TVA 20/10/5,5 et certification, autoliquidation, devis de dépannage, décennale et attestation jointe, hors établissement, médiateur, garanties 1/2/10 ans) : voir `commun.md` et `docs/metier-btp.md`. Ne figure ici que ce qui est propre au métier.

## 1. Assurances

- **Décennale** : obligatoire pour la pose de carrelage qui fait partie d'un ouvrage (voir commun.md). La difficulté du métier est de savoir **quand un désordre de carrelage relève de la décennale**.
  - Le critère reste l'**impropriété à la destination** de l'ouvrage (C. civ. 1792). Un carrelage qui se décolle ou fissure ne suffit pas : il faut rechercher si le désordre rend la pièce ou la terrasse impropre à sa destination (Cass. 3e civ., 3 mai 2018, n° 17-14.767, carrelage d'une terrasse) [2] **[résumé]**.
  - **Carrelage posé sur un existant** : Cass. 3e civ., 13 juil. 2022, n° 19-20.231 (remontées d'humidité sous un carrelage) : un élément dissociable posé sur existant n'engage la décennale que si le désordre rend l'ouvrage **dans son ensemble** impropre à sa destination [3] **[résumé]**. Depuis le revirement du 21 mars 2024 (n° 22-18.694, déjà cité dans metier-btp.md § 2), seuls les éléments d'équipement **d'origine** relèvent de la décennale ; un élément ajouté sur l'existant n'y relève plus [3] **[résumé]**. Aucun arrêt de 2024 ou 2025 propre au carrelage n'a été trouvé **(à vérifier)**.
  - **Le carrelage est-il un « élément d'équipement » ?** Pour la biennale (C. civ. 1792-3), non : un carrelage (ici de bordure de piscine) est un élément « non destiné à fonctionner », hors garantie de bon fonctionnement [4] **[résumé]**. Conséquence pratique : pas de garantie de 2 ans sur le carrelage seul ; parfait achèvement (1 an), puis décennale si impropriété, sinon responsabilité contractuelle de droit commun **(à vérifier)**.
  - La distinction « carrelage scellé = ouvrage / collé = équipement » circule chez des avocats et assureurs, sans décision trouvée **(à vérifier)**. Ne rien coder dessus.
- **Chape et étanchéité sous carrelage** : c'est là que naissent les sinistres graves (dégâts des eaux dans les douches à l'italienne, fiche pathologie AQC F.03) [5] **[résumé]**.
  - **SPEC** (système de protection à l'eau sous carrelage) : murs, et sols **sans** évacuation ; **ce n'est pas une étanchéité**. **SEL** (système d'étanchéité liquide) : sols qui reçoivent de l'eau, dont le sol d'une douche à l'italienne. Un SEL peut couvrir les emplois d'un SPEC, pas l'inverse [6] **[résumé]**.
  - Ces procédés relèvent d'**avis techniques** (CSTB, groupe spécialisé n° 13) ; la fiche AQC met en garde contre leur emploi **hors du domaine de l'avis technique** [5][6] **[résumé]**. Une pose hors avis technique ou hors DTU peut être une « technique non courante » que l'assureur ne couvre pas sans déclaration **(à vérifier auprès de l'assureur ; non trouvé dans une source)**.
- **Sous-traitant** : la décennale n'est pas une obligation légale pour le sous-traitant (il répond envers l'entreprise principale), mais elle est en pratique exigée par le donneur d'ordre [7] **[résumé, source commerciale — à vérifier]**.
- RC pro : voir commun.md.

## 2. Qualifications et ce qu'elles ouvrent au client

| Qualification | Organisme | Obligatoire ? | Ce qu'elle permet au client | Source |
|---|---|---|---|---|
| Qualification « revêtements » (carrelage) | Qualibat | Non | Rien de financier ; preuve de compétence | (à vérifier : nomenclature Qualibat non consultée) |
| RGE | Qualibat etc. | Non pour le carrelage seul | Le carrelage n'est pas un geste de rénovation énergétique : pas d'aide liée au RGE | voir commun.md |
| Exigence de qualification pour MaPrimeAdapt' | Anah | **Non établi** : aucune source officielle trouvée qui exige le RGE ; une source commerciale l'affirme | — | [8] **(à vérifier)** |

## 3. Documents remis au client

- **Devis** : contenu commun (voir commun.md). Propre au métier : **surface en m² par pièce et par support** (sol, murs), **format et référence des carreaux**, **type de pose** (collée / scellée), **préparation du support** (ragréage, chape, primaire), **procédé d'étanchéité** (SPEC ou SEL, nom du procédé) en zone humide, **plinthes et joints** au mètre linéaire, **taux de chute** inclus ou non. Rien de cela n'est une mention légale : c'est ce qui évite les litiges (réf. des DTU [9] **[résumé]**).
- **Devis pour MaPrimeAdapt'** : l'Anah a mis en place des **modèles types de devis et de facture** pour les échanges entre l'AMO et les entreprises (CAPEB, nov. 2023) [10] **[résumé]**. Contenu non lu **(à vérifier)**.
- **Facture pour MaPrimeAdapt'** : à la fin des travaux, le client transmet à l'Anah **la facture des artisans** pour obtenir le versement [11] **[résumé]**.
- **Déchets de chantier** (gravats, ancien carrelage) : mention obligatoire au devis de rénovation (voir metier-btp.md § 2).
- **PV de réception** : fait courir les garanties (voir commun.md). Utile pour les supports d'étanchéité : y noter le procédé posé.
- Conservation : voir commun.md (10 ans pour l'artisan).

## 4. Obligations périodiques du client que l'artisan peut rappeler

| Obligation | Fréquence | Qui | Texte | Source |
|---|---|---|---|---|
| Aucune obligation légale trouvée | — | — | — | — |
| Entretien des joints silicone en douche (conseil) | quelques années | client | aucun texte : conseil de bonne pratique | (à vérifier ; non sourcé) |
| Fin d'occupation exigée par MaPrimeAdapt' | le logement reste occupé au moins 3 ans après les travaux | client | règles de l'Anah | [12] **[résumé, source commerciale — à vérifier]** |

## 5. TVA propre au métier

- **10 %** (CGI 279-0 bis) pour la pose dans un logement achevé depuis plus de 2 ans : cas courant (voir commun.md). **20 %** en neuf et dans les locaux non d'habitation.
- **Adaptation au handicap ou à l'âge (salle de bain PMR)** : **pas de 5,5 % général**. Une réponse ministérielle indique que les travaux d'accessibilité dans un logement de plus de 2 ans relèvent du **10 %** de l'article 279-0 bis [13] **[résumé]**.
  - **CGI 278-0 bis A** = rénovation énergétique seulement : ne s'applique pas à une douche de plain-pied.
  - **CGI 278-0 bis, A, 2°** (et non « 278-0 bis A ») : 5,5 % sur les **appareillages et équipements spéciaux** pour personnes handicapées, dont la **liste est limitative** (CGI ann. IV art. 30-0 B ; ascenseurs adaptés : art. 30-0 C) [13][14] **[résumé]**. Doctrine : BOI-TVA-LIQ-30-10-50 (non lu). Savoir si un siège de douche ou une barre d'appui listés, fournis et posés par le carreleur, passent à 5,5 % : **(à vérifier au texte)**. Ne jamais proposer 5,5 % par défaut pour une salle de bain PMR.
  - Logement locatif social : 5,5 % possible sur les travaux d'accessibilité (CGI 278 sexies) [13] **[résumé]** ; le carreleur y travaille rarement en direct.
- **Sous-traitance** : autoliquidation, facture HT (voir commun.md) — cas fréquent pour un carreleur.

## 6. Mentions particulières sur le devis et la facture

- Aucune mention légale propre au carrelage n'a été trouvée.
- Recommandé (preuve en cas de sinistre) : référence du **DTU** suivi (NF DTU 52.1 pose scellée, révisé en février 2020 ; NF DTU 52.2 pose collée, version de juin 2022, travaux neufs) [9] **[résumé]** et du **procédé d'étanchéité** avec son avis technique. Attention : la révision 2020 du DTU 52.1 exclut la pose scellée désolidarisée ou flottante sur les planchers intermédiaires des logements collectifs [9] **[résumé]** ; le DTU 52.2 vise les **travaux neufs** — en rénovation, le référentiel applicable est à vérifier **(à vérifier)**.
- Ne pas écrire « conforme au DTU » comme une affirmation : c'est une promesse contractuelle (règle du projet : pas d'affirmation invérifiable). Écrire « pose selon le NF DTU 52.2 » seulement si l'artisan le choisit.
- Situations de travaux (gros chantiers, sous-traitance) : voir metier-btp.md § 1 et la tâche `tva-situation` (la certification de TVA réduite d'une situation s'appuie sur le devis signé).

## 7. Aides du client et pièces que l'artisan fournit

**MaPrimeAdapt'** (Anah, depuis 2024) [11][12][15][16] :
- **Qui** : 70 ans et plus sans condition de GIR ; 60 à 69 ans avec un GIR de 1 à 6 ; personnes handicapées (taux d'incapacité d'au moins 50 % ou PCH) sans condition d'âge ; ménages **modestes** et **très modestes** seulement [15] **[résumé]**. Une délibération de l'Anah n° 2026-23 (juillet 2026) assouplirait la preuve du GIR pour les 60-69 ans à partir du 1er sept. 2026 **(à vérifier, source non officielle)**.
- **Combien** : 70 % (très modestes) ou 50 % (modestes) des travaux, plafond de **22 000 € HT** de travaux [15] **[résumé, economie.gouv.fr]**.
- **Comment** : un **AMO** agréé ou habilité par l'Anah fait un **diagnostic autonomie** et suit le projet ; demande **avant** le début des travaux ; facture des artisans transmise à l'Anah pour le versement [11][15] **[résumé]**. Plusieurs sites disent qu'un **devis signé avant l'accord** rend le projet inéligible [12] **(à vérifier : source commerciale)**. Le guichet aurait été fermé ou rouvert selon les périodes : vérifier l'état du guichet avant d'en parler au client [15] **(à vérifier)**.
- **Travaux** : remplacement d'une baignoire par une douche de plain-pied, barres d'appui, siège de douche, sol antidérapant, rehaussement des WC [12] **[résumé, source commerciale — liste Anah à vérifier]**.
- **Ce que l'artisan fournit** : un devis détaillé (modèle Anah s'il existe, voir § 3) remis à l'AMO, puis la facture finale. Qualification exigée de l'entreprise : **non établie** [8] **(à vérifier)**.

**Crédit d'impôt « autonomie » (CGI 200 quater A, 25 %)** : prorogé jusqu'au 31 déc. 2025 par la loi de finances pour 2024 [17] **[résumé]** ; **supprimé pour les dépenses payées à partir du 1er janvier 2026** selon service-public cité par un site de presse, MaPrimeAdapt' devenant l'aide de référence [18] **[résumé, sources divergentes — à vérifier]**. Ne plus le citer sur un devis de 2026. Des dépenses payées en 2025 se déclarent encore en 2026.

## 8. Le terrain : problèmes concrets et ce qu'un logiciel simple devrait faire

Problèmes réels :
- Le métré se fait sur place, pièce par pièce ; la chute (coupes) change le prix ; le client compare des devis au m² sans voir la préparation du support.
- Le désordre grave vient de l'eau (douche à l'italienne) : en cas de sinistre, l'artisan doit prouver quel procédé il a posé, et selon quel référentiel.
- En sous-traitance : facture HT avec autoliquidation, situations mensuelles, retenue de garantie, paiement tardif.
- Salle de bain PMR : le client âgé ne connaît pas MaPrimeAdapt' ; l'artisan qui fait signer trop tôt peut lui faire perdre l'aide ; le dossier passe par un AMO qui demande un devis à un format précis.
- TVA : la tentation d'un 5,5 % « handicap » qui n'existe pas pour les travaux.

Propositions :

| Priorité | Proposition | Effort | Risque juridique |
|---|---|---|---|
| Indispensable | Modèle de devis « carrelage » : lignes par pièce et par support (m²), préparation, étanchéité (SPEC / SEL, champ « procédé »), plinthes (ml), taux de chute affiché | S | Faible |
| Indispensable | Garde-fou TVA : pas de 5,5 % proposé pour une ligne de carrelage ou de douche ; 10 % ou 20 % selon logement (règle commune) | S | Faible (prudent) |
| Indispensable | Devis « pour MaPrimeAdapt' » : **avertissement** (pas de blocage) tant que l'artisan n'a pas coché « accord de l'Anah reçu » ; phrase neutre : « Devis remis pour une demande d'aide ; à signer après l'accord de l'aide. » | M | Moyen : la règle de l'Anah sur la signature avant accord n'est pas établie ; avertissement plutôt que blocage |
| Utile | Fiche « travaux réalisés » jointe à la facture : procédé d'étanchéité, référence de l'avis technique, photos avant fermeture (horodatées) | M | Faible ; sert la preuve |
| Utile | Sous-traitance : rappel du parcours commun (autoliquidation, situations, retenue de garantie) depuis le devis d'un client « entreprise » | S | Voir commun.md |
| Plus tard | Export du devis au modèle type de l'Anah, une fois ce modèle lu | M | Moyen (format officiel) |
| Plus tard | Conseils d'entretien des joints remis avec la facture (sans promesse de garantie) | S | Faible |

## Sources

1. Code APE / NAF 4333Z — https://www.legalnest.fr/code-ape-naf/4333Z — consulté le 03/11/2026 — (à vérifier : source non officielle)
2. Cass. civ. 3e, 3 mai 2018, n° 17-14.767 — https://juridoc.gouv.nc/juridoc/jdjuris.nsf/b48ade70d0b327764b2583fc001055f7/$file/cass_civ_17-14767_03052018.pdf — consulté le 03/11/2026 — [résumé]
3. Revirement sur les éléments d'équipement (Cass. 3e civ., 21 mars 2024 ; 13 juil. 2022) — https://www.lemondedudroit.fr/droit-civil/280-immobilier-construction/92065-garantie-decennale-des-construteurs-revirement-jurisprudentiel-sur-les-elements-d-equipements.html — consulté le 03/11/2026 — [résumé]
4. ANIL, Responsabilité décennale et élément d'équipement non destiné à fonctionner — https://www.anil.org/jurisprudences-responsabilite-decennale-element-equipement-non-destine-fonctionner/ — consulté le 03/11/2026 — [résumé]
5. AQC, fiche pathologie F.03, douches carrelées à l'italienne — https://qualiteconstruction.com/wp-content/uploads/2024/01/fi-pathologie-batiment-f03-degradations-eau-douches-carreles-italienne.pdf — consulté le 03/11/2026 — [résumé]
6. FFB, BAM n° 58, « SPEC et SEL, deux procédés à ne pas confondre » — https://www.ffbatiment.fr/revues-guides/bam/58-mars-2020/spec-et-sel-deux-procedes-a-ne-pas-confondre — consulté le 03/11/2026 — [résumé]
7. Assurup, assurance paysagiste / sous-traitant — https://www.assurup.com/activities/paysagiste — consulté le 03/11/2026 — (à vérifier : source commerciale)
8. Certyneo, mandat MaPrimeAdapt' — https://certyneo.com/en/signer-mandat-maprimeadapt-en-ligne — consulté le 03/11/2026 — (à vérifier : source commerciale)
9. FFB, champ d'application restreint pour la pose scellée ; calepin NF DTU 52.2 — https://www.ffbatiment.fr/techniques-batiment/amenagement-finitions/carrelage-chapes/dossier-bam/champ-d-application-restreint-pour-la-pose-scellee et https://www.ffbatiment.fr/techniques-batiment/amenagement-finitions/carrelage-chapes/calepin/calepin-pose-collee-ceramiques-sols — consulté le 03/11/2026 — [résumé]
10. CAPEB, infographie MaPrimeAdapt' (nov. 2023) — https://www.capeb.fr/www/capeb/media/po/document/infographie-ma-prime-adapt-nov-2023.pdf — consulté le 03/11/2026 — [résumé]
11. justice.fr, MaPrimeAdapt' — https://www.justice.fr/fiche/maprimeadapt-travaux-adaptation-logement-perte-autonomie — consulté le 03/11/2026 — [résumé]
12. MaPrimeAdapt' 2026, travaux et conditions — https://www.laprimeenergie.fr/les-aides/ma-prime-adapt — consulté le 03/11/2026 — (à vérifier : source commerciale)
13. Question écrite AN n° 92741 (14e législature), TVA et accessibilité — https://questions.assemblee-nationale.fr/q14/14-92741QE.htm — consulté le 03/11/2026 — [résumé]
14. BOFiP, actualité sur les équipements spéciaux et ascenseurs — https://bofip.impots.gouv.fr/bofip/11880-PGP.html/identifiant=BOI-RES-TVA-000047-20210309 — consulté le 03/11/2026 — [résumé]
15. economie.gouv.fr, MaPrimeAdapt' : tout savoir (21/05/2026) — https://www.economie.gouv.fr/particuliers/gerer-mon-argent/beneficier-daides-et-de-reductions-dimpots/maprimeadapt-tout-savoir — consulté le 03/11/2026 — [résumé]
16. Kohen Avocats, MaPrimeAdapt' 2026 et GIR — https://kohenavocats.fr/2026/07/31/maprimeadapt-2026-gir-infirmier-ergotherapeute-refus-recours/ — consulté le 03/11/2026 — (à vérifier)
17. impots.gouv.fr, Aide à la personne — https://www.impots.gouv.fr/particulier/aide-la-personne — consulté le 03/11/2026 — [résumé]
18. SeniorActu, crédit d'impôt 2026, dernière année — https://www.senioractu.com/Impots-2026-jusqu-a-2-500-de-credit-d-impot-rembourse-%E2%80%94-mais-c-est-la-derniere-annee-pour-le-reclamer_a27411.html — consulté le 03/11/2026 — (à vérifier : sources divergentes)

## Relecture juriste-btp

Relue par juriste-btp le 03/11/2026, sans texte officiel ouvert (avis : `avis-juriste-2026-11-03.md`). Corrections appliquées. Restent à vérifier au texte :
- règle de l'Anah sur le devis signé avant l'accord de MaPrimeAdapt' ;
- sort du crédit d'impôt 200 quater A en 2026 (ne pas l'imprimer) ;
- TVA d'une salle de bain PMR (10 % / 5,5 %, ann. IV 30-0 B).
