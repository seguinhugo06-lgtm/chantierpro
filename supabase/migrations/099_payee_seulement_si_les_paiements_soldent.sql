-- ============================================================
-- Migration 099: « payée » seulement quand les paiements soldent la facture (tâche payee-sans-paiement, 18 oct. 2026)
-- ============================================================
-- Pourquoi : relecture juriste-btp du 18 oct. 2026 (lot 098). Une facture passait encore de « envoyée » à « payée »
-- par l'API sans aucune ligne de paiement (093 l'autorise) ; or l'app compte une facture « payée » comme encaissée
-- (src/lib/ventes.js `encaisse`, src/lib/paiementsFacture.js `encaisseEntre`) : un encaissement sans trace, effaçable
-- en repassant la facture « envoyée » (CGI art. 286 I 3° bis ; BOI-TVA-DECLA-30-10-30 § 80 : données d'encaissement
-- inaltérables). L'interface ne le propose plus (FACTURE_TRANSITIONS.payee : []), la base ne l'empêchait pas. Depuis
-- 098, le montant encaissé d'une facture (montant_paye) est la somme de ses paiements, tenue par la base : il suffit
-- de lui comparer le statut.
-- Relevé du 18 oct. 2026 : 9 factures « payées », toutes soldées par leurs paiements ; 7 « envoyées », aucune soldée ;
-- aucun écart entre montant encaissé et paiements. Rien à reprendre.
--
-- Effet, pour un compte connecté (le serveur, les fonctions SECURITY DEFINER et 098 ne sont pas concernés) :
--   1. une facture (hors avoir) ne passe « payée » que si ses paiements la soldent : montant encaissé ≥ total − avoirs
--      émis − 0,01 € ; sinon refus (42501) « Cette facture n'est pas soldée : il reste X € à encaisser… » ;
--   2. une facture « payée » ne revient pas à « envoyée » ou « vue » tant que ses paiements la soldent : seule la base
--      la rouvre, quand une correction d'encaissement fait passer sous le dû (098). La valeur périmée d'un onglet ouvert
--      depuis longtemps (l'app réécrit toute la ligne) est ignorée, sans bloquer l'enregistrement.
-- Un avoir n'est pas concerné (« appliqué » = « payée »).
--
-- ─── Vérification après application (éditeur SQL) ───────────────────────────
--   select tgtype from pg_trigger where tgrelid = 'public.devis'::regclass and tgname = 'trg_verifier_statut_payee';
--     attendu : 23 (BEFORE, ligne, INSERT et UPDATE)
--   select count(*) from devis d where d.type = 'facture' and coalesce(d.facture_type, '') <> 'avoir' and d.statut = 'payee'
--     and coalesce(d.montant_paye, 0) < coalesce(d.total_ttc, 0) - coalesce((select sum(abs(coalesce(a.total_ttc, 0)))
--     from devis a where a.type = 'facture' and a.facture_type = 'avoir' and a.avoir_source_id = d.id
--     and a.organization_id is not distinct from d.organization_id
--     and coalesce(a.statut, '') not in ('brouillon', 'annule', 'annulee')), 0) - 0.01;          -- attendu : 0
-- ============================================================

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
  -- Rien à contrôler : la facture ne devient pas « payée » et ne la quitte pas
  IF NEW.statut IS DISTINCT FROM 'payee'
     AND NOT (TG_OP = 'UPDATE' AND OLD.type = 'facture' AND OLD.statut = 'payee') THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'UPDATE' AND OLD.type = 'facture' AND OLD.statut = 'payee' AND NEW.statut = 'payee' THEN
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
