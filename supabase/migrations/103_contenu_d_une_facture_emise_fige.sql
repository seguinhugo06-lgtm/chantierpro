-- ============================================================
-- Migration 103: le contenu d'une facture émise figé en base (tâche facture-contenu-fige, 18 oct. 2026)
-- ============================================================
-- Pourquoi : relecture juriste-btp du 17 oct. 2026 (093, C5). L'intégrité du contenu d'une facture est due dès son
-- émission (CGI art. 289 V ; BOI-TVA-DECLA-30-20-30-10 : toutes ses mentions). 093 ne fige que les montants, le numéro,
-- la date, le client, la nature et les pièces d'origine ; par l'API, un compte connecté pouvait encore réécrire les
-- lignes (désignations, quantités, prix), les lots, la remise, la TVA et sa ventilation, l'échéance, les conditions de
-- règlement, l'objet, les notes imprimées, l'acompte annoncé, le nom du client imprimé, le chantier (adresse des
-- travaux), le motif d'un avoir et la situation de travaux d'une facture déjà remise au client. L'app ne les modifie
-- jamais une fois la facture émise (gardeFacturation.peutModifierDocument) ; mais elle réécrit toute la ligne à chaque
-- enregistrement (encaissement, envoi, relance) : un refus au moindre écart de forme (une liste de lignes resérialisée)
-- bloquerait ces enregistrements — c'est pourquoi 093 ne l'avait pas fait. La valeur envoyée est donc ignorée, comme le
-- montant encaissé (098), l'auteur (099) et l'entreprise (102).
-- Relevé du 18 oct. 2026 : 16 factures émises ; aucune n'a été modifiée après son émission par l'app. Rien à reprendre.
--
-- Effet, pour un compte connecté (le serveur, les fonctions SECURITY DEFINER et le jeu de démonstration ne sont pas
-- concernés) : sur une facture ou un avoir émis (hors brouillon), lignes, sections, remise_globale, tva_rate, tva,
-- tva_details, conditions, notes, objet, date_echeance, acompte_pct, acompte_percent, acompte_montant, client_nom,
-- chantier_id, avoir_type, avoir_motif, avoir_motif_detail, situation_id et situation_numero gardent leur valeur
-- enregistrée ; l'enregistrement du reste (statut, envoi, encaissement, relance) passe. Un brouillon reste modifiable.
--
-- ─── Vérification après application (éditeur SQL) ───────────────────────────
--   select tgtype from pg_trigger where tgrelid = 'public.devis'::regclass and tgname = 'trg_figer_contenu_facture';
--     attendu : 19 (BEFORE, ligne, UPDATE)
-- ============================================================

-- Le déclencheur lit ces colonnes à chaque mise à jour d'un document : s'il en manquait une, toute écriture d'un artisan
-- échouerait (« record new has no field ») — la migration échoue alors, l'app non
DO $$
DECLARE
  v_attendues TEXT[] := ARRAY['lignes', 'sections', 'remise_globale', 'tva_rate', 'tva', 'tva_details', 'conditions', 'notes',
    'objet', 'date_echeance', 'acompte_pct', 'acompte_percent', 'acompte_montant', 'client_nom', 'chantier_id', 'avoir_type',
    'avoir_motif', 'avoir_motif_detail', 'situation_id', 'situation_numero'];
  v_manquantes TEXT[];
BEGIN
  SELECT array_agg(c) INTO v_manquantes FROM unnest(v_attendues) c
   WHERE NOT EXISTS (SELECT 1 FROM information_schema.columns
                      WHERE table_schema = 'public' AND table_name = 'devis' AND column_name = c);
  IF v_manquantes IS NOT NULL THEN
    RAISE EXCEPTION '103 : colonnes absentes de public.devis : %', array_to_string(v_manquantes, ', ');
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.figer_contenu_facture_emise()
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
  NEW.lignes := OLD.lignes;
  NEW.sections := OLD.sections;
  NEW.remise_globale := OLD.remise_globale;
  NEW.tva_rate := OLD.tva_rate;
  NEW.tva := OLD.tva;
  NEW.tva_details := OLD.tva_details;
  NEW.conditions := OLD.conditions;
  NEW.notes := OLD.notes;
  NEW.objet := OLD.objet;
  NEW.date_echeance := OLD.date_echeance;
  NEW.acompte_pct := OLD.acompte_pct;
  NEW.acompte_percent := OLD.acompte_percent;
  NEW.acompte_montant := OLD.acompte_montant;
  NEW.client_nom := OLD.client_nom;
  NEW.chantier_id := OLD.chantier_id;
  NEW.avoir_type := OLD.avoir_type;
  NEW.avoir_motif := OLD.avoir_motif;
  NEW.avoir_motif_detail := OLD.avoir_motif_detail;
  NEW.situation_id := OLD.situation_id;
  NEW.situation_numero := OLD.situation_numero;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.figer_contenu_facture_emise() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS trg_figer_contenu_facture ON public.devis;
CREATE TRIGGER trg_figer_contenu_facture
  BEFORE UPDATE ON public.devis
  FOR EACH ROW EXECUTE FUNCTION public.figer_contenu_facture_emise();
