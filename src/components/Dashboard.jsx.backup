import React, { useState, useMemo, useEffect, useCallback, memo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend } from 'recharts';
import { TrendingUp, TrendingDown, DollarSign, Clock, AlertCircle, CheckCircle, FileText, Hammer, Calendar, Users, Eye, EyeOff, Plus, ArrowRight, Trophy, AlertTriangle, ChevronRight, Sparkles, Target, Wallet, CreditCard, PiggyBank, Receipt, Send, ArrowUpRight, Star, Medal, Award, HelpCircle, X, Lightbulb, BookOpen, Home, Package, Settings, BarChart3, ArrowLeft, Info, Zap, Shield, TrendingDown as TrendDown, PieChart as PieChartIcon, Activity, Building2, Mail, Phone, Bell, CloudRain, Sun, Cloud, Wind, Droplets, Camera, MapPin, Thermometer, Search, ChevronDown, MoreHorizontal, HardHat, Banknote, RefreshCw, ExternalLink, Navigation } from 'lucide-react';
import RentabilityDashboard from './RentabilityDashboard';
import AccountingIntegration from './AccountingIntegration';
import MorningBrief from './MorningBrief';
import { getPendingRelances, formatRelanceForDisplay, RELANCE_TEMPLATES } from '../services/RelanceService';
import { WeatherAlertsWidget } from './dashboard/index.js';

// ═══════════════════════════════════════════════════════════════════
// MEMOIZED COMPONENTS & PURE UTILITIES (extracted for performance)
// ═══════════════════════════════════════════════════════════════════

/**
 * Pure utility function for margin color - no dependencies on component state
 */
const getMargeColor = (m) => m >= 50 ? '#10b981' : m >= 30 ? '#f59e0b' : '#ef4444';

/**
 * KPICard - Memoized card component for key performance indicators
 */
const KPICard = memo(function KPICard({ icon: Icon, label, value, color, onClick, clickable, cardBg, textMuted, textPrimary }) {
  return (
    <div
      onClick={onClick}
      className={`rounded-xl border p-4 ${cardBg} transition-all duration-200 ${clickable ? 'cursor-pointer hover:shadow-md' : ''}`}
    >
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg" style={{ background: `${color}15` }}>
          <Icon size={18} style={{ color }} />
        </div>
        <div>
          <p className={`text-xs ${textMuted}`}>{label}</p>
          <p className="text-lg font-bold" style={{ color }}>{value}</p>
        </div>
      </div>
    </div>
  );
});

/**
 * ModalOverlay - Memoized modal wrapper component
 */
const ModalOverlay = memo(function ModalOverlay({ show, onClose, children, isDark }) {
  if (!show) return null;
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in" onClick={onClose}>
      <div className={`${isDark ? 'bg-slate-800' : 'bg-white'} rounded-2xl w-full max-w-lg shadow-2xl animate-slide-up max-h-[90vh] overflow-y-auto`} onClick={e => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
});


export default function Dashboard({ chantiers = [], clients = [], devis = [], events = [], depenses = [], pointages = [], equipe = [], ajustements = [], entreprise, getChantierBilan, couleur, modeDiscret, setModeDiscret, setSelectedChantier, setPage, setSelectedDevis, setCreateMode, isDark, showHelp = false, setShowHelp, user, onOpenSearch }) {
  const [todoFilter, setTodoFilter] = useState('all');
  const [showCADetail, setShowCADetail] = useState(null); // 'ca' | 'month' | null
  const [selectedMonth, setSelectedMonth] = useState(null);
  const [helpSection, setHelpSection] = useState('overview');
  const [showEncaisseDetail, setShowEncaisseDetail] = useState(false);
  const [showEnAttenteDetail, setShowEnAttenteDetail] = useState(false);
  const [showMargeDetail, setShowMargeDetail] = useState(false);
  const [showRentabilityDashboard, setShowRentabilityDashboard] = useState(false);
  const [showAccountingIntegration, setShowAccountingIntegration] = useState(false);

  // Weather state - intelligent contextual weather for artisans
  const [weather, setWeather] = useState(null);
  const [selectedPeriod, setSelectedPeriod] = useState('month'); // day, week, month, quarter, year
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  // Simulate weather data with 7-day forecast
  useEffect(() => {
    const conditions = ['sunny', 'cloudy', 'rainy', 'partly_cloudy'];
    const icons = { sunny: Sun, cloudy: Cloud, rainy: CloudRain, partly_cloudy: Cloud };
    const mockWeather = {
      temp: 18,
      feelsLike: 16,
      condition: 'sunny',
      humidity: 65,
      wind: 12,
      precipitation: 10,
      icon: Sun,
      city: entreprise?.ville || 'Bordeaux',
      forecast: [
        { day: 'Lun', temp: 18, icon: Sun, condition: 'sunny' },
        { day: 'Mar', temp: 15, icon: Cloud, condition: 'cloudy' },
        { day: 'Mer', temp: 12, icon: CloudRain, condition: 'rainy' },
        { day: 'Jeu', temp: 17, icon: Sun, condition: 'sunny' },
        { day: 'Ven', temp: 16, icon: Cloud, condition: 'partly_cloudy' },
        { day: 'Sam', temp: 19, icon: Sun, condition: 'sunny' },
        { day: 'Dim', temp: 20, icon: Sun, condition: 'sunny' },
      ]
    };
    setWeather(mockWeather);
  }, [entreprise?.ville]);

  const safeChantiers = chantiers || [], safeClients = clients || [], safeDevis = devis || [], safeDepenses = depenses || [], safePointages = pointages || [], safeEquipe = equipe || [];

  // Theme classes
  const cardBg = isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200';
  const textPrimary = isDark ? 'text-white' : 'text-slate-900';
  const textSecondary = isDark ? 'text-slate-400' : 'text-slate-500';
  const textMuted = isDark ? 'text-slate-500' : 'text-slate-400';
  const btnBg = isDark ? 'bg-slate-700 hover:bg-slate-600 text-white' : 'bg-slate-100 hover:bg-slate-200';

  const stats = useMemo(() => {
    const now = new Date(), thisMonth = now.getMonth(), thisYear = now.getFullYear();
    const caParMois = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(thisYear, thisMonth - i, 1);
      const monthDevis = safeDevis.filter(dv => { const dd = new Date(dv.date); return dd.getMonth() === d.getMonth() && dd.getFullYear() === d.getFullYear() && dv.statut !== 'brouillon'; });
      const ca = monthDevis.reduce((s, dv) => s + (dv.total_ht || 0), 0);
      caParMois.push({
        mois: d.toLocaleDateString('fr-FR', { month: 'short' }),
        moisFull: d.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }),
        ca,
        fill: i === 0 ? couleur : '#94a3b8',
        devis: monthDevis,
        nbDevis: monthDevis.filter(d => d.type === 'devis').length,
        nbFactures: monthDevis.filter(d => d.type === 'facture').length
      });
    }
    const hasRealData = caParMois.some(m => m.ca > 0);
    const margesChantiers = safeChantiers.map(ch => ({ nom: (ch.nom || '').substring(0, 14), marge: getChantierBilan?.(ch.id)?.tauxMarge || 0, id: ch.id, ...getChantierBilan?.(ch.id) })).sort((a, b) => b.marge - a.marge);
    const totalCA = safeDevis.filter(d => d.type === 'facture' || d.statut === 'accepte').reduce((s, d) => s + (d.total_ht || 0), 0);
    const totalDep = safeDepenses.reduce((s, d) => s + (d.montant || 0), 0);
    const totalMO = safePointages.reduce((s, p) => s + (p.heures * (safeEquipe.find(e => e.id === p.employeId)?.coutHoraireCharge || 28)), 0);
    const marge = totalCA - totalDep - totalMO, tauxMarge = totalCA > 0 ? (marge / totalCA) * 100 : 0;
    const factures = safeDevis.filter(d => d.type === 'facture');
    const facturesPayees = factures.filter(f => f.statut === 'payee');
    const facturesEnAttente = factures.filter(f => f.statut !== 'payee');
    const encaisse = facturesPayees.reduce((s, f) => s + (f.total_ttc || 0), 0);
    const enAttente = facturesEnAttente.reduce((s, f) => s + (f.total_ttc || 0), 0);
    const chantiersActifs = safeChantiers.filter(c => c.statut === 'en_cours').length;
    const chantiersProspect = safeChantiers.filter(c => c.statut === 'prospect').length;
    const chantiersTermines = safeChantiers.filter(c => c.statut === 'termine').length;
    const devisEnAttente = safeDevis.filter(d => d.type === 'devis' && d.statut === 'envoye').length;
    const tendance = caParMois[4]?.ca > 0 ? ((caParMois[5]?.ca - caParMois[4]?.ca) / caParMois[4]?.ca) * 100 : 0;

    // Devis Pipeline - crucial stats for artisans
    const devisOnly = safeDevis.filter(d => d.type === 'devis');
    const devisPipeline = {
      brouillon: devisOnly.filter(d => d.statut === 'brouillon'),
      envoye: devisOnly.filter(d => d.statut === 'envoye'),
      accepte: devisOnly.filter(d => ['accepte', 'acompte_facture', 'facture'].includes(d.statut)),
      refuse: devisOnly.filter(d => d.statut === 'refuse'),
    };
    const devisTotalEnvoyes = devisPipeline.envoye.length + devisPipeline.accepte.length + devisPipeline.refuse.length;
    const tauxConversion = devisTotalEnvoyes > 0 ? (devisPipeline.accepte.length / devisTotalEnvoyes) * 100 : 0;
    const montantDevisEnAttente = devisPipeline.envoye.reduce((s, d) => s + (d.total_ttc || 0), 0);

    // Factures overdue (30+ jours)
    const facturesOverdue = facturesEnAttente.filter(f => {
      const daysSince = Math.floor((now - new Date(f.date)) / 86400000);
      return daysSince > 30;
    });
    const montantOverdue = facturesOverdue.reduce((s, f) => s + (f.total_ttc || 0), 0);

    // This month stats
    const thisMonthDevis = devisOnly.filter(d => {
      const dd = new Date(d.date);
      return dd.getMonth() === thisMonth && dd.getFullYear() === thisYear;
    });
    const thisMonthFactures = factures.filter(f => {
      const dd = new Date(f.date);
      return dd.getMonth() === thisMonth && dd.getFullYear() === thisYear;
    });

    // Breakdown for CA detail
    const caBreakdown = {
      devisAcceptes: safeDevis.filter(d => d.type === 'devis' && d.statut === 'accepte').reduce((s, d) => s + (d.total_ht || 0), 0),
      facturesPaye: factures.filter(f => f.statut === 'payee').reduce((s, f) => s + (f.total_ht || 0), 0),
      facturesEnCours: factures.filter(f => f.statut !== 'payee').reduce((s, f) => s + (f.total_ht || 0), 0),
    };

    // Check if user is new (no data at all)
    const isNewUser = safeClients.length === 0 && safeDevis.length === 0 && safeChantiers.length === 0;
    const hasMinimalData = safeClients.length > 0 || safeDevis.length > 0 || safeChantiers.length > 0;

    return {
      caParMois,
      margesChantiers,
      hasRealData,
      totalCA,
      marge,
      tauxMarge,
      encaisse,
      enAttente,
      facturesPayees,
      facturesEnAttente,
      facturesOverdue,
      montantOverdue,
      chantiersActifs,
      chantiersProspect,
      chantiersTermines,
      devisEnAttente,
      tendance,
      caBreakdown,
      totalDep,
      totalMO,
      devisPipeline,
      tauxConversion,
      montantDevisEnAttente,
      thisMonthDevis,
      thisMonthFactures,
      isNewUser,
      hasMinimalData
    };
  }, [safeChantiers, safeClients, safeDevis, safeDepenses, safePointages, safeEquipe, getChantierBilan, couleur]);

  const actions = useMemo(() => {
    const items = [], now = new Date();
    safeDevis.filter(d => d.type === 'devis' && d.statut === 'envoye').forEach(d => {
      const client = safeClients.find(c => c.id === d.client_id), days = Math.floor((now - new Date(d.date)) / 86400000);
      items.push({ id: `d-${d.id}`, type: 'devis', icon: FileText, title: `Relancer ${d.numero}`, desc: `${client?.nom || ''} · ${(d.total_ttc || 0).toLocaleString('fr-FR')}€`, priority: days > 7 ? 'urgent' : days > 3 ? 'high' : 'normal', days, action: () => setPage?.('devis') });
    });
    safeDevis.filter(d => d.type === 'facture' && d.statut !== 'payee').forEach(d => {
      const client = safeClients.find(c => c.id === d.client_id), days = Math.floor((now - new Date(d.date)) / 86400000);
      items.push({ id: `f-${d.id}`, type: 'facture', icon: DollarSign, title: `Relancer ${d.numero}`, desc: `${client?.nom || ''} · ${(d.total_ttc || 0).toLocaleString('fr-FR')}€`, priority: days > 30 ? 'urgent' : days > 15 ? 'high' : 'normal', days, action: () => setPage?.('devis') });
    });
    safeChantiers.filter(ch => ch.statut === 'en_cours').forEach(ch => {
      const bilan = getChantierBilan?.(ch.id);
      if (bilan?.tauxMarge !== undefined && bilan.tauxMarge < 10) items.push({ id: `ch-${ch.id}`, type: 'alerte', icon: AlertCircle, title: `Marge faible: ${ch.nom.substring(0, 15)}`, desc: `${bilan.tauxMarge?.toFixed(0)}% de marge`, priority: bilan.tauxMarge < 0 ? 'urgent' : 'high', action: () => { setSelectedChantier?.(ch.id); setPage?.('chantiers'); } });
    });
    return items.sort((a, b) => ({ urgent: 0, high: 1, normal: 2 }[a.priority] - { urgent: 0, high: 1, normal: 2 }[b.priority]));
  }, [safeDevis, safeClients, safeChantiers, getChantierBilan, setSelectedChantier, setPage]);

  // Compute pending relances using RelanceService
  const pendingRelances = useMemo(() => {
    const factures = safeDevis.filter(d => d.type === 'facture' && d.statut !== 'payee');
    // For now, assume no relances have been sent (empty history) - this would come from a relances table
    const relanceHistory = {};
    const pending = getPendingRelances(factures, safeClients, relanceHistory);
    return pending.map(r => formatRelanceForDisplay(r, entreprise)).slice(0, 5);
  }, [safeDevis, safeClients, entreprise]);

  // Memoized derived values to prevent unnecessary recalculations
  const filteredActions = useMemo(() =>
    todoFilter === 'all' ? actions : actions.filter(a => a.type === todoFilter),
    [todoFilter, actions]
  );

  const top3 = useMemo(() =>
    stats.margesChantiers.filter(c => c.marge > 0).slice(0, 3),
    [stats.margesChantiers]
  );

  const aSurveiller = useMemo(() =>
    stats.margesChantiers.filter(c => c.marge < 15),
    [stats.margesChantiers]
  );

  // Memoized formatMoney function
  const formatMoney = useCallback(
    (n) => modeDiscret ? '·····' : `${(n || 0).toLocaleString('fr-FR')} €`,
    [modeDiscret]
  );

  // AI-powered recommended actions
  const aiRecommendations = useMemo(() => {
    const recs = [];
    const devisAttente = stats.devisPipeline?.envoye || [];
    const overdueDevis = devisAttente.filter(d => {
      const days = Math.floor((new Date() - new Date(d.date)) / 86400000);
      return days > 5;
    });
    if (overdueDevis.length > 0) {
      const total = overdueDevis.reduce((s, d) => s + (d.total_ttc || 0), 0);
      recs.push({
        id: 'relance-devis',
        icon: FileText,
        text: `Relancer ${overdueDevis.length} devis en attente`,
        value: total,
        action: () => setPage?.('devis'),
        priority: 1
      });
    }
    const chantiersNextWeek = safeChantiers.filter(c => {
      if (c.statut !== 'prospect') return false;
      const start = new Date(c.date_debut);
      const now = new Date();
      const diff = Math.floor((start - now) / 86400000);
      return diff >= 0 && diff <= 7;
    });
    if (chantiersNextWeek.length > 0) {
      recs.push({
        id: 'planifier-chantiers',
        icon: Calendar,
        text: `Planifier ${chantiersNextWeek.length} chantier${chantiersNextWeek.length > 1 ? 's' : ''} de la semaine prochaine`,
        action: () => setPage?.('planning'),
        priority: 2
      });
    }
    if (stats.tauxMarge < 20 && stats.hasRealData) {
      recs.push({
        id: 'analyser-marges',
        icon: TrendingDown,
        text: 'Analyser vos marges (en dessous de l\'objectif)',
        action: () => setShowMargeDetail(true),
        priority: 3
      });
    }
    return recs.sort((a, b) => a.priority - b.priority).slice(0, 3);
  }, [stats, safeChantiers, setPage]);

  // Recent activity feed
  const recentActivity = useMemo(() => {
    const activities = [];
    const now = new Date();
    // Recent paid invoices
    stats.facturesPayees?.slice(0, 2).forEach(f => {
      const client = safeClients.find(c => c.id === f.client_id);
      activities.push({
        id: `paid-${f.id}`,
        type: 'payment',
        icon: CheckCircle,
        title: `Facture ${f.numero} payée`,
        subtitle: client?.nom || 'Client',
        amount: f.total_ttc,
        date: new Date(f.date_paiement || f.date),
        color: 'emerald'
      });
    });
    // Recent sent devis
    safeDevis.filter(d => d.type === 'devis' && d.statut === 'envoye').slice(0, 2).forEach(d => {
      const client = safeClients.find(c => c.id === d.client_id);
      activities.push({
        id: `sent-${d.id}`,
        type: 'devis',
        icon: Send,
        title: `Devis ${d.numero} envoyé`,
        subtitle: client?.nom || 'Client',
        amount: d.total_ttc,
        date: new Date(d.date),
        color: 'blue'
      });
    });
    // Recent started chantiers
    safeChantiers.filter(c => c.statut === 'en_cours').slice(0, 1).forEach(ch => {
      activities.push({
        id: `started-${ch.id}`,
        type: 'chantier',
        icon: HardHat,
        title: `Chantier ${ch.nom} démarré`,
        subtitle: ch.adresse || 'Lieu non défini',
        date: new Date(ch.date_debut || ch.created_at),
        color: 'purple'
      });
    });
    return activities.sort((a, b) => b.date - a.date).slice(0, 4);
  }, [stats.facturesPayees, safeDevis, safeChantiers, safeClients]);

  // Mock notifications
  const notifications = useMemo(() => {
    const notifs = [];
    if (stats.facturesPayees?.length > 0) {
      const f = stats.facturesPayees[0];
      notifs.push({ id: 1, type: 'payment', icon: CheckCircle, text: `Facture ${f.numero} payée`, time: 'Il y a 2h', read: false });
    }
    if (stats.devisPipeline?.envoye?.length > 0) {
      notifs.push({ id: 2, type: 'devis', icon: FileText, text: `${stats.devisPipeline.envoye.length} devis en attente de réponse`, time: 'Aujourd\'hui', read: true });
    }
    if (stats.facturesOverdue?.length > 0) {
      notifs.push({ id: 3, type: 'alert', icon: AlertTriangle, text: `${stats.facturesOverdue.length} facture(s) en retard`, time: 'Urgent', read: false });
    }
    return notifs;
  }, [stats]);

  // Help sections content - Complete guide for artisans - memoized to prevent recreation
  const helpSections = useMemo(() => ({
    overview: {
      title: "Bienvenue",
      titleFull: "Bienvenue dans ChantierPro",
      icon: Home,
      content: (
        <div className="space-y-4">
          <p className={textSecondary}>ChantierPro est votre assistant de gestion quotidien. Suivez vos chantiers, vos devis et votre rentabilité en quelques clics.</p>
          <div className={`p-4 rounded-xl ${isDark ? 'bg-emerald-900/20' : 'bg-emerald-50'}`}>
            <h4 className={`font-semibold mb-2 ${isDark ? 'text-emerald-300' : 'text-emerald-800'}`}>Exemple concret</h4>
            <p className={`text-sm ${isDark ? 'text-emerald-200' : 'text-emerald-700'}`}>
              Jean, plombier, utilise ChantierPro pour : créer ses devis en 5 min, suivre la marge de chaque chantier, et ne jamais oublier une relance client.
            </p>
          </div>
          <div className={`p-4 rounded-xl ${isDark ? 'bg-slate-700' : 'bg-slate-50'}`}>
            <h4 className={`font-semibold mb-2 ${textPrimary}`}>Par où commencer ?</h4>
            <ol className={`text-sm space-y-2 ${textSecondary}`}>
              <li>1. Configurez votre entreprise dans <strong>Paramètres</strong></li>
              <li>2. Ajoutez vos prestations dans le <strong>Catalogue</strong></li>
              <li>3. Créez votre premier <strong>Client</strong> et <strong>Devis</strong></li>
            </ol>
          </div>
        </div>
      )
    },
    devis: {
      title: "Devis",
      titleFull: "Créer et gérer vos devis",
      icon: FileText,
      content: (
        <div className="space-y-4">
          <p className={textSecondary}>Créez des devis professionnels et transformez-les en factures en un clic.</p>
          <div className="space-y-3">
            <div className={`p-3 rounded-lg ${isDark ? 'bg-slate-700' : 'bg-slate-50'}`}>
              <h5 className={`font-medium mb-1 ${textPrimary}`}>1. Créer un devis</h5>
              <p className={`text-sm ${textSecondary}`}>Cliquez sur "Nouveau" puis ajoutez vos lignes depuis le catalogue ou manuellement.</p>
            </div>
            <div className={`p-3 rounded-lg ${isDark ? 'bg-slate-700' : 'bg-slate-50'}`}>
              <h5 className={`font-medium mb-1 ${textPrimary}`}>2. Envoyer au client</h5>
              <p className={`text-sm ${textSecondary}`}>Générez le PDF et envoyez-le par WhatsApp ou email directement.</p>
            </div>
            <div className={`p-3 rounded-lg ${isDark ? 'bg-slate-700' : 'bg-slate-50'}`}>
              <h5 className={`font-medium mb-1 ${textPrimary}`}>3. Convertir en facture</h5>
              <p className={`text-sm ${textSecondary}`}>Devis accepté ? Demandez un acompte ou facturez directement.</p>
            </div>
          </div>
          <div className={`p-4 rounded-xl ${isDark ? 'bg-blue-900/20' : 'bg-blue-50'}`}>
            <h4 className={`font-semibold mb-2 flex items-center gap-2 ${isDark ? 'text-blue-300' : 'text-blue-800'}`}><Lightbulb size={16} /> Astuce</h4>
            <p className={`text-sm ${isDark ? 'text-blue-200' : 'text-blue-700'}`}>
              Remplissez votre catalogue une fois, puis ajoutez vos prestations en 2 clics dans tous vos devis !
            </p>
          </div>
        </div>
      )
    },
    chantiers: {
      title: "Chantiers",
      titleFull: "Suivre vos chantiers",
      icon: Hammer,
      content: (
        <div className="space-y-4">
          <p className={textSecondary}>Suivez chaque chantier : dépenses, heures, avancement et rentabilité.</p>
          <div className="space-y-3">
            <div className={`p-3 rounded-lg ${isDark ? 'bg-slate-700' : 'bg-slate-50'}`}>
              <h5 className={`font-medium mb-1 ${textPrimary}`}>Suivi financier</h5>
              <p className={`text-sm ${textSecondary}`}>Ajoutez vos dépenses (matériaux, sous-traitance) et pointez les heures. La marge se calcule automatiquement.</p>
            </div>
            <div className={`p-3 rounded-lg ${isDark ? 'bg-slate-700' : 'bg-slate-50'}`}>
              <h5 className={`font-medium mb-1 ${textPrimary}`}>Photos avant/après</h5>
              <p className={`text-sm ${textSecondary}`}>Documentez votre travail pour vos clients et en cas de litige.</p>
            </div>
          </div>
          <div className={`p-4 rounded-xl ${isDark ? 'bg-amber-900/20' : 'bg-amber-50'}`}>
            <h4 className={`font-semibold mb-2 flex items-center gap-2 ${isDark ? 'text-amber-300' : 'text-amber-800'}`}><AlertTriangle size={16} /> Alertes marge</h4>
            <p className={`text-sm ${isDark ? 'text-amber-200' : 'text-amber-700'}`}>
              Marge &lt; 15% = orange, &lt; 0% = rouge. Surveillez ces alertes pour ajuster vos prix !
            </p>
          </div>
        </div>
      )
    },
    planning: {
      title: "Planning",
      titleFull: "Organiser votre agenda",
      icon: Calendar,
      content: (
        <div className="space-y-4">
          <p className={textSecondary}>Planifiez vos interventions, RDV clients et relances dans un calendrier visuel.</p>
          <div className="space-y-3">
            <div className={`p-3 rounded-lg ${isDark ? 'bg-slate-700' : 'bg-slate-50'}`}>
              <h5 className={`font-medium mb-1 ${textPrimary}`}>Vue mois ou semaine</h5>
              <p className={`text-sm ${textSecondary}`}>Basculez entre les vues pour avoir une vision globale ou détaillée de votre emploi du temps.</p>
            </div>
            <div className={`p-3 rounded-lg ${isDark ? 'bg-slate-700' : 'bg-slate-50'}`}>
              <h5 className={`font-medium mb-1 ${textPrimary}`}>Types d'événements</h5>
              <p className={`text-sm ${textSecondary}`}>Chantier (bleu), RDV Client (vert), Relance (orange), Urgence (rouge).</p>
            </div>
          </div>
          <div className={`p-4 rounded-xl ${isDark ? 'bg-purple-900/20' : 'bg-purple-50'}`}>
            <h4 className={`font-semibold mb-2 flex items-center gap-2 ${isDark ? 'text-purple-300' : 'text-purple-800'}`}><Lightbulb size={16} /> Astuce</h4>
            <p className={`text-sm ${isDark ? 'text-purple-200' : 'text-purple-700'}`}>
              Cliquez sur un jour pour ajouter rapidement un événement, ou sur un événement pour le modifier.
            </p>
          </div>
        </div>
      )
    },
    clients: {
      title: "Clients",
      titleFull: "Gérer vos clients",
      icon: Users,
      content: (
        <div className="space-y-4">
          <p className={textSecondary}>Centralisez les informations de vos clients et retrouvez leur historique en un clic.</p>
          <div className="space-y-3">
            <div className={`p-3 rounded-lg ${isDark ? 'bg-slate-700' : 'bg-slate-50'}`}>
              <h5 className={`font-medium mb-1 ${textPrimary}`}>Fiche client complète</h5>
              <p className={`text-sm ${textSecondary}`}>Nom, adresse, téléphone, email - tout ce qu'il faut pour les contacter et facturer.</p>
            </div>
            <div className={`p-3 rounded-lg ${isDark ? 'bg-slate-700' : 'bg-slate-50'}`}>
              <h5 className={`font-medium mb-1 ${textPrimary}`}>Historique</h5>
              <p className={`text-sm ${textSecondary}`}>Consultez tous les devis et chantiers liés à un client depuis sa fiche.</p>
            </div>
          </div>
          <div className={`p-4 rounded-xl ${isDark ? 'bg-emerald-900/20' : 'bg-emerald-50'}`}>
            <h4 className={`font-semibold mb-2 flex items-center gap-2 ${isDark ? 'text-emerald-300' : 'text-emerald-800'}`}><Lightbulb size={16} /> Astuce</h4>
            <p className={`text-sm ${isDark ? 'text-emerald-200' : 'text-emerald-700'}`}>
              Lors de la création d'un devis, vous pouvez créer un nouveau client directement sans quitter la page.
            </p>
          </div>
        </div>
      )
    },
    equipe: {
      title: "Équipe",
      titleFull: "Gérer votre équipe",
      icon: Users,
      content: (
        <div className="space-y-4">
          <p className={textSecondary}>Gérez vos employés, suivez leurs heures et calculez le coût de main d'œuvre par chantier.</p>
          <div className="space-y-3">
            <div className={`p-3 rounded-lg ${isDark ? 'bg-slate-700' : 'bg-slate-50'}`}>
              <h5 className={`font-medium mb-1 ${textPrimary}`}>Fiches employés</h5>
              <p className={`text-sm ${textSecondary}`}>Nom, rôle, taux horaire et coût chargé. Ces infos servent à calculer la rentabilité.</p>
            </div>
            <div className={`p-3 rounded-lg ${isDark ? 'bg-slate-700' : 'bg-slate-50'}`}>
              <h5 className={`font-medium mb-1 ${textPrimary}`}>Pointages</h5>
              <p className={`text-sm ${textSecondary}`}>Enregistrez les heures par chantier. Le coût MO se calcule automatiquement dans la marge.</p>
            </div>
          </div>
          <div className={`p-4 rounded-xl ${isDark ? 'bg-blue-900/20' : 'bg-blue-50'}`}>
            <h4 className={`font-semibold mb-2 flex items-center gap-2 ${isDark ? 'text-blue-300' : 'text-blue-800'}`}><Lightbulb size={16} /> Coût chargé</h4>
            <p className={`text-sm ${isDark ? 'text-blue-200' : 'text-blue-700'}`}>
              Le coût chargé inclut salaire + charges sociales. C'est ce qui est utilisé pour calculer la vraie marge de vos chantiers.
            </p>
          </div>
        </div>
      )
    },
    rentabilite: {
      title: "Rentabilité",
      titleFull: "Comprendre votre marge",
      icon: TrendingUp,
      content: (
        <div className="space-y-4">
          <p className={textSecondary}>La rentabilité est la clé de votre succès. Voici comment la lire :</p>
          <div className={`p-4 rounded-xl border ${isDark ? 'bg-slate-700 border-slate-600' : 'bg-white border-slate-200'}`}>
            <h5 className={`font-bold mb-3 ${textPrimary}`}>Calcul de la marge</h5>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className={textSecondary}>Chiffre d'affaires</span><span className={textPrimary}>10 000 EUR</span></div>
              <div className="flex justify-between"><span className={textSecondary}>- Matériaux</span><span className="text-red-500">- 3 000 EUR</span></div>
              <div className="flex justify-between"><span className={textSecondary}>- Main d'œuvre</span><span className="text-red-500">- 2 000 EUR</span></div>
              <div className={`flex justify-between pt-2 border-t ${isDark ? 'border-slate-600' : 'border-slate-200'}`}><span className="font-bold">= Marge nette</span><span className="font-bold text-emerald-500">5 000 EUR (50%)</span></div>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className={`p-3 rounded-lg ${isDark ? 'bg-emerald-900/30' : 'bg-emerald-50'}`}>
              <p className="text-xl font-bold text-emerald-500">30%+</p>
              <p className={`text-xs ${textSecondary}`}>Excellent</p>
            </div>
            <div className={`p-3 rounded-lg ${isDark ? 'bg-amber-900/30' : 'bg-amber-50'}`}>
              <p className="text-xl font-bold text-amber-500">15-30%</p>
              <p className={`text-xs ${textSecondary}`}>Correct</p>
            </div>
            <div className={`p-3 rounded-lg ${isDark ? 'bg-red-900/30' : 'bg-red-50'}`}>
              <p className="text-xl font-bold text-red-500">&lt;15%</p>
              <p className={`text-xs ${textSecondary}`}>Attention</p>
            </div>
          </div>
        </div>
      )
    },
    catalogue: {
      title: "Catalogue",
      titleFull: "Vos articles et tarifs",
      icon: Package,
      content: (
        <div className="space-y-4">
          <p className={textSecondary}>Centralisez vos articles et prestations avec les prix de vente et d'achat.</p>
          <div className={`p-4 rounded-xl ${isDark ? 'bg-purple-900/20' : 'bg-purple-50'}`}>
            <h4 className={`font-semibold mb-2 ${isDark ? 'text-purple-300' : 'text-purple-800'}`}>Exemple plombier</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className={isDark ? 'text-purple-200' : 'text-purple-700'}>Pose robinet mitigeur</span><span>85 EUR / unite</span></div>
              <div className="flex justify-between"><span className={isDark ? 'text-purple-200' : 'text-purple-700'}>Tube PER 16mm</span><span>3 EUR / metre</span></div>
              <div className="flex justify-between"><span className={isDark ? 'text-purple-200' : 'text-purple-700'}>Deplacement</span><span>45 EUR / forfait</span></div>
            </div>
          </div>
          <div className={`p-4 rounded-xl ${isDark ? 'bg-slate-700' : 'bg-slate-50'}`}>
            <h4 className={`font-semibold mb-2 ${textPrimary}`}>Favoris</h4>
            <p className={`text-sm ${textSecondary}`}>Marquez vos articles les plus utilises avec l'etoile pour les retrouver en haut lors de la creation d'un devis.</p>
          </div>
        </div>
      )
    }
  }), [isDark, textSecondary, textPrimary, textMuted, couleur]);

  // Memoized helper to compute marge modal data
  const margeModalData = useMemo(() => {
    const isMonthView = showCADetail === 'month' && selectedMonth;
    const monthData = isMonthView ? stats.caParMois.find(m => m.moisFull === selectedMonth) : null;
    return { isMonthView, monthData };
  }, [showCADetail, selectedMonth, stats.caParMois]);

  // Memoized greeting based on time of day
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Bonjour';
    if (hour < 18) return 'Bon après-midi';
    return 'Bonsoir';
  }, []);

  // Memoized date formatting
  const formattedDate = useMemo(() =>
    new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }),
    []
  );

  // Memoized insight box data to avoid recalculation on each render
  const insightBoxData = useMemo(() => {
    const todayCA = safeDevis.filter(d =>
      d.type === 'facture' && new Date(d.date).toDateString() === new Date().toDateString()
    ).reduce((s, f) => s + (f.total_ttc || 0), 0);
    const pendingDevisCount = stats.devisPipeline?.envoye?.length || 0;
    return { todayCA, pendingDevisCount };
  }, [safeDevis, stats.devisPipeline]);

  // Memoized active devis for widget to avoid recalculating on each render
  const activeDevisData = useMemo(() => {
    const activeDevis = (stats.devisPipeline?.envoye || []).filter(d => {
      const days = Math.floor((new Date() - new Date(d.date)) / 86400000);
      return days <= 60;
    });
    const archivedCount = (stats.devisPipeline?.envoye?.length || 0) - activeDevis.length;
    const activeTotal = activeDevis.reduce((s, d) => s + (d.total_ttc || 0), 0);
    return { activeDevis, archivedCount, activeTotal };
  }, [stats.devisPipeline]);

  // Help Modal - Fixed layout
  if (showHelp) {
    const currentSection = helpSections[helpSection];
    const SectionIcon = currentSection.icon;
    return (
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in" onClick={() => setShowHelp(false)}>
        <div className={`${isDark ? 'bg-slate-800' : 'bg-white'} rounded-2xl w-full max-w-2xl shadow-2xl animate-slide-up max-h-[90vh] overflow-hidden flex flex-col`} onClick={e => e.stopPropagation()}>
          {/* Header */}
          <div className={`p-4 border-b ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl" style={{ background: `${couleur}20` }}>
                  <HelpCircle size={20} style={{ color: couleur }} />
                </div>
                <h2 className={`font-bold text-lg ${textPrimary}`}>Guide d'utilisation</h2>
              </div>
              <button onClick={() => setShowHelp(false)} className={`p-2.5 rounded-xl min-w-[44px] min-h-[44px] flex items-center justify-center ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-100'}`}>
                <X size={20} className={textPrimary} />
              </button>
            </div>
          </div>

          {/* Tabs - Horizontal scrollable for mobile and desktop */}
          <div className={`border-b ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
            <div className="flex overflow-x-auto p-2 gap-1 scrollbar-hide">
              {Object.entries(helpSections).map(([key, section]) => {
                const TabIcon = section.icon;
                return (
                  <button
                    key={key}
                    onClick={() => setHelpSection(key)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm whitespace-nowrap min-h-[40px] transition-colors flex-shrink-0 ${
                      helpSection === key
                        ? 'text-white'
                        : isDark
                          ? 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                    style={helpSection === key ? { background: couleur } : {}}
                  >
                    <TabIcon size={16} />
                    <span>{section.title}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 p-5 overflow-y-auto">
            <div className="flex items-center gap-3 mb-4">
              <SectionIcon size={24} style={{ color: couleur }} />
              <h3 className={`text-xl font-bold ${textPrimary}`}>{currentSection.titleFull || currentSection.title}</h3>
            </div>
            {currentSection.content}
          </div>
        </div>
      </div>
    );
  }

  // Beautiful empty state for new users
  if (stats.isNewUser) {
    return (
      <div className="space-y-6">
        {/* Welcome Header */}
        <div className={`${cardBg} rounded-2xl border overflow-hidden`}>
          <div className="p-8 sm:p-12 text-center relative" style={{ background: `linear-gradient(135deg, ${couleur}20, ${couleur}05)` }}>
            <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23000000\' fill-opacity=\'0.3\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")' }} />
            <div className="relative">
              <div className="w-20 h-20 sm:w-24 sm:h-24 mx-auto mb-6 rounded-2xl flex items-center justify-center shadow-lg" style={{ background: `linear-gradient(135deg, ${couleur}, ${couleur}dd)` }}>
                <Sparkles size={40} className="text-white" />
              </div>
              <h1 className={`text-2xl sm:text-3xl font-bold mb-3 ${textPrimary}`}>Bienvenue dans ChantierPro</h1>
              <p className={`text-base sm:text-lg ${textSecondary} max-w-lg mx-auto`}>
                Votre assistant pour gérer devis, factures et chantiers. Commençons !
              </p>
            </div>
          </div>

          {/* Getting Started Steps */}
          <div className={`p-6 sm:p-8 border-t ${isDark ? 'border-slate-700' : 'border-slate-100'}`}>
            <p className={`text-xs font-medium uppercase tracking-wider mb-5 ${textMuted}`}>Pour bien démarrer</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <button onClick={() => { setPage?.('parametres'); }} className={`group p-5 rounded-xl border text-left transition-all hover:shadow-lg hover:-translate-y-1 ${isDark ? 'border-slate-700 hover:border-slate-600 bg-slate-800/50' : 'border-slate-200 hover:border-slate-300 bg-slate-50/50'}`}>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${couleur}20` }}>
                    <span className="text-lg font-bold" style={{ color: couleur }}>1</span>
                  </div>
                  <Settings size={20} className={textMuted} />
                </div>
                <h3 className={`font-semibold mb-1 ${textPrimary}`}>Configurer mon entreprise</h3>
                <p className={`text-sm ${textMuted}`}>Nom, adresse, SIRET, logo...</p>
              </button>
              <button onClick={() => { if (setCreateMode) setCreateMode(p => ({...p, client: true})); setPage?.('clients'); }} className={`group p-5 rounded-xl border text-left transition-all hover:shadow-lg hover:-translate-y-1 ${isDark ? 'border-slate-700 hover:border-slate-600 bg-slate-800/50' : 'border-slate-200 hover:border-slate-300 bg-slate-50/50'}`}>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${couleur}20` }}>
                    <span className="text-lg font-bold" style={{ color: couleur }}>2</span>
                  </div>
                  <Users size={20} className={textMuted} />
                </div>
                <h3 className={`font-semibold mb-1 ${textPrimary}`}>Ajouter un client</h3>
                <p className={`text-sm ${textMuted}`}>Créez votre premier contact</p>
              </button>
              <button onClick={() => { if (setCreateMode) setCreateMode(p => ({...p, devis: true})); setPage?.('devis'); }} className={`group p-5 rounded-xl border text-left transition-all hover:shadow-lg hover:-translate-y-1 ${isDark ? 'border-slate-700 hover:border-slate-600 bg-slate-800/50' : 'border-slate-200 hover:border-slate-300 bg-slate-50/50'}`}>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${couleur}20` }}>
                    <span className="text-lg font-bold" style={{ color: couleur }}>3</span>
                  </div>
                  <FileText size={20} className={textMuted} />
                </div>
                <h3 className={`font-semibold mb-1 ${textPrimary}`}>Créer un devis</h3>
                <p className={`text-sm ${textMuted}`}>Lancez votre première affaire</p>
              </button>
            </div>
          </div>
        </div>

        {/* Preview of what they'll see */}
        <div className={`${cardBg} rounded-2xl border p-6 sm:p-8`}>
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-xl" style={{ background: `${couleur}20` }}>
              <BarChart3 size={20} style={{ color: couleur }} />
            </div>
            <div>
              <h3 className={`font-semibold ${textPrimary}`}>Votre futur tableau de bord</h3>
              <p className={`text-sm ${textMuted}`}>Voici ce que vous verrez une fois vos données ajoutées</p>
            </div>
          </div>

          {/* Sample Stats Preview */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6 opacity-60">
            <div className={`p-4 rounded-xl border ${isDark ? 'border-slate-700 bg-slate-800/50' : 'border-slate-200 bg-slate-50'}`}>
              <div className="flex items-center gap-2 mb-2">
                <DollarSign size={16} style={{ color: couleur }} />
                <span className={`text-xs ${textMuted}`}>Chiffre d'affaires</span>
              </div>
              <p className="text-xl font-bold" style={{ color: couleur }}>12 500 €</p>
              <p className={`text-xs ${textMuted}`}>+15% ce mois</p>
            </div>
            <div className={`p-4 rounded-xl border ${isDark ? 'border-slate-700 bg-slate-800/50' : 'border-slate-200 bg-slate-50'}`}>
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp size={16} className="text-emerald-500" />
                <span className={`text-xs ${textMuted}`}>Marge nette</span>
              </div>
              <p className="text-xl font-bold text-emerald-500">3 750 €</p>
              <p className={`text-xs ${textMuted}`}>30% de marge</p>
            </div>
            <div className={`p-4 rounded-xl border ${isDark ? 'border-slate-700 bg-slate-800/50' : 'border-slate-200 bg-slate-50'}`}>
              <div className="flex items-center gap-2 mb-2">
                <FileText size={16} className="text-blue-500" />
                <span className={`text-xs ${textMuted}`}>Devis en attente</span>
              </div>
              <p className="text-xl font-bold text-blue-500">3</p>
              <p className={`text-xs ${textMuted}`}>8 500 € potentiel</p>
            </div>
            <div className={`p-4 rounded-xl border ${isDark ? 'border-slate-700 bg-slate-800/50' : 'border-slate-200 bg-slate-50'}`}>
              <div className="flex items-center gap-2 mb-2">
                <Hammer size={16} className="text-purple-500" />
                <span className={`text-xs ${textMuted}`}>Chantiers actifs</span>
              </div>
              <p className="text-xl font-bold text-purple-500">2</p>
              <p className={`text-xs ${textMuted}`}>En cours</p>
            </div>
          </div>

          <div className={`p-4 rounded-xl ${isDark ? 'bg-blue-900/20 border border-blue-800' : 'bg-blue-50 border border-blue-200'}`}>
            <div className="flex items-start gap-3">
              <Lightbulb size={20} className="text-blue-500 mt-0.5" />
              <div>
                <p className={`font-medium ${isDark ? 'text-blue-300' : 'text-blue-800'}`}>Astuce de pro</p>
                <p className={`text-sm mt-1 ${isDark ? 'text-blue-200' : 'text-blue-700'}`}>
                  Commencez par remplir votre catalogue de prestations. Vous pourrez ensuite créer des devis en quelques clics !
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Help Button */}
        <div className="text-center">
          <button onClick={() => setShowHelp(true)} className={`inline-flex items-center gap-2 px-6 py-3 rounded-xl transition-all ${isDark ? 'bg-slate-700 hover:bg-slate-600 text-slate-300' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'}`}>
            <HelpCircle size={18} />
            Voir le guide complet
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* HEADER - Pixel Perfect: h-16, px-6, gap-6 */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <header className={`sticky top-0 z-50 h-16 border-b ${isDark ? 'bg-slate-900 border-slate-700' : 'bg-white border-gray-200'}`}>
        <div className="h-full px-4 sm:px-6 flex items-center gap-4 sm:gap-6">
          {/* Logo */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: couleur }}>
              <HardHat size={18} className="text-white" />
            </div>
            <span className={`text-lg font-semibold hidden sm:block ${textPrimary}`}>ChantierPro</span>
          </div>

          {/* Search - Centered, max-w-2xl */}
          <div className="flex-1 max-w-2xl mx-auto">
            <button
              onClick={() => onOpenSearch?.()}
              className={`w-full h-10 flex items-center gap-3 px-4 rounded-lg border transition-all duration-200 ${isDark ? 'bg-slate-800 border-slate-700 hover:border-slate-600' : 'bg-gray-50 border-gray-200 hover:border-gray-300'}`}
            >
              <Search size={16} className={textMuted} />
              <span className={`flex-1 text-left text-sm ${textMuted}`}>Rechercher devis, clients, chantiers...</span>
              <kbd className={`text-xs px-1.5 py-0.5 rounded font-mono ${isDark ? 'bg-slate-700 text-slate-400' : 'bg-gray-200 text-gray-500'}`}>⌘K</kbd>
            </button>
          </div>

          {/* Right: Notification + Avatar - gap-4 */}
          <div className="flex items-center gap-4 flex-shrink-0">
            {/* Notification Bell - 40x40 */}
            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${isDark ? 'hover:bg-slate-800' : 'hover:bg-gray-100'}`}
              >
                <Bell size={20} className={textSecondary} />
                {notifications.filter(n => !n.read).length > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
                )}
              </button>

              {/* Notifications Dropdown */}
              {showNotifications && (
                <div className={`absolute right-0 mt-2 w-80 rounded-xl shadow-lg border z-50 ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'}`}>
                  <div className={`px-4 py-3 border-b ${isDark ? 'border-slate-700' : 'border-gray-100'}`}>
                    <p className={`font-semibold text-base ${textPrimary}`}>Notifications</p>
                  </div>
                  <div className="max-h-64 overflow-y-auto">
                    {notifications.length > 0 ? notifications.map(notif => (
                      <div key={notif.id} className={`flex items-start gap-3 p-4 transition-colors ${!notif.read ? (isDark ? 'bg-slate-700/50' : 'bg-blue-50/50') : ''} ${isDark ? 'hover:bg-slate-700' : 'hover:bg-gray-50'}`}>
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${notif.type === 'payment' ? 'bg-emerald-100 text-emerald-600' : notif.type === 'alert' ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}`}>
                          <notif.icon size={14} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm ${textPrimary}`}>{notif.text}</p>
                          <p className={`text-xs mt-1 ${textMuted}`}>{notif.time}</p>
                        </div>
                      </div>
                    )) : (
                      <div className="p-6 text-center">
                        <p className={`text-sm ${textMuted}`}>Aucune notification</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* User Avatar - 40x40 */}
            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold text-sm transition-transform hover:scale-105"
                style={{ background: couleur }}
              >
                {entreprise?.nom?.[0] || 'U'}
              </button>

              {/* User Menu Dropdown */}
              {showUserMenu && (
                <div className={`absolute right-0 mt-2 w-48 rounded-xl shadow-lg border z-50 py-2 ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'}`}>
                  <button onClick={() => setPage?.('settings')} className={`w-full px-4 py-2.5 text-left text-sm ${textPrimary} ${isDark ? 'hover:bg-slate-700' : 'hover:bg-gray-50'}`}>Mon profil</button>
                  <button onClick={() => setPage?.('settings')} className={`w-full px-4 py-2.5 text-left text-sm ${textPrimary} ${isDark ? 'hover:bg-slate-700' : 'hover:bg-gray-50'}`}>Paramètres</button>
                  <div className={`my-2 border-t ${isDark ? 'border-slate-700' : 'border-gray-100'}`} />
                  <button className={`w-full px-4 py-2.5 text-left text-sm text-red-500 ${isDark ? 'hover:bg-slate-700' : 'hover:bg-gray-50'}`}>Se déconnecter</button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* HERO ZONE - pt-8 pb-6 px-6, no emoji, proper hierarchy */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <section className={`pt-6 sm:pt-8 pb-4 sm:pb-6 px-4 sm:px-6 ${isDark ? 'bg-slate-900' : 'bg-white'}`}>
        {/* Greeting */}
        <div className="mb-2">
          <h1 className={`text-2xl sm:text-3xl font-bold ${textPrimary}`} style={{ lineHeight: '1.2' }}>
            {greeting} {entreprise?.nom?.split(' ')[0] || ''}
          </h1>
        </div>

        {/* Metadata - flex with dot separators */}
        <div className={`flex items-center gap-4 text-sm ${textSecondary}`}>
          <span className="flex items-center gap-2">
            <Calendar size={16} className={textMuted} />
            <span className="capitalize">{formattedDate}</span>
          </span>
          <span className={`w-1 h-1 rounded-full ${isDark ? 'bg-slate-600' : 'bg-gray-300'}`} />
          <span className="flex items-center gap-2">
            <HardHat size={16} className={textMuted} />
            <span>{stats.chantiersActifs} chantier{stats.chantiersActifs !== 1 ? 's' : ''} en cours</span>
          </span>
        </div>

        {/* Contextual Insight Box - if there's actionable data */}
        {(insightBoxData.todayCA > 0 || insightBoxData.pendingDevisCount > 0 || stats.montantOverdue > 0) && (
          <div className={`mt-4 p-3 rounded-lg border-l-4 ${stats.montantOverdue > 0 ? 'bg-red-50 border-red-500 dark:bg-red-900/20' : 'bg-blue-50 border-blue-500 dark:bg-blue-900/20'}`}>
            <p className={`text-sm ${stats.montantOverdue > 0 ? 'text-red-900 dark:text-red-200' : 'text-blue-900 dark:text-blue-200'}`}>
              {stats.montantOverdue > 0 ? (
                <>
                  <strong>Action urgente:</strong> {formatMoney(stats.montantOverdue)} en retard de paiement ({stats.facturesOverdue?.length} facture{stats.facturesOverdue?.length > 1 ? 's' : ''})
                </>
              ) : insightBoxData.todayCA > 0 ? (
                <>
                  <strong>Journée productive:</strong> +{formatMoney(insightBoxData.todayCA)} facturé{insightBoxData.pendingDevisCount > 0 ? ` • ${insightBoxData.pendingDevisCount} devis en attente` : ''}
                </>
              ) : (
                <>
                  <strong>À faire:</strong> {insightBoxData.pendingDevisCount} devis en attente de réponse ({formatMoney(stats.montantDevisEnAttente)})
                </>
              )}
            </p>
          </div>
        )}

        {/* Period selector moved to be inline with KPIs */}
      </section>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* KPI SECTION - px-6, gap-6 */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <div className={`px-4 sm:px-6 pb-4 sm:pb-6 ${isDark ? 'bg-slate-900' : 'bg-white'}`}>
        {/* Period Selector inline */}
        <div className="flex items-center justify-end mb-4">
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className={`appearance-none pl-3 pr-8 py-2 rounded-lg border text-sm font-medium cursor-pointer ${isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-gray-200 text-gray-700'}`}
          >
            <option value="quarter">Ce trimestre</option>
            <option value="year">Cette année</option>
          </select>
          <ChevronDown size={16} className={`absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none ${textMuted}`} />
        </div>

        {/* KPI Cards - Pixel Perfect: p-6, gap-6, border-radius-xl */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
          {/* CA Card */}
          <button
            onClick={() => setShowCADetail('ca')}
            className={`${cardBg} rounded-xl border p-6 text-left transition-all duration-200 hover:shadow-lg`}
          >
            {/* Header: Icon + Label + Badge */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                  <TrendingUp size={20} className="text-green-600 dark:text-green-400" />
                </div>
                <span className={`text-sm font-medium ${textSecondary}`}>CA</span>
              </div>
              <span className={`text-xs font-semibold px-2 py-1 rounded-md ${stats.tendance >= 0 ? 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-400'}`}>
                {stats.tendance >= 0 ? '↗' : '↘'} {Math.abs(stats.tendance).toFixed(0)}%
              </span>
            </div>
            {/* Value - 30px font */}
            <p className={`text-xl sm:text-2xl lg:text-3xl font-bold ${textPrimary} mb-3 sm:mb-4`}>{formatMoney(stats.totalCA)}</p>
            {/* Progress */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className={textSecondary}>Objectif mensuel</span>
                <span className={`font-semibold ${textPrimary}`}>{Math.min(100, Math.round((stats.totalCA / 40000) * 100))}%</span>
              </div>
              <div className={`h-2 rounded-full ${isDark ? 'bg-slate-700' : 'bg-gray-100'}`}>
                <div className="h-full rounded-full bg-green-500 transition-all" style={{ width: `${Math.min(100, (stats.totalCA / 40000) * 100)}%` }} />
              </div>
            </div>
          </button>

          {/* Marge Card */}
          <button
            onClick={() => setShowMargeDetail(true)}
            className={`${cardBg} rounded-xl border p-6 text-left transition-all duration-200 hover:shadow-lg`}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                  <Wallet size={20} className="text-blue-600 dark:text-blue-400" />
                </div>
                <span className={`text-sm font-medium ${textSecondary}`}>Marge</span>
              </div>
              <span className={`text-xs font-semibold px-2 py-1 rounded-md ${stats.tauxMarge >= 20 ? 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-400' : stats.tauxMarge >= 10 ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-400' : 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-400'}`}>
                {modeDiscret ? '··%' : `${stats.tauxMarge.toFixed(0)}%`}
              </span>
            </div>
            <p className={`text-xl sm:text-2xl lg:text-3xl font-bold ${textPrimary} mb-3 sm:mb-4`}>
              {modeDiscret ? '·····' : formatMoney(stats.marge)}
            </p>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className={textSecondary}>Objectif 20%</span>
                <span className={`font-semibold ${stats.tauxMarge >= 20 ? 'text-green-600' : 'text-amber-600'}`}>
                  {stats.tauxMarge >= 20 ? 'Atteint' : `${Math.max(0, 20 - stats.tauxMarge).toFixed(0)}% restant`}
                </span>
              </div>
              <div className={`h-2 rounded-full ${isDark ? 'bg-slate-700' : 'bg-gray-100'}`}>
                <div className={`h-full rounded-full transition-all ${stats.tauxMarge >= 20 ? 'bg-green-500' : stats.tauxMarge >= 10 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${Math.min(100, (stats.tauxMarge / 20) * 100)}%` }} />
              </div>
            </div>
          </button>

          {/* Chantiers Card */}
          <button
            onClick={() => setPage?.('chantiers')}
            className={`${cardBg} rounded-xl border p-6 text-left transition-all duration-200 hover:shadow-lg`}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                  <HardHat size={20} className="text-purple-600 dark:text-purple-400" />
                </div>
                <span className={`text-sm font-medium ${textSecondary}`}>Chantiers</span>
              </div>
            </div>
            <p className={`text-xl sm:text-2xl lg:text-3xl font-bold ${textPrimary}`}>{stats.chantiersActifs}</p>
            <p className={`text-sm ${textSecondary} mb-4`}>en cours</p>
            <div className={`pt-3 border-t ${isDark ? 'border-slate-700' : 'border-gray-100'}`}>
              <div className="flex justify-between text-xs">
                <span className={textSecondary}>{stats.chantiersProspect} planifié{stats.chantiersProspect !== 1 ? 's' : ''}</span>
                <span className={textSecondary}>{stats.chantiersTermines} terminé{stats.chantiersTermines !== 1 ? 's' : ''}</span>
              </div>
            </div>
          </button>

          {/* Trésorerie Card - STRONG alert styling */}
          <button
            onClick={() => setShowEnAttenteDetail(true)}
            className={`${cardBg} rounded-xl border p-6 text-left transition-all duration-200 hover:shadow-lg ${stats.montantOverdue > 0 ? 'border-red-300 dark:border-red-700 ring-1 ring-red-200 dark:ring-red-800' : ''}`}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${stats.montantOverdue > 0 ? 'bg-red-100 dark:bg-red-900/30' : 'bg-amber-100 dark:bg-amber-900/30'}`}>
                  <Banknote size={20} className={stats.montantOverdue > 0 ? 'text-red-600 dark:text-red-400' : 'text-amber-600 dark:text-amber-400'} />
                </div>
                <span className={`text-sm font-medium ${textSecondary}`}>À encaisser</span>
              </div>
              {stats.montantOverdue > 0 && (
                <span className="text-xs font-bold px-2 py-1 rounded-md bg-red-500 text-white animate-pulse">
                  Alerte
                </span>
              )}
            </div>
            <p className={`text-xl sm:text-2xl lg:text-3xl font-bold ${textPrimary}`}>{formatMoney(stats.enAttente)}</p>
            {/* Alert box if overdue */}
            {stats.montantOverdue > 0 ? (
              <div className={`mt-4 p-3 rounded-lg ${isDark ? 'bg-red-900/30 border border-red-800' : 'bg-red-50 border border-red-200'}`}>
                <p className="text-sm font-semibold text-red-700 dark:text-red-400">
                  {formatMoney(stats.montantOverdue)} en retard
                </p>
                <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                  {stats.facturesOverdue?.length} facture{stats.facturesOverdue?.length !== 1 ? 's' : ''} impayée{stats.facturesOverdue?.length !== 1 ? 's' : ''} +60j
                </p>
              </div>
            ) : (
              <p className={`text-sm text-green-600 dark:text-green-400 mt-4`}>Aucun retard de paiement</p>
            )}
          </button>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* ACTION BANNER - More Prominent (if recommendations exist) */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {aiRecommendations.length > 0 && (
        <div className="px-4 sm:px-6 pb-4 sm:pb-6">
          <div className={`p-3 sm:p-4 rounded-xl border ${stats.montantOverdue > 0 ? 'bg-gradient-to-r from-red-50 to-red-100 border-red-200 dark:from-red-900/20 dark:to-red-900/10 dark:border-red-800' : 'bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200 dark:from-blue-900/20 dark:to-blue-900/10 dark:border-blue-800'}`}>
            <div className="flex items-center justify-between flex-wrap gap-4">
              {/* Left: Content */}
              <div className="flex items-start gap-4">
                <div className={`mt-0.5 w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${stats.montantOverdue > 0 ? 'bg-red-500' : 'bg-blue-500'}`}>
                  <Zap size={20} className="text-white" />
                </div>
                <div>
                  <p className={`text-xs font-semibold uppercase tracking-wide mb-1 ${stats.montantOverdue > 0 ? 'text-red-900 dark:text-red-300' : 'text-blue-900 dark:text-blue-300'}`}>
                    Action prioritaire
                  </p>
                  <p className={`text-base font-medium ${textPrimary} mb-1`}>
                    {aiRecommendations[0].text}
                  </p>
                  {aiRecommendations[0].value && (
                    <p className={`text-sm ${stats.montantOverdue > 0 ? 'text-red-700 dark:text-red-400' : 'text-blue-700 dark:text-blue-400'}`}>
                      Valeur: <span className="font-bold">{formatMoney(aiRecommendations[0].value)}</span>
                    </p>
                  )}
                </div>
              </div>
              {/* Right: CTA */}
              <button
                onClick={aiRecommendations[0].action}
                className={`px-6 py-3 rounded-lg text-sm font-semibold text-white transition-colors flex items-center gap-2 ${stats.montantOverdue > 0 ? 'bg-red-500 hover:bg-red-600' : 'bg-blue-500 hover:bg-blue-600'}`}
              >
                {stats.montantOverdue > 0 ? 'Relancer maintenant' : 'Voir'}
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* WIDGETS ZONE - Pixel Perfect: px-6, gap-6 */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <div className={`px-4 sm:px-6 pb-6 sm:pb-8 ${isDark ? 'bg-slate-900' : 'bg-gray-50'}`}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">

        {/* ══════════════ WIDGET 1: Devis en Attente - Pixel Perfect ══════════════ */}
        <div className={`${cardBg} rounded-xl border shadow-sm hover:shadow-md transition-shadow flex flex-col`}>
          {/* Header - p-6 mb-6 */}
          <div className={`flex items-center justify-between px-6 py-4 border-b ${isDark ? 'border-slate-700' : 'border-gray-100'}`}>
            <div className="flex items-center gap-2">
              <FileText size={20} className="text-primary-600" />
              <h3 className={`text-base font-semibold ${textPrimary}`}>Devis en attente</h3>
            </div>
            {activeDevisData.activeDevis.length > 0 && (
              <span className={`text-xs font-medium px-2.5 py-1 rounded-md ${isDark ? 'bg-primary-900/30 text-primary-400' : 'bg-primary-100 text-primary-700'}`}>
                {activeDevisData.activeDevis.length}
              </span>
            )}
          </div>

          {/* Body - p-6 flex-1 */}
          <div className="flex-1 p-6">
            {activeDevisData.activeDevis.length > 0 ? (
              <div className="space-y-4">
                {activeDevisData.activeDevis.slice(0, 3).map(d => {
                  const client = safeClients.find(c => c.id === d.client_id);
                  const days = Math.floor((new Date() - new Date(d.date)) / 86400000);
                  const urgency = days > 14 ? 'urgent' : days > 7 ? 'warning' : 'normal';

                  return (
                    <div
                      key={d.id}
                      onClick={() => { setSelectedDevis?.(d); setPage?.('devis'); }}
                      className={`p-4 rounded-lg border cursor-pointer transition-all hover:shadow-sm ${
                        urgency === 'urgent' ? (isDark ? 'bg-red-900/10 border-red-800/50' : 'bg-red-50 border-red-200') :
                        urgency === 'warning' ? (isDark ? 'bg-amber-900/10 border-amber-800/50' : 'bg-amber-50 border-amber-200') :
                        (isDark ? 'bg-slate-800/50 border-slate-700' : 'bg-gray-50 border-gray-200')
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <p className={`text-sm font-medium truncate ${textPrimary}`}>{client?.nom || 'Client'}</p>
                            {urgency !== 'normal' && (
                              <span className={`text-[11px] font-medium px-2 py-0.5 rounded ${urgency === 'urgent' ? 'bg-red-500 text-white' : 'bg-amber-500 text-white'}`}>
                                {urgency === 'urgent' ? 'Urgent' : 'À relancer'}
                              </span>
                            )}
                          </div>
                          <p className={`text-xs ${textMuted}`}>{d.numero}</p>
                        </div>
                        <p className={`text-base font-bold ${isDark ? 'text-primary-400' : 'text-primary-600'}`}>
                          {formatMoney(d.total_ttc)}
                        </p>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className={textMuted}>
                          Envoyé le {new Date(d.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} ({days}j)
                        </span>
                        <span className="text-blue-500 font-medium">Voir →</span>
                      </div>
                    </div>
                  );
                })}
                {activeDevisData.activeDevis.length > 3 && (
                  <button onClick={() => setPage?.('devis')} className={`w-full text-sm text-center py-2 rounded-lg ${isDark ? 'text-slate-400 hover:bg-slate-800' : 'text-gray-500 hover:bg-gray-100'}`}>
                    + {activeDevisData.activeDevis.length - 3} autres devis
                  </button>
                )}
              </div>
            ) : (
              /* Empty State - Pixel Perfect */
              <div className="py-12 flex flex-col items-center justify-center text-center">
                <div className="w-16 h-16 mb-4 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                  <CheckCircle size={32} className="text-green-600 dark:text-green-400" />
                </div>
                <p className={`text-base font-medium ${textPrimary} mb-1`}>Aucun devis en attente</p>
                <p className={`text-sm ${textSecondary}`}>Tous vos clients ont répondu</p>
              </div>
            )}
          </div>

          {/* Footer - p-4 border-t */}
          <div className={`px-6 py-4 border-t ${isDark ? 'border-slate-700' : 'border-gray-100'}`}>
            <button
              onClick={() => { setCreateMode?.({ devis: true }); setPage?.('devis'); }}
              className={`w-full py-2.5 rounded-lg text-sm font-medium border transition-colors ${isDark ? 'border-slate-600 text-slate-300 hover:bg-slate-700' : 'border-gray-200 text-gray-700 hover:bg-gray-50'}`}
            >
              Créer un devis
            </button>
          </div>
        </div>

      {/* ══════════════ WIDGET 2: Chantiers - Pixel Perfect ══════════════ */}
        <div className={`${cardBg} rounded-xl border shadow-sm hover:shadow-md transition-shadow flex flex-col`}>
          {/* Header */}
          <div className={`flex items-center justify-between px-6 py-4 border-b ${isDark ? 'border-slate-700' : 'border-gray-100'}`}>
            <div className="flex items-center gap-2">
              <HardHat size={20} className="text-purple-600" />
              <h3 className={`text-base font-semibold ${textPrimary}`}>Chantiers</h3>
            </div>
            {stats.chantiersActifs > 0 && (
              <span className={`text-xs font-medium px-2.5 py-1 rounded-md ${isDark ? 'bg-purple-900/30 text-purple-400' : 'bg-purple-100 text-purple-700'}`}>
                {stats.chantiersActifs} actif{stats.chantiersActifs !== 1 ? 's' : ''}
              </span>
            )}
          </div>

          {/* Body */}
          <div className="flex-1 p-6">
            {(() => {
              const weekChantiers = safeChantiers.filter(c => c.statut === 'en_cours').slice(0, 3);

              if (weekChantiers.length === 0) {
                return (
                  <div className="py-12 flex flex-col items-center justify-center text-center">
                    <div className="w-16 h-16 mb-4 rounded-full bg-gray-100 dark:bg-slate-700 flex items-center justify-center">
                      <Calendar size={32} className={textMuted} />
                    </div>
                    <p className={`text-base font-medium ${textPrimary} mb-1`}>Aucun chantier en cours</p>
                    <p className={`text-sm ${textSecondary}`}>Planifiez votre prochain chantier</p>
                  </div>
                );
              }

              return (
                <div className="space-y-4">
                  {weekChantiers.map((ch, idx) => {
                    const client = safeClients.find(c => c.id === ch.client_id);
                    const progress = ch.avancement || 0;
                    const statusConfig = progress >= 80
                      ? { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-800 dark:text-blue-300', barBg: 'bg-blue-500', label: 'En cours' }
                      : progress >= 50
                      ? { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-800 dark:text-blue-300', barBg: 'bg-blue-500', label: 'En cours' }
                      : progress > 0
                      ? { bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-800 dark:text-amber-300', barBg: 'bg-amber-500', label: 'Démarré' }
                      : { bg: 'bg-gray-100 dark:bg-slate-700', text: 'text-gray-600 dark:text-slate-400', barBg: 'bg-gray-400', label: 'À démarrer' };

                    const chantierWeather = weather?.forecast?.[idx % 7];
                    const hasRainWarning = chantierWeather?.condition === 'rainy';

                    return (
                      <div
                        key={ch.id}
                        onClick={() => { setSelectedChantier?.(ch.id); setPage?.('chantiers'); }}
                        className={`p-4 rounded-xl border cursor-pointer transition-all hover:shadow-sm ${isDark ? 'bg-slate-800/50 border-slate-700 hover:border-slate-600' : 'bg-white border-gray-200 hover:border-gray-300'}`}
                      >
                        {/* Header: Badge + Date + Weather */}
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <span className={`text-xs font-medium px-2.5 py-1 rounded-md ${statusConfig.bg} ${statusConfig.text}`}>
                              {statusConfig.label}
                            </span>
                            <span className={`text-xs ${textSecondary}`}>
                              {ch.date_debut ? new Date(ch.date_debut).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) : ''}
                              {ch.date_fin && ` - ${new Date(ch.date_fin).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}`}
                            </span>
                          </div>
                          {chantierWeather && (
                            <div className="flex items-center gap-1 text-sm">
                              <chantierWeather.icon size={16} className={hasRainWarning ? 'text-orange-500' : 'text-amber-400'} />
                              <span className={`font-medium ${textPrimary}`}>{chantierWeather.temp}°</span>
                            </div>
                          )}
                        </div>

                        {/* Title */}
                        <h4 className={`text-base font-semibold ${textPrimary} mb-1`}>{ch.nom}</h4>

                        {/* Location - shorter */}
                        <p className={`text-sm ${textSecondary} mb-3 flex items-center gap-1`}>
                          <MapPin size={14} className={textMuted} />
                          {ch.adresse?.split(',')[0] || client?.ville || 'Adresse non définie'}
                        </p>

                        {/* Progress */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-xs">
                            <span className={textSecondary}>Avancement</span>
                            <span className={`font-semibold ${statusConfig.text}`}>{progress}%</span>
                          </div>
                          <div className={`h-2 rounded-full ${isDark ? 'bg-slate-700' : 'bg-gray-100'}`}>
                            <div className={`h-full rounded-full ${statusConfig.barBg} transition-all`} style={{ width: `${progress}%` }} />
                          </div>
                        </div>

                        {/* Rain Alert */}
                        {hasRainWarning && (
                          <div className={`mt-3 p-2 rounded-lg ${isDark ? 'bg-orange-900/20 border border-orange-800/50' : 'bg-orange-50 border border-orange-200'} flex items-center gap-2`}>
                            <AlertTriangle size={14} className="text-orange-600 dark:text-orange-400" />
                            <span className="text-xs font-medium text-orange-700 dark:text-orange-300">Pluie prévue</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>

          {/* Footer */}
          <div className={`px-6 py-4 border-t ${isDark ? 'border-slate-700' : 'border-gray-100'}`}>
            <button
              onClick={() => setPage?.('chantiers')}
              className={`w-full py-2.5 rounded-lg text-sm font-medium border transition-colors ${isDark ? 'border-slate-600 text-slate-300 hover:bg-slate-700' : 'border-gray-200 text-gray-700 hover:bg-gray-50'}`}
            >
              Voir tous les chantiers
            </button>
          </div>
        </div>

        {/* ══════════════ WIDGET 3: Trésorerie - Pixel Perfect ══════════════ */}
        {(() => {
          const hasOverdue = stats.montantOverdue > 0;
          const overdueCount = stats.facturesOverdue?.length || 0;
          const under30 = stats.facturesEnAttente.filter(f => Math.floor((new Date() - new Date(f.date)) / 86400000) <= 30).reduce((s, f) => s + (f.total_ttc || 0), 0);
          const between30and60 = stats.facturesEnAttente.filter(f => { const d = Math.floor((new Date() - new Date(f.date)) / 86400000); return d > 30 && d <= 60; }).reduce((s, f) => s + (f.total_ttc || 0), 0);

          return (
            <div className={`${cardBg} rounded-xl border shadow-sm hover:shadow-md transition-shadow flex flex-col`}>
              {/* Header */}
              <div className={`flex items-center justify-between px-6 py-4 border-b ${isDark ? 'border-slate-700' : 'border-gray-100'}`}>
                <div className="flex items-center gap-2">
                  <Wallet size={20} className="text-emerald-600" />
                  <h3 className={`text-base font-semibold ${textPrimary}`}>Trésorerie</h3>
                </div>
                {hasOverdue && (
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-red-500 text-white">
                    Alerte
                  </span>
                )}
              </div>

              {/* Body */}
              <div className="flex-1 p-6 space-y-6">
                {/* Alert Box - if overdue */}
                {hasOverdue && (
                  <div className={`p-4 rounded-lg ${isDark ? 'bg-red-900/20 border border-red-800' : 'bg-red-50 border border-red-200'}`}>
                    <div className="flex items-start gap-3">
                      <AlertCircle size={20} className="text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-red-900 dark:text-red-300 mb-1">
                          {formatMoney(stats.montantOverdue)} en retard
                        </p>
                        <p className="text-xs text-red-700 dark:text-red-400">
                          {overdueCount} facture{overdueCount !== 1 ? 's' : ''} impayée{overdueCount !== 1 ? 's' : ''} depuis +60 jours
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setShowEnAttenteDetail(true)}
                      className="w-full mt-3 py-2 rounded-lg text-sm font-semibold bg-red-500 hover:bg-red-600 text-white transition-colors flex items-center justify-center gap-2"
                    >
                      Relancer maintenant
                      <ArrowRight size={14} />
                    </button>
                  </div>
                )}

                {/* Breakdown */}
                <div className="space-y-3">
                  <p className={`text-xs font-semibold uppercase tracking-wide ${textSecondary}`}>
                    À encaisser par échéance
                  </p>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-green-500" />
                        <span className={textSecondary}>&lt; 30 jours</span>
                      </div>
                      <span className={`font-semibold ${textPrimary}`}>{formatMoney(under30)}</span>
                    </div>

                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-orange-500" />
                        <span className={textSecondary}>30-60 jours</span>
                      </div>
                      <span className={`font-semibold ${textPrimary}`}>{formatMoney(between30and60)}</span>
                    </div>

                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${hasOverdue ? 'bg-red-500' : 'bg-gray-400'}`} />
                        <span className={hasOverdue ? 'font-medium text-red-600 dark:text-red-400' : textSecondary}>&gt; 60 jours</span>
                      </div>
                      <span className={`font-semibold ${hasOverdue ? 'text-red-600 dark:text-red-400' : textPrimary}`}>{formatMoney(stats.montantOverdue)}</span>
                    </div>
                  </div>

                  {/* Total Separator */}
                  <div className={`pt-3 border-t ${isDark ? 'border-slate-700' : 'border-gray-200'}`}>
                    <div className="flex items-center justify-between">
                      <span className={`text-sm font-semibold ${textPrimary}`}>Total à encaisser</span>
                      <span className={`text-lg font-bold ${textPrimary}`}>{formatMoney(stats.enAttente)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className={`px-6 py-4 border-t ${isDark ? 'border-slate-700' : 'border-gray-100'}`}>
                <button
                  onClick={() => setPage?.('devis')}
                  className={`w-full py-2.5 rounded-lg text-sm font-medium border transition-colors ${isDark ? 'border-slate-600 text-slate-300 hover:bg-slate-700' : 'border-gray-200 text-gray-700 hover:bg-gray-50'}`}
                >
                  Voir factures
                </button>
              </div>
            </div>
          );
        })()}

        {/* ══════════════ WIDGET 4: Activité Récente ══════════════ */}
        <div className={`${cardBg} rounded-xl border shadow-sm hover:shadow-lg transition-all min-h-[300px] flex flex-col`}>
          {/* Header */}
          <div className={`flex items-center justify-between p-4 border-b ${isDark ? 'border-slate-700' : 'border-gray-100'}`}>
            <div className="flex items-center gap-2">
              <Activity size={20} className="text-blue-500" />
              <span className={`font-semibold ${textPrimary}`}>Activité récente</span>
            </div>
          </div>

          {/* Body */}
          <div className="flex-1 p-4 overflow-auto">
            {recentActivity.length > 0 ? (
              <div className="space-y-3">
                {recentActivity.map(activity => (
                  <div key={activity.id} className={`p-3 rounded-lg ${isDark ? 'bg-slate-700/50' : 'bg-gray-50'}`}>
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-lg ${activity.color === 'emerald' ? 'bg-emerald-100 text-emerald-600' : activity.color === 'blue' ? 'bg-blue-100 text-blue-600' : 'bg-purple-100 text-purple-600'}`}>
                        <activity.icon size={14} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium ${textPrimary}`}>{activity.title}</p>
                        <p className={`text-xs ${textMuted}`}>{activity.subtitle}</p>
                        {activity.amount && (
                          <p className={`text-sm font-bold mt-1 ${activity.color === 'emerald' ? 'text-emerald-500' : 'text-blue-500'}`}>
                            {formatMoney(activity.amount)}
                          </p>
                        )}
                      </div>
                      <span className={`text-xs ${textMuted} whitespace-nowrap`}>
                        {(() => {
                          const diff = Date.now() - activity.date.getTime();
                          const hours = Math.floor(diff / 3600000);
                          if (hours < 1) return 'À l\'instant';
                          if (hours < 24) return `Il y a ${hours}h`;
                          return 'Hier';
                        })()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6">
                <Activity size={32} className="mx-auto text-gray-400 mb-2" />
                <p className={`text-sm ${textMuted}`}>Aucune activité récente</p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className={`flex items-center justify-end p-4 border-t ${isDark ? 'border-slate-700' : 'border-gray-100'}`}>
            <button onClick={() => setPage?.('admin')} className="text-sm text-blue-500 hover:text-blue-600 font-medium">
              Voir historique →
            </button>
          </div>
        </div>

        {/* ══════════════ WIDGET 5: Clients Récents ══════════════ */}
        <div className={`${cardBg} rounded-xl border shadow-sm hover:shadow-lg transition-all min-h-[300px] flex flex-col`}>
          {/* Header */}
          <div className={`flex items-center justify-between p-4 border-b ${isDark ? 'border-slate-700' : 'border-gray-100'}`}>
            <div className="flex items-center gap-2">
              <Users size={20} className="text-indigo-500" />
              <span className={`font-semibold ${textPrimary}`}>Clients récents</span>
            </div>
          </div>

          {/* Body */}
          <div className="flex-1 p-4 overflow-auto">
            {safeClients.length > 0 ? (
              <div className="space-y-3">
                {safeClients.slice(0, 3).map(client => {
                  const clientDevis = safeDevis.filter(d => d.client_id === client.id);
                  const clientCA = clientDevis.reduce((s, d) => s + (d.total_ttc || 0), 0);
                  const initials = (client.nom || 'C').split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase();

                  return (
                    <div key={client.id} className={`p-3 rounded-lg ${isDark ? 'bg-slate-700/50' : 'bg-gray-50'}`}>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm" style={{ background: `hsl(${(client.nom || '').charCodeAt(0) * 10}, 60%, 50%)` }}>
                          {initials}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`font-medium ${textPrimary}`}>{client.nom}</p>
                          <p className={`text-xs ${textMuted}`}>📍 {client.ville || 'Non défini'}</p>
                          <p className={`text-xs ${textMuted}`}>CA: {formatMoney(clientCA)} ({clientDevis.length} devis)</p>
                        </div>
                      </div>
                      <div className="flex gap-2 mt-2">
                        {client.telephone && (
                          <a href={`tel:${client.telephone}`} className={`p-1.5 rounded ${isDark ? 'bg-slate-600 hover:bg-slate-500' : 'bg-gray-200 hover:bg-gray-300'}`}>
                            <Phone size={12} />
                          </a>
                        )}
                        {client.email && (
                          <a href={`mailto:${client.email}`} className={`p-1.5 rounded ${isDark ? 'bg-slate-600 hover:bg-slate-500' : 'bg-gray-200 hover:bg-gray-300'}`}>
                            <Mail size={12} />
                          </a>
                        )}
                        <button onClick={() => { setCreateMode?.({ devis: true, client_id: client.id }); setPage?.('devis'); }} className={`p-1.5 rounded ${isDark ? 'bg-slate-600 hover:bg-slate-500' : 'bg-gray-200 hover:bg-gray-300'}`}>
                          <Plus size={12} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-6">
                <Users size={32} className="mx-auto text-gray-400 mb-2" />
                <p className={`text-sm ${textMuted}`}>Aucun client</p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className={`flex items-center justify-between p-4 border-t ${isDark ? 'border-slate-700' : 'border-gray-100'}`}>
            <button onClick={() => setPage?.('clients')} className="px-3 py-1.5 rounded-lg text-sm font-medium text-white bg-indigo-500 hover:bg-indigo-600 transition-colors">
              Ajouter client
            </button>
            <button onClick={() => setPage?.('clients')} className="text-sm text-blue-500 hover:text-blue-600 font-medium">
              Voir tous →
            </button>
          </div>
        </div>

        {/* ══════════════ WIDGET 6: Performance du Mois ══════════════ */}
        <div className={`${cardBg} rounded-xl border shadow-sm hover:shadow-lg transition-all min-h-[300px] flex flex-col`}>
          {/* Header */}
          <div className={`flex items-center justify-between p-4 border-b ${isDark ? 'border-slate-700' : 'border-gray-100'}`}>
            <div className="flex items-center gap-2">
              <Target size={20} className="text-rose-500" />
              <span className={`font-semibold ${textPrimary}`}>Performance {new Date().toLocaleDateString('fr-FR', { month: 'long' })}</span>
            </div>
          </div>

          {/* Body */}
          <div className="flex-1 p-4">
            {/* CA Progress */}
            <div className="mb-4">
              <div className="flex justify-between text-sm mb-1">
                <span className={textSecondary}>Chiffre d'affaires</span>
                <span className={textPrimary}>{Math.min(100, Math.round((stats.totalCA / 40000) * 100))}%</span>
              </div>
              <div className={`h-2 rounded-full ${isDark ? 'bg-slate-700' : 'bg-gray-200'}`}>
                <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${Math.min(100, (stats.totalCA / 40000) * 100)}%` }} />
              </div>
              <p className={`text-xs ${textMuted} mt-1`}>{formatMoney(stats.totalCA)} / 40 000 € objectif</p>
            </div>

            {/* Marge Progress */}
            <div className="mb-4">
              <div className="flex justify-between text-sm mb-1">
                <span className={textSecondary}>Marge moyenne</span>
                <span className={stats.tauxMarge >= 20 ? 'text-emerald-500' : 'text-amber-500'}>{Math.min(150, Math.round((stats.tauxMarge / 20) * 100))}% {stats.tauxMarge >= 20 && '✅'}</span>
              </div>
              <div className={`h-2 rounded-full ${isDark ? 'bg-slate-700' : 'bg-gray-200'}`}>
                <div className={`h-full rounded-full transition-all ${stats.tauxMarge >= 20 ? 'bg-emerald-500' : 'bg-amber-500'}`} style={{ width: `${Math.min(100, (stats.tauxMarge / 20) * 100)}%` }} />
              </div>
              <p className={`text-xs ${textMuted} mt-1`}>{stats.tauxMarge.toFixed(0)}% / 20% objectif</p>
            </div>

            {/* Devis Progress */}
            <div className="mb-4">
              <div className="flex justify-between text-sm mb-1">
                <span className={textSecondary}>Devis envoyés</span>
                <span className={textPrimary}>{Math.min(100, Math.round((stats.thisMonthDevis?.length || 0) / 20 * 100))}%</span>
              </div>
              <div className={`h-2 rounded-full ${isDark ? 'bg-slate-700' : 'bg-gray-200'}`}>
                <div className="h-full rounded-full bg-blue-500 transition-all" style={{ width: `${Math.min(100, (stats.thisMonthDevis?.length || 0) / 20 * 100)}%` }} />
              </div>
              <p className={`text-xs ${textMuted} mt-1`}>{stats.thisMonthDevis?.length || 0} / 20 objectif</p>
            </div>

            {/* Conversion Rate */}
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className={textSecondary}>Taux de conversion</span>
                <span className={stats.tauxConversion >= 50 ? 'text-emerald-500' : 'text-amber-500'}>{Math.round(stats.tauxConversion)}%</span>
              </div>
              <div className={`h-2 rounded-full ${isDark ? 'bg-slate-700' : 'bg-gray-200'}`}>
                <div className={`h-full rounded-full transition-all ${stats.tauxConversion >= 50 ? 'bg-emerald-500' : 'bg-amber-500'}`} style={{ width: `${Math.min(100, stats.tauxConversion * 2)}%` }} />
              </div>
              <p className={`text-xs ${textMuted} mt-1`}>{stats.tauxConversion.toFixed(0)}% / 50% objectif</p>
            </div>

            <div className={`mt-4 p-3 rounded-lg text-center ${stats.tauxConversion >= 40 && stats.tauxMarge >= 15 ? (isDark ? 'bg-emerald-900/30' : 'bg-emerald-50') : (isDark ? 'bg-amber-900/30' : 'bg-amber-50')}`}>
              <p className={`text-sm font-medium ${stats.tauxConversion >= 40 && stats.tauxMarge >= 15 ? 'text-emerald-600' : 'text-amber-600'}`}>
                🎯 {stats.tauxConversion >= 40 && stats.tauxMarge >= 15 ? 'Vous êtes en bonne voie !' : 'Continuez vos efforts !'}
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className={`flex items-center justify-between p-4 border-t ${isDark ? 'border-slate-700' : 'border-gray-100'}`}>
            <button onClick={() => setPage?.('parametres')} className={`px-3 py-1.5 rounded-lg text-sm font-medium ${isDark ? 'bg-slate-700 hover:bg-slate-600 text-white' : 'bg-gray-100 hover:bg-gray-200'}`}>
              Ajuster objectifs
            </button>
            <button onClick={() => setShowRentabilityDashboard(true)} className="text-sm text-blue-500 hover:text-blue-600 font-medium">
              Voir analyses →
            </button>
          </div>
        </div>

        {/* ══════════════ WIDGET 7: Météo Détaillée ══════════════ */}
        {weather && (
          <div className={`${cardBg} rounded-xl border shadow-sm hover:shadow-lg transition-all min-h-[300px] flex flex-col`}>
            {/* Header */}
            <div className={`flex items-center justify-between p-4 border-b ${isDark ? 'border-slate-700' : 'border-gray-100'}`}>
              <div className="flex items-center gap-2">
                <Sun size={20} className="text-amber-500" />
                <span className={`font-semibold ${textPrimary}`}>Météo {weather.city}</span>
              </div>
            </div>

            {/* Body */}
            <div className="flex-1 p-4">
              <div className="text-center mb-4">
                <weather.icon size={48} className="mx-auto text-amber-500 mb-2" />
                <p className={`text-3xl font-bold ${textPrimary}`}>{weather.temp}°C</p>
                <p className={`text-sm ${textSecondary} capitalize`}>{weather.condition === 'sunny' ? 'Ensoleillé' : weather.condition === 'cloudy' ? 'Nuageux' : weather.condition === 'rainy' ? 'Pluvieux' : 'Partiellement nuageux'}</p>
              </div>

              <div className="grid grid-cols-3 gap-2 mb-4">
                <div className={`text-center p-2 rounded-lg ${isDark ? 'bg-slate-700/50' : 'bg-gray-50'}`}>
                  <Thermometer size={14} className="mx-auto mb-1 text-gray-400" />
                  <p className={`text-xs ${textMuted}`}>Ressenti</p>
                  <p className={`text-sm font-medium ${textPrimary}`}>{weather.feelsLike}°C</p>
                </div>
                <div className={`text-center p-2 rounded-lg ${isDark ? 'bg-slate-700/50' : 'bg-gray-50'}`}>
                  <Droplets size={14} className="mx-auto mb-1 text-blue-400" />
                  <p className={`text-xs ${textMuted}`}>Humidité</p>
                  <p className={`text-sm font-medium ${textPrimary}`}>{weather.humidity}%</p>
                </div>
                <div className={`text-center p-2 rounded-lg ${isDark ? 'bg-slate-700/50' : 'bg-gray-50'}`}>
                  <Wind size={14} className="mx-auto mb-1 text-gray-400" />
                  <p className={`text-xs ${textMuted}`}>Vent</p>
                  <p className={`text-sm font-medium ${textPrimary}`}>{weather.wind} km/h</p>
                </div>
              </div>

              <p className={`text-xs font-semibold uppercase tracking-wider ${textMuted} mb-2`}>Prévisions 7 jours</p>
              <div className="flex justify-between">
                {weather.forecast.map((day, i) => (
                  <div key={i} className="text-center">
                    <p className={`text-xs ${textMuted}`}>{day.day}</p>
                    <day.icon size={16} className={`mx-auto my-1 ${day.condition === 'rainy' ? 'text-blue-500' : 'text-amber-500'}`} />
                    <p className={`text-xs font-medium ${textPrimary}`}>{day.temp}°</p>
                  </div>
                ))}
              </div>

              {weather.forecast.some(d => d.condition === 'rainy') && (
                <div className={`mt-3 p-2 rounded-lg ${isDark ? 'bg-amber-900/30' : 'bg-amber-50'} flex items-center gap-2`}>
                  <AlertTriangle size={14} className="text-amber-500" />
                  <span className={`text-xs ${isDark ? 'text-amber-300' : 'text-amber-700'}`}>Pluie prévue - {safeChantiers.filter(c => c.statut === 'en_cours').length} chantiers concernés</span>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className={`flex items-center justify-end p-4 border-t ${isDark ? 'border-slate-700' : 'border-gray-100'}`}>
              <button onClick={() => setPage?.('parametres')} className="text-sm text-blue-500 hover:text-blue-600 font-medium">
                Changer localisation →
              </button>
            </div>
          </div>
        )}

        {/* ══════════════ WIDGET 8: Actions Rapides - Pixel Perfect ══════════════ */}
        <div className={`${cardBg} rounded-xl border shadow-sm hover:shadow-md transition-shadow flex flex-col`}>
          {/* Header - px-6 py-4 */}
          <div className={`flex items-center justify-between px-6 py-4 border-b ${isDark ? 'border-slate-700' : 'border-gray-100'}`}>
            <div className="flex items-center gap-2">
              <Zap size={20} className="text-yellow-500" />
              <h3 className={`text-base font-semibold ${textPrimary}`}>Actions rapides</h3>
            </div>
          </div>

          {/* Body - p-6 */}
          <div className="flex-1 p-6">
            <div className="grid grid-cols-3 gap-4">
              {/* Créer Devis */}
              <button
                onClick={() => { setCreateMode?.({ devis: true }); setPage?.('devis'); }}
                className={`p-4 rounded-xl text-center transition-all hover:shadow-md active:scale-[0.98] ${isDark ? 'bg-slate-800 border border-slate-700 hover:border-slate-600' : 'bg-white border border-gray-200 hover:border-gray-300'}`}
              >
                <div className="w-10 h-10 mx-auto mb-3 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${couleur}15` }}>
                  <FileText size={20} style={{ color: couleur }} />
                </div>
                <p className={`text-sm font-medium ${textPrimary}`}>Devis</p>
              </button>

              {/* Créer Facture */}
              <button
                onClick={() => { setCreateMode?.({ facture: true }); setPage?.('devis'); }}
                className={`p-4 rounded-xl text-center transition-all hover:shadow-md active:scale-[0.98] ${isDark ? 'bg-slate-800 border border-slate-700 hover:border-slate-600' : 'bg-white border border-gray-200 hover:border-gray-300'}`}
              >
                <div className="w-10 h-10 mx-auto mb-3 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                  <Receipt size={20} className="text-emerald-600 dark:text-emerald-400" />
                </div>
                <p className={`text-sm font-medium ${textPrimary}`}>Facture</p>
              </button>

              {/* Ajouter Client */}
              <button
                onClick={() => setPage?.('clients')}
                className={`p-4 rounded-xl text-center transition-all hover:shadow-md active:scale-[0.98] ${isDark ? 'bg-slate-800 border border-slate-700 hover:border-slate-600' : 'bg-white border border-gray-200 hover:border-gray-300'}`}
              >
                <div className="w-10 h-10 mx-auto mb-3 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
                  <Users size={20} className="text-indigo-600 dark:text-indigo-400" />
                </div>
                <p className={`text-sm font-medium ${textPrimary}`}>Client</p>
              </button>

              {/* Planifier Chantier */}
              <button
                onClick={() => setPage?.('chantiers')}
                className={`p-4 rounded-xl text-center transition-all hover:shadow-md active:scale-[0.98] ${isDark ? 'bg-slate-800 border border-slate-700 hover:border-slate-600' : 'bg-white border border-gray-200 hover:border-gray-300'}`}
              >
                <div className="w-10 h-10 mx-auto mb-3 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                  <HardHat size={20} className="text-purple-600 dark:text-purple-400" />
                </div>
                <p className={`text-sm font-medium ${textPrimary}`}>Chantier</p>
              </button>

              {/* Pointage */}
              <button
                onClick={() => setPage?.('planning')}
                className={`p-4 rounded-xl text-center transition-all hover:shadow-md active:scale-[0.98] ${isDark ? 'bg-slate-800 border border-slate-700 hover:border-slate-600' : 'bg-white border border-gray-200 hover:border-gray-300'}`}
              >
                <div className="w-10 h-10 mx-auto mb-3 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                  <Clock size={20} className="text-blue-600 dark:text-blue-400" />
                </div>
                <p className={`text-sm font-medium ${textPrimary}`}>Pointage</p>
              </button>

              {/* Rapports */}
              <button
                onClick={() => setShowRentabilityDashboard(true)}
                className={`p-4 rounded-xl text-center transition-all hover:shadow-md active:scale-[0.98] ${isDark ? 'bg-slate-800 border border-slate-700 hover:border-slate-600' : 'bg-white border border-gray-200 hover:border-gray-300'}`}
              >
                <div className="w-10 h-10 mx-auto mb-3 rounded-lg bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center">
                  <BarChart3 size={20} className="text-rose-600 dark:text-rose-400" />
                </div>
                <p className={`text-sm font-medium ${textPrimary}`}>Rapports</p>
              </button>
            </div>
          </div>

          {/* Footer - px-6 py-4 */}
          <div className={`px-6 py-4 border-t ${isDark ? 'border-slate-700' : 'border-gray-100'}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <kbd className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${isDark ? 'bg-slate-700 text-slate-400' : 'bg-gray-100 text-gray-500'}`}>⌘K</kbd>
                <span className={`text-xs ${textMuted}`}>Recherche rapide</span>
              </div>
            </div>
          </div>
        </div>

        {/* ══════════════ WIDGET 9: Alertes Météo ══════════════ */}
        {user?.id && (
          <WeatherAlertsWidget
            userId={user.id}
            daysAhead={7}
          />
        )}

        </div>
      </div>

      {/* === MODALS === */}

      {/* CA Detail Modal */}
      {showCADetail && (() => {
        const isMonthView = showCADetail === 'month' && selectedMonth;
        const monthData = isMonthView ? stats.caParMois.find(m => m.moisFull === selectedMonth) : null;
        return (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in" onClick={() => { setShowCADetail(null); setSelectedMonth(null); }}>
            <div className={`${isDark ? 'bg-slate-800' : 'bg-white'} rounded-2xl w-full max-w-lg shadow-2xl animate-slide-up max-h-[90vh] overflow-y-auto`} onClick={e => e.stopPropagation()}>
              <div className={`p-5 border-b ${isDark ? 'border-slate-700' : 'border-slate-200'} sticky top-0 ${isDark ? 'bg-slate-800' : 'bg-white'} z-10`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {isMonthView && <button onClick={() => { setShowCADetail('ca'); setSelectedMonth(null); }} className={`p-2 rounded-lg ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-100'}`}><ArrowLeft size={20} className={textPrimary} /></button>}
                    <div className="p-2 rounded-lg" style={{ background: `${couleur}20` }}><DollarSign size={20} style={{ color: couleur }} /></div>
                    <h2 className={`font-bold text-lg ${textPrimary}`}>{isMonthView ? `CA ${monthData?.moisFull}` : 'Détail du Chiffre d\'Affaires'}</h2>
                  </div>
                  <button onClick={() => { setShowCADetail(null); setSelectedMonth(null); }} className={`p-3 rounded-lg min-w-[44px] min-h-[44px] flex items-center justify-center ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-100'}`}><X size={20} className={textPrimary} /></button>
                </div>
              </div>
              <div className="p-5 space-y-5">
                {isMonthView ? (
                  <>
                    <div className={`p-4 rounded-xl text-center ${isDark ? 'bg-slate-700' : 'bg-slate-50'}`}>
                      <p className={`text-sm ${textSecondary}`}>Total HT</p>
                      <p className="text-3xl font-bold" style={{ color: couleur }}>{formatMoney(monthData?.ca || 0)}</p>
                      <p className={`text-sm ${textSecondary} mt-1`}>{monthData?.nbDevis || 0} devis · {monthData?.nbFactures || 0} factures</p>
                    </div>
                    {monthData?.devis?.length > 0 && (
                      <div>
                        <h4 className={`font-semibold mb-3 ${textPrimary}`}>Documents du mois</h4>
                        <div className="space-y-2">
                          {monthData.devis.map(d => (
                            <div key={d.id} onClick={() => { setSelectedDevis?.(d); setPage?.('devis'); setShowCADetail(null); }} className={`flex items-center justify-between p-3 rounded-xl cursor-pointer ${isDark ? 'bg-slate-700 hover:bg-slate-600' : 'bg-slate-50 hover:bg-slate-100'}`}>
                              <div className="flex items-center gap-3">
                                {d.type === 'facture' ? <Receipt size={18} className="text-purple-500" /> : <FileText size={18} className="text-blue-500" />}
                                <div><p className={`font-medium ${textPrimary}`}>{d.numero}</p><p className={`text-xs ${textSecondary}`}>{new Date(d.date).toLocaleDateString('fr-FR')}</p></div>
                              </div>
                              <p className="font-bold" style={{ color: couleur }}>{formatMoney(d.total_ht)}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <div className={`p-4 rounded-xl text-center ${isDark ? 'bg-slate-700' : 'bg-slate-50'}`}>
                      <p className={`text-sm ${textSecondary}`}>Total CA (6 derniers mois)</p>
                      <p className="text-3xl font-bold" style={{ color: couleur }}>{formatMoney(stats.totalCA)}</p>
                    </div>
                    <div>
                      <h4 className={`font-semibold mb-3 ${textPrimary}`}>Répartition</h4>
                      <div className="space-y-3">
                        <div className={`flex items-center justify-between p-3 rounded-xl ${isDark ? 'bg-slate-700' : 'bg-slate-50'}`}><div className="flex items-center gap-3"><CheckCircle size={18} className="text-emerald-500" /><span className={textSecondary}>Devis acceptés</span></div><span className={`font-bold ${textPrimary}`}>{formatMoney(stats.caBreakdown.devisAcceptes)}</span></div>
                        <div className={`flex items-center justify-between p-3 rounded-xl ${isDark ? 'bg-slate-700' : 'bg-slate-50'}`}><div className="flex items-center gap-3"><Receipt size={18} className="text-purple-500" /><span className={textSecondary}>Factures payées</span></div><span className={`font-bold ${textPrimary}`}>{formatMoney(stats.caBreakdown.facturesPaye)}</span></div>
                        <div className={`flex items-center justify-between p-3 rounded-xl ${isDark ? 'bg-slate-700' : 'bg-slate-50'}`}><div className="flex items-center gap-3"><Clock size={18} className="text-amber-500" /><span className={textSecondary}>Factures en attente</span></div><span className={`font-bold ${textPrimary}`}>{formatMoney(stats.caBreakdown.facturesEnCours)}</span></div>
                      </div>
                    </div>
                    <div>
                      <h4 className={`font-semibold mb-3 ${textPrimary}`}>Par mois (cliquez pour détails)</h4>
                      <div className="space-y-2">
                        {stats.caParMois.map((m, i) => (
                          <div key={i} onClick={() => { setSelectedMonth(m.moisFull); setShowCADetail('month'); }} className={`flex items-center justify-between p-3 rounded-xl cursor-pointer ${isDark ? 'bg-slate-700 hover:bg-slate-600' : 'bg-slate-50 hover:bg-slate-100'}`}>
                            <div><p className={`font-medium capitalize ${textPrimary}`}>{m.moisFull}</p><p className={`text-xs ${textSecondary}`}>{m.nbDevis || 0} devis · {m.nbFactures || 0} factures</p></div>
                            <div className="flex items-center gap-2"><p className="font-bold" style={{ color: i === 5 ? couleur : textSecondary }}>{formatMoney(m.ca)}</p><ChevronRight size={16} className={textMuted} /></div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* Encaissé Detail Modal */}
      {showEncaisseDetail && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in" onClick={() => setShowEncaisseDetail(false)}>
          <div className={`${isDark ? 'bg-slate-800' : 'bg-white'} rounded-2xl w-full max-w-lg shadow-2xl animate-slide-up max-h-[90vh] overflow-y-auto`} onClick={e => e.stopPropagation()}>
            <div className={`p-5 border-b ${isDark ? 'border-slate-700' : 'border-slate-200'} sticky top-0 ${isDark ? 'bg-slate-800' : 'bg-white'} z-10`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3"><div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/50"><CheckCircle size={20} className="text-emerald-600 dark:text-emerald-400" /></div><h2 className={`font-bold text-lg ${textPrimary}`}>Factures encaissées</h2></div>
                <button onClick={() => setShowEncaisseDetail(false)} className={`p-3 rounded-lg min-w-[44px] min-h-[44px] flex items-center justify-center ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-100'}`}><X size={20} className={textPrimary} /></button>
              </div>
            </div>
            <div className="p-5 space-y-4">
              <div className={`p-4 rounded-xl text-center ${isDark ? 'bg-emerald-900/30' : 'bg-emerald-50'}`}>
                <p className={`text-sm ${textSecondary}`}>Total encaissé</p>
                <p className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">{formatMoney(stats.encaisse)}</p>
                <p className={`text-sm ${textSecondary} mt-1`}>{stats.facturesPayees.length} facture{stats.facturesPayees.length > 1 ? 's' : ''} payée{stats.facturesPayees.length > 1 ? 's' : ''}</p>
              </div>
              {stats.facturesPayees.length > 0 ? (
                <div className="space-y-2">
                  {[...stats.facturesPayees].sort((a, b) => new Date(b.date) - new Date(a.date)).map(f => {
                    const client = safeClients.find(c => c.id === f.client_id);
                    return (
                      <div key={f.id} onClick={() => { setSelectedDevis?.(f); setPage?.('devis'); setShowEncaisseDetail(false); }} className={`flex items-center justify-between p-3 rounded-xl cursor-pointer ${isDark ? 'bg-slate-700 hover:bg-slate-600' : 'bg-slate-50 hover:bg-slate-100'}`}>
                        <div className="flex items-center gap-3"><Receipt size={18} className="text-emerald-500" /><div><p className={`font-medium ${textPrimary}`}>{f.numero}</p><p className={`text-xs ${textSecondary}`}>{client?.nom || 'Client'} · {new Date(f.date).toLocaleDateString('fr-FR')}</p></div></div>
                        <p className="font-bold text-emerald-600 dark:text-emerald-400">{formatMoney(f.total_ttc)}</p>
                      </div>
                    );
                  })}
                </div>
              ) : (<div className={`text-center py-8 ${textSecondary}`}><Receipt size={32} className="mx-auto mb-2 opacity-30" /><p>Aucune facture encaissée</p></div>)}
            </div>
          </div>
        </div>
      )}

      {/* En Attente Detail Modal */}
      {showEnAttenteDetail && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in" onClick={() => setShowEnAttenteDetail(false)}>
          <div className={`${isDark ? 'bg-slate-800' : 'bg-white'} rounded-2xl w-full max-w-lg shadow-2xl animate-slide-up max-h-[90vh] overflow-y-auto`} onClick={e => e.stopPropagation()}>
            <div className={`p-5 border-b ${isDark ? 'border-slate-700' : 'border-slate-200'} sticky top-0 ${isDark ? 'bg-slate-800' : 'bg-white'} z-10`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3"><div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/50"><Clock size={20} className="text-amber-600 dark:text-amber-400" /></div><h2 className={`font-bold text-lg ${textPrimary}`}>Factures en attente</h2></div>
                <button onClick={() => setShowEnAttenteDetail(false)} className={`p-3 rounded-lg min-w-[44px] min-h-[44px] flex items-center justify-center ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-100'}`}><X size={20} className={textPrimary} /></button>
              </div>
            </div>
            <div className="p-5 space-y-4">
              <div className={`p-4 rounded-xl text-center ${isDark ? 'bg-amber-900/30' : 'bg-amber-50'}`}>
                <p className={`text-sm ${textSecondary}`}>À encaisser</p>
                <p className="text-3xl font-bold text-amber-600 dark:text-amber-400">{formatMoney(stats.enAttente)}</p>
                <p className={`text-sm ${textSecondary} mt-1`}>{stats.facturesEnAttente.length} facture{stats.facturesEnAttente.length > 1 ? 's' : ''} en attente</p>
              </div>
              {stats.facturesEnAttente.length > 0 ? (
                <div className="space-y-2">
                  {[...stats.facturesEnAttente].sort((a, b) => new Date(a.date) - new Date(b.date)).map(f => {
                    const client = safeClients.find(c => c.id === f.client_id);
                    const daysSince = Math.floor((new Date() - new Date(f.date)) / 86400000);
                    const isOverdue = daysSince > 30;
                    return (
                      <div key={f.id} onClick={() => { setSelectedDevis?.(f); setPage?.('devis'); setShowEnAttenteDetail(false); }} className={`flex items-center justify-between p-3 rounded-xl cursor-pointer ${isOverdue ? (isDark ? 'bg-red-900/30 hover:bg-red-900/40' : 'bg-red-50 hover:bg-red-100') : (isDark ? 'bg-slate-700 hover:bg-slate-600' : 'bg-slate-50 hover:bg-slate-100')}`}>
                        <div className="flex items-center gap-3"><Receipt size={18} className={isOverdue ? 'text-red-500' : 'text-amber-500'} /><div><div className="flex items-center gap-2"><p className={`font-medium ${textPrimary}`}>{f.numero}</p>{isOverdue && <span className="px-1.5 py-0.5 text-[10px] font-bold text-white bg-red-500 rounded">{daysSince}j</span>}</div><p className={`text-xs ${textSecondary}`}>{client?.nom || 'Client'} · {new Date(f.date).toLocaleDateString('fr-FR')}</p></div></div>
                        <p className={`font-bold ${isOverdue ? 'text-red-500' : 'text-amber-600 dark:text-amber-400'}`}>{formatMoney(f.total_ttc)}</p>
                      </div>
                    );
                  })}
                </div>
              ) : (<div className={`text-center py-8 ${textSecondary}`}><Receipt size={32} className="mx-auto mb-2 opacity-30" /><p>Aucune facture en attente</p></div>)}
            </div>
          </div>
        </div>
      )}

      {/* Marge Nette Detail Modal */}
      {showMargeDetail && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in" onClick={() => setShowMargeDetail(false)}>
          <div className={`${isDark ? 'bg-slate-800' : 'bg-white'} rounded-2xl w-full max-w-lg shadow-2xl animate-slide-up max-h-[90vh] overflow-y-auto`} onClick={e => e.stopPropagation()}>
            <div className={`p-5 border-b ${isDark ? 'border-slate-700' : 'border-slate-200'} sticky top-0 ${isDark ? 'bg-slate-800' : 'bg-white'} z-10`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg" style={{ background: stats.tauxMarge >= 15 ? '#10b98120' : stats.tauxMarge >= 0 ? '#f59e0b20' : '#ef444420' }}>
                    <TrendingUp size={20} style={{ color: stats.tauxMarge >= 15 ? '#10b981' : stats.tauxMarge >= 0 ? '#f59e0b' : '#ef4444' }} />
                  </div>
                  <h2 className={`font-bold text-lg ${textPrimary}`}>Détail de la Marge</h2>
                </div>
                <button onClick={() => setShowMargeDetail(false)} className={`p-3 rounded-lg min-w-[44px] min-h-[44px] flex items-center justify-center ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-100'}`}><X size={20} className={textPrimary} /></button>
              </div>
            </div>
            <div className="p-5 space-y-5">
              {/* Overview Stats */}
              <div className={`p-4 rounded-xl text-center ${stats.tauxMarge >= 15 ? (isDark ? 'bg-emerald-900/30' : 'bg-emerald-50') : stats.tauxMarge >= 0 ? (isDark ? 'bg-amber-900/30' : 'bg-amber-50') : (isDark ? 'bg-red-900/30' : 'bg-red-50')}`}>
                <p className={`text-sm ${textSecondary}`}>Marge nette globale</p>
                <p className="text-3xl font-bold" style={{ color: stats.tauxMarge >= 15 ? '#10b981' : stats.tauxMarge >= 0 ? '#f59e0b' : '#ef4444' }}>{formatMoney(stats.marge)}</p>
                <p className={`text-xl font-semibold mt-1`} style={{ color: stats.tauxMarge >= 15 ? '#10b981' : stats.tauxMarge >= 0 ? '#f59e0b' : '#ef4444' }}>{stats.tauxMarge.toFixed(1)}%</p>
              </div>

              {/* Breakdown */}
              <div>
                <h4 className={`font-semibold mb-3 ${textPrimary}`}>Calcul de la marge</h4>
                <div className="space-y-2">
                  <div className={`flex items-center justify-between p-3 rounded-xl ${isDark ? 'bg-slate-700' : 'bg-slate-50'}`}>
                    <div className="flex items-center gap-3"><DollarSign size={18} className="text-blue-500" /><span className={textSecondary}>Chiffre d'affaires</span></div>
                    <span className={`font-bold ${textPrimary}`}>{formatMoney(stats.totalCA)}</span>
                  </div>
                  <div className={`flex items-center justify-between p-3 rounded-xl ${isDark ? 'bg-slate-700' : 'bg-slate-50'}`}>
                    <div className="flex items-center gap-3"><Package size={18} className="text-red-500" /><span className={textSecondary}>Dépenses matériaux</span></div>
                    <span className="font-bold text-red-500">-{formatMoney(stats.totalDep)}</span>
                  </div>
                  <div className={`flex items-center justify-between p-3 rounded-xl ${isDark ? 'bg-slate-700' : 'bg-slate-50'}`}>
                    <div className="flex items-center gap-3"><Users size={18} className="text-red-500" /><span className={textSecondary}>Main d'œuvre</span></div>
                    <span className="font-bold text-red-500">-{formatMoney(stats.totalMO)}</span>
                  </div>
                  <div className={`flex items-center justify-between p-3 rounded-xl border-t-2 ${isDark ? 'bg-slate-700 border-slate-600' : 'bg-slate-100 border-slate-300'}`}>
                    <div className="flex items-center gap-3"><TrendingUp size={18} style={{ color: stats.tauxMarge >= 15 ? '#10b981' : stats.tauxMarge >= 0 ? '#f59e0b' : '#ef4444' }} /><span className={`font-semibold ${textPrimary}`}>= Marge nette</span></div>
                    <span className="font-bold text-lg" style={{ color: stats.tauxMarge >= 15 ? '#10b981' : stats.tauxMarge >= 0 ? '#f59e0b' : '#ef4444' }}>{formatMoney(stats.marge)}</span>
                  </div>
                </div>
              </div>

              {/* Chantiers History */}
              <div>
                <h4 className={`font-semibold mb-3 ${textPrimary}`}>Rentabilité par chantier</h4>
                {stats.margesChantiers.length > 0 ? (
                  <div className="space-y-2 max-h-[200px] overflow-y-auto">
                    {stats.margesChantiers.slice(0, 8).map(ch => {
                      const isGood = ch.marge >= 30;
                      const isBad = ch.marge < 0;
                      return (
                        <div key={ch.id} onClick={() => { setSelectedChantier?.(ch.id); setPage?.('chantiers'); setShowMargeDetail(false); }} className={`flex items-center justify-between p-3 rounded-xl cursor-pointer ${isDark ? 'bg-slate-700 hover:bg-slate-600' : 'bg-slate-50 hover:bg-slate-100'}`}>
                          <div className="flex items-center gap-3">
                            <Hammer size={18} className={isBad ? 'text-red-500' : isGood ? 'text-emerald-500' : 'text-amber-500'} />
                            <span className={`font-medium ${textPrimary}`}>{ch.nom}</span>
                          </div>
                          <span className={`font-bold ${isBad ? 'text-red-500' : isGood ? 'text-emerald-500' : 'text-amber-500'}`}>{ch.marge.toFixed(0)}%</span>
                        </div>
                      );
                    })}
                  </div>
                ) : (<div className={`text-center py-4 ${textSecondary}`}><Hammer size={24} className="mx-auto mb-2 opacity-30" /><p>Aucun chantier</p></div>)}
              </div>

              {/* Tips */}
              <div className={`p-4 rounded-xl ${isDark ? 'bg-blue-900/20' : 'bg-blue-50'}`}>
                <div className="flex items-start gap-3">
                  <Info size={18} className="text-blue-500 mt-0.5" />
                  <div>
                    <p className={`font-medium ${isDark ? 'text-blue-300' : 'text-blue-800'}`}>Interprétation</p>
                    <p className={`text-sm mt-1 ${isDark ? 'text-blue-200' : 'text-blue-700'}`}>
                      {stats.tauxMarge >= 30 ? '✅ Excellente rentabilité ! Continuez ainsi.'
                        : stats.tauxMarge >= 15 ? '👍 Bonne rentabilité. Marge de progression possible.'
                        : stats.tauxMarge >= 0 ? '⚠️ Marge faible. Révisez vos tarifs ou réduisez les coûts.'
                        : '🚨 Vous perdez de l\'argent. Action urgente requise.'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Rentability Dashboard Modal */}
      {showRentabilityDashboard && (
        <RentabilityDashboard
          chantiers={chantiers}
          devis={devis}
          depenses={depenses}
          pointages={pointages}
          equipe={equipe}
          ajustements={ajustements}
          modeDiscret={modeDiscret}
          isDark={isDark}
          couleur={couleur}
          onClose={() => setShowRentabilityDashboard(false)}
          onSelectChantier={(id) => {
            setShowRentabilityDashboard(false);
            setSelectedChantier?.(id);
            setPage?.('chantiers');
          }}
        />
      )}

      {/* Accounting Integration Modal */}
      {showAccountingIntegration && (
        <AccountingIntegration
          isOpen={showAccountingIntegration}
          onClose={() => setShowAccountingIntegration(false)}
          devis={devis}
          depenses={depenses}
          clients={clients}
          chantiers={chantiers}
          entreprise={entreprise}
          isDark={isDark}
          couleur={couleur}
        />
      )}
    </div>
  );
}
