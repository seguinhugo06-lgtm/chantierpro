# Combien d'artisans par métier — justification de la priorité des 15 métiers

> Recherche du 03/11/2026 (session cloud « metiers »). Sources lues par moteur de recherche, aucun fichier ouvert :
> l'INSEE (Sirene), l'API Recherche d'entreprises et metiers-btp.fr ne sont pas joignables depuis la session.
> Règle : un chiffre absent est écrit « non trouvé » ; aucun chiffre n'est estimé ni recalculé.
> Le budget de recherche web de la session s'est épuisé avant la fin : électricité, peinture, plâtrerie, carrelage
> n'ont pas de chiffre officiel par code NAF ici.

## 1. Lire les chiffres

- **Établissement ≠ entreprise.** La série la plus complète (fiches emploi-formation de l'OPCO Constructys, mars 2025, données INSEE au 31/12/2021) compte des **établissements**. Une entreprise peut en avoir plusieurs ; un artisan seul en a un. Ces nombres sont comparables entre eux, pas avec les chiffres « entreprises » de la CAPEB ou de la FFB.
- **Un code NAF par entreprise, plusieurs métiers réels.** Un « plombier-chauffagiste » est en 43.22A ou en 43.22B ; un peintre peut aussi poser du papier peint (43.33Z) [12]. Les chiffres par code donnent un ordre de grandeur, pas une population exacte.
- **Années différentes** (2021 à 2025) : à ne pas additionner.

## 2. Le bâtiment dans son ensemble

| Indicateur | Valeur | Année | Source | Remarque |
|---|---|---|---|---|
| Entreprises artisanales du bâtiment | 620 000, soit 97 % du secteur | 2024 | CAPEB, communiqués de déc. 2024 [1] | 621 803 cité par un site secondaire [2] (à vérifier) |
| Entreprises jusqu'à 10 salariés | 500 000 (96 % des entreprises du bâtiment), 570 000 salariés | 2025 | CAPEB, guide métiers 2025 [3] | |
| Entreprises du bâtiment avec un chiffre d'affaires positif, hors micro-entreprises « pures » | 450 000 | 2025 | FFB, Le bâtiment en chiffres [4] | Exclut les micro-entrepreneurs sans activité |
| Unités légales de la construction (hors promotion) | 573 245 | 2023 | SDES, d'après INSEE Ésane 2023 [5] | Inclut les travaux publics |
| Auto-entrepreneurs actifs dans le BTP | ≈ 268 000 (11 % des auto-entrepreneurs) ; 56 à 60 % déclarent un CA positif | fin 2023 | Urssaf et Fondation MMA, cités par un site [6] | (à vérifier), source de seconde main |
| Micro-entreprises « recensées dans le bâtiment » | 48 300 | non précisée | tpeactu, 17 juil. 2026 [7] | (à vérifier) : contredit l'ordre de grandeur précédent, périmètre inconnu |
| Part des entreprises **sans salarié** | **non trouvé** | — | — | La CAPEB inclut les entreprises sans salarié dans son périmètre [8] |
| Établissements de moins de 10 salariés parmi ceux qui ont au moins un salarié | 84 % (plomberie-chauffage), 87 % (bois) | 2021 | Constructys [9][10] | |
| Entreprises RGE | 54 000 à 63 000 | 2025-2026 | voir `commun.md` § 5 | |

**Répartition des entreprises artisanales par famille (CAPEB)** — utile quand le code NAF manque [11] :

| Famille | 2021 | 2025 |
|---|---|---|
| Maçonnerie-carrelage | 29 % | 23 % |
| Peinture-vitrerie-revêtements | 17 % | non trouvé |
| Plâtre-isolation | 6 % | non trouvé |
| Serrurerie-métallerie | 4 % | non trouvé |
| Autres familles (électricité, plomberie, couverture, menuiserie…) | non trouvé | non trouvé |

## 3. Par métier

| Métier | Code(s) NAF | Nombre (année) | Source | Remarque |
|---|---|---|---|---|
| Électricien | 43.21A | **non trouvé** (officiel) | — | Indices non officiels, divergents : « 81 715 sociétés » (annuaire) [12], 131 261 entreprises en 2020 (site d'étude de marché) [13] (à vérifier). 43.21B = voie publique, hors champ |
| dont IRVE | (43.21A) | 2 300 entreprises qualifiées IRVE Qualifelec | nov. 2021 [14] | Pas de chiffre plus récent trouvé ; 623 en avr. 2019 |
| Plombier / plombier-chauffagiste | 43.22A | **46 930 établissements** (64 % de la famille) | 31/12/2021 — INSEE, traitement Constructys [9] | Famille plomberie-chauffage : 73 299 établissements, 13 % du bâtiment |
| Chauffagiste | 43.22B | **26 369 établissements** (36 % de la famille) | 31/12/2021 — INSEE, traitement Constructys [9] | Code partagé avec la climatisation |
| Frigoriste-climaticien | 43.22B (en partie) | **non trouvé** | — | Le registre des opérateurs attestés (fluides frigorigènes, REP-GF) existe en données ouvertes, total non lu [15] |
| Ramoneur | 81.22Z | **non trouvé** | — | 81.22Z = « autres activités de nettoyage des bâtiments et nettoyage industriel » : code partagé, un comptage par code surestimerait [16] |
| Maçon / gros œuvre | 43.99C (+ 4 autres codes de la famille) | **151 409 établissements** pour la famille maçonnerie (28 % du bâtiment) | 31/12/2021 — INSEE, traitement Constructys [17] | 43.99C seul : non trouvé |
| Couvreur-zingueur | 43.91B | **27 285 établissements** (5 % du bâtiment) | 31/12/2021 — INSEE, traitement Constructys [18] | |
| Charpentier | 43.91A | **12 629 établissements** (18 % de la famille bois) | 31/12/2021 — INSEE, traitement Constructys [10] | |
| Menuisier-poseur de fenêtres | 43.32A | **55 981 établissements** (78 % de la famille bois) | 31/12/2021 — INSEE, traitement Constructys [10] | Menuiserie bois et PVC, pas seulement fenêtres ; 43.32C (agencement de lieux de vente) : 3 127 |
| Plaquiste-plâtrier | 43.31Z | **non trouvé** | — | Famille plâtre-isolation : 6 % des entreprises artisanales (2021) [11] |
| Peintre | 43.34Z | **non trouvé** | — | Famille peinture-vitrerie-revêtements : 17 % des entreprises artisanales (2021) [11] ; 43.34Z inclut la vitrerie |
| Carreleur | 43.33Z | **non trouvé** | — | Compté avec la maçonnerie par la CAPEB (29 % en 2021) [11] ; 43.33Z inclut tous les revêtements de sols et murs |
| Serrurier-dépanneur | 43.32B | **non trouvé** (officiel) | — | Famille serrurerie-métallerie : 4 % (2021) [11] ; « environ 18 000 » selon un site d'étude de marché [19] (à vérifier). 43.32B mêle métallerie et dépannage |
| Paysagiste | 81.30Z | **33 550 entreprises du paysage** | chiffres clés « 2024 » (enquête Xerfi de mars-juil. 2025) — UNEP [20] | 32 450 dans l'édition 2022 ; décompte de la profession, pas par code NAF |
| Multiservice | aucun code propre (81.21Z, 43.39Z, 81.10Z, 81.22Z selon les cas) | **non trouvé** | — | Codes cités par des guides de création [21] (à vérifier) |

## 4. Classement proposé

### Méthode
Score = **fréquence × besoin documentaire propre**, chacun noté de 1 à 3.

- **Fréquence (F)** : 3 = au moins 40 000 établissements, ou au moins 15 % des entreprises artisanales ; 2 = 15 000 à 40 000, ou 4 à 15 % ; 1 = moins, ou **non trouvé** (noté 1 *provisoirement*, marqué « ? »). Électricien : noté 3 sur les seuls indices non officiels, marqué « ? ».
- **Besoin documentaire propre (B)** : ce que le métier impose **en plus** des règles communes (`commun.md`). 3 = un document réglementaire propre à remettre (attestation, certificat) ou une obligation périodique du client à rappeler, comme le ramonage ; 2 = contraintes fortes propres sur le devis, la facture ou les aides ; 1 = règles communes seulement. Les notes B s'appuient sur `metier-btp.md` (électricité § 7, ramonage § 10, dépannage § 2) et sur `commun.md` (aides, TVA) ; celles marquées « * » reposent sur des obligations **à confirmer par la fiche métier** (entretien des chaudières, certificats gaz, fiche d'intervention fluides).
- Départage à score égal : proximité avec le modèle déjà construit (attestation + facture tirée + rappel périodique), puis fréquence.

| Rang | Métier | F | B | Score | Pourquoi |
|---|---|---|---|---|---|
| 1 | Électricien (dont IRVE) | 3 ? | 3 | 9 | Consuel, IRVE, qualification d'exercice (MB § 7) ; métier d'Hugo et des testeurs |
| 2 | Plombier / plombier-chauffagiste | 3 | 2 * | 6 | Dépannage sous l'arrêté de 2017, urgence hors établissement ; gaz à confirmer |
| 3 | Chauffagiste | 2 | 3 * | 6 | PAC = presque seul geste restant de MaPrimeRénov' par geste, n° d'agrément PAC sur la facture (CEE), entretien annuel à confirmer ; à traiter avec le plombier (même famille, 73 299 établissements) |
| 4 | Menuisier-poseur de fenêtres | 3 | 2 | 6 | Fenêtres sorties de MaPrimeRénov' par geste au 1er sept. 2026, CEE, 5,5 % |
| 5 | Couvreur-zingueur | 2 | 2 | 4 | Toiture refaite et décennale (jurisprudence 2024), isolation des combles sortie de MaPrimeRénov' par geste |
| 6 | Plaquiste-plâtrier | 2 | 2 | 4 | Isolation : 5,5 %, CEE, rénovation d'ampleur |
| 7 | Serrurier-dépanneur | 2 | 2 | 4 | Dépannage urgent : devis préalable, paiement limité au strict nécessaire (L221-10, 4°), métier exposé aux litiges |
| 8 | Paysagiste | 2 | 2 | 4 | Crédit d'impôt services à la personne : attestation fiscale annuelle, avance immédiate |
| 9 | Frigoriste-climaticien | 1 ? | 3 * | 3 | Attestation de capacité fluides (5 ans, 5 catégories) ; PAC air/air au 5,5 % depuis 2026 ; fréquence non trouvée |
| 10 | Maçon / gros œuvre | 3 | 1 | 3 | Très nombreux, mais ses besoins sont communs (décennale jointe, déchets, réception) |
| 11 | Peintre | 3 | 1 | 3 | Nombreux, règles communes seulement |
| 12 | Multiservice | 1 ? | 2 | 2 | Petit bricolage au crédit d'impôt (500 €, 2 h) ; population non mesurée |
| 13 | Charpentier | 1 | 1 | 1 | Peu nombreux, règles communes |
| 14 | Carreleur | 1 ? | 1 | 1 | Population non séparée de la maçonnerie |
| — | Ramoneur | 1 ? | 3 | 3 | Déjà fait : c'est le modèle |

### Ce que le classement dit vraiment
- Les **règles communes passent avant les fiches** : maçons et peintres, les plus nombreux, n'ont presque besoin que de `commun.md` (joindre l'attestation décennale, déchets, PV de réception). Une seule tâche commune sert plus d'artisans qu'une fiche métier.
- Le **trio électricien – plombier – chauffagiste** cumule fréquence et documents propres : c'est la suite naturelle du ramonage.
- Trois rangs sont fragiles faute de chiffre officiel : électricien (noté sur des indices non officiels), frigoriste et multiservice (notés 1 faute de chiffre). Une requête Sirene par code NAF (établissements actifs) les trancherait.

### Pour compléter (hors de cette session)
Interroger la base Sirene (data.gouv.fr ou api.insee.fr) par code NAF, établissements et unités légales actifs, avec la tranche d'effectif « 0 salarié » ; lire les fiches Constructys « Électricité », « Peinture », « Plâtrerie » si elles existent ; lire les chiffres clés 2025 de la CAPEB. Ces domaines doivent être autorisés dans les réglages réseau de la session.

## Sources

1. Communiqués CAPEB de déc. 2024 (620 000 entreprises artisanales, 97 %) — https://capeb.fr/www/capeb/media/communique-de-presse-nomination-nouveau-gouvernement-231224.pdf — consulté le 03/11/2026 — [résumé]
2. L'artisanat du bâtiment en France : les chiffres clés 2026 (artisan-assure.fr) — https://artisan-assure.fr/statistiques/artisanat-batiment-france/ — consulté le 03/11/2026 — (à vérifier)
3. L'artisanat du bâtiment, métiers et filières de formation (CAPEB, 2025) — https://www.capeb.fr/www/capeb/media/national/guide-metiers-2025-a5-vf.pdf — consulté le 03/11/2026 — [résumé]
4. Le bâtiment en chiffres (FFB) — https://ffbatiment.fr/le-batiment-en-chiffres — consulté le 03/11/2026 — [résumé]
5. Le marché de la construction en France en 2023 (SDES, d'après INSEE Ésane) — https://www.statistiques.developpement-durable.gouv.fr/le-marche-de-la-construction-en-france-en-2023 — consulté le 03/11/2026 — [résumé]
6. Micro-entreprise du bâtiment (habitatpresto) — https://www.habitatpresto.com/pro/conseils/administratif-fiscalite/autoentrepreneur-avantages-inconvenients — consulté le 03/11/2026 — (à vérifier)
7. Bâtiment : quelle place occupent réellement les microentrepreneurs ? (tpeactu, 17 juil. 2026) — https://tpeactu.fr/2026/07/17/microentrepreneurs-batiment/ — consulté le 03/11/2026 — (à vérifier)
8. Plaquette institutionnelle CAPEB 2025 — https://www.capeb.fr/www/capeb/media/national/capeb-plaquette-institutionelle-2025-web.pdf — consulté le 03/11/2026 — [résumé]
9. Fiche emploi-formation « Plomberie Chauffage », mars 2025 (Constructys, données INSEE au 31/12/2021) — https://www.metiers-btp.fr/wp-content/uploads/2025/03/FT-BAT-Plomberie-Chauffage.pdf — consulté le 03/11/2026 — [résumé]
10. Fiche emploi-formation « Bois », mars 2025 (Constructys, données INSEE au 31/12/2021) — https://metiers-btp.fr/wp-content/uploads/2025/03/FT-BAT-Bois.pdf — consulté le 03/11/2026 — [résumé]
11. Zoom sur l'artisanat du bâtiment, 14 fiches métiers (CAPEB, 2021) et guide 2025 — https://www.capeb.fr/www/capeb/media/document/capeb-guidemetiers-2021-web.pdf ; https://www.capeb.fr/www/capeb/media/national/guide-metiers-2025-a5-vf.pdf — consulté le 03/11/2026 — [résumé] (extraits partiellement illisibles)
12. Code APE 4321A (hellomybusiness) ; Code APE 4339Z (superindep) — https://www.hellomybusiness.fr/article/code-ape-4321a-travaux-dinstallation-electrique-electriciens-tout-savoir ; https://creation.superindep.fr/guides-pratiques/code-ape/4339z-autres-travaux-finition/ — consulté le 03/11/2026 — (à vérifier)
13. Étude de marché des travaux d'installation électrique (Propulse by CA) — https://propulsebyca.fr/idees-business/travaux-installation-electrique/marche — consulté le 03/11/2026 — (à vérifier)
14. Communiqué Qualifelec, qualification IRVE (24 nov. 2021) ; communiqué d'avr. 2019 — https://www.qualifelec.fr/wp-content/uploads/2022/02/CP-qualification-IRVE-nov.2021.pdf ; https://www.qualifelec.fr/wp-content/uploads/2019/10/Qualifelec-CP-IRVE-avril-2019.pdf — consulté le 03/11/2026 — [résumé]
15. REP-GF, liste des opérateurs attestés (data.gouv.fr) — https://www.data.gouv.fr/datasets/rep-gf-liste-des-operateurs-attestes-1/discussions — consulté le 03/11/2026 — [résumé]
16. Code NAF 8122Z (convention.fr) ; avis de situation Sirene d'entreprises de ramonage — https://www.convention.fr/code/8122Z/ — consulté le 03/11/2026 — [résumé]
17. Fiche emploi-formation « Maçonnerie », mars 2025 (Constructys, données INSEE au 31/12/2021) — https://www.metiers-btp.fr/wp-content/uploads/2025/03/FT-BAT-Maconnerie.pdf — consulté le 03/11/2026 — [résumé]
18. Fiche emploi-formation « Couverture », mars 2025 (Constructys, données INSEE au 31/12/2021) — https://www.metiers-btp.fr/wp-content/uploads/2025/03/FT-BAT-Couverture.pdf — consulté le 03/11/2026 — [résumé]
19. Étude de marché de la serrurerie métallerie (Propulse by CA) — https://propulsebyca.fr/idees-business/travaux-serrurerie/etude-marche — consulté le 03/11/2026 — (à vérifier)
20. Chiffres clés 2024 des entreprises du paysage (UNEP, via DRAAF Nouvelle-Aquitaine) — https://draaf.nouvelle-aquitaine.agriculture.gouv.fr/IMG/pdf/unep_chiffres_cles_2024_france_entiere.pdf — consulté le 03/11/2026 — [résumé]
21. Le code APE pour un homme toutes mains (copeps) ; Devenir bricoleur multiservices (superindep) — https://copeps.fr/actualites/code-ape-homme-toute-main-insee/ ; https://creation.superindep.fr/guides-pratiques/metiers/bricoleur-multiservices-auto-entreprise/ — consulté le 03/11/2026 — (à vérifier)
