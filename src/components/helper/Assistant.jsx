import { useState, useEffect } from 'react';
import {
  MessageCircle, X, HelpCircle, PlayCircle, Mail, FileText,
  AlertTriangle, CheckCircle, TrendingUp, Clock, Zap, Heart
} from 'lucide-react';

/**
 * Floating Assistant (The "Buddy")
 * Contextual help that appears at the right moment
 */
export default function Assistant({
  suggestions = [],
  onAction,
  isDark = false,
  couleur = '#f97316'
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentSuggestion, setCurrentSuggestion] = useState(null);
  const [dismissedSuggestions, setDismissedSuggestions] = useState([]);
  const [isPulsing, setIsPulsing] = useState(false);

  // Check for new suggestions
  useEffect(() => {
    const dismissed = JSON.parse(localStorage.getItem('assistant_dismissed') || '[]');
    setDismissedSuggestions(dismissed);
  }, []);

  useEffect(() => {
    // Find first non-dismissed suggestion
    const activeSuggestion = suggestions.find(
      s => !dismissedSuggestions.includes(s.id)
    );

    if (activeSuggestion && activeSuggestion !== currentSuggestion) {
      setCurrentSuggestion(activeSuggestion);
      setIsPulsing(true);

      // Auto-open for high priority suggestions
      if (activeSuggestion.priority === 'high') {
        setTimeout(() => setIsOpen(true), 1000);
      }
    }
  }, [suggestions, dismissedSuggestions]);

  const handleDismiss = (suggestionId) => {
    const newDismissed = [...dismissedSuggestions, suggestionId];
    setDismissedSuggestions(newDismissed);
    localStorage.setItem('assistant_dismissed', JSON.stringify(newDismissed));
    setCurrentSuggestion(null);
    setIsOpen(false);
    setIsPulsing(false);

    console.log('Analytics: helper_assistant_suggestion_dismissed', { suggestionId });
  };

  const handleAction = (action, suggestionId) => {
    console.log('Analytics: helper_assistant_action_clicked', { action, suggestionId });
    onAction?.(action);
    handleDismiss(suggestionId);
  };

  const toggleOpen = () => {
    setIsOpen(!isOpen);
    setIsPulsing(false);

    if (!isOpen && currentSuggestion) {
      console.log('Analytics: helper_assistant_suggestion_viewed', {
        suggestionId: currentSuggestion.id
      });
    }
  };

  const getIcon = (iconType) => {
    const icons = {
      help: HelpCircle,
      video: PlayCircle,
      mail: Mail,
      document: FileText,
      warning: AlertTriangle,
      success: CheckCircle,
      trend: TrendingUp,
      clock: Clock,
      zap: Zap,
      heart: Heart
    };
    return icons[iconType] || HelpCircle;
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {/* Suggestion bubble */}
      {isOpen && currentSuggestion && (
        <div
          className={`absolute bottom-16 right-0 w-80 rounded-2xl shadow-2xl overflow-hidden animate-slide-up ${
            isDark ? 'bg-gray-800' : 'bg-white'
          }`}
        >
          {/* Header */}
          <div
            className="p-4 text-white"
            style={{ backgroundColor: couleur }}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                {(() => {
                  const Icon = getIcon(currentSuggestion.icon);
                  return <Icon className="w-5 h-5" />;
                })()}
                <h3 className="font-semibold">{currentSuggestion.title}</h3>
              </div>
              <button
                onClick={() => handleDismiss(currentSuggestion.id)}
                className="p-1 hover:bg-white/20 rounded-full transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="p-4">
            <p className={`text-sm mb-4 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
              {currentSuggestion.message}
            </p>

            {/* Actions */}
            <div className="flex flex-wrap gap-2">
              {currentSuggestion.actions?.map((action, i) => (
                <button
                  key={i}
                  onClick={() => handleAction(action.action, currentSuggestion.id)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all hover:scale-105 active:scale-95 ${
                    action.primary
                      ? 'text-white'
                      : isDark
                      ? 'bg-gray-700 text-gray-200 hover:bg-gray-600'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                  style={action.primary ? { backgroundColor: couleur } : {}}
                >
                  {action.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Floating button */}
      <button
        onClick={toggleOpen}
        className={`relative w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all hover:scale-110 active:scale-95 ${
          isPulsing ? 'animate-pulse-ring' : ''
        }`}
        style={{ backgroundColor: couleur }}
      >
        {isOpen ? (
          <X className="w-6 h-6 text-white" />
        ) : (
          <MessageCircle className="w-6 h-6 text-white" />
        )}

        {/* Notification badge */}
        {currentSuggestion && !isOpen && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
            <span className="text-white text-xs font-bold">1</span>
          </span>
        )}

        {/* Pulse ring */}
        {isPulsing && (
          <span
            className="absolute inset-0 rounded-full animate-ping opacity-30"
            style={{ backgroundColor: couleur }}
          />
        )}
      </button>

      <style>{`
        .animate-slide-up {
          animation: slideUp 0.3s ease-out;
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .animate-pulse-ring {
          animation: pulseRing 2s ease-in-out infinite;
        }
        @keyframes pulseRing {
          0%, 100% { box-shadow: 0 0 0 0 rgba(249, 115, 22, 0.4); }
          50% { box-shadow: 0 0 0 15px rgba(249, 115, 22, 0); }
        }
      `}</style>
    </div>
  );
}

/**
 * Predefined suggestions based on user context
 */
export const SUGGESTION_TYPES = {
  // User stuck on page > 30 seconds
  STUCK: {
    id: 'stuck-help',
    title: 'Besoin d\'aide ? 🤔',
    message: 'Vous semblez bloqué. Je peux vous aider !',
    icon: 'help',
    priority: 'medium',
    actions: [
      { label: 'Voir un tutoriel vidéo', action: 'open_video_tutorial', primary: true },
      { label: 'Contacter le support', action: 'open_support' },
      { label: 'Non merci', action: 'dismiss' }
    ]
  },

  // Monday morning, no quotes this week
  MONDAY_MOTIVATION: {
    id: 'monday-motivation',
    title: 'Prêt à démarrer la semaine ? 👋',
    message: 'Créez votre premier devis de la semaine en 3 minutes chrono ! ⚡',
    icon: 'zap',
    priority: 'low',
    actions: [
      { label: 'Créer un devis', action: 'create_quote', primary: true },
      { label: 'Plus tard', action: 'dismiss' }
    ]
  },

  // Quote signed but no deposit
  SIGNED_NO_DEPOSIT: {
    id: 'signed-no-deposit',
    title: 'Devis signé ! 🎉',
    message: 'Sécurisez votre trésorerie en encaissant l\'acompte maintenant 💳',
    icon: 'success',
    priority: 'high',
    actions: [
      { label: 'Recevoir l\'acompte', action: 'receive_deposit', primary: true },
      { label: 'Plus tard', action: 'dismiss' }
    ]
  },

  // Project with margin < 15%
  LOW_MARGIN: {
    id: 'low-margin-warning',
    title: '⚠️ Attention à votre marge !',
    message: 'Ce chantier est à faible marge. Vous risquez de perdre de l\'argent. Voulez-vous recalculer ?',
    icon: 'warning',
    priority: 'high',
    actions: [
      { label: 'Analyser les coûts', action: 'analyze_costs', primary: true },
      { label: 'Je gère', action: 'dismiss' }
    ]
  },

  // 5 quotes created this week
  FIVE_QUOTES_WEEK: {
    id: 'five-quotes-celebration',
    title: 'Bravo ! 🎉',
    message: 'Vous avez créé 5 devis cette semaine. Vous êtes 3× plus rapide qu\'avec votre ancien système !',
    icon: 'heart',
    priority: 'low',
    actions: [
      { label: 'Voir mes stats', action: 'view_stats', primary: true },
      { label: 'Merci !', action: 'dismiss' }
    ]
  },

  // Form started but abandoned
  FORM_ABANDONED: {
    id: 'form-abandoned',
    title: 'Vous aviez commencé un devis',
    message: 'Voulez-vous le sauvegarder comme brouillon pour le finir plus tard ?',
    icon: 'clock',
    priority: 'medium',
    actions: [
      { label: 'Sauvegarder', action: 'save_draft', primary: true },
      { label: 'Abandonner', action: 'discard_draft' }
    ]
  },

  // Invoice unpaid > 30 days
  UNPAID_INVOICE: {
    id: 'unpaid-invoice',
    title: 'Factures impayées',
    message: 'Vous avez des factures impayées depuis plus de 30 jours. Voulez-vous envoyer une relance automatique ?',
    icon: 'warning',
    priority: 'medium',
    actions: [
      { label: 'Envoyer relance', action: 'send_reminder', primary: true },
      { label: 'Voir les factures', action: 'view_invoices' }
    ]
  }
};

/**
 * Hook to manage assistant suggestions based on context
 */
export function useAssistantSuggestions(context) {
  const [suggestions, setSuggestions] = useState([]);

  useEffect(() => {
    const newSuggestions = [];

    // Check various conditions
    if (context.isStuck) {
      newSuggestions.push(SUGGESTION_TYPES.STUCK);
    }

    if (context.isMondayMorning && context.weeklyQuoteCount === 0) {
      newSuggestions.push(SUGGESTION_TYPES.MONDAY_MOTIVATION);
    }

    if (context.hasSignedQuoteWithoutDeposit) {
      newSuggestions.push(SUGGESTION_TYPES.SIGNED_NO_DEPOSIT);
    }

    if (context.hasLowMarginProject) {
      newSuggestions.push(SUGGESTION_TYPES.LOW_MARGIN);
    }

    if (context.weeklyQuoteCount >= 5 && !context.celebratedFiveQuotes) {
      newSuggestions.push(SUGGESTION_TYPES.FIVE_QUOTES_WEEK);
    }

    if (context.hasAbandonedForm) {
      newSuggestions.push(SUGGESTION_TYPES.FORM_ABANDONED);
    }

    if (context.hasUnpaidInvoices) {
      newSuggestions.push(SUGGESTION_TYPES.UNPAID_INVOICE);
    }

    setSuggestions(newSuggestions);
  }, [context]);

  return suggestions;
}
