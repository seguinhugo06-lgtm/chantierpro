-- ============================================================
-- Migration 108: le RGE sur la page de signature en ligne
-- ============================================================
-- Pourquoi : get_devis_for_signature (106) renvoie une liste fermée de réglages de l'entreprise, sans le RGE
--   (rge, rgeOrganisme, rgeValidite, rgeDomaine, rangés dans settings_json.reglages). L'aperçu, le PDF et l'e-mail
--   impriment le RGE (src/lib/qualifications.js) ; la page de signature et l'exemplaire signé, non. Or l'Anah exige
--   sur le devis des travaux aidés « intitulé de la qualification, organisme certificateur et le numéro de
--   qualification » (Guide des travaux éligibles, juillet 2025, p. 31) : le devis signé, pièce du dossier d'aide,
--   perdait cette mention (relecture du 3 nov. 2026).
-- Effet : la page de signature reçoit ces quatre réglages ; le générateur commun (buildDevisHtml) imprime la ligne RGE
--   selon les mêmes règles que les autres documents. Rien d'autre ne change (même fonction que 106, quatre clés en plus).
--   Après application : rétablir l'aide du champ settings-field-rge (Settings.jsx) à « Reconnu garant de
--   l'environnement. Imprimé sur vos devis et factures. »
-- Numéro : 107 est pris par la branche cloud/ia-socle.
-- ATTENTION (gardien-securite, 4 nov. 2026) : 110 (cloud/metier-qualifications) réécrit aussi toute la fonction et la
--   contient. Appliquer 108 puis 110 dans la même séance, ou 110 seule. NE JAMAIS rejouer 108 après 110 : la clé
--   « qualifications » disparaîtrait du devis signé, sans aucune erreur. Contrôle après 110 :
--   SELECT position('''qualifications''' in prosrc) > 0 FROM pg_proc WHERE proname = 'get_devis_for_signature';
--
-- ─── Vérification après application (éditeur SQL) ───────────────────────────
--   SELECT position('''rgeDomaine'', r ->> ''rgeDomaine''' in prosrc) > 0 AS rge_signature,
--          has_function_privilege('anon', 'public.get_devis_for_signature(uuid)', 'execute') AS public
--   FROM pg_proc WHERE proname = 'get_devis_for_signature';
--   → rge_signature = true, public = true
-- ============================================================

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
        -- 108 : le RGE (mentions exigées par l'Anah sur le devis des travaux aidés, guide de juillet 2025, p. 31)
        'rge', r ->> 'rge', 'rgeOrganisme', r ->> 'rgeOrganisme', 'rgeValidite', r ->> 'rgeValidite', 'rgeDomaine', r ->> 'rgeDomaine',
        'donneesFictives', CASE WHEN r ->> 'donneesFictives' = 'true' THEN true END
      ))
    )::json
  );
END;
$function$;

-- Page publique : exécutable par un visiteur (règle de 092 ; CREATE OR REPLACE garde déjà les droits)
GRANT EXECUTE ON FUNCTION public.get_devis_for_signature(uuid) TO anon, authenticated;
