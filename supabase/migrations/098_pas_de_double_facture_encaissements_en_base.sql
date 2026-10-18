-- 098 — Pas de double facture ; encaissements tenus par la base (tâches factures-double et encaissement-corriger,
-- 18 oct. 2026)
--
-- Pourquoi :
--   - relecture gardien-securite du 10 oct. 2026 : deux soldes du même devis partis en même temps (deux onglets, un
--     double appui sur une base lente) donnaient deux factures ; le garde-fou n'était que dans l'app
--     (src/lib/gardeFacturation.js), sur l'état de l'écran. Rien n'empêchait deux factures de porter le même numéro
--     (la numérotation se fait dans l'app : plus grand numéro connu + 1, par entreprise) ;
--   - le montant encaissé d'une facture (devis.montant_paye) était écrit par l'app à chaque enregistrement : un
--     onglet ouvert depuis le matin le réécrivait avec sa valeur périmée (093 le refuse, ce qui bloquait
--     l'enregistrement), et un paiement en ligne n'avait pas de ligne dans `paiements` ;
--   - relecture juriste-btp du 17 oct. 2026 (093, C3) : un encaissement enregistré est inaltérable (CGI art. 286 I
--     3° bis ; BOI-TVA-DECLA-30-10-30 § 80 à 120) : il se corrige par une opération de « moins », datée et
--     horodatée, jamais en l'effaçant. Or une ligne de `paiements` pouvait être modifiée ou supprimée par son auteur.
-- Relevé du 18 oct. 2026 : 16 factures, toutes avec montant_paye = somme de leurs paiements, toutes rattachées à une
-- entreprise ; 10 paiements, tous rattachés à une facture de la même organisation, aucun négatif ; aucun devis facturé
-- au-delà de son montant ; aucun numéro en double ; aucune organisation à plusieurs entreprises ; aucune contrainte
-- sur paiements.mode. L'app ne modifie ni ne supprime jamais un paiement (elle l'écrit par upsert : un rejeu à
-- l'identique doit passer).
--
-- Effet :
--   1. un numéro de facture (ou d'avoir) est unique dans son entreprise (chaque entreprise d'une organisation a sa
--      série, comme l'app la calcule) ; un paiement en ligne (session Stripe) n'est enregistré qu'une fois ;
--   2. une facture rattachée à un devis ne fait pas dépasser le devis : factures du devis de la même organisation,
--      avoirs émis déduits (au plus le montant de chaque facture), brouillons compris comme dans l'app, tolérance
--      0,05 € ; le devis est verrouillé pendant le contrôle (pg_advisory_xact_lock) : deux soldes simultanés donnent
--      une facture et un refus ; un devis d'une autre organisation ne se facture pas ;
--   3. pour un compte connecté : un paiement ne se modifie ni ne s'efface (un rejeu à l'identique passe) ; il est à
--      son nom, horodaté par la base, rattaché à une facture (hors avoir) de son organisation ; une correction est
--      un paiement négatif avec un motif (notes, 5 caractères au moins), qui cite le paiement corrigé (reference) et
--      n'en retire pas plus que lui, ni plus que l'encaissé de la facture ; les corrections d'une facture passent une
--      à une (verrou) ;
--   4. devis.montant_paye d'une facture = somme des paiements de son organisation, recalculée par la base à chaque
--      paiement ; la valeur envoyée par l'app est ignorée ; une correction qui rouvre une facture « payée » la
--      repasse « envoyée » ;
--   5. la page de paiement en ligne part de ce montant encaissé (corrections comprises, quel que soit leur auteur).
-- Le serveur (rôle de service, fonctions SECURITY DEFINER, suppression de compte) n'est pas concerné par 3 et 4.
--
-- Vérification après application :
--   select indexname from pg_indexes where indexname in ('devis_factures_numero_unique', 'paiements_session_stripe_unique');  -- 2 lignes
--   select tgname from pg_trigger where tgname in ('trg_verifier_total_facture', 'trg_encaisse_tenu_par_la_base',
--     'trg_verifier_paiement', 'trg_recalculer_encaisse') order by 1;                                           -- 4 lignes
--   select count(*) from devis d where d.type = 'facture' and coalesce(d.montant_paye, 0) <> coalesce((select sum(p.montant)
--     from paiements p where p.devis_id = d.id and p.organization_id is not distinct from d.organization_id), 0);   -- 0
--   select position('v_recu := GREATEST(COALESCE(v_facture.montant_paye, 0), 0)' in
--     pg_get_functiondef('public.get_facture_for_payment(text)'::regprocedure)) > 0;                              -- true

-- 1. Numéro de facture unique dans son entreprise ; un paiement en ligne enregistré une fois
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema = 'public' AND table_name = 'devis' AND column_name = 'entreprise_id') THEN
    EXECUTE $i$CREATE UNIQUE INDEX IF NOT EXISTS devis_factures_numero_unique
      ON public.devis (organization_id, COALESCE(entreprise_id, '00000000-0000-0000-0000-000000000000'::uuid), numero)
      WHERE type = 'facture' AND organization_id IS NOT NULL AND NULLIF(numero, '') IS NOT NULL$i$;
  ELSE
    EXECUTE $i$CREATE UNIQUE INDEX IF NOT EXISTS devis_factures_numero_unique
      ON public.devis (organization_id, numero)
      WHERE type = 'facture' AND organization_id IS NOT NULL AND NULLIF(numero, '') IS NOT NULL$i$;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS paiements_session_stripe_unique
  ON public.paiements (reference) WHERE mode = 'cb' AND reference LIKE 'cs\_%';
CREATE INDEX IF NOT EXISTS paiements_devis_id_idx ON public.paiements (devis_id);

-- 2. Pas plus de factures que le devis
CREATE OR REPLACE FUNCTION public.verifier_total_facture()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_source RECORD;
  v_deja NUMERIC;
  v_nouveau NUMERIC;
  euros CONSTANT TEXT := 'FM999,999,990.00';
BEGIN
  IF NEW.type IS DISTINCT FROM 'facture' OR NEW.facture_type = 'avoir' OR NEW.devis_source_id IS NULL
     OR COALESCE(NEW.statut, '') IN ('annule', 'annulee') THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'UPDATE'
     AND NEW.devis_source_id IS NOT DISTINCT FROM OLD.devis_source_id
     AND COALESCE(NEW.total_ttc, 0) = COALESCE(OLD.total_ttc, 0)
     AND NEW.type IS NOT DISTINCT FROM OLD.type
     AND NEW.facture_type IS NOT DISTINCT FROM OLD.facture_type
     AND NEW.organization_id IS NOT DISTINCT FROM OLD.organization_id
     AND COALESCE(OLD.statut, '') NOT IN ('annule', 'annulee') THEN
    RETURN NEW;
  END IF;

  -- Un contrôle à la fois par devis : la seconde facture attend la fin de la première, puis la voit
  PERFORM pg_advisory_xact_lock(hashtextextended('facturation-devis:' || NEW.devis_source_id::text, 0));

  SELECT id, user_id, organization_id, total_ttc INTO v_source FROM public.devis WHERE id = NEW.devis_source_id;
  IF v_source.id IS NULL THEN
    RETURN NEW;
  END IF;
  -- Le devis d'origine est de la même organisation (sans organisation : du même compte). Les policies « Org members
  -- can insert » ne contrôlent pas user_id : se contenter du compte laissait un tiers bloquer le devis d'un autre
  -- (relecture gardien-securite du 18 oct. 2026)
  IF v_source.organization_id IS DISTINCT FROM NEW.organization_id
     OR (v_source.organization_id IS NULL AND v_source.user_id IS DISTINCT FROM NEW.user_id) THEN
    RAISE EXCEPTION 'Devis d''origine introuvable' USING ERRCODE = '42501';
  END IF;
  IF COALESCE(v_source.total_ttc, 0) <= 0 THEN
    RETURN NEW;
  END IF;

  -- Déjà facturé : factures du devis dans son organisation (hors avoirs et annulées, brouillons compris), chacune
  -- diminuée de ses avoirs émis de la même organisation, sans descendre sous zéro
  SELECT COALESCE(SUM(GREATEST(ABS(COALESCE(f.total_ttc, 0)) - COALESCE((
           SELECT SUM(ABS(COALESCE(a.total_ttc, 0))) FROM public.devis a
            WHERE a.type = 'facture' AND a.facture_type = 'avoir' AND a.avoir_source_id = f.id
              AND a.organization_id IS NOT DISTINCT FROM f.organization_id
              AND COALESCE(a.statut, '') NOT IN ('brouillon', 'annule', 'annulee')), 0), 0)), 0)
    INTO v_deja
    FROM public.devis f
   WHERE f.type = 'facture' AND COALESCE(f.facture_type, '') <> 'avoir'
     AND f.devis_source_id = NEW.devis_source_id AND f.id <> NEW.id
     AND f.organization_id IS NOT DISTINCT FROM v_source.organization_id
     AND COALESCE(f.statut, '') NOT IN ('annule', 'annulee');

  v_nouveau := ABS(COALESCE(NEW.total_ttc, 0));
  IF v_deja + v_nouveau > v_source.total_ttc + 0.05 THEN
    RAISE EXCEPTION 'Ce devis est déjà facturé : avec cette facture (% €), le total dépasserait le devis (% €), dont % € déjà facturés ou en brouillon. Rechargez la page. Pour des travaux en plus du devis, faites signer un avenant.',
      translate(to_char(v_nouveau, euros), ',.', ' ,'),
      translate(to_char(v_source.total_ttc, euros), ',.', ' ,'),
      translate(to_char(v_deja, euros), ',.', ' ,')
      USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.verifier_total_facture() FROM PUBLIC, anon, authenticated;
-- Nom après « trg_renseigner_organisation » et « trg_verifier_organisation » (079, 084 ; ordre alphabétique des
-- déclencheurs BEFORE) : l'organisation de la nouvelle facture est déjà remplie et contrôlée
DROP TRIGGER IF EXISTS trg_verifier_total_facture ON public.devis;
CREATE TRIGGER trg_verifier_total_facture
  BEFORE INSERT OR UPDATE ON public.devis
  FOR EACH ROW EXECUTE FUNCTION public.verifier_total_facture();

-- 4. Le montant encaissé d'une facture : somme des paiements de son organisation, recalculée par la base
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
  SELECT id, user_id, organization_id, type, facture_type, statut, total_ttc, montant_paye INTO v_fac
    FROM public.devis WHERE id = p_facture;
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
-- Appelée par le déclencheur de `paiements` (en propriétaire) ; personne d'autre n'en a besoin
REVOKE ALL ON FUNCTION public.recalculer_encaisse(UUID, BOOLEAN) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.recalculer_encaisse(UUID, BOOLEAN) TO service_role;

-- 4 (suite). La valeur envoyée par l'app est ignorée. Nom avant « trg_garder_facture_emise » (093) : celui-ci voit
-- la valeur déjà remise, il ne refuse plus l'enregistrement d'un onglet périmé.
CREATE OR REPLACE FUNCTION public.encaisse_tenu_par_la_base()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  IF current_user NOT IN ('authenticated', 'anon') THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'UPDATE' AND OLD.type = 'facture' THEN
    NEW.montant_paye := OLD.montant_paye;
  ELSIF NEW.type = 'facture' THEN
    -- Nouvelle facture, ou devis devenu facture : ce que ses paiements disent (normalement rien)
    NEW.montant_paye := (SELECT ROUND(COALESCE(SUM(montant), 0), 2) FROM public.paiements
                          WHERE devis_id = NEW.id AND organization_id IS NOT DISTINCT FROM NEW.organization_id);
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.encaisse_tenu_par_la_base() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS trg_encaisse_tenu_par_la_base ON public.devis;
CREATE TRIGGER trg_encaisse_tenu_par_la_base
  BEFORE INSERT OR UPDATE ON public.devis
  FOR EACH ROW EXECUTE FUNCTION public.encaisse_tenu_par_la_base();

-- 3. Un paiement ne se modifie ni ne s'efface ; une correction est un paiement négatif motivé
CREATE OR REPLACE FUNCTION public.verifier_paiement()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
  v_fac RECORD;
  v_somme NUMERIC;
  v_corrige NUMERIC;
  v_origine RECORD;
BEGIN
  IF current_user NOT IN ('authenticated', 'anon') THEN
    RETURN COALESCE(NEW, OLD);
  END IF;
  IF TG_OP = 'UPDATE' AND (to_jsonb(NEW) - 'created_at' - 'updated_at') = (to_jsonb(OLD) - 'created_at' - 'updated_at') THEN
    -- Rejeu à l'identique (l'app écrit par upsert, la file hors ligne peut renvoyer une écriture déjà passée) : toutes
    -- les colonnes égales (identifiant et numéro de document compris), horodatage d'origine gardé
    NEW.created_at := OLD.created_at;
    NEW.updated_at := OLD.updated_at;
    RETURN NEW;
  END IF;
  IF TG_OP <> 'INSERT' THEN
    RAISE EXCEPTION 'Un encaissement enregistré ne se modifie ni ne s''efface : corrigez-le avec « Corriger » dans les paiements de la facture.'
      USING ERRCODE = '42501';
  END IF;
  -- À son nom, horodaté par la base (BOI-TVA-DECLA-30-10-30 § 100 : date et heure de chaque opération)
  IF NEW.user_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'Un encaissement s''enregistre à votre nom.' USING ERRCODE = '42501';
  END IF;
  NEW.created_at := now();
  NEW.updated_at := now();
  -- La référence d'une session Stripe est réservée au serveur (paiement en ligne, index unique) : un compte qui la
  -- connaît ne l'occupe pas pour empêcher l'enregistrement du vrai paiement
  IF COALESCE(NEW.reference, '') LIKE 'cs\_%' THEN
    RAISE EXCEPTION 'Cette référence est réservée aux paiements en ligne.' USING ERRCODE = '42501';
  END IF;
  IF NEW.devis_id IS NULL THEN
    RAISE EXCEPTION 'Un encaissement se rattache à une facture.' USING ERRCODE = '42501';
  END IF;
  SELECT id, organization_id, type, facture_type INTO v_fac FROM public.devis WHERE id = NEW.devis_id;
  IF v_fac.id IS NULL OR v_fac.type IS DISTINCT FROM 'facture' OR v_fac.facture_type = 'avoir'
     OR v_fac.organization_id IS DISTINCT FROM NEW.organization_id THEN
    RAISE EXCEPTION 'Un encaissement se rattache à une facture de votre entreprise (pas à un devis ni à un avoir).'
      USING ERRCODE = '42501';
  END IF;
  IF COALESCE(NEW.montant, 0) = 0 THEN
    RAISE EXCEPTION 'Le montant de l''encaissement est nul.' USING ERRCODE = '42501';
  END IF;
  IF NEW.montant < 0 THEN
    IF length(btrim(COALESCE(NEW.notes, ''))) < 5 THEN
      RAISE EXCEPTION 'Une correction d''encaissement demande son motif.' USING ERRCODE = '42501';
    END IF;
    -- Les corrections d'une facture passent une à une : deux corrections simultanées ne passent pas l'encaissé
    -- sous zéro
    PERFORM pg_advisory_xact_lock(hashtextextended('encaissement:' || NEW.devis_id::text, 0));
    -- Elle cite le paiement corrigé (de la même facture) et n'en retire pas plus que lui
    SELECT id, montant INTO v_origine FROM public.paiements
     WHERE id::text = NEW.reference AND devis_id = NEW.devis_id AND montant > 0
       AND organization_id IS NOT DISTINCT FROM v_fac.organization_id;
    IF v_origine.id IS NULL THEN
      RAISE EXCEPTION 'Une correction d''encaissement cite l''encaissement qu''elle corrige.' USING ERRCODE = '42501';
    END IF;
    -- Sans la ligne elle-même : le BEFORE INSERT d'un upsert rejoué passe avant la détection du conflit
    SELECT COALESCE(SUM(-montant), 0) INTO v_corrige FROM public.paiements
     WHERE reference = NEW.reference AND devis_id = NEW.devis_id AND montant < 0 AND id <> NEW.id;
    IF v_corrige - NEW.montant > v_origine.montant + 0.005 THEN
      RAISE EXCEPTION 'Cette correction dépasse l''encaissement qu''elle corrige.' USING ERRCODE = '42501';
    END IF;
    SELECT COALESCE(SUM(montant), 0) INTO v_somme FROM public.paiements
     WHERE devis_id = NEW.devis_id AND organization_id IS NOT DISTINCT FROM v_fac.organization_id AND id <> NEW.id;
    IF v_somme + NEW.montant < -0.005 THEN
      RAISE EXCEPTION 'Cette correction dépasse ce qui a été encaissé sur la facture.' USING ERRCODE = '42501';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.verifier_paiement() FROM PUBLIC, anon, authenticated;
-- Nom après « trg_verifier_organisation » (084) : l'organisation du paiement est déjà contrôlée
DROP TRIGGER IF EXISTS trg_verifier_paiement ON public.paiements;
CREATE TRIGGER trg_verifier_paiement
  BEFORE INSERT OR UPDATE OR DELETE ON public.paiements
  FOR EACH ROW EXECUTE FUNCTION public.verifier_paiement();

-- En propriétaire : recalculer_encaisse n'est exécutable que par lui (et le serveur)
CREATE OR REPLACE FUNCTION public.apres_paiement()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF TG_OP = 'DELETE' OR (TG_OP = 'UPDATE' AND NEW.devis_id IS DISTINCT FROM OLD.devis_id) THEN
    PERFORM public.recalculer_encaisse(OLD.devis_id);
  END IF;
  IF TG_OP IN ('INSERT', 'UPDATE') THEN
    PERFORM public.recalculer_encaisse(NEW.devis_id, TG_OP = 'INSERT' AND COALESCE(NEW.montant, 0) < 0);
  END IF;
  RETURN NULL;
END;
$$;
REVOKE ALL ON FUNCTION public.apres_paiement() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS trg_recalculer_encaisse ON public.paiements;
CREATE TRIGGER trg_recalculer_encaisse
  AFTER INSERT OR UPDATE OR DELETE ON public.paiements
  FOR EACH ROW EXECUTE FUNCTION public.apres_paiement();

-- 5. Page de paiement en ligne : le reçu est le montant encaissé tenu par la base (corrections comprises, quel que
-- soit leur auteur). Définition en place modifiée sur ce seul point, comme 085.
DO $migration$
DECLARE
  v_def TEXT;
  v_neuf TEXT;
BEGIN
  IF to_regprocedure('public.get_facture_for_payment(text)') IS NULL THEN
    RETURN;
  END IF;
  v_def := pg_get_functiondef('public.get_facture_for_payment(text)'::regprocedure);
  IF position('v_recu := GREATEST(COALESCE(v_facture.montant_paye, 0), 0)' in v_def) > 0 THEN
    RETURN;
  END IF;
  v_neuf := replace(v_def, 'v_recu := GREATEST(COALESCE(v_facture.montant_paye, 0), v_paiements)',
                           'v_recu := GREATEST(COALESCE(v_facture.montant_paye, 0), 0)');
  IF v_neuf = v_def THEN
    RAISE EXCEPTION 'get_facture_for_payment n''a pas la forme attendue : correction manuelle';
  END IF;
  EXECUTE v_neuf;
END
$migration$;
