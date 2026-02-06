/**
 * TresorerieModule - Full-page cash flow management module
 *
 * Provides a comprehensive treasury overview for construction companies:
 * - KPI cards (solde, entrees/sorties prevues, projection)
 * - SVG bar chart with monthly cash flow + cumulative balance line
 * - Upcoming payments table (invoices + recurring charges)
 * - Quick-add modal for previsions (persisted to localStorage)
 * - Alerts for projected negative balance or large upcoming payments
 *
 * All data comes via props (no DataContext import).
 *
 * @module TresorerieModule
 */

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  Wallet,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  Plus,
  X,
  AlertTriangle,
  Info,
  ArrowDown,
  ArrowUp,
  Clock,
  BarChart3,
  Save,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STORAGE_KEY = 'cp_tresorerie_previsions';

const MONTH_NAMES = ['Jan', 'Fev', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aou', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTH_NAMES_FULL = [
  'Janvier', 'Fevrier', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Aout', 'Septembre', 'Octobre', 'Novembre', 'Decembre',
];

/** Period filter options shown in the header */
const PERIOD_OPTIONS = [
  { key: '1m', label: 'Ce mois' },
  { key: '3m', label: '3 mois' },
  { key: '6m', label: '6 mois' },
  { key: '1y', label: '1 an' },
];

/** Tabs for the main content area */
const TABS = [
  { key: 'apercu', label: 'Apercu' },
  { key: 'previsions', label: 'Prévisions' },
  { key: 'historique', label: 'Historique' },
];

/** Categories for quick-add previsions */
const CATEGORIES_PREVISION = [
  'Client',
  'Fournisseur',
  'Loyer',
  'Assurance',
  'Salaires',
  'Materiaux',
  'Sous-traitance',
  'Divers',
];

/** Mock recurring charges used when projecting future months */
const RECURRING_CHARGES = [
  { description: 'Loyer local / depot', montant: 1800, categorie: 'Loyer' },
  { description: 'Assurance pro (RC/decennale)', montant: 450, categorie: 'Assurance' },
  { description: 'Salaires et charges', montant: 8500, categorie: 'Salaires' },
  { description: 'Leasing vehicules', montant: 650, categorie: 'Divers' },
];

const MONTHLY_RECURRING_TOTAL = RECURRING_CHARGES.reduce((s, c) => s + c.montant, 0);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Format amount as EUR currency (French locale, no decimals) */
const formatCurrency = (amount) =>
  new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount || 0);

/** Compact currency display for chart axis */
const formatCompact = (amount) => {
  if (Math.abs(amount) >= 1_000_000) return `${(amount / 1_000_000).toFixed(1)}M`;
  if (Math.abs(amount) >= 1_000) return `${Math.round(amount / 1_000)}k`;
  return `${Math.round(amount)}`;
};

/** Return { month, year } from a Date */
const monthKey = (d) => ({ month: d.getMonth(), year: d.getFullYear() });

/** Check whether two month/year pairs match */
const sameMonth = (a, b) => a.month === b.month && a.year === b.year;

/** Number of months to look back / forward for a given period key */
const periodMonths = (key) => {
  switch (key) {
    case '1m': return 1;
    case '3m': return 3;
    case '6m': return 6;
    case '1y': return 12;
    default: return 6;
  }
};

// ---------------------------------------------------------------------------
// localStorage helpers for user-added previsions
// ---------------------------------------------------------------------------

function loadPrevisions() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function savePrevisions(list) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch {
    /* quota exceeded – silent fail */
  }
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

/**
 * KPI Card – used for the 4 summary indicators at the top.
 */
function KpiCard({ label, value, icon: Icon, trend, trendLabel, color, isDark, accent }) {
  const isPositive = trend > 0;
  const isNegative = trend < 0;

  return (
    <div
      className={`relative overflow-hidden rounded-2xl p-5 border transition-shadow ${
        isDark
          ? 'bg-slate-800 border-slate-700 hover:shadow-lg hover:shadow-slate-900/30'
          : 'bg-white border-gray-200 hover:shadow-lg hover:shadow-gray-200/60'
      }`}
    >
      {/* Top accent bar */}
      <div className="absolute top-0 left-0 right-0 h-1" style={{ backgroundColor: accent || color }} />

      <div className="flex items-start justify-between mb-3">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ backgroundColor: `${color}20`, color }}
        >
          <Icon size={20} />
        </div>
        {trend !== undefined && trend !== null && isFinite(trend) && (
          <span
            className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full ${
              isPositive
                ? isDark ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-100 text-emerald-700'
                : isNegative
                  ? isDark ? 'bg-red-500/20 text-red-400' : 'bg-red-100 text-red-700'
                  : isDark ? 'bg-gray-700 text-gray-400' : 'bg-gray-100 text-gray-500'
            }`}
          >
            {isPositive ? <ArrowUpRight size={14} /> : isNegative ? <ArrowDownRight size={14} /> : null}
            {isPositive ? '+' : ''}{Math.round(trend)}%
          </span>
        )}
      </div>

      <p className={`text-xs font-semibold uppercase tracking-wide mb-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
        {label}
      </p>
      <p className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{value}</p>
      {trendLabel && (
        <p className={`text-xs mt-1 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>{trendLabel}</p>
      )}
    </div>
  );
}

/**
 * SVG-based bar chart showing monthly entrées / sorties with a cumulative balance line.
 * No external charting library – pure SVG.
 */
function CashFlowChart({ data, isDark, couleur }) {
  // Chart dimensions
  const width = 800;
  const height = 320;
  const padTop = 30;
  const padBottom = 40;
  const padLeft = 60;
  const padRight = 20;
  const chartW = width - padLeft - padRight;
  const chartH = height - padTop - padBottom;

  // Determine scales
  const maxBar = Math.max(...data.map((d) => Math.max(d.entrees, d.sorties)), 1);
  const allBalances = data.map((d) => d.cumulBalance);
  const minBal = Math.min(...allBalances, 0);
  const maxBal = Math.max(...allBalances, maxBar);
  const barScale = chartH / (maxBar * 1.15); // leave 15% headroom
  const balMin = minBal - Math.abs(minBal) * 0.1;
  const balMax = maxBal + Math.abs(maxBal) * 0.1 || 1;
  const balRange = balMax - balMin || 1;

  const barGroupWidth = chartW / data.length;
  const barWidth = Math.min(barGroupWidth * 0.3, 32);
  const gap = 4;

  // Y-axis ticks for bar values (0 to maxBar)
  const tickCount = 5;
  const tickStep = maxBar / tickCount;
  const ticks = Array.from({ length: tickCount + 1 }, (_, i) => Math.round(i * tickStep));

  // Build cumulative balance polyline points
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
      {/* Horizontal grid lines */}
      {ticks.map((t) => {
        const y = padTop + chartH - t * barScale;
        return (
          <g key={`grid-${t}`}>
            <line x1={padLeft} y1={y} x2={width - padRight} y2={y} stroke={gridColor} strokeDasharray="4 4" />
            <text x={padLeft - 8} y={y + 4} textAnchor="end" fill={textColor} fontSize={11}>
              {formatCompact(t)}
            </text>
          </g>
        );
      })}

      {/* Bars and labels */}
      {data.map((d, i) => {
        const cx = padLeft + barGroupWidth * i + barGroupWidth / 2;
        const entreeH = d.entrees * barScale;
        const sortieH = d.sorties * barScale;
        const baseY = padTop + chartH;

        return (
          <g key={d.label}>
            {/* Entrees bar (positive, left) */}
            <rect
              x={cx - barWidth - gap / 2}
              y={baseY - entreeH}
              width={barWidth}
              height={entreeH}
              rx={4}
              fill={positiveColor}
              opacity={0.85}
            />
            {/* Sorties bar (negative, right) */}
            <rect
              x={cx + gap / 2}
              y={baseY - sortieH}
              width={barWidth}
              height={sortieH}
              rx={4}
              fill={negativeColor}
              opacity={0.85}
            />
            {/* X-axis label */}
            <text x={cx} y={baseY + 20} textAnchor="middle" fill={textColor} fontSize={11} fontWeight={d.isCurrent ? 700 : 400}>
              {d.label}
            </text>
            {/* Highlight current month */}
            {d.isCurrent && (
              <circle cx={cx} cy={baseY + 32} r={3} fill={positiveColor} />
            )}
          </g>
        );
      })}

      {/* Cumulative balance polyline */}
      <polyline
        points={balPoints}
        fill="none"
        stroke={isDark ? '#facc15' : '#ca8a04'}
        strokeWidth={2.5}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {/* Dots on balance line */}
      {data.map((d, i) => {
        const x = padLeft + barGroupWidth * i + barGroupWidth / 2;
        const y = padTop + chartH - ((d.cumulBalance - balMin) / balRange) * chartH;
        return (
          <circle
            key={`dot-${i}`}
            cx={x}
            cy={y}
            r={4}
            fill={isDark ? '#facc15' : '#ca8a04'}
            stroke={isDark ? '#1e293b' : '#ffffff'}
            strokeWidth={2}
          />
        );
      })}

      {/* Legend */}
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
 * Modal for adding a new cash-flow prevision.
 */
function QuickAddModal({ isOpen, onClose, onSave, isDark, couleur }) {
  const [form, setForm] = useState({
    type: 'entree',
    description: '',
    montant: '',
    date: new Date().toISOString().slice(0, 10),
    categorie: 'Client',
    recurrence: 'unique',
  });

  const handleChange = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.description.trim() || !form.montant) return;
    onSave({
      ...form,
      description: form.description.trim(),
      montant: parseFloat(form.montant) || 0,
      id: `prev_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      createdAt: new Date().toISOString(),
    });
    // Reset form
    setForm({ type: 'entree', description: '', montant: '', date: new Date().toISOString().slice(0, 10), categorie: 'Client', recurrence: 'unique' });
    onClose();
  };

  if (!isOpen) return null;

  const inputCls = `w-full rounded-xl px-3 py-2.5 text-sm border transition-colors focus:outline-none focus:ring-2 ${
    isDark
      ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400 focus:ring-blue-500/40'
      : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400 focus:ring-blue-500/30'
  }`;
  const labelCls = `block text-xs font-semibold mb-1 ${isDark ? 'text-gray-300' : 'text-gray-600'}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <form
        onSubmit={handleSubmit}
        className={`relative w-full max-w-md rounded-2xl border shadow-2xl ${
          isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'
        }`}
      >
        {/* Header */}
        <div className={`flex items-center justify-between px-5 py-4 border-b ${isDark ? 'border-slate-700' : 'border-gray-100'}`}>
          <h3 className={`text-base font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Nouvelle prévision
          </h3>
          <button type="button" onClick={onClose} className={`p-1.5 rounded-lg transition-colors ${isDark ? 'hover:bg-slate-700 text-gray-400' : 'hover:bg-gray-100 text-gray-500'}`}>
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4 space-y-4">
          {/* Type toggle */}
          <div>
            <label className={labelCls}>Type</label>
            <div className={`inline-flex rounded-xl p-1 ${isDark ? 'bg-slate-700' : 'bg-gray-100'}`}>
              {['entree', 'sortie'].map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => handleChange('type', t)}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                    form.type === t
                      ? t === 'entree'
                        ? 'bg-emerald-500 text-white shadow-md'
                        : 'bg-red-500 text-white shadow-md'
                      : isDark ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {t === 'entree' ? 'Entree' : 'Sortie'}
                </button>
              ))}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className={labelCls}>Description</label>
            <input type="text" className={inputCls} placeholder="Ex: Facture chantier Dupont" value={form.description} onChange={(e) => handleChange('description', e.target.value)} required />
          </div>

          {/* Montant + Date row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Montant (EUR)</label>
              <input type="number" className={inputCls} placeholder="0" min="0" step="0.01" value={form.montant} onChange={(e) => handleChange('montant', e.target.value)} required />
            </div>
            <div>
              <label className={labelCls}>Date prevue</label>
              <input type="date" className={inputCls} value={form.date} onChange={(e) => handleChange('date', e.target.value)} required />
            </div>
          </div>

          {/* Categorie + Recurrence row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Categorie</label>
              <select className={inputCls} value={form.categorie} onChange={(e) => handleChange('categorie', e.target.value)}>
                {CATEGORIES_PREVISION.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>Recurrence</label>
              <select className={inputCls} value={form.recurrence} onChange={(e) => handleChange('recurrence', e.target.value)}>
                <option value="unique">Unique</option>
                <option value="mensuel">Mensuel</option>
                <option value="trimestriel">Trimestriel</option>
                <option value="annuel">Annuel</option>
              </select>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className={`flex items-center justify-end gap-3 px-5 py-4 border-t ${isDark ? 'border-slate-700' : 'border-gray-100'}`}>
          <button type="button" onClick={onClose} className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${isDark ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-700'}`}>
            Annuler
          </button>
          <button
            type="submit"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 active:scale-[0.98] shadow-md"
            style={{ backgroundColor: couleur || '#3b82f6' }}
          >
            <Save size={16} />
            Enregistrer
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
  devis = [],
  depenses = [],
  chantiers = [],
  clients = [],
  entreprise,
  isDark = false,
  couleur = '#3b82f6',
  setPage,
}) {
  // -- State ------------------------------------------------------------------

  const [period, setPeriod] = useState('6m');
  const [activeTab, setActiveTab] = useState('apercu');
  const [showAddModal, setShowAddModal] = useState(false);
  const [previsions, setPrevisions] = useState(loadPrevisions);

  // Persist previsions to localStorage whenever they change
  useEffect(() => {
    savePrevisions(previsions);
  }, [previsions]);

  const handleAddPrevision = useCallback((prev) => {
    setPrevisions((list) => [...list, prev]);
  }, []);

  const handleDeletePrevision = useCallback((id) => {
    setPrevisions((list) => list.filter((p) => p.id !== id));
  }, []);

  // -- Derived data -----------------------------------------------------------

  const now = useMemo(() => new Date(), []);

  /**
   * Build monthly aggregates from real data (devis/factures + depenses)
   * and project future months using unpaid invoices + recurring charges.
   */
  const {
    soldeActuel,
    totalEncaisse,
    totalDepense,
    entreesPrevues,
    sortiesPrevues,
    projectionFinMois,
    monthlyData, // array for the chart
    upcomingPayments, // array for the payments table
    alertNegativeBalance,
    alertLargePayment,
    trendSolde,
  } = useMemo(() => {
    // ---- 1. Classify devis / factures ------------------------------------
    const factures = devis.filter((d) => d.type === 'facture');
    const facturesPayees = factures.filter((f) => f.statut === 'payee');
    const facturesImpayees = factures.filter((f) => f.statut !== 'payee');

    // Total encaisse = all paid invoices TTC
    const totalEnc = facturesPayees.reduce((s, f) => s + (f.total_ttc || 0), 0);

    // Total depense = all recorded expenses
    const totalDep = depenses.reduce((s, d) => s + (d.montant || 0), 0);

    const solde = totalEnc - totalDep;

    // Entrees prevues = remaining amount on unpaid invoices
    const entPrev = facturesImpayees.reduce((s, f) => {
      const reste = (f.total_ttc || 0) - (f.montant_paye || 0);
      return s + Math.max(reste, 0);
    }, 0);

    // Sorties prevues = one month of recurring charges + user previsions sorties in next 30 days
    const in30 = new Date(now);
    in30.setDate(in30.getDate() + 30);

    const previsionsSorties30 = previsions
      .filter((p) => p.type === 'sortie' && new Date(p.date) <= in30 && new Date(p.date) >= now)
      .reduce((s, p) => s + (p.montant || 0), 0);

    const sorPrev = MONTHLY_RECURRING_TOTAL + previsionsSorties30;

    // Projection fin de mois = solde + entrees prevues this month - sorties prevues this month
    const projFin = solde + entPrev - sorPrev;

    // ---- 2. Build monthly buckets ----------------------------------------
    // We show up to 12 months: some past + some future depending on period
    const numMonths = Math.max(periodMonths(period), 6);
    const pastMonths = Math.min(numMonths, 6);
    const futureMonths = numMonths - pastMonths;

    const buckets = [];
    for (let i = pastMonths - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      buckets.push({
        month: d.getMonth(),
        year: d.getFullYear(),
        label: MONTH_NAMES[d.getMonth()],
        entrees: 0,
        sorties: 0,
        isCurrent: i === 0,
        isFuture: false,
      });
    }
    for (let i = 1; i <= futureMonths; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
      buckets.push({
        month: d.getMonth(),
        year: d.getFullYear(),
        label: MONTH_NAMES[d.getMonth()],
        entrees: 0,
        sorties: 0,
        isCurrent: false,
        isFuture: true,
      });
    }

    // Populate past months with real data
    facturesPayees.forEach((f) => {
      const d = new Date(f.date);
      const mk = monthKey(d);
      const bucket = buckets.find((b) => sameMonth(b, mk));
      if (bucket && !bucket.isFuture) {
        bucket.entrees += f.total_ttc || 0;
      }
    });

    depenses.forEach((dep) => {
      const d = new Date(dep.date || dep.createdAt);
      const mk = monthKey(d);
      const bucket = buckets.find((b) => sameMonth(b, mk));
      if (bucket && !bucket.isFuture) {
        bucket.sorties += dep.montant || 0;
      }
    });

    // Populate future months with projections
    buckets.forEach((b) => {
      if (!b.isFuture) return;

      // Projected entries: distribute unpaid invoices across next months (simple split)
      // + user previsions entrees for this month
      const monthPrevEntrees = previsions
        .filter((p) => p.type === 'entree' && sameMonth(monthKey(new Date(p.date)), b))
        .reduce((s, p) => s + (p.montant || 0), 0);
      b.entrees = monthPrevEntrees;

      // Recurring charges
      const monthPrevSorties = previsions
        .filter((p) => p.type === 'sortie' && sameMonth(monthKey(new Date(p.date)), b))
        .reduce((s, p) => s + (p.montant || 0), 0);
      b.sorties = MONTHLY_RECURRING_TOTAL + monthPrevSorties;
    });

    // Also add user previsions to past/current months that haven't been accounted for
    previsions.forEach((p) => {
      const mk = monthKey(new Date(p.date));
      const bucket = buckets.find((b) => sameMonth(b, mk) && !b.isFuture);
      if (!bucket) return;
      if (p.type === 'entree') bucket.entrees += p.montant || 0;
      else bucket.sorties += p.montant || 0;
    });

    // Cumulative balance
    let cumul = 0;
    const chartData = buckets.map((b) => {
      cumul += b.entrees - b.sorties;
      return { ...b, cumulBalance: cumul };
    });

    // ---- 3. Upcoming payments list ----------------------------------------
    const payments = [];

    // Unpaid invoices as upcoming entrees
    facturesImpayees.forEach((f) => {
      const client = clients.find((c) => c.id === f.client_id);
      const reste = (f.total_ttc || 0) - (f.montant_paye || 0);
      if (reste <= 0) return;
      payments.push({
        id: `fac_${f.id}`,
        date: f.date_echeance || f.date,
        description: `Facture ${f.numero || f.id?.slice(-6) || '---'} – ${client?.nom || 'Client'}`,
        type: 'entree',
        montant: reste,
        statut: 'En attente',
        source: 'facture',
      });
    });

    // Recent/past depenses as historical sorties (last 30 days)
    const thirtyAgo = new Date(now);
    thirtyAgo.setDate(thirtyAgo.getDate() - 30);
    depenses
      .filter((d) => new Date(d.date || d.createdAt) >= thirtyAgo)
      .forEach((dep) => {
        payments.push({
          id: `dep_${dep.id}`,
          date: dep.date || dep.createdAt,
          description: dep.description || `Depense ${dep.fournisseur || ''}`,
          type: 'sortie',
          montant: dep.montant || 0,
          statut: 'Paye',
          source: 'depense',
        });
      });

    // Mock recurring charges for current month
    RECURRING_CHARGES.forEach((rc, idx) => {
      const dateStr = new Date(now.getFullYear(), now.getMonth(), 5 + idx * 3).toISOString().slice(0, 10);
      payments.push({
        id: `rec_${idx}`,
        date: dateStr,
        description: rc.description,
        type: 'sortie',
        montant: rc.montant,
        statut: new Date(dateStr) <= now ? 'Paye' : 'Prevu',
        source: 'recurrent',
      });
    });

    // User previsions
    previsions.forEach((p) => {
      payments.push({
        id: p.id,
        date: p.date,
        description: p.description,
        type: p.type,
        montant: p.montant,
        statut: 'Prevu',
        source: 'prevision',
      });
    });

    // Sort by date ascending
    payments.sort((a, b) => new Date(a.date) - new Date(b.date));

    // ---- 4. Alerts ----------------------------------------------------------
    // Check if projected cumulative balance goes negative in next 30 days
    const futureNegative = chartData
      .filter((d) => d.isFuture || d.isCurrent)
      .some((d) => d.cumulBalance < 0);

    // Large payment alert: any single unpaid invoice > 10 000 EUR due in next 7 days
    const in7 = new Date(now);
    in7.setDate(in7.getDate() + 7);
    const bigPayment = facturesImpayees.find((f) => {
      const due = new Date(f.date_echeance || f.date);
      const reste = (f.total_ttc || 0) - (f.montant_paye || 0);
      return due <= in7 && due >= now && reste >= 10000;
    });

    // Simple trend: compare current month entrees vs previous month entrees
    const currentBucket = chartData.find((b) => b.isCurrent);
    const prevBucketIdx = chartData.findIndex((b) => b.isCurrent) - 1;
    const prevBucket = prevBucketIdx >= 0 ? chartData[prevBucketIdx] : null;
    let trend = null;
    if (prevBucket && prevBucket.entrees > 0) {
      trend = Math.round(((currentBucket.entrees - prevBucket.entrees) / prevBucket.entrees) * 100);
    }

    return {
      soldeActuel: solde,
      totalEncaisse: totalEnc,
      totalDepense: totalDep,
      entreesPrevues: entPrev,
      sortiesPrevues: sorPrev,
      projectionFinMois: projFin,
      monthlyData: chartData,
      upcomingPayments: payments,
      alertNegativeBalance: futureNegative,
      alertLargePayment: bigPayment,
      trendSolde: trend,
    };
  }, [devis, depenses, clients, previsions, now, period]);

  // -- Filtered payments for current tab -----------------------------------

  const filteredPayments = useMemo(() => {
    if (activeTab === 'previsions') {
      return upcomingPayments.filter((p) => p.statut === 'Prevu' || p.statut === 'En attente');
    }
    if (activeTab === 'historique') {
      return upcomingPayments.filter((p) => p.statut === 'Paye');
    }
    return upcomingPayments;
  }, [upcomingPayments, activeTab]);

  // -- Render -----------------------------------------------------------------

  const cardBg = isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200';
  const textPrimary = isDark ? 'text-white' : 'text-gray-900';
  const textSecondary = isDark ? 'text-gray-400' : 'text-gray-500';
  const borderColor = isDark ? 'border-slate-700' : 'border-gray-200';

  return (
    <div className="space-y-6">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg"
            style={{ backgroundColor: couleur }}
          >
            <Wallet size={24} className="text-white" />
          </div>
          <div>
            <h1 className={`text-2xl font-bold ${textPrimary}`}>Trésorerie</h1>
            <p className={`text-sm ${textSecondary}`}>
              Solde actuel :{' '}
              <span className={`font-bold ${soldeActuel >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                {formatCurrency(soldeActuel)}
              </span>
            </p>
          </div>
        </div>

        {/* Period selector */}
        <div className={`inline-flex rounded-xl p-1 ${isDark ? 'bg-slate-800 border border-slate-700' : 'bg-gray-100'}`}>
          {PERIOD_OPTIONS.map((opt) => (
            <button
              key={opt.key}
              onClick={() => setPeriod(opt.key)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                period === opt.key
                  ? isDark ? 'bg-slate-700 text-white shadow-sm' : 'bg-white text-gray-900 shadow-sm'
                  : isDark ? 'text-gray-400 hover:text-gray-200' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Alerts ──────────────────────────────────────────────────────── */}
      {alertNegativeBalance && (
        <div
          className={`flex items-start gap-3 p-4 rounded-2xl border ${
            isDark
              ? 'bg-amber-500/10 border-amber-500/30'
              : 'bg-amber-50 border-amber-200'
          }`}
        >
          <AlertTriangle size={20} className={isDark ? 'text-amber-400' : 'text-amber-600'} />
          <div>
            <p className={`text-sm font-semibold ${isDark ? 'text-amber-300' : 'text-amber-800'}`}>
              Attention : solde négatif prévu
            </p>
            <p className={`text-xs mt-0.5 ${isDark ? 'text-amber-400' : 'text-amber-600'}`}>
              La projection indique un solde négatif dans les 30 prochains jours. Pensez à relancer vos factures impayées.
            </p>
          </div>
        </div>
      )}

      {alertLargePayment && (
        <div
          className={`flex items-start gap-3 p-4 rounded-2xl border ${
            isDark
              ? 'bg-blue-500/10 border-blue-500/30'
              : 'bg-blue-50 border-blue-200'
          }`}
        >
          <Info size={20} className={isDark ? 'text-blue-400' : 'text-blue-600'} />
          <div>
            <p className={`text-sm font-semibold ${isDark ? 'text-blue-300' : 'text-blue-800'}`}>
              Paiement important attendu
            </p>
            <p className={`text-xs mt-0.5 ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>
              Facture {alertLargePayment.numero || ''} de {formatCurrency(alertLargePayment.total_ttc)} attendue dans les 7 prochains jours.
            </p>
          </div>
        </div>
      )}

      {/* ── KPI Cards ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Solde actuel"
          value={formatCurrency(soldeActuel)}
          icon={Wallet}
          trend={trendSolde}
          trendLabel="vs mois dernier"
          color={soldeActuel >= 0 ? '#10b981' : '#ef4444'}
          accent={couleur}
          isDark={isDark}
        />
        <KpiCard
          label="Entrées prévues"
          value={formatCurrency(entreesPrevues)}
          icon={ArrowDown}
          color="#3b82f6"
          trendLabel="Factures impayées"
          isDark={isDark}
        />
        <KpiCard
          label="Sorties prévues"
          value={formatCurrency(sortiesPrevues)}
          icon={ArrowUp}
          color="#f59e0b"
          trendLabel="Charges récurrentes + prévisions"
          isDark={isDark}
        />
        <KpiCard
          label="Projection fin de mois"
          value={formatCurrency(projectionFinMois)}
          icon={TrendingUp}
          color={projectionFinMois >= 0 ? '#10b981' : '#ef4444'}
          trendLabel="Solde + entrees - sorties"
          isDark={isDark}
        />
      </div>

      {/* ── Cash Flow Chart ─────────────────────────────────────────────── */}
      <div className={`rounded-2xl border p-5 ${cardBg}`}>
        <div className="flex items-center justify-between mb-4">
          <h2 className={`text-base font-bold ${textPrimary}`}>
            Flux de trésorerie
          </h2>
          <div className={`flex items-center gap-2 text-xs ${textSecondary}`}>
            <BarChart3 size={14} />
            {monthlyData.length} mois affichés
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

      {/* ── Tabs ────────────────────────────────────────────────────────── */}
      <div className={`rounded-2xl border ${cardBg}`}>
        {/* Tab bar */}
        <div className={`flex items-center gap-1 px-5 pt-4 border-b ${borderColor}`}>
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2.5 text-sm font-medium rounded-t-lg transition-colors relative ${
                activeTab === tab.key
                  ? `${textPrimary} font-semibold`
                  : `${textSecondary} hover:${isDark ? 'text-gray-200' : 'text-gray-700'}`
              }`}
            >
              {tab.label}
              {activeTab === tab.key && (
                <span
                  className="absolute bottom-0 left-2 right-2 h-0.5 rounded-full"
                  style={{ backgroundColor: couleur }}
                />
              )}
            </button>
          ))}
        </div>

        {/* Table content */}
        <div className="px-5 py-4">
          {filteredPayments.length === 0 ? (
            <div className={`text-center py-10 ${textSecondary}`}>
              <Clock size={36} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm">Aucun mouvement pour cette vue</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className={`text-xs uppercase tracking-wide ${textSecondary} border-b ${borderColor}`}>
                    <th className="text-left py-3 pr-4 font-semibold">Date prevue</th>
                    <th className="text-left py-3 pr-4 font-semibold">Description</th>
                    <th className="text-left py-3 pr-4 font-semibold">Type</th>
                    <th className="text-right py-3 pr-4 font-semibold">Montant</th>
                    <th className="text-left py-3 font-semibold">Statut</th>
                    {activeTab !== 'historique' && (
                      <th className="text-right py-3 font-semibold w-10"></th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {filteredPayments.map((p) => {
                    const isEntree = p.type === 'entree';
                    const dateStr = p.date ? new Date(p.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

                    return (
                      <tr
                        key={p.id}
                        className={`border-b last:border-b-0 transition-colors ${
                          isDark ? 'border-slate-700/50 hover:bg-slate-700/30' : 'border-gray-100 hover:bg-gray-50'
                        }`}
                      >
                        <td className={`py-3 pr-4 ${textSecondary} whitespace-nowrap`}>{dateStr}</td>
                        <td className={`py-3 pr-4 ${textPrimary} font-medium max-w-xs truncate`}>{p.description}</td>
                        <td className="py-3 pr-4">
                          <span
                            className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full ${
                              isEntree
                                ? isDark ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-100 text-emerald-700'
                                : isDark ? 'bg-red-500/20 text-red-400' : 'bg-red-100 text-red-700'
                            }`}
                          >
                            {isEntree ? <ArrowDown size={12} /> : <ArrowUp size={12} />}
                            {isEntree ? 'Entree' : 'Sortie'}
                          </span>
                        </td>
                        <td className={`py-3 pr-4 text-right font-bold whitespace-nowrap ${
                          isEntree ? 'text-emerald-500' : 'text-red-500'
                        }`}>
                          {isEntree ? '+' : '-'}{formatCurrency(p.montant)}
                        </td>
                        <td className="py-3">
                          <span className={`text-xs font-medium px-2 py-1 rounded-lg ${
                            p.statut === 'Paye'
                              ? isDark ? 'bg-slate-700 text-gray-400' : 'bg-gray-100 text-gray-500'
                              : p.statut === 'En attente'
                                ? isDark ? 'bg-amber-500/15 text-amber-400' : 'bg-amber-50 text-amber-600'
                                : isDark ? 'bg-blue-500/15 text-blue-400' : 'bg-blue-50 text-blue-600'
                          }`}>
                            {p.statut}
                          </span>
                        </td>
                        {activeTab !== 'historique' && (
                          <td className="py-3 text-right">
                            {p.source === 'prevision' && (
                              <button
                                onClick={() => handleDeletePrevision(p.id)}
                                className={`p-1.5 rounded-lg transition-colors ${
                                  isDark ? 'hover:bg-red-500/20 text-gray-500 hover:text-red-400' : 'hover:bg-red-50 text-gray-400 hover:text-red-500'
                                }`}
                                title="Supprimer la prévision"
                              >
                                <X size={14} />
                              </button>
                            )}
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ── Quick Add FAB ───────────────────────────────────────────────── */}
      <button
        onClick={() => setShowAddModal(true)}
        className="fixed bottom-6 right-6 z-40 w-14 h-14 rounded-full flex items-center justify-center shadow-xl text-white transition-transform hover:scale-110 active:scale-95"
        style={{ backgroundColor: couleur }}
        title="Ajouter une prévision"
      >
        <Plus size={24} />
      </button>

      {/* ── Quick Add Modal ─────────────────────────────────────────────── */}
      <QuickAddModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSave={handleAddPrevision}
        isDark={isDark}
        couleur={couleur}
      />
    </div>
  );
}
