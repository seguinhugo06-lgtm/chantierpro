/**
 * Couleurs sémantiques centralisées — BatiGesti Design System
 */

// Score client
export const CLIENT_SCORE_COLORS = {
  vip: { hex: '#f59e0b', bg: 'bg-amber-500', text: 'text-amber-500', label: 'VIP' },
  regulier: { hex: '#10b981', bg: 'bg-emerald-500', text: 'text-emerald-500', label: 'Régulier' },
  occasionnel: { hex: '#3b82f6', bg: 'bg-blue-500', text: 'text-blue-500', label: 'Occasionnel' },
  dormant: { hex: '#ef4444', bg: 'bg-red-500', text: 'text-red-500', label: 'Dormant' },
  nouveau: { hex: '#8b5cf6', bg: 'bg-violet-500', text: 'text-violet-500', label: 'Nouveau' },
};

// Canaux de communication
export const CHANNEL_COLORS = {
  email: { hex: '#3b82f6', bg: 'bg-blue-500', text: 'text-blue-500' },
  sms: { hex: '#22c55e', bg: 'bg-green-500', text: 'text-green-500' },
  whatsapp: { hex: '#25d366', bg: 'bg-emerald-500', text: 'text-emerald-500' },
  appel: { hex: '#8b5cf6', bg: 'bg-violet-500', text: 'text-violet-500' },
  visite: { hex: '#f97316', bg: 'bg-orange-500', text: 'text-orange-500' },
};

// Marge
export const MARGE_COLORS = {
  excellente: { hex: '#8b5cf6', label: 'Excellente', min: 60 },
  bonne: { hex: '#16a34a', label: 'Bonne', min: 40 },
  correcte: { hex: '#22c55e', label: 'Correcte', min: 25 },
  faible: { hex: '#f59e0b', label: 'Faible', min: 0 },
  negative: { hex: '#ef4444', label: 'Négative', min: -Infinity },
};

// Stock
export const STOCK_COLORS = {
  ok: { hex: '#22c55e', label: 'OK' },
  bas: { hex: '#f59e0b', label: 'Bas' },
  epuise: { hex: '#94a3b8', label: 'Rupture' },
};

// Rôles équipe
export const ROLE_COLORS = {
  ouvrier: '#f59e0b',
  chef_equipe: '#6366f1',
  apprenti: '#eab308',
  conducteur: '#3b82f6',
  interimaire: '#8b5cf6',
};

// Types de congé
export const CONGE_TYPE_COLORS = {
  cp: '#3b82f6',
  rtt: '#8b5cf6',
  maladie: '#ef4444',
  sans_solde: '#64748b',
  formation: '#f59e0b',
  autre: '#6b7280',
};

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

// Statuts commande fournisseur
export const COMMANDE_STATUS_COLORS = {
  brouillon: { bg: 'bg-slate-100', text: 'text-slate-600', hex: '#94a3b8' },
  envoyee: { bg: 'bg-blue-50', text: 'text-blue-700', hex: '#3b82f6' },
  confirmee: { bg: 'bg-emerald-50', text: 'text-emerald-700', hex: '#10b981' },
  livree: { bg: 'bg-cyan-50', text: 'text-cyan-700', hex: '#06b6d4' },
  annulee: { bg: 'bg-red-50', text: 'text-red-700', hex: '#ef4444' },
  partielle: { bg: 'bg-amber-50', text: 'text-amber-700', hex: '#f59e0b' },
};

// Corps de métier
export const CORPS_METIER_COLORS = {
  gros_oeuvre: { hex: '#a16207', label: 'Gros oeuvre' },
  electricite: { hex: '#eab308', label: 'Electricite' },
  plomberie: { hex: '#3b82f6', label: 'Plomberie' },
  menuiserie: { hex: '#92400e', label: 'Menuiserie' },
  peinture: { hex: '#8b5cf6', label: 'Peinture' },
  carrelage: { hex: '#78716c', label: 'Carrelage' },
  platrerie: { hex: '#d4d4d8', label: 'Platrerie' },
  couverture: { hex: '#6b7280', label: 'Couverture' },
  chauffage: { hex: '#ef4444', label: 'Chauffage' },
  isolation: { hex: '#22c55e', label: 'Isolation' },
  terrassement: { hex: '#854d0e', label: 'Terrassement' },
  autre: { hex: '#64748b', label: 'Autre' },
};
