// src/context/OrgContext.jsx
// Organization + Role context for multi-user RBAC
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase, isDemo, auth } from '../supabaseClient';

/**
 * @typedef {'owner'|'admin'|'comptable'|'chef_chantier'|'ouvrier'|'readonly'} OrgRole
 *
 * @typedef {Object} OrgMember
 * @property {string} id
 * @property {string} user_id
 * @property {OrgRole} role
 * @property {string} joined_at
 * @property {string} [equipe_member_id]
 *
 * @typedef {Object} OrgContextValue
 * @property {string|null} orgId - Current organization UUID
 * @property {string} orgName - Organization display name
 * @property {OrgRole} role - Current user's role
 * @property {OrgMember[]} members - All org members
 * @property {boolean} loading - Whether org resolution is in progress
 * @property {boolean} isOwner
 * @property {boolean} isAdmin - owner OR admin
 * @property {Function} refreshOrg - Re-fetch org data
 */

const OrgContext = createContext(/** @type {OrgContextValue} */ ({
  orgId: null,
  orgName: '',
  role: 'owner',
  members: [],
  loading: true,
  isOwner: true,
  isAdmin: true,
  refreshOrg: () => {},
}));

/**
 * Hook to access org context
 * @returns {OrgContextValue}
 */
export function useOrg() {
  return useContext(OrgContext);
}

/**
 * OrgProvider — resolves current user's organization and role
 * Must be placed between AppProvider and DataProvider in the tree
 */
export function OrgProvider({ children }) {
  const [orgId, setOrgId] = useState(null);
  const [orgName, setOrgName] = useState('');
  const [role, setRole] = useState(/** @type {OrgRole} */ ('owner'));
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState(null);

  // Listen for auth state changes
  useEffect(() => {
    if (isDemo) {
      // Demo mode: mock org with owner role
      setOrgId('demo-org-id');
      setOrgName('Entreprise Démo');
      setRole('owner');
      setMembers([]);
      setLoading(false);
      return;
    }

    // Get current user
    const initAuth = async () => {
      const user = await auth.getCurrentUser();
      if (user?.id) {
        setUserId(user.id);
      } else {
        setLoading(false);
      }
    };
    initAuth();

    // Subscribe to auth changes
    const { data: { subscription } } = auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        setUserId(session.user.id);
      } else if (event === 'SIGNED_OUT') {
        setUserId(null);
        setOrgId(null);
        setOrgName('');
        setRole('owner');
        setMembers([]);
        setLoading(false);
      }
    });

    return () => subscription?.unsubscribe();
  }, []);

  // Resolve organization when userId changes
  const resolveOrg = useCallback(async (uid) => {
    if (!uid || isDemo || !supabase) return;

    setLoading(true);
    try {
      // 1. Try to get user's org via RPC
      const { data: orgData, error: orgError } = await supabase.rpc('get_user_org_id', {
        p_user_id: uid
      });

      let resolvedOrgId = orgData;

      // 2. If no org found, auto-create one
      if (!resolvedOrgId) {
        console.log('[OrgContext] No org found, creating default org...');
        const { data: createResult, error: createError } = await supabase.rpc('create_default_org', {
          p_user_id: uid
        });

        if (createError) {
          console.error('[OrgContext] Failed to create default org:', createError);
          // Fallback: user is their own "org" (backward compat)
          setRole('owner');
          setLoading(false);
          return;
        }

        resolvedOrgId = createResult?.org_id;
        console.log('[OrgContext] Created org:', resolvedOrgId);
      }

      if (!resolvedOrgId) {
        console.warn('[OrgContext] Could not resolve org');
        setRole('owner');
        setLoading(false);
        return;
      }

      setOrgId(resolvedOrgId);

      // 3. Fetch org details + user's membership
      const [orgRes, membershipRes, membersRes] = await Promise.all([
        supabase.from('organizations').select('name, slug').eq('id', resolvedOrgId).maybeSingle(),
        supabase.from('organization_members')
          .select('role, equipe_member_id')
          .eq('organization_id', resolvedOrgId)
          .eq('user_id', uid)
          .maybeSingle(),
        supabase.from('organization_members')
          .select('id, user_id, role, joined_at, equipe_member_id')
          .eq('organization_id', resolvedOrgId)
          .order('joined_at', { ascending: true }),
      ]);

      if (orgRes.data) {
        setOrgName(orgRes.data.name || '');
      }

      if (membershipRes.data) {
        setRole(membershipRes.data.role || 'owner');
      } else {
        // User exists in org (via get_user_org_id) but no membership row?
        // This shouldn't happen, but default to owner for safety
        console.warn('[OrgContext] No membership found for user in org');
        setRole('owner');
      }

      if (membersRes.data) {
        setMembers(membersRes.data);
      }
    } catch (err) {
      console.error('[OrgContext] Error resolving org:', err);
      // Fallback: assume owner role
      setRole('owner');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (userId) {
      resolveOrg(userId);
    }
  }, [userId, resolveOrg]);

  const refreshOrg = useCallback(() => {
    if (userId) {
      resolveOrg(userId);
    }
  }, [userId, resolveOrg]);

  const value = {
    orgId,
    orgName,
    role,
    members,
    loading,
    isOwner: role === 'owner',
    isAdmin: role === 'owner' || role === 'admin',
    refreshOrg,
  };

  return (
    <OrgContext.Provider value={value}>
      {children}
    </OrgContext.Provider>
  );
}

export default OrgContext;
