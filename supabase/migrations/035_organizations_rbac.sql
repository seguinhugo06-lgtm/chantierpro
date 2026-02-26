-- ============================================================================
-- MIGRATION 035: Organizations & RBAC Foundation
-- BACKWARD COMPATIBLE: No existing data or code affected
-- ============================================================================

-- 1. Create role enum type
DO $$ BEGIN
  CREATE TYPE org_role AS ENUM (
    'owner', 'admin', 'comptable', 'chef_chantier', 'ouvrier', 'readonly'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 2. Create invitation status enum
DO $$ BEGIN
  CREATE TYPE invitation_status AS ENUM (
    'pending', 'accepted', 'expired', 'revoked'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================================
-- 3. Organizations table
-- ============================================================================
CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  owner_id UUID REFERENCES auth.users(id) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_organizations_owner ON organizations(owner_id);
CREATE INDEX IF NOT EXISTS idx_organizations_slug ON organizations(slug);

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

-- Org members can view their org
CREATE POLICY "Org members can view org"
  ON organizations FOR SELECT TO authenticated
  USING (
    id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
    )
    OR owner_id = auth.uid()
  );

-- Owner can update org
CREATE POLICY "Owner can update org"
  ON organizations FOR UPDATE TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

-- Authenticated can create org (for signup flow)
CREATE POLICY "Authenticated can insert org"
  ON organizations FOR INSERT TO authenticated
  WITH CHECK (owner_id = auth.uid());

-- ============================================================================
-- 4. Organization members table
-- ============================================================================
CREATE TABLE IF NOT EXISTS organization_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role org_role NOT NULL DEFAULT 'readonly',
  invited_by UUID REFERENCES auth.users(id),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  equipe_member_id UUID, -- Links auth user to their equipe HR record (for worker assignment)
  UNIQUE(organization_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_org_members_org ON organization_members(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_members_user ON organization_members(user_id);
CREATE INDEX IF NOT EXISTS idx_org_members_role ON organization_members(role);

ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;

-- Members can view co-members
CREATE POLICY "Members can view co-members"
  ON organization_members FOR SELECT TO authenticated
  USING (
    organization_id IN (
      SELECT om.organization_id FROM organization_members om
      WHERE om.user_id = auth.uid()
    )
  );

-- Admins+ can insert members
CREATE POLICY "Admins can insert members"
  ON organization_members FOR INSERT TO authenticated
  WITH CHECK (
    -- Allow self-insert (for org creation flow where member table is empty)
    user_id = auth.uid()
    OR
    EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.organization_id = organization_members.organization_id
        AND om.user_id = auth.uid()
        AND om.role IN ('owner', 'admin')
    )
  );

-- Admins+ can update members (change roles)
CREATE POLICY "Admins can update members"
  ON organization_members FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.organization_id = organization_members.organization_id
        AND om.user_id = auth.uid()
        AND om.role IN ('owner', 'admin')
    )
  );

-- Admins+ can remove members
CREATE POLICY "Admins can delete members"
  ON organization_members FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.organization_id = organization_members.organization_id
        AND om.user_id = auth.uid()
        AND om.role IN ('owner', 'admin')
    )
  );

-- ============================================================================
-- 5. Invitations table
-- ============================================================================
CREATE TABLE IF NOT EXISTS invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  email TEXT,
  phone TEXT,
  role org_role NOT NULL DEFAULT 'ouvrier',
  token UUID DEFAULT gen_random_uuid() UNIQUE NOT NULL,
  status invitation_status DEFAULT 'pending',
  invited_by UUID REFERENCES auth.users(id) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days'),
  accepted_at TIMESTAMPTZ,
  CONSTRAINT has_contact CHECK (email IS NOT NULL OR phone IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_invitations_token ON invitations(token);
CREATE INDEX IF NOT EXISTS idx_invitations_org ON invitations(organization_id);
CREATE INDEX IF NOT EXISTS idx_invitations_email ON invitations(email) WHERE email IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_invitations_status ON invitations(status);

ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;

-- Org admins can manage invitations
CREATE POLICY "Org admins can manage invitations"
  ON invitations FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.organization_id = invitations.organization_id
        AND om.user_id = auth.uid()
        AND om.role IN ('owner', 'admin')
    )
  );

-- Public read for token-based lookup (for accepting invites)
CREATE POLICY "Anyone can read pending invitations by token"
  ON invitations FOR SELECT TO anon, authenticated
  USING (status = 'pending' AND expires_at > NOW());

-- ============================================================================
-- 6. Activity log
-- ============================================================================
CREATE TABLE IF NOT EXISTS activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id),
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id UUID,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_activity_log_org ON activity_log(organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_log_user ON activity_log(user_id);

ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view org activity"
  ON activity_log FOR SELECT TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Members can insert activity"
  ON activity_log FOR INSERT TO authenticated
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
    )
  );

-- ============================================================================
-- 7. Helper functions
-- ============================================================================

-- Get user's primary organization_id
CREATE OR REPLACE FUNCTION get_user_org_id(p_user_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  RETURN (
    SELECT organization_id
    FROM organization_members
    WHERE user_id = p_user_id
    ORDER BY joined_at ASC
    LIMIT 1
  );
END;
$$;

-- Get user's role in an org
CREATE OR REPLACE FUNCTION get_user_role(p_user_id UUID, p_org_id UUID)
RETURNS org_role
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  RETURN (
    SELECT role
    FROM organization_members
    WHERE user_id = p_user_id
      AND organization_id = p_org_id
  );
END;
$$;

-- Check if user is member of org
CREATE OR REPLACE FUNCTION is_org_member(p_user_id UUID, p_org_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM organization_members
    WHERE user_id = p_user_id AND organization_id = p_org_id
  );
END;
$$;

-- Get all org IDs for a user (for RLS policies, cached per transaction)
CREATE OR REPLACE FUNCTION user_org_ids(p_user_id UUID)
RETURNS UUID[]
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT COALESCE(ARRAY_AGG(organization_id), ARRAY[]::UUID[])
  FROM organization_members
  WHERE user_id = p_user_id;
$$;

-- Auto-create default org for new users
CREATE OR REPLACE FUNCTION create_default_org(p_user_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_org_id UUID;
  v_user_email TEXT;
  v_user_name TEXT;
  v_slug TEXT;
BEGIN
  -- Check if user already has an org
  SELECT organization_id INTO v_org_id
  FROM organization_members
  WHERE user_id = p_user_id
  LIMIT 1;

  IF v_org_id IS NOT NULL THEN
    RETURN json_build_object(
      'org_id', v_org_id,
      'role', (SELECT role FROM organization_members WHERE user_id = p_user_id AND organization_id = v_org_id),
      'already_exists', true
    );
  END IF;

  -- Get user info
  SELECT email, COALESCE(raw_user_meta_data->>'nom', raw_user_meta_data->>'name')
  INTO v_user_email, v_user_name
  FROM auth.users WHERE id = p_user_id;

  -- Generate unique slug
  v_slug := LOWER(REGEXP_REPLACE(
    COALESCE(v_user_name, split_part(v_user_email, '@', 1)),
    '[^a-z0-9]', '-', 'g'
  )) || '-' || SUBSTRING(gen_random_uuid()::text, 1, 8);

  -- Create org
  INSERT INTO organizations (name, slug, owner_id)
  VALUES (
    COALESCE(v_user_name, split_part(v_user_email, '@', 1)),
    v_slug,
    p_user_id
  )
  RETURNING id INTO v_org_id;

  -- Add as owner
  INSERT INTO organization_members (organization_id, user_id, role)
  VALUES (v_org_id, p_user_id, 'owner');

  RETURN json_build_object('org_id', v_org_id, 'role', 'owner', 'already_exists', false);
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION get_user_org_id TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_role TO authenticated;
GRANT EXECUTE ON FUNCTION is_org_member TO authenticated;
GRANT EXECUTE ON FUNCTION user_org_ids TO authenticated;
GRANT EXECUTE ON FUNCTION create_default_org TO authenticated;
