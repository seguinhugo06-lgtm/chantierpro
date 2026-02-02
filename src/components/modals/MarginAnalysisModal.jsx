/**
 * MarginAnalysisModal - Modal for analyzing margin of a specific chantier
 *
 * Features:
 * - Detailed margin breakdown (materials, labor, other)
 * - Visual gauge for margin health
 * - Cost comparison with budget
 * - Actionable recommendations
 *
 * @module MarginAnalysisModal
 */

import * as React from 'react';
import {
  X,
  TrendingUp,
  TrendingDown,
  Target,
  AlertTriangle,
  CheckCircle,
  Package,
  Users,
  Receipt,
  ArrowRight,
  ChevronRight,
  Lightbulb,
  BarChart3,
  DollarSign,
  AlertCircle,
  HardHat,
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';
import { cn } from '../../lib/utils';

// ============ UTILS ============

function formatMoney(amount, discrete = false) {
  if (discrete) return '·····';
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount || 0);
}

function formatPercent(value) {
  return `${(value || 0).toFixed(1)}%`;
}

// Margin thresholds
const MARGIN_THRESHOLDS = {
  CRITICAL: 10,
  WARNING: 20,
  GOOD: 30,
};

function getMarginColor(margin, isDark = false) {
  if (margin < MARGIN_THRESHOLDS.CRITICAL) {
    return {
      text: 'text-red-600 dark:text-red-400',
      bg: isDark ? 'bg-red-900/30' : 'bg-red-100',
      hex: '#ef4444',
      label: 'Critique',
    };
  }
  if (margin < MARGIN_THRESHOLDS.WARNING) {
    return {
      text: 'text-amber-600 dark:text-amber-400',
      bg: isDark ? 'bg-amber-900/30' : 'bg-amber-100',
      hex: '#f59e0b',
      label: 'Attention',
    };
  }
  if (margin < MARGIN_THRESHOLDS.GOOD) {
    return {
      text: 'text-blue-600 dark:text-blue-400',
      bg: isDark ? 'bg-blue-900/30' : 'bg-blue-100',
      hex: '#3b82f6',
      label: 'Correct',
    };
  }
  return {
    text: 'text-emerald-600 dark:text-emerald-400',
    bg: isDark ? 'bg-emerald-900/30' : 'bg-emerald-100',
    hex: '#10b981',
    label: 'Excellent',
  };
}

// ============ GAUGE COMPONENT ============

function MarginGauge({ value, size = 140, isDark = false }) {
  const colors = getMarginColor(value, isDark);
  const clampedValue = Math.max(0, Math.min(100, value));
  const angle = (clampedValue / 100) * 180;

  return (
    <div className="relative" style={{ width: size, height: size / 2 + 30 }}>
      {/* Background arc */}
      <svg width={size} height={size / 2 + 10} viewBox="0 0 140 80">
        <defs>
          <linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#ef4444" />
            <stop offset="33%" stopColor="#f59e0b" />
            <stop offset="66%" stopColor="#3b82f6" />
            <stop offset="100%" stopColor="#10b981" />
          </linearGradient>
        </defs>
        {/* Track */}
        <path
          d="M 15 70 A 55 55 0 0 1 125 70"
          fill="none"
          stroke={isDark ? '#334155' : '#e2e8f0'}
          strokeWidth="12"
          strokeLinecap="round"
        />
        {/* Progress */}
        <path
          d="M 15 70 A 55 55 0 0 1 125 70"
          fill="none"
          stroke="url(#gaugeGradient)"
          strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray={`${(angle / 180) * 173} 173`}
        />
        {/* Needle */}
        <line
          x1="70"
          y1="70"
          x2={70 + 40 * Math.cos((Math.PI * (180 - angle)) / 180)}
          y2={70 - 40 * Math.sin((Math.PI * (180 - angle)) / 180)}
          stroke={colors.hex}
          strokeWidth="3"
          strokeLinecap="round"
        />
        <circle cx="70" cy="70" r="6" fill={colors.hex} />
      </svg>

      {/* Value display */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 text-center">
        <p className={cn('text-2xl font-bold', colors.text)}>
          {formatPercent(value)}
        </p>
        <span className={cn(
          'text-xs font-medium px-2 py-0.5 rounded-full',
          colors.bg,
          colors.text
        )}>
          {colors.label}
        </span>
      </div>
    </div>
  );
}

// ============ STAT BOX ============

function StatBox({ icon: Icon, label, value, subValue, color = 'gray', isDark = false, highlight = false }) {
  const colorClasses = {
    gray: isDark ? 'text-gray-400' : 'text-gray-500',
    green: 'text-emerald-500',
    blue: 'text-blue-500',
    red: 'text-red-500',
    amber: 'text-amber-500',
  };

  return (
    <div className={cn(
      'p-4 rounded-xl transition-all',
      highlight
        ? isDark ? 'bg-amber-900/20 ring-2 ring-amber-500/30' : 'bg-amber-50 ring-2 ring-amber-200'
        : isDark ? 'bg-slate-800' : 'bg-white'
    )}>
      <div className="flex items-center gap-2 mb-2">
        <div className={cn(
          'w-8 h-8 rounded-lg flex items-center justify-center',
          color === 'green' && (isDark ? 'bg-emerald-500/20' : 'bg-emerald-100'),
          color === 'blue' && (isDark ? 'bg-blue-500/20' : 'bg-blue-100'),
          color === 'red' && (isDark ? 'bg-red-500/20' : 'bg-red-100'),
          color === 'amber' && (isDark ? 'bg-amber-500/20' : 'bg-amber-100'),
          color === 'gray' && (isDark ? 'bg-slate-700' : 'bg-gray-100'),
        )}>
          <Icon size={16} className={colorClasses[color]} />
        </div>
        <span className={cn('text-xs font-medium', isDark ? 'text-gray-400' : 'text-gray-500')}>
          {label}
        </span>
      </div>
      <p className={cn(
        'text-xl font-bold',
        highlight ? colorClasses[color] : isDark ? 'text-white' : 'text-gray-900'
      )}>
        {value}
      </p>
      {subValue && (
        <p className={cn('text-xs mt-1', isDark ? 'text-gray-500' : 'text-gray-400')}>
          {subValue}
        </p>
      )}
    </div>
  );
}

// ============ RECOMMENDATION CARD ============

function RecommendationCard({ icon: Icon, title, description, priority = 'info', isDark = false }) {
  const priorityConfig = {
    critical: {
      bg: isDark ? 'bg-red-900/20 border-red-500/30' : 'bg-red-50 border-red-200',
      icon: isDark ? 'text-red-400' : 'text-red-600',
      iconBg: isDark ? 'bg-red-500/20' : 'bg-red-100',
    },
    warning: {
      bg: isDark ? 'bg-amber-900/20 border-amber-500/30' : 'bg-amber-50 border-amber-200',
      icon: isDark ? 'text-amber-400' : 'text-amber-600',
      iconBg: isDark ? 'bg-amber-500/20' : 'bg-amber-100',
    },
    info: {
      bg: isDark ? 'bg-blue-900/20 border-blue-500/30' : 'bg-blue-50 border-blue-200',
      icon: isDark ? 'text-blue-400' : 'text-blue-600',
      iconBg: isDark ? 'bg-blue-500/20' : 'bg-blue-100',
    },
  };

  const config = priorityConfig[priority] || priorityConfig.info;

  return (
    <div className={cn('p-4 rounded-xl border-2', config.bg)}>
      <div className="flex items-start gap-3">
        <div className={cn('p-2 rounded-lg flex-shrink-0', config.iconBg)}>
          <Icon size={18} className={config.icon} />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className={cn('font-semibold text-sm', isDark ? 'text-white' : 'text-gray-900')}>
            {title}
          </h4>
          <p className={cn('text-xs mt-1', isDark ? 'text-gray-300' : 'text-gray-600')}>
            {description}
          </p>
        </div>
      </div>
    </div>
  );
}

// ============ MAIN COMPONENT ============

export function MarginAnalysisModal({
  isOpen,
  onClose,
  chantierId,
  chantierNom,
  chantiers = [],
  devis = [],
  depenses = [],
  pointages = [],
  equipe = [],
  clients = [],
  onNavigateToChantier,
  isDark = false,
  modeDiscret = false,
}) {
  // Find chantier data
  const chantier = chantiers.find(c => c.id === chantierId);
  const client = chantier ? clients.find(c => c.id === chantier.client_id) : null;

  // Calculate margin data
  const marginData = React.useMemo(() => {
    if (!chantier) return null;

    // Get devis for this chantier
    const chantierDevis = devis.filter(d => d.chantier_id === chantierId);
    const acceptedDevis = chantierDevis.find(d => d.statut === 'accepte' || d.statut === 'facture');
    const revenuPrevu = acceptedDevis?.total_ht || chantier.budget_estime || 0;

    // Get expenses for this chantier
    const chantierDepenses = depenses.filter(d => d.chantierId === chantierId);
    const coutMateriaux = chantierDepenses
      .filter(d => d.categorie === 'materiaux' || d.categorie === 'fournitures')
      .reduce((sum, d) => sum + (d.montant || 0), 0);
    const coutAutres = chantierDepenses
      .filter(d => d.categorie !== 'materiaux' && d.categorie !== 'fournitures')
      .reduce((sum, d) => sum + (d.montant || 0), 0);

    // Calculate labor cost
    const chantierPointages = pointages.filter(p => p.chantierId === chantierId);
    const coutMO = chantierPointages.reduce((sum, p) => {
      const employe = equipe.find(e => e.id === p.employeId);
      const tauxHoraire = employe?.coutHoraireCharge || 28;
      return sum + (p.heures || 0) * tauxHoraire;
    }, 0);

    const totalHeures = chantierPointages.reduce((sum, p) => sum + (p.heures || 0), 0);

    const totalDepenses = coutMateriaux + coutMO + coutAutres;
    const margeBrute = revenuPrevu - totalDepenses;
    const tauxMarge = revenuPrevu > 0 ? (margeBrute / revenuPrevu) * 100 : 0;

    // Calculate budget consumption
    const budgetConsomme = revenuPrevu > 0 ? (totalDepenses / revenuPrevu) * 100 : 0;

    return {
      revenuPrevu,
      coutMateriaux,
      coutMO,
      coutAutres,
      totalDepenses,
      margeBrute,
      tauxMarge,
      budgetConsomme,
      totalHeures,
      nombreDepenses: chantierDepenses.length,
    };
  }, [chantier, chantierId, devis, depenses, pointages, equipe]);

  // Generate recommendations based on margin analysis
  const recommendations = React.useMemo(() => {
    if (!marginData) return [];

    const recs = [];

    if (marginData.tauxMarge < MARGIN_THRESHOLDS.CRITICAL) {
      recs.push({
        icon: AlertTriangle,
        title: 'Marge critique',
        description: `La marge de ${formatPercent(marginData.tauxMarge)} est en dessous du seuil critique de ${MARGIN_THRESHOLDS.CRITICAL}%. Vérifiez les dépenses imprévues ou négociez un avenant.`,
        priority: 'critical',
      });
    } else if (marginData.tauxMarge < MARGIN_THRESHOLDS.WARNING) {
      recs.push({
        icon: AlertCircle,
        title: 'Marge à surveiller',
        description: `La marge actuelle de ${formatPercent(marginData.tauxMarge)} est en dessous de l'objectif de ${MARGIN_THRESHOLDS.WARNING}%. Optimisez les coûts restants.`,
        priority: 'warning',
      });
    }

    if (marginData.budgetConsomme > 90 && marginData.tauxMarge < MARGIN_THRESHOLDS.GOOD) {
      recs.push({
        icon: Receipt,
        title: 'Budget presque épuisé',
        description: `${formatPercent(marginData.budgetConsomme)} du budget consommé. Évaluez l'avancement réel pour anticiper les dépassements.`,
        priority: 'warning',
      });
    }

    if (marginData.coutMO > marginData.coutMateriaux * 1.5 && marginData.coutMO > 0) {
      recs.push({
        icon: Users,
        title: 'Coûts de main d\'œuvre élevés',
        description: `La main d'œuvre représente ${formatMoney(marginData.coutMO)} soit ${formatPercent((marginData.coutMO / marginData.totalDepenses) * 100)} des coûts. Optimisez la planification.`,
        priority: 'info',
      });
    }

    if (marginData.tauxMarge >= MARGIN_THRESHOLDS.GOOD) {
      recs.push({
        icon: CheckCircle,
        title: 'Bonne performance',
        description: `Ce chantier affiche une marge de ${formatPercent(marginData.tauxMarge)}, au-dessus de l'objectif. Continuez ainsi !`,
        priority: 'info',
      });
    }

    return recs;
  }, [marginData]);

  // Cost distribution chart data
  const costDistribution = React.useMemo(() => {
    if (!marginData || marginData.totalDepenses === 0) return [];

    return [
      { name: 'Matériaux', value: marginData.coutMateriaux, color: '#3b82f6' },
      { name: 'Main d\'œuvre', value: marginData.coutMO, color: '#f59e0b' },
      { name: 'Autres', value: marginData.coutAutres, color: '#8b5cf6' },
    ].filter(d => d.value > 0);
  }, [marginData]);

  // Close on escape
  React.useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const marginColors = marginData ? getMarginColor(marginData.tauxMarge, isDark) : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className={cn(
        'relative w-full max-w-2xl max-h-[90vh] overflow-hidden rounded-2xl shadow-2xl',
        isDark ? 'bg-slate-900' : 'bg-white'
      )}>
        {/* Header */}
        <div className={cn(
          'relative px-6 py-5 bg-gradient-to-r',
          marginData && marginData.tauxMarge < MARGIN_THRESHOLDS.WARNING
            ? 'from-amber-500 to-amber-600'
            : 'from-blue-500 to-blue-600'
        )}>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center">
              <BarChart3 size={24} className="text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-bold text-white truncate">
                Analyse de marge
              </h2>
              <p className="text-white/70 text-sm mt-0.5 truncate">
                {chantierNom || chantier?.nom || 'Chantier'}
                {client && ` • ${client.nom}`}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
          >
            <X size={20} className="text-white" />
          </button>
        </div>

        {/* Content */}
        <div className={cn(
          'overflow-y-auto max-h-[calc(90vh-100px)] p-6 space-y-6',
          isDark ? 'bg-slate-900' : 'bg-gray-50'
        )}>
          {marginData ? (
            <>
              {/* Gauge + Main Stats */}
              <div className="flex flex-col sm:flex-row items-center gap-6">
                <div className="flex-shrink-0">
                  <MarginGauge
                    value={marginData.tauxMarge}
                    isDark={isDark}
                  />
                </div>
                <div className="flex-1 grid grid-cols-2 gap-3 w-full">
                  <StatBox
                    icon={DollarSign}
                    label="Revenu prévu"
                    value={formatMoney(marginData.revenuPrevu, modeDiscret)}
                    color="green"
                    isDark={isDark}
                  />
                  <StatBox
                    icon={Receipt}
                    label="Total dépenses"
                    value={formatMoney(marginData.totalDepenses, modeDiscret)}
                    subValue={`${marginData.nombreDepenses} postes`}
                    color="red"
                    isDark={isDark}
                  />
                  <StatBox
                    icon={Target}
                    label="Marge brute"
                    value={formatMoney(marginData.margeBrute, modeDiscret)}
                    color={marginData.margeBrute >= 0 ? 'green' : 'red'}
                    isDark={isDark}
                    highlight={marginData.tauxMarge < MARGIN_THRESHOLDS.WARNING}
                  />
                  <StatBox
                    icon={Users}
                    label="Heures pointées"
                    value={`${marginData.totalHeures}h`}
                    subValue={formatMoney(marginData.coutMO, modeDiscret)}
                    color="amber"
                    isDark={isDark}
                  />
                </div>
              </div>

              {/* Cost Breakdown */}
              {costDistribution.length > 0 && (
                <div className={cn(
                  'p-4 rounded-xl',
                  isDark ? 'bg-slate-800' : 'bg-white'
                )}>
                  <h3 className={cn('font-semibold mb-4 text-sm', isDark ? 'text-white' : 'text-gray-900')}>
                    Répartition des coûts
                  </h3>
                  <div className="flex items-center gap-6">
                    <div className="w-32 h-32 flex-shrink-0">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={costDistribution}
                            cx="50%"
                            cy="50%"
                            innerRadius={35}
                            outerRadius={55}
                            paddingAngle={3}
                            dataKey="value"
                          >
                            {costDistribution.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="flex-1 space-y-3">
                      {costDistribution.map((item, idx) => {
                        const percent = marginData.totalDepenses > 0
                          ? ((item.value / marginData.totalDepenses) * 100).toFixed(0)
                          : 0;
                        return (
                          <div key={idx} className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: item.color }}
                              />
                              <span className={cn('text-sm', isDark ? 'text-gray-300' : 'text-gray-600')}>
                                {item.name}
                              </span>
                            </div>
                            <div className="text-right">
                              <span className={cn('text-sm font-semibold', isDark ? 'text-white' : 'text-gray-900')}>
                                {formatMoney(item.value, modeDiscret)}
                              </span>
                              <span className={cn('text-xs ml-2', isDark ? 'text-gray-500' : 'text-gray-400')}>
                                ({percent}%)
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Budget bar */}
                  <div className="mt-4 pt-4 border-t border-dashed border-gray-200 dark:border-slate-700">
                    <div className="flex items-center justify-between mb-2">
                      <span className={cn('text-xs', isDark ? 'text-gray-400' : 'text-gray-500')}>
                        Consommation du budget
                      </span>
                      <span className={cn(
                        'text-xs font-semibold',
                        marginData.budgetConsomme > 90 ? 'text-red-500' : isDark ? 'text-white' : 'text-gray-900'
                      )}>
                        {formatPercent(marginData.budgetConsomme)}
                      </span>
                    </div>
                    <div className={cn('h-2 rounded-full overflow-hidden', isDark ? 'bg-slate-700' : 'bg-gray-200')}>
                      <div
                        className={cn(
                          'h-full rounded-full transition-all',
                          marginData.budgetConsomme > 90 ? 'bg-red-500' :
                          marginData.budgetConsomme > 75 ? 'bg-amber-500' : 'bg-emerald-500'
                        )}
                        style={{ width: `${Math.min(marginData.budgetConsomme, 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Recommendations */}
              {recommendations.length > 0 && (
                <div className="space-y-3">
                  <h3 className={cn('font-semibold text-sm', isDark ? 'text-white' : 'text-gray-900')}>
                    Recommandations
                  </h3>
                  {recommendations.map((rec, idx) => (
                    <RecommendationCard
                      key={idx}
                      icon={rec.icon}
                      title={rec.title}
                      description={rec.description}
                      priority={rec.priority}
                      isDark={isDark}
                    />
                  ))}
                </div>
              )}

              {/* Action */}
              <button
                onClick={() => {
                  onClose();
                  onNavigateToChantier?.(chantierId);
                }}
                className={cn(
                  'w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl',
                  'font-medium text-sm transition-all',
                  isDark
                    ? 'bg-blue-600 hover:bg-blue-500 text-white'
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                )}
              >
                <HardHat size={18} />
                Voir le détail du chantier
                <ArrowRight size={16} />
              </button>
            </>
          ) : (
            <div className="py-12 text-center">
              <AlertCircle size={40} className={cn('mx-auto mb-3', isDark ? 'text-gray-600' : 'text-gray-300')} />
              <p className={cn('font-medium', isDark ? 'text-gray-400' : 'text-gray-500')}>
                Chantier introuvable
              </p>
              <p className={cn('text-sm mt-1', isDark ? 'text-gray-500' : 'text-gray-400')}>
                Les données de ce chantier ne sont pas disponibles
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default MarginAnalysisModal;
