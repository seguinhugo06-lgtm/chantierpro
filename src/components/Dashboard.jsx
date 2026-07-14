/**
 * Dashboard — Focus & Pulse
 *
 * 3-zone layout:
 * 1. Hero Pulse — greeting, score santé, 4 KPI cards, sparkline CA
 * 2. Actions Prioritaires — unified priority list
 * 3. Contexte — active chantier + pipeline funnel + onboarding bar
 *
 * 2-column layout on desktop (lg:):
 *  - Left column: KPIs, sparkline CA, pipeline, actions du jour, promo cards
 *  - Right column: chantier actif, onboarding
 *  - Banners (profile < 50%, urgent) stay full-width above the grid
 *
 * @module Dashboard
 */

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  FileText,
  HardHat,
  AlertTriangle,
  AlertCircle,
  Clock,
  ChevronRight,
  Eye,
  EyeOff,
  ArrowRight,
  Receipt,
  Send,
  ClipboardList,
  CheckCircle,
  TrendingUp,
  Rocket,
  Plus,
  BellRing,
  Wallet,
} from 'lucide-react';

import { useData } from '../context/DataContext';
import { useToast } from '../context/AppContext';
import { usePermissions } from '../hooks/usePermissions';
import { useRelances } from '../hooks/useRelances';
import { useOrg } from '../context/OrgContext';
import { captureException } from '../lib/sentry';

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

// ============ HELPERS ============

function fmt(amount, discret = false) {
  if (discret) return '\u2022\u2022\u2022\u2022\u2022';
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(amount || 0);
}

/**
 * Format money for compact display in pipeline segments
 * e.g. 12500 => "12,5k €", 950 => "950 €"
 */
function daysSince(date) {
  if (!date) return 0;
  const d = date instanceof Date ? date : new Date(date);
  return Math.floor((new Date() - d) / (1000 * 60 * 60 * 24));
}

function getPrenom(user, entreprise) {
  if (!user) return '';
  const meta = user.user_metadata || {};
  if (meta.prenom) return meta.prenom;
  if (meta.first_name) return meta.first_name;
  if (meta.full_name) return meta.full_name.split(' ')[0];
  if (meta.name) return meta.name.split(' ')[0];
  if (entreprise?.nom) return entreprise.nom.split(' ')[0];
  return (user.email || '').split('@')[0] || 'Artisan';
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

// ============ MAIN DASHBOARD ============

export default function Dashboard({
  chantiers = [],
  clients = [],
  devis = [],
  depenses = [],
  pointages = [],
  equipe = [],
  ajustements = [],
  catalogue = [],
  entreprise,
  getChantierBilan,
  addDevis,
  couleur = '#8b5cf6',
  modeDiscret,
  setModeDiscret,
  setSelectedChantier,
  setPage,
  setSelectedDevis,
  setCreateMode,
  isDark = false,
  showHelp = false,
  setShowHelp,
  user,
  onOpenSearch,
  memos = [],
  addMemo,
  toggleMemo,
}) {
  const { dataLoading } = useData();
  const { showToast } = useToast();
  const { canAccess } = usePermissions();
  const canSeeFinances = canAccess('finances');
  const { orgId } = useOrg();

  // Relances : détection auto + envoi groupé 1-clic (cœur du pivot devis→facture→relance)
  const relances = useRelances({ devis, clients, entreprise, userId: user?.id, orgId });
  const [sendingRelances, setSendingRelances] = useState(false);
  const [onboardingHidden, setOnboardingHidden] = useState(() => !!localStorage.getItem('cp_onboarding_dismissed'));
  const handleSendAllRelances = async () => {
    if (sendingRelances) return;
    setSendingRelances(true);
    try {
      const res = await relances.sendBulkRelances();
      if (res?.sent > 0) {
        showToast(
          `${res.sent} relance${res.sent > 1 ? 's' : ''} envoyée${res.sent > 1 ? 's' : ''}${res.failed ? ` — ${res.failed} échec${res.failed > 1 ? 's' : ''}` : ''}`,
          res.failed ? 'warning' : 'success'
        );
      } else if (res?.failed > 0) {
        showToast(`Échec de ${res.failed} relance${res.failed > 1 ? 's' : ''}`, 'error');
      } else {
        showToast('Aucune relance à envoyer', 'info');
      }
    } catch (error) {
      captureException(error, { context: 'dashboard bulk relances' });
      showToast('Erreur lors de l\'envoi des relances', 'error');
    } finally {
      setSendingRelances(false);
    }
  };

  const [showAllActions, setShowAllActions] = useState(false);
  const [dismissedNotif, setDismissedNotif] = useState(() => {
    const ts = localStorage.getItem('cp_notif_dismissed');
    // Auto-reset after 24h
    return ts && (Date.now() - Number(ts)) < 86400000;
  });

  // Onboarding state removed — replaced by compact bandeau

  // GAP 7: Overview collapsible state (default closed)
  const [showOverview, setShowOverview] = useState(false);

  // ---- Theme ----
  const cardBg = isDark ? 'bg-slate-800 border border-slate-700/50' : 'bg-white shadow-[0_1px_3px_rgba(0,0,0,0.06)]';
  const textPrimary = isDark ? 'text-slate-100' : 'text-gray-900';
  const textSecondary = isDark ? 'text-slate-400' : 'text-gray-500';
  const sectionBg = isDark ? 'bg-slate-800 border border-slate-700/50' : 'bg-white shadow-[0_1px_3px_rgba(0,0,0,0.06)]';

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

    // Sparkline data: CA par mois (6 derniers mois)
    const sparkData = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleDateString('fr-FR', { month: 'short' });
      const ca = devis
        .filter(dv => ['signe', 'facture'].includes(dv.statut) && dv.date?.startsWith(key))
        .reduce((sum, dv) => sum + (dv.total_ttc || 0), 0);
      sparkData.push({ label, ca });
    }

    return {
      aEncaisser,
      aEncaisserTrend,
      retard,
      devisEnAttente,
      chantiersActifs,
      tauxConversion,
      pipeline,
      caPrevisionnel,
      actions: actions.sort((a, b) => a.priority - b.priority),
      score,
      chantierPrincipal,
      profilPct,
      f26Pct,
      caCeMois,
      caCeMoisTrend,
      lastMonthCA,
      facturesEnRetardCount: facturesEnRetard.length,
      sparkData,
    };
  }, [devis, chantiers, clients, entreprise, modeDiscret, setSelectedDevis, setPage]);

  // ---- Greeting ----
  const prenom = getPrenom(user, entreprise);
  const capitalize = s => s.charAt(0).toUpperCase() + s.slice(1);
  const formattedDate = capitalize(new Date().toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }));

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

  const visibleActions = showAllActions ? allActions : allActions.slice(0, 5);

  // ---- KPI color classes ----
  const kpiCardClass = isDark
    ? 'bg-slate-800 border border-slate-700/50'
    : 'bg-white shadow-[0_1px_3px_rgba(0,0,0,0.06)]';
  const kpiColors = {
    encaisser: kpiCardClass,
    devisAttente: kpiCardClass,
    chantiers: kpiCardClass,
    conversion: kpiCardClass,
  };

  // ============ RENDER ============

  const pageBg = isDark ? 'bg-slate-900' : 'bg-[#F5F7FA]';
  const heroText = isDark ? 'text-white' : 'text-gray-900';
  const subText = isDark ? 'text-slate-400' : 'text-gray-500';
  const cardCls = isDark
    ? 'bg-slate-800 border border-slate-700/50'
    : 'bg-white border border-slate-200/70 shadow-[0_1px_3px_rgba(0,0,0,0.05)]';
  const trackBg = isDark ? '#1e293b' : '#f1f5f9';

  const relancesDue = relances?.counts?.due || 0;
  const relancesRisk = relances?.totalAtRisk || 0;
  const hasAnyAction = relancesDue > 0 || allActions.length > 0;

  // Onboarding (nouveaux comptes uniquement)
  const onboardingSteps = [
    // « Fait » = les champs qui débloquent l'ENVOI d'un devis (mêmes règles que le garde légal),
    // pas un simple % de profil — sinon l'étape se coche alors que l'envoi restera bloqué.
    { key: 'profil', label: 'Configurer mon entreprise', done: !!(entreprise?.nom && entreprise?.siret && entreprise?.adresse && (entreprise?.formeJuridique || entreprise?.forme_juridique) && (entreprise?.decennaleAssureur || entreprise?.decennale_assureur) && (entreprise?.decennaleNumero || entreprise?.decennale_numero)), action: () => setPage('settings') },
    { key: 'client', label: 'Ajouter mon premier client', done: (clients?.length || 0) > 0, action: () => setPage('clients') },
    { key: 'devis', label: 'Créer mon premier devis', done: (devis?.length || 0) > 0, action: () => { setCreateMode?.(p => ({ ...p, devis: true })); setPage('devis'); } },
    { key: 'relances', label: 'Activer les relances automatiques', done: !!(entreprise?.relanceConfig?.enabled), action: () => { try { localStorage.setItem('cp_settings_tab', 'relances'); } catch { /* noop */ } setPage('settings'); } },
  ];
  const onboardingDone = onboardingSteps.filter(s => s.done).length;
  const showOnboarding = !onboardingHidden && onboardingDone < onboardingSteps.length;

  // Pipeline compact
  const pl = computed.pipeline;
  const pipeRows = [
    { label: 'Envoyés', count: pl.envoye.count, color: isDark ? '#60a5fa' : '#3b82f6' },
    { label: 'Signés', count: pl.signe.count + pl.facture.count + pl.paye.count, color: couleur },
    { label: 'Facturés', count: pl.facture.count + pl.paye.count, color: isDark ? '#34d399' : '#10b981' },
  ];
  const pipeMax = Math.max(1, ...pipeRows.map(r => r.count));
  const activeChantiers = computed.chantiersActifs;

  return (
    <div className={`p-4 sm:p-6 max-w-6xl mx-auto space-y-6 min-h-screen ${pageBg}`}>

      {/* ===== HEADER : salutation + action rapide ===== */}
      <header className="flex flex-wrap justify-between items-start gap-3">
        <div>
          <motion.h1
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className={`text-2xl sm:text-3xl font-semibold tracking-tight ${heroText}`}
          >
            Bonjour{prenom ? `, ${prenom}` : ''}
          </motion.h1>
          <p className={`text-sm mt-1 ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>{formattedDate}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setModeDiscret?.(!modeDiscret)}
            title={modeDiscret ? 'Afficher les montants' : 'Masquer les montants'}
            className={`p-2 rounded-lg transition-colors ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-100'}`}
          >
            {modeDiscret ? <EyeOff className={`w-4 h-4 ${subText}`} /> : <Eye className={`w-4 h-4 ${subText}`} />}
          </button>
          <button
            type="button"
            onClick={() => { setCreateMode?.(p => ({ ...p, devis: true })); setPage('devis'); }}
            style={{ background: couleur }}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-semibold text-white shadow-sm hover:opacity-90 transition-opacity"
          >
            <Plus className="w-4 h-4" /> Nouveau devis
          </button>
        </div>
      </header>

      {/* ===== ONBOARDING (nouveaux comptes) ===== */}
      {showOnboarding && (
        <div className={`rounded-2xl p-4 sm:p-5 ${cardCls}`}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Rocket size={18} style={{ color: couleur }} />
              <h3 className={`text-sm font-bold ${heroText}`}>Démarrage rapide</h3>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${isDark ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-600'}`}>{onboardingDone}/{onboardingSteps.length}</span>
            </div>
            <button
              onClick={() => { try { localStorage.setItem('cp_onboarding_dismissed', '1'); } catch { /* noop */ } setOnboardingHidden(true); }}
              className={`text-xs ${subText} hover:underline`}
            >
              Masquer
            </button>
          </div>
          <div className="space-y-2">
            {onboardingSteps.map(s => (
              <button
                key={s.key}
                onClick={s.done ? undefined : s.action}
                disabled={s.done}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left text-sm transition-all ${
                  s.done
                    ? isDark ? 'bg-slate-700/30 text-slate-500' : 'bg-slate-50 text-slate-400'
                    : isDark ? 'bg-slate-700/50 hover:bg-slate-700 text-slate-200' : 'bg-slate-50 hover:bg-slate-100 text-slate-800'
                }`}
              >
                {s.done
                  ? <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                  : <span className="w-4 h-4 rounded-full border-2 flex-shrink-0" style={{ borderColor: couleur }} />}
                <span className={`flex-1 ${s.done ? 'line-through' : 'font-medium'}`}>{s.label}</span>
                {!s.done && <ChevronRight size={14} style={{ color: couleur }} />}
              </button>
            ))}
          </div>
          <div className="mt-3 h-1.5 rounded-full overflow-hidden" style={{ background: trackBg }}>
            <div className="h-full rounded-full transition-all duration-500" style={{ width: `${(onboardingDone / onboardingSteps.length) * 100}%`, background: couleur }} />
          </div>
        </div>
      )}

      {/* ===== L'ARGENT : 3 cartes heros ===== */}
      {canSeeFinances && (
        <section aria-label="Argent">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
            {/* A encaisser — carte principale */}
            <button
              type="button"
              onClick={() => setPage('finances')}
              className={`text-left rounded-2xl p-4 sm:p-5 transition-transform hover:-translate-y-0.5 ${
                computed.retard > 0
                  ? isDark ? 'bg-slate-800 border-2 border-red-500/40' : 'bg-white border-2 border-red-200 shadow-[0_1px_3px_rgba(0,0,0,0.05)]'
                  : cardCls
              }`}
            >
              <div className="flex items-center gap-2 mb-1.5">
                <Wallet className="w-4 h-4" style={{ color: couleur }} />
                <span className={`text-xs font-medium ${subText}`}>À encaisser</span>
              </div>
              <div className={`text-2xl sm:text-[28px] font-bold leading-none ${heroText}`}>{fmt(computed.aEncaisser, modeDiscret)}</div>
              {computed.retard > 0 ? (
                <div className="flex items-center gap-1.5 mt-2 text-xs font-medium text-red-500">
                  <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                  <span className="truncate">{fmt(computed.retard, modeDiscret)} en retard · {computed.facturesEnRetardCount} facture{computed.facturesEnRetardCount > 1 ? 's' : ''}</span>
                </div>
              ) : (
                <div className={`mt-2 text-xs ${subText}`}>Aucun retard</div>
              )}
            </button>

            {/* Encaisse ce mois */}
            <button
              type="button"
              onClick={() => setPage('finances')}
              className={`text-left rounded-2xl p-4 sm:p-5 transition-transform hover:-translate-y-0.5 ${cardCls}`}
            >
              <div className="flex items-center gap-2 mb-1.5">
                <TrendingUp className="w-4 h-4" style={{ color: couleur }} />
                <span className={`text-xs font-medium ${subText}`}>Encaissé ce mois</span>
              </div>
              <div className={`text-2xl sm:text-[28px] font-bold leading-none ${heroText}`}>{fmt(computed.caCeMois, modeDiscret)}</div>
              <div className={`mt-2 text-xs ${subText}`}>
                {computed.lastMonthCA > 0 ? `vs ${fmt(computed.lastMonthCA, modeDiscret)} mois dernier` : 'Premier mois suivi'}
              </div>
            </button>

            {/* Devis en attente */}
            <button
              type="button"
              onClick={() => setPage('devis')}
              className={`text-left rounded-2xl p-4 sm:p-5 transition-transform hover:-translate-y-0.5 ${cardCls}`}
            >
              <div className="flex items-center gap-2 mb-1.5">
                <FileText className="w-4 h-4" style={{ color: couleur }} />
                <span className={`text-xs font-medium ${subText}`}>Devis en attente</span>
              </div>
              <div className={`text-2xl sm:text-[28px] font-bold leading-none ${heroText}`}>{fmt(computed.devisEnAttente.reduce((s, d) => s + (d.total_ttc || 0), 0), modeDiscret)}</div>
              <div className={`mt-2 text-xs ${subText}`}>{computed.devisEnAttente.length} devis envoyé{computed.devisEnAttente.length > 1 ? 's' : ''}</div>
            </button>
          </div>
        </section>
      )}

      {/* ===== A FAIRE AUJOURD'HUI : le cockpit ===== */}
      <section aria-label="À faire aujourd'hui">
        <div className="flex items-center justify-between mb-2.5 px-0.5">
          <h2 className={`text-sm font-bold ${heroText}`}>À faire aujourd'hui</h2>
          {hasAnyAction && (
            <span className={`text-xs ${subText}`}>{relancesDue + allActions.length} action{(relancesDue + allActions.length) > 1 ? 's' : ''}</span>
          )}
        </div>

        <div className={`rounded-2xl p-1.5 ${cardCls}`}>
          {/* Relance groupee — action hero (coeur du pivot) */}
          {relancesDue > 0 && (
            <div className={`flex items-center gap-3 p-3 rounded-xl ${isDark ? 'bg-red-500/10' : 'bg-red-50'}`}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: isDark ? 'rgba(239,68,68,0.2)' : '#fee2e2' }}>
                <BellRing className="w-5 h-5 text-red-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-semibold ${heroText}`}>{relancesDue} relance{relancesDue > 1 ? 's' : ''} à envoyer</p>
                <p className="text-xs text-red-500/90 truncate">{relancesRisk > 0 ? `${fmt(relancesRisk, modeDiscret)} concernés` : 'impayés + devis sans réponse'}</p>
              </div>
              <button
                type="button"
                onClick={handleSendAllRelances}
                disabled={sendingRelances}
                className="flex-shrink-0 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold text-white bg-red-500 hover:bg-red-600 transition-colors disabled:opacity-60"
              >
                {sendingRelances ? <Clock className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                {sendingRelances ? 'Envoi...' : 'Tout envoyer'}
              </button>
            </div>
          )}

          {/* Actions calculees (factures en retard, devis sans reponse, brouillons, memos) */}
          {visibleActions.map((action, i) => {
            const Icon = action.icon || AlertCircle;
            return (
              <button
                key={i}
                type="button"
                onClick={action.onClick}
                className={`w-full flex items-center gap-3 p-3 rounded-xl text-left transition-colors ${isDark ? 'hover:bg-slate-700/50' : 'hover:bg-slate-50'}`}
              >
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${action.color}15` }}>
                  <Icon className="w-5 h-5" style={{ color: action.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium truncate ${heroText}`}>{action.label}</p>
                  {action.detail && <p className={`text-xs truncate ${subText}`}>{action.detail}</p>}
                </div>
                {action.actionLabel && (
                  <span className="flex-shrink-0 text-xs font-semibold px-3 py-1.5 rounded-lg" style={{ color: action.color, background: `${action.color}12` }}>{action.actionLabel}</span>
                )}
              </button>
            );
          })}

          {/* Voir tout / moins */}
          {allActions.length > 5 && (
            <button
              type="button"
              onClick={() => setShowAllActions(v => !v)}
              aria-expanded={showAllActions}
              className={`w-full text-center text-xs font-medium py-2.5 ${subText} hover:underline`}
            >
              {showAllActions ? 'Voir moins' : `Voir tout (${allActions.length})`}
            </button>
          )}

          {/* Empty state : rien a faire */}
          {!hasAnyAction && (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-3" style={{ background: `${couleur}12` }}>
                <CheckCircle className="w-6 h-6" style={{ color: couleur }} />
              </div>
              <p className={`text-sm font-semibold ${heroText}`}>Tout est à jour</p>
              <p className={`text-xs mt-0.5 ${subText}`}>Rien à faire dans l'immédiat. Beau travail !</p>
            </div>
          )}
        </div>
      </section>

      {/* ===== LE POULS : CA 6 mois + pipeline ===== */}
      {canSeeFinances && (
        <section aria-label="Pouls du business">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
            {/* CA 6 mois */}
            <div className={`rounded-2xl p-4 sm:p-5 ${cardCls}`}>
              <p className={`text-xs font-medium mb-3 ${subText}`}>CA 6 derniers mois</p>
              {computed.sparkData.some(m => m.ca > 0) ? (() => {
                // Sparkline SVG inline (léger — évite de charger recharts sur l'accueil)
                const data = computed.sparkData;
                const max = Math.max(...data.map(d => d.ca), 1);
                const W = 300, H = 96, pad = 3, n = data.length;
                const px = i => pad + (i * (W - 2 * pad)) / (n - 1);
                const py = v => H - pad - (v / max) * (H - 2 * pad - 4);
                const line = data.map((d, i) => `${px(i)},${py(d.ca)}`).join(' ');
                const area = `${pad},${H - pad} ${line} ${W - pad},${H - pad}`;
                return (
                  <div>
                    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={110} preserveAspectRatio="none" role="img" aria-label="Chiffre d'affaires, 6 derniers mois">
                      <defs>
                        <linearGradient id="caSpark" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={couleur} stopOpacity="0.28" />
                          <stop offset="100%" stopColor={couleur} stopOpacity="0" />
                        </linearGradient>
                      </defs>
                      <polygon points={area} fill="url(#caSpark)" />
                      <polyline points={line} fill="none" stroke={couleur} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
                    </svg>
                    <div className="flex justify-between mt-1.5">
                      {data.map((d, i) => <span key={i} className={`text-[10px] ${subText}`}>{d.label}</span>)}
                    </div>
                  </div>
                );
              })() : (
                <div className={`flex items-center justify-center text-xs ${subText}`} style={{ height: 120 }}>Pas encore de chiffre d'affaires</div>
              )}
            </div>

            {/* Pipeline commercial */}
            <div className={`rounded-2xl p-4 sm:p-5 ${cardCls}`}>
              <div className="flex items-center justify-between mb-3">
                <p className={`text-xs font-medium ${subText}`}>Pipeline commercial</p>
                <span className="text-xs font-semibold" style={{ color: couleur }}>Conversion {computed.tauxConversion}%</span>
              </div>
              <div className="space-y-2.5">
                {pipeRows.map(r => (
                  <div key={r.label} className="flex items-center gap-3">
                    <span className={`w-16 text-xs ${subText}`}>{r.label}</span>
                    <div className="flex-1 h-3.5 rounded-full overflow-hidden" style={{ background: trackBg }}>
                      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${Math.max(6, (r.count / pipeMax) * 100)}%`, background: r.color }} />
                    </div>
                    <span className={`w-6 text-right text-xs font-medium ${heroText}`}>{r.count}</span>
                  </div>
                ))}
              </div>
              <button type="button" onClick={() => setPage('devis')} className="mt-3 inline-flex items-center gap-1 text-xs font-medium" style={{ color: couleur }}>
                Voir les devis <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </div>
        </section>
      )}

      {/* ===== CHANTIERS EN COURS ===== */}
      {activeChantiers.length > 0 && (
        <section aria-label="Chantiers en cours">
          <div className="flex items-center justify-between mb-2.5 px-0.5">
            <h2 className={`text-sm font-bold ${heroText}`}>Chantiers en cours</h2>
            <button type="button" onClick={() => setPage('chantiers')} className="text-xs font-medium" style={{ color: couleur }}>Tout voir</button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {activeChantiers.slice(0, 4).map(c => {
              const client = clients.find(cl => cl.id === c.client_id);
              const av = Math.round(c.avancement || 0);
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => { setSelectedChantier?.(c); setPage('chantiers'); }}
                  className={`text-left rounded-2xl p-4 transition-transform hover:-translate-y-0.5 ${cardCls}`}
                >
                  <div className="flex items-center gap-2.5 mb-2.5">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${couleur}12` }}>
                      <HardHat className="w-4 h-4" style={{ color: couleur }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-semibold truncate ${heroText}`}>{c.nom || c.titre || c.name || 'Chantier'}</p>
                      {client && <p className={`text-xs truncate ${subText}`}>{client.nom || client.name}</p>}
                    </div>
                    <span className={`text-xs font-bold flex-shrink-0 ${heroText}`}>{av}%</span>
                  </div>
                  <div className="h-1.5 rounded-full overflow-hidden" style={{ background: trackBg }}>
                    <div className="h-full rounded-full transition-all duration-500" style={{ width: `${av}%`, background: couleur }} />
                  </div>
                </button>
              );
            })}
          </div>
        </section>
      )}

    </div>
  );
}
