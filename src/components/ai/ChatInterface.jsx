import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Mic, MicOff, Camera, Sparkles, FileText, X, ArrowRight, Loader2, Bot, User, ImagePlus } from 'lucide-react';
import { useVoiceInput } from '../../hooks/useVoiceInput';
import { streamMessage, parseDevisFromResponse, analyzePhoto, photoAnalysisToDevisLignes } from '../../lib/ai/aiService';

/**
 * Format AI response text: render newlines and basic markdown
 */
function formatMessageText(text) {
  if (!text) return null;
  // Split by actual newlines (both literal \n in JSON strings and real newlines)
  const normalized = text.replace(/\\n/g, '\n');
  return normalized.split('\n').map((line, i) => {
    // Handle **bold** markdown
    const parts = line.split(/(\*\*[^*]+\*\*)/g);
    const rendered = parts.map((part, j) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={j}>{part.slice(2, -2)}</strong>;
      }
      return part;
    });
    return (
      <React.Fragment key={i}>
        {i > 0 && <br />}
        {rendered}
      </React.Fragment>
    );
  });
}

/**
 * AI Chat Interface for ChantierPro
 * Conversational devis creation with voice, text, and photo input
 */
export default function ChatInterface({
  isDark,
  couleur = '#f97316',
  onCreateDevis,
  onClose,
  clients = [],
  entreprise = {},
  compact = false,
}) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamedText, setStreamedText] = useState('');
  const [interimText, setInterimText] = useState('');
  const [pendingDevis, setPendingDevis] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const fileInputRef = useRef(null);
  const abortRef = useRef(null);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamedText]);

  // Voice input
  const { isListening, isSupported: voiceSupported, toggleListening, error: voiceError } = useVoiceInput({
    onResult: useCallback((text) => {
      setInput(prev => prev ? `${prev} ${text}` : text);
      setInterimText('');
    }, []),
    onInterim: useCallback((text) => {
      setInterimText(text);
    }, []),
  });

  // Send message handler
  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || isStreaming) return;

    const userMessage = { role: 'user', content: text };
    const allMessages = [...messages, userMessage];
    setMessages(allMessages);
    setInput('');
    setInterimText('');
    setIsStreaming(true);
    setStreamedText('');

    let fullText = '';

    abortRef.current = streamMessage(
      allMessages.map(m => ({ role: m.role, content: typeof m.content === 'string' ? m.content : m.displayText || '' })),
      {
        onChunk: (chunk) => {
          fullText += chunk;
          setStreamedText(fullText);
        },
        onDone: () => {
          setIsStreaming(false);
          setStreamedText('');

          // Parse response
          const parsed = parseDevisFromResponse(fullText);

          if (parsed.type === 'devis') {
            setPendingDevis(parsed.data);
            setMessages(prev => [...prev, {
              role: 'assistant',
              content: parsed.message || 'Voici votre devis :',
              devisData: parsed.data,
            }]);
          } else {
            setMessages(prev => [...prev, {
              role: 'assistant',
              content: parsed.content || fullText,
              actions: parsed.actions,
            }]);
          }
        },
        onError: (error) => {
          setIsStreaming(false);
          setStreamedText('');
          setMessages(prev => [...prev, {
            role: 'assistant',
            content: `Erreur: ${error.message}. L'IA est peut-être indisponible. Réessayez ou créez votre devis manuellement.`,
            isError: true,
          }]);
        },
      }
    );
  }, [input, messages, isStreaming]);

  // Photo capture handler
  const handlePhoto = useCallback(async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64Full = event.target.result;
      const base64Data = base64Full.split(',')[1];
      const mediaType = file.type || 'image/jpeg';

      setPhotoPreview(base64Full);
      setIsAnalyzing(true);
      setMessages(prev => [...prev, {
        role: 'user',
        content: 'photo',
        displayText: 'Photo envoyee pour analyse',
        imageUrl: base64Full,
      }]);

      try {
        const result = await analyzePhoto(base64Data, mediaType);

        if (result.analysis) {
          const lignes = photoAnalysisToDevisLignes(result.analysis);
          const devisData = {
            objet: `${result.analysis.type_piece || 'Travaux'} - Estimation photo`,
            lignes,
            notes: result.analysis.notes || '',
            tvaRate: 10,
            validite: 30,
          };

          setPendingDevis(devisData);
          setMessages(prev => [...prev, {
            role: 'assistant',
            content: result.analysis.suggestion_message || `Analyse terminee ! ${result.analysis.type_piece}, ${result.analysis.surface_m2}m2, etat: ${result.analysis.etat}. ${result.analysis.travaux?.length || 0} postes identifies.`,
            devisData,
            photoAnalysis: result.analysis,
          }]);
        } else {
          setMessages(prev => [...prev, {
            role: 'assistant',
            content: result.response || 'Analyse en cours...',
          }]);
        }
      } catch (error) {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: `Erreur d'analyse photo: ${error.message}`,
          isError: true,
        }]);
      } finally {
        setIsAnalyzing(false);
        setPhotoPreview(null);
      }
    };
    reader.readAsDataURL(file);

    // Reset file input
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, []);

  // Create devis from AI data
  const handleCreateDevis = useCallback(() => {
    if (!pendingDevis || !onCreateDevis) return;
    onCreateDevis(pendingDevis);
    setPendingDevis(null);
    setMessages(prev => [...prev, {
      role: 'assistant',
      content: 'Devis créé avec succès ! Vous pouvez le retrouver dans vos Devis & Factures.',
    }]);
  }, [pendingDevis, onCreateDevis]);

  // Quick action buttons
  const quickActions = [
    { label: 'Créer un devis', icon: FileText, prompt: 'Je veux créer un devis' },
    { label: 'Analyser une photo', icon: Camera, action: () => fileInputRef.current?.click() },
    { label: 'Aide BTP', icon: Sparkles, prompt: 'Quels sont les prix moyens pour une rénovation de salle de bain ?' },
  ];

  const cardBg = isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200';
  const inputBg = isDark ? 'bg-slate-700 text-white placeholder-slate-400 border-slate-600' : 'bg-white text-slate-900 placeholder-slate-400 border-slate-300';
  const textPrimary = isDark ? 'text-white' : 'text-slate-900';
  const textSecondary = isDark ? 'text-slate-300' : 'text-slate-600';

  return (
    <div className={`flex flex-col ${compact ? 'h-[500px]' : 'h-full min-h-[600px]'} rounded-2xl border overflow-hidden ${cardBg}`}>
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b" style={{ borderColor: isDark ? '#334155' : '#e2e8f0' }}>
        <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white" style={{ background: couleur }}>
          <Bot size={20} />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className={`font-semibold text-sm ${textPrimary}`}>Assistant IA ChantierPro</h3>
          <p className={`text-xs ${textSecondary}`}>
            {isStreaming ? 'Reflexion en cours...' : isAnalyzing ? 'Analyse de la photo...' : 'Parlez ou écrivez pour créer un devis'}
          </p>
        </div>
        {onClose && (
          <button onClick={onClose} className={`p-2 rounded-lg transition-colors ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-100'}`}>
            <X size={18} className={textSecondary} />
          </button>
        )}
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Welcome message if empty */}
        {messages.length === 0 && (
          <div className="text-center py-8">
            <div className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center text-white" style={{ background: `linear-gradient(135deg, ${couleur}, ${couleur}dd)` }}>
              <Sparkles size={28} />
            </div>
            <h3 className={`text-lg font-bold mb-2 ${textPrimary}`}>
              Que puis-je faire pour vous ?
            </h3>
            <p className={`text-sm mb-6 max-w-md mx-auto ${textSecondary}`}>
              Décrivez votre projet en quelques mots et je crée votre devis instantanément. Vous pouvez aussi envoyer une photo de chantier.
            </p>
            {/* Quick actions */}
            <div className="flex flex-wrap justify-center gap-2">
              {quickActions.map((action, i) => (
                <button
                  key={i}
                  onClick={() => action.action ? action.action() : setInput(action.prompt)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all hover:shadow-md border ${isDark ? 'border-slate-600 hover:border-slate-500 text-slate-300' : 'border-slate-200 hover:border-slate-300 text-slate-600'}`}
                >
                  <action.icon size={16} style={{ color: couleur }} />
                  {action.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Chat messages */}
        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
            {/* Avatar */}
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
              msg.role === 'user'
                ? 'text-white'
                : isDark ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-600'
            }`} style={msg.role === 'user' ? { background: couleur } : {}}>
              {msg.role === 'user' ? <User size={14} /> : <Bot size={14} />}
            </div>

            {/* Message bubble */}
            <div className={`flex-1 max-w-[85%] ${msg.role === 'user' ? 'text-right' : ''}`}>
              {/* Photo in message */}
              {msg.imageUrl && (
                <img src={msg.imageUrl} alt="Photo chantier" className="rounded-xl max-h-48 mb-2 inline-block" />
              )}

              {/* Text content */}
              <div className={`inline-block px-4 py-2.5 rounded-2xl text-sm leading-relaxed max-w-full ${
                msg.role === 'user'
                  ? 'text-white rounded-br-md'
                  : msg.isError
                    ? isDark ? 'bg-red-900/30 text-red-300 border border-red-800' : 'bg-red-50 text-red-600 border border-red-200'
                    : isDark ? 'bg-slate-700 text-slate-200 rounded-bl-md' : 'bg-slate-100 text-slate-800 rounded-bl-md'
              }`} style={msg.role === 'user' ? { background: couleur } : {}}>
                {msg.role === 'user'
                  ? (msg.displayText || msg.content)
                  : formatMessageText(msg.displayText || msg.content)
                }
              </div>

              {/* Devis preview card */}
              {msg.devisData && (
                <div className={`mt-3 p-4 rounded-xl border ${isDark ? 'bg-slate-700/50 border-slate-600' : 'bg-orange-50/50 border-orange-200/50'}`}>
                  <div className="flex items-center gap-2 mb-3">
                    <FileText size={16} style={{ color: couleur }} />
                    <span className={`font-semibold text-sm ${textPrimary}`}>{msg.devisData.objet || 'Devis généré'}</span>
                  </div>
                  <div className="space-y-1.5">
                    {msg.devisData.lignes?.slice(0, 5).map((l, j) => (
                      <div key={j} className={`flex justify-between text-xs ${textSecondary}`}>
                        <span className="truncate flex-1 mr-2">{l.description}</span>
                        <span className="font-medium whitespace-nowrap">{(l.quantite * l.prixUnitaire).toFixed(0)}  </span>
                      </div>
                    ))}
                    {msg.devisData.lignes?.length > 5 && (
                      <p className={`text-xs ${textSecondary}`}>+{msg.devisData.lignes.length - 5} autres lignes...</p>
                    )}
                  </div>
                  <div className={`flex items-center justify-between mt-3 pt-3 border-t ${isDark ? 'border-slate-600' : 'border-orange-200/50'}`}>
                    <span className={`font-bold text-sm ${textPrimary}`}>
                      Total HT: {msg.devisData.lignes?.reduce((s, l) => s + (l.quantite * l.prixUnitaire), 0).toLocaleString('fr-FR', { minimumFractionDigits: 2 })}
                    </span>
                    <button
                      onClick={handleCreateDevis}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-white text-sm font-medium hover:shadow-lg transition-all"
                      style={{ background: couleur }}
                    >
                      Créer le devis <ArrowRight size={14} />
                    </button>
                  </div>
                </div>
              )}

              {/* Photo analysis details */}
              {msg.photoAnalysis && (
                <div className={`mt-2 text-xs ${textSecondary}`}>
                  <span className="font-medium">Confiance: </span>
                  <span className={msg.photoAnalysis.confiance === 'haute' ? 'text-green-500' : msg.photoAnalysis.confiance === 'moyenne' ? 'text-amber-500' : 'text-red-500'}>
                    {msg.photoAnalysis.confiance}
                  </span>
                  {msg.photoAnalysis.duree_jours && (
                    <span className="ml-3">Duree estimee: {msg.photoAnalysis.duree_jours}j</span>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}

        {/* Streaming indicator */}
        {isStreaming && (
          <div className="flex gap-3">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${isDark ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-600'}`}>
              <Bot size={14} />
            </div>
            <div className={`inline-block px-4 py-2.5 rounded-2xl rounded-bl-md text-sm leading-relaxed ${isDark ? 'bg-slate-700 text-slate-200' : 'bg-slate-100 text-slate-800'}`}>
              {streamedText ? (
                // If the streamed text looks like JSON, show a friendly loading message
                streamedText.trimStart().startsWith('{') || streamedText.trimStart().startsWith('```') ? (
                  <span className="flex items-center gap-2">
                    <Loader2 size={14} className="animate-spin" style={{ color: couleur }} />
                    {streamedText.includes('"type": "devis"') || streamedText.includes('"type":"devis"')
                      ? 'Génération du devis en cours...'
                      : 'Réflexion en cours...'
                    }
                  </span>
                ) : (
                  formatMessageText(streamedText)
                )
              ) : (
                <span className="flex items-center gap-2">
                  <Loader2 size={14} className="animate-spin" style={{ color: couleur }} />
                  Réflexion...
                </span>
              )}
            </div>
          </div>
        )}

        {/* Photo analyzing indicator */}
        {isAnalyzing && (
          <div className="flex gap-3">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${isDark ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-600'}`}>
              <Bot size={14} />
            </div>
            <div className={`inline-block px-4 py-2.5 rounded-2xl rounded-bl-md text-sm ${isDark ? 'bg-slate-700 text-slate-200' : 'bg-slate-100 text-slate-800'}`}>
              <span className="flex items-center gap-2">
                <Loader2 size={14} className="animate-spin" style={{ color: couleur }} />
                Analyse de la photo en cours...
              </span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Voice interim text */}
      {interimText && (
        <div className={`px-4 py-2 text-xs italic border-t ${isDark ? 'bg-slate-700/50 border-slate-700 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-500'}`}>
          {interimText}...
        </div>
      )}

      {/* Input Area */}
      <div className={`p-3 border-t ${isDark ? 'border-slate-700 bg-slate-800/50' : 'border-slate-200 bg-white'}`}>
        <div className="flex items-end gap-2">
          {/* Photo button */}
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isStreaming || isAnalyzing}
            className={`p-2.5 rounded-xl transition-colors flex-shrink-0 ${isDark ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-slate-100 text-slate-500'} disabled:opacity-50`}
            title="Envoyer une photo"
          >
            <ImagePlus size={20} />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handlePhoto}
            className="hidden"
          />

          {/* Text input */}
          <div className="flex-1 relative">
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder={isListening ? 'Parlez...' : 'Décrivez votre devis ou posez une question...'}
              disabled={isStreaming || isAnalyzing}
              className={`w-full px-4 py-2.5 pr-12 rounded-xl border text-sm transition-all focus:ring-2 focus:ring-offset-0 disabled:opacity-50 ${inputBg}`}
              style={{ '--tw-ring-color': `${couleur}40` }}
            />
          </div>

          {/* Voice button */}
          {voiceSupported && (
            <button
              onClick={toggleListening}
              disabled={isStreaming || isAnalyzing}
              className={`p-2.5 rounded-xl transition-all flex-shrink-0 ${
                isListening
                  ? 'bg-red-500 text-white animate-pulse shadow-lg shadow-red-500/30'
                  : isDark ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-slate-100 text-slate-500'
              } disabled:opacity-50`}
              title={isListening ? 'Arreter' : 'Parler'}
            >
              {isListening ? <MicOff size={20} /> : <Mic size={20} />}
            </button>
          )}

          {/* Send button */}
          <button
            onClick={handleSend}
            disabled={!input.trim() || isStreaming || isAnalyzing}
            className="p-2.5 rounded-xl text-white transition-all hover:shadow-lg disabled:opacity-50 flex-shrink-0"
            style={{ background: input.trim() ? couleur : isDark ? '#475569' : '#94a3b8' }}
          >
            <Send size={20} />
          </button>
        </div>

        {/* Voice error */}
        {voiceError && (
          <p className="text-xs text-red-500 mt-1 px-1">{voiceError}</p>
        )}
      </div>
    </div>
  );
}
