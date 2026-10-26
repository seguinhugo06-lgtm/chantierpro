/**
 * TrialBanner — Sticky top banner for trial/downgrade messaging
 *
 * States:
 *  - Trial 5+ days: info "Essai gratuit · X jours restants"
 *  - Trial 2-4 days, last day, expired: alerte (à surveiller)
 *  - Downgrade (free, not trial): neutre "Plan Gratuit actif"
 *  - Jamais sur Mon plan ni sur les pages d'abonnement (prop `page`).
 *
 * Dismissable:
 *  - Trial banners: 7-day localStorage dismiss
 *  - Downgrade banner: session only
 *  - Forced re-show on state change (day thresholds)
 */

import { useState, useEffect, useMemo } from 'react';
import { X, Clock, AlertTriangle, ArrowRight } from 'lucide-react';
import { useSubscriptionStore } from '../../stores/subscriptionStore';

const DISMISS_KEY = 'cp_trial_banner_dismissed';

function getDismissData() {
  try {
    const raw = localStorage.getItem(DISMISS_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function setDismissData(state) {
  try {
    localStorage.setItem(DISMISS_KEY, JSON.stringify({
      state,
      timestamp: Date.now()
    }));
  } catch { /* bandeau non mémorisé : il réapparaîtra au prochain chargement */ }
}

function shouldShowBanner(currentState) {
  const data = getDismissData();
  if (!data) return true;

  // If state changed (crossed a threshold), always show
  if (data.state !== currentState) return true;

  // 7-day dismiss window
  const elapsed = Date.now() - data.timestamp;
  return elapsed > 7 * 24 * 60 * 60 * 1000;
}

/**
 * Get banner state key from days remaining.
 */
function getBannerState(daysLeft, isTrial, isFree) {
  if (isTrial) {
    if (daysLeft <= 0) return 'expired';
    if (daysLeft === 1) return 'last_day';
    if (daysLeft <= 4) return 'warning';
    return 'info';
  }
  if (isFree) return 'downgrade';
  return null; // Don't show for paid plans
}

// Tons : l'essai qui court est une information ; la fin d'essai est « à surveiller » (ambre), jamais une erreur.
const BANNER_CONFIG = {
  info: {
    ton: 'bg-info-fond text-info-texte',
    icon: Clock,
    getMessage: (days) => `Essai gratuit · ${days} jours restants`,
    cta: 'Choisir un plan'
  },
  warning: {
    ton: 'bg-alerte-fond text-alerte-texte',
    icon: AlertTriangle,
    getMessage: (days) => `Plus que ${days} jour${days > 1 ? 's' : ''} d'essai gratuit`,
    cta: 'Activer mon plan'
  },
  last_day: {
    ton: 'bg-alerte-fond text-alerte-texte',
    icon: AlertTriangle,
    getMessage: () => 'Dernier jour d\'essai',
    cta: 'Activez maintenant pour ne rien perdre'
  },
  expired: {
    ton: 'bg-alerte-fond text-alerte-texte',
    icon: AlertTriangle,
    getMessage: () => 'Votre essai est terminé',
    cta: 'Choisir un plan pour continuer'
  },
  downgrade: {
    ton: 'bg-surface text-encre-2',
    icon: null,
    getMessage: () => 'Plan Gratuit actif',
    cta: 'En savoir plus'
  }
};

// Pages où le bandeau n'a rien à dire : on y est déjà, devant les offres (audit du 20 oct. 2026).
const PAGES_SANS_BANDEAU = new Set(['plan', 'billing', 'pricing', 'checkout-success']);

export default function TrialBanner({ page }) {
  const planId = useSubscriptionStore((s) => s.planId);
  const sub = useSubscriptionStore((s) => s.subscription);
  const openUpgradeModal = useSubscriptionStore((s) => s.openUpgradeModal);

  // Compute trial state directly from subscription data
  // (avoid calling store methods inside selectors — they use get() which can cause issues)
  const isTrial = sub?.status === 'trialing';
  const isFree = planId === 'gratuit';
  const daysLeft = useMemo(() => {
    if (!sub?.trial_end) return 0;
    const diff = new Date(sub.trial_end) - new Date();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  }, [sub?.trial_end]);

  const bannerState = useMemo(() =>
    getBannerState(daysLeft, isTrial, isFree),
    [daysLeft, isTrial, isFree]
  );

  const [dismissed, setDismissed] = useState(false);
  const [sessionDismissed, setSessionDismissed] = useState(false);

  // Check localStorage dismiss on mount
  useEffect(() => {
    if (bannerState && !shouldShowBanner(bannerState)) {
      setDismissed(true);
    }
  }, [bannerState]);

  // Don't render for paid plans or null state
  if (!bannerState || PAGES_SANS_BANDEAU.has(page)) return null;

  // Downgrade: dismissed for session only
  if (bannerState === 'downgrade' && sessionDismissed) return null;

  // Trial: 7-day dismiss
  if (bannerState !== 'downgrade' && dismissed) return null;

  const config = BANNER_CONFIG[bannerState];
  const Icon = config.icon;

  const handleDismiss = () => {
    if (bannerState === 'downgrade') {
      setSessionDismissed(true);
    } else {
      setDismissData(bannerState);
      setDismissed(true);
    }
  };

  return (
    <div className={`sticky top-0 z-40 border-b border-bord ${config.ton}`} data-bandeau="plan">
      <div className="max-w-7xl mx-auto pl-4 pr-1 py-0.5 flex items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-x-2 flex-1 min-w-0 text-sm">
          {Icon && <Icon size={16} aria-hidden="true" className="flex-shrink-0" />}
          <span>{config.getMessage(daysLeft)}</span>
          <button
            type="button"
            onClick={() => openUpgradeModal()}
            className="min-h-[44px] inline-flex items-center gap-1 font-semibold underline underline-offset-2"
          >
            {config.cta}
            <ArrowRight size={14} aria-hidden="true" />
          </button>
        </div>
        <button
          type="button"
          onClick={handleDismiss}
          className="w-11 h-11 flex items-center justify-center rounded-xl flex-shrink-0 opacity-80 hover:opacity-100 hover:bg-surface-2/60 transition-colors"
          aria-label="Fermer le bandeau"
        >
          <X size={18} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
