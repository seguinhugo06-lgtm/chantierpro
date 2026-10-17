-- 097 — Plus de secret en clair dans les tâches planifiées (tâche secrets-cron, 17 oct. 2026)
--
-- Pourquoi : relecture gardien-securite du 17 oct. 2026 (R8). La commande du job pg_cron « send-scheduled-relances-daily »
-- contient le secret partagé des relances (CRON_SECRET de la fonction send-scheduled-relances) en clair, entre dollars
-- (constaté par motif le 17 oct., sans afficher la commande) : il se lit dans cron.job, et dans cron.job_run_details à
-- chaque exécution. 061 prévoyait de le lire dans Supabase Vault (nom « cron_secret_relances »), jamais créé.
--
-- Effet, entièrement côté serveur (le secret n'est ni affiché, ni écrit dans ce fichier, ni dans un message d'erreur) :
--   1. le secret est extrait de la commande du job et rangé dans Vault sous « cron_secret_relances » (s'il y est déjà, il
--      doit être identique, sinon la migration s'arrête) ;
--   2. la commande lit désormais le secret dans Vault à chaque exécution :
--      (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'cron_secret_relances')
--   3. contrôle : la nouvelle commande ne contient plus le secret.
-- Rejouable : une commande qui lit déjà Vault n'est pas touchée. Job absent, pg_cron ou Vault absents : rien.
-- Reste : l'historique cron.job_run_details des exécutions passées contient l'ancienne commande (à purger ou à rendre
-- inutile en faisant tourner le secret, avec l'accord d'Hugo).
--
-- Vérification après application (sans afficher la commande) :
--   select command ilike '%vault.decrypted_secrets%' as lit_le_coffre,
--          command ~ 'cronSecret''\s*,\s*\$' as secret_entre_dollars
--     from cron.job where jobname = 'send-scheduled-relances-daily';     -- attendu : true, false
--   select count(*) from vault.secrets where name = 'cron_secret_relances';   -- attendu : 1
--   Puis un appel de la fonction en dry-run avec le secret du coffre : réponse 200 (et non 401) dans net._http_response.
--
-- Au passage (contre-relecture juriste-btp du 17 oct. 2026 sur 096) : commentaire de depenses.taux_tva précisé — une
-- TVA saisie sans taux (montant_tva) se déduit aussi.

DO $$
DECLARE
  CLE CONSTANT TEXT := '''cronSecret''';
  LECTURE CONSTANT TEXT := '(SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = ''cron_secret_relances'')';
  v_jobid BIGINT;
  v_cmd TEXT;
  p_cle INT;
  apres INT;
  reste TEXT;
  m TEXT[];
  tag TEXT;
  debut INT;
  debut_contenu INT;
  longueur_contenu INT;
  secret TEXT;
  existant TEXT;
  nouvelle TEXT;
BEGIN
  IF to_regnamespace('cron') IS NULL OR to_regclass('vault.decrypted_secrets') IS NULL THEN
    RAISE NOTICE 'pg_cron ou Vault absent : rien à faire';
    RETURN;
  END IF;

  SELECT jobid, command INTO v_jobid, v_cmd FROM cron.job WHERE jobname = 'send-scheduled-relances-daily';
  IF v_jobid IS NULL THEN
    RAISE NOTICE 'Job send-scheduled-relances-daily absent : rien à faire';
    RETURN;
  END IF;
  IF strpos(v_cmd, 'vault.decrypted_secrets') > 0 THEN
    RAISE NOTICE 'Le job lit déjà le secret dans Vault : rien à faire';
    RETURN;
  END IF;

  -- Le secret suit la clé 'cronSecret' de jsonb_build_object, entre dollars ($…$secret$…$)
  p_cle := strpos(v_cmd, CLE);
  IF p_cle = 0 THEN
    RAISE EXCEPTION 'Commande du job de forme inattendue (pas de clé cronSecret) : correction manuelle';
  END IF;
  apres := p_cle + length(CLE);
  reste := substr(v_cmd, apres);
  m := regexp_match(reste, '^\s*,\s*(\$[A-Za-z0-9_]*\$)');
  IF m IS NULL THEN
    RAISE EXCEPTION 'Commande du job de forme inattendue (secret non écrit entre dollars) : correction manuelle';
  END IF;
  tag := m[1];
  debut := apres - 1 + strpos(reste, tag);                    -- position du dollar ouvrant dans la commande
  debut_contenu := debut + length(tag);
  longueur_contenu := strpos(substr(v_cmd, debut_contenu), tag) - 1;
  IF longueur_contenu < 16 THEN
    RAISE EXCEPTION 'Secret du job introuvable ou trop court : correction manuelle';
  END IF;
  secret := substr(v_cmd, debut_contenu, longueur_contenu);

  SELECT decrypted_secret INTO existant FROM vault.decrypted_secrets WHERE name = 'cron_secret_relances';
  IF existant IS NOT NULL AND existant <> secret THEN
    RAISE EXCEPTION 'Vault contient déjà un autre cron_secret_relances : correction manuelle';
  END IF;

  -- La commande lit le coffre (le littéral, dollars compris, est remplacé), contrôlée avant toute écriture
  nouvelle := overlay(v_cmd PLACING LECTURE FROM debut FOR (debut_contenu + longueur_contenu + length(tag)) - debut);
  IF strpos(nouvelle, secret) > 0 OR strpos(nouvelle, LECTURE) = 0 THEN
    RAISE EXCEPTION 'Réécriture de la commande incorrecte : rien n''est modifié';
  END IF;

  -- Écritures : une erreur inattendue (Vault, pg_cron) pourrait citer la valeur dans son détail ; on la remplace par un
  -- message neutre (relecture gardien-securite du 17 oct. 2026). Le bloc DO entier est annulé.
  BEGIN
    IF existant IS NULL THEN
      PERFORM vault.create_secret(secret, 'cron_secret_relances',
        'Secret partagé du job des relances (CRON_SECRET de send-scheduled-relances), rangé par la migration 097');
    END IF;
    PERFORM cron.alter_job(v_jobid, command := nouvelle);
  EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION 'Vault ou job : écriture impossible (SQLSTATE %) : rien n''est modifié', SQLSTATE;
  END;
END $$;

DO $$
BEGIN
  IF to_regclass('public.depenses') IS NULL THEN
    RETURN;
  END IF;
  COMMENT ON COLUMN public.depenses.taux_tva IS
    'Taux de TVA porté sur la facture du fournisseur, 0 compris ; NULL = non saisi : sans montant_tva, aucune TVA déductible (CGI art. 271, D-28).';
END $$;
