/**
 * TrialBanner — Sticky top banner for trial/downgrade messaging
 *
 * States:
 *  - Trial 5+ days: blue "Essai gratuit · X jours restants"
 *  - Trial 2-4 days: orange "Plus que X jours d'essai"
 *  - Trial 1 day: red "Dernier jour d'essai"
 *  - Trial expired: red "Votre essai est terminé"
 *  - Downgrade (free, not trial): gray "Plan Découverte actif"
 *
 * Dismissable:
 *  - Trial banners: 7-day localStorage dismiss
 *  - Downgrade banner: session only
 *  - Forced re-show on state change (day thresholds)
 */

import React, { useState, useEffect, useMemo } from 'react';
import { X, Clock, AlertTriangle, ArrowRight } from 'lucide-react';
import { useSubscriptionStore } from '../../stores/subscriptionStore';

const DISMISS_KEY = 'cp_trial_banner_dismissed';
const DISMISS_STATE_KEY = 'cp_trial_banner_state';

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
  } catch {}
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

const BANNER_CONFIG = {
  info: {
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    text: 'text-blue-700',
    icon: Clock,
    iconColor: 'text-blue-500',
    getMessage: (days) => `Essai gratuit · ${days} jours restants`,
    cta: 'Choisir un plan',
    ctaColor: 'text-blue-600 hover:text-blue-700'
  },
  warning: {
    bg: 'bg-orange-50',
    border: 'border-orange-200',
    text: 'text-orange-700',
    icon: AlertTriangle,
    iconColor: 'text-orange-500',
    getMessage: (days) => `Plus que ${days} jour${days > 1 ? 's' : ''} d'essai gratuit`,
    cta: 'Activer mon plan',
    ctaColor: 'text-orange-600 hover:text-orange-700 font-bold'
  },
  last_day: {
    bg: 'bg-red-50',
    border: 'border-red-200',
    text: 'text-red-700',
    icon: AlertTriangle,
    iconColor: 'text-red-500',
    getMessage: () => 'Dernier jour d\'essai',
    cta: 'Activez maintenant pour ne rien perdre',
    ctaColor: 'text-red-600 hover:text-red-700 font-bold'
  },
  expired: {
    bg: 'bg-red-100',
    border: 'border-red-300',
    text: 'text-red-800',
    icon: AlertTriangle,
    iconColor: 'text-red-600',
    getMessage: () => 'Votre essai est terminé',
    cta: 'Choisir un plan pour continuer',
    ctaColor: 'text-red-700 hover:text-red-800 font-bold underline'
  },
  downgrade: {
    bg: 'bg-slate-50/50',
    border: 'border-slate-200',
    text: 'text-slate-600',
    icon: null,
    iconColor: '',
    getMessage: () => 'Plan Gratuit actif',
    cta: 'En savoir plus',
    ctaColor: 'text-slate-700 hover:text-slate-900'
  }
};

export default function TrialBanner() {
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
  if (!bannerState) return null;

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
    <div className={`sticky top-0 z-40 ${config.bg} border-b ${config.border} transition-all`}>
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {Icon && <Icon size={16} className={`${config.iconColor} flex-shrink-0`} />}
          <span className={`text-sm ${config.text} truncate`}>
            {config.getMessage(daysLeft)}
            {' · '}
            <button
              onClick={() => openUpgradeModal()}
              className={`${config.ctaColor} transition-colors inline-flex items-center gap-1`}
            >
              {config.cta}
              <ArrowRight size={14} />
            </button>
          </span>
        </div>
        <button
          onClick={handleDismiss}
          className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-white/50/50 transition-all flex-shrink-0"
          aria-label="Fermer la bannière"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
