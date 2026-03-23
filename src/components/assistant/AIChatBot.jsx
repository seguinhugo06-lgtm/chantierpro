import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Sparkles, X, Send, Trash2, ChevronDown } from 'lucide-react';

const STORAGE_KEY = 'cp_ai_chat_history';
const MAX_MESSAGES = 50;

const QUICK_SUGGESTIONS = [
  'Quel est mon CA ce mois ?',
  'Quels devis sont en attente ?',
  'Cr\u00e9er un devis rapide',
  'R\u00e9sumer mes chantiers actifs',
];

function getAIResponse(question, context) {
  const q = question.toLowerCase();

  if (q.includes('ca') || q.includes('chiffre') || q.includes('revenu')) {
    const ca = context.caMois ?? 0;
    const trend = context.caTrend ?? 0;
    const trendLabel = trend > 0 ? 'En hausse' : trend < 0 ? 'En baisse' : 'Stable';
    return `Votre CA ce mois est de ${ca.toLocaleString('fr-FR')} \u20ac. ${trendLabel} par rapport au mois dernier.`;
  }

  if (q.includes('devis') && (q.includes('attente') || q.includes('retard') || q.includes('en cours'))) {
    return `Vous avez ${context.devisEnAttente ?? 0} devis en attente de r\u00e9ponse.${context.oldestDevisDate ? ` Le plus ancien date du ${context.oldestDevisDate}.` : ''}`;
  }

  if (q.includes('devis') && (q.includes('cr\u00e9er') || q.includes('rapide') || q.includes('nouveau'))) {
    return 'Pour cr\u00e9er un devis, rendez-vous dans la section Devis et cliquez sur "+ Nouveau devis". Vous pouvez aussi utiliser l\'assistant IA pour g\u00e9n\u00e9rer un devis \u00e0 partir d\'une description.';
  }

  if (q.includes('chantier')) {
    const actifs = context.chantiersActifs ?? 0;
    const msg = `${actifs} chantier${actifs > 1 ? 's' : ''} en cours.`;
    return context.prochainChantier
      ? `${msg} Le prochain \u00e0 terminer est "${context.prochainChantier}".`
      : msg;
  }

  if (q.includes('facture') && (q.includes('retard') || q.includes('impay\u00e9'))) {
    const nb = context.facturesRetard ?? 0;
    const montant = context.montantRetard ?? 0;
    return nb > 0
      ? `${nb} facture${nb > 1 ? 's' : ''} en retard pour un total de ${montant.toLocaleString('fr-FR')} \u20ac.`
      : 'Aucune facture en retard. Tout est \u00e0 jour !';
  }

  if (q.includes('client')) {
    const nb = context.totalClients ?? 0;
    return `Vous avez ${nb} client${nb > 1 ? 's' : ''} enregistr\u00e9${nb > 1 ? 's' : ''}.`;
  }

  if (q.includes('bonjour') || q.includes('salut') || q.includes('hello') || q.includes('coucou')) {
    return 'Bonjour ! Je suis l\'assistant BatiGesti. Comment puis-je vous aider aujourd\'hui ?';
  }

  if (q.includes('merci')) {
    return 'Avec plaisir ! N\'h\u00e9sitez pas si vous avez d\'autres questions.';
  }

  return 'Je suis l\'assistant BatiGesti. Je peux vous aider avec vos devis, factures, chantiers et finances. Posez-moi une question ou utilisez les suggestions ci-dessous.';
}

function buildContext(devis, chantiers, clients) {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

  // CA ce mois (devis accept\u00e9s)
  const devisAcceptedThisMonth = (devis || []).filter(d => {
    const s = d.statut || d.status;
    const date = new Date(d.dateCreation || d.date || d.created_at);
    return (s === 'accepte' || s === 'accept\u00e9' || s === 'signed') && date >= startOfMonth;
  });
  const caMois = devisAcceptedThisMonth.reduce((sum, d) => sum + (d.totalTTC || d.total || 0), 0);

  const devisAcceptedLastMonth = (devis || []).filter(d => {
    const s = d.statut || d.status;
    const date = new Date(d.dateCreation || d.date || d.created_at);
    return (s === 'accepte' || s === 'accept\u00e9' || s === 'signed') && date >= startOfLastMonth && date <= endOfLastMonth;
  });
  const caLastMonth = devisAcceptedLastMonth.reduce((sum, d) => sum + (d.totalTTC || d.total || 0), 0);
  const caTrend = caMois - caLastMonth;

  // Devis en attente
  const devisEnAttente = (devis || []).filter(d => {
    const s = d.statut || d.status;
    return s === 'envoye' || s === 'envoy\u00e9' || s === 'sent' || s === 'brouillon' || s === 'draft';
  });
  const oldestDevis = devisEnAttente.sort((a, b) =>
    new Date(a.dateCreation || a.date || a.created_at) - new Date(b.dateCreation || b.date || b.created_at)
  )[0];
  const oldestDevisDate = oldestDevis
    ? new Date(oldestDevis.dateCreation || oldestDevis.date || oldestDevis.created_at).toLocaleDateString('fr-FR')
    : null;

  // Chantiers actifs
  const chantiersActifs = (chantiers || []).filter(c => {
    const s = c.statut || c.status;
    return s === 'en_cours' || s === 'actif' || s === 'in_progress';
  });
  const prochainChantier = chantiersActifs
    .filter(c => c.dateFin || c.date_fin)
    .sort((a, b) => new Date(a.dateFin || a.date_fin) - new Date(b.dateFin || b.date_fin))[0];

  // Factures en retard (devis factur\u00e9s non pay\u00e9s)
  const facturesRetard = (devis || []).filter(d => {
    const s = d.statut || d.status;
    return s === 'retard' || s === 'overdue' || s === 'impay\u00e9';
  });
  const montantRetard = facturesRetard.reduce((sum, d) => sum + (d.totalTTC || d.total || 0), 0);

  return {
    caMois,
    caTrend,
    devisEnAttente: devisEnAttente.length,
    oldestDevisDate,
    chantiersActifs: chantiersActifs.length,
    prochainChantier: prochainChantier?.nom || prochainChantier?.name || null,
    facturesRetard: facturesRetard.length,
    montantRetard,
    totalClients: (clients || []).length,
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
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const accentColor = couleur || '#f97316';

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
      {/* Floating button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-20 right-4 z-50 flex items-center justify-center w-14 h-14 rounded-full shadow-lg transition-all duration-300 hover:scale-110 active:scale-95"
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
                  <p className={`text-xs ${textSecondary}`}>IA locale - Mode d\u00e9mo</p>
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
                    {msg.content}
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
