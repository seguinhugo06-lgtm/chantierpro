-- ============================================================================
-- MIGRATION 041: Fix self-referencing RLS policies
-- Replace subquery-based policies on organization_members, organizations,
-- invitations, and activity_log with user_org_ids() SECURITY DEFINER function
-- to avoid circular RLS evaluation issues.
-- ============================================================================

-- Drop existing problematic policies on organization_members
DROP POLICY IF EXISTS "Members can view co-members" ON organization_members;
DROP POLICY IF EXISTS "Admins can insert members" ON organization_members;
DROP POLICY IF EXISTS "Admins can update members" ON organization_members;
DROP POLICY IF EXISTS "Admins can delete members" ON organization_members;

-- Recreate with user_org_ids() function (SECURITY DEFINER = bypasses RLS)
CREATE POLICY "Members can view co-members"
  ON organization_members FOR SELECT TO authenticated
  USING (
    organization_id = ANY(user_org_ids(auth.uid()))
  );

CREATE POLICY "Admins can insert members"
  ON organization_members FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    OR
    organization_id = ANY(user_org_ids(auth.uid()))
  );

CREATE POLICY "Admins can update members"
  ON organization_members FOR UPDATE TO authenticated
  USING (
    organization_id = ANY(user_org_ids(auth.uid()))
  );

CREATE POLICY "Admins can delete members"
  ON organization_members FOR DELETE TO authenticated
  USING (
    organization_id = ANY(user_org_ids(auth.uid()))
  );

-- Fix organizations table policy
DROP POLICY IF EXISTS "Org members can view org" ON organizations;

CREATE POLICY "Org members can view org"
  ON organizations FOR SELECT TO authenticated
  USING (
    id = ANY(user_org_ids(auth.uid()))
    OR owner_id = auth.uid()
  );

-- Fix invitations policy
DROP POLICY IF EXISTS "Org admins can manage invitations" ON invitations;

CREATE POLICY "Org admins can manage invitations"
  ON invitations FOR ALL TO authenticated
  USING (
    organization_id = ANY(user_org_ids(auth.uid()))
  );

-- Fix activity_log policies
DROP POLICY IF EXISTS "Members can view org activity" ON activity_log;
DROP POLICY IF EXISTS "Members can insert activity" ON activity_log;

CREATE POLICY "Members can view org activity"
  ON activity_log FOR SELECT TO authenticated
  USING (
    organization_id = ANY(user_org_ids(auth.uid()))
  );

CREATE POLICY "Members can insert activity"
  ON activity_log FOR INSERT TO authenticated
  WITH CHECK (
    organization_id = ANY(user_org_ids(auth.uid()))
  );
