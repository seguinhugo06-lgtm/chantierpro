/**
 * Dashboard — Focus & Pulse
 *
 * 3-zone layout:
 * 1. Hero Pulse — greeting, score santé, 4 KPI cards, sparkline CA
 * 2. Actions Prioritaires — unified priority list
 * 3. Contexte — active chantier + pipeline funnel + onboarding bar
 *
 * @module Dashboard
 */

import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { AreaChart, Area, ResponsiveContainer } from 'recharts';
import {
  FileText,
  HardHat,
  AlertTriangle,
  Clock,
  ChevronRight,
  Eye,
  EyeOff,
  ArrowRight,
  Receipt,
  Send,
  ClipboardList,
  CheckCircle,
} from 'lucide-react';

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

// ============ HELPERS ============

function fmt(amount, discret = false) {
  if (discret) return '\u2022\u2022\u2022\u2022\u2022';
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(amount || 0);
}

function daysSince(date) {
  if (!date) return 0;
  const d = date instanceof Date ? date : new Date(date);
  return Math.floor((new Date() - d) / (1000 * 60 * 60 * 24));
}

function getPrenom(user) {
  if (!user) return '';
  const meta = user.user_metadata || {};
  if (meta.prenom) return meta.prenom;
  if (meta.full_name) return meta.full_name.split(' ')[0];
  if (meta.name) return meta.name.split(' ')[0];
  return (user.email || '').split('@')[0];
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

// ============ KPI CARD ============

function KPICard({ label, value, sub, colorClasses, isDark, delay = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4 }}
      className={`rounded-2xl p-4 sm:p-5 ${colorClasses}`}
    >
      <p className={`text-sm font-medium ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
        {label}
      </p>
      <p className={`text-2xl font-bold mt-1 ${isDark ? 'text-slate-100' : 'text-gray-900'}`}>
        {value}
      </p>
      {sub && (
        <p className={`text-xs mt-1.5 ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
          {sub}
        </p>
      )}
    </motion.div>
  );
}

// ============ ACTION ITEM ============

function ActionItem({ icon: Icon, color, label, detail, onClick, isDark }) {
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
      <ChevronRight className={`w-4 h-4 flex-shrink-0 ${isDark ? 'text-slate-600' : 'text-gray-300'}`} />
    </button>
  );
}

// ============ PIPELINE BAR ============

function PipelineBar({ pipeline, isDark, modeDiscret }) {
  const total = pipeline.brouillon.count + pipeline.envoye.count + pipeline.signe.count + pipeline.facture.count;
  if (total === 0) return null;

  const pct = (count) => Math.max(count / total * 100, count > 0 ? 4 : 0);
  const segments = [
    { key: 'brouillon', label: 'Brouillons', bg: isDark ? 'bg-gray-600' : 'bg-gray-300', ...pipeline.brouillon },
    { key: 'envoye', label: 'Envoyés', bg: 'bg-blue-500', ...pipeline.envoye },
    { key: 'signe', label: 'Signés', bg: 'bg-emerald-500', ...pipeline.signe },
    { key: 'facture', label: 'Facturés', bg: 'bg-violet-500', ...pipeline.facture },
  ].filter(s => s.count > 0);

  return (
    <div>
      <div className="flex h-5 rounded-full overflow-hidden mb-2">
        {segments.map(s => (
          <div
            key={s.key}
            className={`${s.bg} transition-all`}
            style={{ width: `${pct(s.count)}%` }}
            title={`${s.label}: ${s.count}`}
          />
        ))}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1">
        {segments.map(s => (
          <div key={s.key} className="flex items-center gap-1.5">
            <div className={`w-2 h-2 rounded-full ${s.bg}`} />
            <span className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              {s.label} {s.count} ({fmt(s.total, modeDiscret)})
            </span>
          </div>
        ))}
      </div>
    </div>
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

    // Sparkline CA 6 mois
    const caParMois = {};
    devis.filter(d => ['signe', 'facture'].includes(d.statut)).forEach(d => {
      const mois = d.date?.substring(0, 7);
      if (mois) caParMois[mois] = (caParMois[mois] || 0) + (d.total_ttc || 0);
    });
    const sparkData = Array.from({ length: 6 }, (_, i) => {
      const dt = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1);
      const key = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`;
      return { mois: dt.toLocaleDateString('fr-FR', { month: 'short' }), ca: caParMois[key] || 0 };
    });

    // Pipeline
    const pipeline = {
      brouillon: { count: devis.filter(d => d.statut === 'brouillon').length, total: devis.filter(d => d.statut === 'brouillon').reduce((s, d) => s + (d.total_ttc || 0), 0) },
      envoye: { count: devis.filter(d => d.statut === 'envoye').length, total: devis.filter(d => d.statut === 'envoye').reduce((s, d) => s + (d.total_ttc || 0), 0) },
      signe: { count: devis.filter(d => d.statut === 'signe').length, total: devis.filter(d => d.statut === 'signe').reduce((s, d) => s + (d.total_ttc || 0), 0) },
      facture: { count: devis.filter(d => d.statut === 'facture').length, total: devis.filter(d => d.statut === 'facture').reduce((s, d) => s + (d.total_ttc || 0), 0) },
    };

    // CA prévisionnel (signés non encore facturés + envoyés * 0.5)
    const caPrevisionnel = pipeline.signe.total + Math.round(pipeline.envoye.total * 0.5);

    // Actions prioritaires
    const actions = [];

    // 1. Factures en retard
    devis
      .filter(d => d.type === 'facture' && d.date_echeance && new Date(d.date_echeance) < now && ['envoye', 'facture'].includes(d.statut))
      .sort((a, b) => new Date(a.date_echeance) - new Date(b.date_echeance))
      .forEach(d => {
        const jours = daysSince(d.date_echeance);
        const client = clients.find(c => c.id === d.client_id);
        actions.push({
          priority: 1,
          icon: AlertTriangle,
          color: '#ef4444',
          label: `Facture en retard de ${jours}j`,
          detail: client ? `${client.nom || client.name} — ${fmt(d.total_ttc, modeDiscret)}` : fmt(d.total_ttc, modeDiscret),
          onClick: () => { setSelectedDevis(d); setPage('devis'); },
        });
      });

    // 2. Devis envoyés sans réponse > 7j
    devisEnAttente
      .filter(d => d.date && daysSince(d.date) > 7)
      .sort((a, b) => daysSince(b.date) - daysSince(a.date))
      .forEach(d => {
        const jours = daysSince(d.date);
        const client = clients.find(c => c.id === d.client_id);
        actions.push({
          priority: 2,
          icon: Clock,
          color: '#f97316',
          label: `Devis sans réponse (${jours}j)`,
          detail: client ? `${client.nom || client.name} — ${fmt(d.total_ttc, modeDiscret)}` : fmt(d.total_ttc, modeDiscret),
          onClick: () => { setSelectedDevis(d); setPage('devis'); },
        });
      });

    // 3. Brouillons à finaliser (groupé)
    const brouillons = devis.filter(d => d.statut === 'brouillon' && d.type !== 'facture');
    if (brouillons.length > 0) {
      const totalBrouillons = brouillons.reduce((s, d) => s + (d.total_ttc || 0), 0);
      actions.push({
        priority: 3,
        icon: FileText,
        color: '#eab308',
        label: `${brouillons.length} brouillon${brouillons.length > 1 ? 's' : ''} à finaliser`,
        detail: fmt(totalBrouillons, modeDiscret),
        onClick: () => setPage('devis'),
      });
    }

    // Score santé /10
    let score = 0;
    if (retard === 0) score += 2;
    if (entreprise?.siret) score += 2;
    if (chantiersActifs.length > 0) score += 2;
    if (tauxConversion >= 40) score += 2;
    const caCeMois = devis
      .filter(d => ['signe', 'facture'].includes(d.statut) && d.date?.startsWith(now.toISOString().substring(0, 7)))
      .reduce((s, d) => s + (d.total_ttc || 0), 0);
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
    const onboardingPct = Math.round((profilPct + f26Pct) / 2);

    return {
      aEncaisser,
      retard,
      devisEnAttente,
      chantiersActifs,
      tauxConversion,
      sparkData,
      pipeline,
      caPrevisionnel,
      actions: actions.sort((a, b) => a.priority - b.priority),
      score,
      chantierPrincipal,
      onboardingPct,
      profilPct,
      f26Pct,
      caCeMois,
    };
  }, [devis, chantiers, clients, entreprise, modeDiscret, setSelectedDevis, setPage]);

  // ---- Greeting ----
  const prenom = getPrenom(user);
  const formattedDate = new Date().toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

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
      onClick: () => toggleMemo?.(m.id),
    }));
    return [...computed.actions, ...memoActions];
  }, [computed.actions, memosJour, toggleMemo]);

  const visibleActions = showAllActions ? allActions : allActions.slice(0, 5);

  // ---- KPI color classes (Logip: white cards, no border in light) ----
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
    <div className={`p-4 sm:p-6 max-w-5xl mx-auto space-y-6 min-h-screen ${isDark ? 'bg-slate-900' : 'bg-[#F5F7FA]'}`}>

      {/* =========== ZONE 1: HERO PULSE =========== */}
      <section>
        {/* Greeting + Score */}
        <div className="flex justify-between items-start mb-5">
          <div>
            <h1 className={`text-2xl sm:text-3xl font-semibold tracking-tight ${textPrimary}`}>
              Bonjour{prenom ? `, ${prenom}` : ''}
            </h1>
            <p className={`text-sm capitalize mt-1 ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>{formattedDate}</p>
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
            <ScoreSante score={computed.score} isDark={isDark} couleur={couleur} />
          </div>
        </div>

        {/* 4 KPI Cards */}
        {canSeeFinances && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-5 mb-5">
            <KPICard
              label="À encaisser"
              value={fmt(computed.aEncaisser, modeDiscret)}
              sub={computed.retard > 0 ? `dont ${fmt(computed.retard, modeDiscret)} en retard` : null}
              colorClasses={kpiColors.encaisser}
              isDark={isDark}
              delay={0}
            />
            <KPICard
              label="Devis en attente"
              value={String(computed.devisEnAttente.length)}
              sub={computed.devisEnAttente.length > 0
                ? fmt(computed.devisEnAttente.reduce((s, d) => s + (d.total_ttc || 0), 0), modeDiscret)
                : null
              }
              colorClasses={kpiColors.devisAttente}
              isDark={isDark}
              delay={0.05}
            />
            <KPICard
              label="Chantiers actifs"
              value={String(computed.chantiersActifs.length)}
              sub={computed.chantiersActifs.length > 0
                ? `${Math.round(computed.chantiersActifs.reduce((s, c) => s + (c.avancement || 0), 0) / computed.chantiersActifs.length)}% moyen`
                : null
              }
              colorClasses={kpiColors.chantiers}
              isDark={isDark}
              delay={0.1}
            />
            <KPICard
              label="Taux conversion"
              value={`${computed.tauxConversion}%`}
              sub={null}
              colorClasses={isDark ? 'border-slate-700' : 'border-slate-200'}
              isDark={isDark}
              delay={0.15}
            />
          </div>
        )}

        {/* Sparkline CA 6 mois */}
        {canSeeFinances && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className={`rounded-2xl p-5 ${sectionBg}`}
          >
            <div className="flex justify-between items-center mb-2">
              <p className={`text-sm font-medium ${isDark ? 'text-slate-300' : 'text-gray-600'}`}>
                CA signé — 6 derniers mois
              </p>
              <p className={`text-lg font-bold ${textPrimary}`}>
                {fmt(computed.sparkData.reduce((s, d) => s + d.ca, 0), modeDiscret)}
              </p>
            </div>
            <ResponsiveContainer width="100%" height={120}>
              <AreaChart data={computed.sparkData}>
                <defs>
                  <linearGradient id="caGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={couleur} stopOpacity={0.3} />
                    <stop offset="100%" stopColor={couleur} stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <Area
                  type="monotone"
                  dataKey="ca"
                  stroke={couleur}
                  strokeWidth={2}
                  fill="url(#caGradient)"
                  dot={false}
                />
              </AreaChart>
            </ResponsiveContainer>
            <div className="flex justify-between mt-1 px-1">
              {computed.sparkData.map((d, i) => (
                <span key={i} className={`text-[10px] ${textSecondary}`}>{d.mois}</span>
              ))}
            </div>
          </motion.div>
        )}
      </section>

      {/* =========== ZONE 2: ACTIONS PRIORITAIRES =========== */}
      {allActions.length > 0 && (
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
              <ActionItem
                key={i}
                icon={action.icon}
                color={action.color}
                label={action.label}
                detail={action.detail}
                onClick={action.onClick}
                isDark={isDark}
              />
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
        </motion.section>
      )}

      {/* =========== ZONE 3: CONTEXTE =========== */}
      <section className="grid md:grid-cols-2 gap-5">

        {/* Chantier actif principal */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.4 }}
          className={`rounded-2xl p-5 ${sectionBg}`}
        >
          <h3 className={`text-sm font-semibold mb-3 ${textSecondary}`}>
            Chantier en cours
          </h3>
          {computed.chantierPrincipal ? (() => {
            const ch = computed.chantierPrincipal;
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
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${avancement}%`, background: couleur }}
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

        {/* Pipeline funnel */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35, duration: 0.4 }}
          className={`rounded-2xl p-5 ${sectionBg}`}
        >
          <h3 className={`text-sm font-semibold mb-3 ${textSecondary}`}>
            Pipeline devis
          </h3>
          <PipelineBar pipeline={computed.pipeline} isDark={isDark} modeDiscret={modeDiscret} />
          {canSeeFinances && computed.caPrevisionnel > 0 && (
            <div className={`mt-3 pt-3 border-t ${isDark ? 'border-slate-700' : 'border-slate-100'}`}>
              <div className="flex justify-between items-center">
                <span className={`text-xs ${textSecondary}`}>CA prévisionnel</span>
                <span className={`text-sm font-bold ${textPrimary}`}>
                  {fmt(computed.caPrevisionnel, modeDiscret)}
                </span>
              </div>
            </div>
          )}
          {(computed.pipeline.brouillon.count + computed.pipeline.envoye.count + computed.pipeline.signe.count + computed.pipeline.facture.count) === 0 && (
            <div className={`text-sm py-4 text-center ${textSecondary}`}>
              Aucun devis pour le moment
              <br />
              <button
                type="button"
                onClick={() => { setCreateMode?.({ devis: true }); setPage('devis'); }}
                className="mt-2 text-sm font-medium"
                style={{ color: couleur }}
              >
                Créer un devis
              </button>
            </div>
          )}
        </motion.div>
      </section>

      {/* Onboarding bar */}
      {computed.onboardingPct < 90 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className={`rounded-2xl px-5 py-3.5 flex items-center gap-3 ${sectionBg}`}
        >
          <div className={`text-xs flex-1 ${textSecondary}`}>
            Profil {computed.profilPct}%
            <span className="mx-2">&middot;</span>
            Conformité {computed.f26Pct}%
          </div>
          <button
            type="button"
            onClick={() => setPage('settings')}
            className="inline-flex items-center gap-1 text-xs font-medium whitespace-nowrap"
            style={{ color: couleur }}
          >
            Continuer <ArrowRight className="w-3 h-3" />
          </button>
        </motion.div>
      )}
    </div>
  );
}
