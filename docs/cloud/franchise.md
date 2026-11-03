# Session cloud « franchise » — rapport (3 nov. 2026)

Branche : `cloud/franchise` (même contenu poussé sur `claude/vat-franchise-labels-u9bstz`, branche imposée par la session).

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

Ce bloc est utilisé par `devisHtmlBuilder.js` et par le générateur intégré de `DevisPage.jsx`. La mention « TVA non applicable, article 293 B du Code Général des Impôts » reste.

**Colonne « TVA » retirée en franchise** (accord d'Hugo du 3 nov. 2026, sur la recommandation du juriste). Elle est retirée des trois générateurs : l'en-tête, le tiret de chaque ligne, et une colonne de moins pour les titres et sous-totaux de lot. « Description » passe de 40 à 50 % de la largeur. Hors franchise, la colonne reste.

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
| Colonne « TVA » (après l'accord d'Hugo) | 10 tests sur 10 ✓ (en-tête absent, Description à 50 %, lots sur 5 et 4 colonnes ; SARL : colonne présente). Contre-essai : sans le changement, 2 en échec. Parcours `npm run parcours -- "aperçu"` : 4 sur 4 ✓, dont l'aperçu réel du générateur de `DevisPage` (colonne absente en micro-entreprise, présente en SARL) |
| `node scripts/audit-ui.cjs` | **0 défaut**, 80 combinaisons |

## 3. Ce qui reste (recherche complète de `HT` / `TTC` dans `src/components`)

**Légitime (rien à faire)**
- `DevisPage.jsx` et `DevisComposer.jsx` : déjà traités, chaque « HT » est sous `!franchise` ou `!microDoc`.
- `OngletApercu`, `OngletFinances`, `OngletDocuments`, `FenetresChantier`, `Chantiers`, `ArticlePicker`, `FormulaireArticle`, `OngletsStock`, `ArticleDetail` : déjà conditionnés.
- `voice/DicteeModal.jsx` : la dictée est masquée (`FONCTIONS.ia = false`, D-07).
- `landing/*` : pages marketing, exemples fictifs hors application.
- `admin-help/*` : aide et outils d'administration.
- `FicheChantier.jsx:343` : message sur une TVA réellement saisie.
- `tresorerie/TresorerieModule.jsx` 2126-2462, `Settings.jsx` 1206 (détail TVA) : tableaux de TVA, dont le régime « franchise » est déjà pris en compte par `regimeTvaTresorerie` (à confirmer en navigateur).

**À corriger plus tard (hors périmètre, faible exposition)**
- `tresorerie/TresorerieModule.jsx:507-516` : saisie d'un mouvement « Montant TTC », détail HT / TVA / TTC. En franchise, la TVA d'un achat n'est pas récupérable. Ce n'est pas qu'un libellé : le calcul est à revoir.
- `Settings.jsx:1106` : formule de marge « CA HT ».
- `DevisPage.jsx:1786` : en-tête CSV « Montant HT » (export pour le comptable).
- Ramonage (`OngletRamonage`, `SaisieRamonage`, `RamonageTab`) : « € HT ».
- Bibliothèque d'ouvrages (`OuvrageCard`, `OuvragesList`) : « Prix HT ».
- `Catalogue.jsx:507` et `FenetresCatalogue.jsx:21-22` : colonnes de l'import / export CSV.
- Historique (`audit/DiffViewer`, `audit/SnapshotViewer`) : « HT ».
- `settings/RelanceConfigTab.jsx:58-60` : description des variables (« montant TTC »).
- `payment/PublicPaymentPage.jsx` : « Montant TTC ». Le paiement en ligne est éteint (D-21).
- Situations : le calcul garde `sourceDevis.tvaRate || 10`. Un devis de micro-entreprise à 0 % dont une ligne n'a pas de taux tomberait à 10 %. Les lignes du composeur ont toujours `tva: 0` en franchise, et la facturation des situations est éteinte. Ce point est à traiter dans la tâche `situations-conformes`.

## 4. Décisions pour Hugo

1. ~~**Colonne « TVA » des documents imprimés en franchise**~~. **Tranché le 3 nov. 2026 : la retirer.** C'est fait (voir § 1).
2. **Une situation « validée » a-t-elle pu être envoyée au client ?** Par prudence, elle est traitée comme une pièce émise : avec de la TVA, elle se réimprime telle quelle.

## 5. Textes soumis au juriste (`juriste-btp`, 3 nov. 2026)

Verdict : **OK sur les 7 points**. Il a demandé trois retouches, toutes appliquées :
- la condition de statut de la situation (seul le brouillon passe sans TVA) ;
- le total du portail, recalculé pour ne pas imprimer une TVA ancienne sous la mention 293 B ;
- le message de l'éditeur, sans « HT ».

Textes nouveaux : « Prix unitaire », « Total », « Total avant remise », « Total après remise », « Total de l'avoir », « Total estimé », « Marché », « Montant de la situation », « Montant », « Budget du chantier (€) », « Sous-total », « Total des factures », « Votre coût d'achat (TVA comprise, par u) ». La mention « TVA non applicable, art. 293 B du CGI » est reprise telle qu'elle est déjà écrite ailleurs.

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
8. La colonne « TVA » des PDF est retirée en franchise (accord d'Hugo), et c'est testé avec un contre-essai.
9. Vérification : tests, lint, build, banc et audit d'interface (0 défaut) au vert. 4 parcours sont rouges, mais déjà rouges sur `main`.
10. Restent hors périmètre : trésorerie (calcul), ramonage, ouvrages, exports CSV, historique.
