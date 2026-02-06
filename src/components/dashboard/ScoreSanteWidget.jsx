/**
 * ScoreSanteWidget - Business Health Score dashboard widget
 *
 * Calculates a 0-100 composite score from 6 weighted indicators:
 * - Tresorerie (25%): Cash collected vs total invoiced
 * - Carnet de commandes (20%): Pipeline of accepted devis
 * - Taux de conversion (15%): Devis acceptance rate
 * - Marge moyenne (15%): Average margin across chantiers
 * - Impayes (15%): Inverse of overdue invoice ratio
 * - Conformite (10%): Profile completeness
 *
 * @module ScoreSanteWidget
 */

import * as React from 'react';
import {
  Activity,
  Shield,
  FileText,
  TrendingUp,
  Wallet,
  AlertTriangle,
  CheckCircle,
} from 'lucide-react';
import { useData } from '../../context/DataContext';
import { useApp } from '../../context/AppContext';
import { DEVIS_STATUS, CHANTIER_STATUS } from '../../lib/constants';

// Statuses that count as "accepted" for revenue purposes
const ACCEPTED_STATUSES = [
  DEVIS_STATUS.ACCEPTE,
  DEVIS_STATUS.ACOMPTE_FACTURE,
  DEVIS_STATUS.FACTURE,
  DEVIS_STATUS.PAYEE,
];

// Statuses that count as "sent" (denominator for conversion rate)
const SENT_STATUSES = [
  DEVIS_STATUS.ENVOYE,
  DEVIS_STATUS.VU,
  DEVIS_STATUS.ACCEPTE,
  DEVIS_STATUS.REFUSE,
  DEVIS_STATUS.ACOMPTE_FACTURE,
  DEVIS_STATUS.FACTURE,
  DEVIS_STATUS.PAYEE,
];

/**
 * Indicator configuration with weights, icons, labels, and contextual advice
 */
const INDICATOR_CONFIG = [
  {
    key: 'tresorerie',
    label: 'Tresorerie',
    weight: 0.25,
    icon: Wallet,
    color: '#10b981',
    advice: 'Relancez vos factures impayees pour ameliorer votre tresorerie.',
  },
  {
    key: 'carnet',
    label: 'Carnet de commandes',
    weight: 0.20,
    icon: FileText,
    color: '#3b82f6',
    advice: 'Envoyez plus de devis pour remplir votre carnet de commandes.',
  },
  {
    key: 'conversion',
    label: 'Taux de conversion',
    weight: 0.15,
    icon: TrendingUp,
    color: '#8b5cf6',
    advice: 'Ameliorez vos devis et relances pour augmenter votre taux de conversion.',
  },
  {
    key: 'marge',
    label: 'Marge moyenne',
    weight: 0.15,
    icon: TrendingUp,
    color: '#f59e0b',
    advice: 'Revisez vos prix ou reduisez vos couts pour ameliorer vos marges.',
  },
  {
    key: 'impayes',
    label: 'Impayes',
    weight: 0.15,
    icon: AlertTriangle,
    color: '#ef4444',
    advice: 'Reduisez vos impayes en envoyant des relances regulieres.',
  },
  {
    key: 'conformite',
    label: 'Conformite',
    weight: 0.10,
    icon: Shield,
    color: '#06b6d4',
    advice: 'Completez votre profil entreprise (SIRET, assurance, RIB) pour etre conforme.',
  },
];

/**
 * Returns a color based on score thresholds
 * Green >70, Orange 40-70, Red <40
 */
function getScoreColor(score) {
  if (score > 70) return '#10b981';
  if (score >= 40) return '#f59e0b';
  return '#ef4444';
}

/**
 * Returns a label for the score range
 */
function getScoreLabel(score) {
  if (score > 70) return 'Bonne sante';
  if (score >= 40) return 'A surveiller';
  return 'Attention requise';
}

/**
 * Circular SVG gauge component
 */
function CircularGauge({ score, size = 100, strokeWidth = 8, isDark }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.min(100, Math.max(0, score));
  const offset = circumference - (progress / 100) * circumference;
  const color = getScoreColor(score);
  const center = size / 2;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        {/* Background circle */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={isDark ? '#334155' : '#e2e8f0'}
          strokeWidth={strokeWidth}
        />
        {/* Progress arc */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 0.6s ease' }}
        />
      </svg>
      {/* Score text in center */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span
          className="text-2xl font-bold leading-none"
          style={{ color }}
        >
          {Math.round(score)}
        </span>
        <span className={`text-[10px] mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
          / 100
        </span>
      </div>
    </div>
  );
}

/**
 * Mini progress bar for individual indicators
 */
function MiniProgressBar({ value, color, isDark }) {
  const clampedValue = Math.min(100, Math.max(0, value));
  return (
    <div
      className={`h-1.5 rounded-full flex-1 ${isDark ? 'bg-slate-700' : 'bg-slate-100'}`}
    >
      <div
        className="h-full rounded-full transition-all duration-500"
        style={{
          width: `${clampedValue}%`,
          backgroundColor: color,
        }}
      />
    </div>
  );
}

/**
 * Single indicator row
 */
function IndicatorRow({ config, score, isDark }) {
  const Icon = config.icon;
  const displayScore = Math.round(Math.min(100, Math.max(0, score)));

  return (
    <div className="flex items-center gap-3">
      <div
        className="flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center"
        style={{
          backgroundColor: `${config.color}15`,
        }}
      >
        <Icon size={14} style={{ color: config.color }} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <span
            className={`text-xs truncate ${isDark ? 'text-slate-300' : 'text-slate-600'}`}
          >
            {config.label}
          </span>
          <span
            className="text-xs font-semibold ml-2 flex-shrink-0"
            style={{ color: getScoreColor(displayScore) }}
          >
            {displayScore}
          </span>
        </div>
        <MiniProgressBar value={displayScore} color={config.color} isDark={isDark} />
      </div>
    </div>
  );
}

/**
 * Calculate all 6 indicator scores from context data
 */
function useHealthScores() {
  const { devis, chantiers, getChantierBilan } = useData();
  const { entreprise } = useApp();

  return React.useMemo(() => {
    // --- 1. Tresorerie (25%) ---
    // Ratio of cash received (payee invoices) vs total invoiced amount
    const factures = devis.filter(d => d.type === 'facture');
    const totalFacture = factures.reduce((sum, f) => sum + (f.total_ttc || 0), 0);
    const encaisse = factures
      .filter(f => f.statut === DEVIS_STATUS.PAYEE)
      .reduce((sum, f) => sum + (f.total_ttc || 0), 0);
    const tresorerie = totalFacture > 0 ? (encaisse / totalFacture) * 100 : 100;

    // --- 2. Carnet de commandes (20%) ---
    // Accepted devis not yet started (chantier still prospect)
    const acceptedDevis = devis.filter(d =>
      ACCEPTED_STATUSES.includes(d.statut) && d.type === 'devis'
    );
    // Find devis whose chantier is not yet en_cours or termine
    const pendingAccepted = acceptedDevis.filter(d => {
      if (!d.chantier_id) return true; // No chantier linked = still pending
      const chantier = chantiers.find(c => c.id === d.chantier_id);
      return !chantier || chantier.statut === CHANTIER_STATUS.PROSPECT;
    });
    const carnet = acceptedDevis.length > 0
      ? Math.min(100, pendingAccepted.length * 25)
      : 0;

    // --- 3. Taux de conversion (15%) ---
    // Ratio of accepted devis vs total sent devis
    const sentDevis = devis.filter(d =>
      SENT_STATUSES.includes(d.statut) && d.type === 'devis'
    );
    const acceptedCount = devis.filter(d =>
      ACCEPTED_STATUSES.includes(d.statut) && d.type === 'devis'
    ).length;
    const conversion = sentDevis.length > 0
      ? (acceptedCount / sentDevis.length) * 100
      : 0;

    // --- 4. Marge moyenne (15%) ---
    // Average margin across all active/completed chantiers
    const relevantChantiers = chantiers.filter(c =>
      c.statut === CHANTIER_STATUS.EN_COURS || c.statut === CHANTIER_STATUS.TERMINE
    );
    let avgMargin = 0;
    if (relevantChantiers.length > 0) {
      const totalMarge = relevantChantiers.reduce((sum, c) => {
        const bilan = getChantierBilan(c.id);
        return sum + (bilan?.tauxMarge || 0);
      }, 0);
      avgMargin = totalMarge / relevantChantiers.length;
    }
    // 30% margin = score 100
    const marge = Math.min(100, avgMargin * 3.33);

    // --- 5. Impayes (15%) ---
    // Inverse of overdue amount ratio (unpaid factures past due date)
    const now = new Date();
    let overdueAmount = 0;
    factures.forEach(f => {
      if (f.statut === DEVIS_STATUS.PAYEE) return;
      const montantRestant = (f.total_ttc || 0) - (f.montant_paye || 0);
      if (montantRestant <= 0) return;

      let echeance;
      if (f.date_echeance) {
        echeance = new Date(f.date_echeance);
      } else if (f.date) {
        echeance = new Date(f.date);
        echeance.setDate(echeance.getDate() + 30);
      } else {
        return;
      }
      if (now > echeance) {
        overdueAmount += montantRestant;
      }
    });
    const impayes = totalFacture > 0
      ? 100 - (overdueAmount / totalFacture * 100)
      : 100;

    // --- 6. Conformite (10%) ---
    // Profile completeness check
    const fields = [
      entreprise?.nom,
      entreprise?.siret,
      entreprise?.email,
      entreprise?.telephone,
      entreprise?.adresse,
      entreprise?.iban || entreprise?.bic, // bank info
      entreprise?.tva_intra,
    ];
    const filledCount = fields.filter(f => f && String(f).trim().length > 0).length;
    const conformite = (filledCount / fields.length) * 100;

    // Build scores map
    const scores = {
      tresorerie: Math.max(0, Math.min(100, tresorerie)),
      carnet: Math.max(0, Math.min(100, carnet)),
      conversion: Math.max(0, Math.min(100, conversion)),
      marge: Math.max(0, Math.min(100, marge)),
      impayes: Math.max(0, Math.min(100, impayes)),
      conformite: Math.max(0, Math.min(100, conformite)),
    };

    // Weighted total
    const totalScore = INDICATOR_CONFIG.reduce((sum, ind) => {
      return sum + scores[ind.key] * ind.weight;
    }, 0);

    // Find lowest scoring indicator for advice
    let lowestKey = 'tresorerie';
    let lowestScore = 100;
    for (const ind of INDICATOR_CONFIG) {
      if (scores[ind.key] < lowestScore) {
        lowestScore = scores[ind.key];
        lowestKey = ind.key;
      }
    }
    const advice = INDICATOR_CONFIG.find(i => i.key === lowestKey)?.advice || '';

    return {
      scores,
      totalScore: Math.max(0, Math.min(100, totalScore)),
      advice,
      lowestKey,
    };
  }, [devis, chantiers, getChantierBilan, entreprise]);
}

/**
 * ScoreSanteWidget - Business Health Score card
 *
 * @param {Object} props
 * @param {boolean} props.isDark - Dark mode toggle
 * @param {Function} props.setPage - Navigation callback
 * @param {string} props.couleur - Brand accent color
 */
export function ScoreSanteWidget({ isDark, setPage, couleur }) {
  const { scores, totalScore, advice } = useHealthScores();
  const scoreColor = getScoreColor(totalScore);
  const scoreLabel = getScoreLabel(totalScore);

  return (
    <div
      className={`${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'} rounded-2xl border p-5`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: `${couleur || '#f97316'}15` }}
          >
            <Activity size={18} style={{ color: couleur || '#f97316' }} />
          </div>
          <div>
            <h3
              className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}
            >
              Score Sante
            </h3>
            <p
              className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}
            >
              {scoreLabel}
            </p>
          </div>
        </div>

        {/* Circular gauge */}
        <CircularGauge score={totalScore} size={100} strokeWidth={8} isDark={isDark} />
      </div>

      {/* Indicator rows */}
      <div className="space-y-3 mb-4">
        {INDICATOR_CONFIG.map(config => (
          <IndicatorRow
            key={config.key}
            config={config}
            score={scores[config.key]}
            isDark={isDark}
          />
        ))}
      </div>

      {/* Contextual advice */}
      <div
        className={`flex items-start gap-2 p-3 rounded-xl text-xs leading-relaxed ${
          isDark ? 'bg-slate-700/50 text-slate-300' : 'bg-slate-50 text-slate-600'
        }`}
      >
        <CheckCircle
          size={14}
          className="flex-shrink-0 mt-0.5"
          style={{ color: scoreColor }}
        />
        <span>{advice}</span>
      </div>
    </div>
  );
}

export default ScoreSanteWidget;
