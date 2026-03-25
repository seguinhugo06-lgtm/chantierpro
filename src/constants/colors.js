/**
 * Couleurs sémantiques centralisées — BatiGesti Design System
 */

// Statuts devis/factures
export const DEVIS_STATUS_COLORS = {
  brouillon: { bg: 'bg-slate-100', text: 'text-slate-600', border: 'border-slate-300', hex: '#94a3b8' },
  envoye: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', hex: '#3b82f6' },
  vu: { bg: 'bg-violet-50', text: 'text-violet-700', border: 'border-violet-200', hex: '#8b5cf6' },
  signe: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', hex: '#10b981' },
  accepte: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', hex: '#10b981' },
  facture: { bg: 'bg-violet-50', text: 'text-violet-700', border: 'border-violet-200', hex: '#8b5cf6' },
  paye: { bg: 'bg-cyan-50', text: 'text-cyan-700', border: 'border-cyan-200', hex: '#06b6d4' },
  refuse: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', hex: '#ef4444' },
  expire: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', hex: '#f59e0b' },
};

// Statuts chantier
export const CHANTIER_STATUS_COLORS = {
  prospect: { bg: 'bg-emerald-50', text: 'text-emerald-700', hex: '#10b981' },
  en_cours: { bg: 'bg-amber-50', text: 'text-amber-700', hex: '#f59e0b' },
  termine: { bg: 'bg-slate-100', text: 'text-slate-600', hex: '#6b7280' },
  archive: { bg: 'bg-slate-50', text: 'text-slate-500', hex: '#9ca3af' },
  brouillon: { bg: 'bg-slate-50', text: 'text-slate-400', hex: '#9ca3af' },
};

// Priorités tâches
export const PRIORITY_COLORS = {
  haute: { bg: 'bg-red-50', text: 'text-red-700', dot: '#ef4444' },
  moyenne: { bg: 'bg-amber-50', text: 'text-amber-700', dot: '#f59e0b' },
  basse: { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: '#22c55e' },
};

// Catégories tâches/mémos
export const CATEGORY_COLORS = {
  rappel: '#3b82f6',
  achat: '#f59e0b',
  rdv: '#8b5cf6',
  admin: '#6366f1',
  idee: '#22c55e',
  urgent: '#ef4444',
};

// Types événements planning
export const EVENT_TYPE_COLORS = {
  chantier: '#3b82f6',
  rdv: '#10b981',
  relance: '#f59e0b',
  urgence: '#ef4444',
  memo: '#8b5cf6',
  autre: '#6b7280',
  deadline: '#ec4899',
};

// Score client (classification)
export const CLIENT_SCORE_COLORS = {
  vip: '#f59e0b',
  regulier: '#10b981',
  occasionnel: '#3b82f6',
  dormant: '#ef4444',
  nouveau: '#8b5cf6',
};

// Canaux de communication
export const CHANNEL_COLORS = {
  email: '#3b82f6',
  sms: '#22c55e',
  whatsapp: '#25d366',
  appel: '#8b5cf6',
  visite: '#f97316',
};
