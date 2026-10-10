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
import {
  HardHat,
  AlertCircle,
  Clock,
  ChevronRight,
  Eye,
  EyeOff,
  Receipt,
  Send,
  ClipboardList,
  CheckCircle,
  TrendingUp,
  Plus,
  BellRing,
} from 'lucide-react';

import { useData } from '../context/DataContext';
import { isDemo } from '../supabaseClient';
import { useToast } from '../context/AppContext';
import { usePermissions } from '../hooks/usePermissions';
import { useRelances } from '../hooks/useRelances';
import { useOrg } from '../context/OrgContext';
import { captureException } from '../lib/sentry';
import { statutFacture, resteAPayer, joursDeRetard, echeance, encaisseEntre } from '../lib/paiementsFacture';
import { calcConversion, formatConversion } from '../lib/statsUtils';
import UsageAlerts from './subscription/UsageAlerts';
import TuileChiffre from './ui/TuileChiffre';
import { TitreSection } from './ui/EnTete';
import LigneListe, { GroupeListe } from './ui/LigneListe';
import { Bouton, BoutonIcone } from './ui/Bouton';
import EtatVide from './ui/EtatVide';
import { useSubscriptionStore, PLANS } from '../stores/subscriptionStore';
import { jourLocal, dateLue } from '../lib/dates';

/** La mallette — marque Mallettico, reprise du jeu d'icônes (grille 48, contour 3,2). */
function Mallette({ size = 24, style, className }) {
  return (
    <svg viewBox="0 0 48 48" width={size} height={size} className={className} style={style} aria-hidden="true"
      fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 15v-3a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v3" />
      <rect x="5" y="15" width="38" height="24" rx="2.5" />
      <path d="M5 27h38" strokeWidth="2.4" />
      <rect x="11" y="24.5" width="5" height="5" rx="1" strokeWidth="2.4" />
      <rect x="32" y="24.5" width="5" height="5" rx="1" strokeWidth="2.4" />
    </svg>
  );
}

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

function getPrenom(user) {
  if (!user) return '';
  const meta = user.user_metadata || {};
  if (meta.prenom) return meta.prenom;
  if (meta.first_name) return meta.first_name;
  if (meta.full_name) return meta.full_name.split(' ')[0];
  if (meta.name) return meta.name.split(' ')[0];
  // Jamais le premier mot de l'entreprise (« Bonjour, BTP ») ni l'adresse e-mail
  // (« Bonjour, seguin.hugo06+controle ») : sans prénom, « Bonjour » tout court (recette du 9 oct.).
  return '';
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
  const { dataLoading, paiements = [] } = useData();
  const { showToast } = useToast();
  const { canAccess } = usePermissions();
  const canSeeFinances = canAccess('finances');
  const { orgId } = useOrg();
  const planId = useSubscriptionStore((s) => s.planId);
  const planCourant = PLANS[planId] || PLANS.gratuit;

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


  // ---- Computed data ----
  const computed = useMemo(() => {
    const now = new Date();

    // KPIs — mêmes définitions que la page Devis et la Trésorerie (src/lib/paiementsFacture.js) :
    // le reste dû des factures ouvertes, le retard après l'échéance, les paiements réellement reçus.
    // Avant (revue du 9 oct.) : « en retard » comptait des factures déjà payées, la conversion
    // ignorait « accepté » (0 % ici, 75 % sur Devis) et « Encaissé ce mois » additionnait des devis signés.
    const facturesOuvertes = devis.filter(d => d.type === 'facture' && d.facture_type !== 'avoir'
      && ['envoye', 'vu', 'facture', 'partielle', 'en_retard'].includes(statutFacture(d, paiements, now)));
    const facturesEnRetard = facturesOuvertes.filter(d => statutFacture(d, paiements, now) === 'en_retard');
    const aEncaisser = facturesOuvertes.reduce((s, d) => s + resteAPayer(d, paiements), 0);
    const retard = facturesEnRetard.reduce((s, d) => s + resteAPayer(d, paiements), 0);

    const devisEnAttente = devis.filter(d => d.type !== 'facture' && ['envoye', 'vu'].includes(d.statut));
    const chantiersActifs = chantiers.filter(c => c.statut === 'en_cours');

    const conversion = calcConversion(devis);
    const tauxConversion = conversion.envoyes > 0 ? Math.round(conversion.taux) : 0;

    const jour = (x) => `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
    const debutMois = new Date(now.getFullYear(), now.getMonth(), 1);
    const finMois = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const caCeMois = encaisseEntre(devis, paiements, jour(debutMois), jour(finMois));

    // Mois précédent, pour la comparaison
    const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthKey = `${prevMonth.getFullYear()}-${String(prevMonth.getMonth() + 1).padStart(2, '0')}`;
    const lastMonthCA = encaisseEntre(devis, paiements, jour(prevMonth), jour(new Date(now.getFullYear(), now.getMonth(), 0)));

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

    // Pipeline des DEVIS (les statuts de calcConversion : « accepté » est un devis signé).
    const devisSeuls = devis.filter(d => d.type !== 'facture');
    const etape = (statuts) => {
      const l = devisSeuls.filter(d => statuts.includes(d.statut));
      return { count: l.length, total: l.reduce((s, d) => s + (d.total_ttc || 0), 0) };
    };
    const pipeline = {
      brouillon: etape(['brouillon']),
      envoye: etape(['envoye', 'vu']),
      signe: etape(['accepte', 'signe', 'acompte_facture']),
      facture: etape(['facture', 'payee', 'paye']),
      paye: { count: 0, total: 0 },
    };

    // CA prévisionnel (signés non encore facturés + envoyés * 0.5)
    const caPrevisionnel = pipeline.signe.total + Math.round(pipeline.envoye.total * 0.5);

    // Actions prioritaires (GAP 5: differentiated icons + actionLabel)
    const actions = [];

    // Factures, devis et montants : seulement pour un rôle qui voit les finances. Avant (recette du 9 oct. 2026),
    // un ouvrier ou un chef de chantier voyait « Facture en retard — Martin — 2 000 € » et des boutons vers des
    // pages qui lui sont fermées.
    if (canSeeFinances) {
    // 1. Factures en retard (reste dû, après l'échéance) — AlertTriangle icon, red color
    facturesEnRetard
      .slice()
      .sort((a, b) => echeance(a) - echeance(b))
      .forEach(d => {
        const jours = joursDeRetard(d, paiements, now);
        const client = clients.find(c => c.id === d.client_id);
        const reste = resteAPayer(d, paiements);
        actions.push({
          priority: 1,
          icon: Receipt,  // GAP 5: Receipt for invoices
          color: '#ef4444',
          label: `Facture en retard de ${jours} j`,
          detail: client ? `${client.nom || client.name} — ${fmt(reste, modeDiscret)}` : fmt(reste, modeDiscret),
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
          label: `Devis sans réponse depuis ${jours} j`,
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



    // Encaissé par mois, 6 derniers mois : l'argent reçu (avant : la somme des devis signés, « CA »).
    const sparkData = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const fin = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
      const label = d.toLocaleDateString('fr-FR', { month: 'short' });
      sparkData.push({ label, ca: encaisseEntre(devis, paiements, jour(d), jour(fin)) });
    }

    return {
      aEncaisser,
      aEncaisserTrend,
      retard,
      devisEnAttente,
      chantiersActifs,
      tauxConversion,
      conversion,
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
  }, [devis, paiements, chantiers, clients, entreprise, modeDiscret, setSelectedDevis, setPage, canSeeFinances]);

  // ---- Greeting ----
  const prenom = getPrenom(user);
  const capitalize = s => s.charAt(0).toUpperCase() + s.slice(1);
  const formattedDate = capitalize(new Date().toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }));

  // ---- Memos du jour ----
  // Tâches non faites, pour aujourd'hui ou en retard. Avant (recette du 9 oct.) : le filtre lisait `done` et
  // `date`, que les tâches n'ont pas (`is_done`, `due_date`) : toutes s'affichaient, faites et futures comprises.
  const memosJour = useMemo(() => {
    const today = jourLocal();
    return memos.filter(m => !m.is_done && m.due_date && m.due_date <= today);
  }, [memos]);

  // Merge memos into actions
  const allActions = useMemo(() => {
    const memoActions = memosJour.map(m => ({
      priority: 4,
      icon: CheckCircle,
      color: '#10b981',
      label: m.text || m.titre || 'Tâche',
      detail: m.due_date < jourLocal() ? 'Tâche en retard' : 'Tâche du jour',
      actionLabel: 'Fait',
      onClick: () => toggleMemo?.(m.id),
    }));
    return [...computed.actions, ...memoActions];
  }, [computed.actions, memosJour, toggleMemo]);

  const visibleActions = showAllActions ? allActions : allActions.slice(0, 5);


  // ============ RENDER ============


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
  // En démo, un visiteur explore l'app — pas de checklist d'installation
  const showOnboarding = canSeeFinances && !isDemo && !onboardingHidden && onboardingDone < onboardingSteps.length;

  const activeChantiers = computed.chantiersActifs;

  // Montant compact sous les barres du graphique (« 4,7 k€ »)
  const compact = (n) => modeDiscret ? '•••' : n >= 1000
    ? `${new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 1 }).format(n / 1000)} k€`
    : `${Math.round(n)} €`;
  const moisCourant = new Date().toLocaleDateString('fr-FR', { month: 'long' });
  const moisPrecedent = dateLue(new Date().getFullYear(), new Date().getMonth() - 1, 1).toLocaleDateString('fr-FR', { month: 'long' });
  // Ton d'une action « à faire » d'après sa couleur historique (rouge = retard, etc.)
  const tonAction = (c) => ({ '#ef4444': 'bg-danger-fond text-danger-texte', '#f59e0b': 'bg-alerte-fond text-alerte-texte', '#10b981': 'bg-succes-fond text-succes-texte' }[c] || 'bg-info-fond text-info-texte');

  // Refonte du 9 oct. 2026 (revue visuelle, problème 14) : une hiérarchie — l'argent dû d'abord
  // (tuile héros), puis ce qu'il y a à faire, puis le pouls ; une seule couleur d'accent, des
  // tuiles calmes, le graphique avec ses valeurs.
  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-8 min-h-screen bg-fond">

      {/* ===== EN-TÊTE : salutation, date, une seule action ===== */}
      <header className="flex flex-wrap justify-between items-end gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight text-encre">Bonjour{prenom ? `, ${prenom}` : ''}</h1>
          <p className="mt-1 text-sm text-encre-3 flex items-center gap-1.5 flex-wrap">
            <span>{formattedDate}</span>
            <span aria-hidden="true">·</span>
            <button type="button" onClick={() => setPage('plan')} className="h-11 -my-3 inline-flex items-center gap-1 font-medium text-encre-2 hover:underline underline-offset-2">
              Plan {planCourant.name}
            </button>
          </p>
        </div>
        <div className="flex items-center gap-1">
          <BoutonIcone icone={modeDiscret ? EyeOff : Eye} libelle={modeDiscret ? 'Afficher les montants' : 'Masquer les montants'} onClick={() => setModeDiscret?.(!modeDiscret)} />
          <Bouton variante="principal" icone={Plus} onClick={() => { setCreateMode?.(p => ({ ...p, devis: true })); setPage('devis'); }}>
            Nouveau devis
          </Bouton>
        </div>
      </header>

      {/* ===== ONBOARDING (nouveaux comptes) ===== */}
      {showOnboarding && (
        <section aria-label="Premiers pas">
          <TitreSection titre="On remplit la mallette" compte={`${onboardingDone}/${onboardingSteps.length}`} action="Masquer" onAction={() => { try { localStorage.setItem('cp_onboarding_dismissed', '1'); } catch { /* préférence non enregistrée */ } setOnboardingHidden(true); }} />
          <GroupeListe>
            {onboardingSteps.map(st => (
              <LigneListe
                key={st.key}
                onClick={st.done ? undefined : st.action}
                debut={st.done
                  ? <span className="w-10 h-10 rounded-xl bg-succes-fond text-succes-texte flex items-center justify-center"><CheckCircle size={20} aria-hidden="true" /></span>
                  : <span className="w-10 h-10 rounded-xl bg-surface-2 text-encre-3 flex items-center justify-center"><ChevronRight size={20} aria-hidden="true" /></span>}
                titre={<span className={st.done ? 'line-through text-encre-3 font-medium' : ''}>{st.label}</span>}
              />
            ))}
          </GroupeListe>
        </section>
      )}

      {/* ===== L'ARGENT : ce qu'on me doit, en grand ===== */}
      {canSeeFinances && (
        <section aria-label="Argent" className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <TuileChiffre
            heros className="col-span-2"
            libelle="À encaisser"
            valeur={fmt(computed.aEncaisser, modeDiscret)}
            alerte={computed.retard > 0 ? `dont ${fmt(computed.retard, modeDiscret)} en retard · ${computed.facturesEnRetardCount} facture${computed.facturesEnRetardCount > 1 ? 's' : ''}` : undefined}
            contexte={computed.retard > 0 ? undefined : 'Aucun retard'}
            onClick={() => setPage('finances')}
          />
          <TuileChiffre
            libelle={`Encaissé · ${moisCourant}`}
            valeur={fmt(computed.caCeMois, modeDiscret)}
            contexte={computed.lastMonthCA > 0 ? `${moisPrecedent} : ${fmt(computed.lastMonthCA, modeDiscret)}` : 'Premier mois suivi'}
            onClick={() => setPage('finances')}
          />
          <TuileChiffre
            libelle="Devis en attente"
            valeur={fmt(computed.devisEnAttente.reduce((s, d) => s + (d.total_ttc || 0), 0), modeDiscret)}
            contexte={`${computed.devisEnAttente.length} envoyé${computed.devisEnAttente.length > 1 ? 's' : ''} · ${formatConversion(computed.tauxConversion)} signés`}
            onClick={() => setPage('devis')}
          />
        </section>
      )}

      {/* Jauges d'usage — après l'argent, seulement quand une limite approche. */}
      <UsageAlerts isDark={isDark} couleur={couleur} />

      {/* ===== À FAIRE AUJOURD'HUI ===== */}
      <section aria-label="À faire aujourd'hui">
        <TitreSection titre="À faire aujourd'hui" compte={hasAnyAction ? relancesDue + allActions.length : undefined} />
        <GroupeListe>
          {relancesDue > 0 && (
            <LigneListe
              chevron={false}
              debut={<span className="w-10 h-10 rounded-xl bg-danger-fond text-danger-texte flex items-center justify-center"><BellRing size={20} aria-hidden="true" /></span>}
              titre={`${relancesDue} relance${relancesDue > 1 ? 's' : ''} à envoyer`}
              meta={relancesRisk > 0 ? `${fmt(relancesRisk, modeDiscret)} concernés` : 'Impayés et devis sans réponse'}
              pied={(
                <>
                  <span />
                  <Bouton taille="compacte" icone={sendingRelances ? Clock : Send} chargement={sendingRelances} onClick={handleSendAllRelances}>
                    {sendingRelances ? 'Envoi…' : 'Tout envoyer'}
                  </Bouton>
                </>
              )}
            />
          )}
          {visibleActions.map((action, i) => {
            const Icone = action.icon || AlertCircle;
            return (
              <LigneListe
                key={i}
                onClick={action.onClick}
                debut={<span className={`w-10 h-10 rounded-xl flex items-center justify-center ${tonAction(action.color)}`}><Icone size={20} aria-hidden="true" /></span>}
                titre={action.label}
                meta={action.detail}
                montant={action.actionLabel ? <span className="text-sm font-semibold text-accent-texte">{action.actionLabel}</span> : undefined}
              />
            );
          })}
          {allActions.length > 5 && (
            <button type="button" onClick={() => setShowAllActions(v => !v)} aria-expanded={showAllActions} className="w-full h-12 text-sm font-semibold text-encre-2 hover:bg-surface-2">
              {showAllActions ? 'Voir moins' : `Voir tout (${allActions.length})`}
            </button>
          )}
          {!hasAnyAction && (
            <EtatVide icone={Mallette} titre="Mallette bouclée" texte="Rien ne traîne. Vous pouvez la refermer." />
          )}
        </GroupeListe>
      </section>

      {/* ===== LE POULS : l'argent reçu, mois par mois ===== */}
      {canSeeFinances && (
        <section aria-label="Encaissé sur 6 mois">
          <TitreSection titre="Encaissé sur 6 mois" action="Finances" onAction={() => setPage('finances')} />
          <div className="bg-surface border border-bord rounded-2xl shadow-e1 p-4 sm:p-5">
            {computed.sparkData.some(m => m.ca > 0) ? (() => {
              const data = computed.sparkData;
              const max = Math.max(...data.map(d => d.ca), 1);
              return (
                <div className="grid grid-cols-6 gap-2 items-end h-44" role="img" aria-label={`Encaissé par mois : ${data.map(d => `${d.label} ${fmt(d.ca)}`).join(', ')}`}>
                  {data.map((d, i) => {
                    const dernier = i === data.length - 1;
                    return (
                      <div key={i} className="flex flex-col items-center justify-end h-full gap-1.5 min-w-0">
                        <span className={`text-xs tabular-nums whitespace-nowrap ${dernier ? 'font-bold text-encre' : 'font-medium text-encre-2'}`}>{d.ca > 0 ? compact(d.ca) : '—'}</span>
                        <div className={`w-full max-w-[44px] rounded-lg ${dernier ? 'bg-accent' : 'bg-accent/30'}`} style={{ height: `${Math.max(4, (d.ca / max) * 100)}%` }} />
                        <span className={`text-xs capitalize ${dernier ? 'font-semibold text-encre' : 'text-encre-3'}`}>{d.label.replace('.', '')}</span>
                      </div>
                    );
                  })}
                </div>
              );
            })() : (
              <EtatVide icone={TrendingUp} titre="Rien d'encaissé pour l'instant" texte="Les paiements reçus apparaîtront ici, mois par mois." className="!py-6" />
            )}
          </div>
        </section>
      )}

      {/* ===== CHANTIERS EN COURS ===== */}
      {activeChantiers.length > 0 && (
        <section aria-label="Chantiers en cours">
          <TitreSection titre="Chantiers en cours" compte={activeChantiers.length} action="Tout voir" onAction={() => setPage('chantiers')} />
          <GroupeListe>
            {activeChantiers.slice(0, 4).map(c => {
              const client = clients.find(cl => cl.id === c.client_id);
              const av = Math.max(0, Math.min(100, Math.round(c.avancement || 0)));
              return (
                <LigneListe
                  key={c.id}
                  onClick={() => { setSelectedChantier?.(c); setPage('chantiers'); }}
                  debut={<span className="w-10 h-10 rounded-xl bg-surface-2 text-encre-2 flex items-center justify-center"><HardHat size={20} aria-hidden="true" /></span>}
                  titre={c.nom || c.titre || c.name || 'Chantier'}
                  meta={client ? [client.prenom, client.nom || client.name].filter(Boolean).join(' ') : undefined}
                  pied={(
                    <>
                      <span className="flex-1 h-1.5 rounded-full bg-surface-2 overflow-hidden" aria-hidden="true">
                        <span className="block h-full rounded-full bg-info-point" style={{ width: `${av}%` }} />
                      </span>
                      <span className="text-sm font-semibold text-encre tabular-nums">{av} %</span>
                    </>
                  )}
                />
              );
            })}
          </GroupeListe>
        </section>
      )}

    </div>
  );
}
