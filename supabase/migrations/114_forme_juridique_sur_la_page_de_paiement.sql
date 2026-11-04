-- ============================================================
-- Migration 114: forme juridique sur la page de paiement
-- ============================================================
-- Pourquoi : en franchise en base de TVA (art. 293 B du CGI), aucun écran n'écrit « HT » ou « TTC » (décision D-31,
--   tâche 28 `franchise-restes`). La page de paiement en ligne du client (/pay/:token, éteinte, D-21) écrit
--   « Montant TTC » et « Total TTC » : elle ne peut pas savoir si l'entreprise est en franchise, car
--   get_facture_for_payment (106) ne renvoie pas sa forme juridique (règle unique : estFranchiseTva, src/lib/franchiseTva.js).
-- Effet : la fonction renvoie aussi entreprise.forme_juridique (information déjà imprimée sur la facture remise au
--   client, et déjà renvoyée par get_devis_for_signature). Elle retire aussi des lignes le prix d'achat de l'artisan
--   (clés prixAchat et prix_achat), que 106 renvoyait à tout visiteur muni du lien ; même expression que la migration
--   110 pour get_devis_for_signature. Rien d'autre ne change : même corps que 106, mêmes droits
--   (CREATE OR REPLACE garde les droits d'exécution).
-- Attention : toute migration qui réécrit à nouveau get_facture_for_payment repart du corps de 114 (sinon la forme
--   juridique disparaît ; relecture gardien-securite du 4 nov. 2026).
--
-- ─── Vérification après application (éditeur SQL) ───────────────────────────
--   SELECT position('forme_juridique' in prosrc) > 0 AS forme_renvoyee FROM pg_proc WHERE proname = 'get_facture_for_payment';
--   → true
--   SELECT has_function_privilege('anon', 'public.get_facture_for_payment(text)', 'execute');
--   → true (inchangé)
--   SELECT position('prixAchat' in prosrc) > 0 AS prix_achat_filtre FROM pg_proc WHERE proname = 'get_facture_for_payment';
--   → true
-- ============================================================

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
      -- 114 : les lignes sans le prix d'achat de l'artisan (prixAchat, prix_achat) : un visiteur muni du lien ne doit pas
      --   lire le coût ni la marge. Même expression que get_devis_for_signature (110). La page ne lit pas les lignes.
      'lignes', CASE WHEN jsonb_typeof(v_facture.lignes) = 'array' THEN (
        SELECT COALESCE(jsonb_agg(CASE WHEN jsonb_typeof(l.v) = 'object' THEN l.v - 'prixAchat' - 'prix_achat' ELSE l.v END
                                  ORDER BY l.n), '[]'::jsonb)
        FROM jsonb_array_elements(v_facture.lignes) WITH ORDINALITY AS l(v, n)
      ) ELSE v_facture.lignes END,
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
      -- 114 : la forme juridique, pour écrire les montants sans « TTC » en franchise en base de TVA (art. 293 B du CGI)
      'forme_juridique', v_entreprise.forme_juridique,
      'donnees_fictives', COALESCE(v_entreprise.settings_json -> 'reglages' ->> 'donneesFictives' = 'true', false)
    ) ELSE '{}'::jsonb END,
    'stripe_enabled', COALESCE(v_config.stripe_enabled, false),
    'commission_model', COALESCE(v_config.commission_model, 'artisan')
  );
END;
$function$;

