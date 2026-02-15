/**
 * BibliothequeOuvrages.jsx
 *
 * Bibliothèque d'Ouvrages pour ChantierPro - Gestion BTP
 *
 * Composant permettant de créer et gérer des ouvrages composites
 * (assemblages de matériaux, main d'oeuvre, sous-traitance et location)
 * avec calcul automatique du prix de revient, coefficient de vente
 * et marge brute. Les ouvrages sont réutilisables dans les devis.
 *
 * Props:
 *   - catalogue: Array des articles du catalogue (matériaux)
 *   - ouvrages: Array des ouvrages existants
 *   - setOuvrages: Setter pour mettre à jour les ouvrages (optionnel)
 *   - isDark: Boolean pour le mode sombre
 *   - couleur: Couleur de marque (ex: '#f97316')
 *
 * Données persistées dans localStorage sous la clé 'cp_ouvrages'.
 */
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Package, Plus, Search, Edit3, Trash2, Copy, Star, X, Save,
  ChevronDown, ChevronUp, Layers, Hammer, Wrench, Truck, Clock,
  BookTemplate, Zap, Droplets, Building, Paintbrush, DoorOpen,
  ThermometerSun, Home, TreePine
} from 'lucide-react';
import { generateId } from '../../lib/utils';
import { toast } from '../../stores/toastStore';
import useConfirm from '../../hooks/useConfirm';

const STORAGE_KEY = 'cp_ouvrages';

const UNITES = [
  { value: 'u', label: 'Unité (u)' },
  { value: 'm²', label: 'Mètre carré (m²)' },
  { value: 'ml', label: 'Mètre linéaire (ml)' },
  { value: 'h', label: 'Heure (h)' },
  { value: 'forfait', label: 'Forfait' },
];

const CATEGORIES = [
  'Tous', 'Gros oeuvre', 'Second oeuvre', 'Plomberie', 'Électricité',
  'Carrelage', 'Peinture', 'Menuiserie', 'Isolation', 'Toiture',
  'Aménagement extérieur', 'Autre'
];

const TYPES_COMPOSANT = [
  { value: 'materiau', label: 'Matériau', icon: Package, color: 'blue' },
  { value: 'main_oeuvre', label: "Main d'oeuvre", icon: Hammer, color: 'amber' },
  { value: 'sous_traitance', label: 'Sous-traitance', icon: Wrench, color: 'purple' },
  { value: 'location', label: 'Location', icon: Truck, color: 'emerald' },
];

// ---------- Templates prédéfinis par corps de métier ----------
const TEMPLATES_OUVRAGES = [
  {
    trade: 'Plomberie',
    icon: Droplets,
    color: '#3b82f6',
    templates: [
      {
        designation: 'Pose lavabo avec robinetterie',
        description: 'Fourniture et pose d\'un lavabo céramique avec mitigeur, raccordements eau chaude/froide et évacuation',
        unite: 'u',
        categorie: 'Plomberie',
        difficulte: 2,
        tempsPoseHeures: 3,
        coefficientVente: 1.35,
        composants: [
          { type: 'materiau', description: 'Lavabo céramique', quantite: 1, prixUnitaire: 85, unite: 'u' },
          { type: 'materiau', description: 'Mitigeur lavabo', quantite: 1, prixUnitaire: 55, unite: 'u' },
          { type: 'materiau', description: 'Kit raccordement (flexibles, siphon, joints)', quantite: 1, prixUnitaire: 25, unite: 'u' },
          { type: 'main_oeuvre', description: 'Plombier qualifié', quantite: 3, prixUnitaire: 45, unite: 'h' },
        ],
      },
      {
        designation: 'Pose WC suspendu avec bâti-support',
        description: 'Fourniture et pose WC suspendu avec bâti-support encastré, raccordement et mise en service',
        unite: 'u',
        categorie: 'Plomberie',
        difficulte: 3,
        tempsPoseHeures: 5,
        coefficientVente: 1.30,
        composants: [
          { type: 'materiau', description: 'Bâti-support WC suspendu', quantite: 1, prixUnitaire: 180, unite: 'u' },
          { type: 'materiau', description: 'Cuvette céramique + abattant', quantite: 1, prixUnitaire: 150, unite: 'u' },
          { type: 'materiau', description: 'Plaque de commande double chasse', quantite: 1, prixUnitaire: 45, unite: 'u' },
          { type: 'materiau', description: 'Kit raccordement (pipe, manchette, joint)', quantite: 1, prixUnitaire: 20, unite: 'u' },
          { type: 'main_oeuvre', description: 'Plombier qualifié', quantite: 5, prixUnitaire: 45, unite: 'h' },
        ],
      },
      {
        designation: 'Installation chauffe-eau électrique 200L',
        description: 'Fourniture et pose chauffe-eau électrique 200L mural, raccordement hydraulique et électrique',
        unite: 'u',
        categorie: 'Plomberie',
        difficulte: 3,
        tempsPoseHeures: 4,
        coefficientVente: 1.30,
        composants: [
          { type: 'materiau', description: 'Chauffe-eau électrique 200L', quantite: 1, prixUnitaire: 350, unite: 'u' },
          { type: 'materiau', description: 'Groupe de sécurité + siphon', quantite: 1, prixUnitaire: 35, unite: 'u' },
          { type: 'materiau', description: 'Kit raccordement (flexibles, réducteur pression)', quantite: 1, prixUnitaire: 40, unite: 'u' },
          { type: 'main_oeuvre', description: 'Plombier qualifié', quantite: 4, prixUnitaire: 45, unite: 'h' },
        ],
      },
    ],
  },
  {
    trade: 'Électricité',
    icon: Zap,
    color: '#eab308',
    templates: [
      {
        designation: 'Point lumineux avec interrupteur',
        description: 'Création d\'un point lumineux : tirage de câbles, pose interrupteur, boîte DCL, raccordement tableau',
        unite: 'u',
        categorie: 'Électricité',
        difficulte: 2,
        tempsPoseHeures: 2,
        coefficientVente: 1.40,
        composants: [
          { type: 'materiau', description: 'Câble R2V 3G1.5mm² (10m)', quantite: 10, prixUnitaire: 1.2, unite: 'ml' },
          { type: 'materiau', description: 'Interrupteur complet', quantite: 1, prixUnitaire: 12, unite: 'u' },
          { type: 'materiau', description: 'Boîte DCL + douille', quantite: 1, prixUnitaire: 8, unite: 'u' },
          { type: 'materiau', description: 'Gaine ICTA 20mm (10m)', quantite: 10, prixUnitaire: 0.8, unite: 'ml' },
          { type: 'main_oeuvre', description: 'Électricien qualifié', quantite: 2, prixUnitaire: 45, unite: 'h' },
        ],
      },
      {
        designation: 'Prise de courant 16A',
        description: 'Création d\'une prise de courant 16A : tirage de câbles, encastrement, raccordement tableau',
        unite: 'u',
        categorie: 'Électricité',
        difficulte: 2,
        tempsPoseHeures: 1.5,
        coefficientVente: 1.40,
        composants: [
          { type: 'materiau', description: 'Câble R2V 3G2.5mm² (10m)', quantite: 10, prixUnitaire: 1.5, unite: 'ml' },
          { type: 'materiau', description: 'Prise 16A complète', quantite: 1, prixUnitaire: 10, unite: 'u' },
          { type: 'materiau', description: 'Gaine ICTA 20mm (10m)', quantite: 10, prixUnitaire: 0.8, unite: 'ml' },
          { type: 'materiau', description: 'Boîte d\'encastrement', quantite: 1, prixUnitaire: 2, unite: 'u' },
          { type: 'main_oeuvre', description: 'Électricien qualifié', quantite: 1.5, prixUnitaire: 45, unite: 'h' },
        ],
      },
      {
        designation: 'Tableau électrique 2 rangées',
        description: 'Fourniture et pose tableau 2 rangées, disjoncteur de branchement, différentiels, disjoncteurs divisionnaires',
        unite: 'u',
        categorie: 'Électricité',
        difficulte: 4,
        tempsPoseHeures: 8,
        coefficientVente: 1.35,
        composants: [
          { type: 'materiau', description: 'Coffret 2 rangées + accessoires', quantite: 1, prixUnitaire: 65, unite: 'u' },
          { type: 'materiau', description: 'Interrupteur différentiel 40A 30mA (x2)', quantite: 2, prixUnitaire: 45, unite: 'u' },
          { type: 'materiau', description: 'Disjoncteurs divisionnaires (lot 10)', quantite: 1, prixUnitaire: 80, unite: 'u' },
          { type: 'materiau', description: 'Peigne de raccordement + bornes', quantite: 1, prixUnitaire: 25, unite: 'u' },
          { type: 'main_oeuvre', description: 'Électricien qualifié', quantite: 8, prixUnitaire: 45, unite: 'h' },
        ],
      },
    ],
  },
  {
    trade: 'Maçonnerie',
    icon: Building,
    color: '#78716c',
    templates: [
      {
        designation: 'Mur en parpaings 20cm (au m²)',
        description: 'Montage mur en parpaings creux 20x20x50, mortier, ferraillage vertical tous les 1m, arase',
        unite: 'm²',
        categorie: 'Gros oeuvre',
        difficulte: 3,
        tempsPoseHeures: 1.5,
        coefficientVente: 1.30,
        composants: [
          { type: 'materiau', description: 'Parpaings creux 20x20x50', quantite: 10, prixUnitaire: 1.5, unite: 'u' },
          { type: 'materiau', description: 'Mortier (sac 25kg)', quantite: 0.5, prixUnitaire: 8, unite: 'u' },
          { type: 'materiau', description: 'Fer à béton HA10', quantite: 1.5, prixUnitaire: 2, unite: 'ml' },
          { type: 'main_oeuvre', description: 'Maçon qualifié', quantite: 1.5, prixUnitaire: 42, unite: 'h' },
          { type: 'main_oeuvre', description: 'Manoeuvre', quantite: 0.75, prixUnitaire: 30, unite: 'h' },
        ],
      },
      {
        designation: 'Dalle béton 15cm (au m²)',
        description: 'Coulage dalle béton armé épaisseur 15cm, treillis soudé, coffrage périphérique',
        unite: 'm²',
        categorie: 'Gros oeuvre',
        difficulte: 3,
        tempsPoseHeures: 1,
        coefficientVente: 1.30,
        composants: [
          { type: 'materiau', description: 'Béton C25/30 (0.15 m³/m²)', quantite: 0.15, prixUnitaire: 120, unite: 'm³' },
          { type: 'materiau', description: 'Treillis soudé ST25C', quantite: 1.1, prixUnitaire: 5, unite: 'm²' },
          { type: 'materiau', description: 'Film polyane + cales', quantite: 1.1, prixUnitaire: 1.5, unite: 'm²' },
          { type: 'main_oeuvre', description: 'Maçon qualifié', quantite: 0.5, prixUnitaire: 42, unite: 'h' },
          { type: 'main_oeuvre', description: 'Manoeuvre', quantite: 0.5, prixUnitaire: 30, unite: 'h' },
          { type: 'location', description: 'Pompe à béton (quote-part)', quantite: 1, prixUnitaire: 5, unite: 'm²' },
        ],
      },
    ],
  },
  {
    trade: 'Carrelage',
    icon: Layers,
    color: '#06b6d4',
    templates: [
      {
        designation: 'Pose carrelage sol 60x60 (au m²)',
        description: 'Fourniture et pose carrelage grès cérame 60x60, colle, joints, primaire d\'accrochage',
        unite: 'm²',
        categorie: 'Carrelage',
        difficulte: 3,
        tempsPoseHeures: 1,
        coefficientVente: 1.35,
        composants: [
          { type: 'materiau', description: 'Carrelage grès cérame 60x60', quantite: 1.1, prixUnitaire: 25, unite: 'm²' },
          { type: 'materiau', description: 'Colle à carrelage (sac 25kg)', quantite: 0.2, prixUnitaire: 15, unite: 'u' },
          { type: 'materiau', description: 'Joint carrelage (sac 5kg)', quantite: 0.1, prixUnitaire: 12, unite: 'u' },
          { type: 'materiau', description: 'Primaire d\'accrochage', quantite: 0.15, prixUnitaire: 18, unite: 'L' },
          { type: 'materiau', description: 'Croisillons + cales', quantite: 1, prixUnitaire: 1, unite: 'u' },
          { type: 'main_oeuvre', description: 'Carreleur qualifié', quantite: 1, prixUnitaire: 45, unite: 'h' },
        ],
      },
      {
        designation: 'Faïence murale 30x60 (au m²)',
        description: 'Fourniture et pose faïence murale 30x60, colle, joints, primaire',
        unite: 'm²',
        categorie: 'Carrelage',
        difficulte: 3,
        tempsPoseHeures: 1.2,
        coefficientVente: 1.35,
        composants: [
          { type: 'materiau', description: 'Faïence murale 30x60', quantite: 1.1, prixUnitaire: 20, unite: 'm²' },
          { type: 'materiau', description: 'Colle carrelage mural (sac 25kg)', quantite: 0.2, prixUnitaire: 16, unite: 'u' },
          { type: 'materiau', description: 'Joint fin (sac 5kg)', quantite: 0.1, prixUnitaire: 14, unite: 'u' },
          { type: 'materiau', description: 'Profilé de finition alu', quantite: 0.5, prixUnitaire: 8, unite: 'ml' },
          { type: 'main_oeuvre', description: 'Carreleur qualifié', quantite: 1.2, prixUnitaire: 45, unite: 'h' },
        ],
      },
    ],
  },
  {
    trade: 'Peinture',
    icon: Paintbrush,
    color: '#f43f5e',
    templates: [
      {
        designation: 'Peinture murs et plafonds (au m²)',
        description: 'Préparation des supports, sous-couche + 2 couches finition acrylique mate, murs et plafonds',
        unite: 'm²',
        categorie: 'Peinture',
        difficulte: 2,
        tempsPoseHeures: 0.3,
        coefficientVente: 1.40,
        composants: [
          { type: 'materiau', description: 'Peinture acrylique mate (0.15L/m²/couche x3)', quantite: 0.45, prixUnitaire: 8, unite: 'L' },
          { type: 'materiau', description: 'Enduit de rebouchage', quantite: 0.05, prixUnitaire: 12, unite: 'kg' },
          { type: 'materiau', description: 'Bâche + adhésif masquage', quantite: 0.1, prixUnitaire: 5, unite: 'u' },
          { type: 'main_oeuvre', description: 'Peintre qualifié', quantite: 0.3, prixUnitaire: 40, unite: 'h' },
        ],
      },
    ],
  },
  {
    trade: 'Menuiserie',
    icon: DoorOpen,
    color: '#a855f7',
    templates: [
      {
        designation: 'Pose porte intérieure bloc-porte',
        description: 'Fourniture et pose bloc-porte intérieur 83cm, huisserie bois, poignées, finitions',
        unite: 'u',
        categorie: 'Menuiserie',
        difficulte: 2,
        tempsPoseHeures: 2,
        coefficientVente: 1.35,
        composants: [
          { type: 'materiau', description: 'Bloc-porte intérieur 83cm pré-peint', quantite: 1, prixUnitaire: 120, unite: 'u' },
          { type: 'materiau', description: 'Poignées + serrure', quantite: 1, prixUnitaire: 25, unite: 'u' },
          { type: 'materiau', description: 'Mousse PU + vis fixation', quantite: 1, prixUnitaire: 8, unite: 'u' },
          { type: 'main_oeuvre', description: 'Menuisier qualifié', quantite: 2, prixUnitaire: 42, unite: 'h' },
        ],
      },
      {
        designation: 'Pose fenêtre PVC double vitrage',
        description: 'Fourniture et pose fenêtre PVC 2 vantaux 120x135, double vitrage, finitions intérieures',
        unite: 'u',
        categorie: 'Menuiserie',
        difficulte: 3,
        tempsPoseHeures: 3,
        coefficientVente: 1.30,
        composants: [
          { type: 'materiau', description: 'Fenêtre PVC 2 vantaux 120x135 DV', quantite: 1, prixUnitaire: 280, unite: 'u' },
          { type: 'materiau', description: 'Kit calfeutrement (mousse, silicone, compriband)', quantite: 1, prixUnitaire: 15, unite: 'u' },
          { type: 'materiau', description: 'Tapée + habillage intérieur', quantite: 1, prixUnitaire: 30, unite: 'u' },
          { type: 'main_oeuvre', description: 'Menuisier qualifié', quantite: 3, prixUnitaire: 42, unite: 'h' },
        ],
      },
    ],
  },
  {
    trade: 'Isolation',
    icon: ThermometerSun,
    color: '#22c55e',
    templates: [
      {
        designation: 'Isolation murs intérieurs laine minérale (au m²)',
        description: 'Pose isolant laine de verre 120mm + plaque de plâtre BA13, ossature métallique',
        unite: 'm²',
        categorie: 'Isolation',
        difficulte: 2,
        tempsPoseHeures: 0.5,
        coefficientVente: 1.35,
        composants: [
          { type: 'materiau', description: 'Laine de verre GR32 120mm', quantite: 1.05, prixUnitaire: 8, unite: 'm²' },
          { type: 'materiau', description: 'Plaque BA13 standard', quantite: 1.05, prixUnitaire: 4.5, unite: 'm²' },
          { type: 'materiau', description: 'Rail + montant métallique', quantite: 1.5, prixUnitaire: 2.5, unite: 'ml' },
          { type: 'materiau', description: 'Vis, bande, enduit à joint', quantite: 1, prixUnitaire: 2, unite: 'm²' },
          { type: 'main_oeuvre', description: 'Plaquiste qualifié', quantite: 0.5, prixUnitaire: 42, unite: 'h' },
        ],
      },
    ],
  },
  {
    trade: 'Toiture',
    icon: Home,
    color: '#dc2626',
    templates: [
      {
        designation: 'Couverture tuiles mécaniques (au m²)',
        description: 'Pose tuiles mécaniques terre cuite sur liteaux, faîtières, rives, closoir ventilé',
        unite: 'm²',
        categorie: 'Toiture',
        difficulte: 4,
        tempsPoseHeures: 0.8,
        coefficientVente: 1.30,
        composants: [
          { type: 'materiau', description: 'Tuiles mécaniques terre cuite', quantite: 12, prixUnitaire: 1.2, unite: 'u' },
          { type: 'materiau', description: 'Liteaux sapin 27x40mm', quantite: 3, prixUnitaire: 1.5, unite: 'ml' },
          { type: 'materiau', description: 'Écran sous-toiture HPV', quantite: 1.1, prixUnitaire: 3, unite: 'm²' },
          { type: 'materiau', description: 'Clous, crochets, accessoires', quantite: 1, prixUnitaire: 2, unite: 'm²' },
          { type: 'main_oeuvre', description: 'Couvreur qualifié', quantite: 0.8, prixUnitaire: 45, unite: 'h' },
        ],
      },
    ],
  },
  {
    trade: 'Extérieur',
    icon: TreePine,
    color: '#65a30d',
    templates: [
      {
        designation: 'Terrasse bois composite (au m²)',
        description: 'Fourniture et pose lames composites sur lambourdes, plots réglables, finitions',
        unite: 'm²',
        categorie: 'Aménagement extérieur',
        difficulte: 3,
        tempsPoseHeures: 1,
        coefficientVente: 1.35,
        composants: [
          { type: 'materiau', description: 'Lames composites 2400x150mm', quantite: 5, prixUnitaire: 8, unite: 'u' },
          { type: 'materiau', description: 'Lambourdes composites', quantite: 3, prixUnitaire: 4.5, unite: 'ml' },
          { type: 'materiau', description: 'Plots réglables', quantite: 5, prixUnitaire: 3.5, unite: 'u' },
          { type: 'materiau', description: 'Clips fixation inox', quantite: 20, prixUnitaire: 0.3, unite: 'u' },
          { type: 'main_oeuvre', description: 'Poseur qualifié', quantite: 1, prixUnitaire: 42, unite: 'h' },
        ],
      },
    ],
  },
];

const formatEUR = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' });

function generateReference(existingOuvrages) {
  const maxNum = existingOuvrages.reduce((max, o) => {
    const match = o.reference?.match(/^REF-(\d+)$/);
    return match ? Math.max(max, parseInt(match[1], 10)) : max;
  }, 0);
  return `REF-${String(maxNum + 1).padStart(3, '0')}`;
}

function createEmptyComposant() {
  return {
    id: generateId('comp'),
    type: 'materiau',
    catalogueId: null,
    description: '',
    quantite: 1,
    prixUnitaire: 0,
    unite: 'u',
  };
}

function createEmptyOuvrage(existingOuvrages) {
  return {
    id: '',
    reference: generateReference(existingOuvrages),
    designation: '',
    description: '',
    unite: 'u',
    categorie: 'Autre',
    composants: [createEmptyComposant()],
    prixRevientHT: 0,
    coefficientVente: 1.3,
    prixVenteHT: 0,
    tempsPoseHeures: 0,
    difficulte: 1,
    actif: true,
  };
}

function computePrixRevient(composants) {
  return composants.reduce((sum, c) => sum + (c.quantite || 0) * (c.prixUnitaire || 0), 0);
}

function computeMargePercent(prixRevient, prixVente) {
  if (!prixVente || prixVente === 0) return 0;
  return ((prixVente - prixRevient) / prixVente) * 100;
}

// ---------- Difficulty Dots Component ----------
function DifficultyDots({ value, onChange, couleur, isDark, readOnly = false }) {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((level) => (
        <button
          key={level}
          type="button"
          disabled={readOnly}
          onClick={() => onChange?.(level)}
          className={`w-5 h-5 rounded-full border-2 transition-all ${
            readOnly ? 'cursor-default' : 'cursor-pointer hover:scale-110'
          }`}
          style={{
            borderColor: level <= value ? couleur : (isDark ? '#475569' : '#cbd5e1'),
            backgroundColor: level <= value ? couleur : 'transparent',
          }}
          title={`Difficulté ${level}/5`}
        />
      ))}
    </div>
  );
}

// ---------- Type Badge Component ----------
function TypeBadge({ type, isDark }) {
  const config = TYPES_COMPOSANT.find(t => t.value === type) || TYPES_COMPOSANT[0];
  const Icon = config.icon;
  const colorMap = {
    blue: isDark ? 'bg-blue-900/40 text-blue-300' : 'bg-blue-50 text-blue-700',
    amber: isDark ? 'bg-amber-900/40 text-amber-300' : 'bg-amber-50 text-amber-700',
    purple: isDark ? 'bg-purple-900/40 text-purple-300' : 'bg-purple-50 text-purple-700',
    emerald: isDark ? 'bg-emerald-900/40 text-emerald-300' : 'bg-emerald-50 text-emerald-700',
  };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium ${colorMap[config.color]}`}>
      <Icon size={12} />
      {config.label}
    </span>
  );
}

// ============================================================
// Main Component
// ============================================================
export default function BibliothequeOuvrages({ catalogue = [], ouvrages: ouvragesProp, setOuvrages: setOuvragesProp, isDark, couleur }) {
  const { confirm, ConfirmDialog } = useConfirm();
  // ---------- Theme classes ----------
  const cardBg = isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200';
  const inputBg = isDark ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400' : 'bg-white border-slate-300';
  const textPrimary = isDark ? 'text-slate-100' : 'text-slate-900';
  const textSecondary = isDark ? 'text-slate-300' : 'text-slate-600';
  const textMuted = isDark ? 'text-slate-400' : 'text-slate-500';

  // ---------- State ----------
  const [localOuvrages, setLocalOuvrages] = useState(() => {
    if (ouvragesProp) return ouvragesProp;
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const ouvrages = ouvragesProp ?? localOuvrages;
  const setOuvrages = setOuvragesProp ?? setLocalOuvrages;

  // Sync with prop changes
  useEffect(() => {
    if (ouvragesProp) {
      setLocalOuvrages(ouvragesProp);
    }
  }, [ouvragesProp]);

  // Persist to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(ouvrages));
    } catch {
      // Storage full or unavailable
    }
  }, [ouvrages]);

  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('Tous');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'list'
  const [editingOuvrage, setEditingOuvrage] = useState(null); // null = list view, object = editing
  const [expandedComposants, setExpandedComposants] = useState(true);
  const [showTemplates, setShowTemplates] = useState(false);
  const [templateTradeFilter, setTemplateTradeFilter] = useState(null);

  // ---------- Filtered list ----------
  const categories = useMemo(() => {
    const cats = new Set(ouvrages.map(o => o.categorie).filter(Boolean));
    return ['Tous', ...Array.from(cats).sort()];
  }, [ouvrages]);

  const filtered = useMemo(() => {
    return ouvrages.filter(o => {
      const matchCat = catFilter === 'Tous' || o.categorie === catFilter;
      const matchSearch = !search ||
        o.designation?.toLowerCase().includes(search.toLowerCase()) ||
        o.reference?.toLowerCase().includes(search.toLowerCase()) ||
        o.description?.toLowerCase().includes(search.toLowerCase());
      return matchCat && matchSearch;
    });
  }, [ouvrages, catFilter, search]);

  // ---------- Handlers ----------
  const handleCreate = useCallback(() => {
    const newOuvrage = createEmptyOuvrage(ouvrages);
    setEditingOuvrage(newOuvrage);
  }, [ouvrages]);

  const handleEdit = useCallback((ouvrage) => {
    setEditingOuvrage({ ...ouvrage, composants: ouvrage.composants.map(c => ({ ...c })) });
  }, []);

  const handleDuplicate = useCallback((ouvrage) => {
    const duplicate = {
      ...ouvrage,
      id: generateId('ouv'),
      reference: generateReference(ouvrages),
      designation: `${ouvrage.designation} (copie)`,
      composants: ouvrage.composants.map(c => ({ ...c, id: generateId('comp') })),
    };
    setOuvrages([...ouvrages, duplicate]);
  }, [ouvrages, setOuvrages]);

  const handleDelete = useCallback(async (id) => {
    const ouvrage = ouvrages.find(o => o.id === id);
    if (!ouvrage) return;
    if (await confirm(`Supprimer l'ouvrage "${ouvrage.designation}" ?`)) {
      setOuvrages(ouvrages.filter(o => o.id !== id));
    }
  }, [ouvrages, setOuvrages, confirm]);

  const handleSave = useCallback(() => {
    if (!editingOuvrage) return;
    if (!editingOuvrage.designation.trim()) {
      toast.warning('La désignation est obligatoire');
      return;
    }

    const prixRevient = computePrixRevient(editingOuvrage.composants);
    const prixVente = prixRevient * editingOuvrage.coefficientVente;

    const saved = {
      ...editingOuvrage,
      id: editingOuvrage.id || generateId('ouv'),
      designation: editingOuvrage.designation.trim(),
      description: editingOuvrage.description.trim(),
      prixRevientHT: prixRevient,
      prixVenteHT: prixVente,
    };

    const exists = ouvrages.find(o => o.id === saved.id);
    if (exists) {
      setOuvrages(ouvrages.map(o => o.id === saved.id ? saved : o));
    } else {
      setOuvrages([...ouvrages, saved]);
    }
    setEditingOuvrage(null);
  }, [editingOuvrage, ouvrages, setOuvrages]);

  const handleCancel = useCallback(() => {
    setEditingOuvrage(null);
  }, []);

  const handleUseTemplate = useCallback((template) => {
    const newOuvrage = {
      ...createEmptyOuvrage(ouvrages),
      designation: template.designation,
      description: template.description,
      unite: template.unite,
      categorie: template.categorie,
      difficulte: template.difficulte,
      tempsPoseHeures: template.tempsPoseHeures,
      coefficientVente: template.coefficientVente,
      composants: template.composants.map(c => ({
        id: generateId('comp'),
        type: c.type,
        catalogueId: null,
        description: c.description,
        quantite: c.quantite,
        prixUnitaire: c.prixUnitaire,
        unite: c.unite,
      })),
    };
    setShowTemplates(false);
    setTemplateTradeFilter(null);
    setEditingOuvrage(newOuvrage);
  }, [ouvrages]);

  // ---------- Composant row handlers ----------
  const updateComposant = useCallback((compId, field, value) => {
    setEditingOuvrage(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        composants: prev.composants.map(c =>
          c.id === compId ? { ...c, [field]: value } : c
        ),
      };
    });
  }, []);

  const addComposant = useCallback(() => {
    setEditingOuvrage(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        composants: [...prev.composants, createEmptyComposant()],
      };
    });
  }, []);

  const removeComposant = useCallback((compId) => {
    setEditingOuvrage(prev => {
      if (!prev) return prev;
      if (prev.composants.length <= 1) return prev;
      return {
        ...prev,
        composants: prev.composants.filter(c => c.id !== compId),
      };
    });
  }, []);

  const handleCatalogueSelect = useCallback((compId, catalogueId) => {
    const item = catalogue.find(c => c.id === catalogueId);
    if (!item) return;
    setEditingOuvrage(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        composants: prev.composants.map(c =>
          c.id === compId
            ? {
                ...c,
                catalogueId,
                description: item.nom,
                prixUnitaire: item.prixAchat || item.prix || 0,
                unite: item.unite || 'u',
              }
            : c
        ),
      };
    });
  }, [catalogue]);

  // ---------- Computed values for editor ----------
  const editorPrixRevient = editingOuvrage ? computePrixRevient(editingOuvrage.composants) : 0;
  const editorPrixVente = editorPrixRevient * (editingOuvrage?.coefficientVente || 1.3);
  const editorMarge = computeMargePercent(editorPrixRevient, editorPrixVente);

  // ============================================================
  // RENDER: Edit/Create Modal
  // ============================================================
  if (editingOuvrage) {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={handleCancel}
              className={`p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl transition-colors ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-100'}`}
            >
              <X size={20} className={textPrimary} />
            </button>
            <h1 className={`text-2xl font-bold ${textPrimary}`}>
              {editingOuvrage.id ? 'Modifier l\'ouvrage' : 'Nouvel ouvrage'}
            </h1>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleCancel}
              className={`px-4 py-2.5 rounded-xl min-h-[44px] transition-colors ${isDark ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-slate-100 hover:bg-slate-200'}`}
            >
              Annuler
            </button>
            <button
              onClick={handleSave}
              className="px-6 py-2.5 text-white rounded-xl min-h-[44px] hover:shadow-lg transition-all flex items-center gap-2"
              style={{ background: couleur }}
            >
              <Save size={16} />
              Enregistrer
            </button>
          </div>
        </div>

        {/* General info */}
        <div className={`${cardBg} rounded-2xl border p-6`}>
          <h2 className={`text-lg font-semibold mb-4 flex items-center gap-2 ${textPrimary}`}>
            <Layers size={18} style={{ color: couleur }} />
            Informations générales
          </h2>
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className={`block text-sm font-medium mb-1 ${textPrimary}`}>Référence</label>
                <input
                  className={`w-full px-4 py-2.5 border rounded-xl ${inputBg} font-mono`}
                  value={editingOuvrage.reference}
                  onChange={e => setEditingOuvrage(prev => ({ ...prev, reference: e.target.value }))}
                />
              </div>
              <div className="sm:col-span-2 lg:col-span-3">
                <label className={`block text-sm font-medium mb-1 ${textPrimary}`}>Désignation *</label>
                <input
                  className={`w-full px-4 py-2.5 border rounded-xl ${inputBg}`}
                  value={editingOuvrage.designation}
                  onChange={e => setEditingOuvrage(prev => ({ ...prev, designation: e.target.value }))}
                  placeholder="Ex: Pose de carrelage sol 60x60"
                />
              </div>
            </div>
            <div>
              <label className={`block text-sm font-medium mb-1 ${textPrimary}`}>Description</label>
              <textarea
                className={`w-full px-4 py-2.5 border rounded-xl ${inputBg} resize-none`}
                rows={2}
                value={editingOuvrage.description}
                onChange={e => setEditingOuvrage(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Description détaillée de l'ouvrage..."
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className={`block text-sm font-medium mb-1 ${textPrimary}`}>Unité</label>
                <select
                  className={`w-full px-4 py-2.5 border rounded-xl ${inputBg}`}
                  value={editingOuvrage.unite}
                  onChange={e => setEditingOuvrage(prev => ({ ...prev, unite: e.target.value }))}
                >
                  {UNITES.map(u => <option key={u.value} value={u.value}>{u.label}</option>)}
                </select>
              </div>
              <div>
                <label className={`block text-sm font-medium mb-1 ${textPrimary}`}>Catégorie</label>
                <select
                  className={`w-full px-4 py-2.5 border rounded-xl ${inputBg}`}
                  value={editingOuvrage.categorie}
                  onChange={e => setEditingOuvrage(prev => ({ ...prev, categorie: e.target.value }))}
                >
                  {CATEGORIES.filter(c => c !== 'Tous').map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className={`block text-sm font-medium mb-1 ${textPrimary}`}>Difficulté</label>
                <div className="pt-2">
                  <DifficultyDots
                    value={editingOuvrage.difficulte}
                    onChange={v => setEditingOuvrage(prev => ({ ...prev, difficulte: v }))}
                    couleur={couleur}
                    isDark={isDark}
                  />
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={`block text-sm font-medium mb-1 ${textPrimary}`}>
                  <Clock size={14} className="inline mr-1" />
                  Temps de pose (heures)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  className={`w-full px-4 py-2.5 border rounded-xl ${inputBg}`}
                  value={editingOuvrage.tempsPoseHeures || ''}
                  onChange={e => setEditingOuvrage(prev => ({ ...prev, tempsPoseHeures: parseFloat(e.target.value) || 0 }))}
                  placeholder="0"
                />
              </div>
              <div className="flex items-end">
                <label className={`flex items-center gap-3 cursor-pointer py-2.5 ${textPrimary}`}>
                  <div className="relative">
                    <input
                      type="checkbox"
                      checked={editingOuvrage.actif}
                      onChange={e => setEditingOuvrage(prev => ({ ...prev, actif: e.target.checked }))}
                      className="sr-only peer"
                    />
                    <div className={`w-10 h-6 rounded-full transition-colors peer-checked:bg-emerald-500 ${isDark ? 'bg-slate-600' : 'bg-slate-300'}`} />
                    <div className="absolute left-0.5 top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform peer-checked:translate-x-4" />
                  </div>
                  <span className="text-sm">Ouvrage actif</span>
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Composants Table */}
        <div className={`${cardBg} rounded-2xl border`}>
          <div
            className={`flex items-center justify-between p-5 cursor-pointer ${isDark ? 'hover:bg-slate-700/50' : 'hover:bg-slate-50'} rounded-t-2xl transition-colors`}
            onClick={() => setExpandedComposants(!expandedComposants)}
          >
            <h2 className={`text-lg font-semibold flex items-center gap-2 ${textPrimary}`}>
              <Package size={18} style={{ color: couleur }} />
              Composants ({editingOuvrage.composants.length})
            </h2>
            {expandedComposants ? <ChevronUp size={20} className={textMuted} /> : <ChevronDown size={20} className={textMuted} />}
          </div>

          {expandedComposants && (
            <div className={`border-t ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
              <div className="overflow-x-auto">
                <table className="w-full text-sm" aria-label="Composants de l'ouvrage">
                  <thead className={isDark ? 'bg-slate-700/50' : 'bg-slate-50'}>
                    <tr>
                      <th scope="col" className={`text-left px-4 py-3 ${textPrimary}`}>Type</th>
                      <th scope="col" className={`text-left px-4 py-3 ${textPrimary}`}>Description</th>
                      <th scope="col" className={`text-right px-4 py-3 w-20 ${textPrimary}`}>Qté</th>
                      <th scope="col" className={`text-left px-4 py-3 w-20 ${textPrimary}`}>Unité</th>
                      <th scope="col" className={`text-right px-4 py-3 w-28 ${textPrimary}`}>P.U. HT</th>
                      <th scope="col" className={`text-right px-4 py-3 w-28 ${textPrimary}`}>Montant</th>
                      <th scope="col" className="w-12"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {editingOuvrage.composants.map((comp, idx) => {
                      const montant = (comp.quantite || 0) * (comp.prixUnitaire || 0);
                      return (
                        <tr key={comp.id} className={`border-t ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
                          <td className="px-4 py-3">
                            <select
                              className={`w-full px-2 py-1.5 border rounded-lg text-xs ${inputBg}`}
                              value={comp.type}
                              onChange={e => {
                                updateComposant(comp.id, 'type', e.target.value);
                                if (e.target.value !== 'materiau') {
                                  updateComposant(comp.id, 'catalogueId', null);
                                }
                              }}
                            >
                              {TYPES_COMPOSANT.map(t => (
                                <option key={t.value} value={t.value}>{t.label}</option>
                              ))}
                            </select>
                          </td>
                          <td className="px-4 py-3">
                            {comp.type === 'materiau' && catalogue.length > 0 ? (
                              <div className="space-y-1">
                                <select
                                  className={`w-full px-2 py-1.5 border rounded-lg text-xs ${inputBg}`}
                                  value={comp.catalogueId || ''}
                                  onChange={e => {
                                    if (e.target.value) {
                                      handleCatalogueSelect(comp.id, e.target.value);
                                    } else {
                                      updateComposant(comp.id, 'catalogueId', null);
                                    }
                                  }}
                                >
                                  <option value="">-- Saisie libre --</option>
                                  {catalogue.map(item => (
                                    <option key={item.id} value={item.id}>
                                      {item.nom} ({formatEUR.format(item.prixAchat || item.prix)}/{item.unite})
                                    </option>
                                  ))}
                                </select>
                                {!comp.catalogueId && (
                                  <input
                                    className={`w-full px-2 py-1.5 border rounded-lg text-xs ${inputBg}`}
                                    value={comp.description}
                                    onChange={e => updateComposant(comp.id, 'description', e.target.value)}
                                    placeholder="Description du matériau"
                                  />
                                )}
                              </div>
                            ) : (
                              <input
                                className={`w-full px-2 py-1.5 border rounded-lg text-xs ${inputBg}`}
                                value={comp.description}
                                onChange={e => updateComposant(comp.id, 'description', e.target.value)}
                                placeholder={
                                  comp.type === 'main_oeuvre' ? "Ex: Carreleur qualifié" :
                                  comp.type === 'sous_traitance' ? "Ex: Électricien sous-traitant" :
                                  comp.type === 'location' ? "Ex: Bétonnière 350L" :
                                  "Description"
                                }
                              />
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              className={`w-full px-2 py-1.5 border rounded-lg text-xs text-right ${inputBg}`}
                              value={comp.quantite}
                              onChange={e => updateComposant(comp.id, 'quantite', parseFloat(e.target.value) || 0)}
                            />
                          </td>
                          <td className="px-4 py-3">
                            <input
                              className={`w-full px-2 py-1.5 border rounded-lg text-xs ${inputBg}`}
                              value={comp.unite}
                              onChange={e => updateComposant(comp.id, 'unite', e.target.value)}
                              placeholder="u"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              className={`w-full px-2 py-1.5 border rounded-lg text-xs text-right ${inputBg}`}
                              value={comp.prixUnitaire}
                              onChange={e => updateComposant(comp.id, 'prixUnitaire', parseFloat(e.target.value) || 0)}
                            />
                          </td>
                          <td className={`px-4 py-3 text-right font-medium ${textPrimary}`}>
                            {formatEUR.format(montant)}
                          </td>
                          <td className="px-4 py-3">
                            <button
                              onClick={() => removeComposant(comp.id)}
                              disabled={editingOuvrage.composants.length <= 1}
                              className={`p-1.5 rounded-lg transition-colors ${
                                editingOuvrage.composants.length <= 1
                                  ? 'opacity-30 cursor-not-allowed'
                                  : isDark ? 'hover:bg-red-900/40 text-slate-400 hover:text-red-400' : 'hover:bg-red-50 text-slate-400 hover:text-red-600'
                              }`}
                              title="Supprimer ce composant"
                            >
                              <Trash2 size={14} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className={`px-4 py-3 border-t ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
                <button
                  onClick={addComposant}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${isDark ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-slate-100 hover:bg-slate-200 text-slate-600'}`}
                >
                  <Plus size={16} />
                  Ajouter un composant
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Summary Card */}
        <div className={`${cardBg} rounded-2xl border p-6`}>
          <h2 className={`text-lg font-semibold mb-4 ${textPrimary}`}>Récapitulatif des prix</h2>
          <div className="space-y-5">
            {/* Type breakdown */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {TYPES_COMPOSANT.map(type => {
                const total = editingOuvrage.composants
                  .filter(c => c.type === type.value)
                  .reduce((sum, c) => sum + (c.quantite || 0) * (c.prixUnitaire || 0), 0);
                const Icon = type.icon;
                return (
                  <div key={type.value} className={`p-3 rounded-xl ${isDark ? 'bg-slate-700/50' : 'bg-slate-50'}`}>
                    <div className={`flex items-center gap-1.5 mb-1 ${textMuted}`}>
                      <Icon size={14} />
                      <span className="text-xs">{type.label}</span>
                    </div>
                    <p className={`font-semibold ${textPrimary}`}>{formatEUR.format(total)}</p>
                  </div>
                );
              })}
            </div>

            <div className={`border-t pt-4 space-y-4 ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
              {/* Prix de revient */}
              <div className="flex items-center justify-between">
                <span className={`font-medium ${textPrimary}`}>Prix de revient HT</span>
                <span className={`text-lg font-bold ${textPrimary}`}>{formatEUR.format(editorPrixRevient)}</span>
              </div>

              {/* Coefficient */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className={`font-medium ${textPrimary}`}>Coefficient de vente</span>
                  <span className="font-mono font-bold text-lg" style={{ color: couleur }}>
                    x{editingOuvrage.coefficientVente.toFixed(2)}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-xs ${textMuted}`}>1.0</span>
                  <input
                    type="range"
                    min="1.0"
                    max="3.0"
                    step="0.05"
                    value={editingOuvrage.coefficientVente}
                    onChange={e => setEditingOuvrage(prev => ({ ...prev, coefficientVente: parseFloat(e.target.value) }))}
                    className="flex-1 h-2 rounded-lg appearance-none cursor-pointer"
                    style={{
                      background: `linear-gradient(to right, ${couleur} 0%, ${couleur} ${((editingOuvrage.coefficientVente - 1) / 2) * 100}%, ${isDark ? '#334155' : '#e2e8f0'} ${((editingOuvrage.coefficientVente - 1) / 2) * 100}%, ${isDark ? '#334155' : '#e2e8f0'} 100%)`,
                    }}
                  />
                  <span className={`text-xs ${textMuted}`}>3.0</span>
                </div>
              </div>

              {/* Prix de vente */}
              <div className={`flex items-center justify-between p-4 rounded-xl ${isDark ? 'bg-slate-700' : 'bg-slate-50'}`}>
                <span className={`font-semibold ${textPrimary}`}>Prix de vente HT</span>
                <span className="text-xl font-bold" style={{ color: couleur }}>
                  {formatEUR.format(editorPrixVente)}
                </span>
              </div>

              {/* Marge */}
              <div className="flex items-center justify-between">
                <span className={`font-medium ${textPrimary}`}>Marge brute</span>
                <span className={`font-bold text-lg ${
                  editorMarge >= 30 ? 'text-emerald-500' :
                  editorMarge >= 15 ? 'text-amber-500' :
                  'text-red-500'
                }`}>
                  {editorMarge.toFixed(1)}%
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ============================================================
  // RENDER: Template Picker
  // ============================================================
  if (showTemplates) {
    const filteredTemplates = templateTradeFilter
      ? TEMPLATES_OUVRAGES.filter(t => t.trade === templateTradeFilter)
      : TEMPLATES_OUVRAGES;

    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => { setShowTemplates(false); setTemplateTradeFilter(null); }}
              className={`p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl transition-colors ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-100'}`}
            >
              <X size={20} className={textPrimary} />
            </button>
            <div>
              <h1 className={`text-2xl font-bold ${textPrimary}`}>
                Templates d'ouvrages
              </h1>
              <p className={`text-sm ${textMuted}`}>Ouvrages types par corps de métier avec prix moyens du marché</p>
            </div>
          </div>
        </div>

        {/* Trade filter chips */}
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          <button
            onClick={() => setTemplateTradeFilter(null)}
            className={`whitespace-nowrap px-3 py-1.5 rounded-lg text-sm font-medium min-h-[36px] transition-colors ${
              !templateTradeFilter
                ? 'text-white shadow-sm'
                : isDark ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
            style={!templateTradeFilter ? { background: couleur } : {}}
          >
            Tous les métiers
          </button>
          {TEMPLATES_OUVRAGES.map(trade => {
            const Icon = trade.icon;
            return (
              <button
                key={trade.trade}
                onClick={() => setTemplateTradeFilter(trade.trade)}
                className={`whitespace-nowrap px-3 py-1.5 rounded-lg text-sm font-medium min-h-[36px] transition-colors flex items-center gap-1.5 ${
                  templateTradeFilter === trade.trade
                    ? 'text-white shadow-sm'
                    : isDark ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
                style={templateTradeFilter === trade.trade ? { background: trade.color } : {}}
              >
                <Icon size={14} />
                {trade.trade}
              </button>
            );
          })}
        </div>

        {/* Templates by trade */}
        {filteredTemplates.map(trade => {
          const TradeIcon = trade.icon;
          return (
            <div key={trade.trade} className="space-y-3">
              <h2 className={`text-lg font-semibold flex items-center gap-2 ${textPrimary}`}>
                <TradeIcon size={20} style={{ color: trade.color }} />
                {trade.trade}
                <span className={`text-sm font-normal ${textMuted}`}>({trade.templates.length} template{trade.templates.length > 1 ? 's' : ''})</span>
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {trade.templates.map((tpl, idx) => {
                  const prixRevient = tpl.composants.reduce((sum, c) => sum + c.quantite * c.prixUnitaire, 0);
                  const prixVente = prixRevient * tpl.coefficientVente;
                  const marge = computeMargePercent(prixRevient, prixVente);
                  return (
                    <div
                      key={idx}
                      className={`${cardBg} rounded-2xl border p-5 transition-all hover:shadow-lg group`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <h3 className={`font-semibold text-sm leading-snug ${textPrimary}`}>{tpl.designation}</h3>
                        <DifficultyDots value={tpl.difficulte} couleur={trade.color} isDark={isDark} readOnly />
                      </div>
                      <p className={`text-xs mb-3 line-clamp-2 ${textMuted}`}>{tpl.description}</p>

                      {/* Composants summary */}
                      <div className={`flex flex-wrap gap-1 mb-3`}>
                        {tpl.composants.map((c, ci) => (
                          <span key={ci} className={`text-xs px-1.5 py-0.5 rounded ${isDark ? 'bg-slate-700 text-slate-400' : 'bg-slate-100 text-slate-500'}`}>
                            {c.description.length > 20 ? c.description.substring(0, 20) + '…' : c.description}
                          </span>
                        ))}
                      </div>

                      {/* Price info */}
                      <div className={`p-3 rounded-xl mb-3 ${isDark ? 'bg-slate-700/50' : 'bg-slate-50'}`}>
                        <div className="flex items-center justify-between mb-1">
                          <span className={`text-xs ${textMuted}`}>Prix de revient</span>
                          <span className={`text-sm ${textSecondary}`}>{formatEUR.format(prixRevient)}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className={`text-xs ${textMuted}`}>Prix de vente HT</span>
                          <span className="text-sm font-bold" style={{ color: trade.color }}>{formatEUR.format(prixVente)}</span>
                        </div>
                        <div className={`flex items-center justify-between mt-1 pt-1 border-t ${isDark ? 'border-slate-600' : 'border-slate-200'}`}>
                          <span className={`text-xs ${textMuted}`}>Marge · Coeff x{tpl.coefficientVente.toFixed(2)}</span>
                          <span className={`text-sm font-bold ${marge >= 30 ? 'text-emerald-500' : marge >= 15 ? 'text-amber-500' : 'text-red-500'}`}>
                            {marge.toFixed(1)}%
                          </span>
                        </div>
                      </div>

                      {/* Meta + CTA */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className={`text-xs flex items-center gap-1 ${textMuted}`}>
                            <Package size={12} />
                            {tpl.composants.length}
                          </span>
                          {tpl.tempsPoseHeures > 0 && (
                            <span className={`text-xs flex items-center gap-1 ${textMuted}`}>
                              <Clock size={12} />
                              {tpl.tempsPoseHeures}h
                            </span>
                          )}
                          <span className={`text-xs ${textMuted}`}>/{tpl.unite}</span>
                        </div>
                        <button
                          onClick={() => handleUseTemplate(tpl)}
                          className="px-3 py-1.5 text-white rounded-lg text-xs font-medium hover:shadow-md transition-all flex items-center gap-1"
                          style={{ background: trade.color }}
                        >
                          <Plus size={12} />
                          Utiliser
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  // ============================================================
  // RENDER: List View
  // ============================================================
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center flex-wrap gap-4">
        <h1 className={`text-2xl font-bold ${textPrimary}`}>
          Bibliothèque d'ouvrages ({ouvrages.length})
        </h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowTemplates(true)}
            className={`px-4 py-2.5 rounded-xl min-h-[44px] flex items-center gap-2 transition-all font-medium ${isDark ? 'bg-slate-700 text-slate-200 hover:bg-slate-600' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
          >
            <BookTemplate size={16} />
            <span className="hidden sm:inline">Templates</span>
          </button>
          <button
            onClick={handleCreate}
            className="px-4 py-2.5 text-white rounded-xl min-h-[44px] flex items-center gap-2 hover:shadow-lg transition-all"
            style={{ background: couleur }}
          >
            <Plus size={16} />
            <span className="hidden sm:inline">Nouvel ouvrage</span>
          </button>
        </div>
      </div>

      {/* Search + Filters */}
      <div className="space-y-3">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search size={18} className={`absolute left-3 top-1/2 -translate-y-1/2 ${textMuted}`} />
            <input
              type="text"
              placeholder="Rechercher un ouvrage..."
              aria-label="Rechercher un ouvrage"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className={`w-full pl-10 pr-4 py-2.5 border rounded-xl ${inputBg}`}
            />
          </div>
          {/* View toggle */}
          <div className={`flex rounded-xl border overflow-hidden ${isDark ? 'border-slate-600' : 'border-slate-300'}`}>
            <button
              onClick={() => setViewMode('grid')}
              className={`px-3 py-2 text-sm transition-colors ${viewMode === 'grid' ? 'text-white' : isDark ? 'bg-slate-700 text-slate-300' : 'bg-white text-slate-600'}`}
              style={viewMode === 'grid' ? { background: couleur } : {}}
              title="Vue grille"
            >
              <Layers size={16} />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-2 text-sm transition-colors ${viewMode === 'list' ? 'text-white' : isDark ? 'bg-slate-700 text-slate-300' : 'bg-white text-slate-600'}`}
              style={viewMode === 'list' ? { background: couleur } : {}}
              title="Vue liste"
            >
              <Package size={16} />
            </button>
          </div>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {(categories.length > 1 ? categories : CATEGORIES).map(cat => (
            <button
              key={cat}
              onClick={() => setCatFilter(cat)}
              className={`whitespace-nowrap px-3 py-1.5 rounded-lg text-sm font-medium min-h-[36px] transition-colors ${
                catFilter === cat
                  ? 'text-white shadow-sm'
                  : isDark ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
              style={catFilter === cat ? { background: couleur } : {}}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Empty State */}
      {filtered.length === 0 ? (
        <div className={`${cardBg} rounded-2xl border overflow-hidden`}>
          <div className="p-8 sm:p-12 text-center relative" style={{ background: `linear-gradient(135deg, ${couleur}15, ${couleur}05)` }}>
            <div className="relative">
              <div
                className="w-20 h-20 sm:w-24 sm:h-24 mx-auto mb-6 rounded-2xl flex items-center justify-center shadow-lg"
                style={{ background: `linear-gradient(135deg, ${couleur}, ${couleur}dd)` }}
              >
                <Layers size={40} className="text-white" />
              </div>

              <h2 className={`text-xl sm:text-2xl font-bold mb-2 ${textPrimary}`}>
                {search || catFilter !== 'Tous' ? 'Aucun ouvrage trouvé' : 'Créez vos ouvrages composites'}
              </h2>
              <p className={`text-sm sm:text-base ${textMuted} max-w-md mx-auto`}>
                {search || catFilter !== 'Tous'
                  ? 'Modifiez vos filtres ou créez un nouvel ouvrage.'
                  : 'Assemblez matériaux, main d\'oeuvre et sous-traitance en un prix unitaire réutilisable dans vos devis.'}
              </p>
            </div>
          </div>

          {!search && catFilter === 'Tous' && (
            <div className={`p-6 sm:p-8 border-t ${isDark ? 'border-slate-700 bg-slate-800/50' : 'border-slate-100 bg-slate-50/50'}`}>
              <p className={`text-xs font-medium uppercase tracking-wider mb-4 ${textMuted}`}>Avantages</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                <div className={`flex items-start gap-3 p-3 rounded-xl ${isDark ? 'bg-slate-700/50' : 'bg-white'}`}>
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${couleur}20` }}>
                    <Layers size={18} style={{ color: couleur }} />
                  </div>
                  <div>
                    <p className={`font-medium text-sm ${textPrimary}`}>Prix composites</p>
                    <p className={`text-xs ${textMuted}`}>Assemblez plusieurs postes de coût</p>
                  </div>
                </div>
                <div className={`flex items-start gap-3 p-3 rounded-xl ${isDark ? 'bg-slate-700/50' : 'bg-white'}`}>
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${couleur}20` }}>
                    <Star size={18} style={{ color: couleur }} />
                  </div>
                  <div>
                    <p className={`font-medium text-sm ${textPrimary}`}>Marges maîtrisées</p>
                    <p className={`text-xs ${textMuted}`}>Coefficient de vente ajustable</p>
                  </div>
                </div>
                <div className={`flex items-start gap-3 p-3 rounded-xl ${isDark ? 'bg-slate-700/50' : 'bg-white'}`}>
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${couleur}20` }}>
                    <Clock size={18} style={{ color: couleur }} />
                  </div>
                  <div>
                    <p className={`font-medium text-sm ${textPrimary}`}>Devis rapides</p>
                    <p className={`text-xs ${textMuted}`}>Réutilisez vos ouvrages types</p>
                  </div>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <button
                  onClick={() => setShowTemplates(true)}
                  className={`w-full sm:w-auto px-6 py-3 rounded-xl flex items-center justify-center gap-2 hover:shadow-lg transition-all font-medium ${isDark ? 'bg-slate-700 text-slate-200 hover:bg-slate-600' : 'bg-slate-200 text-slate-700 hover:bg-slate-300'}`}
                >
                  <BookTemplate size={18} />
                  Partir d'un template
                </button>
                <button
                  onClick={handleCreate}
                  className="w-full sm:w-auto px-6 py-3 text-white rounded-xl flex items-center justify-center gap-2 hover:shadow-lg transition-all font-medium"
                  style={{ background: couleur }}
                >
                  <Plus size={18} />
                  Créer de zéro
                </button>
              </div>
            </div>
          )}

          {(search || catFilter !== 'Tous') && (
            <div className={`p-6 border-t ${isDark ? 'border-slate-700' : 'border-slate-100'} text-center`}>
              <button
                onClick={handleCreate}
                className="px-6 py-3 text-white rounded-xl flex items-center justify-center gap-2 mx-auto hover:shadow-lg transition-all font-medium"
                style={{ background: couleur }}
              >
                <Plus size={18} />
                Créer un ouvrage
              </button>
            </div>
          )}
        </div>
      ) : viewMode === 'grid' ? (
        /* Grid View */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(ouvrage => {
            const marge = computeMargePercent(ouvrage.prixRevientHT, ouvrage.prixVenteHT);
            return (
              <div
                key={ouvrage.id}
                className={`${cardBg} rounded-2xl border p-5 transition-all hover:shadow-lg cursor-pointer group ${!ouvrage.actif ? 'opacity-60' : ''}`}
                onClick={() => handleEdit(ouvrage)}
              >
                {/* Top row */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xs font-mono px-2 py-0.5 rounded ${isDark ? 'bg-slate-700 text-slate-400' : 'bg-slate-100 text-slate-500'}`}>
                        {ouvrage.reference}
                      </span>
                      {!ouvrage.actif && (
                        <span className={`text-xs px-2 py-0.5 rounded ${isDark ? 'bg-red-900/30 text-red-400' : 'bg-red-50 text-red-600'}`}>
                          Inactif
                        </span>
                      )}
                    </div>
                    <h3 className={`font-semibold truncate ${textPrimary}`}>{ouvrage.designation}</h3>
                    {ouvrage.categorie && (
                      <p className={`text-xs mt-0.5 ${textMuted}`}>{ouvrage.categorie}</p>
                    )}
                  </div>
                  {/* Actions */}
                  <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity ml-2">
                    <button
                      onClick={e => { e.stopPropagation(); handleEdit(ouvrage); }}
                      className={`p-1.5 rounded-lg transition-colors ${isDark ? 'hover:bg-blue-900/40 text-slate-400 hover:text-blue-400' : 'hover:bg-blue-50 text-slate-400 hover:text-blue-600'}`}
                      title="Modifier"
                    >
                      <Edit3 size={14} />
                    </button>
                    <button
                      onClick={e => { e.stopPropagation(); handleDuplicate(ouvrage); }}
                      className={`p-1.5 rounded-lg transition-colors ${isDark ? 'hover:bg-purple-900/40 text-slate-400 hover:text-purple-400' : 'hover:bg-purple-50 text-slate-400 hover:text-purple-600'}`}
                      title="Dupliquer"
                    >
                      <Copy size={14} />
                    </button>
                    <button
                      onClick={e => { e.stopPropagation(); handleDelete(ouvrage.id); }}
                      className={`p-1.5 rounded-lg transition-colors ${isDark ? 'hover:bg-red-900/40 text-slate-400 hover:text-red-400' : 'hover:bg-red-50 text-slate-400 hover:text-red-600'}`}
                      title="Supprimer"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                {/* Prices */}
                <div className={`p-3 rounded-xl mb-3 ${isDark ? 'bg-slate-700/50' : 'bg-slate-50'}`}>
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-xs ${textMuted}`}>Revient</span>
                    <span className={`text-sm font-medium ${textSecondary}`}>{formatEUR.format(ouvrage.prixRevientHT)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className={`text-xs ${textMuted}`}>Vente HT</span>
                    <span className="text-sm font-bold" style={{ color: couleur }}>{formatEUR.format(ouvrage.prixVenteHT)}</span>
                  </div>
                  <div className={`flex items-center justify-between mt-1 pt-1 border-t ${isDark ? 'border-slate-600' : 'border-slate-200'}`}>
                    <span className={`text-xs ${textMuted}`}>Marge</span>
                    <span className={`text-sm font-bold ${
                      marge >= 30 ? 'text-emerald-500' :
                      marge >= 15 ? 'text-amber-500' :
                      'text-red-500'
                    }`}>
                      {marge.toFixed(1)}%
                    </span>
                  </div>
                </div>

                {/* Footer: composants + difficulty */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className={`text-xs flex items-center gap-1 ${textMuted}`}>
                      <Package size={12} />
                      {ouvrage.composants?.length || 0} composant{(ouvrage.composants?.length || 0) > 1 ? 's' : ''}
                    </span>
                    {ouvrage.tempsPoseHeures > 0 && (
                      <span className={`text-xs flex items-center gap-1 ${textMuted}`}>
                        <Clock size={12} />
                        {ouvrage.tempsPoseHeures}h
                      </span>
                    )}
                  </div>
                  <DifficultyDots
                    value={ouvrage.difficulte || 1}
                    couleur={couleur}
                    isDark={isDark}
                    readOnly
                  />
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* List View (table) */
        <div className={`${cardBg} rounded-2xl border overflow-hidden`}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm" aria-label="Bibliothèque des ouvrages">
              <thead className={`border-b ${isDark ? 'bg-slate-700' : 'bg-slate-50'}`}>
                <tr>
                  <th scope="col" className={`text-left px-4 py-3 ${textPrimary}`}>Ouvrage</th>
                  <th scope="col" className={`text-right px-4 py-3 w-28 hidden sm:table-cell ${textPrimary}`}>Revient HT</th>
                  <th scope="col" className={`text-right px-4 py-3 w-28 ${textPrimary}`}>Vente HT</th>
                  <th scope="col" className={`text-right px-4 py-3 w-20 hidden sm:table-cell ${textPrimary}`}>Marge</th>
                  <th scope="col" className={`text-center px-4 py-3 w-24 hidden md:table-cell ${textPrimary}`}>Composants</th>
                  <th scope="col" className={`text-center px-4 py-3 w-24 hidden md:table-cell ${textPrimary}`}>Difficulté</th>
                  <th scope="col" className="w-28"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(ouvrage => {
                  const marge = computeMargePercent(ouvrage.prixRevientHT, ouvrage.prixVenteHT);
                  return (
                    <tr
                      key={ouvrage.id}
                      className={`border-b last:border-0 transition-colors cursor-pointer ${isDark ? 'hover:bg-slate-700/70' : 'hover:bg-slate-50'} ${!ouvrage.actif ? 'opacity-60' : ''}`}
                      onClick={() => handleEdit(ouvrage)}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${couleur}20` }}>
                            <Layers size={16} style={{ color: couleur }} />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className={`font-medium truncate ${textPrimary}`}>{ouvrage.designation}</span>
                              {!ouvrage.actif && (
                                <span className={`text-xs px-1.5 py-0.5 rounded flex-shrink-0 ${isDark ? 'bg-red-900/30 text-red-400' : 'bg-red-50 text-red-600'}`}>
                                  Inactif
                                </span>
                              )}
                            </div>
                            <p className={`text-xs ${textMuted}`}>{ouvrage.reference} · {ouvrage.categorie} · {ouvrage.unite}</p>
                          </div>
                        </div>
                      </td>
                      <td className={`px-4 py-3 text-right hidden sm:table-cell ${textSecondary}`}>
                        {formatEUR.format(ouvrage.prixRevientHT)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="font-medium" style={{ color: couleur }}>{formatEUR.format(ouvrage.prixVenteHT)}</span>
                      </td>
                      <td className="px-4 py-3 text-right hidden sm:table-cell">
                        <span className={`font-medium ${
                          marge >= 30 ? 'text-emerald-500' :
                          marge >= 15 ? 'text-amber-500' :
                          'text-red-500'
                        }`}>
                          {marge.toFixed(0)}%
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center hidden md:table-cell">
                        <span className={`inline-flex items-center gap-1 ${textMuted}`}>
                          <Package size={12} />
                          {ouvrage.composants?.length || 0}
                        </span>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <div className="flex justify-center">
                          <DifficultyDots value={ouvrage.difficulte || 1} couleur={couleur} isDark={isDark} readOnly />
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-0.5">
                          <button
                            onClick={e => { e.stopPropagation(); handleEdit(ouvrage); }}
                            className={`p-2 rounded-lg transition-all ${isDark ? 'hover:bg-blue-900/40 text-slate-400 hover:text-blue-400' : 'hover:bg-blue-50 text-slate-500 hover:text-blue-600'}`}
                            title="Modifier"
                          >
                            <Edit3 size={16} />
                          </button>
                          <button
                            onClick={e => { e.stopPropagation(); handleDuplicate(ouvrage); }}
                            className={`p-2 rounded-lg transition-all ${isDark ? 'hover:bg-purple-900/40 text-slate-400 hover:text-purple-400' : 'hover:bg-purple-50 text-slate-500 hover:text-purple-600'}`}
                            title="Dupliquer"
                          >
                            <Copy size={16} />
                          </button>
                          <button
                            onClick={e => { e.stopPropagation(); handleDelete(ouvrage.id); }}
                            className={`p-2 rounded-lg transition-all ${isDark ? 'hover:bg-red-900/40 text-slate-400 hover:text-red-400' : 'hover:bg-red-50 text-slate-500 hover:text-red-600'}`}
                            title="Supprimer"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <ConfirmDialog />
    </div>
  );
}
