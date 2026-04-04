/**
 * Marketing & Reputation — Hub marketing pour artisans BTP
 *
 * Tabs:
 *  - Dashboard: KPIs, actions rapides
 *  - Avis & Reputation: ancien module Avis Google (demandes d'avis)
 *  - Campagnes: (coming soon)
 *  - Acquisition: (coming soon)
 *  - Visibilite: (coming soon)
 */

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  Star, Send, CheckCircle, Clock, ExternalLink, Copy,
  MessageCircle, Mail, Settings, AlertCircle, Search,
  ChevronDown, Sparkles, Award, X, Megaphone,
  LayoutDashboard, ThumbsUp, Rocket, UserPlus, Eye,
  ArrowRight, Wrench, Gift, Tag, Users, Plus, Calendar,
  Trash2, Edit3, Filter, BarChart3
} from 'lucide-react';
import supabase, { isDemo } from '../../supabaseClient';
import { useToast } from '../../context/AppContext';

// ─── Storage helpers ─────────────────────────────────────────────────────────

const STORAGE_KEY = 'cp_avis_google';
const CONFIG_KEY = 'cp_avis_google_config';

function loadAvisData() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch { return []; }
}

function saveAvisData(data) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch {}
}

function loadConfig() {
  try {
    return JSON.parse(localStorage.getItem(CONFIG_KEY) || '{}');
  } catch { return {}; }
}

function saveConfig(config) {
  try { localStorage.setItem(CONFIG_KEY, JSON.stringify(config)); } catch {}
}

// ─── Campaign storage helpers ────────────────────────────────────────────────

const CAMPAIGNS_KEY = 'cp_marketing_campaigns';

function loadCampaigns() {
  try { return JSON.parse(localStorage.getItem(CAMPAIGNS_KEY) || '[]'); } catch { return []; }
}

function saveCampaigns(data) {
  try { localStorage.setItem(CAMPAIGNS_KEY, JSON.stringify(data)); } catch {}
}

// ─── Campaign templates ─────────────────────────────────────────────────────

const CAMPAIGN_TEMPLATES = [
  { id: 'entretien', name: 'Rappel entretien', icon: Wrench, desc: 'Relancez les clients pour un entretien annuel', subject: 'Votre entretien annuel', body: 'Bonjour {prenom_client}, il est temps de planifier l\'entretien de votre {type_chantier}...' },
  { id: 'voeux', name: 'Voeux de saison', icon: Gift, desc: 'Envoyez vos meilleurs voeux', subject: 'Meilleurs voeux !', body: 'Cher(e) {prenom_client}, toute l\'équipe de {nom_entreprise} vous souhaite...' },
  { id: 'promo', name: 'Offre spéciale', icon: Tag, desc: 'Promotion saisonnière', subject: 'Offre spéciale', body: 'Bonjour {prenom_client}, profitez de notre offre...' },
  { id: 'parrainage', name: 'Parrainage', icon: Users, desc: 'Invitez vos clients à recommander', subject: 'Parrainez un ami !', body: 'Bonjour {prenom_client}, recommandez {nom_entreprise} et recevez...' },
];

const DYNAMIC_VARIABLES = [
  { tag: '{prenom_client}', label: 'Prénom client' },
  { tag: '{nom_client}', label: 'Nom client' },
  { tag: '{nom_entreprise}', label: 'Nom entreprise' },
  { tag: '{type_chantier}', label: 'Type chantier' },
];

// ─── Default message templates ───────────────────────────────────────────────

function generateMessage(clientName, entrepriseName, chantierLabel, googleUrl) {
  return `Bonjour ${clientName},

Nous espérons que les travaux réalisés ${chantierLabel ? `pour "${chantierLabel}"` : 'chez vous'} vous ont donné entière satisfaction.

Si c'est le cas, nous serions très reconnaissants si vous pouviez nous laisser un avis sur Google. Cela nous aide énormément et ne prend que 2 minutes :

${googleUrl || '[Configurez votre lien Google Avis dans les paramètres]'}

Merci pour votre confiance !

Cordialement,
${entrepriseName || 'L\'équipe'}`;
}

// ─── Tab config ──────────────────────────────────────────────────────────────

const TABS = [
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { key: 'avis', label: 'Avis & Réputation', icon: ThumbsUp },
  { key: 'campagnes', label: 'Campagnes', icon: Rocket },
  { key: 'parrainage', label: 'Parrainage', icon: Gift },
  { key: 'visibilite', label: 'Visibilité', icon: Eye },
];

// ─── Empty State ─────────────────────────────────────────────────────────────

function EmptyState({ icon: Icon, title, description, isDark }) {
  return (
    <div className={`text-center py-16 rounded-xl border ${isDark ? 'bg-slate-800/50 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
      <Icon size={40} className={`mx-auto mb-3 ${isDark ? 'text-slate-600' : 'text-slate-300'}`} />
      <p className={`text-sm font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
        {title}
      </p>
      <p className={`text-xs mt-1 max-w-md mx-auto ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
        {description}
      </p>
    </div>
  );
}

// ─── Post-Chantier Sequences Widget ─────────────────────────────────────────

function PostChantierSequences({ isDark, couleur }) {
  const cardBg = isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200';
  const textPrimary = isDark ? 'text-white' : 'text-slate-900';
  const textSecondary = isDark ? 'text-slate-400' : 'text-slate-500';

  const executions = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem('cp_post_chantier_executions') || '[]');
    } catch { return []; }
  }, []);

  const scheduled = useMemo(() => executions.filter(e => e.status === 'scheduled'), [executions]);
  const nextAction = useMemo(() => {
    if (scheduled.length === 0) return null;
    return scheduled.reduce((earliest, e) =>
      new Date(e.scheduledDate) < new Date(earliest.scheduledDate) ? e : earliest
    );
  }, [scheduled]);

  // Group by chantierId to count active sequences
  const activeSequences = useMemo(() => {
    const byChantier = {};
    scheduled.forEach(e => { byChantier[e.chantierId] = (byChantier[e.chantierId] || 0) + 1; });
    return Object.keys(byChantier).length;
  }, [scheduled]);

  const formatDate = (iso) => {
    const d = new Date(iso);
    const now = new Date();
    const diffDays = Math.ceil((d - now) / 86400000);
    if (diffDays === 0) return "Aujourd'hui";
    if (diffDays === 1) return 'Demain';
    if (diffDays < 7) return `Dans ${diffDays} jours`;
    return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  };

  return (
    <div className={`rounded-xl border p-4 ${cardBg}`}>
      <div className="flex items-center gap-2 mb-3">
        <Calendar size={16} style={{ color: couleur }} />
        <h3 className={`text-sm font-semibold ${textPrimary}`}>Séquences post-chantier</h3>
      </div>
      {scheduled.length === 0 ? (
        <p className={`text-xs ${textSecondary}`}>
          Aucune séquence active. Les actions se déclenchent automatiquement quand un chantier est marqué comme "Terminé".
        </p>
      ) : (
        <>
          <div className="flex items-center gap-4 mb-3">
            <div>
              <p className={`text-2xl font-bold ${textPrimary}`}>{activeSequences}</p>
              <p className={`text-xs ${textSecondary}`}>séquence{activeSequences > 1 ? 's' : ''} active{activeSequences > 1 ? 's' : ''}</p>
            </div>
            <div className={`w-px h-8 ${isDark ? 'bg-slate-700' : 'bg-slate-200'}`} />
            <div>
              <p className={`text-2xl font-bold ${textPrimary}`}>{scheduled.length}</p>
              <p className={`text-xs ${textSecondary}`}>action{scheduled.length > 1 ? 's' : ''} planifiée{scheduled.length > 1 ? 's' : ''}</p>
            </div>
          </div>
        </>
      )}
      {nextAction && (
        <div className={`rounded-lg p-3 ${isDark ? 'bg-slate-700/50' : 'bg-slate-50'}`}>
          <div className="flex items-center gap-2">
            <Clock size={14} style={{ color: couleur }} />
            <span className={`text-xs font-medium ${textPrimary}`}>Prochaine action</span>
          </div>
          <p className={`text-sm font-medium mt-1 ${textPrimary}`}>{nextAction.label}</p>
          <div className="flex items-center gap-2 mt-1">
            <span className={`text-xs ${textSecondary}`}>{formatDate(nextAction.scheduledDate)}</span>
            <span className={`text-xs px-1.5 py-0.5 rounded-full ${isDark ? 'bg-slate-600 text-slate-300' : 'bg-slate-200 text-slate-600'}`}>
              {nextAction.channel === 'sms' ? 'SMS' : nextAction.channel === 'email' ? 'Email' : nextAction.channel === 'whatsapp' ? 'WhatsApp' : nextAction.channel || 'Email'}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Dashboard Tab ───────────────────────────────────────────────────────────

function MarketingDashboard({ isDark, couleur, onNavigate }) {
  const cardBg = isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200';
  const textPrimary = isDark ? 'text-white' : 'text-slate-900';
  const textSecondary = isDark ? 'text-slate-400' : 'text-slate-500';

  const kpis = [
    { label: 'Note moyenne', value: '4.5', suffix: '★', icon: Star, color: 'text-yellow-500' },
    { label: 'Avis total', value: '12', suffix: '', icon: MessageCircle, color: 'text-blue-500' },
    { label: 'Taux réponse', value: '67', suffix: '%', icon: CheckCircle, color: 'text-green-500' },
    { label: 'Score réputation', value: '8.2', suffix: '/10', icon: Award, color: 'text-purple-500' },
  ];

  const quickActions = [
    { label: 'Demander des avis', description: 'Envoyer une demande d\'avis à vos clients', tab: 'avis', icon: Send },
    { label: 'Créer une campagne', description: 'Lancer une campagne marketing ciblée', tab: 'campagnes', icon: Rocket },
    { label: 'Voir les avis', description: 'Consulter et répondre aux avis reçus', tab: 'avis', icon: Star },
  ];

  return (
    <div className="space-y-6">
      {/* KPI cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {kpis.map((kpi) => (
          <div key={kpi.label} className={`rounded-xl border p-4 ${cardBg}`}>
            <div className="flex items-center gap-2 mb-2">
              <kpi.icon size={16} className={kpi.color} />
              <span className={`text-xs ${textSecondary}`}>{kpi.label}</span>
            </div>
            <p className={`text-2xl font-bold ${textPrimary}`}>
              {kpi.value}<span className="text-base font-medium ml-0.5">{kpi.suffix}</span>
            </p>
          </div>
        ))}
      </div>

      {/* Séquences post-chantier */}
      <PostChantierSequences isDark={isDark} couleur={couleur} />

      {/* Actions rapides */}
      <div>
        <h2 className={`text-sm font-semibold mb-3 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
          Actions rapides
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {quickActions.map((action) => (
            <button
              key={action.label}
              onClick={() => onNavigate(action.tab)}
              className={`rounded-xl border p-4 text-left transition-colors group ${
                isDark ? 'bg-slate-800 border-slate-700 hover:border-slate-600' : 'bg-white border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: `${couleur}15` }}
                >
                  <action.icon size={18} style={{ color: couleur }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    {action.label}
                  </p>
                  <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    {action.description}
                  </p>
                </div>
                <ArrowRight size={16} className={`flex-shrink-0 transition-transform group-hover:translate-x-0.5 ${isDark ? 'text-slate-500' : 'text-slate-400'}`} />
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Config Panel ────────────────────────────────────────────────────────────

function ConfigPanel({ config, setConfig, isDark, onClose }) {
  const [url, setUrl] = useState(config.googleUrl || '');
  const [autoDelay, setAutoDelay] = useState(config.autoDelayDays || 7);

  const handleSave = () => {
    const newConfig = { ...config, googleUrl: url, autoDelayDays: autoDelay };
    setConfig(newConfig);
    saveConfig(newConfig);
    onClose();
  };

  return (
    <div className={`rounded-xl border p-5 ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
          Configuration Google Avis
        </h3>
        <button onClick={onClose} className={`p-1 rounded-lg ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-100'}`}>
          <X size={18} className="text-slate-400" />
        </button>
      </div>

      {/* Google URL */}
      <div className="space-y-4">
        <div>
          <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
            Lien Google Avis
          </label>
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://g.page/r/votre-entreprise/review"
            className={`w-full rounded-lg border px-3 py-2 text-sm ${
              isDark ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-slate-300 text-slate-900'
            }`}
          />
          <p className={`text-xs mt-1 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
            Trouvez votre lien dans Google Business Profile &gt; Demander des avis
          </p>
        </div>

        {/* Auto delay */}
        <div>
          <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
            Délai après fin de chantier
          </label>
          <select
            value={autoDelay}
            onChange={(e) => setAutoDelay(Number(e.target.value))}
            className={`rounded-lg border px-3 py-2 text-sm ${
              isDark ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-slate-300 text-slate-900'
            }`}
          >
            <option value={3}>3 jours</option>
            <option value={5}>5 jours</option>
            <option value={7}>7 jours (recommandé)</option>
            <option value={14}>14 jours</option>
            <option value={30}>30 jours</option>
          </select>
        </div>

        <button
          onClick={handleSave}
          className="w-full py-2 rounded-xl text-sm font-semibold text-white bg-orange-500 hover:bg-orange-600 transition-colors"
        >
          Enregistrer
        </button>
      </div>
    </div>
  );
}

// ─── Avis Request Card ───────────────────────────────────────────────────────

function AvisRequestCard({ chantier, client, avisData, config, isDark, couleur, entrepriseName, onSend, showToast }) {
  const [showMessage, setShowMessage] = useState(false);
  const [copied, setCopied] = useState(false);

  const clientName = client?.nom || client?.name || 'Client';
  const chantierLabel = chantier?.nom || chantier?.adresse || '';
  const googleUrl = config.googleUrl || '';

  const existingAvis = avisData.find(a => a.chantierId === chantier.id);
  const isSent = !!existingAvis;

  const message = useMemo(() =>
    generateMessage(clientName, entrepriseName, chantierLabel, googleUrl),
    [clientName, entrepriseName, chantierLabel, googleUrl]
  );

  const handleCopy = () => {
    navigator.clipboard.writeText(message);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSend = () => {
    onSend(chantier.id, client.id);
    setShowMessage(false);
  };

  const handleEmail = async () => {
    // Try to send via Edge Function first
    if (!isDemo && supabase && client?.email) {
      try {
        const { data, error } = await supabase.functions.invoke('send-email', {
          body: {
            action: 'send_review_request',
            to: client.email,
            subject: `${entrepriseName || 'BatiGesti'} — Votre avis compte !`,
            html: `<p>${message.replace(/\n/g, '<br>')}</p>`,
            from_name: entrepriseName,
          }
        });
        if (!error && data?.success) {
          showToast?.('Demande d\'avis envoyée par email', 'success');
          handleSend();
          return;
        }
      } catch (e) {
        // Edge Function not configured — fallback to mailto
      }
    }

    // Fallback: open mailto
    const subject = encodeURIComponent(`Votre avis nous intéresse — ${entrepriseName || 'BatiGesti'}`);
    const body = encodeURIComponent(message);
    const email = client?.email || '';
    window.open(`mailto:${email}?subject=${subject}&body=${body}`);
    handleSend();
  };

  return (
    <div className={`rounded-xl border p-4 ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className={`font-semibold text-sm ${isDark ? 'text-white' : 'text-slate-900'}`}>
            {clientName}
          </p>
          <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            {chantierLabel}
          </p>
          {chantier.date_fin && (
            <p className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
              Terminé le {new Date(chantier.date_fin).toLocaleDateString('fr-FR')}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {isSent ? (
            <span className={`flex items-center gap-1 text-xs font-medium ${isDark ? 'text-green-400' : 'text-green-600'}`}>
              <CheckCircle size={14} />
              Envoyé
            </span>
          ) : (
            <>
              <button
                onClick={() => setShowMessage(!showMessage)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  isDark ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <MessageCircle size={12} className="inline mr-1" />
                Message
              </button>
              {client?.email && (
                <button
                  onClick={handleEmail}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium text-white transition-colors hover:opacity-90"
                  style={{ backgroundColor: couleur }}
                >
                  <Mail size={12} className="inline mr-1" />
                  Email
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Message preview */}
      {showMessage && (
        <div className="mt-3 space-y-2">
          <textarea
            readOnly
            value={message}
            rows={8}
            className={`w-full rounded-lg border p-3 text-xs ${
              isDark ? 'bg-slate-700 border-slate-600 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-600'
            }`}
          />
          <div className="flex gap-2">
            <button
              onClick={handleCopy}
              className={`flex-1 flex items-center justify-center gap-1 py-2 rounded-lg text-xs font-medium transition-colors ${
                copied
                  ? (isDark ? 'bg-green-900/30 text-green-400' : 'bg-green-100 text-green-700')
                  : isDark ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {copied ? <CheckCircle size={12} /> : <Copy size={12} />}
              {copied ? 'Copié !' : 'Copier'}
            </button>
            <button
              onClick={handleSend}
              className="flex-1 flex items-center justify-center gap-1 py-2 rounded-lg text-xs font-medium text-white transition-colors hover:opacity-90"
              style={{ backgroundColor: couleur }}
            >
              <CheckCircle size={12} />
              Marquer envoyé
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Avis & Reputation Tab (former AvisGoogle content) ──────────────────────

function AvisReputationTab({ chantiers, clients, entreprise, isDark, couleur, showToast }) {
  const [avisData, setAvisData] = useState(() => loadAvisData());
  const [config, setConfig] = useState(() => loadConfig());
  const [showConfig, setShowConfig] = useState(false);
  const [filter, setFilter] = useState('eligible');
  const [searchQuery, setSearchQuery] = useState('');

  const entrepriseName = entreprise.nom || entreprise.name || '';

  const eligibleChantiers = useMemo(() => {
    const delayDays = config.autoDelayDays || 7;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - delayDays);

    return chantiers.filter(c => {
      if (c.statut !== 'termine') return false;
      if (!c.client_id) return false;
      const endDate = c.date_fin ? new Date(c.date_fin) : null;
      if (endDate && endDate > cutoffDate) return false;
      return true;
    });
  }, [chantiers, config.autoDelayDays]);

  const sentIds = useMemo(() => new Set(avisData.map(a => a.chantierId)), [avisData]);

  const displayedChantiers = useMemo(() => {
    let items = filter === 'eligible'
      ? eligibleChantiers.filter(c => !sentIds.has(c.id))
      : filter === 'sent'
        ? eligibleChantiers.filter(c => sentIds.has(c.id))
        : eligibleChantiers;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      items = items.filter(c => {
        const client = clients.find(cl => cl.id === c.client_id);
        return (
          (c.nom || '').toLowerCase().includes(q) ||
          (client?.nom || client?.name || '').toLowerCase().includes(q)
        );
      });
    }

    return items;
  }, [eligibleChantiers, sentIds, filter, searchQuery, clients]);

  const handleSend = useCallback((chantierId, clientId) => {
    const newAvis = {
      chantierId,
      clientId,
      sentAt: new Date().toISOString(),
    };
    const updated = [...avisData, newAvis];
    setAvisData(updated);
    saveAvisData(updated);
  }, [avisData]);

  const pendingCount = eligibleChantiers.filter(c => !sentIds.has(c.id)).length;
  const sentCount = avisData.length;

  return (
    <div className="space-y-4">
      {/* Header row */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
          Demandez des avis à vos clients après chaque chantier
        </p>
        <button
          onClick={() => setShowConfig(!showConfig)}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm border transition-colors ${
            isDark ? 'border-slate-700 text-slate-300 hover:bg-slate-800' : 'border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          <Settings size={14} />
          Configurer
        </button>
      </div>

      {/* Config panel */}
      {showConfig && (
        <ConfigPanel
          config={config}
          setConfig={setConfig}
          isDark={isDark}
          onClose={() => setShowConfig(false)}
        />
      )}

      {/* No Google URL warning */}
      {!config.googleUrl && (
        <div className={`rounded-xl border p-4 flex items-start gap-3 ${
          isDark ? 'bg-amber-900/20 border-amber-800' : 'bg-amber-50 border-amber-200'
        }`}>
          <AlertCircle size={18} className="text-amber-500 mt-0.5 flex-shrink-0" />
          <div>
            <p className={`text-sm font-medium ${isDark ? 'text-amber-400' : 'text-amber-700'}`}>
              Configurez votre lien Google Avis
            </p>
            <p className={`text-xs mt-1 ${isDark ? 'text-amber-500' : 'text-amber-600'}`}>
              Allez dans Google Business Profile, cliquez sur "Demander des avis" et copiez le lien.
            </p>
            <button
              onClick={() => setShowConfig(true)}
              className={`mt-2 text-xs font-medium hover:underline ${isDark ? 'text-amber-400' : 'text-amber-600'}`}
            >
              Configurer maintenant
            </button>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className={`rounded-xl border p-3 ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
          <div className="flex items-center gap-2 mb-1">
            <Clock size={14} className="text-orange-500" />
            <span className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>En attente</span>
          </div>
          <p className={`text-xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{pendingCount}</p>
        </div>
        <div className={`rounded-xl border p-3 ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
          <div className="flex items-center gap-2 mb-1">
            <Send size={14} className="text-green-500" />
            <span className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Envoyés</span>
          </div>
          <p className={`text-xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{sentCount}</p>
        </div>
        <div className={`rounded-xl border p-3 ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
          <div className="flex items-center gap-2 mb-1">
            <Award size={14} className="text-yellow-500" />
            <span className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Éligibles</span>
          </div>
          <p className={`text-xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{eligibleChantiers.length}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        {[
          { id: 'eligible', label: `À envoyer (${pendingCount})`, icon: Clock },
          { id: 'sent', label: `Envoyés (${sentCount})`, icon: CheckCircle },
          { id: 'all', label: 'Tous', icon: Star },
        ].map(f => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              filter === f.id
                ? 'text-white'
                : isDark ? 'bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-700' : 'bg-white text-slate-500 hover:text-slate-700 border border-slate-200'
            }`}
            style={filter === f.id ? { backgroundColor: couleur } : {}}
          >
            <f.icon size={12} />
            {f.label}
          </button>
        ))}

        <div className="flex-1" />

        {/* Search */}
        <div className="relative">
          <Search size={14} className={`absolute left-2.5 top-1/2 -translate-y-1/2 ${isDark ? 'text-slate-500' : 'text-slate-400'}`} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher..."
            className={`pl-8 pr-3 py-1.5 text-xs rounded-lg border w-36 ${
              isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'
            }`}
          />
        </div>
      </div>

      {/* Chantier list */}
      {displayedChantiers.length === 0 ? (
        <div className={`text-center py-12 rounded-xl border ${isDark ? 'bg-slate-800/50 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
          <Star size={40} className={`mx-auto mb-3 ${isDark ? 'text-slate-600' : 'text-slate-300'}`} />
          <p className={`text-sm font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            {filter === 'eligible' ? 'Aucun chantier en attente d\'avis' : filter === 'sent' ? 'Aucun avis envoyé' : 'Aucun chantier éligible'}
          </p>
          <p className={`text-xs mt-1 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
            Les chantiers terminés apparaissent ici après le délai configuré
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {displayedChantiers.map((chantier) => {
            const client = clients.find(c => c.id === chantier.client_id);
            return (
              <AvisRequestCard
                key={chantier.id}
                chantier={chantier}
                client={client}
                avisData={avisData}
                config={config}
                isDark={isDark}
                couleur={couleur}
                entrepriseName={entrepriseName}
                onSend={handleSend}
                showToast={showToast}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Campagnes Tab ──────────────────────────────────────────────────────────

function CampagnesTab({ clients = [], chantiers = [], entreprise = {}, isDark, couleur, showToast, user }) {
  const [campaigns, setCampaigns] = useState(() => loadCampaigns());
  const [showModal, setShowModal] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState(null);

  // Modal form state
  const [formName, setFormName] = useState('');
  const [formSubject, setFormSubject] = useState('');
  const [formBody, setFormBody] = useState('');
  const [formFilter, setFormFilter] = useState('all');
  const [formSelectedClients, setFormSelectedClients] = useState([]);
  const [formSchedule, setFormSchedule] = useState('now');
  const [formScheduleDate, setFormScheduleDate] = useState('');

  const cardBg = isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200';
  const inputBg = isDark ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400' : 'bg-white border-slate-300';
  const textPrimary = isDark ? 'text-white' : 'text-slate-900';
  const textSecondary = isDark ? 'text-slate-400' : 'text-slate-500';

  const entrepriseName = entreprise.nom || entreprise.name || '';

  // Filtered client lists
  const activeClientIds = useMemo(() => {
    const ids = new Set();
    chantiers.forEach(c => {
      if (c.statut === 'en_cours' && c.client_id) ids.add(c.client_id);
    });
    return ids;
  }, [chantiers]);

  const inactiveClientIds = useMemo(() => {
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    const recentClientIds = new Set();
    chantiers.forEach(c => {
      if (c.client_id) {
        const endDate = c.date_fin ? new Date(c.date_fin) : null;
        const startDate = c.date_debut ? new Date(c.date_debut) : null;
        if ((endDate && endDate > sixMonthsAgo) || (startDate && startDate > sixMonthsAgo) || c.statut === 'en_cours') {
          recentClientIds.add(c.client_id);
        }
      }
    });
    return new Set(clients.filter(c => !recentClientIds.has(c.id)).map(c => c.id));
  }, [clients, chantiers]);

  const filteredClients = useMemo(() => {
    if (formFilter === 'active') return clients.filter(c => activeClientIds.has(c.id));
    if (formFilter === 'inactive') return clients.filter(c => inactiveClientIds.has(c.id));
    if (formFilter === 'manual') return clients;
    return clients;
  }, [clients, formFilter, activeClientIds, inactiveClientIds]);

  const recipientCount = useMemo(() => {
    if (formFilter === 'manual') return formSelectedClients.length;
    return filteredClients.length;
  }, [formFilter, filteredClients, formSelectedClients]);

  const resetForm = () => {
    setFormName('');
    setFormSubject('');
    setFormBody('');
    setFormFilter('all');
    setFormSelectedClients([]);
    setFormSchedule('now');
    setFormScheduleDate('');
    setEditingCampaign(null);
  };

  // Escape handler for modal
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && showModal) {
        setShowModal(false);
        resetForm();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [showModal]);

  const openNewCampaign = (template) => {
    resetForm();
    if (template) {
      setFormName(template.name);
      setFormSubject(template.subject);
      setFormBody(template.body);
    }
    setShowModal(true);
  };

  const openEditCampaign = (campaign) => {
    setEditingCampaign(campaign);
    setFormName(campaign.name);
    setFormSubject(campaign.subject);
    setFormBody(campaign.body);
    setFormFilter(campaign.filter || 'all');
    setFormSelectedClients(campaign.selectedClients || []);
    setFormSchedule(campaign.scheduledAt ? 'later' : 'now');
    setFormScheduleDate(campaign.scheduledAt || '');
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!formName.trim() || !formSubject.trim()) return;

    const now = new Date().toISOString();
    const isScheduled = formSchedule === 'later' && formScheduleDate;

    // Determine recipients
    let recipients = [];
    if (formFilter === 'manual') {
      recipients = clients.filter(c => formSelectedClients.includes(c.id) && c.email);
    } else if (formFilter === 'active') {
      recipients = clients.filter(c => activeClientIds.has(c.id) && c.email);
    } else if (formFilter === 'inactive') {
      recipients = clients.filter(c => inactiveClientIds.has(c.id) && c.email);
    } else {
      recipients = clients.filter(c => c.email);
    }

    const campaignData = {
      id: editingCampaign ? editingCampaign.id : `camp_${Date.now()}`,
      name: formName.trim(),
      subject: formSubject.trim(),
      body: formBody.trim(),
      filter: formFilter,
      selectedClients: formFilter === 'manual' ? formSelectedClients : [],
      recipientCount,
      status: isScheduled ? 'programmee' : 'envoyee',
      scheduledAt: isScheduled ? formScheduleDate : null,
      createdAt: editingCampaign ? editingCampaign.createdAt : now,
      sentAt: isScheduled ? null : now,
      stats: editingCampaign ? editingCampaign.stats : { envoyes: recipientCount, ouverts: 0, cliques: 0 },
    };

    let updated;
    if (editingCampaign) {
      updated = campaigns.map(c => c.id === editingCampaign.id ? { ...campaignData, stats: { ...campaignData.stats, envoyes: recipientCount } } : c);
    } else {
      updated = [campaignData, ...campaigns];
    }

    setCampaigns(updated);
    saveCampaigns(updated);
    setShowModal(false);
    resetForm();

    // Send emails via Edge Function if not scheduled and not demo
    if (!isScheduled && !isDemo && supabase && recipients.length > 0) {
      // Save campaign to DB
      supabase.from('campagnes_email').insert({
        entreprise_id: entreprise?.id,
        user_id: user?.id,
        nom: formName.trim(),
        sujet: formSubject.trim(),
        contenu_html: formBody.trim(),
        segment: { type: formFilter },
        statut: 'envoyee',
        sent_at: now,
        stats: { sent: recipients.length, opened: 0, clicked: 0, errors: 0 },
      }).then(() => {}).catch(() => {});

      let sent = 0, errors = 0;
      for (const recipient of recipients) {
        try {
          const { data, error } = await supabase.functions.invoke('send-email', {
            body: {
              action: 'send_campaign',
              to: recipient.email,
              subject: formSubject.trim(),
              html: formBody.trim()
                .replace(/\{prenom_client\}/g, recipient.prenom || '')
                .replace(/\{nom_entreprise\}/g, entrepriseName || '')
                .replace(/\n/g, '<br>'),
              from_name: entrepriseName,
            }
          });
          if (!error && data?.success) {
            sent++;
          } else {
            errors++;
          }
        } catch {
          errors++;
        }
      }

      if (sent > 0) {
        showToast?.(`Campagne envoyée : ${sent} email${sent > 1 ? 's' : ''}${errors > 0 ? `, ${errors} erreur${errors > 1 ? 's' : ''}` : ''}`, 'success');
      } else if (errors > 0) {
        showToast?.('Erreur lors de l\'envoi de la campagne — emails non configurés', 'error');
      }
    } else if (!isScheduled) {
      showToast?.(`Campagne "${formName.trim()}" enregistrée (${recipientCount} destinataires)`, 'success');
    } else {
      showToast?.(`Campagne "${formName.trim()}" programmée`, 'success');
    }
  };

  const handleDelete = (id) => {
    const updated = campaigns.filter(c => c.id !== id);
    setCampaigns(updated);
    saveCampaigns(updated);
  };

  const insertVariable = (tag) => {
    setFormBody(prev => prev + tag);
  };

  const toggleClientSelection = (clientId) => {
    setFormSelectedClients(prev =>
      prev.includes(clientId)
        ? prev.filter(id => id !== clientId)
        : [...prev, clientId]
    );
  };

  const statusLabel = (status) => {
    switch (status) {
      case 'brouillon': return { text: 'Brouillon', color: isDark ? 'text-slate-400 bg-slate-700' : 'text-slate-500 bg-slate-100' };
      case 'programmee': return { text: 'Programmée', color: isDark ? 'text-blue-400 bg-blue-900/30' : 'text-blue-600 bg-blue-50' };
      case 'envoyee': return { text: 'Envoyée', color: isDark ? 'text-green-400 bg-green-900/30' : 'text-green-600 bg-green-50' };
      default: return { text: status, color: '' };
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className={`text-sm ${textSecondary}`}>
          Créez et envoyez des campagnes marketing à vos clients
        </p>
        <button
          onClick={() => openNewCampaign(null)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-colors hover:opacity-90"
          style={{ backgroundColor: couleur }}
        >
          <Plus size={16} />
          Nouvelle campagne
        </button>
      </div>

      {/* Templates */}
      <div>
        <h2 className={`text-sm font-semibold mb-3 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
          Templates
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {CAMPAIGN_TEMPLATES.map((tpl) => {
            const TplIcon = tpl.icon;
            return (
              <div key={tpl.id} className={`rounded-xl border p-4 ${cardBg}`}>
                <div className="flex items-start gap-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: `${couleur}15` }}
                  >
                    <TplIcon size={18} style={{ color: couleur }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-semibold ${textPrimary}`}>{tpl.name}</p>
                    <p className={`text-xs mt-0.5 ${textSecondary}`}>{tpl.desc}</p>
                  </div>
                </div>
                <button
                  onClick={() => openNewCampaign(tpl)}
                  className={`mt-3 w-full py-1.5 rounded-lg text-xs font-medium transition-colors border ${
                    isDark ? 'border-slate-600 text-slate-300 hover:bg-slate-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  Utiliser
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Mes campagnes */}
      <div>
        <h2 className={`text-sm font-semibold mb-3 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
          Mes campagnes
        </h2>
        {campaigns.length === 0 ? (
          <div className={`text-center py-12 rounded-xl border ${isDark ? 'bg-slate-800/50 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
            <Rocket size={40} className={`mx-auto mb-3 ${isDark ? 'text-slate-600' : 'text-slate-300'}`} />
            <p className={`text-sm font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Aucune campagne pour l'instant
            </p>
            <p className={`text-xs mt-1 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
              Créez votre première campagne ou utilisez un template ci-dessus
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {campaigns.map((camp) => {
              const st = statusLabel(camp.status);
              return (
                <div key={camp.id} className={`rounded-xl border p-4 ${cardBg}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className={`text-sm font-semibold ${textPrimary}`}>{camp.name}</p>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${st.color}`}>
                          {st.text}
                        </span>
                      </div>
                      <p className={`text-xs mt-1 ${textSecondary}`}>
                        Objet : {camp.subject}
                      </p>
                      <div className={`flex items-center gap-4 mt-2 text-xs ${textSecondary}`}>
                        <span className="flex items-center gap-1">
                          <Users size={12} />
                          {camp.recipientCount || 0} destinataires
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar size={12} />
                          {camp.sentAt
                            ? new Date(camp.sentAt).toLocaleDateString('fr-FR')
                            : camp.scheduledAt
                              ? `Programmée : ${new Date(camp.scheduledAt).toLocaleDateString('fr-FR')}`
                              : 'Non planifiée'
                          }
                        </span>
                      </div>
                      {/* Stats */}
                      {camp.stats && (
                        <div className="flex items-center gap-4 mt-2">
                          <span className={`flex items-center gap-1 text-xs ${isDark ? 'text-green-400' : 'text-green-600'}`}>
                            <Send size={12} />
                            {camp.stats.envoyes} envoyés
                          </span>
                          <span className={`flex items-center gap-1 text-xs ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>
                            <Mail size={12} />
                            {camp.stats.ouverts} ouverts
                          </span>
                          <span className={`flex items-center gap-1 text-xs ${isDark ? 'text-purple-400' : 'text-purple-600'}`}>
                            <BarChart3 size={12} />
                            {camp.stats.cliques} cliqués
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {camp.status === 'programmee' && (
                        <button
                          onClick={() => openEditCampaign(camp)}
                          className={`p-1.5 rounded-lg transition-colors ${isDark ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-slate-100 text-slate-400'}`}
                          title="Modifier"
                        >
                          <Edit3 size={14} />
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(camp.id)}
                        className={`p-1.5 rounded-lg transition-colors ${isDark ? 'hover:bg-red-900/30 text-slate-400 hover:text-red-400' : 'hover:bg-red-50 text-slate-400 hover:text-red-500'}`}
                        title="Supprimer"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal création/édition */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/50" onClick={() => { setShowModal(false); resetForm(); }} />
          <div role="dialog" aria-modal="true" className={`relative w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl border p-5 sm:p-6 ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
            <div className="flex items-center justify-between mb-5">
              <h3 className={`text-lg font-bold ${textPrimary}`}>
                {editingCampaign ? 'Modifier la campagne' : 'Nouvelle campagne'}
              </h3>
              <button
                onClick={() => { setShowModal(false); resetForm(); }}
                className={`p-1 rounded-lg ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-100'}`}
              >
                <X size={18} className="text-slate-400" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Nom */}
              <div>
                <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  Nom de la campagne
                </label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Ex: Rappel entretien printemps"
                  className={`w-full rounded-lg border px-3 py-2 text-sm ${inputBg}`}
                />
              </div>

              {/* Objet */}
              <div>
                <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  Objet (sujet email)
                </label>
                <input
                  type="text"
                  value={formSubject}
                  onChange={(e) => setFormSubject(e.target.value)}
                  placeholder="Ex: Votre entretien annuel"
                  className={`w-full rounded-lg border px-3 py-2 text-sm ${inputBg}`}
                />
              </div>

              {/* Message */}
              <div>
                <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  Message
                </label>
                <textarea
                  value={formBody}
                  onChange={(e) => setFormBody(e.target.value)}
                  rows={6}
                  placeholder="Rédigez votre message..."
                  className={`w-full rounded-lg border px-3 py-2 text-sm resize-none ${inputBg}`}
                />
                <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                  <span className={`text-xs ${textSecondary}`}>Variables :</span>
                  {DYNAMIC_VARIABLES.map((v) => (
                    <button
                      key={v.tag}
                      onClick={() => insertVariable(v.tag)}
                      className={`px-2 py-0.5 rounded text-xs font-mono transition-colors ${
                        isDark ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {v.tag}
                    </button>
                  ))}
                </div>
              </div>

              {/* Destinataires */}
              <div>
                <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  Destinataires
                </label>
                <div className="flex items-center gap-2 flex-wrap">
                  {[
                    { id: 'all', label: 'Tous les clients' },
                    { id: 'active', label: 'Clients actifs' },
                    { id: 'inactive', label: 'Clients inactifs (6+ mois)' },
                    { id: 'manual', label: 'Sélection manuelle' },
                  ].map((opt) => (
                    <button
                      key={opt.id}
                      onClick={() => { setFormFilter(opt.id); setFormSelectedClients([]); }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                        formFilter === opt.id
                          ? 'text-white'
                          : isDark ? 'bg-slate-700 text-slate-400 hover:text-slate-200' : 'bg-slate-100 text-slate-500 hover:text-slate-700'
                      }`}
                      style={formFilter === opt.id ? { backgroundColor: couleur } : {}}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
                {formFilter === 'manual' && (
                  <div className={`mt-2 rounded-lg border max-h-40 overflow-y-auto ${isDark ? 'border-slate-600' : 'border-slate-200'}`}>
                    {clients.length === 0 ? (
                      <p className={`text-xs p-3 text-center ${textSecondary}`}>Aucun client</p>
                    ) : (
                      clients.map((client) => (
                        <label
                          key={client.id}
                          className={`flex items-center gap-2 px-3 py-2 text-xs cursor-pointer transition-colors ${
                            isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-50'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={formSelectedClients.includes(client.id)}
                            onChange={() => toggleClientSelection(client.id)}
                            className="rounded"
                          />
                          <span className={textPrimary}>{client.nom || client.name || 'Sans nom'}</span>
                          {client.email && (
                            <span className={`${textSecondary}`}>{client.email}</span>
                          )}
                        </label>
                      ))
                    )}
                  </div>
                )}
                <p className={`text-xs mt-1 ${textSecondary}`}>
                  {recipientCount} destinataire{recipientCount > 1 ? 's' : ''}
                </p>
              </div>

              {/* Programmation */}
              <div>
                <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  Programmer l'envoi
                </label>
                <div className="flex items-center gap-3">
                  <label className={`flex items-center gap-1.5 text-xs cursor-pointer ${textPrimary}`}>
                    <input
                      type="radio"
                      name="schedule"
                      value="now"
                      checked={formSchedule === 'now'}
                      onChange={() => setFormSchedule('now')}
                    />
                    Maintenant
                  </label>
                  <label className={`flex items-center gap-1.5 text-xs cursor-pointer ${textPrimary}`}>
                    <input
                      type="radio"
                      name="schedule"
                      value="later"
                      checked={formSchedule === 'later'}
                      onChange={() => setFormSchedule('later')}
                    />
                    Date & heure
                  </label>
                </div>
                {formSchedule === 'later' && (
                  <input
                    type="datetime-local"
                    value={formScheduleDate}
                    onChange={(e) => setFormScheduleDate(e.target.value)}
                    className={`mt-2 rounded-lg border px-3 py-2 text-sm ${inputBg}`}
                  />
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-3 pt-2">
                <button
                  onClick={() => { setShowModal(false); resetForm(); }}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors border ${
                    isDark ? 'border-slate-600 text-slate-300 hover:bg-slate-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  Annuler
                </button>
                <button
                  onClick={handleSave}
                  disabled={!formName.trim() || !formSubject.trim() || recipientCount === 0}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white transition-colors hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ backgroundColor: couleur }}
                >
                  {formSchedule === 'later' ? 'Programmer' : 'Envoyer'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main AvisGoogle (Marketing & Reputation) ───────────────────────────────

export default function AvisGoogle({ chantiers = [], clients = [], entreprise = {}, isDark, couleur, user }) {
  const [activeTab, setActiveTab] = useState('dashboard');
  const { showToast } = useToast();

  const textPrimary = isDark ? 'text-white' : 'text-slate-900';
  const textMuted = isDark ? 'text-slate-400' : 'text-slate-500';

  return (
    <div>
      {/* Header */}
      <div className="mb-5">
        <h1 className={`text-lg sm:text-2xl font-bold flex items-center gap-2 ${textPrimary}`}>
          <Megaphone size={24} style={{ color: couleur }} />
          Marketing & Réputation
        </h1>
        <p className={`text-sm ${textMuted}`}>
          Gérez votre réputation en ligne, lancez des campagnes et développez votre visibilité
        </p>
      </div>

      {/* Tabs */}
      <div className={`inline-flex items-center gap-1 p-1 rounded-2xl mb-6 overflow-x-auto max-w-full ${isDark ? 'bg-slate-800' : 'bg-slate-100'}`}>
        {TABS.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`inline-flex items-center justify-center whitespace-nowrap px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm font-medium transition-all duration-200 rounded-xl ${
                isActive
                  ? 'text-white shadow-sm'
                  : isDark ? 'text-slate-300 hover:text-white hover:bg-slate-700' : 'text-slate-600 hover:text-slate-900 hover:bg-white'
              }`}
              style={isActive ? { backgroundColor: couleur } : undefined}
              aria-label={tab.label}
              title={tab.label}
            >
              <Icon size={16} className="sm:mr-1.5" />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      {activeTab === 'dashboard' && (
        <MarketingDashboard isDark={isDark} couleur={couleur} onNavigate={setActiveTab} />
      )}

      {activeTab === 'avis' && (
        <AvisReputationTab
          chantiers={chantiers}
          clients={clients}
          entreprise={entreprise}
          isDark={isDark}
          couleur={couleur}
          showToast={showToast}
        />
      )}

      {activeTab === 'campagnes' && (
        <CampagnesTab
          clients={clients}
          chantiers={chantiers}
          entreprise={entreprise}
          isDark={isDark}
          couleur={couleur}
          showToast={showToast}
          user={user}
        />
      )}

      {activeTab === 'parrainage' && (
        <div className={`rounded-xl border p-5 ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
          <div className="text-center py-8">
            <Gift size={32} style={{ color: couleur }} className="mx-auto mb-3" />
            <h3 className={`text-lg font-semibold mb-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>Programme de parrainage</h3>
            <p className={`text-sm mb-4 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Récompensez vos clients qui vous recommandent. Chaque parrainage réussi = une réduction sur le prochain devis.
            </p>
            <button className="px-4 py-2 rounded-xl text-sm font-semibold text-white min-h-[44px]" style={{ background: couleur }}>
              Configurer le parrainage
            </button>
          </div>
        </div>
      )}

      {activeTab === 'visibilite' && (
        <EmptyState
          icon={Eye}
          title="Visibilité en ligne"
          description="Optimisez votre présence sur Google Business, les annuaires professionnels et les réseaux sociaux pour attirer plus de clients. Bientôt disponible."
          isDark={isDark}
        />
      )}
    </div>
  );
}
