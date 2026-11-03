# Frigoriste et climaticien — ce que Mallettico doit savoir

> Recherche du 03/11/2026 (session cloud « metiers »). Sources lues par moteur de recherche : textes officiels non ouverts,
> tout est à relire au texte avant de coder une règle bloquante. Relecture juriste-btp : voir la fin du fichier.

**Codes NAF** : 43.22B (travaux d'installation d'équipements thermiques et de climatisation) donné par plusieurs sites [6, 30] ; la maintenance seule peut relever d'un autre code (33.12Z ou 33.20A cités sans source officielle, **(à vérifier)** sur insee.fr).
**Variantes couvertes** : climaticien (climatiseurs et pompes à chaleur air-air chez les particuliers), frigoriste (froid commercial : chambres froides, vitrines, groupes), installateur de PAC air-eau (pour la partie fluides seulement ; le chauffage relève de la fiche chauffagiste).

Règles transverses (TVA 20/10/5,5, devis obligatoire en dépannage et entretien, contrat hors établissement, décennale, garanties) : voir `commun.md`. Ne figure ici que ce qui est propre au métier.

## 1. Assurances

- **Décennale** : la pose d'un climatiseur ou d'une PAC est un travail sur un équipement du bâtiment ; régime général, voir `commun.md`. L'activité « génie climatique » doit figurer sur l'attestation d'assurance (nomenclature de l'assureur). Pas de règle propre trouvée.
- **Entretien, dépannage, contrôle d'étanchéité seuls** : pas de travaux de construction, donc en principe hors décennale (voir `commun.md`) ; RC pro conseillée pour le risque de fuite de fluide ou de dégât des eaux (condensats). Aucune source propre au métier **(à vérifier)**.

## 2. Qualifications et ce qu'elles ouvrent au client

| Qualification | Organisme | Obligatoire ? | Ce qu'elle permet au client | Source |
|---|---|---|---|---|
| **Attestation de capacité** (entreprise), catégories I à V | Organisme agréé par l'État (liste sur le site du ministère ; vérification sur SYDEREP de l'ADEME) | **Oui** pour toute manipulation de fluide (mise en service, charge, récupération, contrôle d'étanchéité) | Fluides achetés et manipulés légalement ; fiche d'intervention valable | C. env. R543-99 [1, 5] [résumé] |
| **Attestation d'aptitude** (chaque technicien) | Organisme évaluateur certifié ; délivrée aussi avec certains titres professionnels | **Oui** : l'entreprise n'obtient sa capacité que si son personnel est apte | — | C. env. R543-106 [31] [résumé] |
| Qualification artisanale (CAP, BEP ou 3 ans d'expérience) | CMA | **Oui** : « climaticien » figure parmi les métiers de la catégorie « réseaux et équipements utilisant les fluides… » | — | C. artisanat L121-1 [30] [résumé] |
| **RGE QualiPAC** | Qualit'EnR | Non | Condition des aides (CEE, MaPrimeRénov' en rénovation d'ampleur) pour une PAC | [29] [résumé] (à vérifier sur france-renov.gouv.fr) |
| Inspecteur certifié (systèmes > 70 kW) | Organisme accrédité | Oui pour faire l'inspection | Rapport d'inspection valable | arrêté du 24 juil. 2020 [19] [résumé] |

**Catégories de l'attestation de capacité** (arrêté du 30 juin 2008) : catégorie I = contrôle d'étanchéité, maintenance, assemblage, mise en service et récupération sur **tous** les équipements [1] ; catégorie III = récupération sur des équipements de moins de 2 kg ; les catégories III et IV ne reçoivent pas de fluide neuf [2] ; catégorie V = peut être limitée aux véhicules hors d'usage [3]. Le détail des catégories II et IV n'apparaît pas dans les résumés **(à vérifier)**.

**Validité** : 5 ans, d'après un exemple d'attestation (08/09/2019 → 07/09/2024) [4] ; non vu dans un texte officiel **(à vérifier)**. Un projet d'arrêté de 2025 évoque une **attestation de remise à niveau** à obtenir avant le 12 mars 2029 au titre du règlement (UE) 2024/2215 [3] : statut au Journal officiel non confirmé **(à vérifier)**.

## 3. Documents remis au client

### Fiche d'intervention (CERFA n° 15497*04)
- **Quand** : à chaque opération qui touche au fluide (charge, récupération, mise en service, contrôle d'étanchéité, démantèlement) [8, 9].
- **Version en vigueur** : **15497*04**, depuis le 6 juillet 2024 (arrêté du 29 mai 2024 modifiant l'arrêté du 29 févr. 2016, art. 11) [6, 7] [résumé]. Une inspection a reproché à un opérateur d'utiliser encore la version 03 [6]. Un site non officiel annonce une version 05 **(à vérifier)**.
- **Contenu** (notice CAPEB) [8] [résumé] : cadres 1 à 4 toujours remplis (opérateur et son n° d'attestation de capacité, détenteur, équipement, adresse) ; cadres 5 à 11 = l'intervention, dont le contrôle d'étanchéité ; cadres 12 et 13 seulement si l'intervention produit un déchet de fluide. Les rubriques chiffrées (quantités chargées, récupérées) ne sont pas détaillées dans les résumés : **lire le formulaire avant de coder**.
- **Signature** : l'opérateur signe ; le détenteur signe aussi, **sauf** si la charge est inférieure à 3 kg de HCFC ou 5 t éq. CO2 de HFC/PFC [8] [résumé].
- **Forme** : peut être électronique (C. env. R543-83) [8].
- **Conservation** : **5 ans** par l'opérateur **et** par le détenteur, à compter de l'intervention (C. env. R543-82) [9] [résumé].

### Attestation d'entretien des PAC et climatiseurs de 4 à 70 kW
- **Quand** : à l'entretien obligatoire, **tous les 2 ans** (C. env. R224-44 et s. ; arrêté du 24 juil. 2020 « entretien », art. 4 et annexe 3) [17, 18] [résumé]. Le ministère précise que R224-41-4 vise les chaudières, pas les PAC [17].
- **Contenu** : fixé par l'annexe 3 de l'arrêté (non lue) **(à vérifier)**.
- **Délai de remise, conservation** : rien trouvé d'officiel ; « 5 ans » vu sur un site commercial **(à vérifier)**.

### Rapport d'inspection (systèmes > 70 kW)
- Modèle de l'annexe 6 de l'arrêté du 24 juil. 2020 ; fait par un inspecteur certifié [19] [résumé]. Hors du cœur de cible (artisan chez des particuliers), mais concerne les frigoristes en froid commercial.

### Bordereau de suivi des déchets de fluides (BSFF)
- **Quand** : dès qu'un fluide récupéré a le statut de déchet (il part en régénération ou destruction) [22].
- **Comment** : **dématérialisé sur Trackdéchets**, obligatoire depuis le **1er janvier 2023** (arrêté du 26 juil. 2022) [21, 22] [résumé] ; l'opérateur qui récupère le fluide en maintenance ou démontage est émetteur [22]. Mallettico ne doit pas le produire : Trackdéchets est l'outil public.

## 4. Obligations périodiques du client que l'artisan peut rappeler

| Obligation | Fréquence | Qui | Texte | Source |
|---|---|---|---|---|
| Contrôle d'étanchéité | ≥ 5 t éq. CO2 de HFC (ou ≥ 1 kg de HFO, compté en kg) : seuil de déclenchement. **5 à 50 t** : 12 mois, 24 mois avec détection de fuites. Au-delà : 6 mois et 3 mois cités sans confirmation au texte | Le détenteur fait faire, par un opérateur attesté | Règl. (UE) 2024/573, art. 5 | [10, 11, 12, 14] [résumé] ; tranches au-delà de 50 t **(à vérifier)** sur EUR-Lex |
| Vérification du système permanent de détection de fuites | 12 mois | Détenteur | arrêté du 29 févr. 2016 | [14] [résumé] |
| Système de détection de fuites obligatoire | dès 500 t éq. CO2 (ou 100 kg de HFO) | Détenteur | Règl. 2024/573, art. 6 | [10, 13] [résumé] |
| Entretien PAC / climatiseur 4 à 70 kW | 2 ans | Propriétaire ou exploitant | C. env. R224-44 et s. ; arrêté du 24 juil. 2020 | [17, 18] [résumé] |
| Inspection > 70 kW | ≤ 5 ans (première dans les 5 ans de l'installation) | Propriétaire ou exploitant | décret 2020-912 ; C. env. R224-45 et s. | [19] [résumé] ; une fiche FFB cite encore un ancien seuil de 12 kW [20] (à vérifier) |

**Calcul** : t éq. CO2 = charge en kg × PRG du fluide ÷ 1 000 (règl. 2024/573, art. 3) [12]. Ordre de grandeur pour un mono-split résidentiel : souvent sous 5 t éq. CO2, donc pas de contrôle périodique obligatoire ; c'est une déduction, à faire vérifier par le calcul sur la charge réelle.

**Registre** : l'exploitant de l'équipement tient un registre (arrêté du 29 févr. 2016, art. 1er) [16] ; une inspection a reproché l'absence des dates et résultats de contrôle [14]. **Marques** : une marque « contrôle d'étanchéité » (aucune fuite) ou « défaut d'étanchéité » est apposée sur l'équipement ; contenu, taille et couleur fixés par l'arrêté [14] [résumé].

## 5. TVA propre au métier

- **PAC air-air (climatiseurs réversibles fixes) : 5,5 % depuis le 18 juillet 2026**, sous conditions. Base : CGI art. 278-0 bis A modifié par la loi de finances pour 2026 ; arrêté du 13 juillet 2026 (JO du 17 juil.) qui fixe les performances [23, 26] [résumé].
  - Logement à usage d'habitation achevé depuis plus de 2 ans [24].
  - Puissance ≤ 12 kW : classe ≥ **A+** en multi-split, ≥ **A++** en mono-split, en chaud (SCOP) **et** en froid (SEER) [24, 23] ; seuils propres au-delà de 12 kW (non lus) ; critères F-Gas et de connectivité cités [27] **(à vérifier)**.
  - Couvre fourniture et pose, et l'entretien et la réparation selon la FFB et la CAPEB [25, 24] ; un site dit que la pose reste à 10 % [27] **(à vérifier : sources divergentes)**.
  - Un second arrêté du 14 août 2026 est cité par la FFB [25] : contenu non lu **(à vérifier)**.
- **Climatiseur non réversible, ou réversible hors critères** : avant cette réforme, fourniture à 20 % (gros équipement, CGI ann. IV art. 30-00 A) et pose à 10 % [23 via résumé] **(à vérifier)**. Les sources se contredisent sur le point de départ (20 % ou 10 %).
- **Froid commercial** (client professionnel) : 20 %, autoliquidation en sous-traitance : voir `commun.md`.
- Conséquence pour l'app : le taux dépend **du matériel** (classe énergétique), pas seulement du logement. Un sélecteur « PAC air-air éligible 5,5 % » sans vérification des classes serait un risque fiscal pour l'artisan.

## 6. Mentions particulières sur le devis et la facture

- N° d'**attestation de capacité** et organisme : figure sur la fiche d'intervention [8] ; aucun texte trouvé qui l'impose sur le devis ou la facture **(à vérifier)**. Utile en confiance client.
- Fluide (désignation, ex. R32), **charge en kg** et équivalent CO2 : imposés sur l'étiquette de l'équipement par le règlement F-Gas (non lu) ; sur le devis, utile pour le client et pour le calcul du contrôle d'étanchéité **(à vérifier)**.
- **TVA 5,5 % PAC air-air** : la certification du client (régime commun, voir `commun.md`) ; préciser sur le devis la référence de l'équipement et ses classes SCOP/SEER pour justifier le taux [24] **(à vérifier au texte de l'arrêté)**.
- **Aides** : si le devis sert à une prime CEE, mentions RGE et caractéristiques exigées par la fiche CEE (non lues) **(à vérifier)**.

## 7. Aides du client et pièces que l'artisan fournit

- **MaPrimeRénov'** : la PAC air-air n'est **pas** aidée seule ; seulement dans une rénovation d'ampleur (parcours accompagné) selon plusieurs sites [28] (non officiel, **(à vérifier)** sur france-renov.gouv.fr).
- **CEE** (prime énergie) : PAC air-air éligible, sans bonification « Coup de pouce chauffage » [28] [résumé] ; l'artisan fournit devis et facture conformes à la fiche CEE et sa qualification RGE.
- **Éco-PTZ** : sources contradictoires pour l'air-air **(à vérifier)**.
- **TVA 5,5 %** : la certification du client, et la preuve des classes énergétiques (fiche produit).

## 8. Le terrain : problèmes concrets et ce qu'un logiciel simple devrait faire

Aucun retour de frigoriste n'est écrit dans le dépôt. Problèmes déduits des textes :
- La fiche d'intervention CERFA se remplit souvent à la main, en double, et doit être gardée 5 ans par les deux parties ; une version périmée est relevée en inspection [6].
- Le calcul « charge × PRG » et la fréquence de contrôle qui en découle sont faits de tête ; le contrôle suivant est oublié.
- La TVA 5,5 % sur PAC air-air depuis juillet 2026 dépend du matériel : erreur facile, redressement possible.
- Les modèles de devis existants (`src/lib/data/modeles/chauffage.js` : « PAC air/air monosplit », « multisplit ») ne disent rien du taux ni du fluide.

| Proposition | Priorité | Effort | Risque juridique |
|---|---|---|---|
| **Paramètres** : n° d'attestation de capacité, catégorie, organisme, date de fin de validité, avec alerte avant l'échéance (comme la décennale) | Indispensable | S | Faible (donnée de l'artisan) |
| **Fiche équipement du client** (comme les appareils du ramonage) : type, marque, modèle, fluide, charge kg, t éq. CO2 calculée, classes SCOP/SEER | Indispensable | M | Faible si le PRG vient d'une table sourcée et datée |
| **Rappel du prochain contrôle ou entretien**, calqué sur `rappelsDus` du ramonage (12/24 mois ou 2 ans pour l'entretien 4-70 kW), même mécanique de refus (CPCE L34-5, voir cadrage ramonage) | Utile | M (réutilise le ramonage) | Moyen : tranches > 50 t à relire sur EUR-Lex ; ne jamais écrire « obligatoire » si la charge est sous le seuil |
| **Aide au taux 5,5 % PAC air-air** : case « classes A+/A++ vérifiées », référence produit imprimée ; sinon 10 % pose / 20 % fourniture | Utile | S | Élevé : à relire au texte de l'arrêté du 13 juil. 2026 (et du 14 août) avant de coder |
| **Fiche d'intervention** générée depuis la saisie, au format exact du CERFA 15497*04, signée sur le téléphone par l'opérateur et le détenteur, figée et numérotée comme l'attestation de ramonage | Plus tard | L | Élevé : reproduire un CERFA impose sa mise en page et sa version ; lire le formulaire et sa notice ; vérifier si un équivalent électronique doit reprendre tous les cadres |
| Attestation d'entretien 4-70 kW (annexe 3) | Plus tard | M | Moyen : annexe non lue |
| BSFF : lien vers Trackdéchets, pas de génération | Plus tard | S | Faible |

## Sources

1. Annexe 1 de l'arrêté du 30 juin 2008 (attestations de capacité, R543-99) — https://content.preventionbtp.fr/pdf/droit_de_la_prevention/annexe-1-de-l-arrete-du-30-juin-2008-relatif-a-la-delivrance-des-attestations-de-capacite-aux-operateurs-prevues-a-l-article-r543-99-du-code-de-l-environnement.pdf — consulté le 03/11/2026 — [résumé]
2. AIDA (INERIS), arrêté du 30 juin 2008, catégories III et IV — https://aida.ineris.fr/node/31093 — consulté le 03/11/2026 — [résumé]
3. AIDA (INERIS), catégorie V et projet d'arrêté 2025 (remise à niveau avant le 12/03/2029) — https://aida.ineris.fr/node/45024 — consulté le 03/11/2026 — (à vérifier)
4. Exemple d'attestation de capacité (validité 5 ans) — https://www.groupe-acorus.fr/wp-content/uploads/2023/05/ACORUS-Collegien-Attestation-capacite-Quali-Clima-Froid-07.09.2024.pdf — consulté le 03/11/2026 — (à vérifier)
5. Géorisques, rapport d'inspection (vérification sur SYDEREP) — https://www.georisques.gouv.fr/webappReport/ws/installations/inspection/6yg4hFYTHrOH1qqfwKiZJHE6FPXEVdKR — consulté le 03/11/2026 — [résumé]
6. CAPEB, « Fluides frigorigènes : nouvelle fiche d'intervention » (CERFA 15497*04, 6 juil. 2024) — https://www.capeb.fr/actualites/fluides-frigorigenes-nouvelle-fiche-d-intervention-usl7vp — consulté le 03/11/2026 — [résumé]
7. AIDA (INERIS), arrêté du 29 mai 2024 modifiant l'arrêté du 29 févr. 2016 — https://aida.ineris.fr/reglementation/arrete-290524-modifiant-larrete-29-fevrier-2016-relatif-a-certains-fluides — consulté le 03/11/2026 — [résumé]
8. CAPEB, notice de la fiche d'intervention — https://capeb.fr/www/capeb/media/var/document/notice%20fiche%20d%20intervention%20fluides%20frigorigenes.pdf — consulté le 03/11/2026 — [résumé]
9. Code de l'environnement, art. R543-82 (OPPBTP) — https://content.preventionbtp.fr/pdf/droit_de_la_prevention/article-r543-82-du-code-de-l-environnement.pdf — consulté le 03/11/2026 — [résumé]
10. EPA Irlande, présentation F-gas (seuils 5/50/500 t, détection) — https://www.epa.ie/publications/compliance--enforcement/climate-change/Department_EPA_Fgas_Overview_Presentation.pdf — consulté le 03/11/2026 — [résumé]
11. Ministère de l'environnement finlandais, obligations du détenteur (5-50 t : 12/24 mois) — https://www.environment.fi/fi-FI/Ilmasto_ja_ilma/Kasvihuonekaasupaastojen_raportointi_ja_seuranta/Kasvihuonekaasupaastojen_seuranta_Suomessa/Fluoratut_kasvihuonekaasut/Laitteen_omistajan_velvollisuudet — consulté le 03/11/2026 — [résumé]
12. Calculateur t éq. CO2 et périodicité (règl. 2024/573, art. 3 et 5) — https://travail-industrie.com/outils/calculateur-teqco2-controle-etancheite — consulté le 03/11/2026 — (à vérifier)
13. abcclim, calcul des fréquences de contrôle — https://www.abcclim.net/calc-f-gas-calcul-de-frequences-tests-etancheites.html — consulté le 03/11/2026 — (à vérifier)
14. DREAL Occitanie, présentation fluides frigorigènes (fréquences 3/6/12/24 mois, détecteurs, marques) — https://www.occitanie.developpement-durable.gouv.fr/IMG/pdf/20250319-presentationfff-da-pluscomplete.pdf — consulté le 03/11/2026 — [résumé]
15. FFB, « Gaz fluorés : rappel des dispositions essentielles du règlement F-Gas III » — https://www.ffbatiment.fr/actualites-batiment/actualite-bam/gaz-fluores-rappel-dispositions-essentielles-reglement-europeen-f-gas-iii — consulté le 03/11/2026 — [résumé]
16. AIDA (INERIS), arrêté du 29 févr. 2016 (registre) — https://aida.ineris.fr/reglementation/arrete-290216-relatif-a-certains-fluides-frigorigenes-gaz-a-effet-serre-fluores — consulté le 03/11/2026 — [résumé]
17. Ministère de la Transition écologique, FAQ inspection et entretien chauffage et climatisation — https://www.ecologie.gouv.fr/sites/default/files/documents/FAQ%20Inspection%20entretien%20chauffage%20et%20clim.pdf — consulté le 03/11/2026 — [résumé]
18. Arrêté du 24 juil. 2020 (entretien 4-70 kW), art. 4 — https://content.preventionbtp.fr/pdf/droit_de_la_prevention/article-4-de-l-arrete-du-24-juillet-2020-relatif-a-l-entretien-des-systemes-thermodynamiques-dont-la-puissance-nominale-est-comprise-entre-4-kw-et-70-kw.pdf — consulté le 03/11/2026 — [résumé]
19. Weblex, inspection périodique des PAC (> 70 kW, 5 ans, inspecteur certifié) — https://www.weblex.fr/weblex-actualite/artisans-le-point-sur-linspection-periodique-des-pompes-a-chaleur — consulté le 03/11/2026 — [résumé]
20. FFB, entretien des PAC > 12 kW (ancien seuil) — https://www.ffbatiment.fr/techniques-batiment/equipements-techniques/chauffage-ventilation-climatisation/dossier/l-entretien-des-pompes-a-chaleur — consulté le 03/11/2026 — (à vérifier)
21. DREETS Auvergne-Rhône-Alpes, Trackdéchets (BSFF obligatoire au 1er janv. 2023) — https://auvergne-rhone-alpes.dreets.gouv.fr/sites/auvergne-rhone-alpes.dreets.gouv.fr/IMG/pdf/02_trackdechets.pdf — consulté le 03/11/2026 — [résumé]
22. Arrêté du 26 juil. 2022 relatif aux bordereaux de suivi des déchets de fluides frigorigènes (OPPBTP) — https://content.preventionbtp.fr/pdf/droit_de_la_prevention/arrete-du-26-juillet-2022-relatif-aux-bordereaux-de-suivi-des-dechets-dangereux-de-fluides-frigorigenes-et-autres-dechets-dangereux-de-fluides-en-contenants-sous-pression.pdf — consulté le 03/11/2026 — [résumé]
23. JORF du 17 juil. 2026, arrêté du 13 juil. 2026 (TVA 5,5 % PAC air-air), copie CAPEB — https://www.capeb.fr/www/capeb/media//aube/document/joe_20260717_0165_0039_TVA%20à%205,5%20PAC%20RR.pdf — consulté le 03/11/2026 — [résumé]
24. CAPEB, « TVA à 5,5 % : le taux réduit s'applique désormais à certaines PAC air-air » et FAQ — https://www.capeb.fr/actualites/tva-a-5-5-le-taux-reduit-s-applique-desormais-a-certaines-pac-air-air ; https://www.capeb.fr/actualites/tva-a-5-5-sur-les-pac-precisions-et-questions-reponses — consulté le 03/11/2026 — [résumé]
25. FFB, « TVA au taux réduit de 5,5 % sur les pompes à chaleur air/air » (arrêté du 14 août 2026 cité) — https://www.ffbatiment.fr/gestion-entreprise/comptabilite-banque-assurances/fiscalite-impots/dossier/tva-pac-air-air-5,-d-,5-comment-savoir — consulté le 03/11/2026 — [résumé]
26. Fiscalonline, taux réduit PAC air-air, CGI 278-0 bis A — https://fiscalonline.com/Ecologie/taux-reduit-tva-pompes-chaleur-air-air-criteres-performance-durabilite — consulté le 03/11/2026 — (à vérifier)
27. Bourse Inside, TVA 5,5 % climatisation (main-d'œuvre à 10 %, critères F-Gas et connectivité) — https://bourseinside.fr/?p=11418 — consulté le 03/11/2026 — (à vérifier)
28. CAPEB, « Rappel : les PAC air-air sont éligibles aux CEE » ; Hellowatt, MaPrimeRénov' PAC 2026 — https://www.capeb.fr/actualites/rappel-les-pompes-a-chaleur-air-air-sont-eligibles-aux-certificats-deconomies-denergie-cee ; https://www.hellowatt.fr/prime-energie/ma-prime-renov/pompe-a-chaleur — consulté le 03/11/2026 — (à vérifier)
29. Qualit'EnR, annuaire QualiPAC ; Portail auto-entrepreneur, QualiPAC — https://www.qualit-enr.org/?p=260380 ; https://www.portail-autoentrepreneur.fr/academie/statut-auto-entrepreneur/qualipac — consulté le 03/11/2026 — (à vérifier)
30. Bpifrance Création, activités artisanales réglementées (climaticien) — https://bpifrance-creation.fr/encyclopedie/trouver-proteger-tester-son-idee/definir-nature-son-activite/activites-artisanales-0 — consulté le 03/11/2026 — [résumé]
31. Code de l'environnement, art. R543-106 (OPPBTP) — https://content.preventionbtp.fr/pdf/droit_de_la_prevention/article-r543-106-du-code-de-l-environnement-fluides-frigorigenes.pdf — consulté le 03/11/2026 — [résumé]

## Relecture juriste-btp

Non faite. Points à lui soumettre en priorité : TVA 5,5 % PAC air-air (arrêtés des 13 juil. et 14 août 2026, pose à 5,5 % ou 10 %) ; tranches de fréquence du contrôle d'étanchéité au-delà de 50 t éq. CO2 (règl. 2024/573, art. 5) ; reproduction électronique du CERFA 15497*04.
