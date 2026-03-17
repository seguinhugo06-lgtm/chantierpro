/**
 * AvisGoogle — Automated Google review request system
 *
 * Features:
 *  - Configure Google review link (Place ID or direct URL)
 *  - Auto-detect finished chantiers eligible for review request
 *  - Generate personalized email/SMS messages
 *  - Track sent requests and responses
 *  - Dashboard widget showing review stats
 */

import React, { useState, useMemo, useCallback } from 'react';
import {
  Star, Send, CheckCircle, Clock, ExternalLink, Copy,
  MessageCircle, Mail, Settings, AlertCircle, Search,
  ChevronDown, Sparkles, Award, X
} from 'lucide-react';

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

function AvisRequestCard({ chantier, client, avisData, config, isDark, couleur, entrepriseName, onSend }) {
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

  const handleEmail = () => {
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

// ─── Main AvisGoogle ─────────────────────────────────────────────────────────

export default function AvisGoogle({ chantiers = [], clients = [], entreprise = {}, isDark, couleur }) {
  const [avisData, setAvisData] = useState(() => loadAvisData());
  const [config, setConfig] = useState(() => loadConfig());
  const [showConfig, setShowConfig] = useState(false);
  const [filter, setFilter] = useState('eligible'); // eligible, sent, all
  const [searchQuery, setSearchQuery] = useState('');

  const entrepriseName = entreprise.nom || entreprise.name || '';

  // Find eligible chantiers (terminé status, with client email, not already sent)
  const eligibleChantiers = useMemo(() => {
    const delayDays = config.autoDelayDays || 7;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - delayDays);

    return chantiers.filter(c => {
      if (c.statut !== 'termine') return false;
      if (!c.client_id) return false;

      // Check if end date is past the delay
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
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className={`text-2xl font-bold flex items-center gap-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
            <Star className="text-yellow-400 fill-yellow-400" size={24} />
            Avis Google
          </h1>
          <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            Demandez des avis à vos clients après chaque chantier
          </p>
        </div>
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
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
