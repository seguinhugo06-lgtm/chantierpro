-- ============================================================================
-- MIGRATION 044: Online Payment System (Stripe Connect + GoCardless SEPA)
-- Date: 2026-03-11
-- Description:
--   - Extend stripe_config with Connect + GoCardless fields
--   - Create payment_links table (generated payment links tracking)
--   - Create payment_transactions table (transaction history)
--   - RPC for public payment link data retrieval
--   - RLS policies including anonymous access for payment pages
-- ============================================================================

-- ============================================================================
-- 1. EXTEND STRIPE_CONFIG TABLE
-- Add Stripe Connect, GoCardless, and fee management columns
-- ============================================================================

ALTER TABLE stripe_config ADD COLUMN IF NOT EXISTS stripe_account_id TEXT;
ALTER TABLE stripe_config ADD COLUMN IF NOT EXISTS stripe_connect_status TEXT DEFAULT 'disconnected';
ALTER TABLE stripe_config ADD COLUMN IF NOT EXISTS stripe_livemode BOOLEAN DEFAULT FALSE;
ALTER TABLE stripe_config ADD COLUMN IF NOT EXISTS absorb_fees BOOLEAN DEFAULT TRUE;
ALTER TABLE stripe_config ADD COLUMN IF NOT EXISTS gocardless_enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE stripe_config ADD COLUMN IF NOT EXISTS gocardless_access_token_vault_id UUID;
ALTER TABLE stripe_config ADD COLUMN IF NOT EXISTS gocardless_environment TEXT DEFAULT 'sandbox';
ALTER TABLE stripe_config ADD COLUMN IF NOT EXISTS gocardless_creditor_id TEXT;
ALTER TABLE stripe_config ADD COLUMN IF NOT EXISTS organization_id UUID;

-- Add check constraints safely
DO $$ BEGIN
  ALTER TABLE stripe_config ADD CONSTRAINT stripe_config_connect_status_check
    CHECK (stripe_connect_status IN ('disconnected','pending','connected','error'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE stripe_config ADD CONSTRAINT stripe_config_gc_environment_check
    CHECK (gocardless_environment IN ('sandbox','live'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================================
-- 2. PAYMENT_LINKS TABLE
-- Tracks generated payment links for documents
-- ============================================================================

CREATE TABLE IF NOT EXISTS payment_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  organization_id UUID,
  document_id UUID NOT NULL,
  document_type TEXT NOT NULL DEFAULT 'facture',
  document_numero TEXT,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  token TEXT NOT NULL UNIQUE,
  montant_centimes INTEGER NOT NULL,
  montant_ttc NUMERIC(12,2),
  devise TEXT DEFAULT 'EUR',
  statut TEXT DEFAULT 'actif'
    CHECK (statut IN ('actif','paye','expire','annule')),
  stripe_enabled BOOLEAN DEFAULT FALSE,
  gocardless_enabled BOOLEAN DEFAULT FALSE,
  absorb_fees BOOLEAN DEFAULT TRUE,
  expires_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  payment_transaction_id UUID,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE payment_links ENABLE ROW LEVEL SECURITY;

-- Index for public lookup by token
CREATE UNIQUE INDEX IF NOT EXISTS idx_payment_links_token
  ON payment_links(token);

-- Index for user document queries
CREATE INDEX IF NOT EXISTS idx_payment_links_user_doc
  ON payment_links(user_id, document_id);

-- Index for status filtering
CREATE INDEX IF NOT EXISTS idx_payment_links_statut
  ON payment_links(statut) WHERE statut = 'actif';

-- Owner policy (authenticated users manage their own links)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'payment_links' AND policyname = 'Users manage own payment_links') THEN
    CREATE POLICY "Users manage own payment_links" ON payment_links FOR ALL
      USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- Anonymous read policy (public payment page reads by token)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'payment_links' AND policyname = 'Anon read payment_links by token') THEN
    CREATE POLICY "Anon read payment_links by token" ON payment_links FOR SELECT
      TO anon
      USING (true);
  END IF;
END $$;

-- ============================================================================
-- 3. PAYMENT_TRANSACTIONS TABLE
-- Records all payment transactions (online + offline for tracking)
-- ============================================================================

CREATE TABLE IF NOT EXISTS payment_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  organization_id UUID,
  payment_link_id UUID REFERENCES payment_links(id) ON DELETE SET NULL,
  document_id UUID,
  document_numero TEXT,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  provider TEXT NOT NULL
    CHECK (provider IN ('stripe','gocardless','offline')),
  provider_transaction_id TEXT,
  provider_session_id TEXT,
  montant_centimes INTEGER NOT NULL,
  montant_brut NUMERIC(12,2),
  frais_centimes INTEGER DEFAULT 0,
  montant_net NUMERIC(12,2),
  devise TEXT DEFAULT 'EUR',
  statut TEXT DEFAULT 'pending'
    CHECK (statut IN ('pending','processing','succeeded','failed','refunded','partially_refunded')),
  payment_method TEXT,
  card_brand TEXT,
  card_last4 TEXT,
  sepa_bank_name TEXT,
  error_message TEXT,
  refunded_at TIMESTAMPTZ,
  refund_amount_centimes INTEGER,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE payment_transactions ENABLE ROW LEVEL SECURITY;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_payment_transactions_user
  ON payment_transactions(user_id);

CREATE INDEX IF NOT EXISTS idx_payment_transactions_document
  ON payment_transactions(document_id);

CREATE INDEX IF NOT EXISTS idx_payment_transactions_provider_id
  ON payment_transactions(provider_transaction_id)
  WHERE provider_transaction_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_payment_transactions_statut
  ON payment_transactions(statut);

CREATE INDEX IF NOT EXISTS idx_payment_transactions_created
  ON payment_transactions(created_at DESC);

-- Owner policy
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'payment_transactions' AND policyname = 'Users manage own payment_transactions') THEN
    CREATE POLICY "Users manage own payment_transactions" ON payment_transactions FOR ALL
      USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- ============================================================================
-- 4. RPC: get_payment_link_data
-- Public-facing: retrieves payment link + document + entreprise data
-- Used by the public payment page (/pay/:token)
-- ============================================================================

CREATE OR REPLACE FUNCTION get_payment_link_data(p_token TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_link RECORD;
  v_facture RECORD;
  v_client RECORD;
  v_entreprise RECORD;
  v_config RECORD;
BEGIN
  -- Find payment link by token
  SELECT * INTO v_link
  FROM payment_links
  WHERE token = p_token
    AND statut IN ('actif', 'paye');

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Lien de paiement invalide ou expire');
  END IF;

  -- Check expiration
  IF v_link.expires_at IS NOT NULL AND v_link.expires_at < NOW() THEN
    -- Mark as expired
    UPDATE payment_links SET statut = 'expire' WHERE id = v_link.id;
    RETURN jsonb_build_object('error', 'Ce lien de paiement a expire');
  END IF;

  -- Get document
  SELECT id, numero, type, date, objet, total_ht, total_tva, total_ttc,
         statut, payment_status, lignes, user_id, date_echeance
  INTO v_facture
  FROM devis
  WHERE id = v_link.document_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Document non trouve');
  END IF;

  -- Get client
  IF v_link.client_id IS NOT NULL THEN
    SELECT id, nom, prenom, email, telephone, adresse
    INTO v_client
    FROM clients
    WHERE id = v_link.client_id;
  END IF;

  -- Get entreprise
  SELECT nom, adresse, telephone, email, siret, logo_url, tel,
         iban, bic, settings_json
  INTO v_entreprise
  FROM entreprise
  WHERE user_id = v_link.user_id;

  -- Get payment config
  SELECT stripe_enabled, stripe_account_id, stripe_connect_status,
         stripe_livemode, absorb_fees, commission_model,
         gocardless_enabled, gocardless_environment
  INTO v_config
  FROM stripe_config
  WHERE user_id = v_link.user_id;

  RETURN jsonb_build_object(
    'link', jsonb_build_object(
      'id', v_link.id,
      'token', v_link.token,
      'montant_centimes', v_link.montant_centimes,
      'montant_ttc', v_link.montant_ttc,
      'devise', v_link.devise,
      'statut', v_link.statut,
      'absorb_fees', v_link.absorb_fees,
      'stripe_enabled', v_link.stripe_enabled,
      'gocardless_enabled', v_link.gocardless_enabled,
      'paid_at', v_link.paid_at,
      'expires_at', v_link.expires_at
    ),
    'facture', jsonb_build_object(
      'id', v_facture.id,
      'numero', v_facture.numero,
      'type', v_facture.type,
      'date', v_facture.date,
      'objet', v_facture.objet,
      'total_ht', v_facture.total_ht,
      'total_tva', v_facture.total_tva,
      'total_ttc', v_facture.total_ttc,
      'statut', v_facture.statut,
      'payment_status', v_facture.payment_status,
      'lignes', v_facture.lignes,
      'user_id', v_facture.user_id,
      'date_echeance', v_facture.date_echeance
    ),
    'client', CASE WHEN v_client IS NOT NULL THEN jsonb_build_object(
      'nom', v_client.nom,
      'prenom', v_client.prenom,
      'email', v_client.email,
      'telephone', v_client.telephone
    ) ELSE '{}'::jsonb END,
    'entreprise', CASE WHEN v_entreprise IS NOT NULL THEN jsonb_build_object(
      'nom', v_entreprise.nom,
      'adresse', v_entreprise.adresse,
      'telephone', COALESCE(v_entreprise.telephone, v_entreprise.tel),
      'email', v_entreprise.email,
      'siret', v_entreprise.siret,
      'logo_url', v_entreprise.logo_url,
      'iban', v_entreprise.iban,
      'bic', v_entreprise.bic
    ) ELSE '{}'::jsonb END,
    'config', CASE WHEN v_config IS NOT NULL THEN jsonb_build_object(
      'stripe_enabled', COALESCE(v_config.stripe_enabled, false),
      'stripe_connected', COALESCE(v_config.stripe_connect_status = 'connected', false),
      'stripe_livemode', COALESCE(v_config.stripe_livemode, false),
      'absorb_fees', COALESCE(v_config.absorb_fees, true),
      'commission_model', COALESCE(v_config.commission_model, 'artisan'),
      'gocardless_enabled', COALESCE(v_config.gocardless_enabled, false),
      'gocardless_environment', COALESCE(v_config.gocardless_environment, 'sandbox')
    ) ELSE jsonb_build_object(
      'stripe_enabled', false,
      'stripe_connected', false,
      'stripe_livemode', false,
      'absorb_fees', true,
      'commission_model', 'artisan',
      'gocardless_enabled', false,
      'gocardless_environment', 'sandbox'
    ) END
  );
END;
$$;

-- Grant execute to anon role (public payment page needs this)
GRANT EXECUTE ON FUNCTION get_payment_link_data(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION get_payment_link_data(TEXT) TO authenticated;

-- ============================================================================
-- 5. RPC: store_gocardless_token
-- Stores GoCardless access token securely in Supabase Vault
-- ============================================================================

CREATE OR REPLACE FUNCTION store_gocardless_token(
  p_access_token TEXT,
  p_creditor_id TEXT DEFAULT NULL,
  p_environment TEXT DEFAULT 'sandbox'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_vault_id UUID;
  v_existing RECORD;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  -- Check for existing config
  SELECT * INTO v_existing FROM stripe_config WHERE user_id = v_user_id;

  -- Delete old vault secret if replacing
  IF v_existing IS NOT NULL AND v_existing.gocardless_access_token_vault_id IS NOT NULL THEN
    BEGIN
      PERFORM vault.delete_secret(v_existing.gocardless_access_token_vault_id);
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
  END IF;

  -- Store access token in vault
  v_vault_id := vault.create_secret(
    p_access_token,
    'gocardless_token_' || v_user_id::text,
    'GoCardless access token for user ' || v_user_id::text
  );

  -- Upsert config
  INSERT INTO stripe_config (user_id, gocardless_enabled, gocardless_access_token_vault_id,
    gocardless_creditor_id, gocardless_environment)
  VALUES (v_user_id, TRUE, v_vault_id, p_creditor_id, p_environment)
  ON CONFLICT (user_id) DO UPDATE SET
    gocardless_enabled = TRUE,
    gocardless_access_token_vault_id = v_vault_id,
    gocardless_creditor_id = COALESCE(p_creditor_id, stripe_config.gocardless_creditor_id),
    gocardless_environment = p_environment,
    updated_at = NOW();

  RETURN jsonb_build_object('success', true);
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- ============================================================================
-- 6. RPC: get_gocardless_token_for_user
-- Reads the GoCardless access token from Vault for a given user.
-- SECURITY DEFINER — only callable by service_role (Edge Functions).
-- ============================================================================

CREATE OR REPLACE FUNCTION get_gocardless_token_for_user(p_user_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_vault_id UUID;
  v_secret TEXT;
BEGIN
  SELECT gocardless_access_token_vault_id INTO v_vault_id
  FROM stripe_config
  WHERE user_id = p_user_id AND gocardless_enabled = TRUE;

  IF v_vault_id IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT decrypted_secret INTO v_secret
  FROM vault.decrypted_secrets
  WHERE id = v_vault_id;

  RETURN v_secret;
END;
$$;

-- Only service_role should call this
REVOKE EXECUTE ON FUNCTION get_gocardless_token_for_user(UUID) FROM anon;
REVOKE EXECUTE ON FUNCTION get_gocardless_token_for_user(UUID) FROM authenticated;

-- ============================================================================
-- 7. RPC: update_stripe_connect_status
-- Updates Stripe Connect status and account ID
-- ============================================================================

CREATE OR REPLACE FUNCTION update_stripe_connect_status(
  p_stripe_account_id TEXT,
  p_connect_status TEXT DEFAULT 'connected',
  p_livemode BOOLEAN DEFAULT FALSE
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

  INSERT INTO stripe_config (user_id, stripe_enabled, stripe_account_id,
    stripe_connect_status, stripe_livemode)
  VALUES (v_user_id, TRUE, p_stripe_account_id, p_connect_status, p_livemode)
  ON CONFLICT (user_id) DO UPDATE SET
    stripe_enabled = TRUE,
    stripe_account_id = p_stripe_account_id,
    stripe_connect_status = p_connect_status,
    stripe_livemode = p_livemode,
    updated_at = NOW();
END;
$$;

-- ============================================================================
-- DONE
-- ============================================================================
