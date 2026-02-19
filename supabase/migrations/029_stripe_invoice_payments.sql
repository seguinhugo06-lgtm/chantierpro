-- ============================================================================
-- MIGRATION 029: Stripe Invoice Payments + Bank Connection Preparation
-- Date: 2026-02-18
-- Description:
--   - Add payment columns to devis table
--   - Create stripe_config table for per-user Stripe settings
--   - Create RPCs for Stripe key management and payment tokens
--   - Create bank_connection table (Bridge/Powens preparation)
-- ============================================================================

-- ============================================================================
-- 1. PAYMENT COLUMNS ON DEVIS TABLE
-- ============================================================================

ALTER TABLE devis ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'pending';
ALTER TABLE devis ADD COLUMN IF NOT EXISTS stripe_session_id TEXT;
ALTER TABLE devis ADD COLUMN IF NOT EXISTS stripe_payment_intent_id TEXT;
ALTER TABLE devis ADD COLUMN IF NOT EXISTS payment_method TEXT;
ALTER TABLE devis ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ;
ALTER TABLE devis ADD COLUMN IF NOT EXISTS payment_token TEXT;
ALTER TABLE devis ADD COLUMN IF NOT EXISTS payment_token_expires_at TIMESTAMPTZ;

-- Index on payment_token for fast lookup (public payment page)
CREATE UNIQUE INDEX IF NOT EXISTS idx_devis_payment_token
  ON devis(payment_token) WHERE payment_token IS NOT NULL;

-- ============================================================================
-- 2. STRIPE_CONFIG TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS stripe_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  stripe_enabled BOOLEAN DEFAULT FALSE,
  secret_key_vault_id UUID,
  webhook_secret_vault_id UUID,
  commission_model TEXT DEFAULT 'artisan'
    CHECK (commission_model IN ('artisan', 'client', 'partage')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE stripe_config ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'stripe_config' AND policyname = 'Users manage own stripe_config') THEN
    CREATE POLICY "Users manage own stripe_config" ON stripe_config FOR ALL
      USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- ============================================================================
-- 3. RPC: store_stripe_key
-- Stores the Stripe secret key securely in Supabase Vault
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
  v_vault_id UUID;
  v_wh_vault_id UUID;
  v_existing RECORD;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  -- Validate key format
  IF NOT (p_secret_key LIKE 'sk_test_%' OR p_secret_key LIKE 'sk_live_%' OR p_secret_key LIKE 'rk_%') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid Stripe key format');
  END IF;

  -- Check for existing config
  SELECT * INTO v_existing FROM stripe_config WHERE user_id = v_user_id;

  -- Delete old vault secrets if replacing
  IF v_existing IS NOT NULL AND v_existing.secret_key_vault_id IS NOT NULL THEN
    BEGIN
      PERFORM vault.delete_secret(v_existing.secret_key_vault_id);
    EXCEPTION WHEN OTHERS THEN
      -- Ignore if vault secret doesn't exist
      NULL;
    END;
  END IF;

  -- Store secret key in vault (vault.create_secret returns UUID directly)
  v_vault_id := vault.create_secret(
    p_secret_key,
    'stripe_sk_' || v_user_id::text,
    'Stripe secret key for user ' || v_user_id::text
  );

  -- Store webhook secret if provided
  IF p_webhook_secret IS NOT NULL AND p_webhook_secret != '' THEN
    IF v_existing IS NOT NULL AND v_existing.webhook_secret_vault_id IS NOT NULL THEN
      BEGIN
        PERFORM vault.delete_secret(v_existing.webhook_secret_vault_id);
      EXCEPTION WHEN OTHERS THEN
        NULL;
      END;
    END IF;

    v_wh_vault_id := vault.create_secret(
      p_webhook_secret,
      'stripe_wh_' || v_user_id::text,
      'Stripe webhook secret for user ' || v_user_id::text
    );
  END IF;

  -- Upsert stripe_config
  INSERT INTO stripe_config (user_id, stripe_enabled, secret_key_vault_id, webhook_secret_vault_id, commission_model)
  VALUES (v_user_id, TRUE, v_vault_id, COALESCE(v_wh_vault_id, v_existing.webhook_secret_vault_id), COALESCE(v_existing.commission_model, 'artisan'))
  ON CONFLICT (user_id) DO UPDATE SET
    stripe_enabled = TRUE,
    secret_key_vault_id = v_vault_id,
    webhook_secret_vault_id = COALESCE(v_wh_vault_id, stripe_config.webhook_secret_vault_id),
    updated_at = NOW();

  RETURN jsonb_build_object('success', true);
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- ============================================================================
-- 4. RPC: update_stripe_config
-- Updates Stripe config settings (toggle, commission model)
-- ============================================================================

CREATE OR REPLACE FUNCTION update_stripe_config(
  p_enabled BOOLEAN DEFAULT NULL,
  p_commission_model TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Upsert config
  INSERT INTO stripe_config (user_id, stripe_enabled, commission_model)
  VALUES (
    v_user_id,
    COALESCE(p_enabled, FALSE),
    COALESCE(p_commission_model, 'artisan')
  )
  ON CONFLICT (user_id) DO UPDATE SET
    stripe_enabled = COALESCE(p_enabled, stripe_config.stripe_enabled),
    commission_model = COALESCE(p_commission_model, stripe_config.commission_model),
    updated_at = NOW();
END;
$$;

-- ============================================================================
-- 5. RPC: generate_payment_token
-- Generates a unique payment token for a facture (for public payment page)
-- ============================================================================

CREATE OR REPLACE FUNCTION generate_payment_token(p_facture_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_token TEXT;
  v_existing_token TEXT;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Check ownership
  SELECT payment_token INTO v_existing_token
  FROM devis
  WHERE id = p_facture_id AND user_id = v_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Facture not found or not owned';
  END IF;

  -- Return existing valid token
  IF v_existing_token IS NOT NULL THEN
    RETURN v_existing_token;
  END IF;

  -- Generate new token
  v_token := gen_random_uuid()::text;

  UPDATE devis
  SET payment_token = v_token,
      payment_token_expires_at = NOW() + INTERVAL '90 days'
  WHERE id = p_facture_id AND user_id = v_user_id;

  RETURN v_token;
END;
$$;

-- ============================================================================
-- 6. RPC: get_facture_for_payment
-- Public-facing: retrieves facture data via payment token (no auth required)
-- Used by the public payment page
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
  -- Find facture by token
  SELECT * INTO v_facture
  FROM devis
  WHERE payment_token = p_token
    AND type = 'facture'
    AND (payment_token_expires_at IS NULL OR payment_token_expires_at > NOW());

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Token invalide ou expiré');
  END IF;

  -- Get client
  SELECT id, nom, prenom, email, telephone, adresse INTO v_client
  FROM clients
  WHERE id = v_facture.client_id;

  -- Get entreprise
  SELECT * INTO v_entreprise
  FROM entreprise
  WHERE user_id = v_facture.user_id;

  -- Get stripe config
  SELECT stripe_enabled, commission_model INTO v_config
  FROM stripe_config
  WHERE user_id = v_facture.user_id;

  RETURN jsonb_build_object(
    'facture', jsonb_build_object(
      'id', v_facture.id,
      'numero', v_facture.numero,
      'date', v_facture.date,
      'objet', v_facture.objet,
      'total_ht', v_facture.total_ht,
      'tva', v_facture.tva,
      'total_ttc', v_facture.total_ttc,
      'statut', v_facture.statut,
      'payment_status', v_facture.payment_status,
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
      'telephone', v_entreprise.telephone,
      'email', v_entreprise.email,
      'siret', v_entreprise.siret,
      'logo_url', v_entreprise.logo_url
    ) ELSE '{}'::jsonb END,
    'stripe_enabled', COALESCE(v_config.stripe_enabled, false),
    'commission_model', COALESCE(v_config.commission_model, 'artisan')
  );
END;
$$;

-- Grant execute to anon role (public payment page needs this)
GRANT EXECUTE ON FUNCTION get_facture_for_payment(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION get_facture_for_payment(TEXT) TO authenticated;

-- ============================================================================
-- 7. BANK_CONNECTION TABLE (Bridge/Powens preparation)
-- ============================================================================

CREATE TABLE IF NOT EXISTS bank_connection (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  provider TEXT CHECK (provider IN ('bridge', 'powens')),
  status TEXT DEFAULT 'disconnected'
    CHECK (status IN ('disconnected', 'connected', 'error', 'pending')),
  external_user_id TEXT,
  last_sync_at TIMESTAMPTZ,
  error_message TEXT,
  config JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE bank_connection ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'bank_connection' AND policyname = 'Users manage own bank_connection') THEN
    CREATE POLICY "Users manage own bank_connection" ON bank_connection FOR ALL
      USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- ============================================================================
-- 8. RPC: get_stripe_secret_for_user
-- Reads the Stripe secret key from Vault for a given user.
-- SECURITY DEFINER — only callable by service_role (Edge Functions).
-- ============================================================================

CREATE OR REPLACE FUNCTION get_stripe_secret_for_user(p_user_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_vault_id UUID;
  v_secret TEXT;
BEGIN
  -- Get vault ID from stripe_config
  SELECT secret_key_vault_id INTO v_vault_id
  FROM stripe_config
  WHERE user_id = p_user_id AND stripe_enabled = TRUE;

  IF v_vault_id IS NULL THEN
    RETURN NULL;
  END IF;

  -- Read decrypted secret from Vault
  SELECT decrypted_secret INTO v_secret
  FROM vault.decrypted_secrets
  WHERE id = v_vault_id;

  RETURN v_secret;
END;
$$;

-- Only service_role should call this (Edge Functions use service role)
REVOKE EXECUTE ON FUNCTION get_stripe_secret_for_user(UUID) FROM anon;
REVOKE EXECUTE ON FUNCTION get_stripe_secret_for_user(UUID) FROM authenticated;

-- ============================================================================
-- DONE
-- ============================================================================
