import React, { lazy, Suspense } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from './ui/Tabs';
import { Wallet, Download, BarChart3 } from 'lucide-react';

// Lazy load the 3 sub-modules
const TresorerieModule = lazy(() => import('./tresorerie/TresorerieModule'));
const ExportComptable = lazy(() => import('./export/ExportComptable'));
const AnalyticsPage = lazy(() => import('./AnalyticsPage'));

const LoadingSpinner = ({ couleur }) => (
  <div className="flex items-center justify-center py-16">
    <div className="w-8 h-8 border-4 border-t-transparent rounded-full animate-spin"
      style={{ borderColor: `${couleur}33`, borderTopColor: couleur }} />
  </div>
);

export default function FinancesPage({ devis, depenses, clients, chantiers, entreprise, equipe, paiements, isDark, couleur, setPage }) {
  const textPrimary = isDark ? 'text-slate-100' : 'text-slate-900';
  const textMuted = isDark ? 'text-slate-400' : 'text-slate-500';

  return (
    <div>
      {/* Header */}
      <div className="mb-5">
        <h1 className={`text-2xl font-bold ${textPrimary}`}>Finances</h1>
        <p className={`text-sm ${textMuted}`}>Trésorerie, export comptable et statistiques</p>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="tresorerie">
        <TabsList variant="pills" className="mb-6">
          <TabsTrigger value="tresorerie" variant="pills">
            <Wallet size={16} className="mr-1.5" />
            Trésorerie
          </TabsTrigger>
          <TabsTrigger value="export" variant="pills">
            <Download size={16} className="mr-1.5" />
            Export Comptable
          </TabsTrigger>
          <TabsTrigger value="analytique" variant="pills">
            <BarChart3 size={16} className="mr-1.5" />
            Analytique
          </TabsTrigger>
        </TabsList>

        <TabsContent value="tresorerie">
          <Suspense fallback={<LoadingSpinner couleur={couleur} />}>
            <TresorerieModule
              devis={devis}
              depenses={depenses}
              chantiers={chantiers}
              clients={clients}
              entreprise={entreprise}
              isDark={isDark}
              couleur={couleur}
              setPage={setPage}
            />
          </Suspense>
        </TabsContent>

        <TabsContent value="export">
          <Suspense fallback={<LoadingSpinner couleur={couleur} />}>
            <ExportComptable
              devis={devis}
              depenses={depenses}
              chantiers={chantiers}
              clients={clients}
              entreprise={entreprise}
              isDark={isDark}
              couleur={couleur}
            />
          </Suspense>
        </TabsContent>

        <TabsContent value="analytique">
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
            />
          </Suspense>
        </TabsContent>
      </Tabs>
    </div>
  );
}
