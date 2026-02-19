/**
 * Dashboard - Main dashboard component with new modular UX/UI
 *
 * Features:
 * - HeroSection with dynamic greeting
 * - Smart suggestions from actionSuggestions
 * - Enhanced KPICards with trends
 * - Modular widgets (Devis, Chantiers, Tresorerie, Stock)
 * - Inline actions with QuickActions/ActionMenu
 * - RelanceModal integration
 *
 * @module Dashboard
 */

import React, { useState, useMemo, useEffect, useCallback, memo } from 'react';
import {
  TrendingUp,
  TrendingDown,
  FileText,
  Calendar,
  Users,
  Plus,
  AlertTriangle,
  Wallet,
  Activity,
  ChevronDown,
  HardHat,
  Sparkles,
  BarChart3,
  Lightbulb,
  Home,
  DollarSign,
  Hammer,
  CheckCircle,
  Clock,
  Send,
  HelpCircle,
  X,
  Receipt,
  Timer,
  Target,
  Zap,
  Settings,
  Eye,
  EyeOff,
  GripVertical,
  LayoutDashboard,
  ShieldCheck,
  MessageCircle,
  ClipboardList,
  Mic,
  ArrowRight,
  Banknote,
  ChevronRight,
} from 'lucide-react';

// Dashboard components
import {
  HeroSection,
  HeroSectionSkeleton,
  KPICard,
  KPICardSkeleton,
  MiniKPICard,
  DevisWidget,
  DevisWidgetSkeleton,
  ChantiersWidget,
  ChantiersWidgetSkeleton,
  TresorerieWidget,
  TresorerieWidgetSkeleton,
  StockWidget,
  StockWidgetSkeleton,
  SuggestionsSection,
  SuggestionsSectionSkeleton,
  WeatherAlertsWidget,
  ActionBanner,
  ActionBannerStack,
  // Unified overview widget
  OverviewWidget,
  RevenueChartWidget,
  // Health Score Widget
  ScoreSanteWidget,
  // Bank Widget
  BankWidget,
  BankWidgetSkeleton,
  // KPI Modals
  EncaisserModal,
  CeMoisModal,
} from './dashboard/index';

// UI Components
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';

// Modals
import { RelanceModal } from './modals/RelanceModal';
import { MarginAnalysisModal } from './modals/MarginAnalysisModal';

// Services & Utils
import { getPendingRelances, formatRelanceForDisplay } from '../services/RelanceService';
import {
  generateSuggestionsFromContext,
  transformSuggestions,
} from '../lib/actionSuggestions';
import { useData } from '../context/DataContext';
import DashboardMemos from './dashboard/DashboardMemos';
import OnboardingChecklist from './dashboard/OnboardingChecklist';

// Subscription
import UsageAlerts from './subscription/UsageAlerts';

// AI Chat
import ChatInterface from './ai/ChatInterface';

// Devis Express
import DevisExpressModal from './DevisExpressModal';

// ============ CONSTANTS ============

const PERIOD_OPTIONS = [
  { value: 'month', label: 'Ce mois' },
  { value: 'quarter', label: 'Ce trimestre' },
  { value: 'year', label: 'Cette année' },
];

// ============ UTILITY FUNCTIONS ============

/**
 * Format currency with French locale
 */
function formatMoney(amount, discrete = false) {
  if (discrete) return '·····';
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount || 0);
}

/**
 * Get margin color based on percentage
 */
function getMargeColor(margin) {
  if (margin >= 50) return '#10b981';
  if (margin >= 30) return '#f59e0b';
  return '#ef4444';
}

/**
 * Calculate days since date
 */
function daysSince(date) {
  const d = date instanceof Date ? date : new Date(date);
  const now = new Date();
  return Math.floor((now - d) / (1000 * 60 * 60 * 24));
}

// ============ SUB-COMPONENTS ============

/**
 * NewUserWelcome - Welcome screen for new users
 */
const NewUserWelcome = memo(function NewUserWelcome({ isDark, couleur, setPage, setCreateMode }) {
  const cardBg = isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200';
  const textPrimary = isDark ? 'text-white' : 'text-slate-900';
  const textSecondary = isDark ? 'text-slate-300' : 'text-slate-600';
  const textMuted = isDark ? 'text-slate-400' : 'text-slate-500';

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-4xl mx-auto">
      {/* Welcome Card */}
      <div className={`${cardBg} rounded-2xl border overflow-hidden`}>
        <div
          className="p-8 sm:p-12 text-center"
          style={{
            background: `linear-gradient(135deg, ${couleur}15 0%, ${couleur}05 100%)`,
          }}
        >
          <div
            className="w-16 h-16 rounded-2xl mx-auto mb-6 flex items-center justify-center"
            style={{ background: couleur }}
          >
            <Sparkles size={32} className="text-white" />
          </div>
          <h1 className={`text-2xl sm:text-3xl font-bold mb-3 ${textPrimary}`}>
            Bienvenue dans ChantierPro
          </h1>
          <p className={`text-base sm:text-lg ${textSecondary} max-w-lg mx-auto`}>
            Votre assistant pour gérer devis, factures et chantiers. Commençons !
          </p>
        </div>

        {/* Getting Started Steps */}
        <div className={`p-6 sm:p-8 border-t ${isDark ? 'border-slate-700' : 'border-slate-100'}`}>
          <p className={`text-xs font-medium uppercase tracking-wider mb-5 ${textMuted}`}>
            Pour bien démarrer
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              {
                step: 1,
                icon: Settings,
                title: 'Configurer mon entreprise',
                desc: 'Nom, adresse, SIRET, logo...',
                onClick: () => setPage?.('settings'),
              },
              {
                step: 2,
                icon: Users,
                title: 'Ajouter un client',
                desc: 'Créez votre premier contact',
                onClick: () => {
                  setCreateMode?.((p) => ({ ...p, client: true }));
                  setPage?.('clients');
                },
              },
              {
                step: 3,
                icon: FileText,
                title: 'Créer un devis',
                desc: 'Lancez votre première affaire',
                onClick: () => {
                  setCreateMode?.((p) => ({ ...p, devis: true }));
                  setPage?.('devis');
                },
              },
            ].map((item) => (
              <button
                key={item.step}
                onClick={item.onClick}
                className={`group p-5 rounded-xl border text-left transition-all hover:shadow-lg hover:-translate-y-1 ${
                  isDark
                    ? 'border-slate-700 hover:border-slate-600 bg-slate-800/50'
                    : 'border-slate-200 hover:border-slate-300 bg-slate-50/50'
                }`}
              >
                <div className="flex items-center gap-3 mb-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ background: `${couleur}20` }}
                  >
                    <span className="text-lg font-bold" style={{ color: couleur }}>
                      {item.step}
                    </span>
                  </div>
                  <item.icon size={20} className={textMuted} />
                </div>
                <h3 className={`font-semibold mb-1 ${textPrimary}`}>{item.title}</h3>
                <p className={`text-sm ${textMuted}`}>{item.desc}</p>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Preview Card */}
      <div className={`${cardBg} rounded-2xl border p-6 sm:p-8`}>
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-xl" style={{ background: `${couleur}20` }}>
            <BarChart3 size={20} style={{ color: couleur }} />
          </div>
          <div>
            <h2 className={`font-semibold ${textPrimary}`}>Votre futur tableau de bord</h2>
            <p className={`text-sm ${textMuted}`}>
              Voici ce que vous verrez une fois vos données ajoutées
            </p>
          </div>
        </div>

        {/* Sample KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6 opacity-60">
          {[
            { icon: DollarSign, label: "Chiffre d'affaires", value: '12 500 €', sub: '+15% ce mois' },
            { icon: TrendingUp, label: 'Marge nette', value: '3 750 €', sub: '30% de marge' },
            { icon: FileText, label: 'Devis en attente', value: '3', sub: '8 500 € potentiel' },
            { icon: Hammer, label: 'Chantiers actifs', value: '2', sub: 'En cours' },
          ].map((kpi, i) => (
            <div
              key={i}
              className={`p-4 rounded-xl border ${
                isDark ? 'border-slate-700 bg-slate-800/50' : 'border-slate-200 bg-slate-50'
              }`}
            >
              <div className="flex items-center gap-2 mb-2">
                <kpi.icon size={16} style={{ color: couleur }} />
                <span className={`text-xs ${textMuted}`}>{kpi.label}</span>
              </div>
              <p className="text-xl font-bold" style={{ color: couleur }}>
                {kpi.value}
              </p>
              <p className={`text-xs ${textMuted}`}>{kpi.sub}</p>
            </div>
          ))}
        </div>

        <div
          className={`p-4 rounded-xl ${
            isDark ? 'bg-blue-900/20 border border-blue-800' : 'bg-blue-50 border border-blue-200'
          }`}
        >
          <div className="flex items-start gap-3">
            <Lightbulb size={20} className="text-blue-500 mt-0.5" />
            <div>
              <p className={`font-medium ${isDark ? 'text-blue-300' : 'text-blue-800'}`}>
                Astuce de pro
              </p>
              <p className={`text-sm mt-1 ${isDark ? 'text-blue-200' : 'text-blue-700'}`}>
                Commencez par remplir votre catalogue de prestations. Vous pourrez ensuite créer
                des devis en quelques clics !
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

/**
 * PeriodSelector - Dropdown for selecting time period
 */
const PeriodSelector = memo(function PeriodSelector({ value, onChange, isDark }) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`appearance-none pl-3 pr-8 py-2 rounded-lg border text-sm font-medium cursor-pointer ${
          isDark
            ? 'bg-slate-800 border-slate-700 text-white'
            : 'bg-white border-gray-200 text-gray-700'
        }`}
      >
        {PERIOD_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      <ChevronDown
        size={16}
        className={`absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none ${
          isDark ? 'text-slate-500' : 'text-gray-400'
        }`}
      />
    </div>
  );
});

/**
 * RecentActivityWidget - Shows recent activity feed
 */
const RecentActivityWidget = memo(function RecentActivityWidget({
  activities,
  isDark,
  formatMoney,
  onActivityClick,
}) {
  const colorMap = {
    emerald: {
      bg: isDark ? 'bg-emerald-500/10' : 'bg-emerald-50',
      icon: isDark ? 'text-emerald-400' : 'text-emerald-600',
    },
    blue: {
      bg: isDark ? 'bg-blue-500/10' : 'bg-blue-50',
      icon: isDark ? 'text-blue-400' : 'text-blue-600',
    },
    purple: {
      bg: isDark ? 'bg-purple-500/10' : 'bg-purple-50',
      icon: isDark ? 'text-purple-400' : 'text-purple-600',
    },
    orange: {
      bg: isDark ? 'bg-orange-500/10' : 'bg-orange-50',
      icon: isDark ? 'text-orange-400' : 'text-orange-600',
    },
  };

  return (
    <div
      className={`
        rounded-2xl border overflow-hidden h-full flex flex-col
        transition-shadow duration-200 hover:shadow-md
        ${isDark
          ? 'bg-slate-800 border-slate-700/50'
          : 'bg-white border-gray-100 shadow-sm'
        }
      `}
    >
      {/* Header */}
      <div className="flex items-center gap-2.5 p-5 pb-4">
        <div
          className={`
            flex items-center justify-center w-9 h-9 rounded-xl
            ${isDark ? 'bg-blue-500/10' : 'bg-blue-50'}
          `}
        >
          <Activity size={18} className="text-blue-500" />
        </div>
        <h2 className={`text-base font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
          Activité récente
        </h2>
      </div>

      {/* Body */}
      <div className="flex-1 px-5 pb-5 overflow-auto">
        {activities?.length > 0 ? (
          <div className="space-y-2.5">
            {activities.map((activity) => {
              const colors = colorMap[activity.color] || colorMap.blue;
              return (
                <button
                  key={activity.id}
                  type="button"
                  onClick={() => onActivityClick?.(activity)}
                  className={`
                    w-full text-left p-3.5 rounded-xl transition-colors duration-150 cursor-pointer
                    ${isDark ? 'bg-slate-700/30 hover:bg-slate-700/50' : 'bg-gray-50/80 hover:bg-gray-100/80'}
                  `}
                >
                  <div className="flex items-start gap-3">
                    <div className={`flex-shrink-0 p-2 rounded-xl ${colors.bg}`}>
                      {activity.icon && <activity.icon size={16} className={colors.icon} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium leading-snug ${isDark ? 'text-white' : 'text-gray-900'}`}>
                        {activity.title}
                      </p>
                      <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                        {activity.subtitle}
                      </p>
                      {activity.amount && (
                        <p className={`text-sm font-semibold mt-1.5 ${colors.icon}`}>
                          {formatMoney(activity.amount)}
                        </p>
                      )}
                    </div>
                    <span className={`text-[11px] font-medium whitespace-nowrap ${isDark ? 'text-slate-500' : 'text-gray-600'}`}>
                      {(() => {
                        const diff = Date.now() - activity.date.getTime();
                        const hours = Math.floor(diff / 3600000);
                        if (hours < 1) return "À l'instant";
                        if (hours < 24) return `${hours}h`;
                        return 'Hier';
                      })()}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <div
              className={`
                w-14 h-14 rounded-2xl flex items-center justify-center mb-3
                ${isDark ? 'bg-slate-700/50' : 'bg-gray-100'}
              `}
            >
              <Activity size={24} className={isDark ? 'text-slate-500' : 'text-gray-300'} />
            </div>
            <p className={`text-sm font-medium ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
              Aucune activité récente
            </p>
          </div>
        )}
      </div>
    </div>
  );
});

// ============ MAIN COMPONENT ============

/**
 * Dashboard - Main dashboard component
 */
export default function Dashboard({
  chantiers = [],
  clients = [],
  devis = [],
  depenses = [],
  pointages = [],
  equipe = [],
  ajustements = [],
  catalogue = [],
  entreprise,
  getChantierBilan,
  addDevis,
  couleur = '#8b5cf6',
  modeDiscret,
  setModeDiscret,
  setSelectedChantier,
  setPage,
  setSelectedDevis,
  setCreateMode,
  isDark = false,
  showHelp = false,
  setShowHelp,
  user,
  onOpenSearch,
  memos = [],
  addMemo,
  toggleMemo,
}) {
  // Access dataLoading from context to prevent onboarding flash during Supabase load
  const { dataLoading } = useData();

  // State
  const [selectedPeriod, setSelectedPeriod] = useState('month');
  const [kpiPeriod, setKpiPeriod] = useState('month'); // For KPI card period selector
  const [isLoading, setIsLoading] = useState(true);
  const [relanceModal, setRelanceModal] = useState({ isOpen: false, item: null });
  const [encaisserModalOpen, setEncaisserModalOpen] = useState(false);
  const [ceMoisModalOpen, setCeMoisModalOpen] = useState(false);
  const [marginAnalysisModal, setMarginAnalysisModal] = useState({ isOpen: false, chantierId: null, chantierNom: null });
  const [showWidgetConfig, setShowWidgetConfig] = useState(false);
  const [showAIChat, setShowAIChat] = useState(false);
  const [showDevisExpress, setShowDevisExpress] = useState(false);

  // Widget configuration - persisted in localStorage
  // Default widgets — show only essential ones by default to reduce dashboard density
  // Users can re-enable hidden widgets via "Personnaliser"
  const DEFAULT_WIDGETS = [
    { id: 'overview', label: 'Vue d\'ensemble', visible: true },
    { id: 'devis', label: 'Devis & Factures', visible: true },
    { id: 'chantiers', label: 'Chantiers', visible: true },
    { id: 'activity', label: 'Activité récente', visible: true },
    { id: 'conformity', label: 'Conformité', visible: true },
    { id: 'revenue', label: 'Chiffre d\'affaires', visible: false },
    { id: 'tresorerie', label: 'Trésorerie', visible: false },
    { id: 'score', label: 'Score Santé', visible: false },
    { id: 'weather', label: 'Alertes Météo', visible: false },
    { id: 'stock', label: 'Stock', visible: false },
    { id: 'subscription', label: 'Abonnement', visible: false },
  ];

  const [widgetConfig, setWidgetConfig] = useState(() => {
    try {
      const saved = localStorage.getItem('cp_dashboard_widgets');
      if (saved) {
        const parsed = JSON.parse(saved);
        // Merge with defaults to handle new widgets added in updates
        return DEFAULT_WIDGETS.map(dw => {
          const found = parsed.find(p => p.id === dw.id);
          return found ? { ...dw, visible: found.visible, order: found.order } : dw;
        }).sort((a, b) => (a.order ?? 99) - (b.order ?? 99));
      }
      return DEFAULT_WIDGETS;
    } catch { return DEFAULT_WIDGETS; }
  });

  const updateWidgetConfig = (newConfig) => {
    const ordered = newConfig.map((w, i) => ({ ...w, order: i }));
    setWidgetConfig(ordered);
    localStorage.setItem('cp_dashboard_widgets', JSON.stringify(ordered));
  };

  const toggleWidgetVisibility = (widgetId) => {
    const updated = widgetConfig.map(w => w.id === widgetId ? { ...w, visible: !w.visible } : w);
    updateWidgetConfig(updated);
  };

  const moveWidget = (widgetId, direction) => {
    const idx = widgetConfig.findIndex(w => w.id === widgetId);
    if (idx < 0) return;
    const newIdx = direction === 'up' ? Math.max(0, idx - 1) : Math.min(widgetConfig.length - 1, idx + 1);
    if (newIdx === idx) return;
    const arr = [...widgetConfig];
    const [item] = arr.splice(idx, 1);
    arr.splice(newIdx, 0, item);
    updateWidgetConfig(arr);
  };

  const isWidgetVisible = (widgetId) => {
    const w = widgetConfig.find(wc => wc.id === widgetId);
    return w ? w.visible : true;
  };

  // Safe arrays
  const safeChantiers = chantiers || [];
  const safeClients = clients || [];
  const safeDevis = devis || [];
  const safeDepenses = depenses || [];
  const safePointages = pointages || [];
  const safeEquipe = equipe || [];
  const safeCatalogue = catalogue || [];

  // Simulate loading
  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 500);
    return () => clearTimeout(timer);
  }, []);

  // ============ COMPUTED STATS ============

  const stats = useMemo(() => {
    const now = new Date();
    const thisMonth = now.getMonth();
    const thisYear = now.getFullYear();

    // Devis by type
    const devisOnly = safeDevis.filter((d) => d.type === 'devis');
    const factures = safeDevis.filter((d) => d.type === 'facture');

    // Pipeline
    const devisPipeline = {
      brouillon: devisOnly.filter((d) => d.statut === 'brouillon'),
      envoye: devisOnly.filter((d) => d.statut === 'envoye' || d.statut === 'vu'),
      accepte: devisOnly.filter((d) =>
        ['accepte', 'acompte_facture', 'facture'].includes(d.statut)
      ),
      refuse: devisOnly.filter((d) => d.statut === 'refuse'),
    };

    // Financial stats
    const totalCA = safeDevis
      .filter((d) => d.type === 'facture' || d.statut === 'accepte')
      .reduce((s, d) => s + (d.total_ht || 0), 0);

    const totalDep = safeDepenses.reduce((s, d) => s + (d.montant || 0), 0);
    const totalMO = safePointages.reduce(
      (s, p) =>
        s + p.heures * (safeEquipe.find((e) => e.id === p.employeId)?.coutHoraireCharge || 28),
      0
    );

    const marge = totalCA - totalDep - totalMO;
    const tauxMarge = totalCA > 0 ? (marge / totalCA) * 100 : 0;

    // Invoices
    const facturesPayees = factures.filter((f) => f.statut === 'payee');
    const facturesEnAttente = factures.filter((f) => f.statut !== 'payee');
    const encaisse = facturesPayees.reduce((s, f) => s + (f.total_ttc || 0), 0);
    const enAttente = facturesEnAttente.reduce((s, f) => s + (f.total_ttc || 0), 0);

    // Overdue (30+ days)
    const facturesOverdue = facturesEnAttente.filter((f) => daysSince(f.date) > 30);
    const montantOverdue = facturesOverdue.reduce((s, f) => s + (f.total_ttc || 0), 0);

    // Chantiers
    const chantiersActifs = safeChantiers.filter((c) => c.statut === 'en_cours').length;
    const chantiersProspect = safeChantiers.filter((c) => c.statut === 'prospect').length;
    const chantiersTermines = safeChantiers.filter((c) => c.statut === 'termine').length;

    // Devis en attente de réponse = envoyé + vu (exclu brouillons)
    const devisEnAttente = devisPipeline.envoye.length;
    const montantDevisEnAttente = devisPipeline.envoye.reduce((s, d) => s + (d.total_ttc || d.total_ht || 0), 0);

    // Conversion rate
    const devisTotalEnvoyes =
      devisPipeline.envoye.length + devisPipeline.accepte.length + devisPipeline.refuse.length;
    const tauxConversion =
      devisTotalEnvoyes > 0 ? (devisPipeline.accepte.length / devisTotalEnvoyes) * 100 : 0;

    // CA trend (compare last 2 months)
    const getMonthCA = (monthOffset) => {
      const targetMonth = new Date(thisYear, thisMonth - monthOffset, 1);
      return safeDevis
        .filter((d) => {
          const dd = new Date(d.date);
          return (
            dd.getMonth() === targetMonth.getMonth() &&
            dd.getFullYear() === targetMonth.getFullYear() &&
            (d.type === 'facture' || d.statut === 'accepte')
          );
        })
        .reduce((s, d) => s + (d.total_ht || 0), 0);
    };

    const lastMonthCA = getMonthCA(1);
    const thisMonthCA = getMonthCA(0);

    // Detect if we're at the beginning of month (days 1-5)
    const dayOfMonth = now.getDate();
    const isEarlyMonth = dayOfMonth <= 5;

    // Calculate percentage change with proper handling
    // - In early month (days 1-5): show null to display "Début de mois" instead of misleading %
    // - If no previous month data: return null (will show "—")
    // - Cap at ±200% for realistic business metrics display
    let tendance = null;
    let tendanceLabel = 'vs mois dernier';

    if (isEarlyMonth) {
      // Early in month - don't compare, it's misleading
      tendance = null;
      tendanceLabel = 'Début de mois';
    } else if (lastMonthCA > 0) {
      // Normal comparison
      if (thisMonthCA === 0) {
        // No activity this month yet
        tendance = -100;
      } else {
        const rawChange = ((thisMonthCA - lastMonthCA) / lastMonthCA) * 100;
        // Cap between -99% and +200% for sane display
        if (Math.abs(rawChange) <= 200) {
          tendance = Math.round(rawChange);
        }
        // If > 200%, leave as null to show "—"
      }
    }

    // Calculate monthly objective based on average of last 3 months
    const getLastMonthsAverage = (numMonths) => {
      let total = 0;
      let count = 0;
      for (let i = 1; i <= numMonths; i++) {
        const monthCA = getMonthCA(i);
        if (monthCA > 0) {
          total += monthCA;
          count++;
        }
      }
      return count > 0 ? total / count : 0;
    };

    const objectifMensuel = getLastMonthsAverage(3);
    const progressionObjectif = objectifMensuel > 0 ? (thisMonthCA / objectifMensuel) * 100 : 0;

    // Projection based on days elapsed (if past day 5)
    const projectionMensuelle = !isEarlyMonth && dayOfMonth > 0
      ? Math.round((thisMonthCA / dayOfMonth) * 30)
      : null;

    // Check if new user
    const isNewUser =
      safeClients.length === 0 && safeDevis.length === 0 && safeChantiers.length === 0;
    const hasRealData = safeDevis.length > 0 || safeChantiers.length > 0;

    // Low stock items
    const lowStockItems = safeCatalogue.filter(
      (item) => item.stock !== undefined && item.seuilAlerte && item.stock < item.seuilAlerte
    );

    return {
      totalCA,
      thisMonthCA,
      lastMonthCA,
      marge,
      tauxMarge,
      encaisse,
      enAttente,
      montantOverdue,
      chantiersActifs,
      chantiersProspect,
      chantiersTermines,
      devisEnAttente,
      montantDevisEnAttente,
      tauxConversion,
      tendance,
      tendanceLabel,
      isEarlyMonth,
      objectifMensuel,
      progressionObjectif,
      projectionMensuelle,
      facturesPayees,
      facturesEnAttente,
      facturesOverdue,
      devisPipeline,
      isNewUser,
      hasRealData,
      lowStockItems,
    };
  }, [safeChantiers, safeClients, safeDevis, safeDepenses, safePointages, safeEquipe, safeCatalogue]);

  // ============ URGENT ACTION ============

  const urgentAction = useMemo(() => {
    if (stats.montantOverdue > 0) {
      return {
        type: 'payment_late',
        title: 'Action urgente',
        description: `${formatMoney(stats.montantOverdue)} en retard de paiement (${
          stats.facturesOverdue?.length
        } facture${stats.facturesOverdue?.length > 1 ? 's' : ''})`,
        ctaLabel: 'Relancer maintenant',
        ctaAction: () => setPage?.('devis'),
      };
    }

    if (stats.devisEnAttente > 3) {
      return {
        type: 'quote_pending',
        title: `${stats.devisEnAttente} devis en attente`,
        description: `Valeur potentielle : ${formatMoney(stats.montantDevisEnAttente)}`,
        ctaLabel: 'Relancer les devis',
        ctaAction: () => setPage?.('devis'),
      };
    }

    return null;
  }, [stats]);

  // ============ SUGGESTIONS ============

  const suggestions = useMemo(() => {
    const context = {
      factures: stats.facturesEnAttente?.map((f) => ({
        id: f.id,
        clientId: f.client_id,
        montant: f.total_ttc || 0,
        dateEcheance: f.date_echeance || f.date,
        statut: f.statut === 'payee' ? 'payee' : 'envoyee',
      })) || [],
      devis: stats.devisPipeline?.envoye?.map((d) => ({
        id: d.id,
        clientId: d.client_id,
        montantHT: d.total_ht || 0,
        dateCreation: d.date,
        statut: 'envoye',
      })) || [],
      chantiers: safeChantiers.map((c) => ({
        id: c.id,
        nom: c.nom,
        clientId: c.client_id,
        statut: c.statut,
        type: c.type_chantier,
        margeActuelle: getChantierBilan?.(c.id)?.tauxMarge,
        dateDebut: c.date_debut,
      })),
      stock: stats.lowStockItems?.map((item) => ({
        id: item.id,
        nom: item.nom,
        stockActuel: item.stock || 0,
        seuilAlerte: item.seuilAlerte || 10,
        unite: item.unite || 'u',
      })) || [],
      weatherForecasts: [],
    };

    return generateSuggestionsFromContext(context);
  }, [stats, safeChantiers, getChantierBilan]);

  // ============ RECENT ACTIVITY ============

  const recentActivity = useMemo(() => {
    const activities = [];

    // Recent paid invoices
    stats.facturesPayees?.slice(0, 2).forEach((f) => {
      const client = safeClients.find((c) => c.id === f.client_id);
      activities.push({
        id: `paid-${f.id}`,
        itemId: f.id,
        type: 'payment',
        icon: CheckCircle,
        title: `Facture ${f.numero} payée`,
        subtitle: client?.nom || 'Client',
        amount: f.total_ttc,
        date: new Date(f.date_paiement || f.date),
        color: 'emerald',
        page: 'devis',
      });
    });

    // Recent sent devis
    stats.devisPipeline?.envoye?.slice(0, 2).forEach((d) => {
      const client = safeClients.find((c) => c.id === d.client_id);
      activities.push({
        id: `sent-${d.id}`,
        itemId: d.id,
        type: 'devis',
        icon: Send,
        title: `Devis ${d.numero} envoyé`,
        subtitle: client?.nom || 'Client',
        amount: d.total_ttc,
        date: new Date(d.date),
        color: 'blue',
        page: 'devis',
      });
    });

    // Recent started chantiers
    safeChantiers
      .filter((c) => c.statut === 'en_cours')
      .slice(0, 1)
      .forEach((ch) => {
        activities.push({
          id: `started-${ch.id}`,
          itemId: ch.id,
          type: 'chantier',
          icon: HardHat,
          title: `Chantier ${ch.nom} démarré`,
          subtitle: ch.adresse || 'Lieu non défini',
          date: new Date(ch.date_debut || ch.created_at || Date.now()),
          color: 'purple',
          page: 'chantiers',
        });
      });

    return activities.sort((a, b) => b.date - a.date).slice(0, 4);
  }, [stats, safeClients, safeChantiers]);

  // ============ ACTIONS DU JOUR (unified priority list) ============

  const staleDevis = useMemo(() => {
    return safeDevis.filter(d => {
      if (d.type !== 'devis' || !['envoye', 'vu'].includes(d.statut)) return false;
      if ((d.total_ttc || d.total_ht || 0) <= 1) return false;
      return daysSince(d.date) >= 7;
    }).sort((a, b) => daysSince(b.date) - daysSince(a.date));
  }, [safeDevis]);

  const todayMemos = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    return (memos || [])
      .filter(m => !m.is_done && m.due_date && m.due_date <= todayStr)
      .sort((a, b) => (a.due_date || '').localeCompare(b.due_date || ''))
      .slice(0, 5);
  }, [memos]);

  // ============ HANDLERS ============

  const handleOpenRelance = useCallback(
    (item) => {
      const client = safeClients.find((c) => c.id === item.client_id);
      setRelanceModal({
        isOpen: true,
        item: {
          type: item.type || 'devis',
          id: item.id,
          numero: item.numero,
          client: {
            nom: client?.nom || 'Client',
            email: client?.email,
            telephone: client?.telephone,
          },
          montant: item.total_ttc || 0,
          dateEnvoi: item.date,
        },
      });
    },
    [safeClients]
  );

  const handleSuggestionAction = useCallback(
    (suggestion) => {
      const type = suggestion.type;

      switch (type) {
        case 'payment_late':
          setPage?.('devis');
          break;
        case 'quote_pending':
          setPage?.('devis');
          break;
        case 'weather_alert':
          setPage?.('planning');
          break;
        case 'low_margin':
          setPage?.('chantiers');
          break;
        case 'stock_alert':
          setPage?.('catalogue');
          break;
        default:
          break;
      }
    },
    [setPage]
  );

  // Handle activity click - navigate directly to item detail
  const handleActivityClick = useCallback(
    (activity) => {
      // Select the specific item first
      if (activity.type === 'payment' || activity.type === 'devis') {
        const item = safeDevis.find((d) => d.id === activity.itemId);
        if (item) {
          setSelectedDevis?.(item);
        }
      } else if (activity.type === 'chantier') {
        const item = safeChantiers.find((c) => c.id === activity.itemId);
        if (item) {
          setSelectedChantier?.(item);
        }
      }
      // Then navigate to the page
      if (activity.page) {
        setPage?.(activity.page);
      }
    },
    [setPage, setSelectedDevis, setSelectedChantier, safeDevis, safeChantiers]
  );

  // Handle relance from suggestions (accepts pre-formatted relance item)
  const handleSuggestionRelance = useCallback(
    (relanceItem) => {
      setRelanceModal({
        isOpen: true,
        item: relanceItem,
      });
    },
    []
  );

  // Handle margin analysis from suggestions
  const handleOpenMarginAnalysis = useCallback(
    (chantierId, chantierNom) => {
      setMarginAnalysisModal({
        isOpen: true,
        chantierId,
        chantierNom,
      });
    },
    []
  );

  // AI Chat: create devis from AI-generated data
  const handleAICreateDevis = useCallback(async (devisData) => {
    if (!addDevis) return;
    try {
      const newDevis = await addDevis({
        type: 'devis',
        statut: 'brouillon',
        date: new Date().toISOString().split('T')[0],
        validite: devisData.validite || 30,
        objet: devisData.objet || 'Devis IA',
        client_nom: devisData.client_nom || '',
        client_id: devisData.client_id || null,
        lignes: devisData.lignes || [],
        notes: devisData.notes || '',
        tvaRate: devisData.tvaRate || 10,
        total_ht: (devisData.lignes || []).reduce((sum, l) => sum + (parseFloat(l.quantite || 0) * parseFloat(l.prixUnitaire || 0)), 0),
      });
      if (newDevis?.id) {
        setSelectedDevis?.(newDevis);
        setPage?.('devis');
      }
    } catch (e) {
      console.error('Failed to create devis from AI:', e);
    }
  }, [addDevis, setSelectedDevis, setPage]);

  // ============ RENDER ============

  // Show new user welcome — but ONLY if data has actually finished loading
  // Prevents flash of onboarding when Supabase data is still in transit
  if (stats.isNewUser && !dataLoading) {
    return (
      <NewUserWelcome
        isDark={isDark}
        couleur={couleur}
        setPage={setPage}
        setCreateMode={setCreateMode}
      />
    );
  }

  return (
    <div className={isDark ? 'bg-slate-900' : 'bg-slate-100'}>
      {/* ========== HERO SECTION — Compact greeting ========== */}
      <HeroSection
        userName={entreprise?.nom?.split(' ')[0] || 'Artisan'}
        activeChantiers={stats.chantiersActifs}
        isDark={isDark}
        couleur={couleur}
        onChantiersClick={() => setPage?.('chantiers')}
      />

      {/* Main Content */}
      <div className="max-w-7xl mx-auto">

        {/* ========== URGENT ACTION BANNER ========== */}
        {urgentAction && (
          <section className="px-4 sm:px-6 pb-3">
            <div className={`rounded-xl overflow-hidden border-l-4 border-red-500 shadow-md ${isDark ? 'bg-red-500/10' : 'bg-red-50'}`}>
              <div className="p-4">
                <div className="flex items-center gap-3">
                  <div className={`flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center ${isDark ? 'bg-red-500/20' : 'bg-red-100'}`}>
                    {urgentAction.type === 'payment_late' ? <Banknote size={18} className="text-red-500" /> : <FileText size={18} className="text-red-500" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-semibold ${isDark ? 'text-red-300' : 'text-red-800'}`}>{urgentAction.title}</p>
                    <p className={`text-xs mt-0.5 ${isDark ? 'text-red-400/80' : 'text-red-700'}`}>{urgentAction.description}</p>
                  </div>
                  <button
                    onClick={urgentAction.ctaAction}
                    className="flex-shrink-0 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-red-500 hover:bg-red-600 text-white text-xs font-semibold shadow-sm transition-all active:scale-95"
                  >
                    {urgentAction.ctaLabel}
                    <ArrowRight size={14} />
                  </button>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ========== HERO DUO — Devis IA + Devis Express ========== */}
        <section className="px-4 sm:px-6 pb-3">
          <div className="grid grid-cols-2 gap-3">
            {/* Devis IA */}
            <button
              onClick={() => setShowAIChat(true)}
              className="relative overflow-hidden rounded-2xl p-4 sm:p-5 text-left min-h-[88px] text-white transition-all hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]"
              style={{ background: `linear-gradient(135deg, ${couleur}, ${couleur}dd)` }}
            >
              <div className="relative z-10">
                <MessageCircle size={26} className="mb-2 text-white/90" />
                <p className="font-bold text-sm sm:text-base leading-tight">Devis IA</p>
                <p className="text-[11px] sm:text-xs text-white/70 mt-0.5">Décrivez vos travaux</p>
              </div>
              <Sparkles size={44} className="absolute -top-1 -right-1 text-white/10" />
            </button>

            {/* Devis Express */}
            <button
              onClick={() => setShowDevisExpress(true)}
              className="relative overflow-hidden rounded-2xl p-4 sm:p-5 text-left min-h-[88px] text-white transition-all hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]"
              style={{ background: 'linear-gradient(135deg, #FF8C00, #FF6B00)' }}
            >
              <div className="relative z-10">
                <Zap size={26} className="mb-2 text-white/90" />
                <p className="font-bold text-sm sm:text-base leading-tight">Devis Express</p>
                <p className="text-[11px] sm:text-xs text-white/70 mt-0.5">3 clics, c'est chiffré</p>
              </div>
              <FileText size={44} className="absolute -top-1 -right-1 text-white/10" />
            </button>
          </div>
        </section>

        {/* ========== MINI KPI DUO — À encaisser + Ce mois ========== */}
        <section className="px-4 sm:px-6 pb-4">
          <div className="grid grid-cols-2 gap-3">
            {/* À encaisser */}
            <button
              onClick={() => setEncaisserModalOpen(true)}
              className={`rounded-xl border p-3.5 text-left transition-all hover:shadow-md ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}
            >
              <div className="flex items-center gap-2 mb-1">
                <Wallet size={15} className="text-orange-500" />
                <span className={`text-xs font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>À encaisser</span>
              </div>
              <p className={`text-lg font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                {formatMoney(stats.enAttente, modeDiscret)}
              </p>
              {stats.facturesOverdue?.length > 0 && (
                <p className="text-[11px] text-red-500 font-medium mt-0.5">
                  ⚠️ {stats.facturesOverdue.length} en retard
                </p>
              )}
            </button>

            {/* Ce mois */}
            <button
              onClick={() => setCeMoisModalOpen(true)}
              className={`rounded-xl border p-3.5 text-left transition-all hover:shadow-md ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}
            >
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp size={15} className="text-emerald-500" />
                <span className={`text-xs font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Ce mois</span>
              </div>
              <p className={`text-lg font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                {formatMoney(stats.thisMonthCA, modeDiscret)}
              </p>
              {stats.tendance != null && (
                <p className={`text-[11px] font-medium mt-0.5 ${stats.tendance >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                  {stats.tendance >= 0 ? '↑' : '↓'} {Math.abs(stats.tendance)}% vs mois dernier
                </p>
              )}
            </button>
          </div>
        </section>

        {/* ========== ACTIONS DU JOUR — Unified priority list ========== */}
        {(() => {
          const actions = [];

          // Devis à relancer
          staleDevis.slice(0, 4).forEach(d => {
            const client = safeClients.find(c => c.id === d.client_id);
            const days = daysSince(d.date);
            actions.push({
              id: `devis-${d.id}`,
              priority: days > 14 ? 1 : 2,
              color: days > 14 ? 'red' : 'amber',
              title: `Relancer ${d.numero || 'devis'}`,
              subtitle: `${client?.nom || 'Client'} · ${formatMoney(d.total_ttc || d.total_ht || 0, modeDiscret)} · ${days}j`,
              action: () => handleOpenRelance(d),
              actionLabel: 'Relancer',
            });
          });

          // Suggestions IA
          suggestions.slice(0, 3).forEach(s => {
            actions.push({
              id: `sug-${s.id}`,
              priority: s.priority === 'high' ? 1 : 2,
              color: s.priority === 'high' ? 'red' : 'amber',
              title: s.title,
              subtitle: s.description?.slice(0, 60) || '',
              action: () => handleSuggestionAction(s),
              actionLabel: s.ctaLabel || 'Voir',
            });
          });

          // Mémos du jour
          todayMemos.slice(0, 3).forEach(m => {
            const isOverdue = m.due_date < new Date().toISOString().split('T')[0];
            actions.push({
              id: `memo-${m.id}`,
              priority: isOverdue ? 2 : 3,
              color: isOverdue ? 'amber' : 'blue',
              title: m.text,
              subtitle: isOverdue ? 'En retard' : 'Aujourd\'hui',
              action: () => setPage?.('memos'),
              actionLabel: 'Voir',
            });
          });

          const sorted = actions.sort((a, b) => a.priority - b.priority).slice(0, 5);
          if (sorted.length === 0) return null;

          const colorClasses = {
            red: isDark ? 'bg-red-500' : 'bg-red-500',
            amber: isDark ? 'bg-amber-500' : 'bg-amber-500',
            blue: isDark ? 'bg-blue-500' : 'bg-blue-500',
          };

          return (
            <section className="px-4 sm:px-6 pb-4">
              <div className={`rounded-2xl border p-4 ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <ClipboardList size={16} style={{ color: couleur }} />
                    <h2 className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                      Actions du jour
                    </h2>
                    <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${isDark ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-600'}`}>
                      {sorted.length}
                    </span>
                  </div>
                </div>
                <div className="space-y-2">
                  {sorted.map(item => (
                    <div
                      key={item.id}
                      className={`flex items-center gap-3 p-2.5 rounded-xl transition-colors ${isDark ? 'hover:bg-slate-700/50' : 'hover:bg-slate-50'}`}
                    >
                      <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${colorClasses[item.color]}`} />
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>
                          {item.title}
                        </p>
                        <p className={`text-xs truncate ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                          {item.subtitle}
                        </p>
                      </div>
                      <button
                        onClick={item.action}
                        className="flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition-colors"
                        style={{ backgroundColor: couleur }}
                      >
                        {item.actionLabel}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          );
        })()}

        {/* ========== SECONDARY SHORTCUTS — compact 4-icon bar ========== */}
        <section className="px-4 sm:px-6 pb-4">
          <div className="flex gap-2">
            {[
              { icon: Users, label: '+ Client', action: () => { setCreateMode?.((p) => ({ ...p, client: true })); setPage?.('clients'); } },
              { icon: HardHat, label: '+ Chantier', action: () => { setCreateMode?.((p) => ({ ...p, chantier: true })); setPage?.('chantiers'); } },
              { icon: ClipboardList, label: '+ Mémo', action: () => setPage?.('memos') },
              { icon: Settings, label: 'Paramètres', action: () => setPage?.('settings') },
            ].map((s) => (
              <button
                key={s.label}
                onClick={s.action}
                className={`flex-1 flex flex-col items-center gap-1 py-2.5 rounded-xl text-xs font-medium transition-all border ${
                  isDark
                    ? 'bg-slate-800 border-slate-700 text-slate-300 hover:border-slate-600'
                    : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                }`}
              >
                <s.icon size={18} style={{ color: couleur }} />
                <span className="leading-none">{s.label}</span>
              </button>
            ))}
          </div>
        </section>

        {/* ========== ONBOARDING — shows for new users, auto-dismisses ========== */}
        <section className="px-4 sm:px-6 pb-4">
          <OnboardingChecklist
            clients={clients}
            chantiers={chantiers}
            devis={devis}
            memos={memos}
            couleur={couleur}
            setPage={setPage}
            isDark={isDark}
          />
        </section>

        {/* Dashboard Customization Button */}
        <section className="px-4 sm:px-6 pb-4 flex items-center justify-end">
          <button
            onClick={() => setShowWidgetConfig(!showWidgetConfig)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
              showWidgetConfig
                ? `text-white`
                : isDark ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'
            }`}
            style={showWidgetConfig ? { backgroundColor: couleur } : {}}
          >
            <LayoutDashboard size={16} />
            Personnaliser
          </button>
        </section>

        {/* Widget Configuration Panel */}
        {showWidgetConfig && (
          <section className="px-4 sm:px-6 pb-6">
            <div className={`rounded-xl border p-4 ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
              <div className="flex items-center justify-between mb-3">
                <h2 className={`font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>Widgets du tableau de bord</h2>
                <button onClick={() => { updateWidgetConfig(DEFAULT_WIDGETS); }} className={`text-xs px-2 py-1 rounded ${isDark ? 'text-slate-400 hover:text-white hover:bg-slate-700' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'}`}>
                  Réinitialiser
                </button>
              </div>
              <div className="space-y-1">
                {widgetConfig.map((w, idx) => (
                  <div key={w.id} className={`flex items-center gap-3 px-3 py-2 rounded-lg ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-50'}`}>
                    <GripVertical size={14} className={isDark ? 'text-slate-600' : 'text-slate-300'} />
                    <button onClick={() => toggleWidgetVisibility(w.id)} className="flex-shrink-0">
                      {w.visible
                        ? <Eye size={16} className="text-green-500" />
                        : <EyeOff size={16} className={isDark ? 'text-slate-600' : 'text-slate-300'} />
                      }
                    </button>
                    <span className={`flex-1 text-sm ${w.visible ? (isDark ? 'text-white' : 'text-slate-900') : (isDark ? 'text-slate-600' : 'text-slate-300')}`}>{w.label}</span>
                    <div className="flex gap-1">
                      <button onClick={() => moveWidget(w.id, 'up')} disabled={idx === 0} className={`p-1 rounded ${idx === 0 ? 'opacity-20' : isDark ? 'hover:bg-slate-600 text-slate-400' : 'hover:bg-slate-200 text-slate-500'}`}>
                        <ChevronDown size={14} className="rotate-180" />
                      </button>
                      <button onClick={() => moveWidget(w.id, 'down')} disabled={idx === widgetConfig.length - 1} className={`p-1 rounded ${idx === widgetConfig.length - 1 ? 'opacity-20' : isDark ? 'hover:bg-slate-600 text-slate-400' : 'hover:bg-slate-200 text-slate-500'}`}>
                        <ChevronDown size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Overview Widget - Single unified card */}
        {isWidgetVisible('overview') && (
          <section className="px-4 sm:px-6 pb-6">
            <OverviewWidget
              setPage={setPage}
              isDark={isDark}
            />
          </section>
        )}

        {/* Revenue Chart - Full width */}
        {isWidgetVisible('revenue') && (
          <section className="px-4 sm:px-6 pb-8">
            <RevenueChartWidget
              setPage={setPage}
              isDark={isDark}
            />
          </section>
        )}

        {/* Operational Widgets Grid */}
        <section className="px-4 sm:px-6 pb-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {/* Devis Widget - Actions required */}
            {isWidgetVisible('devis') && (
              <DevisWidget
                setPage={setPage}
                setSelectedDevis={setSelectedDevis}
                onRelance={handleOpenRelance}
                isDark={isDark}
              />
            )}

            {/* Chantiers Widget - Upcoming */}
            {isWidgetVisible('chantiers') && (
              <ChantiersWidget
                setPage={setPage}
                setSelectedChantier={setSelectedChantier}
                isDark={isDark}
              />
            )}

            {/* Tresorerie Widget */}
            {isWidgetVisible('tresorerie') && (
              <TresorerieWidget
                setPage={setPage}
                isDark={isDark}
              />
            )}

            {/* Score Santé Entreprise */}
            {isWidgetVisible('score') && (
              <ScoreSanteWidget
                isDark={isDark}
                setPage={setPage}
              />
            )}

            {/* Recent Activity */}
            {isWidgetVisible('activity') && (
              <RecentActivityWidget
                activities={recentActivity}
                isDark={isDark}
                formatMoney={(n) => formatMoney(n, modeDiscret)}
                onActivityClick={handleActivityClick}
              />
            )}

            {/* Weather Alerts */}
            {isWidgetVisible('weather') && (
              <WeatherAlertsWidget
                setPage={setPage}
                isDark={isDark}
              />
            )}

            {/* Subscription Usage Widget */}
            {isWidgetVisible('subscription') && (
              <UsageAlerts isDark={isDark} couleur={couleur} />
            )}

            {/* Stock Widget - only if low stock */}
            {isWidgetVisible('stock') && stats.lowStockItems?.length > 0 && (
              <StockWidget
                setPage={setPage}
                isDark={isDark}
              />
            )}

            {/* Conformity Score Widget */}
            {isWidgetVisible('conformity') && (() => {
              // Compute live score from entreprise data (fallback to localStorage cache)
              let score = 0;
              const now = new Date();
              if (entreprise?.siret) score += 7;
              if (entreprise?.codeApe) score += 7;
              if (entreprise?.tvaIntra) score += 6;
              if (entreprise?.rcProAssureur && (!entreprise.rcProValidite || new Date(entreprise.rcProValidite) > now)) score += 20;
              if (entreprise?.decennaleAssureur && (!entreprise.decennaleValidite || new Date(entreprise.decennaleValidite) > now)) score += 20;
              if (entreprise?.cgv) score += 10;
              if (entreprise?.iban && entreprise?.bic) score += 10;
              if (entreprise?.adresse && entreprise?.nom && entreprise?.tel && entreprise?.email) score += 10;
              if (entreprise?.rcsVille || entreprise?.rcsNumero) score += 10;
              // Override with detailed score from Admin panel if available
              const cached = parseInt(localStorage.getItem('cp_conformity_score') || '0');
              if (cached > 0) score = cached;

              if (score === 0) return null;
              const cardClass = isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200';
              const titleClass = isDark ? 'text-white' : 'text-slate-900';
              const mutedClass = isDark ? 'text-slate-400' : 'text-slate-500';
              return (
                <div
                  className={`${cardClass} rounded-2xl border p-5 cursor-pointer hover:shadow-lg transition-shadow`}
                  onClick={() => setPage('settings')}
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className={`p-2 rounded-lg ${score >= 80 ? 'bg-emerald-100 text-emerald-600' : score >= 50 ? 'bg-amber-100 text-amber-600' : 'bg-red-100 text-red-600'} ${isDark ? 'bg-opacity-20' : ''}`}>
                      <ShieldCheck size={20} />
                    </div>
                    <p className={`font-semibold ${titleClass}`}>Conformité</p>
                  </div>
                  <div className="flex items-end gap-3">
                    <p className={`text-3xl font-bold ${score >= 80 ? 'text-emerald-500' : score >= 50 ? 'text-amber-500' : 'text-red-500'}`}>{score}%</p>
                    <div className="flex-1">
                      <div className={`w-full h-2 rounded-full ${isDark ? 'bg-slate-700' : 'bg-slate-200'}`}>
                        <div
                          className={`h-2 rounded-full transition-all ${score >= 80 ? 'bg-emerald-500' : score >= 50 ? 'bg-amber-500' : 'bg-red-500'}`}
                          style={{ width: `${Math.min(100, score)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                  <p className={`text-xs ${mutedClass} mt-2`}>Score réglementaire · Voir détails →</p>
                </div>
              );
            })()}

            {/* Sous-traitant Alerts */}
            {(() => {
              const sousTraitants = equipe?.filter(e => e.type === 'sous_traitant') || [];
              if (sousTraitants.length === 0) return null;
              const now = new Date();
              const sixMonths = 180 * 24 * 3600 * 1000;
              const alerts = [];
              sousTraitants.forEach(st => {
                if (st.decennale_expiration && new Date(st.decennale_expiration) < now) {
                  alerts.push({ type: 'critical', msg: `Décennale expirée : ${st.prenom ? st.prenom + ' ' : ''}${st.nom}` });
                } else if (st.decennale_expiration && new Date(st.decennale_expiration) < new Date(now.getTime() + 30 * 24 * 3600 * 1000)) {
                  alerts.push({ type: 'warning', msg: `Décennale expire bientôt : ${st.prenom ? st.prenom + ' ' : ''}${st.nom}` });
                }
                if (st.urssaf_date && (now.getTime() - new Date(st.urssaf_date).getTime()) > sixMonths) {
                  alerts.push({ type: 'warning', msg: `URSSAF >6 mois : ${st.prenom ? st.prenom + ' ' : ''}${st.nom}` });
                }
                if (!st.decennale_expiration && !st.urssaf_date) {
                  alerts.push({ type: 'info', msg: `Documents manquants : ${st.prenom ? st.prenom + ' ' : ''}${st.nom}` });
                }
              });
              if (alerts.length === 0) return null;
              const cardClass = isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200';
              const titleClass = isDark ? 'text-white' : 'text-slate-900';
              const critical = alerts.filter(a => a.type === 'critical').length;
              const warning = alerts.filter(a => a.type === 'warning').length;
              return (
                <div
                  className={`${cardClass} rounded-2xl border p-5 cursor-pointer hover:shadow-lg transition-shadow`}
                  onClick={() => setPage('equipe')}
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className={`p-2 rounded-lg ${critical > 0 ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-600'} ${isDark ? 'bg-opacity-20' : ''}`}>
                      <AlertTriangle size={20} />
                    </div>
                    <p className={`font-semibold ${titleClass}`}>Sous-traitants</p>
                    <span className={`ml-auto text-xs px-2 py-1 rounded-full font-medium ${critical > 0 ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'} ${isDark ? 'bg-opacity-20' : ''}`}>
                      {alerts.length} alerte{alerts.length > 1 ? 's' : ''}
                    </span>
                  </div>
                  <div className="space-y-1.5">
                    {alerts.slice(0, 3).map((a, i) => (
                      <p key={i} className={`text-xs flex items-center gap-2 ${a.type === 'critical' ? 'text-red-500' : a.type === 'warning' ? 'text-amber-500' : isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                        <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${a.type === 'critical' ? 'bg-red-500' : a.type === 'warning' ? 'bg-amber-500' : 'bg-slate-400'}`} />
                        {a.msg}
                      </p>
                    ))}
                    {alerts.length > 3 && <p className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>+{alerts.length - 3} autre{alerts.length - 3 > 1 ? 's' : ''}</p>}
                  </div>
                </div>
              );
            })()}

            {/* Bank Widget */}
            <BankWidget
              isDark={isDark}
              onConnectBank={() => setPage('settings')}
              onViewTransactions={() => setPage('finances')}
            />
          </div>
        </section>
      </div>

      {/* Relance Modal */}
      <RelanceModal
        isOpen={relanceModal.isOpen}
        onClose={() => setRelanceModal({ isOpen: false, item: null })}
        item={relanceModal.item}
        entreprise={entreprise}
        onSuccess={() => {
          setRelanceModal({ isOpen: false, item: null });
        }}
      />

      {/* À Encaisser Modal */}
      <EncaisserModal
        isOpen={encaisserModalOpen}
        onClose={() => setEncaisserModalOpen(false)}
        stats={stats}
        facturesEnAttente={stats.facturesEnAttente || []}
        facturesOverdue={stats.facturesOverdue || []}
        clients={safeClients}
        onViewFacture={(facture) => {
          setEncaisserModalOpen(false);
          setSelectedDevis?.(facture);
          setPage?.('devis');
        }}
        onRelanceFacture={(facture) => {
          setRelanceModal({ isOpen: true, item: facture });
        }}
        onRelanceAll={() => {
          // Relancer toutes les factures en retard
          if (stats.facturesOverdue?.length > 0) {
            setRelanceModal({ isOpen: true, item: stats.facturesOverdue[0] });
          }
        }}
        onCreateFacture={() => {
          setEncaisserModalOpen(false);
          setCreateMode?.((p) => ({ ...p, devis: true, type: 'facture' }));
          setPage?.('devis');
        }}
        onViewAllFactures={() => {
          setEncaisserModalOpen(false);
          setPage?.('devis');
        }}
        isDark={isDark}
        modeDiscret={modeDiscret}
      />

      {/* Ce Mois Modal */}
      <CeMoisModal
        isOpen={ceMoisModalOpen}
        onClose={() => setCeMoisModalOpen(false)}
        stats={stats}
        initialPeriod={kpiPeriod}
        onPeriodChange={(period) => setKpiPeriod(period)}
        monthlyData={(() => {
          const now = new Date();
          const MONTH_NAMES = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];
          return Array.from({ length: 6 }, (_, i) => {
            const monthOffset = 5 - i;
            const targetMonth = new Date(now.getFullYear(), now.getMonth() - monthOffset, 1);
            const monthCA = safeDevis
              .filter(d => {
                const dd = new Date(d.date);
                return dd.getMonth() === targetMonth.getMonth() &&
                       dd.getFullYear() === targetMonth.getFullYear() &&
                       (d.type === 'facture' || d.statut === 'accepte');
              })
              .reduce((s, d) => s + (d.total_ht || 0), 0);
            return { label: MONTH_NAMES[targetMonth.getMonth()], revenue: monthCA };
          });
        })()}
        yearlyData={(() => {
          const now = new Date();
          const MONTH_NAMES = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];
          return Array.from({ length: 12 }, (_, i) => {
            const monthOffset = 11 - i;
            const targetMonth = new Date(now.getFullYear(), now.getMonth() - monthOffset, 1);
            const monthCA = safeDevis
              .filter(d => {
                const dd = new Date(d.date);
                return dd.getMonth() === targetMonth.getMonth() &&
                       dd.getFullYear() === targetMonth.getFullYear() &&
                       (d.type === 'facture' || d.statut === 'accepte');
              })
              .reduce((s, d) => s + (d.total_ht || 0), 0);
            return { label: MONTH_NAMES[targetMonth.getMonth()], revenue: monthCA };
          });
        })()}
        fiveYearData={(() => {
          const now = new Date();
          return Array.from({ length: 5 }, (_, i) => {
            const yearOffset = 4 - i;
            const targetYear = now.getFullYear() - yearOffset;
            const yearCA = safeDevis
              .filter(d => {
                const dd = new Date(d.date);
                return dd.getFullYear() === targetYear &&
                       (d.type === 'facture' || d.statut === 'accepte');
              })
              .reduce((s, d) => s + (d.total_ht || 0), 0);
            return { label: targetYear.toString(), revenue: yearCA };
          });
        })()}
        devisPipeline={stats.devisPipeline || {}}
        clients={safeClients}
        onViewDevis={(d) => {
          setCeMoisModalOpen(false);
          setSelectedDevis?.(d);
          setPage?.('devis');
        }}
        onCreateDevis={() => {
          setCeMoisModalOpen(false);
          setCreateMode?.((p) => ({ ...p, devis: true }));
          setPage?.('devis');
        }}
        onViewAllDevis={() => {
          setCeMoisModalOpen(false);
          setPage?.('devis');
        }}
        onRelanceDevis={(d) => {
          setRelanceModal({ isOpen: true, item: d });
        }}
        isDark={isDark}
        modeDiscret={modeDiscret}
        // Rentability data
        chantiers={safeChantiers}
        devis={safeDevis}
        depenses={depenses}
        pointages={pointages}
        equipe={equipe}
        ajustements={ajustements}
        onSelectChantier={(id) => {
          setCeMoisModalOpen(false);
          setSelectedChantier?.(id);
          setPage?.('chantiers');
        }}
      />

      {/* ========== DEVIS EXPRESS MODAL ========== */}
      <DevisExpressModal
        isOpen={showDevisExpress}
        onClose={() => setShowDevisExpress(false)}
        onCreateDevis={async (devisData) => {
          const newDevis = await addDevis?.({
            ...devisData,
            type: 'devis',
            statut: 'brouillon',
            date: new Date().toISOString().split('T')[0],
          });
          if (newDevis?.id) {
            setShowDevisExpress(false);
            setSelectedDevis?.(newDevis);
            setPage?.('devis');
          }
        }}
        clients={clients}
        isDark={isDark}
        couleur={couleur}
      />

      {/* ========== DEVIS IA CHAT MODAL ========== */}
      {showAIChat && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowAIChat(false)} />
          <div className="relative w-full sm:max-w-2xl h-[85vh] sm:h-[80vh] sm:max-h-[700px] rounded-t-2xl sm:rounded-2xl overflow-hidden shadow-2xl">
            <ChatInterface
              isDark={isDark}
              couleur={couleur}
              onCreateDevis={handleAICreateDevis}
              onClose={() => setShowAIChat(false)}
              clients={clients}
              entreprise={entreprise}
              compact={false}
            />
          </div>
        </div>
      )}

      {/* Margin Analysis Modal */}
      <MarginAnalysisModal
        isOpen={marginAnalysisModal.isOpen}
        onClose={() => setMarginAnalysisModal({ isOpen: false, chantierId: null, chantierNom: null })}
        chantierId={marginAnalysisModal.chantierId}
        chantierNom={marginAnalysisModal.chantierNom}
        chantiers={safeChantiers}
        devis={safeDevis}
        depenses={safeDepenses}
        pointages={safePointages}
        equipe={safeEquipe}
        clients={safeClients}
        onNavigateToChantier={(id) => {
          setMarginAnalysisModal({ isOpen: false, chantierId: null, chantierNom: null });
          const chantier = safeChantiers.find(c => c.id === id);
          if (chantier) {
            setSelectedChantier?.(chantier);
          }
          setPage?.('chantiers');
        }}
        isDark={isDark}
        modeDiscret={modeDiscret}
      />
    </div>
  );
}
