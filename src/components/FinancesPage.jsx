import React, { lazy, Suspense, useState } from 'react';
import { Wallet, Download, BarChart3, Landmark, CreditCard, Eye, EyeOff, FileText } from 'lucide-react';
import { usePermissions } from '../hooks/usePermissions';

// Lazy load the 5 sub-modules
const TresorerieModule = lazy(() => import('./tresorerie/TresorerieModule'));
const ExportComptable = lazy(() => import('./export/ExportComptable'));
const AnalyticsPage = lazy(() => import('./AnalyticsPage'));
const BankModule = lazy(() => import('./bank/BankModule'));
const PaiementsTab = lazy(() => import('./finances/PaiementsTab'));
const RapportsTab = lazy(() => import('./finances/RapportsTab'));

const LoadingSpinner = ({ couleur }) => (
  <div className="flex items-center justify-center py-16">
    <div className="w-8 h-8 border-4 border-t-transparent rounded-full animate-spin"
      style={{ borderColor: `${couleur}33`, borderTopColor: couleur }} />
  </div>
);

const TAB_CONFIG = [
  { key: 'tresorerie', label: 'Trésorerie', icon: Wallet },
  { key: 'paiements', label: 'Paiements', icon: CreditCard },
  { key: 'banque', label: 'Banque', icon: Landmark },
  { key: 'export', label: 'Export Comptable', icon: Download },
  { key: 'analytique', label: 'Analytique', icon: BarChart3 },
  { key: 'rapports', label: 'Rapports', icon: FileText },
];

export default function FinancesPage({ devis, depenses, clients, chantiers, entreprise, equipe, paiements, pointages = [], isDark, couleur = '#F97316', setPage, modeDiscret: modeDiscretGlobal }) {
  const textPrimary = isDark ? 'text-slate-100' : 'text-slate-900';
  const textMuted = isDark ? 'text-slate-400' : 'text-slate-600';
  const [activeTab, setActiveTab] = useState('tresorerie');
  const [localDiscret, setLocalDiscret] = useState(false);
  const modeDiscret = modeDiscretGlobal || localDiscret;

  // RBAC permissions
  const { getPermission, canExportData } = usePermissions();
  const finPerm = getPermission('finances');

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-4 sm:mb-5">
        <div className="min-w-0">
          <h1 className={`text-lg sm:text-2xl font-bold ${textPrimary}`}>Finances</h1>
          <p className={`text-xs sm:text-sm ${textMuted} hidden sm:block`}>Pilotez votre trésorerie, anticipez vos flux et exportez pour votre expert-comptable</p>
        </div>
        <button
          onClick={() => setLocalDiscret(d => !d)}
          title={modeDiscret ? 'Afficher les montants' : 'Masquer les montants'}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-all ${
            isDark
              ? modeDiscret ? 'bg-slate-700 text-slate-200' : 'bg-slate-800 text-slate-400 hover:text-slate-200'
              : modeDiscret ? 'bg-slate-200 text-slate-800' : 'bg-slate-100 text-slate-500 hover:text-slate-700'
          }`}
        >
          {modeDiscret ? <EyeOff size={16} /> : <Eye size={16} />}
          <span className="hidden sm:inline">{modeDiscret ? 'Montants masqués' : 'Masquer les montants'}</span>
        </button>
      </div>

      {/* Tab buttons — scrollable on mobile */}
      <div className={`flex items-center gap-1 p-1 rounded-2xl mb-6 overflow-x-auto ${isDark ? 'bg-slate-800' : 'bg-slate-100'}`} style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', WebkitOverflowScrolling: 'touch' }}>
        {TAB_CONFIG.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`inline-flex items-center justify-center whitespace-nowrap px-3 sm:px-4 py-2.5 text-sm font-medium transition-all duration-200 rounded-xl shrink-0 ${
                isActive
                  ? 'text-white shadow-sm'
                  : isDark ? 'text-slate-300 hover:text-white hover:bg-slate-700' : 'text-slate-600 hover:text-slate-900 hover:bg-white'
              }`}
              style={isActive ? { backgroundColor: couleur } : undefined}
            >
              <Icon size={16} className="sm:mr-1.5" />
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

      <div style={{ display: activeTab === 'paiements' ? 'block' : 'none' }}>
        <Suspense fallback={<LoadingSpinner couleur={couleur} />}>
          <PaiementsTab
            devis={devis}
            clients={clients}
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
            entreprise={entreprise}
            isDark={isDark}
            couleur={couleur}
            setPage={setPage}
            modeDiscret={modeDiscret}
          />
        </Suspense>
      </div>

      <div style={{ display: activeTab === 'rapports' ? 'block' : 'none' }}>
        <Suspense fallback={<LoadingSpinner couleur={couleur} />}>
          <RapportsTab
            devis={devis}
            depenses={depenses}
            clients={clients}
            chantiers={chantiers}
            entreprise={entreprise}
            equipe={equipe}
            paiements={paiements}
            pointages={pointages}
            isDark={isDark}
            couleur={couleur}
            modeDiscret={modeDiscret}
            setPage={setPage}
          />
        </Suspense>
      </div>
    </div>
  );
}
