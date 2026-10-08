-- ============================================================
-- Migration 079: chaque ligne garde son organisation
-- ============================================================
-- Pourquoi (recette du 8 oct. 2026 avec le compte de contrôle) :
-- 1. Un client créé dans l'app disparaissait de l'écran au rechargement. Les fonctions
--    d'écriture de DataContext gardaient l'orgId du premier rendu (null) : la ligne partait
--    sans organization_id, et la lecture filtre par organisation. Relevé en production le
--    8 oct. : lignes sans organisation, donc invisibles pour leur artisan — catalogue 31/34,
--    échanges 13/23, prévisions de trésorerie 8/8, clients 3/12, contrats 2/2, réglages de
--    trésorerie 2/2, équipe 1/2, et le profil d'entreprise lui-même 1/4 (lu par organisation :
--    ses mentions légales n'apparaissaient plus).
-- 2. À l'inscription, create_default_org appelée trois fois en même temps a créé trois
--    organisations au compte de contrôle (7 ms d'écart) ; deux pour un compte le 14 juil.
--    Elle vérifiait puis créait sans verrou. Elle acceptait aussi n'importe quel p_user_id
--    (un visiteur pouvait créer une organisation au nom d'un compte qui n'en avait pas),
--    sans search_path fixé, et son slug effaçait les majuscules (« Test » → « -est »).
--
-- Effet :
-- - Toute ligne métier enregistrée sans organisation reçoit celle de son auteur (la première
--   rejointe, comme get_user_org_id que l'app utilise pour lire) : plus de disparition, y
--   compris depuis une ancienne version de l'app restée en cache sur un téléphone.
-- - Les lignes déjà enregistrées sans organisation la reçoivent (rattrapage) : elles
--   réapparaissent. Rien n'est effacé ; leur date de modification devient celle du jour.
-- - Une seule organisation par défaut à l'inscription, même avec des appels simultanés ;
--   seul le compte lui-même (ou le serveur) peut la créer. Les doublons existants restent
--   (vides, sans effet : l'app lit la première organisation, où sont les données).
--
-- Conception :
-- - Déclencheur BEFORE INSERT, il ne remplit que si l'auteur de la ligne est l'appelant
--   (ou le serveur, jamais un visiteur anonyme) : jamais l'organisation d'un tiers. La RLS
--   (WITH CHECK) s'applique après les déclencheurs BEFORE, sur la ligne complétée.
--   Relu par gardien-securite le 8 oct. 2026 : non bloquant.
-- - Liste explicite des tables métier, chacune gardée par to_regclass et la présence des
--   colonnes user_id et organization_id (la production ne correspond pas au dépôt).
--
-- ─── Vérification après application (éditeur SQL) ───────────────────────────
--   SELECT string_agg(t || '=' || n, ', ') AS sans_organisation FROM (SELECT t, (xpath('/row/n/text()', query_to_xml(format('SELECT count(*) AS n FROM public.%I WHERE organization_id IS NULL AND user_id IS NOT NULL', t), false, true, '')))[1]::text::int AS n FROM unnest(ARRAY['catalogue','echanges','tresorerie_previsions','clients','contrats','tresorerie_settings','equipe','entreprise','devis','chantiers']) t WHERE to_regclass('public.' || t) IS NOT NULL) x WHERE n > 0;  -- attendu : NULL (plus aucune ligne sans organisation)
--   SELECT count(*) AS tables_protegees FROM pg_trigger WHERE tgname = 'trg_renseigner_organisation';  -- attendu : 34 (toutes les tables de la liste présentes en production)
--   SELECT prosrc LIKE '%pg_advisory_xact_lock%' AS verrou, has_function_privilege('anon', 'public.create_default_org(uuid)', 'execute') AS ouverte_aux_visiteurs FROM pg_proc WHERE oid = 'public.create_default_org(uuid)'::regprocedure;  -- attendu : t, f
-- ============================================================

-- 1. create_default_org : une seule organisation, pour soi-même.
CREATE OR REPLACE FUNCTION public.create_default_org(p_user_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_org_id UUID;
  v_email TEXT;
  v_nom_compte TEXT;
  v_nom TEXT;
  v_slug TEXT;
BEGIN
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'create_default_org : utilisateur manquant';
  END IF;
  -- Un compte ne crée que sa propre organisation ; le serveur (sans jeton) peut le faire pour tout compte.
  IF auth.uid() IS NOT NULL AND auth.uid() <> p_user_id THEN
    RAISE EXCEPTION 'create_default_org : réservé à son propre compte' USING ERRCODE = '42501';
  END IF;

  -- Les appels simultanés du même compte passent l'un après l'autre (relâché en fin de transaction).
  PERFORM pg_advisory_xact_lock(hashtextextended('create_default_org:' || p_user_id::text, 0));

  SELECT organization_id INTO v_org_id
    FROM organization_members WHERE user_id = p_user_id ORDER BY joined_at ASC LIMIT 1;
  IF v_org_id IS NOT NULL THEN
    RETURN json_build_object('org_id', v_org_id,
      'role', (SELECT role FROM organization_members WHERE user_id = p_user_id AND organization_id = v_org_id),
      'already_exists', true);
  END IF;

  SELECT email, COALESCE(raw_user_meta_data->>'nom', raw_user_meta_data->>'name')
    INTO v_email, v_nom_compte FROM auth.users WHERE id = p_user_id;
  v_nom := COALESCE(NULLIF(trim(v_nom_compte), ''), NULLIF(split_part(v_email, '@', 1), ''), 'Mon entreprise');
  -- Minuscules AVANT le remplacement : « Test Mallettico » → « test-mallettico ».
  v_slug := trim(both '-' from regexp_replace(lower(v_nom), '[^a-z0-9]+', '-', 'g'));
  IF v_slug = '' THEN v_slug := 'entreprise'; END IF;
  v_slug := v_slug || '-' || substring(gen_random_uuid()::text, 1, 8);

  INSERT INTO organizations (name, slug, owner_id) VALUES (v_nom, v_slug, p_user_id) RETURNING id INTO v_org_id;
  INSERT INTO organization_members (organization_id, user_id, role) VALUES (v_org_id, p_user_id, 'owner');
  RETURN json_build_object('org_id', v_org_id, 'role', 'owner', 'already_exists', false);
END;
$$;

REVOKE ALL ON FUNCTION public.create_default_org(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_default_org(UUID) TO authenticated, service_role;

-- 2. Une ligne enregistrée sans organisation reçoit celle de son auteur.
CREATE OR REPLACE FUNCTION public.renseigner_organisation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- L'appelant lui-même, ou le serveur (sans jeton, ou jeton service_role) ; jamais un visiteur anonyme.
  IF NEW.organization_id IS NULL AND NEW.user_id IS NOT NULL
     AND (auth.uid() = NEW.user_id
          OR (auth.uid() IS NULL
              AND coalesce(nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role', '') <> 'anon')) THEN
    NEW.organization_id := (SELECT organization_id FROM organization_members
                             WHERE user_id = NEW.user_id ORDER BY joined_at ASC LIMIT 1);
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.renseigner_organisation() FROM PUBLIC, anon, authenticated;

-- 3. Le déclencheur sur chaque table métier, puis le rattrapage des lignes déjà enregistrées.
DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'entreprise', 'clients', 'devis', 'chantiers', 'depenses', 'pointages', 'ajustements', 'equipe', 'catalogue',
    'paiements', 'echanges', 'planning_events', 'events', 'ouvrages', 'memos', 'devis_templates',
    'reglements', 'stock_mouvements', 'tresorerie_mouvements', 'tresorerie_previsions',
    'tresorerie_settings', 'situations_travaux', 'garanties', 'fournisseurs', 'fournisseur_articles',
    'chantier_photos', 'contrats', 'packs', 'pack_items', 'catalogue_coefficients', 'form_templates',
    'template_usages', 'relance_exclusions', 'client_communications'
  ] LOOP
    IF to_regclass('public.' || t) IS NULL
       OR NOT EXISTS (SELECT 1 FROM information_schema.columns
                      WHERE table_schema = 'public' AND table_name = t AND column_name = 'organization_id')
       OR NOT EXISTS (SELECT 1 FROM information_schema.columns
                      WHERE table_schema = 'public' AND table_name = t AND column_name = 'user_id') THEN
      CONTINUE;
    END IF;
    EXECUTE format('DROP TRIGGER IF EXISTS trg_renseigner_organisation ON public.%I', t);
    EXECUTE format('CREATE TRIGGER trg_renseigner_organisation BEFORE INSERT ON public.%I '
                   'FOR EACH ROW EXECUTE FUNCTION public.renseigner_organisation()', t);
    EXECUTE format(
      'UPDATE public.%I x SET organization_id = m.organization_id
         FROM (SELECT DISTINCT ON (user_id) user_id, organization_id
                 FROM public.organization_members ORDER BY user_id, joined_at ASC) m
        WHERE x.organization_id IS NULL AND x.user_id = m.user_id', t);
  END LOOP;
END $$;
