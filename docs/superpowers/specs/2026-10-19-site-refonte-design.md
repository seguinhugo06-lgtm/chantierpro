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
- Le site est toujours en clair (il n'utilise pas les jetons de thème, qui suivent le mode sombre de l'app) : couleurs **fixes**, charte **« Glacier vif »** choisie par Hugo le 19 oct. parmi six propositions tirées du logo (palette Tailwind `marque`, valeurs exactes dans le plan) :
  - bleu nuit du logo (`#0D2E6C`, `#12336F`) pour les titres, les boutons en pilule et les bandes sombres ;
  - glacier du reflet du logo (`#F0FAFF` → `#DCEFFB` → `#BFF2FF`) pour les fonds clairs et le premier écran ;
  - ardoise `#2B4A7A` et acier `#BCD3E2` pour les textes secondaires et les traits ;
  - l'orange du logo `#EE7B20` en **touche décorative seulement** : point lumineux, mot du titre souligné d'orange, lueur ; jamais de texte orange sur fond clair (2,8:1).
- Police Inter (déjà servie par l'app).
- Prix : lus dans `PLANS` de `src/stores/subscriptionStore.js` (aujourd'hui recopiés en dur dans `PricingSection.jsx` : à corriger).
- Images : WebP, dimensions explicites (`width`/`height`), `loading="lazy"` sauf le premier écran (`fetchpriority="high"`).

## Structure de la page d'accueil

Direction validée par Hugo le 19 oct. 2026 sur un prototype cliquable (« oui, continue le site dans cette direction ») : un site **qui montre le produit en action, avec de vraies données**, sobre et sérieux. Trois idées le portent : le **devis vivant** du premier écran, l'**explorateur des 17 métiers** (essayer avant de s'inscrire), le **cycle au défilement** sur un téléphone fixe ; un motif discret de **plan d'architecte** (quadrillage glacier) signe le bâtiment.

1. **Barre de navigation** (fixe, blanche translucide avec flou, trait bas) : logo v2 + « Mallettico » ; liens « Métiers » (`#metiers`), « Fonctionnalités » (`#fonctionnalites`), « Fiabilité » (`#fiabilite`), « Tarifs » (`#pricing`), « FAQ » (`#faq`) ; bouton texte « Connexion » ; pilule bleu nuit « Créer mon compte ». Au téléphone : logo, « Connexion », menu.
2. **Premier écran**, fond glacier (`#F0FAFF` vers blanc) avec le **plan d'architecte** (quadrillage glacier 120 px et 24 px, estompé vers les bords) et une lueur orange très douce en haut à droite ; deux colonnes au bureau, une au téléphone :
   - à gauche : surtitre en pastille blanche avec le point orange lumineux, « Devis · Factures · Relances » ; `h1` « L'administratif du chantier, rangé dans une mallette. », « rangé dans une mallette » souligné d'un trait orange épais ; texte « Montez un devis à partir de prestations déjà chiffrées, faites-le signer en ligne, facturez sans rien ressaisir. Mallettico relance et suit les paiements. Sur téléphone comme sur ordinateur. » ; pilules « Créer mon compte gratuit → » (bleu nuit) et « Voir la démo » (contour, `/?demo=true`) ; réassurance : « Gratuit pour commencer, sans carte bancaire » · « Base de données hébergée à Paris » ;
   - à droite, le **devis vivant** : une carte « DEV-2026-00012 · M. Martin », titre du lot « Mise aux normes du tableau électrique » (lu dans `TRADE_LIBRARY.electricite`, jamais recopié) ; ses lignes apparaissent une à une (désignation, quantité × prix, montant), le total TTC (TVA de chaque ligne) se calcule en direct ; puis pastille « Signé » et tampon « SIGNÉ EN LIGNE » ; puis « FAC-2026-00042 », « Facture envoyée », barre d'encaissement à 40 % « Payée en partie », puis 100 % « Payée » ; la boucle reprend. Une petite carte flottante : point orange + « Relance envoyée à J+7, au rythme que vous choisissez ». Légende : « Démonstration : le lot « Mise aux normes du tableau électrique » de la bibliothèque Électricité, prix moyens indicatifs du marché. »
3. **Bande de faits** (blanche, quatre cases séparées par un trait, sans compteur animé) : « 1 000+ » prestations et ouvrages déjà chiffrés · « 17 » métiers du bâtiment · « 2 écrans » téléphone et ordinateur · « 0 € » pour commencer.
4. **Votre métier est déjà chiffré** (`id="metiers"`) : texte « Choisissez le vôtre : voici les lots types que vous insérez en un geste dans un devis, avec leurs prix moyens. Vous ajustez les quantités et vos tarifs, c'est tout. » ; 17 pastilles de métiers (`TRADE_LIBRARY`, ordre de la bibliothèque, Électricité choisi d'abord) ; pour le métier choisi, ses trois premiers lots types en cartes : nom, résumé, « N lignes · HT », total HT arrondi à l'euro, les trois premières lignes avec leur montant ; note : « Prix moyens indicatifs du marché français (2026), fourniture et pose HT. Ils font gagner du temps ; vos propres tarifs restent les vôtres. »
5. **Le cycle au défilement** (`id="parcours"`, fond glacier ; « Fonctionnalités » mène à la section « Les fonctionnalités en action ») : trois étapes numérotées à gauche, un téléphone collant à droite dont l'écran change avec l'étape lue (captures `tel-accueil`, `tel-devis-lots`, `tel-facture`) ; au téléphone, les étapes s'empilent avec leur capture :
   1. « Le chantier du jour, d'un coup d'œil » — « À l'ouverture : ce qu'il reste à encaisser, les devis à relancer, les brouillons à finir. Rien d'autre. »
   2. « Le devis se monte par lots » — « Un lot de la bibliothèque, quelques quantités à ajuster, le total se calcule pendant que vous tapez. »
   3. « Signé, facturé, encaissé » — « Le client signe en ligne. Le devis devient une facture sans ressaisie, chaque paiement est noté, même partiel. »
   Chaque étape porte un lien « En savoir plus » (`/fonctionnalites/devis-factures`, `/fonctionnalites/devis-factures`, `/fonctionnalites/signature-electronique`). Légende : « Captures de l'application, données fictives. »
6. **Fiabilité** (`id="fiabilite"`, bande bleu nuit avec le quadrillage en blanc très léger), titre « Une facture, ça ne se bricole pas. », texte « Les règles importantes ne dépendent pas de l'écran : la base de données les fait respecter elle-même. » ; quatre garanties animées sobrement :
   - un compteur « FAC-2026-00041 » qui avance d'une unité, sans trou — « Des numéros qui se suivent, sans trou » ;
   - un cadenas (icône `lucide-react`) — « Une facture envoyée ne se supprime pas : on la corrige par un avoir » ;
   - une barre d'encaissement qui se remplit — « Une facture n'est « payée » que si les paiements la soldent » ;
   - trois mentions en texte acier — « Assurance décennale, TVA réduite, pénalités de retard : les mentions s'ajoutent toutes seules ».
7. **Tarifs** (`id="pricing"`) : les trois plans de `PLANS` (libellés de D-29), prix HT par mois, « tarif fondateur » tel qu'affiché aujourd'hui ; le tableau de comparaison reste, sous un bouton « Comparer les plans en détail » (replié par défaut). **(choix de Claude)**
8. **Construit en public** (contenu de `EarlyAdoptersSection`, nouvelle charte) : « Pas de faux avis ici. Les avis viendront des artisans qui utilisent Mallettico, avec leur accord. »
9. **FAQ** (`id="faq"`) : questions actuelles, réponses relues pour l'honnêteté (Factur-X, intégrations, support : ne garder que ce qui existe).
10. **Dernier appel** (dégradé blanc vers glacier) : « Votre prochain devis, dès ce soir. » ; pilules « Créer mon compte gratuit → » et « Voir la démo ». Ligne en dessous : « Mallettico — tout y est, rien ne pèse. »
11. **Pied de page** bleu-noir (`#0B1324`), liens actuels.

Sections retirées de la page : `StatsBar`, `QuickFeaturesGrid`, `CtaBanner`, `FeatureShowcase`, « Fait pour le chantier » de la première version (fichiers gardés tant que d'autres pages les importent).

## Les fonctionnalités en action (demande d'Hugo, 20 oct. 2026 : « joue bien sur nos fonctionnalités avec de beaux exemples, je veux que tout soit incroyable »)

Une section `id="fonctionnalites"` (le lien « Fonctionnalités » de la barre y mène ; le cycle au défilement prend l'ancre `#parcours`), placée entre l'explorateur des métiers et le cycle. Titre : « Essayez, c'est l'application. » ; texte : « Des exemples à manipuler, sur des données fictives. Le document, le métré et les relances sortent du code même de l’application. » (décision du 20 oct. : la signature et les encaissements ont leur propre code de démonstration)

Au bureau : une colonne d'onglets à gauche (titre + une phrase), l'exemple à droite dans un cadre d'application. Au téléphone : les onglets en pastilles défilantes au-dessus de l'exemple. Cinq onglets :

1. **« Le document que reçoit votre client »** — le **vrai** générateur (`buildDevisHtml`, `src/lib/devisHtmlBuilder.js`, chargé par `import()`) rend un devis fictif d'« Élec Exemple » pour « M. Martin » (le lot « Mise aux normes du tableau électrique » de la bibliothèque, TVA 10 %), affiché dans un cadre réduit et défilant. À côté, la liste des mentions que le document porte réellement, lue dans le HTML produit (un test le vérifie) : identité et SIRET, assurance décennale, attestation de TVA réduite, conditions de paiement et pénalités, droit de rétractation. Légende : « Exemple fictif généré par Mallettico. »
2. **« Signature en ligne »** — une carte « Devis DEV-2026-00012 · 2 081,20 € TTC » avec une zone « Signez ici » où l'on trace au doigt ou à la souris ; « Valider la signature » pose le tampon « Signé le JJ/MM/AAAA à HH:MM ». Rien n'est envoyé : « Démonstration : votre signature ne quitte pas cette page. »
3. **« Métré express »** — longueur, largeur, nombre, chutes (%) : la quantité en m² et le montant d'une vraie ligne de la bibliothèque (une prestation de carrelage de `TRADE_LIBRARY.carrelage`, prix moyen) se recalculent en direct, avec le même calcul que la fenêtre « Métré » de l'éditeur (fonction pure partagée, déplacée dans `src/lib/metre.js` et utilisée par les deux).
4. **« Relances »** — la frise du scénario de relance de devis proposé par l'application (étapes et délais lus dans le code de `RelanceConfigTab`, exportés au besoin), chaque étape avec l'objet du message ; « Vous réglez les délais et les messages ; l'envoi automatique est une option. »
5. **« Encaissements »** — une facture de 4 136,00 € : acompte de 30 % reçu, un virement partiel, le reste dû qui baisse à chaque clic sur « Encaisser 500 € », et la pastille qui ne passe à « Payée » qu'au solde exact. « Une facture n'est « payée » que si les paiements la soldent. »

Accessibilité : onglets au clavier (flèches, `role="tablist"`), chaque exemple utilisable au clavier (la zone de signature a un bouton « Signer avec mon nom » qui écrit le nom en cursive), mouvement réduit respecté. Honnêteté : tout montant vient du code ou de la bibliothèque ; aucun chiffre inventé ; aucune fonction éteinte (paiement en ligne, portail) n'apparaît.

## Passe de finition « incroyable »

Avant les relectures finales, une passe de finition sur toute la page : rythme vertical régulier, alignements, tailles de titres, transitions entre sections (fond blanc / glacier / nuit), états de survol et de focus, images nettes, et un contrôle visuel à 375, 768, 1024 et 1440 px, en mouvement normal et réduit, par une relecture « directeur artistique » qui liste les défauts à corriger.

## Données de la bibliothèque

`TRADE_LIBRARY` (`src/lib/templates/trade-library.js`, 149 Ko) est importé **à la demande** (`import()`) par le devis vivant et l'explorateur, pour ne pas alourdir le premier affichage : la carte du devis vivant montre son cadre et son titre tout de suite, puis ses lignes dès que les données sont là. Aucun prix n'est recopié dans le site.

## Mouvement et accessibilité

- Apparition douce des sections au défilement (fondu + 16 px, 0,4 s, une fois) ; jamais sur le premier écran ; `MotionConfig reducedMotion="user"`.
- **Mouvement réduit** demandé par l'appareil : le devis vivant s'affiche d'emblée complet et « Payé », sans boucle ; le compteur et la barre de la fiabilité restent fixes ; le téléphone du cycle change sans fondu.
- Le devis vivant est décoratif pour les lecteurs d'écran (`aria-hidden`), doublé d'un texte lisible hors écran : « Exemple : un devis de 7 lignes pour une mise aux normes de tableau électrique, signé en ligne, facturé puis payé. » ; pas de région `aria-live` qui annoncerait la boucle.
- Les boucles s'arrêtent quand la carte sort de l'écran ou que l'onglet est caché (`IntersectionObserver`, `visibilitychange`).
- Pastilles des métiers : boutons avec `aria-pressed` ; flèches gauche/droite pour passer d'un métier à l'autre.
- Contrastes ≥ 4,5:1 partout ; cibles ≥ 44 px ; aucune information portée par la seule couleur.

## Captures

Un script versionné `scripts/site-captures.cjs` produit, depuis `dist/` en démo riche (`/?demo=true`), les images WebP du site dans `public/site/` (ordinateur 1440 × 900 à densité 2, téléphone 390 × 844 à densité 3, invitation d'installation masquée, notifications masquées) : `ordi-devis-lots`, `ordi-devis-signe`, `ordi-facture`, `ordi-accueil`, `tel-accueil`, `tel-devis-lots`, `tel-facture`, plus `signature` : la page de signature refaite en « réel simulé » avec un devis fictif (la capture existante `public/screenshots/signature.png` montre un compte réel, « Hugo Elec », et l'adresse personnelle d'Hugo : elle ne doit plus être publiée, ni ici ni sur les pages de fonctionnalités). Il régénère aussi `public/og-image.png` (1200 × 630) avec la nouvelle charte. Identité manifestement fictive (D-27, C. consom. L121-2) : le script remplace l'entreprise de démonstration par « Élec Exemple » (assureur « Assureur (exemple) », sans SIRET plausible) dans le stockage local avant chaque capture, sans toucher `src/lib/demo-data.js` ; les clients restent ceux de la démo (noms courants, sans coordonnées visibles). Le site le dit sous les captures : « Captures de l'application, données fictives ». Le devis par lots est construit par le script (bibliothèque Électricité, lot « Mise aux normes du tableau électrique »), comme pour le dossier portfolio.

## Vérification

- Test unitaire d'honnêteté (`src/components/landing/__tests__/honnetete.test.js`) : aucun texte interdit dans les fichiers du site ; prix lus dans `PLANS`.
- Parcours navigateur `scripts/parcours/site.cjs` (mode réel simulé) à 375 et 1440 px : titre, boutons, ancres, prix, images chargées, aucun défilement horizontal, contrastes des textes clés, pages `/tarifs` et `/fonctionnalites/devis-factures`.
- Relectures : `juriste-btp` (tous les textes qui promettent), relecture de code (superpowers `requesting-code-review`).
- `npm run verifier -- --complet` vert ; captures avant/après à 375 et 1440 px montrées à Hugo.

## Décisions après la relecture indépendante (19 oct.)

- **Offre gratuite — décision D-29 d'Hugo (19 oct.) : le site dit ce que fait l'application aujourd'hui.** `PLANS` et le tableau annonçaient un plan Gratuit sans signature en ligne, sans relances et à 30 articles, mais l'application ne limite que 5 devis par mois (les factures ne sont pas limitées), 10 clients, 2 chantiers, 50 photos et 1 utilisateur ; l'Équipe va jusqu'à 10 utilisateurs. Une seule liste par plan, dans `PLANS`, corrigée et lue partout (site, « Mon plan », fenêtre d'abonnement). Libellés exacts : voir la Task 1 du plan.
- **Livraison** (choix de Claude) : la page est la première que voit un artisan ; elle est livrée après qu'Hugo a vu les captures avant/après, pas seulement sur une vérification verte.

## Laissé au réalisateur

Les espacements, tailles exactes et la composition fine, dans le respect des contrastes et des textes ci-dessus. Aucun texte nouveau qui affirme quelque chose sans le faire relire.
