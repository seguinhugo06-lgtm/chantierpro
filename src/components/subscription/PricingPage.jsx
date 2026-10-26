/**
 * PricingPage — 3 plans (Gratuit / Artisan / Équipe). Les prix viennent de PLANS,
 * jamais en dur : ne pas les recopier ici.
 *
 * Accessible as an internal route (page='pricing') or standalone.
 * Responsive: 3-col on desktop, stacked on mobile.
 */

import { useState, useCallback, useRef } from 'react';
import {
  Check, X, ChevronDown, ArrowRight, Zap, Hammer, Users,
  Shield, Clock, CreditCard, MapPin
} from 'lucide-react';
import { useSubscriptionStore, PLANS, PLAN_ORDER } from '../../stores/subscriptionStore';
import { MENTION_TVA_ABONNEMENT, prixAbonnement, economieAnnuelle, moisOffertsCommuns } from '../../stores/prixAbonnement';
import { createCheckoutSession } from '../../services/subscriptionsApi';
import { toast } from '../../stores/toastStore';
import { isDemo } from '../../supabaseClient';
import { ouvrirLienExterne } from '../../lib/natif';
import { Bouton } from '../ui/Bouton';
import { Segmente } from '../ui/Onglets';

const PLAN_ICONS = { gratuit: Zap, artisan: Hammer, equipe: Users };

// ─── PricingToggle ──────────────────────────────────────────────────────────

function PricingToggle({ billing, setBilling }) {
  return (
    <div className="flex justify-center mt-8">
      <Segmente
        ariaLabel="Facturation"
        valeur={billing}
        onChange={setBilling}
        options={[
          { valeur: 'monthly', libelle: 'Mensuel' },
          { valeur: 'yearly', libelle: moisOffertsCommuns(PLANS) > 0 ? `Annuel · ${moisOffertsCommuns(PLANS)} mois offerts` : 'Annuel' },
        ]}
      />
    </div>
  );
}

// ─── PricingCard ────────────────────────────────────────────────────────────

function PricingCard({ plan, billing, isCurrent, isLoading, onSelect }) {
  const Icon = PLAN_ICONS[plan.id] || Zap;
  const isRecommended = plan.id === 'equipe';
  const isPopular = plan.id === 'artisan';
  const hasBadge = isRecommended || isPopular;
  // À l'année : l'équivalent mensuel, par l'outil commun
  const price = billing === 'yearly' && plan.priceYearly
    ? prixAbonnement(plan, 'mois-a-l-annee')
    : prixAbonnement(plan);

  const borderHighlight = isPopular ? 'border-accent ring-1 ring-accent' : 'border-bord-fort';

  const ctaLabel = plan.priceMonthly === 0
    ? 'Commencer gratuitement'
    : isPopular
      ? 'Passer au plan Artisan'
      : 'Passer au plan Équipe';

  return (
    <div
      className={`relative rounded-2xl border bg-surface shadow-e1 px-6 py-8 ${hasBadge ? borderHighlight : 'border-bord'}`}
    >
      {/* Badge ribbon */}
      {hasBadge && (
        <div className="absolute -top-4 left-1/2 -translate-x-1/2">
          <span className="px-4 py-1.5 text-sm font-semibold rounded-full bg-encre text-surface whitespace-nowrap">
            {plan.badge}
          </span>
        </div>
      )}

      {/* Current badge */}
      {isCurrent && !hasBadge && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="px-3 py-1 text-sm font-semibold rounded-full bg-encre text-surface">
            Plan actuel
          </span>
        </div>
      )}

      <h2 className="flex items-center gap-2 text-lg font-bold text-encre">
        <Icon size={18} aria-hidden="true" className="text-encre-2" />
        {plan.name}
      </h2>

      {/* Target audience */}
      <p className="text-sm text-encre-3 mt-2">{plan.target}</p>

      {/* Price */}
      <div className="mt-5 mb-6">
        {plan.priceMonthly === 0 ? (
          <div>
            <p className="text-3xl font-bold text-encre">Gratuit</p>
            <p className="text-sm text-encre-3 mt-1">Sans limite de durée</p>
          </div>
        ) : (
          <div>
            <div className="flex items-baseline gap-2 flex-wrap">
              <span className="text-3xl font-bold text-encre tabular-nums">
                {price}
              </span>
              <span className="text-sm text-encre-3">par mois</span>
            </div>
            <p className="text-sm text-encre-3 mt-1">{MENTION_TVA_ABONNEMENT}</p>
            {plan.offreLancement && (
              <p className="text-sm mt-1 font-medium text-encre-2">
                {plan.offreLancement} : prix gardé tant que vous restez abonné
              </p>
            )}
            {billing === 'yearly' && (
              <p className="text-sm text-encre-3 mt-1 tabular-nums">
                Facturé {prixAbonnement(plan, 'an')} par an
              </p>
            )}
            {billing === 'monthly' && (
              <p className="text-sm text-encre-3 mt-1 tabular-nums">
                ou {prixAbonnement(plan, 'an')} par an (économisez {economieAnnuelle(plan)})
              </p>
            )}
          </div>
        )}
      </div>

      {/* CTA Button */}
      <Bouton
        pleineLargeur
        variante={isPopular && !isCurrent ? 'principal' : 'secondaire'}
        onClick={() => onSelect(plan.id)}
        chargement={isLoading}
        disabled={isCurrent || isLoading}
      >
        {isCurrent ? 'Plan actuel' : ctaLabel}
      </Bouton>

      {/* Features separator */}
      <div className="border-t border-bord my-6" />

      {/* Feature list */}
      <ul className="space-y-2.5">
        {plan.featureLabels.map((feat, i) => (
          <li key={i} className="flex items-start gap-2 text-sm">
            {feat.included ? (
              <Check size={16} aria-hidden="true" className="text-succes-point flex-shrink-0 mt-0.5" />
            ) : (
              <X size={16} aria-hidden="true" className="text-encre-3 flex-shrink-0 mt-0.5" />
            )}
            <span className={feat.included ? 'text-encre-2' : 'text-encre-3'}>
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
    a: 'Oui ! Le plan Gratuit est disponible sans limite de temps et sans carte bancaire : 5 devis par mois, 10 clients, 2 chantiers. Passez à Artisan ou Équipe quand vous en avez besoin — et revenez au plan Gratuit à tout moment, sans perdre vos données.'
  },
  {
    q: 'Quelle est la différence entre Artisan et Équipe ?',
    a: 'Le plan Artisan lève les limites du plan Gratuit pour un artisan seul (vous + 1 collaborateur) : devis, clients, chantiers et photos sans limite. Le plan Équipe ajoute jusqu\'à 10 collaborateurs, chacun avec son rôle.'
  },
  {
    q: 'Puis-je changer de plan à tout moment ?',
    a: 'Oui, vous pouvez monter ou descendre de plan à tout moment. Si vous annulez, votre plan reste actif jusqu\'à la fin de la période payée, puis votre compte repasse au plan Gratuit : vos données restent accessibles et exportables.'
  },
  {
    q: 'Comment fonctionne la facturation ?',
    a: `Paiement sécurisé par Stripe. Facturation mensuelle ou annuelle${moisOffertsCommuns(PLANS) > 0 ? ` (${moisOffertsCommuns(PLANS)} mois offerts)` : ''}. Vous recevez une facture par email à chaque échéance.`
  },
  {
    q: 'Que se passe-t-il si je dépasse les limites du plan Gratuit ?',
    a: 'Vos données existantes restent accessibles. Vous ne pourrez simplement plus créer de nouvelles ressources au-delà de vos limites. Passez à un plan supérieur pour lever les restrictions.'
  },
  {
    q: 'Mes données sont-elles sécurisées ?',
    a: 'Votre base de données est hébergée à Paris (AWS, région eu-west-3), chiffrée en transit et au repos. Vous pouvez exporter vos données et supprimer votre compte à tout moment, depuis les Réglages.'
  }
];

function FAQSection() {
  const [openIndex, setOpenIndex] = useState(null);

  return (
    <section className="py-16 max-w-3xl mx-auto">
      <h2 className={`text-2xl font-bold text-center mb-10 text-encre`}>
        Questions fréquentes
      </h2>
      <div className="space-y-3">
        {FAQ_ITEMS.map((item, i) => (
          <div
            key={i}
            className={`rounded-xl border overflow-hidden transition-colors border-bord bg-surface`}
          >
            <button
              onClick={() => setOpenIndex(openIndex === i ? null : i)}
              aria-expanded={openIndex === i}
              className={`w-full flex items-center justify-between px-5 py-4 text-left hover:bg-surface-2 transition-colors`}
            >
              <span className={`font-semibold text-sm text-encre`}>
                {item.q}
              </span>
              <ChevronDown
                size={18}
                aria-hidden="true"
                className={`text-encre-3 transition-transform flex-shrink-0 ml-3 ${openIndex === i ? 'rotate-180' : ''}`}
              />
            </button>
            {openIndex === i && (
              <div className={`px-5 pb-4 text-sm leading-relaxed text-encre-2`}>
                {item.a}
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

// ─── Trust Section ──────────────────────────────────────────────────────────

const TRUST_ITEMS = [
  { icon: Shield, label: 'Paiement sécurisé', desc: 'Stripe' },
  { icon: Clock, label: 'Gratuit pour démarrer', desc: 'Sans carte bancaire' },
  { icon: CreditCard, label: 'Mensuel sans engagement', desc: 'Résiliable à tout moment' },
  { icon: MapPin, label: 'Base de données à Paris', desc: 'Supabase, AWS Paris' }
];

function TrustSection() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto py-10">
      {TRUST_ITEMS.map((item, i) => (
        <div key={i} className="flex flex-col items-center text-center gap-2">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center bg-surface-2`}>
            <item.icon size={18} aria-hidden="true" className="text-encre-2" />
          </div>
          <p className="text-sm font-semibold text-encre">{item.label}</p>
          <p className="text-sm text-encre-3">{item.desc}</p>
        </div>
      ))}
    </div>
  );
}

// ─── CTA Section ────────────────────────────────────────────────────────────

function CTASection({ onAction }) {
  return (
    <section className="bg-surface border border-bord rounded-2xl py-12 px-6 text-center my-8">
      <h2 className="text-2xl font-bold text-encre mb-3">
        Prêt à démarrer ?
      </h2>
      <p className="text-encre-2 mb-8 max-w-md mx-auto">
        Commencez gratuitement, sans carte bancaire. Passez au plan supérieur quand vous en avez besoin.
      </p>
      <Bouton iconeFin={ArrowRight} onClick={onAction}>
        Voir les offres
      </Bouton>
    </section>
  );
}

// ─── Main PricingPage ───────────────────────────────────────────────────────

export default function PricingPage({ isDark: _isDark, couleur: _couleur, setPage }) {
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
      if (result.url) await ouvrirLienExterne(result.url, { memeOnglet: true });
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
        <h1 className={`text-3xl md:text-4xl font-bold text-encre`}>
          Le plan adapté à votre activité
        </h1>
        <p className={`mt-3 text-lg text-encre-2`}>
          Commencez gratuitement, évoluez à votre rythme
        </p>

        <PricingToggle billing={billing} setBilling={setBilling} />
      </div>

      {/* Trust badges */}
      <TrustSection />

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

      {/* FAQ */}
      <FAQSection />

      {/* CTA */}
      <CTASection onAction={scrollToPlans} />

      {/* Demo notice */}
      {isDemo && (
        <p className="text-center text-sm text-encre-3 py-4">
          Mode démo — le changement de plan est simulé
        </p>
      )}
    </div>
  );
}
