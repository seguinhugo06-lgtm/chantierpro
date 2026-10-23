-- ============================================================
-- Migration 104: attestations de ramonage (tâche ramonage, 24 oct. 2026)
-- ============================================================
-- Pourquoi : parcours ramoneur demandé par Hugo (feuille de route 0 quater septies, décision D-30, cadrage
-- docs/cadrage-ramonage.md). Des ramoneurs tiennent sur papier une fiche client (appareils, passages, prochain
-- ramonage) et remettent une attestation numérotée (code de la santé publique, R. 1331-70 à R. 1331-75 ; vacuité
-- du conduit attestée par le professionnel). L'app n'avait rien pour les appareils ni pour l'attestation.
--
-- Effet :
--   1. table `ramonages` : une ligne = une attestation de ramonage. Elle recopie à la saisie ce qui est imprimé
--      (client, lieu, appareil, conduit) : l'attestation ne bouge pas si la fiche client change. Les passages d'un
--      même appareil partagent `appareil_ref` (pas de table d'appareils : la fiche liste le dernier passage).
--      Lecture et écriture par les membres de l'organisation, comme les devis ; aucune suppression par l'app ;
--      L'identité de l'émetteur (nom imprimé, forme, adresse, SIRET, RC pro) y est recopiée aussi (`emetteur`).
--   2. numéro attribué par la base, sous verrou, à l'insertion : RAM-AAAA-NNNNN, série par organisation et par
--      année (Paris), à la suite du plus grand, la proposition de l'app ignorée ; unique ;
--   3. contenu figé dès l'insertion pour un compte connecté (valeurs envoyées ignorées, comme 103) : seuls
--      changent ensuite la facture liée (une facture de la même organisation), l'annulation (une fois, avec son
--      motif : « Annuler (erreur de saisie) » puis « Refaire » crée une attestation qui « annule et remplace »),
--      le suivi du rappel, et le client quand sa fiche est supprimée (le lien passe à vide, la copie reste) ;
--   4. vacuité obligatoire (« assurée » ou « non assurée », les mots de R. 1331-70 et R. 1331-75), précisée si
--      elle n'est pas assurée ; méthode mécanique seulement (un produit chimique n'est qu'un complément) ;
--   5. `clients.rappels_refuses_le` : date à laquelle le client a refusé les rappels de ramonage (prospection,
--      CPCE L. 34-5 ; RGPD art. 21) ; la fonction `refuser_rappels_ramonage(jeton)`, ouverte aux visiteurs, la
--      pose depuis le lien de chaque rappel : le jeton (aléatoire, propre à l'attestation) ne sert qu'à cela.
--
-- ─── Vérification après application (éditeur SQL) ───────────────────────────
--   select relrowsecurity from pg_class where oid = 'public.ramonages'::regclass;                       -- true
--   select count(*) from pg_policies where tablename = 'ramonages' and cmd = 'DELETE';                  -- 0
--   select tgname from pg_trigger where tgrelid = 'public.ramonages'::regclass and not tgisinternal order by 1;
--     attendu : trg_figer_ramonage, trg_renseigner_organisation, trg_sceller_ramonage, trg_verifier_organisation
--   select count(*) from information_schema.columns where table_name = 'clients' and column_name = 'rappels_refuses_le'; -- 1
--   select has_function_privilege('anon', 'public.refuser_rappels_ramonage(uuid)', 'execute');          -- true
--   select has_function_privilege('anon', 'public.sceller_ramonage()', 'execute');                       -- false
--   select has_table_privilege('authenticated', 'public.ramonages', 'DELETE');                           -- false
--   select tgname from pg_trigger where tgrelid = 'public.clients'::regclass and tgname = 'trg_garder_refus_rappels'; -- 1 ligne
-- Relecture gardien-securite du 24 oct. 2026 : applicable après M1 (client d'une autre organisation), M2 (lecture par
-- l'auteur sorti de l'équipe), F1 (droits), F2 (annulation datée par la base, remplacement d'une annulée, une fois),
-- F5 (refus non effaçable) — corrigés ici.
-- ============================================================

-- 1. La table
CREATE TABLE IF NOT EXISTS public.ramonages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  numero TEXT,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  appareil_ref UUID NOT NULL,
  remplace_id UUID REFERENCES public.ramonages(id) ON DELETE SET NULL,
  facture_id UUID REFERENCES public.devis(id) ON DELETE SET NULL,
  realise_le TIMESTAMPTZ NOT NULL,
  intervenant_nom TEXT NOT NULL CHECK (length(btrim(intervenant_nom)) > 0),
  -- Copie à la saisie de ce qui est imprimé, émetteur compris (relecture juriste-btp du 24 oct. 2026 : un PDF
  -- retéléchargé après un changement d'assureur ou d'adresse ne change pas d'émetteur)
  emetteur JSONB CHECK (emetteur IS NULL OR jsonb_typeof(emetteur) = 'object'),
  client_nom TEXT NOT NULL CHECK (length(btrim(client_nom)) > 0),
  client_contact TEXT,
  qualite_client TEXT NOT NULL CHECK (qualite_client IN ('proprietaire', 'locataire', 'autre')),
  qualite_precision TEXT,
  adresse_intervention TEXT NOT NULL CHECK (length(btrim(adresse_intervention)) > 0),
  appareil_type TEXT NOT NULL CHECK (appareil_type IN ('cheminee_ouverte', 'insert', 'poele_bois', 'poele_granules', 'chaudiere', 'autre')),
  combustible TEXT NOT NULL CHECK (combustible IN ('bois', 'granules', 'charbon', 'fioul', 'gaz', 'autre')),
  conduit TEXT NOT NULL CHECK (conduit IN ('maconne', 'metallique', 'tube_chemise', 'autre')),
  precisions TEXT,
  localisation TEXT,
  -- L'intervention
  methode TEXT NOT NULL CHECK (methode IN ('mecanique_manuelle', 'mecanique_rotative')),
  complement_chimique BOOLEAN NOT NULL DEFAULT false,
  raccordement TEXT NOT NULL DEFAULT 'ramone' CHECK (raccordement IN ('ramone', 'sans_objet')),
  vacuite TEXT NOT NULL CHECK (vacuite IN ('assuree', 'non_assuree')),
  vacuite_precision TEXT,
  constats JSONB NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(constats) = 'object'),
  observations TEXT,
  conseils JSONB NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(conseils) = 'object'),
  prochain_avant DATE NOT NULL,
  nb_dans_annee INTEGER NOT NULL DEFAULT 1 CHECK (nb_dans_annee BETWEEN 1 AND 12),
  prix_ht NUMERIC(10, 2) CHECK (prix_ht IS NULL OR prix_ht >= 0),
  signature TEXT,
  -- Après l'enregistrement
  annulee_le TIMESTAMPTZ,
  annulation_motif TEXT,
  rappel_fait_le TIMESTAMPTZ,
  rappel_canal TEXT CHECK (rappel_canal IS NULL OR rappel_canal IN ('email_auto', 'email', 'sms', 'appel', 'autre')),
  jeton_rappel UUID NOT NULL DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- Écrite par l'app à chaque enregistrement (comme les autres tables) ; seule date qui suit le suivi du rappel
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT ramonages_vacuite_precisee CHECK (vacuite = 'assuree' OR length(btrim(coalesce(vacuite_precision, ''))) > 0),
  CONSTRAINT ramonages_annulation_motivee CHECK (annulee_le IS NULL OR length(btrim(coalesce(annulation_motif, ''))) > 0)
);

COMMENT ON TABLE public.ramonages IS
  'Attestations de ramonage (R. 1331-75 CSP), figées dès l''insertion ; numéro attribué par la base (migration 104).';

CREATE UNIQUE INDEX IF NOT EXISTS ramonages_numero_unique
  ON public.ramonages (coalesce(organization_id, user_id), numero) WHERE numero IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS ramonages_jeton_rappel_unique ON public.ramonages (jeton_rappel);
-- Une attestation annulée n'est remplacée qu'une fois
CREATE UNIQUE INDEX IF NOT EXISTS ramonages_remplace_unique ON public.ramonages (remplace_id) WHERE remplace_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ramonages_user ON public.ramonages (user_id);
CREATE INDEX IF NOT EXISTS idx_ramonages_org ON public.ramonages (organization_id);
CREATE INDEX IF NOT EXISTS idx_ramonages_client ON public.ramonages (client_id);
CREATE INDEX IF NOT EXISTS idx_ramonages_appareil ON public.ramonages (appareil_ref);
CREATE INDEX IF NOT EXISTS idx_ramonages_prochain ON public.ramonages (prochain_avant) WHERE annulee_le IS NULL AND rappel_fait_le IS NULL;

ALTER TABLE public.ramonages ENABLE ROW LEVEL SECURITY;

-- Membres de l'organisation, comme les devis ; aucune suppression (aucune policy DELETE : l'attestation remise
-- reste ; une erreur s'annule). La suppression du compte passe par la cascade de auth.users.
-- Relecture gardien-securite (M2) : l'auteur seul ne suffit pas (un salarié retiré de l'équipe lisait et annulait
-- encore ses attestations) ; sans organisation, l'auteur (un compte sans équipe : 079 remplit sinon l'organisation)
DROP POLICY IF EXISTS "Ramonages : lecture" ON public.ramonages;
CREATE POLICY "Ramonages : lecture" ON public.ramonages FOR SELECT TO authenticated
  USING (organization_id = ANY (public.user_org_ids(auth.uid())) OR (organization_id IS NULL AND user_id = auth.uid()));
DROP POLICY IF EXISTS "Ramonages : création" ON public.ramonages;
CREATE POLICY "Ramonages : création" ON public.ramonages FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND (organization_id IS NULL OR organization_id = ANY (public.user_org_ids(auth.uid()))));
DROP POLICY IF EXISTS "Ramonages : suivi" ON public.ramonages;
CREATE POLICY "Ramonages : suivi" ON public.ramonages FOR UPDATE TO authenticated
  USING (organization_id = ANY (public.user_org_ids(auth.uid())) OR (organization_id IS NULL AND user_id = auth.uid()))
  WITH CHECK (organization_id = ANY (public.user_org_ids(auth.uid())) OR (organization_id IS NULL AND user_id = auth.uid()));

-- Les droits par défaut laissent DELETE, TRUNCATE… aux comptes : tout retirer, puis accorder le nécessaire (F1)
REVOKE ALL ON public.ramonages FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.ramonages TO authenticated;

-- 2. Organisation : remplie si absente (079), contrôlée (084) — mêmes déclencheurs que les autres tables métier
DROP TRIGGER IF EXISTS trg_renseigner_organisation ON public.ramonages;
CREATE TRIGGER trg_renseigner_organisation BEFORE INSERT ON public.ramonages
  FOR EACH ROW EXECUTE FUNCTION public.renseigner_organisation();
DROP TRIGGER IF EXISTS trg_verifier_organisation ON public.ramonages;
CREATE TRIGGER trg_verifier_organisation BEFORE INSERT OR UPDATE OF organization_id ON public.ramonages
  FOR EACH ROW EXECUTE FUNCTION public.garder_organisation();

-- Facture liée : une facture (pas un devis) de la même organisation
CREATE OR REPLACE FUNCTION public.ramonage_facture_valide(p_facture UUID, p_org UUID, p_user UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.devis d
     WHERE d.id = p_facture AND d.type = 'facture'
       AND coalesce(d.organization_id, d.user_id) = coalesce(p_org, p_user)
  );
$$;
REVOKE ALL ON FUNCTION public.ramonage_facture_valide(UUID, UUID, UUID) FROM PUBLIC, anon, authenticated;

-- 3. Numéro, à l'insertion (« sceller » s'exécute après « renseigner » : l'organisation est connue)
CREATE OR REPLACE FUNCTION public.sceller_ramonage()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_an INTEGER := extract(year FROM (now() AT TIME ZONE 'Europe/Paris'))::int;
  v_serie UUID := coalesce(NEW.organization_id, NEW.user_id);
  v_prefixe TEXT;
  v_dernier INTEGER;
BEGIN
  v_prefixe := 'RAM-' || v_an || '-';
  PERFORM pg_advisory_xact_lock(hashtextextended('ramonage:' || v_serie::text || ':' || v_an, 0));
  SELECT coalesce(max(substring(numero FROM length(v_prefixe) + 1)::int), 0) INTO v_dernier
    FROM public.ramonages
   WHERE coalesce(organization_id, user_id) = v_serie
     AND numero ~ ('^RAM-' || v_an || '-[0-9]{5}$');
  NEW.numero := v_prefixe || lpad((v_dernier + 1)::text, 5, '0');
  -- Une attestation naît vivante, sans rappel fait ; le jeton du lien de désinscription est tiré par la base
  NEW.annulee_le := NULL;
  NEW.annulation_motif := NULL;
  NEW.rappel_fait_le := NULL;
  NEW.rappel_canal := NULL;
  NEW.jeton_rappel := gen_random_uuid();
  NEW.created_at := now();
  NEW.updated_at := now();
  IF NEW.facture_id IS NOT NULL AND NOT public.ramonage_facture_valide(NEW.facture_id, NEW.organization_id, NEW.user_id) THEN
    RAISE EXCEPTION 'Facture inconnue dans votre organisation' USING ERRCODE = '42501';
  END IF;
  -- Le client : de la même organisation (relecture gardien-securite, M1 : sinon le lien de désinscription écrivait
  -- chez le client d'une autre organisation)
  IF NEW.client_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.clients c WHERE c.id = NEW.client_id AND coalesce(c.organization_id, c.user_id) = v_serie
  ) THEN
    RAISE EXCEPTION 'Client inconnu dans votre organisation' USING ERRCODE = '42501';
  END IF;
  -- « Annule et remplace » : une attestation déjà annulée de la même organisation (F2)
  IF NEW.remplace_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.ramonages r WHERE r.id = NEW.remplace_id AND coalesce(r.organization_id, r.user_id) = v_serie
       AND r.annulee_le IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'Seule une attestation annulée de votre organisation peut être remplacée' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.sceller_ramonage() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_sceller_ramonage ON public.ramonages;
CREATE TRIGGER trg_sceller_ramonage BEFORE INSERT ON public.ramonages
  FOR EACH ROW EXECUTE FUNCTION public.sceller_ramonage();

-- 4. Contenu figé dès l'insertion, pour un compte connecté. Le serveur, les fonctions SECURITY DEFINER (suppression du
--    compte, qui rend au gérant les lignes d'un salarié) et les actions des clés étrangères ne sont pas concernés
--    (même règle que 093, 099 et 103 : current_user)
CREATE OR REPLACE FUNCTION public.figer_ramonage()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  IF current_user NOT IN ('authenticated', 'anon') THEN
    RETURN NEW;
  END IF;
  -- Tout reprend sa valeur, sauf ce qui suit l'attestation
  NEW := jsonb_populate_record(NEW, to_jsonb(OLD)
    - ARRAY['facture_id', 'client_id', 'remplace_id', 'annulee_le', 'annulation_motif', 'rappel_fait_le', 'rappel_canal', 'updated_at']);
  -- Le client et l'attestation remplacée : seulement vidés, jamais remplacés
  IF NEW.client_id IS NOT NULL AND NEW.client_id IS DISTINCT FROM OLD.client_id THEN
    NEW.client_id := OLD.client_id;
  END IF;
  IF NEW.remplace_id IS NOT NULL AND NEW.remplace_id IS DISTINCT FROM OLD.remplace_id THEN
    NEW.remplace_id := OLD.remplace_id;
  END IF;
  -- L'annulation : une fois, définitive, à la date du jour (la date envoyée est ignorée : F2)
  IF OLD.annulee_le IS NOT NULL THEN
    NEW.annulee_le := OLD.annulee_le;
    NEW.annulation_motif := OLD.annulation_motif;
  ELSIF NEW.annulee_le IS NOT NULL THEN
    NEW.annulee_le := now();
  END IF;
  -- La facture liée : une facture que le compte voit (RLS), de la même organisation
  IF NEW.facture_id IS NOT NULL AND NEW.facture_id IS DISTINCT FROM OLD.facture_id AND NOT EXISTS (
    SELECT 1 FROM public.devis d
     WHERE d.id = NEW.facture_id AND d.type = 'facture'
       AND coalesce(d.organization_id, d.user_id) = coalesce(NEW.organization_id, NEW.user_id)
  ) THEN
    RAISE EXCEPTION 'Facture inconnue dans votre organisation' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.figer_ramonage() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_figer_ramonage ON public.ramonages;
CREATE TRIGGER trg_figer_ramonage BEFORE UPDATE ON public.ramonages
  FOR EACH ROW EXECUTE FUNCTION public.figer_ramonage();

-- 5. Refus des rappels
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS rappels_refuses_le TIMESTAMPTZ;
COMMENT ON COLUMN public.clients.rappels_refuses_le IS
  'Date à laquelle le client a refusé les rappels de ramonage (CPCE L. 34-5, RGPD art. 21) ; aucun rappel ensuite (migration 104).';

-- Lien « ne plus recevoir de rappel » de chaque rappel : le jeton de l'attestation désigne le client ; rien d'autre
-- n'est lu ni renvoyé. Jeton inconnu : false.
CREATE OR REPLACE FUNCTION public.refuser_rappels_ramonage(p_jeton UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_client UUID;
  v_serie UUID;
  v_trouve BOOLEAN;
BEGIN
  IF p_jeton IS NULL THEN
    RETURN false;
  END IF;
  SELECT true, client_id, coalesce(organization_id, user_id) INTO v_trouve, v_client, v_serie
    FROM public.ramonages WHERE jeton_rappel = p_jeton;
  IF NOT coalesce(v_trouve, false) THEN
    RETURN false;
  END IF;
  -- Le client de l'attestation, dans l'organisation de l'attestation seulement
  IF v_client IS NOT NULL THEN
    UPDATE public.clients SET rappels_refuses_le = coalesce(rappels_refuses_le, now())
     WHERE id = v_client AND coalesce(organization_id, user_id) = v_serie;
  END IF;
  RETURN true;
END;
$$;
REVOKE ALL ON FUNCTION public.refuser_rappels_ramonage(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.refuser_rappels_ramonage(UUID) TO anon, authenticated;

-- 6. Un refus ne s'efface pas par l'API (relecture gardien-securite, F5 : la prospection reprendrait malgré l'opposition
--    du client, RGPD art. 21) ; le serveur n'est pas concerné. Seulement quand la colonne est écrite.
CREATE OR REPLACE FUNCTION public.garder_refus_rappels()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  IF current_user IN ('authenticated', 'anon') AND OLD.rappels_refuses_le IS NOT NULL THEN
    NEW.rappels_refuses_le := OLD.rappels_refuses_le;
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.garder_refus_rappels() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_garder_refus_rappels ON public.clients;
CREATE TRIGGER trg_garder_refus_rappels BEFORE UPDATE OF rappels_refuses_le ON public.clients
  FOR EACH ROW EXECUTE FUNCTION public.garder_refus_rappels();
