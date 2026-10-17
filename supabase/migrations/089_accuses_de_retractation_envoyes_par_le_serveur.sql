-- ============================================================
-- Migration 089: accusés de rétractation envoyés par le serveur
-- ============================================================
-- Pourquoi : l'accusé de réception d'une rétractation en ligne (C. conso. D221-5, « dans un délai
-- raisonnable ») part quand la page du client appelle notify-signature, juste après « Confirmer la
-- rétractation ». Si la page se ferme avant (réseau coupé, onglet fermé), rien ne part, et l'artisan
-- lit « pas encore envoyé » sans pouvoir agir (relecture juriste-btp du 12 oct. 2026, tâche
-- accuse-serveur de docs/feuille-de-route.md).
-- Effet : toutes les 10 minutes, un job reprend les rétractations encore sans accusé et rappelle
-- notify-signature pour chacune ; essais espacés (5 min, 15 min, 45 min, 2 h 15, 6 h 45 après la
-- rétractation : une panne de Resend ou un plafond d'envois atteint ne les brûle pas d'un coup), au
-- plus 5 par devis, pendant 7 jours, au plus 2 devis par compte et 10 en tout par passage (un compte
-- ne monopolise pas le rattrapage). notify-signature ne renvoie jamais un accusé déjà parti
-- (réservation de retractation_accuse_le). Côté app, l'artisan a en plus un bouton « Envoyer l'accusé ».
-- Le compteur d'essais n'est tenu que par le serveur : un artisan qui le remettait à zéro ou en
-- négatif faisait passer ses devis devant ceux des autres à chaque passage (relecture
-- gardien-securite du 17 oct. 2026).
-- Ordre en production : déployer notify-signature SANS vérification de jeton (--no-verify-jwt,
-- verify_jwt: false au connecteur) AVANT d'appliquer 089 : le job n'envoie pas de jeton, et chaque
-- 401 brûlerait un essai. La fonction s'appuie sur la possession du lien de signature, pas sur la
-- clé publique.
--
-- ─── Vérification après application (éditeur SQL) ───────────────────────────
--   1) SELECT jobname, schedule, active FROM cron.job WHERE jobname = 'accuses-retractation';
--      attendu : accuses-retractation | */10 * * * * | t
--   2) SELECT has_function_privilege('authenticated', 'public.accuses_retractation_a_relancer(integer)', 'EXECUTE')
--        OR has_function_privilege('anon', 'public.accuses_retractation_a_relancer(integer)', 'EXECUTE');   attendu : f
--   4) SELECT (SELECT count(*) FROM pg_trigger WHERE tgrelid = 'public.devis'::regclass AND tgname = 'trg_garder_essais_accuse')
--        + (SELECT count(*) FROM pg_constraint WHERE conname = 'devis_retractation_accuse_essais_borne');   attendu : 2
--   3) SELECT count(*) FROM public.devis WHERE retractation_le IS NOT NULL AND retractation_accuse_le IS NULL;
--      attendu : 0 une heure après l'application (sauf adresse invalide : voir les journaux de notify-signature)
-- ============================================================

-- 1. Nombre d'essais du serveur (borne les rappels si l'envoi échoue toujours, adresse invalide…)
ALTER TABLE public.devis ADD COLUMN IF NOT EXISTS retractation_accuse_essais SMALLINT NOT NULL DEFAULT 0;
ALTER TABLE public.devis DROP CONSTRAINT IF EXISTS devis_retractation_accuse_essais_borne;
ALTER TABLE public.devis ADD CONSTRAINT devis_retractation_accuse_essais_borne CHECK (retractation_accuse_essais BETWEEN 0 AND 100);

-- Le compteur n'est tenu que par le serveur (ni l'app ni un visiteur ne l'écrivent)
CREATE OR REPLACE FUNCTION public.garder_essais_accuse()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  IF current_user IN ('authenticated', 'anon') AND (
       (TG_OP = 'INSERT' AND NEW.retractation_accuse_essais <> 0)
    OR (TG_OP = 'UPDATE' AND NEW.retractation_accuse_essais IS DISTINCT FROM OLD.retractation_accuse_essais)) THEN
    RAISE EXCEPTION 'Le compteur d''essais de l''accusé n''est tenu que par le serveur';
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.garder_essais_accuse() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS trg_garder_essais_accuse ON public.devis;
CREATE TRIGGER trg_garder_essais_accuse
  BEFORE INSERT OR UPDATE OF retractation_accuse_essais ON public.devis
  FOR EACH ROW EXECUTE FUNCTION public.garder_essais_accuse();

-- 2. Les accusés à relancer : réserve un essai pour chacun et rend les jetons des liens de signature.
--    Interne : appelée par le job, jamais par un client.
CREATE OR REPLACE FUNCTION public.accuses_retractation_a_relancer(p_limite INTEGER DEFAULT 10)
RETURNS SETOF UUID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  UPDATE public.devis d
  SET retractation_accuse_essais = d.retractation_accuse_essais + 1
  WHERE d.id IN (
    SELECT c.id FROM (
      SELECT x.id, x.retractation_accuse_essais AS essais, x.retractation_le,
             row_number() OVER (PARTITION BY x.user_id ORDER BY x.retractation_accuse_essais, x.retractation_le) AS rang
      FROM public.devis x
      WHERE x.retractation_le IS NOT NULL
        AND x.retractation_accuse_le IS NULL
        AND x.signature_token IS NOT NULL
        AND x.retractation_le > now() - interval '7 days'
        AND x.retractation_accuse_essais < 5
        -- essais espacés : 5 min, 15 min, 45 min, 2 h 15, 6 h 45 après la rétractation
        AND x.retractation_le < now() - interval '5 minutes' * power(3, x.retractation_accuse_essais)
    ) c
    WHERE c.rang <= 2  -- au plus 2 devis par compte et par passage
    ORDER BY c.essais, c.retractation_le  -- les moins essayés d'abord : aucun n'attend derrière les autres
    LIMIT greatest(1, least(coalesce(p_limite, 10), 50))
  )
  RETURNING d.signature_token
$$;
REVOKE ALL ON FUNCTION public.accuses_retractation_a_relancer(INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.accuses_retractation_a_relancer(INTEGER) TO service_role;

-- 3. Le job : un appel à notify-signature par accusé en attente.
DO $$
BEGIN
  IF to_regnamespace('cron') IS NULL OR to_regnamespace('net') IS NULL THEN
    RAISE NOTICE 'pg_cron ou pg_net absent : job accuses-retractation non planifié';
    RETURN;
  END IF;
  PERFORM cron.schedule('accuses-retractation', '*/10 * * * *', $job$
    SELECT net.http_post(
      url := 'https://kofsbgxkrmryfetevetn.supabase.co/functions/v1/notify-signature',
      headers := '{"Content-Type":"application/json"}'::jsonb,
      body := jsonb_build_object('token', t, 'evenement', 'retractation'),
      timeout_milliseconds := 60000)
    FROM public.accuses_retractation_a_relancer(10) t
  $job$);
END;
$$;

NOTIFY pgrst, 'reload schema';
