# Retours d'Hugo du 26 octobre 2026 — rapport de la session cloud « retours »

Session du 3 novembre 2026. Branches poussées : `cloud/retours` et `claude/cloud-retours-lymin1` (même contenu). Rien n'est livré sur `main`, aucune migration, aucun déploiement, aucun accès à la production.

Commits (depuis `adbf08d`) :

| Commit | Point |
|---|---|
| `9918946` fix(site): remove the fictitious quote tab… | 2 |
| `5ec9eac` fix(pricing): drop the VAT exemption notice… | 1 |
| `701d4f5` fix(pwa): reserve room at the page bottom… | 4 |
| `ec857e6` feat(ramonage): optional advice… | 5 |
| `3758c33` feat(settings): guided registration field… | 3 |
| `2b3b80b` fix(settings): "Renew" on an expired insurance… | 8 |
| `503961c` feat(documents): change a quote or invoice status… | 6 et 7 |
| `b22f731` fix(site): placeholder of the features section… | 2 (suite) |
| `868ca77` fix: confirm a hand-marked signed quote; texts after legal review | 3, 5, 7 (relectures) |
| `40d815c` test: on-site signature journeys date their quote today | parcours `facturation` (panne hors sujet) |
| (suivant) test: the signing check ignores lazily loaded site images | parcours `site` |

## Point par point

### 1. « Enlever "prix par mois, TVA non applicable" »
- **Cause** : le site affichait « Prix par mois — TVA non applicable, art. 293 B du CGI » au-dessus des tarifs (`PricingSection.jsx`), et la mention suivait chaque prix d'abonnement : site (offre annuelle, « Construit en public », FAQ « Puis-je essayer »), Mon plan, fenêtre d'abonnement, page de paiement réussi.
- **Correction** : la mention n'est plus à côté des prix. Chaque prix garde sa période (« par mois », « par an »). Jamais « HT » ni « TTC » (D-19). Elle **reste** dans les CGV (art. 4), dans la réponse de la FAQ sur la facturation, et doit figurer sur les factures Stripe (obligatoire ; réglage à constater par Hugo, attente 7).
- **Avis juriste (3 nov.)** : permis. Aucun texte n'impose la mention dans une grille de prix : c'est une mention de facture. Un prix « 9,90 € par mois » sans TVA ajoutée est le prix exact qu'un consommateur paie. Condition : la période doit rester collée à chaque prix, ce que les tests vérifient.
- **Décision** : D-19 précisée dans `docs/decisions.md`. La règle `.claude/rules/marketing.md` disait encore « 9,90 / 19,90 € HT » : corrigée.
- **Preuve** : parcours `site : tarifs et construit en public` (226 vérifications) et `abonnements` (Mon plan) verts. Tests unitaires `faq`, `prixPlan`, `prixAbonnementAffiche` adaptés. **Contre-essai** : avec l'ancien code, les deux parcours échouent (« l'introduction, sans « Prix par mois — TVA non applicable » » ; « Mon plan : plus de mention de franchise à côté des prix »).

### 2. « Enlever faux devis à la suite du devis qui se crée en live »
- **Cause** : sous le devis vivant du premier écran, la section « Essayez, c'est l'application » s'ouvrait sur l'onglet « Le document que reçoit votre client » : le **même** devis fictif (DEV-2026-00012, même lot), en grand.
- **Correction** : l'onglet et ses deux composants sont retirés (`ExempleDocument.jsx`, `DocumentEnGrand.jsx`). Quatre onglets restent : Signature, Métré, Relances, Encaissements. Texte d'introduction : « Des exemples à manipuler, sur des données fictives. Le métré et les relances sortent du code même de l'application. » La place réservée de la section a été recalée sur la hauteur du nouvel onglet affiché d'abord : sinon l'arrivée des onglets décalait la page de 100 px au téléphone, et le lien « FAQ » de la barre tombait 36 px trop bas.
- **Preuve** : parcours `site : fonctionnalités en action` (156 vérifications), avec une nouvelle vérification « un seul devis » : aucun cadre de document, aucun onglet document, générateur de devis jamais chargé. Tous les parcours `site` sont verts. **Contre-essai** : avec l'ancien code, échec « un seul devis : … {"cadres":1,"ongletDocument":true,"enGrand":true,"generateur":true} ».

### 3. « Registre métier ou commerce — Type à revoir car pas commerçant ??? »
- **Cause** : Paramètres › Légal ne proposait que le RCS, avec « Type : A commerçant / B société… », même à un artisan en entreprise individuelle.
- **Correction** (`src/lib/immatriculation.js`, nouveau) : un choix « Votre registre » : « Métiers (RM) » ou « Commerce (RCS) », proposé selon la forme juridique (EI, micro, EIRL → RM ; société → RCS). Pour le RM, pas de « Type », mais le département. Mêmes champs en base (`rcsType` vaut `'RM'`, `rcs_ville`, `rcsNumero`), **aucune migration**. Les anciennes saisies impriment exactement la même mention. La mention imprimée est identique dans **les deux générateurs** de PDF, `pdfHtmlBuilder.js`, la mise en demeure et l'attestation de ramonage. Au passage : `devisHtmlBuilder.js` imprimait « RCS: RCS … » avec l'ancien champ libre (corrigé). La liste « Facture 2026 » ne demande plus de RCS à un EI au RM. Lexique `rcs` réécrit (le RNE a remplacé le répertoire des métiers en 2023).
- **Preuve** : 14 tests `immatriculation.test.js` ; parcours `légal : un artisan voit le répertoire des métiers…` (réel simulé, 375 px) ; parcours `documents` (aperçu réel : « 123 456 789 RM 75 » pour l'EI, « RCS Paris B 123 456 789 » pour la SARL). Contre-essai : sans la correction, le bloc `data-registre` n'existe pas, le parcours échoue à sa première vérification (constaté par lecture, pas rejoué).
- **Juriste** : textes corrigés comme il l'a demandé. **Reste non tranché au texte** (Légifrance bloqué depuis le cloud) : la mention RM est-elle encore exigée, et sous quelle forme exacte ? Aujourd'hui l'app imprime « SIREN RM département » (l'usage). Voir « Décisions ».

### 4. « Scroll bug paramètre ramonage sur navigateur et pas sur app »
- **Cause** : pas un défaut de défilement. Dans un navigateur, la carte « Installer Mallettico » reste fixée en bas de l'écran (`src/components/PWAUpdatePrompt.jsx`) et couvre les derniers champs (tarifs « Chaudière », « Autre »), même tout en bas de la page. Elle n'apparaît jamais dans l'app installée, d'où « sur navigateur et pas sur app ». Les parcours existants masquaient cette carte.
- **Correction** : tant que la carte est affichée, le bas de page s'allonge de sa hauteur (plus 2 rem). Vaut pour toutes les pages.
- **Preuve** : nouveau parcours à 375 et 1440 px, carte affichée : défilement à la molette jusqu'en bas, dernier champ visible, couvert par rien, cliquable. **Contre-essai** : sans la correction, échec « couvert par P « Sur l'écran d'accueil » » (375 px) et « couvert par DIV « Accès instantané • Fonctionne hors ligne » » (1440 px).

### 5. « Conseils ramonage à mettre en facultatif »
- **Correction** : réglage « Imprimer les conseils sur l'attestation » (Paramètres › Ramonage, carte « Attestation », activé par défaut : rien ne change pour les attestations existantes), et une case du même nom à chaque attestation (combustible solide, hors chaudière). Le choix est enregistré **dans l'attestation** (`conseils.imprimes`, colonne déjà figée par la base) : une réimpression donne le même document. Réglage dans la fiche entreprise (`ramonageConseils`), **aucune migration**.
- **Juriste** : rien d'obligatoire n'est retiré. Les conduits ramonés et la vacuité (R. 1331-75), le titre, le numéro, l'identité, le SIRET, l'assurance, la mention « ne vaut pas attestation d'entretien » et le pied de page restent. R. 1331-77 oblige à conseiller, pas à l'écrire sur l'attestation. Réserve : l'arrêté du 20 juillet 2023 n'a pas pu être relu (réseau).
- **Preuve** : tests du rendu avec et sans conseils (et d'une attestation d'avant le réglage) ; parcours « conseils facultatifs » ; les 11 parcours `ramonage` verts. Contre-essai : avec l'ancien générateur, le test échoue (« not to contain 'Conseils donnés' »).

### 6 et 7. Changer le statut d'un devis ou d'une facture directement
- **Cause du blocage** : une facture envoyée n'avait plus aucun statut proposé (`FACTURE_TRANSITIONS.envoye: []`), donc le bouton « Changer le statut » disparaissait ; « Payée » n'était proposé nulle part ; le changement n'existait que dans le menu « ⋯ » de la fiche ; émettre un brouillon écrivait sans attendre la base ni demander de confirmation.
- **Correction** (`src/lib/changementStatut.js`, `src/components/devis/ChoixStatut.jsx`, `DevisPage.jsx`) : un bouton « Statut » sur chaque carte, et la pastille de la fiche est un bouton. Volet « Changer le statut » :
  - devis : brouillon → Envoyé ou Refusé ; envoyé → **Signé** ou Refusé ; refusé → Brouillon. Un devis signé ou facturé ne revient pas en arrière. « Signé » à la main demande une confirmation (« Le client a signé le devis ? » : signé sur papier, garder l'original, le lien en ligne ne servira plus).
  - facture : brouillon → « Envoyée », qui **émet** la facture après la confirmation « Émettre la facture ? » (numéro définitif, correction par avoir seulement) ; envoyée, en retard ou payée en partie → « Payée », qui ouvre l'encaissement prérempli du reste dû. Un appui l'enregistre, puis la facture passe « payée » (la base le refuse sinon, 099).
  - droits : `canPerform('devis','edit')`, plus `send` pour envoyer ou émettre ; montants derrière `canViewPrices` et le mode discret.
  - aucun faux succès : chaque écriture est attendue ; en cas de refus, pas de message de réussite et l'écran revient à l'état de la base. Le numéro d'une facture émise est repris de la ligne enregistrée (`DataContext.modifierEnBase`).
- **Preuve** : 10 tests `changementStatut.test.js` ; parcours `statuts.cjs` (4 scénarios, dont un en réel simulé : numéro FAC-2026-00042 repris de la base ; encaissement refusé (403) → « Non enregistré », aucune réussite, aucune demande « payée » envoyée, facture toujours « Envoyée »). Le parcours « Signé » vérifie aussi qu'« Annuler » n'écrit rien. **Contre-essais** : sans la correction, 4 échecs sur 4 ; sans la reprise du numéro, échec « la liste montre le numéro attribué par la base ».
- **Relecture `gardien-securite`** : aucune faille critique ni élevée. Aucune écriture ne contourne les règles de la base (098 à 106). Constat moyen M1 (« Signé » en un geste, sans retour) : **corrigé** par la confirmation. Faibles : F1 les rôles ne sont tenus que par l'écran (déjà suivi : tâche `org-droits`) ; F2 voir « Décisions ».
- **Possible blocage restant sur le compte d'Hugo** : un brouillon ne s'émet qu'après la vérification d'envoi existante (profil complet, décennale renseignée ou « non soumis » cochée). Si le profil est incomplet, « Envoi impossible » s'affiche. Ce contrôle est voulu (mentions obligatoires) et n'a pas été levé.

### 8. « "Renouveler" assurance ne marche pas »
- **Cause** : `Settings.jsx`, le bouton faisait seulement `ouvrirRubrique('assurances')`. Déjà dans la rubrique, rien ne se passait ; au téléphone, on arrivait en haut sans savoir quoi changer.
- **Correction** : « Renouveler » amène sur la date de validité de l'assurance concernée (décennale ou RC Pro) et la sélectionne ; les alertes « expirée » et « expire dans moins de 30 jours » de la rubrique ont leur propre bouton, avec « Saisissez la date de fin de votre nouvelle attestation. » Aucune date inventée ; l'enregistrement passe par la saisie existante.
- **Preuve** : parcours « assurances : « Renouveler » mène à la date de validité… » à 1440 et 375 px (la nouvelle date est écrite en base, l'alerte disparaît, bouton de 44 px). **Contre-essai** : sans la correction, échec `{"focus":"","visible":false,"valeur":"2026-01-15"}`.

## Vérifications lancées
- `npm ci` : OK.
- `npm run verifier -- --complet` sur `40d815c` : Tests (1225), Lint (0 erreur), Smoke, Build, Banc de migrations et **Audit d'interface : verts**. Parcours : 3 en échec :
  - `site : fonctionnalités en action`, « signer n'envoie rien » : la page avait chargé une capture d'écran du site (`/site/tel-facture.webp`, chargement différé au défilement), pas un envoi. Le contrôle ignore désormais ces images et compte tout autre fichier (commit suivant) ; rejoué : vert ;
  - `équipe : une seule rangée d'onglets…` (« 0 h validées ce mois ») et `trésorerie : pas de seuil d'alerte…` (bandeau « negatif ») : **échouent aussi sur `main` (`adbf08d`)**, constaté le 3 nov. en construisant `main` à part. Ils dépendent de la date (nouveau mois) et ne touchent rien de cette branche. Hors mission : à corriger par la session locale.
  - Donc le niveau « complet » n'est pas vert à cause de ces deux parcours ; le niveau standard l'est.
- Parcours ciblés (tous verts) : `site` (10 parcours), `abonnements`, `statuts.cjs` (4), `ramonage` (11), `légal`, `assurances`, `documents`, `facturation.cjs`.
- Chrome (puppeteer) fonctionne dans cet environnement.
- Panne hors sujet trouvée et corrigée : deux parcours « signature sur place » de `facturation.cjs` échouaient depuis le 31 octobre (leur devis daté du 1er octobre avait expiré). Ils datent maintenant leur devis du jour.

## Textes nouveaux soumis au juriste (relus le 3 nov., corrections appliquées)
- Site : « Commencez gratuitement, passez à un plan payant quand vous en avez besoin. » ; « Aussi à l'année : 99 € par an pour Artisan, 199 € par an pour Équipe. » ; introduction de « Essayez, c'est l'application ».
- Immatriculation : « Immatriculation » ; « Le registre où votre entreprise est inscrite, imprimé sur vos devis et factures. » ; « Votre registre » ; « Métiers (RM) » / « Commerce (RCS) » ; « Artisan en entreprise individuelle ou micro-entreprise. Inscrit aussi au RCS ? Choisissez Commerce (RCS). » ; « Commerçant ou société (SARL, SAS…), y compris artisanale : la mention RCS est obligatoire. » ; « Département d'immatriculation (numéro) » ; « Votre numéro SIREN (9 chiffres) et le numéro du département de votre établissement principal, comme sur votre extrait RNE (data.inpi.fr). » ; lexique `rcs`. Mention imprimée nouvelle : « 123 456 789 RM 33 ».
- Ramonage : « Attestation » ; « Imprimer les conseils sur l'attestation » ; aide du réglage ; « Ils ne figureront pas sur l'attestation. Vous devez quand même conseiller votre client, de vive voix ou par écrit. »
- Statuts : « Statut », « Changer le statut », « Statut actuel » ; « Votre client a signé le devis sur papier » ; confirmation « Le client a signé le devis ? » ; « Émet la facture : son numéro devient définitif. Pensez à l'envoyer à votre client. » ; « Émettre la facture ? » ; « Enregistre le paiement reçu du reste dû : {montant} » ; « Facture émise » ; « Statut enregistré : {libellé} ».
- Assurances : « Saisissez la date de fin de votre nouvelle attestation. »

## Décisions pour Hugo
1. **Mention RM** : le juriste n'a pas pu lire Légifrance depuis le cloud. Garder « SIREN RM département » (l'usage, risque faible) en attendant la vérification au texte par la session locale ? Et si elle est obligatoire pour un artisan en EI, faut-il la demander dans la liste « Facture 2026 » ?
2. **Inscrit aux deux registres** (activité mixte, société artisanale) : imprimer les deux mentions plutôt qu'une ?
3. **« Signé » à la main** : demander la date réelle de signature du papier ? Aujourd'hui, aucune date de signature n'est posée (le point de départ de la rétractation reste à la charge de l'artisan).
4. **Devis refusé repassé en brouillon** (déjà possible avant) : le renuméroter, ou en faire une nouvelle version ?
5. **« Envoyé » sans rien envoyer** (déjà possible avant, F2) : la date d'envoi est posée, donc les relances automatiques peuvent partir pour une pièce que le client n'a pas reçue. Le dire dans la confirmation, ou ne pas poser la date ?
6. **CGV art. 11** (vu par le juriste, hors sujet) : rien n'empêche un consommateur de s'abonner. Il faut soit désigner un médiateur (C. conso. L612-1), soit réserver l'offre aux professionnels.

## Ce qui reste
- Deux parcours en échec déjà sur `main`, liés à la date : `équipe : une seule rangée d'onglets…` et `trésorerie : pas de seuil d'alerte…`.
- Vérification au texte de la mention RM (session locale, Légifrance accessible).
- Mention RCS « RCS Paris B 123… » : R. 123-237 dit « numéro, RCS, ville » ; la lettre B est un usage. Forme existante, non changée.
- Vue tableau de la liste des documents (écran large) : pas de bouton « Statut » (la fiche et les cartes en ont un).
- Parcours : pas de cas « rôle lecture seule ne voit pas « Statut » » (relecture sécurité, F1).
- Allongement du bas de page sous la carte « Installer » : constaté sur Paramètres › Ramonage, puis (corrections du 3 nov.) sur l'accueil, la liste des devis, le planning et les chantiers, à 375 px avec l'agent Safari iPhone. L'audit d'interface, lui, n'affiche jamais la carte (ni agent mobile ni `beforeinstallprompt`) : il ne couvre pas ce cas.
- `src/lib/pdfHtmlBuilder.js` insère la fiche sans échappement (seulement utilisé par des tests aujourd'hui) : à échapper avant toute réutilisation.

## Risques
- Le changement de statut touche le parcours critique facture : la base reste seule garante (099, 101-103), et un parcours en réel simulé couvre le refus. À constater sur le compte de contrôle après livraison.
- La copie du numéro renvoyé par la base dans `modifierEnBase` vaut pour toutes les tables ; seules `devis` et `ramonages` ont un `numero`, et c'est la base qui le donne (relu par `gardien-securite`).
- Le retrait de l'onglet « document » enlève du site la seule démonstration du PDF complet. Hugo l'a demandé.

## Résumé
1. Prix : la mention « TVA non applicable » n'est plus à côté des prix (CGV et FAQ facturation la gardent ; elle doit figurer sur les factures Stripe, réglage à constater par Hugo, attente 7). Feu vert du juriste.
2. Site : le devis fictif qui répétait le devis vivant est retiré.
3. Registre : choix guidé « Métiers (RM) » / « Commerce (RCS) » selon la forme juridique, même mention dans les deux PDF. Forme RM à confirmer au texte.
4. Ramonage : la carte « Installer » couvrait le bas de page dans le navigateur ; corrigé.
5. Conseils ramonage facultatifs (réglage + case), choix figé dans l'attestation.
6-7. Statut direct sur la carte et la fiche : « Payée » encaisse le reste dû, « Envoyée » émet après confirmation, « Signé » se confirme.
8. « Renouveler » amène sur la date de validité de l'assurance.
Chaque point a son parcours, avec un contre-essai qui échoue sans la correction. Aucune migration.
Six décisions attendent Hugo (mention RM, double inscription, date de signature, brouillon, relances, médiateur).

## Corrections du 3 nov.

Session cloud de correction, après la relecture de code et la relecture du juriste (textes officiels lus en local). Branche `cloud/retours` (copie poussée aussi sur `claude/retours-corrections-juridiques-52t00c`). Rien sur `main`, aucune migration, aucun déploiement, aucun accès à la production. `origin/main` (`a9b2e86`) fusionné dans la branche : un conflit sous `scripts/parcours/facturation.cjs`, version de `main` gardée.

### Juriste — à corriger

1. **Mention de franchise sur les factures Stripe** (`cc0106f`) : partout, « doit figurer sur les factures Stripe (réglage à constater, attente 7) », avec CGI art. 293 E, II. Fichiers : `docs/decisions.md` (D-19, colonnes « Décision » et « Pourquoi »), `.claude/rules/marketing.md` (cette seule phrase), `src/stores/prixAbonnement.js` (en-tête, commentaire de `MENTION_TVA_ABONNEMENT`), `PricingSection.jsx` (l. 10 et 135), `prixPlan.test.jsx` (commentaire), ce rapport (point 1 et résumé). L'attente 7 reste ouverte. Le pied de facture qu'Hugo doit trouver dans Stripe : « TVA non applicable, article 293 B du CGI », son nom suivi de « EI », et son SIREN. À revoir lors de la recodification dans le CIBS (tâche « Mentions CIBS »).
2. **Mention RM → RNE** (`abfb9fd`) : `mentionImmatriculation` imprime « Entreprise du secteur des métiers et de l’artisanat, immatriculée au RNE sous le n° 123 456 789 » (C. conso. R111-2, 3°). Les DEUX générateurs (`devisHtmlBuilder.js`, l'aperçu inline de `DevisPage.jsx`), `pdfHtmlBuilder.js`, la mise en demeure et l'attestation de ramonage passent par ce module. Le département n'est plus ni demandé ni imprimé : une valeur déjà saisie est ignorée, sans migration. Paramètres : libellé « Métiers et artisanat (RNE) », aide et texte du choix recopiés du juriste. Sources réécrites (`immatriculation.js`, `devisHtmlBuilder.js`, `lexique.js`). Puce ajoutée dans `docs/metier-btp.md` § 2. Rien n'est ajouté à la liste « Facture 2026 ». La valeur interne `rcsType: 'RM'` reste en base (jamais imprimée). Tests `immatriculation.test.js` (15) et parcours « légal » et « documents » : ils attendent la nouvelle mention et l'absence de « RM ».
3. **Lexique** (`abfb9fd`) : titre « le RCS et le RNE », texte et sources du juriste.
4. **Confirmation « Signé »** (`3742bb7`) : le message et le commentaire sont ceux du juriste (« Gardez votre exemplaire signé… porte sa certification » ; C. civ. 1113 et 1359, C. conso. L221-9, BOFiP § 60 et 110). Le parcours `statuts` vérifie ce texte, et l'absence de « original » et de « attestation ».

### Relecture de code

| # | Fait | Commit |
|---|---|---|
| 1 | Résultat de `npm run verifier` recopié ci-dessous | ce rapport |
| 2 | « doit figurer… attente 7 » partout | `cc0106f` |
| 3 | Mention RNE selon le juriste, dans les deux générateurs | `abfb9fd` |
| 4 | **Non fait** : l'arrêté du 20 juil. 2023 ne s'ouvre pas depuis le cloud (Légifrance injoignable, constaté le 3 nov.). Réglage et case gardés ; `docs/metier-btp.md` § 10 porte « à vérifier avant livraison ». C'est à faire en local, par juriste-btp. | `2034b35` |
| 5 | `choisirRegistre` vide `rcsVille` ; le parcours « légal » part d'un ancien département « 33 » et vérifie : rien d'imprimé après « Commerce (RCS) » tant qu'aucune ville n'est choisie. Contre-essai : sans la correction, échec « Sera imprimé : RCS 33 A 123 456 789 ». | `abfb9fd` |
| 6 | Nouveaux parcours, carte affichée, agent Safari iPhone, 375 px : accueil, devis, planning, chantiers. Le dernier élément du contenu n'est couvert par rien. Contre-essai : sans la marge, les 4 échouent (et les 2 de Ramonage aussi). La phrase du rapport est corrigée : l'audit d'interface n'affiche pas la carte. Il manque encore une page à hauteur fixe : le planning n'en est pas une au sens strict, à confirmer en local. | `eac0b7c`, `b58f4ba` |
| 7 | Inscrit dans la feuille de route (`immat-fiche-entreprise`) | `2034b35` |
| 8 | Inscrit dans la feuille de route (`greffes-liste`) | `2034b35` |
| 9 | `modifierEnBase` rend `ECRITURE_EN_ATTENTE` (`lib/erreursEcriture.js`) pour une écriture mise en file. Hors ligne, `changerStatut` n'affiche plus « Facture émise » ; il affiche « Émission gardée sur cet appareil : la facture sera émise au retour du réseau, si la base l’accepte. » (texte reformulé par juriste-btp). Un changement de statut simple n'ajoute rien à « Pas de connexion ». Parcours `statuts` (réel simulé, étape 2). Contre-essai : sans la correction, échec `["Pas de connexion","Facture émise"]`. | `fbe1437`, `27162d3` |
| 10 | Nom accessible de la pastille : « Statut : Envoyée. Changer le statut » (texte masqué à l'écran, plus d'`aria-label`). Le parcours le vérifie. | `fbe1437` |
| 11 | « …ce qui en garde une trace écrite » (relu par juriste-btp : OK) | `c99ac9f` |
| 12 | `verifier(html.length > 0, …)` avant le test d'absence des conseils | `c99ac9f` |
| 13 | Colonne « Décision » de D-19 et commentaire de `MENTION_TVA_ABONNEMENT` réécrits | `cc0106f` |
| 14 | Gardés, avec la raison écrite dans `exemples.js` : la question sur le document d'exemple est ouverte (décision 3 ci-dessous). Si Hugo confirme le retrait, supprimer les fonctions et leurs tests. Le commentaire périmé de `honnetete.test.js` est corrigé. | `2034b35` |
| 15 | Contre-essais rejoués dans cette session : point 5 (registre), point 6 (marge, 4 pages) et point 9 (hors ligne) échouent sans la correction. Le point 3 n'a pas été rejoué en retirant le code, mais la version d'avant imprimait « 123 456 789 RM 33 » : les nouveaux tests, qui refusent « RM », échoueraient. Points 4 et 7 de la première session : pas rejoués. critique-produit n'a pas été lancé : aucune fonctionnalité nouvelle dans ces corrections, seulement des corrections dictées par les relectures (budget partagé). | — |

### Relecture juriste-btp de cette session (agent du projet, lecture du code seulement)
- Les deux générateurs impriment bien la même mention RNE, sans « RM » écrit en dur : OK.
- Nom accessible et « trace écrite » : OK. Aucune affirmation invérifiable ajoutée.
- Message hors ligne : reformulé comme le juriste l'a demandé (`27162d3`).
- Ancien champ libre `rcs` : voir la décision 5 ci-dessous (non appliqué).

### Vérifications
- `npm ci` : OK. Chrome (puppeteer) fonctionne ici.
- `npm run verifier -- --complet` sur `2cd7fc6` (toutes les corrections de code, sauf la reformulation du message hors ligne), mot pour mot :

```
Vérification « complet » de 2cd7fc6

  ✓ Tests (55.8 s) — 1231 passed (1231)
  ✓ Lint (0 erreur) (8.1 s) — 241 problems (0 errors, 241 warnings)
  ✓ Smoke (35.4 s)
  ✓ Build (33.9 s)
  ✓ Banc de migrations (6.1 s)
  ✓ Parcours (navigateur) (2291.6 s)
  ✓ Audit d’interface (386.8 s)

✓ Tout est vert — niveau « complet ».
```
- Après `2cd7fc6` : un rapport, puis le message hors ligne (`27162d3`). Le parcours `statuts (réel simulé)` est rejoué : vert, 19 vérifications. `npm run verifier` (standard) sur `1a8278f`, le dernier commit de code et de rapport, mot pour mot :

```
Vérification « standard » de 1a8278f

  ✓ Tests (53.3 s) — 1231 passed (1231)
  ✓ Lint (0 erreur) (7.3 s) — 241 problems (0 errors, 241 warnings)
  ✓ Smoke (33.4 s)
  ✓ Build (32.7 s)

✓ Tout est vert — niveau « standard ».
```
Le commit suivant n'ajoute que ce résultat au rapport.

### Décisions d'Hugo (ne pas appliquer)
1. **CGV art. 11 et médiateur** : (A) laisser les consommateurs s'abonner, désigner un médiateur (L612-1) et publier ses coordonnées (L616-1) ; ou (B) réserver l'offre aux professionnels : pas de médiateur (L611-3, 1°), mais il faut l'écrire et le contrôler à la souscription. Pour B, le juriste propose ce texte pour LegalPages.jsx:243 : « Le service est réservé aux professionnels, pour les besoins de leur activité : la médiation de la consommation ne s'applique pas aux litiges entre professionnels (article L611-3 du Code de la consommation). En cas de différend, écrivez d'abord à {COMPANY.email} pour rechercher une solution amiable. » Il faudrait alors revoir l'art. 6, qui renvoie à la rétractation. **Dans les deux cas**, la clause des lignes 236-238 est réputée non écrite (C. proc. civ. 48). Le juriste propose : « À défaut de résolution amiable dans un délai de 30 jours, la partie la plus diligente peut saisir la juridiction compétente. » Pour un consommateur, la recherche amiable ne doit pas devenir un préalable obligatoire (L612-4). Aucune option n'est recommandée par le juriste : c'est un choix commercial.
2. **Le « scroll bug » des ramoneurs** : à constater par Hugo sur son téléphone (carte « Installer » affichée). Les parcours de cette session le constatent sur cinq pages, en navigateur simulé.
3. **Document d'exemple DEV-2026-00012** : la capture « Le devis se monte par lots » et l'exemple « Signature en ligne » le montrent encore. Quelle répétition Hugo visait-il ? Recommandé : lui poser la question avant de supprimer le code gardé (défaut 14).
4. **Fusion** : rejouer `npm run verifier -- --complet` en local. Prévoir des conflits avec `cloud/franchise` et `cloud/metiers` (`DevisPage.jsx`, `Settings.jsx`, `devisHtmlBuilder.js`). Après la fusion, les deux générateurs doivent imprimer la même mention RNE, sans aucun « RM ».
5. **Ancien champ libre `rcs` contenant « RM »** (juriste-btp de cette session) : il s'imprime encore tel quel (« 123 456 789 RM 69 »). Et un artisan au RNE sans numéro, mais avec un ancien texte libre, voit « RCS <texte> ». Le juriste propose de ne plus imprimer ces anciens textes : retour `''` si `rcsType` vaut 'RM' ou si le texte contient « RM ». Il faudrait aussi inviter l'artisan à saisir son SIREN. Effet : la mention disparaît des documents concernés tant que le SIREN n'est pas saisi, donc il faut prévenir. Recommandé : appliquer, avec l'invitation dans Paramètres › Légal.
6. Les décisions 2 à 5 de la première session restent ouvertes : double inscription, date réelle de signature (le juriste la recommande : l'exemplaire doit être « daté », L221-9, et cette date fait courir L221-18 et L221-10), brouillon repassé, « Envoyé » sans envoi. La décision 1 (garder « SIREN RM département ») est tranchée par le juriste : non.

### Textes nouveaux soumis au juriste
- « Émission gardée sur cet appareil : la facture sera émise au retour du réseau, si la base l’accepte. » (texte du juriste).
- Nom accessible « Statut : <statut>. Changer le statut » ; « …ce qui en garde une trace écrite » : relus, OK.
- Les autres textes sont recopiés des corrections du juriste.

### Ce qui reste
- Relire l'arrêté du 20 juil. 2023 (conseils de ramonage sur l'attestation) avant de livrer, en local.
- Constater le pied de facture Stripe (attente 7, Hugo).
- Suites inscrites dans la feuille de route : `immat-fiche-entreprise`, `greffes-liste`.

### Risques
- `modifierEnBase` rend maintenant `'en_attente'` (une valeur vraie) au lieu de `true` pour une écriture mise en file. Aucun appelant ne teste `=== true` (vérifié par recherche), mais un futur appelant qui le ferait se tromperait.
- Un artisan qui avait saisi un département pour le RM le voit disparaître de ses documents. La mention RNE le remplace, sans migration.

### Résumé
1. Factures Stripe : la mention de franchise « doit figurer » (CGI 293 E, II), constat d'Hugo attendu (attente 7).
2. Plus aucune mention « RM » : les deux PDF impriment le n° d'inscription au RNE (C. conso. R111-2, 3°), sans département.
3. Lexique et confirmation « Signé » réécrits selon le juriste (« exemplaire signé », « certification »).
4. Hors ligne : plus de faux « Facture émise ».
5. Pastille de statut accessible ; changer de registre vide la ville.
6. Carte « Installer » constatée sur 4 pages de plus, avec contre-essai.
7. Non fait : relecture de l'arrêté ramonage (réseau fermé), à faire en local.
8. `npm run verifier -- --complet` vert sur `2cd7fc6`.
9. Six décisions pour Hugo, dont médiateur ou offre réservée aux professionnels, et anciens champs libres « RM ».
