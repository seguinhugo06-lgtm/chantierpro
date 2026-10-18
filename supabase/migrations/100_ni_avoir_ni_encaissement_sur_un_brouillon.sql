-- ============================================================
-- Migration 100: ni avoir ni encaissement sur un brouillon de facture (tâche avoir-brouillon, 18 oct. 2026)
-- ============================================================
-- Pourquoi : contre-relectures juriste-btp et gardien-securite du 18 oct. 2026 (lot 099).
--   - « Créer un avoir » était proposé sur un brouillon de facture, et ni l'app ni la base ne l'empêchaient. Émis, cet
--     avoir entre dans le chiffre d'affaires et la TVA facturée (src/lib/ventes.js facturesEmises, tvaFacturee) alors
--     que le brouillon qu'il « rectifie » n'y est jamais entré : chiffre d'affaires et TVA collectée sous-évalués, sans
--     facture initiale. Un avoir rectifie une facture émise (CGI art. 272, 1 : rectification préalable de la facture
--     initiale) ; un brouillon se corrige directement.
--   - Un brouillon pouvait recevoir un paiement (098 vérifie la facture, pas son statut), puis disparaître par l'API
--     (passage en devis puis suppression, suppression de son client en cascade, changement d'organisation) en laissant
--     un encaissement inaltérable sans pièce. L'app n'encaisse jamais un brouillon (« Envoyer » d'abord).
-- Relevé du 18 oct. 2026 : aucune facture en brouillon, aucun avoir, aucun paiement sans facture. Rien à reprendre.
--
-- Effet, pour un compte connecté (le serveur et les fonctions SECURITY DEFINER ne sont pas concernés) :
--   1. un avoir ne se crée ni ne se rattache sur un brouillon de facture : refus (42501) « Un avoir rectifie une facture
--      émise : ce brouillon se corrige directement, sans avoir. » ;
--   2. un encaissement ne s'enregistre pas sur un brouillon de facture : refus « Un encaissement se rattache à une
--      facture émise : envoyez d'abord la facture. » (un rejeu à l'identique d'un paiement déjà enregistré passe : 098).
--
-- ─── Vérification après application (éditeur SQL) ───────────────────────────
--   select tgname, tgtype from pg_trigger where tgname in ('trg_verifier_avoir_source', 'trg_paiement_sur_facture_emise')
--     order by 1;
--     attendu : trg_paiement_sur_facture_emise 7 (BEFORE INSERT, sur paiements) ; trg_verifier_avoir_source 23 (sur devis)
--   select count(*) from devis a join devis s on s.id = a.avoir_source_id where a.facture_type = 'avoir' and s.statut = 'brouillon';
--     attendu : 0
--   select count(*) from paiements p join devis d on d.id = p.devis_id where d.statut = 'brouillon';     -- attendu : 0
-- ============================================================

-- 1. Un avoir rectifie une facture émise
CREATE OR REPLACE FUNCTION public.verifier_avoir_source()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
  v_statut TEXT;
BEGIN
  IF current_user NOT IN ('authenticated', 'anon') THEN
    RETURN NEW;
  END IF;
  IF NEW.facture_type IS DISTINCT FROM 'avoir' OR NEW.avoir_source_id IS NULL THEN
    RETURN NEW;
  END IF;
  -- Un avoir déjà rattaché garde son rattachement (une facture émise ne repasse pas en brouillon, 093)
  IF TG_OP = 'UPDATE' AND OLD.facture_type = 'avoir' AND NEW.avoir_source_id IS NOT DISTINCT FROM OLD.avoir_source_id THEN
    RETURN NEW;
  END IF;
  SELECT statut INTO v_statut FROM public.devis WHERE id = NEW.avoir_source_id;
  IF v_statut = 'brouillon' THEN
    RAISE EXCEPTION 'Un avoir rectifie une facture émise : ce brouillon se corrige directement, sans avoir.'
      USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.verifier_avoir_source() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS trg_verifier_avoir_source ON public.devis;
CREATE TRIGGER trg_verifier_avoir_source
  BEFORE INSERT OR UPDATE ON public.devis
  FOR EACH ROW EXECUTE FUNCTION public.verifier_avoir_source();

-- 2. Un encaissement se rattache à une facture émise
CREATE OR REPLACE FUNCTION public.paiement_sur_facture_emise()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  IF current_user NOT IN ('authenticated', 'anon') THEN
    RETURN NEW;
  END IF;
  -- Phase INSERT du rejeu à l'identique d'un paiement déjà enregistré (upsert de l'app) : 098 en décide
  IF EXISTS (SELECT 1 FROM public.paiements WHERE id = NEW.id) THEN
    RETURN NEW;
  END IF;
  IF EXISTS (SELECT 1 FROM public.devis WHERE id = NEW.devis_id AND statut = 'brouillon') THEN
    RAISE EXCEPTION 'Un encaissement se rattache à une facture émise : envoyez d''abord la facture.'
      USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.paiement_sur_facture_emise() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS trg_paiement_sur_facture_emise ON public.paiements;
CREATE TRIGGER trg_paiement_sur_facture_emise
  BEFORE INSERT ON public.paiements
  FOR EACH ROW EXECUTE FUNCTION public.paiement_sur_facture_emise();
