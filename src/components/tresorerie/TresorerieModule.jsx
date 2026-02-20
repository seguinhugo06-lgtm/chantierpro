/**
 * TresorerieModule - Full-page cash flow management module
 *
 * Provides a comprehensive treasury overview for construction companies:
 * - KPI cards (solde, entrees/sorties prevues, projection)
 * - SVG bar chart with monthly cash flow + cumulative balance line
 * - Upcoming payments table (invoices + user previsions)
 * - Quick-add / edit modal for previsions (persisted to localStorage)
 * - Mark-as-paid, edit, delete on each row
 * - Solde initial configuration
 * - Alerts for projected negative balance or large upcoming payments
 * - Auto-sync: factures → entree previsions, depenses → sortie previsions
 * - TVA dashboard with collectée vs déductible breakdown
 *
 * All data comes via props (no DataContext import).
 *
 * @module TresorerieModule
 */

import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import {
  Wallet, TrendingUp, ArrowUpRight, ArrowDownRight, Plus, X,
  AlertTriangle, Info, ArrowDown, ArrowUp, Clock, BarChart3, Save, Settings, Filter,
  Check, Edit3, Trash2, RotateCcw, Zap, RefreshCw, CalendarDays,
  FileText, Receipt, Percent, Link2, Sliders, Target, TrendingDown, Activity,
  MessageCircle, ChevronDown, ChevronUp, HardHat, Banknote,
} from 'lucide-react';
import { useTresorerie } from '../../hooks/useTresorerie';
import { useTVA } from '../../hooks/useTVA';
import { useExportComptable } from '../../hooks/useExportComptable';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MONTH_NAMES = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];

/** Period filter options shown in the header */
const PERIOD_OPTIONS = [
  { key: '1m', label: 'Ce mois' },
  { key: '3m', label: '3 mois' },
  { key: '6m', label: '6 mois' },
  { key: '1y', label: '1 an' },
];

/** Tabs for the main content area */
const TABS = [
  { key: 'apercu', label: 'Aperçu' },
  { key: 'previsions', label: 'Prévisions' },
  { key: 'historique', label: 'Historique' },
  { key: 'mouvements', label: 'Mouvements' },
  { key: 'projections', label: 'Projections' },
  { key: 'tva', label: 'TVA' },
];

/** Scenario presets for projections */
const SCENARIO_PRESETS = [
  { key: 'current', label: 'Tendance actuelle', icon: Activity, entreesAdj: 0, sortiesAdj: 0, extraEntree: 0, extraSortie: 0 },
  { key: 'optimiste', label: 'Optimiste', icon: TrendingUp, entreesAdj: 20, sortiesAdj: -10, extraEntree: 0, extraSortie: 0 },
  { key: 'pessimiste', label: 'Pessimiste', icon: TrendingDown, entreesAdj: -25, sortiesAdj: 15, extraEntree: 0, extraSortie: 0 },
  { key: 'nouveau_chantier', label: 'Nouveau chantier', icon: Target, entreesAdj: 0, sortiesAdj: 0, extraEntree: 15000, extraSortie: 5000 },
];

/** French BTP TVA rates */
const TVA_RATES = {
  200: { label: '20%', rate: 0.20, desc: 'Taux normal' },
  100: { label: '10%', rate: 0.10, desc: 'Rénovation' },
  55: { label: '5,5%', rate: 0.055, desc: 'Rénovation énergétique' },
  21: { label: '2,1%', rate: 0.021, desc: 'Taux réduit' },
  0: { label: '0%', rate: 0, desc: 'Exonéré' },
};

/** Categories for previsions */
const CATEGORIES_PREVISION = [
  'Client', 'Fournisseur', 'Loyer', 'Assurance',
  'Salaires', 'Materiaux', 'Sous-traitance', 'Divers',
];

/** Category colors for badges */
const CATEGORY_COLORS = {
  Client: { bg: 'bg-blue-100 text-blue-700', dark: 'bg-blue-900/30 text-blue-400' },
  Fournisseur: { bg: 'bg-orange-100 text-orange-700', dark: 'bg-orange-900/30 text-orange-400' },
  Loyer: { bg: 'bg-purple-100 text-purple-700', dark: 'bg-purple-900/30 text-purple-400' },
  Assurance: { bg: 'bg-green-100 text-green-700', dark: 'bg-green-900/30 text-green-400' },
  Salaires: { bg: 'bg-amber-100 text-amber-700', dark: 'bg-amber-900/30 text-amber-400' },
  Materiaux: { bg: 'bg-cyan-100 text-cyan-700', dark: 'bg-cyan-900/30 text-cyan-400' },
  'Sous-traitance': { bg: 'bg-indigo-100 text-indigo-700', dark: 'bg-indigo-900/30 text-indigo-400' },
  Divers: { bg: 'bg-gray-100 text-gray-600', dark: 'bg-gray-700 text-gray-300' },
};

/** Charges courantes BTP (Feature 6) */
const BTP_CHARGES = [
  { categorie: 'Assurance', items: [
    { label: 'Responsabilité civile pro (RC)', montantMoyen: 250, recurrence: 'mensuel' },
    { label: 'Décennale', montantMoyen: 800, recurrence: 'mensuel' },
    { label: 'Multirisque local', montantMoyen: 180, recurrence: 'mensuel' },
  ]},
  { categorie: 'Véhicules', items: [
    { label: 'Leasing véhicule utilitaire', montantMoyen: 650, recurrence: 'mensuel' },
    { label: 'Carburant / Gasoil', montantMoyen: 500, recurrence: 'mensuel' },
    { label: 'Entretien / CT véhicules', montantMoyen: 120, recurrence: 'mensuel' },
  ]},
  { categorie: 'Local / Dépôt', items: [
    { label: 'Loyer local / dépôt', montantMoyen: 1800, recurrence: 'mensuel' },
    { label: 'Électricité / Eau', montantMoyen: 200, recurrence: 'mensuel' },
    { label: 'Télécom / Internet', montantMoyen: 80, recurrence: 'mensuel' },
  ]},
  { categorie: 'Personnel', items: [
    { label: 'Salaires + charges', montantMoyen: 3500, recurrence: 'mensuel' },
    { label: 'Mutuelle / Prévoyance', montantMoyen: 150, recurrence: 'mensuel' },
    { label: 'Formation', montantMoyen: 200, recurrence: 'trimestriel' },
  ]},
  { categorie: 'Divers', items: [
    { label: 'Comptable / Expert', montantMoyen: 300, recurrence: 'mensuel' },
    { label: 'Logiciels / Abonnements', montantMoyen: 100, recurrence: 'mensuel' },
    { label: 'Fournitures de bureau', montantMoyen: 60, recurrence: 'mensuel' },
  ]},
];

/** Template recurring charges for first-time setup */
const STARTER_TEMPLATES = [
  { type: 'sortie', description: 'Loyer local / dépôt', montant: 1800, categorie: 'Loyer', recurrence: 'mensuel' },
  { type: 'sortie', description: 'Assurance pro (RC/décennale)', montant: 450, categorie: 'Assurance', recurrence: 'mensuel' },
  { type: 'sortie', description: 'Salaires et charges', montant: 8500, categorie: 'Salaires', recurrence: 'mensuel' },
  { type: 'sortie', description: 'Leasing véhicules', montant: 650, categorie: 'Divers', recurrence: 'mensuel' },
  { type: 'sortie', description: 'Carburant / déplacements', montant: 400, categorie: 'Divers', recurrence: 'mensuel' },
  { type: 'sortie', description: 'Fournitures bureau / télécom', montant: 150, categorie: 'Divers', recurrence: 'mensuel' },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const formatCurrency = (amount) =>
  new Intl.NumberFormat('fr-FR', {
    style: 'currency', currency: 'EUR',
    minimumFractionDigits: 0, maximumFractionDigits: 0,
  }).format(amount || 0);

const formatCompact = (amount) => {
  if (Math.abs(amount) >= 1_000_000) return `${(amount / 1_000_000).toFixed(1)}M`;
  if (Math.abs(amount) >= 1_000) return `${Math.round(amount / 1_000)}k`;
  return `${Math.round(amount)}`;
};

const monthKey = (d) => ({ month: d.getMonth(), year: d.getFullYear() });
const sameMonth = (a, b) => a.month === b.month && a.year === b.year;
const periodMonths = (key) => {
  switch (key) { case '1m': return 1; case '3m': return 3; case '6m': return 6; case '1y': return 12; default: return 6; }
};

const genId = () => `prev_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function KpiCard({ label, value, icon: Icon, trend, trendLabel, color, isDark, accent }) {
  const isPositive = trend > 0;
  const isNegative = trend < 0;
  return (
    <div className={`relative overflow-hidden rounded-2xl p-5 border transition-shadow ${isDark ? 'bg-slate-800 border-slate-700 hover:shadow-lg hover:shadow-slate-900/30' : 'bg-white border-gray-200 hover:shadow-lg hover:shadow-gray-200/60'}`}>
      <div className="absolute top-0 left-0 right-0 h-1" style={{ backgroundColor: accent || color }} />
      <div className="flex items-start justify-between mb-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${color}20`, color }}>
          <Icon size={20} />
        </div>
        {trend !== undefined && trend !== null && isFinite(trend) && (
          <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full ${isPositive ? isDark ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-100 text-emerald-700' : isNegative ? isDark ? 'bg-red-500/20 text-red-400' : 'bg-red-100 text-red-700' : isDark ? 'bg-gray-700 text-gray-400' : 'bg-gray-100 text-gray-500'}`}>
            {isPositive ? <ArrowUpRight size={14} /> : isNegative ? <ArrowDownRight size={14} /> : null}
            {isPositive ? '+' : ''}{Math.round(trend)}%
          </span>
        )}
      </div>
      <p className={`text-xs font-semibold uppercase tracking-wide mb-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{label}</p>
      <p className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{value}</p>
      {trendLabel && <p className={`text-xs mt-1 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>{trendLabel}</p>}
    </div>
  );
}

/**
 * SVG-based bar chart showing monthly entrées / sorties with a cumulative balance line.
 */
function CashFlowChart({ data, isDark, couleur }) {
  const width = 800, height = 320;
  const padTop = 30, padBottom = 40, padLeft = 60, padRight = 20;
  const chartW = width - padLeft - padRight;
  const chartH = height - padTop - padBottom;

  const maxBar = Math.max(...data.map((d) => Math.max(d.entrees, d.sorties)), 1);
  const allBalances = data.map((d) => d.cumulBalance);
  const minBal = Math.min(...allBalances, 0);
  const maxBal = Math.max(...allBalances, maxBar);
  const barScale = chartH / (maxBar * 1.15);
  const balMin = minBal - Math.abs(minBal) * 0.1;
  const balMax = maxBal + Math.abs(maxBal) * 0.1 || 1;
  const balRange = balMax - balMin || 1;

  const barGroupWidth = chartW / data.length;
  const barWidth = Math.min(barGroupWidth * 0.3, 32);
  const gap = 4;

  const tickCount = 5;
  const tickStep = maxBar / tickCount;
  const ticks = Array.from({ length: tickCount + 1 }, (_, i) => Math.round(i * tickStep));

  const balPoints = data.map((d, i) => {
    const x = padLeft + barGroupWidth * i + barGroupWidth / 2;
    const y = padTop + chartH - ((d.cumulBalance - balMin) / balRange) * chartH;
    return `${x},${y}`;
  }).join(' ');

  const gridColor = isDark ? '#334155' : '#e5e7eb';
  const textColor = isDark ? '#94a3b8' : '#6b7280';
  const positiveColor = couleur || '#3b82f6';
  const negativeColor = '#ef4444';

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto" preserveAspectRatio="xMidYMid meet">
      {ticks.map((t) => {
        const y = padTop + chartH - t * barScale;
        return (
          <g key={`grid-${t}`}>
            <line x1={padLeft} y1={y} x2={width - padRight} y2={y} stroke={gridColor} strokeDasharray="4 4" />
            <text x={padLeft - 8} y={y + 4} textAnchor="end" fill={textColor} fontSize={11}>{formatCompact(t)}</text>
          </g>
        );
      })}
      {data.map((d, i) => {
        const cx = padLeft + barGroupWidth * i + barGroupWidth / 2;
        const entreeH = d.entrees * barScale;
        const sortieH = d.sorties * barScale;
        const baseY = padTop + chartH;
        return (
          <g key={d.label}>
            <rect x={cx - barWidth - gap / 2} y={baseY - entreeH} width={barWidth} height={entreeH} rx={4} fill={positiveColor} opacity={0.85} />
            <rect x={cx + gap / 2} y={baseY - sortieH} width={barWidth} height={sortieH} rx={4} fill={negativeColor} opacity={0.85} />
            <text x={cx} y={baseY + 20} textAnchor="middle" fill={textColor} fontSize={11} fontWeight={d.isCurrent ? 700 : 400}>{d.label}</text>
            {d.isCurrent && <circle cx={cx} cy={baseY + 32} r={3} fill={positiveColor} />}
          </g>
        );
      })}
      <polyline points={balPoints} fill="none" stroke={isDark ? '#facc15' : '#ca8a04'} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
      {data.map((d, i) => {
        const x = padLeft + barGroupWidth * i + barGroupWidth / 2;
        const y = padTop + chartH - ((d.cumulBalance - balMin) / balRange) * chartH;
        return <circle key={`dot-${i}`} cx={x} cy={y} r={4} fill={isDark ? '#facc15' : '#ca8a04'} stroke={isDark ? '#1e293b' : '#ffffff'} strokeWidth={2} />;
      })}
      <g transform={`translate(${padLeft}, 10)`}>
        <rect width={12} height={12} rx={3} fill={positiveColor} opacity={0.85} />
        <text x={16} y={10} fill={textColor} fontSize={11}>Entrées</text>
        <rect x={80} width={12} height={12} rx={3} fill={negativeColor} opacity={0.85} />
        <text x={96} y={10} fill={textColor} fontSize={11}>Sorties</text>
        <line x1={160} y1={6} x2={180} y2={6} stroke={isDark ? '#facc15' : '#ca8a04'} strokeWidth={2.5} />
        <text x={184} y={10} fill={textColor} fontSize={11}>Solde cumulé</text>
      </g>
    </svg>
  );
}

/**
 * SVG-based projection chart showing scenario balance over 12 months.
 * Shows baseline vs adjusted scenario with colored fill area.
 */
function ProjectionChart({ baseline, scenario, isDark, couleur }) {
  const width = 800, height = 280;
  const padTop = 30, padBottom = 40, padLeft = 65, padRight = 20;
  const chartW = width - padLeft - padRight;
  const chartH = height - padTop - padBottom;

  const allVals = [...baseline.map(d => d.balance), ...scenario.map(d => d.balance)];
  const minVal = Math.min(...allVals, 0);
  const maxVal = Math.max(...allVals, 1);
  const range = (maxVal - minVal) * 1.15 || 1;
  const bottom = minVal - (maxVal - minVal) * 0.075;

  const toY = (v) => padTop + chartH - ((v - bottom) / range) * chartH;
  const toX = (i) => padLeft + (chartW / (baseline.length - 1 || 1)) * i;

  const gridColor = isDark ? '#334155' : '#e5e7eb';
  const textColor = isDark ? '#94a3b8' : '#6b7280';

  const baselinePoints = baseline.map((d, i) => `${toX(i)},${toY(d.balance)}`).join(' ');
  const scenarioPoints = scenario.map((d, i) => `${toX(i)},${toY(d.balance)}`).join(' ');

  // Fill area between baseline and scenario
  const fillPath = scenario.map((d, i) => `${toX(i)},${toY(d.balance)}`).join(' L')
    + ` L${toX(baseline.length - 1)},${toY(baseline[baseline.length - 1].balance)}`
    + baseline.slice().reverse().map((d, i) => ` L${toX(baseline.length - 1 - i)},${toY(d.balance)}`).join('');

  // Grid ticks
  const tickCount = 5;
  const tickStep = (maxVal - minVal) / tickCount || 1;
  const ticks = Array.from({ length: tickCount + 1 }, (_, i) => Math.round(minVal + i * tickStep));

  // Zero line
  const zeroY = toY(0);

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto" preserveAspectRatio="xMidYMid meet">
      {/* Grid */}
      {ticks.map((t) => {
        const y = toY(t);
        return (
          <g key={`grid-${t}`}>
            <line x1={padLeft} y1={y} x2={width - padRight} y2={y} stroke={gridColor} strokeDasharray="4 4" />
            <text x={padLeft - 8} y={y + 4} textAnchor="end" fill={textColor} fontSize={11}>{formatCompact(t)}</text>
          </g>
        );
      })}
      {/* Zero line */}
      {minVal < 0 && <line x1={padLeft} y1={zeroY} x2={width - padRight} y2={zeroY} stroke={isDark ? '#64748b' : '#9ca3af'} strokeWidth={1.5} />}
      {/* Fill area */}
      <polygon points={fillPath} fill={couleur} opacity={0.08} />
      {/* Baseline */}
      <polyline points={baselinePoints} fill="none" stroke={isDark ? '#64748b' : '#9ca3af'} strokeWidth={2} strokeDasharray="6 4" strokeLinejoin="round" />
      {/* Scenario */}
      <polyline points={scenarioPoints} fill="none" stroke={couleur} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
      {/* Dots */}
      {scenario.map((d, i) => (
        <circle key={`dot-${i}`} cx={toX(i)} cy={toY(d.balance)} r={4} fill={d.balance < 0 ? '#ef4444' : couleur} stroke={isDark ? '#1e293b' : '#fff'} strokeWidth={2} />
      ))}
      {/* Month labels */}
      {scenario.map((d, i) => (
        <text key={`label-${i}`} x={toX(i)} y={height - 8} textAnchor="middle" fill={textColor} fontSize={11} fontWeight={i === 0 ? 700 : 400}>{d.mois}</text>
      ))}
      {/* Legend */}
      <g transform={`translate(${padLeft}, 12)`}>
        <line x1={0} y1={6} x2={20} y2={6} stroke={isDark ? '#64748b' : '#9ca3af'} strokeWidth={2} strokeDasharray="6 4" />
        <text x={24} y={10} fill={textColor} fontSize={11}>Tendance actuelle</text>
        <line x1={160} y1={6} x2={180} y2={6} stroke={couleur} strokeWidth={2.5} />
        <text x={184} y={10} fill={textColor} fontSize={11}>Scénario ajusté</text>
      </g>
    </svg>
  );
}

/**
 * Modal for adding / editing a cash-flow prevision.
 */
function PrevisionModal({ isOpen, onClose, onSave, editItem, isDark, couleur }) {
  const [form, setForm] = useState({
    type: 'entree', description: '', montant: '',
    date: new Date().toISOString().slice(0, 10),
    categorie: 'Client', recurrence: 'unique',
  });

  useEffect(() => {
    if (editItem) {
      setForm({
        type: editItem.type || 'entree',
        description: editItem.description || '',
        montant: editItem.montant?.toString() || '',
        date: editItem.date || new Date().toISOString().slice(0, 10),
        categorie: editItem.categorie || 'Client',
        recurrence: editItem.recurrence || 'unique',
      });
    } else {
      setForm({ type: 'entree', description: '', montant: '', date: new Date().toISOString().slice(0, 10), categorie: 'Client', recurrence: 'unique' });
    }
  }, [editItem, isOpen]);

  const handleChange = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.description.trim() || !form.montant) return;
    onSave({
      ...form,
      description: form.description.trim(),
      montant: parseFloat(form.montant) || 0,
      id: editItem?.id || genId(),
      createdAt: editItem?.createdAt || new Date().toISOString(),
      statut: editItem?.statut || 'prevu',
    });
    onClose();
  };

  if (!isOpen) return null;

  const inputCls = `w-full rounded-xl px-3 py-2.5 text-sm border transition-colors focus:outline-none focus:ring-2 ${isDark ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400 focus:ring-blue-500/40' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400 focus:ring-blue-500/30'}`;
  const labelCls = `block text-xs font-semibold mb-1 ${isDark ? 'text-gray-300' : 'text-gray-600'}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <form onSubmit={handleSubmit} className={`relative w-full max-w-md rounded-2xl border shadow-2xl ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'}`}>
        <div className={`flex items-center justify-between px-5 py-4 border-b ${isDark ? 'border-slate-700' : 'border-gray-100'}`}>
          <h3 className={`text-base font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
            {editItem ? 'Modifier la prévision' : 'Nouvelle prévision'}
          </h3>
          <button type="button" onClick={onClose} className={`p-1.5 rounded-lg transition-colors ${isDark ? 'hover:bg-slate-700 text-gray-400' : 'hover:bg-gray-100 text-gray-500'}`}>
            <X size={18} />
          </button>
        </div>
        <div className="px-5 py-4 space-y-4">
          <div>
            <label className={labelCls}>Type</label>
            <div className={`inline-flex rounded-xl p-1 ${isDark ? 'bg-slate-700' : 'bg-gray-100'}`}>
              {['entree', 'sortie'].map((t) => (
                <button key={t} type="button" onClick={() => handleChange('type', t)}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${form.type === t ? t === 'entree' ? 'bg-emerald-500 text-white shadow-md' : 'bg-red-500 text-white shadow-md' : isDark ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-700'}`}>
                  {t === 'entree' ? 'Entrée' : 'Sortie'}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className={labelCls}>Description</label>
            <input type="text" className={inputCls} placeholder="Ex: Facture chantier Dupont" value={form.description} onChange={(e) => handleChange('description', e.target.value)} required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Montant (€)</label>
              <input type="number" className={inputCls} placeholder="0" min="0" step="0.01" value={form.montant} onChange={(e) => handleChange('montant', e.target.value)} required />
            </div>
            <div>
              <label className={labelCls}>Date prévue</label>
              <input type="date" className={inputCls} value={form.date} onChange={(e) => handleChange('date', e.target.value)} required />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Catégorie</label>
              <select className={inputCls} value={form.categorie} onChange={(e) => handleChange('categorie', e.target.value)}>
                {CATEGORIES_PREVISION.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Récurrence</label>
              <select className={inputCls} value={form.recurrence} onChange={(e) => handleChange('recurrence', e.target.value)}>
                <option value="unique">Unique</option>
                <option value="mensuel">Mensuel</option>
                <option value="trimestriel">Trimestriel</option>
                <option value="annuel">Annuel</option>
              </select>
            </div>
          </div>
        </div>
        <div className={`flex items-center justify-end gap-3 px-5 py-4 border-t ${isDark ? 'border-slate-700' : 'border-gray-100'}`}>
          <button type="button" onClick={onClose} className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${isDark ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-700'}`}>Annuler</button>
          <button type="submit" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 active:scale-[0.98] shadow-md" style={{ backgroundColor: couleur || '#3b82f6' }}>
            <Save size={16} /> {editItem ? 'Enregistrer' : 'Ajouter'}
          </button>
        </div>
      </form>
    </div>
  );
}

/**
 * Modal for adding / editing a treasury mouvement (actual transaction with TVA).
 */
function MouvementModal({ isOpen, onClose, onSave, editItem, isDark, couleur }) {
  const [form, setForm] = useState({
    type: 'sortie', description: '', montant: '',
    date: new Date().toISOString().slice(0, 10),
    categorie: 'Divers', tauxTva: 20, autoliquidation: false,
    isRecurring: false, recurringFrequency: 'mensuel',
    notes: '',
  });

  useEffect(() => {
    if (editItem) {
      setForm({
        type: editItem.type || 'sortie',
        description: editItem.description || '',
        montant: editItem.montant?.toString() || '',
        date: editItem.date || new Date().toISOString().slice(0, 10),
        categorie: editItem.categorie || 'Divers',
        tauxTva: editItem.tauxTva ?? 20,
        autoliquidation: editItem.autoliquidation || false,
        isRecurring: editItem.isRecurring || false,
        recurringFrequency: editItem.recurringFrequency || 'mensuel',
        notes: editItem.notes || '',
      });
    } else {
      setForm({ type: 'sortie', description: '', montant: '', date: new Date().toISOString().slice(0, 10), categorie: 'Divers', tauxTva: 20, autoliquidation: false, isRecurring: false, recurringFrequency: 'mensuel', notes: '' });
    }
  }, [editItem, isOpen]);

  const handleChange = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

  const montantNum = parseFloat(form.montant) || 0;
  const montantHt = form.autoliquidation ? montantNum : montantNum / (1 + form.tauxTva / 100);
  const montantTva = form.autoliquidation ? 0 : montantNum - montantHt;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.description.trim() || !form.montant) return;
    onSave({
      ...form,
      description: form.description.trim(),
      montant: montantNum,
      montantHt: Math.round(montantHt * 100) / 100,
      montantTva: Math.round(montantTva * 100) / 100,
      id: editItem?.id || crypto.randomUUID(),
      createdAt: editItem?.createdAt || new Date().toISOString(),
      statut: editItem?.statut || 'prevu',
    });
    onClose();
  };

  if (!isOpen) return null;

  const inputCls = `w-full rounded-xl px-3 py-2.5 text-sm border transition-colors focus:outline-none focus:ring-2 ${isDark ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400 focus:ring-blue-500/40' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400 focus:ring-blue-500/30'}`;
  const labelCls = `block text-xs font-semibold mb-1 ${isDark ? 'text-gray-300' : 'text-gray-600'}`;
  const textSecondaryLocal = isDark ? 'text-gray-400' : 'text-gray-500';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <form onSubmit={handleSubmit} className={`relative w-full max-w-lg rounded-2xl border shadow-2xl ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'}`}>
        <div className={`flex items-center justify-between px-5 py-4 border-b ${isDark ? 'border-slate-700' : 'border-gray-100'}`}>
          <h3 className={`text-base font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
            {editItem ? 'Modifier le mouvement' : 'Nouveau mouvement'}
          </h3>
          <button type="button" onClick={onClose} className={`p-1.5 rounded-lg transition-colors ${isDark ? 'hover:bg-slate-700 text-gray-400' : 'hover:bg-gray-100 text-gray-500'}`}>
            <X size={18} />
          </button>
        </div>
        <div className="px-5 py-4 space-y-4">
          <div>
            <label className={labelCls}>Type</label>
            <div className={`inline-flex rounded-xl p-1 ${isDark ? 'bg-slate-700' : 'bg-gray-100'}`}>
              {['entree', 'sortie'].map((t) => (
                <button key={t} type="button" onClick={() => handleChange('type', t)}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${form.type === t ? t === 'entree' ? 'bg-emerald-500 text-white shadow-md' : 'bg-red-500 text-white shadow-md' : isDark ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-700'}`}>
                  {t === 'entree' ? 'Entrée' : 'Sortie'}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className={labelCls}>Description</label>
            <input type="text" className={inputCls} placeholder="Ex: Paiement facture #124" value={form.description} onChange={(e) => handleChange('description', e.target.value)} required />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className={labelCls}>Montant TTC (€)</label>
              <input type="number" className={inputCls} placeholder="0" min="0" step="0.01" value={form.montant} onChange={(e) => handleChange('montant', e.target.value)} required />
            </div>
            <div>
              <label className={labelCls}>Taux TVA (%)</label>
              <select className={inputCls} value={form.tauxTva} onChange={(e) => handleChange('tauxTva', parseFloat(e.target.value))}>
                <option value={20}>20%</option>
                <option value={10}>10%</option>
                <option value={5.5}>5,5%</option>
                <option value={2.1}>2,1%</option>
                <option value={0}>0% (exonéré)</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>Date</label>
              <input type="date" className={inputCls} value={form.date} onChange={(e) => handleChange('date', e.target.value)} required />
            </div>
          </div>
          {/* TVA decomposition display */}
          {montantNum > 0 && (
            <div className={`flex items-center gap-4 p-3 rounded-xl text-xs ${isDark ? 'bg-slate-700/50 border border-slate-600' : 'bg-gray-50 border border-gray-200'}`}>
              <span className={textSecondaryLocal}>HT : <strong>{formatCurrency(montantHt)}</strong></span>
              <span className={textSecondaryLocal}>TVA : <strong>{formatCurrency(montantTva)}</strong></span>
              <span className={textSecondaryLocal}>TTC : <strong>{formatCurrency(montantNum)}</strong></span>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Catégorie</label>
              <select className={inputCls} value={form.categorie} onChange={(e) => handleChange('categorie', e.target.value)}>
                {CATEGORIES_PREVISION.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-2">
              <label className={`flex items-center gap-2 mt-5 cursor-pointer select-none`}>
                <input type="checkbox" checked={form.autoliquidation} onChange={(e) => handleChange('autoliquidation', e.target.checked)}
                  className="w-4 h-4 rounded" />
                <span className={`text-xs ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>Autoliquidation TVA</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input type="checkbox" checked={form.isRecurring} onChange={(e) => handleChange('isRecurring', e.target.checked)}
                  className="w-4 h-4 rounded" />
                <span className={`text-xs ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>Récurrent</span>
              </label>
            </div>
          </div>
          {form.isRecurring && (
            <div>
              <label className={labelCls}>Fréquence</label>
              <select className={inputCls} value={form.recurringFrequency} onChange={(e) => handleChange('recurringFrequency', e.target.value)}>
                <option value="mensuel">Mensuel</option>
                <option value="trimestriel">Trimestriel</option>
                <option value="annuel">Annuel</option>
              </select>
            </div>
          )}
          <div>
            <label className={labelCls}>Notes (optionnel)</label>
            <input type="text" className={inputCls} placeholder="Référence, détails..." value={form.notes} onChange={(e) => handleChange('notes', e.target.value)} />
          </div>
        </div>
        <div className={`flex items-center justify-end gap-3 px-5 py-4 border-t ${isDark ? 'border-slate-700' : 'border-gray-100'}`}>
          <button type="button" onClick={onClose} className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${isDark ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-700'}`}>Annuler</button>
          <button type="submit" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 active:scale-[0.98] shadow-md" style={{ backgroundColor: couleur || '#3b82f6' }}>
            <Save size={16} /> {editItem ? 'Enregistrer' : 'Ajouter'}
          </button>
        </div>
      </form>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function TresorerieModule({
  devis = [], depenses = [], chantiers = [], clients = [],
  entreprise, isDark = false, couleur = '#3b82f6', setPage,
  modeDiscret = false, paiements = [],
}) {
  // Helper: mask financial amounts when modeDiscret is active
  const formatMoney = useCallback((amount) => modeDiscret ? '·····' : formatCurrency(amount), [modeDiscret]);
  // -- Hook: tresorerie data from useTresorerie ─────────────────────
  const {
    previsions, setPrevisions, loading: tresorerieLoading,
    addPrevision, updatePrevision, deletePrevision: hookDeletePrevision, markAsPaid: hookMarkAsPaid,
    settings, updateSettings,
    reglements, addReglement, deleteReglement,
    mouvements, addMouvement, updateMouvement, deleteMouvement, validerMouvement,
    mouvementsKPIs,
    getSyncedIds, saveSyncedIds,
  } = useTresorerie();

  // -- Hook: TVA computations ──────────────────────────────────────
  const tvaHook = useTVA({ devis, depenses, mouvements, settings });

  // -- Hook: Export comptable ──────────────────────────────────────
  const { exportCA3, exportJournalVentes, exportJournalAchats, exportReglements: exportReglementsCSV, exportFEC, exportMouvements: exportMouvementsCSV } = useExportComptable({
    devis, depenses, reglements, mouvements, clients, entreprise, tvaData: tvaHook,
  });

  // -- State ----------------------------------------------------------------
  const [period, setPeriod] = useState('6m');
  const [activeTab, setActiveTab] = useState('apercu');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [showSettingsPanel, setShowSettingsPanel] = useState(false);
  const [showMouvModal, setShowMouvModal] = useState(false);
  const [editingMouv, setEditingMouv] = useState(null);
  const [mouvFilter, setMouvFilter] = useState('all'); // all | entree | sortie
  const [mouvStatutFilter, setMouvStatutFilter] = useState('all'); // all | prevu | paye
  const [showPrefillConfirm, setShowPrefillConfirm] = useState(false);
  const [showEncaisserWidget, setShowEncaisserWidget] = useState(true);
  const [showChargesBTP, setShowChargesBTP] = useState(false);
  const [alertDismissed, setAlertDismissed] = useState(() => {
    try { return localStorage.getItem('cp_treso_alert_dismissed') === '1'; } catch { return false; }
  });

  // Wizard bootstrapping state
  const [wizardDismissed] = useState(() => {
    try { return localStorage.getItem('cp_treso_wizard_done') === '1'; } catch { return false; }
  });
  const [wizardStep, setWizardStep] = useState(0); // 0=solde, 1=charges, 2=done
  const [wizardCharges, setWizardCharges] = useState({}); // { chargeLabel: montant }
  const showWizard = !wizardDismissed && previsions.length === 0 && !tresorerieLoading;

  const handleWizardFinish = useCallback(async () => {
    // Step 0: save solde initial (already handled by updateSettings in the form)
    // Step 1: add selected charges
    const now = new Date();
    const baseDate = new Date(now.getFullYear(), now.getMonth(), 5);
    let i = 0;
    for (const [label, montant] of Object.entries(wizardCharges)) {
      if (!montant || montant <= 0) continue;
      const date = new Date(baseDate);
      date.setDate(date.getDate() + i * 2);
      await addPrevision({
        id: genId(),
        type: 'sortie',
        description: label,
        montant: Number(montant),
        date: date.toISOString().slice(0, 10),
        categorie: 'Divers',
        recurrence: 'mensuel',
        statut: 'prevu',
        source: 'wizard',
        createdAt: new Date().toISOString(),
      });
      i++;
    }
    try { localStorage.setItem('cp_treso_wizard_done', '1'); } catch {}
    setWizardStep(2);
  }, [wizardCharges, addPrevision]);

  // ── "À encaisser maintenant" computation ───────────────────────────
  const encaisserData = useMemo(() => {
    const now = new Date();
    const facturesImpayees = devis.filter(d =>
      (d.type === 'facture' || (d.statut === 'accepte' || d.statut === 'signe')) &&
      !['payee', 'paye', 'refuse', 'brouillon'].includes(d.statut)
    );

    const items = facturesImpayees.map(f => {
      const echeance = f.date_echeance || f.date_validite || f.date;
      const echeanceDate = echeance ? new Date(echeance) : null;
      const reste = (f.total_ttc || 0) - (f.montant_paye || 0);
      const joursRetard = echeanceDate ? Math.floor((now - echeanceDate) / (1000 * 60 * 60 * 24)) : 0;
      const client = clients.find(c => c.id === f.client_id);
      const clientNom = client ? `${client.prenom || ''} ${client.nom || ''}`.trim() : `Client #${f.client_id || '?'}`;
      const clientTel = client?.telephone || client?.tel || '';

      return {
        id: f.id,
        numero: f.numero || f.id?.slice(-6) || '—',
        clientNom,
        clientTel,
        montant: reste,
        echeance: echeance || '',
        joursRetard,
        isOverdue: joursRetard > 0,
        statut: f.statut,
        type: f.type || 'devis',
      };
    }).filter(i => i.montant > 0).sort((a, b) => b.joursRetard - a.joursRetard);

    const totalAEncaisser = items.reduce((s, i) => s + i.montant, 0);
    const overdueItems = items.filter(i => i.isOverdue);
    const overdueTotal = overdueItems.reduce((s, i) => s + i.montant, 0);

    return { items, totalAEncaisser, overdueItems, overdueTotal };
  }, [devis, clients]);

  // ── Escape key handler: close all modals/panels ──────────────────
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (showAddModal) { setShowAddModal(false); setEditingItem(null); }
        else if (showMouvModal) { setShowMouvModal(false); setEditingMouv(null); }
        else if (showSettingsPanel) setShowSettingsPanel(false);
        else if (showPrefillConfirm) setShowPrefillConfirm(false);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [showAddModal, showMouvModal, showSettingsPanel, showPrefillConfirm]);

  // -- Projection scenario state -------------------------------------------
  const [scenarioPreset, setScenarioPreset] = useState('current');
  const [scenarioParams, setScenarioParams] = useState({
    entreesAdj: 0,     // % adjustment on avg monthly entrées (-50 to +100)
    sortiesAdj: 0,     // % adjustment on avg monthly sorties (-50 to +100)
    extraEntree: 0,    // fixed additional monthly entrée (€)
    extraSortie: 0,    // fixed additional monthly sortie (€)
  });

  const handleScenarioPreset = useCallback((presetKey) => {
    const preset = SCENARIO_PRESETS.find(p => p.key === presetKey);
    if (preset) {
      setScenarioPreset(presetKey);
      setScenarioParams({
        entreesAdj: preset.entreesAdj,
        sortiesAdj: preset.sortiesAdj,
        extraEntree: preset.extraEntree,
        extraSortie: preset.extraSortie,
      });
    }
  }, []);

  const handleScenarioSlider = useCallback((field, value) => {
    setScenarioPreset('custom');
    setScenarioParams(prev => ({ ...prev, [field]: value }));
  }, []);

  // ── Auto-sync: factures → entree previsions ──────────────────────
  const syncedIdsRef = useRef(null);
  useEffect(() => {
    if (tresorerieLoading) return;
    if (!syncedIdsRef.current) syncedIdsRef.current = getSyncedIds();

    const factures = devis.filter(d => d.type === 'facture' && !['refuse', 'brouillon'].includes(d.statut));
    const synced = syncedIdsRef.current;
    const newPrevisions = [];

    factures.forEach(f => {
      if (synced.devis.includes(f.id)) return;
      if (previsions.some(p => p.linkedId === f.id && p.source === 'auto_facture')) return;

      const client = clients.find(c => c.id === f.client_id);
      const reste = (f.total_ttc || 0) - (f.montant_paye || 0);
      if (reste <= 0) return;

      newPrevisions.push({
        id: genId(),
        type: 'entree',
        description: `Facture ${f.numero || f.id?.slice(-6) || '—'} – ${client?.nom || 'Client'}`,
        montant: reste,
        date: f.date_echeance || f.date_validite || f.date || new Date().toISOString().slice(0, 10),
        categorie: 'Client',
        recurrence: 'unique',
        statut: (f.statut === 'payee' || f.statut === 'paye') ? 'paye' : 'prevu',
        source: 'auto_facture',
        linkedId: f.id,
        createdAt: new Date().toISOString(),
      });
      synced.devis.push(f.id);
    });

    if (newPrevisions.length > 0) {
      setPrevisions(list => [...list, ...newPrevisions]);
      syncedIdsRef.current = synced;
      saveSyncedIds(synced);
    }
  }, [devis, clients, tresorerieLoading]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Auto-sync: depenses → sortie previsions ──────────────────────
  useEffect(() => {
    if (tresorerieLoading) return;
    if (!syncedIdsRef.current) syncedIdsRef.current = getSyncedIds();

    const synced = syncedIdsRef.current;
    const newPrevisions = [];

    depenses.forEach(dep => {
      if (synced.depenses.includes(dep.id)) return;
      if (previsions.some(p => p.linkedId === dep.id && p.source === 'auto_depense')) return;
      if (!dep.montant || dep.montant <= 0) return;

      newPrevisions.push({
        id: genId(),
        type: 'sortie',
        description: dep.description || dep.libelle || `Dépense ${dep.fournisseur || dep.categorie || ''}`.trim(),
        montant: dep.montant,
        date: dep.date || dep.createdAt || new Date().toISOString().slice(0, 10),
        categorie: dep.categorie || 'Fournisseur',
        recurrence: 'unique',
        statut: 'paye',
        source: 'auto_depense',
        linkedId: dep.id,
        createdAt: new Date().toISOString(),
      });
      synced.depenses.push(dep.id);
    });

    if (newPrevisions.length > 0) {
      setPrevisions(list => [...list, ...newPrevisions]);
      syncedIdsRef.current = synced;
      saveSyncedIds(synced);
    }
  }, [depenses, tresorerieLoading]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Auto-sync: devis acceptés (signés) → entree previsions ─────
  useEffect(() => {
    if (tresorerieLoading) return;
    if (!syncedIdsRef.current) syncedIdsRef.current = getSyncedIds();

    const acceptedDevis = devis.filter(d => d.type === 'devis' && d.statut === 'accepte');
    const synced = syncedIdsRef.current;
    if (!synced.acceptedDevis) synced.acceptedDevis = [];
    const newPrevisions = [];

    acceptedDevis.forEach(d => {
      if (synced.acceptedDevis.includes(d.id)) return;
      if (previsions.some(p => p.linkedId === d.id && p.source === 'auto_devis_accepte')) return;

      const client = clients.find(c => c.id === d.client_id);
      newPrevisions.push({
        id: genId(),
        type: 'entree',
        description: `Devis signé ${d.numero || d.id?.slice(-6) || '—'} – ${client?.nom || 'Client'}`,
        montant: d.total_ttc || 0,
        date: d.date_validite || d.date || new Date().toISOString().slice(0, 10),
        categorie: 'Client',
        recurrence: 'unique',
        statut: 'prevu',
        source: 'auto_devis_accepte',
        linkedId: d.id,
        createdAt: new Date().toISOString(),
      });
      synced.acceptedDevis.push(d.id);
    });

    if (newPrevisions.length > 0) {
      setPrevisions(list => [...list, ...newPrevisions]);
      syncedIdsRef.current = synced;
      saveSyncedIds(synced);
    }
  }, [devis, clients, tresorerieLoading]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Auto-sync: paiements reçus → mouvements réels ────────────
  useEffect(() => {
    if (tresorerieLoading || !paiements.length) return;
    if (!syncedIdsRef.current) syncedIdsRef.current = getSyncedIds();

    const synced = syncedIdsRef.current;
    if (!synced.paiements) synced.paiements = [];
    const newMouvements = [];

    paiements.forEach(p => {
      if (synced.paiements.includes(p.id)) return;
      if (mouvements.some(m => m.linkedPaiementId === p.id)) return;

      const montant = p.montant || p.amount || 0;
      if (montant <= 0) return;

      newMouvements.push({
        id: genId(),
        type: 'entree',
        description: `Paiement reçu ${p.documentNumero || p.document || ''} – ${montant.toLocaleString('fr-FR')} €`,
        montant,
        date: p.date || p.createdAt?.slice?.(0, 10) || new Date().toISOString().slice(0, 10),
        categorie: 'Client',
        statut: 'paye',
        linkedPaiementId: p.id,
        devisId: p.devisId || p.facture_id,
        createdAt: new Date().toISOString(),
      });
      synced.paiements.push(p.id);
    });

    if (newMouvements.length > 0) {
      newMouvements.forEach(m => addMouvement(m));
      syncedIdsRef.current = synced;
      saveSyncedIds(synced);
    }
  }, [paiements, tresorerieLoading]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Auto-renewal: generate missing future recurring instances ───
  const renewalDoneRef = useRef(false);
  useEffect(() => {
    if (tresorerieLoading || renewalDoneRef.current || previsions.length === 0) return;
    renewalDoneRef.current = true;

    // Limit auto-renewal to 3 months ahead (not 12) to avoid over-generation
    const maxFutureMonths = 3;
    const maxDate = new Date();
    maxDate.setMonth(maxDate.getMonth() + maxFutureMonths);
    const now = new Date();
    const newInstances = [];

    // Build a global dedup key set: description + YYYY-MM + montant
    const globalDedup = new Set(
      previsions.map(p => {
        const d = new Date(p.date);
        return `${p.description}|${d.getFullYear()}-${String(d.getMonth()).padStart(2, '0')}|${p.montant}`;
      })
    );

    // Find parent recurring previsions (those with recurrence !== 'unique' and no recurrenceParentId)
    const parents = previsions.filter(p => p.recurrence && p.recurrence !== 'unique' && !p.recurrenceParentId);

    parents.forEach(parent => {
      const interval = parent.recurrence === 'mensuel' ? 1 : parent.recurrence === 'trimestriel' ? 3 : 12;
      // Find all existing instances (children + parent itself)
      const family = previsions.filter(p => p.id === parent.id || p.recurrenceParentId === parent.id);
      const existingDates = new Set(family.map(p => p.date));

      // Find the latest date in the family
      const latestDate = family.reduce((max, p) => {
        const d = new Date(p.date);
        return d > max ? d : max;
      }, new Date(parent.date));

      // Generate instances from the latest date forward
      let nextDate = new Date(latestDate);
      for (let i = 0; i < 4; i++) {
        nextDate = new Date(nextDate);
        nextDate.setMonth(nextDate.getMonth() + interval);
        if (nextDate > maxDate) break;
        if (nextDate < now) continue; // skip past dates
        const dateStr = nextDate.toISOString().slice(0, 10);
        if (existingDates.has(dateStr)) continue;

        // Strong dedup: check description + month + montant
        const dedupKey = `${parent.description}|${nextDate.getFullYear()}-${String(nextDate.getMonth()).padStart(2, '0')}|${parent.montant}`;
        if (globalDedup.has(dedupKey)) continue;
        globalDedup.add(dedupKey);

        existingDates.add(dateStr);
        newInstances.push({
          ...parent,
          id: genId(),
          date: dateStr,
          statut: 'prevu',
          recurrenceParentId: parent.id,
          createdAt: new Date().toISOString(),
        });
      }
    });

    if (newInstances.length > 0) {
      setPrevisions(list => [...list, ...newInstances]);
      // Save each to backend
      newInstances.forEach(inst => addPrevision(inst).catch(() => {}));
    }
  }, [previsions, tresorerieLoading]); // eslint-disable-line react-hooks/exhaustive-deps

  // CRUD handlers (delegate to hook)
  const handleSavePrevision = useCallback(async (prev) => {
    const existing = previsions.find(p => p.id === prev.id);
    if (existing) {
      await updatePrevision(prev.id, prev);
    } else {
      await addPrevision(prev);
      // Generate recurring instances
      if (prev.recurrence && prev.recurrence !== 'unique') {
        const instances = generateRecurring(prev);
        for (const inst of instances) {
          await addPrevision(inst);
        }
      }
    }
    setEditingItem(null);
  }, [previsions, addPrevision, updatePrevision]);

  const handleDeletePrevision = useCallback(async (id) => {
    await hookDeletePrevision(id);
  }, [hookDeletePrevision]);

  const handleMarkAsPaid = useCallback(async (id) => {
    await hookMarkAsPaid(id);

    // Auto-renewal: if the prevision is recurring, generate the next instance
    const paid = previsions.find(p => p.id === id);
    if (paid && paid.recurrence && paid.recurrence !== 'unique') {
      const interval = paid.recurrence === 'mensuel' ? 1 : paid.recurrence === 'trimestriel' ? 3 : 12;
      const paidDate = new Date(paid.date);
      const nextDate = new Date(paidDate);
      nextDate.setMonth(nextDate.getMonth() + interval);
      // Only generate if within 12 months from now
      const maxDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
      if (nextDate <= maxDate) {
        // Check if next instance already exists
        const nextDateStr = nextDate.toISOString().slice(0, 10);
        const alreadyExists = previsions.some(p =>
          p.recurrenceParentId === (paid.recurrenceParentId || paid.id) &&
          p.date === nextDateStr && p.statut === 'prevu'
        );
        if (!alreadyExists) {
          await addPrevision({
            ...paid,
            id: genId(),
            date: nextDateStr,
            statut: 'prevu',
            recurrenceParentId: paid.recurrenceParentId || paid.id,
            createdAt: new Date().toISOString(),
          });
        }
      }
    }
  }, [hookMarkAsPaid, previsions, addPrevision]);

  // WhatsApp relance for overdue invoices
  const handleWhatsAppRelance = useCallback((item) => {
    const msg = encodeURIComponent(
      `Bonjour ${item.clientNom},\n\nJe me permets de vous relancer concernant la facture n°${item.numero} d'un montant de ${formatCurrency(item.montant)} €.\n\n${item.joursRetard > 0 ? `Cette facture est en retard de ${item.joursRetard} jour${item.joursRetard > 1 ? 's' : ''}. ` : ''}Pourriez-vous procéder au règlement ?\n\nMerci d'avance,\nCordialement`
    );
    const tel = (item.clientTel || '').replace(/\s/g, '').replace(/^0/, '+33');
    window.open(`https://wa.me/${tel}?text=${msg}`, '_blank');
  }, []);

  // Mark an invoice as paid from the encaisser widget
  const handleEncaisserMarkPaid = useCallback(async (item) => {
    // Find the matching prevision and mark it paid
    const match = previsions.find(p => p.linkedId === item.id && p.type === 'entree' && p.statut === 'prevu');
    if (match) {
      await hookMarkAsPaid(match.id);
    }
  }, [previsions, hookMarkAsPaid]);

  // Add BTP charge as prevision
  const handleAddBTPCharge = useCallback(async (charge) => {
    const now = new Date();
    const date = new Date(now.getFullYear(), now.getMonth(), 5);
    await addPrevision({
      id: genId(),
      type: 'sortie',
      description: charge.label,
      montant: charge.montantMoyen,
      date: date.toISOString().slice(0, 10),
      categorie: charge.categorie || 'Divers',
      recurrence: charge.recurrence || 'mensuel',
      statut: 'prevu',
      source: 'btp_charge',
      createdAt: new Date().toISOString(),
    });
  }, [addPrevision]);

  const handleEditPrevision = useCallback((item) => {
    setEditingItem(item);
    setShowAddModal(true);
  }, []);

  // ── Mouvement handlers ─────────────────────────────────────────────
  const handleSaveMouvement = useCallback(async (mouv) => {
    if (editingMouv) {
      await updateMouvement(mouv.id, mouv);
    } else {
      await addMouvement(mouv);
    }
    setEditingMouv(null);
  }, [editingMouv, addMouvement, updateMouvement]);

  const handleEditMouvement = useCallback((item) => {
    setEditingMouv(item);
    setShowMouvModal(true);
  }, []);

  const handleDeleteMouvement = useCallback(async (id) => {
    await deleteMouvement(id);
  }, [deleteMouvement]);

  const handleValiderMouvement = useCallback(async (id) => {
    await validerMouvement(id);
  }, [validerMouvement]);

  // Filtered mouvements for Mouvements tab
  const filteredMouvements = useMemo(() => {
    let result = [...mouvements];
    if (mouvFilter !== 'all') result = result.filter(m => m.type === mouvFilter);
    if (mouvStatutFilter !== 'all') result = result.filter(m => m.statut === mouvStatutFilter);
    return result.sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [mouvements, mouvFilter, mouvStatutFilter]);

  const handlePrefill = useCallback(async () => {
    // Dedup: skip templates that already exist (same description)
    const existingDescs = new Set(previsions.map(p => p.description?.toLowerCase().trim()));
    const toAdd = STARTER_TEMPLATES.filter(t => !existingDescs.has(t.description.toLowerCase().trim()));
    if (toAdd.length === 0) return;

    const now = new Date();
    const baseDate = new Date(now.getFullYear(), now.getMonth(), 5);
    for (let i = 0; i < toAdd.length; i++) {
      const tmpl = toAdd[i];
      const date = new Date(baseDate);
      date.setDate(date.getDate() + i * 3);
      await addPrevision({
        ...tmpl,
        id: genId(),
        date: date.toISOString().slice(0, 10),
        statut: 'prevu',
        createdAt: new Date().toISOString(),
      });
    }
    setShowPrefillConfirm(false);
  }, [addPrevision, previsions]);

  // Generate recurring instances helper (3 months ahead max to avoid duplication with auto-renewal)
  const generateRecurring = (parent) => {
    const instances = [];
    const startDate = new Date(parent.date);
    const interval = parent.recurrence === 'mensuel' ? 1 : parent.recurrence === 'trimestriel' ? 3 : 12;
    const maxMonths = 3; // Only create 3 months ahead; auto-renewal handles the rest
    const maxIterations = Math.ceil(maxMonths / interval);
    for (let i = 1; i <= maxIterations; i++) {
      const nextDate = new Date(startDate);
      nextDate.setMonth(nextDate.getMonth() + interval * i);
      if (nextDate > new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)) break;
      instances.push({
        ...parent,
        id: genId(),
        date: nextDate.toISOString().slice(0, 10),
        recurrenceParentId: parent.id,
        statut: 'prevu',
      });
    }
    return instances;
  };

  // -- Derived data ---------------------------------------------------------
  const now = useMemo(() => new Date(), []);

  const {
    soldeActuel, totalEncaisse, totalDepense,
    entreesPrevues, sortiesPrevues, projectionFinMois,
    monthlyData, upcomingPayments,
    alertNegativeBalance, alertLargePayment, trendSolde,
    autoSyncCount,
    projections, negativeMonth, thresholdMonth, avgMonthlyEntrees, avgMonthlySorties,
    recurringSummary,
  } = useMemo(() => {
    // 1. Classify devis / factures
    const factures = devis.filter((d) => d.type === 'facture');
    const facturesPayees = factures.filter((f) => f.statut === 'payee' || f.statut === 'paye');
    const facturesImpayees = factures.filter((f) => !['payee', 'paye'].includes(f.statut) && f.statut !== 'refuse' && f.statut !== 'brouillon');

    // Devis acceptés (signés) qui ne sont pas encore facturés = revenus attendus
    const devisAcceptes = devis.filter((d) =>
      d.type === 'devis' && ['accepte', 'acompte_facture'].includes(d.statut)
    );

    const totalEnc = facturesPayees.reduce((s, f) => s + (f.total_ttc || 0), 0);
    const totalDep = depenses.reduce((s, d) => s + (d.montant || 0), 0);

    // Deduplicate previsions for KPI calculations (same desc + month + montant + type = 1 entry)
    const kpiDedup = new Set();
    const dedupPrevisions = previsions.filter(p => {
      const d = new Date(p.date);
      const key = `${p.description}|${d.getFullYear()}-${String(d.getMonth()).padStart(2, '0')}|${p.montant}|${p.type}`;
      if (kpiDedup.has(key)) return false;
      kpiDedup.add(key);
      return true;
    });

    // Include paid previsions (user-entered income/expenses)
    const paidPrevEntrees = dedupPrevisions.filter(p => p.type === 'entree' && p.statut === 'paye').reduce((s, p) => s + (p.montant || 0), 0);
    const paidPrevSorties = dedupPrevisions.filter(p => p.type === 'sortie' && p.statut === 'paye').reduce((s, p) => s + (p.montant || 0), 0);

    const solde = (settings.soldeInitial || 0) + totalEnc + paidPrevEntrees - totalDep - paidPrevSorties;

    // Period scope
    const monthsAhead = periodMonths(period);
    const futureLimit = new Date(now);
    futureLimit.setMonth(futureLimit.getMonth() + monthsAhead);

    // Entrées prévues des devis acceptés (signés mais pas encore facturés)
    const devisAcceptesTotal = devisAcceptes.reduce((s, d) => {
      const montant = (d.total_ttc || 0) - (d.montant_paye || 0);
      return s + Math.max(montant, 0);
    }, 0);

    // Entrees prevues = unpaid invoices + devis acceptés + pending entree previsions (within period)
    const entPrev = facturesImpayees.reduce((s, f) => {
      const echeance = new Date(f.date_echeance || f.date_validite || f.date);
      if (echeance < now || echeance > futureLimit) return s;
      const reste = (f.total_ttc || 0) - (f.montant_paye || 0);
      return s + Math.max(reste, 0);
    }, 0) + devisAcceptesTotal + dedupPrevisions
      .filter(p => p.type === 'entree' && p.statut === 'prevu' && new Date(p.date) >= now && new Date(p.date) <= futureLimit)
      .reduce((s, p) => s + (p.montant || 0), 0);

    // Sorties prevues = pending sortie previsions within selected period
    const sorPrev = dedupPrevisions
      .filter(p => p.type === 'sortie' && p.statut === 'prevu' && new Date(p.date) >= now && new Date(p.date) <= futureLimit)
      .reduce((s, p) => s + (p.montant || 0), 0);

    const projFin = solde + entPrev - sorPrev;

    // 2. Build monthly buckets
    const numMonths = Math.max(periodMonths(period), 6);
    const pastMonths = Math.min(numMonths, 6);
    const futureMonthsCount = numMonths - pastMonths;

    const buckets = [];
    for (let i = pastMonths - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      buckets.push({ month: d.getMonth(), year: d.getFullYear(), label: MONTH_NAMES[d.getMonth()], entrees: 0, sorties: 0, isCurrent: i === 0, isFuture: false });
    }
    for (let i = 1; i <= futureMonthsCount; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
      buckets.push({ month: d.getMonth(), year: d.getFullYear(), label: MONTH_NAMES[d.getMonth()], entrees: 0, sorties: 0, isCurrent: false, isFuture: true });
    }

    // Populate past months with real data
    facturesPayees.forEach((f) => {
      const d = new Date(f.date_paiement || f.date);
      const mk = monthKey(d);
      const bucket = buckets.find((b) => sameMonth(b, mk));
      if (bucket && !bucket.isFuture) bucket.entrees += f.total_ttc || 0;
    });

    depenses.forEach((dep) => {
      const d = new Date(dep.date || dep.createdAt);
      const mk = monthKey(d);
      const bucket = buckets.find((b) => sameMonth(b, mk));
      if (bucket && !bucket.isFuture) bucket.sorties += dep.montant || 0;
    });

    // Add devis acceptés to current/future month buckets as expected income
    devisAcceptes.forEach((d) => {
      const dateDevis = new Date(d.date_validite || d.date || now);
      const mk = monthKey(dateDevis);
      const bucket = buckets.find((b) => sameMonth(b, mk));
      if (bucket) {
        const reste = (d.total_ttc || 0) - (d.montant_paye || 0);
        if (reste > 0) bucket.entrees += reste;
      }
    });

    // Add ALL previsions (paid = past, pending = future) to their month buckets
    // Deduplicate: same description + same month + same montant = counted only once
    const chartPrevDedup = new Set();
    previsions.forEach((p) => {
      const d = new Date(p.date);
      const dedupKey = `${p.description}|${d.getFullYear()}-${String(d.getMonth()).padStart(2, '0')}|${p.montant}|${p.type}`;
      if (chartPrevDedup.has(dedupKey)) return; // skip duplicate
      chartPrevDedup.add(dedupKey);

      const mk = monthKey(d);
      const bucket = buckets.find((b) => sameMonth(b, mk));
      if (!bucket) return;
      if (p.type === 'entree') bucket.entrees += p.montant || 0;
      else bucket.sorties += p.montant || 0;
    });

    // Cumulative balance starting from solde initial
    let cumul = settings.soldeInitial || 0;
    const chartData = buckets.map((b) => {
      cumul += b.entrees - b.sorties;
      return { ...b, cumulBalance: cumul };
    });

    // 3. Upcoming payments list
    const payments = [];

    // Unpaid invoices as upcoming entrees
    facturesImpayees.forEach((f) => {
      const client = clients.find((c) => c.id === f.client_id);
      const reste = (f.total_ttc || 0) - (f.montant_paye || 0);
      if (reste <= 0) return;
      const isOverdue = new Date(f.date_echeance || f.date_validite || f.date) < now;
      payments.push({
        id: `fac_${f.id}`, date: f.date_echeance || f.date_validite || f.date,
        description: `Facture ${f.numero || f.id?.slice(-6) || '---'} – ${client?.nom || 'Client'}`,
        type: 'entree', montant: reste,
        statut: isOverdue ? 'En retard' : 'En attente',
        source: 'facture', categorie: 'Client',
      });
    });

    // Devis acceptés (signés, pas encore facturés) as upcoming entrees
    devisAcceptes.forEach((d) => {
      const client = clients.find((c) => c.id === d.client_id);
      const reste = (d.total_ttc || 0) - (d.montant_paye || 0);
      if (reste <= 0) return;
      payments.push({
        id: `devis_${d.id}`, date: d.date_validite || d.date || new Date().toISOString(),
        description: `Devis signé ${d.numero || d.id?.slice(-6) || '---'} – ${client?.nom || d.client_nom || 'Client'}`,
        type: 'entree', montant: reste,
        statut: 'Signé',
        source: 'devis_accepte', categorie: 'Client',
      });
    });

    // Recent depenses as historical sorties (last 60 days)
    const sixtyAgo = new Date(now); sixtyAgo.setDate(sixtyAgo.getDate() - 60);
    depenses.filter((d) => new Date(d.date || d.createdAt) >= sixtyAgo).forEach((dep) => {
      payments.push({
        id: `dep_${dep.id}`, date: dep.date || dep.createdAt,
        description: dep.description || dep.libelle || `Dépense ${dep.fournisseur || ''}`,
        type: 'sortie', montant: dep.montant || 0,
        statut: 'Payé', source: 'depense', categorie: dep.categorie || 'Fournisseur',
      });
    });

    // User previsions (with deduplication: same description + same month + same montant = duplicate)
    const prevDedup = new Set();
    previsions.forEach((p) => {
      const d = new Date(p.date);
      const dedupKey = `${p.description}|${d.getFullYear()}-${String(d.getMonth()).padStart(2, '0')}|${p.montant}|${p.type}`;
      if (prevDedup.has(dedupKey)) return; // skip duplicate
      prevDedup.add(dedupKey);

      const isOverdue = p.statut === 'prevu' && d < now;
      payments.push({
        id: p.id, date: p.date, description: p.description,
        type: p.type, montant: p.montant,
        statut: p.statut === 'paye' ? 'Payé' : isOverdue ? 'En retard' : 'Prévu',
        source: 'prevision', categorie: p.categorie || 'Divers',
        recurrence: p.recurrence,
      });
    });

    payments.sort((a, b) => new Date(b.date) - new Date(a.date));

    // 4. Alerts
    const futureNegative = chartData.filter((d) => d.isFuture || d.isCurrent).some((d) => d.cumulBalance < 0);
    const in7 = new Date(now); in7.setDate(in7.getDate() + 7);
    const bigPayment = facturesImpayees.find((f) => {
      const due = new Date(f.date_echeance || f.date);
      const reste = (f.total_ttc || 0) - (f.montant_paye || 0);
      return due <= in7 && due >= now && reste >= 10000;
    });

    const currentBucket = chartData.find((b) => b.isCurrent);
    const prevBucketIdx = chartData.findIndex((b) => b.isCurrent) - 1;
    const prevBucket = prevBucketIdx >= 0 ? chartData[prevBucketIdx] : null;
    let trend = null;
    if (prevBucket && prevBucket.entrees > 0) {
      trend = Math.round(((currentBucket.entrees - prevBucket.entrees) / prevBucket.entrees) * 100);
    }

    // 5. TVA data now comes from useTVA hook (tvaHook)

    // Auto-synced count
    const autoSyncCount = {
      factures: payments.filter(p => p.source === 'auto_facture' || (p.source === 'facture')).length,
      depenses: payments.filter(p => p.source === 'auto_depense' || (p.source === 'depense')).length,
    };

    // 6. Cash flow projections (next 6 months)
    const monthlyRecurring = previsions
      .filter(p => p.recurrence === 'mensuel' && p.type === 'sortie' && p.statut !== 'paye')
      .reduce((s, p) => s + (p.montant || 0), 0) || 0;

    const avgMonthlyEntrees = (() => {
      const past6 = chartData.filter(b => !b.isFuture && b.entrees > 0);
      if (past6.length === 0) return 0;
      return past6.reduce((s, b) => s + b.entrees, 0) / past6.length;
    })();

    const avgMonthlySorties = (() => {
      const past6 = chartData.filter(b => !b.isFuture && b.sorties > 0);
      if (past6.length === 0) return monthlyRecurring;
      return past6.reduce((s, b) => s + b.sorties, 0) / past6.length;
    })();

    const projections = [];
    let projBalance = solde;
    for (let i = 1; i <= 6; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
      // Use scheduled previsions for this month, or fallback to averages
      const mk = { month: d.getMonth(), year: d.getFullYear() };
      const scheduledEntrees = previsions.filter(p => p.type === 'entree' && p.statut === 'prevu' && sameMonth(monthKey(new Date(p.date)), mk)).reduce((s, p) => s + (p.montant || 0), 0);
      const scheduledSorties = previsions.filter(p => p.type === 'sortie' && p.statut === 'prevu' && sameMonth(monthKey(new Date(p.date)), mk)).reduce((s, p) => s + (p.montant || 0), 0);

      const entrees = scheduledEntrees || avgMonthlyEntrees;
      const sorties = scheduledSorties || avgMonthlySorties;
      projBalance += entrees - sorties;
      projections.push({
        mois: MONTH_NAMES[d.getMonth()],
        entrees,
        sorties,
        balance: projBalance,
        isScheduled: scheduledEntrees > 0 || scheduledSorties > 0,
      });
    }

    // When balance will go negative
    const negativeMonth = projections.find(p => p.balance < 0);
    // When balance will go below threshold
    const thresholdMonth = projections.find(p => p.balance < (settings.seuilAlerte || 5000));

    // 7. Recurring summary
    const recurringParents = previsions.filter(p => p.recurrence && p.recurrence !== 'unique' && !p.recurrenceParentId);
    const recurringEntrees = recurringParents.filter(p => p.type === 'entree');
    const recurringSorties = recurringParents.filter(p => p.type === 'sortie');
    const monthlyRecurrEntrees = recurringEntrees.reduce((s, p) => {
      const factor = p.recurrence === 'mensuel' ? 1 : p.recurrence === 'trimestriel' ? 1/3 : 1/12;
      return s + (p.montant || 0) * factor;
    }, 0);
    const monthlyRecurrSorties = recurringSorties.reduce((s, p) => {
      const factor = p.recurrence === 'mensuel' ? 1 : p.recurrence === 'trimestriel' ? 1/3 : 1/12;
      return s + (p.montant || 0) * factor;
    }, 0);
    const recurringSummary = {
      parents: recurringParents,
      totalEntrees: monthlyRecurrEntrees,
      totalSorties: monthlyRecurrSorties,
      net: monthlyRecurrEntrees - monthlyRecurrSorties,
      count: recurringParents.length,
    };

    return {
      soldeActuel: solde, totalEncaisse: totalEnc, totalDepense: totalDep,
      entreesPrevues: entPrev, sortiesPrevues: sorPrev, projectionFinMois: projFin,
      monthlyData: chartData, upcomingPayments: payments,
      alertNegativeBalance: futureNegative, alertLargePayment: bigPayment, trendSolde: trend,
      autoSyncCount,
      projections, negativeMonth, thresholdMonth, avgMonthlyEntrees, avgMonthlySorties,
      recurringSummary,
    };
  }, [devis, depenses, clients, previsions, now, period, settings.soldeInitial]);

  // TVA data from hook (replaces inline computation)
  const { tvaMonthly, tvaTotal, tvaByRate, tvaQuarterly, tvaNextDeadline } = tvaHook;

  // Filtered payments for current tab
  const filteredPayments = useMemo(() => {
    let result = upcomingPayments;
    if (activeTab === 'previsions') result = result.filter((p) => p.statut !== 'Payé');
    else if (activeTab === 'historique') result = result.filter((p) => p.statut === 'Payé');
    if (categoryFilter !== 'all') result = result.filter((p) => p.categorie === categoryFilter);
    return result;
  }, [upcomingPayments, activeTab, categoryFilter]);

  // -- Scenario projections (12 months) -----------------------------------
  const { scenarioProjections, baselineProjections, scenarioSummary } = useMemo(() => {
    const months = 12;
    const baseAvgEntrees = avgMonthlyEntrees || 0;
    const baseAvgSorties = avgMonthlySorties || 0;

    const baseline = [];
    const scenario = [];
    let baseBal = soldeActuel;
    let scenBal = soldeActuel;

    for (let i = 0; i < months; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() + i + 1, 1);
      const mk = { month: d.getMonth(), year: d.getFullYear() };
      const mois = MONTH_NAMES[d.getMonth()];

      // Scheduled previsions for this month
      const scheduledE = previsions.filter(p => p.type === 'entree' && p.statut === 'prevu' && sameMonth(monthKey(new Date(p.date)), mk)).reduce((s, p) => s + (p.montant || 0), 0);
      const scheduledS = previsions.filter(p => p.type === 'sortie' && p.statut === 'prevu' && sameMonth(monthKey(new Date(p.date)), mk)).reduce((s, p) => s + (p.montant || 0), 0);

      const baseE = scheduledE || baseAvgEntrees;
      const baseS = scheduledS || baseAvgSorties;
      baseBal += baseE - baseS;
      baseline.push({ mois, entrees: baseE, sorties: baseS, balance: baseBal });

      // Scenario: apply adjustments
      const adjE = (baseE * (1 + scenarioParams.entreesAdj / 100)) + scenarioParams.extraEntree;
      const adjS = (baseS * (1 + scenarioParams.sortiesAdj / 100)) + scenarioParams.extraSortie;
      scenBal += adjE - adjS;
      scenario.push({ mois, entrees: adjE, sorties: adjS, balance: scenBal });
    }

    // Summary
    const totalBaseEntrees = baseline.reduce((s, b) => s + b.entrees, 0);
    const totalBaseSorties = baseline.reduce((s, b) => s + b.sorties, 0);
    const totalScenEntrees = scenario.reduce((s, b) => s + b.entrees, 0);
    const totalScenSorties = scenario.reduce((s, b) => s + b.sorties, 0);
    const baselineEndBalance = baseline[baseline.length - 1]?.balance || 0;
    const scenarioEndBalance = scenario[scenario.length - 1]?.balance || 0;
    const baseNegMonth = baseline.find(b => b.balance < 0);
    const scenNegMonth = scenario.find(b => b.balance < 0);
    const baseThreshMonth = baseline.find(b => b.balance < (settings.seuilAlerte || 5000));
    const scenThreshMonth = scenario.find(b => b.balance < (settings.seuilAlerte || 5000));

    return {
      baselineProjections: baseline,
      scenarioProjections: scenario,
      scenarioSummary: {
        totalBaseEntrees, totalBaseSorties, totalScenEntrees, totalScenSorties,
        baselineEndBalance, scenarioEndBalance,
        delta: scenarioEndBalance - baselineEndBalance,
        baseNegMonth, scenNegMonth,
        baseThreshMonth, scenThreshMonth,
      },
    };
  }, [soldeActuel, avgMonthlyEntrees, avgMonthlySorties, previsions, now, scenarioParams, settings.seuilAlerte]);

  // -- Render ---------------------------------------------------------------
  const cardBg = isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200';
  const textPrimary = isDark ? 'text-white' : 'text-gray-900';
  const textSecondary = isDark ? 'text-gray-400' : 'text-gray-500';
  const borderColor = isDark ? 'border-slate-700' : 'border-gray-200';
  const inputCls = `w-full px-3 py-2 rounded-lg border text-sm ${isDark ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-gray-300'}`;

  return (
    <div className="space-y-6">
      {/* ── Header ──────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg" style={{ backgroundColor: couleur }}>
            <Wallet size={24} className="text-white" />
          </div>
          <div>
            <h1 className={`text-2xl font-bold ${textPrimary}`}>Trésorerie</h1>
            <p className={`text-sm ${textSecondary}`}>
              Solde actuel :{' '}
              <span className={`font-bold ${soldeActuel >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                {formatMoney(soldeActuel)}
              </span>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {/* Settings */}
          <div className="relative">
            <button onClick={() => setShowSettingsPanel(!showSettingsPanel)}
              className={`p-2 rounded-xl border transition-colors ${isDark ? 'border-slate-700 hover:bg-slate-700 text-slate-400' : 'border-gray-200 hover:bg-gray-50 text-gray-500'}`}
              title="Paramètres trésorerie">
              <Settings size={18} />
            </button>
            {showSettingsPanel && (
              <div className={`absolute right-0 top-full mt-2 z-30 p-4 rounded-xl border shadow-lg ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'}`} style={{ minWidth: 260 }}>
                <h4 className={`text-sm font-bold mb-3 ${textPrimary}`}>Paramètres trésorerie</h4>
                <div className="space-y-3">
                  <div>
                    <label className={`block text-xs font-medium mb-1 ${textSecondary}`}>Solde initial (€)</label>
                    <input type="number" value={settings.soldeInitial || ''} placeholder="0"
                      onChange={(e) => updateSettings({ soldeInitial: parseFloat(e.target.value) || 0 })}
                      className={inputCls} />
                    <p className={`text-[10px] mt-0.5 ${textSecondary}`}>Votre solde bancaire au démarrage</p>
                  </div>
                  <div>
                    <label className={`block text-xs font-medium mb-1 ${textSecondary}`}>Date du solde initial</label>
                    <input type="date" value={settings.soldeDate || ''}
                      onChange={(e) => updateSettings({ soldeDate: e.target.value })}
                      className={inputCls} />
                  </div>
                  <div>
                    <label className={`block text-xs font-medium mb-1 ${textSecondary}`}>Seuil d'alerte (€)</label>
                    <input type="number" value={settings.seuilAlerte || ''} placeholder="5000"
                      onChange={(e) => updateSettings({ seuilAlerte: parseInt(e.target.value) || 0 })}
                      className={inputCls} />
                    <p className={`text-[10px] mt-0.5 ${textSecondary}`}>Alerte si le solde passe sous ce montant</p>
                  </div>
                  <div className={`pt-3 mt-1 border-t ${isDark ? 'border-slate-600' : 'border-gray-200'}`}>
                    <label className={`block text-xs font-medium mb-1 ${textSecondary}`}>Régime TVA</label>
                    <select value={settings.regimeTva || 'trimestriel'}
                      onChange={(e) => updateSettings({ regimeTva: e.target.value })}
                      className={inputCls}>
                      <option value="mensuel">Réel normal (mensuel)</option>
                      <option value="trimestriel">Réel simplifié (trimestriel)</option>
                      <option value="franchise">Franchise en base</option>
                    </select>
                    <p className={`text-[10px] mt-0.5 ${textSecondary}`}>
                      {(settings.regimeTva || 'trimestriel') === 'mensuel' ? 'Déclaration le 24 de chaque mois' :
                       (settings.regimeTva || 'trimestriel') === 'trimestriel' ? 'Déclaration trimestrielle' :
                       'Non assujetti à la TVA'}
                    </p>
                  </div>
                  <div>
                    <label className={`block text-xs font-medium mb-1 ${textSecondary}`}>N° TVA intracommunautaire</label>
                    <input type="text" value={settings.numeroTva || ''} placeholder="FR XX XXXXXXXXX"
                      onChange={(e) => updateSettings({ numeroTva: e.target.value })}
                      className={inputCls} />
                  </div>
                </div>
                <button onClick={() => setShowSettingsPanel(false)}
                  className="mt-3 text-xs font-medium w-full py-2 rounded-lg text-white" style={{ backgroundColor: couleur }}>
                  Fermer
                </button>
              </div>
            )}
          </div>
          {/* Period toggle */}
          <div className={`inline-flex rounded-xl p-1 ${isDark ? 'bg-slate-800 border border-slate-700' : 'bg-gray-100'}`}>
            {PERIOD_OPTIONS.map((opt) => (
              <button key={opt.key} onClick={() => setPeriod(opt.key)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${period === opt.key ? isDark ? 'bg-slate-700 text-white shadow-sm' : 'bg-white text-gray-900 shadow-sm' : isDark ? 'text-gray-400 hover:text-gray-200' : 'text-gray-500 hover:text-gray-700'}`}>
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Threshold Alert (hidden during wizard) ─────────────────── */}
      {(!showWizard || wizardStep >= 2) && soldeActuel < (settings.seuilAlerte || 5000) && !alertDismissed && (
        <div className={`flex items-start gap-3 p-4 rounded-2xl border ${soldeActuel < 0 ? isDark ? 'bg-red-500/10 border-red-500/30' : 'bg-red-50 border-red-200' : isDark ? 'bg-amber-500/10 border-amber-500/30' : 'bg-amber-50 border-amber-200'}`}>
          <AlertTriangle size={20} className={`flex-shrink-0 mt-0.5 ${soldeActuel < 0 ? (isDark ? 'text-red-400' : 'text-red-600') : (isDark ? 'text-amber-400' : 'text-amber-600')}`} />
          <div className="flex-1">
            <p className={`text-sm font-semibold ${soldeActuel < 0 ? (isDark ? 'text-red-300' : 'text-red-800') : (isDark ? 'text-amber-300' : 'text-amber-800')}`}>
              Solde en dessous du seuil d'alerte ({formatMoney(settings.seuilAlerte || 5000)})
            </p>
            <p className={`text-xs mt-0.5 ${soldeActuel < 0 ? (isDark ? 'text-red-400' : 'text-red-600') : (isDark ? 'text-amber-400' : 'text-amber-600')}`}>
              Votre solde actuel de {formatMoney(soldeActuel)} est inférieur au seuil configuré.
            </p>
            <div className="flex items-center gap-3 mt-2">
              <button onClick={() => setShowSettingsPanel(true)}
                className={`text-xs font-medium px-3 py-1.5 rounded-lg transition-colors ${soldeActuel < 0 ? isDark ? 'bg-red-500/20 text-red-300 hover:bg-red-500/30' : 'bg-red-100 text-red-700 hover:bg-red-200' : isDark ? 'bg-amber-500/20 text-amber-300 hover:bg-amber-500/30' : 'bg-amber-100 text-amber-700 hover:bg-amber-200'}`}>
                Modifier le seuil
              </button>
              <button onClick={() => { setAlertDismissed(true); try { localStorage.setItem('cp_treso_alert_dismissed', '1'); } catch {} }}
                className={`text-xs ${soldeActuel < 0 ? (isDark ? 'text-red-400' : 'text-red-500') : (isDark ? 'text-amber-400' : 'text-amber-500')} hover:underline`}>
                Ne plus afficher
              </button>
            </div>
          </div>
          <button onClick={() => { setAlertDismissed(true); try { localStorage.setItem('cp_treso_alert_dismissed', '1'); } catch {} }}
            className={`flex-shrink-0 p-1 rounded-lg transition-colors ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-100'}`}>
            <X size={16} className={soldeActuel < 0 ? (isDark ? 'text-red-400' : 'text-red-500') : (isDark ? 'text-amber-400' : 'text-amber-500')} />
          </button>
        </div>
      )}

      {(!showWizard || wizardStep >= 2) && alertNegativeBalance && (
        <div className={`flex items-start gap-3 p-4 rounded-2xl border ${isDark ? 'bg-amber-500/10 border-amber-500/30' : 'bg-amber-50 border-amber-200'}`}>
          <AlertTriangle size={20} className={isDark ? 'text-amber-400' : 'text-amber-600'} />
          <div>
            <p className={`text-sm font-semibold ${isDark ? 'text-amber-300' : 'text-amber-800'}`}>Attention : solde négatif prévu</p>
            <p className={`text-xs mt-0.5 ${isDark ? 'text-amber-400' : 'text-amber-600'}`}>La projection indique un solde négatif dans les 30 prochains jours. Pensez à relancer vos factures impayées.</p>
          </div>
        </div>
      )}

      {(!showWizard || wizardStep >= 2) && alertLargePayment && (
        <div className={`flex items-start gap-3 p-4 rounded-2xl border ${isDark ? 'bg-blue-500/10 border-blue-500/30' : 'bg-blue-50 border-blue-200'}`}>
          <Info size={20} className={isDark ? 'text-blue-400' : 'text-blue-600'} />
          <div>
            <p className={`text-sm font-semibold ${isDark ? 'text-blue-300' : 'text-blue-800'}`}>Paiement important attendu</p>
            <p className={`text-xs mt-0.5 ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>Facture {alertLargePayment.numero || ''} de {formatMoney(alertLargePayment.total_ttc)} attendue dans les 7 prochains jours.</p>
          </div>
        </div>
      )}

      {/* ── Wizard bootstrapping (Feature 4) ─────────────────────── */}
      {showWizard && wizardStep < 2 && (
        <div className={`rounded-2xl border overflow-hidden ${isDark ? 'bg-gradient-to-br from-slate-800 to-slate-800/80 border-slate-700' : 'bg-gradient-to-br from-white to-blue-50/30 border-blue-200'}`}>
          {/* Progress */}
          <div className="flex items-center gap-0 px-5 pt-4 pb-2">
            {[0, 1].map(s => (
              <React.Fragment key={s}>
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                  wizardStep >= s ? 'text-white' : isDark ? 'bg-slate-700 text-slate-500' : 'bg-gray-200 text-gray-400'
                }`} style={wizardStep >= s ? { backgroundColor: couleur } : undefined}>
                  {wizardStep > s ? <Check size={14} /> : s + 1}
                </div>
                {s < 1 && <div className={`flex-1 h-0.5 mx-2 rounded ${wizardStep > s ? '' : isDark ? 'bg-slate-700' : 'bg-gray-200'}`} style={wizardStep > s ? { backgroundColor: couleur } : undefined} />}
              </React.Fragment>
            ))}
          </div>

          {wizardStep === 0 && (
            <div className="px-5 pb-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${couleur}20`, color: couleur }}>
                  <Wallet size={20} />
                </div>
                <div>
                  <h3 className={`text-base font-bold ${textPrimary}`}>Bienvenue dans la Trésorerie</h3>
                  <p className={`text-sm ${textSecondary}`}>Étape 1/2 : Votre solde bancaire actuel</p>
                </div>
              </div>
              <div className="space-y-3">
                <div>
                  <label className={`block text-xs font-medium mb-1 ${textSecondary}`}>Solde actuel de votre compte (€)</label>
                  <input type="number" placeholder="ex: 15000"
                    value={settings.soldeInitial || ''}
                    onChange={(e) => updateSettings({ soldeInitial: parseFloat(e.target.value) || 0 })}
                    className={`w-full px-4 py-3 rounded-xl border text-lg font-bold ${isDark ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-gray-300'}`}
                  />
                  <p className={`text-[10px] mt-1 ${textSecondary}`}>Ce sera votre point de départ pour les projections</p>
                </div>
                <button onClick={() => setWizardStep(1)}
                  className="w-full py-3 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90"
                  style={{ backgroundColor: couleur }}>
                  Suivant →
                </button>
              </div>
            </div>
          )}

          {wizardStep === 1 && (
            <div className="px-5 pb-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${couleur}20`, color: couleur }}>
                  <Zap size={20} />
                </div>
                <div>
                  <h3 className={`text-base font-bold ${textPrimary}`}>Vos charges mensuelles</h3>
                  <p className={`text-sm ${textSecondary}`}>Étape 2/2 : Sélectionnez et ajustez</p>
                </div>
              </div>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {STARTER_TEMPLATES.map((tmpl) => {
                  const isSelected = wizardCharges[tmpl.description] !== undefined;
                  return (
                    <div key={tmpl.description}
                      className={`flex items-center gap-3 px-3 py-2 rounded-xl border transition-colors cursor-pointer ${
                        isSelected
                          ? isDark ? 'border-blue-500/50 bg-blue-500/10' : 'border-blue-300 bg-blue-50'
                          : isDark ? 'border-slate-600 bg-slate-700/40 hover:bg-slate-700/60' : 'border-gray-200 bg-white hover:bg-gray-50'
                      }`}
                      onClick={() => {
                        if (isSelected) {
                          setWizardCharges(prev => { const n = { ...prev }; delete n[tmpl.description]; return n; });
                        } else {
                          setWizardCharges(prev => ({ ...prev, [tmpl.description]: tmpl.montant }));
                        }
                      }}>
                      <div className={`w-5 h-5 rounded border flex items-center justify-center flex-shrink-0 transition-colors ${
                        isSelected ? 'border-blue-500 bg-blue-500' : isDark ? 'border-slate-500' : 'border-gray-300'
                      }`}>
                        {isSelected && <Check size={12} className="text-white" />}
                      </div>
                      <span className={`flex-1 text-sm ${textPrimary}`}>{tmpl.description}</span>
                      {isSelected ? (
                        <input type="number" value={wizardCharges[tmpl.description]}
                          onClick={(e) => e.stopPropagation()}
                          onChange={(e) => setWizardCharges(prev => ({ ...prev, [tmpl.description]: Number(e.target.value) || 0 }))}
                          className={`w-24 px-2 py-1 rounded-lg border text-sm text-right font-semibold ${isDark ? 'bg-slate-600 border-slate-500 text-white' : 'bg-white border-gray-200'}`}
                        />
                      ) : (
                        <span className={`text-xs ${textSecondary}`}>{formatCurrency(tmpl.montant)}/mois</span>
                      )}
                    </div>
                  );
                })}
              </div>
              <div className="flex items-center gap-3 mt-4">
                <button onClick={() => setWizardStep(0)}
                  className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${isDark ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-700'}`}>
                  {'\u2190'} Retour
                </button>
                <button onClick={handleWizardFinish}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90"
                  style={{ backgroundColor: couleur }}>
                  {Object.keys(wizardCharges).length > 0
                    ? `Ajouter ${Object.keys(wizardCharges).length} charge${Object.keys(wizardCharges).length > 1 ? 's' : ''} et commencer`
                    : 'Commencer sans charges'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Widget "À encaisser maintenant" (hidden during wizard) ── */}
      {(!showWizard || wizardStep >= 2) && encaisserData.items.length > 0 && showEncaisserWidget && (
        <div className={`rounded-2xl border overflow-hidden ${encaisserData.overdueItems.length > 0 ? isDark ? 'border-orange-500/40' : 'border-orange-300' : isDark ? 'border-slate-700' : 'border-gray-200'}`}>
          {/* Header */}
          <div className={`flex items-center justify-between px-5 py-3 ${encaisserData.overdueItems.length > 0 ? isDark ? 'bg-orange-500/10' : 'bg-orange-50' : isDark ? 'bg-slate-800' : 'bg-white'}`}>
            <div className="flex items-center gap-3">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${encaisserData.overdueItems.length > 0 ? 'bg-orange-500/20' : isDark ? 'bg-emerald-500/20' : 'bg-emerald-100'}`}>
                <Banknote size={18} className={encaisserData.overdueItems.length > 0 ? 'text-orange-500' : 'text-emerald-500'} />
              </div>
              <div>
                <h3 className={`text-sm font-bold ${textPrimary}`}>
                  À encaisser maintenant
                </h3>
                <p className={`text-xs ${textSecondary}`}>
                  {encaisserData.items.length} facture{encaisserData.items.length > 1 ? 's' : ''} {'\u2022'} {formatMoney(encaisserData.totalAEncaisser)} TTC
                  {encaisserData.overdueItems.length > 0 && (
                    <span className={`ml-2 font-semibold ${isDark ? 'text-orange-400' : 'text-orange-600'}`}>
                      dont <strong className="text-red-500">{formatMoney(encaisserData.overdueTotal)}</strong> en retard
                    </span>
                  )}
                </p>
              </div>
            </div>
            <button onClick={() => setShowEncaisserWidget(false)}
              className={`p-1.5 rounded-lg transition-colors ${isDark ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-gray-100 text-gray-400'}`}
              title="Masquer">
              <X size={16} />
            </button>
          </div>

          {/* Items list */}
          <div className={`divide-y ${isDark ? 'divide-slate-700/50 bg-slate-800/60' : 'divide-gray-100 bg-white'}`}>
            {encaisserData.items.slice(0, 5).map((item) => (
              <div key={item.id} className={`flex items-center gap-3 px-5 py-3 transition-colors ${isDark ? 'hover:bg-slate-700/40' : 'hover:bg-gray-50'}`}>
                {/* Overdue indicator */}
                <div className="flex items-center gap-1 flex-shrink-0">
                  <div className={`w-2.5 h-2.5 rounded-full ${item.isOverdue ? item.joursRetard > 14 ? 'bg-red-600' : item.joursRetard > 7 ? 'bg-red-500' : 'bg-orange-400' : 'bg-emerald-400'}`} />
                  {item.isOverdue && item.joursRetard > 14 && <AlertTriangle size={12} className="text-red-500" />}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-medium truncate ${textPrimary}`}>{item.clientNom}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${item.type === 'facture' ? isDark ? 'bg-blue-900/30 text-blue-400' : 'bg-blue-100 text-blue-700' : isDark ? 'bg-green-900/30 text-green-400' : 'bg-green-100 text-green-700'}`}>
                      {item.type === 'facture' ? `F-${item.numero}` : `D-${item.numero}`}
                    </span>
                  </div>
                  <p className={`text-xs ${textSecondary}`}>
                    {item.isOverdue ? (
                      <span className={isDark ? 'text-orange-400' : 'text-orange-600'}>
                        {item.joursRetard}j de retard
                      </span>
                    ) : item.echeance ? (
                      `Éch. ${new Date(item.echeance).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}`
                    ) : 'En attente'}
                  </p>
                </div>

                {/* Amount */}
                <span className={`text-sm font-bold whitespace-nowrap ${item.isOverdue ? item.joursRetard > 7 ? 'text-red-500' : isDark ? 'text-orange-400' : 'text-orange-600' : isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>
                  {formatMoney(item.montant)}
                </span>

                {/* Actions */}
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  {item.clientTel && (
                    <button
                      onClick={() => handleWhatsAppRelance(item)}
                      className="p-1.5 rounded-lg bg-green-500/10 hover:bg-green-500/20 text-green-500 transition-colors"
                      title="Envoyer un rappel WhatsApp"
                    >
                      <MessageCircle size={14} />
                    </button>
                  )}
                  <button
                    onClick={() => handleEncaisserMarkPaid(item)}
                    className={`p-1.5 rounded-lg transition-colors ${isDark ? 'bg-slate-700 hover:bg-slate-600 text-emerald-400' : 'bg-gray-100 hover:bg-gray-200 text-emerald-600'}`}
                    title="Marquer comme encaissé"
                  >
                    <Check size={14} />
                  </button>
                </div>
              </div>
            ))}
            {encaisserData.items.length > 5 && (
              <div className={`px-5 py-2 text-center`}>
                <button onClick={() => setActiveTab('previsions')}
                  className={`text-xs font-medium ${isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-700'}`}>
                  Voir les {encaisserData.items.length - 5} autres factures →
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── KPI Cards ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Solde actuel" value={formatMoney(soldeActuel)} icon={Wallet}
          trend={modeDiscret ? undefined : trendSolde} trendLabel="vs mois dernier" color={soldeActuel < 0 ? '#ef4444' : soldeActuel < (settings.seuilAlerte || 5000) ? '#f97316' : '#10b981'} accent={couleur} isDark={isDark} />
        <KpiCard label="Entrées prévues" value={formatMoney(entreesPrevues)} icon={ArrowDown}
          color="#3b82f6" trendLabel="Factures impayées + prévisions" isDark={isDark} />
        <KpiCard label="Sorties prévues" value={formatMoney(sortiesPrevues)} icon={ArrowUp}
          color="#f59e0b" trendLabel="Charges + prévisions" isDark={isDark} />
        <KpiCard label="Projection fin de mois" value={formatMoney(projectionFinMois)} icon={TrendingUp}
          color={projectionFinMois < 0 ? '#ef4444' : projectionFinMois < (settings.seuilAlerte || 5000) ? '#f97316' : '#10b981'} trendLabel="Solde + entrées - sorties" isDark={isDark} />
      </div>

      {/* ── TVA déductible auto-calculée (Feature 5 — Aperçu only) ──── */}
      {activeTab === 'apercu' && (settings.regimeTva || 'trimestriel') !== 'franchise' && (tvaTotal.collectee > 0 || tvaTotal.deductible > 0) && (
        <div className={`flex items-center gap-4 p-4 rounded-2xl border cursor-pointer transition-colors ${isDark ? 'bg-slate-800/60 border-slate-700 hover:bg-slate-700/40' : 'bg-white border-gray-200 hover:bg-gray-50'}`}
          onClick={() => setActiveTab('tva')}>
          <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-purple-500/10">
            <Percent size={20} className="text-purple-500" />
          </div>
          <div className="flex-1">
            <p className={`text-xs font-semibold uppercase tracking-wide ${textSecondary}`}>TVA — Auto-calculée depuis vos dépenses</p>
            <div className="flex flex-wrap items-center gap-4 mt-1">
              <span className={`text-sm ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>
                Collectée : <strong>{formatMoney(tvaTotal.collectee)}</strong>
              </span>
              <span className={`text-sm ${isDark ? 'text-orange-400' : 'text-orange-600'}`}>
                Déductible : <strong>{formatMoney(tvaTotal.deductible)}</strong>
              </span>
              <span className={`text-sm font-bold ${tvaTotal.net >= 0 ? 'text-red-500' : 'text-green-500'}`}>
                {tvaTotal.net >= 0 ? 'À reverser' : 'Crédit'} : {formatMoney(Math.abs(tvaTotal.net))}
              </span>
            </div>
          </div>
          <span className={`text-xs font-medium px-3 py-1.5 rounded-lg ${isDark ? 'bg-purple-900/30 text-purple-400' : 'bg-purple-50 text-purple-700'}`}>
            Détail TVA →
          </span>
        </div>
      )}

      {/* ── Widget Charges courantes BTP (Feature 6) ────────────────── */}
      {activeTab === 'apercu' && (
        <div className={`rounded-2xl border overflow-hidden ${cardBg}`}>
          <button
            onClick={() => setShowChargesBTP(!showChargesBTP)}
            className={`w-full flex items-center justify-between px-5 py-3 transition-colors ${isDark ? 'hover:bg-slate-700/40' : 'hover:bg-gray-50'}`}
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${couleur}20` }}>
                <HardHat size={18} style={{ color: couleur }} />
              </div>
              <div className="text-left">
                <p className={`text-sm font-bold ${textPrimary}`}>Charges courantes BTP</p>
                <p className={`text-xs ${textSecondary}`}>Ajoutez rapidement vos charges récurrentes</p>
              </div>
            </div>
            {showChargesBTP ? <ChevronUp size={18} className={textSecondary} /> : <ChevronDown size={18} className={textSecondary} />}
          </button>

          {showChargesBTP && (
            <div className={`px-5 pb-4 space-y-4 border-t ${isDark ? 'border-slate-700' : 'border-gray-100'}`}>
              {BTP_CHARGES.map((group) => (
                <div key={group.categorie} className="pt-3">
                  <p className={`text-xs font-bold uppercase tracking-wide mb-2 ${textSecondary}`}>{group.categorie}</p>
                  <div className="space-y-1.5">
                    {group.items.map((charge) => {
                      const exists = previsions.some(p =>
                        p.description?.toLowerCase().trim() === charge.label.toLowerCase().trim() && p.statut === 'prevu'
                      );
                      return (
                        <div key={charge.label}
                          className={`flex items-center justify-between px-3 py-2 rounded-xl transition-colors ${isDark ? 'bg-slate-700/40 hover:bg-slate-700/60' : 'bg-gray-50 hover:bg-gray-100'}`}>
                          <div className="flex-1 min-w-0">
                            <span className={`text-sm ${textPrimary}`}>{charge.label}</span>
                            <span className={`text-xs ml-2 ${textSecondary}`}>
                              ~{formatCurrency(charge.montantMoyen)}/{charge.recurrence === 'mensuel' ? 'mois' : charge.recurrence === 'trimestriel' ? 'trim.' : 'an'}
                            </span>
                          </div>
                          {exists ? (
                            <span className={`text-[10px] px-2 py-1 rounded-lg font-medium ${isDark ? 'bg-emerald-900/30 text-emerald-400' : 'bg-emerald-100 text-emerald-700'}`}>
                              <Check size={10} className="inline mr-0.5" />Déjà ajouté
                            </span>
                          ) : (
                            <button
                              onClick={() => handleAddBTPCharge({ ...charge, categorie: group.categorie })}
                              className="text-xs font-medium px-2.5 py-1 rounded-lg text-white transition-colors"
                              style={{ backgroundColor: couleur }}
                            >
                              <Plus size={12} className="inline mr-0.5" />Ajouter
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Mouvements ce mois (Aperçu) ─────────────────────────────── */}
      {activeTab === 'apercu' && mouvements.length > 0 && (
        <div className={`flex items-center gap-4 p-4 rounded-2xl border ${isDark ? 'bg-slate-800/60 border-slate-700' : 'bg-white border-gray-200'}`}>
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${couleur}20`, color: couleur }}>
            <Receipt size={20} />
          </div>
          <div className="flex-1">
            <p className={`text-xs font-semibold uppercase tracking-wide ${textSecondary}`}>Mouvements ce mois</p>
            <div className="flex items-center gap-4 mt-1">
              <span className={`text-sm font-bold ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>
                +{formatMoney(mouvementsKPIs.entreesThisMonth)}
              </span>
              <span className={`text-sm font-bold ${isDark ? 'text-red-400' : 'text-red-600'}`}>
                -{formatMoney(mouvementsKPIs.sortiesThisMonth)}
              </span>
              <span className={`text-xs ${textSecondary}`}>{mouvements.length} mouvement{mouvements.length > 1 ? 's' : ''} total</span>
            </div>
          </div>
          <button onClick={() => setActiveTab('mouvements')}
            className={`text-xs font-medium px-3 py-1.5 rounded-lg transition-colors ${isDark ? 'bg-slate-700 hover:bg-slate-600 text-gray-300' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'}`}>
            Voir tout →
          </button>
        </div>
      )}

      {/* ── Cash Flow Chart ────────────────────────────────────────── */}
      <div className={`rounded-2xl border p-5 ${cardBg}`}>
        <div className="flex items-center justify-between mb-4">
          <h2 className={`text-base font-bold ${textPrimary}`}>Flux de trésorerie</h2>
          <div className={`flex items-center gap-2 text-xs ${textSecondary}`}>
            <BarChart3 size={14} /> {monthlyData.length} mois affichés
          </div>
        </div>
        {monthlyData.length > 0 ? (
          <CashFlowChart data={monthlyData} isDark={isDark} couleur={couleur} />
        ) : (
          <div className={`flex flex-col items-center justify-center py-16 ${textSecondary}`}>
            <BarChart3 size={40} className="opacity-30 mb-3" />
            <p className="text-sm">Aucune donnée à afficher</p>
          </div>
        )}
      </div>

      {/* ── Cash Flow Projections ──────────────────────────────────── */}
      {activeTab !== 'tva' && activeTab !== 'projections' && activeTab !== 'mouvements' && projections.length > 0 && (
        <div className={`rounded-2xl border p-5 ${cardBg}`}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <TrendingUp size={18} style={{ color: couleur }} />
              <h2 className={`text-base font-bold ${textPrimary}`}>Projection à 6 mois</h2>
            </div>
            {negativeMonth && (
              <span className={`text-xs font-medium px-2 py-1 rounded-lg ${isDark ? 'bg-red-500/15 text-red-400' : 'bg-red-50 text-red-600'}`}>
                <AlertTriangle size={12} className="inline mr-1" />Solde négatif prévu en {negativeMonth.mois}
              </span>
            )}
            {!negativeMonth && thresholdMonth && (
              <span className={`text-xs font-medium px-2 py-1 rounded-lg ${isDark ? 'bg-amber-500/15 text-amber-400' : 'bg-amber-50 text-amber-600'}`}>
                <AlertTriangle size={12} className="inline mr-1" />Sous le seuil en {thresholdMonth.mois}
              </span>
            )}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {projections.map((p, i) => {
              const isNeg = p.balance < 0;
              const isBelowThreshold = p.balance < (settings.seuilAlerte || 5000);
              return (
                <div key={i} className={`p-3 rounded-xl border text-center ${
                  isNeg ? isDark ? 'bg-red-900/10 border-red-500/30' : 'bg-red-50 border-red-200'
                  : isBelowThreshold ? isDark ? 'bg-amber-900/10 border-amber-500/30' : 'bg-amber-50 border-amber-200'
                  : isDark ? 'bg-slate-700/40 border-slate-600' : 'bg-gray-50 border-gray-200'
                }`}>
                  <p className={`text-xs font-bold uppercase mb-1 ${textSecondary}`}>{p.mois}</p>
                  <p className={`text-sm font-bold ${isNeg ? 'text-red-500' : isBelowThreshold ? isDark ? 'text-amber-400' : 'text-amber-600' : isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>
                    {formatMoney(p.balance)}
                  </p>
                  <div className={`text-[10px] mt-1 ${textSecondary}`}>
                    <span className="text-emerald-500">+{modeDiscret ? '···' : formatCompact(p.entrees)}</span>
                    {' / '}
                    <span className="text-red-500">-{modeDiscret ? '···' : formatCompact(p.sorties)}</span>
                  </div>
                  {p.isScheduled && (
                    <span className={`inline-block mt-1 text-[9px] px-1 py-0.5 rounded ${isDark ? 'bg-blue-900/30 text-blue-400' : 'bg-blue-50 text-blue-600'}`}>planifié</span>
                  )}
                </div>
              );
            })}
          </div>
          <p className={`text-[10px] mt-3 ${textSecondary}`}>
            Basé sur la moyenne des {period === '6m' ? '6' : '3'} derniers mois ({formatMoney(avgMonthlyEntrees)} entrées / {formatMoney(avgMonthlySorties)} sorties par mois) et les prévisions planifiées.
          </p>
        </div>
      )}

      {/* ── Tabs ───────────────────────────────────────────────────── */}
      <div className={`rounded-2xl border ${cardBg}`}>
        <div className={`flex items-center gap-1 px-5 pt-4 border-b ${borderColor}`}>
          {TABS.map((tab) => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2.5 text-sm font-medium rounded-t-lg transition-colors relative ${activeTab === tab.key ? `${textPrimary} font-semibold` : `${textSecondary} hover:${isDark ? 'text-gray-200' : 'text-gray-700'}`}`}>
              {tab.label}
              {activeTab === tab.key && <span className="absolute bottom-0 left-2 right-2 h-0.5 rounded-full" style={{ backgroundColor: couleur }} />}
            </button>
          ))}
          {activeTab !== 'tva' && activeTab !== 'projections' && activeTab !== 'mouvements' && (
            <div className="ml-auto flex items-center gap-2">
              <Filter size={14} className={textSecondary} />
              <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}
                className={`text-sm px-2 py-1.5 rounded-lg border ${isDark ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-gray-200 text-gray-700'}`}>
                <option value="all">Toutes catégories</option>
                {CATEGORIES_PREVISION.map(cat => <option key={cat} value={cat}>{cat}</option>)}
              </select>
            </div>
          )}
          {activeTab === 'mouvements' && (
            <div className="ml-auto flex items-center gap-2">
              <Filter size={14} className={textSecondary} />
              <select value={mouvFilter} onChange={(e) => setMouvFilter(e.target.value)}
                className={`text-sm px-2 py-1.5 rounded-lg border ${isDark ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-gray-200 text-gray-700'}`}>
                <option value="all">Tous types</option>
                <option value="entree">Entrées</option>
                <option value="sortie">Sorties</option>
              </select>
              <select value={mouvStatutFilter} onChange={(e) => setMouvStatutFilter(e.target.value)}
                className={`text-sm px-2 py-1.5 rounded-lg border ${isDark ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-gray-200 text-gray-700'}`}>
                <option value="all">Tous statuts</option>
                <option value="prevu">Prévu</option>
                <option value="paye">Payé</option>
              </select>
              <button onClick={() => exportMouvementsCSV()}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${isDark ? 'bg-slate-700 hover:bg-slate-600 text-gray-300' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'}`}>
                <FileText size={12} /> Export CSV
              </button>
            </div>
          )}
        </div>

        <div className="px-5 py-4">
          {activeTab === 'tva' || activeTab === 'projections' || activeTab === 'mouvements' ? null : filteredPayments.length === 0 ? (
            <div className={`text-center py-10 ${textSecondary}`}>
              <Clock size={36} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm font-medium mb-2">Aucune prévision pour cette vue</p>
              <p className="text-xs mb-4">Ajoutez vos charges récurrentes et entrées prévues pour suivre votre trésorerie.</p>
              {previsions.length === 0 && (
                <button onClick={() => setShowPrefillConfirm(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-white shadow-md" style={{ backgroundColor: couleur }}>
                  <Zap size={16} /> Pré-remplir les charges courantes BTP
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm" aria-label="Mouvements de trésorerie">
                <thead>
                  <tr className={`text-xs uppercase tracking-wide ${textSecondary} border-b ${borderColor}`}>
                    <th className="text-left py-3 pr-4 font-semibold">Date</th>
                    <th className="text-left py-3 pr-4 font-semibold">Description</th>
                    <th className="text-left py-3 pr-4 font-semibold">Type</th>
                    <th className="text-left py-3 pr-4 font-semibold">Catégorie</th>
                    <th className="text-right py-3 pr-4 font-semibold">Montant</th>
                    <th className="text-left py-3 font-semibold">Statut</th>
                    <th className="text-right py-3 font-semibold w-24">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPayments.map((p) => {
                    const isEntree = p.type === 'entree';
                    const dateStr = p.date ? new Date(p.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
                    const isPrevision = p.source === 'prevision';

                    return (
                      <tr key={p.id} className={`border-b last:border-b-0 transition-colors ${isDark ? 'border-slate-700/50 hover:bg-slate-700/30' : 'border-gray-100 hover:bg-gray-50'}`}>
                        <td className={`py-3 pr-4 ${textSecondary} whitespace-nowrap`}>{dateStr}</td>
                        <td className={`py-3 pr-4 ${textPrimary} font-medium max-w-xs truncate`}>
                          {p.description}
                          {p.recurrence && p.recurrence !== 'unique' && (
                            <span className={`ml-1.5 text-[10px] px-1.5 py-0.5 rounded font-medium ${isDark ? 'bg-purple-900/30 text-purple-400' : 'bg-purple-50 text-purple-600'}`}>
                              🔄 {p.recurrence}
                            </span>
                          )}
                        </td>
                        <td className="py-3 pr-4">
                          <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full ${isEntree ? isDark ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-100 text-emerald-700' : isDark ? 'bg-red-500/20 text-red-400' : 'bg-red-100 text-red-700'}`}>
                            {isEntree ? <ArrowDown size={12} /> : <ArrowUp size={12} />}
                            {isEntree ? 'Entrée' : 'Sortie'}
                          </span>
                        </td>
                        <td className="py-3 pr-4">
                          {(() => {
                            const cat = p.categorie || 'Divers';
                            const colors = CATEGORY_COLORS[cat] || CATEGORY_COLORS.Divers;
                            return <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${isDark ? colors.dark : colors.bg}`}>{cat}</span>;
                          })()}
                        </td>
                        <td className={`py-3 pr-4 text-right font-bold whitespace-nowrap ${isEntree ? 'text-emerald-500' : 'text-red-500'}`}>
                          {isEntree ? '+' : '-'}{formatMoney(p.montant)}
                        </td>
                        <td className="py-3">
                          {p.statut === 'Payé' ? (
                            <span className={`text-xs font-medium px-2 py-1 rounded-lg ${isDark ? 'bg-slate-700 text-gray-400' : 'bg-gray-100 text-gray-500'}`}>Payé</span>
                          ) : p.statut === 'En retard' ? (
                            <span className={`text-xs font-medium px-2 py-1 rounded-lg ${isDark ? 'bg-red-500/15 text-red-400' : 'bg-red-50 text-red-600'}`}>En retard</span>
                          ) : p.statut === 'En attente' ? (
                            <span className={`text-xs font-medium px-2 py-1 rounded-lg ${isDark ? 'bg-amber-500/15 text-amber-400' : 'bg-amber-50 text-amber-600'}`}>En attente</span>
                          ) : (
                            <button onClick={() => isPrevision && handleMarkAsPaid(p.id)}
                              className={`text-xs font-medium px-2 py-1 rounded-lg transition-colors ${isPrevision ? 'cursor-pointer hover:opacity-80' : ''} ${isDark ? 'bg-blue-500/15 text-blue-400' : 'bg-blue-50 text-blue-600'}`}
                              title={isPrevision ? 'Cliquez pour marquer comme payé' : ''}>
                              Prévu
                            </button>
                          )}
                        </td>
                        <td className="py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            {isPrevision && p.statut !== 'Payé' && (
                              <button onClick={() => handleMarkAsPaid(p.id)}
                                className={`p-1.5 rounded-lg transition-colors ${isDark ? 'hover:bg-emerald-500/20 text-gray-500 hover:text-emerald-400' : 'hover:bg-emerald-50 text-gray-400 hover:text-emerald-500'}`}
                                title="Marquer comme payé">
                                <Check size={14} />
                              </button>
                            )}
                            {isPrevision && (
                              <>
                                <button onClick={() => handleEditPrevision(p)}
                                  className={`p-1.5 rounded-lg transition-colors ${isDark ? 'hover:bg-blue-500/20 text-gray-500 hover:text-blue-400' : 'hover:bg-blue-50 text-gray-400 hover:text-blue-500'}`}
                                  title="Modifier">
                                  <Edit3 size={14} />
                                </button>
                                <button onClick={() => handleDeletePrevision(p.id)}
                                  className={`p-1.5 rounded-lg transition-colors ${isDark ? 'hover:bg-red-500/20 text-gray-500 hover:text-red-400' : 'hover:bg-red-50 text-gray-400 hover:text-red-500'}`}
                                  title="Supprimer">
                                  <Trash2 size={14} />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Footer: prefill hint */}
          {activeTab !== 'tva' && activeTab !== 'projections' && activeTab !== 'mouvements' && previsions.length === 0 && filteredPayments.length > 0 && (
            <div className={`mt-4 pt-4 border-t ${borderColor} text-center`}>
              <button onClick={() => setShowPrefillConfirm(true)}
                className={`inline-flex items-center gap-2 text-sm font-medium ${isDark ? 'text-slate-400 hover:text-white' : 'text-gray-500 hover:text-gray-700'}`}>
                <Zap size={14} /> Ajouter les charges courantes BTP
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Mouvements Tab ─────────────────────────────────────────── */}
      {activeTab === 'mouvements' && (
        <div className={`rounded-2xl border ${cardBg} p-5`}>
          {/* Mouvements KPI summary */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
            <div className={`p-3 rounded-xl border ${isDark ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-emerald-50 border-emerald-100'}`}>
              <p className={`text-[10px] font-semibold uppercase tracking-wide ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>Entrées payées</p>
              <p className={`text-lg font-bold ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>{formatMoney(mouvementsKPIs.totalEntrees)}</p>
            </div>
            <div className={`p-3 rounded-xl border ${isDark ? 'bg-red-500/5 border-red-500/20' : 'bg-red-50 border-red-100'}`}>
              <p className={`text-[10px] font-semibold uppercase tracking-wide ${isDark ? 'text-red-400' : 'text-red-600'}`}>Sorties payées</p>
              <p className={`text-lg font-bold ${isDark ? 'text-red-400' : 'text-red-600'}`}>{formatMoney(mouvementsKPIs.totalSorties)}</p>
            </div>
            <div className={`p-3 rounded-xl border ${isDark ? 'bg-blue-500/5 border-blue-500/20' : 'bg-blue-50 border-blue-100'}`}>
              <p className={`text-[10px] font-semibold uppercase tracking-wide ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>Entrées prévues</p>
              <p className={`text-lg font-bold ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>{formatMoney(mouvementsKPIs.entreesPrevu)}</p>
            </div>
            <div className={`p-3 rounded-xl border ${isDark ? 'bg-slate-700/50 border-slate-600' : 'bg-gray-50 border-gray-200'}`}>
              <p className={`text-[10px] font-semibold uppercase tracking-wide ${textSecondary}`}>Solde net mouvements</p>
              <p className={`text-lg font-bold ${mouvementsKPIs.soldeNet >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>{formatMoney(mouvementsKPIs.soldeNet)}</p>
            </div>
          </div>

          {/* Add mouvement button */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Wallet size={18} style={{ color: couleur }} />
              <h2 className={`text-base font-bold ${textPrimary}`}>Mouvements de trésorerie</h2>
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${isDark ? 'bg-slate-700 text-gray-400' : 'bg-gray-100 text-gray-500'}`}>
                {filteredMouvements.length}
              </span>
            </div>
            <button onClick={() => { setEditingMouv(null); setShowMouvModal(true); }}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-white transition-all hover:opacity-90 shadow-md"
              style={{ backgroundColor: couleur }}>
              <Plus size={14} /> Nouveau mouvement
            </button>
          </div>

          {filteredMouvements.length === 0 ? (
            <div className={`text-center py-10 ${textSecondary}`}>
              <Wallet size={36} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm font-medium mb-2">Aucun mouvement enregistré</p>
              <p className="text-xs mb-4">Les mouvements représentent vos transactions réelles (encaissements, décaissements) avec ventilation TVA.</p>
              <button onClick={() => { setEditingMouv(null); setShowMouvModal(true); }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-white shadow-md" style={{ backgroundColor: couleur }}>
                <Plus size={16} /> Créer un mouvement
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm" aria-label="Mouvements de trésorerie">
                <thead>
                  <tr className={`text-xs uppercase tracking-wide ${textSecondary} border-b ${borderColor}`}>
                    <th className="text-left py-3 pr-4 font-semibold">Date</th>
                    <th className="text-left py-3 pr-4 font-semibold">Description</th>
                    <th className="text-left py-3 pr-4 font-semibold">Type</th>
                    <th className="text-right py-3 pr-4 font-semibold">HT</th>
                    <th className="text-right py-3 pr-4 font-semibold">TVA</th>
                    <th className="text-right py-3 pr-4 font-semibold">TTC</th>
                    <th className="text-left py-3 font-semibold">Statut</th>
                    <th className="text-right py-3 font-semibold w-28">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMouvements.map((m) => {
                    const isEntree = m.type === 'entree';
                    const dateStr = m.date ? new Date(m.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
                    return (
                      <tr key={m.id} className={`border-b last:border-b-0 transition-colors ${isDark ? 'border-slate-700/50 hover:bg-slate-700/30' : 'border-gray-100 hover:bg-gray-50'}`}>
                        <td className={`py-3 pr-4 ${textSecondary} whitespace-nowrap`}>{dateStr}</td>
                        <td className={`py-3 pr-4 ${textPrimary} font-medium max-w-xs truncate`}>
                          {m.description}
                          {m.isRecurring && (
                            <span className={`ml-1.5 text-[10px] px-1.5 py-0.5 rounded font-medium ${isDark ? 'bg-purple-900/30 text-purple-400' : 'bg-purple-50 text-purple-600'}`}>
                              🔄 {m.recurringFrequency || 'récurrent'}
                            </span>
                          )}
                          {m.autoliquidation && (
                            <span className={`ml-1.5 text-[10px] px-1.5 py-0.5 rounded font-medium ${isDark ? 'bg-amber-900/30 text-amber-400' : 'bg-amber-50 text-amber-600'}`}>
                              Autoliq.
                            </span>
                          )}
                          {m.notes && (
                            <span className={`block text-[10px] mt-0.5 ${textSecondary}`}>{m.notes}</span>
                          )}
                        </td>
                        <td className="py-3 pr-4">
                          <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full ${isEntree ? isDark ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-100 text-emerald-700' : isDark ? 'bg-red-500/20 text-red-400' : 'bg-red-100 text-red-700'}`}>
                            {isEntree ? <ArrowDown size={12} /> : <ArrowUp size={12} />}
                            {isEntree ? 'Entrée' : 'Sortie'}
                          </span>
                        </td>
                        <td className={`py-3 pr-4 text-right whitespace-nowrap ${textSecondary}`}>{formatMoney(m.montantHt || 0)}</td>
                        <td className={`py-3 pr-4 text-right whitespace-nowrap ${textSecondary}`}>
                          {m.autoliquidation ? '—' : formatMoney(m.montantTva || 0)}
                          <span className={`block text-[10px] ${textSecondary}`}>{m.tauxTva || 20}%</span>
                        </td>
                        <td className={`py-3 pr-4 text-right font-bold whitespace-nowrap ${isEntree ? 'text-emerald-500' : 'text-red-500'}`}>
                          {isEntree ? '+' : '-'}{formatMoney(m.montant)}
                        </td>
                        <td className="py-3">
                          {m.statut === 'paye' ? (
                            <span className={`text-xs font-medium px-2 py-1 rounded-lg ${isDark ? 'bg-emerald-500/15 text-emerald-400' : 'bg-emerald-50 text-emerald-600'}`}>Payé</span>
                          ) : m.statut === 'annule' ? (
                            <span className={`text-xs font-medium px-2 py-1 rounded-lg ${isDark ? 'bg-red-500/15 text-red-400' : 'bg-red-50 text-red-600'}`}>Annulé</span>
                          ) : (
                            <button onClick={() => handleValiderMouvement(m.id)}
                              className={`text-xs font-medium px-2 py-1 rounded-lg transition-colors cursor-pointer hover:opacity-80 ${isDark ? 'bg-blue-500/15 text-blue-400' : 'bg-blue-50 text-blue-600'}`}
                              title="Cliquez pour valider (marquer comme payé)">
                              Prévu
                            </button>
                          )}
                        </td>
                        <td className="py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            {m.statut !== 'paye' && (
                              <button onClick={() => handleValiderMouvement(m.id)}
                                className={`p-1.5 rounded-lg transition-colors ${isDark ? 'hover:bg-emerald-500/20 text-gray-500 hover:text-emerald-400' : 'hover:bg-emerald-50 text-gray-400 hover:text-emerald-500'}`}
                                title="Marquer comme payé">
                                <Check size={14} />
                              </button>
                            )}
                            <button onClick={() => handleEditMouvement(m)}
                              className={`p-1.5 rounded-lg transition-colors ${isDark ? 'hover:bg-blue-500/20 text-gray-500 hover:text-blue-400' : 'hover:bg-blue-50 text-gray-400 hover:text-blue-500'}`}
                              title="Modifier">
                              <Edit3 size={14} />
                            </button>
                            <button onClick={() => handleDeleteMouvement(m.id)}
                              className={`p-1.5 rounded-lg transition-colors ${isDark ? 'hover:bg-red-500/20 text-gray-500 hover:text-red-400' : 'hover:bg-red-50 text-gray-400 hover:text-red-500'}`}
                              title="Supprimer">
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Projections Interactives ─────────────────────────────────── */}
      {activeTab === 'projections' && (
        <div className="space-y-5">
          {/* Scenario Presets */}
          <div className={`rounded-2xl border ${cardBg} p-5`}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${couleur}20`, color: couleur }}>
                <Sliders size={20} />
              </div>
              <div>
                <h2 className={`text-base font-bold ${textPrimary}`}>Projections interactives — 12 mois</h2>
                <p className={`text-xs ${textSecondary}`}>Ajustez les hypothèses pour simuler différents scénarios de trésorerie</p>
              </div>
            </div>

            {/* Preset buttons */}
            <div className="flex flex-wrap gap-2 mb-5">
              {SCENARIO_PRESETS.map(preset => {
                const Icon = preset.icon;
                const isActive = scenarioPreset === preset.key;
                return (
                  <button key={preset.key} onClick={() => handleScenarioPreset(preset.key)}
                    className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                      isActive
                        ? 'text-white shadow-md'
                        : isDark ? 'bg-slate-700 border border-slate-600 text-gray-300 hover:bg-slate-600' : 'bg-gray-50 border border-gray-200 text-gray-700 hover:bg-gray-100'
                    }`}
                    style={isActive ? { backgroundColor: couleur } : {}}>
                    <Icon size={14} />
                    {preset.label}
                  </button>
                );
              })}
              {scenarioPreset === 'custom' && (
                <span className={`inline-flex items-center gap-1 px-3 py-2 rounded-xl text-sm font-medium ${isDark ? 'bg-purple-500/15 text-purple-400 border border-purple-500/30' : 'bg-purple-50 text-purple-700 border border-purple-200'}`}>
                  <Sliders size={14} /> Personnalisé
                </span>
              )}
            </div>

            {/* Sliders */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Entrées adjustment */}
              <div className={`p-4 rounded-xl border ${isDark ? 'bg-slate-700/40 border-slate-600' : 'bg-gray-50 border-gray-200'}`}>
                <div className="flex items-center justify-between mb-2">
                  <label className={`text-xs font-semibold ${textSecondary}`}>Variation des entrées</label>
                  <span className={`text-sm font-bold ${scenarioParams.entreesAdj >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                    {scenarioParams.entreesAdj >= 0 ? '+' : ''}{scenarioParams.entreesAdj}%
                  </span>
                </div>
                <input type="range" min={-50} max={100} step={5} value={scenarioParams.entreesAdj}
                  onChange={(e) => handleScenarioSlider('entreesAdj', parseInt(e.target.value))}
                  className="w-full h-2 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                  style={{ accentColor: '#10b981' }} />
                <div className={`flex justify-between text-[10px] mt-1 ${textSecondary}`}>
                  <span>-50%</span><span>0%</span><span>+100%</span>
                </div>
              </div>

              {/* Sorties adjustment */}
              <div className={`p-4 rounded-xl border ${isDark ? 'bg-slate-700/40 border-slate-600' : 'bg-gray-50 border-gray-200'}`}>
                <div className="flex items-center justify-between mb-2">
                  <label className={`text-xs font-semibold ${textSecondary}`}>Variation des sorties</label>
                  <span className={`text-sm font-bold ${scenarioParams.sortiesAdj <= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                    {scenarioParams.sortiesAdj >= 0 ? '+' : ''}{scenarioParams.sortiesAdj}%
                  </span>
                </div>
                <input type="range" min={-50} max={100} step={5} value={scenarioParams.sortiesAdj}
                  onChange={(e) => handleScenarioSlider('sortiesAdj', parseInt(e.target.value))}
                  className="w-full h-2 rounded-lg appearance-none cursor-pointer"
                  style={{ accentColor: '#ef4444' }} />
                <div className={`flex justify-between text-[10px] mt-1 ${textSecondary}`}>
                  <span>-50%</span><span>0%</span><span>+100%</span>
                </div>
              </div>

              {/* Extra monthly entrée */}
              <div className={`p-4 rounded-xl border ${isDark ? 'bg-slate-700/40 border-slate-600' : 'bg-gray-50 border-gray-200'}`}>
                <div className="flex items-center justify-between mb-2">
                  <label className={`text-xs font-semibold ${textSecondary}`}>Entrée supplémentaire / mois</label>
                  <span className={`text-sm font-bold text-emerald-500`}>+{formatMoney(scenarioParams.extraEntree)}</span>
                </div>
                <input type="range" min={0} max={50000} step={1000} value={scenarioParams.extraEntree}
                  onChange={(e) => handleScenarioSlider('extraEntree', parseInt(e.target.value))}
                  className="w-full h-2 rounded-lg appearance-none cursor-pointer"
                  style={{ accentColor: '#10b981' }} />
                <div className={`flex justify-between text-[10px] mt-1 ${textSecondary}`}>
                  <span>0 €</span><span>25k €</span><span>50k €</span>
                </div>
              </div>

              {/* Extra monthly sortie */}
              <div className={`p-4 rounded-xl border ${isDark ? 'bg-slate-700/40 border-slate-600' : 'bg-gray-50 border-gray-200'}`}>
                <div className="flex items-center justify-between mb-2">
                  <label className={`text-xs font-semibold ${textSecondary}`}>Charge supplémentaire / mois</label>
                  <span className={`text-sm font-bold text-red-500`}>-{formatMoney(scenarioParams.extraSortie)}</span>
                </div>
                <input type="range" min={0} max={30000} step={500} value={scenarioParams.extraSortie}
                  onChange={(e) => handleScenarioSlider('extraSortie', parseInt(e.target.value))}
                  className="w-full h-2 rounded-lg appearance-none cursor-pointer"
                  style={{ accentColor: '#ef4444' }} />
                <div className={`flex justify-between text-[10px] mt-1 ${textSecondary}`}>
                  <span>0 €</span><span>15k €</span><span>30k €</span>
                </div>
              </div>
            </div>
          </div>

          {/* Projection Chart */}
          {baselineProjections.length > 0 && (
            <div className={`rounded-2xl border ${cardBg} p-5`}>
              <div className="flex items-center justify-between mb-4">
                <h3 className={`text-sm font-bold ${textPrimary}`}>Évolution du solde projeté</h3>
                <div className="flex items-center gap-4">
                  {scenarioSummary.scenNegMonth && (
                    <span className={`text-xs font-medium px-2 py-1 rounded-lg ${isDark ? 'bg-red-500/15 text-red-400' : 'bg-red-50 text-red-600'}`}>
                      <AlertTriangle size={12} className="inline mr-1" />Négatif en {scenarioSummary.scenNegMonth.mois}
                    </span>
                  )}
                </div>
              </div>
              <ProjectionChart
                baseline={baselineProjections}
                scenario={scenarioProjections}
                isDark={isDark}
                couleur={couleur}
              />
            </div>
          )}

          {/* Scenario Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className={`p-4 rounded-xl border ${isDark ? 'bg-slate-700/50 border-slate-600' : 'bg-gray-50 border-gray-200'}`}>
              <p className={`text-xs font-semibold uppercase tracking-wide mb-1 ${textSecondary}`}>Solde final (12 mois)</p>
              <p className={`text-xl font-bold ${scenarioSummary.scenarioEndBalance >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                {formatMoney(scenarioSummary.scenarioEndBalance)}
              </p>
              <p className={`text-[10px] mt-0.5 ${textSecondary}`}>
                Tendance actuelle : {formatMoney(scenarioSummary.baselineEndBalance)}
              </p>
            </div>
            <div className={`p-4 rounded-xl border ${isDark ? 'bg-slate-700/50 border-slate-600' : 'bg-gray-50 border-gray-200'}`}>
              <p className={`text-xs font-semibold uppercase tracking-wide mb-1 ${textSecondary}`}>Impact du scénario</p>
              <p className={`text-xl font-bold ${scenarioSummary.delta >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                {scenarioSummary.delta >= 0 ? '+' : ''}{formatMoney(scenarioSummary.delta)}
              </p>
              <p className={`text-[10px] mt-0.5 ${textSecondary}`}>Différence vs tendance actuelle</p>
            </div>
            <div className={`p-4 rounded-xl border ${isDark ? 'bg-slate-700/50 border-slate-600' : 'bg-gray-50 border-gray-200'}`}>
              <p className={`text-xs font-semibold uppercase tracking-wide mb-1 ${textSecondary}`}>Entrées totales (12 mois)</p>
              <p className={`text-xl font-bold ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>
                {formatMoney(scenarioSummary.totalScenEntrees)}
              </p>
              <p className={`text-[10px] mt-0.5 ${textSecondary}`}>
                {scenarioSummary.totalScenEntrees !== scenarioSummary.totalBaseEntrees
                  ? `Tendance : ${formatMoney(scenarioSummary.totalBaseEntrees)} (${scenarioSummary.totalScenEntrees > scenarioSummary.totalBaseEntrees ? '+' : ''}${formatMoney(scenarioSummary.totalScenEntrees - scenarioSummary.totalBaseEntrees)})`
                  : 'Identique à la tendance'}
              </p>
            </div>
            <div className={`p-4 rounded-xl border ${isDark ? 'bg-slate-700/50 border-slate-600' : 'bg-gray-50 border-gray-200'}`}>
              <p className={`text-xs font-semibold uppercase tracking-wide mb-1 ${textSecondary}`}>Sorties totales (12 mois)</p>
              <p className={`text-xl font-bold ${isDark ? 'text-red-400' : 'text-red-600'}`}>
                {formatMoney(scenarioSummary.totalScenSorties)}
              </p>
              <p className={`text-[10px] mt-0.5 ${textSecondary}`}>
                {scenarioSummary.totalScenSorties !== scenarioSummary.totalBaseSorties
                  ? `Tendance : ${formatMoney(scenarioSummary.totalBaseSorties)} (${scenarioSummary.totalScenSorties > scenarioSummary.totalBaseSorties ? '+' : ''}${formatMoney(scenarioSummary.totalScenSorties - scenarioSummary.totalBaseSorties)})`
                  : 'Identique à la tendance'}
              </p>
            </div>
          </div>

          {/* Monthly Breakdown Table */}
          <div className={`rounded-2xl border ${cardBg} p-5`}>
            <h3 className={`text-sm font-bold mb-4 ${textPrimary}`}>Détail mensuel du scénario</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm" aria-label="Projections mensuelles">
                <thead>
                  <tr className={`text-xs uppercase tracking-wide ${textSecondary} border-b ${borderColor}`}>
                    <th className="text-left py-3 pr-4 font-semibold">Mois</th>
                    <th className="text-right py-3 pr-4 font-semibold">Entrées</th>
                    <th className="text-right py-3 pr-4 font-semibold">Sorties</th>
                    <th className="text-right py-3 pr-4 font-semibold">Flux net</th>
                    <th className="text-right py-3 font-semibold">Solde projeté</th>
                  </tr>
                </thead>
                <tbody>
                  {scenarioProjections.map((p, i) => {
                    const flux = p.entrees - p.sorties;
                    const isNeg = p.balance < 0;
                    const isBelowThreshold = p.balance < (settings.seuilAlerte || 5000);
                    return (
                      <tr key={p.mois} className={`border-b last:border-b-0 transition-colors ${
                        isNeg ? isDark ? 'bg-red-900/10' : 'bg-red-50/50'
                        : isBelowThreshold ? isDark ? 'bg-amber-900/10' : 'bg-amber-50/50'
                        : ''
                      } ${isDark ? 'border-slate-700/50 hover:bg-slate-700/30' : 'border-gray-100 hover:bg-gray-50'}`}>
                        <td className={`py-2.5 pr-4 font-medium ${textPrimary}`}>{p.mois}</td>
                        <td className={`py-2.5 pr-4 text-right ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>{formatMoney(p.entrees)}</td>
                        <td className="py-2.5 pr-4 text-right text-red-500">{formatMoney(p.sorties)}</td>
                        <td className={`py-2.5 pr-4 text-right font-semibold ${flux >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                          {flux >= 0 ? '+' : ''}{formatMoney(flux)}
                        </td>
                        <td className={`py-2.5 text-right font-bold ${isNeg ? 'text-red-500' : isBelowThreshold ? isDark ? 'text-amber-400' : 'text-amber-600' : isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>
                          {formatMoney(p.balance)}
                          {isNeg && <AlertTriangle size={12} className="inline ml-1 text-red-500" />}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Disclaimer */}
          <div className={`p-3 rounded-xl border text-xs ${isDark ? 'bg-blue-500/5 border-blue-500/20 text-blue-400' : 'bg-blue-50 border-blue-100 text-blue-600'}`}>
            <Info size={14} className="inline mr-1.5" />
            Ces projections sont indicatives et basées sur les moyennes historiques et vos prévisions planifiées. Elles ne constituent pas un conseil financier.
          </div>
        </div>
      )}

      {/* ── TVA Dashboard ───────────────────────────────────────────── */}
      {activeTab === 'tva' && (
        <div className={`rounded-2xl border ${cardBg} p-5`}>
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-purple-100 text-purple-600" style={isDark ? { backgroundColor: 'rgba(168,85,247,0.15)', color: '#c084fc' } : {}}>
                <Percent size={20} />
              </div>
              <div>
                <h2 className={`text-base font-bold ${textPrimary}`}>Tableau de TVA — {new Date().getFullYear()}</h2>
                <p className={`text-xs ${textSecondary}`}>
                  {(settings.regimeTva || 'trimestriel') === 'franchise'
                    ? 'Franchise en base de TVA'
                    : `TVA collectée vs déductible — Régime ${(settings.regimeTva || 'trimestriel') === 'mensuel' ? 'réel normal' : 'réel simplifié'}`}
                  {settings.numeroTva && <span className="ml-2 opacity-60">| {settings.numeroTva}</span>}
                </p>
              </div>
            </div>
            {/* Export buttons */}
            {(settings.regimeTva || 'trimestriel') !== 'franchise' && (
              <div className="flex items-center gap-2">
                <button onClick={() => exportCA3()}
                  className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${isDark ? 'bg-slate-700 hover:bg-slate-600 text-gray-300' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'}`}
                  title="Télécharger la liasse CA3 pour votre déclaration de TVA">
                  <FileText size={14} /> CA3
                </button>
                <button onClick={() => exportJournalVentes()}
                  className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${isDark ? 'bg-slate-700 hover:bg-slate-600 text-gray-300' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'}`}
                  title="Export des ventes avec TVA ventilée">
                  <Receipt size={14} /> Ventes
                </button>
                <button onClick={() => exportJournalAchats()}
                  className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${isDark ? 'bg-slate-700 hover:bg-slate-600 text-gray-300' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'}`}
                  title="Export des achats avec TVA déductible">
                  <Receipt size={14} /> Achats
                </button>
                <button onClick={() => exportFEC()}
                  className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${isDark ? 'bg-purple-900/30 hover:bg-purple-900/50 text-purple-300' : 'bg-purple-50 hover:bg-purple-100 text-purple-700'}`}
                  title="Fichier d'Écritures Comptables — Format DGFiP">
                  <FileText size={14} /> FEC
                </button>
              </div>
            )}
          </div>

          {/* Franchise banner */}
          {(settings.regimeTva || 'trimestriel') === 'franchise' ? (
            <div className={`flex items-center gap-3 p-5 rounded-xl border ${isDark ? 'bg-slate-700/30 border-slate-600' : 'bg-gray-50 border-gray-200'}`}>
              <Info size={20} className={textSecondary} />
              <div>
                <p className={`text-sm font-semibold ${textPrimary}`}>Non assujetti à la TVA</p>
                <p className={`text-xs mt-0.5 ${textSecondary}`}>
                  En franchise en base de TVA, vous n'avez pas de TVA à collecter ni à déduire.
                  Mention obligatoire sur vos factures : « TVA non applicable, art. 293 B du CGI ».
                </p>
              </div>
            </div>
          ) : (
            <>
              {/* TVA Summary KPIs */}
              <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6`}>
                <div className={`p-4 rounded-xl border ${isDark ? 'bg-slate-700/50 border-slate-600' : 'bg-blue-50 border-blue-100'}`}>
                  <p className={`text-xs font-semibold uppercase tracking-wide mb-1 ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>TVA Collectée</p>
                  <p className={`text-xl font-bold ${isDark ? 'text-blue-300' : 'text-blue-700'}`}>{formatMoney(tvaTotal.collectee)}</p>
                  <p className={`text-[10px] mt-0.5 ${textSecondary}`}>Sur vos factures émises</p>
                </div>
                <div className={`p-4 rounded-xl border ${isDark ? 'bg-slate-700/50 border-slate-600' : 'bg-slate-50 border-slate-200'}`}>
                  <p className={`text-xs font-semibold uppercase tracking-wide mb-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>TVA Déductible</p>
                  <p className={`text-xl font-bold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{formatMoney(tvaTotal.deductible)}</p>
                  <p className={`text-[10px] mt-0.5 ${textSecondary}`}>Sur vos achats / dépenses</p>
                </div>
                <div className={`p-4 rounded-xl border ${isDark ? 'bg-slate-700/50 border-slate-600' : tvaTotal.net >= 0 ? 'bg-red-50 border-red-100' : 'bg-green-50 border-green-100'}`}>
                  <p className={`text-xs font-semibold uppercase tracking-wide mb-1 ${tvaTotal.net >= 0 ? isDark ? 'text-red-400' : 'text-red-600' : isDark ? 'text-green-400' : 'text-green-600'}`}>
                    {tvaTotal.net >= 0 ? 'TVA à reverser' : 'Crédit de TVA'}
                  </p>
                  <p className={`text-xl font-bold ${tvaTotal.net >= 0 ? 'text-red-500' : 'text-green-500'}`}>{formatMoney(Math.abs(tvaTotal.net))}</p>
                  <p className={`text-[10px] mt-0.5 ${textSecondary}`}>{tvaTotal.net >= 0 ? 'À payer au Trésor public' : 'Remboursable ou reportable'}</p>
                </div>
                {tvaNextDeadline && (
                  <div className={`p-4 rounded-xl border ${isDark ? 'bg-slate-700/50 border-slate-600' : 'bg-purple-50 border-purple-100'}`}>
                    <p className={`text-xs font-semibold uppercase tracking-wide mb-1 ${isDark ? 'text-purple-400' : 'text-purple-600'}`}>Prochaine échéance</p>
                    <p className={`text-xl font-bold ${isDark ? 'text-purple-300' : 'text-purple-700'}`}>{tvaNextDeadline.label}</p>
                    <p className={`text-[10px] mt-0.5 ${textSecondary}`}>Déclaration {tvaNextDeadline.period}</p>
                  </div>
                )}
              </div>

              {/* TVA Table — quarterly or monthly based on regime */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm" aria-label="TVA par période">
                  <thead>
                    <tr className={`text-xs uppercase tracking-wide ${textSecondary} border-b ${borderColor}`}>
                      <th className="text-left py-3 pr-4 font-semibold">Période</th>
                      <th className="text-right py-3 pr-4 font-semibold">TVA Collectée</th>
                      <th className="text-right py-3 pr-4 font-semibold">TVA Déductible</th>
                      <th className="text-right py-3 font-semibold">Solde TVA</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(settings.regimeTva || 'trimestriel') === 'trimestriel' ? (
                      // Quarterly view
                      tvaQuarterly.map((q, qi) => {
                        const hasData = q.collectee > 0 || q.deductible > 0;
                        const currentQuarter = Math.floor(new Date().getMonth() / 3);
                        const isCurrent = qi === currentQuarter;
                        return (
                          <tr key={q.label} className={`border-b last:border-b-0 transition-colors ${isCurrent ? isDark ? 'bg-slate-700/30' : 'bg-blue-50/50' : ''} ${isDark ? 'border-slate-700/50 hover:bg-slate-700/30' : 'border-gray-100 hover:bg-gray-50'}`}>
                            <td className={`py-3 pr-4 font-medium ${isCurrent ? 'font-bold' : ''} ${hasData ? textPrimary : textSecondary}`}>
                              {q.label} {isCurrent && <span className="text-[10px] ml-1 px-1.5 py-0.5 rounded font-medium" style={{ backgroundColor: `${couleur}20`, color: couleur }}>actuel</span>}
                            </td>
                            <td className={`py-3 pr-4 text-right ${hasData ? isDark ? 'text-blue-400' : 'text-blue-600' : textSecondary}`}>{hasData ? formatMoney(q.collectee) : '—'}</td>
                            <td className={`py-3 pr-4 text-right ${hasData ? isDark ? 'text-orange-400' : 'text-orange-600' : textSecondary}`}>{hasData ? formatMoney(q.deductible) : '—'}</td>
                            <td className={`py-3 text-right font-semibold ${!hasData ? textSecondary : q.net >= 0 ? 'text-red-500' : 'text-green-500'}`}>
                              {hasData ? (q.net >= 0 ? '+' : '') + formatMoney(q.net) : '—'}
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      // Monthly view
                      tvaMonthly.map((m, i) => {
                        const hasData = m.collectee > 0 || m.deductible > 0;
                        const isCurrent = i === new Date().getMonth();
                        return (
                          <tr key={m.mois} className={`border-b last:border-b-0 transition-colors ${isCurrent ? isDark ? 'bg-slate-700/30' : 'bg-blue-50/50' : ''} ${isDark ? 'border-slate-700/50 hover:bg-slate-700/30' : 'border-gray-100 hover:bg-gray-50'}`}>
                            <td className={`py-2.5 pr-4 font-medium ${isCurrent ? 'font-bold' : ''} ${hasData ? textPrimary : textSecondary}`}>
                              {m.mois} {isCurrent && <span className="text-[10px] ml-1 px-1.5 py-0.5 rounded font-medium" style={{ backgroundColor: `${couleur}20`, color: couleur }}>actuel</span>}
                            </td>
                            <td className={`py-2.5 pr-4 text-right ${hasData ? isDark ? 'text-blue-400' : 'text-blue-600' : textSecondary}`}>{hasData ? formatMoney(m.collectee) : '—'}</td>
                            <td className={`py-2.5 pr-4 text-right ${hasData ? isDark ? 'text-orange-400' : 'text-orange-600' : textSecondary}`}>{hasData ? formatMoney(m.deductible) : '—'}</td>
                            <td className={`py-2.5 text-right font-semibold ${!hasData ? textSecondary : m.net >= 0 ? 'text-red-500' : 'text-green-500'}`}>
                              {hasData ? (m.net >= 0 ? '+' : '') + formatMoney(m.net) : '—'}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                  <tfoot>
                    <tr className={`border-t-2 ${isDark ? 'border-slate-600' : 'border-gray-300'}`}>
                      <td className={`py-3 pr-4 font-bold ${textPrimary}`}>Total annuel</td>
                      <td className={`py-3 pr-4 text-right font-bold ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>{formatMoney(tvaTotal.collectee)}</td>
                      <td className={`py-3 pr-4 text-right font-bold ${isDark ? 'text-orange-400' : 'text-orange-600'}`}>{formatMoney(tvaTotal.deductible)}</td>
                      <td className={`py-3 text-right font-bold ${tvaTotal.net >= 0 ? 'text-red-500' : 'text-green-500'}`}>{(tvaTotal.net >= 0 ? '+' : '') + formatMoney(tvaTotal.net)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* TVA by Rate breakdown */}
              {Object.keys(tvaByRate).length > 0 && (
                <div className={`mt-6 pt-5 border-t ${borderColor}`}>
                  <h3 className={`text-sm font-bold mb-3 ${textPrimary}`}>Ventilation par taux</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    {Object.entries(tvaByRate).sort(([a], [b]) => Number(b) - Number(a)).map(([rate, data]) => {
                      const info = TVA_RATES[rate] || { label: `${rate}%`, desc: '' };
                      return (
                        <div key={rate} className={`p-3 rounded-xl border ${isDark ? 'bg-slate-700/40 border-slate-600' : 'bg-gray-50 border-gray-200'}`}>
                          <div className="flex items-center justify-between mb-1">
                            <span className={`text-sm font-bold ${textPrimary}`}>{info.label}</span>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded ${isDark ? 'bg-slate-600 text-gray-300' : 'bg-gray-200 text-gray-600'}`}>{info.desc}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <div>
                              <p className={`text-xs ${textSecondary}`}>Base HT ventes : {formatMoney(data.base)}</p>
                              <p className={`text-sm font-semibold ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>Collectée : {formatMoney(data.collectee)}</p>
                            </div>
                            {(data.deductible || 0) > 0 && (
                              <div className="text-right">
                                <p className={`text-xs ${textSecondary}`}>Base HT achats : {formatMoney(data.baseDeductible || 0)}</p>
                                <p className={`text-sm font-semibold ${isDark ? 'text-orange-400' : 'text-orange-600'}`}>Déductible : {formatMoney(data.deductible)}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Disclaimer */}
              <div className={`mt-5 p-3 rounded-xl border text-xs ${isDark ? 'bg-blue-500/5 border-blue-500/20 text-blue-400' : 'bg-blue-50 border-blue-100 text-blue-600'}`}>
                <Info size={14} className="inline mr-1.5" />
                Ces données sont indicatives. Consultez votre expert-comptable pour la déclaration officielle.
              </div>
            </>
          )}
        </div>
      )}

      {/* ── Recurring Charges Summary ──────────────────────────────── */}
      {activeTab === 'apercu' && recurringSummary.count > 0 && (
        <div className={`rounded-2xl border ${cardBg} p-5`}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <RefreshCw size={18} style={{ color: couleur }} />
              <h2 className={`text-base font-bold ${textPrimary}`}>Charges récurrentes</h2>
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${isDark ? 'bg-purple-900/30 text-purple-400' : 'bg-purple-50 text-purple-600'}`}>
                {recurringSummary.count} récurrent{recurringSummary.count > 1 ? 's' : ''}
              </span>
            </div>
            <div className={`text-xs ${textSecondary}`}>
              Impact mensuel : <span className={`font-bold ${recurringSummary.net >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                {recurringSummary.net >= 0 ? '+' : ''}{formatMoney(recurringSummary.net)}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
            <div className={`p-3 rounded-xl border ${isDark ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-emerald-50 border-emerald-100'}`}>
              <p className={`text-[10px] font-semibold uppercase tracking-wide ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>Entrées récurrentes / mois</p>
              <p className={`text-lg font-bold ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>+{formatMoney(recurringSummary.totalEntrees)}</p>
            </div>
            <div className={`p-3 rounded-xl border ${isDark ? 'bg-red-500/5 border-red-500/20' : 'bg-red-50 border-red-100'}`}>
              <p className={`text-[10px] font-semibold uppercase tracking-wide ${isDark ? 'text-red-400' : 'text-red-600'}`}>Sorties récurrentes / mois</p>
              <p className={`text-lg font-bold ${isDark ? 'text-red-400' : 'text-red-600'}`}>-{formatMoney(recurringSummary.totalSorties)}</p>
            </div>
            <div className={`p-3 rounded-xl border ${isDark ? 'bg-slate-700/50 border-slate-600' : 'bg-gray-50 border-gray-200'}`}>
              <p className={`text-[10px] font-semibold uppercase tracking-wide ${textSecondary}`}>Impact annuel estimé</p>
              <p className={`text-lg font-bold ${recurringSummary.net >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                {recurringSummary.net >= 0 ? '+' : ''}{formatMoney(recurringSummary.net * 12)}
              </p>
            </div>
          </div>

          {/* Recurring items list */}
          <div className="space-y-2">
            {recurringSummary.parents.map(p => {
              const isEntree = p.type === 'entree';
              const catColors = CATEGORY_COLORS[p.categorie] || CATEGORY_COLORS.Divers;
              const freqLabel = p.recurrence === 'mensuel' ? '/mois' : p.recurrence === 'trimestriel' ? '/trim.' : '/an';
              // Count future pending instances
              const pendingCount = previsions.filter(ch =>
                (ch.recurrenceParentId === p.id || ch.id === p.id) && ch.statut === 'prevu'
              ).length;
              return (
                <div key={p.id} className={`flex items-center justify-between p-3 rounded-xl border ${isDark ? 'bg-slate-700/30 border-slate-600 hover:bg-slate-700/50' : 'bg-white border-gray-200 hover:bg-gray-50'} transition-colors`}>
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isEntree ? isDark ? 'bg-emerald-500/15' : 'bg-emerald-50' : isDark ? 'bg-red-500/15' : 'bg-red-50'}`}>
                      {isEntree ? <ArrowDown size={14} className="text-emerald-500" /> : <ArrowUp size={14} className="text-red-500" />}
                    </div>
                    <div>
                      <p className={`text-sm font-medium ${textPrimary}`}>{p.description}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className={`text-[10px] px-1.5 py-0.5 rounded ${isDark ? catColors.dark : catColors.bg}`}>{p.categorie}</span>
                        <span className={`text-[10px] ${textSecondary}`}>{pendingCount} échéance{pendingCount > 1 ? 's' : ''} à venir</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-bold ${isEntree ? 'text-emerald-500' : 'text-red-500'}`}>
                      {isEntree ? '+' : '-'}{formatMoney(p.montant)} {freqLabel}
                    </p>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded ${isDark ? 'bg-purple-900/30 text-purple-400' : 'bg-purple-50 text-purple-600'}`}>
                      🔄 {p.recurrence}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Auto-sync indicator ──────────────────────────────────────── */}
      {(autoSyncCount.factures > 0 || autoSyncCount.depenses > 0) && (activeTab === 'apercu') && (
        <div className={`flex items-center gap-3 p-3 rounded-xl border text-xs ${isDark ? 'bg-slate-800/50 border-slate-700 text-slate-400' : 'bg-gray-50 border-gray-200 text-gray-500'}`}>
          <Link2 size={14} className="flex-shrink-0" />
          <span>
            Synchronisation auto : <strong>{autoSyncCount.factures}</strong> facture{autoSyncCount.factures > 1 ? 's' : ''} et <strong>{autoSyncCount.depenses}</strong> dépense{autoSyncCount.depenses > 1 ? 's' : ''} liées aux prévisions
          </span>
        </div>
      )}

      {/* ── Quick Add FAB ──────────────────────────────────────────── */}
      {activeTab === 'mouvements' ? (
        <button onClick={() => { setEditingMouv(null); setShowMouvModal(true); }}
          className="fixed bottom-6 right-6 z-40 w-14 h-14 rounded-full flex items-center justify-center shadow-xl text-white transition-transform hover:scale-110 active:scale-95"
          style={{ backgroundColor: couleur }} title="Ajouter un mouvement">
          <Plus size={24} />
        </button>
      ) : (
        <button onClick={() => { setEditingItem(null); setShowAddModal(true); }}
          className="fixed bottom-6 right-6 z-40 w-14 h-14 rounded-full flex items-center justify-center shadow-xl text-white transition-transform hover:scale-110 active:scale-95"
          style={{ backgroundColor: couleur }} title="Ajouter une prévision">
          <Plus size={24} />
        </button>
      )}

      {/* ── Prefill Confirmation Modal ──────────────────────────────── */}
      {showPrefillConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowPrefillConfirm(false)} />
          <div className={`relative w-full max-w-md rounded-2xl border shadow-2xl p-6 ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'}`}>
            <div className="flex items-start gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${couleur}20`, color: couleur }}>
                <Zap size={20} />
              </div>
              <div>
                <h3 className={`text-base font-bold ${textPrimary}`}>Pré-remplir les charges BTP ?</h3>
                <p className={`text-sm mt-1 ${textSecondary}`}>
                  Cette action va ajouter {STARTER_TEMPLATES.length} charges récurrentes courantes du BTP (loyer, assurance, salaires, etc.).
                </p>
              </div>
            </div>
            <div className={`p-3 rounded-xl border mb-4 ${isDark ? 'bg-slate-700/50 border-slate-600' : 'bg-gray-50 border-gray-200'}`}>
              <p className={`text-xs font-semibold mb-2 ${textSecondary}`}>Charges ajoutées :</p>
              {STARTER_TEMPLATES.map((t, i) => (
                <div key={i} className={`flex items-center justify-between py-1 text-xs ${textSecondary}`}>
                  <span>{t.description}</span>
                  <span className="font-semibold text-red-500">-{formatMoney(t.montant)}/mois</span>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-end gap-3">
              <button onClick={() => setShowPrefillConfirm(false)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${isDark ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-700'}`}>
                Annuler
              </button>
              <button onClick={handlePrefill}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 active:scale-[0.98] shadow-md"
                style={{ backgroundColor: couleur }}>
                <Zap size={16} /> Confirmer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Prevision Modal ────────────────────────────────────────── */}
      <PrevisionModal
        isOpen={showAddModal}
        onClose={() => { setShowAddModal(false); setEditingItem(null); }}
        onSave={handleSavePrevision}
        editItem={editingItem}
        isDark={isDark}
        couleur={couleur}
      />

      {/* ── Mouvement Modal ────────────────────────────────────────── */}
      <MouvementModal
        isOpen={showMouvModal}
        onClose={() => { setShowMouvModal(false); setEditingMouv(null); }}
        onSave={handleSaveMouvement}
        editItem={editingMouv}
        isDark={isDark}
        couleur={couleur}
      />
    </div>
  );
}
