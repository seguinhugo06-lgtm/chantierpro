import React, { lazy, Suspense, useState } from 'react';
import { Wallet, Download, BarChart3, Landmark, CreditCard, Eye, EyeOff, FileText, AlertTriangle, RefreshCw } from 'lucide-react';
import TabBar from './ui/TabBar';
import ErrorBoundary from './ui/ErrorBoundary';
import { usePermissions } from '../hooks/usePermissions';

// Lazy load the 5 sub-modules
const TresorerieModule = lazy(() => import('./tresorerie/TresorerieModule'));
const ExportComptable = lazy(() => import('./export/ExportComptable'));
const AnalyticsPremium = lazy(() => import('./AnalyticsPremium'));
const BankModule = lazy(() => import('./bank/BankModule'));
const PaiementsTab = lazy(() => import('./finances/PaiementsTab'));
const RapportsTab = lazy(() => import('./finances/RapportsTab'));

const LoadingSpinner = ({ couleur }) => (
  <div className="flex items-center justify-center py-16" role="status" aria-label="Chargement...">
    <div className="w-8 h-8 border-4 border-t-transparent rounded-full animate-spin"
      style={{ borderColor: `${couleur}33`, borderTopColor: couleur }} />
  </div>
);

const ModuleErrorFallback = ({ moduleName, isDark, couleur, onRetry }) => (
  <div className={`rounded-xl border p-6 text-center ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
    <AlertTriangle size={32} className="mx-auto mb-3 text-amber-500" />
    <p className={`font-medium mb-1 ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
      Impossible de charger le module {moduleName}
    </p>
    <p className={`text-sm mb-4 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
      Une erreur est survenue. Vérifiez votre connexion ou réessayez.
    </p>
    <button
      onClick={onRetry || (() => window.location.reload())}
      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-medium"
      style={{ backgroundColor: couleur }}
    >
      <RefreshCw size={14} /> Réessayer
    </button>
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
    <div className="animate-page-enter">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-4 sm:mb-5">
        <div className="min-w-0">
          <h1 className={`text-lg sm:text-2xl font-bold ${textPrimary}`}>Finances</h1>
          <p className={`text-xs sm:text-sm ${textMuted} hidden sm:block`}>Pilotez votre trésorerie, anticipez vos flux et exportez pour votre expert-comptable</p>
        </div>
        <button
          onClick={() => setLocalDiscret(d => !d)}
          aria-label={modeDiscret ? 'Afficher les montants' : 'Masquer les montants'}
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

      {/* Tab navigation */}
      <TabBar
        tabs={TAB_CONFIG}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        maxVisible={4}
        isDark={isDark}
        couleur={couleur}
      />

      {/* Tab content — kept mounted, hidden via CSS to preserve state */}
      <div style={{ display: activeTab === 'tresorerie' ? 'block' : 'none' }}>
        <ErrorBoundary isDark={isDark} fallback={<ModuleErrorFallback moduleName="Trésorerie" isDark={isDark} couleur={couleur} />}>
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
        </ErrorBoundary>
      </div>

      <div style={{ display: activeTab === 'paiements' ? 'block' : 'none' }}>
        <ErrorBoundary isDark={isDark} fallback={<ModuleErrorFallback moduleName="Paiements" isDark={isDark} couleur={couleur} />}>
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
        </ErrorBoundary>
      </div>

      <div style={{ display: activeTab === 'banque' ? 'block' : 'none' }}>
        <ErrorBoundary isDark={isDark} fallback={<ModuleErrorFallback moduleName="Banque" isDark={isDark} couleur={couleur} />}>
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
        </ErrorBoundary>
      </div>

      <div style={{ display: activeTab === 'export' ? 'block' : 'none' }}>
        <ErrorBoundary isDark={isDark} fallback={<ModuleErrorFallback moduleName="Export Comptable" isDark={isDark} couleur={couleur} />}>
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
        </ErrorBoundary>
      </div>

      <div style={{ display: activeTab === 'analytique' ? 'block' : 'none' }}>
        <ErrorBoundary isDark={isDark} fallback={<ModuleErrorFallback moduleName="Analytique" isDark={isDark} couleur={couleur} />}>
          <Suspense fallback={<LoadingSpinner couleur={couleur} />}>
            <AnalyticsPremium
              devis={devis}
              clients={clients}
              chantiers={chantiers}
              depenses={depenses}
              equipe={equipe}
              paiements={paiements}
              pointages={pointages}
              isDark={isDark}
              couleur={couleur}
              setPage={setPage}
            />
          </Suspense>
        </ErrorBoundary>
      </div>

      <div style={{ display: activeTab === 'rapports' ? 'block' : 'none' }}>
        <ErrorBoundary isDark={isDark} fallback={<ModuleErrorFallback moduleName="Rapports" isDark={isDark} couleur={couleur} />}>
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
        </ErrorBoundary>
      </div>
    </div>
  );
}
