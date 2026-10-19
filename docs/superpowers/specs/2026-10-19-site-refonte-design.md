# Refonte du site public — conception

19 oct. 2026. Demande d'Hugo : « une grosse repasse sur le site avec la nouvelle charte, et le rendre beaucoup plus attrayant ». Hugo a validé la charte « Nuit et orange » le même jour et a demandé d'avancer sans autre question : les choix ci-dessous marqués **(choix de Claude)** sont à relire.

## Intention

Le site (`mallettico.fr`, `src/components/landing/`) est le premier contact d'un artisan avec Mallettico. Aujourd'hui il ressemble à une page de start-up générique : bulles de couleur flottantes, dégradés, compteurs animés (« 100 % »), titre interchangeable (« Pilotez vos chantiers, boostez votre rentabilité sans effort »), huit blocs de fonctionnalités, captures de l'ancienne interface. Le brief de marque dit exactement l'inverse : fiable, simple, fait pour le terrain ; pas de dégradé bleu-violet, pas de mascotte, pas d'anglicisme ; « Je construis en public le logiciel que les artisans méritent ».

Le nouveau site doit faire comprendre en un écran ce qu'est Mallettico, montrer l'application réelle avec la nouvelle charte, raconter le cycle devis → signature → facture → relance → paiement, mettre en avant la fiabilité (ce qui le distingue), et rester rigoureusement honnête.

**Pour qui** : un artisan du bâtiment, 30 à 55 ans, souvent seul, qui découvre le site sur son téléphone, se méfie des logiciels chers et compliqués, et n'a pas de temps.

## Objectifs

- Premier écran (téléphone 375 px comme ordinateur 1440 px) : ce que c'est, pour qui, « gratuit pour commencer », deux actions (créer un compte, voir la démo), l'application réelle.
- Les vraies captures de l'application, avec la nouvelle charte, nettes sur écran haute densité.
- Une page plus courte et plus forte : 8 sections au lieu de 11.
- Accessibilité : contrastes ≥ 4,5:1 pour tout texte, focus visible, un seul `h1`, textes alternatifs en français, animations coupées si l'appareil demande moins de mouvement.

## Non-objectifs

- Aucune fonctionnalité nouvelle dans l'application ; aucun changement de l'application hors du site.
- Pas de blog, pas de vidéo, pas de témoignages (il n'y en a pas de vrais).
- Pages `/fonctionnalites`, `/fonctionnalites/:slug`, `/ressources` : mêmes contenus, seulement la nouvelle charte et les corrections d'honnêteté.

## Anti-objectifs (échec même si « ça marche »)

- Toute affirmation invérifiable : avis, statistiques d'usage, « conforme », « certifié », « toutes les mentions obligatoires », « archivage 10 ans », « SHA-256 », « EN 16931 », « conforme RGPD », « données hébergées en France » (règle `.claude/rules/marketing.md`).
- Toute mention de l'IA ou de la dictée vocale (`FONCTIONS.ia = false`).
- Toute fonction éteinte présentée comme disponible : paiement en ligne des factures, portail client, réception de chantier, factures de situation (`src/lib/fonctions.js`).
- Bulles flottantes, dégradés bleu-violet, compteurs animés, texte noir sur orange, mots anglais.
- Un parcours existant cassé : la barre de navigation garde un bouton au texte exact « Connexion » (cliqué par `scripts/parcours/reel.cjs`), les sections gardent les ancres `#pricing` et `#faq` (`src/lib/sectionsAccueil.js`).

## Contraintes

- Pile existante : React 18, Tailwind 3.4, `framer-motion` (déjà installé), `lucide-react`. Aucune dépendance nouvelle.
- Le site est toujours en clair (il n'utilise pas les jetons de thème, qui suivent le mode sombre de l'app) : couleurs **fixes** dans une palette Tailwind `marque` :
  - `marque-nuit` `#12336F` (bleu nuit du logo, fonds de bandeaux), `marque-nuit-fonce` `#0B2350` (pied de page, survol) ;
  - `marque-orange` `#C2410C` (actions, texte blanc 5,2:1), `marque-orange-fonce` `#9A3412` (survol, texte orange sur fond clair 7,3:1) ;
  - `marque-orange-clair` `#FDBA74` (libellés sur bleu nuit, 7,2:1) ;
  - neutres : `slate` de Tailwind (texte `slate-900`, secondaire `slate-600`, fonds `white` / `slate-50`).
- Police Inter (déjà servie par l'app).
- Prix : lus dans `PLANS` de `src/stores/subscriptionStore.js` (aujourd'hui recopiés en dur dans `PricingSection.jsx` : à corriger).
- Images : WebP, dimensions explicites (`width`/`height`), `loading="lazy"` sauf le premier écran (`fetchpriority="high"`).

## Structure de la page d'accueil

1. **Barre de navigation** (fixe, blanche, ombre légère au défilement) : logo + « Mallettico » ; liens « Fonctionnalités » (`#fonctionnalites`), « Tarifs » (`#pricing`), « FAQ » (`#faq`) ; bouton texte « Connexion » ; bouton orange « Créer mon compte ». Au téléphone : logo, « Connexion », menu.
2. **Premier écran**, fond bleu nuit uni, texte blanc :
   - surtitre (orange clair) : « Devis · Factures · Relances » ;
   - `h1` : « L'administratif du chantier, rangé dans une mallette. » ;
   - texte : « Le devis se monte à partir de prestations déjà chiffrées, le client le signe en ligne, il devient une facture sans rien ressaisir, et Mallettico suit les paiements. Sur téléphone comme sur ordinateur. » ;
   - boutons : « Créer mon compte gratuit » (orange) et « Voir la démo » (contour blanc, lien `/?demo=true`) ;
   - ligne de réassurance (blanc à 80 %) : « Gratuit pour commencer, sans carte bancaire · Base de données hébergée à Paris » ;
   - visuel : capture ordinateur (devis par lots) dans un cadre de navigateur, capture téléphone (accueil) qui la chevauche. **(choix de Claude)**
3. **Bande de faits** (fond blanc, quatre faits sans animation) : « 1 000+ prestations et ouvrages déjà chiffrés » · « 17 métiers » · « Sur téléphone et ordinateur » · « Gratuit pour commencer ».
4. **Le cycle** (`id="fonctionnalites"`), titre « Du devis au paiement, sans rien ressaisir. » ; quatre étapes numérotées, chacune une capture, un titre, deux phrases et un lien « En savoir plus » vers sa page :
   1. « Montez le devis » — « Partez d'un modèle parmi 17 métiers ou de plus de 1 000 prestations déjà chiffrées, ajustez, regroupez par lots. Le total se calcule pendant que vous tapez. » → `/fonctionnalites/devis-factures`
   2. « Faites-le signer » — « Votre client reçoit le devis par e-mail et le signe en ligne, au doigt, sans créer de compte. Le devis passe en « Signé » tout seul. » → `/fonctionnalites/signature-electronique`
   3. « Facturez » — « Un devis signé devient une facture d'acompte ou de solde, sans rien ressaisir. Les mentions légales du bâtiment s'ajoutent toutes seules. » → `/fonctionnalites/devis-factures`
   4. « Relancez et encaissez » — « Les relances partent au rythme que vous choisissez. Chaque paiement est noté, même partiel : vous voyez ce qui reste à recevoir. » → `/fonctionnalites/relances`
5. **Fiabilité**, bande bleu nuit, titre « Une facture, ça ne se bricole pas. », texte « Les règles importantes ne dépendent pas de l'écran : la base de données les fait respecter elle-même. » ; quatre garanties :
   - « Des numéros qui se suivent, sans trou » ;
   - « Une facture envoyée ne se supprime pas : on la corrige par un avoir » ;
   - « Une facture n'est « payée » que si les paiements la soldent » ;
   - « Assurance décennale, TVA réduite, pénalités de retard : les mentions s'ajoutent toutes seules ».
6. **Fait pour le chantier**, trois captures téléphone (accueil, devis par lots, facture) et quatre points : « Des boutons faciles à toucher », « Lisible en plein soleil », « Un mode sombre pour le soir », « S'installe sur l'écran d'accueil du téléphone ».
7. **Tarifs** (`id="pricing"`) : les trois plans de `PLANS`, prix HT par mois, « tarif fondateur » tel qu'affiché aujourd'hui ; le tableau de comparaison reste, sous un bouton « Comparer les plans en détail » (replié par défaut). **(choix de Claude)**
8. **Construit en public** (contenu de `EarlyAdoptersSection`, nouvelle charte) : « Pas de faux avis ici. Les avis viendront des artisans qui utilisent Mallettico, avec leur accord. »
9. **FAQ** (`id="faq"`) : questions actuelles, réponses relues pour l'honnêteté (Factur-X, intégrations, support : ne garder que ce qui existe).
10. **Dernier appel**, bande bleu nuit : « Votre prochain devis, ce soir, en quelques minutes. » ; bouton « Créer mon compte gratuit ». Ligne en dessous : « Mallettico — tout y est, rien ne pèse. »
11. **Pied de page** bleu nuit foncé, liens actuels.

Sections retirées de la page : `StatsBar`, `QuickFeaturesGrid`, `CtaBanner`, `FeatureShowcase` (fichiers gardés tant que d'autres pages les importent ; sinon retirés de l'accueil seulement).

## Mouvement

Apparition douce des sections au défilement (fondu + 16 px, 0,4 s, une fois) avec `framer-motion` ; `MotionConfig reducedMotion="user"` autour de la page. Pas de parallaxe, pas d'objets flottants.

## Captures

Un script versionné `scripts/site-captures.cjs` produit, depuis `dist/` en démo riche (`/?demo=true`), les images WebP du site dans `public/site/` (ordinateur 1440 × 900 à densité 2, téléphone 390 × 844 à densité 3, invitation d'installation masquée, notifications masquées) : `ordi-devis-lots`, `ordi-devis-signe`, `ordi-facture`, `ordi-accueil`, `tel-accueil`, `tel-devis-lots`, `tel-facture`, plus `signature` : la page de signature refaite en « réel simulé » avec un devis fictif (la capture existante `public/screenshots/signature.png` montre un compte réel, « Hugo Elec », et l'adresse personnelle d'Hugo : elle ne doit plus être publiée, ni ici ni sur les pages de fonctionnalités). Il régénère aussi `public/og-image.png` (1200 × 630) avec la nouvelle charte. Identité manifestement fictive (D-27, C. consom. L121-2) : le script remplace l'entreprise de démonstration par « Élec Exemple » (assureur « Assureur (exemple) », sans SIRET plausible) dans le stockage local avant chaque capture, sans toucher `src/lib/demo-data.js` ; les clients restent ceux de la démo (noms courants, sans coordonnées visibles). Le site le dit sous les captures : « Captures de l'application, données fictives ». Le devis par lots est construit par le script (bibliothèque Électricité, lot « Mise aux normes du tableau électrique »), comme pour le dossier portfolio.

## Vérification

- Test unitaire d'honnêteté (`src/components/landing/__tests__/honnetete.test.js`) : aucun texte interdit dans les fichiers du site ; prix lus dans `PLANS`.
- Parcours navigateur `scripts/parcours/site.cjs` (mode réel simulé) à 375 et 1440 px : titre, boutons, ancres, prix, images chargées, aucun défilement horizontal, contrastes des textes clés, pages `/tarifs` et `/fonctionnalites/devis-factures`.
- Relectures : `juriste-btp` (tous les textes qui promettent), relecture de code (superpowers `requesting-code-review`).
- `npm run verifier -- --complet` vert ; captures avant/après à 375 et 1440 px montrées à Hugo.

## Décisions après la relecture indépendante (19 oct.)

- **Offre gratuite** (question à Hugo, en attente) : `PLANS` et le tableau annoncent un plan Gratuit sans signature en ligne, sans relances et à 30 articles, mais l'application ne limite que 5 devis par mois, 10 clients et 2 chantiers (`autoriserCreation`, `DataContext.jsx`) ; les listes des cartes de tarifs (en dur) et `PLANS.featureLabels` ne concordent pas. Le site affichera une seule liste par plan, lue dans `PLANS`, et cette liste dira ce que l'application fait réellement après la décision d'Hugo.
- **Livraison** (choix de Claude) : la page est la première que voit un artisan ; elle est livrée après qu'Hugo a vu les captures avant/après, pas seulement sur une vérification verte.

## Laissé au réalisateur

Les espacements, tailles exactes et la composition fine, dans le respect des contrastes et des textes ci-dessus. Aucun texte nouveau qui affirme quelque chose sans le faire relire.
