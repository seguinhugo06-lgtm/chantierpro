// src/components/ui/PermissionGate.jsx
// Role-based permission gate components
import React from 'react';
import { usePermissions } from '../../hooks/usePermissions';
import { ShieldAlert, Lock, Eye } from 'lucide-react';
import { getRoleLabel, getPagePermission } from '../../lib/permissions';

/**
 * PermissionGate — conditionally renders children based on role
 *
 * Usage:
 *   <PermissionGate page="finances">
 *     <FinancesPage />
 *   </PermissionGate>
 *
 *   <PermissionGate entity="devis" action="create" fallback={<ViewOnlyBanner />}>
 *     <CreateDevisButton />
 *   </PermissionGate>
 *
 * @param {Object} props
 * @param {string} [props.page] - Page to check access for
 * @param {string} [props.entity] - Entity to check action for
 * @param {string} [props.action] - Action to check ('create'|'edit'|'delete'|'view')
 * @param {React.ReactNode} [props.fallback] - What to render if denied (default: null for inline, AccessDenied for page)
 * @param {boolean} [props.showDenied] - Show AccessDenied page when denied (default: true for page checks)
 * @param {React.ReactNode} props.children
 */
export function PermissionGate({ page, entity, action, fallback, showDenied, children }) {
  const { canAccess, canPerform, loading } = usePermissions();

  // While loading org context, render nothing (avoids flash)
  if (loading) return null;

  // Page-level check
  if (page) {
    if (!canAccess(page)) {
      if (fallback) return fallback;
      if (showDenied !== false) return <AccessDenied page={page} />;
      return null;
    }
    return children;
  }

  // Entity+action check
  if (entity && action) {
    if (!canPerform(entity, action)) {
      return fallback || null;
    }
    return children;
  }

  // No check specified, render children
  return children;
}

/**
 * AccessDenied — full page component for unauthorized access
 */
export function AccessDenied({ page }) {
  const { role } = usePermissions();
  const pageLabels = {
    dashboard: 'Tableau de bord',
    devis: 'Devis & Factures',
    chantiers: 'Chantiers',
    clients: 'Clients',
    planning: 'Planning',
    memos: 'Tâches',
    equipe: 'Équipe',
    catalogue: 'Catalogue',
    finances: 'Finances',
    settings: 'Paramètres',
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8">
      <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mb-4">
        <ShieldAlert className="w-8 h-8 text-red-500" />
      </div>
      <h2 className="text-xl font-bold text-slate-800 mb-2">Accès restreint</h2>
      <p className="text-slate-500 max-w-md">
        Votre rôle ({getRoleLabel(role)}) ne permet pas d'accéder à la page{' '}
        <strong>{pageLabels[page] || page}</strong>.
      </p>
      <p className="text-slate-400 text-sm mt-2">
        Contactez votre administrateur pour modifier vos permissions.
      </p>
    </div>
  );
}

/**
 * ReadOnlyBanner — shows when user has view-only access to a page
 */
export function ReadOnlyBanner({ message }) {
  const { role } = usePermissions();
  return (
    <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-4 py-2 mb-4 text-sm text-amber-700">
      <Eye className="w-4 h-4 flex-shrink-0" />
      <span>
        {message || `Mode consultation — votre rôle (${getRoleLabel(role)}) ne permet pas de modifier les données.`}
      </span>
    </div>
  );
}

/**
 * EditGuard — wraps an interactive element, disabling it for readonly users
 *
 * Usage:
 *   <EditGuard entity="devis" action="create">
 *     <button onClick={handleCreate}>Nouveau devis</button>
 *   </EditGuard>
 */
export function EditGuard({ entity, action = 'edit', children, tooltip }) {
  const { canPerform, role } = usePermissions();
  const allowed = canPerform(entity, action);

  if (allowed) return children;

  // Clone child and add disabled + tooltip
  return (
    <div className="relative inline-block" title={tooltip || `Action non autorisée pour le rôle ${getRoleLabel(role)}`}>
      <div className="opacity-50 pointer-events-none">
        {children}
      </div>
    </div>
  );
}

export default PermissionGate;
