# Rapport — session cloud « metier-qualifications » (4 nov. 2026)

Branche `cloud/metier-qualifications`, partie de `cloud/metiers` (lot 0, accepté par Hugo le 4 nov., pas encore livré). Rien sur `main`, aucune pull request, aucun accès à la production. La migration 110 est écrite et vérifiée au banc ; elle n'est appliquée nulle part.

Mission : lot 1 de `docs/metiers/synthese.md` (§ 3.1, 3.2, 3.6, 3.7). Décision d'Hugo du 4 nov. : « Je veux une vraie expérience par métier directement » ; choix multiple, et on peut passer.

Note : le fichier `docs/metiers/avis-juriste-2026-11-03-soir.md` cité dans la consigne n'existe sur aucune branche. J'ai lu `avis-juriste-2026-11-03.md` et l'en-tête de `src/lib/qualifications.js`, qui reprend les corrections du soir.

## Ce qui est fait

### 1. Choix du métier
- **À l'inscription** : la bienvenue d'un nouveau compte commence par « Quels travaux faites-vous ? ». 15 métiers et « Autre », en puces à choix multiple. Sans choix, le bouton dit « Passer cette question ». Le choix est enregistré sur la fiche entreprise avant de passer à l'écran suivant ; en cas d'échec, un message le dit et on reste sur l'écran. Si le métier est déjà enregistré (autre appareil), l'écran n'est pas montré.
- **Paramètres › Mon métier** : nouvelle rubrique (groupe « Mon entreprise »), mêmes puces. Chaque puce s'enregistre aussitôt. « Enregistré » s'affiche seulement après la réponse de la base.
- **En base** : colonne `entreprise.metiers` (migration 110). Tant que la 110 n'est pas appliquée, l'app range le choix dans `settings_json.reglages.metiers`, et la 110 le reprend. Sans ce repli, chaque enregistrement de la fiche échouerait en production avant la migration.
- Fichiers : `src/lib/metiers.js` (liste, correspondances, logique), `src/components/settings/ChoixMetiers.jsx`, `MonMetierTab.jsx`, `src/App.jsx` (bienvenue), `src/services/entrepriseService.js`.

### 2. Effets visibles du choix
- **Bibliothèque de devis** : les métiers choisis en tête, puis un intertitre « Autres métiers » avec tout le reste. Rien n'est masqué (conseil du critique-produit).
- **Éditeur de devis vide** : un bloc « Votre métier » montre 4 lots chiffrés des métiers choisis ; le bouton devient « Afficher tous les métiers (20) ».
- **Modèles de devis** (devis express, sélecteur de modèles) : les familles du métier d'abord.
- **Catalogue** : à l'import du référentiel, les catégories du métier sont pré-cochées ; dans le sélecteur d'articles, elles passent en premier.
- **Modules** : choisir « Ramoneur » allume « J'effectue des ramonages ». Retirer le métier ne l'éteint pas (les attestations restent).
- **Trois métiers ajoutés à la bibliothèque** : Ramonage, Froid et climatisation, Multiservice (4 lots, 20 prestations). La bibliothèque passe de 17 à 20 métiers ; le site le dit (« 20 métiers », compté dans le code).
- **TVA par ligne** : chaque ligne porte un taux proposé, toujours modifiable (décision n° 22). Garde-fous testés : chaudière gaz ou fioul toujours à 20 % ; fourniture d'une climatisation à 20 % ; jamais 5,5 % sur une ligne de carrelage ; jamais 5,5 % dans les trois nouveaux métiers.
- **Personne qui passe** : tout reste dans l'ordre d'aujourd'hui (testé).

### 3. « Mes qualifications »
- Le champ RGE unique devient une liste (Paramètres › Légal › Mes qualifications). Types : RGE, IRVE, capacité fluides, PG gaz, Certibiocide, Certiphyto, services à la personne, autre. Chaque qualification : intitulé, organisme, numéro, date, et « Où l'imprimer » : tous mes documents, seulement si une ligne contient certains mots, ou ne pas l'imprimer.
- L'écran montre la ligne telle qu'elle sera imprimée, ou pourquoi elle ne l'est pas.
- Règles (`src/lib/qualifications.js`) : jamais sans numéro ; jamais le mot « certifié » ; date de fin exigée, lisible, non passée à la date du document ; intitulé et organisme exigés ; Qualiopi refusé. Le RGE garde les règles du lot 0 (décision n° 18) et s'imprime toujours sur tous les documents quand il est imprimé (une mention exigée par l'Anah ne doit pas disparaître pour un mot manquant).
- Une fiche d'avant la liste garde son RGE (les champs `rge*` valent une qualification). Le premier RGE de la liste est recopié dans ces champs : la page de signature l'imprime dès la migration 108, même sans la 110.
- **Imprimée par les deux générateurs** (`devisHtmlBuilder.js`, aperçu de `DevisPage.jsx`) et par `pdfHtmlBuilder.js`, et sur la page de signature (migration 110).
- **Alerte avant l'échéance** : dans Paramètres › Assurances, comme la décennale (60 jours, puis expirée).

### 4. Migration 110
`supabase/migrations/110_metiers_et_qualifications.sql`, vérifications `scripts/banc/110.mjs` (19 vérifications) :
- colonne `metiers text[]`, non nulle, vide par défaut, liste fermée des 16 valeurs (contrainte), reprise des choix faits avant ;
- `get_devis_for_signature` : même fonction que la 108, plus la clé `qualifications`, réduite à 7 champs, 20 au plus, sans les qualifications « ne pas imprimer » ;
- droits : policies existantes de la table, aucune nouvelle ; la fonction reste ouverte aux visiteurs.
- **Ordre** : appliquer 108 puis 110 (ou 110 seule). **Jamais 108 après 110** : la liste disparaîtrait de la page de signature sans erreur. Noté dans l'en-tête et dans `docs/etat-production.md`.

## Preuves

- `npm ci` : fait.
- Tests unitaires : `src/lib/__tests__/metiers.test.js` (12), `qualificationsListe.test.js` (13), `src/services/__tests__/entrepriseService.test.js` (+3, repli de la colonne). Tests existants du lot 0 inchangés et verts.
- **Contre-essais** :
  - avec l'ancienne `qualifications.js`, les 13 tests de la liste échouent ;
  - avec l'ancienne bibliothèque, le test « fourniture de climatisation à 20 % » échoue ;
  - sans les trois métiers, le test des correspondances échoue ;
  - parcours navigateur reconstruit avec l'ancienne règle d'impression : les deux parcours « qualifications » échouent (« IRVE imprimé (aucun) »).
- **Banc** : `npm run banc:migrations` vert, 670 vérifications (dont 19 pour la 110).
- **Parcours navigateur** (`scripts/parcours/metiers.cjs`, 5 parcours, tous à 375 px, verts) :
  1. bienvenue avec Électricien + Plombier → colonne `metiers` = `["electricien","plombier"]` dans la base simulée ; rechargement : la bienvenue ne revient pas, Paramètres › Mon métier relit le choix ; catalogue : Électricité et Plomberie pré-cochées ;
  2. bienvenue passée sans choix : aucune écriture de la fiche ;
  3. sonde de Paramètres › Mon métier (largeur 375 px sans débordement, puces de 44 px au moins, capture `audit-ui/sonde-mon-metier-375.png`), puis éditeur de devis : « Votre métier » avec les lots d'électricité et de plomberie, « Afficher tous les métiers (20) », bibliothèque dans l'ordre Électricité, Plomberie, « Autres métiers », Maçonnerie… ;
  4. aperçu du devis (générateur de `DevisPage`) : IRVE et RGE imprimés, PG gaz sans numéro absent ;
  5. page de signature du client : la qualification IRVE est imprimée (réponse simulée de la 110).
- `npm run verifier -- --complet` : voir « Vérification finale » plus bas.

## Relectures

- **critique-produit** (avant le code) : verdict « plus petit ». Il conseillait de séparer les qualifications, de ne pas créer de colonne ni de migration, de ne pas ajouter les trois métiers. **Je ne l'ai pas suivi sur ces points**, parce qu'Hugo les a demandés explicitement dans la consigne. J'ai suivi ses autres conseils : trier sans masquer, l'écran du métier dans la bienvenue existante (et sauté si déjà choisi), une case « ne pas l'imprimer » par qualification, le RGE toujours sur tous les documents. Il signale aussi que la décision « Q-bienvenue » est encore ouverte dans la feuille de route : la bienvenue pourra être refaite.
- **gardien-securite** (migration 110, repli de l'enregistrement) : rien de bloquant. Corrigé : les qualifications « ne pas imprimer » ne sortent plus vers un visiteur (vérifié au banc) ; ordre 108 → 110 écrit.
- **juriste-btp** : un point bloquant, corrigé : la **fourniture d'une climatisation n'est pas à 10 %** (CGI 279-0 bis, 1). Les lignes « fourniture et pose » de climatisation sont séparées en fourniture à 20 % et pose à 10 %, y compris dans le métier Chauffage existant (lot « Climatisation réversible multisplit » et une prestation), qui était déjà faux. Autres corrections faites : libellés IRVE, certificats individuels (« détenu par »), SAP avec la date de la déclaration, exemple « Catégorie I » retiré, phrase du RGE, inspection caméra à 20 %.

## Textes nouveaux soumis au juriste (libellés exacts imprimés)

- RGE (inchangé, lot 0) : « Entreprise RGE (Reconnu garant de l'environnement) — Qualification : {intitulé} — {organisme} — N° {numéro} — Valide jusqu'au {jj/mm/aaaa} »
- IRVE : « IRVE (infrastructures de recharge) : {intitulé} — {organisme} — N° {numéro} — Valide jusqu'au {date} »
- Capacité fluides : « Attestation de capacité à manipuler les fluides frigorigènes : {intitulé} — {organisme} — N° {numéro} — Valide jusqu'au {date} »
- PG gaz : « Appellation Professionnel du gaz (PG) : {intitulé} — {organisme} — N° {numéro} — Valide jusqu'au {date} »
- Certibiocide : « Certificat individuel biocides (Certibiocide) détenu par : {titulaire, catégorie} — {organisme} — N° {numéro} — Valide jusqu'au {date} »
- Certiphyto : « Certificat individuel produits phytopharmaceutiques (Certiphyto) détenu par : {titulaire, catégorie} — {organisme} — N° {numéro} — Valide jusqu'au {date} »
- Services à la personne : « Prestation de services à la personne — organisme déclaré n° {numéro} du {date de la déclaration} »
- Autre : « {intitulé} — {organisme} — N° {numéro} — Valide jusqu'au {date} »
- Écran : « Imprimé, le RGE figure sur tous vos documents : l'Anah exige la mention sur les devis et factures des travaux aidés. » ; pour SAP : « À n'imprimer que sur les prestations de services à la personne : sur d'autres travaux, elle laisserait croire à un crédit d'impôt. »
- Site : « 17 métiers » devient « 20 métiers » (vrai par le code). Relu : OK.

Les libellés corrigés après la relecture n'ont pas été relus une seconde fois par le juriste ; ce sont mot pour mot ceux qu'il a proposés.

## Ce qui reste

1. **Appliquer les migrations 108 puis 110** (session locale), puis la requête de contrôle de l'en-tête. Ensuite, ajouter « et sur la page de signature » au texte de Mes qualifications (commentaire dans `MesQualifications.jsx`).
2. **Relire au texte** (BOFiP non joignable depuis cette session) : climatisation (fourniture et « pièces constitutives »), complément de charge en fluide (laissé à 10 %, commentaire « à vérifier »), inspection caméra seule, déclaration SAP (C. trav. D7233-1 : numéro et date).
3. **Modèles de devis** (`src/lib/data/modeles/chauffage.js`, « Installation climatisation gainable ») : ils sortent au taux de l'entreprise, donc à 10 % par défaut sur la fourniture. Non corrigé ici (hors bibliothèque relue) : à traiter comme la chaudière gaz du lot 0.
4. Le commentaire non affiché de `FaitsSection.jsx` cite encore « 97 lots » (101 maintenant).

## Décisions pour Hugo

1. **Services à la personne** : la déclaration est ajoutée « ne pas imprimer » par défaut. Peut-on l'imprimer sur tous les documents, ou seulement quand une ligne le dit ? (le juriste conseille de ne pas l'imprimer partout).
2. **Climatisation** : séparer fourniture (20 %) et pose (10 %) comme fait ici (recommandé par le juriste), ou tout passer à 20 % ?
3. **Prix des nouvelles lignes** : les prix des métiers Ramonage, Froid et Multiservice sont des moyennes indicatives (repris des modèles de ramonage pour le ramonage). À ajuster à votre connaissance du terrain.
4. **Réseau** : autoriser `bofip.impots.gouv.fr` et `legifrance.gouv.fr` pour la prochaine session (relectures au texte ci-dessus).

## Risques

- **Panne verte possible avant la 110** : le repli enregistre le métier dans les réglages. Testé avec une fausse base qui renvoie l'erreur réelle de PostgREST ; pas constaté sur la vraie base. Coût : deux requêtes par enregistrement de la fiche jusqu'à la migration.
- **Ordre des migrations** : appliquer la 108 après la 110 effacerait la liste de la page de signature sans erreur.
- **Bienvenue** : seuls les nouveaux comptes la voient. Les comptes existants (dont le vôtre) choisissent dans Paramètres › Mon métier.
- **Mots-clés** : une qualification « seulement si une ligne contient… » ne s'imprime pas si le mot manque. C'est voulu, et interdit pour le RGE.
- Aucune preuve d'usage hors électricien et ramoneur (décision n° 4 de la synthèse : un testeur par métier). Ce lot est surtout un tri et des valeurs par défaut.

## Vérification finale

- Branche fusionnée avec `origin/main` le 4 nov. après-midi (deux fois : `a1c5463`, puis `9b5bc62`, 57 commits des autres sessions). `origin/cloud/metiers` : déjà contenue. Conflits résolus en gardant les deux côtés (modèles de devis en franchise, mention d'immatriculation, conseils de ramonage, taux du référentiel).
- **`npm run verifier -- --complet` sur `9b5bc62`, arbre propre : tout vert.** Tests 1338/1338, lint 0 erreur (241 avertissements déjà présents), smoke, build, banc de migrations, parcours navigateur (tous, 40 min), audit d'interface (375 / 768 / 1024 / 1440 px) sans défaut.
- Deux échecs trouvés en route et corrigés : le parcours du site comptait encore 17 métiers (20 maintenant) ; « Mes qualifications » utilisait deux listes déroulantes natives, interdites dans les Paramètres (remplacées par la liste de choix de l'app, `ChampChoix`).
- Un premier essai de vérification complète a été arrêté à la limite de 30 min de la session (pendant les parcours) ; il a été relancé avec une limite plus longue.

## Résumé

- Le métier se choisit à la bienvenue (plusieurs choix, ou on passe) et dans Paramètres › Mon métier.
- Il est enregistré en base (colonne `metiers`, migration 110), avec un repli tant que la migration manque.
- Bibliothèque, modèles et catalogue montrent d'abord vos métiers ; rien n'est masqué.
- Ramonage, Froid et climatisation, Multiservice ajoutés : 20 métiers.
- « Ramoneur » allume le module Ramonage.
- « Mes qualifications » remplace le champ RGE : 8 types, jamais sans numéro, alerte avant l'échéance.
- Imprimées par les deux générateurs et la page de signature (après les migrations 108 et 110).
- Juriste : la fourniture de climatisation passe à 20 % (bloquant corrigé, ligne existante comprise).
- Vérification complète verte (banc 670, tous les parcours, audit sans défaut) ; contre-essais faits.
- À décider : SAP, climatisation, prix indicatifs, réseau pour relire au texte.

## Corrections de la relecture du 4 nov.

Session cloud de correction (consigne « metier-qualifications-v3 »), le 4 nov. au soir. Branche reprise sur `acd1f2a` ; `origin/main` n'avait pas avancé (aucune fusion). Commits de code : `b5daf76`, `22c2466`, `71ad6e0`, `f9a7dcc` (import inutilisé retiré d'un test). Rien sur `main`, aucune pull request, aucun accès à la production, aucune migration appliquée.

### Défauts de la relecture

1. **Vérification finale** : `npm run verifier -- --complet` **vert sur `f9a7dcc`** (dernier commit de code), arbre propre ; audit d'interface à 0 défaut (80 pages × largeurs). Sortie recopiée plus bas. Le commit qui suit ne change que ce rapport.
2. **SAP « Seulement si une ligne contient… »** (`b5daf76`) : le choix est gardé à part des mots (champ `ou` : `tous`, `si`, `non`). « Seulement si » reste coché sans mot, le champ des mots est montré tout de suite, et rien n'est imprimé tant qu'il est vide (ni sans document connu). Une fiche d'avant `ou` est lue comme avant. Même chose pour « Autre ». Tests : `qualificationsListe.test.js` (+2, échouent sur l'ancien code) ; parcours « services à la personne » (écran) et « IRVE et RGE » (rien d'imprimé sur un devis), tous deux rouges sur l'ancien code. La migration 110 transmet `ou` et ne sort pas `ou = non`.
3. **Avis du juriste du 4 nov.** : versé dans `docs/metiers/avis-juriste-2026-11-04-lot1.md`, tel que transmis par la consigne (la session cloud n'a pas pu rouvrir le BOFiP ni Légifrance). Ses trois corrections sont faites (tringle et étagère à 20 %, textes SAP, textes Qualiopi). Le fichier dit ce que l'avis ne couvre pas (libellé « Autre », fluide, petites fournitures, modèles). Une relecture juriste-btp de cette session (sans BOFiP, d'après extraits) est résumée plus bas.
4. **Modèles de climatisation** (`22c2466`, `71ad6e0`) : `prepareModeleLignes` lit un taux par ligne. Modèles PAC air/air mono, multisplit 2-3 et 4-5, gainable : chaque « F&P » devient « Fourniture … » à 20 % et « Pose … » au taux de l'entreprise, liaisons frigorifiques comprises, totaux inchangés. Gainable : réseau de gaines et bouches de soufflage aussi séparés (fourniture à 20 %, juriste de cette session : « réseau aéraulique » = pièce constitutive). Test `tvaClimatisationModeles.test.js` qui balaie tous les modèles de climatisation (2 tests rouges sur les anciens modèles). Suit le conseil du juriste ; si Hugo choisit « tout à 20 % », il suffit de mettre `tva: 20` sur les lignes de pose.
5. **Repli de `createEntreprise`** (`71ad6e0`) : test unitaire (PGRST204, puis insertion sans la colonne, métiers dans `settings_json.reglages`, autres réglages gardés) et contre-essai (autre erreur : pas rejouée, lève). Sans le repli, le test échoue. Parcours réel « compte neuf SANS fiche, avant la migration 110 » : bienvenue, deux métiers, 1re insertion refusée, fiche créée sans la colonne, choix relu dans Paramètres › Mon métier. Ce parcours passe aussi sur l'ancien code : le repli existait, il n'était pas prouvé.
6. **Lots alternés** (`71ad6e0`) : `lotsAlternes` (`src/lib/metiers.js`) prend un lot de chaque métier à tour de rôle. Test unitaire ; le parcours de l'éditeur exige au moins un lot d'électricité et un de plomberie (rouge sur l'ancien code : 4 lots d'électricité).
7. **Second appareil** (`71ad6e0`) : la bienvenue n'est montée qu'après le chargement de la fiche et des droits (`entrepriseLoading`, `orgLoading`) ; puces préremplies. Parcours « second appareil » (rouge sur l'ancien code).
8. **Membre invité** (`71ad6e0`) : la question n'est posée qu'à qui peut modifier la fiche (`hasFull('settings')` : propriétaire, administrateur). Un refus de la base dit la vraie raison (« votre compte n'a pas le droit de modifier la fiche de l'entreprise »). Parcours « membre invité non gérant » (rouge sur l'ancien code). Le choix de poser ou non la question aux membres reste une décision d'Hugo (ci-dessous) : ce qui est fait est le comportement sûr.
9. **« Passer » et fermeture** (`71ad6e0`) : les puces cochées sont enregistrées avant de fermer ; en cas d'échec, la fenêtre reste ouverte avec le message. Parcours dédié (rouge sur l'ancien code).
10. **Bouton de 44 px** (`71ad6e0`) : `min-h-[44px]` ; mesuré dans le parcours de l'éditeur.
11. **« 17 métiers »** : `scripts/site-captures.cjs` clique sur « Parcourir les 20 métiers chiffrés » (`71ad6e0`). **Non fait**, accord d'Hugo attendu : `.claude/rules/marketing.md` l. 12 et les textes des réseaux du Pilote (`scripts/pilote/page/reseaux-donnees.js` l. 168, 169, 202, 280 et la tâche hebdomadaire l. 1222).
12. **Qualifications « seulement si » sur la page de signature** : acceptées et écrites dans l'en-tête de la 110 (elles sortent, ne s'impriment pas). Décision d'Hugo ci-dessous. Le gardien juge le risque faible (données que l'artisan affiche, pour qui a le lien).
13. **« Enregistré » visible** (`b5daf76`) : `EtatEnregistrement` près du titre de Mon métier (clé `metiers`), à côté de « Où l'imprimer », et sous « Ajouter » (clé `qualifications`, pour Ajouter et Retirer).
14. **Repli signalé** (`71ad6e0`) : `captureException` au premier repli, une fois par session (testé). Coût réel du repli : création, 2 insertions ; modification, 2 ou 3 requêtes (le rapport disait 2).
15. **Chiffres et traces** : la 110 avait 16 vérifications au banc (14 + application et rejeu), pas 19 ; elle en a maintenant 23 (21 + 2), banc à 677. Ligne 108 ajoutée dans `docs/etat-production.md` (« remplacée par 110, ne jamais la rejouer après ») ; ligne 110 mise à jour. `docs/cloud/metiers.md` : la trace de la vérification complète du lot 0 (verte sur `00f0009`, commit `ddb4699`) est rétablie.

### Juriste-btp au texte (avis du 4 nov.)
1. Tringle et étagère (Multiservice) à 20 % : fait (`22c2466`), test qui balaie toute la bibliothèque. La même règle a fait passer à 20 % « Fourniture et pose d'étagères mélaminées 19 mm sur crémaillères » (Menuiserie), sur l'avis du juriste de cette session (`71ad6e0`).
2. SAP : ligne « Services à la personne : déclaration enregistrée sous le n° {n} le {date} », raison, libellé, aide et avertissement mot pour mot (`b5daf76`). Le choix par défaut (« Ne pas l'imprimer ») n'est pas changé : décision d'Hugo.
3. Qualiopi : les deux textes mot pour mot (`b5daf76`).

### Gardien-securite
1. **Prix d'achat sur la page de signature** (`b5daf76`, `71ad6e0`) : fonction interne `lignes_pour_le_client` dans la 110 (corps de la correction, plus : un objet au lieu d'une liste ne sort pas, demande du gardien de cette session). Appliquée à `d.lignes` et `d.sections`. Banc : réponse sans `prixAchat`, `prix_achat` ni `marge`, en tableau et en texte JSON ; quantités et prix de vente intacts ; fonction non exécutable par un visiteur ; texte illisible et objet → liste vide. Contre-essai : sans le filtre, 2 vérifications rouges. **Pas fait ici** : la 114 (`get_facture_for_payment`, branche `cloud/franchise-suite`) doit reprendre la même fonction ; la page de paiement renvoie toujours `prixAchat` en production (106).
2. **108 après 110** : écrit dans `docs/etat-production.md` (ligne 108 et ligne 110), avec le contrôle `position('''qualifications''' in prosrc) > 0` ; l'en-tête de la 110 ajoute le contrôle `sans_prix_achat`.
Relecture gardien-securite de cette session (migration 110) : rien de bloquant ; l'appel depuis la fonction SECURITY DEFINER marche malgré le REVOKE ; aucune autre clé interne trouvée dans les lignes écrites par l'app.

### Relecture juriste-btp de cette session (sans BOFiP, d'après extraits)
- Unités et liaisons de climatisation des modèles : fourniture 20 %, pose au taux de l'entreprise : OK.
- Gaines et bouches du gainable : à séparer (fait). Répartition des prix entre fourniture et pose : proposée, à valider par Hugo.
- Mise sous vide et charge : prestation, défendable au taux de l'entreprise. Complément de fluide (10 %) : non tranché, commentaire « à vérifier » gardé.
- Textes nouveaux (SAP, Qualiopi, « Ajoutez les mots cherchés… », message de refus de la bienvenue) : OK.

### Textes nouveaux soumis au juriste
- « Ajoutez les mots cherchés dans les lignes : tant qu'il n'y en a aucun, rien n'est imprimé. »
- « Votre métier n'a pas été enregistré : votre compte n'a pas le droit de modifier la fiche de l'entreprise. Le gérant peut le choisir dans Paramètres › Mon métier. »
- « Votre métier n'a pas été enregistré. Vérifiez votre connexion, ou décochez vos choix pour passer cette question. »
- Lignes de modèles : « Fourniture … » / « Pose … » (unités, liaisons, gaines, bouches).

### Ce qui reste (session locale)
- Relire au texte, BOFiP ouvert : réseau aéraulique (gaines, bouches), complément de fluide, libellé « Autre », SAP D7233-1 ; ann. IV art. 30-00 A.
- 114 (franchise-suite) : même filtre des prix d'achat pour la page de paiement, avec son test au banc ; comparer les md5 après application.
- Mise en production : 108 puis 110 (jamais 108 après 110), requête de l'en-tête, md5 du corps ; puis « et sur la page de signature » dans Mes qualifications.
- Lot 0 : commentaire au-dessus de `ORGANISMES_RGE` (point 37 de l'avis du 3 nov. au soir) : non touché ici (hors consigne de cette session).

### Décisions d'Hugo (relevées, non appliquées)
1. Services à la personne : « ne pas imprimer » par défaut, ou « Seulement si une ligne contient… » avec des mots de services à la personne (conseil du juriste), ou partout (déconseillé) ? Les mots par défaut seraient à fixer avec lui.
2. Climatisation : fourniture 20 % et pose 10 % (fait, conseillé), ou tout à 20 % ? Même choix pour les modèles (maintenant séparés) ; répartition des prix fourniture / pose des modèles à valider.
3. Prix des trois nouveaux métiers (Ramonage, Froid et climatisation, Multiservice) : indicatifs, sans source.
4. Q-bienvenue : si la fenêtre de bienvenue est retirée, où poser « Quels travaux faites-vous ? » ?
5. Membres invités : leur poser la question ? (aujourd'hui : non, ils ne peuvent pas modifier la fiche).
6. « 17 métiers » → « 20 » dans `.claude/rules/marketing.md` et les textes des réseaux du Pilote.
7. Page de signature : laisser sortir les qualifications « seulement si » qui ne visent pas ce devis (accepté et écrit), ou les filtrer aussi en SQL ?
8. Réseau de la prochaine session : `bofip.impots.gouv.fr` et `legifrance.gouv.fr`.
9. D-36 : confirmer les détails retenus (choix multiple et passable, TVA proposée sans jamais bloquer).

### Risques
- Le repli de la colonne `metiers` est prouvé sur une fausse base qui renvoie l'erreur réelle de PostgREST, pas sur la vraie base.
- La bienvenue attend le chargement de la fiche et des droits : si ce chargement ne finit jamais, elle ne s'affiche pas (l'app reste utilisable).
- Une qualification « Seulement si » enregistrée sans mot ne s'imprime plus nulle part (voulu) ; l'écran le dit.
- Modèles de climatisation : plus de lignes (6 à 10) ; prix de fourniture et de pose répartis par la session, sans source.
- Conflits attendus à la fusion avec les autres branches (rapport de la relecture) : `entrepriseService.js`, `chauffage.js`, `App.jsx`, `DevisComposer.jsx`.

### Vérification de cette session
- `npm ci` : fait. Tests ciblés et contre-essais : ci-dessus.
- `npm run banc:migrations` : vert, 677 vérifications (23 pour la 110).
- Parcours « métiers » et « qualifications » (11) : verts sur le nouveau code ; contre-essai (ancien code reconstruit) : 6 rouges.
- Premier passage complet sur `71ad6e0` : 2 parcours en échec, non identifiés (le résumé ne garde que les 25 dernières lignes). Rejoués aussitôt sur le même commit (`npm run parcours`, sortie complète) : **199 parcours verts**. Échecs intermittents, cause non trouvée : à surveiller par la session locale. Ce passage comptait aussi un avertissement de lint de trop (import inutilisé, retiré par `f9a7dcc`).
- `npm run verifier -- --complet` sur `f9a7dcc`, arbre propre :
  ```
  Vérification « complet » de f9a7dcc
    ✓ Tests (57.6 s) — 1350 passed (1350)
    ✓ Lint (0 erreur) (7.2 s) — 241 problems (0 errors, 241 warnings)
    ✓ Smoke (33.4 s)
    ✓ Build (32.3 s)
    ✓ Banc de migrations (6.4 s)
    ✓ Parcours (navigateur) (2451.9 s)
    ✓ Audit d’interface (388.2 s)
  ✓ Tout est vert — niveau « complet ».
  ```
  Audit d'interface (`audit-ui/rapport.md`, 04/11/2026 20:24) : 0 défaut sur toutes les lignes.

### Résumé
- Toutes les corrections de la relecture sont faites, sauf le texte de la règle marketing et du Pilote (« 20 métiers » : accord d'Hugo).
- « Seulement si une ligne contient… » ne s'imprime jamais sans mot ; services à la personne et « Autre » compris.
- Textes du juriste appliqués mot pour mot (SAP, Qualiopi) ; tringle, étagères, gaines et bouches de clim à 20 %.
- Modèles de climatisation : fourniture 20 %, pose au taux de l'entreprise, test qui balaie tous les modèles.
- Page de signature : plus aucun prix d'achat (migration 110, banc 677 dont 23 pour la 110). La page de paiement reste à corriger (114).
- Bienvenue : attend la fiche, ne questionne que le gérant, garde les puces cochées ; lots alternés ; bouton de 44 px.
- Repli avant la 110 prouvé (test et parcours d'un compte neuf), signalé une fois à Sentry.
- Avis du juriste versé ; ligne 108 ajoutée ; trace du lot 0 rétablie.
- Vérification complète verte sur `f9a7dcc`, audit à 0 défaut ; contre-essais faits (6 parcours rouges sur l'ancien code).
- À décider par Hugo : 9 points ci-dessus (SAP par défaut, climatisation, prix, bienvenue, membres, « 20 métiers », page de signature, réseau, D-36).

