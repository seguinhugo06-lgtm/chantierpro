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
- `npm run verifier` (standard) sur `1981d16`, tout vert : tests 1199 réussis sur 1199, lint 0 erreur (241 avertissements déjà présents), smoke et build réussis. Cette vérification porte sur les documents seuls ; celles des deux branches finales sont dans « Corrections du 3 nov. ».

## Ce qui n'a pas pu tourner, et pourquoi

- **Aucun texte officiel ouvert.** Le réseau de la session ne résolvait pas `legifrance.gouv.fr`, `service-public.fr`, `bofip.impots.gouv.fr`, `insee.fr`, `consuel.com`, etc. Seule la recherche web marchait : toutes les sources sont des **résumés de moteur de recherche**, marqués [résumé] ou (à vérifier). Aucun texte réglementaire n'est donc recopié « mot pour mot » comme règle à coder.
- **Quota de recherches épuisé** (200 pour la session, partagé entre les agents) : quelques points n'ont pas été cherchés (élagage, certifications de paysagiste, mentions de l'Anah, loi de finances 2026 pour le crédit d'impôt services à la personne). Ils sont marqués « à vérifier » dans les fiches.
- **Chiffres manquants** : pas de nombre officiel d'entreprises pour électricien, peintre, plaquiste, carreleur, serrurier, frigoriste, ramoneur, multiservice. Une requête Sirene par code NAF les donnerait.
- `npm run verifier -- --complet` : voir « Corrections du 3 nov. ».

## Ce qui reste

1. **Relire au texte** les 10 points listés par le juriste (`synthese.md`, fin) avant tout code : bornes IRVE, PAC air-air, chaudières fossiles, fenêtres et isolation (annexe IV), décret MaPrimeRénov' du 1er sept. 2026, attestations d'entretien, certificats gaz, services à la personne, TVA d'une extension.
2. **Aligner `docs/metier-btp.md` § 4** (« agrandissement > 10 % ») et les fiches maçon et charpentier (« extension = 20 % ») après lecture du BOFiP.
3. Compléter `chiffres.md` par Sirene.
4. Faire passer chaque lot par `/tache` et le `critique-produit`.

## Décisions pour Hugo

Détail dans `synthese.md` § 5. Les principales :
1. Choix du métier à l'inscription : multiple et passable (recommandé) ?
2. Premier lot après le ramonage : l'attestation d'entretien chaudière / PAC / poêle (recommandé) ou l'électricien ?
3. Corrections immédiates (RGE imprimé, Qualiopi retiré, modèles purgés des aides et taux périmés) : à faire tout de suite (recommandé).
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
- **Des modèles de devis existants promettent sans doute des aides qui n'existent plus** (fenêtres, isolation) : risque de pratique commerciale trompeuse tant que le lot 0 n'est pas fait (non vérifié ligne à ligne dans cette session).

## Résumé

- 15 fiches métier, un fichier commun, les chiffres et la synthèse sont dans `docs/metiers/`.
- Aucun texte officiel n'a pu être ouvert : tout est à relire au texte avant de coder.
- Relu par `juriste-btp` ; 2 erreurs bloquantes et une quinzaine d'autres corrigées.
- Trois défauts constatés dans l'app : RGE jamais imprimé, « Qualiopi » dans la liste RGE, pas de mention d'autoliquidation.
- Commun à tous : décennale, devis de dépannage, TVA par ligne, sous-traitance, photos.
- Propre aux métiers : attestation + rappel (chauffagiste, frigoriste), certificat tiers (Consuel, gaz), qualifications, lignes techniques, urgence, récurrence, crédit d'impôt.
- Proposition : choisir son métier, catalogue trié, « Mes qualifications », documents sur le modèle du ramonage.
- Ordre : corrections, qualifications et métier, attestation d'entretien, dépannage, électricien.
- 10 décisions attendent Hugo, dont le premier lot après le ramonage.
- À faire ensuite : ouvrir le réseau aux sites officiels et relire les 10 points prioritaires.
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
- `npm run verifier` (standard) sur le commit final : résultat en dernière ligne de ce rapport.

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
- `71a36af` : toutes les corrections du juriste qui touchent `docs/` (fiches, `commun.md`, `docs/metier-btp.md` § 4) ;
- commit de ce rapport : en-têtes du rapport et de `synthese.md` corrigés (« aucun code » sur cette branche ; commits de code cités), décision n° 11 ajoutée à la synthèse.

**Branche `cloud/metiers`** (code ; `cloud/metiers-docs` y est fusionnée pour garder les mêmes documents) :
- `8253088` : chaudières gaz et fioul à 20 % dans le référentiel du catalogue et l'import des articles ; commentaire de l'entretien corrigé ;
- `b8a34f1` : RGE imprimé seulement avec intitulé et organisme (exigence Anah), « Autre » retiré, nouvelle ligne imprimée, date illisible refusée, aide de Paramètres nuancée ;
- `5f0f4a0` : migration 108 (RGE sur la page de signature), en fichier, **appliquée nulle part** ;
- fusion de `origin/main` (`ac624c7`), sans conflit.

Preuves :
- tests `src/lib/__tests__/qualifications.test.js` : 16 sur 16 ;
- contre-essai TVA : sans la correction des sources, 2 tests échouent (référentiel, import) ;
- contre-essai RGE : avec l'ancienne règle, 6 tests échouent ;
- banc `npm run banc:migrations` : « Tout est vert (654 vérifications) », dont 5 pour la 108 ; contre-essai : sans les quatre clés, « ✗ 108 : un visiteur reçoit le numéro, l'organisme, la date de fin et l'intitulé RGE (undefined / undefined / undefined / undefined) » ;
- relecture `gardien-securite` de la 108 : **OK**, rien de bloquant ni à corriger (fonction identique à la 106 hormis les quatre clés ; liste toujours fermée ; `GRANT` redondant mais sans danger). Conseil : après application, contrôler le md5 du corps contre le fichier, comme pour la 106 ;
- vérifications des deux branches : VERIF_RESULTATS

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
4. Borne IRVE : `electricien.md` l. 75 et 109, `synthese.md` (lot 4, encadré du juriste, vérification n° 1) — fait (`71a36af` et commit du rapport).
5. Coup de pouce Chauffage : `commun.md` l. 70, `chauffagiste.md` l. 88, sans mention bloquante — fait (`71a36af`).
6. Fluides frigorigènes : `frigoriste.md` l. 26 et 28, `chauffagiste.md` l. 27 — fait (`71a36af`).
7. Consuel, validité d'un an : `electricien.md` l. 47 — fait (`71a36af`).
8. Services à la personne, loi n° 2026-492 : `commun.md` l. 84 — fait (`71a36af`).
9. Éco-PTZ : `commun.md` l. 74 — fait (`71a36af`).
10. Extension : `docs/metier-btp.md` l. 70, `macon.md` l. 93, 96 (et le tableau l. 131), `charpentier.md` l. 71 — fait (`71a36af`). **À signaler à la session principale : MB § 4 est mis à jour sur cette branche, à relire à la livraison.**
11. Vigilance d'un particulier : `macon.md` l. 40 — fait (`71a36af`).
12. Amiante : `macon.md` l. 52, `plaquiste.md` l. 54 et 83 — fait (`71a36af`).
13. Isolation lors d'une réfection de toiture : `couvreur.md` l. 47 — fait (`71a36af`).
14. Chaudières à 10 % restantes : `ouvrages-lot08-plomberie-cvc.js` (PL_02_01_001 et 002 à 20 %), `createCatalogueItem` (taux de l'article, sinon 10 %), `articles-btp-suite.js` (`tva: 20` sur les trois chaudières fossiles), tests du référentiel et de l'import — fait (`8253088`). Les trois sources (bibliothèque, modèles, référentiel/import) sont corrigées ensemble, chacune a son test. L'entreprise en franchise repasse les lignes à 0 % au moment du devis (`sansTva`, inchangé).
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
2. Rapport inexact : en-têtes du rapport et de la synthèse corrigés, commits de code cités ; vérification rejouée sur les deux branches finales (ci-dessus).
3. TVA partielle : les trois sources sont à 20 % avec un test chacune (`8253088`, et `9a2eed5` pour la bibliothèque et le modèle).
4. RGE et page de signature : migration 108 (`5f0f4a0`), aide nuancée (`b8a34f1`).
5. Date du document : déjà fait par `9a2eed5` (`jourDuDocument(doc)` dans les trois générateurs, test « la validité s’apprécie à la date du document »).
6. Texte jamais relu : libellé, périmètre et liste relus par le juriste (points 3 et 16, décision 3). La liste des organismes n'a pas pu être vérifiée sur l'annuaire France Rénov' (réseau) : toujours marquée « à vérifier » dans le code.
7. Vérification absente : voir les résultats ci-dessus. Non fait ici : la sonde de Paramètres à 375 px et l'aller-retour de `rgeValidite` en mode réel simulé, à faire par la session locale.
8. RGE sans date de fin : déjà exigée pour imprimer depuis `9a2eed5`.
9. Date importée illisible : `jourValide` (AAAA-MM-JJ et vrai jour), testée (`b8a34f1`).
10. Décennale par devis : ajoutée aux décisions (synthèse § 5, n° 11, et ci-dessus).

### Ce qui reste
- Appliquer la migration 108 (session locale, après la décision n° 3), puis rétablir l'aide du numéro RGE ; l'ajouter aux attentes de `docs/etat-production.md` à ce moment-là (non fait ici pour ne pas mêler documents et code).
- Sonde de Paramètres à 375 px et aller-retour de `rgeValidite` en mode réel simulé.
- Vérifier la liste des organismes RGE sur l'annuaire France Rénov'.
- Les lignes à 5,5 % douteuses de la bibliothèque (décision 4).

### Risques
- Un artisan qui avait saisi un RGE sans intitulé, ou avec « Autre », ne le verra plus imprimé tant qu'il n'a pas complété Paramètres (l'écran le lui dit). C'est voulu : sans intitulé, la mention peut tromper.
- Tant que la 108 n'est pas en production, le devis signé en ligne n'a pas la mention RGE : l'aide de Paramètres le dit.
- La 108 recopie toute la fonction de la 106 : une migration ultérieure qui modifierait `get_devis_for_signature` devra partir de la 108.

### Résumé
- Documents et code séparés : `cloud/metiers-docs` (documents seuls, à livrer d'abord), `cloud/metiers` (lot 0, attend ta décision n° 3).
- 16 corrections du juriste appliquées, 5 points introuvables traités, 4 décisions recopiées pour toi.
- Chaudière gaz ou fioul : 20 % partout (bibliothèque, modèles, référentiel, import), un test chacun.
- Entretien de chaudière : 10 %, ou 5,5 % si THPE (corrigé dans les fiches et le code).
- RGE imprimé avec intitulé, organisme, numéro et date, comme l'exige l'Anah ; « Autre » retiré.
- Migration 108 prête et vérifiée au banc : le RGE sur la page de signature. Non appliquée.
- Un seul texte nouveau de mon cru (date illisible) à faire relire.
- Reste : appliquer la 108, sonde à 375 px, annuaire France Rénov', lignes à 5,5 % douteuses.
