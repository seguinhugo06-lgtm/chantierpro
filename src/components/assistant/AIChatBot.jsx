import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Sparkles, X, Send, Trash2 } from 'lucide-react';

const STORAGE_KEY = 'cp_ai_chat_history';
const MAX_MESSAGES = 50;

const QUICK_SUGGESTIONS = [
  'Quel est mon CA ce mois ?',
  'Quels devis sont en attente ?',
  'Créer un devis rapide',
  'Résumer mes chantiers actifs',
];

function getAIResponse(question, context) {
  const q = question.toLowerCase();

  // Aide / suggestions contextuelles
  if (q.includes('aide') || q.includes('quoi') || q.includes('faire') || (q.includes('?') && q.length < 20)) {
    return 'Je peux vous aider avec :\n\u2022 \ud83d\udcca "Quel est mon CA ce mois ?"\n\u2022 \ud83d\udccb "Quels devis sont en attente ?"\n\u2022 \ud83c\udfd7\ufe0f "Mes chantiers en cours"\n\u2022 \ud83d\udcb0 "Factures en retard"\n\u2022 \ud83d\udc65 "Combien de clients actifs ?"\n\nPosez-moi une question !';
  }

  if (q.includes('ca') || q.includes('chiffre') || q.includes('revenu')) {
    const ca = context.caMois ?? 0;
    const trend = context.caTrend ?? 0;
    const trendLabel = trend > 0 ? 'En hausse' : trend < 0 ? 'En baisse' : 'Stable';
    return `Votre CA ce mois est de ${ca.toLocaleString('fr-FR')} \u20ac. ${trendLabel} par rapport au mois dernier.`;
  }

  if (q.includes('devis') && (q.includes('attente') || q.includes('retard') || q.includes('en cours'))) {
    const enAttente = (context._rawDevis || []).filter(d => {
      const s = d.statut || d.status;
      return s === 'envoye' || s === 'envoyé' || s === 'sent' || s === 'brouillon' || s === 'draft';
    });
    if (enAttente.length === 0) return 'Aucun devis en attente. Bravo ! \ud83c\udf89';
    const top3 = enAttente.slice(0, 3).map(d =>
      `\u2022 ${d.client_nom || d.clientNom || 'Client'} \u2014 ${(d.totalTTC || d.total_ttc || d.total || 0).toLocaleString('fr-FR')}\u20ac (${d.numero || d.reference || 'N/A'})`
    ).join('\n');
    return `${enAttente.length} devis en attente :\n${top3}${enAttente.length > 3 ? `\n... et ${enAttente.length - 3} autres` : ''}`;
  }

  if (q.includes('devis') && (q.includes('créer') || q.includes('rapide') || q.includes('nouveau'))) {
    return 'Pour créer un devis, rendez-vous dans la section Devis et cliquez sur "+ Nouveau devis". Vous pouvez aussi utiliser l\'assistant IA pour générer un devis à partir d\'une description.';
  }

  if (q.includes('chantier')) {
    const actifs = (context._rawChantiers || []).filter(c => {
      const s = c.statut || c.status;
      return s === 'en_cours' || s === 'actif' || s === 'in_progress';
    });
    if (actifs.length === 0) return 'Aucun chantier en cours actuellement.';
    const list = actifs.slice(0, 3).map(c =>
      `\u2022 ${c.nom || c.name || 'Chantier'} \u2014 ${c.avancement || 0}% (${c.adresse || c.address || 'Adresse non renseignée'})`
    ).join('\n');
    return `${actifs.length} chantier${actifs.length > 1 ? 's' : ''} en cours :\n${list}${actifs.length > 3 ? `\n... et ${actifs.length - 3} autres` : ''}`;
  }

  if (q.includes('facture') && (q.includes('retard') || q.includes('impayé'))) {
    const factures = (context._rawDevis || []).filter(d => {
      const s = d.statut || d.status;
      if (s === 'retard' || s === 'overdue' || s === 'impayé') return true;
      if (d.type === 'facture' && d.date_echeance && new Date(d.date_echeance) < new Date()) return true;
      if (d.type === 'facture' && d.dateEcheance && new Date(d.dateEcheance) < new Date()) return true;
      return false;
    });
    if (factures.length === 0) return 'Aucune facture en retard. Tout est à jour ! \u2705';
    const list = factures.slice(0, 3).map(f => {
      const echeance = f.date_echeance || f.dateEcheance;
      const jours = echeance ? Math.round((new Date() - new Date(echeance)) / 86400000) : '?';
      return `\u2022 ${f.client_nom || f.clientNom || 'Client'} \u2014 ${(f.totalTTC || f.total_ttc || f.total || 0).toLocaleString('fr-FR')}\u20ac (${jours}j de retard)`;
    }).join('\n');
    return `${factures.length} facture${factures.length > 1 ? 's' : ''} en retard :\n${list}${factures.length > 3 ? `\n... et ${factures.length - 3} autres` : ''}`;
  }

  if (q.includes('client')) {
    const nb = context.totalClients ?? 0;
    return `Vous avez ${nb} client${nb > 1 ? 's' : ''} enregistré${nb > 1 ? 's' : ''}.`;
  }

  if (q.includes('bonjour') || q.includes('salut') || q.includes('hello') || q.includes('coucou')) {
    return 'Bonjour ! Je suis l\'assistant BatiGesti. Comment puis-je vous aider aujourd\'hui ?';
  }

  if (q.includes('merci')) {
    return 'Avec plaisir ! N\'hésitez pas si vous avez d\'autres questions.';
  }

  return 'Je suis l\'assistant BatiGesti. Je peux vous aider avec vos devis, factures, chantiers et finances. Posez-moi une question ou utilisez les suggestions ci-dessous.';
}

function buildContext(devis, chantiers, clients) {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

  // CA ce mois (devis acceptés)
  const devisAcceptedThisMonth = (devis || []).filter(d => {
    const s = d.statut || d.status;
    const date = new Date(d.dateCreation || d.date || d.created_at);
    return (s === 'accepte' || s === 'accepté' || s === 'signed') && date >= startOfMonth;
  });
  const caMois = devisAcceptedThisMonth.reduce((sum, d) => sum + (d.totalTTC || d.total || 0), 0);

  const devisAcceptedLastMonth = (devis || []).filter(d => {
    const s = d.statut || d.status;
    const date = new Date(d.dateCreation || d.date || d.created_at);
    return (s === 'accepte' || s === 'accepté' || s === 'signed') && date >= startOfLastMonth && date <= endOfLastMonth;
  });
  const caLastMonth = devisAcceptedLastMonth.reduce((sum, d) => sum + (d.totalTTC || d.total || 0), 0);
  const caTrend = caMois - caLastMonth;

  return {
    caMois,
    caTrend,
    totalClients: (clients || []).length,
    // Pass raw data for detailed responses
    _rawDevis: devis || [],
    _rawChantiers: chantiers || [],
    _rawClients: clients || [],
  };
}

function loadHistory() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.slice(-MAX_MESSAGES) : [];
  } catch {
    return [];
  }
}

function saveHistory(messages) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-MAX_MESSAGES)));
  } catch { /* quota exceeded — ignore */ }
}

export default function AIChatBot({ isDark, couleur, devis, chantiers, clients, entreprise }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState(loadHistory);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [inputFocused, setInputFocused] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const accentColor = couleur || '#f97316';

  // Hide floating button when a form input is focused (mobile keyboard covers it)
  useEffect(() => {
    const handleFocusIn = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') {
        setInputFocused(true);
      }
    };
    const handleFocusOut = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') {
        setTimeout(() => setInputFocused(false), 200);
      }
    };
    document.addEventListener('focusin', handleFocusIn);
    document.addEventListener('focusout', handleFocusOut);
    return () => {
      document.removeEventListener('focusin', handleFocusIn);
      document.removeEventListener('focusout', handleFocusOut);
    };
  }, []);

  // Theme variables
  const panelBg = isDark ? 'bg-slate-800' : 'bg-white';
  const panelBorder = isDark ? 'border-slate-700' : 'border-slate-200';
  const headerBg = isDark ? 'bg-slate-900' : 'bg-slate-50';
  const inputBg = isDark ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400' : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400';
  const textPrimary = isDark ? 'text-slate-100' : 'text-slate-900';
  const textSecondary = isDark ? 'text-slate-400' : 'text-slate-500';
  const aiBubbleBg = isDark ? 'bg-slate-700' : 'bg-slate-100';
  const aiBubbleText = isDark ? 'text-slate-100' : 'text-slate-800';

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  // Save history on change
  useEffect(() => {
    saveHistory(messages);
  }, [messages]);

  // Focus input when opening
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen]);

  const handleSend = useCallback((text) => {
    const question = (text || input).trim();
    if (!question) return;

    const userMessage = { role: 'user', content: question, timestamp: Date.now() };
    const context = buildContext(devis, chantiers, clients);

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsTyping(true);

    // Simulate typing delay
    setTimeout(() => {
      const response = getAIResponse(question, context);
      const aiMessage = { role: 'ai', content: response, timestamp: Date.now() };
      setMessages(prev => [...prev, aiMessage]);
      setIsTyping(false);
    }, 600 + Math.random() * 800);
  }, [input, devis, chantiers, clients]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const clearHistory = () => {
    setMessages([]);
    localStorage.removeItem(STORAGE_KEY);
  };

  const entrepriseNom = entreprise?.nom || entreprise?.name || 'BatiGesti';

  return (
    <>
      {/* Floating button — hidden on mobile when a form field is focused */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className={`fixed bottom-24 md:bottom-6 right-4 z-50 items-center justify-center w-14 h-14 rounded-full shadow-lg transition-all duration-300 hover:scale-110 active:scale-95 ${inputFocused ? 'hidden sm:flex' : 'flex'}`}
          style={{ background: accentColor }}
          aria-label="Ouvrir l'assistant IA"
        >
          <Sparkles className="w-6 h-6 text-white" />
          <span
            className="absolute -top-1 -right-1 text-[10px] font-bold text-white px-1.5 py-0.5 rounded-full"
            style={{ background: isDark ? '#6366f1' : '#4f46e5' }}
          >
            IA
          </span>
        </button>
      )}

      {/* Chat panel backdrop (mobile) */}
      {isOpen && (
        <div
          className="fixed inset-0 z-50 sm:bg-black/20 sm:backdrop-blur-sm"
          onClick={(e) => { if (e.target === e.currentTarget) setIsOpen(false); }}
        >
          {/* Chat panel */}
          <div
            className={`fixed z-50 flex flex-col
              inset-0 sm:inset-auto sm:bottom-4 sm:right-4 sm:w-[400px] sm:h-[600px] sm:rounded-2xl
              ${panelBg} ${panelBorder} sm:border sm:shadow-2xl
              transition-transform duration-300 ease-out
            `}
            style={{ maxHeight: '100dvh' }}
          >
            {/* Header */}
            <div className={`flex items-center justify-between px-4 py-3 ${headerBg} sm:rounded-t-2xl border-b ${panelBorder}`}>
              <div className="flex items-center gap-3">
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center"
                  style={{ background: `${accentColor}20` }}
                >
                  <Sparkles className="w-5 h-5" style={{ color: accentColor }} />
                </div>
                <div>
                  <h3 className={`text-sm font-semibold ${textPrimary}`}>Assistant {entrepriseNom}</h3>
                  <p className={`text-xs ${textSecondary}`}>IA locale - Mode démo</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={clearHistory}
                  className={`p-2 rounded-lg transition-colors ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-200'}`}
                  title="Effacer l'historique"
                >
                  <Trash2 className={`w-4 h-4 ${textSecondary}`} />
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className={`p-2 rounded-lg transition-colors ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-200'}`}
                  title="Fermer"
                >
                  <X className={`w-5 h-5 ${textSecondary}`} />
                </button>
              </div>
            </div>

            {/* Messages area */}
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
              {messages.length === 0 && !isTyping && (
                <div className="flex flex-col items-center justify-center h-full text-center px-4">
                  <div
                    className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
                    style={{ background: `${accentColor}15` }}
                  >
                    <Sparkles className="w-8 h-8" style={{ color: accentColor }} />
                  </div>
                  <h4 className={`text-lg font-semibold mb-2 ${textPrimary}`}>
                    Bonjour ! Je suis votre assistant.
                  </h4>
                  <p className={`text-sm mb-6 ${textSecondary}`}>
                    Posez-moi une question sur vos chantiers, devis, ou finances.
                  </p>
                  <div className="flex flex-wrap gap-2 justify-center">
                    {QUICK_SUGGESTIONS.map((suggestion) => (
                      <button
                        key={suggestion}
                        onClick={() => handleSend(suggestion)}
                        className={`text-xs px-3 py-2 rounded-full border transition-colors ${
                          isDark
                            ? 'border-slate-600 hover:bg-slate-700 text-slate-300'
                            : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                        }`}
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {messages.map((msg, i) => (
                <div
                  key={msg.timestamp + '-' + i}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                      msg.role === 'user'
                        ? 'text-white rounded-br-md'
                        : `${aiBubbleBg} ${aiBubbleText} rounded-bl-md`
                    }`}
                    style={msg.role === 'user' ? { background: accentColor } : undefined}
                  >
                    {msg.content.split('\n').map((line, j) => (
                      <span key={j}>{line}{j < msg.content.split('\n').length - 1 && <br />}</span>
                    ))}
                  </div>
                </div>
              ))}

              {isTyping && (
                <div className="flex justify-start">
                  <div className={`px-4 py-3 rounded-2xl rounded-bl-md ${aiBubbleBg}`}>
                    <div className="flex gap-1.5">
                      <span className="w-2 h-2 rounded-full animate-bounce" style={{ background: accentColor, animationDelay: '0ms' }} />
                      <span className="w-2 h-2 rounded-full animate-bounce" style={{ background: accentColor, animationDelay: '150ms' }} />
                      <span className="w-2 h-2 rounded-full animate-bounce" style={{ background: accentColor, animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Quick suggestions (when there are messages) */}
            {messages.length > 0 && (
              <div className={`px-4 py-2 border-t ${panelBorder} overflow-x-auto`}>
                <div className="flex gap-2 pb-1">
                  {QUICK_SUGGESTIONS.map((suggestion) => (
                    <button
                      key={suggestion}
                      onClick={() => handleSend(suggestion)}
                      className={`text-xs px-3 py-1.5 rounded-full border whitespace-nowrap transition-colors flex-shrink-0 ${
                        isDark
                          ? 'border-slate-600 hover:bg-slate-700 text-slate-300'
                          : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                      }`}
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Input area */}
            <div className={`px-4 py-3 border-t ${panelBorder} sm:rounded-b-2xl`}>
              <div className="flex items-center gap-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Posez votre question..."
                  className={`flex-1 px-4 py-2.5 rounded-xl text-sm border outline-none transition-colors focus:ring-2 ${inputBg}`}
                  style={{ focusRingColor: accentColor }}
                  disabled={isTyping}
                />
                <button
                  onClick={() => handleSend()}
                  disabled={!input.trim() || isTyping}
                  className="p-2.5 rounded-xl text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 active:scale-95"
                  style={{ background: accentColor }}
                  aria-label="Envoyer"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
