-- ============================================================================
-- Migration 067: Paiement en ligne — architecture unique et cohérente
--
-- Architecture retenue (remplace 3 générations divergentes) :
--   page publique /pay/:token
--     → Edge Function create-invoice-payment action 'create'  (Stripe Checkout,
--       clé de l'ARTISAN lue depuis Vault via get_stripe_secret_for_user)
--     → retour success_url /pay/:token?session_id=…
--     → Edge Function create-invoice-payment action 'verify'  (retrieve session
--       côté serveur → marque la facture payée + notifie l'artisan).
--   PAS de webhook Stripe par artisan (stripe-webhook ne sert qu'aux
--   abonnements SaaS de la plateforme).
--
-- NB : la prod avait déjà des versions divergées de get_facture_for_payment /
-- generate_payment_token (payment_token TEXT, retour à plat) — on repart de
-- ces signatures-là, qui sont celles que la fonction déployée attend.
-- ============================================================================

-- ============================================================================
-- 1. Colonnes déclarées par 012 mais absentes en prod
-- ============================================================================

ALTER TABLE devis ADD COLUMN IF NOT EXISTS payment_completed_at TIMESTAMPTZ;
ALTER TABLE devis ADD COLUMN IF NOT EXISTS payment_metadata JSONB;

-- ============================================================================
-- 2. get_facture_for_payment — RPC publique de la page /pay/:token
--    Renvoie aussi les factures payées (la page affiche l'état « déjà payée »).
-- ============================================================================

CREATE OR REPLACE FUNCTION get_facture_for_payment(p_token TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_facture RECORD;
  v_client RECORD;
  v_entreprise RECORD;
  v_config RECORD;
BEGIN
  SELECT * INTO v_facture
  FROM devis
  WHERE payment_token = p_token
    AND type = 'facture'
    AND (payment_token_expires_at IS NULL OR payment_token_expires_at > NOW());

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Token invalide ou expire');
  END IF;

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
      'id', v_facture.id,
      'numero', v_facture.numero,
      'date', v_facture.date,
      'date_echeance', v_facture.date_echeance,
      'objet', v_facture.objet,
      'total_ht', v_facture.total_ht,
      'total_tva', v_facture.total_tva,
      'total_ttc', v_facture.total_ttc,
      'montant_paye', COALESCE(v_facture.montant_paye, 0),
      'statut', v_facture.statut,
      'payment_status', v_facture.payment_status,
      'payment_completed_at', v_facture.payment_completed_at,
      'stripe_session_id', v_facture.stripe_session_id,
      'lignes', v_facture.lignes,
      'user_id', v_facture.user_id
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

GRANT EXECUTE ON FUNCTION get_facture_for_payment(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION get_facture_for_payment(TEXT) TO authenticated;

-- ============================================================================
-- 3. generate_payment_token — régénère un token expiré (la version prod
--    renvoyait le token existant même expiré → lien mort définitif),
--    et accepte les membres de l'organisation (plan équipe).
-- ============================================================================

CREATE OR REPLACE FUNCTION generate_payment_token(p_facture_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_facture RECORD;
  v_token TEXT;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT id, type, payment_token, payment_token_expires_at INTO v_facture
  FROM devis
  WHERE id = p_facture_id
    AND (
      user_id = auth.uid()
      OR organization_id IN (
        SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
      )
    );

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Facture not found or not owned';
  END IF;

  IF v_facture.type != 'facture' THEN
    RAISE EXCEPTION 'Document is not a facture';
  END IF;

  -- Token existant encore valide → on le réutilise
  IF v_facture.payment_token IS NOT NULL
     AND (v_facture.payment_token_expires_at IS NULL OR v_facture.payment_token_expires_at > NOW()) THEN
    RETURN v_facture.payment_token;
  END IF;

  v_token := gen_random_uuid()::text;

  UPDATE devis
  SET payment_token = v_token,
      payment_token_expires_at = NULL
  WHERE id = p_facture_id;

  RETURN v_token;
END;
$$;

GRANT EXECUTE ON FUNCTION generate_payment_token(UUID) TO authenticated;

-- ============================================================================
-- 4. Token automatique sur chaque facture (le portail client et les relances
--    en ont besoin sans action de l'artisan). UUID non devinable ; la page
--    publique n'expose que le récapitulatif de la facture.
-- ============================================================================

CREATE OR REPLACE FUNCTION set_facture_payment_token()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.type = 'facture' AND NEW.payment_token IS NULL THEN
    NEW.payment_token := gen_random_uuid()::text;
    NEW.payment_token_expires_at := NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_devis_payment_token ON devis;
CREATE TRIGGER trg_devis_payment_token
  BEFORE INSERT OR UPDATE OF type ON devis
  FOR EACH ROW
  EXECUTE FUNCTION set_facture_payment_token();

-- Backfill : factures impayées sans token, ou avec un token déjà expiré
UPDATE devis
SET payment_token = gen_random_uuid()::text,
    payment_token_expires_at = NULL
WHERE type = 'facture'
  AND statut <> 'payee'
  AND (payment_token IS NULL OR (payment_token_expires_at IS NOT NULL AND payment_token_expires_at < NOW()));
