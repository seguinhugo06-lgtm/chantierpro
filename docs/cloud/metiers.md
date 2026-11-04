# Rapport — session cloud « metiers » (3 nov. 2026)

Deux branches, rien sur `main`, aucune pull request, aucun accès à la production.

- **`cloud/metiers-docs`** : la recherche par métier et ses corrections. **Aucun code sur cette branche** : seulement `docs/`. C'est elle qui sera livrée en premier.
- **`cloud/metiers`** : la même recherche, plus le **code du « lot 0 »** (RGE imprimé, Qualiopi retiré, TVA des chaudières, modèles) et la migration 108. Ce code attend la décision n° 3 d'Hugo. Commits de code laissés sur `cloud/metiers` : `3b0d6f1`, `9a2eed5`, `4526173` (première session), puis `8253088`, `b8a34f1`, `5f0f4a0` (corrections du 3 nov.).

## Ce qui est fait

Dans `docs/metiers/` :
- **15 fiches métier**, chacune selon les 8 points demandés, avec ses sources (URL, date de consultation, niveau de preuve) : `electricien`, `plombier`, `chauffagiste`, `frigoriste`, `ramoneur`, `macon`, `couvreur`, `charpentier`, `menuisier`, `plaquiste`, `peintre`, `carreleur`, `serrurier`, `paysagiste`, `multiservice`. Le plombier-chauffagiste est couvert par `plombier` + `chauffagiste`.
- **`commun.md`** : les règles valables pour tous (décennale, devis, TVA, autoliquidation, aides, RGE), pour ne pas les répéter dans chaque fiche.
- **`chiffres.md`** : la priorité des métiers, chiffrée là où une source existe (établissements INSEE 2021 via Constructys, CAPEB), « non trouvé » ailleurs.
- **`synthese.md`** : commun et non commun, ce que l'app fait déjà (constaté dans le code), la proposition d'expérience par métier, l'ordre de réalisation, les décisions pour Hugo.
- **`avis-juriste-2026-11-03.md`** : la relecture de `juriste-btp`, recopiée telle quelle ; ses corrections sont appliquées dans les fiches et la synthèse.

Méthode : six agents de recherche en parallèle (trois métiers chacun, plus un pour le commun et les chiffres), puis `juriste-btp`, puis un agent qui a appliqué ses corrections.

## Preuves

- Code relu au commit `adbf08d` (lectures et recherches dans `src/`, détail dans `synthese.md` § 2).
- Constats dans le code, à corriger quel que soit le choix sur les métiers :
  - **le n° RGE saisi dans Paramètres n'est imprimé nulle part** : `Settings.jsx` l. 767-770 enregistre `rge` et `rgeOrganisme` ; les deux générateurs (`devisHtmlBuilder.js` l. 454, `DevisPage.jsx` l. 1692) impriment `labels`, qu'aucun fichier n'écrit (recherche de `labels` dans `src/services`, `src/hooks`, `src/context`, `src/stores` : rien) ;
  - **« Qualiopi » figure parmi les organismes RGE** (`Settings.jsx` l. 140), alors que c'est la certification des organismes de formation ;
  - **aucune mention d'autoliquidation** n'est imprimée sur un devis ou une facture (seule une dépense porte le champ).
- `npm ci` : réussi.
- `npm run verifier` (standard) sur `1981d16`, tout vert : tests 1199 réussis sur 1199, lint 0 erreur (241 avertissements déjà présents), smoke et build réussis. Cette vérification porte sur les documents seuls, sur l'ancienne base `adbf08d`. Celle de `dbb0066` (`cloud/metiers-docs` corrigée ; le commit suivant ne touche que ce rapport) est recopiée dans « Corrections du 3 nov. » ; aucune n'est rapportée sur la pointe de `cloud/metiers` (la session locale la lance avant de livrer).

## Ce qui n'a pas pu tourner, et pourquoi

- **Aucun texte officiel ouvert.** Le réseau de la session ne résolvait pas `legifrance.gouv.fr`, `service-public.fr`, `bofip.impots.gouv.fr`, `insee.fr`, `consuel.com`, etc. Seule la recherche web marchait : toutes les sources sont des **résumés de moteur de recherche**, marqués [résumé] ou (à vérifier). Aucun texte réglementaire n'est donc recopié « mot pour mot » comme règle à coder.
- **Quota de recherches épuisé** (200 pour la session, partagé entre les agents) : quelques points n'ont pas été cherchés (élagage, certifications de paysagiste, mentions de l'Anah, loi de finances 2026 pour le crédit d'impôt services à la personne). Ils sont marqués « à vérifier » dans les fiches.
- **Chiffres manquants** : pas de nombre officiel d'entreprises pour électricien, peintre, plaquiste, carreleur, serrurier, frigoriste, ramoneur, multiservice. Une requête Sirene par code NAF les donnerait.
- `npm run verifier -- --complet` : non lancé sur les documents dans la session cloud (son seul passage, sur `4526173`, porte sur le lot 0 de `cloud/metiers` : voir plus bas) ; la session locale le rejoue (Décisions d'Hugo, n° 2).

## Ce qui reste

1. **Relire au texte** les points encore ouverts de la liste du juriste (`synthese.md`, fin) avant tout code : part « fourniture » des bornes (BOFiP), PAC air-air, fenêtres et isolation (annexe IV), décret MaPrimeRénov' du 1er sept. 2026, attestations d'entretien, certificats gaz, services à la personne, plomb (CSP L1334-8) et CERFA 15497*04. Relus au texte le 3 nov. 2026 : bornes (hors fourniture), entretien des chaudières, extension, vigilance d'un particulier, champ du repérage amiante.
2. **Soldé** le 3 nov. 2026 (`71a36af`) : `docs/metier-btp.md` § 4 et les fiches maçon et charpentier sont alignés sur la TVA d'une extension (toute extension à 20 %, BOI-TVA-LIQ-30-20-90-30 § 380 ; la règle des 10 % de surface s'applique en plus aux travaux sur l'existant).
3. Compléter `chiffres.md` par Sirene.
4. Faire passer chaque lot par `/tache` et le `critique-produit`.

## Décisions pour Hugo

Détail dans `synthese.md` § 5. Les principales :
1. Choix du métier à l'inscription : multiple et passable (recommandé) ?
2. Premier lot après le ramonage : l'attestation d'entretien chaudière / PAC / poêle (recommandé) ou l'électricien ?
3. Corrections immédiates (RGE imprimé, Qualiopi retiré, TVA des chaudières à 20 % dans les modèles, la bibliothèque et le référentiel ; les lignes qui citent MaPrimeRénov' ne sont pas touchées, voir `synthese.md` § 3.2) : à faire tout de suite (recommandé).
4. Un testeur par métier avant de construire son lot.
5. Avance immédiate Urssaf : à écarter pour l'instant (recommandé).
6. TVA : suggestion seulement, jamais blocage, tant que rien n'est relu au texte (recommandé).
7. Autoriser Légifrance, le BOFiP, service-public, l'INSEE et le Consuel dans le réseau de la prochaine session.
8. Rappel de chaudière : peut-il dire « obligatoire » ?
9. Formules « réalisé selon la norme … » : oui ou non ?
10. MaPrimeAdapt' : avertissement (recommandé) ou blocage ?

## Textes nouveaux soumis au juriste

Sur `cloud/metiers-docs`, aucun texte destiné à être imprimé (pas de code). Les textes imprimés du lot 0 (`cloud/metiers`) sont listés dans « Corrections du 3 nov. ». Les 16 fiches juridiques (`commun.md` + 15 métiers) ont été relues par `juriste-btp` le 3 nov. 2026 : 2 erreurs bloquantes (TVA des bornes rattachée à la qualité du client ; isolation des rampants annoncée aidée par MaPrimeRénov' par geste), une quinzaine « à corriger », toutes appliquées.

## Risques

- **Tout repose sur des résumés.** Une règle codée depuis ces fiches sans relecture au texte peut imprimer une mention ou un taux faux. Les fiches le disent en tête.
- **Le droit des aides bouge vite** (MaPrimeRénov' modifié en février et en septembre 2026, TVA des PAC en juillet 2026). Dater toute règle et la relire avant chaque lot.
- **Mentions d'aides des modèles de devis** : la session cloud craignait des promesses d'aides périmées (fenêtres, isolation), sans l'avoir vérifié ligne à ligne. Recherche faite le 3 nov. 2026 au soir (`synthese.md` § 3.2) : aucune ligne du code utilisé par l'app n'annonce un montant d'aide ni une éligibilité ; deux lignes facturent un service lié à MaPrimeRénov' (`renovation-energetique.js:111` ; `trade-library.js:1060`, pour de l'isolation), à revoir ; `maprimerenov-templates.js`, qui écrit « Travaux éligibles à MaPrimeRénov' … », n'est importé par aucun fichier (pas plus que `renovation-compliance.js`, qu'il est seul à importer).

## Résumé

- 15 fiches métier, un fichier commun, les chiffres et la synthèse sont dans `docs/metiers/`.
- Aucun texte officiel n'a pu être ouvert par la session cloud ; seules les corrections du juriste du 3 nov. au soir ont été relues au texte : le reste est à relire avant de coder.
- Relu par `juriste-btp` ; 2 erreurs bloquantes et une quinzaine d'autres corrigées.
- Trois défauts constatés dans l'app : RGE jamais imprimé, « Qualiopi » dans la liste RGE, pas de mention d'autoliquidation.
- Commun à tous : décennale, devis de dépannage, TVA par ligne, sous-traitance, photos.
- Propre aux métiers : attestation + rappel (chauffagiste, frigoriste), certificat tiers (Consuel, gaz), qualifications, lignes techniques, urgence, récurrence, crédit d'impôt.
- Proposition : choisir son métier, catalogue trié, « Mes qualifications », documents sur le modèle du ramonage.
- Ordre : corrections, qualifications et métier, attestation d'entretien, dépannage, électricien.
- 11 décisions attendent Hugo (`synthese.md` § 5), dont le premier lot après le ramonage.
- À faire ensuite : ouvrir le réseau aux sites officiels et relire les points encore ouverts (`synthese.md`, fin).
## Suite : lot 0 (3 nov. 2026, après « fais tout ça ») — sur `cloud/metiers` seulement

Ce qui ne dépendait d'aucune décision d'Hugo a été fait. Le reste attend ses réponses ou une relecture au texte (ci-dessous).

**Corrigé** (commits `3b0d6f1`, `9a2eed5`, `4526173`) :
1. **Le RGE saisi s'imprime enfin**, dans les trois générateurs (`devisHtmlBuilder.js`, aperçu de `DevisPage.jsx`, `pdfHtmlBuilder.js`), par une règle unique `src/lib/qualifications.js`. Texte d'origine : « Entreprise RGE (Reconnu garant de l'environnement) — N° … (organisme) — Domaine : … — Valide jusqu'au … » (remplacé le 3 nov. au soir, voir « Corrections du 3 nov. »). Jamais sans numéro, **jamais sans date de fin** ni après elle (validité jugée à la date du document), jamais avec Qualiopi. Paramètres : nouveaux champs « Fin de validité » et « Domaine(s) RGE » (réglages sans colonne : aucune migration), avertissement quand le RGE n'est pas imprimé et pourquoi.
2. **Qualiopi retiré** de la liste des organismes RGE ; Certibat et Cerqual Qualitel ajoutés.
3. **Chaudière gaz à 20 %** : le modèle de devis « Remplacement chaudière gaz » sortait au taux de l'entreprise (10 %), et la bibliothèque des métiers (compositeur de devis et site public) à **5,5 %** — illégal depuis le 1er janv. 2025 (relevé par `juriste-btp`). Les deux sont à 20 % (chaudières fossiles, 1er mars 2025). L'entretien garde le taux de l'entreprise, point marqué « à vérifier ».

**Relecture** : `juriste-btp` sur le commit (rien de bloquant dans le correctif ; libellé, date obligatoire, date du document, textes d'aide corrigés comme il l'a demandé).

**Preuves** :
- tests `src/lib/__tests__/qualifications.test.js` (12) ; contre-essai : sans la correction, 4 échouent (générateurs, modèle, bibliothèque) ;
- parcours navigateur « aperçu du devis : le RGE saisi s'imprime s'il est valide, pas s'il est expiré » ; contre-essai avec l'ancien aperçu : échoue (« aucun ») ;
- `npm run parcours -- documents` : 16 parcours verts avant l'ajout ;
- `npm run verifier -- --complet` sur `4526173` : tests (1211), lint (0 erreur), smoke, build, banc, audit d'interface **verts** ; parcours : **4 en échec, tous déjà en échec sur `main` (`adbf08d`)**, rejoués un à un sur les deux commits : « équipe : heures à valider », « signature sur place » (×2, « Faire signer » introuvable), « trésorerie : seuil d'alerte ». Panne antérieure à cette branche, probablement liée à la date du jour (à corriger dans une tâche à part : elle bloquera toute livraison qui exige le niveau complet). Le nouveau parcours RGE et les autres parcours « documents » sont verts ;
- `npm run verifier` (standard) sur `ecf10af` : tests 1211/1211, lint 0 erreur, smoke et build verts (première session, avant les corrections du 3 nov. ; pointes actuelles : voir « Corrections du 3 nov. »).

**Limites** :
- La **page de signature en ligne** du client n'imprime pas encore le RGE : la fonction SQL `get_devis_for_signature` ne renvoie pas ces réglages. Migration 108 prête (voir « Corrections du 3 nov. »), non appliquée.
- Un artisan qui avait saisi un RGE sans date ne le verra pas imprimé tant qu'il n'a pas ajouté la date (l'écran le lui dit). Avant, il ne l'était jamais.
- Non touché, à vérifier (relevé en passant) : dans la bibliothèque, le plancher chauffant, le désembouage et le thermostat sont à 5,5 %, ce qui semble douteux ; la PAC air/eau à 5,5 % est plausible.

## Comment arriver au reste

Dans l'ordre, ce qui débloque chaque étape :

1. **Livrer d'abord `cloud/metiers-docs`** (documents seuls). Puis, **après ta décision n° 3**, le lot 0 de `cloud/metiers` : une session locale le relit, applique la migration 108 et le livre (`/livrer`).
2. **Ouvrir le réseau** de l'environnement cloud aux sites officiels (Légifrance, BOFiP, service-public, INSEE, Consuel) : claude.ai › environnement › accès réseau. Sans eux, aucune règle de TVA ou d'attestation ne peut être relue au texte, et la suite reste bloquée.
3. **Répondre aux décisions** (`docs/metiers/synthese.md` § 5). Les trois qui bloquent : choix du métier à l'inscription (multiple, recommandé) ; premier lot (attestation d'entretien chaudière / PAC / poêle, recommandé) ; rappel de chaudière « obligatoire » ou non.
4. **Trouver un testeur** chauffagiste ou plombier dans ton entourage, comme tes amis ramoneurs. Sans testeur, ne pas construire le lot.
5. Ensuite, une session par lot, avec `/tache` : critique-produit d'abord, relecture au texte des points listés par le juriste, code dans les générateurs, `juriste-btp`, vérification complète, livraison. Ordre : lot 1 (qualifications multiples et choix du métier), lot 2 (attestation d'entretien + rappel), lot 3 (dépannage express), lot 4 (électricien), puis les autres (`synthese.md` § 4).

## Corrections du 3 nov.

Deux relectures (code, puis juriste au texte officiel) ont été appliquées le 3 nov. au soir. Séparation demandée : documents sur `cloud/metiers-docs`, code sur `cloud/metiers`, jamais un commit qui touche les deux.

### Ce qui est fait, et la preuve

**Branche `cloud/metiers-docs`** (créée depuis `origin/main` `a9b2e86`) :
- reprise des 4 commits de documents (`3c2a0a3`, `21734b0`, `1981d16`, `9dfdb68`, devenus `d2e3a90`, `4503d7d`, `0aaeb6e`, `5f4fffc`), plus la ligne Qualigaz de `chauffagiste.md` venue de `9a2eed5` ;
- `71a36af` : toutes les corrections du juriste qui touchent `docs/` (fiches, `commun.md`, `docs/metier-btp.md` § 4), l'en-tête de `synthese.md` (« aucun code » sur cette branche ; commits de code cités) et la décision n° 11 de la synthèse ;
- `21c5b6c` (commit de ce rapport) : en-tête et suite du rapport, ligne du lot 0 de `synthese.md` ;
- après le contrôle du 3 nov. au soir, en local (branche `corr-metiers-docs`) : `dbb0066` (restes des fiches, de la synthèse et de `docs/metier-btp.md`, détail plus bas), puis un commit qui ne touche que ce rapport (attributions, restes soldés, vérifications réellement faites).

**Branche `cloud/metiers`** (code ; `cloud/metiers-docs` y est fusionnée jusqu'à `21c5b6c` (fusion `9f417f5`), puis `main` (qui contient `dbb0066` et ce rapport) le 4 nov. (voir « Corrections de la relecture du 4 nov. »)) :
- `8253088` : chaudières gaz et fioul à 20 % dans le référentiel du catalogue et l'import des articles ; commentaire de l'entretien corrigé ;
- `b8a34f1` : RGE imprimé seulement avec intitulé et organisme (exigence Anah), « Autre » retiré, nouvelle ligne imprimée, date illisible refusée, aide de Paramètres nuancée ;
- `5f0f4a0` : migration 108 (RGE sur la page de signature), en fichier, **appliquée nulle part** ;
- fusion de `origin/main` (`ac624c7`), sans conflit.

Preuves (les cinq premières sont rapportées par la session cloud, pour `cloud/metiers`) :
- tests `src/lib/__tests__/qualifications.test.js` : 16 sur 16 ;
- contre-essai TVA : sans la correction des sources, 2 tests échouent (référentiel, import) ;
- contre-essai RGE : avec l'ancienne règle, 6 tests échouent ;
- banc `npm run banc:migrations` : « Tout est vert (654 vérifications) », dont 5 pour la 108 ; contre-essai : sans les quatre clés, « ✗ 108 : un visiteur reçoit le numéro, l'organisme, la date de fin et l'intitulé RGE (undefined / undefined / undefined / undefined) » ;
- relecture `gardien-securite` de la 108 : **OK**, rien de bloquant ni à corriger (fonction identique à la 106 hormis les quatre clés ; liste toujours fermée ; `GRANT` redondant mais sans danger). Conseil : après application, contrôler le md5 du corps contre le fichier, comme pour la 106 ;
- vérification de `cloud/metiers-docs` corrigée, rejouée en local après `npm ci` (réussi) : `npm run verifier` (standard) sur `dbb0066`, arbre propre ; sortie recopiée mot pour mot :

  ```
  Vérification « standard » de dbb0066

    ✓ Tests (21.7 s) — 1204 passed (1204)
    ✓ Lint (0 erreur) (3.0 s) — 241 problems (0 errors, 241 warnings)
    ✓ Smoke (12.6 s)
    ✓ Build (11.9 s)

  ✓ Tout est vert — niveau « standard ».
  ```

- `cloud/metiers`, `npm run verifier -- --complet` sur `00f0009` (session cloud du 3 nov., 19 h 57 UTC), sortie recopiée :

  ```
  Vérification « complet » de 00f0009
    ✓ Tests (50.3 s) — 1220 passed (1220)
    ✓ Lint (0 erreur) (6.7 s) — 241 problems (0 errors, 241 warnings)
    ✓ Smoke (31.2 s)
    ✓ Build (32.3 s)
    ✓ Banc de migrations (6.1 s)
    ✓ Parcours (navigateur) (2114.7 s)
    ✓ Audit d’interface (386.3 s)
  ✓ Tout est vert — niveau « complet ».
  ```
  Un premier passage complet sur `9f417f5` avait un parcours en échec : le parcours RGE attendait « jusqu'au » avec une apostrophe simple, alors que le HTML l'écrit `&#39;`. Corrigé par `00f0009` (test seulement). **Limite** : `00f0009` précède les changements de franchise arrivés sur `main` dans les deux générateurs (`fec3d808`, 20 h 44 UTC) ; cette vérification ne vaut pas pour la branche fusionnée (voir « Corrections de la relecture du 4 nov. »).

### Textes nouveaux soumis au juriste

Tous recopiés de la correction exacte du juriste (points 3, 15 et 16), sans changement :
- ligne imprimée (les trois générateurs : `devisHtmlBuilder.js`, aperçu de `DevisPage.jsx`, `pdfHtmlBuilder.js`, par `src/lib/qualifications.js`) : « Entreprise RGE (Reconnu garant de l'environnement) — Qualification : ${intitulé} — ${organisme} — N° ${numéro} — Valide jusqu'au ${date} » ;
- Paramètres, avertissements : « Choisissez l’organisme qui a délivré votre RGE : l’Anah exige son nom sur les devis et factures des travaux aidés. » ; « Ajoutez l’intitulé de votre qualification RGE, tel qu’il figure sur votre certificat : l’Anah l’exige sur les devis et factures des travaux aidés. » ;
- Paramètres, champ : libellé « Intitulé de la qualification RGE », aide « Tel qu’il figure sur votre certificat (ex. : QualiPAC chauffage et eau chaude sanitaire). Exigé par l’Anah sur les devis et factures des travaux aidés. » ;
- aide du numéro RGE : « Reconnu garant de l’environnement. Imprimé sur vos devis et factures en PDF ; il n’apparaît pas sur la page de signature en ligne ni sur l’exemplaire signé. » (à rétablir à « … Imprimé sur vos devis et factures. » une fois la 108 en production) ;
- **un seul texte de mon cru, à faire relire** : « La date de fin de validité n’est pas lisible : ressaisissez-la dans Paramètres. En attendant, le RGE n’est pas imprimé. » (écran Paramètres seulement, jamais imprimé).

### Décisions d'Hugo

1. **Chiffres de priorité par métier** (Sirene, rang 1 de l'électricien) : garder « indices non officiels » dans `chiffres.md`, ne publier aucun chiffre dans l'app ni sur le site (recommandé).
2. **Vérification complète** : la session locale la rejoue sur la pointe livrable de chaque branche (et non sur `3b0d6f1`) ; écart de lint 241 / ~840 avertissements à expliquer (recommandé : rejouer, ne rien corriger en masse).
3. **Périmètre d'impression du RGE** : recommandé (juriste) : sur tous les documents, seulement si l'intitulé est saisi, jamais sans intitulé. C'est ce que fait le code ; si tu choisis « seulement les travaux du domaine qualifié », le lot 0 change.
4. **Autres lignes à 5,5 % de la bibliothèque** (plancher chauffant l. 864-870, l. 938 ; désembouage l. 939) : ouvrir une tâche ; recommandé : 10 % par défaut, sauf travaux indissociablement liés à une opération éligible, après lecture du BOI-TVA-LIQ-30-20-95 § 20. Non touché.
5. **Lot 0** (décision n° 3 de la synthèse) : livrer le code de `cloud/metiers` (recommandé), après `cloud/metiers-docs`.
6. **Décennale par devis sans valeur par défaut** (question 4 du juriste) : d'accord ? (recommandé par le juriste ; ajoutée au § 5 de la synthèse, n° 11).

### Point par point

**À corriger (juriste)**
1. Ancien taux, trois conditions cumulatives : `chauffagiste.md` l. 71 et 82 — fait (`71a36af`).
2. TVA de l'entretien de chaudière : `chauffagiste.md` l. 72, `synthese.md` (`71a36af`) ; `chauffage.js` et commentaire + titre du test (`8253088`) — fait.
3. Mentions RGE de l'Anah : `qualifications.js` (« Autre » retiré, intitulé et organisme exigés, nouvelle ligne), `Settings.jsx`, tests, parcours `documents.cjs` — fait (`b8a34f1`).
4. Borne IRVE : `electricien.md` l. 75 et 109, `synthese.md` (lot 4, encadré du juriste, vérification n° 1) — fait (`71a36af`).
5. Coup de pouce Chauffage : `commun.md` l. 70, `chauffagiste.md` l. 88, sans mention bloquante — fait (`71a36af`).
6. Fluides frigorigènes : `frigoriste.md` l. 26 et 28, `chauffagiste.md` l. 27 — fait (`71a36af`).
7. Consuel, validité d'un an : `electricien.md` l. 47 — fait (`71a36af`).
8. Services à la personne, loi n° 2026-492 : `commun.md` l. 84 — fait (`71a36af`).
9. Éco-PTZ : `commun.md` l. 74 — fait (`71a36af`).
10. Extension : `docs/metier-btp.md` l. 70, `macon.md` l. 93, 96 (et le tableau l. 131), `charpentier.md` l. 71 — fait (`71a36af`). **À signaler à la session principale : MB § 4 est mis à jour sur cette branche, à relire à la livraison.**
11. Vigilance d'un particulier : `macon.md` l. 40 — fait (`71a36af`).
12. Amiante : `macon.md` l. 52, `plaquiste.md` l. 54 et 83 — fait (`71a36af`).
13. Isolation lors d'une réfection de toiture : `couvreur.md` l. 47 — fait (`71a36af`).
14. Chaudières à 10 % restantes : `ouvrages-lot08-plomberie-cvc.js` (PL_02_01_001 et 002 à 20 %), `articles-btp-suite.js` (`tva: 20` sur les trois chaudières fossiles) — fait (`8253088`). **Corrigé le 4 nov.** : `createCatalogueItem`, cité ici comme le chemin de l'import, n'était appelé par aucun écran (fonction morte, supprimée). Le vrai chemin, le sélecteur du référentiel (`ArticlePicker`), était déjà corrigé sur `main` (`tvaArticleReferentiel`) ; l'import en masse (`importerReferentiel`, `Catalogue.jsx`) ne recopiait aucun taux : corrigé par `620b737`, avec son test. L'entreprise en franchise repasse les lignes à 0 % au moment du devis (`sansTva`, inchangé). **Repris au contrôle local du 4 nov.** : `620b737` imposait 10 % aux articles sans taux propre ; corrigé par `aa7f0f7` (dernière section).
15. RGE absent de la page de signature : migration 108 (`5f0f4a0`) et aide de `settings-field-rge` nuancée (`b8a34f1`) — fait, migration non appliquée.
16. Libellé RGE : même correction que le point 3 — fait (`b8a34f1`).

**Introuvable (juriste)**
1. Mentions RGE des fiches CEE : aucune mention CEE codée — rien à faire.
2. PLF 2027 : `commun.md` l. 64, « (à vérifier) » gardé, « projet de loi, non voté », rien à afficher — fait (`71a36af`).
3. Habilitation Qualigaz : `plombier.md` l. 33 (et la liste à vérifier l. 127) — fait (`71a36af`).
4. Attestation fiscale « avant le 31 mars » : `multiservice.md` l. 45 (et l. 88), `commun.md` l. 82 : présenté comme un conseil — fait (`71a36af`).
5. Biofioul : `chauffagiste.md` l. 83 — fait (`71a36af`).

**À décider** : les 4 points sont recopiés dans « Décisions d'Hugo » ci-dessus, non appliqués.

**Relecture de code**
1. Hors périmètre : documents séparés sur `cloud/metiers-docs`, livrable seule ; le code reste sur `cloud/metiers`, en attente de la décision n° 3.
2. Rapport inexact : en-têtes du rapport et de la synthèse corrigés, commits de code cités. Vérification : aucune sortie rapportée par la session cloud ; rejouée en local sur `dbb0066` (`cloud/metiers-docs` corrigée ; le commit suivant ne touche que ce rapport ; sortie recopiée ci-dessus) ; sur `cloud/metiers`, la session locale la lance avant de livrer.
3. TVA partielle : les trois sources sont à 20 % avec un test chacune (`8253088`, et `9a2eed5` pour la bibliothèque et le modèle).
4. RGE et page de signature : migration 108 (`5f0f4a0`), aide nuancée (`b8a34f1`).
5. Date du document : déjà fait par `9a2eed5` (`jourDuDocument(doc)` dans les trois générateurs, test « la validité s’apprécie à la date du document »).
6. Texte jamais relu : libellé, périmètre et liste relus par le juriste (points 3 et 16, décision 3). La liste des organismes n'a pas pu être vérifiée sur l'annuaire France Rénov' (réseau) : toujours marquée « à vérifier » dans le code.
7. Vérification absente : sur `cloud/metiers`, la session cloud rapporte les tests, contre-essais et le banc listés ci-dessus ; la vérification complète de `00f0009` est recopiée ci-dessus ; celle de la branche fusionnée avec `main` est dans « Corrections de la relecture du 4 nov. ». Non fait non plus : la sonde de Paramètres à 375 px et l'aller-retour de `rgeValidite` en mode réel simulé. La session locale fait tout cela avant de livrer le lot 0.
8. RGE sans date de fin : déjà exigée pour imprimer depuis `9a2eed5`.
9. Date importée illisible : `jourValide` (AAAA-MM-JJ et vrai jour), testée (`b8a34f1`).
10. Décennale par devis : ajoutée aux décisions (synthèse § 5, n° 11, et ci-dessus).

### Contrôle du 3 nov. au soir (session locale)

Le contrôle de la branche a relevé des restes. Corrigés par `dbb0066` (documents seuls ; non relus par juriste-btp : reprise de son texte) :
- `chauffagiste.md` l. 105 : « entretien de chaudière : 10 %, ou 5,5 % si la chaudière est THPE » (la proposition disait encore « jamais à 5,5 % ») ; l. 149 et 150 marquées relues au texte ;
- listes « à vérifier » et tableaux alignés sur le texte déjà corrigé, ou marqués « relu le 3 nov. 2026, voir l. … » : `charpentier.md` l. 107 et 133, `macon.md` l. 160 et 161, `synthese.md` (vérifications n° 9 et 10), `electricien.md` l. 83, 99 et 145, `couvreur.md` l. 136, `commun.md` l. 135 et 136, `frigoriste.md` l. 146, `plaquiste.md` l. 123, `chiffres.md` l. 73, `multiservice.md` l. 105 ;
- `macon.md` l. 131 : réserve sur la notion d'immeuble neuf rétablie (comme la l. 94) ;
- `peintre.md` l. 56 et 86 : repérage amiante dans tout immeuble bâti, texte du juriste repris de `macon.md` l. 52 et `plaquiste.md` l. 54 (même erreur, hors de sa liste) ;
- `synthese.md` : lignes qui citent MaPrimeRénov', réellement trouvées dans les modèles et la bibliothèque (§ 3.2, lot 0, décision n° 3) ; en-tête et relecture du juriste : les corrections du 3 nov. au soir ont été relues au texte ;
- `docs/metier-btp.md` l. 70 : BOI-TVA-LIQ-30-20-90-30 du 22 oct. 2025, vérifié par juriste-btp le 3 nov. 2026 ; date de mise à jour du fichier (l. 7).

Puis un commit qui ne touche que ce rapport : attributions (`71a36af`, `21c5b6c`, point 4), reste soldé (« Ce qui reste », n° 2), 11 décisions, mentions d'aides (« Risques »), vérifications réellement faites (l'ancien marqueur remplacé par la sortie ci-dessus).

### Ce qui reste
- Appliquer la migration 108 (session locale, après la décision n° 3), puis rétablir l'aide du numéro RGE ; l'ajouter aux attentes de `docs/etat-production.md` à ce moment-là (non fait ici pour ne pas mêler documents et code).
- Sonde de Paramètres à 375 px et aller-retour de `rgeValidite` en mode réel simulé.
- Vérifier la liste des organismes RGE sur l'annuaire France Rénov'.
- Les lignes à 5,5 % douteuses de la bibliothèque (décision 4).
- Fait le 4 nov. : `main` (avec la branche de documents corrigée) fusionnée dans `cloud/metiers`. Reste : `npm run verifier -- --complet` sur le commit livrable de `cloud/metiers` (session locale, exigé par `/livrer`).
- Faire relire par juriste-btp les alignements de `dbb0066`, en commençant par `peintre.md` l. 56 et 86.
- Revoir les lignes qui citent MaPrimeRénov' (`synthese.md` § 3.2).
- Restes de même nature repérés le 3 nov. au soir, hors de la liste du contrôle, non touchés : `electricien.md` l. 21 (TVA « condition à vérifier ») ; `frigoriste.md` l. 20 (régime « à vérifier ») ; `multiservice.md` l. 139 et `synthese.md` (vérification n° 8) : « CGI 199 sexdecies après la loi de finances 2026 », alors que `commun.md` l. 84 cite la loi n° 2026-492 ; en-têtes « sans texte officiel ouvert » des fiches.

### Risques
- Un artisan qui avait saisi un RGE sans intitulé, ou avec « Autre », ne le verra plus imprimé tant qu'il n'a pas complété Paramètres (l'écran le lui dit). C'est voulu : sans intitulé, la mention peut tromper.
- Tant que la 108 n'est pas en production, le devis signé en ligne n'a pas la mention RGE : l'aide de Paramètres le dit.
- La 108 recopie toute la fonction de la 106 : une migration ultérieure qui modifierait `get_devis_for_signature` devra partir de la 108.

### Résumé
- Documents et code séparés : `cloud/metiers-docs` (documents seuls, à livrer d'abord), `cloud/metiers` (lot 0, attend ta décision n° 3).
- 16 corrections du juriste appliquées, 5 points introuvables traités, 4 décisions recopiées pour toi.
- Chaudière gaz ou fioul : 20 % dans la bibliothèque, les modèles, le sélecteur du référentiel et (depuis le 4 nov., `620b737`) l'import en masse, un test chacun.
- Entretien de chaudière : 10 %, ou 5,5 % si THPE (corrigé dans les fiches et le code).
- RGE imprimé avec intitulé, organisme, numéro et date, comme l'exige l'Anah ; « Autre » retiré.
- Migration 108 prête et vérifiée au banc : le RGE sur la page de signature. Non appliquée.
- Un seul texte nouveau de mon cru (date illisible) à faire relire.
- Contrôle du 3 nov. au soir : restes des fiches et de la synthèse alignés (`dbb0066`) ; vérification standard de `cloud/metiers-docs` rejouée en local : tout vert.
- Reste : appliquer la 108, sonde à 375 px, annuaire France Rénov', lignes à 5,5 % douteuses, lignes MaPrimeRénov' à revoir, vérification de `cloud/metiers` et vérification complète des deux branches (session locale).

## Corrections de la relecture du 4 nov.

Session cloud du 4 nov. 2026 (consigne metiers-v3). Branche `cloud/metiers`, poussée sans forcer. Rien sur `main`, aucune pull request, aucun accès à la production.

### Lot 0 (D-32)
- **Fusion de `origin/main`** : `a4d580a` (merge, pas de rebase). Deux conflits. `docs/cloud/metiers.md` : version de `main` gardée, la vérification complète de `00f0009` y est reportée. `src/lib/pdfHtmlBuilder.js` : les deux imports gardés (`qualifications` et `echapperHtml` de la branche, `mentionImmatriculation` de `main`).
- **Import du référentiel** : `620b737`. Le sélecteur (`ArticlePicker`) garde `tvaArticleReferentiel` de `main`, déplacée dans `src/lib/data` et toujours exportée par `ArticlePicker`. L'import en masse (`importerReferentiel`) passe par `articlesAImporterDuReferentiel`, qui recopie le taux de chaque article : chaudière gaz ou fioul à 20 %, dépose et chaudière granulés à 10 %, 0 % en franchise. **Défaut relevé au contrôle local** : ces 10 % n'étaient portés par aucun article, `620b737` les imposait à tout article sans taux propre (espaces verts compris) ; corrigé par `aa7f0f7` (dernière section).

### Point par point
1. [important] ArticlePicker et import : `620b737`. `createCatalogueItem` (fonction morte) et son test sont supprimés. Test `tvaChaudiere.test.js` « import en masse du référentiel » (3 cas). Contre-essai : sans la ligne `tva`, 2 tests échouent. Le point 14 et le résumé du 3 nov. sont corrigés dans ce rapport. Les 10 % imposés aux articles sans taux propre : corrigé par `aa7f0f7` (dernière section).
2. [important] Rapport en conflit : `a4d580a`. Phrases périmées corrigées : point 7, ligne « `dbb0066` … n'y sont pas encore » et « Ce qui reste ». Vérification complète du commit de fusion : voir plus bas.
3. [mineur] Date du document : `c21686f`. Test `pdfHtmlBuilder` : une facture du 1er juin 2025, avec une fin de validité au 31 déc. 2025, garde sa ligne RGE. Contre-essai : la même facture datée du 10 janv. 2026 ne l'a pas. Autre contre-essai : sans `jourDuDocument(doc)` dans `pdfHtmlBuilder.js`, le test échoue. Dans le parcours RGE, un 3e cas met la fin au lendemain de la date du devis ouvert (lue dans l'aperçu), donc déjà passée aujourd'hui : la ligne est imprimée. Contre-essai : sans `jourDuDocument(doc)` dans `DevisPage.jsx`, le parcours échoue (« fin 2026-10-12 : RGE imprimé (aucun) »).
4. [mineur] Ancien format `labels` : supprimé de `qualifications.js` et de `buildEntrepriseFields` (`df85e76`). Le test vérifie qu'il n'est plus imprimé.
5. [mineur] Commentaires périmés : `2a99b30`. `modeles/index.js` et `trade-library.js` citent CGI 279-0 bis, 2 bis, c ; 278-0 bis A, III bis ; BOI-TVA-LIQ-30-20-90-20 § 200. « À relire » est retiré.
6. [mineur] Texte de la date illisible : relu par `juriste-btp`. Sa formulation est appliquée (`4a2ff48`, l'étape `df85e76` est intermédiaire) : « La date de fin de validité enregistrée n’est pas reconnue : ressaisissez-la dans le champ « Fin de validité ». En attendant, le RGE n’est pas imprimé sur vos documents. » Raisons du juriste : le champ date apparaît vide, et le message s'affiche sous l'intitulé, si bien que « ci-dessus » visait le mauvais champ.
- Gardien-securite (108 et 110) : `0d5ae01`. Avertissement dans l'en-tête de la 108 (commentaire hors du corps de la fonction). Ligne 108 dans `docs/etat-production.md` : « remplacée par 110, ne jamais la rejouer après 110 », avec la requête de contrôle `position('''qualifications''' in prosrc) > 0`.
- `labels`, `createCatalogueItem` : plus aucune référence dans `src/`.

### Preuves
- `npm run verifier -- --complet` sur `4a2ff48` (dernier commit de code), arbre propre :

  ```
  Vérification « complet » de 4a2ff48
    ✓ Tests (60.7 s) — 1313 passed (1313)
    ✓ Lint (0 erreur) (8.0 s) — 242 problems (0 errors, 242 warnings)
    ✓ Smoke (35.4 s)
    ✓ Build (35.0 s)
    ✓ Banc de migrations (6.2 s)
    ✓ Parcours (navigateur) (2447.1 s)
    ✓ Audit d’interface (391.8 s)
  ✓ Tout est vert — niveau « complet ».
  ```
- L'avertissement de lint en plus (242 contre 241 sur `main`) venait d'un import devenu inutile dans un test. Retiré par `a5c75c8` (test seulement). Puis `0d5ae01` (commentaire SQL et documentation). `npm run verifier` (standard) sur `0d5ae01` :

  ```
  Vérification « standard » de 0d5ae01
    ✓ Tests (64.8 s) — 1313 passed (1313)
    ✓ Lint (0 erreur) (7.8 s) — 241 problems (0 errors, 241 warnings)
    ✓ Smoke (36.8 s)
    ✓ Build (34.6 s)
  ✓ Tout est vert — niveau « standard ».
  ```
  Banc sur `0d5ae01` : « Tout est vert (654 vérifications) ».
- **Limite** : la vérification complète porte sur `4a2ff48`. Les deux commits suivants ne changent pas le code de l'app : un import de test et des commentaires. La complète n'a pas été rejouée sur `0d5ae01`. `/livrer` l'exige sur le commit exact.

### Ce qui reste (session locale)
- `npm run verifier -- --complet` sur le commit livrable (`0d5ae01` ou plus récent).
- Sonde de Paramètres à 375 px : bloc RGE et nouvel avertissement.
- Aller-retour de `rgeValidite` et `rgeDomaine` en mode réel simulé.
- Vérifier `ORGANISMES_RGE` sur l'annuaire France Rénov'.
- Après livraison : appliquer la 108 (ou la 110 seule), contrôler le md5 du corps, rétablir l'aide du numéro RGE.
- Numéro 107 en double (ia-socle, franchise-suite) : en renuméroter un, hors de cette branche.
- Tâche TVA de la décision 4 : y joindre « Dépose ancienne chaudière fioul/gaz » (RE_03_01_006, à 5,5 %), et les chaudières bois et granulés de l'import, qui repartent sans taux depuis `aa7f0f7` (la base leur met son défaut, 20 %, comme avant la branche ; 5,5 % peut-être possible, ann. IV art. 30-0 D ter, à vérifier).

### Décisions d'Hugo (recopiées, non appliquées)
- Lignes à 5,5 % douteuses de la bibliothèque (plancher chauffant, désembouage) : ouvrir une tâche. Recommandé : 10 % par défaut, sauf travaux liés à une opération éligible, après lecture du BOI-TVA-LIQ-30-20-95 § 20.
- Décennale par devis, sans valeur par défaut : oui, recommandé par le juriste.
- Chiffres de priorité par métier : garder « indices non officiels », ne rien publier dans l'app ni sur le site (recommandé).
- Lot 0 et périmètre d'impression : déjà tranchés par D-32, rien à redemander.

### Textes nouveaux soumis au juriste
- Un seul : l'avertissement de la date illisible (point 6). Relu, sa formulation est appliquée.

### Risques
- Avant ce correctif, en mode réel, l'import en masse mettait tous les articles à 20 % (base, « ?? 20 »). Correction du contrôle local : aucun article du référentiel ne porte 10 % (seules les chaudières gaz et fioul portent un taux, 20 %) ; depuis `aa7f0f7`, les autres reprennent ce défaut de la base, comme avant la branche. Les articles déjà importés gardent leur taux : rien n'est repris en base. `620b737` n'est pas sur `main` (vérifié le 4 nov. par `git merge-base --is-ancestor`).
- Jamais rejouer 108 après 110 : écrit dans la 108 et dans `etat-production.md`.

### Résumé
- `main` fusionnée (`a4d580a`) : rapport pris sur `main`, deux imports gardés dans `pdfHtmlBuilder.js`.
- L'import en masse du référentiel garde le taux de chaque article : chaudières gaz et fioul à 20 % (`620b737`). Les articles sans taux propre ne sont plus mis à 10 % : la base leur met son défaut (`aa7f0f7`, contrôle local).
- `createCatalogueItem` (fonction morte) et l'ancien format `labels` sont supprimés.
- La validité RGE est jugée à la date du document : nouveau test sur une facture (pdfHtmlBuilder) et 3e cas dans le parcours, chacun avec son contre-essai.
- Les commentaires TVA citent le CGI et le BOFiP.
- Le texte de la date illisible est relu par juriste-btp, sa formulation est appliquée.
- 108 : « jamais après 110 » est écrit dans la migration et dans `etat-production.md`.
- Vérification complète verte sur `4a2ff48`. Standard et banc verts sur `0d5ae01`.
- Reste à la session locale : complète sur le commit livrable, sonde à 375 px, aller-retour en réel simulé, puis la 108.

## Correction du contrôle local du 4 nov. (taux à l'import du référentiel)

Session locale du 4 nov. 2026. Branche locale `corr-import-taux`, partie de `origin/cloud/metiers` (`53c8727`). Aucun push, rien sur `main`, aucune requête sur la base de production.

### Le défaut
- L'import en masse (`importerReferentiel`, `Catalogue.jsx`, par `articlesAImporterDuReferentiel` de `src/lib/data`) posait 10 % sur tout article sans taux propre (`620b737`). Avant la branche, ces articles partaient sans taux et l'écriture en base leur mettait son défaut (`useSupabaseSync` : `tva_rate: item.tva ?? item.tva_rate ?? 20`).
- Effet : les 9 articles « Espaces verts » du paysagisme (`articles-btp-fin.js` : gazon, plantations, massif, paillage, géotextile) passaient de 20 % à 10 %. La recherche donne 20 % à la création et à l'entretien d'espaces verts (`docs/metiers/paysagiste.md` § 5).
- Constaté sur le code de `53c8727` : le nouveau test échoue (« Gazon semis: expected 10 to be undefined » ; 523 articles importés avec un taux au lieu de 3), le nouveau parcours aussi (« Gazon semis 10, Gazon en rouleau 10, … Géotextile 10 »).

### La correction (`aa7f0f7`)
- `tauxPropreArticle(article, franchiseTva)` (`src/lib/data/index.js`) : 0 en franchise en base, sinon le taux que porte l'article, sinon `null`. Sur les 523 articles du référentiel, seules les trois chaudières gaz et fioul en portent un (20 %).
- `articlesAImporterDuReferentiel` n'écrit `tva` que si ce taux existe. Un article sans taux propre part sans taux, comme avant la branche : la base pose son défaut (20 %). En franchise, 0 % (et `Catalogue.creerArticle` force toujours 0 %).
- `ArticlePicker` (sélection d'un article) : vérifié, même règle. Le taux propre est présélectionné (chaudière gaz : 20 %), 0 % en franchise. Sans taux propre, le sélecteur propose 10 % comme avant (sur `main` et avant la branche), affiché et modifiable avant l'ajout. `tvaArticleReferentiel` revient dans `ArticlePicker.jsx`, comme sur `main`, et s'appuie sur `tauxPropreArticle`. Lu sur le code corrigé (`tvaArticleReferentiel` appelée hors de l'app, par la liste et par la recherche du référentiel) : « 10 » pour les 9 articles d'espaces verts, « 0 » en franchise, « 20 » pour les trois chaudières gaz et fioul.

### Preuves
- Tests (`src/lib/__tests__/tvaChaudiere.test.js`, « import en masse du référentiel ») : les 9 articles d'espaces verts importés n'ont pas de taux, et la base reçoit 20 % ; une chaudière gaz ou fioul importée a 20 % ; seuls les 3 articles qui portent un taux en ont un (ni la dépose ni la chaudière granulés) ; en franchise, tout est à 0 %.
- Contre-essais : sur le code d'avant la correction, 2 tests échouent (messages ci-dessus). `tauxPropreArticle` qui ignore le taux de l'article : 3 échecs (sélecteur à « 10 » pour la chaudière murale, chaudière importée sans taux, liste vide). Sans la règle de la franchise : 2 échecs (sélecteur à « 20 », import en franchise).
- Nouveau parcours (`scripts/parcours/clients-catalogue.cjs`, « référentiel BTP, import en masse… », 375 px, base simulée) : import de Paysagisme et Chauffage (61 articles), puis la chaudière murale choisie au sélecteur, hors franchise (SARL) puis en franchise (micro-entreprise). Vert sur le code de `aa7f0f7` (20 vérifications ; rejoué après le commit, code identique) : espaces verts à 20 %, aucun article à 10 %, chaudières gaz et fioul à 20 %, chaudière proposée à 20 % au sélecteur et enregistrée à 20 % ; en franchise, tout à 0 % et aucun taux proposé. Contre-essai : sur le code d'avant la correction, il échoue (message ci-dessus).
- Les deux parcours existants du sélecteur (« référentiel BTP : le prix d’achat n’est jamais inventé… », « catalogue : en franchise en base… ») sont verts sur le code corrigé (21 et 29 vérifications). Pour un article d'électricité sans taux propre, ils constatent 10 % proposé (les deux), 5,5 % choisi puis enregistré (le premier), 10 % enregistré (le second) ; en franchise, 0 %.
- `npm run verifier` (standard) sur `aa7f0f7`, arbre propre :

  ```
  Vérification « standard » de aa7f0f7
    ✓ Tests (23.3 s) — 1315 passed (1315)
    ✓ Lint (0 erreur) (2.9 s) — 241 problems (0 errors, 241 warnings)
    ✓ Smoke (11.9 s)
    ✓ Build (10.5 s)
  ✓ Tout est vert — niveau « standard ».
  ```
  Le commit suivant ne touche que ce rapport.
- **Limite** : la vérification complète (`--complet`) n'a pas été rejouée. Seuls les trois parcours du référentiel l'ont été.

### Ce qui reste
- Le sélecteur propose toujours 10 % aux articles d'espaces verts (comportement d'avant, non touché), que la recherche donne à 20 %. Cela relève de la suggestion de taux par ligne (`paysagiste.md` § 8, « Indispensable », table à relire par juriste-btp).
- Hors chaudières fossiles, aucun article du référentiel ne porte de taux propre. Leur taux n'a pas été recherché ici.
- Même situation au chauffage : « Entretien annuel chaudière gaz », « Chaudière bois bûches », « Chaudière granulés (pellets) » et « Dépose ancienne chaudière » n'ont pas de taux propre. L'import les remet au défaut de la base (20 %), comme avant la branche ; le sélecteur les propose à 10 %. Pour l'entretien, `chauffagiste.md` § 5 donne 10 % dans un logement de plus de 2 ans (5,5 % si THPE). Leur donner un taux propre est une décision de taux, à faire relire par juriste-btp : non fait ici, la consigne étant que seuls les articles qui portent un taux le transmettent.
- `npm run verifier -- --complet` sur le commit livrable (exigé par `/livrer`).
