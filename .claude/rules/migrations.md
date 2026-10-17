---
paths:
  - "supabase/migrations/**"
  - "scripts/banc/**"
  - "scripts/banc-migrations.mjs"
  - "scripts/nouvelle-migration.mjs"
---

# Migrations SQL

- **Jamais appliquées par Claude** (ni `supabase db push`, ni SQL en production) : Hugo les applique dans l'éditeur SQL. Le garde-fou bloque `db push` / `db reset`.
- Créer : `npm run migration:nouvelle -- "description"` → `supabase/migrations/NNN_….sql` + `scripts/banc/NNN.mjs`.
- Contenu obligatoire : en-tête (pourquoi, effet, **requête de vérification après application**), SQL **idempotent** (`IF NOT EXISTS`, `DROP … IF EXISTS`, `CREATE OR REPLACE`, blocs `DO` gardés par `to_regclass`), RLS activé sur toute nouvelle table, `user_id` + `organization_id`, index.
- La production ne correspond pas exactement au dépôt : se protéger (`to_regclass`, `information_schema`, `to_jsonb(ligne)->>'colonne'` pour lire une colonne peut-être absente).
- **Vérifier l'effet au banc** (`npm run banc:migrations`, PostgreSQL WebAssembly) : se faire passer pour un utilisateur (`en(uid, …)`) ou un visiteur (`commeAnonyme(…)`) et constater ce qu'il peut / ne peut pas faire. Une migration sans vérifications fait échouer le banc. Le socle (`scripts/banc/socle.mjs`) simule la production d'avant 071 : y ajouter toute table de production dont dépend la migration.
- `SECURITY DEFINER` : `SET search_path = public, pg_temp`, vérifier `auth.uid()`, `REVOKE … FROM PUBLIC, anon`, `GRANT EXECUTE … TO authenticated`.
- Depuis 092 (17 oct. 2026), une fonction créée dans `public` n'est plus exécutable par un visiteur par défaut : une page publique (signature, paiement, invitation) qui en a besoin écrit `GRANT EXECUTE … TO anon`, et l'ajoute à la liste des fonctions publiques de `scripts/banc/092.mjs`. Une fonction à identifiant libre (`p_user_id`) n'est exécutable que par le serveur, ou ne répond que pour `auth.uid()`. Une fonction créée par `postgres` hors de `public` n'est exécutable que par lui : accorder explicitement ses droits (une policy qui l'appellerait échouerait en « permission denied »). Un hook d'authentification demandera un `GRANT EXECUTE … TO supabase_auth_admin`.
- Une policy `USING (true)` sans `TO service_role` ouvre la table à tout Internet (la clé anon est publique). Le rôle de service n'a pas besoin de policy.
- Après écriture : ajouter la migration à « En attente côté Hugo » dans `docs/etat-production.md`, et produire le fichier SQL à coller (tous les blocs en attente, dans l'ordre).
- 45 migrations (023-054) ont été effacées du dépôt par `227534e` : `git show 227534e^:supabase/migrations/<fichier>` pour retrouver un schéma.
