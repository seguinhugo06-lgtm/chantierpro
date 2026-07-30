-- ============================================================
-- Migration 070: fiabiliser le cron des relances
-- ============================================================
-- CONSTAT (30 juil. 2026) : le job `send-scheduled-relances-daily` tournait
-- tous les jours depuis le 22 juil. avec le statut `succeeded` dans
-- cron.job_run_details… alors qu'AUCUN appel n'aboutissait :
--
--     net._http_response → status_code NULL,
--     error_msg = « Timeout of 5000 ms reached »
--
-- `succeeded` côté pg_cron signifie seulement « la requête a été mise en
-- file » — pg_net est asynchrone. La vérité est dans net._http_response.
--
-- DEUX CAUSES, DEUX CORRECTIFS :
--
--   1. Le timeout par défaut de pg_net est de 5 s. La fonction Edge fait un
--      cold start puis parcourt les entreprises en série (4 requêtes chacune,
--      puis un envoi d'email par relance) : elle ne peut pas répondre en 5 s,
--      et encore moins le jour où `autoSend` passera à ON.
--      → on relève le timeout à 60 s sur le job existant.
--
--   2. Rien ne gardait trace des exécutions. Une panne pouvait durer des
--      semaines sans le moindre signal.
--      → table `relance_cron_runs` : une ligne par exécution, écrite par la
--        fonction elle-même (succès comme erreur).
-- ============================================================

-- 1. Journal des exécutions du cron -----------------------------------------

CREATE TABLE IF NOT EXISTS relance_cron_runs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  ran_at TIMESTAMPTZ DEFAULT now(),
  dry_run BOOLEAN DEFAULT true,
  duration_ms INTEGER,
  entreprises_scanned INTEGER DEFAULT 0,
  entreprises_enabled INTEGER DEFAULT 0,
  entreprises_auto_send INTEGER DEFAULT 0,
  total_due INTEGER DEFAULT 0,
  sent INTEGER DEFAULT 0,
  failed INTEGER DEFAULT 0,
  skipped_autosend_off INTEGER DEFAULT 0,
  error TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Table d'exploitation : elle agrège TOUTES les entreprises, donc aucun
-- artisan ne doit pouvoir la lire. RLS active sans policy = seul le rôle
-- service (la fonction Edge) y accède.
ALTER TABLE relance_cron_runs ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_relance_cron_runs_ran_at ON relance_cron_runs(ran_at DESC);

-- 2. Relever le timeout du job existant --------------------------------------
-- On ne réécrit PAS la commande : le secret y est inliné (le job de prod a été
-- installé une fois via une fonction admin). On se contente d'insérer le
-- paramètre `timeout_milliseconds` avant la parenthèse fermante, en place.

DO $$
DECLARE
  v_jobid  BIGINT;
  v_cmd    TEXT;
BEGIN
  SELECT jobid, command INTO v_jobid, v_cmd
    FROM cron.job WHERE jobname = 'send-scheduled-relances-daily';

  IF v_jobid IS NULL THEN
    RAISE NOTICE 'Job send-scheduled-relances-daily absent — rien à corriger.';
    RETURN;
  END IF;

  IF v_cmd ILIKE '%timeout_milliseconds%' THEN
    RAISE NOTICE 'Timeout déjà configuré — aucune modification.';
    RETURN;
  END IF;

  -- `net.http_post(...)` se termine par « ); » : on insère l'argument juste
  -- avant. Découpe littérale plutôt que regexp — et si la forme n'est pas
  -- celle attendue, on échoue bruyamment au lieu de mutiler la commande.
  v_cmd := btrim(v_cmd);
  IF right(v_cmd, 2) <> ');' THEN
    RAISE EXCEPTION 'Commande cron de forme inattendue — correction manuelle requise.';
  END IF;

  v_cmd := left(v_cmd, length(v_cmd) - 2) || ', timeout_milliseconds := 60000);';

  PERFORM cron.alter_job(v_jobid, command := v_cmd);
  RAISE NOTICE 'Timeout du cron relances porté à 60 s.';
END $$;

-- ============================================================
-- Contrôle après coup (le seul qui prouve quoi que ce soit) :
--
--   select ran_at, dry_run, duration_ms, entreprises_auto_send, sent, failed, error
--     from relance_cron_runs order by ran_at desc limit 10;
--
-- Et côté transport :
--   select created, status_code, error_msg from net._http_response
--    order by created desc limit 5;
-- ============================================================
