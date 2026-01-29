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
} from './dashboard/index';

// UI Components
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';

// Modals
import { RelanceModal } from './modals/RelanceModal';

// Services & Utils
import { getPendingRelances, formatRelanceForDisplay } from '../services/RelanceService';
import {
  generateSuggestionsFromContext,
  transformSuggestions,
} from '../lib/actionSuggestions';
import { useData } from '../context/DataContext';

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
  const textSecondary = isDark ? 'text-slate-400' : 'text-slate-500';
  const textMuted = isDark ? 'text-slate-500' : 'text-slate-400';

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
                onClick: () => setPage?.('parametres'),
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
            <h3 className={`font-semibold ${textPrimary}`}>Votre futur tableau de bord</h3>
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
}) {
  const colorMap = {
    emerald: {
      bg: 'bg-emerald-50 dark:bg-emerald-500/10',
      icon: 'text-emerald-600 dark:text-emerald-400',
    },
    blue: {
      bg: 'bg-blue-50 dark:bg-blue-500/10',
      icon: 'text-blue-600 dark:text-blue-400',
    },
    purple: {
      bg: 'bg-purple-50 dark:bg-purple-500/10',
      icon: 'text-purple-600 dark:text-purple-400',
    },
    orange: {
      bg: 'bg-orange-50 dark:bg-orange-500/10',
      icon: 'text-orange-600 dark:text-orange-400',
    },
  };

  return (
    <div
      className={`
        rounded-2xl border overflow-hidden min-h-[320px] flex flex-col
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
        <h3 className={`text-base font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
          Activité récente
        </h3>
      </div>

      {/* Body */}
      <div className="flex-1 px-5 pb-5 overflow-auto">
        {activities?.length > 0 ? (
          <div className="space-y-2.5">
            {activities.map((activity) => {
              const colors = colorMap[activity.color] || colorMap.blue;
              return (
                <div
                  key={activity.id}
                  className={`
                    p-3.5 rounded-xl transition-colors duration-150
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
                    <span className={`text-[11px] font-medium whitespace-nowrap ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
                      {(() => {
                        const diff = Date.now() - activity.date.getTime();
                        const hours = Math.floor(diff / 3600000);
                        if (hours < 1) return "À l'instant";
                        if (hours < 24) return `${hours}h`;
                        return 'Hier';
                      })()}
                    </span>
                  </div>
                </div>
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
}) {
  // State
  const [selectedPeriod, setSelectedPeriod] = useState('month');
  const [isLoading, setIsLoading] = useState(true);
  const [relanceModal, setRelanceModal] = useState({ isOpen: false, item: null });

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
      envoye: devisOnly.filter((d) => d.statut === 'envoye'),
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

    // Devis stats
    const devisEnAttente = devisPipeline.envoye.length;
    const montantDevisEnAttente = devisPipeline.envoye.reduce((s, d) => s + (d.total_ttc || 0), 0);

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
    // Calculate percentage change with proper handling
    // - If no previous month data, return null (will show "—")
    // - Cap at ±999% for display sanity
    let tendance = null;
    if (lastMonthCA > 0) {
      const rawChange = ((thisMonthCA - lastMonthCA) / lastMonthCA) * 100;
      tendance = Math.round(Math.max(-999, Math.min(999, rawChange)));
    }

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
        type: 'payment',
        icon: CheckCircle,
        title: `Facture ${f.numero} payée`,
        subtitle: client?.nom || 'Client',
        amount: f.total_ttc,
        date: new Date(f.date_paiement || f.date),
        color: 'emerald',
      });
    });

    // Recent sent devis
    stats.devisPipeline?.envoye?.slice(0, 2).forEach((d) => {
      const client = safeClients.find((c) => c.id === d.client_id);
      activities.push({
        id: `sent-${d.id}`,
        type: 'devis',
        icon: Send,
        title: `Devis ${d.numero} envoyé`,
        subtitle: client?.nom || 'Client',
        amount: d.total_ttc,
        date: new Date(d.date),
        color: 'blue',
      });
    });

    // Recent started chantiers
    safeChantiers
      .filter((c) => c.statut === 'en_cours')
      .slice(0, 1)
      .forEach((ch) => {
        activities.push({
          id: `started-${ch.id}`,
          type: 'chantier',
          icon: HardHat,
          title: `Chantier ${ch.nom} démarré`,
          subtitle: ch.adresse || 'Lieu non défini',
          date: new Date(ch.date_debut || ch.created_at || Date.now()),
          color: 'purple',
        });
      });

    return activities.sort((a, b) => b.date - a.date).slice(0, 4);
  }, [stats, safeClients, safeChantiers]);

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

  // ============ RENDER ============

  // Show new user welcome
  if (stats.isNewUser) {
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
    <div className={isDark ? 'bg-slate-900' : 'bg-gray-50'}>
      {/* Hero Section */}
      <HeroSection
        userName={entreprise?.nom?.split(' ')[0] || 'Artisan'}
        activeChantiers={stats.chantiersActifs}
        urgentAction={urgentAction}
        isDark={isDark}
      />

      {/* Main Content */}
      <div className="max-w-7xl mx-auto">
        {/* KPI Section - Simplified to 2 essential KPIs */}
        <section className={`px-4 sm:px-6 pb-8 ${isDark ? 'bg-slate-900' : 'bg-white'}`}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* À ENCAISSER - Most important for cash flow */}
            <KPICard
              icon={Wallet}
              label="À ENCAISSER"
              value={formatMoney(stats.enAttente, modeDiscret)}
              comparison={stats.facturesOverdue?.length > 0
                ? `⚠️ ${stats.facturesOverdue.length} facture${stats.facturesOverdue.length > 1 ? 's' : ''} en retard`
                : `${stats.facturesEnAttente?.length || 0} facture${(stats.facturesEnAttente?.length || 0) > 1 ? 's' : ''} en attente`
              }
              color={stats.facturesOverdue?.length > 0 ? 'orange' : 'blue'}
              isDark={isDark}
              onClick={() => setPage?.('devis')}
            />

            {/* CE MOIS - Monthly performance */}
            <KPICard
              icon={TrendingUp}
              label="CE MOIS"
              value={formatMoney(stats.totalCA, modeDiscret)}
              trend={stats.tendance}
              trendLabel="vs mois dernier"
              color={stats.tendance >= 0 ? 'green' : 'red'}
              isDark={isDark}
              onClick={() => setPage?.('devis')}
            />
          </div>
        </section>

        {/* Suggestions Section */}
        {suggestions.length > 0 && (
          <section className="px-4 sm:px-6 pb-8">
            <SuggestionsSection
              suggestions={suggestions.map((s) => ({
                ...s,
                ctaAction: () => handleSuggestionAction(s),
              }))}
              isDark={isDark}
            />
          </section>
        )}

        {/* Main Widgets Grid */}
        <section className="px-4 sm:px-6 pb-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {/* Devis Widget */}
            <DevisWidget
              setPage={setPage}
              setSelectedDevis={setSelectedDevis}
              onRelance={handleOpenRelance}
              isDark={isDark}
            />

            {/* Chantiers Widget */}
            <ChantiersWidget
              setPage={setPage}
              setSelectedChantier={setSelectedChantier}
            />

            {/* Tresorerie Widget */}
            <TresorerieWidget
              setPage={setPage}
              isDark={isDark}
            />

            {/* Recent Activity */}
            <RecentActivityWidget
              activities={recentActivity}
              isDark={isDark}
              formatMoney={(n) => formatMoney(n, modeDiscret)}
            />

            {/* Weather Alerts */}
            <WeatherAlertsWidget
              setPage={setPage}
              isDark={isDark}
            />

            {/* Stock Widget */}
            {stats.lowStockItems?.length > 0 && (
              <StockWidget
                setPage={setPage}
                isDark={isDark}
              />
            )}
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
    </div>
  );
}
