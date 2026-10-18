-- ============================================================
-- Migration 099: « payée » seulement quand les paiements soldent la facture ; pièces émises gardées dans leur
-- entreprise (tâche payee-sans-paiement, 18 oct. 2026)
-- ============================================================
-- Pourquoi : relecture juriste-btp du 18 oct. 2026 (lot 098). Une facture passait encore de « envoyée » à « payée »
-- par l'API sans aucune ligne de paiement (093 l'autorise) ; or l'app compte une facture « payée » comme encaissée
-- (src/lib/ventes.js `encaisse`, src/lib/paiementsFacture.js `encaisseEntre`) : un encaissement sans trace, effaçable
-- en repassant la facture « envoyée » (CGI art. 286 I 3° bis ; BOI-TVA-DECLA-30-10-30 § 80 : données d'encaissement
-- inaltérables). L'interface ne le propose plus (FACTURE_TRANSITIONS.payee : []), la base ne l'empêchait pas. Depuis
-- 098, le montant encaissé d'une facture (montant_paye) est la somme de ses paiements, tenue par la base : il suffit
-- de lui comparer le statut.
-- Relecture gardien-securite du 18 oct. 2026 : un membre de l'organisation pouvait détacher une facture ou un avoir
-- émis de l'organisation (organization_id vide, user_id à son nom : la policy « Users can update own devis » le
-- laisse passer) — la pièce disparaissait des livres du patron, et un avoir détaché laissait une facture « payée » sous
-- son dû ; une facture qui a reçu des paiements (brouillon encaissé) se supprimait en laissant ses paiements
-- inaltérables sans pièce ; une correction et un passage à « payée » simultanés pouvaient laisser une facture
-- « payée » sous son dû.
-- Relevé du 18 oct. 2026 : 9 factures « payées », toutes soldées par leurs paiements ; 7 « envoyées », aucune soldée ;
-- aucun écart entre montant encaissé et paiements. Rien à reprendre.
--
-- Effet, pour un compte connecté (le serveur, les fonctions SECURITY DEFINER et 098 ne sont pas concernés) :
--   1. une facture (hors avoir) ne passe « payée » que si elle a reçu un encaissement et que ses paiements la soldent :
--      montant encaissé > 0 et ≥ total − avoirs émis − 0,01 € ; sinon refus (42501) « Cette facture n'est pas soldée :
--      il reste X € à encaisser… », ou, annulée par avoir sans rien encaissé, « … annulée par un avoir : aucun
--      encaissement n'est à constater » (relecture juriste-btp du 18 oct. 2026 ; CGI art. 272, 1 : l'opération est
--      annulée, la facture rectifiée) ;
--   2. une facture « payée » ne revient pas à « envoyée » ou « vue » tant que ses paiements la soldent : seule la base
--      la rouvre, quand une correction d'encaissement fait passer sous le dû (098). La valeur périmée d'un onglet ouvert
--      depuis longtemps (l'app réécrit toute la ligne) est ignorée, sans bloquer l'enregistrement ;
--   3. une facture ou un avoir émis reste dans son organisation (refus sinon) et garde son auteur (l'app réécrit
--      user_id avec le compte qui enregistre : la valeur envoyée est ignorée, comme le montant encaissé en 098) ;
--   4. une facture qui a des encaissements enregistrés ne se supprime pas, même en brouillon ;
--   5. le recalcul du montant encaissé (098) verrouille la facture : une correction attend un passage à « payée » en
--      cours, puis la rouvre s'il le faut.
-- Un avoir n'est pas concerné par 1 et 2 (« appliqué » = « payée »).
--
-- ─── Vérification après application (éditeur SQL) ───────────────────────────
--   select tgname, tgtype from pg_trigger where tgrelid = 'public.devis'::regclass
--     and tgname in ('trg_verifier_statut_payee', 'trg_garder_organisation_piece', 'trg_garder_facture_encaissee')
--     order by 1;
--     attendu : trg_garder_facture_encaissee 11 (BEFORE DELETE) ; trg_garder_organisation_piece 19 (BEFORE UPDATE) ;
--               trg_verifier_statut_payee 23 (BEFORE INSERT ou UPDATE)
--   select tgname from pg_trigger where tgrelid = 'public.devis'::regclass and not tgisinternal order by tgname;
--     (aucun déclencheur propre à la production ne doit modifier statut, organisation ou montant encaissé entre eux)
--   select count(*) from devis d where d.type = 'facture' and coalesce(d.facture_type, '') <> 'avoir' and d.statut = 'payee'
--     and coalesce(d.montant_paye, 0) < coalesce(d.total_ttc, 0) - coalesce((select sum(abs(coalesce(a.total_ttc, 0)))
--     from devis a where a.type = 'facture' and a.facture_type = 'avoir' and a.avoir_source_id = d.id
--     and a.organization_id is not distinct from d.organization_id
--     and coalesce(a.statut, '') not in ('brouillon', 'annule', 'annulee')), 0) - 0.01;          -- attendu : 0
--   select count(*) from devis where type = 'facture' and coalesce(facture_type, '') <> 'avoir' and statut = 'payee'
--     and coalesce(montant_paye, 0) <= 0;                                                         -- attendu : 0
--   select position('FOR NO KEY UPDATE' in pg_get_functiondef('public.recalculer_encaisse(uuid, boolean)'::regprocedure)) > 0;
--     attendu : true (ne jamais rejouer 098 après 099 : elle remettrait le recalcul sans verrou)
--   select count(*) from devis where type = 'facture' and statut <> 'brouillon' and organization_id is null;  -- attendu : 0
-- ============================================================

-- 1 et 2. « Payée » selon les paiements
CREATE OR REPLACE FUNCTION public.verifier_statut_payee()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
  v_credite NUMERIC;
  v_reste NUMERIC;
  euros CONSTANT TEXT := 'FM999,999,990.00';
BEGIN
  IF current_user NOT IN ('authenticated', 'anon') THEN
    RETURN NEW;
  END IF;
  IF NEW.type IS DISTINCT FROM 'facture' OR NEW.facture_type = 'avoir' THEN
    RETURN NEW;
  END IF;
  -- Phase INSERT d'un upsert sur une ligne existante : la phase UPDATE contrôlera avec la ligne enregistrée (ici, le
  -- montant encaissé a pu être calculé avant que l'organisation soit remplie : faux refus — relecture gardien-securite)
  IF TG_OP = 'INSERT' AND EXISTS (SELECT 1 FROM public.devis WHERE id = NEW.id) THEN
    RETURN NEW;
  END IF;
  -- Rien à contrôler : la facture ne devient pas « payée » et ne la quitte pas
  IF NEW.statut IS DISTINCT FROM 'payee'
     AND NOT (TG_OP = 'UPDATE' AND OLD.type = 'facture' AND OLD.statut = 'payee') THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'UPDATE' AND OLD.type = 'facture' AND OLD.facture_type IS DISTINCT FROM 'avoir'
     AND OLD.statut = 'payee' AND NEW.statut = 'payee' THEN
    RETURN NEW;
  END IF;

  -- Le dû : total moins les avoirs émis de la même organisation (comme recalculer_encaisse, 098). Le montant
  -- encaissé est celui de la base : trg_encaisse_tenu_par_la_base (098) a déjà remis sa valeur dans NEW
  SELECT COALESCE(SUM(ABS(COALESCE(total_ttc, 0))), 0) INTO v_credite FROM public.devis
   WHERE type = 'facture' AND facture_type = 'avoir' AND avoir_source_id = NEW.id
     AND organization_id IS NOT DISTINCT FROM NEW.organization_id
     AND COALESCE(statut, '') NOT IN ('brouillon', 'annule', 'annulee');
  v_reste := ROUND(COALESCE(NEW.total_ttc, 0) - v_credite - COALESCE(NEW.montant_paye, 0), 2);

  IF NEW.statut = 'payee' THEN
    IF v_reste > 0.01 THEN
      RAISE EXCEPTION 'Cette facture n''est pas soldée : il reste % € à encaisser. Enregistrez l''encaissement reçu avec « Encaisser » ; si c''est déjà fait, rechargez la page.',
        translate(to_char(v_reste, euros), ',.', ' ,')
        USING ERRCODE = '42501';
    END IF;
    -- Rien encaissé (annulée par avoir, ou rien à payer) : aucun règlement à constater (l'app l'affiche « annulée »)
    IF COALESCE(NEW.montant_paye, 0) <= 0 THEN
      IF v_credite > 0 THEN
        RAISE EXCEPTION 'Cette facture est annulée par un avoir : aucun encaissement n''est à constater.'
          USING ERRCODE = '42501';
      END IF;
      RAISE EXCEPTION 'Cette facture n''a reçu aucun encaissement : elle ne peut pas être « payée ».'
        USING ERRCODE = '42501';
    END IF;
    RETURN NEW;
  END IF;

  -- « Payée » vers « envoyée » ou « vue » : seulement si elle n'est plus soldée (sinon, valeur d'un onglet périmé)
  IF NEW.statut IN ('envoye', 'vu') AND v_reste <= 0.01 THEN
    NEW.statut := 'payee';
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.verifier_statut_payee() FROM PUBLIC, anon, authenticated;
-- Nom après « trg_encaisse_tenu_par_la_base » (098 : montant encaissé remis), « trg_garder_facture_emise » (093 : statuts
-- permis d'une facture émise), « trg_renseigner_organisation » et « trg_verifier_organisation » (079, 084 : organisation
-- remplie et contrôlée) — ordre alphabétique des déclencheurs BEFORE
DROP TRIGGER IF EXISTS trg_verifier_statut_payee ON public.devis;
CREATE TRIGGER trg_verifier_statut_payee
  BEFORE INSERT OR UPDATE ON public.devis
  FOR EACH ROW EXECUTE FUNCTION public.verifier_statut_payee();

-- 3. Une pièce émise reste dans son organisation et garde son auteur
CREATE OR REPLACE FUNCTION public.garder_organisation_piece_emise()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  IF current_user NOT IN ('authenticated', 'anon') THEN
    RETURN NEW;
  END IF;
  IF OLD.type IS DISTINCT FROM 'facture' OR OLD.statut = 'brouillon' THEN
    RETURN NEW;
  END IF;
  IF NEW.organization_id IS DISTINCT FROM OLD.organization_id THEN
    RAISE EXCEPTION 'Une pièce émise (facture ou avoir) reste dans son entreprise.'
      USING ERRCODE = '42501';
  END IF;
  -- L'app écrit le compte qui enregistre (src/lib/queryHelper.js withOrgScope) : un salarié qui encaisse la facture du
  -- patron ne la fait pas sienne
  NEW.user_id := OLD.user_id;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.garder_organisation_piece_emise() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS trg_garder_organisation_piece ON public.devis;
CREATE TRIGGER trg_garder_organisation_piece
  BEFORE UPDATE ON public.devis
  FOR EACH ROW EXECUTE FUNCTION public.garder_organisation_piece_emise();

-- 4. Une facture encaissée ne se supprime pas (ses paiements, inaltérables, resteraient sans pièce)
CREATE OR REPLACE FUNCTION public.garder_facture_encaissee()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  IF current_user NOT IN ('authenticated', 'anon') THEN
    RETURN OLD;
  END IF;
  IF OLD.type = 'facture' AND EXISTS (SELECT 1 FROM public.paiements WHERE devis_id = OLD.id) THEN
    -- Une facture émise ou numérotée est déjà refusée par 093 (déclencheur qui passe avant) : ce message ne s'affiche que
    -- pour un brouillon sans numéro, qu'un avoir ne rectifie pas (relecture juriste-btp du 18 oct. 2026)
    RAISE EXCEPTION 'Cette facture a des encaissements enregistrés : elle se conserve avec eux et ne se supprime pas. Un encaissement saisi par erreur se corrige avec « Corriger » ; un paiement réel : émettez la facture.'
      USING ERRCODE = '42501';
  END IF;
  RETURN OLD;
END;
$$;
REVOKE ALL ON FUNCTION public.garder_facture_encaissee() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS trg_garder_facture_encaissee ON public.devis;
CREATE TRIGGER trg_garder_facture_encaissee
  BEFORE DELETE ON public.devis
  FOR EACH ROW EXECUTE FUNCTION public.garder_facture_encaissee();

-- 5. Le recalcul du montant encaissé verrouille la facture (définition de 098, ligne lue FOR NO KEY UPDATE)
CREATE OR REPLACE FUNCTION public.recalculer_encaisse(p_facture UUID, p_rouvrir BOOLEAN DEFAULT false)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_fac RECORD;
  v_somme NUMERIC;
  v_credite NUMERIC;
BEGIN
  IF p_facture IS NULL THEN
    RETURN;
  END IF;
  -- FOR NO KEY UPDATE (le verrou d'un UPDATE) : un passage à « payée » en cours sur une autre connexion est attendu, puis
  -- relu (relecture gardien-securite du 18 oct. 2026 : sans verrou, la correction ne voyait pas le statut et ne rouvrait
  -- pas)
  SELECT id, user_id, organization_id, type, facture_type, statut, total_ttc, montant_paye INTO v_fac
    FROM public.devis WHERE id = p_facture FOR NO KEY UPDATE;
  IF v_fac.id IS NULL OR v_fac.type IS DISTINCT FROM 'facture' OR v_fac.facture_type = 'avoir' THEN
    RETURN;
  END IF;
  -- Pour un compte connecté : seulement une facture de son compte ou de son organisation
  IF auth.uid() IS NOT NULL AND v_fac.user_id IS DISTINCT FROM auth.uid()
     AND NOT COALESCE(v_fac.organization_id = ANY (COALESCE(public.user_org_ids(auth.uid()), ARRAY[]::UUID[])), false) THEN
    RETURN;
  END IF;
  SELECT ROUND(COALESCE(SUM(montant), 0), 2) INTO v_somme
    FROM public.paiements
   WHERE devis_id = p_facture AND organization_id IS NOT DISTINCT FROM v_fac.organization_id;
  IF v_somme IS DISTINCT FROM COALESCE(v_fac.montant_paye, 0) THEN
    UPDATE public.devis SET montant_paye = v_somme WHERE id = p_facture;
  END IF;
  -- Une correction qui rouvre une facture « payée » : elle redevient « envoyée » (reste dû, relances)
  IF p_rouvrir AND v_fac.statut = 'payee' THEN
    SELECT COALESCE(SUM(ABS(COALESCE(total_ttc, 0))), 0) INTO v_credite FROM public.devis
     WHERE type = 'facture' AND facture_type = 'avoir' AND avoir_source_id = p_facture
       AND organization_id IS NOT DISTINCT FROM v_fac.organization_id
       AND COALESCE(statut, '') NOT IN ('brouillon', 'annule', 'annulee');
    IF v_somme < COALESCE(v_fac.total_ttc, 0) - v_credite - 0.01 THEN
      UPDATE public.devis SET statut = 'envoye' WHERE id = p_facture;
    END IF;
  END IF;
END;
$$;
REVOKE ALL ON FUNCTION public.recalculer_encaisse(UUID, BOOLEAN) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.recalculer_encaisse(UUID, BOOLEAN) TO service_role;
