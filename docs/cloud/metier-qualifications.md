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
