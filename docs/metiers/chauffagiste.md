# Chauffagiste (chaudière, pompe à chaleur, poêle et insert) — ce que Mallettico doit savoir

> Recherche du 03/11/2026 (session cloud « metiers »). Sources lues par moteur de recherche : textes officiels non ouverts,
> tout est à relire au texte avant de coder une règle bloquante. Relecture juriste-btp : voir la fin du fichier.

**Codes NAF** : 43.22B (travaux d'installation d'équipements thermiques et de climatisation) ; 43.22A pour le plombier-chauffagiste qui fait surtout de l'eau et du gaz — nomenclature NAF rév. 2 ; effet de la NAF 2025 non vérifié **(à vérifier)**.
**Variantes couvertes** : chaudière gaz ou fioul (pose, entretien, dépannage), pompe à chaleur (air/eau, air/air, géothermie), poêle et insert à bois ou à granulés, chaudière biomasse ; partie chauffage du plombier-chauffagiste. Tuyauterie gaz et certificat de conformité gaz : `plombier.md`. Ramonage : `metier-btp.md` § 10.

## 1. Assurances

Décennale, RC pro, attestation jointe : voir `commun.md`.
Propre au métier : l'attestation d'entretien (chaudière, PAC, poêle) est souvent demandée par l'assureur habitation après un sinistre [5] **(à vérifier : aucun texte n'impose de la transmettre, comme pour le ramonage)**. Vérifier que « pompe à chaleur », « bois-énergie » et « manipulation de fluides » figurent dans les activités déclarées à l'assureur décennal **(à vérifier auprès des assureurs)**.

## 2. Qualifications et ce qu'elles ouvrent au client

| Qualification | Organisme | Obligatoire ? | Ce qu'elle permet au client | Source |
|---|---|---|---|---|
| CAP/BEP/titre RNCP ou 3 ans d'expérience | — (code de l'artisanat) | Oui, pour exercer | Condition d'exercice | `metier-btp.md` § 7 |
| Attestation de capacité « fluides frigorigènes » (par établissement, 5 ans au plus) | Organisme agréé par l'État | **Oui** pour installer, charger, entretenir une PAC contenant du fluide | Rien de plus ; sans elle, intervention illégale sur le circuit | [16] |
| RGE PAC : QualiPAC | Qualit'EnR | Non pour poser ; oui pour les aides | MaPrimeRénov', CEE, éco-PTZ | [17] |
| RGE PAC : Qualibat, Qualifelec | Qualibat, Qualifelec | Idem | Idem | [17] |
| RGE QualiBois (poêle, insert, chaudière bois) | Qualit'EnR | Idem | Idem | [17] |
| RGE QualiSol (solaire combiné) | Qualit'EnR | Idem | Idem | `plombier.md` |
| Appellation « Professionnel du Gaz » (PG) | Qualigaz | Non | Certificat de conformité gaz sans visite systématique | `plombier.md` |
| RGE chaudière gaz | Qualibat (Qualigaz ne délivre pas le RGE selon juriste-btp, 3 nov. 2026 ; à vérifier) | Non | Plus aucune aide sur une chaudière gaz neuve (§ 7) **(à vérifier)** | — |

Fluides : deux régimes coexistent dans les sources. L'un, l'arrêté du 30 juin 2008, avec les catégories I à V de l'attestation de capacité (voir `frigoriste.md`). L'autre, un arrêté du 21 nov. 2025 (JO du 6 déc. 2025, selon une source ; un projet de 2025 selon une autre) qui remplacerait ces catégories par de nouvelles (A1, A1 FF, A1 HC, A2, A2 HC, D, E, V) en référence au règlement (UE) 2024/2215, avec une attestation de remise à niveau avant le 12 mars 2029 [16] **(à vérifier : statut au JO et date d'effet, extraits fragmentaires)**. Mallettico ne code aucune catégorie : il se contente d'afficher celle que l'artisan saisit.

## 3. Documents remis au client

### 3.1 Attestation d'entretien de chaudière (4 à 400 kW)
- **Quand** : après chaque entretien annuel d'une chaudière gaz, fioul, bois, charbon ou multi-combustible de 4 à 400 kW (§ 4).
- **Textes** : décret n° 2009-649 du 9 juin 2009 ; codifié au **code de l'environnement, R. 224-41-4 à R. 224-41-9** (partie législative : L. 224-1) ; arrêté du 15 sept. 2009 modifié (en 2020 pour étendre les opérations à l'installation de chauffage, puis le 21 nov. 2022) [1], [3], [5]. La codification actuelle est confirmée par la page du ministère [1] ; le texte consolidé n'a pas été ouvert.
- **Contenu obligatoire** (annexe 5 de l'arrêté, d'après des modèles de fabricants et de fédérations [4], [5], [6]) : identité et coordonnées de l'entreprise et de l'intervenant ; adresse de l'installation, identité du commanditaire ; type de chaudière, combustible, marque, modèle, puissance ; date ; opérations faites (points de contrôle de l'annexe 1) ; **mesure du monoxyde de carbone (CO) ambiant en ppm**, avec la mention prévue selon la valeur (situation « normale » sous un seuil, à relire) ; **évaluation du rendement** comparé au rendement de référence (annexe 2) ; **évaluation des émissions de polluants** (NOx) pour certaines chaudières **(à vérifier)** ; **conseils** sur le bon usage, les améliorations possibles et l'intérêt d'un remplacement ; correctifs apportés **(liste à relire au texte avant de figer un modèle)**. La FFB publie des modèles PDF remplissables pour chaudières et PAC [4].
- **Délai de remise** : **15 jours** suivant la visite [5] ; cela correspond, selon le juriste, au régime de 2009 **(numéros à relire)**.
- **Conservation** : **2 ans** par l'occupant (ou le propriétaire) pour la présenter [5] ; cela correspond, selon le juriste, au régime de 2009 **(numéros à relire)**. Aucun texte connu n'impose de durée au professionnel.

### 3.2 Attestation d'entretien de pompe à chaleur (4 à 70 kW)
- **Textes** : décret n° 2020-912 du 28 juil. 2020 (entretien périodique des systèmes thermodynamiques), codifié au code de l'environnement **R. 224-44 et s.** (et non R. 224-41-4, qui vise les chaudières : voir `frigoriste.md`, d'après la page du ministère) [1], [7] **(numéros à relire au texte)** ; arrêté du 24 juil. 2020, dont l'annexe 3 fixe le contenu de l'attestation [8], [9].
- **Délai et conservation** : remise au commanditaire dans les **15 jours** suivant l'entretien selon la CAPEB et l'AFPAC [résumé], non lu au texte ; conservation : rien d'officiel trouvé **(à vérifier : arrêté du 24 juil. 2020, annexe 3, et articles PAC)** [8], [9].
- **Contenu** : identification de l'entreprise et du système, opérations faites, conseils ; si le système contient un fluide frigorigène, mention du contrôle d'étanchéité quand il est dû [9] **(liste exacte à relire au texte)**.
- **Contrôle d'étanchéité** : exigé par la réglementation européenne sur les gaz fluorés selon la charge en équivalent CO2, par un opérateur titulaire de l'attestation de capacité [9], [16] **(seuils et règlement en vigueur à vérifier)**.

### 3.3 Attestation d'entretien d'un poêle ou d'un insert à combustible solide
- **Textes** : code de la santé publique **R. 1331-67 et R. 1331-68** (décret n° 2023-641 du 20 juil. 2023, renuméroté par le décret n° 2023-695) ; arrêté du 20 juil. 2023, art. 4, annexes 1 et 3 (`metier-btp.md` § 10, vérifié au texte). Des sites citent encore les anciens numéros (R. 1331-16 et s.) [11], [12] : toujours citer ceux du code.
- **Réponse à la question posée** : le décret 2023-641 a créé dans le CSP l'entretien des **appareils de chauffage décentralisés à combustible solide** (poêles, inserts, foyers fermés), distinct du ramonage. Il n'a **pas** créé l'entretien des PAC : celui-ci relève du code de l'environnement (décret 2020-912). Les foyers ouverts ne sont pas soumis à l'entretien (R. 1331-66).
- **Contenu** : selon l'annexe 3 de l'arrêté (non relue ici) ; une attestation distincte de celle du ramonage [11]. Délai de remise et conservation : à relire dans R. 1331-75 et l'arrêté **(à vérifier : savoir si les 15 jours ouvrés et les 2 ans du ramonage s'appliquent aussi à l'entretien)**.
- **Fréquence** : annuelle selon une source commerciale [11] **(à vérifier dans R. 1331-68)**.

### 3.4 Autres documents
- Pose d'une chaudière gaz : certificat de conformité gaz modèle 2 (`plombier.md`).
- Pose d'une PAC : mise en service, notice, et pour les aides, les caractéristiques techniques sur la facture (§ 6).
- Pose d'une chaudière fioul en dérogation : la justification de la dérogation (étude ou attestation) [14] **(à vérifier)**.

## 4. Obligations périodiques du client que l'artisan peut rappeler

| Obligation | Fréquence | Qui | Texte | Source |
|---|---|---|---|---|
| Entretien de chaudière 4 à 400 kW (gaz, fioul, bois…) | Annuelle | Occupant, sauf clause du bail ; propriétaire ou syndic pour le collectif | C. env. R. 224-41-4 et s. ; arrêté du 15 sept. 2009 | [1], [2], [3] |
| Entretien de PAC et système thermodynamique 4 à 70 kW | **Tous les 2 ans** | Propriétaire, occupant ou exploitant selon les sources **(à vérifier)** | Décret 2020-912 ; arrêté du 24 juil. 2020 | [7], [8], [10] |
| Inspection des systèmes > 70 kW | Tous les 5 ans | Propriétaire, exploitant | C. env. (section entretien et inspection, numéros à vérifier) | [1] |
| Entretien de poêle ou insert à combustible solide | Annuelle **(à vérifier)** | Occupant | CSP R. 1331-67, R. 1331-68 | `metier-btp.md` § 10 |
| Ramonage du conduit | Au moins 1 fois/12 mois (plus selon le règlement local) | Occupant | CSP R. 1331-71 | `metier-btp.md` § 10 |
| Contrôle d'étanchéité du fluide d'une PAC | Selon la charge | Détenteur | Règlement européen gaz fluorés | [9] **(à vérifier)** |

Rappels : prospection directe, exception « client existant », jamais « obligatoire » en ton d'avis administratif, pas d'appel au consommateur sans consentement depuis le 11 août 2026 : voir `metier-btp.md` § 10, les mêmes règles s'appliquent.

## 5. TVA propre au métier

- Règles générales et certification : voir `commun.md`.
- **Chaudière gaz ou fioul (fourniture et pose)** : **20 %** depuis le **1er mars 2025**, y compris condensation et THPE, logement ancien compris (loi de finances pour 2025, CGI 279-0 bis modifié) ; devis signés et acomptes versés avant cette date gardent l'ancien taux [18], [19]. Entre le 1er janv. et le 28 févr. 2025, 10 % (sortie du 5,5 % par l'arrêté du 4 déc. 2024) [20] **(à vérifier)**.
- Entretien et réparation d'une chaudière gaz ou fioul dans un logement de plus de 2 ans : 10 % le plus probable (l'exclusion de 2025 vise la fourniture et la pose, à vérifier au BOFiP) ; jamais 5,5 %, les chaudières fossiles étant sorties de la liste au 1er janv. 2025.
- **Pompe à chaleur air/eau, eau/eau, géothermie** : 5,5 % (CGI 278-0 bis A) si les critères techniques de l'arrêté sont remplis **(à vérifier : critères 2026 non lus)**.
- **Pompe à chaleur air/air** : 5,5 % depuis le **18 juil. 2026** (arrêté du 13 juil. 2026, JO du 17 juil.) pour les PAC air/air réversibles fixes dans un logement de plus de 2 ans : fourniture, pose, entretien et réparation ; seuils ≤ 12 kW : classe A+ (multi-split) ou A++ (mono-split) en chauffage et en refroidissement ; au-delà, seuils SCOP/SEER ; fluide conforme au calendrier F-Gas à la signature du devis ; appareil connectable [21], [22], [23]. Un fabricant affirme que la main-d'œuvre de pose resterait à 10 % [24] : contradictoire avec la CAPEB. Le 278-0 bis A couvre pose, installation et entretien d'un équipement éligible : proposer le même taux pour fourniture et pose **(à vérifier)**.
- **Poêle, insert, chaudière biomasse** : 5,5 % si l'appareil atteint les critères de l'arrêté **(à vérifier : aucune source trouvée dans cette recherche)**.

## 6. Mentions particulières sur le devis et la facture

- Dépannage : devis préalable et affichage des prix (arrêté du 24 janv. 2017) : voir `commun.md`. **Contrat d'entretien payé au forfait** à la conclusion ou au renouvellement : **exclu** de l'arrêté (art. 1er, II, modifié par l'arrêté du 28 févr. 2017) [28] ; une visite d'entretien ponctuelle hors contrat, elle, exige un devis (comme le ramonage, `metier-btp.md` § 10).
- PAC et appareils aidés : marque, modèle, puissance, performances (ETAS, SCOP, classe), n° RGE et organisme, date de visite préalable si l'aide l'exige **(liste exacte à vérifier sur france-renov.gouv.fr et les fiches CEE)**.
- PAC air/air au 5,5 % : classe énergétique et fluide sur le devis, puisque les conditions s'apprécient à sa date [21].
- Chaudière gaz : ne jamais pré-remplir 5,5 % ni 10 % ; 20 % sauf devis antérieur au 1er mars 2025 [18].
- Chaudière fioul neuve : interdite depuis le 1er juil. 2022 (plafond de 300 g CO2eq/kWh, décret n° 2022-8 du 5 janv. 2022), sauf dérogations (impossibilité technique, absence de réseau de chaleur ou de gaz…) [13], [14]. Un décret de 2026 supprimerait l'exception « biofioul » en 2027 [15] **(à vérifier, source grand public)**. L'entretien et la réparation d'une chaudière fioul existante restent permis [13].

## 7. Aides du client et pièces que l'artisan fournit

- **MaPrimeRénov' par geste** : rouverte le 23 févr. 2026 ; depuis le 1er janv. 2026, les chaudières biomasse n'y sont plus éligibles ; depuis le 1er sept. 2026, les poêles et inserts à bois en sortiraient aussi et le parcours par geste serait réservé aux PAC (décret n° 2026-822, selon la presse : voir `commun.md`, **à vérifier au décret**) ; forfait PAC air/eau 5 000 / 4 000 / 3 000 € selon les revenus (sites commerciaux) [27] **(à vérifier sur france-renov.gouv.fr)**. L'artisan doit être RGE dans le domaine des travaux ; il fournit devis, facture, attestation RGE.
- **CEE « Coup de pouce Chauffage »** : bonification pour remplacer une chaudière charbon, fioul ou gaz par une PAC air/eau ou eau/eau (fiches BAR-TH-171, BAR-TH-172) [25] ; depuis le 1er sept. 2026, réservée aux modèles de PAC agréés, liste complétée le 15 oct. 2026 [26] **(à vérifier sur ecologie.gouv.fr)**. L'offre de l'obligé (ou de son délégataire) doit être faite au client avant qu'il signe le devis ; l'artisan ne la signe que s'il est partenaire de l'obligé (avis juriste-btp du 3 nov. 2026).
- Pas de crédit d'impôt sur le chauffage dans le résidentiel en 2026 trouvé **(à vérifier)**.

## 8. Le terrain : problèmes concrets et ce qu'un logiciel simple devrait faire

Problèmes réels :
- L'entretien annuel est le revenu récurrent du chauffagiste ; le suivi des dates se fait sur carnet ou tableur.
- L'attestation est remplie à la main sur un carnet à souche, sans copie lisible ; le client la perd et la redemande après un sinistre.
- Les règles de TVA ont changé trois fois en deux ans (chaudières 2025, PAC air/air 2026) : le taux pré-rempli d'un ancien modèle de devis est faux.
- Trois régimes d'entretien, trois fréquences : chaudière (1 an), PAC (2 ans), poêle (1 an, à vérifier), plus le ramonage.

Propositions :

| Priorité | Proposition | Effort | Risque juridique |
|---|---|---|---|
| Indispensable | **Attestation d'entretien numérotée et figée** sur le modèle de l'attestation de ramonage, en trois variantes (chaudière, PAC, poêle/insert) : champs de l'annexe correspondante, mesure du CO (ppm), rendement, conseils ; PDF remis au client ; facture tirée de l'attestation | L | Moyen : le contenu doit suivre l'annexe à la lettre ; relire les annexes au texte avant de figer les champs |
| Indispensable | **Rappel du prochain entretien** calculé selon l'appareil (12 mois chaudière ; 24 mois PAC ; poêle selon relecture) ; mêmes règles de prospection que le ramonage. Citer l'obligation pour une chaudière (« entretien annuel obligatoire, C. env. R224-41-4 ») : décision d'Hugo ; d'ici là, jamais « obligatoire » (MB § 10) | M | Faible si les règles de `metier-btp.md` § 10 sont reprises |
| Indispensable | Modèles de devis à jour de la TVA : chaudière gaz/fioul 20 % ; entretien de chaudière jamais à 5,5 % ; PAC air/air 5,5 % seulement si classe et fluide saisis, même taux pour fourniture et pose (à vérifier) ; date du devis contrôlée | M | Moyen : base légale à relire au BOFiP |
| Utile | **Contrat d'entretien** : prix forfaitaire annuel, appareils couverts, visites incluses, reconduction ; génère l'attestation à chaque visite et la facture annuelle. Rappel d'information avant reconduction tacite : C. conso. L215-1 : le professionnel informe le consommateur par écrit, au plus tôt trois mois et au plus tard un mois avant le terme, de la possibilité de ne pas reconduire ; à défaut, le consommateur peut résilier à tout moment. | L | Moyen : clauses de reconduction et hors établissement à relire par juriste-btp |
| Utile | Fiche « appareil » attachée au client (type, marque, puissance, fluide, date de pose) pour pré-remplir attestation et rappel | M | Nul |
| Utile | Champ « attestation de capacité fluides » (n°, catégorie, validité) dans les paramètres, imprimé sur les attestations PAC | S | Faible |
| Plus tard | Alerte sur une chaudière fioul neuve au devis : « interdite sauf dérogation : justificatif ? » | S | Faible en avertissement |
| Plus tard | Export des attestations d'une année pour un bailleur ou un syndic | M | Faible |

## Sources

1. Ministère de la Transition écologique, « Entretien et inspection des systèmes de chauffage et de climatisation » (31/03/2022) — https://www.ecologie.gouv.fr/politiques-publiques/entretien-inspection-systemes-chauffage-climatisation — consulté le 03/11/2026 — [résumé]
2. Ministère de la Transition écologique, FAQ inspection et entretien chauffage et climatisation — https://www.ecologie.gouv.fr/sites/default/files/documents/FAQ%20Inspection%20entretien%20chauffage%20et%20clim.pdf — consulté le 03/11/2026 — [résumé]
3. FFB, « Entretien des appareils à combustion : quelles évolutions » — https://www.ffbatiment.fr/actualites-batiment/actualite-bam/entretien-appareils-combustion-evolutions-entretien-annuel-obligatoire — consulté le 03/11/2026 — [résumé]
4. FFB, « Chaudières et PAC : les attestations d'entretien disponibles en PDF remplissable » — https://www.ffbatiment.fr/actualites-batiment/actualite/attestations-entretien-chaudiere-pac — consulté le 03/11/2026 — [résumé]
5. Proreno, guide « Entretien des chaudières » — https://proreno.fr/storage/media/shares/pdf/50037/S01_5033857J_G_Entretien-chaudieres_web.PDF — consulté le 03/11/2026 — (à vérifier)
6. Xpair, « Entretien des chaudières obligatoire » (arrêté du 15 sept. 2009) — https://conseils.xpair.com/consulter_savoir_faire/mesure-gaz-combustion/entretien-chaudieres-obligatoire.htm — consulté le 03/11/2026 — (à vérifier)
7. Légifrance, JORF, décret n° 2020-912 du 28 juil. 2020 (article) — https://www.legifrance.gouv.fr/jorf/article_jo/JORFARTI000042164760 — consulté le 03/11/2026 — [résumé]
8. CAPEB, « Systèmes thermodynamiques : l'entretien périodique » (28/08/2020) — https://www.capeb.fr/actualites/systemes-thermodynamiques-lentretien-periodique — consulté le 03/11/2026 — [résumé]
9. AFPAC, « Réglementation relative à l'entretien des PAC chargées en HFC » — https://afpac.org/attachment/2271909 — consulté le 03/11/2026 — [résumé]
10. ADEME, fiche « Entretien pompe à chaleur, climatiseur » — https://librairie.ademe.fr/ged/8309/fiche-entretien-pompe-chaleur-climatiseur.pdf — consulté le 03/11/2026 — [résumé]
11. CAPEB, « Entretien et ramonage des dispositifs de chauffage : nouvelle réglementation » (09/10/2024) — https://www.capeb.fr/actualites/entretien-et-ramonage-des-dispositifs-de-chauffage-nouvelle-reglementation — consulté le 03/11/2026 — [résumé]
12. Landot avocats, « Un décret sur les foyers, appareils de chauffage, de cuisine, les conduits de fumée » (23/07/2023) — https://blog.landot-avocats.net/2023/07/23/un-decret-sur-les-foyers-appareils-de-chauffage-de-cuisine-les-conduits-de-fumee/amp/ — consulté le 03/11/2026 — (à vérifier)
13. Info.gouv.fr, « Fin des nouvelles chaudières au fioul ou au charbon au 1er juillet 2022 » — https://www.info.gouv.fr/actualite/fin-des-nouvelles-chaudieres-au-fioul-ou-au-charbon-au-1er-juillet-2022 — consulté le 03/11/2026 — [résumé]
14. FFB, « Interdiction des chaudières au fioul : parution du décret » — https://www.ffbatiment.fr/actualites-batiment/actualite/interdiction-chaudieres-fioul-parution-decret — consulté le 03/11/2026 — [résumé]
15. JeChange, « Chaudière fioul neuve interdite : dérogation biofioul, mars 2027 » — https://www.jechange.fr/energie/gaz/news/chaudiere-fioul-neuve-interdite-derogation-biofioul-mars-2027 — consulté le 03/11/2026 — (à vérifier)
16. AIDA (INERIS), arrêté du 21 nov. 2025 relatif à la délivrance des attestations de capacité (C. env. R. 543-99) — https://aida.ineris.fr/reglementation/arrete-211125-relatif-a-delivrance-attestations-capacite-operateurs-prevues-a — consulté le 03/11/2026 — [résumé]
17. Effy Pro, « Les qualifications RGE pour l'installation d'une pompe à chaleur » — https://www.effy.fr/pro/gestion-entreprise/choix-qualification-installation-pompe-a-chaleur — consulté le 03/11/2026 — (à vérifier)
18. FFB, « Chaudières gaz et fioul : au 1er mars, TVA à 20 % » — https://www.ffbatiment.fr/actualites-batiment/actualite-ba/chaudieres-gaz-et-fioul-1er-mars-tva-20 — consulté le 03/11/2026 — [résumé]
19. CAPEB, « TVA à 20 % sur les chaudières à énergie fossile au 1er mars 2025 » (27/02/2025) — https://www.capeb.fr/actualites/tva-a-20-sur-les-chaudieres-a-energie-fossile-au-01-mars-2025 — consulté le 03/11/2026 — [résumé]
20. Effy Pro, « La TVA des chaudières à gaz passe (pour l'instant) à 10 % » — https://www.effy.fr/pro/actualite/tva-chaudieres-gaz-passe-pour-linstant-10 — consulté le 03/11/2026 — (à vérifier)
21. CAPEB, « Les nouvelles conditions d'éligibilité des PAC air/air au taux de TVA de 5,5 % » (17/07/2026) — https://www.capeb.fr/actualites/les-nouvelles-conditions-deligibilite-des-pompes-a-chaleur-air-air-au-taux-de-tva-de-5-5 — consulté le 03/11/2026 — [résumé]
22. CAPEB Aube, JO du 17/07/2026, arrêté TVA 5,5 % PAC air/air (PDF) — https://www.capeb.fr/www/capeb/media//aube/document/joe_20260717_0165_0039_TVA%20à%205,5%20PAC%20RR.pdf — consulté le 03/11/2026 — [résumé]
23. FFB, « TVA au taux réduit de 5,5 % sur les pompes à chaleur air/air » — https://www.ffbatiment.fr/gestion-entreprise/comptabilite-banque-assurances/fiscalite-impots/dossier/tva-pac-air-air-5,-d-,5-comment-savoir — consulté le 03/11/2026 — [résumé]
24. Thermor, « TVA à 5,5 % sur les PAC air-air : ce qui change dès le 18 juillet 2026 » — https://www.thermor.fr/nos-conseils/changement-tva-pac-air-air — consulté le 03/11/2026 — (à vérifier)
25. Ministère de la Transition écologique, « Coup de pouce chauffage et isolation » — https://www.ecologie.gouv.fr/coup-pouce-chauffage-et-isolation — consulté le 03/11/2026 — [résumé]
26. Selectra, « Coup de pouce CEE : ce que le projet d'arrêté change (septembre 2026) » — https://selectra.info/energie/actualites/renovation-energetique/coup-de-pouce-cee-renovation-ampleur-fin-fossile-septembre-2026 — consulté le 03/11/2026 — (à vérifier)
27. La Prime Énergie, « Barème MaPrimeRénov' 2026 » — https://www.laprimeenergie.fr/les-aides/ma-prime-renov/bareme — consulté le 03/11/2026 — (à vérifier)
28. CAPEB Bas-Rhin, circulaire « Publicité des prix » (arrêté du 24 janv. 2017 modifié le 28 févr. 2017) — https://www.capeb.fr/www/capeb/media/bas-rhin/document/Circulaire%20publicit%C3%A9%20des%20prix.pdf — consulté le 03/11/2026 — [résumé]
29. `docs/metier-btp.md` § 10 (ramonage, poêles et inserts, vérifié au texte) — interne

## Relecture juriste-btp

Relue par juriste-btp le 03/11/2026, sans texte officiel ouvert (avis : `avis-juriste-2026-11-03.md`). Corrections appliquées. Restent à vérifier au texte :
- annexe 5 de l'arrêté du 15 sept. 2009 et C. env. R224-41-4 et s. (15 jours, 2 ans) ;
- annexe 3 de l'arrêté du 24 juil. 2020 et articles PAC (délai, conservation, qui) ;
- catégories de fluides : arrêté du 30 juin 2008 ou arrêté du 21 nov. 2025 (statut, date d'effet) ;
- TVA de l'entretien de chaudière (10 %, CGI 279-0 bis issu de la loi de finances 2025) ;
- PAC air/air : même taux pour fourniture et pose (arrêtés du 13 juil. et du 14 août 2026) ;
- fréquence de l'entretien des poêles (R. 1331-68).
