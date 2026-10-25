import React, { lazy, Suspense, useState, useEffect } from 'react';
import { Wallet, Download, BarChart3, Landmark, CreditCard, FileText, AlertTriangle, RefreshCw } from 'lucide-react';
import TabBar from './ui/TabBar';
import ErrorBoundary from './ui/ErrorBoundary';
import PageHeader from './ui/PageHeader';
import { usePermissions } from '../hooks/usePermissions';
import { captureException } from '../lib/sentry';

// Lazy load the 5 sub-modules
const TresorerieModule = lazy(() => import('./tresorerie/TresorerieModule'));
const ExportComptable = lazy(() => import('./export/ExportComptable'));
const AnalyticsPremium = lazy(() => import('./AnalyticsPremium'));
const RapportsTab = lazy(() => import('./finances/RapportsTab'));

const LoadingSpinner = ({ couleur }) => (
  <div className="flex items-center justify-center py-16" role="status" aria-label="Chargement...">
    <div className="w-8 h-8 border-4 border-t-transparent rounded-full animate-spin"
      style={{ borderColor: `${couleur}33`, borderTopColor: couleur }} />
  </div>
);

const ModuleErrorFallback = ({ moduleName, isDark, couleur, onRetry }) => (
  <div className={`rounded-xl border p-6 text-center bg-surface border-bord`}>
    <AlertTriangle size={32} className="mx-auto mb-3 text-amber-500" />
    <p className={`font-medium mb-1 text-encre`}>
      Impossible de charger le module {moduleName}
    </p>
    <p className={`text-sm mb-4 text-encre-3`}>
      Une erreur est survenue. Vérifiez votre connexion ou réessayez.
    </p>
    <button
      onClick={onRetry || (() => window.location.reload())}
      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-accent text-sur-accent"
    >
      <RefreshCw size={14} /> Réessayer
    </button>
  </div>
);

const TAB_CONFIG = [
  { key: 'tresorerie', label: 'Trésorerie', icon: Wallet },
  { key: 'export', label: 'Export Comptable', icon: Download },
  { key: 'analytique', label: 'Analytique', icon: BarChart3 },
  { key: 'rapports', label: 'Rapports', icon: FileText },
];

export default function FinancesPage({ devis, depenses, clients, chantiers, entreprise, equipe, paiements, pointages = [], isDark, couleur = '#F97316', setPage, modeDiscret: modeDiscretGlobal, ouvrirDocument}) {
  const textPrimary = 'text-encre';
  const textMuted = 'text-encre-2';
  // Onglet demandé par une autre page (Réglages › Comptabilité → « Ouvrir l'export comptable ») : lu au premier rendu,
  // effacé après le montage (un premier rendu abandonné puis repris le relit)
  const [activeTab, setActiveTab] = useState(() => {
    try {
      const demande = sessionStorage.getItem('cp_finances_onglet');
      if (TAB_CONFIG.some(t => t.key === demande)) return demande;
    } catch (e) {
      captureException(e, { contexte: 'FinancesPage.ongletDemande' });
    }
    return 'tresorerie';
  });
  useEffect(() => {
    try { sessionStorage.removeItem('cp_finances_onglet'); } catch (e) { captureException(e, { contexte: 'FinancesPage.ongletDemande' }); }
  }, []);
  // Mode confidentiel : une seule commande, l'œil de l'en-tête de l'app (audit UX du 20 oct. 2026, § 2.1 ; avant, Finances
  // avait aussi son propre « Masquer les montants », qui ne masquait que cette page)
  const modeDiscret = modeDiscretGlobal;

  // RBAC permissions
  const { getPermission, canExportData } = usePermissions();
  const finPerm = getPermission('finances');

  return (
    <div className="animate-page-enter">
      {/* Header (design system) */}
      <PageHeader
        icon={Wallet}
        title="Finances"
        subtitle="Trésorerie, export comptable et analyses"
        isDark={isDark}
        color={couleur}
      />

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
      <div className="mt-6" style={{ display: activeTab === 'tresorerie' ? 'block' : 'none' }}>
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
              ouvrirDocument={ouvrirDocument}
            />
          </Suspense>
        </ErrorBoundary>
      </div>

      <div className="mt-6" style={{ display: activeTab === 'export' ? 'block' : 'none' }}>
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
              setPage={setPage}
            />
          </Suspense>
        </ErrorBoundary>
      </div>

      <div className="mt-6" style={{ display: activeTab === 'analytique' ? 'block' : 'none' }}>
        <ErrorBoundary isDark={isDark} fallback={<ModuleErrorFallback moduleName="Analytique" isDark={isDark} couleur={couleur} />}>
          <Suspense fallback={<LoadingSpinner couleur={couleur} />}>
            <AnalyticsPremium
              modeDiscret={modeDiscret}
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

      <div className="mt-6" style={{ display: activeTab === 'rapports' ? 'block' : 'none' }}>
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
