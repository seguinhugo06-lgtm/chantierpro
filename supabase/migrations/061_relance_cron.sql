-- ============================================================
-- Migration 061: Cron quotidien des relances automatiques
-- ============================================================
-- Programme un appel quotidien (08:00 heure serveur) à la fonction Edge
-- `send-scheduled-relances` avec dryRun=false. La fonction n'envoie réellement
-- que pour les entreprises ayant `relance_config.autoSend = true` (OFF par
-- défaut) → activer le cron ne déclenche AUCUN envoi tant qu'aucun artisan n'a
-- basculé son interrupteur « Envoi 100 % automatique ».
--
-- Le secret partagé est lu depuis Supabase Vault (name = 'cron_secret_relances').
-- À créer UNE FOIS (même valeur que le secret Edge CRON_SECRET) :
--     select vault.create_secret('<CRON_SECRET>', 'cron_secret_relances');
-- ============================================================

-- NB : en prod le job est DÉJÀ programmé (installé une fois via une fonction Edge
-- admin qui a inliné le secret). Cette migration est donc « set up si absent » :
-- elle ne reprogramme PAS un job existant (pour ne pas écraser la version live),
-- et sert au provisioning d'un environnement neuf (là, le secret vient du Vault :
--     select vault.create_secret('<CRON_SECRET>', 'cron_secret_relances');).

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'send-scheduled-relances-daily') THEN
    PERFORM cron.schedule(
      'send-scheduled-relances-daily',
      '0 8 * * *',
      $cron$
      SELECT net.http_post(
        url     := 'https://kofsbgxkrmryfetevetn.supabase.co/functions/v1/send-scheduled-relances',
        headers := '{"Content-Type":"application/json"}'::jsonb,
        body    := jsonb_build_object(
          'dryRun', false,
          'cronSecret', COALESCE(
            (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'cron_secret_relances'),
            ''
          )
        )
      );
      $cron$
    );
  END IF;
END $$;

-- Pour désactiver : SELECT cron.unschedule('send-scheduled-relances-daily');
