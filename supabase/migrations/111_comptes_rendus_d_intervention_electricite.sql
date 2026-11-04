-- ============================================================
-- Migration 111: comptes rendus d'intervention et d'autocontrôle (électricité, 4 nov. 2026)
-- ============================================================
-- Pourquoi : lot 4 de docs/metiers/synthese.md (électricien, le métier d'Hugo et de ses testeurs), branche
-- `cloud/metier-electricien`. Un électricien remet en fin de chantier un compte rendu des travaux et de son
-- autocontrôle (mesures relevées). C'est un document d'usage, pas un document réglementaire : il ne s'appelle jamais
-- « attestation de conformité » et n'emploie jamais le mot « conforme » (juriste-btp, 3 nov. 2026) ; l'attestation
-- Consuel reste le document d'un organisme tiers, que l'app ne fabrique pas.
-- Numérotation à la suite des migrations des autres branches : 107 ia-socle, 108 metiers, 109 ia-allumage,
-- 110 metier-qualifications. Elle ne dépend d'aucune d'elles.
--
-- Effet (même mécanique que les attestations de ramonage, migration 104) :
--   1. table `comptes_rendus_electricite` : une ligne = un compte rendu. Elle recopie à la saisie ce qui est imprimé
--      (client, lieu, travaux, mesures, émetteur) : le document ne bouge pas si la fiche client ou entreprise change.
--      Lecture et écriture par les membres de l'organisation ; aucune suppression par l'app ;
--   2. numéro attribué par la base, sous verrou, à l'insertion : CRI-AAAA-NNNNN, série par organisation et par année
--      (Paris), à la suite du plus grand, la proposition de l'app ignorée ; unique ;
--   3. contenu figé dès l'insertion pour un compte connecté : seuls changent ensuite la facture liée (une facture de la
--      même organisation) et l'annulation (une fois, motivée, datée par la base ; « Refaire » crée un compte rendu qui
--      « annule et remplace »). Les liens au client, au chantier et au compte rendu remplacé ne bougent plus pour un
--      compte connecté ; la suppression d'une fiche les vide (action de la clé étrangère, exécutée par le propriétaire de
--      la table) ; tailles bornées, tous les champs texte et JSON compris (relecture gardien-securite du 4 nov. 2026,
--      F1 à F3, puis relecture locale du 4 nov. au soir) ;
--   4. chantier, client, facture et compte rendu remplacé : de la même organisation (contrôlés à l'insertion) ; une
--      organisation dont on n'est pas membre est refusée AVANT le verrou et ces contrôles (pas d'oracle d'appartenance) ;
--   5. un membre « readonly » lit, mais ne crée, n'annule ni ne lie de facture (policies INSERT et UPDATE).
--   Pas de colonne de signature : aucun écran ne la propose (décision n° 5 d'Hugo attendue ; elle viendra avec son écran).
--   Un membre qui quitte l'équipe : ses comptes rendus passent au propriétaire (105, `tables_rendues_au_depart`
--   découvre la table : elle porte user_id et organization_id).
--
-- ─── Vérification après application (éditeur SQL) ───────────────────────────
--   select relrowsecurity from pg_class where oid = 'public.comptes_rendus_electricite'::regclass;               -- true
--   select count(*) from pg_policies where tablename = 'comptes_rendus_electricite' and cmd = 'DELETE';         -- 0
--   select tgname from pg_trigger where tgrelid = 'public.comptes_rendus_electricite'::regclass and not tgisinternal order by 1;
--     attendu : trg_figer_compte_rendu, trg_renseigner_organisation, trg_sceller_compte_rendu, trg_verifier_organisation
--   select has_table_privilege('authenticated', 'public.comptes_rendus_electricite', 'DELETE');                  -- false
--   select has_table_privilege('anon', 'public.comptes_rendus_electricite', 'SELECT');                           -- false
--   select has_function_privilege('authenticated', 'public.sceller_compte_rendu()', 'execute');                  -- false
--   select count(*) from information_schema.columns where table_name = 'comptes_rendus_electricite' and column_name = 'signature'; -- 0
--   select count(*) from pg_policies where tablename = 'comptes_rendus_electricite' and cmd in ('INSERT', 'UPDATE')
--     and coalesce(with_check, '') like '%readonly%';                                                            -- 2
--   select count(*) from public.tables_rendues_au_depart() t where t = 'comptes_rendus_electricite';            -- 1
-- ============================================================

-- 1. La table
CREATE TABLE IF NOT EXISTS public.comptes_rendus_electricite (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  numero TEXT,
  chantier_id UUID REFERENCES public.chantiers(id) ON DELETE SET NULL,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  remplace_id UUID REFERENCES public.comptes_rendus_electricite(id) ON DELETE SET NULL,
  facture_id UUID REFERENCES public.devis(id) ON DELETE SET NULL,
  realise_le TIMESTAMPTZ NOT NULL,
  intervenant_nom TEXT NOT NULL CHECK (length(btrim(intervenant_nom)) > 0),
  emetteur JSONB CHECK (emetteur IS NULL OR jsonb_typeof(emetteur) = 'object'),
  client_nom TEXT NOT NULL CHECK (length(btrim(client_nom)) > 0),
  client_contact TEXT,
  adresse_intervention TEXT NOT NULL CHECK (length(btrim(adresse_intervention)) > 0),
  nature TEXT NOT NULL CHECK (nature IN ('neuf', 'renovation_totale', 'renovation_partielle', 'depannage', 'borne', 'photovoltaique', 'autre')),
  travaux TEXT NOT NULL CHECK (length(btrim(travaux)) > 0),
  mesures JSONB NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(mesures) = 'object'),
  reserves TEXT,
  observations TEXT,
  prix_ht NUMERIC(10, 2) CHECK (prix_ht IS NULL OR prix_ht >= 0),
  annulee_le TIMESTAMPTZ,
  annulation_motif TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT comptes_rendus_tailles CHECK (pg_column_size(mesures) <= 20000 AND length(travaux) <= 20000
    AND length(coalesce(reserves, '')) <= 20000 AND length(coalesce(observations, '')) <= 20000
    AND coalesce(pg_column_size(emetteur), 0) <= 20000
    AND length(client_nom || intervenant_nom || adresse_intervention || coalesce(client_contact, '')) <= 3000
    AND length(coalesce(annulation_motif, '')) <= 2000),
  CONSTRAINT comptes_rendus_annulation_motivee CHECK (annulee_le IS NULL OR length(btrim(coalesce(annulation_motif, ''))) > 0)
);

COMMENT ON TABLE public.comptes_rendus_electricite IS
  'Comptes rendus d''intervention et d''autocontrôle (électricité), figés dès l''insertion ; numéro attribué par la base (migration 111).';

CREATE UNIQUE INDEX IF NOT EXISTS comptes_rendus_numero_unique
  ON public.comptes_rendus_electricite (coalesce(organization_id, user_id), numero) WHERE numero IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS comptes_rendus_remplace_unique
  ON public.comptes_rendus_electricite (remplace_id) WHERE remplace_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_comptes_rendus_user ON public.comptes_rendus_electricite (user_id);
CREATE INDEX IF NOT EXISTS idx_comptes_rendus_org ON public.comptes_rendus_electricite (organization_id);
CREATE INDEX IF NOT EXISTS idx_comptes_rendus_chantier ON public.comptes_rendus_electricite (chantier_id);
CREATE INDEX IF NOT EXISTS idx_comptes_rendus_client ON public.comptes_rendus_electricite (client_id);

ALTER TABLE public.comptes_rendus_electricite ENABLE ROW LEVEL SECURITY;

-- Membres de l'organisation (comme 104, relecture M2 : l'auteur seul ne suffit pas) ; sans organisation, l'auteur
DROP POLICY IF EXISTS "Comptes rendus : lecture" ON public.comptes_rendus_electricite;
CREATE POLICY "Comptes rendus : lecture" ON public.comptes_rendus_electricite FOR SELECT TO authenticated
  USING (organization_id = ANY (public.user_org_ids(auth.uid())) OR (organization_id IS NULL AND user_id = auth.uid()));
DROP POLICY IF EXISTS "Comptes rendus : création" ON public.comptes_rendus_electricite;
-- Écrire (créer, annuler, lier une facture) : membre, sauf « readonly » (gardien-securite, 4 nov. 2026, point 3)
CREATE POLICY "Comptes rendus : création" ON public.comptes_rendus_electricite FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND (organization_id IS NULL OR (organization_id = ANY (public.user_org_ids(auth.uid()))
    AND public.mon_role_organisation(organization_id) <> 'readonly')));
DROP POLICY IF EXISTS "Comptes rendus : suivi" ON public.comptes_rendus_electricite;
CREATE POLICY "Comptes rendus : suivi" ON public.comptes_rendus_electricite FOR UPDATE TO authenticated
  USING ((organization_id = ANY (public.user_org_ids(auth.uid())) AND public.mon_role_organisation(organization_id) <> 'readonly')
    OR (organization_id IS NULL AND user_id = auth.uid()))
  WITH CHECK ((organization_id = ANY (public.user_org_ids(auth.uid())) AND public.mon_role_organisation(organization_id) <> 'readonly')
    OR (organization_id IS NULL AND user_id = auth.uid()));

REVOKE ALL ON public.comptes_rendus_electricite FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.comptes_rendus_electricite TO authenticated;

-- 2. Organisation : remplie si absente (079), contrôlée (084)
DROP TRIGGER IF EXISTS trg_renseigner_organisation ON public.comptes_rendus_electricite;
CREATE TRIGGER trg_renseigner_organisation BEFORE INSERT ON public.comptes_rendus_electricite
  FOR EACH ROW EXECUTE FUNCTION public.renseigner_organisation();
DROP TRIGGER IF EXISTS trg_verifier_organisation ON public.comptes_rendus_electricite;
CREATE TRIGGER trg_verifier_organisation BEFORE INSERT OR UPDATE OF organization_id ON public.comptes_rendus_electricite
  FOR EACH ROW EXECUTE FUNCTION public.garder_organisation();

-- 3. Numéro et contrôles, à l'insertion (« sceller » s'exécute après « renseigner » : ordre alphabétique des déclencheurs)
CREATE OR REPLACE FUNCTION public.sceller_compte_rendu()
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
  -- Organisation d'un autre : refusée avant le verrou et les contrôles de série, sinon leurs messages diraient si un
  -- identifiant lui appartient (« sceller » passe avant « verifier », ordre alphabétique ; gardien-securite, point 2)
  IF auth.uid() IS NOT NULL AND NEW.organization_id IS NOT NULL AND public.mon_role_organisation(NEW.organization_id) IS NULL THEN
    RAISE EXCEPTION 'Organisation interdite' USING ERRCODE = '42501';
  END IF;
  v_prefixe := 'CRI-' || v_an || '-';
  PERFORM pg_advisory_xact_lock(hashtextextended('compte_rendu:' || v_serie::text || ':' || v_an, 0));
  SELECT coalesce(max(substring(numero FROM length(v_prefixe) + 1)::int), 0) INTO v_dernier
    FROM public.comptes_rendus_electricite
   WHERE coalesce(organization_id, user_id) = v_serie
     AND numero ~ ('^CRI-' || v_an || '-[0-9]{5}$');
  NEW.numero := v_prefixe || lpad((v_dernier + 1)::text, 5, '0');
  NEW.annulee_le := NULL;
  NEW.annulation_motif := NULL;
  NEW.created_at := now();
  NEW.updated_at := now();
  IF NEW.facture_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.devis d WHERE d.id = NEW.facture_id AND d.type = 'facture' AND coalesce(d.organization_id, d.user_id) = v_serie
  ) THEN
    RAISE EXCEPTION 'Facture inconnue dans votre organisation' USING ERRCODE = '42501';
  END IF;
  IF NEW.client_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.clients c WHERE c.id = NEW.client_id AND coalesce(c.organization_id, c.user_id) = v_serie
  ) THEN
    RAISE EXCEPTION 'Client inconnu dans votre organisation' USING ERRCODE = '42501';
  END IF;
  IF NEW.chantier_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.chantiers ch WHERE ch.id = NEW.chantier_id AND coalesce(ch.organization_id, ch.user_id) = v_serie
  ) THEN
    RAISE EXCEPTION 'Chantier inconnu dans votre organisation' USING ERRCODE = '42501';
  END IF;
  IF NEW.remplace_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.comptes_rendus_electricite r WHERE r.id = NEW.remplace_id AND coalesce(r.organization_id, r.user_id) = v_serie
       AND r.annulee_le IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'Seul un compte rendu annulé de votre organisation peut être remplacé' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.sceller_compte_rendu() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_sceller_compte_rendu ON public.comptes_rendus_electricite;
CREATE TRIGGER trg_sceller_compte_rendu BEFORE INSERT ON public.comptes_rendus_electricite
  FOR EACH ROW EXECUTE FUNCTION public.sceller_compte_rendu();

-- 4. Contenu figé dès l'insertion, pour un compte connecté (le serveur, les fonctions SECURITY DEFINER et les actions
--    des clés étrangères ne sont pas concernés : même règle que 104)
CREATE OR REPLACE FUNCTION public.figer_compte_rendu()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  IF current_user NOT IN ('authenticated', 'anon') THEN
    RETURN NEW;
  END IF;
  -- Tout reprend sa valeur (client, chantier et compte rendu remplacé compris : F1), sauf la facture et l'annulation
  NEW := jsonb_populate_record(NEW, to_jsonb(OLD) - ARRAY['facture_id', 'annulee_le', 'annulation_motif']);
  NEW.updated_at := now();
  -- L'annulation : une fois, définitive, à la date du jour (la date envoyée est ignorée)
  IF OLD.annulee_le IS NOT NULL THEN
    NEW.annulee_le := OLD.annulee_le;
    NEW.annulation_motif := OLD.annulation_motif;
  ELSIF NEW.annulee_le IS NOT NULL THEN
    NEW.annulee_le := now();
  END IF;
  -- La facture liée : une facture de la même organisation
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
REVOKE ALL ON FUNCTION public.figer_compte_rendu() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_figer_compte_rendu ON public.comptes_rendus_electricite;
CREATE TRIGGER trg_figer_compte_rendu BEFORE UPDATE ON public.comptes_rendus_electricite
  FOR EACH ROW EXECUTE FUNCTION public.figer_compte_rendu();
