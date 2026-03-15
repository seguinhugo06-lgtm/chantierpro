-- ============================================================================
-- Migration 050: Integrations Hub
-- Generic integration infrastructure for third-party services
-- Tables: integrations, integration_sync_logs, integration_entity_map, webhooks
-- Following patterns from migration 014 (GoCardless)
-- ============================================================================

-- ============================================================================
-- 1. Integrations table — one row per provider connection per user
-- ============================================================================

CREATE TABLE IF NOT EXISTS integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,

  -- Provider identification
  provider TEXT NOT NULL,          -- 'pennylane', 'google_calendar', 'yousign', etc.
  category TEXT NOT NULL,          -- 'accounting', 'calendar', 'banking', 'signature', 'storage', 'automation', 'communication'

  -- Connection state
  status TEXT DEFAULT 'disconnected'
    CHECK (status IN ('disconnected', 'connecting', 'connected', 'error', 'expired')),

  -- Vault references (NEVER store tokens in plaintext)
  access_token_vault_id UUID,
  refresh_token_vault_id UUID,
  api_key_vault_id UUID,

  -- OAuth metadata
  oauth_state TEXT,
  token_expires_at TIMESTAMPTZ,
  scopes TEXT[],

  -- Provider-specific config (non-sensitive data only)
  config JSONB DEFAULT '{}',
  provider_account_id TEXT,
  provider_account_name TEXT,

  -- Sync state
  last_sync_at TIMESTAMPTZ,
  last_sync_status TEXT CHECK (last_sync_status IN ('success', 'partial', 'error') OR last_sync_status IS NULL),
  last_sync_error TEXT,
  sync_enabled BOOLEAN DEFAULT TRUE,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- One connection per provider per user
  UNIQUE(user_id, provider)
);

ALTER TABLE integrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "integrations_user_or_org" ON integrations
  FOR ALL TO authenticated
  USING (
    user_id = auth.uid()
    OR organization_id IN (SELECT user_org_ids())
  )
  WITH CHECK (
    user_id = auth.uid()
    OR organization_id IN (SELECT user_org_ids())
  );

CREATE INDEX IF NOT EXISTS idx_integrations_user ON integrations(user_id);
CREATE INDEX IF NOT EXISTS idx_integrations_user_category ON integrations(user_id, category);
CREATE INDEX IF NOT EXISTS idx_integrations_provider_status ON integrations(provider, status);

-- ============================================================================
-- 2. Integration sync logs — audit trail of sync operations
-- ============================================================================

CREATE TABLE IF NOT EXISTS integration_sync_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  integration_id UUID REFERENCES integrations(id) ON DELETE CASCADE NOT NULL,

  -- Sync details
  direction TEXT CHECK (direction IN ('push', 'pull', 'bidirectional')) NOT NULL,
  entity_type TEXT NOT NULL,  -- 'facture', 'devis', 'event', 'transaction', 'document'

  -- Results
  status TEXT CHECK (status IN ('started', 'success', 'partial', 'error')) NOT NULL,
  items_synced INTEGER DEFAULT 0,
  items_failed INTEGER DEFAULT 0,
  error_message TEXT,
  details JSONB DEFAULT '{}',

  -- Timing
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  duration_ms INTEGER,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE integration_sync_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sync_logs_user" ON integration_sync_logs
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_sync_logs_integration ON integration_sync_logs(integration_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sync_logs_user ON integration_sync_logs(user_id);

-- ============================================================================
-- 3. Integration entity map — maps local entities to remote entities
-- Prevents duplicate syncs and enables bidirectional updates
-- ============================================================================

CREATE TABLE IF NOT EXISTS integration_entity_map (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  integration_id UUID REFERENCES integrations(id) ON DELETE CASCADE NOT NULL,

  -- Local entity reference
  local_entity_type TEXT NOT NULL,  -- 'devis', 'facture', 'event', 'chantier'
  local_entity_id UUID NOT NULL,

  -- Remote entity reference
  remote_entity_id TEXT NOT NULL,   -- Provider's ID (string, some use non-UUID IDs)
  remote_entity_type TEXT,          -- Provider-specific type name
  remote_entity_url TEXT,           -- Direct link in provider's UI

  -- Sync metadata
  last_synced_at TIMESTAMPTZ DEFAULT NOW(),
  sync_hash TEXT,  -- Hash of last synced data for change detection

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Prevent duplicate mappings
  UNIQUE(integration_id, local_entity_type, local_entity_id),
  UNIQUE(integration_id, remote_entity_id)
);

ALTER TABLE integration_entity_map ENABLE ROW LEVEL SECURITY;

CREATE POLICY "entity_map_user" ON integration_entity_map
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_entity_map_integration ON integration_entity_map(integration_id);
CREATE INDEX IF NOT EXISTS idx_entity_map_local ON integration_entity_map(integration_id, local_entity_type, local_entity_id);

-- ============================================================================
-- 4. Webhooks table — outgoing webhook endpoints
-- ============================================================================

CREATE TABLE IF NOT EXISTS webhooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,

  -- Config
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  hmac_secret TEXT NOT NULL,

  -- Event subscriptions
  events TEXT[] NOT NULL DEFAULT '{}',
  -- Supported events:
  -- 'devis.created', 'devis.sent', 'devis.signed', 'devis.accepted', 'devis.refused'
  -- 'facture.created', 'facture.sent', 'facture.paid'
  -- 'chantier.created', 'chantier.started', 'chantier.completed'
  -- 'payment.received', 'client.created'

  -- State
  enabled BOOLEAN DEFAULT TRUE,
  last_triggered_at TIMESTAMPTZ,
  last_status INTEGER,  -- HTTP status code
  failure_count INTEGER DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE webhooks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "webhooks_user_or_org" ON webhooks
  FOR ALL TO authenticated
  USING (
    user_id = auth.uid()
    OR organization_id IN (SELECT user_org_ids())
  )
  WITH CHECK (
    user_id = auth.uid()
    OR organization_id IN (SELECT user_org_ids())
  );

CREATE INDEX IF NOT EXISTS idx_webhooks_user ON webhooks(user_id);
CREATE INDEX IF NOT EXISTS idx_webhooks_enabled ON webhooks(enabled) WHERE enabled = TRUE;

-- ============================================================================
-- 5. Updated_at triggers
-- ============================================================================

CREATE OR REPLACE FUNCTION update_integrations_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_integrations_updated_at
  BEFORE UPDATE ON integrations
  FOR EACH ROW EXECUTE FUNCTION update_integrations_updated_at();

CREATE TRIGGER trg_entity_map_updated_at
  BEFORE UPDATE ON integration_entity_map
  FOR EACH ROW EXECUTE FUNCTION update_integrations_updated_at();

CREATE TRIGGER trg_webhooks_updated_at
  BEFORE UPDATE ON webhooks
  FOR EACH ROW EXECUTE FUNCTION update_integrations_updated_at();

-- ============================================================================
-- 6. Vault functions — Store and retrieve integration credentials securely
-- Following the exact pattern from store_gocardless_keys (migration 014)
-- ============================================================================

-- Store integration credentials in Vault (authenticated users)
CREATE OR REPLACE FUNCTION store_integration_credentials(
  p_provider TEXT,
  p_access_token TEXT DEFAULT NULL,
  p_refresh_token TEXT DEFAULT NULL,
  p_api_key TEXT DEFAULT NULL,
  p_token_expires_at TIMESTAMPTZ DEFAULT NULL,
  p_scopes TEXT[] DEFAULT NULL,
  p_provider_account_id TEXT DEFAULT NULL,
  p_provider_account_name TEXT DEFAULT NULL,
  p_config JSONB DEFAULT '{}'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_access_vault UUID;
  v_refresh_vault UUID;
  v_api_key_vault UUID;
  v_existing RECORD;
  v_org_id UUID;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Non authentifié');
  END IF;

  IF p_provider IS NULL OR length(p_provider) < 2 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Provider invalide');
  END IF;

  -- Get user's org_id
  SELECT organization_id INTO v_org_id
  FROM organization_members WHERE user_id = v_user_id LIMIT 1;

  -- Clean up old vault entries if existing
  SELECT * INTO v_existing FROM integrations WHERE user_id = v_user_id AND provider = p_provider;
  IF v_existing IS NOT NULL THEN
    IF v_existing.access_token_vault_id IS NOT NULL THEN
      DELETE FROM vault.secrets WHERE id = v_existing.access_token_vault_id;
    END IF;
    IF v_existing.refresh_token_vault_id IS NOT NULL THEN
      DELETE FROM vault.secrets WHERE id = v_existing.refresh_token_vault_id;
    END IF;
    IF v_existing.api_key_vault_id IS NOT NULL THEN
      DELETE FROM vault.secrets WHERE id = v_existing.api_key_vault_id;
    END IF;
  END IF;

  -- Store access_token in Vault
  IF p_access_token IS NOT NULL THEN
    INSERT INTO vault.secrets (secret, name, description)
    VALUES (p_access_token, 'int_at_' || p_provider || '_' || v_user_id::text,
            p_provider || ' access_token for user ' || v_user_id::text)
    RETURNING id INTO v_access_vault;
  END IF;

  -- Store refresh_token in Vault
  IF p_refresh_token IS NOT NULL THEN
    INSERT INTO vault.secrets (secret, name, description)
    VALUES (p_refresh_token, 'int_rt_' || p_provider || '_' || v_user_id::text,
            p_provider || ' refresh_token for user ' || v_user_id::text)
    RETURNING id INTO v_refresh_vault;
  END IF;

  -- Store api_key in Vault
  IF p_api_key IS NOT NULL THEN
    INSERT INTO vault.secrets (secret, name, description)
    VALUES (p_api_key, 'int_ak_' || p_provider || '_' || v_user_id::text,
            p_provider || ' api_key for user ' || v_user_id::text)
    RETURNING id INTO v_api_key_vault;
  END IF;

  -- Determine category from provider
  -- (This could be a lookup table but for simplicity we use a CASE)

  -- Upsert integration
  INSERT INTO integrations (
    user_id, organization_id, provider, category, status,
    access_token_vault_id, refresh_token_vault_id, api_key_vault_id,
    token_expires_at, scopes,
    provider_account_id, provider_account_name, config,
    updated_at
  )
  VALUES (
    v_user_id, v_org_id, p_provider,
    CASE
      WHEN p_provider IN ('pennylane', 'indy', 'tiime') THEN 'accounting'
      WHEN p_provider IN ('google_calendar', 'outlook_calendar', 'ical') THEN 'calendar'
      WHEN p_provider IN ('qonto', 'shine', 'bridge') THEN 'banking'
      WHEN p_provider IN ('yousign', 'docusign') THEN 'signature'
      WHEN p_provider IN ('google_drive', 'dropbox') THEN 'storage'
      WHEN p_provider IN ('webhooks', 'zapier', 'make') THEN 'automation'
      WHEN p_provider IN ('whatsapp') THEN 'communication'
      ELSE 'other'
    END,
    'connected',
    v_access_vault, v_refresh_vault, v_api_key_vault,
    p_token_expires_at, p_scopes,
    p_provider_account_id, p_provider_account_name, p_config,
    NOW()
  )
  ON CONFLICT (user_id, provider) DO UPDATE SET
    status = 'connected',
    access_token_vault_id = COALESCE(v_access_vault, integrations.access_token_vault_id),
    refresh_token_vault_id = COALESCE(v_refresh_vault, integrations.refresh_token_vault_id),
    api_key_vault_id = COALESCE(v_api_key_vault, integrations.api_key_vault_id),
    token_expires_at = COALESCE(p_token_expires_at, integrations.token_expires_at),
    scopes = COALESCE(p_scopes, integrations.scopes),
    provider_account_id = COALESCE(p_provider_account_id, integrations.provider_account_id),
    provider_account_name = COALESCE(p_provider_account_name, integrations.provider_account_name),
    config = COALESCE(p_config, integrations.config),
    updated_at = NOW();

  RETURN jsonb_build_object('success', true);
END;
$$;

GRANT EXECUTE ON FUNCTION store_integration_credentials TO authenticated;

-- ============================================================================
-- 7. Get integration credentials (service_role only, for Edge Functions)
-- ============================================================================

CREATE OR REPLACE FUNCTION get_integration_credentials(p_user_id UUID, p_provider TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_integration RECORD;
  v_access_token TEXT;
  v_refresh_token TEXT;
  v_api_key TEXT;
BEGIN
  SELECT * INTO v_integration FROM integrations
  WHERE user_id = p_user_id AND provider = p_provider;

  IF v_integration IS NULL THEN
    RETURN jsonb_build_object('found', false, 'error', 'Integration not found');
  END IF;

  IF v_integration.status = 'disconnected' THEN
    RETURN jsonb_build_object('found', true, 'status', 'disconnected');
  END IF;

  -- Decrypt from Vault
  IF v_integration.access_token_vault_id IS NOT NULL THEN
    SELECT decrypted_secret INTO v_access_token
    FROM vault.decrypted_secrets
    WHERE id = v_integration.access_token_vault_id;
  END IF;

  IF v_integration.refresh_token_vault_id IS NOT NULL THEN
    SELECT decrypted_secret INTO v_refresh_token
    FROM vault.decrypted_secrets
    WHERE id = v_integration.refresh_token_vault_id;
  END IF;

  IF v_integration.api_key_vault_id IS NOT NULL THEN
    SELECT decrypted_secret INTO v_api_key
    FROM vault.decrypted_secrets
    WHERE id = v_integration.api_key_vault_id;
  END IF;

  RETURN jsonb_build_object(
    'found', true,
    'status', v_integration.status,
    'access_token', v_access_token,
    'refresh_token', v_refresh_token,
    'api_key', v_api_key,
    'token_expires_at', v_integration.token_expires_at,
    'scopes', v_integration.scopes,
    'config', v_integration.config,
    'provider_account_id', v_integration.provider_account_id,
    'provider_account_name', v_integration.provider_account_name
  );
END;
$$;

-- Only service_role can call this (Edge Functions)
REVOKE ALL ON FUNCTION get_integration_credentials FROM PUBLIC;

-- ============================================================================
-- 8. Disconnect integration (authenticated users)
-- ============================================================================

CREATE OR REPLACE FUNCTION disconnect_integration(p_provider TEXT)
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

  SELECT * INTO v_existing FROM integrations WHERE user_id = v_user_id AND provider = p_provider;
  IF v_existing IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Integration non trouvée');
  END IF;

  -- Clean vault entries
  IF v_existing.access_token_vault_id IS NOT NULL THEN
    DELETE FROM vault.secrets WHERE id = v_existing.access_token_vault_id;
  END IF;
  IF v_existing.refresh_token_vault_id IS NOT NULL THEN
    DELETE FROM vault.secrets WHERE id = v_existing.refresh_token_vault_id;
  END IF;
  IF v_existing.api_key_vault_id IS NOT NULL THEN
    DELETE FROM vault.secrets WHERE id = v_existing.api_key_vault_id;
  END IF;

  -- Update status to disconnected
  UPDATE integrations SET
    status = 'disconnected',
    access_token_vault_id = NULL,
    refresh_token_vault_id = NULL,
    api_key_vault_id = NULL,
    oauth_state = NULL,
    token_expires_at = NULL,
    scopes = NULL,
    provider_account_id = NULL,
    provider_account_name = NULL,
    sync_enabled = FALSE,
    updated_at = NOW()
  WHERE user_id = v_user_id AND provider = p_provider;

  -- Clean entity mappings
  DELETE FROM integration_entity_map
  WHERE integration_id = v_existing.id;

  RETURN jsonb_build_object('success', true);
END;
$$;

GRANT EXECUTE ON FUNCTION disconnect_integration TO authenticated;
