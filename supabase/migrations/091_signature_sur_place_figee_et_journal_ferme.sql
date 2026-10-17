-- ============================================================
-- Migration 091: signature sur place figée et journal fermé
-- ============================================================
-- Pourquoi : relecture gardien-securite du 17 oct. 2026 (seconde passe de 090, tâche signature-figee) :
--   1. La signature sur place (colonnes signature, signature_date, signataire) n'était gardée par aucun
--      déclencheur (086 ne protège que la signature par le lien, signature_data) : en deux écritures
--      (effacer, puis resigner), un compte pouvait changer après coup la demande expresse (086) ou
--      l'accord pour l'exemplaire par e-mail (090) d'un devis signé, ou effacer la signature elle-même.
--      Aucun parcours de l'app n'efface ni ne change une signature posée. Même contournement par la
--      suppression : supprimer le devis signé puis le réinsérer (même identifiant, même numéro) avec une
--      signature et une demande expresse au choix (seconde relecture du 17 oct. 2026) — un devis signé (sur
--      place ou par le lien) ne se supprime donc plus par l'app ; il s'annule, ou un avenant le modifie.
--      Valeurs vides : '' et NULL sont confondues (l'app envoie NULL pour une valeur absente).
--   2. events_log acceptait l'insertion de n'importe qui (policy « Service role can insert events »,
--      WITH CHECK (true), sans TO service_role : la clé publique suffisait) : une fausse ligne
--      « exemplaire envoyé » ou « accusé envoyé » pouvait y être écrite. Seules les fonctions Edge y
--      écrivent, avec la clé de service, qui n'a besoin d'aucune policy.
--   3. La notification « devis signé » à l'artisan se dédoublonnait en lisant puis en écrivant le journal :
--      des appels simultanés envoyaient plusieurs e-mails. Un index unique en fait une réservation (aussi
--      pour l'avis d'échec de l'accusé ; l'exemplaire et l'accusé sont déjà réservés par une colonne du devis).
-- Effet : une signature sur place, une fois posée, ne se modifie ni ne s'efface plus par l'app ou un
-- visiteur, et un devis signé ne se supprime plus (le serveur n'est pas concerné : suppression de compte,
-- fonctions SECURITY DEFINER) ; plus aucune insertion dans events_log par un client ; une seule ligne par
-- devis pour la notification de signature et l'avis d'échec de l'accusé (relevé du 17 oct. 2026 : aucun
-- doublon, aucune signature ni aucun signataire vides).
-- Ordre de mise en production : appliquer 091 AVANT de déployer notify-signature v17 (la réservation suppose
-- l'index), après avoir relancé la requête 4 (l'ancienne fonction peut encore créer un doublon).
--
-- ─── Vérification après application (éditeur SQL) ───────────────────────────
--   1) SELECT count(*) FROM pg_trigger WHERE tgrelid = 'public.devis'::regclass AND tgname = 'trg_garder_signature_sur_place';
--      attendu : 1
--   2) SELECT count(*) FROM pg_policies WHERE schemaname = 'public' AND tablename = 'events_log' AND cmd = 'INSERT';
--      attendu : 0
--   3) SELECT count(*) FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'events_log_une_ligne_par_devis';
--      attendu : 1
--   4) AVANT d'appliquer : SELECT count(*) FROM (SELECT 1 FROM public.events_log WHERE event_type IN
--        ('devis_signed_notified', 'devis_retractation_accuse_echec') GROUP BY event_type, entity_id HAVING count(*) > 1) d;
--      attendu : 0
--   5) SELECT has_table_privilege('service_role', 'public.events_log', 'DELETE')
--        AND has_table_privilege('service_role', 'public.events_log', 'UPDATE');   attendu : true (rendu et
--      confirmation des réservations par notify-signature)
-- ============================================================

-- 1. Signature sur place figée une fois posée ; devis signé non supprimable
CREATE OR REPLACE FUNCTION public.garder_signature_sur_place()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  IF current_user NOT IN ('authenticated', 'anon') THEN
    RETURN COALESCE(NEW, OLD);
  END IF;
  IF TG_OP = 'DELETE' THEN
    IF NULLIF(OLD.signature, '') IS NOT NULL OR NULLIF(OLD.signature_data, '') IS NOT NULL THEN
      RAISE EXCEPTION 'Un devis signé ne se supprime pas : annulez-le, ou faites signer un avenant au client'
        USING ERRCODE = '42501';
    END IF;
    RETURN OLD;
  END IF;
  IF NULLIF(OLD.signature, '') IS NOT NULL
     AND (NULLIF(NEW.signature, '') IS DISTINCT FROM NULLIF(OLD.signature, '')
          OR NEW.signature_date IS DISTINCT FROM OLD.signature_date
          OR NULLIF(NEW.signataire, '') IS DISTINCT FROM NULLIF(OLD.signataire, '')) THEN
    RAISE EXCEPTION 'Un devis signé sur place ne se modifie plus : pour changer les travaux ou le prix, faites signer un avenant au client'
      USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.garder_signature_sur_place() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS trg_garder_signature_sur_place ON public.devis;
CREATE TRIGGER trg_garder_signature_sur_place
  BEFORE UPDATE OF signature, signature_date, signataire OR DELETE ON public.devis
  FOR EACH ROW EXECUTE FUNCTION public.garder_signature_sur_place();

-- 2. Journal des événements : écrit par le serveur seul (rôle de service, sans policy)
DROP POLICY IF EXISTS "Service role can insert events" ON public.events_log;
REVOKE INSERT, UPDATE, DELETE ON public.events_log FROM anon, authenticated;

-- 3. Une ligne par devis pour ces événements : l'insertion sert de réservation (notify-signature)
CREATE UNIQUE INDEX IF NOT EXISTS events_log_une_ligne_par_devis ON public.events_log (event_type, entity_id)
  WHERE event_type IN ('devis_signed_notified', 'devis_retractation_accuse_echec');

NOTIFY pgrst, 'reload schema';
