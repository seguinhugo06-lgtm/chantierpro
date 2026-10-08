---
paths:
  - "src/hooks/**"
  - "src/services/**"
  - "src/context/**"
  - "src/supabaseClient.js"
  - "src/lib/queryHelper.js"
  - "src/lib/offline/**"
---

# Données et Supabase (côté app)

- **supabase-js ne lève pas** sur une erreur PostgREST : tester `error` à CHAQUE appel. Un `{ data: null }` affiché comme une liste vide est la « panne verte » type de ce projet.
- Une colonne inexistante dans un `select` fait échouer TOUTE la requête ; une table absente renvoie `42P01` / `PGRST205`. Distinguer « schéma pas encore appliqué » (silencieux pour l'utilisateur, `captureException`) de « panne » (réseau, droits : la dire à l'utilisateur, garder les données déjà affichées). Modèle : `detecterEchecsChargement` dans `useSupabaseSync.js`, bandeau `loadError` dans `App.jsx`.
- Un `remove` / `update` refusé par une policy RLS ne renvoie souvent AUCUNE erreur : relire après coup quand c'est important (modèle : `viderDossier` dans `services/suppressionCompte.js`).
- Mapping base ↔ JS : `fromSupabase()` / `toSupabase()` (`FIELD_MAPPINGS`, `useSupabaseSync.js`). JSON : `stringify` à l'écriture, `parse` à la lecture.
- Multi-tenant : `user_id` + `organization_id` ; `scopeToOrg()` pour les lectures.
- **Mode démo** (`isDemo`) : chaque service a son repli `localStorage`. Piège : un module qui marche en démo peut casser en réel → le vérifier avec un parcours `reel: true` (`scripts/parcours/`), qui simule Supabase.
- Abonnements : l'app ne peut que LIRE un plan payant (`fetchSubscription` → `choisirAbonnement` + `appliquerFinOffre`). Seuls le webhook Stripe et `subscription-billing` (clé de service) l'écrivent.
- Erreurs : `captureException()` (`src/lib/sentry.js`) ; jamais de `catch` vide ; `logger.debug`, jamais `console.log`.
- Liens envoyés à l'extérieur (signature, paiement, portail, retours d'e-mail) : `urlPublique()` (`src/lib/urlPublique.js`), jamais `window.location.origin` (vaut `localhost` dans l'app native).
