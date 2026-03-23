/**
 * AvisGoogle — Automated Google review request system
 *
 * Features:
 *  - Configure Google review link (Place ID or direct URL)
 *  - Custom message templates with dynamic variables
 *  - Auto-relance (follow-up) toggle and delay
 *  - Auto-detect finished chantiers eligible for review request
 *  - Generate personalized email/SMS messages
 *  - Track sent requests and responses
 *  - "Avis recus" section: manually log reviews, stats, response suggestions
 */

import React, { useState, useMemo, useCallback, useRef } from 'react';
import {
  Star, Send, CheckCircle, Clock, ExternalLink, Copy,
  MessageCircle, Mail, Settings, AlertCircle, Search,
  ChevronDown, Sparkles, Award, X, Plus, BarChart3,
  RefreshCw, ThumbsUp, ThumbsDown, Trash2, Edit3,
  ToggleLeft, ToggleRight, Calendar, User
} from 'lucide-react';

// ─── Storage helpers ─────────────────────────────────────────────────────────

const STORAGE_KEY = 'cp_avis_google';
const CONFIG_KEY = 'cp_avis_google_config';
const REVIEWS_KEY = 'cp_marketing_reviews';

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

function loadReviews() {
  try { return JSON.parse(localStorage.getItem(REVIEWS_KEY) || '[]'); } catch { return []; }
}

function saveReviews(reviews) {
  try { localStorage.setItem(REVIEWS_KEY, JSON.stringify(reviews)); } catch {}
}

// ─── Constants ───────────────────────────────────────────────────────────────

const DEFAULT_MESSAGE = 'Bonjour {prenom_client}, merci d\'avoir fait confiance a {nom_entreprise} pour votre {type_chantier}. Votre avis compte ! Laissez-nous un avis : {lien_avis}';

const DEFAULT_RELANCE_MESSAGE = 'Bonjour {prenom_client}, nous vous avions contacte suite a vos travaux de {type_chantier} avec {nom_entreprise}. Si vous avez 2 minutes, votre avis nous aiderait beaucoup : {lien_avis} Merci !';

const TEMPLATE_VARIABLES = [
  { key: '{prenom_client}', label: 'Prenom client' },
  { key: '{nom_client}', label: 'Nom client' },
  { key: '{nom_entreprise}', label: 'Nom entreprise' },
  { key: '{type_chantier}', label: 'Type chantier' },
  { key: '{lien_avis}', label: 'Lien avis' },
  { key: '{telephone}', label: 'Telephone' },
];

function resolveTemplate(template, vars) {
  let msg = template || '';
  msg = msg.replace(/\{prenom_client\}/g, vars.prenomClient || 'Client');
  msg = msg.replace(/\{nom_client\}/g, vars.nomClient || 'Client');
  msg = msg.replace(/\{nom_entreprise\}/g, vars.nomEntreprise || '');
  msg = msg.replace(/\{type_chantier\}/g, vars.typeChantier || 'chantier');
  msg = msg.replace(/\{lien_avis\}/g, vars.lienAvis || '[lien non configure]');
  msg = msg.replace(/\{telephone\}/g, vars.telephone || '');
  return msg;
}

// ─── Response Suggestions ────────────────────────────────────────────────────

function getResponseSuggestions(rating, nomClient, telephone) {
  const nom = nomClient || 'Client';
  const tel = telephone || '[votre telephone]';

  if (rating >= 4) {
    return [
      `Merci beaucoup ${nom} pour ce retour ! C'est un plaisir de travailler avec des clients comme vous. N'hesitez pas a nous recommander !`,
      `Un grand merci ${nom} ! Votre satisfaction est notre priorite. Au plaisir de collaborer a nouveau avec vous !`,
      `Merci ${nom} pour votre confiance et ce bel avis ! Nous sommes ravis que les travaux vous aient satisfait.`,
    ];
  }
  if (rating <= 2) {
    return [
      `Merci ${nom} pour votre retour. Nous sommes desoles que l'experience n'ait pas ete a la hauteur. Nous aimerions en discuter. Contactez-nous au ${tel}.`,
      `${nom}, nous prenons votre retour tres au serieux. Nous aimerions comprendre ce qui n'a pas fonctionne. Appelez-nous au ${tel} pour en discuter.`,
      `Merci ${nom} pour votre honnetete. Votre retour nous aide a nous ameliorer. N'hesitez pas a nous contacter au ${tel}.`,
    ];
  }
  // 3 stars
  return [
    `Merci ${nom} pour votre avis. Nous prenons vos remarques en compte pour nous ameliorer. N'hesitez pas a nous contacter si vous souhaitez en discuter.`,
    `Merci pour votre retour ${nom}. Nous aurions aime faire mieux ! Dites-nous ce que nous pourrions ameliorer.`,
    `${nom}, merci pour votre avis honnete. Nous travaillons constamment a nous ameliorer et votre retour est precieux.`,
  ];
}

// ─── Star Rating Component ───────────────────────────────────────────────────

function StarRating({ rating, onRate, size = 20, interactive = false, isDark }) {
  const [hovered, setHovered] = useState(0);

  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <button
          key={i}
          type="button"
          disabled={!interactive}
          onClick={() => interactive && onRate?.(i)}
          onMouseEnter={() => interactive && setHovered(i)}
          onMouseLeave={() => interactive && setHovered(0)}
          className={interactive ? 'cursor-pointer' : 'cursor-default'}
        >
          <Star
            size={size}
            className={`transition-colors ${
              i <= (hovered || rating)
                ? 'text-yellow-400 fill-yellow-400'
                : isDark ? 'text-slate-600' : 'text-slate-300'
            }`}
          />
        </button>
      ))}
    </div>
  );
}

// ─── Rating Distribution Bar ─────────────────────────────────────────────────

function RatingDistribution({ reviews, isDark, couleur }) {
  const distribution = useMemo(() => {
    const counts = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    reviews.forEach(r => {
      if (r.rating >= 1 && r.rating <= 5) counts[r.rating]++;
    });
    const max = Math.max(...Object.values(counts), 1);
    return Object.entries(counts)
      .sort(([a], [b]) => Number(b) - Number(a))
      .map(([stars, count]) => ({ stars: Number(stars), count, pct: (count / max) * 100 }));
  }, [reviews]);

  const avg = useMemo(() => {
    if (reviews.length === 0) return 0;
    return reviews.reduce((sum, r) => sum + (r.rating || 0), 0) / reviews.length;
  }, [reviews]);

  return (
    <div className={`rounded-xl border p-4 ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
      <div className="flex items-start gap-6">
        {/* Average */}
        <div className="text-center flex-shrink-0">
          <p className={`text-3xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
            {reviews.length > 0 ? avg.toFixed(1) : '-'}
          </p>
          <StarRating rating={Math.round(avg)} size={16} isDark={isDark} />
          <p className={`text-xs mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            {reviews.length} avis
          </p>
        </div>

        {/* Bars */}
        <div className="flex-1 space-y-1.5">
          {distribution.map(({ stars, count, pct }) => (
            <div key={stars} className="flex items-center gap-2">
              <span className={`text-xs w-4 text-right ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                {stars}
              </span>
              <Star size={10} className="text-yellow-400 fill-yellow-400 flex-shrink-0" />
              <div className={`flex-1 h-2 rounded-full overflow-hidden ${isDark ? 'bg-slate-700' : 'bg-slate-100'}`}>
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${pct}%`, backgroundColor: couleur }}
                />
              </div>
              <span className={`text-xs w-6 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                {count}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Config Panel (enriched) ────────────────────────────────────────────────

function ConfigPanel({ config, setConfig, isDark, couleur, onClose }) {
  const [url, setUrl] = useState(config.googleUrl || '');
  const [autoDelay, setAutoDelay] = useState(config.autoDelayDays || 7);
  const [messageTemplate, setMessageTemplate] = useState(config.messageTemplate || DEFAULT_MESSAGE);
  const [relanceEnabled, setRelanceEnabled] = useState(config.relanceEnabled || false);
  const [relanceDelay, setRelanceDelay] = useState(config.relanceDelayDays || 14);
  const [relanceMessage, setRelanceMessage] = useState(config.relanceMessage || DEFAULT_RELANCE_MESSAGE);

  const messageRef = useRef(null);
  const relanceRef = useRef(null);

  const insertVariable = (variable, targetRef) => {
    const textarea = targetRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const currentValue = targetRef === messageRef ? messageTemplate : relanceMessage;
    const newValue = currentValue.substring(0, start) + variable + currentValue.substring(end);
    if (targetRef === messageRef) {
      setMessageTemplate(newValue);
    } else {
      setRelanceMessage(newValue);
    }
    // Restore cursor position after re-render
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + variable.length, start + variable.length);
    }, 0);
  };

  const handleSave = () => {
    const newConfig = {
      ...config,
      googleUrl: url,
      autoDelayDays: autoDelay,
      messageTemplate,
      relanceEnabled,
      relanceDelayDays: relanceDelay,
      relanceMessage,
    };
    setConfig(newConfig);
    saveConfig(newConfig);
    onClose();
  };

  const labelClass = `block text-sm font-medium mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`;
  const inputClass = `w-full rounded-lg border px-3 py-2 text-sm ${
    isDark ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400' : 'bg-white border-slate-300 text-slate-900'
  }`;
  const helpClass = `text-xs mt-1 ${isDark ? 'text-slate-500' : 'text-slate-400'}`;

  const VariableBadges = ({ targetRef }) => (
    <div className="flex flex-wrap gap-1.5 mt-2">
      {TEMPLATE_VARIABLES.map(v => (
        <button
          key={v.key}
          type="button"
          onClick={() => insertVariable(v.key, targetRef)}
          className={`px-2 py-0.5 rounded-md text-xs font-mono transition-colors ${
            isDark
              ? 'bg-slate-600 text-slate-300 hover:bg-slate-500'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          {v.key}
        </button>
      ))}
    </div>
  );

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

      <div className="space-y-5">
        {/* Google URL */}
        <div>
          <label className={labelClass}>Lien Google Avis</label>
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://g.page/r/votre-entreprise/review"
            className={inputClass}
          />
          <p className={helpClass}>
            Trouvez votre lien dans Google Business Profile &gt; Demander des avis
          </p>
        </div>

        {/* Auto delay */}
        <div>
          <label className={labelClass}>Delai apres fin de chantier</label>
          <select
            value={autoDelay}
            onChange={(e) => setAutoDelay(Number(e.target.value))}
            className={`rounded-lg border px-3 py-2 text-sm ${
              isDark ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-slate-300 text-slate-900'
            }`}
          >
            <option value={3}>3 jours</option>
            <option value={5}>5 jours</option>
            <option value={7}>7 jours (recommande)</option>
            <option value={14}>14 jours</option>
            <option value={30}>30 jours</option>
          </select>
        </div>

        {/* Custom message template */}
        <div>
          <label className={labelClass}>Message de demande d'avis</label>
          <textarea
            ref={messageRef}
            value={messageTemplate}
            onChange={(e) => setMessageTemplate(e.target.value)}
            rows={4}
            className={inputClass}
            placeholder="Votre message personnalise..."
          />
          <p className={helpClass}>Cliquez sur une variable pour l'inserer dans le message</p>
          <VariableBadges targetRef={messageRef} />
        </div>

        {/* Separator */}
        <div className={`border-t ${isDark ? 'border-slate-700' : 'border-slate-200'}`} />

        {/* Relance toggle */}
        <div>
          <div className="flex items-center justify-between">
            <label className={`text-sm font-medium ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
              Relance automatique
            </label>
            <button
              type="button"
              onClick={() => setRelanceEnabled(!relanceEnabled)}
              className="flex items-center gap-1.5"
            >
              {relanceEnabled ? (
                <ToggleRight size={28} style={{ color: couleur }} />
              ) : (
                <ToggleLeft size={28} className={isDark ? 'text-slate-600' : 'text-slate-300'} />
              )}
            </button>
          </div>
          <p className={helpClass}>
            Envoyer un rappel si le client n'a pas laisse d'avis
          </p>
        </div>

        {relanceEnabled && (
          <>
            {/* Relance delay */}
            <div>
              <label className={labelClass}>Delai de relance</label>
              <select
                value={relanceDelay}
                onChange={(e) => setRelanceDelay(Number(e.target.value))}
                className={`rounded-lg border px-3 py-2 text-sm ${
                  isDark ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-slate-300 text-slate-900'
                }`}
              >
                <option value={7}>7 jours apres la 1ere demande</option>
                <option value={14}>14 jours apres la 1ere demande</option>
                <option value={30}>30 jours apres la 1ere demande</option>
              </select>
            </div>

            {/* Relance message */}
            <div>
              <label className={labelClass}>Message de relance</label>
              <textarea
                ref={relanceRef}
                value={relanceMessage}
                onChange={(e) => setRelanceMessage(e.target.value)}
                rows={4}
                className={inputClass}
                placeholder="Votre message de relance..."
              />
              <p className={helpClass}>Cliquez sur une variable pour l'inserer</p>
              <VariableBadges targetRef={relanceRef} />
            </div>
          </>
        )}

        <button
          onClick={handleSave}
          className="w-full py-2 rounded-xl text-sm font-semibold text-white transition-colors hover:opacity-90"
          style={{ backgroundColor: couleur }}
        >
          Enregistrer
        </button>
      </div>
    </div>
  );
}

// ─── Review Form ─────────────────────────────────────────────────────────────

function ReviewForm({ clients, isDark, couleur, onAdd }) {
  const [clientSearch, setClientSearch] = useState('');
  const [selectedClient, setSelectedClient] = useState(null);
  const [rating, setRating] = useState(0);
  const [text, setText] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const filteredClients = useMemo(() => {
    if (!clientSearch.trim()) return [];
    const q = clientSearch.toLowerCase();
    return clients
      .filter(c => (c.nom || c.name || '').toLowerCase().includes(q))
      .slice(0, 5);
  }, [clientSearch, clients]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!rating || !text.trim()) return;

    const review = {
      id: crypto.randomUUID(),
      clientId: selectedClient?.id || null,
      clientName: selectedClient?.nom || selectedClient?.name || clientSearch,
      rating,
      text: text.trim(),
      date,
      response: '',
      responded: false,
      createdAt: new Date().toISOString(),
    };

    onAdd(review);
    setClientSearch('');
    setSelectedClient(null);
    setRating(0);
    setText('');
    setDate(new Date().toISOString().split('T')[0]);
  };

  return (
    <form onSubmit={handleSubmit} className={`rounded-xl border p-4 ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
      <h4 className={`text-sm font-semibold mb-3 ${isDark ? 'text-white' : 'text-slate-900'}`}>
        <Plus size={14} className="inline mr-1" />
        Ajouter un avis
      </h4>

      <div className="space-y-3">
        {/* Client autocomplete */}
        <div className="relative">
          <label className={`block text-xs font-medium mb-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
            Nom du client
          </label>
          <input
            type="text"
            value={selectedClient ? (selectedClient.nom || selectedClient.name) : clientSearch}
            onChange={(e) => {
              setClientSearch(e.target.value);
              setSelectedClient(null);
              setShowSuggestions(true);
            }}
            onFocus={() => setShowSuggestions(true)}
            placeholder="Rechercher un client..."
            className={`w-full rounded-lg border px-3 py-2 text-sm ${
              isDark ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400' : 'bg-white border-slate-300 text-slate-900'
            }`}
          />
          {showSuggestions && filteredClients.length > 0 && !selectedClient && (
            <div className={`absolute z-10 w-full mt-1 rounded-lg border shadow-lg max-h-40 overflow-y-auto ${
              isDark ? 'bg-slate-700 border-slate-600' : 'bg-white border-slate-200'
            }`}>
              {filteredClients.map(c => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => {
                    setSelectedClient(c);
                    setClientSearch('');
                    setShowSuggestions(false);
                  }}
                  className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                    isDark ? 'text-slate-200 hover:bg-slate-600' : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {c.nom || c.name}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Rating */}
        <div>
          <label className={`block text-xs font-medium mb-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
            Note
          </label>
          <StarRating rating={rating} onRate={setRating} interactive size={24} isDark={isDark} />
        </div>

        {/* Text */}
        <div>
          <label className={`block text-xs font-medium mb-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
            Texte de l'avis
          </label>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={3}
            placeholder="Contenu de l'avis Google..."
            className={`w-full rounded-lg border px-3 py-2 text-sm ${
              isDark ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400' : 'bg-white border-slate-300 text-slate-900'
            }`}
          />
        </div>

        {/* Date */}
        <div>
          <label className={`block text-xs font-medium mb-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
            Date
          </label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className={`rounded-lg border px-3 py-2 text-sm ${
              isDark ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-slate-300 text-slate-900'
            }`}
          />
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={!rating || !text.trim()}
          className="w-full py-2 rounded-xl text-sm font-semibold text-white transition-colors hover:opacity-90 disabled:opacity-50"
          style={{ backgroundColor: couleur }}
        >
          <Plus size={14} className="inline mr-1" />
          Ajouter l'avis
        </button>
      </div>
    </form>
  );
}

// ─── Review Card ─────────────────────────────────────────────────────────────

function ReviewCard({ review, isDark, couleur, entreprise, onUpdate, onDelete }) {
  const [expanded, setExpanded] = useState(false);
  const [responseText, setResponseText] = useState(review.response || '');
  const [showSuggestions, setShowSuggestions] = useState(false);

  const initials = (review.clientName || 'C')
    .split(' ')
    .map(w => w[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();

  const suggestions = useMemo(
    () => getResponseSuggestions(review.rating, review.clientName, entreprise?.telephone || ''),
    [review.rating, review.clientName, entreprise?.telephone]
  );

  const handleSaveResponse = () => {
    onUpdate({ ...review, response: responseText, responded: !!responseText.trim() });
    setExpanded(false);
  };

  const handleUseSuggestion = (suggestion) => {
    setResponseText(suggestion);
    setShowSuggestions(false);
  };

  return (
    <div className={`rounded-xl border p-4 ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
      <div
        className="flex items-start gap-3 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        {/* Avatar */}
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
          style={{ backgroundColor: couleur }}
        >
          {initials}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <p className={`font-semibold text-sm ${isDark ? 'text-white' : 'text-slate-900'}`}>
              {review.clientName || 'Client'}
            </p>
            <div className="flex items-center gap-2">
              {review.responded ? (
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  isDark ? 'bg-green-900/30 text-green-400' : 'bg-green-100 text-green-700'
                }`}>
                  Repondu
                </span>
              ) : (
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  isDark ? 'bg-amber-900/30 text-amber-400' : 'bg-amber-100 text-amber-700'
                }`}>
                  Non repondu
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <StarRating rating={review.rating} size={14} isDark={isDark} />
            <span className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
              {review.date ? new Date(review.date).toLocaleDateString('fr-FR') : ''}
            </span>
          </div>
          <p className={`text-sm mt-1 ${isDark ? 'text-slate-300' : 'text-slate-600'} ${!expanded ? 'line-clamp-2' : ''}`}>
            {review.text}
          </p>
        </div>
      </div>

      {/* Expanded view */}
      {expanded && (
        <div className="mt-4 space-y-3">
          {/* Full review text if truncated */}
          {review.response && (
            <div className={`rounded-lg p-3 ${isDark ? 'bg-slate-700/50' : 'bg-slate-50'}`}>
              <p className={`text-xs font-medium mb-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Votre reponse :
              </p>
              <p className={`text-sm ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                {review.response}
              </p>
            </div>
          )}

          {/* Response input */}
          <div>
            <label className={`block text-xs font-medium mb-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
              {review.responded ? 'Modifier ma reponse' : 'Ma reponse'}
            </label>
            <textarea
              value={responseText}
              onChange={(e) => setResponseText(e.target.value)}
              rows={3}
              placeholder="Ecrivez votre reponse..."
              className={`w-full rounded-lg border px-3 py-2 text-sm ${
                isDark ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400' : 'bg-white border-slate-300 text-slate-900'
              }`}
            />
          </div>

          {/* Suggestion toggle */}
          <button
            type="button"
            onClick={() => setShowSuggestions(!showSuggestions)}
            className={`flex items-center gap-1.5 text-xs font-medium transition-colors ${
              isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Sparkles size={12} />
            {showSuggestions ? 'Masquer les suggestions' : 'Suggestions de reponse'}
          </button>

          {showSuggestions && (
            <div className="space-y-2">
              {suggestions.map((s, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => handleUseSuggestion(s)}
                  className={`w-full text-left rounded-lg border p-3 text-xs transition-colors ${
                    isDark
                      ? 'bg-slate-700/50 border-slate-600 text-slate-300 hover:bg-slate-700'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2">
            <button
              onClick={handleSaveResponse}
              className="flex-1 py-2 rounded-lg text-xs font-semibold text-white transition-colors hover:opacity-90"
              style={{ backgroundColor: couleur }}
            >
              <CheckCircle size={12} className="inline mr-1" />
              Enregistrer
            </button>
            <button
              onClick={() => onDelete(review.id)}
              className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                isDark ? 'bg-red-900/20 text-red-400 hover:bg-red-900/40' : 'bg-red-50 text-red-600 hover:bg-red-100'
              }`}
            >
              <Trash2 size={12} />
            </button>
          </div>
        </div>
      )}
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

  const message = useMemo(() => {
    const template = config.messageTemplate || DEFAULT_MESSAGE;
    return resolveTemplate(template, {
      prenomClient: clientName.split(' ')[0],
      nomClient: clientName,
      nomEntreprise: entrepriseName,
      typeChantier: chantierLabel,
      lienAvis: googleUrl,
      telephone: '',
    });
  }, [clientName, entrepriseName, chantierLabel, googleUrl, config.messageTemplate]);

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
    const subject = encodeURIComponent(`Votre avis nous interesse — ${entrepriseName || 'BatiGesti'}`);
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
              Termine le {new Date(chantier.date_fin).toLocaleDateString('fr-FR')}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {isSent ? (
            <span className={`flex items-center gap-1 text-xs font-medium ${isDark ? 'text-green-400' : 'text-green-600'}`}>
              <CheckCircle size={14} />
              Envoye
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
              {copied ? 'Copie !' : 'Copier'}
            </button>
            <button
              onClick={handleSend}
              className="flex-1 flex items-center justify-center gap-1 py-2 rounded-lg text-xs font-medium text-white transition-colors hover:opacity-90"
              style={{ backgroundColor: couleur }}
            >
              <CheckCircle size={12} />
              Marquer envoye
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
  const [reviews, setReviews] = useState(() => loadReviews());
  const [showConfig, setShowConfig] = useState(false);
  const [activeTab, setActiveTab] = useState('demandes'); // demandes, avis
  const [filter, setFilter] = useState('eligible'); // eligible, sent, all
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddReview, setShowAddReview] = useState(false);

  const entrepriseName = entreprise.nom || entreprise.name || '';

  // Find eligible chantiers (termine status, with client, not already sent)
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

  // Reviews CRUD
  const handleAddReview = useCallback((review) => {
    const updated = [review, ...reviews];
    setReviews(updated);
    saveReviews(updated);
    setShowAddReview(false);
  }, [reviews]);

  const handleUpdateReview = useCallback((updatedReview) => {
    const updated = reviews.map(r => r.id === updatedReview.id ? updatedReview : r);
    setReviews(updated);
    saveReviews(updated);
  }, [reviews]);

  const handleDeleteReview = useCallback((reviewId) => {
    const updated = reviews.filter(r => r.id !== reviewId);
    setReviews(updated);
    saveReviews(updated);
  }, [reviews]);

  const pendingCount = eligibleChantiers.filter(c => !sentIds.has(c.id)).length;
  const sentCount = avisData.length;

  const cardBg = isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200';
  const textPrimary = isDark ? 'text-white' : 'text-slate-900';
  const textSecondary = isDark ? 'text-slate-400' : 'text-slate-500';

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className={`text-xl sm:text-2xl font-bold flex items-center gap-2 ${textPrimary}`}>
            <Star className="text-yellow-400 fill-yellow-400" size={24} />
            Avis Google
          </h1>
          <p className={`text-sm ${textSecondary}`}>
            Demandez des avis a vos clients et suivez votre reputation
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
          couleur={couleur}
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

      {/* Tab navigation */}
      <div className={`flex items-center gap-1 p-1 rounded-xl ${isDark ? 'bg-slate-800/60' : 'bg-slate-100'}`}>
        {[
          { id: 'demandes', label: 'Demandes d\'avis', icon: Send },
          { id: 'avis', label: 'Avis recus', icon: Star },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? 'text-white shadow-sm'
                : isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-700'
            }`}
            style={activeTab === tab.id ? { backgroundColor: couleur } : {}}
          >
            <tab.icon size={14} />
            {tab.label}
            {tab.id === 'avis' && reviews.length > 0 && (
              <span className={`text-xs ml-1 ${activeTab === tab.id ? 'opacity-80' : ''}`}>
                ({reviews.length})
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ─── TAB: Demandes d'avis ──────────────────────────────────────── */}
      {activeTab === 'demandes' && (
        <>
          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className={`rounded-xl border p-3 ${cardBg}`}>
              <div className="flex items-center gap-2 mb-1">
                <Clock size={14} className="text-orange-500" />
                <span className={`text-xs ${textSecondary}`}>En attente</span>
              </div>
              <p className={`text-xl font-bold ${textPrimary}`}>{pendingCount}</p>
            </div>
            <div className={`rounded-xl border p-3 ${cardBg}`}>
              <div className="flex items-center gap-2 mb-1">
                <Send size={14} className="text-green-500" />
                <span className={`text-xs ${textSecondary}`}>Envoyes</span>
              </div>
              <p className={`text-xl font-bold ${textPrimary}`}>{sentCount}</p>
            </div>
            <div className={`rounded-xl border p-3 ${cardBg}`}>
              <div className="flex items-center gap-2 mb-1">
                <Award size={14} className="text-yellow-500" />
                <span className={`text-xs ${textSecondary}`}>Eligibles</span>
              </div>
              <p className={`text-xl font-bold ${textPrimary}`}>{eligibleChantiers.length}</p>
            </div>
          </div>

          {/* Filters */}
          <div className="flex items-center gap-2 flex-wrap">
            {[
              { id: 'eligible', label: `A envoyer (${pendingCount})`, icon: Clock },
              { id: 'sent', label: `Envoyes (${sentCount})`, icon: CheckCircle },
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
                {filter === 'eligible' ? 'Aucun chantier en attente d\'avis' : filter === 'sent' ? 'Aucun avis envoye' : 'Aucun chantier eligible'}
              </p>
              <p className={`text-xs mt-1 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                Les chantiers termines apparaissent ici apres le delai configure
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
        </>
      )}

      {/* ─── TAB: Avis recus ───────────────────────────────────────────── */}
      {activeTab === 'avis' && (
        <>
          {/* Rating stats */}
          {reviews.length > 0 && (
            <RatingDistribution reviews={reviews} isDark={isDark} couleur={couleur} />
          )}

          {/* Add review button / form */}
          <div className="flex items-center justify-between">
            <h3 className={`text-sm font-semibold ${textPrimary}`}>
              Vos avis ({reviews.length})
            </h3>
            <button
              onClick={() => setShowAddReview(!showAddReview)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white transition-colors hover:opacity-90"
              style={{ backgroundColor: couleur }}
            >
              {showAddReview ? <X size={12} /> : <Plus size={12} />}
              {showAddReview ? 'Annuler' : 'Ajouter un avis'}
            </button>
          </div>

          {showAddReview && (
            <ReviewForm
              clients={clients}
              isDark={isDark}
              couleur={couleur}
              onAdd={handleAddReview}
            />
          )}

          {/* Reviews list */}
          {reviews.length === 0 ? (
            <div className={`text-center py-12 rounded-xl border ${isDark ? 'bg-slate-800/50 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
              <Star size={40} className={`mx-auto mb-3 ${isDark ? 'text-slate-600' : 'text-slate-300'}`} />
              <p className={`text-sm font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Aucun avis enregistre
              </p>
              <p className={`text-xs mt-1 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                Ajoutez vos avis Google recus pour suivre votre reputation
              </p>
              <button
                onClick={() => setShowAddReview(true)}
                className="mt-3 px-4 py-2 rounded-xl text-xs font-semibold text-white transition-colors hover:opacity-90"
                style={{ backgroundColor: couleur }}
              >
                <Plus size={12} className="inline mr-1" />
                Ajouter votre premier avis
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {reviews.map(review => (
                <ReviewCard
                  key={review.id}
                  review={review}
                  isDark={isDark}
                  couleur={couleur}
                  entreprise={entreprise}
                  onUpdate={handleUpdateReview}
                  onDelete={handleDeleteReview}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
