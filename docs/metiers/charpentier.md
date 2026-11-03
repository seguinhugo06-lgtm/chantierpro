# Charpentier — ce que Mallettico doit savoir

> Recherche du 03/11/2026 (session cloud « metiers »). Sources lues par moteur de recherche : textes officiels non ouverts,
> tout est à relire au texte avant de coder une règle bloquante. Relecture juriste-btp : voir la fin du fichier.

**Codes NAF** : 43.91A (travaux de charpente) ; 16.23Z (fabrication de charpentes et autres menuiseries) pour l'atelier qui fabrique — NAF rév. 2, non vérifié ce jour ; la NAF 2025 peut changer ces codes **(à vérifier sur insee.fr)**.
**Variantes couvertes** : charpente traditionnelle (taillée, assemblée), charpente industrielle (fermettes), ossature bois (extension, surélévation, maison), traitement curatif des bois, renforcement, aménagement de combles, isolation de toiture quand le charpentier la pose.

Règles transverses (TVA, certification du taux réduit, décennale, hors établissement, médiateur, garanties) : **voir `commun.md` et `docs/metier-btp.md` §§ 2, 4, 6**. Le PV de réception et la retenue de garantie sont décrits dans `macon.md` § 3. Ici, seulement ce qui est propre au charpentier.

## 1. Assurances

- **Décennale** : obligatoire (voir commun.md). Activités à déclarer séparément selon la nomenclature de l'assureur **(à vérifier)** : « charpente et structure bois », « ossature bois / construction bois », « traitement des bois » (souvent une activité à part). Un charpentier assuré pour la charpente mais pas pour l'ossature bois d'une extension n'est pas couvert sur l'extension (lecture stricte des activités déclarées, voir macon.md § 1).
- Un rapport du Sénat (1996) relève que la décennale ne couvrait alors que le **traitement préventif** des bois [7] **(ancien, à vérifier)** : un traitement **curatif** pourrait donc ne pas être couvert par la décennale. À demander à l'assureur.
- Non-respect des DTU : risque de refus de garantie selon un site professionnel [8] **(à vérifier : non officiel)**.

## 2. Qualifications et ce qu'elles ouvrent au client

| Qualification | Organisme | Obligatoire ? | Ce qu'elle permet au client | Source |
|---|---|---|---|---|
| Certibiocide (catégorie couvrant TP8, traitement des bois) | Organisme agréé | **Oui** pour un traitement **curatif** professionnel (termites, capricornes, mérule) depuis le 1er juill. 2015 | — | [5] [6] |
| CTB-A+ (applicateur de traitement des bois) | FCBA | Non | Gage de sérieux ; parfois demandé à la vente d'un bien | **(à vérifier : aucune source trouvée)** |
| RGE (isolation de toiture) | Qualibat (ou autre) | Non pour poser ; oui pour MaPrimeRénov' et CEE | Aides à l'isolation | voir couvreur.md § 7 |
| Qualibat charpente / ossature bois | Qualibat | Non | Gage de sérieux | **(à vérifier)** |

## 3. Documents remis au client

**Devis de charpente** : plans ou croquis, essences, sections, classe de résistance (C24…), traitement (classe d'emploi), quincaillerie, levage (grue), échafaudage, dépose de l'ancienne charpente, déchets (mention obligatoire, voir metier-btp § 2).

**Bois et produits — marquage et certificats** [9] [10] **[résumé]**
- Le **bois de structure** à section rectangulaire classé pour sa résistance doit porter le **marquage CE** selon la norme EN 14081-1, avec une **déclaration des performances (DoP)** qui indique la classe de résistance (C18, C24…) (règlement UE n° 305/2011) [9] **[résumé ; date d'entrée en vigueur à vérifier]**.
- **CTB-P+** : certification d'un **produit** de préservation (efficacité contre insectes, champignons, termites) [10] **[résumé]**. **CTB-B+** : certification du **bois traité** **(à vérifier : aucune source trouvée)**.
- Pour le charpentier : garder la DoP et le certificat du produit de traitement dans le dossier du chantier ; les citer au devis rassure le client et l'expert en cas de sinistre.

**Termites et insectes** [1] [2] [3] **[résumé]**
- **Zones délimitées** par **arrêté préfectoral** quand des foyers sont identifiés (CCH **L131-3**) [1] [2]. La liste des communes se consulte en préfecture ou à la DDT.
- **Déclaration en mairie** de la présence de termites par l'occupant, à défaut le propriétaire (CCH L126-4 et s.) [1] **(numérotation à vérifier : d'anciens textes citent L133-x)**.
- **Vente** dans une zone délimitée : **état relatif à la présence de termites** établi par un **diagnostiqueur certifié** (CCH **L126-24**), annexé à la promesse ou à l'acte, valable **6 mois** (CCH R271-5 probablement, et non D271-5 **(à vérifier)**) [1] **[résumé]**. Ce n'est **pas** le charpentier qui le fait : il traite, le diagnostiqueur constate.
- **Construction neuve** : protection des bâtiments neufs contre les termites (barrière sol-bâtiment ou dispositif contrôlable, CCH R131-2 et s. cités) [3] **(à vérifier : source non officielle ; « partout en France » ou seulement dans les départements visés par arrêté ?)**.
- **Démolition** en zone délimitée : bois et matériaux contaminés **incinérés sur place ou traités avant tout transport** [1] **[résumé]**. À chiffrer sur le devis de dépose.

**Mérule** [4] **[résumé]**
- Déclaration en mairie par l'occupant, à défaut le propriétaire, ou le syndicat de copropriété pour les parties communes (CCH **L126-5**), Cerfa n° 12010*02 selon une préfecture [4]. Zones délimitées par arrêté préfectoral (L131-3) ; information de l'acquéreur à la vente dans le dossier de diagnostic (CCH L126-25 et L271-4 cités, numérotation divergente) [4] **(à vérifier)**.
- Pour le charpentier : après un traitement curatif, un **rapport de traitement** (zones, produit, n° Certibiocide, date, garantie commerciale éventuelle) est utile au client qui vend **(usage, pas un texte trouvé)**.

**Fermette vs charpente traditionnelle** [8] [11] **[résumé]**
- Fermettes industrielles : NF DTU 31.3 (structures assemblées par connecteurs métalliques) ; charpente traditionnelle : NF DTU 31.1 [8].
- **Modifier des fermettes** pour aménager des combles (couper un entrait, une diagonale) est une transformation de structure : aucune source ne dit « interdit », mais l'AQC en fait une fiche pathologie [11] ; le calcul d'un bureau d'études ou du fabricant est la règle de l'art **(à vérifier aux DTU)**. Créer de la surface habitable peut exiger un permis de construire [8].

**Urbanisme — extension et surélévation en ossature bois** [12] **[résumé]**
- Obligation du **propriétaire**. Déclaration préalable de 5 à 20 m² ; jusqu'à **40 m²** en zone urbaine d'un PLU ; au-delà, permis de construire. Permis obligatoire et **architecte** obligatoire si la surface de plancher totale après travaux dépasse **150 m²** [12] **(à vérifier : site non officiel ; emprise au sol aussi prise en compte)**.
- Surélévation ou extension en zone argileuse : voir l'étude G2 dans macon.md § 3 **(application aux extensions à vérifier)**.

**PV de réception** : voir macon.md § 3. Pour une charpente seule (avant couverture), la réception partielle par lot est possible **(à vérifier)** ; à défaut, la décennale court de la réception de l'ouvrage.

## 4. Obligations périodiques du client que l'artisan peut rappeler

| Obligation | Fréquence | Qui | Texte | Source |
|---|---|---|---|---|
| État termites à la vente (zone délimitée) | À chaque vente, valable 6 mois | Vendeur (diagnostiqueur) | CCH L126-24, R271-5 (à vérifier) | [1] |
| Déclaration de termites / mérule | Dès qu'ils sont connus | Occupant, à défaut propriétaire | CCH L126-4, L126-5 | [1] [4] |
| Contrôle du dispositif anti-termites d'un bâtiment neuf | **(à vérifier : rien trouvé)** | — | — | — |
| Inspection de charpente | Conseillée, non obligatoire | Propriétaire | **Aucun texte trouvé** | (rien trouvé) |

Un rappel « inspection de charpente » ou « fin de garantie du traitement » est un **conseil commercial**, pas une obligation : le dire.

## 5. TVA propre au métier

Taux et certification : voir commun.md et macon.md § 5.
- **Extension en ossature bois** : **20 %** (addition de construction). Aussi 20 % si les travaux **augmentent la surface de plancher de plus de 10 %**, et pour une **surélévation** [13] **[résumé]**.
- **Extension : deux lectures.** Ici, toute extension (addition de construction) est à 20 %. `docs/metier-btp.md` § 4 dit « agrandissement > 10 % de surface ». À trancher au BOI-TVA-LIQ-30-20-90-20 avant de coder.
- **Remplacement d'une charpente** d'un logement de plus de 2 ans : en principe **10 %**, sauf si l'ensemble des travaux sur deux ans rend l'immeuble « neuf » (plus de la moitié d'un élément de gros œuvre, ou deux tiers de chacun des six éléments de second œuvre ; la charpente relève probablement des « éléments hors fondations déterminant la résistance et la rigidité » (CGI ann. II 245 A, à vérifier) — voir macon.md § 5.
- **Traitement curatif** des bois d'un logement : 10 % (entretien, amélioration) **(à vérifier : aucune source spécifique)**.
- **Isolation** de toiture posée par le charpentier : 5,5 % (voir couvreur.md § 5).
- Bois vendu sans pose : 20 %.

## 6. Mentions particulières sur le devis et la facture

- Essence, classe de résistance (C24…), classe d'emploi du traitement, produit de traitement certifié (CTB-P+) — conseil, aucune mention imposée trouvée.
- Traitement curatif : produit (TP8), n° Certibiocide de l'applicateur, zones traitées, garantie commerciale éventuelle (durée) ; ne pas écrire « garantie décennale » sur un traitement curatif sans l'accord de l'assureur.
- Termites / mérule : « Commune en zone délimitée par arrêté préfectoral du … : oui / non / inconnu » (conseil).
- Urbanisme : « Autorisation d'urbanisme à la charge du propriétaire : DP / PC n° … » (conseil).
- Levage, échafaudage, dépose et traitement des bois contaminés : lignes séparées.

## 7. Aides du client et pièces que l'artisan fournit

- Isolation de toiture : MaPrimeRénov' par geste : l'isolation des combles et des rampants n'est plus aidée depuis le 1er sept. 2026 (décret n° 2026-822, à vérifier) ; possible en rénovation d'ampleur et par les CEE (entreprise **RGE**) ; voir couvreur.md § 7.
- Aucune aide publique trouvée pour une charpente ou un traitement des bois **(rien trouvé)**. Le traitement curatif peut être pris en charge par l'assurance habitation selon le contrat **(à vérifier)**.
- Pour une vente, le client peut demander le **rapport de traitement** et la facture.

## 8. Le terrain : problèmes concrets et ce qu'un logiciel simple devrait faire

Problèmes réels (constats de métier, non sourcés par des statistiques) :
- **Devis longs et techniques** : métrés de bois (m³, ml), quincaillerie, levage ; souvent après relevé sur place et calcul.
- **Acompte gros** à la commande du bois (le bois sur mesure n'est pas revendable), alors que le client particulier signé chez lui ne peut rien payer pendant 7 jours.
- **Fabrication en atelier** puis pose : deux temps, deux factures possibles (acompte, situation à la livraison du bois, solde).
- **Météo** : le levage se fait hors vent fort ; une charpente posée sans couverture prend la pluie.
- **Découvertes** en dépose : bois attaqués (capricornes, termites, mérule), sections insuffisantes → **avenant** au devis.
- **Réserves** à la réception, souvent liées à d'autres corps de métier (couvreur, plaquiste).

Propositions :

| Priorité | Proposition | Effort | Risque juridique |
|---|---|---|---|
| Indispensable | **Échéancier** acompte à la commande / situation à la livraison du bois / solde, qui respecte le délai de 7 jours hors établissement (déjà géré par `delaiSeptJours`) | S | Moyen : ne jamais exiger un paiement pendant le délai (L221-10, déjà relu) |
| Indispensable | **Avenant** au devis signé (bois attaqués, renfort) avec photos, signé par le client avant les travaux supplémentaires | M | Moyen : modèle à relire (C. civ. 1193) |
| Indispensable | Modèles de devis : « charpente traditionnelle », « fermettes », « ossature bois extension » (TVA 20 % proposée), « traitement curatif » (TVA 10 %) | S | Moyen : TVA de l'extension à trancher au BOI-TVA-LIQ-30-20-90-20 avant de coder (toute extension à 20 %, ou agrandissement > 10 % de surface selon MB § 4) |
| Utile | **Rapport de traitement des bois** (zones, produit, n° Certibiocide, date, photos) généré depuis la facture, comme l'attestation de ramonage | M | Moyen : ne pas l'appeler « état parasitaire » (document du diagnostiqueur) |
| Utile | Paramètres : n° Certibiocide avec date de fin, activités décennales séparées (charpente / ossature / traitement) ; alerte si un devis d'ossature bois est émis sans l'activité correspondante | S | Faible si c'est une alerte |
| Utile | Case « commune en zone termites » (saisie par l'artisan) et ligne « traitement des bois contaminés avant transport » proposée au devis de dépose | S | Faible |
| Plus tard | Aide-mémoire urbanisme (DP / PC, seuils 20 / 40 / 150 m²) affiché sur un devis d'extension, avec « à la charge du propriétaire » | S | Moyen : seuils à relire au Code de l'urbanisme |
| Plus tard | Rappel « fin de garantie commerciale du traitement » au client, libellé comme un conseil | S | Faible |

## Sources

1. Joué-lès-Tours, fiche « Termites et bâtiment existant » (particuliers, 2021) — https://www.jouelestours.fr/wp-content/uploads/2021/09/Fiche-communication-Particuliers-Termites-et-Batiment-existant-170821.pdf ; DREAL Occitanie, « Termites » (sept. 2023) — https://www.occitanie.developpement-durable.gouv.fr/IMG/pdf/603-3-_termites_-_modif_sept_2023.pdf — consulté le 03/11/2026 — [résumé]
2. ecologie.gouv.fr, « Termites, insectes xylophages et champignons lignivores » — https://www.ecologie.gouv.fr/politiques-publiques/termites-insectes-xylophages-champignons-lignivores ; préfecture de Maine-et-Loire, plaquette termites (déc. 2023) — https://www.maine-et-loire.gouv.fr/contenu/telechargement/20449/135854/file/A4-Plaquette-Termites_Dec_2023.pdf — consulté le 03/11/2026 — [résumé]
3. Ootravaux, « Protection termites maison neuve » — https://www.ootravaux.fr/traitement-nuisibles/desinsectisation/insectes-xylophages/protection-termites-maison-neuve.html — consulté le 03/11/2026 — (à vérifier : non officiel)
4. Préfecture de l'Eure, dépliant mérule — https://www.eure.gouv.fr/index.php/contenu/telechargement/52972/390173/file/DEPLIANT%20MERULE_VF_WEB.pdf ; préfecture de l'Allier, fiche mérule — https://www.allier.gouv.fr/contenu/telechargement/8287/63818/file/4_merule_web.pdf — consulté le 03/11/2026 — [résumé]
5. FFB, « La certification Certibiocide » — https://www.ffbatiment.fr/techniques-batiment/normalisation-regles-de-lart/certifications-labels-de-produits-ouvrages/dossier/formation_certibiocide — consulté le 03/11/2026 — [résumé]
6. Walter Learning, « Quelle est la différence entre les différents Certibiocide ? » — https://walter-learning.com/blog/guide-hygiene/guide-certibiocide-desinfectants/difference-certibiocide ; Groupe Berkem, mémento Certibiocide (2023) — https://hygiene.groupeberkem.com/wp-content/uploads/2023/12/memento-certibiocide-21092023.pdf — consulté le 03/11/2026 — (à vérifier : non officiel)
7. Sénat, rapport n° 184 (1996-1997), « La mise en place d'un système de certification » — https://www.senat.fr/rap/l96-184/l96-18415.html — consulté le 03/11/2026 — [résumé] (ancien)
8. Construires.fr, « Charpente : réglementation urbanisme et autorisations » — https://www.construires.fr/plan-maison/charpente/ — consulté le 03/11/2026 — (à vérifier : non officiel)
9. CMESMAT, « Structure technique » (classement et marquage CE) — https://www.cmesmat.fr/media/akeneo_documents/2/7/27a87b3270cf41df85bf2e15e1f5736779a1ba3c_StructureTechnique.pdf ; OFME, Fibois n° 20 (déc. 2006) — https://ofme.org/documents/FiliereBois/Presse/Fibois20_Dec2006.pdf — consulté le 03/11/2026 — [résumé]
10. Teknos, certificat CTB-P+ — https://www.teknos.com/globalassets/teknos.com/industrial-coatings/downloads/approvals/ctbp/ctbpplus_ta2015-01_2021_fr.pdf — consulté le 03/11/2026 — [résumé]
11. AQC, fiche pathologie C02 « Transformation de charpente pour aménagement de combles » — https://qualiteconstruction.com/wp-content/uploads/2024/01/fi-pathologie-batiment-c02-transformation-charpente-amenagement-combles.pdf — consulté le 03/11/2026 — [résumé]
12. Construires.fr, « Extension de maison : DP ou PC selon les seuils 5, 20, 40 et 150 m² » — https://www.construires.fr/extension-habitation-150m2-r421-seuils/ ; CAUE 13, fiche « Travaux sur construction existante » (2026) — https://www.caue13.fr/sites/default/files/2026-07/17_FICHE-PRATIQUE_AUTORISATION-URBA_Travaux%20sur%20construction%20existante.pdf — consulté le 03/11/2026 — (à vérifier)
13. impots.gouv.fr, « Plusieurs taux de TVA » — https://impots.gouv.fr/particulier/plusieurs-taux-de-tva — consulté le 03/11/2026 — [résumé]

## Relecture juriste-btp

Relue par juriste-btp le 03/11/2026, sans texte officiel ouvert (avis : `avis-juriste-2026-11-03.md`). Corrections appliquées. Restent à vérifier au texte :
- TVA d'une extension : addition de construction ou seuil de 10 % (BOI-TVA-LIQ-30-20-90-20), puis aligner MB § 4 ;
- place de la charpente dans le gros œuvre fiscal (CGI ann. II 245 A) ;
- CCH R271-5 (et non D271-5) ;
- décret n° 2026-822 (rampants hors du parcours par geste) ;
- CCH L126-4, L126-5, L126-25, R131-2 et s. ; Certibiocide TP8 ; seuils d'urbanisme (C. urb. R421-14 et s.).
