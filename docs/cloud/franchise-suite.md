# Session cloud « franchise-suite » — rapport (4 nov. 2026)

Branche : `cloud/franchise-suite`. Rien n'est fusionné, rien n'est appliqué en production. (Correction du 4 nov. : la copie `claude/franchise-suite-ipay8p` n'est **pas** identique : elle est restée à `d8ccf7dc`, sans le correctif CSV ni ce rapport. Livrer seulement depuis `cloud/franchise-suite`.)

Mission : tâche 28 `[franchise-restes]` de `docs/feuille-de-route.md`. En franchise en base de TVA (art. 293 B du CGI), plus aucun « HT » ni « TTC » à côté d'un montant. Hors franchise, rien ne change. Les montants ne changent pas.

## Ce qui est fait

Une seule règle : `estFranchiseTva` pour l'entreprise et `franchiseAppliquee` pour une pièce. Une pièce émise avec TVA garde ses libellés.

| Écran ou fichier | En franchise |
|---|---|
| Ramonage : saisie, onglet du client, réglages | « Prix (€) », « 85 € », « Prix proposé » (plus de « hors taxes ») |
| Bibliothèque d'ouvrages, vue en liste | colonne « Prix » |
| Historique des versions (comparaison, version) | totaux sans « HT », « Total » |
| Variables des relances | « Total de la facture » ; `{{montant_ttc}}` décrite « Comme {{montant}} (anciens modèles) » |
| Paramètres › Rentabilité | « Chiffre d'affaires » à la place de « CA HT » |
| Export CSV des devis et factures | une colonne « Montant », sans HT ni TVA. **Si une pièce exportée porte de la TVA, les colonnes HT / TVA / TTC restent** (avis du juriste) |
| Export CSV du catalogue | « Prix unitaire », « Prix d'achat », sans colonne de TVA |
| Import CSV du catalogue | « Prix unitaire », « Prix d'achat », pas de « Taux TVA » à associer (la colonne du fichier est ignorée, comme à la création) |
| Lettre de mise en demeure | « Montant : 1 000,00 € », « d'un montant de … », « Montant initial de la facture » |
| Rapports PDF (activité, financier, chantier) | « Chiffre d'affaires », « Dépenses », « Devis signés », « Montant » |
| Page de paiement en ligne (éteinte) | « Total », « Montant » |
| Document imprimé du portail (éteint) | « Net à payer (hors taxes et toutes taxes comprises) » : le libellé de D-31, désormais partagé (`libelleTotalImprime`, `src/lib/totauxDocument.js`) |

Nouveaux fichiers :
- `src/lib/exportsCsv.js` : les tableaux des deux exports, sortis des écrans pour être testés.
- Migration **114** (ex-107, renumérotée le 4 nov.) `supabase/migrations/114_forme_juridique_sur_la_page_de_paiement.sql` + `scripts/banc/114.mjs`. La page de paiement ne recevait pas la forme juridique : impossible d'appliquer la règle. 114 ajoute la clé `forme_juridique` à `get_facture_for_payment` et retire le prix d'achat des lignes (corps de 106 recopié à l'identique sinon). **Sans 114 appliquée, la page garde « TTC »** (testé).

Défaut trouvé en route et corrigé : la page de paiement ne reçoit pas le type de la pièce ; sans lui, une facture émise avec TVA aurait été lue comme un brouillon et aurait perdu son « TTC ».

## Preuves

- Tests ajoutés (micro-entreprise et SARL, avec contre-essai) :
  - `src/components/__tests__/libellesFranchiseRestes.test.jsx` : 17 tests ;
  - `src/components/__tests__/libellesFranchiseReglages.test.jsx` : 1 test ;
  - `src/lib/__tests__/reportPdfFranchise.test.js` : 3 tests.
- Contre-essai (fait **avant** `1d03f276`, sur 16 tests d'écrans ; il y en a 17 puis 20 aujourd'hui) : en remettant les anciens libellés des écrans, 10 tests d'écrans sur 16 et les 4 tests des rapports et des Paramètres échouaient. Ce n'est pas rejouable « avec le code de `main` » : `exportsCsv.js`, `libelleTotalImprime`, `variablesDisponibles` et `champsImport` n'y existent pas. Il faut revenir en arrière sur les seuls libellés des écrans. Les contre-essais des corrections du 4 nov. sont dans la section dédiée, avec leur commit.
- `npm run banc:migrations` : vert, 655 vérifications à l'époque (107, devenue 114 : forme renvoyée, SARL renvoyée telle quelle, reste inchangé, jeton inconnu refusé, droits et attributs inchangés après le rejeu).
- `npm run verifier` (standard) : vert. 1250 tests, lint 0 erreur, smoke, build.
- `npm run verifier -- --complet` (navigateur disponible) : tout vert (tests, lint, smoke, build, banc, audit d'interface) **sauf un parcours** : « ramonage : l'historique d'un appareil… ». Il attendait « 95 € HT » pour une micro-entreprise : c'était le défaut corrigé ici. Attente mise à jour (« 95 € », sans « HT »), puis `npm run parcours -- ramonage` : 8 parcours verts. La chaîne complète n'a pas été relancée en entier après cette correction (35 min de parcours, budget partagé) : à rejouer par la session locale.
- `npm run parcours -- documents` : 17 parcours verts. Attention : ces parcours ne couvrent ni la lettre de mise en demeure ni la page de paiement ; ces deux textes sont prouvés par les tests unitaires ci-dessus. Un parcours navigateur dédié reste à écrire si on le juge utile.

## Relectures

- `gardien-securite` (migration 107, devenue 114) : **OK**. Corps identique à 106 hors l'ajout. Droits conservés. Information déjà imprimée sur la facture. Ses deux suggestions sont faites : contrôle des droits au banc, et une note dans l'en-tête (toute réécriture future de la fonction repart de 114).
- `juriste-btp` (lettre, page de paiement, portail, écrans) : **rien de bloquant**. La mention « TVA non applicable, article 293 B du CGI » n'est obligatoire ni sur la lettre ni sur la page de paiement : l'art. 293 E, II du CGI ne vise que la facture. Le juriste n'a pas pu relire Légifrance (site bloqué dans la session) : il s'appuie sur l'avis du 3 nov. et sur `docs/metier-btp.md` § 3. Son point « à faire » sur l'export CSV est corrigé.

## Textes nouveaux soumis au juriste

- Lettre de mise en demeure, en franchise : « Montant : X € », « d'un montant de X € », « Montant initial de la facture ».
- Page de paiement, en franchise : « Total », « Montant ».

## Ce qui reste

1. **Appliquer la migration 114** (session locale, D-22), puis lancer les trois requêtes de l'en-tête (attendu : `true`, `true`, `true`). L'ajouter à « En attente » de `docs/etat-production.md` : la session locale le fait à la fusion.
2. **Rapport financier en franchise** : une facture émise par erreur avec TVA n'y apparaît pas (`tvaFacturee` renvoie 0 en franchise). Ce calcul est antérieur à ce lot, et la mission ne change pas les calculs. À traiter avec `mouvements-tva` : montrer la TVA à régulariser.
3. **Portail client, avant de le rallumer** (défauts antérieurs) : la remise n'est pas imprimée ; un avoir est titré « FACTURE » ; les mentions d'une facture manquent.
4. Facultatif : « Total des lignes » dans l'historique quand il y a une remise ; supprimer `src/services/RelanceService.js` (code mort qui écrit « EUR TTC ») ; mention 293 B dans la lettre (le juriste ne la recommande pas).

## Décisions pour Hugo

- **Portail client** : avant de le rallumer, servir le vrai PDF de la facture, ou intituler son document « Récapitulatif » ? Le juriste recommande le vrai PDF.
- **Lettre de mise en demeure** : ajouter la mention 293 B, alors qu'elle n'est pas obligatoire ? Le juriste recommande non.

## Risques

- Numéro de migration : renuméroté 114 le 4 nov. (107 est le quota IA) ; le banc refuse désormais deux migrations au même numéro.
- Une migration future qui recopierait l'ancien corps de 106 ferait disparaître la forme juridique. La note dans l'en-tête de 114 le signale.
- Les tests d'écrans tournent sans navigateur (rendu serveur, états imposés). Les libellés à l'écran ne sont pas constatés dans un navigateur, hors la vérification complète.

## Résumé

- En franchise, les derniers « HT » et « TTC » ont disparu de 13 écrans et fichiers (ramonage, bibliothèque, historique, relances, Paramètres, 3 exports CSV, lettre de mise en demeure, rapports PDF, paiement, portail).
- Hors franchise, rien ne change ; une pièce émise avec TVA garde ses libellés.
- 21 tests nouveaux, contre-essai fait ; vérification standard verte ; banc vert (655) ; complète verte sauf un parcours, corrigé et rejoué seul.
- Migration 114 (ex-107) préparée et relue (sécurité OK) : à appliquer, sinon la page de paiement garde « TTC ».
- Juriste : rien de bloquant ; mention 293 B non obligatoire sur la lettre et sur la page de paiement.
- Corrigé après sa relecture : l'export CSV garde la TVA d'une pièce émise avec TVA.
- Reste : TVA à régulariser dans le rapport financier, défauts du portail avant de le rallumer.
- Deux décisions pour Hugo : le document du portail, la mention 293 B dans la lettre.

## Corrections de la relecture du 4 nov.

Session cloud de correction du 4 nov. 2026. Branche `cloud/franchise-suite`. `origin/main` (`4da7322`) est fusionné par un merge, sans rebase (`29b0c22`). Deux conflits : `docs/feuille-de-route.md` (tâche 27 de `main`, tâche 28 de la branche, réécrite) et les imports de `miseEnDemeureBuilder.js`, où les deux sont gardés (`mentionImmatriculation` et `franchiseAppliquee`).

| # | Point | Fait | Commit | Preuve |
|---|---|---|---|---|
| 1 | Numéro 107 en double | Renuméroté **114** : fichier, en-tête, `scripts/banc/114.mjs` (chemin et libellés), commentaire de `PublicPaymentPage.jsx`, intitulé du test (« avant 114 »), tâche 28, ce rapport. **Garde-fou** dans `scripts/banc-migrations.mjs` : deux migrations au même numéro font échouer le banc. | `b110ed4` | Banc vert, 662 vérifications. Contre-essai du garde-fou : une copie temporaire `106_zz…sql` donne « ✗ numéros de migration en double : 106 ». |
| — | Filtre `prixAchat` (consigne) | `get_facture_for_payment` (114) retire `prixAchat` et `prix_achat` de chaque ligne vue par un visiteur. La ligne enregistrée ne change pas. Ordre et prix de vente gardés. `null`, `[]`, texte et éléments qui ne sont pas des objets sont rendus tels quels. | `b110ed4`, `62d8fd5` | Banc : 6 vérifications nouvelles. Contre-essai : avec l'ancienne ligne `'lignes', v_facture.lignes`, « ✗ 114 : un visiteur ne lit pas le prix d'achat des lignes ». |
| 2 | Parcours lettre et paiement | Deux scénarios dans `scripts/parcours/documents.cjs`. (1) Une facture en retard de 45 jours, en micro et en SARL : clic sur « Mise en demeure », lecture du HTML remis à l'impression. (2) `/pay/:token` avec un faux `get_facture_for_payment` : micro, SARL, et micro avec une facture émise avec `total_tva` > 0. | `e89b2cf` | `npm run parcours -- "mise en demeure"` : 1 vert (9 vérifications). `npm run parcours -- "page de paiement en ligne"` : 1 vert (7 vérifications). Contre-essai (règle franchise neutralisée dans `miseEnDemeureBuilder.js:80` et `PublicPaymentPage.jsx:173`) : les deux échouent, « Montant : 1 000,00 € TTC » et « Total TTC 300,00 € ». |
| 3 | Tests qui recopiaient la règle | Le drapeau de l'export est calculé dans `exportsCsv.js` (`exportDocumentsEnFranchise(docs, entreprise)`). `DevisPage` ne passe plus que l'entreprise. Le HTML du portail est sorti dans `src/components/portal/documentImprimePortail.js`. L'import d'une ligne du catalogue est sorti dans `articleDepuisLigneCsv` (`src/lib/csvImport.js`). Tests : export avec une micro et une facture émise avec TVA ; HTML du portail en micro, en SARL, et pour une pièce émise avec TVA ; import en franchise, où la colonne TVA ne change rien. | `d3a91ed` | 20 tests dans `libellesFranchiseRestes.test.jsx`. Contre-essais, chacun fait échouer son test : drapeau d'export sans la vérification par pièce ; colonne TVA lue en franchise ; portail sans franchise. **Non fait** : le passage des props Bibliotheque → OuvragesList et RelanceConfigTab → VariablesCard n'a pas de test (hors de la correction demandée, budget). |
| 4 | « Prix d’achat » non reconnu à l'import | `sansAccent` lit les deux apostrophes comme une espace. Ajout de « prix d achat » et « prix unitaire » aux indices. **`prixAchat` est maintenant associé avant `prix`** : sinon le mot « prix » prenait la colonne « Prix d’achat » quand aucune autre colonne de prix n'existait (constaté par le test). | `d3a91ed` | Test d'aller-retour export → import en micro et en SARL : prix d'achat 10 relu. Contre-essai : sans le changement d'apostrophes, le test échoue. |
| 5 | Rapport inexact | Corrigé plus haut : la copie `claude/franchise-suite-ipay8p` n'est pas identique ; le contre-essai date d'avant `1d03f276` et n'est pas rejouable avec `main` ; chaque vérification est rattachée à un SHA ci-dessous. | (ce commit) | — |
| 6 | Tâche 28 et Pilote | Réécrite pendant la fusion, avec le seul reste (a, b, c), au format fixe : Critère, Vérification, « Taille S. » en fin de ligne. | `29b0c22` | `grep '^28\.' docs/feuille-de-route.md` se termine par « Taille S. », que le motif de `preparer.mjs` lit. |
| 7 | Commentaire déplacé | `libelleTotalImprime` est placée au-dessus du commentaire de `lignesTotauxHtml`. | `d3a91ed` | Relu. |
| 8 | `etat-production.md` | **Non fait, comme demandé** : la session locale l'ajoute à la fusion. Il y a maintenant **trois** requêtes dans l'en-tête de 114 (forme renvoyée, droits, prix d'achat filtré), attendu `true`, `true`, `true`. | — | — |

### Vérifications rattachées à un SHA

- `62d8fd5` (dernier commit de code) : `npm run banc:migrations` vert, 662 vérifications.
- `e89b2cf` : `npm run verifier` (standard) vert. 1318 tests sur 123 fichiers, lint 0 erreur (241 avertissements), smoke, build.
- `npm run verifier -- --complet` sur `62d8fd5` : **tout vert**. Tests 1318, lint 0 erreur, smoke, build, banc, parcours navigateur (2399 s), audit d’interface (386 s). Les commits suivants ne touchent que ce rapport.

### Relectures

- `gardien-securite` (114 avec le filtre, banc, garde-fou) : **applicable, rien de bloquant**. Le corps est identique à 106, à deux ajouts près. Droits et attributs inchangés. Le filtre ne peut pas planter. Le contre-essai du banc est réel. Ses mineurs : cas de lignes mal formées au banc (fait, `62d8fd5`) ; l'en-tête disait à tort que 110 filtrait déjà (corrigé, `62d8fd5`).
- **Important, hors de cette branche** : `get_devis_for_signature` (108 et 110 de `cloud/metier-qualifications`) renvoie toujours `lignes` **et `sections[].lignes`** bruts, avec le prix d'achat, à tout destinataire d'un lien de signature. Il faut la même expression dans 110, sur `lignes` et sur les lignes de chaque section, avec son banc (aucune clé `prixAchat` à aucun niveau, contre-essai sur la ligne enregistrée).
- `juriste-btp` : pas relancé. Aucun texte affiché ou imprimé n'a changé dans cette session : seuls des tests, des parcours, le SQL et du code sont déplacés. Les sorties (export, portail, import) sont identiques, et les tests le vérifient.

### Ce qui reste

- Session locale : ajouter 114 à `etat-production.md`, puis l'appliquer après livraison (trois requêtes, attendu `true` ×3). Mettre le filtre `prixAchat` dans 110 (voir plus haut). Lancer `/sonde` en micro sur les écrans listés par la relecture.
- Tests des props Bibliotheque → OuvragesList et RelanceConfigTab → VariablesCard (point 3, non fait).
- Hors périmètre, relevé par la relecture : l'export CSV du volet « Trier » n'est pas filtré par `canViewPrices` (`DevisPage.jsx`). À ouvrir en tâche.

### Décisions pour Hugo (inchangées, non appliquées)

- **Portail client** (éteint) : servir le vrai PDF de la facture, ou intituler son document « Récapitulatif » ? Le juriste recommande le vrai PDF.
- **Lettre de mise en demeure** : ajouter la mention 293 B, alors qu'elle n'est pas obligatoire ? Le juriste recommande non.
- Proposition du gardien, à trancher : la page de paiement ne lit pas les lignes. Faut-il les réserver au serveur (aucune ligne pour un visiteur) plutôt que de les filtrer clé par clé ? C'est plus sûr pour un futur champ interne. Le filtre est gardé ici pour avoir le même corps que 110, comme demandé.

### Risques

- Le garde-fou du banc ne voit un numéro en double que sur la branche en cours : la collision n'apparaît qu'après la fusion.
- L'ordre d'association des colonnes à l'import change (`prixAchat` avant `prix`). Un fichier dont la seule colonne de prix s'appelle « Prix d'achat » ne remplit plus le prix de vente : c'est voulu.

### Résumé

- `main` fusionné ; conflits de la feuille de route et des imports réglés en gardant les deux côtés.
- Migration renumérotée 114 ; le banc refuse désormais deux migrations au même numéro (contre-essai fait).
- 114 retire le prix d'achat des lignes vues par un visiteur (banc et contre-essai).
- Deux parcours navigateur : lettre de mise en demeure, page de paiement ; micro et SARL ; contre-essais qui échouent.
- Export, portail et import testés par leur vrai code, sans recopier la règle.
- « Prix d’achat » se réimporte ; aller-retour testé.
- Complète verte sur `62d8fd5`, dernier commit de code : 1318 tests, banc 662, parcours et audit d’interface.
- Sécurité : 114 applicable. À faire ailleurs : le même filtre dans 110 (page de signature).
- Deux décisions d'Hugo inchangées ; une proposition du gardien à trancher.
