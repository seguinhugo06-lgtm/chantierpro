import { useState, useEffect, useRef } from 'react';
import { Lightbulb, X } from 'lucide-react';

/**
 * Smart Tooltip Component
 * Shows helpful hints on hover with "Got it" dismissal
 */
export function SmartTooltip({
  id,
  content,
  children,
  position = 'top', // top, bottom, left, right
  showOnce = true,
  delay = 500,
  isDark = false
}) {
  const [isVisible, setIsVisible] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const timeoutRef = useRef(null);
  const triggerRef = useRef(null);

  // Check if already dismissed
  useEffect(() => {
    if (showOnce) {
      const dismissed = localStorage.getItem(`tooltip_dismissed_${id}`);
      if (dismissed) setIsDismissed(true);
    }
  }, [id, showOnce]);

  const handleMouseEnter = () => {
    if (isDismissed) return;

    timeoutRef.current = setTimeout(() => {
      setIsVisible(true);
    }, delay);
  };

  const handleMouseLeave = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setIsVisible(false);
  };

  const handleDismiss = () => {
    setIsVisible(false);
    setIsDismissed(true);
    if (showOnce) {
      localStorage.setItem(`tooltip_dismissed_${id}`, 'true');
    }
    // Analytics: helper_tooltip_dismissed
  };

  useEffect(() => {
    // Analytics: helper_tooltip_viewed
  }, [isVisible, id]);

  const positionClasses = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2'
  };

  const arrowClasses = {
    top: 'top-full left-1/2 -translate-x-1/2 border-l-transparent border-r-transparent border-b-transparent border-t-slate-900',
    bottom: 'bottom-full left-1/2 -translate-x-1/2 border-l-transparent border-r-transparent border-t-transparent border-b-slate-900',
    left: 'left-full top-1/2 -translate-y-1/2 border-t-transparent border-b-transparent border-r-transparent border-l-slate-900',
    right: 'right-full top-1/2 -translate-y-1/2 border-t-transparent border-b-transparent border-l-transparent border-r-slate-900'
  };

  return (
    <div
      ref={triggerRef}
      className="relative inline-block"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {children}

      {isVisible && !isDismissed && (
        <div
          className={`absolute z-50 ${positionClasses[position]} animate-tooltip-in`}
          role="tooltip"
        >
          <div className="bg-slate-900 text-white rounded-lg shadow-xl p-3 max-w-xs">
            <div className="flex items-start gap-2">
              <Lightbulb className="w-4 h-4 text-yellow-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm leading-relaxed">{content}</p>
                <button
                  onClick={handleDismiss}
                  className="mt-2 text-xs text-slate-400 hover:text-white transition-colors"
                >
                  Compris ✓
                </button>
              </div>
            </div>
          </div>

          {/* Arrow */}
          <div
            className={`absolute w-0 h-0 border-4 ${arrowClasses[position]}`}
          />
        </div>
      )}

      <style>{`
        .animate-tooltip-in {
          animation: tooltipIn 0.2s ease-out;
        }
        @keyframes tooltipIn {
          from { opacity: 0; transform: translateY(5px) translateX(-50%); }
          to { opacity: 1; transform: translateY(0) translateX(-50%); }
        }
      `}</style>
    </div>
  );
}

/**
 * Predefined tooltips data
 */
export const TOOLTIP_DATA = {
  receivePayment: {
    id: 'receive-payment',
    content: 'Le client peut payer instantanément en scannant ce QR Code avec son téléphone'
  },
  offlineMode: {
    id: 'offline-mode',
    content: 'Activez pour travailler sans réseau. Tout se synchronise automatiquement quand vous avez du WiFi'
  },
  marginBadge: {
    id: 'margin-badge',
    content: 'Marge brute calculée automatiquement : (Prix vente - Coûts) / Prix vente. 🟢 >30% = excellent | 🟡 15-30% = correct | 🔴 <15% = risque'
  },
  templates: {
    id: 'templates',
    content: 'Choisissez un modèle pré-rempli pour créer votre devis en 3 minutes au lieu de 20'
  },
  signature: {
    id: 'signature',
    content: 'Faites signer vos devis directement sur l\'écran. Légalement valide en France'
  },
  quickActions: {
    id: 'quick-actions',
    content: 'Accès rapide aux actions les plus utilisées. Personnalisez-les dans les paramètres'
  },
  clientSearch: {
    id: 'client-search',
    content: 'Tapez au moins 2 caractères pour rechercher un client existant'
  },
  tvaRate: {
    id: 'tva-rate',
    content: 'TVA réduite (10%) applicable pour travaux d\'amélioration dans logements de +2 ans'
  },
  deposit: {
    id: 'deposit',
    content: 'Acompte recommandé : 30% à la signature pour sécuriser votre trésorerie'
  },
  legalMentions: {
    id: 'legal-mentions',
    content: 'Toutes les mentions légales obligatoires sont incluses automatiquement'
  }
};

export default SmartTooltip;
