# Session cloud « franchise » — rapport (3 nov. 2026)

Branche à livrer : `cloud/franchise`. La branche `claude/vat-franchise-labels-u9bstz`, imposée par la première session, n'a pas le même contenu : elle n'a reçu aucune des corrections (elle est restée à `31a2bab`), puis la première session y a poussé un seul commit, `a1db964` (3 nov. 2026, 19 h 14 UTC, colonne « TVA » retirée), qui n'est pas sur `cloud/franchise` (la même décision y est appliquée par `5676440`). Elle ne doit être ni livrée ni fusionnée (relevé au contrôle du 3 nov. 2026).

**Mission** : en franchise en base de TVA (art. 293 B du CGI), aucun écran ni document n'écrit « HT » ni « TTC ». Décision du 24 oct. 2026 (`docs/avis-juriste-2026-10-24-devis.md`, Q1). Hors franchise, rien ne change.

Règle unique utilisée partout : `src/lib/franchiseTva.js`.
- `estFranchiseTva(entreprise)` pour un document à créer ;
- `franchiseAppliquee(doc, entreprise)` pour un document existant. Un document émis avec TVA garde ses libellés.

Aucune deuxième règle n'a été écrite.

## 1. Ce qui est fait

### Écrans du relevé du 31 octobre

| Écran | Avant (en franchise) | Après (en franchise) |
|---|---|---|
| `DevisWizard.jsx` | « Total HT », « TVA 0 EUR », « Total TTC », « Prix HT », choix du taux | « TVA non applicable, art. 293 B du CGI », « Total », « Prix unitaire » ; choix du taux masqué. Avec une remise : « Total avant remise » |
| `DevisExpressModal.jsx` | « Total estime HT », « Total HT », « Total TTC » | « Total estimé », « Total » ; mention 293 B sans « 0 € » |
| `TemplateSelector.jsx` | « ~900 € HT » | « ~900 € » |
| `settings/TemplateManager.jsx` | « 900 € HT », « Total HT : » | « 900 € », « Total : » |
| `modals/AvoirCreationModal.jsx` | « Total HT / TVA / Total TTC », « × 100 € HT » | « Total de l'avoir » seul ; « × 100 € ». Suit la facture source (`franchiseAppliquee`) |
| `chantiers/SituationsTravaux.jsx` | « Marché HT », « 600 € HT », « Montant TTC » | « Marché », « 600 € », mention 293 B. Une TVA réellement portée reste affichée |
| Fenêtre de marge du composeur | « Votre coût d'achat (HT, par u) » | « Votre coût d'achat (TVA comprise, par u) », même libellé que le catalogue |
| `portal/ClientPortal.jsx` (portail éteint) | « P.U. HT / Total HT / TVA / Total TTC » | « Prix unitaire / Total », ni ligne TVA ni « Total TTC » ; mention 293 B ajoutée ; total recalculé (`totauxDocument`) |

### Trouvés par la recherche complète, corrigés

| Fichier | Avant | Après |
|---|---|---|
| `signature/DevisSignaturePage.jsx` (page du client, publique) | « Montant TTC » ×2 | « Montant » |
| `SignaturePad.jsx` (signature sur place) | « Montant TTC » | « Montant » |
| `QuickChantierModal.jsx` | « Budget du chantier (€ HT) » | « Budget du chantier (€) » |
| `catalogue/FenetresCatalogue.jsx` (ajout au devis) | « Sous-total HT » | « Sous-total » |
| `export/ExportComptable.jsx` | « Total HT des factures » | « Total des factures » |
| `lib/totauxDocument.js` (message de l'éditeur) | « Une ligne à 80 € HT n'a pas de désignation » | sans « HT » (relevé du juriste) |

### Les deux générateurs de PDF

Constat : **les deux imprimaient « PU HT » et « Total HT »** pour une micro-entreprise, sous la mention 293 B. Le troisième générateur, `pdfHtmlBuilder.js`, n'est utilisé que par des tests ; il est corrigé pareil.

Correction dans un bloc commun de `src/lib/totauxDocument.js` :
- `libellesColonnesPrix(isMicro)` donne les colonnes « Prix unitaire » et « Total » ;
- dans `lignesTotauxHtml`, sans remise il n'y a plus de ligne « Total HT » : seul reste « Net à payer », « Total » ou « Total de l'avoir ». Avec une remise : « Total avant remise », « Remise », « Total après remise ».

Ce bloc est utilisé par `devisHtmlBuilder.js` et par le générateur intégré de `DevisPage.jsx`. La mention 293 B reste. (Périmé depuis `3add86c` : cette phrase citait « … article 293 B du Code Général des Impôts ». La mention est imprimée mot pour mot « TVA non applicable, article 293 B du CGI » (CGI art. 293 E, II), la même en en-tête et sous les totaux : voir « Corrections du 3 nov. ».)

**Facture de situation** (`buildSituationFactureHtml`, fonction éteinte par `FONCTIONS.facturesSituation`). Elle ne tenait aucun compte de la franchise : « PU HT », « TVA 10 % », « Montant situation TTC », et pas de mention 293 B. En franchise maintenant :
- TVA à 0 pour une situation en brouillon ;
- libellés sans « HT » ;
- ni ligne TVA ni ligne TTC ;
- mention 293 B ajoutée.

Une situation validée ou facturée qui porte de la TVA se réimprime telle quelle (relecture du juriste).

## 2. Preuves

| Commande | Résultat |
|---|---|
| `npx vitest run src/components/__tests__/libellesFranchiseEcrans.test.jsx` | 9 tests réussis. Micro-entreprise **et** SARL sur 5 écrans (choix d'un modèle, réglages des modèles, nouveau chantier, signature sur place, situations de travaux), le bloc commun, la facture `devisHtmlBuilder`, la facture de situation et le message de l'éditeur |
| **Contre-essai** : le test seul, sans la correction (`git stash` du reste) | 8 tests sur 8 en échec (le 9e a été ajouté après), par exemple « expected … not to match /(HT\|TTC)/ » et « libellesColonnesPrix is not a function ». La correction remise : tout passe |
| `npm run parcours -- "aperçu imprimé"` (nouveau scénario du parcours `documents`) | ✓ 10 vérifications. Aperçu réel du générateur de `DevisPage` en mode « réel simulé » : micro-entreprise, ni HT ni TTC, « Prix unitaire », mention 293 B ; SARL, « PU HT » et « Total TTC » |
| `npm run verifier` (standard, avant commit) | Lint 0 erreur (242 avertissements), smoke ✓, build ✓. Tests : 1207 sur 1208, le seul échec était mon test (espace insécable), corrigé et relancé : 9 sur 9 |
| `npm run verifier -- --complet` sur le commit `ab4faef` | Tests 1208 sur 1208 ✓, lint 0 erreur ✓, smoke ✓, build ✓, banc de migrations ✓. Le délai de 30 minutes de la session a coupé la chaîne pendant les parcours : ils ont été relancés à part |
| `npm run parcours` (tous, relancés à part) | Tous réussis sauf **4 en échec, qui échouent à l'identique sur `main` (`adbf08d`) sans ce travail** : rejoués dans une copie de `main`. Ce sont « signature sur place » ×2 (bouton « Faire signer » introuvable), « trésorerie : pas de seuil d'alerte » et « équipe : une seule rangée d'onglets ». Ils sont étrangers à cette mission et à signaler à la session locale |
| `node scripts/audit-ui.cjs` | **0 défaut**, 80 combinaisons |

## 3. Ce qui reste (recherche complète de `HT` / `TTC` dans `src/components`)

**Légitime (rien à faire)**
- `DevisPage.jsx` et `DevisComposer.jsx` : déjà traités, chaque « HT » est sous `!franchise` ou `!microDoc`.
- `OngletApercu`, `OngletFinances`, `OngletDocuments`, `FenetresChantier`, `Chantiers`, `ArticlePicker`, `FormulaireArticle`, `OngletsStock`, `ArticleDetail` : déjà conditionnés.
- `voice/DicteeModal.jsx` : la dictée est masquée (`FONCTIONS.ia = false`, D-07).
- `landing/*` : pages marketing, exemples fictifs hors application.
- `admin-help/*` : aide et outils d'administration.
- `FicheChantier.jsx:343` : message sur une TVA réellement saisie.
- `tresorerie/TresorerieModule.jsx` 2128-2464, `Settings.jsx` 1207 (détail TVA) : tableaux de TVA, dont le régime « franchise » est déjà pris en compte par `regimeTvaTresorerie` (à confirmer en navigateur). Sauf le tableau des mouvements (l. 2128-2130 et 2155-2158) : à corriger en franchise, selon l'avis du juriste du 3 nov. (tâche `mouvements-tva`). Les numéros de ligne de ce § 3 sont ceux du code final (contrôle du 3 nov.) ; la fusion de `main` les avait décalés.

**À corriger plus tard (hors périmètre, faible exposition)**
- `tresorerie/TresorerieModule.jsx:507-516` : saisie d'un mouvement « Montant TTC », détail HT / TVA / TTC. En franchise, la TVA d'un achat n'est pas récupérable. Ce n'est pas qu'un libellé : le calcul est à revoir.
- `Settings.jsx:1107` : formule de marge « CA HT ».
- `DevisPage.jsx:1775` : en-tête CSV « Montant HT » (export pour le comptable).
- Ramonage (`OngletRamonage`, `SaisieRamonage`, `RamonageTab`) : « € HT ».
- Bibliothèque d'ouvrages (`OuvrageCard`, `OuvragesList`) : « Prix HT ».
- `Catalogue.jsx:507` et `FenetresCatalogue.jsx:21-22` : colonnes de l'import / export CSV.
- Historique (`audit/DiffViewer`, `audit/SnapshotViewer`) : « HT ».
- `settings/RelanceConfigTab.jsx:58-60` : description des variables (« montant TTC »).
- `payment/PublicPaymentPage.jsx:238` « Montant TTC » et `305` « Total TTC ». Le paiement en ligne est éteint (D-21).
- Situations : le calcul garde `sourceDevis.tvaRate || 10`. Un devis de micro-entreprise à 0 % dont une ligne n'a pas de taux tomberait à 10 %. Les lignes du composeur ont toujours `tva: 0` en franchise, et la facturation des situations est éteinte. Ce point est à traiter dans la tâche `situations-conformes`.

## 4. Décisions pour Hugo

1. **Colonne « TVA » des documents imprimés en franchise**. Elle reste, avec « - » sur chaque ligne. Le juriste recommande de la retirer : ce n'est pas une obligation, mais elle peut faire croire au client qu'une TVA est due. Il faut le faire dans les deux générateurs. Oui ou non ?
2. **Une situation « validée » a-t-elle pu être envoyée au client ?** Par prudence, elle est traitée comme une pièce émise : avec de la TVA, elle se réimprime telle quelle.

## 5. Textes soumis au juriste (`juriste-btp`, 3 nov. 2026)

Verdict : **OK sur les 7 points**. Il a demandé trois retouches, toutes appliquées :
- la condition de statut de la situation (seul le brouillon passe sans TVA) ;
- le total du portail, recalculé pour ne pas imprimer une TVA ancienne sous la mention 293 B ;
- le message de l'éditeur, sans « HT ».

Textes nouveaux : « Prix unitaire », « Total », « Total avant remise », « Total après remise », « Total de l'avoir », « Total estimé », « Marché », « Montant de la situation », « Montant », « Budget du chantier (€) », « Sous-total », « Total des factures », « Votre coût d'achat (TVA comprise, par u) ». La mention « TVA non applicable, art. 293 B du CGI » est reprise telle qu'elle est déjà écrite ailleurs. (Périmé depuis `3add86c` pour les documents imprimés : ils portent « TVA non applicable, article 293 B du CGI », mot pour mot (CGI art. 293 E, II). « art. 293 B du CGI » reste aux libellés d'écran ; depuis le contrôle du 3 nov., les trois phrases d'écran qui citent la mention de la facture la reprennent telle qu'elle est imprimée.)

## 6. Risques et vérification complète

- **Ce que voit le client change** : la page de signature et les PDF n'ont plus « PU HT » ni « Total HT » en franchise. Hors franchise, les tests et le parcours constatent que rien ne change.
- Un document émis avec TVA garde ses libellés (`franchiseAppliquee`). Les écrans de création (assistant, devis express) suivent `estFranchiseTva`, comme leurs totaux.
- Le nouveau scénario du parcours `documents` dépend du bouton « Aperçu » de la fiche, comme le scénario de certification TVA.

- La vérification complète n'a pas pu enregistrer un « vert » d'un seul tenant : délai de la session, et 4 parcours déjà rouges sur `main` (voir § 2). La session locale doit relancer `npm run verifier -- --complet` avant de livrer.

## Résumé

1. En franchise, plus aucun « HT » ni « TTC » sur les 8 écrans du relevé, ni sur 6 écrans trouvés par la recherche. La page de signature du client en fait partie.
2. Les deux générateurs de PDF imprimaient « PU HT » et « Total HT » : c'est corrigé par un bloc commun.
3. La facture de situation (éteinte) ne connaissait pas la franchise : elle imprime maintenant sans TVA, avec la mention 293 B.
4. Hors franchise, rien ne change : c'est testé.
5. Preuve : 9 tests sur 5 écrans et les documents, micro-entreprise et SARL. Un contre-essai sans la correction : 8 échecs.
6. Un parcours navigateur ouvre l'aperçu réel : 10 vérifications réussies.
7. Le juriste valide. Ses trois retouches sont appliquées.
8. Décision pour Hugo : retirer la colonne « TVA » des PDF en franchise (recommandé).
9. Vérification : tests, lint, build, banc et audit d'interface (0 défaut) au vert. 4 parcours sont rouges, mais déjà rouges sur `main`.
10. Restent hors périmètre : trésorerie (calcul), ramonage, ouvrages, exports CSV, historique.

## Corrections du 3 nov.

Consignes : relecture de code et avis du juriste du 3 nov. 2026, versé dans `docs/avis-juriste-2026-11-03-franchise.md`. Ce fichier est un résumé des consignes, pas une copie : une partie des citations et des sources des points à décider manque (contrôle du 3 nov.). Branche à jour de `origin/main` (fusion `d59f352`, sans conflit).

### Ce qui est fait

| Point | Fait | Commit |
|---|---|---|
| Juriste, à corriger 1 : citation de l'art. 289 I-1 | Remplacée par « CGI art. 289, I-4, I-5 et V ; art. 283, 3 » (`devisHtmlBuilder.js` l. 537 ; `franchiseTva.js` l. 34) | `3add86c` |
| Juriste, à corriger 2 : la mention imprimée | « TVA non applicable, article 293 B du CGI », même texte en en-tête et sous les totaux, dans les deux générateurs (`devisHtmlBuilder.js` l. 263, 333, 728 ; `DevisPage.jsx` l. 1521, 1590). Aussi dans le portail (`ClientPortal.jsx` l. 536) et le générateur des tests (`pdfHtmlBuilder.js`). Les libellés d'écran gardent « art. 293 B du CGI » ; depuis le contrôle du 3 nov., les trois phrases d'écran qui citent la mention de la facture (trésorerie, Paramètres, choix de la TVA) la reprennent telle qu'elle est imprimée. `docs/metier-btp.md` § 3 corrigé pour concorder avec le § 4 (1er janv. 2027, 30 juin 2028) | `3add86c`, `ee6abab` |
| Juriste, à corriger 3 : retenue de garantie | Texte du juriste mot pour mot (`devisHtmlBuilder.js` l. 736). À la saisie, au-dessus de 5 % : « La retenue de garantie est de 5 % au plus (loi n° 71-584 du 16 juillet 1971). » (`SituationsTravaux.jsx`). Signalé, pas bloqué | `3add86c` |
| Juriste, à corriger 4 : tableau des mouvements de la trésorerie | Pas codé : le juriste le range dans la même tâche que la saisie. Ajouté à la tâche `mouvements-tva` de la feuille de route, avec la correction exacte | `ee6abab` |
| Juriste, à corriger 5, et relecture 1 : descriptions des 308 modèles | `descriptionModele(m, franchise)` dans `src/lib/data/modeles-devis.js`, appelée aux trois endroits (`DevisExpressModal.jsx` l. 570 ; `TemplateSelector.jsx` l. 142 et 249). En franchise : « ~7 lignes \| ~1 500 – 3 000 € \| ~55% marge », « €/m² » pour les 10 modèles au mètre carré | `2131020` |
| Relecture 2 : appels oubliés | Création rapide de chantier (Ctrl+H, `App.jsx`) reçoit `franchiseTva`. Catalogue → Bibliothèque → `FenetreAjoutDevis` : « Sous-total » sans « HT » | `7840555` |
| Relecture 3 : avertissement ESLint de l'assistant | Le calcul utilise `franchise`. Avertissements : 241 (242 avant) | `7840555` |
| Relecture 4 : lettre de mise en demeure | Hors de cette branche (consigne) : dans la nouvelle tâche `franchise-restes` | `ee6abab` |
| Relecture 5 : repli 10 % des situations | Ajouté à la tâche `situations-conformes` | `ee6abab` |
| Relecture 6 : tâche de suivi | Tâche 28 `franchise-restes` créée, avec fichier et ligne de chaque reste (voir plus bas) | `ee6abab` |
| Relecture 7 : preuves | Avis du juriste versé dans `docs/`, en résumé (pas une copie). Tests ajoutés : devis express (étape 2), avoir, liste d'un métier. La vérification complète : voir « Preuves » | `2131020`, `ee6abab` |
| Introuvable 1 : branche `claude/vat-franchise-labels-u9bstz` | Rien fait : à supprimer par la session principale après la livraison. Elle n'a aucune de ces corrections (voir l'en-tête) : ne pas la livrer | — |
| Introuvable 2 : ce que la relecture a rejoué | Rien à faire | — |

### Preuves

- Nouveau test `src/components/__tests__/libellesFranchiseListes.test.jsx` : 5 tests réussis. Micro-entreprise et SARL : liste des modèles d'un métier (électricité), étape « Sélectionnez un modèle de devis » du devis express, étape 2 d'un avoir total ; les 308 descriptions sans « HT » en franchise.
- **Contre-essai** : sans la correction des deux écrans (`git stash`), 2 tests sur 5 échouent (liste d'un métier, devis express). La correction remise : 5 sur 5.
- `libellesFranchiseEcrans.test.jsx` : 10 tests réussis. Ajouts : la mention apparaît 2 fois mot pour mot sur la facture, plus jamais « Code Général des Impôts » ni « art. 293 B » ; le texte de la retenue de garantie.
- `npm run verifier` (standard), recopié mot pour mot :

```
Vérification « standard » de d59f352

  ✓ Tests (46.0 s) — 1219 passed (1219)
  ✓ Lint (0 erreur) (5.9 s) — 241 problems (0 errors, 241 warnings)
  ✓ Smoke (29.6 s)
  ✓ Build (28.1 s)

✓ Tout est vert — niveau « standard ».
```

- `npm run verifier -- --complet` sur `d59f352` (arbre propre), enregistré vert dans `audit-ui/derniere-verification.json` (3 nov. 2026, 17 h 15 UTC). Ce fichier est hors dépôt, et le bloc ci-dessous est un extrait : la dernière ligne de la sortie (« ✓ Tout est vert ») n'a pas été recopiée. Surtout, cette vérification porte sur `d59f352`, **avant** le code des décisions d'Hugo (`5676440`) et la correction du contrôle : elle ne vaut pas pour le code final (voir « Correction du contrôle du 3 nov. », à la fin).

```
Vérification « complet » de d59f352

  ✓ Tests (46.7 s) — 1219 passed (1219)
  ✓ Lint (0 erreur) (5.8 s) — 241 problems (0 errors, 241 warnings)
  ✓ Smoke (29.2 s)
  ✓ Build (27.7 s)
  ✓ Banc de migrations (5.1 s)
  ✓ Parcours (navigateur) (2055.8 s)
  ✓ Audit d’interface (382.2 s)
```

  Les 4 parcours rouges du premier rapport passent sur `d59f352` : la session locale les a réparés sur `main`, fusionné ici. (Périmé : cette ligne ajoutait « Les commits suivants ne touchent que ce rapport ». C'était vrai pour `b05ccec` et `00f8543`, plus depuis `5676440`, qui change le code, ni depuis la correction du contrôle. Et `b05ccec`, poussé à 18 h 33 UTC, disait que les parcours tournaient encore : ils avaient fini, l'enregistrement vert date de 17 h 15 UTC.)
- Relecture `juriste-btp` (courte, sur les textes appliqués) : **OK sur les 6 points**. Le seul texte nouveau, l'alerte au-dessus de 5 %, est jugé fidèle à l'art. 1er de la loi n° 71-584. Le juriste n'a pas rouvert les textes officiels : il s'est fié aux citations de son avis du 3 nov.

### Ce qui reste (tâche `franchise-restes`, sauf mention)

En franchise, ces écrans écrivent encore « HT » ou « TTC » :
- ramonage : `ramonage/SaisieRamonage.jsx:344`, `ramonage/OngletRamonage.jsx:142`, `settings/RamonageTab.jsx:125` ;
- bibliothèque d'ouvrages : `bibliotheque/OuvragesList.jsx:55` ;
- historique : `audit/DiffViewer.jsx:161` et `167`, `audit/SnapshotViewer.jsx:126` ;
- variables des relances : `settings/RelanceConfigTab.jsx:58` et `60` ;
- « CA HT » des réglages : `Settings.jsx:1107` ;
- exports CSV : `DevisPage.jsx:1775`, `Catalogue.jsx:507`, `catalogue/FenetresCatalogue.jsx:21-22` ;
- lettre de mise en demeure, envoyée au client : `lib/miseEnDemeureBuilder.js:310`, `319`, `353` ;
- rapports PDF internes : `lib/reportPdfBuilder.js:439`, `472`, `483`, `589` (« Chiffre d'affaires HT »), `621`, `736` (« Devis signés HT »), `786` ;
- paiement en ligne, éteint : `payment/PublicPaymentPage.jsx:238` (« Montant TTC ») et `305` (« Total TTC ») ;
- document imprimé du portail, éteint : `portal/ClientPortal.jsx:534` finit par « Net à payer » / « Total », sans la formule de D-31 (1) ;
- trésorerie, saisie (l. 507-516) et tableau (l. 2128-2130, 2155-2158) : tâche `mouvements-tva`.

Numéros de ligne du code final (contrôle du 3 nov.) : la fusion de `main` avait décalé la trésorerie, et `reportPdfBuilder.js:589` et `736`, les lignes de `PublicPaymentPage.jsx` et le portail manquaient.

### Décisions pour Hugo (proposées ici ; tranchées le jour même et appliquées : voir « Décisions d'Hugo du 3 nov. (appliquées) »)

1. **« Total HT » disparu en franchise.** Deux arrêtés demandent en toutes lettres un total « hors taxes et toutes taxes comprises » sur une pièce remise à un particulier : l'arrêté n° 83-50/A du 3 oct. 1983, art. 3, et l'arrêté du 24 janv. 2017, art. 4, I. En franchise, les deux montants sont égaux. Le risque est formel et faible. **Recommandé** : la formule littérale, sur les PDF seulement. Dernière ligne « Net à payer (hors taxes et toutes taxes comprises) » sur une facture, « Total (hors taxes et toutes taxes comprises) » sur un devis (`totauxDocument.js` l. 133-136) ; « NET À PAYER (hors taxes et toutes taxes comprises) » sur une situation (`devisHtmlBuilder.js` l. 726). La mention 293 B reste juste en dessous. Dans les deux cas, consigner ces arrêtés dans `docs/metier-btp.md` § 3.
2. **Une situation « validée » est-elle une pièce émise ?** Aujourd'hui, oui : avec de la TVA, elle se réimprime telle quelle. « Valider » ne numérote et n'envoie rien. **Recommandé** : « brouillon » tant qu'elle n'est pas facturée ou payée (`devisHtmlBuilder.js` l. 545 : `statut: (situation.statut === 'facturee' || situation.statut === 'payee') ? 'envoye' : 'brouillon'`, commentaire réécrit comme le propose le juriste). Puis, dans `situations-conformes`, « Générer facture » enregistre `tva: 0` en franchise. `FONCTIONS.facturesSituation` reste à false.
3. **Colonne « TVA » avec « - » en franchise.** Les deux choix sont licites : un tiret ne fait pas apparaître la taxe. **Recommandé** : le retrait, dans les deux générateurs (en-tête et cellule ; colspan des lots de 6 à 5 et de 5 à 4).
4. **Fournitures et main-d'œuvre sur les factures de travaux en franchise** (BOI-TVA-DECLA-40-10-20-20260701 § 300 : la part des livraisons de biens et celle des services doivent apparaître). L'obligation n'est pas à décider ; sa forme et sa date, si. **Proposé** : « Dont livraisons de biens (fournitures) : X € · dont services (main-d'œuvre) : Y € » sous les totaux, à partir d'une nature choisie pour chaque ligne, dans les deux générateurs. À cadrer avec `critique-produit`, puis créer la tâche et consigner le § 300 dans `docs/metier-btp.md` § 4.
5. Du juriste, en passant : faut-il **refuser** un taux de retenue au-dessus de 5 %, au lieu de seulement le signaler ? Et « ~55% marge » des modèles est peut-être surestimée pour une micro-entreprise (la TVA des achats ne se déduit pas) : à vérifier.

### Textes nouveaux soumis au juriste

- « La retenue de garantie est de 5 % au plus (loi n° 71-584 du 16 juillet 1971). » : OK.
- Les autres textes sont ceux du juriste, recopiés mot pour mot : OK.

### Risques

- Le PDF que voit le client change un peu : la mention sous les totaux devient « article 293 B du CGI », et l'en-tête aussi.
- Les tests des écrans qu'on atteint par un clic imposent l'état de départ (remplacement de `useState` dans ce seul fichier de test), faute de navigateur de test unitaire. Si l'ordre des `useState` de ces écrans change, le test casse, mais il ne passera pas à tort.
- La facture de situation reste éteinte : ses corrections ne se voient pas en production.

### Résumé

1. En franchise, les descriptions des 308 modèles n'ont plus « HT » : une seule fonction, trois écrans.
2. La mention imprimée est mot pour mot celle de la loi, en en-tête comme sous les totaux, dans les deux générateurs.
3. Le texte de la retenue de garantie suit la loi ; un taux au-dessus de 5 % est signalé.
4. Les citations du CGI sont justes (art. 289, I-4, I-5 et V ; art. 283, 3).
5. Deux appels oubliés corrigés (Ctrl+H, bibliothèque) ; un avertissement ESLint en moins.
6. Tests : 1219 sur 1219, contre-essai fait. Vérification complète verte sur `d59f352` (parcours et audit d'interface compris), avant le code des décisions d'Hugo : elle est à rejouer sur le code final.
7. Juriste : OK sur les 6 points.
8. Restes listés avec fichier et ligne, dans les tâches `franchise-restes`, `mouvements-tva` et `situations-conformes`.
9. Quatre décisions pour Hugo : la formule « hors taxes et toutes taxes comprises », la situation « validée », la colonne « TVA », fournitures et main-d'œuvre. Tranchées le jour même (D-31) et appliquées : section suivante.
10. La session locale relit, revérifie sur le commit final et livre.

## Décisions d'Hugo du 3 nov. (appliquées)

Hugo a répondu : « 1 oui, 2 brouillon, 3 retrait, 4 plus tard ». Consigné en **D-31** (`docs/decisions.md`).

| Décision | Fait | Commit |
|---|---|---|
| 1. Formule littérale du total | En franchise, sur les pièces imprimées : « Net à payer (hors taxes et toutes taxes comprises) » (facture), « Total (hors taxes et toutes taxes comprises) » (devis), « NET À PAYER (hors taxes et toutes taxes comprises) » (situation). « Total de l'avoir » ne change pas. Bloc commun `lignesTotauxHtml` (`totauxDocument.js`), donc les deux générateurs. Les écrans restent sans « HT » ni « TTC ». Les deux arrêtés sont consignés dans `docs/metier-btp.md` § 3 | `5676440`, docs ci-dessous |
| 2. Situation « validée » = brouillon | Seule une situation facturée ou payée est traitée comme émise (`devisHtmlBuilder.js`, commentaire du juriste). « Générer facture » avec `tva: 0` : ajouté à `situations-conformes` | `5676440` |
| 3. Retrait de la colonne « TVA » | En franchise : ni en-tête ni cellule « - », lots en `colspan` 5 et 4, dans `devisHtmlBuilder.js`, `DevisPage.jsx` et `pdfHtmlBuilder.js`. Hors franchise, la colonne reste | `5676440` |
| 4. Fournitures / main-d'œuvre : plus tard | Entrée « Plus tard » de la feuille de route avec le § 300 et la proposition ; § 300 consigné dans `docs/metier-btp.md` § 4 | docs ci-dessous |

Preuves :
- Tests mis à jour et ajoutés (`libellesFranchiseEcrans.test.jsx`, `franchiseTva.test.js`) : 24 sur 24. Ils couvrent le total de la facture, du devis et de l'avoir, la colonne « TVA » absente en franchise et présente pour une SARL, la situation validée sans TVA, facturée et payée avec TVA.
- **Contre-essai** : sans les changements du code, 5 de ces tests échouent.
- Parcours `npm run parcours -- "aperçu imprimé"` (aperçu réel du générateur de `DevisPage`) : ✓ 12 vérifications, dont deux nouvelles : « Total (hors taxes et toutes taxes comprises) » et pas de colonne « TVA ».
- Vérification : voir la section suivante.

### Vérification après les décisions

```
Vérification « standard » de 19e9d5e

  ✓ Tests (44.5 s) — 1220 passed (1220)
  ✓ Lint (0 erreur) (6.4 s) — 241 problems (0 errors, 241 warnings)
  ✓ Smoke (29.6 s)
  ✓ Build (26.6 s)

✓ Tout est vert — niveau « standard ».
```

Relecture `juriste-btp` des décisions appliquées : **OK sur les 7 points**, rien à corriger.

### Résumé des décisions

1. Les PDF en franchise finissent par « Net à payer (hors taxes et toutes taxes comprises) » ou « Total (hors taxes et toutes taxes comprises) ».
2. Une situation seulement validée s'imprime sans TVA.
3. Plus de colonne « TVA » sur les PDF en franchise, dans les deux générateurs.
4. Fournitures et main-d'œuvre : en « Plus tard », avec la source.
5. Tests 1220 sur 1220, contre-essai fait, parcours de l'aperçu réel vert, juriste OK.

## Correction du contrôle du 3 nov.

Contrôle de la branche (`31a2bab` à `9e4862a`) par la session locale : rapport jugé véridique, livrable après corrections. Six défauts mineurs et des écarts de ce rapport, corrigés sur la branche locale `corr-franchise`, partie de `origin/cloud/franchise` (`9e4862a`).

| Point du contrôle | Fait | Commit |
|---|---|---|
| Facture de situation émise avec TVA, situation introuvable (chantier supprimé, situations vidées) : réimprimée sans sa TVA depuis `5676440` | Le « PDF » de la facture (`DevisPage.jsx`, `downloadPDF`, l. 1369) passe par `situationDeFacture` (`src/lib/situationUtils.js`, l. 249) : la situation du chantier, sinon celle refaite depuis la facture, avec `statut: sit?.statut \|\| (doc.statut === 'brouillon' ? 'brouillon' : 'facturee')`. Émise avec TVA, elle se réimprime avec sa TVA (CGI art. 289, V) ; en brouillon, sans | `b67b217` |
| Commentaire interne dans le HTML remis au client | « … (décision d'Hugo du 3 nov. 2026) » quitte l'en-tête du tableau : commentaire JavaScript hors du gabarit (`devisHtmlBuilder.js` l. 138, `DevisPage.jsx` l. 1416). Même défaut, même correction pour le commentaire des notes (« recette du 9 oct. 2026 », chemin d'un fichier source), dans les deux générateurs (l. 341 et 1584) | `b67b217` |
| Phrases d'écran qui citent la mention de la facture | « TVA non applicable, article 293 B du CGI », comme sur les PDF (CGI art. 293 E, II), source en commentaire : trésorerie (`TresorerieModule.jsx` l. 2371), Paramètres (`Settings.jsx` l. 752), choix de la TVA (`settings/ChoixTva.jsx` l. 37). Aussi le commentaire de `franchiseTva.js` (l. 3) et le parcours de l'assistant. Les libellés d'écran gardent « art. » | `b67b217` |
| `docs/metier-btp.md` l. 50, 51 et 57 | l. 50 : mention imprimée et formule de D-31 ; l. 51 : la note de l'arrêté de 1983, à délivrer pour une prestation de services de 25 € TVA comprise ou plus ; l. 57 : CIBS au 1er janv. 2027, comme la l. 58 | docs |
| Portail (`ClientPortal.jsx:534`, éteint) | Ajouté à `franchise-restes`, pas codé | docs |
| Restes | `franchise-restes` et `mouvements-tva` : lignes du code final, plus `reportPdfBuilder.js:589` et `736`, `PublicPaymentPage.jsx:238` et `305` ; `situations-conformes` suit le déplacement du `\|\| 5` dans `situationDeFacture` | docs |
| Tests manquants | Alerte de retenue (choix du devis de référence : alerte à 6 % et à 5,5 %, rien à 5 %) ; « Sous-total » de la bibliothèque d'ouvrages en franchise (`Bibliotheque` → `FenetreAjoutDevis`) | `b67b217` |
| Écarts de ce rapport | En-tête (branche `claude/vat-franchise-labels-u9bstz`), § 1 et § 5 (mention imprimée), § 3 et « Ce qui reste » (lignes), vérification complète et phrase sur les commits suivants, « Décisions pour Hugo », résumés n° 6 et 9. L'avis du juriste versé dans `docs/` est un résumé : son fichier le dit | docs |

### Preuves

- Tests ajoutés dans `libellesFranchiseEcrans.test.jsx` (facture de situation introuvable, aucun commentaire interne, phrases qui citent la mention ; 15 tests dans le fichier) et `libellesFranchiseListes.test.jsx` (bibliothèque, alerte de retenue ; 7 tests) : tous réussis.
- **Contre-essais**, faits dans cette session : chaque correction retirée seule, le test lancé, puis la correction remise (fichiers vérifiés identiques octet pour octet). Neuf retraits, neuf échecs :
  1. sans le statut dans `situationDeFacture` : « expected 'Facture de Situation n°2 …' to contain 'TVA 10 % 50,00 €' » (la facture s'imprimait « NET À PAYER (hors taxes et toutes taxes comprises) 475,00 € », sans TVA) ;
  2. commentaire « décision d'Hugo » remis dans l'en-tête : « expected [ Array(1) ] to deeply equal [] » ;
  3. commentaire « recette du 9 oct. » remis au-dessus des notes : même échec ;
  4. à 6. « art. 293 B » remis dans le choix de la TVA, les Paramètres ou la trésorerie : « expected 'TVA non applicable, art. 293 B du CGI' to be 'TVA non applicable, article 293 B du …' » ;
  7. alerte de retenue retirée : « expected 'Sélectionner le devis de référence …' to contain 'La retenue de garantie est de 5 % au …' » ;
  8. drapeau `franchiseTva` retiré de `Bibliotheque.jsx` (l. 584), et 9. « Sous-total HT » écrit en dur dans `FenetresCatalogue.jsx` : « expected 'Ajouter au devis …' to contain 'Sous-total 90,00 €' » (reçu : « Sous-total HT 90,00 € »).
- Parcours `npm run parcours -- "aperçu imprimé"` (aperçu réel du générateur de `DevisPage`) : ✓ 16 vérifications, dont quatre nouvelles (notes imprimées, aucun commentaire interne dans le HTML, en micro-entreprise et en SARL). Contre-essai : avec le commentaire « décision d'Hugo » remis dans `DevisPage.jsx`, il échoue (« Micro-entreprise : aucun commentaire interne dans le HTML imprimé »).
- Parcours `npm run parcours -- "assistant : une micro-entreprise"` : ✓ 12 vérifications, dont la mention « article 293 B du CGI » à l'étape « Documents », à 375 et 1440 px.
- `npm run verifier` (standard) sur `b67b217`, arbre propre, recopié mot pour mot :

```
Vérification « standard » de b67b217

  ✓ Tests (23.3 s) — 1226 passed (1226)
  ✓ Lint (0 erreur) (2.8 s) — 241 problems (0 errors, 241 warnings)
  ✓ Smoke (12.5 s)
  ✓ Build (10.7 s)

✓ Tout est vert — niveau « standard ».
```

  Le commit suivant (ce rapport et la documentation) ne change pas le code ; sa vérification standard est rejouée sur lui, après coup.

### Ce que le dépôt ne prouve pas

- Les contre-essais des sessions cloud, leurs relectures `juriste-btp` (« 7 points », « 6 points », « 7 points ») et la réponse d'Hugo (« 1 oui, 2 brouillon, 3 retrait, 4 plus tard », consignée en D-31) : rapportés tels quels, invérifiables ici.
- **La vérification complète du code final** (`npm run verifier -- --complet` : banc, tous les parcours, audit d'interface) n'a pas tourné depuis `d59f352`. Elle sera rejouée par la session locale avant livraison.
- La relecture `juriste-btp` de cette correction (phrases d'écran, `metier-btp.md`) n'est pas faite : cette session n'avait pas de sous-agent.

### Ce qui reste

- Deux branchements toujours sans test : `Catalogue.jsx` l. 754 → `Bibliotheque`, et la création rapide de chantier (Ctrl+H, `App.jsx` l. 2090). Le nouveau test part de `Bibliotheque`.
- Les autres commentaires HTML des gabarits sont des repères (« HEADER », « TOTAUX »…) ou citent leurs sources (C. conso.) ; celui du médiateur (`devisHtmlBuilder.js` l. 401) dit aussi « même bloc que l'aperçu de l'artisan » : laissé.
