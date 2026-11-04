# Session cloud « administratif » — rapport (3 nov. 2026)

Branches poussées : `cloud/administratif` (demandée) et `claude/administratif-echeances-m1hvxq` (branche imposée par la session cloud). Même contenu. Rien sur `main`, pas de pull request.

## Ce qui est fait

1. **Un module unique d'échéances** : `src/lib/echeancesAdmin.js`.
   - Il couvre novembre 2026 → décembre 2027.
   - Il calcule les échéances selon la fiche entreprise : micro, EI/EIRL ou société.
   - Il tient compte de trois réponses de l'artisan, et du rythme Urssaf pour une micro.
   - Il lit aussi les dates de fin de la décennale et de la RC pro, saisies dans les Paramètres.
   - Couverture :
     - micro : déclaration du chiffre d'affaires, chaque mois ou chaque trimestre ;
     - CFE : adhésion au prélèvement, paiement, mensualisation, acompte de juin ;
     - TVA : CA3 mensuelle ou trimestrielle ; CA12 avec l'acompte de décembre 2026, la dernière CA12 et le passage à la CA3 en 2027 (régime simplifié supprimé) ; rien pour la franchise ;
     - impôts : liasse 2031, liasse 2065 et IS (acomptes et solde) ; la déclaration de revenus avec la 2042-C-PRO est « à confirmer », car ses dates 2027 ne sont pas publiées ;
     - DSN, si l'entreprise a des salariés ;
     - assurances ;
     - facturation électronique : réception depuis le 1er sept. 2026, émission au 1er sept. 2027.
   - Chaque échéance cite sa source : URL officielle et date de consultation.
2. **Aucune date inventée.**
   - Une date incertaine affiche « Date à confirmer ».
   - Une date qui dépend d'un choix de l'artisan affiche « Selon votre situation ».
   - Pour une fourchette (la CA3 se dépose entre le 15 et le 24), l'écran donne la date la plus tôt.
   - Une date qui tombe un week-end est signalée.
3. **Questions posées une seule fois**, à l'accueil de l'Administratif : TVA, impôt de la société, salariés, rythme Urssaf.
   - « Je ne sais pas » est accepté : la question n'est plus reposée, et l'écran affiche « Selon votre situation ».
   - Les réponses sont gardées sur l'appareil (`localStorage`, clé `cp_admin_profil`).
   - Le calendrier propose « Changer mes réponses ».
   - Sans forme juridique, l'écran demande de la renseigner dans les Paramètres.
4. **« Prochaines échéances »** (accueil) et le **calendrier** lisent le même module.
   - Le tableau en dur `ECHEANCES_2026` est supprimé.
   - Le calendrier liste les 90 prochains jours, avec le détail et le lien vers la source.
   - Une décennale expirée remonte en tête, avec « Dépassée de N j ».
5. **Alertes par e-mail** : rien ne les envoyait. Le code ne lisait le réglage nulle part, à part l'écran lui-même.
   - Le réglage est retiré.
   - L'écran dit : « Rappels dans l’application seulement : aucun e-mail n’est envoyé. »
   - La phrase « Oups, l'URSSAF attend ta DSN » est retirée.
6. **FAQ de l'écran** : les 4 réponses ont été corrigées (DSN, facture électronique, TVA en rénovation, devis obligatoire).
7. **Relecture `juriste-btp`** : toutes ses corrections sont appliquées mot pour mot, les bloquantes, les « à corriger » et les suggestions 8 à 12. Voir plus bas.

### Preuves

- `npx vitest run src/lib/__tests__/echeancesAdmin.test.js` : **17 tests réussis**. Les profils demandés sont couverts :
  - micro trimestriel ;
  - micro mensuel ;
  - EI au réel avec TVA ;
  - société avec salariés.

  S'y ajoutent l'EI au régime simplifié, les assurances, les sources, la couverture et les prochaines échéances.
- Parcours `scripts/parcours/administratif.cjs` : **14 vérifications, réussi** (390 px).
  - Il ouvre l'Administratif et trouve des échéances futures, sans aucune date dépassée.
  - Il répond aux 3 questions. Elles ne reviennent pas après un rechargement.
  - Le calendrier montre une DSN et un lien officiel.
  - Le texte « Alertes email » a disparu.
- **Contre-essai** : avec les anciens composants (`git stash` de `src/components/admin-help`), le parcours **échoue** (« plus de réglage « Alertes email » ni de rappel envoyé promis »).
- L'ancien parcours « administratif : le calendrier s’ouvre sur le mois en cours » passe toujours.
- Captures à 375 px (accueil, questions, calendrier) relues : pas de débordement horizontal (`scrollWidth ≤ largeur`). Les fichiers sont dans `audit-ui/`, qui n'est pas versionné.
- `npm run verifier -- --complet` : résultat dans la section « Vérification finale » ci-dessous.

## Textes soumis au juriste (`juriste-btp`, 3 nov. 2026)

Tous les titres et détails de `src/lib/echeancesAdmin.js`, les étiquettes de `EcheancesUi.jsx`, la carte « Prochaines échéances » et la FAQ de `AdminHelp.jsx`, et l'en-tête du calendrier.

Corrections appliquées mot pour mot :
- **Bloquant** : la FAQ sur le devis ne parle plus du seuil de 150 € (abandonné) ; elle cite l'arrêté du 24 janvier 2017.
- **Bloquant** : le changement de rythme Urssaf passe en « Date à confirmer » (31 octobre ou 31 janvier selon les sources).
- **À corriger** :
  - seuil de la CA3 trimestrielle en 2027 (1 000 000 €, ou 1 100 000 € en cours d'année) ;
  - texte de l'adhésion au prélèvement de la CFE ;
  - dispense de l'acompte CA12 quand la TVA est inférieure à 1 000 € ;
  - FAQ TVA : ajout de la certification par le client ;
  - accord de la phrase des questions.
- **Suggestions** :
  - exceptions aux acomptes d'IS ;
  - solde d'IS au vendredi 14 mai ;
  - « déclarez au plus tard le vendredi précédent » ;
  - plus de mention de Factur-X ;
  - CFE non due sous 5 000 € de chiffre d'affaires.

## Ce qui reste

1. **Dépassé (mis à jour le 4 nov.)** : le 3 nov., la relecture juriste-btp faite en local a relu les sources sur les pages officielles. Elle a remplacé urssaf.fr et autoentrepreneur.urssaf.fr, injoignables, par Légifrance, net-entreprises.fr et service-public. `CONSULTE` vaut `2026-11-03` (voir « Corrections du 3 nov. », points 1 à 8 du juriste). Texte d'origine, conservé pour l'historique : **Relire les sources sur les pages officielles.** Ni moi ni le juriste n'avons pu ouvrir impots.gouv.fr, urssaf.fr, autoentrepreneur.urssaf.fr, service-public.fr, net-entreprises.fr ou legifrance : le réseau de la session les bloque.
   - Les dates viennent d'extraits de moteur de recherche, recoupés avec `docs/metier-btp.md` (§5 et §8, déjà vérifiés par le juriste en octobre).
   - La session locale doit relire chaque URL de `SOURCES` et confirmer en priorité :
     - la date limite de mensualisation de la CFE 2027 (15 déc.) ;
     - la fourchette du 15 au 24 décembre pour l'acompte CA12 ;
     - le seuil de 1 M€ ;
     - la date limite du changement de rythme Urssaf ;
     - les articles du CGI cités de mémoire par le juriste : 287, 1668, 1647 D.
2. Les dates de la déclaration de revenus 2027 seront publiées au printemps : il faudra les saisir.
3. Fin 2027, il faudra prolonger le calendrier. L'écran le signale deux mois avant la fin (`couvertureBientotFinie`), et le parcours échoue après le 31 déc. 2027.

## Décisions pour Hugo

1. **Où garder les réponses** (impôt, salariés, rythme Urssaf) ? Aujourd'hui, sur l'appareil seulement : sur un autre téléphone, les questions reviennent. Les garder dans la fiche entreprise demande une migration (colonnes `entreprises`). Pour la TVA, un réglage existe déjà en base (`tresorerie_settings.regime_tva`, Trésorerie) : depuis le 3 nov., son choix explicite (franchise, mensuel) est lu ; aligner les deux réglages relève des tâches `tva-encaissements` et `franchise-reglage`.
2. **EI ou société en franchise de TVA** (non micro) : la question TVA n'a pas de réponse « Je ne facture pas de TVA ». Faut-il l'ajouter ? (question du juriste)
3. **Déclaration 1330-CVAE**, si le chiffre d'affaires dépasse 152 500 € HT : le juriste a écrit la ligne le 3 nov. (voir « Corrections du 3 nov. », décision 3). Elle n'est pas ajoutée : c'est à Hugo de décider.
4. **Vrais rappels par e-mail** : à décider plus tard. Il faudrait une fonction planifiée côté serveur. Pour l'instant, rien n'est promis.

## Risques

- **Dates** (mis à jour le 4 nov.) : relues au texte officiel le 3 nov. par le juriste, en local. L'écran met toujours un lien vers la source sous chaque échéance du calendrier.
- **Micro = franchise de TVA** dans l'app (`estFranchiseTva`). Texte du juriste (décision 1 du 3 nov.), mot pour mot : « Une micro-entreprise n’est pas toujours en franchise de TVA : au-delà de 37 500 € de services (41 250 € dans l’année) ou de 85 000 € de ventes (93 500 € dans l’année), ou sur option, elle facture la TVA et dépose des CA3. Dans l’app, elle ne voit pas ces échéances. »
- **Exercice clos le 31 décembre supposé** pour les liasses, l'IS et la CA12. Ces échéances affichent donc « Selon votre situation ».
- **DSN** : un 15 qui tombe un dimanche s'affiche tel quel. C'est la date la plus tôt, donc sans risque.

## Vérification finale

`npm run verifier -- --complet` sur le commit `382059b` (code final ; ce rapport n'ajoute que de la documentation) :

| Étape | Résultat |
|---|---|
| Tests | ✓ 1216 réussis (17 nouveaux) |
| Lint | ✓ 0 erreur |
| Smoke | ✓ |
| Build | ✓ |
| Banc de migrations | ✓ (aucune migration dans ce travail) |
| Parcours | ✗ 4 en échec |
| Audit d'interface | ✓ |

Les **4 parcours en échec ne viennent pas de ce travail**. Rejoués sur `main` sans mes changements (anciens composants de l'Administratif remis, build refait), ils échouent de la même façon :
- « équipe : une seule rangée d’onglets, et les heures à valider dites sur la carte de chacun (375 px) » : « 0 h validées ce mois », alors que le parcours attend des heures « à valider » ;
- « trésorerie : pas de seuil d’alerte tant qu’il n’est pas réglé, un bandeau au plus (390 px) » : un bandeau « négatif » s'affiche ;
- « signature sur place : demande expresse enregistrée… (375 px) » : le bouton « Faire signer » est introuvable ;
- « signature sur place sans e-mail… (375 px) » : même cause.

Cause probable : les données de démo dépendent de la date du jour (3 nov. 2026). À traiter par la session locale, hors de cette mission.

Tous les autres parcours réussissent, dont les deux de l'Administratif.

## Résumé

- L'Administratif affiche les vraies échéances de novembre 2026 à décembre 2027, selon la fiche entreprise.
- Un seul module (`src/lib/echeancesAdmin.js`), avec 17 tests, alimente l'accueil et le calendrier.
- Chaque date cite sa source. Les dates incertaines affichent « Date à confirmer » ou « Selon votre situation ».
- Ce que la fiche ne dit pas est demandé une fois (TVA, impôt, salariés, rythme Urssaf).
- Les alertes par e-mail n'envoyaient rien : le réglage est retiré, l'écran dit « rappel dans l'application seulement ».
- Toutes les corrections du juriste sont appliquées mot pour mot.
- Parcours navigateur réussi ; le contre-essai échoue bien sans la correction.
- Limite (dépassée : les sources ont été relues au texte le 3 nov.) : les sites officiels étaient bloqués, les dates venaient d'extraits de recherche.
- Décision pour Hugo : garder les réponses dans la fiche entreprise (migration) ou sur l'appareil.

## Corrections du 3 nov.

Appliquées sur `cloud/administratif`, après la fusion de `origin/main` (`a9b2e86`). Aucune migration, rien sur `main`.

### Commits

- `686bc53` : le modèle de devis « Chaudière gaz à condensation » passe de 5,5 % à 20 % de TVA (7 lignes, plus la prestation « Remplacement de chaudière gaz à condensation murale ») ; `docs/metier-btp.md` §4 est corrigé.
- `e6c504a` : les textes et les sources du juriste, et les défauts de la relecture de code.
- `c406c36` (parcours) et `a8b3d02` (ce rapport, sections Risques et Décisions).

### Points du juriste (à corriger)

1. **Sources** : `microDeclaration` est remplacé par `microDates` (Légifrance) et `microWeekend` (service-public). La DSN pointe vers net-entreprises.fr. Ajouts : `cfeMensualisation`, `tvaAcompteDecembre` et `reportJourOuvrable`. `CONSULTE` reste au `2026-11-03`. L'en-tête du module est récrit — `e6c504a`.
2. **NOTE_CA3** : texte recopié mot pour mot — `e6c504a`.
3. **Acompte CA12 de décembre** : texte recopié mot pour mot, avec `SOURCES.tvaAcompteDecembre` — `e6c504a`.
4. **CFE** : le texte du paiement 2026 est recopié mot pour mot. Pour la CFE 2027, « à confirmer » est retiré et la source devient la fiche CET-IFER — `e6c504a`.
5. **Rythme Urssaf** : la ligne du 31 janv. 2027 reste. « À confirmer » est retiré, le texte cite R613-7 — `e6c504a`.
6. **Note de week-end (micro)** : texte recopié mot pour mot. Les dates citent `microDates`, la note cite `microWeekend` (2e lien sous l'échéance) — `e6c504a`.
7. **Facture électronique** : la ligne « émission » et la FAQ sont corrigées. Dans la ligne, la dernière phrase garde « pas encore » (décision 2 d'Hugo). La FAQ dit « Mallettico n'en est pas une » — `e6c504a`.
8. **Solde d'IS** : la ligne reste datée du 15 mai. Le texte annonce le report au mardi 18 mai, avec 199-0 en 2e source — `e6c504a`.
9. **DSN** : nouvelle question pour une société (dirigeant assimilé salarié). EI et micro gardent « Avez-vous des salariés ? ». Le texte de la DSN est recopié mot pour mot — `e6c504a`.
10. **FAQ TVA en rénovation** : texte recopié mot pour mot — `e6c504a`.
11. **`dateFin: '2027-06-30'`** sur la déclaration de revenus. `prochainesEcheances` filtre sur `(dateFin || dateTri) >= jour`, ce qui sert aussi aux 90 jours du calendrier. Test aux 20 mai, 4 juin et 1er juillet 2027 — `e6c504a`.
12. **Question « Votre société est soumise à… »** : texte recopié mot pour mot — `e6c504a`.
13. **Modèle chaudière gaz** à 20 % et `metier-btp.md` §4 — `686bc53`. Ce commit ne corrigeait que la bibliothèque des métiers du composeur « Nouveau devis » (`trade-library.js`). Les trois autres sources sont corrigées le 4 nov. (voir « Corrections du contrôle local »). **Hugo doit revoir tout devis ou facture déjà émis avec une chaudière gaz ou fioul à 5,5 % ou 10 %, quelle que soit la source.**

### Défauts de la relecture de code

1. Date de fin de la déclaration de revenus : voir le point 11 du juriste.
2. « Changer mes réponses » ramène à la vue d'ensemble, sur les questions. Le parcours vérifie ce clic.
3. Régime de TVA : `useRegimeTvaTresorerie` lit le réglage de la Trésorerie (`tresorerie_settings.regime_tva`, `error` testé ; en démo, le réglage gardé sur l'appareil). `franchise` → aucune échéance de TVA, `mensuel` → CA3 chaque mois : la question n'est plus posée. `trimestriel` (valeur par défaut) ou aucun réglage → la question reste. Tant que la lecture n'est pas finie, la question n'apparaît pas. Si la lecture échoue, la question est posée. La décision n° 1 du rapport est corrigée.
4. Formes juridiques : le module utilise maintenant `estEntrepreneurIndividuel`, `estEirl` et `estSociete`. Une SCI ou une SCM affiche « Forme juridique non prise en charge ».
5. Le message renvoie à « Paramètres › Mon entreprise › Identité ».
6. Ajout de « (réponses gardées sur cet appareil) ».
7. Solde d'IS : la date reste le 15 mai et le texte le dit clairement (le juriste l'emporte).
8. Note de week-end : remplacée par le texte du juriste, qui l'emporte.
9. Les liens vers les sources sont des boutons qui appellent `ouvrirLienExterne(...).catch(captureException)`.
10. Impôt de la société : voir le point 12 du juriste.
11. DSN : voir le point 9 du juriste.
12. La réception de la facture électronique affiche « En vigueur » au lieu de « Dépassée » (`enVigueur`).
13. `consulte` vaut désormais une vraie date de lecture (point 1 du juriste).

### Preuves

- `npx vitest run src/lib/__tests__/echeancesAdmin.test.js` : 23 tests réussis, dont 6 nouveaux.
  - Réglage de la Trésorerie : franchise, mensuel, trimestriel par défaut.
  - Formes juridiques : « Entreprise individuelle », SCI, SASU.
  - Libellé de la question des salariés.
  - Déclaration de revenus les 20 mai, 4 juin et 1er juillet 2027.
  - Solde d'IS et CFE 2027.
- **Contre-essai `dateFin`** : avec l'ancien filtre, le test de la déclaration de revenus échoue (1 échec sur 23).
- **Parcours `administratif`** : 15 vérifications réussies. Il clique « Changer mes réponses » et vérifie que les questions reviennent. Il vérifie aussi que la source pointe vers un site officiel.
- **Contre-essai** : avec l'ancien bouton (`enregistrerReponses({})` seul), le parcours échoue : « Vérification échouée : « Changer mes réponses » ramène aux questions ».
- `npm run verifier -- --complet` sur `a8b3d02`, sortie recopiée :

```
Vérification « complet » de a8b3d02

  ✓ Tests (50.2 s) — 1227 passed (1227)
  ✓ Lint (0 erreur) (7.0 s) — 241 problems (0 errors, 241 warnings)
  ✓ Smoke (31.5 s)
  ✓ Build (30.4 s)
  ✓ Banc de migrations (5.3 s)
  ✓ Parcours (navigateur) (2124.2 s)
  ✓ Audit d’interface (386.7 s)

✓ Tout est vert — niveau « complet ».
```

Les 4 parcours en échec du premier rapport réussissent désormais : la fusion de `main` a apporté la correction des dates de démo. Un premier lancement a été arrêté au bout de 30 minutes par la limite de la session : le parcours Administratif cherchait le bouton par un libellé incomplet. Le parcours a été corrigé (`c406c36`), puis le contrôle complet relancé : c'est la sortie ci-dessus.

### Décisions d'Hugo (non appliquées)

1. **Franchise de TVA, toutes formes** (lien avec `franchise-reglage` et `Q-donnees-locales`). Le juriste propose d'ajouter « Je ne facture pas de TVA (franchise en base) » à la question TVA, et de la poser à toutes les formes, micro-entreprise comprise. **Recommandé.** En attendant, la branche lit le réglage explicite de la Trésorerie. Le texte du juriste pour les Risques : « Une micro-entreprise n’est pas toujours en franchise de TVA : au-delà de 37 500 € de services (41 250 € dans l’année) ou de 85 000 € de ventes (93 500 € dans l’année), ou sur option, elle facture la TVA et dépose des CA3. Dans l’app, elle ne voit pas ces échéances. »
2. **« Mallettico ne transmet pas encore vos factures… »** : le juriste recommande de retirer « encore », sauf engagement daté sur une intégration. **Recommandé : retirer.** Aujourd'hui, la ligne « émission » garde « encore ».
3. **Déclaration 1330-CVAE** (chiffre d'affaires au-dessus de 152 500 € HT) : le juriste a écrit la ligne à ajouter pour les entreprises au réel et les sociétés (`cvae-1330-2027`, 4 mai 2027, « Selon votre situation »). **Recommandé : l'ajouter.**
4. Toujours ouvertes : où garder les réponses (appareil ou base) ; vrais rappels par e-mail.

### Textes nouveaux soumis au juriste

Ces trois phrases ne sont pas réglementaires, mais elles sont nouvelles :
- « Forme juridique non prise en charge (SCI) : seules les dates communes à toutes les entreprises s’affichent. »
- « (réponses gardées sur cet appareil) »
- « En vigueur »

Je n'ai pas lancé d'agent juriste dessus : tous les autres textes sont recopiés de sa relecture. À relire en local.

### Risques

- Le régime de TVA n'est lu qu'au réglage **explicite** de la Trésorerie. Une entreprise qui garde « trimestriel » par défaut se voit encore poser la question, et les deux réponses peuvent différer.
- Une SAS dont le président n'est pas rémunéré répond « Non » : c'est juste tant qu'aucune DSN n'a été déposée. Après une première DSN, elle reste due chaque mois (le texte de la DSN le dit).

### Résumé

- Les 13 corrections du juriste sont appliquées mot pour mot, sources comprises.
- Les 13 défauts de relecture sont corrigés ; pour 7 et 8, c'est la version du juriste qui s'applique.
- Bug réel hors branche : une chaudière gaz ou fioul sortait à 5,5 % ou 10 % au lieu de 20 %. Le 3 nov., c'est corrigé dans la bibliothèque des métiers du composeur « Nouveau devis » seulement (`trade-library.js`). Le 4 nov., c'est corrigé aussi dans le modèle « Remplacement chaudière gaz (condensation) » de Devis Express, les ouvrages PL_02_01_001 et PL_02_01_002 de la Bibliothèque, et le sélecteur du référentiel du catalogue. Ces lignes sont reprises de `cloud/metiers` (voir « Corrections du contrôle local »). **Hugo doit revoir tout devis ou facture déjà émis avec une chaudière gaz ou fioul à 5,5 % ou 10 %, quelle que soit la source.**
- La déclaration de revenus reste affichée jusqu'au 30 juin 2027.
- « Changer mes réponses » ramène aux questions (parcours, avec contre-essai).
- Un choix explicite de la Trésorerie (franchise, mensuel) n'est plus redemandé.
- `npm run verifier -- --complet` : tout vert sur `a8b3d02`.
- Trois décisions attendent Hugo : franchise pour toutes les formes, « pas encore », CVAE.

## Corrections du contrôle local (3 nov. au soir)

Appliquées le 4 nov. sur `cloud/administratif`. Aucune migration, aucune requête en production, rien sur `main`.

### Défauts relevés par le contrôle

1. **[important] Correctif chaudière partiel** — `2e0a11a`. J'ai repris les lignes de `cloud/metiers` à l'identique, partie chaudière seulement, sans RGE ni Qualiopi :
   - `modeles/chauffage.js` : `tva: 20` sur `chaudiere-gaz` ;
   - `modeles/index.js` : `prepareModeleLignes` lit `modele.tva` ;
   - `articles-btp-suite.js` : `tva: 20` sur `chaud-gaz-mur`, `chaud-gaz-sol` et `chaud-fioul` ;
   - `data/index.js` : `createCatalogueItem` lit `article.tva` ;
   - lot 08 : PL_02_01_001 et 002 à `tva: 20`.

   En plus, j'ai corrigé le chemin que les deux branches avaient oublié (correction 4 du vérificateur). `ArticlePicker.jsx` présélectionne maintenant le taux de l'article (`tvaArticleReferentiel`) : 20 % pour une chaudière fossile, 10 % sinon, 0 % en franchise. Le correctif 686bc53 est gardé. `createCatalogueItem` n'a toujours aucun appelant. Je ne l'ai pas supprimé, car `cloud/metiers` modifie la même ligne et la suppression créerait un conflit à la fusion. L'entretien de chaudière n'est pas touché (§ 230).
2. **[mineur] Conflit à venir sur `docs/metier-btp.md` l. 70** : non résolu ici, puisque `cloud/metiers` n'est pas fusionnée. À la fusion, garder le texte de `cloud/metiers` et y ajouter « nettoyage, espaces verts, travaux comprenant la fourniture ou l'installation d'une chaudière susceptible d'utiliser des combustibles fossiles (CGI 279-0 bis, 2 bis ; 278-0 bis A, III bis, depuis le 1er mars 2025) ». Dans la colonne Source, écrire « CGI art. 278 et 279-0 bis, 2 et 2 bis ; 278-0 bis A, III bis ». Le reste du recouvrement (`trade-library.js`, les cinq fichiers ci-dessus) est fait de lignes identiques : git les fusionnera sans conflit. Seul `tvaChaudiere.test.js` double les tests de chaudière de `qualifications.test.js`, sans conflit.
3. **[mineur] Régime de TVA lu dans la Trésorerie, sans constat** — `a6649dd`. Nouveau parcours en démo « le régime de TVA de la Trésorerie est suivi » (8 vérifications) :
   - avec `franchise` : pas de question de TVA, la ligne « Régime de TVA : celui réglé dans la Trésorerie (Franchise en base) » s'affiche, aucune ligne `ca3-`, et le bouton n'annonce plus « TVA » ;
   - avec `mensuel` : une CA3 chaque mois sur 90 jours ;
   - « Ouvrir la Trésorerie » ouvre bien la Trésorerie.

   **Contre-essai** : sans le 3e argument de `profilAdmin`, le parcours échoue (« Vérification échouée : franchise : la question de TVA n'est pas posée »).
4. **[mineur] `compteARebours` sans test** — `a6649dd`. Ajout de `src/components/admin-help/__tests__/compteARebours.test.jsx` : `{ enVigueur: true, joursRestants: -63 }` donne « En vigueur », et `{ joursRestants: -3 }` donne « Dépassée de 3 j ». **Contre-essai** : sans la ligne `enVigueur`, le premier test échoue (1 échec sur 5).
5. **[mineur] Question de TVA disparue sans explication** — `a6649dd`. La ligne vient de `tvaRegleeDansLaTresorerie`. Elle n'apparaît que pour un régime venu de la Trésorerie, jamais pour une micro-entreprise. Le bouton « Ouvrir la Trésorerie » mène à Finances › Trésorerie, où le régime se règle dans « Paramètres de trésorerie ». Le bouton du calendrier devient « Changer mes réponses (rythme Urssaf, impôt, salariés) ». Le juriste a relu le texte : « OK, exact et sans promesse ».

### Écarts du rapport

- Les sections anciennes sont marquées « dépassé » ou mises à jour (`7aceae8`) : « Ce qui reste » § 1, le 1er point de « Risques », la décision 3 et la limite du premier « Résumé ».
- Le texte exact du juriste (décision 1) est recopié dans « Risques ».
- La phrase « Bug réel hors branche… Il est corrigé » et le point 13 disent maintenant ce qui a été corrigé, et quand. Le recouvrement avec `cloud/metiers` est décrit au point 2 ci-dessus.
- Vérification : voir plus bas.

### Tests de chaudière (`src/lib/__tests__/tvaChaudiere.test.js`, 6 tests)

Ils reprennent les tests de `qualifications.test.js` sans importer `qualifications.js`, avec en plus le sélecteur du référentiel. **Contre-essai** : sur le code d'avant `2e0a11a`, 4 tests échouent : le modèle, le lot 08 et les deux tests du sélecteur. Celui de `trade-library.js` passe, puisqu'il était déjà corrigé.

### Relecture du juriste (4 nov.)

- Le texte de la ligne de la Trésorerie est OK.
- Les citations du test, du lot 08, d'`ArticlePicker` et de `data/index.js` sont OK.
- Une erreur dans le commentaire de `modeles/chauffage.js` (l. 77-79), venu de `cloud/metiers` : il renvoie à `docs/metiers/chauffagiste.md § 5`, fichier absent de cette branche. Il cite aussi « loi de finances pour 2025 » sans article. **Non corrigé ici**, pour que la fusion reste sans conflit. À appliquer sur `cloud/metiers`, ou après la fusion, mot pour mot :
  ```
  // Chaudière à combustibles fossiles : TVA à 20 % depuis le 1er mars 2025, fourniture et pose
  // (CGI 279-0 bis, 2 bis, c ; 278-0 bis A, III bis ; BOI-TVA-LIQ-30-20-90-20 § 200).
  // L'entretien d'une chaudière fossile n'est pas visé par l'exclusion : 10 % (même BOI, § 230).
  ```
  Le juriste retire la mention « 5,5 % pour une chaudière THPE (BOI-TVA-LIQ-30-20-95 § 35) » : il n'a pas pu la vérifier, le BOFiP était injoignable.

### Décisions pour Hugo

- **Dépose de l'ancienne chaudière** : dans le modèle chaudière gaz, elle passe à 20 % avec le reste. Le juriste juge cela défendable, puisque ce sont des « travaux comprenant » la pose d'une chaudière fossile. Mais l'article seul `depose-chaud` du catalogue reste à 10 %. Ce découpage est-il voulu ?
- La livraison de la partie chaudière avant la décision sur le lot 0 de `cloud/metiers` : faite ici, comme la consigne le demandait. Si Hugo préfère attendre, il suffit de ne pas livrer `2e0a11a`.

### Vérification

- `npm run verifier` (standard) sur `a6649dd`, dernier commit de code avant la fusion : Tests ✓ 1238 réussis, Lint ✓ 0 erreur, Smoke ✓, Build ✓, « Tout est vert ».
- Parcours `administratif` sur le build de `a6649dd` : 3 parcours réussis (15, 8 et 4 vérifications).
- Fusion de `origin/main` (`6b34c8e`) sans conflit. Résultat de `npm run verifier -- --complet` sur ce commit : ci-dessous.

`npm run verifier -- --complet` sur `6ac90bd` (la fusion `6b34c8e` plus ce rapport ; aucun code après), sortie recopiée :

```
Vérification « complet » de 6ac90bd
  ✓ Tests (52.0 s) — 1241 passed (1241)
  ✓ Lint (0 erreur) (6.3 s) — 241 problems (0 errors, 241 warnings)
  ✓ Smoke (29.9 s)
  ✓ Build (28.9 s)
  ✓ Banc de migrations (5.6 s)
  ✓ Parcours (navigateur) (2156.8 s)
  ✓ Audit d’interface (385.8 s)
✓ Tout est vert — niveau « complet ».
```

Un premier lancement sur `6b34c8e` a échoué : `dist/index.html` était absent pendant les parcours. La cause vient de moi : un `git push` lancé pendant la vérification a déclenché le hook de pre-push, qui refait le build. Je l'ai relancé sans rien faire en parallèle, et c'est la sortie ci-dessus. Le commit qui suit ne touche que ce rapport.

### Résumé

- Chaudière gaz ou fioul : 20 % aussi dans le modèle Devis Express, le lot 08, les articles du catalogue et le sélecteur du référentiel (`2e0a11a`, lignes identiques à `cloud/metiers`, 6 tests, contre-essai).
- L'entretien de chaudière garde le taux réduit (§ 230).
- Administratif : la ligne « Régime de TVA : celui réglé dans la Trésorerie (…) », avec « Ouvrir la Trésorerie ». Le bouton n'annonce plus « TVA » dans ce cas (`a6649dd`).
- Parcours franchise / mensuel et test de `compteARebours`, chacun avec son contre-essai.
- Le rapport ancien est mis à jour, et le texte du juriste est dans « Risques ».
- À la fusion de `cloud/metiers` : `docs/metier-btp.md` l. 70 (texte ci-dessus), et le commentaire de `chauffage.js` corrigé par le juriste.
- Pour Hugo : revoir les devis et factures de chaudière fossile émis à 5,5 % ou 10 % ; dire si le découpage de la dépose (20 % dans le modèle, 10 % seule) est voulu.
- `npm run verifier -- --complet` : tout vert sur `6ac90bd`.
