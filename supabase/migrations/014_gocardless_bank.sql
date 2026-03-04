-- ============================================================================
-- Migration 014: GoCardless Bank Account Data Integration
-- Adds bank connection, transactions, and reconciliation support
-- ============================================================================

-- ============================================================================
-- 1. GoCardless config table (per artisan, same pattern as stripe_config)
-- ============================================================================

CREATE TABLE IF NOT EXISTS gocardless_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  enabled BOOLEAN DEFAULT FALSE,
  -- Vault references for API credentials
  secret_id_vault_id UUID,
  secret_key_vault_id UUID,
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE gocardless_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own gocardless config" ON gocardless_config
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ============================================================================
-- 2. Bank connections table (one row per connected bank account)
-- ============================================================================

CREATE TABLE IF NOT EXISTS bank_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  institution_id TEXT NOT NULL,
  institution_name TEXT,
  institution_logo TEXT,
  requisition_id TEXT UNIQUE,
  requisition_status TEXT DEFAULT 'pending'
    CHECK (requisition_status IN ('pending', 'linked', 'expired', 'revoked', 'rejected', 'suspended')),
  account_id TEXT,
  iban TEXT,
  owner_name TEXT,
  currency TEXT DEFAULT 'EUR',
  last_balance NUMERIC(12,2),
  last_balance_at TIMESTAMPTZ,
  last_sync_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ, -- 90-day access expiry
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE bank_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own bank connections" ON bank_connections
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_bank_connections_user ON bank_connections(user_id);
CREATE INDEX IF NOT EXISTS idx_bank_connections_requisition ON bank_connections(requisition_id)
  WHERE requisition_id IS NOT NULL;

-- ============================================================================
-- 3. Bank transactions table
-- ============================================================================

CREATE TABLE IF NOT EXISTS bank_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  bank_connection_id UUID REFERENCES bank_connections(id) ON DELETE CASCADE NOT NULL,
  transaction_id TEXT NOT NULL,
  booking_date DATE,
  value_date DATE,
  amount NUMERIC(12,2) NOT NULL,
  currency TEXT DEFAULT 'EUR',
  creditor_name TEXT,
  debtor_name TEXT,
  remittance_info TEXT,
  bank_reference TEXT,
  transaction_type TEXT CHECK (transaction_type IN ('credit', 'debit')),
  -- Reconciliation
  reconciled BOOLEAN DEFAULT FALSE,
  reconciled_entity_type TEXT CHECK (reconciled_entity_type IN ('facture', 'depense') OR reconciled_entity_type IS NULL),
  reconciled_entity_id UUID,
  reconciliation_confidence NUMERIC(3,2),
  reconciliation_method TEXT CHECK (reconciliation_method IN ('auto_amount', 'auto_reference', 'auto_client', 'manual') OR reconciliation_method IS NULL),
  -- Metadata
  raw_data JSONB, -- full GoCardless transaction object for debugging
  created_at TIMESTAMPTZ DEFAULT NOW(),
  -- Prevent duplicate imports
  UNIQUE(bank_connection_id, transaction_id)
);

ALTER TABLE bank_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own bank transactions" ON bank_transactions
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_bank_tx_user ON bank_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_bank_tx_connection ON bank_transactions(bank_connection_id);
CREATE INDEX IF NOT EXISTS idx_bank_tx_booking_date ON bank_transactions(booking_date);
CREATE INDEX IF NOT EXISTS idx_bank_tx_amount ON bank_transactions(amount);
CREATE INDEX IF NOT EXISTS idx_bank_tx_reconciled ON bank_transactions(reconciled)
  WHERE reconciled = FALSE;

-- ============================================================================
-- 4. Store GoCardless API keys in Vault (SECURITY DEFINER, authenticated)
-- Same pattern as store_stripe_key from migration 012
-- ============================================================================

CREATE OR REPLACE FUNCTION store_gocardless_keys(
  p_secret_id TEXT,
  p_secret_key TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_secret_id_vault UUID;
  v_secret_key_vault UUID;
  v_existing RECORD;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Non authentifié');
  END IF;

  -- Validate inputs
  IF p_secret_id IS NULL OR length(p_secret_id) < 10 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Secret ID invalide');
  END IF;
  IF p_secret_key IS NULL OR length(p_secret_key) < 10 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Secret Key invalide');
  END IF;

  -- Check existing config and clean up old vault entries
  SELECT * INTO v_existing FROM gocardless_config WHERE user_id = v_user_id;
  IF v_existing IS NOT NULL THEN
    IF v_existing.secret_id_vault_id IS NOT NULL THEN
      DELETE FROM vault.secrets WHERE id = v_existing.secret_id_vault_id;
    END IF;
    IF v_existing.secret_key_vault_id IS NOT NULL THEN
      DELETE FROM vault.secrets WHERE id = v_existing.secret_key_vault_id;
    END IF;
  END IF;

  -- Store secret_id in Vault
  INSERT INTO vault.secrets (secret, name, description)
  VALUES (p_secret_id, 'gc_sid_' || v_user_id::text, 'GoCardless secret_id for user ' || v_user_id::text)
  RETURNING id INTO v_secret_id_vault;

  -- Store secret_key in Vault
  INSERT INTO vault.secrets (secret, name, description)
  VALUES (p_secret_key, 'gc_sk_' || v_user_id::text, 'GoCardless secret_key for user ' || v_user_id::text)
  RETURNING id INTO v_secret_key_vault;

  -- Upsert config
  INSERT INTO gocardless_config (user_id, secret_id_vault_id, secret_key_vault_id, enabled, updated_at)
  VALUES (v_user_id, v_secret_id_vault, v_secret_key_vault, TRUE, NOW())
  ON CONFLICT (user_id) DO UPDATE SET
    secret_id_vault_id = v_secret_id_vault,
    secret_key_vault_id = v_secret_key_vault,
    enabled = TRUE,
    updated_at = NOW();

  RETURN jsonb_build_object('success', true);
END;
$$;

GRANT EXECUTE ON FUNCTION store_gocardless_keys TO authenticated;

-- ============================================================================
-- 5. Get GoCardless config with decrypted keys (service_role only)
-- Used by Edge Functions to retrieve the user's GoCardless credentials
-- ============================================================================

CREATE OR REPLACE FUNCTION get_gocardless_config(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_config RECORD;
  v_secret_id TEXT;
  v_secret_key TEXT;
BEGIN
  SELECT * INTO v_config FROM gocardless_config WHERE user_id = p_user_id;

  IF v_config IS NULL THEN
    RETURN jsonb_build_object('enabled', false, 'error', 'No GoCardless config found');
  END IF;

  IF NOT v_config.enabled THEN
    RETURN jsonb_build_object('enabled', false);
  END IF;

  -- Decrypt from Vault
  IF v_config.secret_id_vault_id IS NOT NULL THEN
    SELECT decrypted_secret INTO v_secret_id
    FROM vault.decrypted_secrets
    WHERE id = v_config.secret_id_vault_id;
  END IF;

  IF v_config.secret_key_vault_id IS NOT NULL THEN
    SELECT decrypted_secret INTO v_secret_key
    FROM vault.decrypted_secrets
    WHERE id = v_config.secret_key_vault_id;
  END IF;

  RETURN jsonb_build_object(
    'enabled', v_config.enabled,
    'secret_id', v_secret_id,
    'secret_key', v_secret_key
  );
END;
$$;

-- Only service_role can call this
REVOKE ALL ON FUNCTION get_gocardless_config FROM PUBLIC;

-- ============================================================================
-- 6. Delete GoCardless config (authenticated)
-- ============================================================================

CREATE OR REPLACE FUNCTION delete_gocardless_config()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_existing RECORD;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Non authentifié');
  END IF;

  SELECT * INTO v_existing FROM gocardless_config WHERE user_id = v_user_id;
  IF v_existing IS NOT NULL THEN
    -- Clean vault entries
    IF v_existing.secret_id_vault_id IS NOT NULL THEN
      DELETE FROM vault.secrets WHERE id = v_existing.secret_id_vault_id;
    END IF;
    IF v_existing.secret_key_vault_id IS NOT NULL THEN
      DELETE FROM vault.secrets WHERE id = v_existing.secret_key_vault_id;
    END IF;
    -- Delete config
    DELETE FROM gocardless_config WHERE user_id = v_user_id;
    -- Delete all connections and their transactions (CASCADE)
    DELETE FROM bank_connections WHERE user_id = v_user_id;
  END IF;

  RETURN jsonb_build_object('success', true);
END;
$$;

GRANT EXECUTE ON FUNCTION delete_gocardless_config TO authenticated;
