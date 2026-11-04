-- ============================================================
-- Migration 110: le métier de l'entreprise, et ses qualifications sur la page de signature
-- ============================================================
-- Pourquoi :
--   1. Le métier choisi à l'inscription (« Quels travaux faites-vous ? », lot 1 de docs/metiers/synthese.md § 3.1,
--      décision d'Hugo du 4 nov. 2026) n'avait aucune place en base (aucune colonne metier). Sans elle, le choix vivrait
--      dans un navigateur et serait redemandé sur chaque appareil.
--   2. « Mes qualifications » (synthèse § 3.7) remplace le champ RGE unique par une liste (RGE, IRVE, capacité fluides,
--      PG gaz, Certibiocide, Certiphyto, services à la personne), rangée dans settings_json.reglages.qualifications.
--      La page de signature (get_devis_for_signature, 108) ne recevait que les quatre réglages RGE : le devis signé
--      perdait les autres qualifications imprimées sur l'aperçu et le PDF.
-- Effet :
--   - entreprise.metiers : text[], liste fermée des 16 valeurs de src/lib/metiers.js, 16 au plus, vide par défaut
--     (un artisan qui passe la question garde l'app telle qu'elle est). Reprise des choix faits avant la migration
--     (settings_json.reglages.metiers, repli de l'app tant que la colonne manque), valeurs inconnues écartées.
--   - get_devis_for_signature : même fonction que 108, plus la clé « qualifications » : la liste, élément par élément
--     réduit aux sept champs imprimables (type, intitule, organisme, numero, fin, imprimer, motsCles), 20 au plus ;
--     rien d'autre des réglages ne sort. Le générateur commun (buildDevisHtml) applique les règles d'impression de
--     src/lib/qualifications.js (jamais sans numéro, date de fin exigée et non passée…).
--   - Droits : la colonne suit les policies existantes de la table entreprise (aucune nouvelle policy) ; la fonction
--     reste exécutable par un visiteur (page publique, règle de 092).
-- Numéros : 107 (cloud/ia-socle), 108 (cloud/metiers), 109 (cloud/ia-allumage) sont pris. 110 contient toute la
--   fonction de 108 : appliquer 108 PUIS 110 (ou 110 seule). JAMAIS 108 après 110 : la clé « qualifications »
--   disparaîtrait sans erreur (relecture gardien-securite du 4 nov. 2026).
--
-- ─── Vérification après application (éditeur SQL) ───────────────────────────
--   SELECT (SELECT data_type FROM information_schema.columns
--           WHERE table_schema = 'public' AND table_name = 'entreprise' AND column_name = 'metiers') AS colonne,
--          position('''qualifications''' in (SELECT prosrc FROM pg_proc WHERE proname = 'get_devis_for_signature')) > 0 AS signature,
--          has_function_privilege('anon', 'public.get_devis_for_signature(uuid)', 'execute') AS public;
--   → colonne = ARRAY, signature = true, public = true
-- ============================================================

-- ─── 1. Le métier ─────────────────────────────────────────────────────────────
ALTER TABLE public.entreprise ADD COLUMN IF NOT EXISTS metiers TEXT[] NOT NULL DEFAULT '{}';

-- Reprise des choix enregistrés avant la colonne (repli de l'app dans settings_json.reglages.metiers) : seulement les
-- valeurs connues, une fois chacune, et seulement pour une fiche dont la colonne est encore vide
UPDATE public.entreprise en
SET metiers = ARRAY(
  SELECT DISTINCT v FROM jsonb_array_elements_text(en.settings_json -> 'reglages' -> 'metiers') v
  WHERE v IN ('electricien', 'plombier', 'chauffagiste', 'frigoriste', 'ramoneur', 'macon', 'couvreur', 'charpentier',
              'menuisier', 'plaquiste', 'peintre', 'carreleur', 'serrurier', 'paysagiste', 'multiservice', 'autre')
  ORDER BY v)
WHERE cardinality(en.metiers) = 0
  AND jsonb_typeof(en.settings_json -> 'reglages' -> 'metiers') = 'array';

ALTER TABLE public.entreprise DROP CONSTRAINT IF EXISTS entreprise_metiers_connus;
ALTER TABLE public.entreprise ADD CONSTRAINT entreprise_metiers_connus CHECK (
  cardinality(metiers) <= 16
  AND metiers <@ ARRAY['electricien', 'plombier', 'chauffagiste', 'frigoriste', 'ramoneur', 'macon', 'couvreur', 'charpentier',
                       'menuisier', 'plaquiste', 'peintre', 'carreleur', 'serrurier', 'paysagiste', 'multiservice', 'autre']::TEXT[]
);

COMMENT ON COLUMN public.entreprise.metiers IS 'Métiers choisis par l''artisan (src/lib/metiers.js) : ordre du catalogue et des modèles, modules allumés. Vide = aucun choix.';

-- ─── 2. Les qualifications sur la page de signature ─────────────────────────
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
        -- 110 : « Mes qualifications », chaque élément réduit à ses champs imprimables (liste fermée), 20 au plus
        'qualifications', CASE WHEN jsonb_typeof(r -> 'qualifications') = 'array' THEN (
          SELECT jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
                   'type', x.q ->> 'type', 'intitule', x.q ->> 'intitule', 'organisme', x.q ->> 'organisme',
                   'numero', x.q ->> 'numero', 'fin', x.q ->> 'fin',
                   'imprimer', CASE WHEN jsonb_typeof(x.q -> 'imprimer') = 'boolean' THEN x.q -> 'imprimer' END,
                   'motsCles', x.q ->> 'motsCles')) ORDER BY x.n)
          FROM jsonb_array_elements(r -> 'qualifications') WITH ORDINALITY AS x(q, n)
          -- Une qualification que l'artisan a choisi de ne pas imprimer ne sort pas (relecture gardien-securite du 4 nov.)
          WHERE jsonb_typeof(x.q) = 'object' AND x.n <= 20 AND COALESCE(x.q ->> 'imprimer', 'true') <> 'false') END,
        'donneesFictives', CASE WHEN r ->> 'donneesFictives' = 'true' THEN true END
      ))
    )::json
  );
END;
$function$;

-- Page publique : exécutable par un visiteur (règle de 092 ; CREATE OR REPLACE garde déjà les droits)
GRANT EXECUTE ON FUNCTION public.get_devis_for_signature(uuid) TO anon, authenticated;
