/* eslint-disable no-unused-vars */
import {
  TrendingUp,
  FileText,
  Briefcase,
  Activity,
  ChevronRight,
} from 'lucide-react';
/* eslint-enable no-unused-vars */

// Helper to format currency
const formatMoney = (value, modeDiscret) => {
  if (modeDiscret) return '***';
  if (!value) return '0 €';
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

// Helper to calculate days since a date
const daysSince = (date) => {
  if (!date) return 0;
  const d = new Date(date);
  const now = new Date();
  const diff = now - d;
  return Math.floor(diff / (1000 * 60 * 60 * 24));
};

// Status badge with color mapping
// eslint-disable-next-line no-unused-vars
const StatusBadge = ({ status, isDark }) => {
  const statusColors = {
    brouillon: isDark ? 'bg-slate-700 text-slate-200' : 'bg-slate-100 text-slate-700',
    envoye: isDark ? 'bg-blue-900/50 text-blue-200' : 'bg-blue-100 text-blue-700',
    accepte: isDark ? 'bg-blue-900/50 text-blue-200' : 'bg-blue-100 text-blue-700',
    signe: isDark ? 'bg-emerald-900/50 text-emerald-200' : 'bg-emerald-100 text-emerald-700',
    facture: isDark ? 'bg-emerald-900/50 text-emerald-200' : 'bg-emerald-100 text-emerald-700',
    payee: isDark ? 'bg-emerald-900/50 text-emerald-200' : 'bg-emerald-100 text-emerald-700',
    refuse: isDark ? 'bg-red-900/50 text-red-200' : 'bg-red-100 text-red-700',
    vu: isDark ? 'bg-purple-900/50 text-purple-200' : 'bg-purple-100 text-purple-700',
  };

  const statusLabels = {
    brouillon: 'Brouillon',
    envoye: 'Envoyé',
    accepte: 'Accepté',
    vu: 'Vu',
    signe: 'Signé',
    facture: 'Facturé',
    payee: 'Payé',
    refuse: 'Refusé',
  };

  const colorClass = statusColors[status] || statusColors.brouillon;
  const label = statusLabels[status] || status;

  return (
    <span className={`inline-block px-2.5 py-1 text-xs font-medium rounded-full ${colorClass}`}>
      {label}
    </span>
  );
};

// Card wrapper component
// eslint-disable-next-line no-unused-vars
const DashboardCard = ({ isDark, title, icon: Icon, couleur, children, onViewAll }) => {
  const cardBg = isDark
    ? 'bg-slate-800 border-slate-700'
    : 'bg-white border-slate-200';
  const textPrimary = isDark ? 'text-white' : 'text-slate-900';

  return (
    <div className={`rounded-xl border p-5 ${cardBg}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className={`text-sm font-semibold ${textPrimary} flex items-center gap-2`}>
          {Icon && (
            <Icon size={16} style={{ color: couleur }} />
          )}
          {title}
        </h3>
        <button
          onClick={onViewAll}
          className={`text-xs font-medium min-h-[44px] min-w-[44px] flex items-center justify-center rounded transition-colors ${
            isDark
              ? 'hover:bg-slate-700'
              : 'hover:bg-slate-100'
          }`}
          style={{ color: couleur }}
          type="button"
        >
          Voir tout
          {' '}
          <ChevronRight size={14} className="ml-1" />
        </button>
      </div>
      <div className="space-y-3">
        {children}
      </div>
    </div>
  );
};

export default function DashboardGrid({
  isDark = false,
  couleur = '#8b5cf6',
  setPage = () => {},
  devis = [],
  chantiers = [],
  stats = {},
  activities = [],
  modeDiscret = false,
  clients = [],
}) {
  const textPrimary = isDark ? 'text-slate-100' : 'text-slate-900';
  const textSecondary = isDark ? 'text-slate-400' : 'text-slate-600';

  // Get recent devis (last 3, excluding factures)
  // Priority: envoye > signe > brouillon, then sorted by date descending
  const recentDevis = devis
    .filter((d) => d.type !== 'facture')
    .sort((a, b) => {
      // Status priority: envoye (0), signe (1), brouillon (2), others (3)
      const statusOrder = { envoye: 0, signe: 1, brouillon: 2 };
      const aPriority = statusOrder[a.statut] ?? 3;
      const bPriority = statusOrder[b.statut] ?? 3;
      if (aPriority !== bPriority) return aPriority - bPriority;
      // Within same status, sort by date descending
      return new Date(b.date) - new Date(a.date);
    })
    .slice(0, 3);

  // Get active chantiers (last 3)
  const activeChantiers = chantiers
    .filter((c) => c.statut === 'en_cours')
    .sort((a, b) => new Date(b.date_debut) - new Date(a.date_debut))
    .slice(0, 3);

  // Get recent activities (last 3)
  const recentActivities = activities.slice(0, 3);

  // Destructure stats
  const {
    aEncaisser = 0,
    caMois = 0,
    caPrev = 0,
    _moisPrecedent = 0,
  } = stats;

  return (
    <div className="px-4 sm:px-6 pb-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* 1. Devis récents */}
        <DashboardCard
          isDark={isDark}
          title="Devis récents"
          icon={FileText}
          couleur={couleur}
          onViewAll={() => setPage('devis')}
        >
          {recentDevis.length > 0 ? (
            recentDevis.map((d) => {
              const client = clients.find((c) => c.id === d.client_id);
              const jours = daysSince(d.date);

              return (
                <div
                  key={d.id}
                  className={`flex items-start gap-3 pb-3 border-b last:border-b-0 last:pb-0 ${
                    isDark ? 'border-slate-700' : 'border-slate-100'
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs font-medium truncate ${textPrimary}`}>
                      {client ? (client.nom || client.name) : 'Client inconnu'}
                    </p>
                    <p className={`text-[10px] mt-0.5 ${textSecondary}`}>
                      {jours > 0 ? `Envoyé il y a ${jours}j` : 'Envoyé aujourd\'hui'}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className={`text-xs font-semibold ${textPrimary}`}>
                      {formatMoney(d.total_ttc, modeDiscret)}
                    </p>
                    <div className="mt-1">
                      <StatusBadge status={d.statut} isDark={isDark} />
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <p className={`text-xs ${textSecondary}`}>Aucun devis</p>
          )}
        </DashboardCard>

        {/* 2. Chantiers actifs */}
        <DashboardCard
          isDark={isDark}
          title="Chantiers actifs"
          icon={Briefcase}
          couleur={couleur}
          onViewAll={() => setPage('chantiers')}
        >
          {activeChantiers.length > 0 ? (
            activeChantiers.map((c) => {
              const client = clients.find((cl) => cl.id === c.client_id);
              const progress = c.avancement || 0;

              return (
                <div
                  key={c.id}
                  className={`pb-3 border-b last:border-b-0 last:pb-0 ${
                    isDark ? 'border-slate-700' : 'border-slate-100'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs font-medium truncate ${textPrimary}`}>
                        {c.nom || c.name || 'Chantier'}
                      </p>
                      <p className={`text-[10px] mt-0.5 ${textSecondary}`}>
                        {client ? (client.nom || client.name) : 'Pas de client'}
                      </p>
                    </div>
                    <span className={`text-xs font-semibold ml-2 flex-shrink-0 ${textPrimary}`}>
                      {progress}
                      %
                    </span>
                  </div>
                  <div
                    className={`w-full h-2 rounded-full overflow-hidden ${
                      isDark ? 'bg-slate-700' : 'bg-slate-200'
                    }`}
                  >
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${Math.min(progress, 100)}%`,
                        backgroundColor: couleur,
                      }}
                    />
                  </div>
                </div>
              );
            })
          ) : (
            <p className={`text-xs ${textSecondary}`}>Aucun chantier actif</p>
          )}
        </DashboardCard>

        {/* 3. Trésorerie */}
        <DashboardCard
          isDark={isDark}
          title="Trésorerie"
          icon={TrendingUp}
          couleur={couleur}
          onViewAll={() => setPage('finances')}
        >
          <div className="space-y-3">
            <div className={`p-3 rounded-lg ${isDark ? 'bg-slate-700/50' : 'bg-slate-50'}`}>
              <p className={`text-[10px] font-medium ${textSecondary}`}>
                À encaisser
              </p>
              <p className={`text-sm font-bold mt-1 ${textPrimary}`}>
                {formatMoney(aEncaisser, modeDiscret)}
              </p>
            </div>
            <div className={`p-3 rounded-lg ${isDark ? 'bg-slate-700/50' : 'bg-slate-50'}`}>
              <p className={`text-[10px] font-medium ${textSecondary}`}>
                CA ce mois
              </p>
              <p className={`text-sm font-bold mt-1 ${textPrimary}`}>
                {formatMoney(caMois, modeDiscret)}
              </p>
            </div>
            <div className={`p-3 rounded-lg ${isDark ? 'bg-slate-700/50' : 'bg-slate-50'}`}>
              <p className={`text-[10px] font-medium ${textSecondary}`}>
                CA prévisionnel
              </p>
              <p className={`text-sm font-bold mt-1 ${textPrimary}`}>
                {formatMoney(caPrev, modeDiscret)}
              </p>
            </div>
          </div>
        </DashboardCard>

        {/* 4. Activité récente */}
        <DashboardCard
          isDark={isDark}
          title="Activité récente"
          icon={Activity}
          couleur={couleur}
          onViewAll={() => setPage('activity')}
        >
          {recentActivities.length > 0 ? (
            recentActivities.map((activity, idx) => {
              // eslint-disable-next-line no-unused-vars
              const ActivityIcon = activity.icon || Activity;

              return (
                <div
                  key={activity.id || idx}
                  className={`flex items-start gap-3 pb-3 border-b last:border-b-0 last:pb-0 ${
                    isDark ? 'border-slate-700' : 'border-slate-100'
                  }`}
                >
                  <ActivityIcon
                    size={14}
                    className="mt-0.5 flex-shrink-0"
                    style={{ color: couleur }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs font-medium ${textPrimary}`}>
                      {activity.title}
                    </p>
                    {activity.subtitle && (
                      <p className={`text-[10px] mt-0.5 truncate ${textSecondary}`}>
                        {activity.subtitle}
                      </p>
                    )}
                    <p className={`text-[10px] mt-1 ${textSecondary}`}>
                      {activity.time || 'Récent'}
                    </p>
                  </div>
                </div>
              );
            })
          ) : (
            <p className={`text-xs ${textSecondary}`}>Aucune activité</p>
          )}
        </DashboardCard>
      </div>
    </div>
  );
}
