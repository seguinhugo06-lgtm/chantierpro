-- ============================================================
-- Migration 083: page de signature complète et sûre
-- ============================================================
-- Pourquoi : relectures juriste-btp et gardien-securite du 10 oct. 2026 (lots V et W), constats en production
--   (lecture seule : pg_get_functiondef, information_schema, organization_members) :
--   1. La page de signature en ligne est le contrat que signe à distance un client contacté par e-mail, WhatsApp
--      ou SMS (C. conso. L221-5). get_devis_for_signature ne renvoie ni la forme juridique, ni les réglages de
--      l'entreprise (settings_json) : il manque le nom suivi de « EI » (C. com. R526-27), la forme juridique et
--      l'assureur avec ses coordonnées et sa zone (C. conso. R111-2, 1° et 9°), le médiateur (L616-1, R616-1),
--      le lieu des travaux, la validité choisie et l'acompte (`acompte_pct`, écrit par l'app). L'entreprise est
--      prise au hasard parmi celles de l'utilisateur (jointure sur user_id, plusieurs fiches possibles).
--   2. Un devis expiré se signe en ligne (C. civ. 1117 : l'offre est caduque) ; le lien vit 30 jours quelle que
--      soit la validité ; un devis déjà signé SUR PLACE (statut « accepte ») peut être re-signé par le lien, et
--      la signature à distance remplace alors celle du client à l'écran et sur les PDF.
--   3. Les trois fonctions sont SECURITY DEFINER sans search_path ; generate_signature_token est exécutable par
--      un visiteur et accepte n'importe quelle durée ; sign_devis enregistre n'importe quel texte comme tracé
--      (« javascript: », SVG, plusieurs Mo) et un nom de signataire de longueur libre.
--   4. generate_signature_token n'autorise que l'auteur du devis : un gérant ou un comptable de l'organisation
--      ne peut pas envoyer un devis créé par un collègue (0 organisation à plusieurs membres le 10 oct. 2026).
-- Effet :
--   - entreprise, client et chantier ne sont lus que parmi les lignes du compte de l'auteur du devis (ou de son
--     organisation s'il en est membre) : un devis ne peut plus « pointer » vers la fiche ou les clients d'un autre ;
--   - fin de validité = date enregistrée, sinon date du devis + durée choisie, sinon + 30 jours (les 32 devis de la
--     production n'avaient que la durée le 10 oct. 2026) ; l'IP du signataire est relevée par le serveur ;
--   - la page de signature reçoit l'entreprise du devis avec sa forme juridique, le nom de l'entrepreneur,
--     ses assurances, son médiateur ; le client avec sa catégorie (le médiateur ne s'imprime que pour un
--     particulier) ; le chantier ; la validité et l'acompte ;
--   - un devis expiré, déjà signé (sur place ou à distance), refusé ou facturé ne se signe plus ; la page dit
--     pourquoi (« expire », « already_signed », « indisponible ») ;
--   - le lien expire au plus tard à minuit (heure de Paris) le soir du dernier jour de validité, et dans 366 jours
--     au maximum ; il n'est créé ni pour un devis expiré, ni pour une facture ;
--   - le lien est créé par l'auteur du devis ou par un propriétaire, administrateur ou comptable de son
--     organisation (droits « devis : complet » de src/lib/permissions.js) ; plus par un visiteur ;
--   - le tracé doit être une image PNG, JPEG ou WebP encodée (1 Mo au plus), le nom 1 à 200 caractères ;
--   - search_path fixé ; un visiteur garde la lecture et la signature par jeton (page publique).
--
-- ─── Vérification après application (éditeur SQL) ───────────────────────────
--   SELECT p.proname, has_function_privilege('anon', p.oid, 'EXECUTE') AS visiteur,
--          has_function_privilege('authenticated', p.oid, 'EXECUTE') AS connecte, array_to_string(p.proconfig, ',') AS reglages
--   FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
--   WHERE n.nspname = 'public' AND p.proname IN ('generate_signature_token', 'get_devis_for_signature', 'sign_devis') ORDER BY 1;
--   → generate_signature_token : visiteur f, connecte t ; get_devis_for_signature et sign_devis : visiteur t, connecte t ;
--     reglages = search_path=public, pg_temp pour les trois.
--   SELECT get_devis_for_signature('00000000-0000-4000-8000-000000000000'::uuid);  → NULL (jeton inconnu)
-- ============================================================

-- ─── 1. Créer le lien de signature ──────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.generate_signature_token(p_devis_id UUID, p_expiry_days INTEGER DEFAULT 30)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_devis RECORD;
  v_token UUID;
  v_fin TIMESTAMPTZ;
  v_aujourdhui DATE := (now() AT TIME ZONE 'Europe/Paris')::date;
BEGIN
  -- Fin de validité : la date enregistrée, sinon date + durée choisie, sinon 30 jours (le 10 oct. 2026, les 32 devis de
  -- la production n'avaient que la durée : relecture juriste-btp)
  SELECT d.id, d.user_id, d.organization_id, d.type, COALESCE(d.date_validite, d.date + NULLIF(d.validite_jours, 0), d.date + 30) AS date_validite
  INTO v_devis FROM public.devis d WHERE d.id = p_devis_id;
  -- COALESCE : pour un non-membre le rôle est NULL, et « NOT (faux OR NULL) » vaut NULL, que IF lit comme faux
  IF v_devis.id IS NULL OR auth.uid() IS NULL OR NOT COALESCE(
       v_devis.user_id = auth.uid()
       OR (v_devis.organization_id IS NOT NULL
           AND public.mon_role_organisation(v_devis.organization_id) IN ('owner', 'admin', 'comptable')),
       false) THEN
    RAISE EXCEPTION 'Devis non trouve ou non autorise';
  END IF;
  IF COALESCE(v_devis.type, 'devis') <> 'devis' THEN
    RAISE EXCEPTION 'Seul un devis se signe en ligne';
  END IF;
  IF v_devis.date_validite IS NOT NULL AND v_devis.date_validite < v_aujourdhui THEN
    RAISE EXCEPTION 'Devis expire : prolongez sa validite avant de l''envoyer';
  END IF;

  -- Durée demandée bornée à [1, 366] jours, et jamais au-delà de minuit (Paris) le soir du dernier jour de validité
  v_fin := now() + make_interval(days => LEAST(GREATEST(COALESCE(p_expiry_days, 30), 1), 366));
  IF v_devis.date_validite IS NOT NULL THEN
    v_fin := LEAST(v_fin, ((v_devis.date_validite + 1)::timestamp AT TIME ZONE 'Europe/Paris'));
  END IF;

  v_token := gen_random_uuid();
  UPDATE public.devis SET signature_token = v_token, signature_expires_at = v_fin, updated_at = now() WHERE id = p_devis_id;
  RETURN v_token;
END;
$$;

-- ─── 2. Lire le devis à signer (page publique) ──────────────────────────────
CREATE OR REPLACE FUNCTION public.get_devis_for_signature(p_token UUID)
RETURNS JSON
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  d public.devis%ROWTYPE;
  e public.entreprise%ROWTYPE;
  c public.clients%ROWTYPE;
  ch public.chantiers%ROWTYPE;
  r JSONB;
  v_org UUID;
  v_fin DATE;
BEGIN
  IF p_token IS NULL THEN RETURN NULL; END IF;
  SELECT * INTO d FROM public.devis WHERE signature_token = p_token;
  IF d.id IS NULL THEN RETURN NULL; END IF;

  -- Déjà signé, sur place (signature, statut « accepte ») ou à distance (signature_data, « signe »), ou facturé
  IF d.signature_data IS NOT NULL OR d.signature IS NOT NULL
     OR d.statut IN ('accepte', 'signe', 'acompte_facture', 'facture') THEN
    RETURN json_build_object('devis', json_build_object('already_signed', true));
  END IF;
  IF d.signature_expires_at IS NULL OR d.signature_expires_at <= now() THEN RETURN NULL; END IF;
  -- Brouillon, refusé, annulé : plus proposé à la signature
  IF d.statut IS NULL OR d.statut NOT IN ('envoye', 'en_attente') THEN
    RETURN json_build_object('devis', json_build_object('indisponible', true));
  END IF;
  -- Offre caduque après son dernier jour de validité (C. civ. 1117) ; même repli que generate_signature_token
  v_fin := COALESCE(d.date_validite, d.date + NULLIF(d.validite_jours, 0), d.date + 30);
  IF v_fin IS NOT NULL AND v_fin < (now() AT TIME ZONE 'Europe/Paris')::date THEN
    RETURN json_build_object('devis', json_build_object('expire', true, 'date_validite', v_fin));
  END IF;

  -- Entreprise, client et chantier : seulement des lignes DU COMPTE de l'auteur du devis (les siennes, ou celles
  -- d'un membre de son organisation si lui-même en est membre). Les identifiants du devis (entreprise_id,
  -- client_id, chantier_id, organization_id) sont écrits librement par son auteur : sans ce filtre, un compte
  -- lisait par cette fonction publique la fiche (IBAN) ou les clients d'un autre artisan (relecture
  -- gardien-securite du 10 oct. 2026).
  SELECT m.organization_id INTO v_org FROM public.organization_members m
  WHERE m.organization_id = d.organization_id AND m.user_id = d.user_id LIMIT 1;

  SELECT * INTO e FROM public.entreprise en
  WHERE en.user_id = d.user_id
     OR (v_org IS NOT NULL AND en.organization_id = v_org
         AND EXISTS (SELECT 1 FROM public.organization_members m2 WHERE m2.organization_id = v_org AND m2.user_id = en.user_id))
  ORDER BY (en.id IS NOT DISTINCT FROM d.entreprise_id) DESC, (en.archived_at IS NULL) DESC,
           COALESCE(en.is_default, false) DESC, (en.user_id = d.user_id) DESC, en.created_at
  LIMIT 1;

  SELECT * INTO c FROM public.clients x
  WHERE x.id = d.client_id AND (x.user_id = d.user_id
     OR (v_org IS NOT NULL AND x.organization_id = v_org
         AND EXISTS (SELECT 1 FROM public.organization_members m3 WHERE m3.organization_id = v_org AND m3.user_id = x.user_id)));

  SELECT * INTO ch FROM public.chantiers x
  WHERE x.id = d.chantier_id AND (x.user_id = d.user_id
     OR (v_org IS NOT NULL AND x.organization_id = v_org
         AND EXISTS (SELECT 1 FROM public.organization_members m4 WHERE m4.organization_id = v_org AND m4.user_id = x.user_id)));

  r := COALESCE(e.settings_json -> 'reglages', '{}'::jsonb);

  RETURN json_build_object(
    'devis', json_build_object(
      'id', d.id, 'numero', d.numero, 'type', d.type, 'statut', d.statut, 'date', d.date,
      'date_validite', v_fin, 'validite', d.validite_jours, 'objet', d.objet,
      'lignes', d.lignes, 'sections', d.sections, 'conditions', d.conditions,
      'remise_globale', d.remise_globale, 'tva_rate', d.tva_rate,
      'total_ht', d.total_ht, 'total_tva', d.total_tva, 'total_ttc', d.total_ttc,
      'acompte_pct', COALESCE(d.acompte_pct, d.acompte_percent), 'acompte_percent', d.acompte_percent,
      'acompte_montant', d.acompte_montant, 'already_signed', false
    ),
    'client', json_build_object(
      'nom', c.nom, 'prenom', c.prenom, 'email', c.email, 'telephone', c.telephone,
      'adresse', c.adresse, 'entreprise', c.entreprise, 'categorie', c.categorie
    ),
    'chantier', CASE WHEN ch.id IS NULL THEN NULL ELSE json_build_object(
      'nom', ch.nom, 'adresse', ch.adresse, 'ville', ch.ville, 'code_postal', ch.code_postal) END,
    'entreprise', (
      jsonb_build_object(
        'nom', e.nom, 'forme_juridique', e.forme_juridique, 'capital', e.capital,
        'siret', e.siret, 'code_ape', e.code_ape, 'rcs', e.rcs, 'rcs_ville', e.rcs_ville, 'tva_intra', e.tva_intra,
        'adresse', e.adresse, 'ville', e.ville, 'code_postal', e.code_postal,
        'telephone', e.telephone, 'email', e.email, 'site_web', e.site_web,
        'logo', e.logo_url, 'couleur', COALESCE(e.couleur_principale, e.couleur),
        'iban', e.iban, 'bic', e.bic, 'conditions_paiement', e.conditions_paiement,
        'mentions_legales', e.mentions_legales, 'cgv', e.cgv, 'delai_paiement', e.delai_paiement,
        'validite_devis', e.validite_devis,
        'decennale_assureur', COALESCE(e.decennale_assureur, e.assurance_decennale_compagnie),
        'decennale_numero', e.decennale_numero, 'decennale_validite', e.decennale_validite,
        'decennale_activites', e.decennale_activites,
        'rc_pro_assureur', COALESCE(e.rc_pro_assureur, e.assurance_rc_pro_compagnie),
        'rc_pro_numero', e.rc_pro_numero, 'rc_pro_validite', e.rc_pro_validite,
        'rc_pro_montant_garantie', e.rc_pro_montant_garantie, 'rc_pro_zone', e.rc_pro_zone
      )
      -- Réglages imprimés sur le devis (src/services/entrepriseService.js, REGLAGES_SANS_COLONNE) : une liste
      -- fermée, rien d'autre de settings_json ne sort
      || jsonb_strip_nulls(jsonb_build_object(
        'nomEntrepreneur', r ->> 'nomEntrepreneur', 'mediateur', r ->> 'mediateur',
        'mediateurContact', r ->> 'mediateurContact', 'decennaleAssureurAdresse', r ->> 'decennaleAssureurAdresse',
        'decennaleZone', r ->> 'decennaleZone', 'rcsNumero', r ->> 'rcsNumero', 'rcsType', r ->> 'rcsType',
        'tauxPenalites', r ->> 'tauxPenalites'
      ))
    )::json
  );
END;
$$;

-- ─── 3. Signer (page publique) ──────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.sign_devis(
  p_token UUID, p_signature_data TEXT, p_signataire_nom TEXT, p_ip TEXT DEFAULT NULL, p_user_agent TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_devis_id UUID;
  v_client_id UUID;
  v_nom TEXT := btrim(COALESCE(p_signataire_nom, ''));
  v_ip TEXT;
BEGIN
  -- IP du signataire relevée par le serveur (la page ne peut pas la connaître), à défaut celle transmise
  BEGIN
    v_ip := NULLIF(btrim(split_part(NULLIF(current_setting('request.headers', true), '')::json ->> 'x-forwarded-for', ',', 1)), '');
  EXCEPTION WHEN others THEN v_ip := NULL;
  END;
  v_ip := left(COALESCE(v_ip, p_ip), 100);

  -- Un tracé est une image encodée, pas un lien ni un SVG ; 1 Mo au plus
  IF p_signature_data IS NULL OR length(p_signature_data) > 1000000
     OR p_signature_data !~ '^data:image/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$' THEN
    RETURN json_build_object('success', false, 'error', 'Signature illisible : effacez et signez de nouveau.');
  END IF;
  IF length(v_nom) = 0 OR length(v_nom) > 200 THEN
    RETURN json_build_object('success', false, 'error', 'Indiquez votre nom (200 caractères au plus).');
  END IF;

  SELECT dv.id, dv.client_id INTO v_devis_id, v_client_id
  FROM public.devis dv
  WHERE dv.signature_token = p_token
    AND dv.signature_expires_at > now()
    AND dv.statut IN ('envoye', 'en_attente')
    AND dv.signature_data IS NULL AND dv.signature IS NULL
    AND (dv.date IS NULL AND dv.date_validite IS NULL
         OR COALESCE(dv.date_validite, dv.date + NULLIF(dv.validite_jours, 0), dv.date + 30) >= (now() AT TIME ZONE 'Europe/Paris')::date)
  FOR UPDATE;

  IF v_devis_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Ce lien ne permet plus de signer : devis déjà signé, plus valable, ou lien expiré. Contactez votre artisan.');
  END IF;

  UPDATE public.devis SET
    signature_data = p_signature_data,
    signature_date = now(),
    signature_ip = v_ip,
    signature_user_agent = left(p_user_agent, 500),
    signataire_nom = v_nom,
    signature_cgv_accepted = true,
    statut = 'signe',
    updated_at = now()
  WHERE id = v_devis_id;

  INSERT INTO public.portal_access_logs (client_id, action, ip_address, user_agent)
  VALUES (v_client_id, 'signature', v_ip, left(p_user_agent, 500));

  RETURN json_build_object('success', true, 'devis_id', v_devis_id);
END;
$$;

-- ─── 4. Droits ──────────────────────────────────────────────────────────────
REVOKE ALL ON FUNCTION public.generate_signature_token(UUID, INTEGER) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.generate_signature_token(UUID, INTEGER) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.get_devis_for_signature(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_devis_for_signature(UUID) TO anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.sign_devis(UUID, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.sign_devis(UUID, TEXT, TEXT, TEXT, TEXT) TO anon, authenticated, service_role;
