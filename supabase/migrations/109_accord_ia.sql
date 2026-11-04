-- ============================================================
-- Migration 109: accord de l'artisan avant sa première dictée (IA)
-- ============================================================
-- Pourquoi : la dictée envoie le texte dicté, les noms des clients et les libellés du catalogue à Anthropic. Apple
-- (App Review Guidelines 5.1.2(i)) demande un accord explicite avant de partager des données personnelles avec une IA
-- tierce ; le règlement (UE) 2024/1689 (art. 50 § 1 et § 5) demande d'informer au plus tard à la première interaction.
-- Décision d'Hugo du 4 nov. 2026 : un écran d'accord au premier « Dicter » (texte de juriste-btp du 3 nov. 2026),
-- l'accord enregistré (compte, date, version du texte), révocable dans les Paramètres.
-- Effet : une ligne par accord donné. Rien ne s'efface : retirer son accord pose la date du retrait (preuve de ce qui a été
-- accepté, et quand). Un seul accord en cours par compte et par fonction. La fonction Edge voice-intent refuse une
-- dictée sans accord en cours à la version attendue (code ACCORD_REQUIS).
--
-- Droits (relecture gardien-securite) :
-- - RLS : chacun ne lit, ne crée et ne retire que SON accord (user_id = auth.uid()) ; aucune policy pour anon.
-- - GRANT explicites, par colonne : un utilisateur connecté ne choisit que la version (INSERT (version)) et ne modifie que
--   la date du retrait (UPDATE (revoque_le)) ; l'identifiant (auth.uid() par défaut, vérifié par la policy), la fonction
--   ('dictee') et la date de l'accord (now() du serveur) ne viennent pas du navigateur. Pas de DELETE.
-- - Au plus 10 accords donnés par compte et par jour (déclencheur BEFORE INSERT) : pas de remplissage en boucle.
-- - Un déclencheur fixe la date du retrait à now() (serveur), et refuse de « dé-retirer » un accord ou de modifier
--   autre chose (même pour le serveur) : un accord retiré le reste, on en donne un nouveau.
-- - service_role : lecture SEULE (la fonction Edge vérifie l'accord avec la clé de service, après le jeton de l'utilisateur).
-- - À la suppression d'un compte, ses accords sont effacés (ON DELETE CASCADE), comme le reste de ses données.
--
-- ─── Vérification après application (éditeur SQL) ───────────────────────────
--   SELECT relrowsecurity FROM pg_class WHERE oid = 'public.accords_ia'::regclass;                       → t
--   SELECT policyname, cmd, roles FROM pg_policies WHERE schemaname = 'public' AND tablename = 'accords_ia' ORDER BY 1;
--     → 3 lignes : accords_ia_insert (INSERT), accords_ia_select (SELECT), accords_ia_update (UPDATE), toutes {authenticated}
--   SELECT has_table_privilege('anon', 'public.accords_ia', 'SELECT,INSERT,UPDATE,DELETE') AS visiteur,
--          has_table_privilege('authenticated', 'public.accords_ia', 'DELETE') AS efface,
--          has_column_privilege('authenticated', 'public.accords_ia', 'accepte_le', 'INSERT') AS date_choisie,
--          has_column_privilege('authenticated', 'public.accords_ia', 'version', 'INSERT') AS version,
--          has_table_privilege('service_role', 'public.accords_ia', 'SELECT') AS serveur,
--          has_table_privilege('service_role', 'public.accords_ia', 'INSERT,UPDATE,DELETE') AS serveur_ecrit;
--     → f, f, f, t, t, f
--   SELECT count(*) FROM public.accords_ia;   → 0 juste après l'application
-- ============================================================

CREATE TABLE IF NOT EXISTS public.accords_ia (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  fonction TEXT NOT NULL DEFAULT 'dictee' CHECK (fonction ~ '^[a-z][a-z_]{1,30}$'),
  version TEXT NOT NULL CHECK (version ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}[a-z0-9-]{0,20}$'),
  accepte_le TIMESTAMPTZ NOT NULL DEFAULT now(),
  revoque_le TIMESTAMPTZ
);
COMMENT ON TABLE public.accords_ia IS
  'Accord de l''artisan avant sa première dictée par IA (migration 109) : compte, date, version du texte accepté, date du retrait. Rien ne s''efface (sauf avec le compte).';
-- Un seul accord en cours par compte et par fonction.
CREATE UNIQUE INDEX IF NOT EXISTS idx_accords_ia_en_cours ON public.accords_ia (user_id, fonction) WHERE revoque_le IS NULL;
CREATE INDEX IF NOT EXISTS idx_accords_ia_user ON public.accords_ia (user_id);

ALTER TABLE public.accords_ia ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS accords_ia_select ON public.accords_ia;
CREATE POLICY accords_ia_select ON public.accords_ia FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));
DROP POLICY IF EXISTS accords_ia_insert ON public.accords_ia;
CREATE POLICY accords_ia_insert ON public.accords_ia FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()) AND revoque_le IS NULL);
DROP POLICY IF EXISTS accords_ia_update ON public.accords_ia;
CREATE POLICY accords_ia_update ON public.accords_ia FOR UPDATE TO authenticated
  USING (user_id = (SELECT auth.uid())) WITH CHECK (user_id = (SELECT auth.uid()));

-- service_role aussi : les droits par défaut de Supabase lui donnent tout sur une table neuve ; il ne fait que lire
-- (relecture gardien-securite du 4 nov. 2026, B1 : sinon il pourrait effacer une preuve ou insérer un accord antidaté).
REVOKE ALL ON TABLE public.accords_ia FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT ON TABLE public.accords_ia TO authenticated;
GRANT INSERT (version) ON TABLE public.accords_ia TO authenticated;
GRANT UPDATE (revoque_le) ON TABLE public.accords_ia TO authenticated;
GRANT SELECT ON TABLE public.accords_ia TO service_role;

-- La date du retrait est celle du serveur ; un accord retiré ne revient pas ; rien d'autre ne change.
CREATE OR REPLACE FUNCTION public.accords_ia_retrait()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  IF OLD.revoque_le IS NOT NULL THEN
    RAISE EXCEPTION 'accords_ia : accord déjà retiré (en donner un nouveau)';
  END IF;
  IF NEW.user_id IS DISTINCT FROM OLD.user_id OR NEW.fonction IS DISTINCT FROM OLD.fonction
     OR NEW.version IS DISTINCT FROM OLD.version OR NEW.accepte_le IS DISTINCT FROM OLD.accepte_le THEN
    RAISE EXCEPTION 'accords_ia : seul le retrait se modifie';
  END IF;
  IF NEW.revoque_le IS NOT NULL THEN
    NEW.revoque_le := now();
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.accords_ia_retrait() FROM PUBLIC, anon, authenticated;

-- Au plus 10 accords donnés par compte et par jour (relecture gardien-securite du 4 nov. 2026, M1) : sans borne, une boucle
-- « accepter, retirer » remplissait la table de lignes qui ne s'effacent jamais. Sous RLS, le compte ne voit que ses
-- lignes : ce sont justement elles qu'on compte (pas besoin de SECURITY DEFINER).
CREATE OR REPLACE FUNCTION public.accords_ia_borne()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  IF (SELECT count(*) FROM public.accords_ia WHERE user_id = NEW.user_id AND accepte_le > now() - interval '1 day') >= 10 THEN
    RAISE EXCEPTION 'accords_ia : trop d''accords aujourd''hui';
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.accords_ia_borne() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS accords_ia_borne ON public.accords_ia;
CREATE TRIGGER accords_ia_borne BEFORE INSERT ON public.accords_ia
  FOR EACH ROW EXECUTE FUNCTION public.accords_ia_borne();

DROP TRIGGER IF EXISTS accords_ia_retrait ON public.accords_ia;
CREATE TRIGGER accords_ia_retrait BEFORE UPDATE ON public.accords_ia
  FOR EACH ROW EXECUTE FUNCTION public.accords_ia_retrait();
