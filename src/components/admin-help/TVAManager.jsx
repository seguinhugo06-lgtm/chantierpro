import { useState, useMemo } from 'react';
import {
  Euro, TrendingUp, TrendingDown, Calculator,
  AlertTriangle, HelpCircle, ArrowLeft, Download, FileText, ClipboardList
} from 'lucide-react';
import { remettreFichier } from '../../lib/natif';
import { calculateTVASummary } from '../../lib/integrations/accounting';
import { facturesEmises } from '../../lib/ventes';
import { totauxDocument } from '../../lib/totauxDocument';
import { estFranchiseTva, tvaARegulariser } from '../../lib/franchiseTva';
import { jourLocal } from '../../lib/dates';

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
    ca3Line: '9B',
  },
  {
    rate: 5.5,
    label: 'Taux réduit',
    description: 'Rénovation énergétique logement >2 ans',
    color: '#22c55e',
    examples: ['Isolation', 'Pompe à chaleur', 'Fenêtres double vitrage'],
    ca3Line: '09',
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
  depenses = [],
  entreprise = null,
}) {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedPeriod, setSelectedPeriod] = useState(() => {
    const now = new Date();
    const q = Math.ceil((now.getMonth() + 1) / 3);
    return `T${q}-${now.getFullYear()}`;
  });

  const textPrimary = 'text-encre';
  const textMuted = 'text-encre-2';
  const cardBg = 'bg-surface';
  const borderColor = 'border-bord';
  const inputBg = 'bg-surface border-bord';

  const periodOptions = useMemo(() => generatePeriodOptions(), []);
  const periodRange = useMemo(() => getPeriodDateRange(selectedPeriod), [selectedPeriod]);

  // Résumé de la période sur les règles communes (src/lib/integrations/accounting.js) : factures et avoirs émis, taux
  // par taux ; TVA des dépenses seulement quand elle est saisie ; rien en franchise. Avant (relecture juriste-btp du
  // 17 oct. 2026) : brouillons comptés, 10 % d'office pour une facture et 20 % pour une dépense.
  const franchise = estFranchiseTva(entreprise);
  const tvaSummary = useMemo(() => {
    const du = periodRange.start ? jourLocal(periodRange.start) : undefined;
    const au = periodRange.end ? jourLocal(periodRange.end) : undefined;
    const r = calculateTVASummary(devis, depenses, du, au, { franchise });

    const byRate = {};
    TVA_RATES.forEach(x => { byRate[x.rate] = { baseHT: 0, tva: 0, count: 0 }; });
    Object.entries(r.detailParTaux).forEach(([taux, d]) => {
      const k = Number(taux);
      if (!byRate[k]) byRate[k] = { baseHT: 0, tva: 0, count: 0 };
      byRate[k].baseHT += d.base;
      byRate[k].tva += d.collectee;
    });
    if (!franchise) {
      facturesEmises(devis, { du, au }).forEach(f => {
        totauxDocument(f).tva.forEach(({ taux }) => { if (byRate[taux]) byRate[taux].count += 1; });
      });
    }

    return {
      collected: r.tvaCollectee,
      deductible: r.tvaDeductible,
      due: r.tvaNetteAPayer,
      facturesCount: r.nbFactures,
      depensesCount: r.nbDepenses,
      depensesSansTva: r.depensesSansTva,
      byRate,
      totalBaseHT: Math.round(Object.values(byRate).reduce((sum, x) => sum + x.baseHT, 0) * 100) / 100,
    };
  }, [devis, depenses, periodRange, franchise]);

  // Export CSV
  const exportCSV = () => {
    const rows = [
      ['Période', selectedPeriod],
      [''],
      ['Taux', 'Base HT', 'TVA facturée', 'Nb factures'],
    ];

    TVA_RATES.forEach(r => {
      const data = tvaSummary.byRate[r.rate];
      if (data && (data.baseHT !== 0 || data.tva !== 0)) {
        rows.push([
          `${r.rate}%`,
          data.baseHT.toFixed(2),
          data.tva.toFixed(2),
          String(data.count),
        ]);
      }
    });

    rows.push(['']);
    rows.push(['Total TVA facturée', '', tvaSummary.collected.toFixed(2)]);
    rows.push(['TVA déductible (saisie sur les dépenses)', '', tvaSummary.deductible.toFixed(2)]);
    rows.push(['Solde estimé (débits)', '', tvaSummary.due.toFixed(2)]);
    rows.push(['']);
    rows.push(['Montants calculés sur vos factures émises (régime des débits). Sans option pour les débits, la TVA de vos travaux est due à l’encaissement (art. 269 du CGI) : déclarez la TVA des sommes encaissées sur la période.']);

    const csv = rows.map(r => r.join(';')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    remettreFichier(blob, `TVA_CA3_${selectedPeriod}.csv`);
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
            <p className={`text-sm ${textMuted}`}>TVA facturée</p>
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
          {tvaSummary.depensesSansTva > 0 && (
            <p className="text-xs mt-1 text-alerte-texte">
              dont {tvaSummary.depensesSansTva} sans TVA saisie, non comptée{tvaSummary.depensesSansTva > 1 ? 's' : ''}
            </p>
          )}
        </div>

        <div className={`p-4 rounded-xl border-2 ${tvaSummary.due > 0 ? (isDark ? 'border-red-700 bg-red-900/30' : 'border-red-300 bg-red-50') : (isDark ? 'border-emerald-700 bg-emerald-900/30' : 'border-emerald-300 bg-emerald-50')}`}>
          <div className="flex items-center gap-2 mb-2">
            <Euro size={18} className={tvaSummary.due > 0 ? 'text-red-600' : 'text-emerald-600'} />
            <p className={`text-sm ${tvaSummary.due > 0 ? (isDark ? 'text-red-400' : 'text-red-700') : (isDark ? 'text-emerald-400' : 'text-emerald-700')}`}>
              {tvaSummary.due >= 0 ? 'Solde estimé (débits)' : 'Crédit estimé (débits)'}
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
              <div key={rate.rate} className={`flex items-center gap-3 p-2 rounded-lg bg-fond`}>
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
          <ClipboardList size={20} className="text-accent-texte" />
          <div>
            <p className={`font-medium ${textPrimary}`}>Formulaire CA3</p>
            <p className={`text-xs ${textMuted}`}>Pré-rempli automatiquement</p>
          </div>
        </button>

        <button
          onClick={() => setActiveTab('rates')}
          className={`p-4 rounded-xl ${cardBg} border ${borderColor} flex items-center gap-3 transition-all hover:shadow-md text-left`}
        >
          <Calculator size={20} className="text-accent-texte" />
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
    // Lignes du formulaire 3310-CA3, millésime 2026 (cerfa n° 10963*31), vérifiées par juriste-btp le 17 oct. 2026 :
    // A1 = opérations taxées (sans les bases à 0 %), 08 = 20 %, 09 = 5,5 %, 9B = 10 %, 16 = TVA brute, 20 = autres
    // biens et services, 23 = total déductible ; puis TD = 16 − 23 et 28 = TD − X5 (jamais négative) ou, si la TVA
    // déductible l'emporte, 25 = crédit (23 − 16). Avant : une ligne « 01 » qui n'existe plus, un crédit en ligne 28.
    const base = (t) => tvaSummary.byRate[t]?.baseHT || 0;
    const ca3Fields = [
      { line: 'A1', label: 'Ventes, prestations de services', value: base(20) + base(10) + base(5.5) },
      { line: '08', label: 'Taux normal 20 %', value: base(20), tva: tvaSummary.byRate[20]?.tva || 0, rate: 20 },
      { line: '09', label: 'Taux réduit 5,5 %', value: base(5.5), tva: tvaSummary.byRate[5.5]?.tva || 0, rate: 5.5 },
      { line: '9B', label: 'Taux réduit 10 %', value: base(10), tva: tvaSummary.byRate[10]?.tva || 0, rate: 10 },
      { line: '16', label: 'Total de la TVA brute due', value: tvaSummary.collected, bold: true },
      { line: '20', label: 'Autres biens et services', value: tvaSummary.deductible },
      { line: '23', label: 'Total TVA déductible', value: tvaSummary.deductible },
      ...(tvaSummary.due >= 0
        ? [{ line: 'TD', label: 'TVA due (ligne 16 – ligne 23)', value: tvaSummary.due },
          { line: '28', label: 'TVA nette due (ligne TD – ligne X5)', value: tvaSummary.due, bold: true, highlight: true }]
        : [{ line: '25', label: 'Crédit de TVA (ligne 23 – ligne 16)', value: -tvaSummary.due, bold: true, highlight: true }]),
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
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm transition-all hover:shadow-md bg-accent text-sur-accent"
          >
            <Download size={16} /> Export CSV
          </button>
        </div>

        <div className={`rounded-xl border ${borderColor} overflow-hidden`}>
          <div className={`px-4 py-3 bg-fond border-b ${borderColor}`}>
            <div className="flex items-center gap-2">
              <FileText size={16} className="text-accent-texte" />
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
                <span className={`text-xs font-mono px-2 py-0.5 rounded bg-surface-2 text-encre-3 flex-shrink-0`}>
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
                        ? (tvaSummary.due > 0 ? 'text-red-600' : 'text-emerald-600')
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
                <strong>Note :</strong> Montants calculés sur vos factures émises (régime des débits). Sans option pour les débits, la TVA de vos travaux est due à l’encaissement (art. 269 du CGI) : déclarez la TVA des sommes encaissées sur la période. La TVA des dépenses n’est comptée que lorsqu’elle est saisie ; la
                sous-traitance autoliquidée (art. 283-2 nonies du CGI) n’est pas prise en compte. Vérifiez les montants avant
                de les reporter sur votre déclaration.
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
                  className={`px-2 py-1 rounded text-xs bg-surface-2 text-encre-2`}
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

  if (franchise) {
    // Franchise en base : ni TVA facturée ni TVA déductible, pas de CA3. Une facture émise par erreur avec de la TVA
    // la rend due (CGI art. 283, 3) : la signaler plutôt qu'annoncer « rien à déclarer ».
    const aRegulariser = devis.filter(d => d.type === 'facture' && tvaARegulariser(d, entreprise)).length;
    return (
      <div className="space-y-4">
        <h2 className={`text-lg font-bold ${textPrimary}`}>Gestion TVA</h2>
        <div className={`p-4 rounded-xl ${cardBg} border ${borderColor}`}>
          <p className={`font-semibold ${textPrimary}`}>Franchise en base de TVA</p>
          <p className={`text-sm mt-1 ${textMuted}`}>
            En franchise en base de TVA (art. 293 B du CGI), vous ne facturez pas de TVA et n’en déduisez pas : pas de déclaration CA3.
            Mallettico l’applique d’après la forme « Micro-entreprise » indiquée dans vos Paramètres.
          </p>
        </div>
        {aRegulariser > 0 && (
          <div role="status" className="p-4 rounded-xl bg-alerte-fond text-alerte-texte text-sm">
            {aRegulariser === 1 ? '1 facture émise porte de la TVA' : `${aRegulariser} factures émises portent de la TVA`} : cette TVA est due du seul fait de la facture (art. 283, 3 du CGI). Faites un avoir puis une nouvelle facture sans TVA.
          </div>
        )}
      </div>
    );
  }
  if (activeTab === 'rates') return renderRatesGuide();
  if (activeTab === 'ca3') return renderCA3();
  return renderDashboard();
}
