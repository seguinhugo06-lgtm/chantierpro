/**
 * PricingPage — 3-plan pricing page (Gratuit / Artisan 14,90€ / Équipe 29,90€)
 *
 * Accessible as an internal route (page='pricing') or standalone.
 * Responsive: 3-col on desktop, stacked on mobile.
 */

import React, { useState, useCallback, useRef } from 'react';
import {
  Check, X, ChevronDown, ArrowRight, Zap, Hammer, Users,
  Star, Shield, Clock, CreditCard, MessageCircle
} from 'lucide-react';
import { useSubscriptionStore, PLANS, PLAN_ORDER, YEARLY_DISCOUNT } from '../../stores/subscriptionStore';
import { createCheckoutSession } from '../../services/subscriptionsApi';
import { toast } from '../../stores/toastStore';
import { isDemo } from '../../supabaseClient';

const PLAN_ICONS = { gratuit: Zap, artisan: Hammer, equipe: Users };

// ─── PricingToggle ──────────────────────────────────────────────────────────

function PricingToggle({ billing, setBilling }) {
  return (
    <div className="flex items-center justify-center gap-4 mt-8">
      <span className={`text-sm font-semibold transition-colors ${billing === 'monthly' ? 'text-slate-900' : 'text-slate-400'}`}>
        Mensuel
      </span>
      <button
        onClick={() => setBilling(b => b === 'monthly' ? 'yearly' : 'monthly')}
        className={`relative w-14 h-7 rounded-full transition-colors ${billing === 'yearly' ? 'bg-orange-500' : 'bg-slate-300'}`}
        aria-label="Basculer entre facturation mensuelle et annuelle"
      >
        <span className={`absolute top-0.5 w-6 h-6 rounded-full bg-white shadow-md transition-transform ${billing === 'yearly' ? 'translate-x-7' : 'translate-x-0.5'}`} />
      </button>
      <span className={`text-sm font-semibold transition-colors ${billing === 'yearly' ? 'text-slate-900' : 'text-slate-400'}`}>
        Annuel
      </span>
      {billing === 'yearly' && (
        <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-green-50 text-green-700 border border-green-200">
          Economisez {YEARLY_DISCOUNT}%
        </span>
      )}
    </div>
  );
}

// ─── PricingCard ────────────────────────────────────────────────────────────

function PricingCard({ plan, billing, isCurrent, isLoading, onSelect }) {
  const Icon = PLAN_ICONS[plan.id] || Zap;
  const isRecommended = plan.badge === 'RECOMMANDÉ';
  const isPopular = plan.badge === 'POPULAIRE';
  const hasBadge = isRecommended || isPopular;
  const price = billing === 'yearly' && plan.priceYearly
    ? (plan.priceYearly / 12).toFixed(2).replace('.', ',')
    : plan.priceMonthly;

  const badgeColor = isRecommended ? 'bg-purple-500' : 'bg-orange-500';
  const borderHighlight = isPopular
    ? 'border-orange-300 shadow-[0_20px_25px_-5px_rgba(249,115,22,0.1)] scale-[1.02] z-10'
    : isRecommended
      ? 'border-purple-300 shadow-[0_20px_25px_-5px_rgba(139,92,246,0.1)] z-10'
      : '';

  const ctaLabel = plan.priceMonthly === 0
    ? 'Commencer gratuitement'
    : isPopular
      ? 'Essayer Artisan 14 jours gratuits'
      : 'Essayer Équipe 14 jours gratuits';

  return (
    <div
      className={`relative rounded-2xl border-2 px-6 py-8 transition-all duration-300 hover:scale-[1.02] hover:shadow-xl ${
        hasBadge ? borderHighlight : 'hover:shadow-lg'
      }`}
      style={{ borderColor: hasBadge ? undefined : plan.borderColor }}
    >
      {/* Badge ribbon */}
      {hasBadge && (
        <div className="absolute -top-4 left-1/2 -translate-x-1/2">
          <span className={`px-4 py-1.5 text-xs font-bold rounded-full ${badgeColor} text-white shadow-lg`}>
            {plan.badge}
          </span>
        </div>
      )}

      {/* Current badge */}
      {isCurrent && !hasBadge && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="px-3 py-1 text-xs font-semibold rounded-full bg-slate-600 text-white">
            Plan actuel
          </span>
        </div>
      )}

      {/* Plan badge */}
      <span
        className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border"
        style={{
          backgroundColor: plan.bgColor,
          color: plan.color,
          borderColor: plan.borderColor
        }}
      >
        <Icon size={12} className="mr-1.5" />
        {plan.name}
      </span>

      {/* Target audience */}
      <p className="text-sm text-slate-500 mt-2">{plan.target}</p>

      {/* Price */}
      <div className="mt-5 mb-6">
        {plan.priceMonthly === 0 ? (
          <div>
            <p className="text-3xl font-bold text-slate-900">Gratuit</p>
            <p className="text-sm text-slate-500 mt-1">Pour toujours</p>
          </div>
        ) : (
          <div>
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-bold" style={{ color: plan.color }}>
                {billing === 'yearly' ? price : typeof plan.priceMonthly === 'number' ? plan.priceMonthly.toFixed(2).replace('.', ',') : plan.priceMonthly}€
              </span>
              <span className="text-sm text-slate-500">HT/mois</span>
            </div>
            {billing === 'yearly' && (
              <p className="text-xs text-slate-400 mt-1">
                Facturé {plan.priceYearly}€ annuellement
              </p>
            )}
            {billing === 'monthly' && (
              <p className="text-xs text-slate-400 mt-1">
                ou {plan.priceYearly}€/an (économisez {YEARLY_DISCOUNT}%)
              </p>
            )}
          </div>
        )}
      </div>

      {/* CTA Button */}
      <button
        onClick={() => onSelect(plan.id)}
        disabled={isCurrent || isLoading}
        className={`w-full py-3 rounded-xl font-semibold text-sm transition-all ${
          isCurrent
            ? 'bg-slate-100 text-slate-400 cursor-default'
            : isPopular
              ? 'bg-orange-500 text-white hover:bg-orange-600 hover:shadow-lg hover:shadow-orange-500/25'
              : isRecommended
                ? 'bg-purple-500 text-white hover:bg-purple-600 hover:shadow-lg hover:shadow-purple-500/25'
                : 'text-white hover:opacity-90'
        }`}
        style={!isCurrent && !isPopular && !isRecommended ? { backgroundColor: plan.color } : {}}
      >
        {isLoading ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Chargement...
          </span>
        ) : isCurrent ? (
          'Plan actuel'
        ) : (
          ctaLabel
        )}
      </button>

      {/* Features separator */}
      <div className="border-t border-slate-200 my-6" />

      {/* Feature list */}
      <ul className="space-y-2.5">
        {plan.featureLabels.map((feat, i) => (
          <li key={i} className="flex items-start gap-2 text-sm">
            {feat.included ? (
              <Check size={16} className="text-green-500 flex-shrink-0 mt-0.5" />
            ) : (
              <X size={16} className="text-slate-300 flex-shrink-0 mt-0.5" />
            )}
            <span className={feat.included ? 'text-slate-700' : 'text-slate-400'}>
              {feat.name}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ─── FAQ Section ────────────────────────────────────────────────────────────

const FAQ_ITEMS = [
  {
    q: 'Puis-je tester gratuitement ?',
    a: 'Oui ! Les plans Artisan et Équipe incluent 14 jours d\'essai gratuit sans carte bancaire. Toutes les fonctionnalités sont accessibles pendant l\'essai. À la fin, vous passez automatiquement au plan Gratuit si vous ne souscrivez pas.'
  },
  {
    q: 'Quelle est la différence entre Artisan et Équipe ?',
    a: 'Le plan Artisan est idéal pour un artisan seul : devis illimités, signatures, marges, relances. Le plan Équipe ajoute la gestion multi-utilisateurs (jusqu\'à 10), le pointage des heures, la trésorerie, les sous-traitants et le support prioritaire.'
  },
  {
    q: 'Puis-je changer de plan à tout moment ?',
    a: 'Oui, vous pouvez monter ou descendre de plan à tout moment. Si vous annulez, votre plan reste actif jusqu\'à la fin de la période payée. Vos données restent accessibles en lecture seule pendant 30 jours.'
  },
  {
    q: 'Comment fonctionne la facturation ?',
    a: 'Paiement sécurisé par Stripe. Facturation mensuelle ou annuelle (2 mois offerts). Vous recevez une facture par email à chaque échéance.'
  },
  {
    q: 'Que se passe-t-il si je dépasse les limites du plan Gratuit ?',
    a: 'Vos données existantes restent accessibles. Vous ne pourrez simplement plus créer de nouvelles ressources au-delà de vos limites. Passez à un plan supérieur pour lever les restrictions.'
  },
  {
    q: 'Mes données sont-elles sécurisées ?',
    a: 'Absolument. Vos données sont hébergées en Europe, chiffrées en transit et au repos. Nous sommes conformes RGPD avec export et suppression de données sur demande.'
  }
];

function FAQSection({ isDark }) {
  const [openIndex, setOpenIndex] = useState(null);

  return (
    <section className="py-16 max-w-3xl mx-auto">
      <h2 className={`text-2xl font-bold text-center mb-10 ${isDark ? 'text-white' : 'text-slate-900'}`}>
        Questions fréquentes
      </h2>
      <div className="space-y-3">
        {FAQ_ITEMS.map((item, i) => (
          <div
            key={i}
            className={`rounded-xl border overflow-hidden transition-colors ${
              isDark ? 'border-slate-700 bg-slate-800' : 'border-slate-200 bg-white'
            }`}
          >
            <button
              onClick={() => setOpenIndex(openIndex === i ? null : i)}
              className={`w-full flex items-center justify-between px-5 py-4 text-left ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-50'} transition-colors`}
            >
              <span className={`font-semibold text-sm ${isDark ? 'text-white' : 'text-slate-900'}`}>
                {item.q}
              </span>
              <ChevronDown
                size={18}
                className={`text-slate-400 transition-transform flex-shrink-0 ml-3 ${openIndex === i ? 'rotate-180' : ''}`}
              />
            </button>
            {openIndex === i && (
              <div className={`px-5 pb-4 text-sm leading-relaxed ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                {item.a}
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

// ─── Testimonials Section ───────────────────────────────────────────────────

const TESTIMONIALS = [
  {
    name: 'Martin Dubois',
    job: 'Electricien',
    text: 'BatiGesti a transformé ma façon de travailler. Fini les devis sur papier, mes clients sont impressionnés par le professionnalisme.',
    stars: 5,
    color: '#F97316'
  },
  {
    name: 'Sophie Laurent',
    job: 'Plombière',
    text: 'Le suivi de chantier en temps réel me fait gagner au moins 2h par semaine. L\'export comptable est un vrai plus.',
    stars: 5,
    color: '#3B82F6'
  },
  {
    name: 'Pierre Moreau',
    job: 'Charpentier',
    text: 'Le plan Artisan est parfait pour un artisan seul. J\'ai tout ce qu\'il me faut pour gérer mes chantiers sereinement.',
    stars: 5,
    color: '#8B5CF6'
  }
];

function TestimonialsSection({ isDark }) {
  return (
    <section className={`py-16 ${isDark ? 'bg-slate-800/50' : 'bg-slate-50'} rounded-2xl my-8`}>
      <h2 className={`text-2xl font-bold text-center mb-10 ${isDark ? 'text-white' : 'text-slate-900'}`}>
        Nos utilisateurs adorent BatiGesti
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto px-6">
        {TESTIMONIALS.map((t, i) => (
          <div
            key={i}
            className={`rounded-xl p-6 ${isDark ? 'bg-slate-800 border border-slate-700' : 'bg-white border border-slate-200'} shadow-sm`}
          >
            {/* Stars */}
            <div className="flex gap-0.5 mb-3">
              {Array.from({ length: t.stars }).map((_, j) => (
                <Star key={j} size={14} className="text-yellow-400 fill-yellow-400" />
              ))}
            </div>
            {/* Quote */}
            <p className={`text-sm italic leading-relaxed mb-4 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
              &ldquo;{t.text}&rdquo;
            </p>
            {/* Author */}
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm"
                style={{ backgroundColor: t.color }}
              >
                {t.name.charAt(0)}
              </div>
              <div>
                <p className={`font-semibold text-sm ${isDark ? 'text-white' : 'text-slate-900'}`}>{t.name}</p>
                <p className="text-xs text-slate-500">{t.job}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

// ─── Trust Section ──────────────────────────────────────────────────────────

const TRUST_ITEMS = [
  { icon: Shield, label: 'Paiement sécurisé', desc: 'Stripe' },
  { icon: Clock, label: 'Essai 14 jours', desc: 'Sans CB' },
  { icon: CreditCard, label: 'Sans engagement', desc: 'Annulez quand vous voulez' },
  { icon: MessageCircle, label: 'Support réactif', desc: 'Réponse < 24h' }
];

function TrustSection({ isDark }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto py-10">
      {TRUST_ITEMS.map((item, i) => (
        <div key={i} className="flex flex-col items-center text-center gap-2">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isDark ? 'bg-slate-700' : 'bg-slate-100'}`}>
            <item.icon size={18} className="text-orange-500" />
          </div>
          <p className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>{item.label}</p>
          <p className="text-xs text-slate-500">{item.desc}</p>
        </div>
      ))}
    </div>
  );
}

// ─── CTA Section ────────────────────────────────────────────────────────────

function CTASection({ onAction }) {
  return (
    <section className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-2xl py-12 px-6 text-center my-8">
      <h2 className="text-2xl md:text-3xl font-bold text-white mb-3">
        Prêt à démarrer ?
      </h2>
      <p className="text-orange-100 mb-8 max-w-md mx-auto">
        Rejoignez les artisans qui font confiance à BatiGesti pour gérer leurs chantiers
      </p>
      <button
        onClick={onAction}
        className="inline-flex items-center gap-2 px-8 py-3.5 bg-white text-orange-600 font-bold rounded-xl hover:shadow-lg hover:shadow-white/25 transition-all"
      >
        Essayer gratuitement 14 jours
        <ArrowRight size={18} />
      </button>
    </section>
  );
}

// ─── Main PricingPage ───────────────────────────────────────────────────────

export default function PricingPage({ isDark, couleur, setPage }) {
  const currentPlanId = useSubscriptionStore((s) => s.planId);
  const setSubscription = useSubscriptionStore((s) => s.setSubscription);

  const [billing, setBilling] = useState('monthly');
  const [loadingPlan, setLoadingPlan] = useState(null);
  const scrollRef = useRef(null);

  const handleSelectPlan = useCallback(async (planId) => {
    if (planId === currentPlanId) return;

    // Free plan → no checkout needed
    if (planId === 'gratuit') return;

    setLoadingPlan(planId);
    try {
      const result = await createCheckoutSession(planId, billing);
      if (result.error) {
        toast.error('Erreur', result.error.message || 'Impossible de créer la session');
        return;
      }

      // Demo mode
      if (result.directUpgrade) {
        setSubscription({ plan: planId, status: 'active', billing_interval: billing });
        toast.success('Plan activé', `Bienvenue dans le plan ${PLANS[planId].name} !`);
        if (setPage) setPage('dashboard');
        return;
      }

      // Production → redirect Stripe
      if (result.url) window.location.href = result.url;
    } catch {
      toast.error('Erreur', 'Une erreur est survenue');
    } finally {
      setLoadingPlan(null);
    }
  }, [billing, currentPlanId, setSubscription, setPage]);

  const scrollToPlans = () => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="text-center pt-6 pb-2">
        <h1 className={`text-3xl md:text-4xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
          Le plan adapté à votre activité
        </h1>
        <p className={`mt-3 text-lg ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
          Commencez gratuitement, évoluez à votre rythme
        </p>

        <PricingToggle billing={billing} setBilling={setBilling} />
      </div>

      {/* Trust badges */}
      <TrustSection isDark={isDark} />

      {/* Plans grid — 3 columns */}
      <div ref={scrollRef} className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-4 px-1">
        {PLAN_ORDER.map((planId) => (
          <PricingCard
            key={planId}
            plan={PLANS[planId]}
            billing={billing}
            isCurrent={planId === currentPlanId}
            isLoading={loadingPlan === planId}
            onSelect={handleSelectPlan}
          />
        ))}
      </div>

      {/* Testimonials */}
      <TestimonialsSection isDark={isDark} />

      {/* FAQ */}
      <FAQSection isDark={isDark} />

      {/* CTA */}
      <CTASection onAction={scrollToPlans} />

      {/* Demo notice */}
      {isDemo && (
        <p className="text-center text-xs text-slate-400 py-4">
          Mode démo — le changement de plan est simulé
        </p>
      )}
    </div>
  );
}
