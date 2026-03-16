import { useState, useMemo } from 'react';
import {
  Euro, TrendingUp, TrendingDown, Calculator,
  AlertTriangle, HelpCircle, ArrowLeft, Download, FileText, ClipboardList
} from 'lucide-react';

/**
 * TVAManager - Gestion TVA multi-taux BTP (simplifié)
 * Calcul automatique, guide des taux, formulaire CA3
 */

const TVA_RATES = [
  {
    rate: 20,
    label: 'Taux normal',
    description: 'Travaux neufs, chaudières gaz/fioul',
    color: '#ef4444',
    examples: ['Construction neuve', 'Chaudière gaz', 'Climatisation neuf'],
    ca3Line: '08',
  },
  {
    rate: 10,
    label: 'Taux intermédiaire',
    description: 'Travaux amélioration logement >2 ans',
    color: '#f59e0b',
    examples: ['Rénovation cuisine', 'Électricité', 'Plomberie'],
    ca3Line: '09',
  },
  {
    rate: 5.5,
    label: 'Taux réduit',
    description: 'Rénovation énergétique logement >2 ans',
    color: '#22c55e',
    examples: ['Isolation', 'Pompe à chaleur', 'Fenêtres double vitrage'],
    ca3Line: '9B',
  },
];

/**
 * Parse selectedPeriod string to get date range
 * Format: "T1-2026" -> { start: 2026-01-01, end: 2026-03-31 }
 * Format: "M01-2026" -> { start: 2026-01-01, end: 2026-01-31 }
 */
function getPeriodDateRange(period) {
  if (!period) return { start: null, end: null };

  const [prefix, yearStr] = period.split('-');
  const year = parseInt(yearStr);
  if (isNaN(year)) return { start: null, end: null };

  if (prefix.startsWith('T')) {
    const quarter = parseInt(prefix.substring(1));
    const startMonth = (quarter - 1) * 3;
    const start = new Date(year, startMonth, 1);
    const end = new Date(year, startMonth + 3, 0); // last day of quarter
    return { start, end };
  }

  if (prefix.startsWith('M')) {
    const month = parseInt(prefix.substring(1)) - 1;
    const start = new Date(year, month, 1);
    const end = new Date(year, month + 1, 0);
    return { start, end };
  }

  // Annual
  return { start: new Date(year, 0, 1), end: new Date(year, 11, 31) };
}

function isInPeriod(dateStr, periodRange) {
  if (!periodRange.start || !periodRange.end) return true;
  const d = new Date(dateStr);
  return d >= periodRange.start && d <= periodRange.end;
}

/** Generate period options for the dropdown */
function generatePeriodOptions() {
  const now = new Date();
  const currentYear = now.getFullYear();
  const options = [];

  // Quarters for current year and previous year
  for (const year of [currentYear, currentYear - 1]) {
    for (let q = 4; q >= 1; q--) {
      options.push({ value: `T${q}-${year}`, label: `T${q} ${year}` });
    }
  }

  return options;
}

export default function TVAManager({
  isDark = false,
  couleur = '#f97316',
  devis = [],
  factures = [],
  depenses = [],
}) {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedPeriod, setSelectedPeriod] = useState(() => {
    const now = new Date();
    const q = Math.ceil((now.getMonth() + 1) / 3);
    return `T${q}-${now.getFullYear()}`;
  });

  const textPrimary = isDark ? 'text-white' : 'text-slate-900';
  const textMuted = isDark ? 'text-slate-400' : 'text-slate-600';
  const cardBg = isDark ? 'bg-slate-800' : 'bg-white';
  const borderColor = isDark ? 'border-slate-700' : 'border-slate-200';
  const inputBg = isDark ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-slate-200';

  // Helper for safe currency calculation
  const calcTVA = (montantHT, tvaRate) => {
    return Math.round(montantHT * tvaRate) / 100;
  };

  const periodOptions = useMemo(() => generatePeriodOptions(), []);
  const periodRange = useMemo(() => getPeriodDateRange(selectedPeriod), [selectedPeriod]);

  // Calculate TVA summary from real data — filtered by period
  const tvaSummary = useMemo(() => {
    const facturesList = devis.filter(d =>
      d.type === 'facture' && isInPeriod(d.date, periodRange)
    );
    const filteredDepenses = depenses.filter(d =>
      isInPeriod(d.date || d.createdAt, periodRange)
    );

    // Breakdown by rate
    const byRate = {};
    TVA_RATES.forEach(r => {
      byRate[r.rate] = { baseHT: 0, tva: 0, count: 0 };
    });

    facturesList.forEach(f => {
      if (f.tvaDetails && typeof f.tvaDetails === 'object') {
        // Multi-rate support
        Object.entries(f.tvaDetails).forEach(([rate, detail]) => {
          const rateNum = parseFloat(rate);
          if (!byRate[rateNum]) byRate[rateNum] = { baseHT: 0, tva: 0, count: 0 };
          byRate[rateNum].baseHT += detail.base || 0;
          byRate[rateNum].tva += detail.montant || 0;
          byRate[rateNum].count += 1;
        });
      } else if (f.tvaParTaux && typeof f.tvaParTaux === 'object') {
        Object.entries(f.tvaParTaux).forEach(([rate, detail]) => {
          const rateNum = parseFloat(rate);
          if (!byRate[rateNum]) byRate[rateNum] = { baseHT: 0, tva: 0, count: 0 };
          byRate[rateNum].baseHT += detail.base || detail.baseHT || 0;
          byRate[rateNum].tva += detail.tva || detail.montant || 0;
          byRate[rateNum].count += 1;
        });
      } else {
        // Single rate fallback
        const rate = f.tvaRate || 10;
        if (!byRate[rate]) byRate[rate] = { baseHT: 0, tva: 0, count: 0 };
        byRate[rate].baseHT += f.total_ht || 0;
        byRate[rate].tva += calcTVA(f.total_ht || 0, rate);
        byRate[rate].count += 1;
      }
    });

    const collected = Object.values(byRate).reduce((sum, r) => sum + r.tva, 0);

    const deductible = filteredDepenses.reduce((acc, d) => {
      const rate = d.tvaRate || 20;
      return acc + calcTVA(d.montant || 0, rate);
    }, 0);

    const totalBaseHT = Object.values(byRate).reduce((sum, r) => sum + r.baseHT, 0);

    return {
      collected: Math.round(collected * 100) / 100,
      deductible: Math.round(deductible * 100) / 100,
      due: Math.round((collected - deductible) * 100) / 100,
      facturesCount: facturesList.length,
      depensesCount: filteredDepenses.length,
      byRate,
      totalBaseHT: Math.round(totalBaseHT * 100) / 100,
    };
  }, [devis, depenses, periodRange]);

  // Export CSV
  const exportCSV = () => {
    const rows = [
      ['Période', selectedPeriod],
      [''],
      ['Taux', 'Base HT', 'TVA collectée', 'Nb factures'],
    ];

    TVA_RATES.forEach(r => {
      const data = tvaSummary.byRate[r.rate];
      if (data && (data.baseHT > 0 || data.tva > 0)) {
        rows.push([
          `${r.rate}%`,
          data.baseHT.toFixed(2),
          data.tva.toFixed(2),
          String(data.count),
        ]);
      }
    });

    rows.push(['']);
    rows.push(['Total TVA collectée', '', tvaSummary.collected.toFixed(2)]);
    rows.push(['TVA déductible', '', tvaSummary.deductible.toFixed(2)]);
    rows.push(['TVA nette à payer', '', tvaSummary.due.toFixed(2)]);

    const csv = rows.map(r => r.join(';')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `TVA_CA3_${selectedPeriod}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const fmt = (n) => n.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const renderDashboard = () => (
    <div className="space-y-6">
      {/* Period selector */}
      <div className="flex items-center justify-between">
        <h2 className={`text-lg font-bold ${textPrimary}`}>Gestion TVA</h2>
        <select
          value={selectedPeriod}
          onChange={e => setSelectedPeriod(e.target.value)}
          className={`px-3 py-2 border rounded-xl text-sm ${inputBg}`}
        >
          {periodOptions.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className={`p-4 rounded-xl ${cardBg} border ${borderColor}`}>
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp size={18} className="text-red-500" />
            <p className={`text-sm ${textMuted}`}>TVA collectée</p>
          </div>
          <p className="text-xl font-bold text-red-500">
            {fmt(tvaSummary.collected)} €
          </p>
          <p className={`text-xs ${textMuted} mt-1`}>{tvaSummary.facturesCount} factures</p>
        </div>

        <div className={`p-4 rounded-xl ${cardBg} border ${borderColor}`}>
          <div className="flex items-center gap-2 mb-2">
            <TrendingDown size={18} className="text-emerald-500" />
            <p className={`text-sm ${textMuted}`}>TVA déductible</p>
          </div>
          <p className="text-xl font-bold text-emerald-500">
            {fmt(tvaSummary.deductible)} €
          </p>
          <p className={`text-xs ${textMuted} mt-1`}>{tvaSummary.depensesCount} achats</p>
        </div>

        <div className={`p-4 rounded-xl border-2 ${tvaSummary.due > 0 ? (isDark ? 'border-red-700 bg-red-900/30' : 'border-red-300 bg-red-50') : (isDark ? 'border-emerald-700 bg-emerald-900/30' : 'border-emerald-300 bg-emerald-50')}`}>
          <div className="flex items-center gap-2 mb-2">
            <Euro size={18} className={tvaSummary.due > 0 ? 'text-red-600' : 'text-emerald-600'} />
            <p className={`text-sm ${tvaSummary.due > 0 ? (isDark ? 'text-red-400' : 'text-red-700') : (isDark ? 'text-emerald-400' : 'text-emerald-700')}`}>
              {tvaSummary.due > 0 ? 'TVA à payer' : 'Crédit TVA'}
            </p>
          </div>
          <p className={`text-xl font-bold ${tvaSummary.due > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
            {fmt(Math.abs(tvaSummary.due))} €
          </p>
        </div>
      </div>

      {/* TVA Breakdown by rate */}
      <div className={`p-4 rounded-xl ${cardBg} border ${borderColor}`}>
        <p className={`font-medium mb-3 ${textPrimary}`}>Ventilation par taux</p>
        <div className="space-y-2">
          {TVA_RATES.map(rate => {
            const data = tvaSummary.byRate[rate.rate];
            if (!data || (data.baseHT === 0 && data.tva === 0)) return null;
            return (
              <div key={rate.rate} className={`flex items-center gap-3 p-2 rounded-lg ${isDark ? 'bg-slate-700/50' : 'bg-slate-50'}`}>
                <span
                  className="px-2 py-0.5 rounded text-xs font-bold text-white flex-shrink-0"
                  style={{ backgroundColor: rate.color }}
                >
                  {rate.rate}%
                </span>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm ${textPrimary}`}>{rate.label}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className={`text-sm font-medium ${textPrimary}`}>{fmt(data.tva)} €</p>
                  <p className={`text-xs ${textMuted}`}>Base: {fmt(data.baseHT)} €</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <button
          onClick={() => setActiveTab('ca3')}
          className={`p-4 rounded-xl ${cardBg} border ${borderColor} flex items-center gap-3 transition-all hover:shadow-md text-left`}
        >
          <ClipboardList size={20} style={{ color: couleur }} />
          <div>
            <p className={`font-medium ${textPrimary}`}>Formulaire CA3</p>
            <p className={`text-xs ${textMuted}`}>Pré-rempli automatiquement</p>
          </div>
        </button>

        <button
          onClick={() => setActiveTab('rates')}
          className={`p-4 rounded-xl ${cardBg} border ${borderColor} flex items-center gap-3 transition-all hover:shadow-md text-left`}
        >
          <Calculator size={20} style={{ color: couleur }} />
          <div>
            <p className={`font-medium ${textPrimary}`}>Guide des taux TVA</p>
            <p className={`text-xs ${textMuted}`}>Quel taux selon les travaux ?</p>
          </div>
        </button>
      </div>

      {/* 2025 changes alert */}
      <div className={`p-4 rounded-xl ${isDark ? 'bg-amber-900/30' : 'bg-amber-50'} border ${isDark ? 'border-amber-700' : 'border-amber-200'}`}>
        <div className="flex items-start gap-3">
          <AlertTriangle className="text-amber-500 flex-shrink-0 mt-0.5" size={18} />
          <div>
            <p className={`font-medium text-sm ${isDark ? 'text-amber-300' : 'text-amber-800'}`}>
              Changement 2025
            </p>
            <p className={`text-sm mt-1 ${isDark ? 'text-amber-200' : 'text-amber-700'}`}>
              Chaudières gaz/fioul : TVA 20% (au lieu de 10%)
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  const renderCA3 = () => {
    const ca3Fields = [
      { line: '01', label: 'Ventes, prestations de services', value: tvaSummary.totalBaseHT, editable: false },
      { line: '08', label: 'Opérations imposables à 20%', value: tvaSummary.byRate[20]?.baseHT || 0, tva: tvaSummary.byRate[20]?.tva || 0, rate: 20 },
      { line: '09', label: 'Opérations imposables à 10%', value: tvaSummary.byRate[10]?.baseHT || 0, tva: tvaSummary.byRate[10]?.tva || 0, rate: 10 },
      { line: '9B', label: 'Opérations imposables à 5,5%', value: tvaSummary.byRate[5.5]?.baseHT || 0, tva: tvaSummary.byRate[5.5]?.tva || 0, rate: 5.5 },
      { line: '16', label: 'Total TVA brute', value: tvaSummary.collected, editable: false, bold: true },
      { line: '20', label: 'TVA déductible sur biens et services', value: tvaSummary.deductible, editable: false },
      { line: '28', label: 'TVA nette due (ou crédit)', value: tvaSummary.due, editable: false, bold: true, highlight: true },
    ];

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`p-2 rounded-xl ${isDark ? 'bg-slate-700 hover:bg-slate-600' : 'bg-slate-100 hover:bg-slate-200'}`}
              aria-label="Retour"
            >
              <ArrowLeft size={18} />
            </button>
            <div>
              <h2 className={`text-lg font-bold ${textPrimary}`}>Déclaration CA3</h2>
              <p className={`text-xs ${textMuted}`}>Période : {selectedPeriod}</p>
            </div>
          </div>
          <button
            onClick={exportCSV}
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-white transition-all hover:shadow-md"
            style={{ background: couleur }}
          >
            <Download size={16} /> Export CSV
          </button>
        </div>

        <div className={`rounded-xl border ${borderColor} overflow-hidden`}>
          <div className={`px-4 py-3 ${isDark ? 'bg-slate-700' : 'bg-slate-50'} border-b ${borderColor}`}>
            <div className="flex items-center gap-2">
              <FileText size={16} style={{ color: couleur }} />
              <p className={`text-sm font-medium ${textPrimary}`}>Formulaire CA3 — Pré-rempli</p>
            </div>
          </div>

          <div className="divide-y ${borderColor}">
            {ca3Fields.map(field => (
              <div
                key={field.line}
                className={`flex items-center px-4 py-3 gap-4 ${
                  field.highlight
                    ? (tvaSummary.due > 0
                      ? (isDark ? 'bg-red-900/20' : 'bg-red-50')
                      : (isDark ? 'bg-emerald-900/20' : 'bg-emerald-50'))
                    : ''
                }`}
              >
                <span className={`text-xs font-mono px-2 py-0.5 rounded ${isDark ? 'bg-slate-700 text-slate-400' : 'bg-slate-100 text-slate-500'} flex-shrink-0`}>
                  L.{field.line}
                </span>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm ${field.bold ? 'font-semibold' : ''} ${textPrimary}`}>
                    {field.label}
                  </p>
                </div>
                {field.rate && (
                  <div className="text-right flex-shrink-0 hidden sm:block">
                    <p className={`text-xs ${textMuted}`}>Base HT</p>
                    <p className={`text-sm ${textPrimary}`}>{fmt(field.value)} €</p>
                  </div>
                )}
                <div className="text-right flex-shrink-0 min-w-[100px]">
                  {field.rate ? (
                    <>
                      <p className={`text-xs ${textMuted}`}>TVA</p>
                      <p className={`text-sm font-medium ${field.bold ? 'font-bold' : ''} ${textPrimary}`}>
                        {fmt(field.tva)} €
                      </p>
                    </>
                  ) : (
                    <p className={`text-sm font-medium ${field.bold ? 'text-base font-bold' : ''} ${
                      field.highlight
                        ? (field.value > 0 ? 'text-red-600' : 'text-emerald-600')
                        : textPrimary
                    }`}>
                      {fmt(field.value)} €
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className={`p-4 rounded-xl ${isDark ? 'bg-blue-900/30' : 'bg-blue-50'} border ${isDark ? 'border-blue-800' : 'border-blue-200'}`}>
          <div className="flex items-start gap-2">
            <HelpCircle className="text-blue-500 flex-shrink-0 mt-0.5" size={16} />
            <div>
              <p className={`text-sm ${isDark ? 'text-blue-200' : 'text-blue-700'}`}>
                <strong>Note :</strong> Ces valeurs sont calculées automatiquement à partir de vos factures et dépenses.
                Vérifiez les montants avant de reporter sur votre déclaration officielle.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderRatesGuide = () => (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`p-2 rounded-xl ${isDark ? 'bg-slate-700 hover:bg-slate-600' : 'bg-slate-100 hover:bg-slate-200'}`}
          aria-label="Retour"
        >
          <ArrowLeft size={18} />
        </button>
        <h2 className={`text-lg font-bold ${textPrimary}`}>Guide des taux TVA</h2>
      </div>

      <div className="space-y-4">
        {TVA_RATES.map(rate => (
          <div key={rate.rate} className={`p-4 rounded-xl ${cardBg} border ${borderColor}`}>
            <div className="flex items-center gap-3 mb-2">
              <span
                className="px-3 py-1 rounded-lg text-white font-bold text-sm"
                style={{ backgroundColor: rate.color }}
              >
                {rate.rate}%
              </span>
              <p className={`font-medium ${textPrimary}`}>{rate.label}</p>
              <span className={`text-xs ${textMuted} ml-auto`}>Ligne CA3 : {rate.ca3Line}</span>
            </div>
            <p className={`text-sm ${textMuted} mb-3`}>{rate.description}</p>
            <div className="flex flex-wrap gap-2">
              {rate.examples.map((ex, i) => (
                <span
                  key={i}
                  className={`px-2 py-1 rounded text-xs ${isDark ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-600'}`}
                >
                  {ex}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className={`p-4 rounded-xl ${isDark ? 'bg-blue-900/30' : 'bg-blue-50'} border ${isDark ? 'border-blue-800' : 'border-blue-200'}`}>
        <div className="flex items-start gap-2">
          <HelpCircle className="text-blue-500 flex-shrink-0 mt-0.5" size={16} />
          <p className={`text-sm ${isDark ? 'text-blue-200' : 'text-blue-700'}`}>
            <strong>Règle :</strong> Taux réduits (5.5% / 10%) uniquement pour logements de +2 ans. Neuf = 20%.
          </p>
        </div>
      </div>
    </div>
  );

  if (activeTab === 'rates') return renderRatesGuide();
  if (activeTab === 'ca3') return renderCA3();
  return renderDashboard();
}
