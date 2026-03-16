-- ============================================================================
-- Migration 012: Stripe Online Payments
-- Adds payment tokens, Stripe configuration, and public RPC functions
-- ============================================================================

-- ============================================================================
-- 1. Payment columns on devis table (for factures)
-- ============================================================================

ALTER TABLE devis ADD COLUMN IF NOT EXISTS payment_token UUID UNIQUE;
ALTER TABLE devis ADD COLUMN IF NOT EXISTS payment_token_expires_at TIMESTAMPTZ;
ALTER TABLE devis ADD COLUMN IF NOT EXISTS stripe_session_id TEXT;
ALTER TABLE devis ADD COLUMN IF NOT EXISTS stripe_payment_intent_id TEXT;
ALTER TABLE devis ADD COLUMN IF NOT EXISTS payment_amount INTEGER; -- montant en centimes
ALTER TABLE devis ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT NULL;
ALTER TABLE devis ADD COLUMN IF NOT EXISTS payment_completed_at TIMESTAMPTZ;
ALTER TABLE devis ADD COLUMN IF NOT EXISTS payment_metadata JSONB;

-- Indexes for fast lookup
CREATE INDEX IF NOT EXISTS idx_devis_payment_token ON devis(payment_token) WHERE payment_token IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_devis_stripe_session ON devis(stripe_session_id) WHERE stripe_session_id IS NOT NULL;

-- ============================================================================
-- 2. Stripe config table (per artisan)
-- ============================================================================

CREATE TABLE IF NOT EXISTS stripe_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) UNIQUE NOT NULL,
  stripe_enabled BOOLEAN DEFAULT FALSE,
  commission_model TEXT DEFAULT 'artisan' CHECK (commission_model IN ('artisan', 'client', 'partage')),
  -- Vault references (UUIDs pointing to vault.secrets entries)
  secret_key_vault_id UUID,
  webhook_secret_vault_id UUID,
  -- Metadata
  stripe_account_id TEXT, -- for future Stripe Connect
  last_payment_at TIMESTAMPTZ,
  total_payments INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE stripe_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own stripe config" ON stripe_config
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ============================================================================
-- 3. Store Stripe API key in Vault (SECURITY DEFINER, authenticated)
-- ============================================================================

CREATE OR REPLACE FUNCTION store_stripe_key(
  p_secret_key TEXT,
  p_webhook_secret TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_secret_key_id UUID;
  v_webhook_secret_id UUID;
  v_existing RECORD;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Non authentifié');
  END IF;

  -- Validate key format
  IF p_secret_key IS NOT NULL AND NOT (p_secret_key LIKE 'sk_live_%' OR p_secret_key LIKE 'sk_test_%') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Format de clé invalide. La clé doit commencer par sk_live_ ou sk_test_');
  END IF;

  -- Check existing config
  SELECT * INTO v_existing FROM stripe_config WHERE user_id = v_user_id;

  -- Delete old vault entries if they exist
  IF v_existing IS NOT NULL THEN
    IF v_existing.secret_key_vault_id IS NOT NULL THEN
      DELETE FROM vault.secrets WHERE id = v_existing.secret_key_vault_id;
    END IF;
    IF v_existing.webhook_secret_vault_id IS NOT NULL AND p_webhook_secret IS NOT NULL THEN
      DELETE FROM vault.secrets WHERE id = v_existing.webhook_secret_vault_id;
    END IF;
  END IF;

  -- Store secret key in Vault
  IF p_secret_key IS NOT NULL THEN
    INSERT INTO vault.secrets (secret, name, description)
    VALUES (p_secret_key, 'stripe_sk_' || v_user_id::text, 'Stripe secret key for user ' || v_user_id::text)
    RETURNING id INTO v_secret_key_id;
  END IF;

  -- Store webhook secret in Vault (optional)
  IF p_webhook_secret IS NOT NULL THEN
    INSERT INTO vault.secrets (secret, name, description)
    VALUES (p_webhook_secret, 'stripe_whsec_' || v_user_id::text, 'Stripe webhook secret for user ' || v_user_id::text)
    RETURNING id INTO v_webhook_secret_id;
  END IF;

  -- Upsert stripe_config
  INSERT INTO stripe_config (user_id, secret_key_vault_id, webhook_secret_vault_id, stripe_enabled, updated_at)
  VALUES (v_user_id, v_secret_key_id, v_webhook_secret_id, TRUE, NOW())
  ON CONFLICT (user_id) DO UPDATE SET
    secret_key_vault_id = COALESCE(v_secret_key_id, stripe_config.secret_key_vault_id),
    webhook_secret_vault_id = COALESCE(v_webhook_secret_id, stripe_config.webhook_secret_vault_id),
    stripe_enabled = TRUE,
    updated_at = NOW();

  RETURN jsonb_build_object('success', true);
END;
$$;

GRANT EXECUTE ON FUNCTION store_stripe_key TO authenticated;

-- ============================================================================
-- 4. Get Stripe config with decrypted keys (service_role only)
-- Used by Edge Functions to retrieve the artisan's Stripe key
-- ============================================================================

CREATE OR REPLACE FUNCTION get_stripe_config_for_user(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_config RECORD;
  v_secret_key TEXT;
  v_webhook_secret TEXT;
BEGIN
  SELECT * INTO v_config FROM stripe_config WHERE user_id = p_user_id;

  IF v_config IS NULL THEN
    RETURN jsonb_build_object('enabled', false, 'error', 'No Stripe config found');
  END IF;

  IF NOT v_config.stripe_enabled THEN
    RETURN jsonb_build_object('enabled', false);
  END IF;

  -- Decrypt secret key from Vault
  IF v_config.secret_key_vault_id IS NOT NULL THEN
    SELECT decrypted_secret INTO v_secret_key
    FROM vault.decrypted_secrets
    WHERE id = v_config.secret_key_vault_id;
  END IF;

  -- Decrypt webhook secret from Vault
  IF v_config.webhook_secret_vault_id IS NOT NULL THEN
    SELECT decrypted_secret INTO v_webhook_secret
    FROM vault.decrypted_secrets
    WHERE id = v_config.webhook_secret_vault_id;
  END IF;

  RETURN jsonb_build_object(
    'enabled', v_config.stripe_enabled,
    'secret_key', v_secret_key,
    'webhook_secret', v_webhook_secret,
    'commission_model', v_config.commission_model
  );
END;
$$;

-- Only service_role can call this (no GRANT to authenticated or anon)
REVOKE ALL ON FUNCTION get_stripe_config_for_user FROM PUBLIC;

-- ============================================================================
-- 5. Generate payment token (SECURITY DEFINER, authenticated)
-- ============================================================================

CREATE OR REPLACE FUNCTION generate_payment_token(
  p_facture_id UUID,
  p_expiry_days INTEGER DEFAULT 90
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_token UUID;
  v_facture RECORD;
BEGIN
  -- Verify ownership
  SELECT id, type, user_id, payment_token, payment_token_expires_at
  INTO v_facture
  FROM devis
  WHERE id = p_facture_id AND user_id = auth.uid();

  IF v_facture IS NULL THEN
    RAISE EXCEPTION 'Facture non trouvée ou accès refusé';
  END IF;

  IF v_facture.type != 'facture' THEN
    RAISE EXCEPTION 'Ce document n''est pas une facture';
  END IF;

  -- Reuse existing token if still valid
  IF v_facture.payment_token IS NOT NULL
     AND v_facture.payment_token_expires_at > NOW() THEN
    RETURN v_facture.payment_token;
  END IF;

  -- Generate new token
  v_token := gen_random_uuid();

  UPDATE devis
  SET payment_token = v_token,
      payment_token_expires_at = NOW() + (p_expiry_days || ' days')::INTERVAL
  WHERE id = p_facture_id;

  RETURN v_token;
END;
$$;

GRANT EXECUTE ON FUNCTION generate_payment_token TO authenticated;

-- ============================================================================
-- 6. Get facture for payment (SECURITY DEFINER, anon)
-- Public function for the payment page
-- ============================================================================

CREATE OR REPLACE FUNCTION get_facture_for_payment(p_token UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_facture RECORD;
  v_client RECORD;
  v_entreprise RECORD;
  v_stripe_config RECORD;
BEGIN
  -- Find facture by payment token
  SELECT * INTO v_facture
  FROM devis
  WHERE payment_token = p_token;

  IF v_facture IS NULL THEN
    RETURN jsonb_build_object('error', 'Token invalide');
  END IF;

  -- Check expiration
  IF v_facture.payment_token_expires_at < NOW() THEN
    RETURN jsonb_build_object('error', 'Ce lien de paiement a expiré');
  END IF;

  -- Check type
  IF v_facture.type != 'facture' THEN
    RETURN jsonb_build_object('error', 'Document invalide');
  END IF;

  -- Check if already paid
  IF v_facture.statut = 'payee' THEN
    RETURN jsonb_build_object(
      'error', 'already_paid',
      'message', 'Cette facture a déjà été payée',
      'payment_date', v_facture.payment_completed_at
    );
  END IF;

  -- Get client info
  SELECT id, nom, prenom, email INTO v_client
  FROM clients
  WHERE id = v_facture.client_id;

  -- Get entreprise info
  SELECT id, nom, siret, tva_intra, adresse, ville, code_postal,
         telephone, email, logo_url, couleur_principale, iban, bic
  INTO v_entreprise
  FROM entreprise
  WHERE user_id = v_facture.user_id;

  -- Check if Stripe is enabled for this artisan
  SELECT stripe_enabled, commission_model INTO v_stripe_config
  FROM stripe_config
  WHERE user_id = v_facture.user_id;

  RETURN jsonb_build_object(
    'facture', jsonb_build_object(
      'id', v_facture.id,
      'numero', v_facture.numero,
      'date', v_facture.date,
      'date_validite', v_facture.date_validite,
      'objet', v_facture.objet,
      'lignes', v_facture.lignes,
      'sections', v_facture.sections,
      'total_ht', v_facture.total_ht,
      'total_tva', v_facture.total_tva,
      'total_ttc', v_facture.total_ttc,
      'tva_rate', v_facture.tva_rate,
      'conditions', v_facture.conditions,
      'remise_globale', v_facture.remise_globale,
      'acompte_percent', v_facture.acompte_percent,
      'acompte_montant', v_facture.acompte_montant,
      'statut', v_facture.statut,
      'user_id', v_facture.user_id
    ),
    'client', jsonb_build_object(
      'nom', COALESCE(v_client.prenom || ' ', '') || COALESCE(v_client.nom, ''),
      'email', v_client.email
    ),
    'entreprise', jsonb_build_object(
      'nom', v_entreprise.nom,
      'siret', v_entreprise.siret,
      'tva_intra', v_entreprise.tva_intra,
      'adresse', v_entreprise.adresse,
      'ville', v_entreprise.ville,
      'code_postal', v_entreprise.code_postal,
      'telephone', v_entreprise.telephone,
      'email', v_entreprise.email,
      'logo_url', v_entreprise.logo_url,
      'couleur', COALESCE(v_entreprise.couleur_principale, '#f97316'),
      'iban', v_entreprise.iban,
      'bic', v_entreprise.bic
    ),
    'stripe', jsonb_build_object(
      'enabled', COALESCE(v_stripe_config.stripe_enabled, false),
      'commission_model', COALESCE(v_stripe_config.commission_model, 'artisan')
    )
  );
END;
$$;

GRANT EXECUTE ON FUNCTION get_facture_for_payment TO anon;
GRANT EXECUTE ON FUNCTION get_facture_for_payment TO authenticated;

-- ============================================================================
-- 7. Update Stripe config settings (authenticated)
-- ============================================================================

CREATE OR REPLACE FUNCTION update_stripe_config(
  p_enabled BOOLEAN DEFAULT NULL,
  p_commission_model TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Non authentifié');
  END IF;

  -- Validate commission model
  IF p_commission_model IS NOT NULL AND p_commission_model NOT IN ('artisan', 'client', 'partage') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Modèle de commission invalide');
  END IF;

  -- Upsert config
  INSERT INTO stripe_config (user_id, stripe_enabled, commission_model, updated_at)
  VALUES (v_user_id, COALESCE(p_enabled, FALSE), COALESCE(p_commission_model, 'artisan'), NOW())
  ON CONFLICT (user_id) DO UPDATE SET
    stripe_enabled = COALESCE(p_enabled, stripe_config.stripe_enabled),
    commission_model = COALESCE(p_commission_model, stripe_config.commission_model),
    updated_at = NOW();

  RETURN jsonb_build_object('success', true);
END;
$$;

GRANT EXECUTE ON FUNCTION update_stripe_config TO authenticated;
