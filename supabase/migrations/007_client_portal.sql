-- ============================================================================
-- Migration: 007_client_portal.sql
-- Description: Add portal access token for client portal
-- ============================================================================

-- Add portal_access_token to clients
ALTER TABLE clients
ADD COLUMN IF NOT EXISTS portal_access_token UUID DEFAULT gen_random_uuid() UNIQUE;

-- Generate tokens for existing clients
UPDATE clients
SET portal_access_token = gen_random_uuid()
WHERE portal_access_token IS NULL;

-- Index for fast token lookup
CREATE INDEX IF NOT EXISTS idx_clients_portal_token
ON clients(portal_access_token);

-- Portal access logs table
CREATE TABLE IF NOT EXISTS portal_access_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  accessed_at TIMESTAMPTZ DEFAULT now(),
  ip_address TEXT,
  user_agent TEXT,
  action TEXT DEFAULT 'view'
);

CREATE INDEX IF NOT EXISTS idx_portal_access_logs_client
ON portal_access_logs(client_id, accessed_at DESC);

-- RLS for portal access logs
ALTER TABLE portal_access_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage portal logs"
  ON portal_access_logs
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Function to get client by portal token (for anonymous access)
CREATE OR REPLACE FUNCTION get_client_by_portal_token(p_token UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'id', c.id,
    'nom', c.nom,
    'email', c.email,
    'telephone', c.telephone,
    'adresse', c.adresse,
    'ville', c.ville,
    'code_postal', c.code_postal,
    'devis', (
      SELECT COALESCE(json_agg(
        json_build_object(
          'id', d.id,
          'numero', d.numero,
          'description', d.description,
          'montant_ht', d.montant_ht,
          'montant_tva', d.montant_tva,
          'total_ttc', d.total_ttc,
          'statut', d.statut,
          'type', d.type,
          'created_at', d.created_at,
          'valid_until', d.valid_until
        ) ORDER BY d.created_at DESC
      ), '[]'::json)
      FROM devis d
      WHERE d.client_id = c.id
    ),
    'chantiers', (
      SELECT COALESCE(json_agg(
        json_build_object(
          'id', ch.id,
          'nom', ch.nom,
          'description', ch.description,
          'adresse', ch.adresse,
          'statut', ch.statut,
          'date_debut', ch.date_debut,
          'date_fin', ch.date_fin,
          'progression', ch.progression,
          'last_photo_at', ch.last_photo_at,
          'photos', (
            SELECT COALESCE(json_agg(
              json_build_object(
                'id', p.id,
                'url', p.url,
                'thumbnail_url', p.thumbnail_url,
                'description', p.description,
                'created_at', p.created_at
              ) ORDER BY p.created_at DESC
            ), '[]'::json)
            FROM chantier_photos p
            WHERE p.chantier_id = ch.id
          )
        ) ORDER BY ch.date_debut DESC NULLS LAST
      ), '[]'::json)
      FROM chantiers ch
      WHERE ch.client_id = c.id
    )
  ) INTO result
  FROM clients c
  WHERE c.portal_access_token = p_token;

  RETURN result;
END;
$$;

-- Function to accept devis from portal
CREATE OR REPLACE FUNCTION portal_accept_devis(p_token UUID, p_devis_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_client_id UUID;
  v_devis_client_id UUID;
BEGIN
  -- Get client ID from token
  SELECT id INTO v_client_id
  FROM clients
  WHERE portal_access_token = p_token;

  IF v_client_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Invalid token');
  END IF;

  -- Verify devis belongs to this client
  SELECT client_id INTO v_devis_client_id
  FROM devis
  WHERE id = p_devis_id;

  IF v_devis_client_id != v_client_id THEN
    RETURN json_build_object('success', false, 'error', 'Unauthorized');
  END IF;

  -- Update devis status
  UPDATE devis
  SET statut = 'accepte', updated_at = now()
  WHERE id = p_devis_id AND statut = 'envoye';

  RETURN json_build_object('success', true);
END;
$$;

-- Function to refuse devis from portal
CREATE OR REPLACE FUNCTION portal_refuse_devis(p_token UUID, p_devis_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_client_id UUID;
  v_devis_client_id UUID;
BEGIN
  SELECT id INTO v_client_id
  FROM clients
  WHERE portal_access_token = p_token;

  IF v_client_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Invalid token');
  END IF;

  SELECT client_id INTO v_devis_client_id
  FROM devis
  WHERE id = p_devis_id;

  IF v_devis_client_id != v_client_id THEN
    RETURN json_build_object('success', false, 'error', 'Unauthorized');
  END IF;

  UPDATE devis
  SET statut = 'refuse', updated_at = now()
  WHERE id = p_devis_id AND statut = 'envoye';

  RETURN json_build_object('success', true);
END;
$$;

-- Add progression column to chantiers if not exists
ALTER TABLE chantiers
ADD COLUMN IF NOT EXISTS progression INTEGER DEFAULT 0 CHECK (progression >= 0 AND progression <= 100);

-- Grant execute to anon for portal functions
GRANT EXECUTE ON FUNCTION get_client_by_portal_token TO anon;
GRANT EXECUTE ON FUNCTION portal_accept_devis TO anon;
GRANT EXECUTE ON FUNCTION portal_refuse_devis TO anon;
