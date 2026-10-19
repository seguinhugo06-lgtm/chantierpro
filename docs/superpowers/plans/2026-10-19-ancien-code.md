# Fin de l'ancien code de thème et de couleurs — plan de réalisation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal :** tout écran affiché de l'app n'utilise plus que les jetons du thème (charte « Glacier vif »), et un test empêche l'ancien code de revenir.

**Architecture :** deux transformations automatiques du code source, testées (ternaires `isDark` et classes orange → jetons ; couleur d'entreprise en style → jetons d'accent), appliquées aux seuls fichiers atteignables depuis `src/main.jsx` hors exceptions ; puis des passes manuelles par groupe d'écrans pour ce qu'elles ne savent pas faire ; un test de non-retour dont le plafond baisse à chaque tâche jusqu'à 0.

**Tech Stack :** Node (scripts `.mjs`), `@babel/parser` et `@babel/traverse` (déjà présents dans `node_modules`, pour localiser les expressions ; le remplacement se fait par positions dans le texte, sans régénérer le code), vitest, `scripts/sonde.cjs`, `npm run verifier`.

**Spec :** `docs/superpowers/specs/2026-10-19-ancien-code-design.md` (table de correspondances exacte, exceptions, non-objectifs).

## Global Constraints

- Ne change ni le fonctionnement ni les textes ; seulement les classes de couleur, fonds, traits et encres.
- **Exceptions, jamais transformées** : `src/components/landing/**` ; les générateurs de documents et d'e-mails (`src/lib/devisHtmlBuilder.js`, `src/lib/pdfHtmlBuilder.js`, `src/lib/miseEnDemeureBuilder.js`, `src/lib/rapportChantierPdf.js`, `src/lib/reportPdfBuilder.js`, `src/lib/emailSender.js`, `src/lib/relanceUtils.js`, `src/lib/echapperHtml.js`) ; dans `src/components/DevisPage.jsx`, le générateur intégré (fonctions qui produisent du HTML en chaîne : tout ce qui est dans une chaîne ou un gabarit `\`…\`` contenant `<`) ; les fichiers non atteignables depuis `src/main.jsx`.
- Correspondances : uniquement celles de la table de la spec ; une classe sans correspondance reste telle quelle.
- Jetons et utilitaires disponibles : voir `.claude/rules/interface.md` (`bg-fond`, `bg-surface`, `bg-surface-2`, `border-bord`, `border-bord-fort`, `text-encre`, `text-encre-2`, `text-encre-3`, `bg-accent`, `text-sur-accent`, `text-accent-texte`, tons `bg-{neutre|info|succes|alerte|danger}-fond`, `text-{…}-texte`).
- Lint 0 erreur ; `plafondsDesign.test.js` reste vert (pas de texte < 12 px, pas de `gray`, pas de `dark:`).
- Un lot = un commit lisible ; message en anglais, préfixe conventionnel, ligne `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

1. **Texte devenu invisible** : une classe claire convertie mais un fond resté en dur (ex. `text-encre` blanc en sombre sur un `bg-white` oublié) → captures clair **et** sombre de chaque écran touché, lues une à une (chaque tâche de passe manuelle).
2. **Bouton plein sans texte lisible** : `bg-accent` posé là où le texte restait `text-slate-900` → la transformation ajoute `text-sur-accent` quand le texte était blanc, et le test de la Task 2 couvre le cas « texte non blanc » (pas d'ajout, signalé).
3. **Document imprimé recoloré par erreur** : une transformation qui touche une chaîne HTML → test de la Task 2 sur un extrait du générateur intégré (chaîne avec `<`) : inchangé.
4. **Ternaire partiellement converti** : classes claires dont une seule n'a pas de correspondance → le ternaire entier est laissé tel quel (test Task 2).
5. **Régression d'un parcours** (sélecteurs par classe dans `scripts/parcours/`) → `npm run parcours` après chaque transformation automatique (Tasks 3 et 5).

---

### Task 1 : test de non-retour et liste des fichiers concernés

**Files :**
- Create : `scripts/migration/fichiers.mjs`, `src/lib/__tests__/ancienCode.test.js`, `src/lib/__tests__/ancienCode.plafond.json`

**Interfaces :**
- Produces : `fichiersConcernes(racine: string): string[]` (chemins relatifs à la racine, atteignables depuis `src/main.jsx` par imports statiques et `import()`, hors exceptions des Global Constraints) ; `compterAncienCode(source: string): { ternaires: number, styleCouleur: number, teinteCouleur: number, orange: number }` ; le plafond (`ancienCode.plafond.json`) `{ ternaires, styleCouleur, teinteCouleur, orange }` = totaux mesurés à la fin de cette tâche.
- Motifs comptés : `ternaires` = `isDark ? '…' : '…'` (chaînes simples) ; `styleCouleur` = `(background|backgroundColor|color|borderColor|borderTopColor)\s*:\s*(couleur|accent)\b` ; `teinteCouleur` = `\$\{(couleur|accent)\}[0-9a-fA-F]{2}` ; `orange` = `\b(bg|text|border|from|to|via|ring)-orange-\d{2,3}` et `#f97316|#ea580c` (insensible à la casse).

- [ ] **Step 1 :** écrire `ancienCode.test.js` : (a) `fichiersConcernes` n'inclut aucun fichier de `src/components/landing/`, aucun générateur de la liste d'exceptions, et inclut `src/components/Dashboard.jsx` et `src/components/DevisPage.jsx` ; (b) `compterAncienCode` compte 1 de chaque motif sur des extraits écrits dans le test ; (c) la somme sur `fichiersConcernes` ne dépasse pas, motif par motif, `ancienCode.plafond.json`.
- [ ] **Step 2 :** le test échoue (module absent).
- [ ] **Step 3 :** écrire `scripts/migration/fichiers.mjs` (parcours des imports comme `audit-ui/atteignables.json`, mais exécutable par le test), mesurer, écrire le plafond.
- [ ] **Step 4 :** test vert ; `npx vitest run` vert.
- [ ] **Step 5 :** commit `test: ratchet on legacy theme and colour code`.

### Task 2 : la transformation et ses correspondances

**Files :**
- Create : `scripts/migration/correspondances.mjs`, `scripts/migration/transformer.mjs`
- Test : `src/lib/__tests__/migrationJetons.test.js`

**Interfaces :**
- Produces :
  - `jetonsPour(classesClaires: string): string | null` — remplace chaque classe par sa correspondance (table de la spec) ; `null` si une seule classe n'en a pas (le ternaire reste alors intact) ; conserve l'ordre et les classes neutres non colorées (`rounded-xl`, `p-4`, `shadow`…).
  - `transformer(source: string): { source: string, changements: number, ignores: number }` — localise par `@babel/parser` (plugins `jsx`) : (1) les `ConditionalExpression` dont le test est l'identifiant `isDark` et les deux branches des chaînes simples → remplacées par `'<jetonsPour(branche claire)>'` ; (2) les classes orange dans les chaînes de `className` → jetons ; (3) dans un attribut `style={{ … }}`, `background|backgroundColor: couleur|accent` → retiré du style et `bg-accent` ajouté au `className` du même élément (avec `text-sur-accent` si ce `className` contient `text-white`, qu'on retire alors) ; `color: couleur|accent` → `text-accent-texte`. Ne touche jamais une chaîne ou un gabarit qui contient `<` (HTML de document).
- [ ] **Step 1 : écrire les tests** : `jetonsPour('bg-white border-slate-200')` → `'bg-surface border-bord'` ; `jetonsPour('text-slate-500')` → `'text-encre-3'` ; `jetonsPour('bg-white text-emerald-600')` → `null` ; `transformer` sur `const cardBg = isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200';` → `const cardBg = 'bg-surface border-bord';` ; sur `<button className="px-4 text-white rounded-xl" style={{ background: couleur }}>` → `<button className="px-4 rounded-xl bg-accent text-sur-accent">` ; sur `<span style={{ color: couleur }}>` → `<span className="text-accent-texte">` ; sur `` const html = `<td style="color:${couleur}">` `` → inchangé ; sur `isDark ? 'bg-slate-800' : 'bg-white text-emerald-600'` → inchangé et `ignores` = 1 ; sur `className="bg-orange-500 text-white"` → `className="bg-accent text-sur-accent"`.
- [ ] **Step 2 :** tests rouges.
- [ ] **Step 3 :** écrire les deux modules (remplacements par positions, du dernier au premier pour garder les positions valables).
- [ ] **Step 4 :** tests verts ; lint.
- [ ] **Step 5 :** commit `feat(tooling): legacy theme and colour codemod with its mapping`.

### Task 3 : appliquer la transformation aux fichiers concernés

**Files :** les fichiers de `fichiersConcernes` (sortie de la Task 1) ; `src/lib/__tests__/ancienCode.plafond.json` (plafond baissé).
- [ ] **Step 1 :** `node scripts/migration/transformer.mjs --appliquer` (mode qui parcourt `fichiersConcernes` et écrit) ; noter les comptes par fichier dans le rapport.
- [ ] **Step 2 :** `npx eslint src --quiet` 0 erreur ; `npx vitest run` vert ; `npm run build` ; `npm run parcours` vert.
- [ ] **Step 3 :** captures clair et sombre à 375 et 1440 px de : `dashboard`, `devis`, `clients`, `chantiers`, `catalogue`, `finances`, `planning`, `equipe`, `settings`, `plan` (`node scripts/sonde.cjs <page> <largeur> --capture=audit-ui/migration/<page>-<largeur>-<theme>.png`, thème sombre par `cp_theme=dark`) ; les lire une à une ; tout texte illisible ou fond resté blanc en sombre est corrigé dans cette tâche.
- [ ] **Step 4 :** baisser le plafond aux nouveaux totaux ; test vert.
- [ ] **Step 5 :** commit `refactor: legacy theme ternaries and orange classes moved to tokens`.

### Tasks 4 à 9 : passes manuelles par groupe d'écrans, avec l'audit d'expérience

Demande d'Hugo (20 oct. 2026) : « rendre l'app incroyable en lisibilité, organisation, UX, UI ». Chaque tâche applique aussi, pour son groupe, **les constats P1 et P2 de l'audit** `docs/audit-ux-2026-10-20.md` (section 3, rattachés aux Tasks 4 à 9) et ses principes transverses (section 2), et les P3 quand ils sont simples ; ne pas toucher à ce que la section 4 de l'audit dit de garder ; une décision de produit (ex. réglage « Je gère un stock ») attend Hugo. Elle traite aussi **tout l'ancien code restant** (compté par `compterAncienCode`) dans son groupe : convertir selon la table de la spec ; pour ce que la table ne couvre pas, utiliser les tons ou les primitives de `src/components/ui/` ; supprimer les variables de thème devenues inutiles ; garder les props `isDark`/`couleur` dans les signatures. Puis : lint, tests, build, captures clair et sombre 375/1440 des écrans du groupe, lues ; baisser le plafond ; commit `refactor(<groupe>): legacy colours moved to tokens`.

- **Task 4 — Devis et factures** : `src/components/DevisPage.jsx` (hors générateur HTML), `DevisComposer.jsx`, `DevisWizard.jsx`, `DevisExpressModal.jsx`, `PaymentModal.jsx`, `src/components/devis/**`, `src/components/signature/**` (page publique : vérifier aussi `/devis/signer/…`).
- **Task 5 — Coque et accueil** : `src/App.jsx`, `src/components/layout/**`, `Dashboard.jsx`, `CommandPalette.jsx`, `FABMenu.jsx`, `PWAUpdatePrompt.jsx`, `CookieConsent.jsx`, `src/components/retours/**` ; puis `npm run parcours` complet.
- **Task 6 — Chantiers, planning, tâches** : `Chantiers.jsx`, `src/components/chantiers/**`, `Planning.jsx`, `GanttView.jsx`, `src/components/tasks/**`, `TaskGeneratorModal.jsx`.
- **Task 7 — Clients, catalogue, bibliothèque** : `Clients.jsx`, `QuickClientModal.jsx`, `QuickChantierModal.jsx`, `Catalogue.jsx`, `src/components/catalogue/**`, `src/components/bibliotheque/**`, `ArticlePicker.jsx`, `CatalogBrowser.jsx`, `ImportModal.jsx`.
- **Task 8 — Finances, équipe, réglages, abonnement** : `src/components/tresorerie/**`, `src/components/export/**`, `AnalyticsPremium.jsx`, `Equipe.jsx`, `Settings.jsx`, `src/components/settings/**`, `src/components/profil/**`, `src/components/subscription/**`.
- **Task 9 — Le reste des fichiers concernés** : tout fichier de `fichiersConcernes` encore compté par `compterAncienCode` ; à la fin, plafond à 0 sur les quatre motifs.

### Task 10 : vérification complète et captures pour Hugo

- [ ] **Step 1 :** `npm run verifier -- --complet` vert sur le commit exact, arbre propre.
- [ ] **Step 2 :** captures avant (commit `4980f6aa`) / après, clair et sombre, 375 et 1440 px, des dix écrans de la Task 3 ; liste des fichiers morts non migrés (`audit-ui/atteignables.json`) pour Hugo.
- [ ] **Step 3 :** consigner (`.claude/rules/interface.md` : l'ancien code n'existe plus dans les écrans ; feuille de route : `charte-suite` soldée).
