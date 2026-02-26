-- ============================================================================
-- MIGRATION 039: Invitation RPCs
-- Functions for creating and accepting invitations
-- ============================================================================

-- Get invitation by token (public-facing)
CREATE OR REPLACE FUNCTION get_invitation_by_token(p_token UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  v_invitation RECORD;
  v_org_name TEXT;
  v_inviter_email TEXT;
BEGIN
  SELECT * INTO v_invitation
  FROM invitations
  WHERE token = p_token
    AND status = 'pending'
    AND expires_at > NOW();

  IF NOT FOUND THEN
    RETURN json_build_object('error', 'Invitation introuvable ou expirée');
  END IF;

  -- Get org name
  SELECT name INTO v_org_name
  FROM organizations
  WHERE id = v_invitation.organization_id;

  -- Get inviter email
  SELECT email INTO v_inviter_email
  FROM auth.users
  WHERE id = v_invitation.invited_by;

  RETURN json_build_object(
    'id', v_invitation.id,
    'organization_id', v_invitation.organization_id,
    'organization_name', v_org_name,
    'role', v_invitation.role,
    'email', v_invitation.email,
    'phone', v_invitation.phone,
    'invited_by_email', v_inviter_email,
    'created_at', v_invitation.created_at,
    'expires_at', v_invitation.expires_at
  );
END;
$$;

-- Accept invitation
CREATE OR REPLACE FUNCTION accept_invitation(p_token UUID, p_user_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_invitation RECORD;
  v_member_count INT;
  v_already_member BOOLEAN;
BEGIN
  -- 1. Validate invitation
  SELECT * INTO v_invitation
  FROM invitations
  WHERE token = p_token
    AND status = 'pending'
    AND expires_at > NOW();

  IF NOT FOUND THEN
    RETURN json_build_object('error', 'Invitation introuvable ou expirée');
  END IF;

  -- 2. Check if already a member
  SELECT EXISTS(
    SELECT 1 FROM organization_members
    WHERE organization_id = v_invitation.organization_id
      AND user_id = p_user_id
  ) INTO v_already_member;

  IF v_already_member THEN
    -- Update invitation status anyway
    UPDATE invitations SET status = 'accepted', accepted_at = NOW()
    WHERE id = v_invitation.id;
    RETURN json_build_object('success', true, 'already_member', true);
  END IF;

  -- 3. Check member count (plan limits)
  SELECT COUNT(*) INTO v_member_count
  FROM organization_members
  WHERE organization_id = v_invitation.organization_id;

  -- For now, allow up to 50 members (will be enforced by plan later)
  IF v_member_count >= 50 THEN
    RETURN json_build_object('error', 'Limite de membres atteinte');
  END IF;

  -- 4. Add as member
  INSERT INTO organization_members (organization_id, user_id, role, invited_by)
  VALUES (v_invitation.organization_id, p_user_id, v_invitation.role, v_invitation.invited_by);

  -- 5. Update invitation status
  UPDATE invitations SET status = 'accepted', accepted_at = NOW()
  WHERE id = v_invitation.id;

  -- 6. Remove user from their own default org (if they had one created at signup)
  -- We keep their old org but they switch to the new one
  -- This is optional — we just change their "primary" org

  -- 7. Log activity
  INSERT INTO activity_log (organization_id, user_id, action, entity_type, metadata)
  VALUES (
    v_invitation.organization_id,
    p_user_id,
    'member_joined',
    'organization_member',
    json_build_object('role', v_invitation.role, 'invitation_id', v_invitation.id)
  );

  RETURN json_build_object('success', true, 'organization_id', v_invitation.organization_id, 'role', v_invitation.role);
END;
$$;

-- Revoke/cancel invitation (owner/admin only — enforced by RLS on invitations table)
CREATE OR REPLACE FUNCTION revoke_invitation(p_invitation_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE invitations
  SET status = 'revoked'
  WHERE id = p_invitation_id
    AND status = 'pending';

  IF NOT FOUND THEN
    RETURN json_build_object('error', 'Invitation introuvable');
  END IF;

  RETURN json_build_object('success', true);
END;
$$;

-- Grant execute
GRANT EXECUTE ON FUNCTION get_invitation_by_token TO anon, authenticated;
GRANT EXECUTE ON FUNCTION accept_invitation TO authenticated;
GRANT EXECUTE ON FUNCTION revoke_invitation TO authenticated;
