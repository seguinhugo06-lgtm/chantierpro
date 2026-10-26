/**
 * UpgradeModal — Contextual upgrade modal (Gratuit → Artisan / Équipe)
 *
 * Shows a bottom-sheet style modal (ui/Modal) with:
 * - Contextual title/subtitle based on the blocked feature
 * - Recommended plan based on the feature that triggered the modal
 * - Monthly/yearly toggle
 * - Stripe checkout integration
 */

import { useState, useCallback } from 'react';
import {
  Check, Lock, ArrowRight, Zap, Hammer, Users
} from 'lucide-react';
import {
  useSubscriptionStore, PLANS, PLAN_ORDER,
  UPGRADE_CONTEXTS
} from '../../stores/subscriptionStore';
import { MENTION_TVA_ABONNEMENT, prixAbonnement, economieAnnuelle } from '../../stores/prixAbonnement';
import { createCheckoutSession } from '../../services/subscriptionsApi';
import { toast } from '../../stores/toastStore';
import { isDemo } from '../../supabaseClient';
import { ouvrirLienExterne } from '../../lib/natif';
import Modal from '../ui/Modal';
import { Bouton } from '../ui/Bouton';
import Pastille from '../ui/Pastille';
import { Segmente } from '../ui/Onglets';

const PLAN_ICONS = { gratuit: Zap, artisan: Hammer, equipe: Users };

export default function UpgradeModal() {
  const isOpen = useSubscriptionStore((s) => s.upgradeModalOpen);

  // All hooks must be called unconditionally (Rules of Hooks)
  const blockedFeature = useSubscriptionStore((s) => s.upgradeModalFeature);
  const currentPlanId = useSubscriptionStore((s) => s.planId);
  const closeUpgradeModal = useSubscriptionStore((s) => s.closeUpgradeModal);
  const setSubscription = useSubscriptionStore((s) => s.setSubscription);
  const [billing, setBilling] = useState('monthly');
  const [loadingPlan, setLoadingPlan] = useState(null);

  const handleSelectPlan = useCallback(async (planId) => {
    if (planId === currentPlanId || planId === 'gratuit') return;
    setLoadingPlan(planId);
    try {
      const result = await createCheckoutSession(planId, billing);
      if (result.error) {
        toast.error('Erreur', result.error.message);
        return;
      }
      if (result.directUpgrade) {
        setSubscription({ plan: planId, status: 'active', billing_interval: billing });
        toast.success('Plan activé !', `Bienvenue dans le plan ${PLANS[planId]?.name || planId}`);
        closeUpgradeModal();
        return;
      }
      if (result.url) await ouvrirLienExterne(result.url, { memeOnglet: true });
    } catch {
      toast.error('Erreur', 'Une erreur est survenue');
    } finally {
      setLoadingPlan(null);
    }
  }, [billing, currentPlanId, closeUpgradeModal, setSubscription]);

  // Early return AFTER all hooks
  if (!isOpen) return null;

  // Derived state (only computed when modal is open)
  const context = UPGRADE_CONTEXTS[blockedFeature] || UPGRADE_CONTEXTS.generic;
  const currentPlan = PLANS[currentPlanId] || PLANS.gratuit;

  // Determine which plans to show as upgrade options
  const upgradePlans = PLAN_ORDER
    .filter(pid => pid !== 'gratuit' && pid !== currentPlanId)
    .map(pid => PLANS[pid])
    .filter(Boolean);

  const recommendedPlanId = context.recommendedPlan || 'artisan';
  // Un seul bouton plein : l'offre qui débloque la fonction demandée, sinon la première offre.
  const planPrincipal = upgradePlans.some(p => p.id === recommendedPlanId) ? recommendedPlanId : upgradePlans[0]?.id;

  // Rendue par ui/Modal : portail vers <body>, role="dialog", nom sur la croix, focus gardé, thème clair et sombre.
  return (
    <Modal
      isOpen={isOpen}
      onClose={closeUpgradeModal}
      size="xl"
      title={context.title}
      description={context.subtitle}
      footer={(
        <div className="w-full flex flex-col items-center gap-1">
          <Bouton variante="discret" onClick={closeUpgradeModal}>Plus tard</Bouton>
          {isDemo && <p className="text-center text-sm text-encre-3">Mode démo — simulation</p>}
        </div>
      )}
    >
      {currentPlanId === 'gratuit' && (
        <p className="flex items-center gap-2 text-sm text-encre-3 mb-3">
          <Lock size={14} aria-hidden="true" />
          <span>Plan actuel : <strong className="text-encre-2">{currentPlan.name}</strong></span>
        </p>
      )}

      <div className="flex justify-center mb-4">
        <Segmente
          ariaLabel="Facturation"
          valeur={billing}
          onChange={setBilling}
          options={[
            { valeur: 'monthly', libelle: 'Mensuel' },
            { valeur: 'yearly', libelle: 'Annuel' },
          ]}
        />
      </div>

      <div className={`grid grid-cols-1 ${upgradePlans.length > 1 ? 'sm:grid-cols-2' : ''} gap-4`}>
        {upgradePlans.map((plan) => {
          const Icon = PLAN_ICONS[plan.id] || Zap;
          // « Pour cette fonction » seulement quand une fonction précise est bloquée (l'offre qui la débloque) ; pas en contexte générique.
          const isRecommended = context !== UPGRADE_CONTEXTS.generic && plan.id === recommendedPlanId;
          // À l'année : l'équivalent mensuel par l'outil commun (prixAbonnement), et le prix facturé dessous.
          const price = billing === 'yearly' && plan.priceYearly
            ? prixAbonnement(plan, 'mois-a-l-annee')
            : prixAbonnement(plan);

          return (
            <div
              key={plan.id}
              className={`rounded-2xl border p-5 bg-surface ${isRecommended ? 'border-accent ring-1 ring-accent' : 'border-bord'}`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-surface-2 text-encre-2 flex-shrink-0">
                    <Icon size={18} aria-hidden="true" />
                  </div>
                  <h3 className="text-base font-bold text-encre">{plan.name}</h3>
                </div>
                {isRecommended && <Pastille ton="info">Débloque cette fonction</Pastille>}
              </div>
              <div className="mb-4">
                <div className="flex items-baseline gap-2 flex-wrap">
                  <span className="text-2xl font-bold text-encre tabular-nums">
                    {price}
                  </span>
                  <span className="text-sm text-encre-3">par mois</span>
                </div>
                <p className="text-sm text-encre-3 mt-0.5">{MENTION_TVA_ABONNEMENT}</p>
                {plan.offreLancement && (
                  <p className="text-sm mt-1 font-medium text-encre-2">
                    {plan.offreLancement} : prix gardé tant que vous restez abonné
                  </p>
                )}
                {billing === 'yearly' && (
                  <p className="text-sm text-encre-3 mt-0.5 tabular-nums">
                    Facturé {prixAbonnement(plan, 'an')} par an
                  </p>
                )}
                {billing === 'yearly' && (
                  <p className="text-sm mt-0.5 font-medium text-succes-texte tabular-nums">
                    Économisez {economieAnnuelle(plan)} par an
                  </p>
                )}
              </div>
              <ul className="space-y-2">
                {(plan.featureLabels || []).filter(f => f.included).slice(0, 8).map((f, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <Check size={16} aria-hidden="true" className="text-succes-point flex-shrink-0 mt-0.5" />
                    <span
                      className={
                        context.highlight && f.name.toLowerCase().includes(context.highlight.replace('_', ' '))
                          ? 'font-semibold text-encre'
                          : 'text-encre-2'
                      }
                    >
                      {f.name}
                    </span>
                  </li>
                ))}
              </ul>

              <Bouton
                className="mt-4"
                pleineLargeur
                variante={plan.id === planPrincipal ? 'principal' : 'secondaire'}
                iconeFin={ArrowRight}
                onClick={() => handleSelectPlan(plan.id)}
                chargement={loadingPlan === plan.id}
                disabled={loadingPlan === plan.id}
              >
                Passer au plan {plan.name}
              </Bouton>
            </div>
          );
        })}
      </div>
    </Modal>
  );
}
