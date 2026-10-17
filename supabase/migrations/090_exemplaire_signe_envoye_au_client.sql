-- ============================================================
-- Migration 090: exemplaire signé envoyé au client
-- ============================================================
-- Pourquoi : après une signature, seul l'artisan recevait un e-mail ; le client n'avait qu'un bouton
-- de téléchargement sur la page. La confirmation du contrat sur support durable est due au client
-- (C. conso. L221-13 pour un contrat à distance ; L221-9 pour un contrat hors établissement :
-- un exemplaire daté du contrat, sur papier signé par les parties ou, avec son accord, sur un autre
-- support durable ; à peine de nullité, L242-1, et délit, L242-5),
-- accompagnée du formulaire de rétractation (tâche confirmation-client de docs/feuille-de-route.md).
-- Effet : devis.exemplaire_client_le date l'envoi de l'exemplaire signé (PDF) à l'adresse de la
-- fiche du client. Écrit par notify-signature (signature par le lien : un seul envoi, réservé par
-- une mise à jour conditionnelle) ou par l'app quand l'artisan l'envoie lui-même (signature sur
-- place). L'artisan peut l'écrire sur ses devis : c'est son information, sans effet sur un autre
-- compte. devis.exemplaire_email_accepte_le date l'accord du client, donné à la signature sur place,
-- pour recevoir son exemplaire par e-mail plutôt que sur papier (L221-9) : il s'écrit avec la signature
-- et ne se modifie plus ensuite (trace posée avec la signature ; relecture juriste-btp du 17 oct. 2026). Il
-- porte la date de la signature (l'app écrit les deux à partir de la même valeur). Limite connue : la
-- signature sur place elle-même n'est pas figée (tâche signature-figee).
--
-- ─── Vérification après application (éditeur SQL) ───────────────────────────
--   SELECT column_name, data_type FROM information_schema.columns WHERE table_schema = 'public'
--   AND table_name = 'devis' AND column_name IN ('exemplaire_client_le', 'exemplaire_email_accepte_le') ORDER BY 1;
--   attendu : 2 lignes, timestamp with time zone
--   SELECT count(*) FROM pg_trigger WHERE tgrelid = 'public.devis'::regclass AND tgname = 'trg_garder_accord_exemplaire';
--   attendu : 1
-- ============================================================

ALTER TABLE public.devis ADD COLUMN IF NOT EXISTS exemplaire_client_le TIMESTAMPTZ;
COMMENT ON COLUMN public.devis.exemplaire_client_le IS
  'Envoi au client de son exemplaire signé (PDF, support durable : C. conso. L221-9, L221-13)';

ALTER TABLE public.devis ADD COLUMN IF NOT EXISTS exemplaire_email_accepte_le TIMESTAMPTZ;
COMMENT ON COLUMN public.devis.exemplaire_email_accepte_le IS
  'Accord du client, à la signature sur place, pour recevoir son exemplaire par e-mail (C. conso. L221-9)';

-- L'accord s'écrit dans la même écriture que la signature sur place, à la date de la signature, et plus
-- jamais ensuite (ni posé, ni effacé) : un accord ajouté après coup ne prouverait rien. Le serveur (rôle de
-- service, propriétaire) n'est pas concerné.
CREATE OR REPLACE FUNCTION public.garder_accord_exemplaire()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  IF current_user IN ('authenticated', 'anon') THEN
    IF TG_OP = 'INSERT' AND NEW.exemplaire_email_accepte_le IS NOT NULL THEN
      RAISE EXCEPTION 'L''accord du client pour l''exemplaire par e-mail se donne à la signature';
    END IF;
    IF TG_OP = 'UPDATE' AND NEW.exemplaire_email_accepte_le IS DISTINCT FROM OLD.exemplaire_email_accepte_le
       AND (OLD.signature IS NOT NULL OR OLD.signature_data IS NOT NULL OR NEW.signature IS NULL
            OR NEW.exemplaire_email_accepte_le IS DISTINCT FROM NEW.signature_date) THEN
      RAISE EXCEPTION 'L''accord du client pour l''exemplaire par e-mail se donne à la signature, et ne se modifie plus';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.garder_accord_exemplaire() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS trg_garder_accord_exemplaire ON public.devis;
CREATE TRIGGER trg_garder_accord_exemplaire
  BEFORE INSERT OR UPDATE OF exemplaire_email_accepte_le ON public.devis
  FOR EACH ROW EXECUTE FUNCTION public.garder_accord_exemplaire();

NOTIFY pgrst, 'reload schema';
