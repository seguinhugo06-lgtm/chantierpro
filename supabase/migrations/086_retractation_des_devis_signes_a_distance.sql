-- ============================================================
-- Migration 086: rétractation des devis signés à distance
-- ============================================================
-- Pourquoi : relecture juriste-btp du 10 oct. 2026 (tâche « retractation-distance »), textes relus sur
--   Légifrance le 12 oct. 2026 :
--   1. La demande expresse du client de commencer les travaux avant la fin des 14 jours n'est recueillie nulle
--      part : s'il se rétracte, il ne doit rien, même pour des travaux faits (C. conso. L221-25, al. 3).
--   2. Depuis le 19 juin 2026 (ordonnance n° 2026-2, décret n° 2026-3), un contrat conclu à distance au moyen
--      d'une interface en ligne (la page de signature) doit offrir une fonctionnalité de rétractation en ligne,
--      « renoncer au contrat ici », pendant tout le délai, avec accusé de réception sur support durable
--      (L221-21 dernier alinéa, D221-5). Après la signature, le lien ne montrait que « Devis déjà accepté ».
--   3. Réparation urgente demandée par le client à son domicile : pas de droit de rétractation pour le strict
--      nécessaire (L221-28, 8°) ; rien ne permettait de le dire. Le reste des travaux le garde : l'avis, le
--      formulaire et la rétractation en ligne restent dus (relecture juriste-btp du 12 oct. 2026).
--   4. Sans l'avis complet (conditions, délai, modalités ET formulaire type), le délai est prolongé de douze mois
--      (L221-20) : c'est le cas de tous les devis signés avant cette migration ; la rétractation en ligne doit
--      rester ouverte pendant tout ce délai prolongé (D221-5).
-- Effet :
--   - devis.execution_anticipee_le : date de la demande expresse (case à cocher à la signature, en ligne ou sur
--     place) ; devis.travaux_urgents : réparation urgente sollicitée par le client (option du devis) ;
--     devis.avis_retractation : la page de signature a montré l'avis et le formulaire complets avant la signature ;
--     devis.retractation_* : la déclaration de rétractation reçue en ligne (date et heure, nom, adresse de
--     l'accusé, IP) et l'envoi de l'accusé de réception ;
--   - ces colonnes ne se réécrivent pas après coup depuis l'app (déclencheur) : ni la rétractation d'un client,
--     ni sa demande expresse une fois le devis signé ;
--   - fin_delai_retractation(date, informé) : dernier jour du délai (L221-18, L221-19 : jour de la conclusion non
--     compté, report au premier jour ouvrable après un samedi, un dimanche ou un jour férié ; douze mois de plus
--     sans l'avis complet, L221-20) ;
--   - sign_devis reçoit la demande expresse et le fait que l'avis complet a été montré ; get_devis_for_signature
--     dit, pour un devis signé en ligne par un particulier, si la rétractation en ligne est ouverte et jusqu'à
--     quand (même après l'expiration du lien de signature) ; retracter_devis enregistre la déclaration (le devis
--     passe à « annule » s'il n'est pas encore facturé, sinon l'artisan en est prévenu et fait un avoir).
--   - Particulier : catégorie « particulier », ou ni catégorie ni entreprise (une copropriété, catégorie
--     « Syndic », n'est pas un consommateur).
--
-- ─── Vérification après application (éditeur SQL) ───────────────────────────
--   SELECT p.proname, has_function_privilege('anon', p.oid, 'EXECUTE') AS visiteur, array_to_string(p.proconfig, ',') AS reglages
--   FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
--   WHERE n.nspname = 'public' AND p.proname IN ('sign_devis', 'get_devis_for_signature', 'retracter_devis', 'fin_delai_retractation') ORDER BY 1;
--   → quatre lignes ; visiteur t pour les trois fonctions de la page publique ; search_path=public, pg_temp ;
--     une seule sign_devis (six paramètres).
--   SELECT public.fin_delai_retractation('2026-10-02'), public.fin_delai_retractation('2026-12-11'),
--          public.fin_delai_retractation('2026-10-02', false);
--   → 2026-10-16 (vendredi), 2026-12-28 (le 25 est férié, puis samedi et dimanche), 2027-10-18 (douze mois de plus)
--   SELECT count(*) FROM public.devis WHERE retractation_le IS NOT NULL;  → 0
-- ============================================================

-- ─── 1. Colonnes ────────────────────────────────────────────────────────────
ALTER TABLE public.devis ADD COLUMN IF NOT EXISTS execution_anticipee_le TIMESTAMPTZ;
ALTER TABLE public.devis ADD COLUMN IF NOT EXISTS travaux_urgents BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.devis ADD COLUMN IF NOT EXISTS avis_retractation BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.devis ADD COLUMN IF NOT EXISTS retractation_le TIMESTAMPTZ;
ALTER TABLE public.devis ADD COLUMN IF NOT EXISTS retractation_nom TEXT;
ALTER TABLE public.devis ADD COLUMN IF NOT EXISTS retractation_email TEXT;
ALTER TABLE public.devis ADD COLUMN IF NOT EXISTS retractation_ip TEXT;
ALTER TABLE public.devis ADD COLUMN IF NOT EXISTS retractation_accuse_le TIMESTAMPTZ;

-- ─── 2. Ce que l'app ne peut pas réécrire ───────────────────────────────────
-- Un compte connecté (rôle authenticated, l'app) ne touche ni à une rétractation reçue, ni à la demande expresse
-- d'un devis déjà signé (il la pose seulement au moment où il enregistre la signature sur place), ni à l'option
-- « réparation urgente » après la signature (elle ferait disparaître la rétractation en ligne du client). Les fonctions
-- de la page publique (SECURITY DEFINER) et les fonctions serveur (service_role) ne sont pas concernées.
CREATE OR REPLACE FUNCTION public.garder_retractation()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  IF current_user NOT IN ('authenticated', 'anon') THEN RETURN NEW; END IF;
  IF NEW.retractation_le IS DISTINCT FROM OLD.retractation_le
     OR NEW.retractation_nom IS DISTINCT FROM OLD.retractation_nom
     OR NEW.retractation_email IS DISTINCT FROM OLD.retractation_email
     OR NEW.retractation_ip IS DISTINCT FROM OLD.retractation_ip
     OR NEW.retractation_accuse_le IS DISTINCT FROM OLD.retractation_accuse_le
     OR NEW.avis_retractation IS DISTINCT FROM OLD.avis_retractation THEN
    RAISE EXCEPTION 'La rétractation du client ne se modifie pas'
      USING HINT = 'Elle est enregistrée par la page de signature (retracter_devis).';
  END IF;
  IF (NEW.execution_anticipee_le IS DISTINCT FROM OLD.execution_anticipee_le
      OR NEW.travaux_urgents IS DISTINCT FROM OLD.travaux_urgents)
     AND (OLD.signature IS NOT NULL OR OLD.signature_data IS NOT NULL) THEN
    RAISE EXCEPTION 'La demande du client et la réparation urgente ne se modifient plus après la signature';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_garder_retractation ON public.devis;
CREATE TRIGGER trg_garder_retractation
  BEFORE UPDATE OF retractation_le, retractation_nom, retractation_email, retractation_ip, retractation_accuse_le,
                   avis_retractation, execution_anticipee_le, travaux_urgents
  ON public.devis
  FOR EACH ROW EXECUTE FUNCTION public.garder_retractation();

-- ─── 3. Fin du délai de rétractation ────────────────────────────────────────
-- L221-18 : quatorze jours à compter de la conclusion du contrat (prestation de services). L221-19 : le jour de
-- la conclusion n'est pas compté ; le délai finit à la dernière heure du dernier jour ; s'il finit un samedi, un
-- dimanche ou un jour férié ou chômé, il est prorogé jusqu'au premier jour ouvrable suivant. Jours fériés de
-- l'article L3133-1 du code du travail, plus le Vendredi saint et le 26 décembre (fériés en Moselle et en Alsace,
-- L3134-13) pour tous : le délai n'est jamais plus court que celui du client. L221-20 : sans l'avis complet, douze
-- mois de plus après le délai initial. Même calcul en JavaScript dans src/lib/retractation.js.
DROP FUNCTION IF EXISTS public.fin_delai_retractation(DATE);
CREATE OR REPLACE FUNCTION public.premier_jour_ouvrable(p_jour DATE)
RETURNS DATE
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public, pg_temp
AS $$
DECLARE
  v_jour DATE := p_jour;
  v_annee INT;
  a INT; b INT; c INT; d INT; e INT; f INT; g INT; h INT; i INT; k INT; l INT; m INT;
  v_paques DATE;
BEGIN
  IF p_jour IS NULL THEN RETURN NULL; END IF;
  LOOP
    v_annee := extract(year FROM v_jour)::int;
    -- Pâques (calendrier grégorien, algorithme anonyme de Meeus, Jones et Butcher)
    a := v_annee % 19; b := v_annee / 100; c := v_annee % 100; d := b / 4; e := b % 4;
    f := (b + 8) / 25; g := (b - f + 1) / 3; h := (19 * a + b - d - g + 15) % 30;
    i := c / 4; k := c % 4; l := (32 + 2 * e + 2 * i - h - k) % 7; m := (a + 11 * h + 22 * l) / 451;
    v_paques := make_date(v_annee, (h + l - 7 * m + 114) / 31, ((h + l - 7 * m + 114) % 31) + 1);
    EXIT WHEN extract(isodow FROM v_jour) < 6
      AND v_jour <> ALL (ARRAY[
        make_date(v_annee, 1, 1), v_paques - 2, v_paques + 1, make_date(v_annee, 5, 1), make_date(v_annee, 5, 8),
        v_paques + 39, v_paques + 50, make_date(v_annee, 7, 14), make_date(v_annee, 8, 15), make_date(v_annee, 11, 1),
        make_date(v_annee, 11, 11), make_date(v_annee, 12, 25), make_date(v_annee, 12, 26)]);
    v_jour := v_jour + 1;
  END LOOP;
  RETURN v_jour;
END;
$$;

CREATE OR REPLACE FUNCTION public.fin_delai_retractation(p_conclusion DATE, p_informe BOOLEAN DEFAULT true)
RETURNS DATE
LANGUAGE sql
IMMUTABLE
SET search_path = public, pg_temp
AS $$
  SELECT CASE WHEN p_informe IS TRUE THEN public.premier_jour_ouvrable(p_conclusion + 14)
              ELSE public.premier_jour_ouvrable((public.premier_jour_ouvrable(p_conclusion + 14) + interval '12 months')::date) END;
$$;

-- ─── 4. Lire le devis (page publique) ───────────────────────────────────────
-- Reprend 083 (et le réglage de 085). Nouveau : pour un devis déjà signé, la page reçoit, si le devis a été signé
-- en ligne par un particulier, l'état de la rétractation en ligne (ouverte jusqu'au…, ou reçue le…), avec de quoi
-- préremplir la déclaration (numéro, dates, signataire, e-mail du client, nom de l'entreprise). Rien d'autre.
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
  v_fin_retractation DATE;
  v_particulier BOOLEAN;
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

  r := COALESCE(e.settings_json -> 'reglages', '{}'::jsonb);

  -- Déjà signé, sur place (signature, statut « accepte ») ou à distance (signature_data, « signe »), ou facturé
  IF d.signature_data IS NOT NULL OR d.signature IS NOT NULL
     OR d.statut IN ('accepte', 'signe', 'acompte_facture', 'facture') THEN
    -- Particulier : même règle que estClientParticulier (src/lib/retractation.js)
    v_particulier := c.id IS NOT NULL AND (lower(btrim(COALESCE(c.categorie, ''))) = 'particulier'
      OR (btrim(COALESCE(c.categorie, '')) = '' AND btrim(COALESCE(c.entreprise, '')) = ''));
    -- Rétractation en ligne (L221-21, D221-5) : devis signé PAR LE LIEN, par un particulier
    IF d.signature_data IS NULL OR d.signature_date IS NULL OR NOT v_particulier THEN
      RETURN json_build_object('devis', json_build_object('already_signed', true));
    END IF;
    v_fin_retractation := public.fin_delai_retractation((d.signature_date AT TIME ZONE 'Europe/Paris')::date, d.avis_retractation);
    RETURN json_build_object(
      'devis', json_build_object(
        'already_signed', true, 'numero', d.numero, 'date', d.date, 'objet', d.objet,
        'total_ttc', d.total_ttc, 'signature_date', d.signature_date, 'signataire_nom', d.signataire_nom,
        'retractation', json_build_object(
          'ouverte', d.retractation_le IS NULL AND (now() AT TIME ZONE 'Europe/Paris')::date <= v_fin_retractation,
          'fin', v_fin_retractation, 'le', d.retractation_le, 'nom', d.retractation_nom,
          'email', d.retractation_email, 'accuse_le', d.retractation_accuse_le)
      ),
      'client', json_build_object('nom', c.nom, 'prenom', c.prenom, 'email', c.email),
      'entreprise', jsonb_build_object('nom', e.nom, 'couleur', COALESCE(e.couleur_principale, e.couleur))
        || jsonb_strip_nulls(jsonb_build_object('nomEntrepreneur', r ->> 'nomEntrepreneur'))
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
$$;

-- ─── 5. Signer (page publique) : la demande expresse en plus ────────────────
-- Un seul sign_devis : l'ancienne version à cinq paramètres disparaît (deux versions rendraient l'appel par noms
-- ambigu) ; une page encore en cache qui n'envoie pas les nouveaux paramètres signe sans demande expresse, et
-- sans avis complet (le délai est alors prolongé, L221-20).
DROP FUNCTION IF EXISTS public.sign_devis(UUID, TEXT, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.sign_devis(UUID, TEXT, TEXT, TEXT, TEXT, BOOLEAN);
CREATE OR REPLACE FUNCTION public.sign_devis(
  p_token UUID, p_signature_data TEXT, p_signataire_nom TEXT, p_ip TEXT DEFAULT NULL, p_user_agent TEXT DEFAULT NULL,
  p_execution_anticipee BOOLEAN DEFAULT false, p_avis_retractation BOOLEAN DEFAULT false
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
  v_entetes JSON;
BEGIN
  -- IP du signataire relevée par le serveur (la page ne peut pas la connaître) : d'abord l'en-tête posé par la
  -- passerelle (le client peut écrire lui-même le début de x-forwarded-for), à défaut celle transmise
  BEGIN
    v_entetes := NULLIF(current_setting('request.headers', true), '')::json;
    v_ip := NULLIF(btrim(COALESCE(v_entetes ->> 'cf-connecting-ip', v_entetes ->> 'x-real-ip',
                                  split_part(v_entetes ->> 'x-forwarded-for', ',', 1))), '');
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
         OR COALESCE(dv.date_validite, dv.date + NULLIF(dv.validite_jours, 0),
                     dv.date + COALESCE((SELECT en.validite_devis FROM public.entreprise en WHERE en.user_id = dv.user_id ORDER BY COALESCE(en.is_default, false) DESC, en.created_at LIMIT 1), 30)) >= (now() AT TIME ZONE 'Europe/Paris')::date)
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
    -- Demande expresse de commencer avant la fin du délai de rétractation (L221-25), cochée par le client
    execution_anticipee_le = CASE WHEN p_execution_anticipee IS TRUE THEN now() END,
    -- La page a montré l'avis d'information et le formulaire type (L221-5, 7°) avant la signature
    avis_retractation = p_avis_retractation IS TRUE,
    statut = 'signe',
    updated_at = now()
  WHERE id = v_devis_id;

  INSERT INTO public.portal_access_logs (client_id, action, ip_address, user_agent)
  VALUES (v_client_id, 'signature', v_ip, left(p_user_agent, 500));

  RETURN json_build_object('success', true, 'devis_id', v_devis_id);
END;
$$;

-- ─── 6. Renoncer au contrat (page publique, D221-5) ─────────────────────────
-- Déclaration de rétractation en ligne : nom et prénom, contrat (le lien de signature l'identifie), adresse
-- électronique où recevoir l'accusé de réception. Enregistrée une fois, pendant le délai (prolongé sans l'avis
-- complet), pour un devis signé en ligne par un particulier, réparation urgente comprise (le reste des travaux
-- garde le droit). Le devis passe à « annule » s'il n'est pas encore facturé ; sinon il garde son
-- statut et l'artisan voit la rétractation (remboursement sous 14 jours, avoir : L221-24).
CREATE OR REPLACE FUNCTION public.retracter_devis(
  p_token UUID, p_nom TEXT, p_email TEXT, p_user_agent TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  d public.devis%ROWTYPE;
  c public.clients%ROWTYPE;
  v_org UUID;
  v_nom TEXT := btrim(COALESCE(p_nom, ''));
  v_email TEXT := lower(btrim(COALESCE(p_email, '')));
  v_ip TEXT;
  v_entetes JSON;
  v_fin DATE;
  v_maintenant TIMESTAMPTZ := now();
BEGIN
  IF p_token IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Lien invalide.');
  END IF;
  IF length(v_nom) = 0 OR length(v_nom) > 200 THEN
    RETURN json_build_object('success', false, 'error', 'Indiquez votre nom et votre prénom (200 caractères au plus).');
  END IF;
  IF length(v_email) > 254 OR v_email !~ '^[a-z0-9._+''-]+@[a-z0-9.-]+\.[a-z]{2,}$' THEN
    RETURN json_build_object('success', false, 'error', 'Indiquez une adresse e-mail valide pour recevoir l''accusé de réception.');
  END IF;

  BEGIN
    v_entetes := NULLIF(current_setting('request.headers', true), '')::json;
    v_ip := NULLIF(btrim(COALESCE(v_entetes ->> 'cf-connecting-ip', v_entetes ->> 'x-real-ip',
                                  split_part(v_entetes ->> 'x-forwarded-for', ',', 1))), '');
  EXCEPTION WHEN others THEN v_ip := NULL;
  END;
  v_ip := left(v_ip, 100);

  SELECT * INTO d FROM public.devis WHERE signature_token = p_token FOR UPDATE;
  IF d.id IS NULL OR d.signature_data IS NULL OR d.signature_date IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Ce lien ne permet pas de renoncer en ligne à ce contrat. Contactez l''entreprise.');
  END IF;
  -- Déjà reçue : on ne la remplace pas (la première déclaration fait foi)
  IF d.retractation_le IS NOT NULL THEN
    RETURN json_build_object('success', true, 'deja', true, 'retractation_le', d.retractation_le);
  END IF;

  -- Particulier seulement (même ancrage du client que get_devis_for_signature)
  SELECT m.organization_id INTO v_org FROM public.organization_members m
  WHERE m.organization_id = d.organization_id AND m.user_id = d.user_id LIMIT 1;
  SELECT * INTO c FROM public.clients x
  WHERE x.id = d.client_id AND (x.user_id = d.user_id
     OR (v_org IS NOT NULL AND x.organization_id = v_org
         AND EXISTS (SELECT 1 FROM public.organization_members m3 WHERE m3.organization_id = v_org AND m3.user_id = x.user_id)));
  IF c.id IS NULL OR NOT (lower(btrim(COALESCE(c.categorie, ''))) = 'particulier'
       OR (btrim(COALESCE(c.categorie, '')) = '' AND btrim(COALESCE(c.entreprise, '')) = '')) THEN
    RETURN json_build_object('success', false, 'error', 'Ce lien ne permet pas de renoncer en ligne à ce contrat. Contactez l''entreprise.');
  END IF;

  v_fin := public.fin_delai_retractation((d.signature_date AT TIME ZONE 'Europe/Paris')::date, d.avis_retractation);
  IF (v_maintenant AT TIME ZONE 'Europe/Paris')::date > v_fin THEN
    RETURN json_build_object('success', false, 'expire', true, 'fin', v_fin,
      'error', 'Le délai de rétractation a pris fin le ' || to_char(v_fin, 'DD/MM/YYYY') || '.');
  END IF;

  UPDATE public.devis SET
    retractation_le = v_maintenant,
    retractation_nom = v_nom,
    retractation_email = v_email,
    retractation_ip = v_ip,
    statut = CASE WHEN statut IN ('signe', 'accepte', 'envoye', 'en_attente') THEN 'annule' ELSE statut END,
    updated_at = v_maintenant
  WHERE id = d.id;

  INSERT INTO public.portal_access_logs (client_id, action, ip_address, user_agent)
  VALUES (d.client_id, 'retractation', v_ip, left(p_user_agent, 500));

  RETURN json_build_object('success', true, 'retractation_le', v_maintenant, 'fin', v_fin);
END;
$$;

-- ─── 7. Droits ──────────────────────────────────────────────────────────────
REVOKE ALL ON FUNCTION public.garder_retractation() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.premier_jour_ouvrable(DATE) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.premier_jour_ouvrable(DATE) TO anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.fin_delai_retractation(DATE, BOOLEAN) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fin_delai_retractation(DATE, BOOLEAN) TO anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.get_devis_for_signature(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_devis_for_signature(UUID) TO anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.sign_devis(UUID, TEXT, TEXT, TEXT, TEXT, BOOLEAN, BOOLEAN) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.sign_devis(UUID, TEXT, TEXT, TEXT, TEXT, BOOLEAN, BOOLEAN) TO anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.retracter_devis(UUID, TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.retracter_devis(UUID, TEXT, TEXT, TEXT) TO anon, authenticated, service_role;
