import React, { useState, useRef, useEffect } from 'react';
import { Send, Loader2, Sparkles } from 'lucide-react';

/**
 * Chat IA post-analyse pour affiner les postes du devis.
 */
export default function AffinageChat({
  onSendMessage,
  isLoading,
  messages,
  isDark,
  couleur,
}) {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef(null);

  const cardBg = isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200';
  const inputBg = isDark ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400' : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400';
  const textMuted = isDark ? 'text-slate-400' : 'text-slate-500';

  const quickPrompts = [
    'Augmente les quantités de 10%',
    'Ajoute la TVA à 10%',
    'Ajoute un poste nettoyage de chantier',
    'Passe la main d\'œuvre à 50€/h',
  ];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    onSendMessage(input.trim());
    setInput('');
  };

  const handleQuickPrompt = (prompt) => {
    if (isLoading) return;
    onSendMessage(prompt);
  };

  return (
    <div className={`rounded-2xl border ${cardBg}`}>
      {/* Header */}
      <div className="p-4 border-b" style={{ borderColor: isDark ? '#334155' : '#e2e8f0' }}>
        <h3 className="font-semibold flex items-center gap-2 text-sm">
          <Sparkles size={16} style={{ color: couleur }} />
          Affiner avec l'IA
        </h3>
        <p className={`text-xs mt-1 ${textMuted}`}>
          Demandez des modifications en langage naturel
        </p>
      </div>

      {/* Quick prompts */}
      <div className="p-3 border-b flex flex-wrap gap-1.5" style={{ borderColor: isDark ? '#334155' : '#e2e8f0' }}>
        {quickPrompts.map((prompt, i) => (
          <button
            key={i}
            onClick={() => handleQuickPrompt(prompt)}
            disabled={isLoading}
            className={`text-xs px-2.5 py-1.5 rounded-lg transition-colors ${
              isDark ? 'bg-slate-700 hover:bg-slate-600' : 'bg-slate-100 hover:bg-slate-200'
            } disabled:opacity-50`}
          >
            {prompt}
          </button>
        ))}
      </div>

      {/* Messages */}
      {messages.length > 0 && (
        <div className="max-h-48 overflow-y-auto p-3 space-y-2">
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`text-sm p-2.5 rounded-xl ${
                msg.role === 'user'
                  ? 'ml-8 text-white'
                  : `mr-8 ${isDark ? 'bg-slate-700' : 'bg-slate-100'}`
              }`}
              style={msg.role === 'user' ? { background: couleur } : {}}
            >
              {msg.content}
            </div>
          ))}
          {isLoading && (
            <div className={`mr-8 text-sm p-2.5 rounded-xl flex items-center gap-2 ${isDark ? 'bg-slate-700' : 'bg-slate-100'}`}>
              <Loader2 size={14} className="animate-spin" style={{ color: couleur }} />
              <span className={textMuted}>L'IA réfléchit…</span>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      )}

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-3 flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ex: Ajoute 2h de plomberie à 55€/h…"
          className={`flex-1 p-2.5 rounded-xl border text-sm ${inputBg}`}
          disabled={isLoading}
        />
        <button
          type="submit"
          disabled={!input.trim() || isLoading}
          className="p-2.5 rounded-xl text-white disabled:opacity-50 transition-opacity"
          style={{ background: couleur }}
        >
          {isLoading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
        </button>
      </form>
    </div>
  );
}
