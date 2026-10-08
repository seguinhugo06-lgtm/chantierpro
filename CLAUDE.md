# Mallettico — devis, factures et relances pour artisans du BTP

Domaine `mallettico.fr` (ex-BatiGesti / ChantierPro). Fondateur solo : Hugo, qui l'utilise aussi pour son activité d'électricien. Cap : **l'outil le plus simple et le plus fiable du cycle devis → facture → relance → encaissement**, publié sur l'App Store et Google Play.

Utilisateur type : un artisan sur un chantier, téléphone d'une main, peu de temps, peu de tolérance aux bugs. Chaque erreur sur un devis ou une facture lui coûte de l'argent ou de la crédibilité.

## Démarrer une session

Le hook de démarrage affiche l'état (retard sur main, travail en cours, dernière vérification, ce qu'Hugo doit appliquer). Puis `/debut`. Si la branche a du retard sur `origin/main` : la mettre à jour avant tout.

## Comment on travaille

Tout passe par **`/tache <quoi>`** (cadrer → implémenter → vérifier → faire relire → livrer → consigner). Détail : `docs/organisation.md`.

**Définition de « fini »** : le critère d'acceptation est **constaté** (sortie de commande, parcours navigateur, capture, requête), pas supposé. Le motif récurrent de ce projet est la **panne verte** : un build vert, un 200 OK, un « 0 résultat » qui mentent. supabase-js ne lève pas d'exception sur une erreur (tester `error`) ; un refus RLS est souvent silencieux ; le mode démo cache les pannes du mode réel.

| Le changement touche… | Minimum |
|---|---|
| logique | test unitaire + `npm run verifier` |
| affichage, migration, parcours critique | `npm run verifier -- --complet` (audit d'interface 0 défaut, parcours, banc) + constat ciblé (`/sonde`) |
| SQL, policies, fonctions Edge, auth, paiement | + agent `gardien-securite` |
| devis, factures, textes légaux ou commerciaux | + agent `juriste-btp`, les DEUX générateurs de PDF |

## Autonomie

- **Livrer** sur `main` (production) est autorisé sans redemander, par `/livrer`, **si** `npm run verifier` est vert sur le commit exact, arbre propre — un garde-fou bloque le push sinon. Puis `npm run statut` (Vercel ×2 + CI) avant de dire « livré ».
- **Mise en production (D-22)** : Claude applique lui-même les migrations (connecteur Supabase) et déploie lui-même les fonctions Edge, uniquement depuis du code livré sur `main`, après le banc et la relecture `gardien-securite`, puis constate l'effet en production (requêtes de vérification, version, journaux, compte de contrôle). Cette règle prime sur les fichiers de `.claude/rules/` qui disent le contraire.
- **Jamais** : `supabase db push` ; SQL destructeur sur des données réelles sans l'accord d'Hugo dans la conversation ; saisir des identifiants, clés ou mots de passe (Hugo règle les secrets et se connecte lui-même) ; push forcé ; afficher une affirmation invérifiable (avis, statistique, « conforme », prix barré fictif, identité fictive).
- **Remonter à Hugo** : les décisions listées dans `docs/decisions.md`, tout ce qui demande un compte ou un paiement, une promesse commerciale, une action irréversible sur des données réelles.

## Outils

```bash
npm run verifier [-- --rapide | --complet]   # LA vérification (enregistrée, exigée pour livrer)
npm run parcours [-- filtre]                 # scénarios navigateur des chemins critiques (après build)
node scripts/sonde.cjs <page> <largeur> [--plan=… --script=… --capture=…]   # constater une page
node scripts/audit-ui.cjs [page] [largeur]   # défauts d'affichage mesurés → audit-ui/rapport.md
npm run banc:migrations                      # migrations sur PostgreSQL WebAssembly, vérifications d'effet
npm run migration:nouvelle -- "description"  # migration + fichier de vérifications
npm run statut [-- <sha>]                    # un commit est-il vraiment en production (Vercel + CI) ?
npm run hooks:tester                         # après toute modification des hooks
npm run dev                                  # 5173 ; sans .env = démo ; ?demo=true = données riches
```
Tests : vitest (`npm test`) ; lint : 0 erreur exigée (`no-empty`, `no-console` sont des erreurs) ; le hook git de pre-push rejoue smoke + tests + build (copie figée : `npm run setup-hooks` après modification). Jetables, captures, rapports : `audit-ui/` (ignoré).

## L'équipe (`.claude/agents/`) et les commandes (`.claude/skills/`)

Agents : `verificateur` (prouve que ça marche), `gardien-securite`, `juriste-btp`, `architecte-donnees` (migrations + banc), `ingenieur-mobile`, `redacteur-stores`, `analyste-terrain` (retours → tâches), `critique-produit` (challenge toute nouvelle fonctionnalité avant le code).
Commandes : `/debut`, `/tache`, `/verifier`, `/sonde`, `/revue`, `/migration`, `/livrer`, `/retours`, `/fin`.

## Où vit l'information

| Quoi | Où |
|---|---|
| Cap, phases, prochaines tâches | `docs/feuille-de-route.md` |
| Ce qui tourne réellement en production, ce qu'Hugo doit appliquer | `docs/etat-production.md` |
| Décisions (et celles attendues d'Hugo) | `docs/decisions.md` |
| Droit et métier BTP, sourcés | `docs/metier-btp.md` |
| Organisation, rituels, matrice de vérification | `docs/organisation.md` |
| Règles par domaine (chargées selon les fichiers touchés) | `.claude/rules/` |
| Le poste de travail d'Hugo avec Claude : ses notes (demandes, frictions, idées), ses décisions, ce qu'il a fait (avec preuve), ses démarches ; nos livraisons et l'état de la production | Pilote : `https://claude.ai/artifact/Esz8pN474Q1FDsbHDyaB1Q` — mode d'emploi `docs/pilote.md`, commande `/pilote` (lu au `/debut`, synchronisé à chaque livraison et au `/fin`) |

## Architecture en bref

React 18 + Vite 5 + Tailwind 3.4 · Supabase (Postgres + RLS, Edge Functions Deno, Storage, Paris) · Zustand · Vercel · PWA · Capacitor 8 (plateformes natives pas encore ajoutées).
- SPA sans routeur : `setPage('nom')` dans `src/App.jsx` (page persistée dans `localStorage.cp_current_page`) ; routes publiques (signature, paiement `/pay/:token`, portail, marketing) dans `src/main.jsx` — elles n'importent jamais `App.jsx` statiquement.
- Multi-tenant `user_id` + `organization_id`, RLS partout ; clé anon publique → toute policy trop large est exploitable.
- Données : `src/context/DataContext.jsx` + `src/hooks/useSupabaseSync.js` (`FIELD_MAPPINGS`) ; mode démo (`isDemo`) en `localStorage`.
- Plans `gratuit` / `artisan` / `equipe` (9,90 / 19,90 € HT, tarif fondateur) dans `src/stores/subscriptionStore.js` ; seuls le webhook Stripe et `subscription-billing` écrivent un plan payant.
- Devis/factures : DEUX générateurs de PDF (`src/lib/devisHtmlBuilder.js` et le générateur inline de `DevisPage.jsx`) ; blocs communs dans `src/lib/`.
- Téléphone et natif : `src/lib/natif.js` (`remettreFichier`, `ouvrirLienExterne`), `src/lib/urlPublique.js` pour tout lien envoyé à l'extérieur.
- Interrupteur `FONCTIONS.ia = false` (`src/lib/fonctions.js`) : IA masquée (décision D-07).

## Conventions

Français pour l'interface, les noms du domaine (`devis`, `chantier`, `client`), les documents et les outils ; anglais pour le technique et les messages de commit (`feat:`, `fix:`, `refactor:`, `test:`, `docs:`, `chore:`). Mode sombre par `isDark` + variables de thème (jamais `dark:`), accent par `couleur` en `style`, icônes `lucide-react`, erreurs par `captureException`, journalisation par `logger.debug`. Le détail est dans `.claude/rules/`.
