-- ============================================================
-- Migration 113: attestations d'entretien (chaudière, pompe à chaleur, poêle) — lot métier n° 2, 4 nov. 2026
-- ============================================================
-- Pourquoi : décision D-33 (Hugo, 4 nov. 2026) : premier lot métier après le ramonage. Un chauffagiste, un frigoriste
-- ou un ramoneur doit remettre une attestation d'entretien dont le contenu « a minima » est fixé par arrêté (chaudière :
-- arrêté du 15 sept. 2009, annexe 5 ; PAC : arrêté du 24 juil. 2020, annexe 3 ; poêle : arrêté du 20 juil. 2023,
-- annexe 3), puis rappeler le client avant le prochain entretien. Avis juriste-btp du 4 nov. 2026, lu au texte
-- (docs/metiers/avis-juriste-2026-11-04-entretien.md). Aucune table ne portait ces données.
--
-- Effet (même mécanique que 104, les attestations de ramonage) :
--   1. table `entretiens` : une ligne = une attestation. Elle recopie à la saisie ce qui est imprimé (commanditaire,
--      installation, local, appareils, émetteur). `categorie` : chaudiere | pac | poele. Les appareils sont une liste
--      (jsonb) : une chaudière ou un système thermodynamique par attestation, plusieurs poêles dans une même visite.
--      Lecture et écriture par les membres de l'organisation ; aucune suppression par l'app ;
--   2. numéro attribué par la base, sous verrou, à l'insertion : ENT-AAAA-NNNNN, série par organisation et par année ;
--   3. contenu figé dès l'insertion pour un compte connecté : seuls changent ensuite la facture liée, l'annulation (une
--      fois, motivée, datée par la base), le suivi du rappel, et le client quand sa fiche est supprimée ;
--   4. contraintes de l'annexe : une chaudière porte sa mesure de CO (la phrase imprimée en dépend), la date conseillée
--      suit la visite, la puissance est positive ;
--   5. le lien « ne plus recevoir de rappel » : `refuser_rappels_ramonage(jeton)` (104), déjà ouverte aux visiteurs,
--      reconnaît aussi le jeton d'une attestation d'entretien. Aucune nouvelle fonction publique (092 : liste exacte).
--      Le refus est celui de 104 (`clients.rappels_refuses_le`) : il vaut pour tous les rappels de l'artisan.
--
-- ─── Vérification après application (éditeur SQL) ───────────────────────────
--   select relrowsecurity from pg_class where oid = 'public.entretiens'::regclass;                       -- true
--   select count(*) from pg_policies where tablename = 'entretiens' and cmd = 'DELETE';                  -- 0
--   select tgname from pg_trigger where tgrelid = 'public.entretiens'::regclass and not tgisinternal order by 1;
--     attendu : trg_figer_entretien, trg_renseigner_organisation, trg_sceller_entretien, trg_verifier_organisation
--   select has_table_privilege('authenticated', 'public.entretiens', 'DELETE');                           -- false
--   select has_function_privilege('anon', 'public.sceller_entretien()', 'execute');                       -- false
--   select prosrc like '%entretiens%' from pg_proc where proname = 'refuser_rappels_ramonage';            -- true
--     (à refaire après toute réapplication de 104, qui remettrait l'ancienne fonction : rejouer alors 113)
-- Banc : scripts/banc/113.mjs. À relire par gardien-securite avant application (D-22).
-- ============================================================

-- 1. La table
CREATE TABLE IF NOT EXISTS public.entretiens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  numero TEXT,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  appareil_ref UUID NOT NULL,
  remplace_id UUID REFERENCES public.entretiens(id) ON DELETE SET NULL,
  facture_id UUID REFERENCES public.devis(id) ON DELETE SET NULL,
  categorie TEXT NOT NULL CHECK (categorie IN ('chaudiere', 'pac', 'poele')),
  realise_le TIMESTAMPTZ NOT NULL,
  intervenant_nom TEXT NOT NULL CHECK (length(btrim(intervenant_nom)) > 0),
  emetteur JSONB CHECK (emetteur IS NULL OR jsonb_typeof(emetteur) = 'object'),
  -- Commanditaire et installation (annexes : « nom et adresse du commanditaire ; adresse de l'installation et local »)
  client_nom TEXT NOT NULL CHECK (length(btrim(client_nom)) > 0),
  client_adresse TEXT NOT NULL CHECK (length(btrim(client_adresse)) > 0),
  client_contact TEXT,
  adresse_installation TEXT NOT NULL CHECK (length(btrim(adresse_installation)) > 0),
  local TEXT NOT NULL CHECK (length(btrim(local)) > 0),
  -- Les appareils (identification et points contrôlés de chacun) : au moins un
  appareils JSONB NOT NULL CHECK (jsonb_typeof(appareils) = 'array' AND jsonb_array_length(appareils) BETWEEN 1 AND 10),
  puissance_kw NUMERIC(8, 2) CHECK (puissance_kw IS NULL OR puissance_kw > 0),
  contrat_performance BOOLEAN NOT NULL DEFAULT false,
  dernier_entretien DATE,
  dernier_ramonage DATE,
  -- La visite
  -- Exigés pour la chaudière (annexe 5) et la PAC (annexe 3) ; pas pour le poêle (arrêté du 20 juil. 2023, annexe 3)
  appareils_mesure TEXT,
  mesures JSONB NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(mesures) = 'object'),
  operations TEXT,
  co_ppm NUMERIC(8, 2) CHECK (co_ppm IS NULL OR co_ppm >= 0),
  rendement JSONB NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(rendement) = 'object'),
  emissions JSONB NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(emissions) = 'object'),
  classe_energetique TEXT,
  etancheite TEXT CHECK (etancheite IS NULL OR etancheite IN ('controle', 'reglement_ue')),
  etancheite_detail TEXT,
  defauts TEXT,
  actions TEXT,
  conseils JSONB NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(conseils) = 'object'),
  observations TEXT,
  prochain_avant DATE NOT NULL,
  echeance_legale DATE,
  -- Facture : taux proposé (suggestion), données déclarées par l'artisan
  logement_plus_2_ans BOOLEAN NOT NULL DEFAULT true,
  eligible_55 BOOLEAN NOT NULL DEFAULT false,
  eligible_55_detail TEXT,
  prix_ht NUMERIC(10, 2) CHECK (prix_ht IS NULL OR prix_ht >= 0),
  signature TEXT,
  -- Après l'enregistrement
  annulee_le TIMESTAMPTZ,
  annulation_motif TEXT,
  rappel_fait_le TIMESTAMPTZ,
  rappel_canal TEXT CHECK (rappel_canal IS NULL OR rappel_canal IN ('email_auto', 'email', 'sms', 'appel', 'autre')),
  jeton_rappel UUID NOT NULL DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- Annexe 5 : la phrase du CO imprimée dépend de la mesure, qui est donc exigée pour une chaudière
  CONSTRAINT entretiens_co_chaudiere CHECK (categorie <> 'chaudiere' OR co_ppm IS NOT NULL),
  CONSTRAINT entretiens_appareils_mesure CHECK (categorie = 'poele' OR length(btrim(coalesce(appareils_mesure, ''))) > 0),
  CONSTRAINT entretiens_prochain_apres_visite CHECK (prochain_avant > (realise_le AT TIME ZONE 'Europe/Paris')::date),
  CONSTRAINT entretiens_annulation_motivee CHECK (annulee_le IS NULL OR length(btrim(coalesce(annulation_motif, ''))) > 0)
);

COMMENT ON TABLE public.entretiens IS
  'Attestations d''entretien (chaudière R. 224-41-8, PAC R. 224-44-4 C. env. ; poêle R. 1331-75 CSP), figées dès l''insertion ; numéro attribué par la base (migration 113).';

CREATE UNIQUE INDEX IF NOT EXISTS entretiens_numero_unique
  ON public.entretiens (coalesce(organization_id, user_id), numero) WHERE numero IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS entretiens_jeton_rappel_unique ON public.entretiens (jeton_rappel);
CREATE UNIQUE INDEX IF NOT EXISTS entretiens_remplace_unique ON public.entretiens (remplace_id) WHERE remplace_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_entretiens_user ON public.entretiens (user_id);
CREATE INDEX IF NOT EXISTS idx_entretiens_org ON public.entretiens (organization_id);
CREATE INDEX IF NOT EXISTS idx_entretiens_client ON public.entretiens (client_id);
CREATE INDEX IF NOT EXISTS idx_entretiens_appareil ON public.entretiens (appareil_ref);
CREATE INDEX IF NOT EXISTS idx_entretiens_prochain ON public.entretiens (prochain_avant) WHERE annulee_le IS NULL AND rappel_fait_le IS NULL;

ALTER TABLE public.entretiens ENABLE ROW LEVEL SECURITY;

-- Mêmes policies que 104 (relecture gardien-securite du 24 oct., M2) : l'organisation ; sans organisation, l'auteur
DROP POLICY IF EXISTS "Entretiens : lecture" ON public.entretiens;
CREATE POLICY "Entretiens : lecture" ON public.entretiens FOR SELECT TO authenticated
  USING (organization_id = ANY (public.user_org_ids(auth.uid())) OR (organization_id IS NULL AND user_id = auth.uid()));
DROP POLICY IF EXISTS "Entretiens : création" ON public.entretiens;
CREATE POLICY "Entretiens : création" ON public.entretiens FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND (organization_id IS NULL OR organization_id = ANY (public.user_org_ids(auth.uid()))));
DROP POLICY IF EXISTS "Entretiens : suivi" ON public.entretiens;
CREATE POLICY "Entretiens : suivi" ON public.entretiens FOR UPDATE TO authenticated
  USING (organization_id = ANY (public.user_org_ids(auth.uid())) OR (organization_id IS NULL AND user_id = auth.uid()))
  WITH CHECK (organization_id = ANY (public.user_org_ids(auth.uid())) OR (organization_id IS NULL AND user_id = auth.uid()));

REVOKE ALL ON public.entretiens FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.entretiens TO authenticated;

-- 2. Organisation : remplie si absente (079), contrôlée (084)
DROP TRIGGER IF EXISTS trg_renseigner_organisation ON public.entretiens;
CREATE TRIGGER trg_renseigner_organisation BEFORE INSERT ON public.entretiens
  FOR EACH ROW EXECUTE FUNCTION public.renseigner_organisation();
DROP TRIGGER IF EXISTS trg_verifier_organisation ON public.entretiens;
CREATE TRIGGER trg_verifier_organisation BEFORE INSERT OR UPDATE OF organization_id ON public.entretiens
  FOR EACH ROW EXECUTE FUNCTION public.garder_organisation();

-- 3. Numéro, à l'insertion (après « renseigner » : l'organisation est connue). La facture liée se contrôle avec la
--    fonction de 104 (une facture de la même organisation), fermée aux comptes.
CREATE OR REPLACE FUNCTION public.sceller_entretien()
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
  v_prefixe := 'ENT-' || v_an || '-';
  PERFORM pg_advisory_xact_lock(hashtextextended('entretien:' || v_serie::text || ':' || v_an, 0));
  SELECT coalesce(max(substring(numero FROM length(v_prefixe) + 1)::int), 0) INTO v_dernier
    FROM public.entretiens
   WHERE coalesce(organization_id, user_id) = v_serie
     AND numero ~ ('^ENT-' || v_an || '-[0-9]{5}$');
  NEW.numero := v_prefixe || lpad((v_dernier + 1)::text, 5, '0');
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
  IF NEW.client_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.clients c WHERE c.id = NEW.client_id AND coalesce(c.organization_id, c.user_id) = v_serie
  ) THEN
    RAISE EXCEPTION 'Client inconnu dans votre organisation' USING ERRCODE = '42501';
  END IF;
  IF NEW.remplace_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.entretiens r WHERE r.id = NEW.remplace_id AND coalesce(r.organization_id, r.user_id) = v_serie
       AND r.annulee_le IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'Seule une attestation annulée de votre organisation peut être remplacée' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.sceller_entretien() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_sceller_entretien ON public.entretiens;
CREATE TRIGGER trg_sceller_entretien BEFORE INSERT ON public.entretiens
  FOR EACH ROW EXECUTE FUNCTION public.sceller_entretien();

-- 4. Contenu figé dès l'insertion, pour un compte connecté (même règle que 104 : current_user)
CREATE OR REPLACE FUNCTION public.figer_entretien()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  IF current_user NOT IN ('authenticated', 'anon') THEN
    RETURN NEW;
  END IF;
  -- client_id, remplace_id et updated_at sont figés eux aussi (relecture gardien-securite : un compte ne vide ni le
  -- client ni l'attestation remplacée). La suppression d'une fiche client vide le lien par ON DELETE SET NULL, exécutée
  -- en propriétaire de la table : elle passe la garde current_user ci-dessus.
  NEW := jsonb_populate_record(NEW, to_jsonb(OLD)
    - ARRAY['facture_id', 'annulee_le', 'annulation_motif', 'rappel_fait_le', 'rappel_canal']);
  NEW.updated_at := now();
  IF OLD.annulee_le IS NOT NULL THEN
    NEW.annulee_le := OLD.annulee_le;
    NEW.annulation_motif := OLD.annulation_motif;
  ELSIF NEW.annulee_le IS NOT NULL THEN
    NEW.annulee_le := now();
  END IF;
  -- Un rappel envoyé par le serveur ne s'efface pas par une ligne relue avant l'envoi (relecture gardien-securite du
  -- 4 nov. 2026, m1 : lier une facture renvoyait rappel_fait_le = null, et un second e-mail partait le lendemain)
  IF OLD.rappel_canal = 'email_auto' AND NEW.rappel_fait_le IS NULL THEN
    NEW.rappel_fait_le := OLD.rappel_fait_le;
    NEW.rappel_canal := OLD.rappel_canal;
  END IF;
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
REVOKE ALL ON FUNCTION public.figer_entretien() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_figer_entretien ON public.entretiens;
CREATE TRIGGER trg_figer_entretien BEFORE UPDATE ON public.entretiens
  FOR EACH ROW EXECUTE FUNCTION public.figer_entretien();

-- 5. Le lien de désinscription reconnaît aussi le jeton d'une attestation d'entretien. Signature, droits et réponse
--    inchangés (104) : jeton inconnu → false ; rien d'autre n'est lu ni renvoyé ; le refus ne s'écrit que chez le client
--    de l'attestation, dans l'organisation de l'attestation.
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
    SELECT true, client_id, coalesce(organization_id, user_id) INTO v_trouve, v_client, v_serie
      FROM public.entretiens WHERE jeton_rappel = p_jeton;
  END IF;
  IF NOT coalesce(v_trouve, false) THEN
    RETURN false;
  END IF;
  IF v_client IS NOT NULL THEN
    UPDATE public.clients SET rappels_refuses_le = coalesce(rappels_refuses_le, now())
     WHERE id = v_client AND coalesce(organization_id, user_id) = v_serie;
  END IF;
  RETURN true;
END;
$$;
REVOKE ALL ON FUNCTION public.refuser_rappels_ramonage(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.refuser_rappels_ramonage(UUID) TO anon, authenticated;

COMMENT ON COLUMN public.clients.rappels_refuses_le IS
  'Date à laquelle le client a refusé les rappels (ramonage, entretien : CPCE L. 34-5, RGPD art. 21) ; aucun rappel ensuite (migrations 104, 113).';
