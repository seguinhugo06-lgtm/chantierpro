// ============================================
// CHANTIERPRO V3 - CONFIGURATION & TYPES
// ============================================

// tailwind.config.js - À mettre à la racine du projet
export const tailwindConfig = `
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#fff7ed',
          100: '#ffedd5',
          200: '#fed7aa',
          300: '#fdba74',
          400: '#fb923c',
          500: '#f97316',
          600: '#ea580c',
          700: '#c2410c',
          800: '#9a3412',
          900: '#7c2d12',
        },
        slate: {
          850: '#1a2234',
          950: '#0a0f1a',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      animation: {
        'slide-in': 'slideIn 0.3s ease-out',
        'fade-in': 'fadeIn 0.2s ease-out',
        'pulse-slow': 'pulse 3s infinite',
      },
      keyframes: {
        slideIn: {
          '0%': { transform: 'translateX(-100%)', opacity: 0 },
          '100%': { transform: 'translateX(0)', opacity: 1 },
        },
        fadeIn: {
          '0%': { opacity: 0 },
          '100%': { opacity: 1 },
        },
      },
    },
  },
  plugins: [],
}
`;

// ============================================
// TYPES & INTERFACES
// ============================================

/*
Types TypeScript (pour référence, le code sera en JS)

interface Chantier {
  id: string;
  numero: string;
  nom: string;
  client_id: string;
  adresse: string;
  description: string;
  date_debut: string;
  date_fin_prevue: string;
  date_fin_reelle?: string;
  budget_prevu: number;
  budget_reel: number;
  statut: 'prospect' | 'devis' | 'en_cours' | 'pause' | 'termine' | 'annule';
  progression: number; // 0-100
  priorite: 'basse' | 'normale' | 'haute' | 'urgente';
  created_at: string;
  updated_at: string;
}

interface Tache {
  id: string;
  chantier_id: string;
  titre: string;
  description: string;
  statut: 'a_faire' | 'en_cours' | 'en_attente' | 'termine';
  priorite: 'basse' | 'normale' | 'haute' | 'urgente';
  assignee_id?: string;
  date_debut?: string;
  date_fin?: string;
  duree_estimee?: number; // en heures
  duree_reelle?: number;
  ordre: number;
  created_at: string;
}

interface Materiau {
  id: string;
  nom: string;
  reference: string;
  categorie: string;
  unite: string;
  quantite_stock: number;
  seuil_alerte: number;
  prix_unitaire: number;
  fournisseur_id?: string;
}

interface Pointage {
  id: string;
  user_id: string;
  chantier_id: string;
  date: string;
  heure_debut: string;
  heure_fin: string;
  pause_minutes: number;
  notes?: string;
  valide: boolean;
}

interface Document {
  id: string;
  chantier_id: string;
  type: 'photo' | 'plan' | 'permis' | 'rapport' | 'autre';
  nom: string;
  url: string;
  categorie?: 'avant' | 'pendant' | 'apres';
  created_at: string;
}
*/

// ============================================
// CONSTANTES GLOBALES
// ============================================

export const STATUTS_CHANTIER = {
  prospect: { label: 'Prospect', color: 'bg-slate-500', icon: '🎯' },
  devis: { label: 'Devis envoyé', color: 'bg-blue-500', icon: '📄' },
  en_cours: { label: 'En cours', color: 'bg-green-500', icon: '🔨' },
  pause: { label: 'En pause', color: 'bg-yellow-500', icon: '⏸️' },
  termine: { label: 'Terminé', color: 'bg-emerald-600', icon: '✅' },
  annule: { label: 'Annulé', color: 'bg-red-500', icon: '❌' },
};

export const STATUTS_TACHE = {
  a_faire: { label: 'À faire', color: 'bg-slate-400' },
  en_cours: { label: 'En cours', color: 'bg-blue-500' },
  en_attente: { label: 'En attente', color: 'bg-yellow-500' },
  termine: { label: 'Terminé', color: 'bg-green-500' },
};

export const PRIORITES = {
  basse: { label: 'Basse', color: 'text-slate-500', bg: 'bg-slate-100' },
  normale: { label: 'Normale', color: 'text-blue-600', bg: 'bg-blue-50' },
  haute: { label: 'Haute', color: 'text-orange-600', bg: 'bg-orange-50' },
  urgente: { label: 'Urgente', color: 'text-red-600', bg: 'bg-red-50' },
};

export const UNITES = [
  { value: 'unite', label: 'Unité' },
  { value: 'heure', label: 'Heure' },
  { value: 'jour', label: 'Jour' },
  { value: 'm2', label: 'm²' },
  { value: 'm3', label: 'm³' },
  { value: 'ml', label: 'ml' },
  { value: 'kg', label: 'kg' },
  { value: 'forfait', label: 'Forfait' },
];

export const CATEGORIES_MATERIAUX = [
  'Plomberie',
  'Électricité', 
  'Maçonnerie',
  'Peinture',
  'Menuiserie',
  'Outillage',
  'Consommables',
  'Autre',
];
