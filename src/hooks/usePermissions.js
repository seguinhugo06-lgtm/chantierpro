// src/hooks/usePermissions.js
// React hook combining OrgContext with permission matrix
import { useMemo } from 'react';
import { useOrg } from '../context/OrgContext';
import {
  canAccessPage,
  canPerformAction,
  canViewPrices as checkCanViewPrices,
  canEditData as checkCanEditData,
  canManageTeam as checkCanManageTeam,
  canAccessBilling as checkCanAccessBilling,
  canExportData as checkCanExportData,
  getPagePermission,
  hasFullAccess,
} from '../lib/permissions';

/**
 * Hook for role-based permission checks
 *
 * Usage:
 *   const { canAccess, canPerform, canViewPrices, role, orgId } = usePermissions();
 *   if (!canAccess('devis')) return <AccessDenied />;
 *   if (!canPerform('devis', 'create')) return null;
 *
 * @returns {Object} Permission helpers bound to current user's role
 */
export function usePermissions() {
  const { role, orgId, loading, isOwner, isAdmin } = useOrg();

  return useMemo(() => ({
    // Current state
    role,
    orgId,
    loading,

    // Boolean flags
    isOwner,
    isAdmin,
    canViewPrices: checkCanViewPrices(role),
    canEditData: checkCanEditData(role),
    canManageTeam: checkCanManageTeam(role),
    canAccessBilling: checkCanAccessBilling(role),
    canExportData: checkCanExportData(role),

    // Function checks
    /** @param {string} page */
    canAccess: (page) => canAccessPage(role, page),

    /** @param {string} page */
    getPermission: (page) => getPagePermission(role, page),

    /** @param {string} page */
    hasFull: (page) => hasFullAccess(role, page),

    /**
     * @param {string} entity
     * @param {string} action
     */
    canPerform: (entity, action) => canPerformAction(role, entity, action),
  }), [role, orgId, loading, isOwner, isAdmin]);
}
