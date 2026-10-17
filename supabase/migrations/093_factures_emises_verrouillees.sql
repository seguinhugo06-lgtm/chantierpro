-- ============================================================
-- Migration 093: factures émises verrouillées en base
-- ============================================================
-- Pourquoi : relecture gardien-securite du 10 oct. 2026 (lot facturation, tâche factures-verrou-base). Les
-- garde-fous d'une facture émise n'existaient que dans l'app (gardeFacturation.js : peutModifierDocument,
-- peutSupprimerDocument ; FACTURE_TRANSITIONS) : par l'API, un compte connecté (ou tout membre de son
-- organisation) pouvait supprimer ou réécrire une facture émise, la repasser en brouillon, changer son numéro,
-- sa date, son client ou ses montants, et faire baisser le montant encaissé. Une facture émise ne se modifie ni
-- ne se supprime pas : elle se corrige par un avoir (CGI art. 289 I ; numéro unique, séquence chronologique et
-- continue, CGI ann. II art. 242 nonies A, I, 7°). Une facture émise ne s'annule pas non plus par son statut
-- (« annulée » la sortait du déjà-facturé et du chiffre d'affaires alors que sa TVA reste due, CGI art. 283, 3) ;
-- un brouillon numéroté garde son numéro et reste une facture (sinon : vider le numéro ou changer le type, puis
-- supprimer) — relecture juriste-btp du 17 oct. 2026.
-- Ce qui est verrouillé : type, nature (facture_type), numéro, date, client, montants HT / TVA / TTC, devis et
-- facture d'origine, statut (ni brouillon, ni annulée). Pas encore le détail des lignes, l'échéance, les conditions
-- de règlement ni la remise : l'app réécrit ces colonnes à chaque encaissement ; l'app les interdit
-- (gardeFacturation.peutModifierDocument), le verrou en base est une tâche suivante (CGI art. 289 V).
-- Ce qui reste permis : envoi (statut, date d'envoi), encaissement (montant payé qui ne baisse pas, statut
-- « payée », date et mode de paiement), relances, notes internes, paiement en ligne. Un encaissement saisi par
-- erreur ne s'efface pas (CGI art. 286 I 3° bis) : correction tracée, tâche suivante. Le serveur (rôle de service,
-- fonctions SECURITY DEFINER, suppression de compte) n'est pas concerné.
-- Relevé du 17 oct. 2026 : 16 factures émises (2 comptes), toutes « envoyée » ou « payée », avec numéro et client,
-- aucun numéro à l'ancien format (que l'app renumérotait à l'enregistrement), aucun montant encaissé supérieur au
-- total ; l'app ne fait jamais baisser montant_paye et ne repasse jamais une facture en brouillon.
-- Suppression d'un client (relecture gardien-securite du 17 oct. 2026, R1, bloquant) : la clé devis.client_id est en
-- ON DELETE CASCADE en production ; la cascade s'exécute en propriétaire, que ni ce déclencheur ni celui de 091
-- (signature figée) ne voient : supprimer le client effaçait ses factures émises et ses devis signés. Un client qui a
-- une facture émise ou numérotée, ou un devis signé, ne se supprime donc plus par un client de l'API (l'app le
-- refusait déjà pour les factures, Clients.jsx). Statut d'une facture émise (R2) : « envoyée », « vue » ou « payée »
-- seulement — « annulée », « refusée »… la sortaient du chiffre d'affaires et du déjà-facturé.
-- Effet : refus (42501, message en français pour l'artisan) de ces écritures par un compte connecté ou un visiteur.
--
-- ─── Vérification après application (éditeur SQL) ───────────────────────────
--   1) SELECT tgtype FROM pg_trigger WHERE tgrelid = 'public.devis'::regclass AND tgname = 'trg_garder_facture_emise';
--      attendu : 27 (BEFORE, ligne, UPDATE et DELETE)
--   2) SELECT tgtype FROM pg_trigger WHERE tgrelid = 'public.clients'::regclass AND tgname = 'trg_garder_client_documents';
--      attendu : 11 (BEFORE, ligne, DELETE)
-- ============================================================

-- Le déclencheur lit ces colonnes à chaque écriture d'un document : s'il en manquait une, toute écriture d'un
-- artisan échouerait (« record new has no field ») — la migration échoue alors, l'app non
DO $$
BEGIN
  IF (SELECT count(*) FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'devis'
      AND column_name IN ('type', 'statut', 'numero', 'date', 'client_id', 'facture_type', 'total_ht', 'total_tva',
                          'total_ttc', 'montant_paye', 'devis_source_id', 'avoir_source_id')) <> 12 THEN
    RAISE EXCEPTION '093 : une colonne lue par garder_facture_emise manque à public.devis';
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.garder_facture_emise()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  IF current_user NOT IN ('authenticated', 'anon') THEN
    RETURN COALESCE(NEW, OLD);
  END IF;
  IF OLD.type IS DISTINCT FROM 'facture' THEN
    RETURN COALESCE(NEW, OLD);
  END IF;
  IF TG_OP = 'DELETE' THEN
    IF OLD.statut IS DISTINCT FROM 'brouillon' THEN
      RAISE EXCEPTION 'Une facture émise ne se supprime pas : faites un avoir'
        USING ERRCODE = '42501';
    END IF;
    -- Numérotée, même en brouillon, elle reste dans la séquence (gardeFacturation.peutSupprimerDocument)
    IF NULLIF(OLD.numero, '') IS NOT NULL THEN
      RAISE EXCEPTION 'Une facture numérotée ne se supprime pas : la numérotation doit rester continue. Corrigez ce brouillon et utilisez-le'
        USING ERRCODE = '42501';
    END IF;
    RETURN OLD;
  END IF;
  IF OLD.statut = 'brouillon' THEN
    IF NULLIF(OLD.numero, '') IS NOT NULL
       AND (NEW.numero IS DISTINCT FROM OLD.numero OR NEW.type IS DISTINCT FROM OLD.type) THEN
      RAISE EXCEPTION 'Une facture numérotée garde son numéro : la numérotation doit rester continue'
        USING ERRCODE = '42501';
    END IF;
    RETURN NEW;
  END IF;
  IF NEW.statut = 'brouillon' THEN
    RAISE EXCEPTION 'Une facture émise ne repasse pas en brouillon : faites un avoir'
      USING ERRCODE = '42501';
  END IF;
  -- Une fois émise : envoyée, vue ou payée seulement (FACTURE_TRANSITIONS ; « vu » : affichage de l'app, réécrit à
  -- l'encaissement) — annulée, refusée, signée… la sortiraient du chiffre d'affaires et du déjà-facturé
  IF NEW.statut IS DISTINCT FROM OLD.statut AND (NEW.statut IS NULL OR NEW.statut NOT IN ('envoye', 'vu', 'payee')) THEN
    IF NEW.statut IN ('annule', 'annulee') THEN
      RAISE EXCEPTION 'Une facture émise ne s''annule pas : faites un avoir'
        USING ERRCODE = '42501';
    END IF;
    RAISE EXCEPTION 'Une facture émise reste envoyée ou payée : pour la corriger ou l''annuler, faites un avoir'
      USING ERRCODE = '42501';
  END IF;
  IF NEW.type IS DISTINCT FROM OLD.type
     OR NEW.facture_type IS DISTINCT FROM OLD.facture_type
     OR NEW.numero IS DISTINCT FROM OLD.numero
     OR NEW.date IS DISTINCT FROM OLD.date
     OR NEW.client_id IS DISTINCT FROM OLD.client_id
     OR COALESCE(NEW.total_ht, 0) <> COALESCE(OLD.total_ht, 0)
     OR COALESCE(NEW.total_tva, 0) <> COALESCE(OLD.total_tva, 0)
     OR COALESCE(NEW.total_ttc, 0) <> COALESCE(OLD.total_ttc, 0)
     OR NEW.devis_source_id IS DISTINCT FROM OLD.devis_source_id
     OR NEW.avoir_source_id IS DISTINCT FROM OLD.avoir_source_id THEN
    RAISE EXCEPTION 'Une facture émise ne se modifie pas : faites un avoir, puis une nouvelle facture si besoin'
      USING ERRCODE = '42501';
  END IF;
  IF COALESCE(NEW.montant_paye, 0) < COALESCE(OLD.montant_paye, 0) THEN
    RAISE EXCEPTION 'Un encaissement enregistré ne s''efface pas. Saisi par erreur : écrivez au support (contact@mallettico.fr) pour le corriger. Prix à réduire : faites un avoir.'
      USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.garder_facture_emise() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS trg_garder_facture_emise ON public.devis;
CREATE TRIGGER trg_garder_facture_emise
  BEFORE UPDATE OR DELETE ON public.devis
  FOR EACH ROW EXECUTE FUNCTION public.garder_facture_emise();

-- Un client qui a des pièces à conserver ne se supprime pas (sinon la cascade les efface en propriétaire).
-- Recherche en propriétaire : toutes les pièces du client comptent, même celles que la RLS cache à l'appelant.
CREATE OR REPLACE FUNCTION public.client_a_pieces_a_conserver(p_client UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.devis d
    WHERE d.client_id = p_client
      AND ((d.type = 'facture' AND (d.statut IS DISTINCT FROM 'brouillon' OR NULLIF(d.numero, '') IS NOT NULL))
           OR NULLIF(d.signature, '') IS NOT NULL OR NULLIF(d.signature_data, '') IS NOT NULL));
$$;
REVOKE ALL ON FUNCTION public.client_a_pieces_a_conserver(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.client_a_pieces_a_conserver(UUID) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.garder_client_documents()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  -- Le serveur (suppression de compte, fonctions SECURITY DEFINER) n'est pas concerné
  IF current_user NOT IN ('authenticated', 'anon') THEN
    RETURN OLD;
  END IF;
  IF public.client_a_pieces_a_conserver(OLD.id) THEN
    RAISE EXCEPTION 'Ce client a une facture émise ou numérotée, ou un devis signé : il ne se supprime pas (pièces à conserver 10 ans). Pour annuler une facture, faites un avoir'
      USING ERRCODE = '42501';
  END IF;
  RETURN OLD;
END;
$$;
REVOKE ALL ON FUNCTION public.garder_client_documents() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS trg_garder_client_documents ON public.clients;
CREATE TRIGGER trg_garder_client_documents
  BEFORE DELETE ON public.clients
  FOR EACH ROW EXECUTE FUNCTION public.garder_client_documents();

NOTIFY pgrst, 'reload schema';
