-- ============================================================
-- Migration 095: alerte si un accusé de rétractation attend
-- ============================================================
-- Pourquoi : tâche accuse-alerte (relectures juriste-btp et gardien-securite du 17 oct. 2026). L'accusé de réception
-- d'une rétractation en ligne est dû « sans délai » (C. conso. D221-5) ; le serveur le renvoie toutes les 10 minutes
-- (089, essais espacés sur 7 h) et prévient l'artisan au dernier essai en échec (notify-signature v17). Rien ne
-- prévenait l'exploitant si le mécanisme lui-même tombe (job arrêté, fonction en panne, Resend indisponible).
-- Effet :
--   1. accuses_sante() : les rétractations reçues depuis plus d'une heure (et moins de 7 jours) toujours sans accusé ;
--      réservée au serveur.
--   2. Job pg_cron « alerte-accuses-horaire » (à la 5e minute de chaque heure) : n'appelle la fonction Edge
--      alerte-relances que si accuses_sante() signale un problème ; la fonction refait le contrôle, réserve l'envoi
--      (reserver_alerte, sujet « accuses » : un e-mail par 20 h au plus) et écrit à l'adresse de l'exploitant.
-- Ordre de mise en production (relecture gardien-securite du 17 oct. 2026) : déployer alerte-relances v2, SANS
-- vérification de jeton, AVANT d'appliquer 095 — sinon le job horaire appelle la v1, qui ne contrôle que les relances
-- et répond 200 : l'alerte des accusés n'existerait pas (panne silencieuse).
--
-- ─── Vérification après application (éditeur SQL) ───────────────────────────
--   1) SELECT * FROM public.accuses_sante();        attendu : alerte f (aucune rétractation en attente)
--   2) SELECT count(*) FROM cron.job WHERE jobname = 'alerte-accuses-horaire' AND schedule = '5 * * * *';   attendu : 1
--   3) SELECT has_function_privilege('authenticated', 'public.accuses_sante(timestamptz)', 'EXECUTE')
--        OR has_function_privilege('anon', 'public.accuses_sante(timestamptz)', 'EXECUTE');   attendu : f
-- ============================================================

-- 1. Rétractations sans accusé depuis plus d'une heure. p_maintenant sert aux vérifications.
CREATE OR REPLACE FUNCTION public.accuses_sante(p_maintenant TIMESTAMPTZ DEFAULT now())
RETURNS TABLE (alerte BOOLEAN, raison TEXT, nombre INTEGER)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_nombre INTEGER;
  v_plus_ancienne TIMESTAMPTZ;
BEGIN
  SELECT count(*), min(d.retractation_le) INTO v_nombre, v_plus_ancienne
  FROM public.devis d
  WHERE d.retractation_le IS NOT NULL
    AND d.retractation_accuse_le IS NULL
    AND d.retractation_le < p_maintenant - interval '1 hour'
    AND d.retractation_le > p_maintenant - interval '7 days';
  IF v_nombre = 0 THEN
    RETURN QUERY SELECT false, NULL::text, 0;
    RETURN;
  END IF;
  RETURN QUERY SELECT true,
    format('%s rétractation(s) reçue(s) en ligne attendent leur accusé de réception depuis plus d''une heure (la plus ancienne le %s, heure de Paris). L''accusé est dû sans délai (C. conso. D221-5).',
           v_nombre, to_char(v_plus_ancienne AT TIME ZONE 'Europe/Paris', 'DD/MM/YYYY à HH24:MI')),
    v_nombre;
END;
$$;
REVOKE ALL ON FUNCTION public.accuses_sante(TIMESTAMPTZ) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.accuses_sante(TIMESTAMPTZ) TO service_role;

-- 2. Le job horaire : n'appelle la fonction Edge que si un accusé attend. Pas de secret dans la commande.
DO $$
BEGIN
  IF to_regnamespace('cron') IS NULL OR to_regnamespace('net') IS NULL THEN
    RAISE NOTICE 'pg_cron ou pg_net absent : job alerte-accuses-horaire non planifié';
    RETURN;
  END IF;
  PERFORM cron.schedule('alerte-accuses-horaire', '5 * * * *', $job$
    SELECT net.http_post(
      url := 'https://kofsbgxkrmryfetevetn.supabase.co/functions/v1/alerte-relances',
      headers := '{"Content-Type":"application/json"}'::jsonb,
      body := '{}'::jsonb,
      timeout_milliseconds := 60000)
    FROM public.accuses_sante() s
    WHERE s.alerte
  $job$);
END;
$$;

NOTIFY pgrst, 'reload schema';
