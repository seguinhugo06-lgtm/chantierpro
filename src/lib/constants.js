/**
 * ChantierPro Constants
 * Single source of truth for all enums and magic strings
 */

// Devis/Facture statuses
export const DEVIS_STATUS = {
  BROUILLON: 'brouillon',
  ENVOYE: 'envoye',
  VU: 'vu',
  ACCEPTE: 'accepte',
  REFUSE: 'refuse',
  ACOMPTE_FACTURE: 'acompte_facture',
  FACTURE: 'facture',
  PAYEE: 'payee'
};

// Filtres devis centralisés — source unique de vérité
export const DEVIS_EN_ATTENTE = [DEVIS_STATUS.ENVOYE, DEVIS_STATUS.VU]; // En attente de réponse client
export const DEVIS_PIPELINE = [DEVIS_STATUS.BROUILLON, DEVIS_STATUS.ENVOYE, DEVIS_STATUS.VU]; // Pipeline commercial total

export const DEVIS_STATUS_LABELS = {
  [DEVIS_STATUS.BROUILLON]: 'Brouillon',
  [DEVIS_STATUS.ENVOYE]: 'Envoyé',
  [DEVIS_STATUS.VU]: 'Vu',
  [DEVIS_STATUS.ACCEPTE]: 'Accepté',
  [DEVIS_STATUS.REFUSE]: 'Refusé',
  [DEVIS_STATUS.ACOMPTE_FACTURE]: 'Acompte facturé',
  [DEVIS_STATUS.FACTURE]: 'Facturé',
  [DEVIS_STATUS.PAYEE]: 'Payée'
};

export const DEVIS_STATUS_COLORS = {
  [DEVIS_STATUS.BROUILLON]: { bg: 'bg-slate-100', text: 'text-slate-600', dot: 'bg-slate-400', darkBg: 'bg-slate-700', darkText: 'text-slate-300' },
  [DEVIS_STATUS.ENVOYE]: { bg: 'bg-blue-100', text: 'text-blue-700', dot: 'bg-blue-500', darkBg: 'bg-blue-900/50', darkText: 'text-blue-300' },
  [DEVIS_STATUS.VU]: { bg: 'bg-purple-100', text: 'text-purple-700', dot: 'bg-purple-500', darkBg: 'bg-purple-900/50', darkText: 'text-purple-300' },
  [DEVIS_STATUS.ACCEPTE]: { bg: 'bg-emerald-100', text: 'text-emerald-700', dot: 'bg-emerald-500', darkBg: 'bg-emerald-900/50', darkText: 'text-emerald-300' },
  [DEVIS_STATUS.REFUSE]: { bg: 'bg-red-200', text: 'text-red-700', dot: 'bg-red-500', darkBg: 'bg-red-900/50', darkText: 'text-red-300' },
  [DEVIS_STATUS.ACOMPTE_FACTURE]: { bg: 'bg-amber-100', text: 'text-amber-700', dot: 'bg-amber-500', darkBg: 'bg-amber-900/50', darkText: 'text-amber-300' },
  [DEVIS_STATUS.FACTURE]: { bg: 'bg-violet-100', text: 'text-violet-700', dot: 'bg-violet-500', darkBg: 'bg-violet-900/50', darkText: 'text-violet-300' },
  [DEVIS_STATUS.PAYEE]: { bg: 'bg-emerald-100', text: 'text-emerald-700', dot: 'bg-emerald-600', darkBg: 'bg-emerald-900/50', darkText: 'text-emerald-300' }
};

// Document types
export const DOCUMENT_TYPE = {
  DEVIS: 'devis',
  FACTURE: 'facture'
};

// Chantier statuses
export const CHANTIER_STATUS = {
  PROSPECT: 'prospect',
  EN_COURS: 'en_cours',
  TERMINE: 'termine',
  ABANDONNE: 'abandonne',
  ARCHIVE: 'archive'
};

export const CHANTIER_STATUS_LABELS = {
  [CHANTIER_STATUS.PROSPECT]: 'Prospect',
  [CHANTIER_STATUS.EN_COURS]: 'En cours',
  [CHANTIER_STATUS.TERMINE]: 'Terminé',
  [CHANTIER_STATUS.ABANDONNE]: 'Abandonné',
  [CHANTIER_STATUS.ARCHIVE]: 'Archivé'
};

export const CHANTIER_STATUS_COLORS = {
  [CHANTIER_STATUS.PROSPECT]: { bg: 'bg-blue-100', text: 'text-blue-600', dot: 'bg-blue-500' },
  [CHANTIER_STATUS.EN_COURS]: { bg: 'bg-emerald-100', text: 'text-emerald-600', dot: 'bg-emerald-500' },
  [CHANTIER_STATUS.TERMINE]: { bg: 'bg-slate-100', text: 'text-slate-600', dot: 'bg-slate-400' },
  [CHANTIER_STATUS.ABANDONNE]: { bg: 'bg-red-100', text: 'text-red-600', dot: 'bg-red-400' },
  [CHANTIER_STATUS.ARCHIVE]: { bg: 'bg-gray-100', text: 'text-gray-500', dot: 'bg-gray-400' }
};

// Valid status transitions
export const CHANTIER_STATUS_TRANSITIONS = {
  [CHANTIER_STATUS.PROSPECT]: [CHANTIER_STATUS.EN_COURS, CHANTIER_STATUS.ABANDONNE],
  [CHANTIER_STATUS.EN_COURS]: [CHANTIER_STATUS.TERMINE, CHANTIER_STATUS.ABANDONNE, CHANTIER_STATUS.PROSPECT],
  [CHANTIER_STATUS.TERMINE]: [CHANTIER_STATUS.EN_COURS], // Can reopen
  [CHANTIER_STATUS.ABANDONNE]: [CHANTIER_STATUS.PROSPECT, CHANTIER_STATUS.EN_COURS], // Can reactivate
  [CHANTIER_STATUS.ARCHIVE]: [CHANTIER_STATUS.TERMINE, CHANTIER_STATUS.PROSPECT] // Can restore
};

// Helper to check if a status transition is valid
export const canTransitionChantierStatus = (currentStatus, newStatus) => {
  if (currentStatus === newStatus) return true; // Same status is always valid
  const validTransitions = CHANTIER_STATUS_TRANSITIONS[currentStatus];
  return validTransitions?.includes(newStatus) ?? false;
};

// Get available transitions for a status
export const getAvailableChantierTransitions = (currentStatus) => {
  return CHANTIER_STATUS_TRANSITIONS[currentStatus] || [];
};

// Ajustement types
export const AJUSTEMENT_TYPE = {
  REVENU: 'REVENU',
  DEPENSE: 'DEPENSE'
};

// Expense categories
export const EXPENSE_CATEGORIES = [
  'Matériaux',
  'Main d\'oeuvre',
  'Location',
  'Transport',
  'Outillage',
  'Sous-traitance',
  'Administratif',
  'Autre'
];

// Catalog categories with icons
export const CATALOG_CATEGORIES = {
  'Carrelage': { icon: '🔲', color: '#78716c' },
  'Peinture': { icon: '🎨', color: '#8b5cf6' },
  'Plomberie': { icon: '🔧', color: '#3b82f6' },
  'Électricité': { icon: '⚡', color: '#eab308' },
  'Maçonnerie': { icon: '🧱', color: '#a16207' },
  'Menuiserie': { icon: '🪵', color: '#92400e' },
  'Matériaux': { icon: '📦', color: '#64748b' },
  'Main d\'oeuvre': { icon: '👷', color: '#f97316' },
  'Outillage': { icon: '🔨', color: '#6b7280' },
  'Location': { icon: '🚛', color: '#0891b2' },
  'Autre': { icon: '📋', color: '#94a3b8' }
};

// TVA rates in France
export const TVA_RATES = [
  { value: 20, label: '20%', description: 'Taux normal' },
  { value: 10, label: '10%', description: 'Travaux rénovation' },
  { value: 5.5, label: '5.5%', description: 'Rénovation énergétique' },
  { value: 0, label: '0%', description: 'Exonéré / Auto-entrepreneur' }
];

// Payment methods
export const PAYMENT_METHODS = [
  { value: 'virement', label: 'Virement bancaire', icon: '🏦' },
  { value: 'cheque', label: 'Chèque', icon: '📝' },
  { value: 'especes', label: 'Espèces', icon: '💶' },
  { value: 'carte', label: 'Carte bancaire', icon: '💳' },
  { value: 'autre', label: 'Autre', icon: '📋' }
];

// Pointage types
export const POINTAGE_TYPE = {
  MANUEL: 'manuel',
  CHRONO: 'chrono'
};

// Default margin thresholds
export const MARGIN_THRESHOLDS = {
  DANGER: 10,    // Below 10% = red
  WARNING: 20,   // Below 20% = orange
  GOOD: 30       // Above 30% = green
};

// File size limits
export const FILE_LIMITS = {
  LOGO_MAX_SIZE: 2 * 1024 * 1024,      // 2MB
  PHOTO_MAX_SIZE: 5 * 1024 * 1024,     // 5MB
  DOCUMENT_MAX_SIZE: 10 * 1024 * 1024  // 10MB
};

// Pagination defaults
export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100
};

// Date formats
export const DATE_FORMAT = {
  DISPLAY: 'dd/MM/yyyy',
  INPUT: 'yyyy-MM-dd',
  DATETIME: 'dd/MM/yyyy HH:mm'
};

// Currency
export const CURRENCY = {
  CODE: 'EUR',
  SYMBOL: '€',
  LOCALE: 'fr-FR'
};

// Client types
export const CLIENT_TYPES = ['Particulier', 'Professionnel', 'Architecte', 'Promoteur', 'Syndic'];

export const CLIENT_TYPE_COLORS = {
  'Particulier': { bg: 'bg-blue-100', text: 'text-blue-700', dot: 'bg-blue-500', color: '#3b82f6', darkBg: 'bg-blue-900/40', darkText: 'text-blue-300' },
  'Professionnel': { bg: 'bg-amber-100', text: 'text-amber-700', dot: 'bg-amber-500', color: '#f59e0b', darkBg: 'bg-amber-900/40', darkText: 'text-amber-300' },
  'Architecte': { bg: 'bg-purple-100', text: 'text-purple-700', dot: 'bg-purple-500', color: '#8b5cf6', darkBg: 'bg-purple-900/40', darkText: 'text-purple-300' },
  'Promoteur': { bg: 'bg-emerald-100', text: 'text-emerald-700', dot: 'bg-emerald-500', color: '#10b981', darkBg: 'bg-emerald-900/40', darkText: 'text-emerald-300' },
  'Syndic': { bg: 'bg-rose-100', text: 'text-rose-700', dot: 'bg-rose-500', color: '#f43f5e', darkBg: 'bg-rose-900/40', darkText: 'text-rose-300' },
};

export const CLIENT_STATUS = {
  ACTIF: 'actif',
  EN_DEVIS: 'en_devis',
  PROSPECT: 'prospect',
  INACTIF: 'inactif',
};

export const CLIENT_STATUS_LABELS = {
  actif: 'Actif',
  en_devis: 'En devis',
  prospect: 'Prospect',
  inactif: 'Inactif',
};

export const CLIENT_STATUS_COLORS = {
  actif: { bg: 'bg-emerald-100', text: 'text-emerald-700', dot: 'bg-emerald-500', darkBg: 'bg-emerald-900/40', darkText: 'text-emerald-300' },
  en_devis: { bg: 'bg-blue-100', text: 'text-blue-700', dot: 'bg-blue-500', darkBg: 'bg-blue-900/40', darkText: 'text-blue-300' },
  prospect: { bg: 'bg-amber-100', text: 'text-amber-700', dot: 'bg-amber-500', darkBg: 'bg-amber-900/40', darkText: 'text-amber-300' },
  inactif: { bg: 'bg-slate-100', text: 'text-slate-500', dot: 'bg-slate-400', darkBg: 'bg-slate-700', darkText: 'text-slate-400' },
};

// Formatters removed — use src/lib/formatters.js instead
