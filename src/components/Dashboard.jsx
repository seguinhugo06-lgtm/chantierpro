import React, { useState, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend } from 'recharts';
import { TrendingUp, TrendingDown, DollarSign, Clock, AlertCircle, CheckCircle, FileText, Hammer, Calendar, Users, Eye, EyeOff, Plus, ArrowRight, Trophy, AlertTriangle, ChevronRight, Sparkles, Target, Wallet, CreditCard, PiggyBank, Receipt, Send, ArrowUpRight, Star, Medal, Award, HelpCircle, X, Lightbulb, BookOpen, Home, Package, Settings, BarChart3, ArrowLeft, Info, Zap, Shield, TrendingDown as TrendDown, PieChart as PieChartIcon, Activity, Building2 } from 'lucide-react';
import RentabilityDashboard from './RentabilityDashboard';
import AccountingIntegration from './AccountingIntegration';


export default function Dashboard({ chantiers = [], clients = [], devis = [], events = [], depenses = [], pointages = [], equipe = [], ajustements = [], entreprise, getChantierBilan, couleur, modeDiscret, setModeDiscret, setActiveModule, setSelectedChantier, setPage, setSelectedDevis, setCreateMode, isDark, showHelp = false, setShowHelp }) {
  const [todoFilter, setTodoFilter] = useState('all');
  const [showCADetail, setShowCADetail] = useState(null); // 'ca' | 'month' | null
  const [selectedMonth, setSelectedMonth] = useState(null);
  const [helpSection, setHelpSection] = useState('overview');
  const [showEncaisseDetail, setShowEncaisseDetail] = useState(false);
  const [showEnAttenteDetail, setShowEnAttenteDetail] = useState(false);
  const [showMargeDetail, setShowMargeDetail] = useState(false);
  const [showRentabilityDashboard, setShowRentabilityDashboard] = useState(false);
  const [showAccountingIntegration, setShowAccountingIntegration] = useState(false);

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
      items.push({ id: `d-${d.id}`, type: 'devis', icon: FileText, title: `Relancer ${d.numero}`, desc: `${client?.nom || ''} · ${(d.total_ttc || 0).toLocaleString()}€`, priority: days > 7 ? 'urgent' : days > 3 ? 'high' : 'normal', days, action: () => setActiveModule?.('devis') });
    });
    safeDevis.filter(d => d.type === 'facture' && d.statut !== 'payee').forEach(d => {
      const client = safeClients.find(c => c.id === d.client_id), days = Math.floor((now - new Date(d.date)) / 86400000);
      items.push({ id: `f-${d.id}`, type: 'facture', icon: DollarSign, title: `Relancer ${d.numero}`, desc: `${client?.nom || ''} · ${(d.total_ttc || 0).toLocaleString()}€`, priority: days > 30 ? 'urgent' : days > 15 ? 'high' : 'normal', days, action: () => setActiveModule?.('devis') });
    });
    safeChantiers.filter(ch => ch.statut === 'en_cours').forEach(ch => {
      const bilan = getChantierBilan?.(ch.id);
      if (bilan?.tauxMarge !== undefined && bilan.tauxMarge < 10) items.push({ id: `ch-${ch.id}`, type: 'alerte', icon: AlertCircle, title: `Marge faible: ${ch.nom.substring(0, 15)}`, desc: `${bilan.tauxMarge?.toFixed(0)}% de marge`, priority: bilan.tauxMarge < 0 ? 'urgent' : 'high', action: () => { setSelectedChantier?.(ch.id); setPage?.('chantiers'); } });
    });
    return items.sort((a, b) => ({ urgent: 0, high: 1, normal: 2 }[a.priority] - { urgent: 0, high: 1, normal: 2 }[b.priority]));
  }, [safeDevis, safeClients, safeChantiers, getChantierBilan, setActiveModule, setSelectedChantier, setPage]);

  const filteredActions = todoFilter === 'all' ? actions : actions.filter(a => a.type === todoFilter);
  const top3 = stats.margesChantiers.filter(c => c.marge > 0).slice(0, 3);
  const aSurveiller = stats.margesChantiers.filter(c => c.marge < 15);
  const formatMoney = (n) => modeDiscret ? '·····' : `${(n || 0).toLocaleString('fr-FR')} €`;
  const getMargeColor = (m) => m >= 50 ? '#10b981' : m >= 30 ? '#f59e0b' : '#ef4444';

  // KPI Card with click handler
  const KPICard = ({ icon: Icon, label, value, sub, trend, color, onClick, clickable }) => (
    <div
      onClick={onClick}
      className={`rounded-xl sm:rounded-2xl border p-3 sm:p-5 ${cardBg} hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 ${clickable ? 'cursor-pointer' : ''}`}
    >
      <div className="flex items-start justify-between">
        <div className="p-2 sm:p-2.5 rounded-lg sm:rounded-xl" style={{ background: `${color}20` }}><Icon size={18} className="sm:w-[22px] sm:h-[22px]" style={{ color }} /></div>
        <div className="flex items-center gap-2">
          {trend !== undefined && (
            <div className={`flex items-center gap-0.5 sm:gap-1 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-semibold ${trend >= 0 ? (isDark ? 'bg-emerald-900/50 text-emerald-300' : 'bg-emerald-100 text-emerald-800') : (isDark ? 'bg-red-900/50 text-red-300' : 'bg-red-100 text-red-800')}`}>
              {trend >= 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />}{trend >= 0 ? '+' : ''}{trend.toFixed(0)}%
            </div>
          )}
          {clickable && <ChevronRight size={14} className={textMuted} />}
        </div>
      </div>
      <p className={`text-xs sm:text-sm ${textSecondary} mt-2 sm:mt-3`}>{label}</p>
      <p className="text-lg sm:text-2xl font-bold mt-0.5 sm:mt-1" style={{ color }}>{value}</p>
      {sub && <p className={`text-[10px] sm:text-xs ${textSecondary} mt-0.5 sm:mt-1`}>{sub}</p>}
    </div>
  );

  // Help sections content - Complete guide for artisans
  const helpSections = {
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
  };

  // Helper to compute marge modal data
  const getMargeModalData = () => {
    const isMonthView = showCADetail === 'month' && selectedMonth;
    const monthData = isMonthView ? stats.caParMois.find(m => m.moisFull === selectedMonth) : null;
    return { isMonthView, monthData };
  };

  // Render Modal Overlay component
  const ModalOverlay = ({ show, onClose, children }) => {
    if (!show) return null;
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in" onClick={onClose}>
        <div className={`${isDark ? 'bg-slate-800' : 'bg-white'} rounded-2xl w-full max-w-lg shadow-2xl animate-slide-up max-h-[90vh] overflow-y-auto`} onClick={e => e.stopPropagation()}>
          {children}
        </div>
      </div>
    );
  };

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
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className={`text-xl sm:text-2xl font-bold ${textPrimary}`}>Tableau de bord</h1>
          <p className={`text-sm sm:text-base ${textSecondary}`}>Vue d'ensemble de votre activité</p>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
        </div>
      </div>

      {/* KPI Cards - now clickable */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
        <KPICard icon={DollarSign} label="Chiffre d'affaires" value={formatMoney(stats.totalCA)} trend={stats.tendance} color={couleur} onClick={() => setShowCADetail('ca')} clickable />
        <KPICard icon={TrendingUp} label="Marge nette" value={formatMoney(stats.marge)} sub={modeDiscret ? '··%' : `${stats.tauxMarge.toFixed(1)}%`} color={stats.tauxMarge >= 15 ? '#10b981' : stats.tauxMarge >= 0 ? '#f59e0b' : '#ef4444'} onClick={() => setShowMargeDetail(true)} clickable />
        <KPICard icon={CheckCircle} label="Encaissé" value={formatMoney(stats.encaisse)} sub={`${stats.facturesPayees.length} facture${stats.facturesPayees.length > 1 ? 's' : ''}`} color="#10b981" onClick={() => setShowEncaisseDetail(true)} clickable />
        <KPICard icon={Clock} label="En attente" value={formatMoney(stats.enAttente)} sub={`${stats.facturesEnAttente.length} facture${stats.facturesEnAttente.length > 1 ? 's' : ''}`} color="#f59e0b" onClick={() => setShowEnAttenteDetail(true)} clickable />
      </div>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setShowRentabilityDashboard(true)}
          className={`px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2 transition-colors ${isDark ? 'bg-slate-700 hover:bg-slate-600 text-slate-300' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'}`}
        >
          <Activity size={16} style={{ color: couleur }} />
          Analyse rentabilite
        </button>
        <button
          onClick={() => setShowAccountingIntegration(true)}
          className={`px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2 transition-colors ${isDark ? 'bg-slate-700 hover:bg-slate-600 text-slate-300' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'}`}
        >
          <Building2 size={16} style={{ color: couleur }} />
          Comptabilite
        </button>
      </div>

      {/* Devis Pipeline - NEW SECTION */}
      <div className={`${cardBg} rounded-xl sm:rounded-2xl border p-4 sm:p-5`}>
        <div className="flex items-center justify-between mb-4">
          <h3 className={`font-semibold flex items-center gap-2 ${textPrimary}`}>
            <FileText size={18} style={{ color: couleur }} />
            Pipeline des devis
          </h3>
          {stats.tauxConversion > 0 && (
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm ${isDark ? 'bg-emerald-900/30' : 'bg-emerald-50'}`}>
              <Target size={14} className="text-emerald-500" />
              <span className={isDark ? 'text-emerald-400' : 'text-emerald-700'}>
                <strong>{stats.tauxConversion.toFixed(0)}%</strong> taux de conversion
              </span>
            </div>
          )}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {/* Brouillons */}
          <div
            onClick={() => { setPage?.('devis'); }}
            className={`p-4 rounded-xl cursor-pointer transition-all hover:shadow-md hover:-translate-y-0.5 ${isDark ? 'bg-slate-700/50 hover:bg-slate-700' : 'bg-slate-50 hover:bg-slate-100'}`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className={`w-3 h-3 rounded-full bg-slate-400`}></span>
              <span className={`text-2xl font-bold ${textPrimary}`}>{stats.devisPipeline.brouillon.length}</span>
            </div>
            <p className={`text-sm font-medium ${textSecondary}`}>Brouillons</p>
            <p className={`text-xs ${textMuted}`}>À finaliser</p>
          </div>
          {/* Envoyés */}
          <div
            onClick={() => { setPage?.('devis'); }}
            className={`p-4 rounded-xl cursor-pointer transition-all hover:shadow-md hover:-translate-y-0.5 ${isDark ? 'bg-blue-900/30 hover:bg-blue-900/40' : 'bg-blue-50 hover:bg-blue-100'}`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className={`w-3 h-3 rounded-full bg-blue-500`}></span>
              <span className={`text-2xl font-bold ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>{stats.devisPipeline.envoye.length}</span>
            </div>
            <p className={`text-sm font-medium ${isDark ? 'text-blue-300' : 'text-blue-700'}`}>En attente</p>
            <p className={`text-xs ${textMuted}`}>{formatMoney(stats.montantDevisEnAttente)}</p>
          </div>
          {/* Acceptés */}
          <div
            onClick={() => { setPage?.('devis'); }}
            className={`p-4 rounded-xl cursor-pointer transition-all hover:shadow-md hover:-translate-y-0.5 ${isDark ? 'bg-emerald-900/30 hover:bg-emerald-900/40' : 'bg-emerald-50 hover:bg-emerald-100'}`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className={`w-3 h-3 rounded-full bg-emerald-500`}></span>
              <span className={`text-2xl font-bold ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>{stats.devisPipeline.accepte.length}</span>
            </div>
            <p className={`text-sm font-medium ${isDark ? 'text-emerald-300' : 'text-emerald-700'}`}>Acceptés</p>
            <p className={`text-xs ${textMuted}`}>Signés</p>
          </div>
          {/* Refusés */}
          <div
            onClick={() => { setPage?.('devis'); }}
            className={`p-4 rounded-xl cursor-pointer transition-all hover:shadow-md hover:-translate-y-0.5 ${isDark ? 'bg-red-900/30 hover:bg-red-900/40' : 'bg-red-50 hover:bg-red-100'}`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className={`w-3 h-3 rounded-full bg-red-500`}></span>
              <span className={`text-2xl font-bold ${isDark ? 'text-red-400' : 'text-red-600'}`}>{stats.devisPipeline.refuse.length}</span>
            </div>
            <p className={`text-sm font-medium ${isDark ? 'text-red-300' : 'text-red-700'}`}>Refusés</p>
            <p className={`text-xs ${textMuted}`}>Perdus</p>
          </div>
        </div>
        {/* Overdue Alert */}
        {stats.facturesOverdue.length > 0 && (
          <div className={`mt-4 p-3 rounded-xl flex items-center justify-between ${isDark ? 'bg-red-900/30 border border-red-800' : 'bg-red-50 border border-red-200'}`}>
            <div className="flex items-center gap-3">
              <AlertTriangle size={18} className="text-red-500" />
              <div>
                <p className={`font-medium text-sm ${isDark ? 'text-red-300' : 'text-red-700'}`}>
                  {stats.facturesOverdue.length} facture{stats.facturesOverdue.length > 1 ? 's' : ''} en retard (+30j)
                </p>
                <p className={`text-xs ${isDark ? 'text-red-400' : 'text-red-600'}`}>{formatMoney(stats.montantOverdue)} à relancer</p>
              </div>
            </div>
            <button onClick={() => setShowEnAttenteDetail(true)} className="px-3 py-1.5 bg-red-500 text-white text-sm rounded-lg hover:bg-red-600 transition-colors">
              Voir
            </button>
          </div>
        )}
      </div>

      {/* Today's Events - Quick view */}
      {(() => {
        const today = new Date().toISOString().split('T')[0];
        const todayEvents = events.filter(e => e.date === today);
        const tomorrowDate = new Date(Date.now() + 86400000).toISOString().split('T')[0];
        const tomorrowEvents = events.filter(e => e.date === tomorrowDate);
        const upcomingEvents = [...todayEvents.map(e => ({ ...e, isToday: true })), ...tomorrowEvents.map(e => ({ ...e, isToday: false }))].slice(0, 3);

        if (upcomingEvents.length > 0) {
          return (
            <div className={`${cardBg} rounded-xl sm:rounded-2xl border p-4 sm:p-5`}>
              <div className="flex items-center justify-between mb-3">
                <h3 className={`font-semibold flex items-center gap-2 ${textPrimary}`}>
                  <Calendar size={18} style={{ color: couleur }} />
                  Agenda du jour
                </h3>
                <button onClick={() => setPage?.('planning')} className={`text-xs px-3 py-1.5 rounded-lg ${isDark ? 'bg-slate-700 hover:bg-slate-600' : 'bg-slate-100 hover:bg-slate-200'} ${textSecondary}`}>
                  Voir tout
                </button>
              </div>
              <div className="flex gap-3 overflow-x-auto pb-1">
                {upcomingEvents.map(ev => {
                  const typeColors = {
                    rdv: { bg: isDark ? 'bg-blue-900/30' : 'bg-blue-50', text: isDark ? 'text-blue-300' : 'text-blue-700', icon: '📅' },
                    chantier: { bg: isDark ? 'bg-emerald-900/30' : 'bg-emerald-50', text: isDark ? 'text-emerald-300' : 'text-emerald-700', icon: '🏗️' },
                    relance: { bg: isDark ? 'bg-amber-900/30' : 'bg-amber-50', text: isDark ? 'text-amber-300' : 'text-amber-700', icon: '📞' },
                    urgence: { bg: isDark ? 'bg-red-900/30' : 'bg-red-50', text: isDark ? 'text-red-300' : 'text-red-700', icon: '🚨' },
                    autre: { bg: isDark ? 'bg-slate-700' : 'bg-slate-100', text: textSecondary, icon: '📌' }
                  };
                  const style = typeColors[ev.type] || typeColors.autre;
                  return (
                    <div key={ev.id} onClick={() => setPage?.('planning')} className={`flex-shrink-0 w-48 sm:w-56 p-3 rounded-xl cursor-pointer transition-all hover:shadow-md hover:-translate-y-0.5 ${style.bg}`}>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-lg">{style.icon}</span>
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${ev.isToday ? 'bg-emerald-500 text-white' : (isDark ? 'bg-slate-600 text-slate-300' : 'bg-slate-200 text-slate-600')}`}>
                          {ev.isToday ? "Aujourd'hui" : 'Demain'}
                        </span>
                        {ev.time && <span className={`text-xs ${textMuted}`}>{ev.time}</span>}
                      </div>
                      <p className={`font-medium text-sm truncate ${style.text}`}>{ev.title}</p>
                      {ev.description && <p className={`text-xs truncate mt-1 ${textMuted}`}>{ev.description}</p>}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        }
        return null;
      })()}

      {/* Charts */}
      <div className="grid lg:grid-cols-2 gap-4 sm:gap-6">
        <div className={`rounded-xl sm:rounded-2xl border p-3 sm:p-5 ${cardBg}`}>
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <h3 className={`font-medium sm:font-semibold flex items-center gap-2 text-sm sm:text-base ${textPrimary}`}><DollarSign size={16} style={{ color: couleur }} />CA sur 6 mois</h3>
            <button onClick={() => setShowCADetail('ca')} className={`text-xs px-2 py-1 rounded-lg ${isDark ? 'bg-slate-700 hover:bg-slate-600' : 'bg-slate-100 hover:bg-slate-200'} ${textSecondary}`}>
              Voir détails
            </button>
          </div>
          {!modeDiscret ? (
            <ResponsiveContainer width="100%" height={180} className="sm:!h-[220px]">
              <BarChart data={stats.caParMois}>
                <XAxis dataKey="mois" axisLine={false} tickLine={false} tick={{ fill: isDark ? '#94a3b8' : '#64748b', fontSize: 10 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: isDark ? '#94a3b8' : '#64748b', fontSize: 10 }} tickFormatter={v => `${(v/1000).toFixed(0)}k`} domain={[0, 'auto']} width={35} />
                <Tooltip formatter={(v) => [`${v.toLocaleString()} €`, 'CA']} contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.15)', background: isDark ? '#1e293b' : '#fff', color: isDark ? '#fff' : '#000' }} />
                <Bar dataKey="ca" radius={[6, 6, 0, 0]} onClick={(data) => { setSelectedMonth(data.moisFull); setShowCADetail('month'); }} cursor="pointer">
                  {stats.caParMois.map((e, i) => <Cell key={i} fill={e.fill} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : <div className={`h-[180px] sm:h-[220px] flex items-center justify-center ${textSecondary}`}><EyeOff size={24} className="mr-2" />Masqué</div>}
        </div>

        {/* Improved Rentability Section */}
        <div className={`rounded-xl sm:rounded-2xl border p-3 sm:p-5 ${cardBg}`}>
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <h3 className={`font-medium sm:font-semibold flex items-center gap-2 text-sm sm:text-base ${textPrimary}`}>
              <div className="p-1.5 sm:p-2 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600">
                <TrendingUp size={14} className="text-white sm:w-4 sm:h-4" />
              </div>
              Rentabilité par chantier
            </h3>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowRentabilityDashboard(true)}
                className={`text-xs px-2 py-1 rounded-lg flex items-center gap-1.5 ${isDark ? 'bg-slate-700 hover:bg-slate-600' : 'bg-slate-100 hover:bg-slate-200'} ${textSecondary}`}
              >
                <Activity size={12} />
                Analyse
              </button>
              <button onClick={() => { setShowHelp(true); setHelpSection('rentabilite'); }} className={`p-1.5 rounded-lg ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-100'}`} title="Comprendre la rentabilité">
                <HelpCircle size={14} className={textMuted} />
              </button>
            </div>
          </div>

          {modeDiscret ? (
            <div className={`h-[180px] sm:h-[220px] flex items-center justify-center ${textSecondary}`}><EyeOff size={24} className="mr-2" />Masqué</div>
          ) : stats.margesChantiers.length === 0 ? (
            <div className={`h-[180px] sm:h-[220px] flex flex-col items-center justify-center ${textSecondary}`}>
              <Hammer size={32} className="mb-2 opacity-30" />
              <p className="text-sm">Aucun chantier</p>
            </div>
          ) : (
            <div className="space-y-2 sm:space-y-3 max-h-[180px] sm:max-h-[220px] overflow-y-auto pr-1">
              {stats.margesChantiers.slice(0, 6).map((ch, idx) => {
                const isPositive = ch.marge >= 0;
                const isGood = ch.marge >= 30;
                const isWarning = ch.marge >= 0 && ch.marge < 15;
                const isBad = ch.marge < 0;
                return (
                  <div
                    key={ch.id}
                    onClick={() => { setSelectedChantier?.(ch.id); setPage?.('chantiers'); }}
                    className={`group p-2.5 sm:p-3 rounded-xl cursor-pointer transition-all duration-200 border hover:-translate-y-0.5 ${
                      isDark
                        ? `border-slate-700 hover:border-slate-600 ${isBad ? 'bg-red-900/20' : isGood ? 'bg-emerald-900/10' : 'bg-slate-800/50'}`
                        : `border-slate-100 hover:border-slate-200 ${isBad ? 'bg-red-50' : isGood ? 'bg-emerald-50/50' : 'bg-slate-50/50'}`
                    } hover:shadow-md`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        {idx === 0 && isGood && <Medal size={14} className="text-yellow-500 flex-shrink-0" />}
                        {isBad && <AlertTriangle size={14} className="text-red-500 flex-shrink-0" />}
                        <span className={`text-sm font-medium ${textPrimary} truncate`}>{ch.nom}</span>
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                        isBad ? (isDark ? 'bg-red-900/50 text-red-400' : 'bg-red-100 text-red-700')
                        : isGood ? (isDark ? 'bg-emerald-900/50 text-emerald-400' : 'bg-emerald-100 text-emerald-700')
                        : (isDark ? 'bg-amber-900/50 text-amber-400' : 'bg-amber-100 text-amber-700')
                      }`}>
                        {ch.marge.toFixed(0)}%
                      </span>
                    </div>
                    <div className="relative h-2 rounded-full overflow-hidden bg-slate-200 dark:bg-slate-600">
                      <div
                        className={`absolute left-0 top-0 h-full rounded-full transition-all ${
                          isBad ? 'bg-gradient-to-r from-red-500 to-red-400'
                          : isGood ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
                          : 'bg-gradient-to-r from-amber-500 to-orange-400'
                        }`}
                        style={{ width: `${Math.min(Math.max(ch.marge, 0), 100)}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between mt-2 text-xs">
                      <span className={textMuted}>CA: {formatMoney(ch.caHT || 0)}</span>
                      <span className={`font-medium ${isBad ? 'text-red-500' : isGood ? 'text-emerald-500' : 'text-amber-500'}`}>
                        {isPositive ? '+' : ''}{formatMoney(ch.marge * (ch.caHT || 0) / 100)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Actions + Top/Flop */}
      <div className="grid lg:grid-cols-3 gap-4 sm:gap-6">
        <div className={`lg:col-span-2 rounded-xl sm:rounded-2xl border p-3 sm:p-5 ${cardBg}`}>
          <div className="flex items-center justify-between mb-3 sm:mb-4 flex-wrap gap-2">
            <h3 className={`font-medium sm:font-semibold flex items-center gap-2 text-sm sm:text-base ${textPrimary}`}><AlertCircle size={16} style={{ color: couleur }} />À faire{actions.length > 0 && <span className="px-1.5 sm:px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-bold text-white" style={{ background: couleur }}>{actions.length}</span>}</h3>
            <div className="flex gap-1 overflow-x-auto pb-1 -mb-1">{[['all', 'Tout'], ['devis', 'Devis'], ['facture', 'Fact.'], ['alerte', 'Alert.']].map(([k, v]) => <button key={k} onClick={() => setTodoFilter(k)} className={`px-2 sm:px-3 py-1 rounded-lg text-[10px] sm:text-xs font-medium whitespace-nowrap min-h-[32px] ${todoFilter === k ? 'text-white' : (isDark ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-600')}`} style={todoFilter === k ? { background: couleur } : {}}>{v}</button>)}</div>
          </div>
          {filteredActions.length === 0 ? (
            <div className={`rounded-xl sm:rounded-2xl p-6 sm:p-8 text-center border ${isDark ? 'bg-emerald-900/20 border-emerald-800' : 'bg-emerald-50 border-emerald-200'}`}><div className={`w-12 sm:w-16 h-12 sm:h-16 mx-auto mb-3 sm:mb-4 rounded-full flex items-center justify-center ${isDark ? 'bg-emerald-900/50' : 'bg-emerald-100'}`}><CheckCircle size={24} className={`sm:w-8 sm:h-8 ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`} /></div><h4 className={`text-base sm:text-lg font-semibold ${isDark ? 'text-emerald-300' : 'text-emerald-800'}`}>Tout est à jour !</h4></div>
          ) : (
            <div className="space-y-2 max-h-[240px] sm:max-h-[280px] overflow-y-auto">{filteredActions.map(a => {
              const pBg = a.priority === 'urgent' ? (isDark ? 'bg-red-900/30' : 'bg-red-50') : a.priority === 'high' ? (isDark ? 'bg-orange-900/30' : 'bg-orange-50') : (isDark ? 'bg-slate-800' : 'bg-white');
              const pBorder = a.priority === 'urgent' ? 'border-l-4 border-red-500' : a.priority === 'high' ? 'border-l-4 border-orange-400' : 'border-l-4 border-slate-200';
              const iconBg = a.priority === 'urgent' ? (isDark ? 'bg-red-900/50' : 'bg-red-100') : a.priority === 'high' ? (isDark ? 'bg-orange-900/50' : 'bg-orange-100') : (isDark ? 'bg-slate-700' : 'bg-slate-100');
              const iconColor = a.priority === 'urgent' ? (isDark ? 'text-red-400' : 'text-red-600') : a.priority === 'high' ? (isDark ? 'text-orange-400' : 'text-orange-600') : 'text-slate-500';
              return (
                <div key={a.id} onClick={a.action} className={`group flex items-center gap-2 sm:gap-4 p-2.5 sm:p-4 rounded-lg sm:rounded-xl cursor-pointer hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 min-h-[52px] ${pBorder} ${pBg}`}>
                  <div className={`w-8 sm:w-10 h-8 sm:h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${iconBg}`}><a.icon size={16} className={`sm:w-5 sm:h-5 ${iconColor}`} /></div>
                  <div className="flex-1 min-w-0"><div className="flex items-center gap-1.5 sm:gap-2"><p className={`text-sm sm:text-base font-medium truncate ${textPrimary}`}>{a.title}</p>{a.priority === 'urgent' && <span className="px-1.5 sm:px-2 py-0.5 text-[10px] sm:text-xs font-bold text-white rounded bg-red-500 animate-pulse">URGENT</span>}</div><p className={`text-xs sm:text-sm ${textSecondary} truncate`}>{a.desc}</p></div>
                  {a.days !== undefined && <span className={`text-[10px] sm:text-xs ${textSecondary} flex-shrink-0`}>{a.days}j</span>}
                </div>
              );
            })}</div>
          )}
        </div>

        <div className="space-y-3 sm:space-y-4">
          <div className={`rounded-xl sm:rounded-2xl border p-3 sm:p-5 ${cardBg}`}>
            <h3 className={`font-medium sm:font-bold mb-3 sm:mb-4 flex items-center gap-2 text-sm sm:text-base ${textPrimary}`}><Trophy size={16} className="text-yellow-500" /> Top Rentabilité</h3>
            {top3.length === 0 ? <p className={`text-center text-sm ${textSecondary} py-3 sm:py-4`}>Aucun chantier</p> : top3.map((ch, i) => (
              <div key={ch.id} onClick={() => { setSelectedChantier?.(ch.id); setPage?.('chantiers'); }} className={`flex items-center justify-between p-2 sm:p-3 rounded-lg sm:rounded-xl cursor-pointer transition-colors min-h-[44px] ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-50'}`}>
                <div className="flex items-center gap-2 sm:gap-3 min-w-0"><span className="text-base sm:text-xl">{i === 0 ? <Medal size={18} className="text-yellow-500" /> : i === 1 ? <Medal size={18} className="text-slate-400" /> : <Medal size={18} className="text-amber-600" />}</span><p className={`font-medium text-xs sm:text-sm ${textPrimary} truncate`}>{ch.nom}</p></div>
                <span className="font-bold text-sm sm:text-base flex-shrink-0 ml-2" style={{ color: getMargeColor(ch.marge) }}>{ch.marge.toFixed(0)}%</span>
              </div>
            ))}
          </div>
          {aSurveiller.length > 0 && (
            <div className={`rounded-xl sm:rounded-2xl border p-3 sm:p-5 ${isDark ? 'bg-red-900/20 border-red-800' : 'bg-red-50 border-red-200'}`}>
              <h3 className={`font-medium sm:font-bold mb-3 sm:mb-4 flex items-center gap-2 text-sm sm:text-base ${isDark ? 'text-red-300' : 'text-red-800'}`}><AlertTriangle size={16} /> À surveiller</h3>
              {aSurveiller.slice(0, 3).map(ch => (
                <div key={ch.id} onClick={() => { setSelectedChantier?.(ch.id); setPage?.('chantiers'); }} className={`flex items-center justify-between p-2 sm:p-3 rounded-lg sm:rounded-xl mb-2 cursor-pointer hover:shadow-sm border min-h-[44px] ${isDark ? 'bg-slate-800 border-red-900' : 'bg-white border-red-100'}`}>
                  <p className={`font-medium text-xs sm:text-sm ${isDark ? 'text-red-300' : 'text-red-800'} truncate`}>{ch.nom}</p>
                  <span className={`text-xs font-bold flex-shrink-0 ml-2 ${isDark ? 'text-red-400' : 'text-red-600'}`}>{ch.marge.toFixed(0)}%</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-4">
        {[{ icon: FileText, label: 'Nouveau devis', labelShort: 'Devis', sub: `${stats.devisEnAttente} en attente`, color: '#3b82f6', target: 'devis', create: 'devis' }, { icon: Hammer, label: 'Nouveau chantier', labelShort: 'Chantier', sub: `${stats.chantiersActifs} actifs`, color: couleur, target: 'chantiers', create: 'chantier' }, { icon: Users, label: 'Nouveau client', labelShort: 'Client', sub: `${safeClients.length} clients`, color: '#10b981', target: 'clients', create: 'client' }, { icon: Calendar, label: 'Planning', labelShort: 'Agenda', sub: 'Voir agenda', color: '#8b5cf6', target: 'planning' }].map(b => (
          <button key={b.target} onClick={() => { if (b.create && setCreateMode) setCreateMode(p => ({...p, [b.create]: true})); setPage?.(b.target); }} className={`group flex flex-col items-center gap-1.5 sm:gap-2 p-3 sm:p-4 rounded-xl border hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 min-h-[80px] sm:min-h-[100px] ${cardBg}`}>
            <div className="p-2 rounded-lg transition-colors group-hover:scale-110" style={{ background: `${b.color}15` }}><b.icon size={18} className="sm:w-5 sm:h-5 transition-transform" style={{ color: b.color }} /></div>
            <span className={`text-xs sm:text-sm font-medium text-center ${textPrimary}`}><span className="sm:hidden">{b.labelShort}</span><span className="hidden sm:inline">{b.label}</span></span>
            <span className={`text-[10px] sm:text-xs ${textSecondary} text-center`}>{b.sub}</span>
          </button>
        ))}
      </div>

      {/* === MODALS (rendered as overlays to keep dashboard visible) === */}

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
                  <button onClick={() => { setShowCADetail(null); setSelectedMonth(null); }} className={`p-2 rounded-lg ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-100'}`}><X size={20} className={textPrimary} /></button>
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
                <button onClick={() => setShowEncaisseDetail(false)} className={`p-2 rounded-lg ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-100'}`}><X size={20} className={textPrimary} /></button>
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
                <button onClick={() => setShowEnAttenteDetail(false)} className={`p-2 rounded-lg ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-100'}`}><X size={20} className={textPrimary} /></button>
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
                <button onClick={() => setShowMargeDetail(false)} className={`p-2 rounded-lg ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-100'}`}><X size={20} className={textPrimary} /></button>
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
