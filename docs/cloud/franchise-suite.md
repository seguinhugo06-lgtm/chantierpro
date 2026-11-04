# Session cloud « franchise-suite » — rapport (4 nov. 2026)

Branche : `cloud/franchise-suite` (copie identique poussée sur `claude/franchise-suite-ipay8p`, la branche imposée par l'environnement). Rien n'est fusionné, rien n'est appliqué en production.

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
- Migration **107** `supabase/migrations/107_forme_juridique_sur_la_page_de_paiement.sql` + `scripts/banc/107.mjs`. La page de paiement ne recevait pas la forme juridique : impossible d'appliquer la règle. 107 ajoute la seule clé `forme_juridique` à `get_facture_for_payment` (corps de 106 recopié à l'identique). **Sans 107 appliquée, la page garde « TTC »** (testé).

Défaut trouvé en route et corrigé : la page de paiement ne reçoit pas le type de la pièce ; sans lui, une facture émise avec TVA aurait été lue comme un brouillon et aurait perdu son « TTC ».

## Preuves

- Tests ajoutés (micro-entreprise et SARL, avec contre-essai) :
  - `src/components/__tests__/libellesFranchiseRestes.test.jsx` : 17 tests ;
  - `src/components/__tests__/libellesFranchiseReglages.test.jsx` : 1 test ;
  - `src/lib/__tests__/reportPdfFranchise.test.js` : 3 tests.
- Contre-essai : avec le code de `main` et les nouveaux tests, 10 tests d'écrans sur 16 et les 4 tests des rapports et des Paramètres échouent. Les tests qui passent encore vérifient ce qui ne doit pas changer (une pièce émise avec TVA garde « TTC »).
- `npm run banc:migrations` : vert, 655 vérifications (107 : forme renvoyée, SARL renvoyée telle quelle, reste inchangé, jeton inconnu refusé, droits et attributs inchangés après le rejeu).
- `npm run verifier` (standard) : vert. 1250 tests, lint 0 erreur, smoke, build.
- `npm run verifier -- --complet` (navigateur disponible) : tout vert (tests, lint, smoke, build, banc, audit d'interface) **sauf un parcours** : « ramonage : l'historique d'un appareil… ». Il attendait « 95 € HT » pour une micro-entreprise : c'était le défaut corrigé ici. Attente mise à jour (« 95 € », sans « HT »), puis `npm run parcours -- ramonage` : 8 parcours verts. La chaîne complète n'a pas été relancée en entier après cette correction (35 min de parcours, budget partagé) : à rejouer par la session locale.
- `npm run parcours -- documents` : 17 parcours verts. Attention : ces parcours ne couvrent ni la lettre de mise en demeure ni la page de paiement ; ces deux textes sont prouvés par les tests unitaires ci-dessus. Un parcours navigateur dédié reste à écrire si on le juge utile.

## Relectures

- `gardien-securite` (migration 107) : **OK**. Corps identique à 106 hors l'ajout. Droits conservés. Information déjà imprimée sur la facture. Ses deux suggestions sont faites : contrôle des droits au banc, et une note dans l'en-tête (toute réécriture future de la fonction repart de 107).
- `juriste-btp` (lettre, page de paiement, portail, écrans) : **rien de bloquant**. La mention « TVA non applicable, article 293 B du CGI » n'est obligatoire ni sur la lettre ni sur la page de paiement : l'art. 293 E, II du CGI ne vise que la facture. Le juriste n'a pas pu relire Légifrance (site bloqué dans la session) : il s'appuie sur l'avis du 3 nov. et sur `docs/metier-btp.md` § 3. Son point « à faire » sur l'export CSV est corrigé.

## Textes nouveaux soumis au juriste

- Lettre de mise en demeure, en franchise : « Montant : X € », « d'un montant de X € », « Montant initial de la facture ».
- Page de paiement, en franchise : « Total », « Montant ».

## Ce qui reste

1. **Appliquer la migration 107** (session locale, D-22), puis lancer les deux requêtes de l'en-tête (attendu : `true`, `true`). L'ajouter à « En attente » de `docs/etat-production.md` : je ne l'ai pas fait, pour éviter les conflits avec les cinq autres sessions. Le numéro 107 peut entrer en collision avec une autre branche : renuméroter alors le fichier et `scripts/banc/107.mjs`.
2. **Rapport financier en franchise** : une facture émise par erreur avec TVA n'y apparaît pas (`tvaFacturee` renvoie 0 en franchise). Ce calcul est antérieur à ce lot, et la mission ne change pas les calculs. À traiter avec `mouvements-tva` : montrer la TVA à régulariser.
3. **Portail client, avant de le rallumer** (défauts antérieurs) : la remise n'est pas imprimée ; un avoir est titré « FACTURE » ; les mentions d'une facture manquent.
4. Facultatif : « Total des lignes » dans l'historique quand il y a une remise ; supprimer `src/services/RelanceService.js` (code mort qui écrit « EUR TTC ») ; mention 293 B dans la lettre (le juriste ne la recommande pas).

## Décisions pour Hugo

- **Portail client** : avant de le rallumer, servir le vrai PDF de la facture, ou intituler son document « Récapitulatif » ? Le juriste recommande le vrai PDF.
- **Lettre de mise en demeure** : ajouter la mention 293 B, alors qu'elle n'est pas obligatoire ? Le juriste recommande non.

## Risques

- Numéro de migration 107 partagé avec une autre session : à renuméroter à la fusion.
- Une migration future qui recopierait l'ancien corps de 106 ferait disparaître la forme juridique. La note dans l'en-tête de 107 le signale.
- Les tests d'écrans tournent sans navigateur (rendu serveur, états imposés). Les libellés à l'écran ne sont pas constatés dans un navigateur, hors la vérification complète.

## Résumé

- En franchise, les derniers « HT » et « TTC » ont disparu de 13 écrans et fichiers (ramonage, bibliothèque, historique, relances, Paramètres, 3 exports CSV, lettre de mise en demeure, rapports PDF, paiement, portail).
- Hors franchise, rien ne change ; une pièce émise avec TVA garde ses libellés.
- 21 tests nouveaux, contre-essai fait ; vérification standard verte ; banc vert (655) ; complète verte sauf un parcours, corrigé et rejoué seul.
- Migration 107 préparée et relue (sécurité OK) : à appliquer, sinon la page de paiement garde « TTC ».
- Juriste : rien de bloquant ; mention 293 B non obligatoire sur la lettre et sur la page de paiement.
- Corrigé après sa relecture : l'export CSV garde la TVA d'une pièce émise avec TVA.
- Reste : TVA à régulariser dans le rapport financier, défauts du portail avant de le rallumer.
- Deux décisions pour Hugo : le document du portail, la mention 293 B dans la lettre.
