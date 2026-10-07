# Mallettico — logiciel de devis, factures et chantiers pour artisans du BTP

Ex-BatiGesti / ChantierPro. Domaine : mallettico.fr. Fondateur solo (Hugo), qui l'utilise aussi pour son activité d'électricien.
Feuille de route et tâches prêtes à exécuter : **`docs/feuille-de-route.md`** — à lire en début de session.

## Commandes

```bash
npm run dev            # serveur de dev (5173). Sans .env → mode démo ; ajouter ?demo=true pour des données riches
npm test               # vitest — 126 tests, dont les 4 chemins de l'argent (src/lib/__tests__/parcours-argent.test.js)
npm run lint           # ESLint — doit finir à 0 erreur (no-empty et no-console sont des erreurs)
npm run build          # build de production — doit passer
npm run smoke          # imports critiques, tables, secrets, fonctions Edge appelées mais absentes
node scripts/audit-ui.cjs [page] [largeur]   # défauts d'affichage mesurés (après npm run build) → audit-ui/rapport.md
```

Le hook de pre-push rejoue smoke + tests + build. C'est une copie figée : après l'avoir modifié, `npm run setup-hooks`.
GitHub Actions (`.github/workflows/verifications.yml`) rejoue lint, tests, build et smoke à chaque push sur `main` : un statut rouge sur le commit = à corriger avant tout.
Autorisations Claude du projet : `.claude/settings.json` (commandes sûres autorisées ; `git push` et Supabase demandent confirmation ; `db push` et push forcé interdits).

## Flux de travail

- Chaque session de l'onglet Code travaille dans **son propre worktree**, créé depuis `main`. Au démarrage, vérifier que la branche contient le dernier `origin/main` (sinon la mettre à jour) : une session partie d'un vieux worktree travaille sur du code périmé (cas vécu : `elegant-pike`, créé en mars).
- Ne jamais écrire dans la copie principale (`/Users/hugoseguin/Documents/chantierpro-app`) depuis un worktree : un garde-fou de l'application le bloque, et il ne faut pas le contourner.
- Livrer, uniquement avec l'accord d'Hugo : `git push origin HEAD:main` (avance rapide), vérifier le statut GitHub du commit, puis `git -C /Users/hugoseguin/Documents/chantierpro-app pull --ff-only` pour remettre sa copie à jour.

## Avant de dire « c'est fait »

Le motif récurrent de ce projet est la **panne verte** : un 200 OK, un « succeeded », un « 0 résultat » qui mentent. Ne jamais conclure sur une réponse ; vérifier l'effet.
- supabase-js **ne lève pas** d'exception sur une erreur PostgREST : toujours tester `error`.
- Une colonne inexistante dans un `select` fait échouer **toute** la requête (data = null).
- Un déploiement se vérifie par le statut du commit sur GitHub (`gh api repos/seguinhugo06-lgtm/chantierpro/commits/<sha>/status`), jamais en rechargeant le site : le service worker sert l'ancienne version.
- Un changement visible se vérifie dans un navigateur (mode démo), pas seulement au build.

## Ce qu'il ne faut jamais faire

- **`supabase db push`** : les migrations de ce projet s'appliquent à la main dans l'éditeur SQL. Écrire la migration, donner le SQL et la requête de contrôle, ne rien appliquer.
- Pousser sur `main` sans accord explicite : `main` se déploie automatiquement en production (Vercel, deux projets).
- Saisir des identifiants, clés ou mots de passe ; se connecter à un compte à la place d'Hugo.
- Afficher sur le site une affirmation non vérifiable (faux avis, fausse statistique, « conforme » sans preuve) : l'honnêteté est une valeur du produit.

## Stack et architecture

React 18 + Vite 5 + Tailwind 3.4 · Supabase (auth, Postgres + RLS, Edge Functions Deno, Storage) · Zustand · Vercel · PWA (vite-plugin-pwa).
- SPA sans routeur : `setPage('nom')` dans `src/App.jsx` ; la page courante est persistée dans `localStorage.cp_current_page`.
- Site marketing (`src/components/landing/`) affiché seulement si `!isDemo` ; routes publiques dans `src/main.jsx`.
- Multi-tenant : `user_id` + `organization_id`, RLS sur toutes les tables (99/99).
- Mode démo : `isDemo` (pas d'URL Supabase) → `localStorage` ; **piège** : un module peut marcher en démo et casser en réel (cas avéré : Réception/Garanties).
- Plans : `gratuit` / `artisan` / `equipe` — prix réels 9,90 € et 19,90 € (tarif fondateur), dans `src/stores/subscriptionStore.js`.
- Interrupteurs : `src/lib/fonctions.js` — `FONCTIONS.ia = false` masque la dictée vocale (Claude) et toute mention « IA ». Ne pas rallumer sans avoir traité la section IA de la feuille de route.

## Conventions

- Textes d'interface en français ; commits en anglais, préfixes conventionnels (`feat:`, `fix:`, `refactor:`, `test:`, `docs:`).
- Noms du domaine en français (`devis`, `chantier`, `client`), technique en anglais.
- Mode sombre : prop `isDark` + variables de thème (`cardBg`, `inputBg`…), **jamais** `dark:` de Tailwind.
- Couleur d'accent : prop `couleur` (hex) en `style` inline.
- Icônes : `lucide-react` uniquement.
- Mapping base ↔ JS : `fromSupabase()` / `toSupabase()` (`src/hooks/useSupabaseSync.js`).
- Erreurs : `captureException()` (`src/lib/sentry.js`) ; un `catch` vide est interdit par le lint — traiter l'erreur ou écrire pourquoi l'ignorer.
- Journalisation : `logger.debug` (`src/lib/logger.js`), jamais `console.log`.
- Fonctions Edge : `corsHeaders` dans chaque réponse ; vérifier l'appelant (l'anon key est publique).
- Nouvelle migration : numéro suivant le dernier de `supabase/migrations/` (dernier : 075 ; 071 à 075 restent à appliquer à la main, dans l'ordre), idempotente, RLS activé.

## Pièges connus

- **Deux générateurs de PDF** : `src/lib/devisHtmlBuilder.js` (page de signature) ET le générateur inline de `src/components/DevisPage.jsx` (aperçu et impression). Toute évolution du rendu touche les deux ; un bloc partagé va dans `src/lib/` (ex. `mentionTvaReduite.js`, texte officiel BOFiP de la certification TVA 10 % / 5,5 %).
- **Élément `position: fixed` enfermé** : un ancêtre avec `transform`, `filter` ou `backdrop-filter` devient son bloc conteneur — une modale ou un fond « plein écran » ne couvre alors que cet ancêtre. Animations d'entrée en `backwards`, jamais `forwards` avec un transform ; le flou de l'en-tête est porté par un calque ; `ui/Modal` est rendue dans `document.body` (portail). L'audit (`scripts/audit-ui.cjs`) le détecte.
- **Menus déroulants** : `useKeepInViewport(ref, ouvert)` (`src/hooks/`) les recale dans l'écran ; à utiliser pour tout nouveau menu en `absolute`.
- **Abonnements** : seuls le webhook Stripe et `subscription-billing` (clé de service) écrivent un plan payant ; l'app lit via `fetchSubscription` → `choisirAbonnement` + `appliquerFinOffre` (offres testeurs). Ne jamais réintroduire de policy UPDATE utilisateur sur `subscriptions` (migration 073).
- **Paiement par carte** : jamais de frais ajoutés au client (art. L112-12 C. mon. fin.).
- Adresse de contact unique : `contact@mallettico.fr`.
- 45 migrations (023-054) ont été effacées du dépôt par le commit `227534e` ; elles sont récupérables : `git show 227534e^:supabase/migrations/<fichier>`. Le dépôt ne décrit pas exactement la production : en cas de doute sur une table ou une RPC, donner une requête de contrôle à exécuter.
- Les pages publiques (signature, paiement `/pay/:token`, portail client) ne doivent jamais importer `App.jsx` statiquement.
- Tester une modale : scoper les sélecteurs à `[role=dialog]` (des boutons homonymes existent derrière).

## Outils

- Puppeteer est installé : captures marketing et audit d'interface sans serveur (interception de requêtes servant `dist/`, voir `scripts/audit-ui.cjs`).
- MCP GitHub et Sentry : nécessitent une autorisation via `/mcp` en session interactive.
