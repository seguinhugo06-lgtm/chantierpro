-- ============================================================
-- Migration 081: la page de paiement connaît les avoirs et le reste dû
-- ============================================================
-- Pourquoi : relecture sécurité du 10 oct. 2026 (lot facturation). `get_facture_for_payment` (067) renvoie
--   la facture quel que soit son état, et la page /pay/:token comme la fonction create-invoice-payment
--   calculent le reste dû = total − montant_paye, sans les avoirs ni la table `paiements` : une facture
--   annulée par un avoir total restait payable par carte (et relancée avec son lien), un brouillon aussi.
-- Effet : la fonction renvoie en plus `montant_credite` (avoirs émis), `recu` (le plus grand de
--   montant_paye et de la somme des paiements enregistrés), `reste_du` et `payable` (ni avoir, ni brouillon,
--   ni annulée, ni payée, reste dû ≥ 0,50 €). La page et la fonction de paiement s'en servent.
--   Relecture sécurité du 10 oct. 2026 : seuls les avoirs et paiements de la MÊME organisation que la
--   facture comptent (les policies « Org members can insert » laissent un compte écrire une ligne au
--   user_id d'un artisan dans sa propre organisation : un débiteur aurait pu fabriquer un avoir, payer
--   0,50 € et voir sa facture passer « payée ») ; `id`, `user_id` et `stripe_session_id` ne sont plus
--   renvoyés qu'au serveur (la page publique ne s'en sert pas). Même signature, mêmes droits.
--
-- ─── Vérification après application (éditeur SQL) ───────────────────────────
--   SELECT pg_get_functiondef('public.get_facture_for_payment(text)'::regprocedure) LIKE '%payable%';
--   → true
--   SELECT get_facture_for_payment('jeton-inexistant');
--   → {"error": "Token invalide ou expire"}
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_facture_for_payment(p_token TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
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

  -- Avoirs émis sur cette facture, du même compte ET de la même organisation (une ligne écrite par un tiers
  -- dans sa propre organisation ne compte pas) ; un avoir brouillon ou annulé ne crédite rien
  SELECT COALESCE(SUM(ABS(total_ttc)), 0) INTO v_credite
  FROM devis
  WHERE facture_type = 'avoir'
    AND avoir_source_id = v_facture.id
    AND user_id = v_facture.user_id
    AND organization_id IS NOT DISTINCT FROM v_facture.organization_id
    AND COALESCE(statut, '') NOT IN ('brouillon', 'annule', 'annulee');

  -- Reçu : le plus grand de montant_paye (paiement en ligne) et des paiements enregistrés (les deux
  -- sources se recouvrent, comme dans l'app : src/lib/paiementsFacture.js)
  SELECT COALESCE(SUM(GREATEST(montant, 0)), 0) INTO v_paiements
  FROM paiements
  WHERE devis_id = v_facture.id
    AND user_id = v_facture.user_id
    AND organization_id IS NOT DISTINCT FROM v_facture.organization_id;
  v_recu := GREATEST(COALESCE(v_facture.montant_paye, 0), v_paiements);

  v_reste := GREATEST(0, COALESCE(v_facture.total_ttc, 0) - v_credite - v_recu);
  v_payable := COALESCE(v_facture.facture_type, '') <> 'avoir'
    AND COALESCE(v_facture.statut, '') NOT IN ('brouillon', 'annule', 'annulee', 'payee', 'paye')
    AND v_reste >= 0.5;

  SELECT id, nom, prenom, email INTO v_client
  FROM clients
  WHERE id = v_facture.client_id;

  SELECT * INTO v_entreprise
  FROM entreprise
  WHERE user_id = v_facture.user_id;

  SELECT stripe_enabled, commission_model INTO v_config
  FROM stripe_config
  WHERE user_id = v_facture.user_id;

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
      'user_id', CASE WHEN v_serveur THEN v_facture.user_id END
    ),
    'client', CASE WHEN v_client IS NOT NULL THEN jsonb_build_object(
      'nom', v_client.nom,
      'prenom', v_client.prenom,
      'email', v_client.email
    ) ELSE '{}'::jsonb END,
    'entreprise', CASE WHEN v_entreprise IS NOT NULL THEN jsonb_build_object(
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
      'bic', v_entreprise.bic
    ) ELSE '{}'::jsonb END,
    'stripe_enabled', COALESCE(v_config.stripe_enabled, false),
    'commission_model', COALESCE(v_config.commission_model, 'artisan')
  );
END;
$$;

-- Droits inchangés (067) : la page de paiement est publique, l'accès passe par le jeton opaque
REVOKE ALL ON FUNCTION public.get_facture_for_payment(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_facture_for_payment(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.get_facture_for_payment(TEXT) TO authenticated;
