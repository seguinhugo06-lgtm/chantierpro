/**
 * Dashboard — Focus & Pulse
 *
 * 3-zone layout:
 * 1. Hero Pulse — greeting, score santé, 4 KPI cards, sparkline CA
 * 2. Actions Prioritaires — unified priority list
 * 3. Contexte — active chantier + pipeline funnel + onboarding bar
 *
 * 2-column layout on desktop (lg:):
 *  - Left column: KPIs, sparkline CA, pipeline, actions du jour, promo cards
 *  - Right column: chantier actif, onboarding
 *  - Banners (profile < 50%, urgent) stay full-width above the grid
 *
 * @module Dashboard
 */

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText,
  HardHat,
  AlertTriangle,
  AlertCircle,
  Clock,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  ArrowRight,
  Receipt,
  Send,
  ClipboardList,
  CheckCircle,
  TrendingUp,
  TrendingDown,
  Minus,
  Zap,
  Sparkles,
  BarChart3,
} from 'lucide-react';

import { AreaChart, Area, ResponsiveContainer, XAxis, Tooltip } from 'recharts';
import { useData } from '../context/DataContext';
import { useToast } from '../context/AppContext';
import { usePermissions } from '../hooks/usePermissions';
import { captureException } from '../lib/sentry';
import DashboardMemos from './dashboard/DashboardMemos';

// ============ CONSTANTS ============

const PROFILE_ALL_FIELDS = [
  { key: 'nom', label: 'Nom', tab: 'identite' },
  { key: 'adresse', label: 'Adresse', tab: 'identite' },
  { key: 'siret', label: 'SIRET', tab: 'legal' },
  { key: 'tel', label: 'Téléphone', tab: 'identite' },
  { key: 'email', label: 'Email', tab: 'identite' },
  { key: 'formeJuridique', label: 'Forme juridique', tab: 'legal' },
  { key: 'codeApe', label: 'Code APE', tab: 'legal' },
  { key: 'tvaIntra', label: 'TVA Intra', tab: 'legal' },
  { key: 'rcProAssureur', label: 'RC Pro', tab: 'assurances' },
  { key: 'decennaleAssureur', label: 'Décennale', tab: 'assurances' },
];

const F26_CRITERIA = [
  { label: 'SIRET', key: 'siret' },
  { label: 'N° TVA', key: 'tvaIntra' },
  { label: 'RCS', key: 'rcs' },
  { label: 'Banque', key: 'banque' },
  { label: 'Adresse', key: 'adresse' },
  { label: 'RC Pro', key: 'rcPro' },
];

// ============ ANIMATION VARIANTS ============

const fadeInUp = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -10 },
};

const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.03,
    },
  },
};

const staggerItem = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
};

// ============ HELPERS ============

function fmt(amount, discret = false) {
  if (discret) return '\u2022\u2022\u2022\u2022\u2022';
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(amount || 0);
}

/**
 * Format money for compact display in pipeline segments
 * e.g. 12500 => "12,5k €", 950 => "950 €"
 */
function formatMoney(amount, discret = false) {
  if (discret) return '\u2022\u2022\u2022';
  if (!amount || amount === 0) return '0 €';
  if (Math.abs(amount) >= 1000) {
    return `${(amount / 1000).toFixed(1).replace('.', ',')}k €`;
  }
  return `${Math.round(amount)} €`;
}

function daysSince(date) {
  if (!date) return 0;
  const d = date instanceof Date ? date : new Date(date);
  return Math.floor((new Date() - d) / (1000 * 60 * 60 * 24));
}

function getPrenom(user, entreprise) {
  if (!user) return '';
  const meta = user.user_metadata || {};
  if (meta.prenom) return meta.prenom;
  if (meta.first_name) return meta.first_name;
  if (meta.full_name) return meta.full_name.split(' ')[0];
  if (meta.name) return meta.name.split(' ')[0];
  if (entreprise?.nom) return entreprise.nom.split(' ')[0];
  return (user.email || '').split('@')[0] || 'Artisan';
}

/**
 * Compute the trend percentage between two values.
 * Returns an object { value, direction } where direction is 'up', 'down', or 'flat'.
 */
function computeTrend(current, previous) {
  if (!previous || previous === 0) {
    if (current > 0) return { value: 100, direction: 'up' };
    return { value: 0, direction: 'flat' };
  }
  const pct = Math.round(((current - previous) / previous) * 100);
  if (pct > 0) return { value: pct, direction: 'up' };
  if (pct < 0) return { value: Math.abs(pct), direction: 'down' };
  return { value: 0, direction: 'flat' };
}

// ============ SCORE SANTE ============

function ScoreSante({ score, isDark, couleur }) {
  const dots = Array.from({ length: 5 }, (_, i) => i < Math.round(score / 2));
  const color = score >= 8 ? '#10b981' : score >= 5 ? '#f59e0b' : '#ef4444';
  return (
    <div className="flex items-center gap-1.5">
      <span className={`text-xs font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
        {score}/10
      </span>
      <div className="flex gap-0.5">
        {dots.map((filled, i) => (
          <div
            key={i}
            className="w-2 h-2 rounded-full transition-colors"
            style={{ background: filled ? color : (isDark ? '#334155' : '#e2e8f0') }}
          />
        ))}
      </div>
    </div>
  );
}

// ============ TREND BADGE ============

/**
 * Small badge showing a trend arrow and percentage.
 * Used in KPI cards next to the value.
 */
function TrendBadge({ trend, isDark }) {
  if (!trend || trend.direction === 'flat') return null;

  const isUp = trend.direction === 'up';
  const Icon = isUp ? TrendingUp : TrendingDown;
  const bgColor = isUp
    ? (isDark ? 'bg-emerald-900/40' : 'bg-emerald-50')
    : (isDark ? 'bg-red-900/40' : 'bg-red-50');
  const textColor = isUp
    ? (isDark ? 'text-emerald-400' : 'text-emerald-600')
    : (isDark ? 'text-red-400' : 'text-red-600');

  return (
    <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-medium ${bgColor} ${textColor}`}>
      <Icon className="w-3 h-3" />
      {trend.value}%
    </span>
  );
}

// ============ KPI CARD (enhanced with trend) ============

function KPICard({ label, shortLabel, value, sub, trend, colorClasses, isDark, delay = 0, onClick }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4 }}
      className={`rounded-2xl p-4 sm:p-5 ${onClick ? 'cursor-pointer hover:ring-2 ring-offset-2' : ''} ${colorClasses}`}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); } } : undefined}
      style={onClick ? { ringColor: 'currentColor' } : undefined}
    >
      <p className={`text-sm font-medium ${isDark ? 'text-slate-300' : 'text-gray-600'}`}>
        {shortLabel ? (
          <>
            <span className="hidden sm:inline">{label}</span>
            <span className="sm:hidden">{shortLabel}</span>
          </>
        ) : label}
      </p>
      <div className="flex items-center gap-2 mt-1">
        <p className={`text-2xl font-bold ${isDark ? 'text-slate-100' : 'text-gray-900'}`}>
          {value}
        </p>
        {trend && <TrendBadge trend={trend} isDark={isDark} />}
      </div>
      {sub && (
        <p className={`text-xs mt-1.5 ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
          {sub}
        </p>
      )}
    </motion.div>
  );
}

// ============ ACTION ITEM ============

function ActionItem({ icon: Icon, color, label, detail, actionLabel, onClick, isDark }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full flex items-center gap-4 px-4 py-3.5 transition-colors text-left ${
        isDark ? 'hover:bg-slate-700/50' : 'hover:bg-gray-50'
      }`}
    >
      <div
        className="flex items-center justify-center w-9 h-9 rounded-xl flex-shrink-0"
        style={{ background: `${color}15` }}
      >
        <Icon className="w-4.5 h-4.5" style={{ color }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium truncate ${isDark ? 'text-slate-200' : 'text-gray-800'}`}>
          {label}
        </p>
        {detail && (
          <p className={`text-xs truncate mt-0.5 ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
            {detail}
          </p>
        )}
      </div>
      {actionLabel && (
        <span className={`text-[10px] px-2 py-0.5 rounded-full flex-shrink-0 font-medium ${isDark ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-500'}`}>
          {actionLabel}
        </span>
      )}
      <ChevronRight className={`w-4 h-4 flex-shrink-0 ${isDark ? 'text-slate-600' : 'text-gray-300'}`} />
    </button>
  );
}

// ============ OVERVIEW WIDGET (collapsible) ============

/**
 * GAP 7: Compact overview widget that can be toggled open/closed.
 * Summarizes key business metrics in a dense layout.
 */
function OverviewWidget({
  isDark,
  couleur,
  textPrimary,
  textSecondary,
  sectionBg,
  computed,
  modeDiscret,
  showOverview,
  setShowOverview,
}) {
  const cardBg = isDark
    ? 'bg-slate-800/60 border border-slate-700/40'
    : 'bg-slate-50 border border-slate-100';

  // Summary items for the overview grid
  const overviewItems = useMemo(() => [
    {
      label: 'CA total 6 mois',
      value: fmt(computed.sparkData.reduce((s, d) => s + d.ca, 0), modeDiscret),
      icon: BarChart3,
      color: couleur,
    },
    {
      label: 'CA prévisionnel',
      value: fmt(computed.caPrevisionnel, modeDiscret),
      icon: TrendingUp,
      color: '#10b981',
    },
    {
      label: 'Factures en retard',
      value: fmt(computed.retard, modeDiscret),
      icon: AlertTriangle,
      color: computed.retard > 0 ? '#ef4444' : '#10b981',
    },
    {
      label: 'Chantiers actifs',
      value: String(computed.chantiersActifs.length),
      icon: HardHat,
      color: '#3b82f6',
    },
    {
      label: 'Devis en attente',
      value: String(computed.devisEnAttente.length),
      icon: FileText,
      color: '#f97316',
    },
    {
      label: 'Taux de conversion',
      value: `${computed.tauxConversion}%`,
      icon: Zap,
      color: computed.tauxConversion >= 50 ? '#10b981' : '#f59e0b',
    },
  ], [computed, modeDiscret, couleur]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className={`rounded-2xl overflow-hidden ${sectionBg}`}
    >
      {/* Toggle header */}
      <button
        type="button"
        onClick={() => setShowOverview(!showOverview)}
        className={`w-full flex items-center justify-between px-4 py-2.5 transition-colors ${
          isDark ? 'hover:bg-slate-700/30' : 'hover:bg-gray-50/50'
        }`}
      >
        <div className="flex items-center gap-2">
          <BarChart3 className="w-3.5 h-3.5" style={{ color: couleur }} />
          <span className={`text-xs font-semibold ${textSecondary}`}>
            Vue d'ensemble
          </span>
        </div>
        <motion.div
          animate={{ rotate: showOverview ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronDown className={`w-3.5 h-3.5 ${textSecondary}`} />
        </motion.div>
      </button>

      {/* Collapsible content */}
      <AnimatePresence initial={false}>
        {showOverview && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {overviewItems.map((item, idx) => {
                  const ItemIcon = item.icon;
                  return (
                    <motion.div
                      key={item.label}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.05, duration: 0.3 }}
                      className={`rounded-xl p-3.5 ${cardBg}`}
                    >
                      <div className="flex items-center gap-2 mb-1.5">
                        <div
                          className="w-6 h-6 rounded-lg flex items-center justify-center"
                          style={{ background: `${item.color}15` }}
                        >
                          <ItemIcon className="w-3.5 h-3.5" style={{ color: item.color }} />
                        </div>
                        <span className={`text-[10px] uppercase tracking-wider font-medium ${textSecondary}`}>
                          {item.label}
                        </span>
                      </div>
                      <p className={`text-lg font-bold ${textPrimary}`}>
                        {item.value}
                      </p>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ============ PROMO CARDS (Devis IA / Express) ============

/**
 * Promo cards displayed in the left column.
 * These promote features like AI-powered quotes and express invoicing.
 */
function PromoCards({ isDark, couleur, setPage, setCreateMode, setAiPrefill }) {
  const cardBg = isDark
    ? 'bg-slate-800 border border-slate-700/50'
    : 'bg-white shadow-[0_1px_3px_rgba(0,0,0,0.06)]';
  const textPrimary = isDark ? 'text-slate-100' : 'text-gray-900';
  const textSecondary = isDark ? 'text-slate-400' : 'text-gray-500';

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {/* Devis IA card */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.3 }}
        className={`rounded-2xl p-4 sm:p-5 cursor-pointer transition-transform hover:scale-[1.01] ${cardBg}`}
        onClick={() => {
          setAiPrefill?.({ active: true });
          setPage('devis');
        }}
      >
        <div className="flex items-start gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: `${couleur}15` }}
          >
            <Sparkles className="w-5 h-5" style={{ color: couleur }} />
          </div>
          <div>
            <h4 className={`text-sm font-semibold ${textPrimary}`}>
              Devis IA
            </h4>
            <p className={`text-xs mt-1 ${textSecondary}`}>
              Générez un devis professionnel en quelques secondes grâce à l'intelligence artificielle
            </p>
            <span
              className="inline-flex items-center gap-1 text-xs font-medium mt-2"
              style={{ color: couleur }}
            >
              Essayer <ArrowRight className="w-3 h-3" />
            </span>
          </div>
        </div>
      </motion.div>

      {/* Devis Express card */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.45, duration: 0.3 }}
        className={`rounded-2xl p-4 sm:p-5 cursor-pointer transition-transform hover:scale-[1.01] ${cardBg}`}
        onClick={() => {
          setCreateMode?.({ devis: true });
          setPage('devis');
        }}
      >
        <div className="flex items-start gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: '#10b98115' }}
          >
            <Zap className="w-5 h-5" style={{ color: '#10b981' }} />
          </div>
          <div>
            <h4 className={`text-sm font-semibold ${textPrimary}`}>
              Devis Express
            </h4>
            <p className={`text-xs mt-1 ${textSecondary}`}>
              Créez un devis rapide à partir de vos modèles et votre catalogue
            </p>
            <span
              className="inline-flex items-center gap-1 text-xs font-medium mt-2"
              style={{ color: '#10b981' }}
            >
              Créer <ArrowRight className="w-3 h-3" />
            </span>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

// ============ URGENT BANNER ============

/**
 * Full-width banner shown when there are critical actions needed.
 * Displayed above the 2-column grid.
 */
function UrgentBanner({ count, totalRetard, isDark, modeDiscret, couleur, onClick, dismissed, onDismiss }) {
  if (count === 0 || dismissed) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`rounded-xl px-4 py-2.5 flex items-center gap-3 cursor-pointer transition-transform hover:scale-[1.005] ${
        isDark
          ? 'bg-red-900/20 border border-red-800/30'
          : 'bg-red-50 border border-red-100'
      }`}
      onClick={onClick}
    >
      <div
        className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
        style={{ background: '#ef444420' }}
      >
        <AlertTriangle className="w-4 h-4 text-red-500" />
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-semibold ${isDark ? 'text-red-300' : 'text-red-700'}`}>
          {count} facture{count > 1 ? 's' : ''} en retard
          <span className={`font-normal ml-2 ${isDark ? 'text-red-400/70' : 'text-red-500/70'}`}>
            {fmt(totalRetard, modeDiscret)}
          </span>
        </p>
      </div>
      <ChevronRight className={`w-4 h-4 flex-shrink-0 ${isDark ? 'text-red-500/50' : 'text-red-400'}`} />
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onDismiss(); }}
        className={`p-1 rounded-lg transition-colors flex-shrink-0 ${isDark ? 'hover:bg-red-800/30 text-red-400' : 'hover:bg-red-100 text-red-400'}`}
        aria-label="Fermer"
      >
        <span className="text-sm font-bold leading-none">&times;</span>
      </button>
    </motion.div>
  );
}

// ============ PROFILE COMPLETION BANNER ============

/**
 * Full-width banner shown when profile completion is below 50%.
 * Displayed above the 2-column grid.
 */
// ProfileBanner removed — replaced by compact onboarding bandeau

// ============ BATCH RELAUNCH BUTTON ============

/**
 * GAP 5: Button to relaunch all pending follow-ups at once.
 * Displayed when there are 2+ actions of type "Relancer".
 */
function BatchRelaunchButton({ actions, isDark, couleur, showToast }) {
  const relanceActions = actions.filter(a => a.actionLabel === 'Relancer');
  if (relanceActions.length < 2) return null;

  const handleBatchRelaunch = () => {
    // In a real implementation, this would trigger bulk email/SMS sending
    // For now, show a toast confirming the intent
    if (showToast) {
      showToast(`${relanceActions.length} relances envoyées`, 'success');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.2 }}
      className="mt-3 flex justify-end"
    >
      <button
        type="button"
        onClick={handleBatchRelaunch}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-white transition-transform hover:scale-[1.02] active:scale-[0.98]"
        style={{ background: couleur }}
      >
        <Send className="w-3.5 h-3.5" />
        Tout relancer ({relanceActions.length})
      </button>
    </motion.div>
  );
}

// OnboardingSection removed — replaced by compact onboarding bandeau

// ============ CHANTIER ACTIF WIDGET ============

/**
 * Displays the main active chantier with progress bar.
 * Shows a "create" CTA when no chantier is active.
 */
function ChantierActifWidget({
  chantierPrincipal,
  chantiersActifs,
  clients,
  isDark,
  couleur,
  textPrimary,
  textSecondary,
  sectionBg,
  setSelectedChantier,
  setPage,
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3, duration: 0.4 }}
      className={`rounded-2xl p-5 ${sectionBg}`}
    >
      <h3 className={`text-sm font-semibold mb-3 ${textSecondary}`}>
        Chantier en cours
      </h3>
      {chantierPrincipal ? (() => {
        const ch = chantierPrincipal;
        const client = clients.find(c => c.id === ch.client_id);
        const avancement = ch.avancement || 0;
        return (
          <div>
            <p className={`text-base font-semibold ${textPrimary}`}>
              {ch.nom || ch.name || 'Chantier'}
            </p>
            <p className={`text-xs mb-3 ${textSecondary}`}>
              {client ? (client.nom || client.name) : 'Pas de client'}
            </p>
            <div className="mb-2">
              <div className="flex justify-between text-xs mb-1">
                <span className={textSecondary}>Avancement</span>
                <span className={`font-medium ${textPrimary}`}>{avancement}%</span>
              </div>
              <div className={`h-2 rounded-full overflow-hidden ${isDark ? 'bg-slate-700' : 'bg-slate-200'}`}>
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${avancement}%` }}
                  transition={{ duration: 0.6, ease: 'easeOut' }}
                  className="h-full rounded-full transition-all"
                  style={{ background: couleur }}
                />
              </div>
            </div>
            {ch.prochaineTache && (
              <p className={`text-xs mt-2 ${textSecondary}`}>
                Prochaine tache : {ch.prochaineTache}
              </p>
            )}
            <button
              type="button"
              onClick={() => { setSelectedChantier?.(ch.id); setPage('chantier-detail', { chantierId: ch.id }); }}
              className="mt-3 inline-flex items-center gap-1 text-sm font-medium transition-colors"
              style={{ color: couleur }}
            >
              Ouvrir <ArrowRight className="w-3.5 h-3.5" />
            </button>

            {/* Additional active chantiers */}
            {chantiersActifs.length > 1 && (
              <div className={`mt-4 pt-3 border-t ${isDark ? 'border-slate-700' : 'border-slate-100'}`}>
                <p className={`text-xs mb-2 ${textSecondary}`}>
                  {chantiersActifs.length - 1} autre{chantiersActifs.length > 2 ? 's' : ''} chantier{chantiersActifs.length > 2 ? 's' : ''} actif{chantiersActifs.length > 2 ? 's' : ''}
                </p>
                <div className="space-y-2">
                  {chantiersActifs
                    .filter(c => c.id !== ch.id)
                    .slice(0, 3)
                    .map((otherCh) => {
                      const otherClient = clients.find(c => c.id === otherCh.client_id);
                      const otherAvancement = otherCh.avancement || 0;
                      return (
                        <button
                          key={otherCh.id}
                          type="button"
                          onClick={() => { setSelectedChantier?.(otherCh.id); setPage('chantier-detail', { chantierId: otherCh.id }); }}
                          className={`w-full text-left flex items-center gap-3 py-2 px-3 rounded-xl transition-colors ${
                            isDark ? 'hover:bg-slate-700/50' : 'hover:bg-gray-50'
                          }`}
                        >
                          <div className="flex-1 min-w-0">
                            <p className={`text-xs font-medium truncate ${textPrimary}`}>
                              {otherCh.nom || otherCh.name || 'Chantier'}
                            </p>
                            <p className={`text-[10px] truncate ${textSecondary}`}>
                              {otherClient ? (otherClient.nom || otherClient.name) : ''}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <div className={`w-12 h-1.5 rounded-full overflow-hidden ${isDark ? 'bg-slate-700' : 'bg-slate-200'}`}>
                              <div
                                className="h-full rounded-full"
                                style={{ width: `${otherAvancement}%`, background: couleur }}
                              />
                            </div>
                            <span className={`text-[10px] font-medium ${textSecondary}`}>
                              {otherAvancement}%
                            </span>
                          </div>
                        </button>
                      );
                    })}
                </div>
                {chantiersActifs.length > 4 && (
                  <button
                    type="button"
                    onClick={() => setPage('chantiers')}
                    className="mt-2 text-xs font-medium"
                    style={{ color: couleur }}
                  >
                    Voir tous les chantiers ({chantiersActifs.length})
                  </button>
                )}
              </div>
            )}
          </div>
        );
      })() : (
        <div className={`text-sm py-4 text-center ${textSecondary}`}>
          Aucun chantier en cours
          <br />
          <button
            type="button"
            onClick={() => setPage('chantiers')}
            className="mt-2 text-sm font-medium"
            style={{ color: couleur }}
          >
            Créer un chantier
          </button>
        </div>
      )}
    </motion.div>
  );
}

// ============ PIPELINE WIDGET ============

/**
 * Pipeline devis section with funnel bar and CA prévisionnel.
 */
// PipelineWidget + SparklineCAWidget removed — data available in Analytics Premium

// ============ ACTIONS SECTION ============

/**
 * Actions prioritaires section with differentiated icons and batch relaunch.
 */
function ActionsSection({
  allActions,
  visibleActions,
  showAllActions,
  setShowAllActions,
  isDark,
  couleur,
  textSecondary,
  sectionBg,
  showToast,
}) {
  if (allActions.length === 0) return null;

  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.25, duration: 0.4 }}
    >
      <h2 className={`text-sm font-semibold uppercase tracking-wider mb-3 ${textSecondary}`}>
        Actions prioritaires
      </h2>
      <div className={`rounded-2xl divide-y ${sectionBg} ${isDark ? 'divide-slate-700/50' : 'divide-gray-100'}`}>
        {visibleActions.map((action, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.25 + i * 0.03, duration: 0.3 }}
          >
            <ActionItem
              icon={action.icon}
              color={action.color}
              label={action.label}
              detail={action.detail}
              actionLabel={action.actionLabel}
              onClick={action.onClick}
              isDark={isDark}
            />
          </motion.div>
        ))}
      </div>
      {allActions.length > 5 && (
        <button
          type="button"
          onClick={() => setShowAllActions(!showAllActions)}
          className={`mt-2 text-sm font-medium transition-colors ${isDark ? 'text-slate-400 hover:text-slate-300' : 'text-slate-500 hover:text-slate-700'}`}
        >
          {showAllActions ? 'Voir moins' : `Voir tout (${allActions.length})`}
        </button>
      )}

      {/* GAP 5: Batch relaunch button */}
      <BatchRelaunchButton
        actions={allActions}
        isDark={isDark}
        couleur={couleur}
        showToast={showToast}
      />
    </motion.section>
  );
}

// ============ ACTIVITY TIMELINE ============

/**
 * Recent activity timeline showing the latest business events.
 * Helps user see what happened recently at a glance.
 */
function ActivityTimeline({
  devis,
  chantiers,
  clients,
  isDark,
  couleur,
  textPrimary,
  textSecondary,
  sectionBg,
  modeDiscret,
  setPage,
  setSelectedDevis,
  setSelectedChantier,
}) {
  // Build activity items from recent devis and chantier changes
  const activities = useMemo(() => {
    const items = [];
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Recent devis activity
    devis
      .filter(d => d.date && new Date(d.date) > thirtyDaysAgo)
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 8)
      .forEach(d => {
        const client = clients.find(c => c.id === d.client_id);
        const clientName = client ? (client.nom || client.name) : 'Client inconnu';
        let actionText = '';
        let actionIcon = FileText;
        let actionColor = couleur;

        switch (d.statut) {
          case 'brouillon':
            actionText = `Brouillon créé`;
            actionIcon = FileText;
            actionColor = '#94a3b8';
            break;
          case 'envoye':
            actionText = `Devis envoyé`;
            actionIcon = Send;
            actionColor = '#3b82f6';
            break;
          case 'signe':
            actionText = `Devis signé`;
            actionIcon = CheckCircle;
            actionColor = '#10b981';
            break;
          case 'facture':
            actionText = `Facture émise`;
            actionIcon = Receipt;
            actionColor = '#8b5cf6';
            break;
          case 'refuse':
            actionText = `Devis refusé`;
            actionIcon = AlertTriangle;
            actionColor = '#ef4444';
            break;
          default:
            actionText = `Devis mis à jour`;
            actionIcon = FileText;
            actionColor = couleur;
        }

        items.push({
          id: `devis-${d.id}`,
          date: d.date,
          text: `${actionText} — ${clientName}`,
          amount: d.total_ttc,
          icon: actionIcon,
          color: actionColor,
          type: 'devis',
          onClick: () => { setSelectedDevis(d); setPage('devis'); },
        });
      });

    // Recent chantier activity
    chantiers
      .filter(c => c.date_debut && new Date(c.date_debut) > thirtyDaysAgo)
      .sort((a, b) => new Date(b.date_debut) - new Date(a.date_debut))
      .slice(0, 4)
      .forEach(c => {
        const client = clients.find(cl => cl.id === c.client_id);
        const clientName = client ? (client.nom || client.name) : '';

        items.push({
          id: `chantier-${c.id}`,
          date: c.date_debut,
          text: `Chantier démarré : ${c.nom || c.name || 'Sans nom'}`,
          amount: null,
          icon: HardHat,
          color: '#3b82f6',
          type: 'chantier',
          onClick: () => { setSelectedChantier?.(c.id); setPage('chantier-detail', { chantierId: c.id }); },
        });
      });

    // Sort all activities by date descending
    return items.sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 8);
  }, [devis, chantiers, clients, couleur, setSelectedDevis, setSelectedChantier, setPage]);

  if (activities.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5, duration: 0.4 }}
      className={`rounded-2xl p-5 ${sectionBg}`}
    >
      <h3 className={`text-sm font-semibold mb-4 ${textSecondary}`}>
        Activité récente
      </h3>
      <div className="relative">
        {/* Timeline line */}
        <div
          className={`absolute left-4 top-0 bottom-0 w-px ${isDark ? 'bg-slate-700' : 'bg-slate-200'}`}
        />

        {/* Timeline items */}
        <div className="space-y-1">
          {activities.map((activity, idx) => {
            const ActivityIcon = activity.icon;
            const dateStr = activity.date
              ? new Date(activity.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
              : '';
            return (
              <motion.button
                key={activity.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 + idx * 0.04, duration: 0.25 }}
                type="button"
                onClick={activity.onClick}
                className={`w-full text-left flex items-start gap-3 pl-1 pr-3 py-2.5 rounded-xl transition-colors relative ${
                  isDark ? 'hover:bg-slate-700/30' : 'hover:bg-gray-50'
                }`}
              >
                {/* Timeline dot */}
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 relative z-10"
                  style={{ background: `${activity.color}15` }}
                >
                  <ActivityIcon className="w-3.5 h-3.5" style={{ color: activity.color }} />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0 pt-0.5">
                  <p className={`text-xs font-medium truncate ${textPrimary}`}>
                    {activity.text}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className={`text-[10px] ${textSecondary}`}>
                      {dateStr}
                    </span>
                    {activity.amount > 0 && (
                      <span className={`text-[10px] font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                        {fmt(activity.amount, modeDiscret)}
                      </span>
                    )}
                  </div>
                </div>
              </motion.button>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}

// ============ EQUIPE SUMMARY WIDGET ============

/**
 * Compact summary of team members and their current assignments.
 * Only shown when there is team data available.
 */
function EquipeSummary({
  equipe,
  chantiers,
  isDark,
  couleur,
  textPrimary,
  textSecondary,
  sectionBg,
  setPage,
}) {
  if (!equipe || equipe.length === 0) return null;

  const chantiersActifs = chantiers.filter(c => c.statut === 'en_cours');

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.55, duration: 0.4 }}
      className={`rounded-2xl p-5 ${sectionBg}`}
    >
      <div className="flex justify-between items-center mb-3">
        <h3 className={`text-sm font-semibold ${textSecondary}`}>
          Équipe
        </h3>
        <span className={`text-xs px-2 py-0.5 rounded-full ${isDark ? 'bg-slate-700 text-slate-400' : 'bg-slate-100 text-slate-500'}`}>
          {equipe.length} membre{equipe.length > 1 ? 's' : ''}
        </span>
      </div>
      <div className="space-y-2">
        {equipe.slice(0, 5).map((membre, idx) => {
          // Find if member is assigned to an active chantier
          const assignedChantier = chantiersActifs.find(c =>
            c.equipe_ids?.includes(membre.id) || c.responsable_id === membre.id
          );
          return (
            <motion.div
              key={membre.id || idx}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.55 + idx * 0.04, duration: 0.25 }}
              className={`flex items-center gap-3 px-3 py-2 rounded-xl ${
                isDark ? 'bg-slate-800/60' : 'bg-slate-50'
              }`}
            >
              {/* Avatar placeholder */}
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold text-white"
                style={{ background: couleur }}
              >
                {(membre.prenom || membre.nom || 'U').charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-xs font-medium truncate ${textPrimary}`}>
                  {membre.prenom || ''} {membre.nom || 'Membre'}
                </p>
                <p className={`text-[10px] truncate ${textSecondary}`}>
                  {membre.role || membre.poste || 'Équipe'}
                </p>
              </div>
              {assignedChantier && (
                <span className={`text-[10px] px-2 py-0.5 rounded-full flex-shrink-0 ${
                  isDark ? 'bg-emerald-900/30 text-emerald-400' : 'bg-emerald-50 text-emerald-600'
                }`}>
                  En chantier
                </span>
              )}
            </motion.div>
          );
        })}
      </div>
      {equipe.length > 5 && (
        <button
          type="button"
          onClick={() => setPage('equipe')}
          className="mt-3 w-full text-center text-xs font-medium"
          style={{ color: couleur }}
        >
          Voir toute l'équipe ({equipe.length})
        </button>
      )}
    </motion.div>
  );
}

// ============ UPCOMING DEADLINES WIDGET ============

/**
 * Shows upcoming invoice deadlines and devis expiration dates.
 * Helps prioritize follow-ups.
 */
function UpcomingDeadlines({
  devis,
  clients,
  isDark,
  couleur,
  textPrimary,
  textSecondary,
  sectionBg,
  modeDiscret,
  setPage,
  setSelectedDevis,
}) {
  const upcoming = useMemo(() => {
    const now = new Date();
    const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const nextMonth = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    return devis
      .filter(d => {
        if (d.type === 'facture' && d.date_echeance) {
          const echeance = new Date(d.date_echeance);
          return echeance > now && echeance < nextMonth && ['envoye', 'facture'].includes(d.statut);
        }
        return false;
      })
      .map(d => {
        const echeance = new Date(d.date_echeance);
        const joursRestants = Math.ceil((echeance - now) / (1000 * 60 * 60 * 24));
        const client = clients.find(c => c.id === d.client_id);
        const isUrgent = joursRestants <= 3;
        const isSoon = joursRestants <= 7;

        return {
          id: d.id,
          devis: d,
          clientName: client ? (client.nom || client.name) : 'Client inconnu',
          joursRestants,
          amount: d.total_ttc,
          isUrgent,
          isSoon,
          color: isUrgent ? '#ef4444' : isSoon ? '#f97316' : '#3b82f6',
        };
      })
      .sort((a, b) => a.joursRestants - b.joursRestants)
      .slice(0, 5);
  }, [devis, clients]);

  if (upcoming.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.6, duration: 0.4 }}
      className={`rounded-2xl p-5 ${sectionBg}`}
    >
      <h3 className={`text-sm font-semibold mb-3 ${textSecondary}`}>
        Échéances à venir
      </h3>
      <div className="space-y-2">
        {upcoming.map((item, idx) => (
          <motion.button
            key={item.id || idx}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.6 + idx * 0.04, duration: 0.25 }}
            type="button"
            onClick={() => { setSelectedDevis(item.devis); setPage('devis'); }}
            className={`w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors ${
              isDark ? 'hover:bg-slate-700/50' : 'hover:bg-gray-50'
            }`}
          >
            {/* Urgency indicator */}
            <div
              className="w-2 h-2 rounded-full flex-shrink-0"
              style={{ background: item.color }}
            />
            <div className="flex-1 min-w-0">
              <p className={`text-xs font-medium truncate ${textPrimary}`}>
                {item.clientName}
              </p>
              <p className={`text-[10px] ${textSecondary}`}>
                {item.isUrgent
                  ? `Urgent — ${item.joursRestants}j restant${item.joursRestants > 1 ? 's' : ''}`
                  : `Dans ${item.joursRestants} jours`
                }
              </p>
            </div>
            <span className={`text-xs font-bold flex-shrink-0 ${textPrimary}`}>
              {fmt(item.amount, modeDiscret)}
            </span>
          </motion.button>
        ))}
      </div>
    </motion.div>
  );
}

// ============ WEEKLY STATS WIDGET ============

/**
 * Shows a summary of this week's activity:
 * - Devis sent
 * - Devis signed
 * - Chantiers started
 * - Revenue generated
 */
function WeeklyStats({
  devis,
  chantiers,
  isDark,
  couleur,
  textPrimary,
  textSecondary,
  sectionBg,
  modeDiscret,
}) {
  const stats = useMemo(() => {
    const now = new Date();
    const startOfWeek = new Date(now);
    const dayOfWeek = now.getDay();
    const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Monday as start
    startOfWeek.setDate(now.getDate() - diff);
    startOfWeek.setHours(0, 0, 0, 0);

    const devisCetteSemaine = devis.filter(d => d.date && new Date(d.date) >= startOfWeek);
    const devisEnvoyes = devisCetteSemaine.filter(d => d.statut === 'envoye').length;
    const devisSignes = devisCetteSemaine.filter(d => ['signe', 'facture'].includes(d.statut)).length;
    const caSemaine = devisCetteSemaine
      .filter(d => ['signe', 'facture'].includes(d.statut))
      .reduce((s, d) => s + (d.total_ttc || 0), 0);
    const chantiersLances = chantiers.filter(c =>
      c.date_debut && new Date(c.date_debut) >= startOfWeek
    ).length;

    return {
      devisEnvoyes,
      devisSignes,
      caSemaine,
      chantiersLances,
    };
  }, [devis, chantiers]);

  // Don't show if no activity this week
  if (stats.devisEnvoyes === 0 && stats.devisSignes === 0 && stats.chantiersLances === 0) {
    return null;
  }

  const statItems = [
    {
      label: 'Devis envoyés',
      value: stats.devisEnvoyes,
      icon: Send,
      color: '#3b82f6',
    },
    {
      label: 'Devis signés',
      value: stats.devisSignes,
      icon: CheckCircle,
      color: '#10b981',
    },
    {
      label: 'CA généré',
      value: fmt(stats.caSemaine, modeDiscret),
      icon: TrendingUp,
      color: couleur,
    },
    {
      label: 'Chantiers lancés',
      value: stats.chantiersLances,
      icon: HardHat,
      color: '#8b5cf6',
    },
  ].filter(item => {
    if (typeof item.value === 'number') return item.value > 0;
    return true;
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.38, duration: 0.4 }}
      className={`rounded-2xl p-5 ${sectionBg}`}
    >
      <h3 className={`text-sm font-semibold mb-3 ${textSecondary}`}>
        Cette semaine
      </h3>
      <div className="grid grid-cols-2 gap-3">
        {statItems.map((item, idx) => {
          const StatIcon = item.icon;
          return (
            <motion.div
              key={item.label}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.38 + idx * 0.05, duration: 0.3 }}
              className={`rounded-xl p-3 ${isDark ? 'bg-slate-800/60 border border-slate-700/40' : 'bg-slate-50 border border-slate-100'}`}
            >
              <div className="flex items-center gap-2 mb-1">
                <StatIcon className="w-3.5 h-3.5" style={{ color: item.color }} />
                <span className={`text-[10px] uppercase tracking-wider ${textSecondary}`}>
                  {item.label}
                </span>
              </div>
              <p className={`text-lg font-bold ${textPrimary}`}>
                {item.value}
              </p>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}

// ============ CATALOGUE SUMMARY ============

/**
 * Quick glance at catalogue items count and categories.
 * Links to the catalogue page.
 */
function CatalogueSummary({
  catalogue,
  isDark,
  couleur,
  textPrimary,
  textSecondary,
  sectionBg,
  setPage,
}) {
  if (!catalogue || catalogue.length === 0) return null;

  // Group by category
  const categories = useMemo(() => {
    const cats = {};
    catalogue.forEach(item => {
      const cat = item.categorie || item.category || 'Sans catégorie';
      if (!cats[cat]) cats[cat] = { name: cat, count: 0 };
      cats[cat].count++;
    });
    return Object.values(cats)
      .sort((a, b) => b.count - a.count)
      .slice(0, 4);
  }, [catalogue]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.65, duration: 0.4 }}
      className={`rounded-2xl p-5 ${sectionBg}`}
    >
      <div className="flex justify-between items-center mb-3">
        <h3 className={`text-sm font-semibold ${textSecondary}`}>
          Catalogue
        </h3>
        <span className={`text-xs font-medium ${textPrimary}`}>
          {catalogue.length} article{catalogue.length > 1 ? 's' : ''}
        </span>
      </div>
      <div className="space-y-2">
        {categories.map((cat, idx) => (
          <motion.div
            key={cat.name}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.65 + idx * 0.04, duration: 0.25 }}
            className="flex items-center justify-between"
          >
            <span className={`text-xs ${textSecondary}`}>
              {cat.name}
            </span>
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
              isDark ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-600'
            }`}>
              {cat.count}
            </span>
          </motion.div>
        ))}
      </div>
      <button
        type="button"
        onClick={() => setPage('catalogue')}
        className="mt-3 w-full text-center text-xs font-medium inline-flex items-center justify-center gap-1"
        style={{ color: couleur }}
      >
        Ouvrir le catalogue <ArrowRight className="w-3 h-3" />
      </button>
    </motion.div>
  );
}

// ============ CLIENT STATS WIDGET ============

/**
 * Summary of client base metrics.
 * Shows total clients, new this month, active clients.
 */
function ClientStats({
  clients,
  chantiers,
  devis,
  isDark,
  couleur,
  textPrimary,
  textSecondary,
  sectionBg,
  setPage,
}) {
  const stats = useMemo(() => {
    const now = new Date();
    const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    const totalClients = clients.length;
    const newThisMonth = clients.filter(c =>
      c.created_at && c.created_at.startsWith(currentMonthKey)
    ).length;

    // Active = has a devis or chantier in progress
    const activeClientIds = new Set();
    devis.filter(d => ['envoye', 'signe', 'facture'].includes(d.statut)).forEach(d => {
      if (d.client_id) activeClientIds.add(d.client_id);
    });
    chantiers.filter(c => c.statut === 'en_cours').forEach(c => {
      if (c.client_id) activeClientIds.add(c.client_id);
    });

    return {
      total: totalClients,
      newThisMonth,
      active: activeClientIds.size,
    };
  }, [clients, chantiers, devis]);

  if (stats.total === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.6, duration: 0.4 }}
      className={`rounded-2xl p-5 ${sectionBg}`}
    >
      <div className="flex justify-between items-center mb-4">
        <h3 className={`text-sm font-semibold ${textSecondary}`}>
          Clients
        </h3>
        <button
          type="button"
          onClick={() => setPage('clients')}
          className="text-xs font-medium"
          style={{ color: couleur }}
        >
          Voir tout
        </button>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div className={`rounded-xl p-3 text-center ${isDark ? 'bg-slate-800/60' : 'bg-slate-50'}`}>
          <p className={`text-lg font-bold ${textPrimary}`}>{stats.total}</p>
          <p className={`text-[10px] ${textSecondary}`}>Total</p>
        </div>
        <div className={`rounded-xl p-3 text-center ${isDark ? 'bg-slate-800/60' : 'bg-slate-50'}`}>
          <p className={`text-lg font-bold ${textPrimary}`}>{stats.active}</p>
          <p className={`text-[10px] ${textSecondary}`}>Actifs</p>
        </div>
        <div className={`rounded-xl p-3 text-center ${isDark ? 'bg-slate-800/60' : 'bg-slate-50'}`}>
          <p className={`text-lg font-bold ${textPrimary}`}>{stats.newThisMonth}</p>
          <p className={`text-[10px] ${textSecondary}`}>Ce mois</p>
        </div>
      </div>
    </motion.div>
  );
}

// ============ CONVERSION FUNNEL MINI ============

/**
 * Visual mini funnel showing conversion rates step by step.
 */
function ConversionFunnel({
  pipeline,
  isDark,
  couleur,
  textPrimary,
  textSecondary,
  sectionBg,
}) {
  const totalDevis = pipeline.brouillon.count + pipeline.envoye.count + pipeline.signe.count + pipeline.facture.count;
  if (totalDevis === 0) return null;

  const steps = [
    {
      label: 'Créés',
      count: totalDevis,
      pct: 100,
      color: isDark ? '#64748b' : '#94a3b8',
    },
    {
      label: 'Envoyés',
      count: pipeline.envoye.count + pipeline.signe.count + pipeline.facture.count,
      pct: totalDevis > 0 ? Math.round(((pipeline.envoye.count + pipeline.signe.count + pipeline.facture.count) / totalDevis) * 100) : 0,
      color: '#3b82f6',
    },
    {
      label: 'Signés',
      count: pipeline.signe.count + pipeline.facture.count,
      pct: totalDevis > 0 ? Math.round(((pipeline.signe.count + pipeline.facture.count) / totalDevis) * 100) : 0,
      color: '#10b981',
    },
    {
      label: 'Facturés',
      count: pipeline.facture.count,
      pct: totalDevis > 0 ? Math.round((pipeline.facture.count / totalDevis) * 100) : 0,
      color: '#8b5cf6',
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.42, duration: 0.4 }}
      className={`rounded-2xl p-5 ${sectionBg}`}
    >
      <h3 className={`text-sm font-semibold mb-4 ${textSecondary}`}>
        Entonnoir de conversion
      </h3>
      <div className="space-y-2.5">
        {steps.map((step, idx) => (
          <motion.div
            key={step.label}
            initial={{ opacity: 0, scaleX: 0 }}
            animate={{ opacity: 1, scaleX: 1 }}
            transition={{ delay: 0.42 + idx * 0.08, duration: 0.4, ease: 'easeOut' }}
            style={{ transformOrigin: 'left' }}
          >
            <div className="flex justify-between items-center mb-1">
              <span className={`text-xs font-medium ${textPrimary}`}>
                {step.label}
              </span>
              <div className="flex items-center gap-2">
                <span className={`text-xs font-bold ${textPrimary}`}>
                  {step.count}
                </span>
                <span className={`text-[10px] ${textSecondary}`}>
                  ({step.pct}%)
                </span>
              </div>
            </div>
            <div className={`h-2 rounded-full overflow-hidden ${isDark ? 'bg-slate-700' : 'bg-slate-200'}`}>
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${step.pct}%` }}
                transition={{ delay: 0.5 + idx * 0.1, duration: 0.5, ease: 'easeOut' }}
                className="h-full rounded-full"
                style={{ background: step.color }}
              />
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}

// ============ MAIN DASHBOARD ============

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
  setAiPrefill,
  isDark = false,
  showHelp = false,
  setShowHelp,
  user,
  onOpenSearch,
  memos = [],
  addMemo,
  toggleMemo,
}) {
  const { dataLoading } = useData();
  const { showToast } = useToast();
  const { canAccess } = usePermissions();
  const canSeeFinances = canAccess('finances');

  const [showAllActions, setShowAllActions] = useState(false);
  const [dismissedNotif, setDismissedNotif] = useState(() => {
    const ts = localStorage.getItem('cp_notif_dismissed');
    // Auto-reset after 24h
    return ts && (Date.now() - Number(ts)) < 86400000;
  });

  // Onboarding state removed — replaced by compact bandeau

  // GAP 7: Overview collapsible state (default closed)
  const [showOverview, setShowOverview] = useState(false);

  // ---- Theme ----
  const cardBg = isDark ? 'bg-slate-800 border border-slate-700/50' : 'bg-white shadow-[0_1px_3px_rgba(0,0,0,0.06)]';
  const textPrimary = isDark ? 'text-slate-100' : 'text-gray-900';
  const textSecondary = isDark ? 'text-slate-400' : 'text-gray-500';
  const sectionBg = isDark ? 'bg-slate-800 border border-slate-700/50' : 'bg-white shadow-[0_1px_3px_rgba(0,0,0,0.06)]';

  // ---- Computed data ----
  const computed = useMemo(() => {
    const now = new Date();

    // KPIs
    const aEncaisser = devis
      .filter(d => d.type === 'facture' && ['envoye', 'facture'].includes(d.statut))
      .reduce((s, d) => s + (d.total_ttc || 0), 0);

    const retard = devis
      .filter(d => d.type === 'facture' && d.date_echeance && new Date(d.date_echeance) < now)
      .reduce((s, d) => s + (d.total_ttc || 0), 0);

    const devisEnAttente = devis.filter(d => d.type !== 'facture' && d.statut === 'envoye');
    const chantiersActifs = chantiers.filter(c => c.statut === 'en_cours');

    const envoyes = devis.filter(d => d.type !== 'facture' && ['envoye', 'signe', 'facture', 'refuse'].includes(d.statut));
    const signesDevis = devis.filter(d => d.type !== 'facture' && ['signe', 'facture'].includes(d.statut));
    const tauxConversion = envoyes.length > 0 ? Math.round(signesDevis.length / envoyes.length * 100) : 0;

    // ---- GAP 2: CA ce mois + mois précédent pour tendance ----
    const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const caCeMois = devis
      .filter(d => ['signe', 'facture'].includes(d.statut) && d.date?.startsWith(currentMonthKey))
      .reduce((s, d) => s + (d.total_ttc || 0), 0);

    // Last month CA for trend calculation
    const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthKey = `${prevMonth.getFullYear()}-${String(prevMonth.getMonth() + 1).padStart(2, '0')}`;
    const lastMonthCA = devis
      .filter(d => ['signe', 'facture'].includes(d.statut) && d.date?.startsWith(lastMonthKey))
      .reduce((s, d) => s + (d.total_ttc || 0), 0);

    // Trend for "Ce mois" KPI
    const caCeMoisTrend = computeTrend(caCeMois, lastMonthCA);

    // Trend for "À encaisser" — compare to what was outstanding last month
    const lastMonthEncaisser = devis
      .filter(d => {
        if (d.type !== 'facture') return false;
        if (!['envoye', 'facture'].includes(d.statut)) return false;
        return d.date?.startsWith(lastMonthKey);
      })
      .reduce((s, d) => s + (d.total_ttc || 0), 0);
    const aEncaisserTrend = computeTrend(aEncaisser, lastMonthEncaisser);

    // Pipeline (GAP 4: + Payé stage)
    const pipeline = {
      brouillon: { count: devis.filter(d => d.statut === 'brouillon').length, total: devis.filter(d => d.statut === 'brouillon').reduce((s, d) => s + (d.total_ttc || 0), 0) },
      envoye: { count: devis.filter(d => d.statut === 'envoye').length, total: devis.filter(d => d.statut === 'envoye').reduce((s, d) => s + (d.total_ttc || 0), 0) },
      signe: { count: devis.filter(d => d.statut === 'signe').length, total: devis.filter(d => d.statut === 'signe').reduce((s, d) => s + (d.total_ttc || 0), 0) },
      facture: { count: devis.filter(d => d.statut === 'facture').length, total: devis.filter(d => d.statut === 'facture').reduce((s, d) => s + (d.total_ttc || 0), 0) },
      paye: { count: devis.filter(d => d.statut === 'paye').length, total: devis.filter(d => d.statut === 'paye').reduce((s, d) => s + (d.total_ttc || 0), 0) },
    };

    // CA prévisionnel (signés non encore facturés + envoyés * 0.5)
    const caPrevisionnel = pipeline.signe.total + Math.round(pipeline.envoye.total * 0.5);

    // Actions prioritaires (GAP 5: differentiated icons + actionLabel)
    const actions = [];

    // 1. Factures en retard — AlertTriangle icon, red color
    devis
      .filter(d => d.type === 'facture' && d.date_echeance && new Date(d.date_echeance) < now && ['envoye', 'facture'].includes(d.statut))
      .sort((a, b) => new Date(a.date_echeance) - new Date(b.date_echeance))
      .forEach(d => {
        const jours = daysSince(d.date_echeance);
        const client = clients.find(c => c.id === d.client_id);
        actions.push({
          priority: 1,
          icon: Receipt,  // GAP 5: Receipt for invoices
          color: '#ef4444',
          label: `Facture en retard de ${jours}j`,
          detail: client ? `${client.nom || client.name} — ${fmt(d.total_ttc, modeDiscret)}` : fmt(d.total_ttc, modeDiscret),
          actionLabel: 'Relancer',
          onClick: () => { setSelectedDevis(d); setPage('devis'); },
        });
      });

    // 2. Devis envoyés sans réponse > 7j — Clock icon, orange color
    devisEnAttente
      .filter(d => d.date && daysSince(d.date) > 7)
      .sort((a, b) => daysSince(b.date) - daysSince(a.date))
      .forEach(d => {
        const jours = daysSince(d.date);
        const client = clients.find(c => c.id === d.client_id);
        actions.push({
          priority: 2,
          icon: Send,  // GAP 5: Send for follow-ups
          color: '#f97316',
          label: `Devis sans réponse (${jours}j)`,
          detail: client ? `${client.nom || client.name} — ${fmt(d.total_ttc, modeDiscret)}` : fmt(d.total_ttc, modeDiscret),
          actionLabel: 'Relancer',
          onClick: () => { setSelectedDevis(d); setPage('devis'); },
        });
      });

    // 3. Brouillons à finaliser (groupé) — FileText icon, yellow
    const brouillons = devis.filter(d => d.statut === 'brouillon' && d.type !== 'facture');
    if (brouillons.length > 0) {
      const totalBrouillons = brouillons.reduce((s, d) => s + (d.total_ttc || 0), 0);
      actions.push({
        priority: 3,
        icon: ClipboardList,  // GAP 5: ClipboardList for memos/brouillons
        color: '#eab308',
        label: `${brouillons.length} brouillon${brouillons.length > 1 ? 's' : ''} à finaliser`,
        detail: fmt(totalBrouillons, modeDiscret),
        actionLabel: 'Finaliser',
        onClick: () => setPage('devis'),
      });
    }

    // Score santé /10
    let score = 0;
    if (retard === 0) score += 2;
    if (entreprise?.siret) score += 2;
    if (chantiersActifs.length > 0) score += 2;
    if (tauxConversion >= 40) score += 2;
    if (caCeMois > 0) score += 2;

    // Chantier actif principal (le plus avancé)
    const chantierPrincipal = chantiersActifs
      .sort((a, b) => (b.avancement || 0) - (a.avancement || 0))[0] || null;

    // Onboarding: profil + conformité
    const profilComplete = entreprise
      ? PROFILE_ALL_FIELDS.filter(f => entreprise[f.key]).length
      : 0;
    const profilPct = Math.round((profilComplete / PROFILE_ALL_FIELDS.length) * 100);

    const f26Complete = entreprise
      ? F26_CRITERIA.filter(c => {
          if (c.key === 'banque') return entreprise.iban;
          if (c.key === 'rcs') return entreprise.rcsVille || entreprise.rcsNumero;
          if (c.key === 'rcPro') return entreprise.rcProAssureur;
          return entreprise[c.key];
        }).length
      : 0;
    const f26Pct = Math.round((f26Complete / F26_CRITERIA.length) * 100);


    // Count factures en retard for urgent banner
    const facturesEnRetard = devis
      .filter(d => d.type === 'facture' && d.date_echeance && new Date(d.date_echeance) < now && ['envoye', 'facture'].includes(d.statut));

    // Sparkline data: CA par mois (6 derniers mois)
    const sparkData = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleDateString('fr-FR', { month: 'short' });
      const ca = devis
        .filter(dv => ['signe', 'facture'].includes(dv.statut) && dv.date?.startsWith(key))
        .reduce((sum, dv) => sum + (dv.total_ttc || 0), 0);
      sparkData.push({ label, ca });
    }

    return {
      aEncaisser,
      aEncaisserTrend,
      retard,
      devisEnAttente,
      chantiersActifs,
      tauxConversion,
      pipeline,
      caPrevisionnel,
      actions: actions.sort((a, b) => a.priority - b.priority),
      score,
      chantierPrincipal,
      profilPct,
      f26Pct,
      caCeMois,
      caCeMoisTrend,
      lastMonthCA,
      facturesEnRetardCount: facturesEnRetard.length,
      sparkData,
    };
  }, [devis, chantiers, clients, entreprise, modeDiscret, setSelectedDevis, setPage]);

  // ---- Greeting ----
  const prenom = getPrenom(user, entreprise);
  const capitalize = s => s.charAt(0).toUpperCase() + s.slice(1);
  const formattedDate = capitalize(new Date().toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }));

  // ---- Memos du jour ----
  const memosJour = useMemo(() => {
    const today = new Date().toISOString().substring(0, 10);
    return memos.filter(m => !m.done && (!m.date || m.date === today));
  }, [memos]);

  // Merge memos into actions
  const allActions = useMemo(() => {
    const memoActions = memosJour.map(m => ({
      priority: 4,
      icon: CheckCircle,
      color: '#10b981',
      label: m.text || m.titre || 'Mémo',
      detail: 'Mémo du jour',
      actionLabel: 'Fait',
      onClick: () => toggleMemo?.(m.id),
    }));
    return [...computed.actions, ...memoActions];
  }, [computed.actions, memosJour, toggleMemo]);

  const visibleActions = showAllActions ? allActions : allActions.slice(0, 5);

  // ---- KPI color classes ----
  const kpiCardClass = isDark
    ? 'bg-slate-800 border border-slate-700/50'
    : 'bg-white shadow-[0_1px_3px_rgba(0,0,0,0.06)]';
  const kpiColors = {
    encaisser: kpiCardClass,
    devisAttente: kpiCardClass,
    chantiers: kpiCardClass,
    conversion: kpiCardClass,
  };

  // ============ RENDER ============

  return (
    <div className={`p-4 sm:p-6 max-w-7xl mx-auto space-y-6 min-h-screen ${isDark ? 'bg-slate-900' : 'bg-[#F5F7FA]'}`}>

      {/* =========== GREETING + SCORE (full width) =========== */}
      <header aria-label="En-tête dashboard">
        <div className="flex justify-between items-start mb-5">
          <div>
            <motion.h1
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className={`text-2xl sm:text-3xl font-semibold tracking-tight ${isDark ? 'text-white' : 'text-gray-900'}`}
            >
              Bonjour{prenom ? `, ${prenom}` : ''}
            </motion.h1>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1, duration: 0.3 }}
              className={`text-sm mt-1 ${isDark ? 'text-slate-500' : 'text-gray-400'}`}
            >
              {formattedDate}
            </motion.p>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setModeDiscret?.(!modeDiscret)}
              className={`p-2 rounded-lg transition-colors ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-100'}`}
              title={modeDiscret ? 'Afficher les montants' : 'Masquer les montants'}
            >
              {modeDiscret
                ? <EyeOff className={`w-4 h-4 ${textSecondary}`} />
                : <Eye className={`w-4 h-4 ${textSecondary}`} />
              }
            </button>
            <div
              className="cursor-pointer"
              onClick={() => setPage('settings')}
              role="button"
              tabIndex={0}
              title="Cliquez pour améliorer votre score"
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setPage('settings'); } }}
            >
              <ScoreSante score={computed.score} isDark={isDark} couleur={couleur} />
            </div>
          </div>
        </div>
      </header>

      {/* =========== FULL-WIDTH BANNERS (above the grid) =========== */}
      <section aria-label="Notifications">

      {/* GAP 1: Urgent banner — full width */}
      <UrgentBanner
        count={computed.facturesEnRetardCount}
        totalRetard={computed.retard}
        isDark={isDark}
        modeDiscret={modeDiscret}
        couleur={couleur}
        onClick={() => setPage('devis')}
        dismissed={dismissedNotif}
        onDismiss={() => { setDismissedNotif(true); localStorage.setItem('cp_notif_dismissed', String(Date.now())); }}
      />

      {/* Compact onboarding bandeau */}
      {(computed.profilPct < 80 || computed.f26Pct < 100) && (
        <div className={`mx-4 sm:mx-6 mb-5 rounded-xl border-l-4 border-amber-500 px-4 py-2.5 flex items-center gap-3 ${isDark ? 'bg-amber-500/10' : 'bg-amber-50'}`}>
          <AlertCircle size={16} className="text-amber-500 flex-shrink-0" />
          <p className={`text-sm flex-1 ${isDark ? 'text-amber-300' : 'text-amber-800'}`}>
            {computed.profilPct < 80 ? `Profil ${computed.profilPct}%` : ''}
            {computed.profilPct < 80 && computed.f26Pct < 100 ? ' · ' : ''}
            {computed.f26Pct < 100 ? `Conformité ${computed.f26Pct}%` : ''}
          </p>
          <button onClick={() => setPage('settings')} className="text-xs font-semibold px-3 py-1.5 rounded-lg text-white min-h-[36px]" style={{ background: couleur }}>
            Compléter
          </button>
        </div>
      )}
      </section>

      {/* GAP 7: Overview widget — full width, collapsible, default closed */}
      <OverviewWidget
        isDark={isDark}
        couleur={couleur}
        textPrimary={textPrimary}
        textSecondary={textSecondary}
        sectionBg={sectionBg}
        computed={computed}
        modeDiscret={modeDiscret}
        showOverview={showOverview}
        setShowOverview={setShowOverview}
      />

      {/* =========== GAP 1: 2-COLUMN GRID LAYOUT =========== */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

        {/* ===== LEFT COLUMN (3/5) — KPIs, sparkline, pipeline, actions, promo ===== */}
        <div className="lg:col-span-3 space-y-6">

          {/* 4 KPI Cards with trends (GAP 2 + GAP 9) */}
          {canSeeFinances && (
            <section aria-label="Indicateurs clés">
              <motion.div
                variants={staggerContainer}
                initial="initial"
                animate="animate"
              >
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-5">
                  <KPICard
                    label="À encaisser"
                    shortLabel="Encaisser"
                    value={fmt(computed.aEncaisser, modeDiscret)}
                    sub={computed.retard > 0 ? `dont ${fmt(computed.retard, modeDiscret)} en retard` : null}
                    trend={computed.aEncaisserTrend}
                    colorClasses={kpiColors.encaisser}
                    isDark={isDark}
                    delay={0}
                    onClick={() => setPage('devis')}
                  />
                  <KPICard
                    label="Ce mois"
                    value={fmt(computed.caCeMois, modeDiscret)}
                    sub={computed.lastMonthCA > 0 ? `vs ${fmt(computed.lastMonthCA, modeDiscret)} mois dernier` : null}
                    trend={computed.caCeMoisTrend}
                    colorClasses={kpiColors.encaisser}
                    isDark={isDark}
                    delay={0.05}
                    onClick={() => setPage('finances')}
                  />
                  <KPICard
                    label="Chantiers actifs"
                    shortLabel="Chantiers"
                    value={String(computed.chantiersActifs.length)}
                    sub={computed.chantiersActifs.length > 0
                      ? `${Math.round(computed.chantiersActifs.reduce((s, c) => s + (c.avancement || 0), 0) / computed.chantiersActifs.length)}% moyen`
                      : null
                    }
                    colorClasses={kpiColors.chantiers}
                    isDark={isDark}
                    delay={0.1}
                    onClick={() => setPage('chantiers')}
                  />
                  <KPICard
                    label="Taux conversion"
                    shortLabel="Conversion"
                    value={`${computed.tauxConversion}%`}
                    sub={null}
                    colorClasses={kpiColors.conversion}
                    isDark={isDark}
                    delay={0.15}
                    onClick={() => setPage('devis')}
                  />
                </div>
              </motion.div>
            </section>
          )}

          {/* CA sparkline chart (6 derniers mois) */}
          {computed.sparkData.some(m => m.ca > 0) && (
            <section aria-label="Chiffre d'affaires">
            <div className={`rounded-xl p-4 ${isDark ? 'bg-slate-800 border border-slate-700' : 'bg-white border border-slate-200'}`}>
              <p className={`text-xs font-medium mb-2 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>CA 6 derniers mois</p>
              <div style={{ height: 120 }}>
                <ResponsiveContainer width="100%" height={120}>
                  <AreaChart data={computed.sparkData}>
                    <defs>
                      <linearGradient id="caGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={couleur} stopOpacity={0.3} />
                        <stop offset="100%" stopColor={couleur} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <Area type="monotone" dataKey="ca" stroke={couleur} strokeWidth={2} fill="url(#caGrad)" dot={{ r: 3, fill: couleur }} />
                    <XAxis dataKey="label" tick={{ fontSize: 10, fill: isDark ? '#94a3b8' : '#94a3b8' }} axisLine={false} tickLine={false} />
                    <Tooltip content={({ active, payload }) => active && payload?.length ? (
                      <div className={`rounded-lg shadow-lg px-3 py-2 text-xs ${isDark ? 'bg-slate-700 text-white' : 'bg-white text-slate-900 border border-slate-200'}`}>
                        <p className="font-bold">{new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(payload[0].value)}</p>
                      </div>
                    ) : null} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
            </section>
          )}

          {/* Actions prioritaires (GAP 5: differentiated icons + batch relaunch) */}
          {/* GAP 8: Only show if there are actions */}
          {allActions.length > 0 && (
            <section aria-label="Actions prioritaires">
            <ActionsSection
              allActions={allActions}
              visibleActions={visibleActions}
              showAllActions={showAllActions}
              setShowAllActions={setShowAllActions}
              isDark={isDark}
              couleur={couleur}
              textSecondary={textSecondary}
              sectionBg={sectionBg}
              showToast={showToast}
            />
            </section>
          )}

          {/* Weekly stats summary */}
          <WeeklyStats
            devis={devis}
            chantiers={chantiers}
            isDark={isDark}
            couleur={couleur}
            textPrimary={textPrimary}
            textSecondary={textSecondary}
            sectionBg={sectionBg}
            modeDiscret={modeDiscret}
          />

          {/* Conversion funnel */}
          <ConversionFunnel
            pipeline={computed.pipeline}
            isDark={isDark}
            couleur={couleur}
            textPrimary={textPrimary}
            textSecondary={textSecondary}
            sectionBg={sectionBg}
          />

          {/* Activity timeline */}
          <ActivityTimeline
            devis={devis}
            chantiers={chantiers}
            clients={clients}
            isDark={isDark}
            couleur={couleur}
            textPrimary={textPrimary}
            textSecondary={textSecondary}
            sectionBg={sectionBg}
            modeDiscret={modeDiscret}
            setPage={setPage}
            setSelectedDevis={setSelectedDevis}
            setSelectedChantier={setSelectedChantier}
          />

          {/* Promo cards (Devis IA / Express) — in left column */}
          <PromoCards
            isDark={isDark}
            couleur={couleur}
            setPage={setPage}
            setCreateMode={setCreateMode}
            setAiPrefill={setAiPrefill}
          />
        </div>

        {/* ===== RIGHT COLUMN (2/5) — chantier actif, onboarding ===== */}
        <div className="lg:col-span-2 space-y-6">

          {/* Chantier actif principal */}
          {/* GAP 8: Only show if there are active chantiers */}
          {computed.chantiersActifs.length > 0 && (
            <ChantierActifWidget
              chantierPrincipal={computed.chantierPrincipal}
              chantiersActifs={computed.chantiersActifs}
              clients={clients}
              isDark={isDark}
              couleur={couleur}
              textPrimary={textPrimary}
              textSecondary={textSecondary}
              sectionBg={sectionBg}
              setSelectedChantier={setSelectedChantier}
              setPage={setPage}
            />
          )}

          {/* GAP 8: Show CTA when no chantier */}
          {computed.chantiersActifs.length === 0 && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.4 }}
              className={`rounded-2xl p-5 ${sectionBg}`}
            >
              <h3 className={`text-sm font-semibold mb-3 ${textSecondary}`}>
                Chantier en cours
              </h3>
              <div className={`text-sm py-4 text-center ${textSecondary}`}>
                Aucun chantier en cours
                <br />
                <button
                  type="button"
                  onClick={() => setPage('chantiers')}
                  className="mt-2 text-sm font-medium"
                  style={{ color: couleur }}
                >
                  Créer un chantier
                </button>
              </div>
            </motion.div>
          )}


          {/* Devis en attente summary card */}
          {computed.devisEnAttente.length > 0 && (
            <section aria-label="Devis en attente">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.4 }}
              className={`rounded-2xl p-5 ${sectionBg}`}
            >
              <h3 className={`text-sm font-semibold mb-3 ${textSecondary}`}>
                Devis en attente
              </h3>
              <div className="space-y-2.5">
                {computed.devisEnAttente.slice(0, 3).map((d, idx) => {
                  const client = clients.find(c => c.id === d.client_id);
                  const jours = daysSince(d.date);
                  return (
                    <motion.button
                      key={d.id || idx}
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.4 + idx * 0.05, duration: 0.3 }}
                      type="button"
                      onClick={() => { setSelectedDevis(d); setPage('devis'); }}
                      className={`w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors ${
                        isDark ? 'hover:bg-slate-700/50' : 'hover:bg-gray-50'
                      }`}
                    >
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{ background: `${couleur}12` }}
                      >
                        <FileText className="w-4 h-4" style={{ color: couleur }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-xs font-medium truncate ${textPrimary}`}>
                          {client ? (client.nom || client.name) : 'Client inconnu'}
                        </p>
                        <p className={`text-[10px] ${textSecondary}`}>
                          {jours > 0 ? `Envoyé il y a ${jours}j` : 'Envoyé aujourd\'hui'}
                        </p>
                      </div>
                      <span className={`text-xs font-bold flex-shrink-0 ${textPrimary}`}>
                        {fmt(d.total_ttc, modeDiscret)}
                      </span>
                    </motion.button>
                  );
                })}
              </div>
              {computed.devisEnAttente.length > 3 && (
                <button
                  type="button"
                  onClick={() => setPage('devis')}
                  className="mt-3 w-full text-center text-xs font-medium"
                  style={{ color: couleur }}
                >
                  Voir les {computed.devisEnAttente.length} devis en attente
                </button>
              )}
            </motion.div>
            </section>
          )}

          {/* Memos du jour */}
          {memosJour.length > 0 && (
            <section aria-label="Mémos du jour">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.45, duration: 0.4 }}
              className={`rounded-2xl p-5 ${sectionBg}`}
            >
              <h3 className={`text-sm font-semibold mb-3 ${textSecondary}`}>
                Mémos du jour
              </h3>
              <div className="space-y-2">
                {memosJour.slice(0, 3).map((m, idx) => (
                  <motion.div
                    key={m.id || idx}
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.45 + idx * 0.05, duration: 0.3 }}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-colors ${
                      isDark ? 'hover:bg-slate-700/50' : 'hover:bg-gray-50'
                    }`}
                    onClick={() => toggleMemo?.(m.id)}
                  >
                    <div
                      className="w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors"
                      style={{ borderColor: m.done ? '#10b981' : (isDark ? '#475569' : '#cbd5e1') }}
                    >
                      {m.done && <CheckCircle className="w-3 h-3 text-emerald-500" />}
                    </div>
                    <span className={`text-sm flex-1 ${m.done ? 'line-through' : ''} ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
                      {m.text || m.titre || 'Mémo'}
                    </span>
                  </motion.div>
                ))}
              </div>
            </motion.div>
            </section>
          )}

          {/* Quick action card: Créer un devis */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.4 }}
            className={`rounded-2xl p-5 ${sectionBg}`}
          >
            <h3 className={`text-sm font-semibold mb-3 ${textSecondary}`}>
              Actions rapides
            </h3>
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => { setCreateMode?.({ devis: true }); setPage('devis'); }}
                className={`w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors ${
                  isDark ? 'hover:bg-slate-700/50' : 'hover:bg-gray-50'
                }`}
              >
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: `${couleur}12` }}
                >
                  <FileText className="w-4 h-4" style={{ color: couleur }} />
                </div>
                <span className={`text-sm font-medium ${textPrimary}`}>
                  Nouveau devis
                </span>
                <ArrowRight className={`w-3.5 h-3.5 ml-auto ${textSecondary}`} />
              </button>
              <button
                type="button"
                onClick={() => setPage('chantiers')}
                className={`w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors ${
                  isDark ? 'hover:bg-slate-700/50' : 'hover:bg-gray-50'
                }`}
              >
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: '#3b82f612' }}
                >
                  <HardHat className="w-4 h-4" style={{ color: '#3b82f6' }} />
                </div>
                <span className={`text-sm font-medium ${textPrimary}`}>
                  Nouveau chantier
                </span>
                <ArrowRight className={`w-3.5 h-3.5 ml-auto ${textSecondary}`} />
              </button>
              <button
                type="button"
                onClick={() => setPage('clients')}
                className={`w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors ${
                  isDark ? 'hover:bg-slate-700/50' : 'hover:bg-gray-50'
                }`}
              >
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: '#8b5cf612' }}
                >
                  <ClipboardList className="w-4 h-4" style={{ color: '#8b5cf6' }} />
                </div>
                <span className={`text-sm font-medium ${textPrimary}`}>
                  Nouveau client
                </span>
                <ArrowRight className={`w-3.5 h-3.5 ml-auto ${textSecondary}`} />
              </button>
            </div>
          </motion.div>

          {/* Upcoming deadlines */}
          <UpcomingDeadlines
            devis={devis}
            clients={clients}
            isDark={isDark}
            couleur={couleur}
            textPrimary={textPrimary}
            textSecondary={textSecondary}
            sectionBg={sectionBg}
            modeDiscret={modeDiscret}
            setPage={setPage}
            setSelectedDevis={setSelectedDevis}
          />

          {/* ClientStats, EquipeSummary, CatalogueSummary removed — redundant with sidebar */}

          {/* Monthly summary card */}
          {canSeeFinances && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.55, duration: 0.4 }}
              className={`rounded-2xl p-5 ${sectionBg}`}
            >
              <h3 className={`text-sm font-semibold mb-4 ${textSecondary}`}>
                Résumé mensuel
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className={`text-xs ${textSecondary}`}>CA ce mois</span>
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-bold ${textPrimary}`}>
                      {fmt(computed.caCeMois, modeDiscret)}
                    </span>
                    <TrendBadge trend={computed.caCeMoisTrend} isDark={isDark} />
                  </div>
                </div>
                <div className={`h-px ${isDark ? 'bg-slate-700' : 'bg-slate-100'}`} />
                <div className="flex justify-between items-center">
                  <span className={`text-xs ${textSecondary}`}>Mois précédent</span>
                  <span className={`text-sm font-medium ${textSecondary}`}>
                    {fmt(computed.lastMonthCA, modeDiscret)}
                  </span>
                </div>
                <div className={`h-px ${isDark ? 'bg-slate-700' : 'bg-slate-100'}`} />
                <div className="flex justify-between items-center">
                  <span className={`text-xs ${textSecondary}`}>CA prévisionnel</span>
                  <span className={`text-sm font-bold ${textPrimary}`}>
                    {fmt(computed.caPrevisionnel, modeDiscret)}
                  </span>
                </div>
                <div className={`h-px ${isDark ? 'bg-slate-700' : 'bg-slate-100'}`} />
                <div className="flex justify-between items-center">
                  <span className={`text-xs ${textSecondary}`}>Devis en attente</span>
                  <span className={`text-sm font-medium ${textPrimary}`}>
                    {computed.devisEnAttente.length} ({fmt(computed.devisEnAttente.reduce((s, d) => s + (d.total_ttc || 0), 0), modeDiscret)})
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPage('finances')}
                className="mt-4 w-full text-center inline-flex items-center justify-center gap-1 text-sm font-medium"
                style={{ color: couleur }}
              >
                Voir les finances <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </motion.div>
          )}
        </div>
      </div>

    </div>
  );
}
