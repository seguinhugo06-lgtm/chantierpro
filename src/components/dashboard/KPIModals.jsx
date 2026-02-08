/**
 * KPIModals - Modal dialogs for KPI cards with detailed info and actions
 *
 * Features:
 * - EncaisserModal: Detailed view of invoices to collect
 * - CeMoisModal: Monthly/yearly performance breakdown with actions
 * - Period selector for different time views
 * - Improved button design with proper icon alignment
 *
 * @module KPIModals
 */

import * as React from 'react';
import {
  X,
  Wallet,
  TrendingUp,
  TrendingDown,
  FileText,
  CheckCircle,
  AlertTriangle,
  Clock,
  Send,
  Eye,
  Download,
  ArrowRight,
  Receipt,
  Calendar,
  Target,
  Zap,
  Users,
  ChevronRight,
  Mail,
  Phone,
  MoreHorizontal,
  PieChart,
  BarChart3,
  Euro,
  Plus,
  Filter,
  CalendarDays,
  CalendarRange,
  AlertCircle,
  Building2,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import { PieChart as RechartsPie, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, AreaChart, Area } from 'recharts';
import { calculateGlobalKPIs, getMarginColor, MARGIN_THRESHOLDS } from '../../lib/business/margin-calculator';
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

function formatDate(date) {
  if (!date) return '—';
  return new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric',
    month: 'short',
  }).format(new Date(date));
}

function daysSince(date) {
  if (!date) return 0;
  const d = date instanceof Date ? date : new Date(date);
  const now = new Date();
  return Math.floor((now - d) / (1000 * 60 * 60 * 24));
}

// ============ PERIOD SELECTOR ============

const PERIODS = [
  { key: 'month', label: 'Ce mois', shortLabel: 'Mois', icon: Calendar },
  { key: 'year', label: 'Cette année', shortLabel: 'Année', icon: CalendarDays },
  { key: '5years', label: '5 ans', shortLabel: '5 ans', icon: CalendarRange },
];

function PeriodSelector({ value, onChange, isDark, compact = false, inHeader = false }) {
  // Special styling for header (on colored gradient background)
  if (inHeader) {
    return (
      <div className="inline-flex rounded-full p-0.5 bg-white/15 backdrop-blur-sm">
        {PERIODS.map((period) => {
          const isSelected = value === period.key;
          return (
            <button
              key={period.key}
              onClick={() => onChange(period.key)}
              className={cn(
                'px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-200',
                isSelected
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-white/80 hover:text-white hover:bg-white/10'
              )}
            >
              {period.shortLabel}
            </button>
          );
        })}
      </div>
    );
  }

  // Normal styling for content area
  return (
    <div className={cn(
      'inline-flex rounded-xl p-1',
      isDark ? 'bg-slate-700/50' : 'bg-gray-100'
    )}>
      {PERIODS.map((period) => {
        const isSelected = value === period.key;
        const Icon = period.icon;
        return (
          <button
            key={period.key}
            onClick={() => onChange(period.key)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200',
              isSelected
                ? isDark
                  ? 'bg-slate-600 text-white shadow-sm'
                  : 'bg-white text-gray-900 shadow-sm'
                : isDark
                  ? 'text-gray-400 hover:text-gray-200 hover:bg-slate-600/50'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
            )}
          >
            {!compact && <Icon size={14} />}
            {compact ? period.shortLabel : period.label}
          </button>
        );
      })}
    </div>
  );
}

// ============ IMPROVED ACTION BUTTON ============

function ActionButton({
  icon: Icon,
  label,
  onClick,
  variant = 'default',
  size = 'default',
  isDark = false,
  className,
  fullWidth = false,
}) {
  const variants = {
    primary: isDark
      ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/25'
      : 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/25',
    success: isDark
      ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-500/25'
      : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-500/25',
    danger: isDark
      ? 'bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-500/25'
      : 'bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-500/25',
    warning: isDark
      ? 'bg-amber-600 hover:bg-amber-500 text-white shadow-lg shadow-amber-500/25'
      : 'bg-amber-600 hover:bg-amber-700 text-white shadow-lg shadow-amber-500/25',
    outline: isDark
      ? 'border-2 border-slate-600 hover:border-slate-500 hover:bg-slate-700/50 text-gray-300'
      : 'border-2 border-gray-200 hover:border-gray-300 hover:bg-gray-50 text-gray-700',
    ghost: isDark
      ? 'hover:bg-slate-700/50 text-gray-400 hover:text-gray-200'
      : 'hover:bg-gray-100 text-gray-600 hover:text-gray-900',
    default: isDark
      ? 'bg-slate-700 hover:bg-slate-600 text-gray-200'
      : 'bg-gray-100 hover:bg-gray-200 text-gray-700',
  };

  const sizes = {
    sm: 'px-3 py-2 text-xs gap-1.5',
    default: 'px-4 py-2.5 text-sm gap-2',
    lg: 'px-5 py-3 text-base gap-2.5',
  };

  return (
    <button
      onClick={onClick}
      className={cn(
        'inline-flex items-center justify-center font-medium rounded-xl',
        'transition-all duration-200 active:scale-[0.98]',
        variants[variant],
        sizes[size],
        fullWidth && 'w-full',
        className
      )}
    >
      {Icon && <Icon size={size === 'sm' ? 14 : size === 'lg' ? 18 : 16} className="flex-shrink-0" />}
      <span>{label}</span>
    </button>
  );
}

// ============ MODAL BASE ============

function ModalBase({ isOpen, onClose, title, subtitle, icon: Icon, color, isDark, headerExtra, children }) {
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

  const colorConfig = {
    blue: { gradient: 'from-blue-500 to-blue-600', bg: 'bg-blue-500', light: 'bg-blue-50', text: 'text-blue-600' },
    green: { gradient: 'from-emerald-500 to-emerald-600', bg: 'bg-emerald-500', light: 'bg-emerald-50', text: 'text-emerald-600' },
    orange: { gradient: 'from-amber-500 to-amber-600', bg: 'bg-amber-500', light: 'bg-amber-50', text: 'text-amber-600' },
    red: { gradient: 'from-red-500 to-red-600', bg: 'bg-red-500', light: 'bg-red-50', text: 'text-red-600' },
  };
  const colors = colorConfig[color] || colorConfig.blue;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />

      {/* Modal */}
      <div className={cn(
        'relative w-full max-w-2xl max-h-[90vh] overflow-hidden rounded-2xl shadow-2xl',
        'animate-scale-pop',
        isDark ? 'bg-slate-900' : 'bg-white'
      )}>
        {/* Header with gradient */}
        <div className={cn('relative px-6 py-5 bg-gradient-to-r', colors.gradient)}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center">
                {Icon && <Icon size={24} className="text-white" />}
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">{title}</h2>
                {subtitle && (
                  <p className="text-white/70 text-sm mt-0.5">{subtitle}</p>
                )}
              </div>
            </div>
            {headerExtra && (
              <div className="mr-12">
                {headerExtra}
              </div>
            )}
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
          'overflow-y-auto max-h-[calc(90vh-100px)]',
          isDark ? 'bg-slate-900' : 'bg-gray-50'
        )}>
          {children}
        </div>
      </div>
    </div>
  );
}

// ============ STAT CARD ============

function StatCard({ icon: Icon, label, value, subValue, color = 'gray', isDark, highlight = false }) {
  const colorClasses = {
    gray: isDark ? 'text-gray-400' : 'text-gray-500',
    green: 'text-emerald-500',
    blue: 'text-blue-500',
    red: 'text-red-500',
    amber: 'text-amber-500',
  };

  return (
    <div className={cn(
      'p-4 rounded-xl',
      highlight
        ? isDark ? 'bg-slate-700 ring-2 ring-amber-500/30' : 'bg-amber-50 ring-2 ring-amber-200'
        : isDark ? 'bg-slate-800' : 'bg-white'
    )}>
      <div className="flex items-center gap-2 mb-2">
        <div className={cn(
          'w-8 h-8 rounded-lg flex items-center justify-center',
          color === 'green' && (isDark ? 'bg-emerald-500/20' : 'bg-emerald-100'),
          color === 'blue' && (isDark ? 'bg-blue-500/20' : 'bg-blue-100'),
          color === 'red' && (isDark ? 'bg-red-500/20' : 'bg-red-100'),
          color === 'amber' && (isDark ? 'bg-amber-500/20' : 'bg-amber-100'),
          color === 'gray' && (isDark ? 'bg-gray-500/20' : 'bg-gray-100'),
        )}>
          <Icon size={16} className={colorClasses[color]} />
        </div>
        <span className={cn('text-xs', isDark ? 'text-gray-400' : 'text-gray-500')}>
          {label}
        </span>
      </div>
      <p className={cn(
        'text-xl font-bold',
        highlight
          ? color === 'red' ? 'text-red-600 dark:text-red-400' : 'text-amber-600 dark:text-amber-400'
          : isDark ? 'text-white' : 'text-gray-900'
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

// ============ INVOICE ROW ============

function InvoiceRow({ facture, client, onView, onRelance, isDark }) {
  const days = daysSince(facture.date);
  const isOverdue = days > 30;
  const isCritical = days > 60;

  return (
    <div className={cn(
      'p-4 rounded-xl border transition-all hover:shadow-md',
      isDark
        ? 'bg-slate-800 border-slate-700 hover:border-slate-600'
        : 'bg-white border-gray-200 hover:border-gray-300',
      isCritical && (isDark ? 'border-red-500/50' : 'border-red-300')
    )}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={cn(
              'text-sm font-semibold',
              isDark ? 'text-white' : 'text-gray-900'
            )}>
              {facture.numero || `#${facture.id?.slice(-6)}`}
            </span>
            {isOverdue && (
              <span className={cn(
                'px-2 py-0.5 rounded-full text-[10px] font-semibold',
                isCritical
                  ? 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400'
                  : 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400'
              )}>
                {days}j de retard
              </span>
            )}
          </div>
          <p className={cn(
            'text-sm truncate',
            isDark ? 'text-gray-400' : 'text-gray-600'
          )}>
            {client?.nom || 'Client inconnu'}
          </p>
          <p className={cn(
            'text-xs mt-1',
            isDark ? 'text-gray-500' : 'text-gray-400'
          )}>
            Émise le {formatDate(facture.date)}
          </p>
        </div>

        <div className="text-right">
          <p className={cn(
            'text-lg font-bold',
            isDark ? 'text-white' : 'text-gray-900'
          )}>
            {formatMoney(facture.total_ttc)}
          </p>
        </div>
      </div>

      {/* Actions - Improved button styling */}
      <div className="flex items-center gap-2 mt-3 pt-3 border-t border-dashed border-gray-200 dark:border-slate-700">
        <ActionButton
          icon={Eye}
          label="Voir"
          variant="ghost"
          size="sm"
          onClick={() => onView?.(facture)}
          isDark={isDark}
          className="flex-1"
        />
        <ActionButton
          icon={Send}
          label="Envoyer une relance"
          variant={isOverdue ? 'warning' : 'outline'}
          size="sm"
          onClick={() => onRelance?.(facture)}
          isDark={isDark}
          className="flex-1"
        />
      </div>
    </div>
  );
}

// ============ ENCAISSER MODAL ============

export function EncaisserModal({
  isOpen,
  onClose,
  stats,
  facturesEnAttente = [],
  facturesOverdue = [],
  clients = [],
  onViewFacture,
  onRelanceFacture,
  onRelanceAll,
  onCreateFacture,
  onViewAllFactures,
  isDark = false,
  modeDiscret = false,
}) {
  const [filter, setFilter] = React.useState('all'); // 'all', 'overdue', 'recent'

  const getClient = (clientId) => clients.find(c => c.id === clientId);

  const filteredFactures = React.useMemo(() => {
    if (filter === 'overdue') {
      return facturesEnAttente.filter(f => daysSince(f.date) > 30);
    }
    if (filter === 'recent') {
      return facturesEnAttente.filter(f => daysSince(f.date) <= 30);
    }
    return facturesEnAttente;
  }, [facturesEnAttente, filter]);

  // Chart data
  const pieData = [
    { name: 'Encaissé', value: stats?.encaisse || 0, color: '#10b981' },
    { name: 'En attente', value: stats?.enAttente || 0, color: '#3b82f6' },
    { name: 'En retard', value: stats?.montantOverdue || 0, color: '#ef4444' },
  ].filter(d => d.value > 0);

  return (
    <ModalBase
      isOpen={isOpen}
      onClose={onClose}
      title="À Encaisser"
      subtitle={`${facturesEnAttente.length} facture${facturesEnAttente.length > 1 ? 's' : ''} en attente`}
      icon={Wallet}
      color={facturesOverdue.length > 0 ? 'orange' : 'blue'}
      isDark={isDark}
    >
      <div className="p-6 space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-3 gap-4">
          <StatCard
            icon={CheckCircle}
            label="Encaissé"
            value={formatMoney(stats?.encaisse, modeDiscret)}
            color="green"
            isDark={isDark}
          />
          <StatCard
            icon={Clock}
            label="En attente"
            value={formatMoney(stats?.enAttente, modeDiscret)}
            subValue={`${facturesEnAttente.length} facture${facturesEnAttente.length > 1 ? 's' : ''}`}
            color="blue"
            isDark={isDark}
          />
          <StatCard
            icon={AlertTriangle}
            label="En retard"
            value={formatMoney(stats?.montantOverdue, modeDiscret)}
            subValue={`${facturesOverdue.length} facture${facturesOverdue.length > 1 ? 's' : ''} +30j`}
            color="red"
            isDark={isDark}
            highlight={facturesOverdue.length > 0}
          />
        </div>

        {/* Chart */}
        {pieData.length > 0 && (
          <div className={cn(
            'p-4 rounded-xl',
            isDark ? 'bg-slate-800' : 'bg-white'
          )}>
            <h3 className={cn(
              'text-sm font-semibold mb-4',
              isDark ? 'text-white' : 'text-gray-900'
            )}>
              Répartition
            </h3>
            <div className="flex items-center gap-6">
              <div className="w-32 h-32">
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsPie>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={35}
                      outerRadius={55}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                  </RechartsPie>
                </ResponsiveContainer>
              </div>
              <div className="flex-1 space-y-2">
                {pieData.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className={cn('text-sm', isDark ? 'text-gray-400' : 'text-gray-600')}>
                        {item.name}
                      </span>
                    </div>
                    <span className={cn('text-sm font-semibold', isDark ? 'text-white' : 'text-gray-900')}>
                      {formatMoney(item.value, modeDiscret)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Alert for overdue */}
        {facturesOverdue.length > 0 && (
          <div className={cn(
            'p-4 rounded-xl border-2',
            isDark
              ? 'bg-red-500/10 border-red-500/30'
              : 'bg-red-50 border-red-200'
          )}>
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-500/20 flex items-center justify-center flex-shrink-0">
                <AlertTriangle size={20} className="text-red-600 dark:text-red-400" />
              </div>
              <div className="flex-1">
                <h4 className={cn(
                  'font-semibold',
                  isDark ? 'text-red-400' : 'text-red-700'
                )}>
                  Action requise
                </h4>
                <p className={cn(
                  'text-sm mt-1',
                  isDark ? 'text-red-300' : 'text-red-600'
                )}>
                  {facturesOverdue.length} facture{facturesOverdue.length > 1 ? 's' : ''} en retard de paiement pour un total de {formatMoney(stats?.montantOverdue, modeDiscret)}
                </p>
              </div>
              <ActionButton
                icon={Send}
                label="Tout relancer"
                variant="danger"
                size="sm"
                onClick={onRelanceAll}
                isDark={isDark}
              />
            </div>
          </div>
        )}

        {/* Filter tabs */}
        <div className="flex items-center gap-2">
          <span className={cn('text-sm font-medium', isDark ? 'text-gray-400' : 'text-gray-500')}>
            Filtrer:
          </span>
          {[
            { key: 'all', label: 'Toutes', count: facturesEnAttente.length },
            { key: 'overdue', label: 'En retard', count: facturesOverdue.length },
            { key: 'recent', label: 'Récentes', count: facturesEnAttente.length - facturesOverdue.length },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                filter === tab.key
                  ? isDark
                    ? 'bg-blue-500/20 text-blue-400'
                    : 'bg-blue-100 text-blue-700'
                  : isDark
                    ? 'text-gray-400 hover:bg-slate-700'
                    : 'text-gray-600 hover:bg-gray-100'
              )}
            >
              {tab.label} ({tab.count})
            </button>
          ))}
        </div>

        {/* Invoice list */}
        <div className="space-y-3">
          {filteredFactures.length > 0 ? (
            filteredFactures.slice(0, 5).map(facture => (
              <InvoiceRow
                key={facture.id}
                facture={facture}
                client={getClient(facture.client_id)}
                onView={onViewFacture}
                onRelance={onRelanceFacture}
                isDark={isDark}
              />
            ))
          ) : (
            <div className={cn(
              'p-8 rounded-xl text-center',
              isDark ? 'bg-slate-800' : 'bg-white'
            )}>
              <CheckCircle size={40} className="mx-auto mb-3 text-emerald-500" />
              <p className={cn('font-medium', isDark ? 'text-white' : 'text-gray-900')}>
                Aucune facture en attente
              </p>
              <p className={cn('text-sm mt-1', isDark ? 'text-gray-400' : 'text-gray-500')}>
                Toutes vos factures ont été réglées
              </p>
            </div>
          )}

          {filteredFactures.length > 5 && (
            <button
              onClick={onViewAllFactures}
              className={cn(
                'w-full p-3 rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2',
                isDark
                  ? 'bg-slate-800 text-blue-400 hover:bg-slate-700'
                  : 'bg-white text-blue-600 hover:bg-blue-50'
              )}
            >
              Voir toutes les factures ({filteredFactures.length})
              <ChevronRight size={16} />
            </button>
          )}
        </div>

        {/* Quick actions - Improved design */}
        <div className={cn(
          'p-4 rounded-xl',
          isDark ? 'bg-slate-800' : 'bg-white'
        )}>
          <h3 className={cn(
            'text-sm font-semibold mb-4',
            isDark ? 'text-white' : 'text-gray-900'
          )}>
            Actions rapides
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <ActionButton
              icon={Plus}
              label="Créer une facture"
              variant="primary"
              onClick={onCreateFacture}
              isDark={isDark}
              fullWidth
            />
            <ActionButton
              icon={FileText}
              label="Toutes les factures"
              variant="outline"
              onClick={onViewAllFactures}
              isDark={isDark}
              fullWidth
            />
          </div>
        </div>
      </div>
    </ModalBase>
  );
}

// ============ CE MOIS MODAL ============

export function CeMoisModal({
  isOpen,
  onClose,
  stats,
  monthlyData = [],
  yearlyData = [],
  fiveYearData = [],
  devisPipeline = {},
  recentDevis = [],
  clients = [],
  onViewDevis,
  onCreateDevis,
  onViewAllDevis,
  onRelanceDevis,
  isDark = false,
  modeDiscret = false,
  initialPeriod = 'month',
  onPeriodChange,
  // Rentability data
  chantiers = [],
  devis = [],
  depenses = [],
  pointages = [],
  equipe = [],
  ajustements = [],
  onSelectChantier,
}) {
  const [period, setPeriod] = React.useState(initialPeriod);
  const [activeTab, setActiveTab] = React.useState('overview'); // overview, rentabilite, alerts

  // Calculate KPIs for rentability
  const kpis = React.useMemo(() => {
    return calculateGlobalKPIs(chantiers, { devis, depenses, pointages, equipe, ajustements });
  }, [chantiers, devis, depenses, pointages, equipe, ajustements]);

  // Chart data for margins by chantier
  const margeChartData = React.useMemo(() => {
    return kpis.margins
      .filter(m => m.statut === 'en_cours' || m.statut === 'termine')
      .sort((a, b) => b.tauxMarge - a.tauxMarge)
      .slice(0, 6)
      .map(m => ({
        nom: m.chantierNom.length > 12 ? m.chantierNom.substring(0, 12) + '...' : m.chantierNom,
        marge: parseFloat(m.tauxMarge.toFixed(1)),
        montant: m.margeBrute,
        color: getMarginColor(m.tauxMarge, isDark).hex,
        chantierId: m.chantierId
      }));
  }, [kpis.margins, isDark]);

  // Pie chart data for cost distribution
  const costDistributionData = React.useMemo(() => {
    const totalMat = kpis.margins.reduce((s, m) => s + m.coutMateriaux, 0);
    const totalMO = kpis.margins.reduce((s, m) => s + m.coutMO, 0);
    const total = totalMat + totalMO;

    if (total === 0) return [];

    return [
      { name: 'Matériaux', value: totalMat, color: '#3b82f6', percent: (totalMat / total * 100).toFixed(0) },
      { name: 'Main d\'oeuvre', value: totalMO, color: '#f59e0b', percent: (totalMO / total * 100).toFixed(0) },
    ].filter(d => d.value > 0);
  }, [kpis.margins]);

  const handlePeriodChange = (newPeriod) => {
    setPeriod(newPeriod);
    onPeriodChange?.(newPeriod);
  };

  const getClient = (clientId) => clients.find(c => c.id === clientId);

  // Get stats based on period
  const periodStats = React.useMemo(() => {
    if (period === 'year') {
      return {
        totalCA: stats?.totalCAYear || stats?.totalCA || 0,
        tendance: stats?.tendanceYear ?? stats?.tendance ?? 0,
        tauxMarge: stats?.tauxMargeYear ?? stats?.tauxMarge ?? 0,
        marge: stats?.margeYear || stats?.marge || 0,
        tauxConversion: stats?.tauxConversionYear ?? stats?.tauxConversion ?? 0,
      };
    }
    if (period === '5years') {
      return {
        totalCA: stats?.totalCA5Y || stats?.totalCA || 0,
        tendance: stats?.tendance5Y ?? stats?.tendance ?? 0,
        tauxMarge: stats?.tauxMarge5Y ?? stats?.tauxMarge ?? 0,
        marge: stats?.marge5Y || stats?.marge || 0,
        tauxConversion: stats?.tauxConversion5Y ?? stats?.tauxConversion ?? 0,
      };
    }
    return {
      totalCA: stats?.totalCA || 0,
      tendance: stats?.tendance ?? 0,
      tauxMarge: stats?.tauxMarge ?? 0,
      marge: stats?.marge || 0,
      tauxConversion: stats?.tauxConversion ?? 0,
    };
  }, [stats, period]);

  // Prepare chart data based on period
  const chartData = React.useMemo(() => {
    if (period === 'year' && yearlyData.length > 0) {
      return yearlyData.map(d => ({
        name: d.label,
        value: d.revenue,
      }));
    }
    if (period === '5years' && fiveYearData.length > 0) {
      return fiveYearData.map(d => ({
        name: d.label,
        value: d.revenue,
      }));
    }
    return monthlyData.map(d => ({
      name: d.label,
      value: d.revenue,
    }));
  }, [monthlyData, yearlyData, fiveYearData, period]);

  const periodLabels = {
    month: new Intl.DateTimeFormat('fr-FR', { month: 'long' }).format(new Date()),
    year: new Date().getFullYear().toString(),
    '5years': `${new Date().getFullYear() - 4} - ${new Date().getFullYear()}`,
  };

  const chartTitles = {
    month: 'Évolution sur 6 mois',
    year: 'Évolution sur 12 mois',
    '5years': 'Évolution sur 5 ans',
  };

  const trendLabels = {
    month: 'vs mois dernier',
    year: 'vs année dernière',
    '5years': 'vs période précédente',
  };

  return (
    <ModalBase
      isOpen={isOpen}
      onClose={onClose}
      title={`Performance ${periodLabels[period]}`}
      subtitle={`${kpis.chantiersEnCours} chantier${kpis.chantiersEnCours > 1 ? 's' : ''} en cours`}
      icon={TrendingUp}
      color={periodStats.tendance >= 0 ? 'green' : 'red'}
      isDark={isDark}
      headerExtra={
        <PeriodSelector
          value={period}
          onChange={handlePeriodChange}
          inHeader
        />
      }
    >
      <div className="p-6 space-y-6">
        {/* Period selector (visible in content for mobile) */}
        <div className="sm:hidden flex justify-center">
          <PeriodSelector
            value={period}
            onChange={handlePeriodChange}
            isDark={isDark}
          />
        </div>

        {/* Tab selector */}
        <div className={cn(
          'flex gap-2 p-1 rounded-xl',
          isDark ? 'bg-slate-800' : 'bg-gray-100'
        )}>
          {[
            { id: 'overview', label: 'Vue globale', icon: BarChart3 },
            { id: 'rentabilite', label: 'Rentabilité', icon: Target },
            { id: 'alerts', label: 'Alertes', icon: AlertTriangle, badge: kpis.criticalAlerts }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all',
                activeTab === tab.id
                  ? isDark
                    ? 'bg-slate-700 text-white shadow-sm'
                    : 'bg-white text-gray-900 shadow-sm'
                  : isDark
                    ? 'text-gray-400 hover:text-gray-200'
                    : 'text-gray-600 hover:text-gray-900'
              )}
            >
              <tab.icon size={16} />
              <span className="hidden sm:inline">{tab.label}</span>
              {tab.badge > 0 && (
                <span className="px-1.5 py-0.5 bg-red-500 text-white text-[10px] rounded-full">{tab.badge}</span>
              )}
            </button>
          ))}
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <>
            {/* Main stats */}
            <div className="grid grid-cols-2 gap-4">
              <div className={cn(
                'p-5 rounded-xl',
                isDark ? 'bg-slate-800' : 'bg-white'
              )}>
                <div className="flex items-center gap-2 mb-2">
                  <Euro size={16} className={isDark ? 'text-gray-400' : 'text-gray-500'} />
                  <span className={cn('text-xs', isDark ? 'text-gray-400' : 'text-gray-500')}>
                    Chiffre d'affaires
                  </span>
                </div>
                <p className={cn('text-3xl font-bold', isDark ? 'text-white' : 'text-gray-900')}>
                  {formatMoney(periodStats.totalCA, modeDiscret)}
                </p>
                {periodStats.tendance !== null && periodStats.tendance !== undefined && (
                  <div className={cn(
                    'inline-flex items-center gap-1 mt-2 px-2 py-1 rounded-full text-xs font-semibold',
                    periodStats.tendance >= 0
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400'
                      : 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400'
                  )}>
                    {periodStats.tendance >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                    {periodStats.tendance >= 0 ? '+' : ''}{periodStats.tendance}% {trendLabels[period]}
                  </div>
                )}
              </div>

              <div className={cn(
                'p-5 rounded-xl',
                isDark ? 'bg-slate-800' : 'bg-white'
              )}>
                <div className="flex items-center gap-2 mb-2">
                  <Target size={16} className={isDark ? 'text-gray-400' : 'text-gray-500'} />
                  <span className={cn('text-xs', isDark ? 'text-gray-400' : 'text-gray-500')}>
                    Marge brute
                  </span>
                </div>
                <p className={cn(
                  'text-3xl font-bold',
                  periodStats.tauxMarge >= 30
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : periodStats.tauxMarge >= 15
                      ? isDark ? 'text-white' : 'text-gray-900'
                      : 'text-red-600 dark:text-red-400'
                )}>
                  {Math.round(periodStats.tauxMarge || 0)}%
                </p>
                <p className={cn('text-sm mt-2', isDark ? 'text-gray-400' : 'text-gray-500')}>
                  {formatMoney(periodStats.marge, modeDiscret)} de marge
                </p>
              </div>
            </div>

            {/* Evolution chart */}
            {chartData.length > 0 && (
              <div className={cn(
                'p-4 rounded-xl',
                isDark ? 'bg-slate-800' : 'bg-white'
              )}>
                <h3 className={cn(
                  'text-sm font-semibold mb-4',
                  isDark ? 'text-white' : 'text-gray-900'
                )}>
                  {chartTitles[period]}
                </h3>
                <div className="h-40">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <XAxis
                        dataKey="name"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 11, fill: isDark ? '#9ca3af' : '#6b7280' }}
                      />
                      <YAxis hide />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: isDark ? '#1e293b' : '#fff',
                          border: isDark ? '1px solid #334155' : '1px solid #e5e7eb',
                          borderRadius: '8px',
                        }}
                        formatter={(value) => [formatMoney(value, modeDiscret), 'CA']}
                      />
                      <Area
                        type="monotone"
                        dataKey="value"
                        stroke="#10b981"
                        strokeWidth={2}
                        fill="url(#colorRevenue)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* Pipeline stats (only show for monthly view) */}
            {period === 'month' && (
              <div className={cn(
                'p-4 rounded-xl',
                isDark ? 'bg-slate-800' : 'bg-white'
              )}>
                <h3 className={cn(
                  'text-sm font-semibold mb-4',
                  isDark ? 'text-white' : 'text-gray-900'
                )}>
                  Pipeline commercial
                </h3>
                <div className="grid grid-cols-4 gap-3">
                  {[
                    { label: 'Brouillons', count: devisPipeline.brouillon?.length || 0, color: 'gray' },
                    { label: 'Envoyés', count: devisPipeline.envoye?.length || 0, color: 'blue' },
                    { label: 'Acceptés', count: devisPipeline.accepte?.length || 0, color: 'green' },
                    { label: 'Refusés', count: devisPipeline.refuse?.length || 0, color: 'red' },
                  ].map((item, idx) => (
                    <div
                      key={idx}
                      className={cn(
                        'p-3 rounded-lg text-center',
                        isDark ? 'bg-slate-700' : 'bg-gray-50'
                      )}
                    >
                      <p className={cn(
                        'text-2xl font-bold',
                        item.color === 'green' && 'text-emerald-600 dark:text-emerald-400',
                        item.color === 'blue' && 'text-blue-600 dark:text-blue-400',
                        item.color === 'red' && 'text-red-600 dark:text-red-400',
                        item.color === 'gray' && (isDark ? 'text-gray-400' : 'text-gray-600')
                      )}>
                        {item.count}
                      </p>
                      <p className={cn('text-xs mt-1', isDark ? 'text-gray-400' : 'text-gray-500')}>
                        {item.label}
                      </p>
                    </div>
                  ))}
                </div>

                {/* Conversion funnel */}
                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-slate-700">
                  <div className="flex items-center justify-between">
                    <span className={cn('text-sm', isDark ? 'text-gray-400' : 'text-gray-600')}>
                      Taux de conversion
                    </span>
                    <div className="flex items-center gap-2">
                      <div className={cn(
                        'h-2 flex-1 w-32 rounded-full overflow-hidden',
                        isDark ? 'bg-slate-600' : 'bg-gray-200'
                      )}>
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-600"
                          style={{ width: `${Math.min(periodStats.tauxConversion || 0, 100)}%` }}
                        />
                      </div>
                      <span className={cn(
                        'text-sm font-semibold',
                        (periodStats.tauxConversion || 0) >= 50
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : isDark ? 'text-white' : 'text-gray-900'
                      )}>
                        {Math.round(periodStats.tauxConversion || 0)}%
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Pending devis to follow up (only show for monthly view) */}
            {period === 'month' && devisPipeline.envoye?.length > 0 && (
              <div className={cn(
                'p-4 rounded-xl',
                isDark ? 'bg-slate-800' : 'bg-white'
              )}>
                <div className="flex items-center justify-between mb-4">
                  <h3 className={cn(
                    'text-sm font-semibold',
                    isDark ? 'text-white' : 'text-gray-900'
                  )}>
                    Devis en attente de réponse
                  </h3>
                  <span className={cn(
                    'px-2 py-1 rounded-full text-xs font-semibold',
                    isDark ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-100 text-blue-700'
                  )}>
                    {devisPipeline.envoye.length}
                  </span>
                </div>
                <div className="space-y-2">
                  {devisPipeline.envoye.slice(0, 3).map(devisItem => {
                    const client = getClient(devisItem.client_id);
                    const days = daysSince(devisItem.date);
                    return (
                      <div
                        key={devisItem.id}
                        className={cn(
                          'flex items-center justify-between p-3 rounded-lg',
                          isDark ? 'bg-slate-700' : 'bg-gray-50'
                        )}
                      >
                        <div>
                          <p className={cn('text-sm font-medium', isDark ? 'text-white' : 'text-gray-900')}>
                            {client?.nom || 'Client'}
                          </p>
                          <p className={cn('text-xs', isDark ? 'text-gray-400' : 'text-gray-500')}>
                            {devisItem.numero || `#${devisItem.id?.slice(-6)}`} • {days}j
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={cn('text-sm font-semibold', isDark ? 'text-white' : 'text-gray-900')}>
                            {formatMoney(devisItem.total_ttc, modeDiscret)}
                          </span>
                          <ActionButton
                            icon={Send}
                            label=""
                            variant="ghost"
                            size="sm"
                            onClick={() => onRelanceDevis?.(devisItem)}
                            isDark={isDark}
                            className="!p-2"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
                {devisPipeline.envoye.length > 3 && (
                  <button
                    onClick={onViewAllDevis}
                    className={cn(
                      'w-full mt-3 p-2 text-sm font-medium text-center rounded-lg transition-colors',
                      isDark
                        ? 'text-blue-400 hover:bg-slate-700'
                        : 'text-blue-600 hover:bg-blue-50'
                    )}
                  >
                    Voir tous les devis en attente
                  </button>
                )}
              </div>
            )}
          </>
        )}

        {/* Rentabilite Tab */}
        {activeTab === 'rentabilite' && (
          <>
            {/* KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Marge moyenne */}
              <div className={cn('rounded-xl border p-4', isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200')}>
                <div className="flex items-center justify-between mb-2">
                  <span className={cn('text-xs', isDark ? 'text-gray-400' : 'text-gray-500')}>Marge moyenne</span>
                  <div className={cn('p-1.5 rounded-lg', getMarginColor(kpis.margeGlobale, isDark).bg)}>
                    <Target size={14} className={getMarginColor(kpis.margeGlobale, isDark).text} />
                  </div>
                </div>
                <p className={cn('text-xl font-bold', getMarginColor(kpis.margeGlobale, isDark).text)}>
                  {modeDiscret ? '··%' : `${kpis.margeGlobale.toFixed(1)}%`}
                </p>
                <div className="flex items-center gap-1 mt-1">
                  {kpis.tendance >= 0 ? (
                    <ArrowUpRight size={12} className="text-emerald-500" />
                  ) : (
                    <ArrowDownRight size={12} className="text-red-500" />
                  )}
                  <span className={cn('text-[10px]', kpis.tendance >= 0 ? 'text-emerald-500' : 'text-red-500')}>
                    {kpis.tendance >= 0 ? '+' : ''}{kpis.tendance.toFixed(1)}% vs terminés
                  </span>
                </div>
              </div>

              {/* CA Total */}
              <div className={cn('rounded-xl border p-4', isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200')}>
                <div className="flex items-center justify-between mb-2">
                  <span className={cn('text-xs', isDark ? 'text-gray-400' : 'text-gray-500')}>CA Total</span>
                  <div className={cn('p-1.5 rounded-lg', isDark ? 'bg-emerald-900/30' : 'bg-emerald-100')}>
                    <DollarSign size={14} className="text-emerald-500" />
                  </div>
                </div>
                <p className={cn('text-xl font-bold', isDark ? 'text-white' : 'text-gray-900')}>
                  {formatMoney(kpis.caTotal, modeDiscret)}
                </p>
                <p className={cn('text-[10px]', isDark ? 'text-gray-400' : 'text-gray-500')}>
                  {formatMoney(kpis.aEncaisser, modeDiscret)} à encaisser
                </p>
              </div>

              {/* Chantiers rentables */}
              <div className={cn('rounded-xl border p-4', isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200')}>
                <div className="flex items-center justify-between mb-2">
                  <span className={cn('text-xs', isDark ? 'text-gray-400' : 'text-gray-500')}>Chantiers rentables</span>
                  <div className={cn('p-1.5 rounded-lg', isDark ? 'bg-blue-900/30' : 'bg-blue-100')}>
                    <CheckCircle size={14} className="text-blue-500" />
                  </div>
                </div>
                <p className={cn('text-xl font-bold', isDark ? 'text-white' : 'text-gray-900')}>
                  {kpis.chantiersRentables}/{kpis.nombreChantiers}
                </p>
                <p className={cn('text-[10px]', isDark ? 'text-gray-400' : 'text-gray-500')}>
                  {modeDiscret ? '··%' : `${kpis.tauxRentabilite.toFixed(1)}%`} du total
                </p>
              </div>

              {/* Alertes */}
              <div className={cn('rounded-xl border p-4', isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200')}>
                <div className="flex items-center justify-between mb-2">
                  <span className={cn('text-xs', isDark ? 'text-gray-400' : 'text-gray-500')}>Alertes actives</span>
                  <div className={cn('p-1.5 rounded-lg', kpis.criticalAlerts > 0 ? (isDark ? 'bg-red-900/30' : 'bg-red-100') : (isDark ? 'bg-slate-700' : 'bg-gray-100'))}>
                    <AlertTriangle size={14} className={kpis.criticalAlerts > 0 ? 'text-red-500' : (isDark ? 'text-gray-400' : 'text-gray-500')} />
                  </div>
                </div>
                <p className={cn('text-xl font-bold', kpis.criticalAlerts > 0 ? 'text-red-500' : (isDark ? 'text-white' : 'text-gray-900'))}>
                  {kpis.totalAlerts}
                </p>
                <p className={cn('text-[10px]', isDark ? 'text-gray-400' : 'text-gray-500')}>
                  {kpis.criticalAlerts} critique{kpis.criticalAlerts > 1 ? 's' : ''}
                </p>
              </div>
            </div>

            {/* Margin Chart + Cost Distribution */}
            <div className="grid lg:grid-cols-3 gap-4">
              {/* Margin by Chantier */}
              <div className={cn('lg:col-span-2 rounded-xl border p-4', isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200')}>
                <h3 className={cn('font-semibold mb-3 text-sm', isDark ? 'text-white' : 'text-gray-900')}>Marge par chantier</h3>
                {margeChartData.length > 0 ? (
                  <>
                    <ResponsiveContainer width="100%" height={180}>
                      <BarChart data={margeChartData} layout="vertical">
                        <XAxis type="number" domain={[0, 'auto']} tickFormatter={(v) => `${v}%`} tick={{ fontSize: 10 }} />
                        <YAxis type="category" dataKey="nom" width={90} tick={{ fontSize: 10 }} />
                        <Tooltip
                          content={({ active, payload }) => {
                            if (!active || !payload?.length) return null;
                            const data = payload[0].payload;
                            return (
                              <div className={cn('border rounded-lg p-2 shadow-lg text-xs', isDark ? 'bg-slate-700 border-slate-600' : 'bg-white border-gray-200')}>
                                <p className={cn('font-medium', isDark ? 'text-white' : 'text-gray-900')}>{data.nom}</p>
                                <p className={isDark ? 'text-gray-300' : 'text-gray-600'}>Marge: {data.marge}%</p>
                                <p className={isDark ? 'text-gray-300' : 'text-gray-600'}>{formatMoney(data.montant, modeDiscret)}</p>
                              </div>
                            );
                          }}
                        />
                        <Bar dataKey="marge" radius={[0, 4, 4, 0]} cursor="pointer" onClick={(data) => onSelectChantier?.(data.chantierId)}>
                          {margeChartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>

                    {/* Legend */}
                    <div className="flex items-center justify-center gap-3 mt-3 flex-wrap">
                      <div className="flex items-center gap-1">
                        <div className="w-2 h-2 rounded-full bg-red-500" />
                        <span className={cn('text-[10px]', isDark ? 'text-gray-400' : 'text-gray-500')}>&lt; {MARGIN_THRESHOLDS.CRITICAL}%</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-2 h-2 rounded-full bg-amber-500" />
                        <span className={cn('text-[10px]', isDark ? 'text-gray-400' : 'text-gray-500')}>{MARGIN_THRESHOLDS.CRITICAL}-{MARGIN_THRESHOLDS.WARNING}%</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-2 h-2 rounded-full bg-emerald-500" />
                        <span className={cn('text-[10px]', isDark ? 'text-gray-400' : 'text-gray-500')}>&gt; {MARGIN_THRESHOLDS.GOOD}%</span>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="h-[180px] flex items-center justify-center">
                    <p className={isDark ? 'text-gray-400' : 'text-gray-500'}>Aucune donnée</p>
                  </div>
                )}
              </div>

              {/* Cost Distribution */}
              <div className={cn('rounded-xl border p-4', isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200')}>
                <h3 className={cn('font-semibold mb-3 text-sm', isDark ? 'text-white' : 'text-gray-900')}>Répartition des coûts</h3>
                {costDistributionData.length > 0 ? (
                  <>
                    <ResponsiveContainer width="100%" height={120}>
                      <RechartsPie>
                        <Pie
                          data={costDistributionData}
                          cx="50%"
                          cy="50%"
                          innerRadius={35}
                          outerRadius={55}
                          paddingAngle={2}
                          dataKey="value"
                        >
                          {costDistributionData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                      </RechartsPie>
                    </ResponsiveContainer>
                    <div className="space-y-2 mt-3">
                      {costDistributionData.map((item, i) => (
                        <div key={i} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full" style={{ background: item.color }} />
                            <span className={cn('text-xs', isDark ? 'text-gray-300' : 'text-gray-600')}>{item.name}</span>
                          </div>
                          <span className={cn('text-xs font-medium', isDark ? 'text-white' : 'text-gray-900')}>{item.percent}%</span>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="h-[180px] flex items-center justify-center">
                    <p className={cn('text-xs', isDark ? 'text-gray-400' : 'text-gray-500')}>Aucune dépense</p>
                  </div>
                )}
              </div>
            </div>

            {/* Financial Summary */}
            <div className={cn('rounded-xl border p-4', isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200')}>
              <h3 className={cn('font-semibold mb-4 text-sm', isDark ? 'text-white' : 'text-gray-900')}>Résumé financier</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div>
                  <p className={cn('text-xs mb-1', isDark ? 'text-gray-400' : 'text-gray-500')}>Chiffre d'affaires</p>
                  <p className={cn('text-lg font-bold', isDark ? 'text-white' : 'text-gray-900')}>{formatMoney(kpis.caTotal, modeDiscret)}</p>
                </div>
                <div>
                  <p className={cn('text-xs mb-1', isDark ? 'text-gray-400' : 'text-gray-500')}>Coûts totaux</p>
                  <p className="text-lg font-bold text-red-500">{formatMoney(kpis.coutTotal, modeDiscret)}</p>
                </div>
                <div>
                  <p className={cn('text-xs mb-1', isDark ? 'text-gray-400' : 'text-gray-500')}>Marge brute</p>
                  <p className={cn('text-lg font-bold', kpis.margeGlobaleMontant >= 0 ? 'text-emerald-500' : 'text-red-500')}>
                    {formatMoney(kpis.margeGlobaleMontant, modeDiscret)}
                  </p>
                </div>
                <div>
                  <p className={cn('text-xs mb-1', isDark ? 'text-gray-400' : 'text-gray-500')}>Taux de marge</p>
                  <p className={cn('text-lg font-bold', getMarginColor(kpis.margeGlobale, isDark).text)}>
                    {modeDiscret ? '··%' : `${kpis.margeGlobale.toFixed(1)}%`}
                  </p>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Alerts Tab */}
        {activeTab === 'alerts' && (
          <div className="space-y-3">
            {kpis.alerts.length > 0 ? (
              kpis.alerts.map((alert, i) => (
                <div
                  key={i}
                  onClick={() => onSelectChantier?.(alert.chantierId)}
                  className={cn(
                    'rounded-xl border p-4 cursor-pointer hover:shadow-lg transition-all',
                    isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200',
                    alert.severity === 'critical' && (isDark ? 'border-red-800' : 'border-red-300'),
                    alert.severity === 'warning' && (isDark ? 'border-amber-800' : 'border-amber-300')
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div className={cn(
                      'p-2 rounded-xl',
                      alert.severity === 'critical' ? (isDark ? 'bg-red-900/30' : 'bg-red-100')
                        : alert.severity === 'warning' ? (isDark ? 'bg-amber-900/30' : 'bg-amber-100')
                        : (isDark ? 'bg-blue-900/30' : 'bg-blue-100')
                    )}>
                      <AlertCircle size={18} className={
                        alert.severity === 'critical' ? 'text-red-500'
                          : alert.severity === 'warning' ? 'text-amber-500'
                          : 'text-blue-500'
                      } />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className={cn('font-medium text-sm', isDark ? 'text-white' : 'text-gray-900')}>{alert.title}</p>
                        <span className={cn(
                          'text-[10px] px-2 py-0.5 rounded-full whitespace-nowrap',
                          alert.severity === 'critical' ? 'bg-red-500 text-white'
                            : alert.severity === 'warning' ? 'bg-amber-500 text-white'
                            : (isDark ? 'bg-slate-700 text-gray-300' : 'bg-gray-100 text-gray-600')
                        )}>
                          {alert.severity === 'critical' ? 'Critique' : alert.severity === 'warning' ? 'Attention' : 'Info'}
                        </span>
                      </div>
                      <p className={cn('text-xs mt-1', isDark ? 'text-gray-300' : 'text-gray-600')}>{alert.message}</p>
                      {alert.suggestion && (
                        <p className={cn('text-[10px] mt-2 italic', isDark ? 'text-gray-400' : 'text-gray-500')}>{alert.suggestion}</p>
                      )}
                    </div>
                    <ChevronRight size={16} className={isDark ? 'text-gray-400' : 'text-gray-500'} />
                  </div>
                </div>
              ))
            ) : (
              <div className={cn('rounded-xl border p-8 text-center', isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200')}>
                <CheckCircle size={40} className="mx-auto mb-3 text-emerald-500" />
                <h3 className={cn('font-bold mb-2', isDark ? 'text-white' : 'text-gray-900')}>Tout va bien !</h3>
                <p className={cn('text-sm', isDark ? 'text-gray-400' : 'text-gray-500')}>Aucune alerte active sur vos chantiers</p>
              </div>
            )}
          </div>
        )}

        {/* Quick actions */}
        <div className={cn(
          'p-4 rounded-xl',
          isDark ? 'bg-slate-800' : 'bg-white'
        )}>
          <h3 className={cn(
            'text-sm font-semibold mb-4',
            isDark ? 'text-white' : 'text-gray-900'
          )}>
            Actions rapides
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <ActionButton
              icon={Plus}
              label="Créer un devis"
              variant="success"
              onClick={onCreateDevis}
              isDark={isDark}
              fullWidth
            />
            <ActionButton
              icon={BarChart3}
              label="Tous les devis"
              variant="outline"
              onClick={onViewAllDevis}
              isDark={isDark}
              fullWidth
            />
          </div>
        </div>
      </div>
    </ModalBase>
  );
}
