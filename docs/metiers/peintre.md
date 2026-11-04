# Peintre (intérieur, façade, revêtements de sols et murs) — ce que Mallettico doit savoir

> Recherche du 03/11/2026 (session cloud « metiers »). Sources lues par moteur de recherche : textes officiels non ouverts,
> tout est à relire au texte avant de coder une règle bloquante. Relecture juriste-btp : voir la fin du fichier.

**Codes NAF** : 43.34Z (travaux de peinture et vitrerie), 43.33Z (travaux de revêtement des sols et des murs) — à vérifier sur insee.fr, non recherchés dans cette session.
**Variantes couvertes** : peinture intérieure décorative, papiers peints et toiles, ravalement et peinture de façade (dont imperméabilité), revêtements de sols souples (PVC, moquette, linoléum).

Règles transverses (TVA, certification sur devis ou facture, décennale et attestation jointe, dépannage, hors établissement, déchets) : voir `commun.md` et `docs/metier-btp.md` §§ 2, 4. Ci-dessous, seulement ce qui est propre au métier.

## 1. Assurances

- **Peinture intérieure décorative** : en principe **hors décennale** : un revêtement purement esthétique ne touche ni la solidité ni la destination de l'ouvrage ; la jurisprudence la renvoie à la responsabilité contractuelle de droit commun [1][2][3]. Une RC pro suffit alors pour ces travaux (non obligatoire, voir `commun.md`). C'est le métier où l'option « non soumis » des Paramètres a le plus de sens, **mais seulement pour la peinture décorative**.
- **Façade : imperméabilisation, ravalement technique, étanchéité** : la jurisprudence est **nuancée**. Un enduit de façade est un ouvrage lorsqu'il remplit une fonction d'étanchéité, mais n'est pas un élément d'équipement (Cass. 3e civ., 16 févr. 2022, n° 20-20.988, cité par un commentaire) ; un arrêt du 13 févr. 2020 (n° 19-10.249) a été commenté comme admettant la décennale pour un enduit d'imperméabilisation [4][5][6]. Les assureurs classent la peinture de façade à fonction d'imperméabilité et le ravalement technique dans les activités décennales [3][7]. **Numéros d'arrêts à relire sur Judilibre.**
- **Isolation thermique par l'extérieur (ITE)** lors d'un ravalement : décennale (voir `plaquiste.md` pour l'isolation, et qualification Qualibat 7131).
- **Sols souples** : revêtement, en général traité comme la peinture (droit commun ou biennale selon sa nature) — **à vérifier**, non recherché.
- « I4 » (classe d'imperméabilité des revêtements de façade) : aucune source trouvée dans cette session ; ne pas l'utiliser comme critère dans l'app.
- Conclusion pour l'app : un même peintre peut être non soumis pour son intérieur et soumis pour ses façades. Le réglage actuel (« non soumis » pour toute l'entreprise) est trop grossier pour lui : il faudrait le déclarer **par devis** ou par type de travaux.

## 2. Qualifications et ce qu'elles ouvrent au client

| Qualification | Organisme | Obligatoire ? | Ce qu'elle permet au client | Source |
|---|---|---|---|---|
| Qualibat peinture / ravalement (codes non recherchés) | Qualibat | Non | Gage de qualité ; aucune aide publique liée à la seule peinture | Non recherché, **à vérifier** |
| Qualibat **7131** « Isolation thermique par l'extérieur », mention RGE « Isolation des murs par l'extérieur » | Qualibat | Non pour travailler ; oui pour les aides à l'ITE | CEE, éco-PTZ ; plus MaPrimeRénov' par geste pour les murs depuis le 1er janv. 2026 (voir `plaquiste.md` § 7) | [8] [résumé] |
| Plomb : aucun agrément exigé de l'entreprise de peinture trouvé ; le **CREP** est fait par un diagnostiqueur certifié | — | — | — | [9][10] [résumé] |

## 3. Documents remis au client

- **Devis et facture** : voir `commun.md`. Le peintre fait surtout du **dépannage et de l'entretien** (rafraîchir une pièce) : l'arrêté du 24 janv. 2017 s'applique (devis préalable, sans seuil).
- **Fiche technique et étiquette COV** des produits : l'étiquetage des émissions de polluants volatils (classes A+ à C) est obligatoire depuis le 1er sept. 2013 sur les peintures, vernis et revêtements de mur ou de sol à usage intérieur (décret n° 2011-321 du 23 mars 2011, arrêté du 19 avril 2011, modifié le 20 févr. 2012) ; l'obligation pèse sur le **fabricant**, qui l'appose sur le produit ou l'emballage [11][12][13]. Aucune obligation pour le peintre de la reporter sur son devis ; la citer (« peinture classée A+ ») est un argument, vrai seulement si l'artisan l'a vérifié.
- **CREP** : document du propriétaire (vente, location d'un logement d'avant 1949) ; l'entreprise qui fait des travaux devrait en recevoir une copie [9][14] (recommandation, non une obligation codée ici).

## 4. Obligations périodiques du client que l'artisan peut rappeler

| Obligation | Fréquence | Qui | Texte | Source |
|---|---|---|---|---|
| **Ravalement des façades** (maintenir en bon état de propreté) | Au moins tous les **10 ans**, à Paris et dans les communes inscrites sur une liste préfectorale | Propriétaire (souvent syndicat de copropriétaires) | CCH L126-1 à L126-6 (ex-L132-1 à L132-5 avant la recodification de 2021) | [15][16][17] [résumé] — numéro exact **à vérifier** |
| Procédure : injonction du maire, puis arrêté si rien n'est fait sous 6 mois, délai d'un an au plus ; exécution d'office avec autorisation du juge ; amende de 3 750 € citée | — | Mairie | Idem | [15][16][18] (à vérifier) |
| Isolation **embarquée** lors d'un ravalement important (voir § 6) | À chaque ravalement de plus de 50 % d'une façade | Propriétaire | Décret n° 2016-711, CCH R173-4 et s. (ex-R131-28-7) | [19][20][21] |

À retenir : le ravalement décennal est **le seul rappel périodique** de ce métier, et seulement dans les communes concernées (liste préfectorale à vérifier par l'artisan). C'est un bon rappel commercial vers les syndics : « dernier ravalement en 2017 → prochain avant 2027 ».

## 5. TVA propre au métier

- **10 % (CGI 279-0 bis)** : peinture, revêtements, ravalement d'un **logement achevé depuis plus de 2 ans** (voir `docs/metier-btp.md` § 4).
- **20 %** : logement neuf ou de moins de 2 ans, **locaux professionnels** (bureaux, commerces), parties d'un immeuble qui ne sont pas de l'habitation. Le cas de l'immeuble mixte (ravalement d'un immeuble avec commerces en rez-de-chaussée) : selon le juriste, la règle du BOFiP porte sur la part d'habitation (seuil de 50 %) **(à vérifier)**.
- **5,5 %** : seulement si le ravalement inclut une **isolation thermique** respectant les critères (ITE) ; la peinture elle-même n'est pas un travail d'amélioration énergétique (règle des travaux induits **à vérifier**).
- Un peintre a souvent des clients professionnels (agences, bureaux, syndics) : vérifier le taux par chantier, pas par client.

## 6. Mentions particulières sur le devis et la facture

- **Ravalement et isolation embarquée** : pour les devis signés à partir du 1er janv. 2017, un ravalement portant sur **plus de 50 % de la surface d'une façade hors baies** doit être accompagné d'une isolation thermique, sauf exceptions (impossibilité technique ou juridique, disproportion économique, bâtiments industriels, béton banché, bardages métalliques… ; c'est au demandeur de justifier l'exception) [19][20][21][22]. Un « ravalement important » est la réfection d'un enduit, ou le remplacement ou la pose d'un parement, sur au moins 50 % d'une façade hors ouvertures. Une peinture ou un nettoyage n'en est pas un. Numéros du CCH recodifié **à vérifier** (R173-4 à R173-7 ou R173-8 selon les sources ; ex-R131-28-7 et R131-28-9). L'obligation pèse sur le propriétaire ; l'artisan a un devoir de conseil (**à vérifier**).
- **Autorisation d'urbanisme** pour un ravalement (déclaration préalable dans certaines zones) et **occupation de la voirie** pour l'échafaudage (permis de stationnement ou de voirie demandé à la mairie) : non recherchés dans cette session, **à vérifier**. Pour le devis : qui fait la demande, qui paie la redevance d'occupation, durée prévue.
- **Plomb** : dans un logement construit **avant le 1er janv. 1949**, des peintures peuvent contenir du plomb ; le CREP est établi par un diagnostiqueur (CSP L1334-5 et s., R1334-10 et s. — articles exacts **à vérifier**)  [9][10][14]. Hors vente et location, le CREP préalable aux travaux ne vise que les parties communes d'un immeuble collectif d'habitation d'avant 1949, pour des travaux qui altèrent substantiellement les revêtements (CSP L1334-8 ; arrêté du 25 avr. 2006). Le décapage, le ponçage et le décapage thermique créent poussières et fumées de plomb [23]. Aucune interdiction générale du décapage n'a été trouvée ; les règles de prévention pour les salariés (C. trav.) et les travaux en parties communes (arrêté du 25 avril 2006) existent [24] — **à relire au texte**.
- **Amiante** : dans tout immeuble bâti (C. trav. R4412-97 ; arrêté du 16 juil. 2019, art. 3), le donneur d'ordre doit faire réaliser un repérage avant les travaux qui peuvent exposer à l'amiante, y compris pour poncer ou décaper certains revêtements, enduits ou dalles de sol ; il transmet au repéreur la date du permis de construire. La date du 1er juil. 1997 délimite les obligations du propriétaire au titre du code de la santé publique (R1334-14 et s.), pas le champ du repérage avant travaux (voir `macon.md` § 3 et `plaquiste.md` § 6).
- **Sols souples** : la dépose de vieilles dalles vinyles est un cas classique d'amiante (pratique, **à vérifier**) ; règles de pose NF DTU 53.2 (non recherché, **à vérifier**).
- **Métré** : surfaces de murs et plafonds, moins les ouvertures ou non, nombre de couches, préparation (lessivage, rebouchage, ponçage, sous-couche) : rien n'est imposé par un texte, mais le décompte détaillé (quantités, prix unitaires) l'est pour le dépannage et l'entretien (arrêté du 24 janv. 2017, voir `commun.md`).

## 7. Aides du client et pièces que l'artisan fournit

- **Peinture, papier peint, sols** : aucune aide publique trouvée.
- **Ravalement avec ITE** : CEE (fiche BAR-EN-102, **à vérifier**), éco-PTZ ; MaPrimeRénov' par geste ne finance plus les murs depuis le 1er janv. 2026, et le parcours par geste ne couvre plus que les pompes à chaleur depuis le 1er sept. 2026 (voir `plaquiste.md` § 7) [25][26]. En copropriété, MaPrimeRénov' Copropriété existe (non détaillée ici) [27].
- Pièces pour une ITE : RGE (mention « isolation des murs par l'extérieur »), R de l'isolant, surface, comme pour `plaquiste.md`.

## 8. Le terrain : problèmes concrets et ce qu'un logiciel simple devrait faire

**Problèmes réels**
1. **Petits chantiers, devis rapides** : une chambre à rafraîchir, un plafond taché. Le peintre fait 5 devis par semaine, souvent sur place, et en perd la moitié faute de les envoyer le jour même.
2. **Métré** : murs, plafonds, boiseries, radiateurs, linéaires de plinthes ; chacun compte à sa façon ; le client compare des devis incomparables (« m² au sol » contre « m² développés »).
3. **Litiges d'aspect** : teinte, traces de reprise, « ce n'était pas comme ça avant ». Sans photo de l'état initial, l'artisan ne peut rien prouver.
4. **Taux de TVA** : mêmes travaux à 10 % chez un particulier, 20 % dans un bureau ou un logement neuf.
5. **Décennale « non soumis » trop large** : le même peintre fait de l'intérieur (non soumis) et des façades (soumis).
6. **Ravalement** : syndics, délais d'injonction, échafaudage et voirie, isolation embarquée oubliée → litige avec la copropriété ou la mairie.
7. **Plomb et amiante** dans l'ancien : rarement abordés avant le devis.

**Propositions**

| Priorité | Proposition | Effort | Risque juridique |
|---|---|---|---|
| Indispensable | **Métré par pièce** (murs moins ouvertures, plafond, nombre de couches, préparation) qui produit les lignes du devis ; méthode de calcul imprimée (« surfaces développées, ouvertures déduites ») pour que le client compare. | M | Nul |
| Indispensable | **Devis rapide** depuis un modèle « rafraîchir une pièce » : pièce, dimensions, finition → devis prêt à signer sur place (décompte détaillé exigé par l'arrêté de 2017). | M | Faible (le décompte détaillé est déjà la règle) |
| Indispensable | **Photos avant / après** rattachées au devis et à la facture, horodatées, imprimables en annexe. | M | Faible ; preuve utile en cas de litige |
| Utile | **Décennale par devis** : « ces travaux sont-ils soumis ? », sans valeur par défaut : l'artisan choisit (D-24) ; l'attestation n'est jointe que si soumis. | M | Moyen : la qualification reste la responsabilité de l'artisan ; formulation à faire relire |
| Utile | **Alerte ravalement** : seulement pour une ligne de réfection d'enduit, ou de remplacement ou pose d'un parement, sur au moins 50 % d'une façade hors ouvertures (jamais pour une peinture ou un nettoyage), rappeler l'isolation embarquée et proposer une mention « isolation non retenue : motif … (à justifier par le propriétaire) ». | S | Moyen : textes à relire (R173-4 et s.) |
| Utile | Question **« logement d'avant 1949 ? »** sur le chantier (rappel CREP) et **question amiante** sur tout bâtiment existant (date du permis de construire demandée, comme `plaquiste.md` § 8) : repérage amiante avant travaux ; mention « document fourni / à fournir par le client ». | S | Moyen (ne jamais imprimer « sans plomb » ou « sans amiante ») |
| Plus tard | **Rappel de ravalement à 10 ans** pour les syndics, sur le modèle du ramonage (date du dernier ravalement → relance commerciale). | M | Faible si présenté comme un rappel ; jamais « obligatoire » hors des communes de la liste |
| Plus tard | Ligne « échafaudage et occupation de voirie » (durée, redevance refacturée) dans le modèle ravalement. | S | Faible |

## Sources

1. ANIL, construction / peinture / responsabilité de droit commun (jurisprudence 2002) — https://www.anil.org/documentation-experte/analyses-juridiques-jurisprudence/jurisprudence/jurisprudence-2002/construction-/-peinture-/-responsabilite-de-droit-commun/ — consulté le 03/11/2026 — [résumé]
2. Paperblog, peinture décorative et responsabilité contractuelle de droit commun — https://www.paperblog.fr/5098556/peinture-decorative-et-responsabilite-contractuelle-de-droit-commun/ — consulté le 03/11/2026 — (à vérifier)
3. Obat, assurance décennale peintre — https://www.obat.fr/blog/assurance-decennale-peintre/ — consulté le 03/11/2026 — (à vérifier)
4. ANIL, garantie décennale et enduit de façade — https://www.anil.org/jurisprudences-garantie-decennale-enduit-facade/ — consulté le 03/11/2026 — [résumé]
5. Gazette du Palais, un enduit de façade peut constituer un ouvrage lorsqu'il a une fonction d'étanchéité — https://www.labase-lextenso.fr/gazette-du-palais/2020-n22/un-enduit-de-facade-peut-constituer-un-ouvrage-lorsqu-il-a-une-fonction-d-etancheite-GPL380c9 — consulté le 03/11/2026 — [résumé]
6. Gazette du Palais, la nature décennale des travaux de ravalement détermine leur régime d'assurance (2022) — https://www.labase-lextenso.fr/gazette-du-palais/2022-n23/la-determination-de-la-nature-decennale-de-travaux-de-ravalement-de-facade-determine-leur-regime-d-assurance-GPL438i0 — consulté le 03/11/2026 — [résumé]
7. France Épargne, assurance décennale peintre — https://www.france-epargne.fr/products/assurance-decennale/assurance-decennale-peintre — consulté le 03/11/2026 — (à vérifier)
8. Certificat Qualibat RGE (exemple, 7131) — https://www.qualibat.com/pdf/get-certificate/dq_rge_786663 — consulté le 03/11/2026 — [résumé]
9. OPPBTP, CSP art. L1334-11 (CREP) — https://content.preventionbtp.fr/pdf/droit_de_la_prevention/article-l1334-11-du-code-de-la-sante-publique-constat-de-risque-d-exposition-au-plomb-crep.pdf — consulté le 03/11/2026 — [résumé]
10. OPPBTP, CSP art. R1334-13 (CREP) — https://content.preventionbtp.fr/pdf/droit_de_la_prevention/article-r1334-13-du-code-de-la-sante-publique-constat-de-risque-d-exposition-au-plomb-crep.pdf — consulté le 03/11/2026 — [résumé]
11. Ministère de la Transition écologique, étiquetage des produits de construction — https://www.ecologie.gouv.fr/politiques-publiques/etiquetage-produits-construction — consulté le 03/11/2026 — [résumé]
12. ANSES, étiquetage des produits de construction et de décoration au regard de l'émission de COV — https://www.anses.fr/fr/content/etiquetage-des-produits-de-construction-et-de-decoration-au-regard-de-lemission-de-cov — consulté le 03/11/2026 — [résumé]
13. DREAL Hauts-de-France, étiquetage des produits — https://www.hauts-de-france.developpement-durable.gouv.fr/IMG/pdf/etiquetage_produits.pdf — consulté le 03/11/2026 — [résumé]
14. Construires.fr, diagnostic plomb (CREP) : obligations — https://www.construires.fr/diagnostic-plomb-crep/ — consulté le 03/11/2026 — (à vérifier)
15. Service-public (fiche F640, ravalement) — https://sites.service-information-publique.fr/vias/guide-particuliers/F640.html — consulté le 03/11/2026 — [résumé]
16. Justice.fr, ravalement de façade d'un immeuble : fréquence — https://www.justice.fr/fiche/ravalement-facade-immeuble-frequence-realise — consulté le 03/11/2026 — [résumé]
17. Ville de Vincennes, club copro atelier 1 (CCH L126-1 à L126-6) — https://www.vincennes.fr/sites/default/files/2024-03/2024_03_19_club_copro_atelier1_vf.pdf — consulté le 03/11/2026 — [résumé]
18. PAP, un ravalement de façade imposé tous les dix ans — https://www.pap.fr/patrimoine/copropriete/le-ravalement-d-immeuble-qui-decide-qui-paie/a1160/un-ravalement-de-facade-impose-tous-les-dix-ans — consulté le 03/11/2026 — (à vérifier)
19. ANIL, obligation de travaux d'isolation thermique lors de travaux importants de rénovation (2016) — https://www.anil.org/documentation-experte/analyses-juridiques-jurisprudence/analyses-juridiques/analyses-juridiques-2016/obligation-de-travaux-disolation-thermique-lors-de-travaux-importants-de-renovation/ — consulté le 03/11/2026 — [résumé]
20. FFB, l'obligation d'isolation lors de rénovations importantes — https://www.ffbatiment.fr/techniques-batiment/reglementation-construction/reglementation-thermique-environnementale/dossier/obligation-d-isoler-lors-de-renovations-importantes — consulté le 03/11/2026 — [résumé]
21. ADEME, fiche ravalement, réfection de toiture, aménagement : travaux d'isolation (août 2023) — https://librairie.ademe.fr/ged/8078/fiche-ravalement-refection-toiture-amenagement-travaux-isolation-202308.pdf — consulté le 03/11/2026 — [résumé]
22. Ville de Paris, fiche travaux de ravalement — https://cdn.paris.fr/paris/2022/12/26/fiche-travaux-de-ravalement_remplissable-0emK.pdf — consulté le 03/11/2026 — [résumé]
23. FFB, prévenir le risque plomb lors de travaux — https://www.ffbatiment.fr/techniques-batiment/reglementation-construction/reglementation-amiante-plomb-silice/dossier/prevenir-risque-plomb-lors-de-travaux — consulté le 03/11/2026 — [résumé]
24. OPPBTP, arrêté du 25 avril 2006, travaux en parties communes nécessitant un CREP, art. 1er — https://content.preventionbtp.fr/pdf/droit_de_la_prevention/article-1er-de-l-arrete-du-25-avril-2006-relatif-aux-travaux-en-parties-communes-necessitant-l-etablissement-d-un-constat-de-risque-d-exposition-au-plomb.pdf — consulté le 03/11/2026 — [résumé]
25. economie.gouv.fr, MaPrimeRénov' parcours par geste — https://www.economie.gouv.fr/particuliers/faire-des-economies-denergie/maprimerenov-parcours-par-geste-la-prime-pour-la-renovation-energetique — consulté le 03/11/2026 — [résumé]
26. Hellowatt, réforme MaPrimeRénov' : isolation des murs exclue en 2026 — https://www.hellowatt.fr/blog/reforme-maprimerenov-isolation-murs-exclue-2026/ — consulté le 03/11/2026 — (à vérifier)
27. economie.gouv.fr, MaPrimeRénov' Copropriété — https://www.economie.gouv.fr/particuliers/faire-des-economies-denergie/maprimerenov-copropriete-tout-savoir-sur-laide-la-renovation-des-parties-communes — consulté le 03/11/2026 — [résumé]

## Relecture juriste-btp

Relue par juriste-btp le 03/11/2026, sans texte officiel ouvert (avis : `avis-juriste-2026-11-03.md`). Corrections appliquées. Restent à vérifier au texte :
- CSP L1334-8 et arrêté du 25 avr. 2006 (CREP avant travaux en parties communes) ;
- TVA d'un immeuble mixte (part d'habitation, seuil de 50 %) ;
- numéros du CCH recodifié : ravalement (L126-1 et s.) et isolation embarquée (R173-4 et s.) ;
- références des arrêts de 2020 et 2022 sur les enduits de façade ; urbanisme et voirie pour l'échafaudage.
