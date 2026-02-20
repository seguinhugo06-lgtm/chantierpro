import React, { lazy, Suspense, useState } from 'react';
import { Wallet, Download, BarChart3, Landmark } from 'lucide-react';

// Lazy load the 4 sub-modules
const TresorerieModule = lazy(() => import('./tresorerie/TresorerieModule'));
const ExportComptable = lazy(() => import('./export/ExportComptable'));
const AnalyticsPage = lazy(() => import('./AnalyticsPage'));
const BankModule = lazy(() => import('./bank/BankModule'));

const LoadingSpinner = ({ couleur }) => (
  <div className="flex items-center justify-center py-16">
    <div className="w-8 h-8 border-4 border-t-transparent rounded-full animate-spin"
      style={{ borderColor: `${couleur}33`, borderTopColor: couleur }} />
  </div>
);

const TAB_CONFIG = [
  { key: 'tresorerie', label: 'Trésorerie', icon: Wallet },
  { key: 'banque', label: 'Banque', icon: Landmark },
  { key: 'export', label: 'Export Comptable', icon: Download },
  { key: 'analytique', label: 'Analytique', icon: BarChart3 },
];

export default function FinancesPage({ devis, depenses, clients, chantiers, entreprise, equipe, paiements, isDark, couleur = '#F97316', setPage, modeDiscret }) {
  const textPrimary = isDark ? 'text-slate-100' : 'text-slate-900';
  const textMuted = isDark ? 'text-slate-400' : 'text-slate-500';
  const [activeTab, setActiveTab] = useState('tresorerie');

  return (
    <div>
      {/* Header */}
      <div className="mb-5">
        <h1 className={`text-2xl font-bold ${textPrimary}`}>Finances</h1>
        <p className={`text-sm ${textMuted}`}>Pilotez votre trésorerie, anticipez vos flux et exportez pour votre expert-comptable</p>
      </div>

      {/* Tab buttons */}
      <div className={`inline-flex items-center gap-1 p-1 rounded-2xl mb-6 ${isDark ? 'bg-slate-800' : 'bg-slate-100'}`}>
        {TAB_CONFIG.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`inline-flex items-center justify-center whitespace-nowrap px-4 py-2.5 text-sm font-medium transition-all duration-200 rounded-xl ${
                isActive
                  ? 'text-white shadow-sm'
                  : isDark ? 'text-slate-300 hover:text-white hover:bg-slate-700' : 'text-slate-600 hover:text-slate-900 hover:bg-white'
              }`}
              style={isActive ? { backgroundColor: couleur } : undefined}
            >
              <Icon size={16} className="mr-1.5" />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab content — kept mounted, hidden via CSS to preserve state */}
      <div style={{ display: activeTab === 'tresorerie' ? 'block' : 'none' }}>
        <Suspense fallback={<LoadingSpinner couleur={couleur} />}>
          <TresorerieModule
            devis={devis}
            depenses={depenses}
            chantiers={chantiers}
            clients={clients}
            paiements={paiements}
            entreprise={entreprise}
            isDark={isDark}
            couleur={couleur}
            setPage={setPage}
            modeDiscret={modeDiscret}
          />
        </Suspense>
      </div>

      <div style={{ display: activeTab === 'banque' ? 'block' : 'none' }}>
        <Suspense fallback={<LoadingSpinner couleur={couleur} />}>
          <BankModule
            devis={devis}
            depenses={depenses}
            clients={clients}
            entreprise={entreprise}
            paiements={paiements}
            isDark={isDark}
            couleur={couleur}
            setPage={setPage}
            modeDiscret={modeDiscret}
          />
        </Suspense>
      </div>

      <div style={{ display: activeTab === 'export' ? 'block' : 'none' }}>
        <Suspense fallback={<LoadingSpinner couleur={couleur} />}>
          <ExportComptable
            devis={devis}
            depenses={depenses}
            chantiers={chantiers}
            clients={clients}
            paiements={paiements}
            entreprise={entreprise}
            isDark={isDark}
            couleur={couleur}
          />
        </Suspense>
      </div>

      <div style={{ display: activeTab === 'analytique' ? 'block' : 'none' }}>
        <Suspense fallback={<LoadingSpinner couleur={couleur} />}>
          <AnalyticsPage
            devis={devis}
            clients={clients}
            chantiers={chantiers}
            depenses={depenses}
            equipe={equipe}
            paiements={paiements}
            isDark={isDark}
            couleur={couleur}
            setPage={setPage}
            modeDiscret={modeDiscret}
          />
        </Suspense>
      </div>
    </div>
  );
}
