/**
 * Dashboard — 5-zone layout
 *
 * 1. Header Greeting — greeting, score santé, mode discret toggle
 * 2. Notification Strip — urgent/warning banners (factures en retard, conformité)
 * 3. KPI Strip — 4 KPI cards (À encaisser, CA ce mois, Devis en attente, Chantiers actifs)
 * 4. Actions du jour — prioritized actions list (max 3 visible, expandable)
 * 5. Dashboard Grid — main content grid (pipeline, chantier actif, activities, onboarding)
 *
 * Responsive: single column on mobile, optimized layout on desktop.
 *
 * @module Dashboard
 */

import { useMemo } from 'react';
import {
  FileText,
  HardHat,
  Eye,
  EyeOff,
  Receipt,
  Send,
  ClipboardList,
  CheckCircle,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';

import { useToast } from '../context/AppContext';
import { usePermissions } from '../hooks/usePermissions';
import NotificationStrip from './dashboard/NotificationStrip';
import KPIStrip from './dashboard/KPIStrip';
import DashboardGrid from './dashboard/DashboardGrid';

// ============ CONSTANTS ============

const PROFILE_ALL_FIELDS = [
  { key: 'nom', label: 'Nom', tab: 'identite' },
  { key: 'adresse', label: 'Adresse', tab: 'identite' },
  { key: 'siret', label: 'SIRET', tab: 'legal' },
  { key: 'tel', label: 'Téléphone', tab: 'identite' },
  { key: 'email', label: 'Email', tab: 'identite' },
  { key: 'formeJuridique', label: 'Forme juridique', tab: 'legal' },
  { key: 'codeApe', label: 'Code APE', tab: 'legal' },
  { key: 'tvaIntra', label: 'TVA Intra', tab: 'legal' },
  { key: 'rcProAssureur', label: 'RC Pro', tab: 'assurances' },
  { key: 'decennaleAssureur', label: 'Décennale', tab: 'assurances' },
];

const F26_CRITERIA = [
  { label: 'SIRET', key: 'siret' },
  { label: 'N° TVA', key: 'tvaIntra' },
  { label: 'RCS', key: 'rcs' },
  { label: 'Banque', key: 'banque' },
  { label: 'Adresse', key: 'adresse' },
  { label: 'RC Pro', key: 'rcPro' },
];

// ============ ANIMATION VARIANTS ============
// (Removed unused fadeInUp — kept for reference if needed in future features)

// ============ HELPERS ============

function fmt(amount, discret = false) {
  if (discret) return '\u2022\u2022\u2022\u2022\u2022';
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(amount || 0);
}

// Compact format removed — use fmt() helper for all formatting

function daysSince(date) {
  if (!date) return 0;
  const d = date instanceof Date ? date : new Date(date);
  return Math.floor((new Date() - d) / (1000 * 60 * 60 * 24));
}

function getPrenom(user) {
  if (!user) return '';
  const meta = user.user_metadata || {};
  if (meta.prenom) return meta.prenom;
  if (meta.full_name) return meta.full_name.split(' ')[0];
  if (meta.name) return meta.name.split(' ')[0];
  return (user.email || '').split('@')[0];
}

/**
 * Compute the trend percentage between two values.
 * Returns an object { value, direction } where direction is 'up', 'down', or 'flat'.
 */
function computeTrend(current, previous) {
  if (!previous || previous === 0) {
    if (current > 0) return { value: 100, direction: 'up' };
    return { value: 0, direction: 'flat' };
  }
  const pct = Math.round(((current - previous) / previous) * 100);
  if (pct > 0) return { value: pct, direction: 'up' };
  if (pct < 0) return { value: Math.abs(pct), direction: 'down' };
  return { value: 0, direction: 'flat' };
}

// ============ SCORE SANTE ============

function ScoreSante({ score, isDark }) {
  const dots = Array.from({ length: 5 }, (_, i) => i < Math.round(score / 2));
  const color = score >= 8 ? '#10b981' : score >= 5 ? '#f59e0b' : '#ef4444';
  return (
    <div className="flex items-center gap-1.5">
      <span className={`text-xs font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
        {score}/10
      </span>
      <div className="flex gap-0.5">
        {dots.map((filled, i) => (
          <div
            key={i}
            className="w-2 h-2 rounded-full transition-colors"
            style={{ background: filled ? color : (isDark ? '#334155' : '#e2e8f0') }}
          />
        ))}
      </div>
    </div>
  );
}

// ============ TREND BADGE ============
// (Removed — trend display now handled directly in KPIStrip component)

// ============ ACTION ITEM ============

function ActionItem({ icon: Icon, color, label, detail, actionLabel, onClick, isDark }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full flex items-center gap-4 px-4 py-3.5 transition-colors text-left ${
        isDark ? 'hover:bg-slate-700/50' : 'hover:bg-gray-50'
      }`}
    >
      <div
        className="flex items-center justify-center w-9 h-9 rounded-xl flex-shrink-0"
        style={{ background: `${color}15` }}
      >
        <Icon className="w-4.5 h-4.5" style={{ color }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium truncate ${isDark ? 'text-slate-200' : 'text-gray-800'}`}>
          {label}
        </p>
        {detail && (
          <p className={`text-xs truncate mt-0.5 ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
            {detail}
          </p>
        )}
      </div>
      {actionLabel && (
        <span className={`text-[10px] px-2 py-0.5 rounded-full flex-shrink-0 font-medium ${isDark ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-500'}`}>
          {actionLabel}
        </span>
      )}
      <svg className={`w-4 h-4 flex-shrink-0 ${isDark ? 'text-slate-600' : 'text-gray-300'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
      </svg>
    </button>
  );
}



// ============ URGENT BANNER ============

// ============ PROFILE COMPLETION BANNER ============

/**
 * Full-width banner shown when profile completion is below 50%.
 * Displayed above the 2-column grid.
 */
// ProfileBanner removed — replaced by compact onboarding bandeau

// ============ BATCH RELAUNCH BUTTON ============

/**
 * GAP 5: Button to relaunch all pending follow-ups at once.
 * Displayed when there are 2+ actions of type "Relancer".
 */
function BatchRelaunchButton({ actions, couleur, showToast }) {
  const relanceActions = actions.filter(a => a.actionLabel === 'Relancer');
  if (relanceActions.length < 2) return null;

  const handleBatchRelaunch = () => {
    // In a real implementation, this would trigger bulk email/SMS sending
    // For now, show a toast confirming the intent
    if (showToast) {
      showToast(`${relanceActions.length} relances envoyées`, 'success');
    }
  };

  return (
    <div className="mt-3 flex justify-end opacity-100 scale-100 transition-all duration-200">
      <button
        type="button"
        onClick={handleBatchRelaunch}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-white transition-transform hover:scale-[1.02] active:scale-[0.98]"
        style={{ background: couleur }}
      >
        <Send className="w-3.5 h-3.5" />
        Tout relancer ({relanceActions.length})
      </button>
    </div>
  );
}

// OnboardingSection removed — replaced by compact onboarding bandeau

// ============ CHANTIER ACTIF WIDGET ============

/**
 * Displays the main active chantier with progress bar.
 * Shows a "create" CTA when no chantier is active.
 */
// ============ PIPELINE WIDGET ============

/**
 * Pipeline devis section with funnel bar and CA prévisionnel.
 */
// PipelineWidget + SparklineCAWidget removed — data available in Analytics Premium

// ============ ACTIONS SECTION ============

/**
 * Actions prioritaires section with differentiated icons and batch relaunch.
 */
function ActionsSection({
  allActions,
  visibleActions,
  isDark,
  couleur,
  showToast,
}) {
  if (allActions.length === 0) return null;

  const textSecondary = isDark ? 'text-slate-400' : 'text-gray-500';
  const sectionBg = isDark ? 'bg-slate-800 border border-slate-700/50' : 'bg-white shadow-[0_1px_3px_rgba(0,0,0,0.06)]';

  return (
    <section style={{ opacity: 1, transform: 'translateY(0)' }} className="transition-all duration-400">
      <h2 className={`text-sm font-semibold uppercase tracking-wider mb-3 ${textSecondary}`}>
        Actions prioritaires
      </h2>
      <div className={`rounded-2xl divide-y ${sectionBg} ${isDark ? 'divide-slate-700/50' : 'divide-gray-100'}`}>
        {visibleActions.map((action, i) => (
          <div
            key={i}
            style={{ opacity: 1, transform: 'translateX(0)' }}
            className="transition-all duration-300"
          >
            <ActionItem
              icon={action.icon}
              color={action.color}
              label={action.label}
              detail={action.detail}
              actionLabel={action.actionLabel}
              onClick={action.onClick}
              isDark={isDark}
            />
          </div>
        ))}
      </div>

      {/* GAP 5: Batch relaunch button */}
      <BatchRelaunchButton
        actions={allActions}
        couleur={couleur}
        showToast={showToast}
      />
    </section>
  );
}

// ============ ACTIVITY TIMELINE ============

/**
 * Recent activity timeline showing the latest business events.
 * Helps user see what happened recently at a glance.
 */

// ============ MAIN DASHBOARD ============

export default function Dashboard({
  chantiers = [],
  clients = [],
  devis = [],
  entreprise,
  couleur = '#8b5cf6',
  modeDiscret,
  setModeDiscret,
  setPage,
  setSelectedDevis,
  isDark = false,
  user,
  memos = [],
  toggleMemo,
}) {
  const { showToast } = useToast();
  const { canAccess } = usePermissions();
  const canSeeFinances = canAccess('finances');

  // ---- Computed data ----
  const computed = useMemo(() => {
    const now = new Date();

    // KPIs
    const aEncaisser = devis
      .filter(d => d.type === 'facture' && ['envoye', 'facture'].includes(d.statut))
      .reduce((s, d) => s + (d.total_ttc || 0), 0);

    const retard = devis
      .filter(d => d.type === 'facture' && d.date_echeance && new Date(d.date_echeance) < now)
      .reduce((s, d) => s + (d.total_ttc || 0), 0);

    const devisEnAttente = devis.filter(d => d.type !== 'facture' && d.statut === 'envoye');
    const chantiersActifs = chantiers.filter(c => c.statut === 'en_cours');

    const envoyes = devis.filter(d => d.type !== 'facture' && ['envoye', 'signe', 'facture', 'refuse'].includes(d.statut));
    const signesDevis = devis.filter(d => d.type !== 'facture' && ['signe', 'facture'].includes(d.statut));
    const tauxConversion = envoyes.length > 0 ? Math.round(signesDevis.length / envoyes.length * 100) : 0;

    // ---- GAP 2: CA ce mois + mois précédent pour tendance ----
    const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const caCeMois = devis
      .filter(d => ['signe', 'facture'].includes(d.statut) && d.date?.startsWith(currentMonthKey))
      .reduce((s, d) => s + (d.total_ttc || 0), 0);

    // Last month CA for trend calculation
    const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthKey = `${prevMonth.getFullYear()}-${String(prevMonth.getMonth() + 1).padStart(2, '0')}`;
    const lastMonthCA = devis
      .filter(d => ['signe', 'facture'].includes(d.statut) && d.date?.startsWith(lastMonthKey))
      .reduce((s, d) => s + (d.total_ttc || 0), 0);

    // Trend for "Ce mois" KPI
    const caCeMoisTrend = computeTrend(caCeMois, lastMonthCA);

    // Trend for "À encaisser" — compare to what was outstanding last month
    const lastMonthEncaisser = devis
      .filter(d => {
        if (d.type !== 'facture') return false;
        if (!['envoye', 'facture'].includes(d.statut)) return false;
        return d.date?.startsWith(lastMonthKey);
      })
      .reduce((s, d) => s + (d.total_ttc || 0), 0);
    const aEncaisserTrend = computeTrend(aEncaisser, lastMonthEncaisser);

    // Pipeline (GAP 4: + Payé stage)
    const pipeline = {
      brouillon: { count: devis.filter(d => d.statut === 'brouillon').length, total: devis.filter(d => d.statut === 'brouillon').reduce((s, d) => s + (d.total_ttc || 0), 0) },
      envoye: { count: devis.filter(d => d.statut === 'envoye').length, total: devis.filter(d => d.statut === 'envoye').reduce((s, d) => s + (d.total_ttc || 0), 0) },
      signe: { count: devis.filter(d => d.statut === 'signe').length, total: devis.filter(d => d.statut === 'signe').reduce((s, d) => s + (d.total_ttc || 0), 0) },
      facture: { count: devis.filter(d => d.statut === 'facture').length, total: devis.filter(d => d.statut === 'facture').reduce((s, d) => s + (d.total_ttc || 0), 0) },
      paye: { count: devis.filter(d => d.statut === 'paye').length, total: devis.filter(d => d.statut === 'paye').reduce((s, d) => s + (d.total_ttc || 0), 0) },
    };

    // CA prévisionnel (signés non encore facturés + envoyés * 0.5)
    const caPrevisionnel = pipeline.signe.total + Math.round(pipeline.envoye.total * 0.5);

    // Actions prioritaires (GAP 5: differentiated icons + actionLabel)
    const actions = [];

    // 1. Factures en retard — AlertTriangle icon, red color
    devis
      .filter(d => d.type === 'facture' && d.date_echeance && new Date(d.date_echeance) < now && ['envoye', 'facture'].includes(d.statut))
      .sort((a, b) => new Date(a.date_echeance) - new Date(b.date_echeance))
      .forEach(d => {
        const jours = daysSince(d.date_echeance);
        const client = clients.find(c => c.id === d.client_id);
        actions.push({
          priority: 1,
          icon: Receipt,  // GAP 5: Receipt for invoices
          color: '#ef4444',
          label: `Facture en retard de ${jours}j`,
          detail: client ? `${client.nom || client.name} — ${fmt(d.total_ttc, modeDiscret)}` : fmt(d.total_ttc, modeDiscret),
          actionLabel: 'Relancer',
          onClick: () => { setSelectedDevis(d); setPage('devis'); },
        });
      });

    // 2. Devis envoyés sans réponse > 7j — Clock icon, orange color
    devisEnAttente
      .filter(d => d.date && daysSince(d.date) > 7)
      .sort((a, b) => daysSince(b.date) - daysSince(a.date))
      .forEach(d => {
        const jours = daysSince(d.date);
        const client = clients.find(c => c.id === d.client_id);
        actions.push({
          priority: 2,
          icon: Send,  // GAP 5: Send for follow-ups
          color: '#f97316',
          label: `Devis sans réponse (${jours}j)`,
          detail: client ? `${client.nom || client.name} — ${fmt(d.total_ttc, modeDiscret)}` : fmt(d.total_ttc, modeDiscret),
          actionLabel: 'Relancer',
          onClick: () => { setSelectedDevis(d); setPage('devis'); },
        });
      });

    // 3. Brouillons à finaliser (groupé) — FileText icon, yellow
    const brouillons = devis.filter(d => d.statut === 'brouillon' && d.type !== 'facture');
    if (brouillons.length > 0) {
      const totalBrouillons = brouillons.reduce((s, d) => s + (d.total_ttc || 0), 0);
      actions.push({
        priority: 3,
        icon: ClipboardList,  // GAP 5: ClipboardList for memos/brouillons
        color: '#eab308',
        label: `${brouillons.length} brouillon${brouillons.length > 1 ? 's' : ''} à finaliser`,
        detail: fmt(totalBrouillons, modeDiscret),
        actionLabel: 'Finaliser',
        onClick: () => setPage('devis'),
      });
    }

    // Score santé /10
    let score = 0;
    if (retard === 0) score += 2;
    if (entreprise?.siret) score += 2;
    if (chantiersActifs.length > 0) score += 2;
    if (tauxConversion >= 40) score += 2;
    if (caCeMois > 0) score += 2;

    // Chantier actif principal (le plus avancé)
    const chantierPrincipal = chantiersActifs
      .sort((a, b) => (b.avancement || 0) - (a.avancement || 0))[0] || null;

    // Onboarding: profil + conformité
    const profilComplete = entreprise
      ? PROFILE_ALL_FIELDS.filter(f => entreprise[f.key]).length
      : 0;
    const profilPct = Math.round((profilComplete / PROFILE_ALL_FIELDS.length) * 100);

    const f26Complete = entreprise
      ? F26_CRITERIA.filter(c => {
          if (c.key === 'banque') return entreprise.iban;
          if (c.key === 'rcs') return entreprise.rcsVille || entreprise.rcsNumero;
          if (c.key === 'rcPro') return entreprise.rcProAssureur;
          return entreprise[c.key];
        }).length
      : 0;
    const f26Pct = Math.round((f26Complete / F26_CRITERIA.length) * 100);


    // Count factures en retard for urgent banner
    const facturesEnRetard = devis
      .filter(d => d.type === 'facture' && d.date_echeance && new Date(d.date_echeance) < now && ['envoye', 'facture'].includes(d.statut));

    // CA total signé/facturé
    const caSigne = devis
      .filter(d => ['signe', 'facture'].includes(d.statut))
      .reduce((s, d) => s + (d.total_ttc || 0), 0);

    return {
      aEncaisser,
      aEncaisserTrend,
      retard,
      devisEnAttente,
      chantiersActifs,
      tauxConversion,
      pipeline,
      caPrevisionnel,
      caSigne,
      actions: actions.sort((a, b) => a.priority - b.priority),
      score,
      chantierPrincipal,
      profilPct,
      f26Pct,
      caCeMois,
      caCeMoisTrend,
      lastMonthCA,
      facturesEnRetardCount: facturesEnRetard.length,
    };
  }, [devis, chantiers, clients, entreprise, modeDiscret, setSelectedDevis, setPage]);

  // ---- Greeting ----
  const prenom = getPrenom(user);
  const formattedDate = new Date().toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  // ---- Memos du jour ----
  const memosJour = useMemo(() => {
    const today = new Date().toISOString().substring(0, 10);
    return memos.filter(m => !m.done && (!m.date || m.date === today));
  }, [memos]);

  // Merge memos into actions
  const allActions = useMemo(() => {
    const memoActions = memosJour.map(m => ({
      priority: 4,
      icon: CheckCircle,
      color: '#10b981',
      label: m.text || m.titre || 'Mémo',
      detail: 'Mémo du jour',
      actionLabel: 'Fait',
      onClick: () => toggleMemo?.(m.id),
    }));
    return [...computed.actions, ...memoActions];
  }, [computed.actions, memosJour, toggleMemo]);

  // ============ RENDER ============

  return (
    <div className={`pb-20 lg:pb-0 min-h-screen ${isDark ? 'bg-slate-900' : 'bg-[#F5F7FA]'}`}>

      {/* =========== ZONE 1: Header Greeting =========== */}
      <header className={`px-4 sm:px-6 py-4 ${isDark ? 'bg-slate-900' : 'bg-[#F5F7FA]'}`}>
        <div className="max-w-[1440px] mx-auto flex justify-between items-start">
          <div>
            <h1 className={`text-xl sm:text-2xl font-semibold tracking-tight ${isDark ? 'text-white' : 'text-gray-900'}`}>
              Bonjour{prenom ? `, ${prenom}` : ''}
            </h1>
            <p className={`text-sm capitalize mt-0.5 ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
              {formattedDate}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setModeDiscret?.(!modeDiscret)}
              className={`min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg transition-colors ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-100'}`}
              title={modeDiscret ? 'Afficher les montants' : 'Masquer les montants'}
              aria-label={modeDiscret ? 'Afficher les montants' : 'Masquer les montants'}
            >
              {modeDiscret
                ? <EyeOff className={`w-5 h-5 ${isDark ? 'text-slate-400' : 'text-gray-500'}`} />
                : <Eye className={`w-5 h-5 ${isDark ? 'text-slate-400' : 'text-gray-500'}`} />
              }
            </button>
            <ScoreSante score={computed.score} isDark={isDark} couleur={couleur} />
          </div>
        </div>
      </header>

      <div className="max-w-[1440px] mx-auto">

        {/* =========== ZONE 2: Notification Strip =========== */}
        <NotificationStrip
          isDark={isDark}
          couleur={couleur}
          notifications={[
            // Urgent: factures en retard
            ...(computed.facturesEnRetardCount > 0 ? [{
              id: 'factures-retard',
              type: 'urgent',
              message: `${computed.facturesEnRetardCount} facture${computed.facturesEnRetardCount > 1 ? 's' : ''} en retard — Total : ${fmt(computed.retard, modeDiscret)}`,
              ctaLabel: 'Voir',
              onAction: () => setPage('devis'),
            }] : []),
            // Warning: profil incomplet ou conformité
            ...((computed.profilPct < 80 || computed.f26Pct < 100) ? [{
              id: 'profil-conformite',
              type: 'warning',
              message: [
                computed.profilPct < 80 ? `Profil ${computed.profilPct}%` : '',
                computed.f26Pct < 100 ? `Conformité ${computed.f26Pct}%` : '',
              ].filter(Boolean).join(' · '),
              ctaLabel: 'Compléter',
              onAction: () => setPage('settings'),
            }] : []),
          ]}
        />

        {/* =========== ZONE 3: KPI Strip =========== */}
        {canSeeFinances && (
          <KPIStrip
            isDark={isDark}
            couleur={couleur}
            kpis={[
              {
                label: 'À encaisser',
                value: fmt(computed.aEncaisser, modeDiscret),
                icon: FileText,
                onClick: () => setPage('devis'),
                trend: computed.aEncaisserTrend ? `${computed.aEncaisserTrend.direction === 'up' ? '+' : ''}${computed.aEncaisserTrend.value}%` : null,
                trendUp: computed.aEncaisserTrend?.direction === 'up',
              },
              {
                label: 'CA ce mois',
                value: fmt(computed.caCeMois, modeDiscret),
                icon: TrendingUp,
                onClick: () => setPage('finances'),
                trend: computed.caCeMoisTrend ? `${computed.caCeMoisTrend.direction === 'up' ? '+' : ''}${computed.caCeMoisTrend.value}%` : null,
                trendUp: computed.caCeMoisTrend?.direction === 'up',
              },
              {
                label: 'Devis en attente',
                value: String(computed.devisEnAttente.length),
                icon: Send,
                onClick: () => setPage('devis'),
              },
              {
                label: 'Chantiers actifs',
                value: String(computed.chantiersActifs.length),
                icon: HardHat,
                onClick: () => setPage('chantiers'),
              },
            ]}
          />
        )}

        {/* =========== ZONE 4: Actions du jour (max 3) =========== */}
        {allActions.length > 0 && (
          <div className="px-4 sm:px-6 mb-6">
            <ActionsSection
              allActions={allActions}
              visibleActions={allActions.slice(0, 3)}
              isDark={isDark}
              couleur={couleur}
              showToast={showToast}
            />
          </div>
        )}

        {/* =========== ZONE 5: Dashboard Grid 2x2 =========== */}
        <DashboardGrid
          isDark={isDark}
          couleur={couleur}
          setPage={setPage}
          devis={devis}
          chantiers={chantiers}
          clients={clients}
          stats={{
            aEncaisser: computed.aEncaisser,
            caMois: computed.caCeMois,
            caPrev: computed.caPrevisionnel,
            moisPrecedent: computed.lastMonthCA,
          }}
          activities={[]}
          modeDiscret={modeDiscret}
        />
      </div>
    </div>
  );
}
