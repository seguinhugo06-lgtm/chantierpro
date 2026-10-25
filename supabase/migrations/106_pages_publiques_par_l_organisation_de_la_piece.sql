-- ============================================================
-- Migration 106: les pages publiques montrent l'entreprise de la pièce, pas celle de son auteur
-- ============================================================
-- Pourquoi : relectures architecte-donnees et gardien-securite du 24 oct. 2026 (migration 105), défaut plus ancien.
--   La page de paiement (get_facture_for_payment, 081/085/098) cherchait la fiche entreprise parmi celles de
--   l'AUTEUR de la facture, et la configuration Stripe de l'auteur : la facture d'un salarié montrait sa fiche
--   personnelle (autre société, autre IBAN) ou aucune, et se payait par carte sur son propre compte Stripe. Les avoirs
--   déduits du reste dû étaient seulement ceux du même auteur : l'avoir fait par le patron sur la facture d'un salarié
--   n'était pas déduit, et le client payait trop. La page de signature (get_devis_for_signature, 086) faisait passer la
--   fiche personnelle de l'auteur devant celle de l'entreprise dès qu'elle était « par défaut ».
-- Effet (quand l'auteur de la pièce est membre de son organisation ; sinon, rien ne change) :
--   1. les deux pages montrent une fiche de l'organisation de la pièce (celle qu'elle désigne, puis une non
--      archivée, par défaut, la plus ancienne), dont l'auteur est membre ; la fiche de l'auteur seulement si l'organisation n'en a
--      aucune ;
--   2. la page de paiement déduit les avoirs de l'organisation sur cette facture, quel qu'en soit l'auteur ;
--   3. le paiement par carte va au compte Stripe du propriétaire de l'organisation : la page dit si le paiement en
--      ligne est ouvert d'après sa configuration, et renvoie au serveur seul (create-invoice-payment) le compte qui
--      encaisse (`beneficiaire_id`) ;
--   4. la configuration Stripe de chacun n'est plus lisible ni modifiable par les autres membres : les policies
--      « Org members can view / insert / update » et « Org admins can delete » de stripe_config (038, relevées en
--      production le 25 oct. 2026) laissaient un ouvrier écrire la configuration du patron avec SA clé (relecture
--      gardien-securite du 25 oct. : avec le 3, elle encaissait toutes les factures de l'entreprise). L'app ne lit
--      que la configuration du compte connecté et l'écrit par store_stripe_key / update_stripe_config (SECURITY
--      DEFINER, au nom de auth.uid()) ; « Users manage own stripe_config » reste.
--   Rien ne change pour un artisan seul (il est l'auteur, le propriétaire et l'unique membre). Une pièce dont l'auteur
--   n'est pas membre de l'organisation qu'elle porte (ligne glissée avant 084) garde l'ancien comportement : son
--   compte seulement. Ce que les pages renvoient au visiteur ne change pas de forme.
--
-- ─── Vérification après application (éditeur SQL) ───────────────────────────
--   1) Corps — attendu t, t puis t :
--   SELECT position('v_beneficiaire' in prosrc) > 0 AS paiement_beneficiaire, position('organization_id = v_org' in prosrc) > 0 AS paiement_avoirs FROM pg_proc WHERE proname = 'get_facture_for_payment';
--   SELECT position('COALESCE(en.organization_id = v_org, false) DESC' in prosrc) > 0 AS signature_fiche FROM pg_proc WHERE proname = 'get_devis_for_signature';
--   2) Pages toujours publiques — attendu t, t :
--   SELECT has_function_privilege('anon', 'public.get_facture_for_payment(text)', 'execute'), has_function_privilege('anon', 'public.get_devis_for_signature(uuid)', 'execute');
--   3) stripe_config — attendu une seule ligne, « Users manage own stripe_config » :
--   SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'stripe_config';
--   4) Chaque facture payable montre la fiche de son entreprise — attendu : pour chacune, le nom de l'entreprise :
--   SELECT d.numero, public.get_facture_for_payment(d.payment_token) -> 'entreprise' ->> 'nom' AS fiche_affichee FROM public.devis d WHERE d.type = 'facture' AND d.payment_token IS NOT NULL ORDER BY d.created_at DESC LIMIT 10;
-- ============================================================

-- Idempotente : CREATE OR REPLACE ; les droits (exécution par un visiteur, 092) sont conservés.

-- 1. Page de paiement
CREATE OR REPLACE FUNCTION public.get_facture_for_payment(p_token text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_facture RECORD;
  v_client RECORD;
  v_entreprise RECORD;
  v_config RECORD;
  v_credite NUMERIC := 0;
  v_paiements NUMERIC := 0;
  v_recu NUMERIC := 0;
  v_reste NUMERIC := 0;
  v_payable BOOLEAN := false;
  v_serveur BOOLEAN := false;
  v_org UUID;
  v_beneficiaire UUID;
BEGIN
  -- Rôle de l'appelant, sous ses deux formes (claims complets, ou ancien réglage `request.jwt.claim.role`)
  v_serveur := COALESCE(
    NULLIF(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role',
    NULLIF(current_setting('request.jwt.claim.role', true), ''),
    ''
  ) = 'service_role';

  SELECT * INTO v_facture
  FROM devis
  WHERE payment_token = p_token
    AND type = 'facture'
    AND (payment_token_expires_at IS NULL OR payment_token_expires_at > NOW());

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Token invalide ou expire');
  END IF;

  -- Organisation de la facture, seulement si son auteur en est membre (106) : les identifiants d'une pièce écrite
  -- avant 084 ne sont pas sûrs ; sans adhésion, on s'en tient à son compte, comme avant
  SELECT m.organization_id INTO v_org FROM organization_members m
  WHERE m.organization_id = v_facture.organization_id AND m.user_id = v_facture.user_id LIMIT 1;

  -- Avoirs émis sur cette facture : ceux de son organisation, quel qu'en soit l'auteur (le patron fait l'avoir d'une
  -- facture d'un salarié : avant 106, il n'était pas déduit et le client payait trop) ; sans organisation sûre, ceux
  -- du même compte et de la même organisation (une ligne écrite par un tiers dans sa propre organisation ne compte
  -- pas) ; un avoir brouillon ou annulé ne crédite rien
  SELECT COALESCE(SUM(ABS(total_ttc)), 0) INTO v_credite
  FROM devis
  WHERE facture_type = 'avoir'
    AND avoir_source_id = v_facture.id
    AND CASE WHEN v_org IS NOT NULL THEN organization_id = v_org
             ELSE user_id = v_facture.user_id AND organization_id IS NOT DISTINCT FROM v_facture.organization_id END
    AND COALESCE(statut, '') NOT IN ('brouillon', 'annule', 'annulee');

  -- Reçu : le plus grand de montant_paye (paiement en ligne) et des paiements enregistrés (les deux
  -- sources se recouvrent, comme dans l'app : src/lib/paiementsFacture.js)
  SELECT COALESCE(SUM(GREATEST(montant, 0)), 0) INTO v_paiements
  FROM paiements
  WHERE devis_id = v_facture.id
    AND user_id = v_facture.user_id
    AND organization_id IS NOT DISTINCT FROM v_facture.organization_id;
  v_recu := GREATEST(COALESCE(v_facture.montant_paye, 0), 0);

  v_reste := GREATEST(0, COALESCE(v_facture.total_ttc, 0) - v_credite - v_recu);
  v_payable := COALESCE(v_facture.facture_type, '') <> 'avoir'
    AND COALESCE(v_facture.statut, '') NOT IN ('brouillon', 'annule', 'annulee', 'payee', 'paye')
    AND v_reste >= 0.5;

  SELECT id, nom, prenom, email INTO v_client
  FROM clients x
  WHERE x.id = v_facture.client_id
    AND (x.user_id = v_facture.user_id
         OR (v_facture.organization_id IS NOT NULL AND x.organization_id = v_facture.organization_id
             AND EXISTS (SELECT 1 FROM organization_members m0
                         WHERE m0.organization_id = v_facture.organization_id AND m0.user_id = v_facture.user_id)
             AND EXISTS (SELECT 1 FROM organization_members m
                         WHERE m.organization_id = v_facture.organization_id AND m.user_id = x.user_id)));

  -- Fiche de l'entreprise qui émet la facture (106) : une fiche de son organisation (celle que la facture désigne
  -- d'abord, puis une non archivée, par défaut, la plus ancienne), dont l'auteur est membre ; à défaut, une fiche de l'auteur.
  -- Avant : seulement les fiches de l'auteur, et la facture d'un salarié montrait sa fiche personnelle (autre
  -- société, autre IBAN) ou aucune
  SELECT * INTO v_entreprise
  FROM entreprise en
  WHERE (v_org IS NOT NULL AND en.organization_id = v_org
         AND EXISTS (SELECT 1 FROM organization_members m2 WHERE m2.organization_id = v_org AND m2.user_id = en.user_id))
     OR en.user_id = v_facture.user_id
  ORDER BY COALESCE(en.organization_id = v_org, false) DESC, (en.id IS NOT DISTINCT FROM v_facture.entreprise_id) DESC,
           (en.archived_at IS NULL) DESC, COALESCE(en.is_default, false) DESC, en.created_at
  LIMIT 1;

  -- Compte Stripe qui reçoit le paiement par carte (106) : celui du propriétaire de l'organisation, pas celui de
  -- l'auteur de la facture (un salarié encaissait sur son propre compte Stripe) ; sans organisation sûre, l'auteur
  v_beneficiaire := COALESCE((SELECT o.owner_id FROM organizations o WHERE o.id = v_org), v_facture.user_id);

  SELECT stripe_enabled, commission_model INTO v_config
  FROM stripe_config
  WHERE user_id = v_beneficiaire;

  RETURN jsonb_build_object(
    'facture', jsonb_build_object(
      'id', CASE WHEN v_serveur THEN v_facture.id END,
      'numero', v_facture.numero,
      'date', v_facture.date,
      'date_echeance', v_facture.date_echeance,
      'objet', v_facture.objet,
      'total_ht', v_facture.total_ht,
      'total_tva', v_facture.total_tva,
      'total_ttc', v_facture.total_ttc,
      'montant_paye', COALESCE(v_facture.montant_paye, 0),
      'montant_credite', v_credite,
      'recu', v_recu,
      'reste_du', v_reste,
      'payable', v_payable,
      'statut', v_facture.statut,
      'payment_status', v_facture.payment_status,
      'payment_completed_at', v_facture.payment_completed_at,
      'stripe_session_id', CASE WHEN v_serveur THEN v_facture.stripe_session_id END,
      'lignes', v_facture.lignes,
      'user_id', CASE WHEN v_serveur THEN v_facture.user_id END,
      'beneficiaire_id', CASE WHEN v_serveur THEN v_beneficiaire END
    ),
    'client', CASE WHEN v_client.id IS NOT NULL THEN jsonb_build_object(
      'nom', v_client.nom,
      'prenom', v_client.prenom,
      'email', v_client.email
    ) ELSE '{}'::jsonb END,
    'entreprise', CASE WHEN v_entreprise.id IS NOT NULL THEN jsonb_build_object(
      'nom', v_entreprise.nom,
      'adresse', v_entreprise.adresse,
      'ville', v_entreprise.ville,
      'code_postal', v_entreprise.code_postal,
      'telephone', v_entreprise.telephone,
      'email', v_entreprise.email,
      'siret', v_entreprise.siret,
      'logo_url', v_entreprise.logo_url,
      'couleur', COALESCE(v_entreprise.couleur_principale, '#f97316'),
      'iban', v_entreprise.iban,
      'bic', v_entreprise.bic,
      'donnees_fictives', COALESCE(v_entreprise.settings_json -> 'reglages' ->> 'donneesFictives' = 'true', false)
    ) ELSE '{}'::jsonb END,
    'stripe_enabled', COALESCE(v_config.stripe_enabled, false),
    'commission_model', COALESCE(v_config.commission_model, 'artisan')
  );
END;
$function$;

-- 2. Page de signature
CREATE OR REPLACE FUNCTION public.get_devis_for_signature(p_token uuid)
 RETURNS json
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  d public.devis%ROWTYPE;
  e public.entreprise%ROWTYPE;
  c public.clients%ROWTYPE;
  ch public.chantiers%ROWTYPE;
  r JSONB;
  v_org UUID;
  v_fin DATE;
  v_fin_retractation DATE;
BEGIN
  IF p_token IS NULL THEN RETURN NULL; END IF;
  SELECT * INTO d FROM public.devis WHERE signature_token = p_token;
  IF d.id IS NULL THEN RETURN NULL; END IF;

  -- Entreprise, client et chantier : seulement des lignes DU COMPTE de l'auteur du devis (les siennes, ou celles
  -- d'un membre de son organisation si lui-même en est membre). Les identifiants du devis (entreprise_id,
  -- client_id, chantier_id, organization_id) sont écrits librement par son auteur : sans ce filtre, un compte
  -- lisait par cette fonction publique la fiche (IBAN) ou les clients d'un autre artisan (relecture
  -- gardien-securite du 10 oct. 2026).
  SELECT m.organization_id INTO v_org FROM public.organization_members m
  WHERE m.organization_id = d.organization_id AND m.user_id = d.user_id LIMIT 1;

  -- Fiche (106) : d'abord une fiche de l'organisation du devis (celle qu'il désigne, puis une non archivée, par
  -- défaut, la plus ancienne), l'auteur en dernier. Avant, la fiche personnelle de l'auteur passait devant celle de l'entreprise dès
  -- qu'elle était « par défaut » ou que le devis la désignait : le devis d'un salarié montrait une autre société
  SELECT * INTO e FROM public.entreprise en
  WHERE en.user_id = d.user_id
     OR (v_org IS NOT NULL AND en.organization_id = v_org
         AND EXISTS (SELECT 1 FROM public.organization_members m2 WHERE m2.organization_id = v_org AND m2.user_id = en.user_id))
  ORDER BY COALESCE(en.organization_id = v_org, false) DESC, (en.id IS NOT DISTINCT FROM d.entreprise_id) DESC,
           (en.archived_at IS NULL) DESC, COALESCE(en.is_default, false) DESC, en.created_at
  LIMIT 1;

  SELECT * INTO c FROM public.clients x
  WHERE x.id = d.client_id AND (x.user_id = d.user_id
     OR (v_org IS NOT NULL AND x.organization_id = v_org
         AND EXISTS (SELECT 1 FROM public.organization_members m3 WHERE m3.organization_id = v_org AND m3.user_id = x.user_id)));

  r := COALESCE(e.settings_json -> 'reglages', '{}'::jsonb);

  -- Déjà signé, sur place (signature, statut « accepte ») ou à distance (signature_data, « signe »), ou facturé
  IF d.signature_data IS NOT NULL OR d.signature IS NOT NULL
     OR d.statut IN ('accepte', 'signe', 'acompte_facture', 'facture') THEN
    -- Rétractation en ligne (L221-21, D221-5) : devis signé PAR LE LIEN par un particulier depuis le 19 juin 2026
    -- (retractation_en_ligne, figé à la signature) ; rien d'autre une fois le délai fini sans rétractation
    v_fin_retractation := public.fin_delai_retractation((d.signature_date AT TIME ZONE 'Europe/Paris')::date, d.avis_retractation);
    IF NOT d.retractation_en_ligne OR d.signature_data IS NULL OR d.signature_date IS NULL
       OR (d.retractation_le IS NULL AND (now() AT TIME ZONE 'Europe/Paris')::date > v_fin_retractation) THEN
      RETURN json_build_object('devis', json_build_object('already_signed', true));
    END IF;
    RETURN json_build_object(
      'devis', json_build_object(
        'already_signed', true, 'numero', d.numero, 'date', d.date, 'travaux_urgents', d.travaux_urgents,
        'signature_date', d.signature_date, 'signataire_nom', d.signataire_nom,
        'retractation', json_build_object(
          'ouverte', d.retractation_le IS NULL AND (now() AT TIME ZONE 'Europe/Paris')::date <= v_fin_retractation,
          'fin', v_fin_retractation, 'le', d.retractation_le, 'nom', d.retractation_nom,
          'email', d.retractation_email, 'accuse_le', d.retractation_accuse_le)
      ),
      'client', json_build_object('nom', c.nom, 'prenom', c.prenom, 'email', c.email),
      'entreprise', jsonb_build_object('nom', e.nom, 'couleur', COALESCE(e.couleur_principale, e.couleur))
        || jsonb_strip_nulls(jsonb_build_object('nomEntrepreneur', r ->> 'nomEntrepreneur',
                                                'donneesFictives', CASE WHEN r ->> 'donneesFictives' = 'true' THEN true END))
    );
  END IF;
  IF d.signature_expires_at IS NULL OR d.signature_expires_at <= now() THEN RETURN NULL; END IF;
  -- Brouillon, refusé, annulé : plus proposé à la signature
  IF d.statut IS NULL OR d.statut NOT IN ('envoye', 'en_attente') THEN
    RETURN json_build_object('devis', json_build_object('indisponible', true));
  END IF;
  -- Offre caduque après son dernier jour de validité (C. civ. 1117) ; même repli que generate_signature_token
  v_fin := COALESCE(d.date_validite, d.date + NULLIF(d.validite_jours, 0), d.date + COALESCE((SELECT en.validite_devis FROM public.entreprise en WHERE en.user_id = d.user_id ORDER BY COALESCE(en.is_default, false) DESC, en.created_at LIMIT 1), 30));
  IF v_fin IS NOT NULL AND v_fin < (now() AT TIME ZONE 'Europe/Paris')::date THEN
    RETURN json_build_object('devis', json_build_object('expire', true, 'date_validite', v_fin));
  END IF;

  SELECT * INTO ch FROM public.chantiers x
  WHERE x.id = d.chantier_id AND (x.user_id = d.user_id
     OR (v_org IS NOT NULL AND x.organization_id = v_org
         AND EXISTS (SELECT 1 FROM public.organization_members m4 WHERE m4.organization_id = v_org AND m4.user_id = x.user_id)));

  RETURN json_build_object(
    'devis', json_build_object(
      'id', d.id, 'numero', d.numero, 'type', d.type, 'statut', d.statut, 'date', d.date,
      'date_validite', v_fin, 'validite', d.validite_jours, 'objet', d.objet,
      'lignes', d.lignes, 'sections', d.sections, 'conditions', d.conditions,
      'remise_globale', d.remise_globale, 'tva_rate', d.tva_rate,
      'total_ht', d.total_ht, 'total_tva', d.total_tva, 'total_ttc', d.total_ttc,
      'acompte_pct', COALESCE(d.acompte_pct, d.acompte_percent), 'acompte_percent', d.acompte_percent,
      'acompte_montant', d.acompte_montant, 'travaux_urgents', d.travaux_urgents, 'already_signed', false
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
        'tauxPenalites', r ->> 'tauxPenalites',
        'donneesFictives', CASE WHEN r ->> 'donneesFictives' = 'true' THEN true END
      ))
    )::json
  );
END;
$function$;

-- 3. Configuration Stripe : chacun la sienne (le paiement par carte d'une facture suit celle du propriétaire, 1)
DO $$
BEGIN
  IF to_regclass('public.stripe_config') IS NULL THEN RETURN; END IF;
  DROP POLICY IF EXISTS "Org members can view stripe_config" ON public.stripe_config;
  DROP POLICY IF EXISTS "Org members can insert stripe_config" ON public.stripe_config;
  DROP POLICY IF EXISTS "Org members can update stripe_config" ON public.stripe_config;
  DROP POLICY IF EXISTS "Org admins can delete stripe_config" ON public.stripe_config;
END $$;
