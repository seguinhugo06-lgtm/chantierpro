import { lazy, Suspense, useState, useEffect, useMemo } from 'react';
import { Wallet, Download, BarChart3, FileText, AlertTriangle, RefreshCw } from 'lucide-react';
import TabBar from './ui/TabBar';
import ErrorBoundary from './ui/ErrorBoundary';
import { EnTetePage } from './ui/EnTete';
import { Bouton } from './ui/Bouton';
import { usePermissions } from '../hooks/usePermissions';
import { captureException } from '../lib/sentry';
import { estOuverte } from '../lib/ventes';

// Lazy load the 5 sub-modules
const TresorerieModule = lazy(() => import('./tresorerie/TresorerieModule'));
const ExportComptable = lazy(() => import('./export/ExportComptable'));
const AnalyticsPremium = lazy(() => import('./AnalyticsPremium'));
const RapportsTab = lazy(() => import('./finances/RapportsTab'));

const LoadingSpinner = () => (
  <div className="flex items-center justify-center py-16" role="status" aria-label="Chargement…">
    <div className="w-8 h-8 border-4 rounded-full animate-spin border-accent/20 border-t-accent" />
  </div>
);

const ModuleErrorFallback = ({ moduleName, onRetry }) => (
  <div className="rounded-2xl border p-6 text-center bg-surface border-bord">
    <AlertTriangle size={32} aria-hidden="true" className="mx-auto mb-3 text-alerte-texte" />
    <p className="font-semibold mb-1 text-encre">
      Impossible de charger le module {moduleName}
    </p>
    <p className="text-sm mb-4 text-encre-3">
      Une erreur est survenue. Vérifiez votre connexion ou réessayez.
    </p>
    <Bouton icone={RefreshCw} onClick={onRetry || (() => window.location.reload())}>Réessayer</Bouton>
  </div>
);

// « Export comptable » s'abrège au téléphone : les quatre onglets tiennent dans la rangée à 375 px (audit UX du 20 oct. 2026 :
// « Rap… » coupé, et « Export Comptable » avec une capitale)
const TAB_CONFIG = [
  { key: 'tresorerie', label: 'Trésorerie', icon: Wallet },
  { key: 'export', label: <><span className="sm:hidden">Export</span><span className="hidden sm:inline">Export comptable</span></>, icon: Download },
  { key: 'analytique', label: 'Analytique', icon: BarChart3 },
  { key: 'rapports', label: 'Rapports', icon: FileText },
];

export default function FinancesPage({ devis, depenses, clients, chantiers, entreprise, equipe, paiements, pointages = [], isDark, couleur, setPage, modeDiscret: modeDiscretGlobal, ouvrirDocument }) {
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

  // Droits : en consultation (rôle « readonly »), rien à ajouter, modifier ni supprimer dans la trésorerie ; l'export
  // comptable (FEC, écritures) seulement pour qui a le droit d'exporter (permissions.js : export)
  const { getPermission, canExportData } = usePermissions();
  const onglets = canExportData ? TAB_CONFIG : TAB_CONFIG.filter((t) => t.key !== 'export');
  const ongletAffiche = !canExportData && activeTab === 'export' ? 'tresorerie' : activeTab;
  const peutModifier = getPermission('finances') === 'full';

  // Sous-titre : un fait vivant (audit UX § 2.2), pas un slogan. Une seule définition d'une facture à encaisser (ventes.js).
  const aEncaisser = useMemo(() => (devis || []).filter((d) => estOuverte(d, paiements || [], new Date())).length, [devis, paiements]);
  const sousTitre = aEncaisser === 0 ? 'Aucune facture à encaisser' : `${aEncaisser} facture${aEncaisser > 1 ? 's' : ''} à encaisser`;

  return (
    <div className="animate-page-enter">
      <EnTetePage titre="Finances" sousTitre={sousTitre} />

      <TabBar
        tabs={onglets}
        activeTab={ongletAffiche}
        onTabChange={setActiveTab}
        maxVisible={4}
        isDark={isDark}
        couleur={couleur}
      />

      {/* Tab content — kept mounted, hidden via CSS to preserve state */}
      <div className="mt-6" style={{ display: ongletAffiche === 'tresorerie' ? 'block' : 'none' }}>
        <ErrorBoundary isDark={isDark} fallback={<ModuleErrorFallback moduleName="Trésorerie" />}>
          <Suspense fallback={<LoadingSpinner />}>
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
              peutModifier={peutModifier}
              peutExporter={canExportData}
            />
          </Suspense>
        </ErrorBoundary>
      </div>

      {canExportData && <div className="mt-6" style={{ display: ongletAffiche === 'export' ? 'block' : 'none' }}>
        <ErrorBoundary isDark={isDark} fallback={<ModuleErrorFallback moduleName="Export comptable" />}>
          <Suspense fallback={<LoadingSpinner />}>
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
      </div>}

      <div className="mt-6" style={{ display: ongletAffiche === 'analytique' ? 'block' : 'none' }}>
        <ErrorBoundary isDark={isDark} fallback={<ModuleErrorFallback moduleName="Analytique" />}>
          <Suspense fallback={<LoadingSpinner />}>
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

      <div className="mt-6" style={{ display: ongletAffiche === 'rapports' ? 'block' : 'none' }}>
        <ErrorBoundary isDark={isDark} fallback={<ModuleErrorFallback moduleName="Rapports" />}>
          <Suspense fallback={<LoadingSpinner />}>
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
