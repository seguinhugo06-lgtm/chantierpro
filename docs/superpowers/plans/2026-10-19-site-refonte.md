# Refonte du site public — plan de réalisation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal :** remplacer la page d'accueil publique de Mallettico par une page plus courte et plus forte, à la charte « nuit et orange », montrant l'application réelle, honnête jusque dans les tarifs.

**Architecture :** les sections de `src/components/landing/` sont réécrites ou remplacées, sur de petites briques communes (`src/components/landing/site/`) et une palette Tailwind fixe `marque` (le site ne suit pas le mode sombre de l'app). Les listes des tarifs viennent d'une seule source, `PLANS`, corrigée selon D-29. Les captures sont produites par un script versionné. Un test d'honnêteté et un parcours navigateur gardent le tout.

**Tech Stack :** React 18, Tailwind 3.4, framer-motion (déjà installé), lucide-react, vitest, puppeteer (`scripts/lib/navigateur.cjs`).

**Spec :** `docs/superpowers/specs/2026-10-19-site-refonte-design.md` (tous les textes du site y sont fixés ; ne pas en inventer d'autres).

## Global Constraints

- Français partout ; aucun mot anglais visible ; vrais caractères dans le texte JSX (pas d'échappements `é` dans le JSX, voir `.claude/rules/marketing.md`).
- Rien d'invérifiable : pas d'avis, de statistiques d'usage, de « conforme », « certifié », « toutes les mentions », « archivage », « SHA-256 », « EN 16931 », « RGPD », « Factur-X », « hébergées en France » ; aucune mention de l'IA ni de la dictée ; aucune fonction éteinte (`src/lib/fonctions.js`) présentée comme disponible.
- Couleurs du site (palette Tailwind `marque`, valeurs exactes) : `nuit` `#12336F`, `nuit-fonce` `#0B2350`, `orange` `#C2410C`, `orange-fonce` `#9A3412`, `orange-clair` `#FDBA74` ; neutres `slate`. Texte sur `orange` et sur `nuit` : blanc. Contraste de tout texte ≥ 4,5:1.
- Un seul `h1` par page. Cibles tactiles ≥ 44 px. Focus visible (`focus-visible:ring-2`).
- Animations : `MotionConfig reducedMotion="user"` ; le contenu est lisible sans animation (pas d'`opacity: 0` permanent si JavaScript ou l'animation ne joue pas).
- Ancres conservées : `#pricing`, `#faq` (`src/lib/sectionsAccueil.js`) ; bouton de la barre au texte exact « Connexion » (`scripts/parcours/reel.cjs`).
- Images : WebP dans `public/site/`, `width`/`height` explicites, `loading="lazy"` sauf le premier écran (`fetchpriority="high"`).
- Aucune dépendance nouvelle. Lint : 0 erreur.

## Review Focus

1. **Téléphone 375 px** : aucun défilement horizontal, le visuel du premier écran ne déborde pas, boutons ≥ 44 px → vérifié par le parcours (Task 4, étape 1) à 375 et 1440 px.
2. **Contenu invisible** : une section animée qui reste à `opacity: 0` (animation coupée, capture à l'arrivée) → le parcours lit l'opacité calculée des titres de section après défilement (Task 5, étape 1).
3. **Image absente ou mal nommée** : capture cassée sur la page → le parcours vérifie `naturalWidth > 0` de chaque `<img>` (Task 4, étape 1).
4. **Arrivée par /tarifs ou /faq** : la page doit descendre à la section après la refonte → parcours (Task 6, étape 1).
5. **Tarifs divergents** entre le site, « Mon plan » et la fenêtre d'abonnement → une seule liste, `PLANS`, testée (Task 1) et lue par le site (Task 6).

---

### Task 1 : l'offre réelle dans `PLANS` (D-29)

**Files :**
- Modify : `src/stores/subscriptionStore.js` (`PLANS.*.featureLabels`, `PLANS.gratuit.limits.catalogue` et `.signatures`)
- Test : `src/stores/__tests__/plansReels.test.js`

**Interfaces :**
- Produces : `PLANS[id].featureLabels: Array<{ name: string, included: true }>` — listes exactes ci-dessous, lues par le site (Task 6), `PlanPage.jsx`, `UpgradeModal.jsx`, `PricingPage.jsx`.

- [ ] **Step 1 : écrire le test** `plansReels.test.js` :
  - `PLANS.gratuit.featureLabels.map(f => f.name)` égale `['5 devis par mois', 'Factures sans limite', '10 clients', '2 chantiers', '50 photos de chantier', '1 utilisateur', 'Signature en ligne des devis', 'Relances automatiques', 'Catalogue complet : plus de 1 000 prestations chiffrées']` ;
  - `PLANS.artisan` : `['Tout le plan Gratuit, sans limite', 'Devis, clients, chantiers et photos illimités', '1 utilisateur']` ;
  - `PLANS.equipe` : `['Tout le plan Artisan', "Jusqu'à 10 utilisateurs", 'Rôles et accès pour chaque membre', "Pointage des heures de l'équipe"]` ;
  - toutes les entrées ont `included: true` ;
  - `PLANS.gratuit.limits` : `devis 5`, `clients 10`, `chantiers 2`, `photos 50`, `equipe 1`, `catalogue -1`, `signatures -1` ; `PLANS.equipe.limits.equipe` vaut 10 ;
  - les limites de `devis`, `clients`, `chantiers`, `photos`, `equipe` du Gratuit apparaissent dans ses libellés (chiffre présent dans un `name`).
- [ ] **Step 2 :** `npx vitest run src/stores/__tests__/plansReels.test.js` → échoue (libellés actuels).
- [ ] **Step 3 :** remplacer les trois `featureLabels` et les deux limites ; garder les filtres `FONCTIONS.ia` / `portailClient` (sans effet désormais) ; un commentaire cite D-29.
- [ ] **Step 4 :** le test passe ; `npx vitest run` complet vert (d'autres tests lisent peut-être les anciens libellés : les mettre à jour à l'identique de la spec).
- [ ] **Step 5 :** constater « Mon plan » et la fenêtre d'abonnement : `node scripts/sonde.cjs plan 375 --capture=audit-ui/site/plan-375.png` (page `plan` de `App.jsx`) ; aucune ligne barrée « non incluse » ne reste vide ou cassée.
- [ ] **Step 6 :** commit `feat: plans list what the app actually does (D-29)`.

### Task 2 : palette `marque`, briques du site et test d'honnêteté

**Files :**
- Modify : `tailwind.config.js` (couleurs `marque`)
- Create : `src/components/landing/site/BoutonSite.jsx`, `SectionSite.jsx`, `Cadres.jsx`, `Apparition.jsx`
- Test : `src/components/landing/__tests__/honnetete.test.js`

**Interfaces :**
- Produces :
  - `BoutonSite({ variante: 'plein' | 'contour' | 'contour-clair', href?, onClick?, children, className? })` : `<a>` si `href`, sinon `<button type="button">` ; `plein` = `bg-marque-orange text-white hover:bg-marque-orange-fonce`, `contour-clair` = bordure et texte blancs (sur bleu nuit) ; hauteur ≥ 44 px ; focus visible.
  - `SectionSite({ id?, fond: 'blanc' | 'gris' | 'nuit', children, className? })` : `<section>` pleine largeur, contenu `max-w-6xl mx-auto px-4 sm:px-6`, marges verticales communes.
  - `CadreOrdi({ src, alt, largeur, hauteur, prioritaire? })` : capture dans un cadre de navigateur (barre à trois points) ; `CadreTel({ src, alt, largeur, hauteur, prioritaire? })` : capture dans un cadre de téléphone (bord `slate-900`, coins arrondis).
  - `Apparition({ children, delai? })` : `motion.div` `initial={{ opacity: 0, y: 16 }}` `whileInView={{ opacity: 1, y: 0 }}` `viewport={{ once: true, amount: 0.2 }}` 0,4 s ; sous `useReducedMotion()` vrai, rend un `div` sans animation.
- [ ] **Step 1 : écrire `honnetete.test.js`** : lit tous les `.jsx`/`.js` de `src/components/landing/` (récursif, hors `__tests__`) et `index.html` ; aucune correspondance (insensible à la casse) pour `/\bIA\b/`, `intelligence artificielle`, `dict[ée]e`, `conforme`, `certifi`, `témoignage`, `toutes les mentions`, `archivage`, `SHA-256`, `EN 16931`, `RGPD`, `Factur-X`, `hébergées en France`, `portail client`, `paiement en ligne`, `essai gratuit de`, `\b\d+ ?% des artisans`, `\b(avis|note) (clients|4[,.]\d)` ; pour chaque correspondance, le message nomme le fichier et la ligne. Second test : aucun prix en dur `9[.,]90` / `19[.,]90` dans `src/components/landing/` (les prix viennent de `PLANS`).
- [ ] **Step 2 :** le test ne contrôle que les fichiers d'un tableau `FICHIERS_CONTROLES` (au départ : `site/*`), pour ne pas bloquer `npm run verifier` pendant la refonte ; chaque tâche suivante y ajoute les fichiers qu'elle refait ; la Task 7 le remplace par tous les fichiers du site. Vérifier qu'il échoue quand on y ajoute provisoirement `FeatureShowcase.jsx` (dictée, Factur-X), puis retirer cet ajout.
- [ ] **Step 3 :** ajouter la palette et les quatre briques.
- [ ] **Step 4 :** `npx vitest run src/components/landing/__tests__/honnetete.test.js` vert ; `npx eslint src/components/landing/site --quiet` sans erreur.
- [ ] **Step 5 :** commit `feat(site): brand palette and shared building blocks`.

### Task 3 : captures du site

**Files :**
- Create : `scripts/site-captures.cjs`
- Create (produits) : `public/site/ordi-devis-lots.webp`, `ordi-devis-signe.webp`, `ordi-facture.webp`, `ordi-accueil.webp`, `tel-accueil.webp`, `tel-devis-lots.webp`, `tel-facture.webp`, `signature.webp` ; `public/og-image.png` (1200 × 630)
- Modify : `public/screenshots/signature.png` (remplacée par la version fictive, même nom : les pages de fonctionnalités la lisent)

**Interfaces :**
- Consumes : `ouvrir({ page, largeur, reel?, supabase?, chemin? })` de `scripts/lib/navigateur.cjs` ; le geste de construction du lot de `audit-ui/portfolio/captures.cjs` (bibliothèque → « Parcourir les 17 métiers chiffrés » → « Électricité » → « Mise aux normes du tableau électrique » → Échap).
- Produces : les fichiers ci-dessus, aux dimensions : ordinateur 2880 × 1800 (1440 × 900 à densité 2), téléphone 1170 × 2532 (390 × 844 à densité 3).

- [ ] **Step 1 :** écrire le script : construit `dist/` s'il manque (`npm run build`), ouvre chaque vue en démo riche, pose `pwa-install-dismissed`, remplace avant rechargement l'entreprise de démonstration dans `batigesti_entreprises` par une identité manifestement fictive (nom « Élec Exemple », assureur « Assureur (exemple) », SIRET vide) (D-27), masque `[role=status]`, capture en `type: 'webp', quality: 82`. Signature : ouvre `/devis/signer/<jeton fictif>` en `reel: true` avec `supabase` qui répond à `/rest/v1/rpc/get_devis_for_signature` un devis fictif d'« Élec Exemple » pour « M. Martin » (lignes du lot électricité), sans e-mail affiché. `og-image.png` : composition HTML (logo `public/icon.svg`, « Mallettico », « Devis, factures et relances pour les artisans du bâtiment », capture `ordi-devis-lots`) sur fond `#12336F`, capturée à 1200 × 630.
- [ ] **Step 2 :** `node scripts/site-captures.cjs` puis vérifier : chaque fichier existe, dimensions attendues (`sips -g pixelWidth -g pixelHeight` ou lecture de l'en-tête), poids < 400 Ko par WebP.
- [ ] **Step 3 :** regarder chaque image (Read) : aucune donnée réelle (pas de « Hugo », pas d'adresse personnelle, pas de SIRET plausible), aucun bandeau d'installation, titres de lot non coupés.
- [ ] **Step 4 :** commit `feat(site): real app captures with a fictitious identity`.

### Task 4 : barre, premier écran et bande de faits ; parcours du site

**Files :**
- Modify : `src/components/landing/LandingNav.jsx`, `HeroSection.jsx`, `LandingPage.jsx`
- Create : `src/components/landing/FaitsSection.jsx`, `scripts/parcours/site.cjs`
- Test : `scripts/parcours/site.cjs`, `honnetete.test.js` (`FICHIERS_CONTROLES` += les trois fichiers)

**Interfaces :**
- Consumes : briques de la Task 2, images de la Task 3, `onLogin`, `onSignup` (props existantes de `LandingPage`).
- Produces : `scripts/parcours/site.cjs` exporte `[{ nom, reel: true, executer }]` ; les tâches suivantes y ajoutent des vérifications dans le même parcours ou des parcours voisins.

- [ ] **Step 1 : écrire le parcours** « site : premier écran » (`reel: true`, réponses Supabase vides), à 375 puis 1440 px : un seul `h1`, texte exact de la spec ; boutons au texte « Connexion » et « Créer mon compte gratuit » présents et visibles ; lien « Voir la démo » avec `href` `/?demo=true` ; `document.documentElement.scrollWidth <= innerWidth` ; chaque `img` du premier écran a `naturalWidth > 0` ; contraste du `h1` sur son fond et du bouton orange ≥ 4,5 (calculé depuis `getComputedStyle`, fond remonté jusqu'au premier ancêtre opaque) ; clic sur « Créer mon compte gratuit » → un champ `input[type="email"]` apparaît.
- [ ] **Step 2 :** `npm run build && npm run parcours -- site` → échoue (ancien titre).
- [ ] **Step 3 :** réécrire `LandingNav` (liens « Fonctionnalités » `#fonctionnalites`, « Tarifs » `#pricing`, « FAQ » `#faq` par `allerALaSection`, bouton « Connexion », bouton plein « Créer mon compte » ; menu au téléphone), `HeroSection` (textes et visuel de la spec, `CadreOrdi` + `CadreTel` prioritaires), `FaitsSection` (quatre faits, sans compteur) ; `LandingPage` : retirer `StatsBar`, insérer `FaitsSection` après le premier écran ; `MotionConfig reducedMotion="user"` autour de `<main>`.
- [ ] **Step 4 :** parcours vert ; `npm run parcours -- reel` vert (« Connexion » toujours cliquable) ; test d'honnêteté vert.
- [ ] **Step 5 :** commit `feat(site): new header, first screen and facts strip`.

### Task 5 : le cycle, la fiabilité, le terrain

**Files :**
- Create : `src/components/landing/CycleSection.jsx`, `FiabiliteSection.jsx`, `TerrainSection.jsx`
- Modify : `src/components/landing/LandingPage.jsx` (retirer `FeatureShowcase`, `QuickFeaturesGrid`, `CtaBanner` de l'accueil ; ordre de la spec)
- Test : `scripts/parcours/site.cjs`, `honnetete.test.js`

- [ ] **Step 1 : ajouter au parcours** « site : sections » à 375 et 1440 px : `#fonctionnalites` contient quatre étapes numérotées dont les titres exacts de la spec et quatre liens « En savoir plus » vers les adresses de la spec ; la section fiabilité affiche ses quatre garanties exactes ; après `scrollIntoView` de chaque `h2` et 800 ms, son opacité calculée vaut 1 ; légende « Captures de l'application, données fictives » présente.
- [ ] **Step 2 :** parcours → échoue.
- [ ] **Step 3 :** écrire les trois sections (textes de la spec, captures de la Task 3, `Apparition`) et réordonner `LandingPage`.
- [ ] **Step 4 :** parcours et test d'honnêteté verts.
- [ ] **Step 5 :** commit `feat(site): the cycle, reliability and on-site sections`.

### Task 6 : tarifs et « construit en public »

**Files :**
- Modify : `src/components/landing/PricingSection.jsx`, `PricingComparisonTable.jsx`, `EarlyAdoptersSection.jsx`
- Test : `scripts/parcours/site.cjs`, `honnetete.test.js`

**Interfaces :**
- Consumes : `PLANS`, `PLAN_ORDER` de `src/stores/subscriptionStore.js` (Task 1) ; `formatMoney` ou le format de prix actuel de `PricingSection`.

- [ ] **Step 1 : ajouter au parcours** « site : tarifs » : `#pricing` affiche, pour chaque plan de `PLAN_ORDER`, son nom et son prix mensuel au format français (« 0 € », « 9,90 € », « 19,90 € » HT) et chaque libellé de `featureLabels` ; le tableau de comparaison est replié, s'ouvre au clic sur « Comparer les plans en détail » ; arrivée sur `/tarifs` → `#pricing` dans la fenêtre (`getBoundingClientRect().top` entre −10 et 200) ; arrivée sur `/faq` → idem pour `#faq`.
- [ ] **Step 2 :** parcours → échoue.
- [ ] **Step 3 :** cartes et tableau lus dans `PLANS` (plus aucune liste en dur) ; tableau replié par défaut ; `EarlyAdoptersSection` à la nouvelle charte, texte de la spec.
- [ ] **Step 4 :** parcours et test d'honnêteté verts (plus de prix en dur).
- [ ] **Step 5 :** commit `feat(site): pricing read from PLANS, built in public`.

### Task 7 : FAQ, dernier appel, pied de page, sous-pages

**Files :**
- Modify : `src/components/landing/FAQSection.jsx`, `FinalCta.jsx`, `FooterSection.jsx`, `MarketingLayout.jsx`, `FeaturesDetailPage.jsx`, `FeatureDeepDivePage.jsx`, `ResourcesPage.jsx`, `featuresContent.js`, `FeatureShowcase.jsx` (s'il reste importé), `index.html` (balises `og:image`, `theme-color` `#12336F`)
- Test : `honnetete.test.js` (`FICHIERS_CONTROLES` → tous les fichiers du site), `scripts/parcours/site.cjs`

- [ ] **Step 1 :** passer `honnetete.test.js` sur tous les fichiers ; ajouter au parcours « site : sous-pages » : `/fonctionnalites`, `/fonctionnalites/devis-factures`, `/fonctionnalites/relances`, `/ressources` s'affichent sans erreur JavaScript, sans défilement horizontal à 375 px, avec la barre (« Connexion ») et le pied de page.
- [ ] **Step 2 :** test → échoue (dictée, Factur-X…).
- [ ] **Step 3 :** corriger les réponses de la FAQ et `featuresContent.js` selon le code (ne garder que ce qui existe : vérifier chaque affirmation dans `src/` avant de la garder ; une affirmation qu'on ne peut pas vérifier est retirée) ; `FinalCta` et `FooterSection` à la charte et aux textes de la spec ; sous-pages à la palette `marque` ; retirer de l'accueil les imports devenus inutiles.
- [ ] **Step 4 :** test d'honnêteté et parcours verts ; `npm run verifier` vert.
- [ ] **Step 5 :** commit `feat(site): FAQ, final call, footer and feature pages on the new palette`.

### Task 8 : relectures, vérification complète, captures pour Hugo

- [ ] **Step 1 :** relecture `juriste-btp` (agent `general-purpose` avec `.claude/agents/juriste-btp.md`) de tous les textes du site, des libellés de `PLANS` et de la FAQ ; corriger, faire relire à nouveau.
- [ ] **Step 2 :** relecture de code de toute la branche (superpowers `requesting-code-review`) ; corriger.
- [ ] **Step 3 :** `npm run verifier -- --complet` vert sur le commit exact, arbre propre.
- [ ] **Step 4 :** captures avant (production actuelle, `ouvrir({ reel: true })` sur le commit d'avant) et après, à 375 et 1440 px, pleine page ; les montrer à Hugo avec la liste des choix marqués « choix de Claude ».
- [ ] **Step 5 :** après l'accord d'Hugo : `git push origin HEAD:main`, `npm run statut`, consigner (`docs/etat-production.md`, feuille de route, Pilote).
