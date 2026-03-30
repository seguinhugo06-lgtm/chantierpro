// src/lib/permissions.js
// Pure permission functions — no React dependency
// Role-based access control matrix for BatiGesti

/**
 * @typedef {'owner'|'admin'|'comptable'|'chef_chantier'|'ouvrier'|'readonly'} OrgRole
 */

/**
 * Permission levels:
 * - 'full'           : Full CRUD access
 * - 'view'           : Read-only access
 * - 'view_no_prices' : Read-only, prices/amounts hidden
 * - 'finance'        : Finance-focused subset
 * - 'chantier'       : Chantier-focused subset
 * - 'pointage'       : Minimal, time-tracking only
 * - 'assigned'       : Only items assigned to this user
 * - 'own'            : Only own items
 * - false            : No access
 */

/** @type {Record<string, Record<OrgRole, string|false>>} */
const PERMISSION_MATRIX = {
  dashboard:  { owner: 'full', admin: 'full', comptable: 'finance', chef_chantier: 'chantier', ouvrier: 'pointage', readonly: 'view' },
  devis:      { owner: 'full', admin: 'full', comptable: 'full', chef_chantier: 'view_no_prices', ouvrier: false, readonly: 'view' },
  chantiers:  { owner: 'full', admin: 'full', comptable: false, chef_chantier: 'full', ouvrier: 'assigned', readonly: 'view' },
  clients:    { owner: 'full', admin: 'full', comptable: 'full', chef_chantier: 'view', ouvrier: false, readonly: 'view' },
  tasks:      { owner: 'full', admin: 'full', comptable: false, chef_chantier: 'full', ouvrier: 'own', readonly: 'view' },
  planning:   { owner: 'full', admin: 'full', comptable: false, chef_chantier: 'full', ouvrier: 'own', readonly: 'view' },
  memos:      { owner: 'full', admin: 'full', comptable: false, chef_chantier: 'full', ouvrier: 'assigned', readonly: 'view' },
  equipe:     { owner: 'full', admin: 'full', comptable: false, chef_chantier: 'view', ouvrier: false, readonly: 'view' },
  catalogue:  { owner: 'full', admin: 'full', comptable: false, chef_chantier: 'view', ouvrier: false, readonly: 'view' },
  finances:   { owner: 'full', admin: 'full', comptable: 'full', chef_chantier: false, ouvrier: false, readonly: 'view' },
  'ia-devis':     { owner: 'full', admin: 'full', comptable: 'full', chef_chantier: false, ouvrier: false, readonly: false },
  tresorerie:     { owner: 'full', admin: 'full', comptable: 'full', chef_chantier: false, ouvrier: false, readonly: 'view' },
  admin:          { owner: 'full', admin: 'full', comptable: 'full', chef_chantier: false, ouvrier: false, readonly: false },
  soustraitants:  { owner: 'full', admin: 'full', comptable: false, chef_chantier: 'view', ouvrier: false, readonly: 'view' },
  commandes:      { owner: 'full', admin: 'full', comptable: 'full', chef_chantier: 'view', ouvrier: false, readonly: 'view' },
  ouvrages:       { owner: 'full', admin: 'full', comptable: false, chef_chantier: 'view', ouvrier: false, readonly: 'view' },
  entretien:      { owner: 'full', admin: 'full', comptable: false, chef_chantier: 'full', ouvrier: 'view', readonly: 'view' },
  signatures:     { owner: 'full', admin: 'full', comptable: 'full', chef_chantier: false, ouvrier: false, readonly: 'view' },
  export:         { owner: 'full', admin: 'full', comptable: 'full', chef_chantier: false, ouvrier: false, readonly: false },
  settings:       { owner: 'full', admin: 'full', comptable: false, chef_chantier: false, ouvrier: false, readonly: false },
  profil:         { owner: 'full', admin: 'full', comptable: 'full', chef_chantier: 'full', ouvrier: 'full', readonly: 'view' },
  plan:           { owner: 'full', admin: 'full', comptable: 'view', chef_chantier: 'view', ouvrier: 'view', readonly: 'view' },
  messagerie:     { owner: 'full', admin: 'full', comptable: false, chef_chantier: 'full', ouvrier: 'full', readonly: 'view' },
  garanties:      { owner: 'full', admin: 'full', comptable: false, chef_chantier: 'full', ouvrier: 'view', readonly: 'view' },
  bibliotheque:   { owner: 'full', admin: 'full', comptable: false, chef_chantier: 'view', ouvrier: false, readonly: 'view' },
  pipeline:       { owner: 'full', admin: 'full', comptable: 'full', chef_chantier: false, ouvrier: false, readonly: 'view' },
  'avis-google':  { owner: 'full', admin: 'full', comptable: false, chef_chantier: false, ouvrier: false, readonly: false },
  contrats:       { owner: 'full', admin: 'full', comptable: 'full', chef_chantier: false, ouvrier: false, readonly: 'view' },
  formulaires:    { owner: 'full', admin: 'full', comptable: false, chef_chantier: 'full', ouvrier: 'full', readonly: 'view' },
  'site-web':     { owner: 'full', admin: 'full', comptable: false, chef_chantier: false, ouvrier: false, readonly: false },
  'client-portal': { owner: 'full', admin: 'full', comptable: false, chef_chantier: false, ouvrier: false, readonly: false },
  analytique:     { owner: 'full', admin: 'full', comptable: 'full', chef_chantier: false, ouvrier: false, readonly: 'view' },
};

/**
 * Action permissions per entity per role
 * @type {Record<string, Record<string, OrgRole[]>>}
 */
const ACTION_MATRIX = {
  devis: {
    create: ['owner', 'admin', 'comptable'],
    edit:   ['owner', 'admin', 'comptable'],
    delete: ['owner', 'admin'],
    view:   ['owner', 'admin', 'comptable', 'chef_chantier', 'readonly'],
    send:   ['owner', 'admin', 'comptable'],
  },
  client: {
    create: ['owner', 'admin', 'comptable'],
    edit:   ['owner', 'admin', 'comptable'],
    delete: ['owner', 'admin'],
    view:   ['owner', 'admin', 'comptable', 'chef_chantier', 'readonly'],
  },
  chantier: {
    create: ['owner', 'admin', 'chef_chantier'],
    edit:   ['owner', 'admin', 'chef_chantier'],
    delete: ['owner', 'admin'],
    view:   ['owner', 'admin', 'chef_chantier', 'ouvrier', 'readonly'],
  },
  depense: {
    create: ['owner', 'admin', 'comptable', 'chef_chantier'],
    edit:   ['owner', 'admin', 'comptable', 'chef_chantier'],
    delete: ['owner', 'admin'],
    view:   ['owner', 'admin', 'comptable', 'readonly'],
  },
  equipe: {
    create: ['owner', 'admin'],
    edit:   ['owner', 'admin'],
    delete: ['owner', 'admin'],
    view:   ['owner', 'admin', 'chef_chantier', 'readonly'],
  },
  planning: {
    create: ['owner', 'admin', 'chef_chantier'],
    edit:   ['owner', 'admin', 'chef_chantier'],
    delete: ['owner', 'admin', 'chef_chantier'],
    view:   ['owner', 'admin', 'chef_chantier', 'ouvrier', 'readonly'],
  },
  memo: {
    create: ['owner', 'admin', 'chef_chantier'],
    edit:   ['owner', 'admin', 'chef_chantier'],
    delete: ['owner', 'admin', 'chef_chantier'],
    view:   ['owner', 'admin', 'chef_chantier', 'ouvrier', 'readonly'],
  },
  catalogue: {
    create: ['owner', 'admin'],
    edit:   ['owner', 'admin'],
    delete: ['owner', 'admin'],
    view:   ['owner', 'admin', 'chef_chantier', 'readonly'],
  },
  pointage: {
    create: ['owner', 'admin', 'chef_chantier', 'ouvrier'],
    edit:   ['owner', 'admin', 'chef_chantier'],
    delete: ['owner', 'admin'],
    view:   ['owner', 'admin', 'chef_chantier', 'ouvrier', 'readonly'],
  },
};

/**
 * Get the permission level for a role on a page
 * @param {OrgRole} role
 * @param {string} page
 * @returns {string|false} Permission level or false for no access
 */
export function getPagePermission(role, page) {
  if (!role || !page) return false;
  const pagePerms = PERMISSION_MATRIX[page];
  if (!pagePerms) return false;
  return pagePerms[role] || false;
}

/**
 * Check if a role can access a page (any access level)
 * @param {OrgRole} role
 * @param {string} page
 * @returns {boolean}
 */
export function canAccessPage(role, page) {
  return getPagePermission(role, page) !== false;
}

/**
 * Check if role has full (read+write) access to a page
 * @param {OrgRole} role
 * @param {string} page
 * @returns {boolean}
 */
export function hasFullAccess(role, page) {
  return getPagePermission(role, page) === 'full';
}

/**
 * Check if role can perform a specific action on an entity
 * @param {OrgRole} role
 * @param {string} entity - 'devis'|'client'|'chantier'|etc.
 * @param {string} action - 'create'|'edit'|'delete'|'view'
 * @returns {boolean}
 */
export function canPerformAction(role, entity, action) {
  if (!role || !entity || !action) return false;
  const entityActions = ACTION_MATRIX[entity];
  if (!entityActions) return false;
  const allowedRoles = entityActions[action];
  if (!allowedRoles) return false;
  return allowedRoles.includes(role);
}

/**
 * Can this role see prices/amounts?
 * @param {OrgRole} role
 * @returns {boolean}
 */
export function canViewPrices(role) {
  return !['chef_chantier', 'ouvrier'].includes(role);
}

/**
 * Can this role edit data (any data)?
 * @param {OrgRole} role
 * @returns {boolean}
 */
export function canEditData(role) {
  return role !== 'readonly';
}

/**
 * Can this role manage team members (invite, change roles)?
 * @param {OrgRole} role
 * @returns {boolean}
 */
export function canManageTeam(role) {
  return ['owner', 'admin'].includes(role);
}

/**
 * Can this role access billing/subscription settings?
 * @param {OrgRole} role
 * @returns {boolean}
 */
export function canAccessBilling(role) {
  return role === 'owner';
}

/**
 * Can this role export data (PDF, Excel)?
 * @param {OrgRole} role
 * @returns {boolean}
 */
export function canExportData(role) {
  return ['owner', 'admin', 'comptable'].includes(role);
}

/**
 * Get list of pages accessible by a role
 * @param {OrgRole} role
 * @returns {string[]}
 */
export function getAccessiblePages(role) {
  return Object.keys(PERMISSION_MATRIX).filter(page => canAccessPage(role, page));
}

/**
 * Get human-readable role label in French
 * @param {OrgRole} role
 * @returns {string}
 */
export function getRoleLabel(role) {
  const labels = {
    owner: 'Propriétaire',
    admin: 'Administrateur',
    comptable: 'Comptable',
    chef_chantier: 'Chef de chantier',
    ouvrier: 'Ouvrier',
    readonly: 'Lecture seule',
  };
  return labels[role] || role;
}

/**
 * Get role description in French
 * @param {OrgRole} role
 * @returns {string}
 */
export function getRoleDescription(role) {
  const descriptions = {
    owner: 'Accès complet, facturation et gestion de l\'organisation',
    admin: 'Accès complet sauf facturation',
    comptable: 'Finances, devis/factures et clients',
    chef_chantier: 'Chantiers, planning, équipe et tâches',
    ouvrier: 'Pointage, planning personnel et tâches assignées',
    readonly: 'Consultation uniquement, aucune modification',
  };
  return descriptions[role] || '';
}

/**
 * All available roles (for dropdown menus, etc.)
 * @returns {Array<{value: OrgRole, label: string, description: string}>}
 */
export function getAllRoles() {
  const roles = ['owner', 'admin', 'comptable', 'chef_chantier', 'ouvrier', 'readonly'];
  return roles.map(role => ({
    value: role,
    label: getRoleLabel(role),
    description: getRoleDescription(role),
  }));
}

/**
 * Roles that can be assigned by invitation (excludes owner)
 * @returns {Array<{value: OrgRole, label: string, description: string}>}
 */
export function getInvitableRoles() {
  return getAllRoles().filter(r => r.value !== 'owner');
}
