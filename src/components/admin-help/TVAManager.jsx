import { useState, useMemo } from 'react';
import {
  Euro, TrendingUp, TrendingDown, Calculator,
  AlertTriangle, HelpCircle, ArrowLeft
} from 'lucide-react';

/**
 * TVAManager - Gestion TVA multi-taux BTP (simplifié)
 * Calcul automatique, guide des taux
 */

const TVA_RATES = [
  {
    rate: 20,
    label: 'Taux normal',
    description: 'Travaux neufs, chaudières gaz/fioul',
    color: '#ef4444',
    examples: ['Construction neuve', 'Chaudière gaz', 'Climatisation neuf'],
  },
  {
    rate: 10,
    label: 'Taux intermédiaire',
    description: 'Travaux amélioration logement >2 ans',
    color: '#f59e0b',
    examples: ['Rénovation cuisine', 'Électricité', 'Plomberie'],
  },
  {
    rate: 5.5,
    label: 'Taux réduit',
    description: 'Rénovation énergétique logement >2 ans',
    color: '#22c55e',
    examples: ['Isolation', 'Pompe à chaleur', 'Fenêtres double vitrage'],
  },
];

export default function TVAManager({
  isDark = false,
  couleur = '#f97316',
  devis = [],
  factures = [],
  depenses = [],
}) {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedPeriod, setSelectedPeriod] = useState('T1-2026');

  const textPrimary = isDark ? 'text-white' : 'text-slate-900';
  const textMuted = isDark ? 'text-slate-400' : 'text-slate-500';
  const cardBg = isDark ? 'bg-slate-800' : 'bg-white';
  const borderColor = isDark ? 'border-slate-700' : 'border-slate-200';

  // Helper for safe currency calculation
  const calcTVA = (montantHT, tvaRate) => {
    return Math.round(montantHT * tvaRate) / 100;
  };

  // Calculate TVA summary from real data
  const tvaSummary = useMemo(() => {
    // Get factures from devis array (type === 'facture')
    const facturesList = devis.filter(d => d.type === 'facture');

    const collected = facturesList.reduce((acc, f) => {
      const tvaRate = f.tvaDetails ?
        Object.values(f.tvaDetails).reduce((sum, t) => sum + (t.montant || 0), 0) :
        calcTVA(f.total_ht || 0, 10);
      return acc + tvaRate;
    }, 0);

    const deductible = depenses.reduce((acc, d) => {
      return acc + calcTVA(d.montant || 0, 20);
    }, 0);

    return {
      collected: Math.round(collected * 100) / 100,
      deductible: Math.round(deductible * 100) / 100,
      due: Math.round((collected - deductible) * 100) / 100,
      facturesCount: facturesList.length,
      depensesCount: depenses.length,
    };
  }, [devis, depenses]);

  const renderDashboard = () => (
    <div className="space-y-6">
      {/* Period selector */}
      <div className="flex items-center justify-between">
        <h2 className={`text-lg font-bold ${textPrimary}`}>Gestion TVA</h2>
        <select
          value={selectedPeriod}
          onChange={e => setSelectedPeriod(e.target.value)}
          className={`px-3 py-2 border rounded-xl text-sm ${isDark ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-slate-200'}`}
        >
          <option value="T1-2026">T1 2026</option>
          <option value="T4-2025">T4 2025</option>
          <option value="T3-2025">T3 2025</option>
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
            {tvaSummary.collected.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €
          </p>
          <p className={`text-xs ${textMuted} mt-1`}>{tvaSummary.facturesCount} factures</p>
        </div>

        <div className={`p-4 rounded-xl ${cardBg} border ${borderColor}`}>
          <div className="flex items-center gap-2 mb-2">
            <TrendingDown size={18} className="text-emerald-500" />
            <p className={`text-sm ${textMuted}`}>TVA déductible</p>
          </div>
          <p className="text-xl font-bold text-emerald-500">
            {tvaSummary.deductible.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €
          </p>
          <p className={`text-xs ${textMuted} mt-1`}>{tvaSummary.depensesCount} achats</p>
        </div>

        <div className={`p-4 rounded-xl border-2 ${tvaSummary.due > 0 ? 'border-red-300 bg-red-50' : 'border-emerald-300 bg-emerald-50'}`}>
          <div className="flex items-center gap-2 mb-2">
            <Euro size={18} className={tvaSummary.due > 0 ? 'text-red-600' : 'text-emerald-600'} />
            <p className={`text-sm ${tvaSummary.due > 0 ? 'text-red-700' : 'text-emerald-700'}`}>
              {tvaSummary.due > 0 ? 'TVA à payer' : 'Crédit TVA'}
            </p>
          </div>
          <p className={`text-xl font-bold ${tvaSummary.due > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
            {Math.abs(tvaSummary.due).toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €
          </p>
        </div>
      </div>

      {/* Quick action */}
      <button
        onClick={() => setActiveTab('rates')}
        className={`w-full p-4 rounded-xl ${cardBg} border ${borderColor} flex items-center justify-between transition-all hover:shadow-md`}
      >
        <div className="flex items-center gap-3">
          <Calculator size={20} style={{ color: couleur }} />
          <div className="text-left">
            <p className={`font-medium ${textPrimary}`}>Guide des taux TVA</p>
            <p className={`text-sm ${textMuted}`}>Quel taux appliquer selon les travaux ?</p>
          </div>
        </div>
        <span className={textMuted}>→</span>
      </button>

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

  return activeTab === 'rates' ? renderRatesGuide() : renderDashboard();
}
