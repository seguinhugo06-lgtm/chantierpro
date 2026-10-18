-- ============================================================
-- Migration 101: le numéro d'une facture ou d'un avoir est attribué par la base (tâche numerotation-base, 18 oct. 2026)
-- ============================================================
-- Pourquoi : constaté le 18 oct. 2026 (lot factures-double). La fonction fn_next_document_number qu'appelait l'app
-- n'existe pas en production : l'app numérote elle-même (plus grand numéro connu + 1, curseur en mémoire). Deux appareils
-- qui créent une facture en même temps tirent le même numéro (depuis 098, la base refuse le second : « rechargez la
-- page ») ; un numéro demandé pour un formulaire abandonné est sauté (curseur en mémoire) : la séquence a un trou ; un
-- salarié calcule le suivant sur ses seules factures. Numérotation : « numéro unique basé sur une séquence chronologique
-- et continue » (CGI ann. II art. 242 nonies A, I, 7°). Relecture gardien-securite du 18 oct. 2026 (lot 099) : une
-- facture ou un avoir émis sans numéro passait par l'API.
-- Relevé du 18 oct. 2026 : 16 factures, toutes au format FAC-AAAA-NNNNN, séquences continues (1 à 14, 1 à 2), aucune
-- émise sans numéro, aucun avoir. Rien à reprendre.
--
-- Effet, pour un compte connecté (le serveur, les fonctions SECURITY DEFINER et le jeu de démonstration gardent leurs
-- numéros) : quand une facture ou un avoir reçoit son numéro — création numérotée, premier numéro posé sur un
-- brouillon, émission sans numéro —, la base le fixe : préfixe proposé par l'app (FAC, AV… ; sinon FAC, ou AV pour un
-- avoir), année en cours à Paris, et le numéro qui suit le plus grand de la même série (organisation, entreprise,
-- préfixe, année), sur 5 chiffres. Le calcul se fait sous verrou (pg_advisory_xact_lock) dans la transaction de
-- l'enregistrement : deux créations simultanées reçoivent deux numéros consécutifs ; rien n'est réservé à l'avance, donc
-- pas de trou si l'enregistrement échoue. L'app reprend le numéro de la ligne enregistrée. Un numéro proposé hors du
-- format de l'app (PRÉFIXE-AAAA-NNNNN : import, saisie libre par l'API) est gardé tel quel (unicité : 098). Un numéro déjà attribué ne
-- change plus (093). Un devis n'est pas concerné. Fonctionne pour une numérotation à la création comme à l'envoi
-- (Q-numero-a-l-envoi).
--
-- ─── Vérification après application (éditeur SQL) ───────────────────────────
--   select tgtype from pg_trigger where tgrelid = 'public.devis'::regclass and tgname = 'trg_suivre_numerotation';
--     attendu : 23
--   select has_function_privilege('anon', 'public.dernier_numero_facture(uuid, uuid, text, integer)', 'execute');  -- false
--   select count(*) from devis where type = 'facture' and statut <> 'brouillon' and nullif(numero, '') is null;       -- 0
-- ============================================================

-- Plus grand numéro d'une série, vu par la base entière (un rôle restreint ne voit peut-être pas toutes les factures
-- de son organisation), pour un membre de l'organisation seulement
CREATE OR REPLACE FUNCTION public.dernier_numero_facture(p_org UUID, p_entreprise UUID, p_prefixe TEXT, p_annee INTEGER)
RETURNS INTEGER
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_motif TEXT;
BEGIN
  IF auth.uid() IS NOT NULL AND p_org IS NOT NULL
     AND NOT (p_org = ANY (COALESCE(public.user_org_ids(auth.uid()), ARRAY[]::UUID[]))) THEN
    RAISE EXCEPTION 'Organisation interdite' USING ERRCODE = '42501';
  END IF;
  IF p_prefixe !~ '^[A-Z]{1,10}$' THEN
    RAISE EXCEPTION 'Préfixe de numérotation invalide' USING ERRCODE = '22023';
  END IF;
  v_motif := '^' || p_prefixe || '-' || p_annee || '-(\d{1,9})$';
  RETURN COALESCE((
    SELECT MAX(substring(numero FROM v_motif)::INTEGER)
      FROM public.devis
     WHERE type = 'facture'
       AND organization_id IS NOT DISTINCT FROM p_org
       AND (p_org IS NOT NULL OR user_id = auth.uid())
       AND COALESCE(entreprise_id, '00000000-0000-0000-0000-000000000000'::uuid)
           = COALESCE(p_entreprise, '00000000-0000-0000-0000-000000000000'::uuid)
       AND numero ~ v_motif), 0);
END;
$$;
REVOKE ALL ON FUNCTION public.dernier_numero_facture(UUID, UUID, TEXT, INTEGER) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.dernier_numero_facture(UUID, UUID, TEXT, INTEGER) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.suivre_numerotation()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
  v_prefixe TEXT;
  v_annee INTEGER;
BEGIN
  IF current_user NOT IN ('authenticated', 'anon') THEN
    RETURN NEW;
  END IF;
  IF NEW.type IS DISTINCT FROM 'facture' THEN
    RETURN NEW;
  END IF;
  -- Phase INSERT d'un upsert sur une ligne existante : la phase UPDATE décidera avec la ligne enregistrée
  IF TG_OP = 'INSERT' AND EXISTS (SELECT 1 FROM public.devis WHERE id = NEW.id) THEN
    RETURN NEW;
  END IF;
  -- Déjà numérotée : le numéro ne change plus (093 refuse de le modifier)
  IF TG_OP = 'UPDATE' AND OLD.type = 'facture' AND NULLIF(btrim(OLD.numero), '') IS NOT NULL THEN
    RETURN NEW;
  END IF;
  -- Brouillon sans numéro : rien à attribuer (l'app numérote à la création ; Q-numero-a-l-envoi)
  IF NULLIF(btrim(NEW.numero), '') IS NULL AND COALESCE(NEW.statut, '') = 'brouillon' THEN
    RETURN NEW;
  END IF;
  -- Numéro hors du format de l'app (import, saisie libre) : gardé tel quel, son unicité reste garantie (098)
  IF NULLIF(btrim(NEW.numero), '') IS NOT NULL AND btrim(NEW.numero) !~ '^[A-Z]{1,10}-\d{4}-\d{1,9}$' THEN
    RETURN NEW;
  END IF;

  v_prefixe := substring(btrim(COALESCE(NEW.numero, '')) FROM '^([A-Z]{1,10})-');
  IF v_prefixe IS NULL OR v_prefixe = 'DEV' THEN
    v_prefixe := CASE WHEN NEW.facture_type = 'avoir' THEN 'AV' ELSE 'FAC' END;
  END IF;
  v_annee := extract(year FROM (now() AT TIME ZONE 'Europe/Paris'))::INTEGER;
  -- Une attribution à la fois par série ; la suivante attend la fin de la transaction, puis voit le numéro pris (en
  -- READ COMMITTED, chaque instruction PL/pgSQL relit la base après le verrou)
  PERFORM pg_advisory_xact_lock(hashtextextended('numerotation:' || COALESCE(NEW.organization_id::text, NEW.user_id::text, '')
    || ':' || COALESCE(NEW.entreprise_id::text, '') || ':' || v_prefixe || ':' || v_annee, 0));
  NEW.numero := v_prefixe || '-' || v_annee || '-'
    || lpad((public.dernier_numero_facture(NEW.organization_id, NEW.entreprise_id, v_prefixe, v_annee) + 1)::text, 5, '0');
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.suivre_numerotation() FROM PUBLIC, anon, authenticated;
-- Nom après « trg_renseigner_organisation » (079 : organisation remplie à l'insertion) et « trg_garder_facture_emise »
-- (093), avant « trg_verifier_* » — ordre alphabétique des déclencheurs BEFORE
DROP TRIGGER IF EXISTS trg_suivre_numerotation ON public.devis;
CREATE TRIGGER trg_suivre_numerotation
  BEFORE INSERT OR UPDATE ON public.devis
  FOR EACH ROW EXECUTE FUNCTION public.suivre_numerotation();
