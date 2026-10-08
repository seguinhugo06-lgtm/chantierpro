-- ============================================================
-- Migration 077: plafond quotidien d'envoi d'e-mails par compte
-- ============================================================
-- Pourquoi : la fonction send-email envoyait, pour tout compte connecté (même
-- gratuit, créé en une minute), le contenu et les destinataires de son choix
-- depuis noreply@mallettico.fr, sans limite (revue du 8 oct. 2026, tâche
-- [email-relais]) : hameçonnage sous notre domaine, et vrais devis classés en
-- indésirables. La fonction n'accepte plus que les clients de l'utilisateur ;
-- ce compteur borne en plus le volume, car un compte peut créer des fiches
-- clients à volonté.
-- Effet : au-delà de 50 destinataires sur 24 heures glissantes (secret
-- EMAIL_LIMITE_JOUR de la fonction), l'artisan voit « Limite de 50 e-mails par
-- 24 heures atteinte ». Les relances planifiées (clé de service) ne comptent pas.
--
-- Conception :
-- - Compteur PAR COMPTE (user_id), sans organization_id : le plafond vise un
--   compte qui abuse, pas une entreprise ; un salarié n'entame pas le plafond
--   de son patron.
-- - Aucune adresse e-mail stockée (minimisation) : seulement le nombre de
--   destinataires et l'heure. Lignes de plus de 2 jours purgées à chaque appel.
-- - Table fermée à l'API publique : RLS sans aucune policy, droits retirés à
--   anon et authenticated ; seul le rôle serveur lit et supprime.
-- - reserver_envoi_email est SECURITY DEFINER mais n'appelle pas auth.uid() :
--   elle n'est exécutable que par service_role (la fonction Edge, après avoir
--   vérifié le jeton de l'utilisateur) ; c'est le GRANT qui fait le contrôle
--   d'accès. Un utilisateur qui pourrait l'appeler épuiserait le plafond d'un
--   autre : d'où le REVOKE explicite (Supabase accorde EXECUTE par défaut).
-- - Verrou transactionnel par utilisateur : deux envois simultanés ne
--   dépassent pas le plafond.
--
-- ─── Vérification après application (éditeur SQL) ───────────────────────────
--   SELECT to_regclass('public.envois_email') IS NOT NULL AS table_ok, has_function_privilege('authenticated', 'public.reserver_envoi_email(uuid,integer,integer)', 'execute') AS ouverte_au_public, has_function_privilege('service_role', 'public.reserver_envoi_email(uuid,integer,integer)', 'execute') AS serveur, has_table_privilege('authenticated', 'public.envois_email', 'select') AS table_lisible, (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.envois_email'::regclass) AS rls;  -- table_ok t, ouverte_au_public f, serveur t, table_lisible f, rls t
--   SELECT count(*) AS envois_24h FROM public.envois_email WHERE created_at > now() - interval '24 hours';  -- après redéploiement de send-email et l'envoi d'un devis : au moins 1
-- ============================================================

CREATE TABLE IF NOT EXISTS public.envois_email (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nb_destinataires INTEGER NOT NULL CHECK (nb_destinataires BETWEEN 1 AND 50),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.envois_email IS
  'Compteur du plafond d''envoi de send-email (migration 077). Aucune adresse stockée. Accès : service_role seulement.';

CREATE INDEX IF NOT EXISTS idx_envois_email_user_created
  ON public.envois_email (user_id, created_at DESC);

ALTER TABLE public.envois_email ENABLE ROW LEVEL SECURITY;
-- Aucune policy : anon et authenticated n'y voient rien, même si un droit leur était rendu.
REVOKE ALL ON TABLE public.envois_email FROM PUBLIC, anon, authenticated;
GRANT SELECT, DELETE ON TABLE public.envois_email TO service_role;

CREATE OR REPLACE FUNCTION public.reserver_envoi_email(p_user_id UUID, p_nb INTEGER, p_limite INTEGER)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_deja INTEGER;
  v_id BIGINT;
BEGIN
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'reserver_envoi_email : utilisateur manquant';
  END IF;
  IF p_nb IS NULL OR p_nb < 1 OR p_nb > 50 THEN
    RAISE EXCEPTION 'reserver_envoi_email : nombre de destinataires invalide (%)', p_nb;
  END IF;
  IF p_limite IS NULL OR p_limite < 1 THEN
    RAISE EXCEPTION 'reserver_envoi_email : plafond invalide (%)', p_limite;
  END IF;

  -- Un seul calcul à la fois par utilisateur (relâché à la fin de la transaction).
  PERFORM pg_advisory_xact_lock(hashtextextended('envois_email:' || p_user_id::text, 0));

  DELETE FROM public.envois_email
   WHERE user_id = p_user_id AND created_at < now() - interval '2 days';

  SELECT COALESCE(SUM(nb_destinataires), 0) INTO v_deja
    FROM public.envois_email
   WHERE user_id = p_user_id AND created_at > now() - interval '24 hours';

  IF v_deja + p_nb > p_limite THEN
    RETURN NULL;
  END IF;

  INSERT INTO public.envois_email (user_id, nb_destinataires)
  VALUES (p_user_id, p_nb)
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.reserver_envoi_email(UUID, INTEGER, INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reserver_envoi_email(UUID, INTEGER, INTEGER) TO service_role;
