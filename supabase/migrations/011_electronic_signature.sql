-- ============================================================================
-- Migration: 011_electronic_signature.sql
-- Description: Add electronic signature system for devis
-- - Signature token per devis (UUID, expirable)
-- - Signature data storage (base64, metadata)
-- - Public RPC functions for anonymous signature
-- - eIDAS compliant: date, IP, user-agent tracking
-- ============================================================================

-- 1. Update devis status constraint to include 'signe'
ALTER TABLE devis DROP CONSTRAINT IF EXISTS valid_devis_statut;
ALTER TABLE devis ADD CONSTRAINT valid_devis_statut
  CHECK (statut IN (
    'brouillon', 'envoye', 'accepte', 'refuse', 'annule',
    'acompte_facture', 'facture', 'payee', 'en_attente', 'signe'
  ));

-- 2. Add signature columns to devis table
ALTER TABLE devis ADD COLUMN IF NOT EXISTS signature_token UUID UNIQUE;
ALTER TABLE devis ADD COLUMN IF NOT EXISTS signature_expires_at TIMESTAMPTZ;
ALTER TABLE devis ADD COLUMN IF NOT EXISTS signature_data TEXT;
ALTER TABLE devis ADD COLUMN IF NOT EXISTS signature_date TIMESTAMPTZ;
ALTER TABLE devis ADD COLUMN IF NOT EXISTS signature_ip TEXT;
ALTER TABLE devis ADD COLUMN IF NOT EXISTS signature_user_agent TEXT;
ALTER TABLE devis ADD COLUMN IF NOT EXISTS signataire_nom TEXT;
ALTER TABLE devis ADD COLUMN IF NOT EXISTS signature_cgv_accepted BOOLEAN DEFAULT FALSE;

-- 3. Index for fast anonymous token lookup
CREATE INDEX IF NOT EXISTS idx_devis_signature_token
  ON devis(signature_token)
  WHERE signature_token IS NOT NULL;

-- 4. Function: Get devis data for public signature page
-- Returns already_signed flag for signed/converted devis instead of NULL
CREATE OR REPLACE FUNCTION get_devis_for_signature(p_token UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSON;
  v_devis RECORD;
BEGIN
  -- First, find the devis by token (without status/expiry filter)
  SELECT d.id, d.statut, d.signature_expires_at, d.signature_data,
         (d.signature_data IS NOT NULL) as already_signed
  INTO v_devis
  FROM devis d
  WHERE d.signature_token = p_token;

  -- Token not found at all
  IF v_devis IS NULL THEN
    RETURN NULL;
  END IF;

  -- Already signed → return minimal data with already_signed flag
  IF v_devis.already_signed THEN
    RETURN json_build_object('devis', json_build_object('already_signed', true));
  END IF;

  -- Token expired
  IF v_devis.signature_expires_at <= NOW() THEN
    RETURN NULL;
  END IF;

  -- Status not signable (converted to facture, etc.)
  IF v_devis.statut NOT IN ('envoye', 'en_attente', 'accepte') THEN
    RETURN json_build_object('devis', json_build_object('already_signed', true));
  END IF;

  -- Valid token → return full data
  SELECT json_build_object(
    'devis', json_build_object(
      'id', d.id,
      'numero', d.numero,
      'type', d.type,
      'statut', d.statut,
      'date', d.date,
      'date_validite', d.date_validite,
      'objet', d.objet,
      'lignes', d.lignes,
      'sections', d.sections,
      'conditions', d.conditions,
      'remise_globale', d.remise_globale,
      'tva_rate', d.tva_rate,
      'total_ht', d.total_ht,
      'total_tva', d.total_tva,
      'total_ttc', d.total_ttc,
      'acompte_percent', d.acompte_percent,
      'acompte_montant', d.acompte_montant,
      'already_signed', false
    ),
    'client', json_build_object(
      'nom', c.nom,
      'prenom', c.prenom,
      'email', c.email,
      'telephone', c.telephone,
      'adresse', c.adresse,
      'entreprise', c.entreprise
    ),
    'entreprise', json_build_object(
      'nom', e.nom,
      'siret', e.siret,
      'tva_intra', e.tva_intra,
      'adresse', e.adresse,
      'ville', e.ville,
      'code_postal', e.code_postal,
      'telephone', e.telephone,
      'email', e.email,
      'site_web', e.site_web,
      'logo', e.logo_url,
      'couleur', e.couleur_principale,
      'iban', e.iban,
      'bic', e.bic,
      'conditions_paiement', e.conditions_paiement,
      'mentions_legales', e.mentions_legales
    )
  ) INTO result
  FROM devis d
  LEFT JOIN clients c ON d.client_id = c.id
  LEFT JOIN entreprise e ON e.user_id = d.user_id
  WHERE d.id = v_devis.id;

  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION get_devis_for_signature TO anon;

-- 5. Function: Sign a devis (public, anonymous)
CREATE OR REPLACE FUNCTION sign_devis(
  p_token UUID,
  p_signature_data TEXT,
  p_signataire_nom TEXT,
  p_ip TEXT DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_devis_id UUID;
  v_client_id UUID;
BEGIN
  -- Validate token, expiration, status, and not already signed
  SELECT d.id, d.client_id INTO v_devis_id, v_client_id
  FROM devis d
  WHERE d.signature_token = p_token
    AND d.signature_expires_at > NOW()
    AND d.statut IN ('envoye', 'en_attente', 'accepte')
    AND d.signature_data IS NULL;

  IF v_devis_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Lien de signature invalide, expire ou devis deja signe');
  END IF;

  -- Save signature and update status
  UPDATE devis SET
    signature_data = p_signature_data,
    signature_date = NOW(),
    signature_ip = p_ip,
    signature_user_agent = p_user_agent,
    signataire_nom = p_signataire_nom,
    signature_cgv_accepted = true,
    statut = 'signe',
    updated_at = NOW()
  WHERE id = v_devis_id;

  -- Log signature in portal access logs
  INSERT INTO portal_access_logs (client_id, action, ip_address, user_agent)
  VALUES (v_client_id, 'signature', p_ip, p_user_agent);

  RETURN json_build_object('success', true, 'devis_id', v_devis_id);
END;
$$;

GRANT EXECUTE ON FUNCTION sign_devis TO anon;

-- 6. Function: Generate signature token (authenticated, artisan only)
CREATE OR REPLACE FUNCTION generate_signature_token(
  p_devis_id UUID,
  p_expiry_days INTEGER DEFAULT 30
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_token UUID;
BEGIN
  -- Verify the devis belongs to the current user
  IF NOT EXISTS (
    SELECT 1 FROM devis WHERE id = p_devis_id AND user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Devis non trouve ou non autorise';
  END IF;

  -- Generate unique token and set expiration
  v_token := gen_random_uuid();

  UPDATE devis SET
    signature_token = v_token,
    signature_expires_at = NOW() + (p_expiry_days || ' days')::INTERVAL,
    updated_at = NOW()
  WHERE id = p_devis_id;

  RETURN v_token;
END;
$$;

GRANT EXECUTE ON FUNCTION generate_signature_token TO authenticated;
