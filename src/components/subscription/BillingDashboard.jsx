/**
 * BillingDashboard — Full page for managing subscription & billing
 *
 * Sections:
 * 1. Current plan overview with usage bars
 * 2. Plan comparison / upgrade (2 plans: Gratuit / Pro)
 * 3. Billing history (from Stripe portal link)
 * 4. Cancel / reactivate
 */

import { useState, useCallback } from 'react';
import {
  ArrowRight, ExternalLink, AlertTriangle,
  Zap, Crown, FileText, Users, HardHat, Camera, HardDrive,
  RefreshCw, Package
} from 'lucide-react';
import { useSubscriptionStore, PLANS, PLAN_ORDER } from '../../stores/subscriptionStore';
import { MENTION_TVA_ABONNEMENT, prixAbonnement, prixAbonne, moisOffertsCommuns } from '../../stores/prixAbonnement';
import {
  createCheckoutSession,
  createPortalSession
} from '../../services/subscriptionsApi';
import { toast } from '../../stores/toastStore';
import { isDemo } from '../../supabaseClient';
import { ouvrirLienExterne } from '../../lib/natif';
import { dateLue } from '../../lib/dates';
import { Bouton } from '../ui/Bouton';
import Pastille from '../ui/Pastille';
import { EnTetePage } from '../ui/EnTete';
import { Segmente } from '../ui/Onglets';

const PLAN_ICONS = {
  gratuit: Zap,
  artisan: HardHat,
  equipe: Users,
  pro: Crown // backward compat
};

const RESOURCE_ICONS = {
  devis: FileText,
  clients: Users,
  chantiers: HardHat,
  catalogue: Package,
  photos: Camera,
  storage_mb: HardDrive,
  equipe: HardHat
};

const RESOURCE_LABELS = {
  devis: 'Devis ce mois',
  clients: 'Clients',
  chantiers: 'Chantiers',
  catalogue: 'Articles du catalogue',
  photos: 'Photos',
  storage_mb: 'Stockage (Mo)',
  equipe: 'Collaborateurs'
};

export default function BillingDashboard({ isDark: _isDark, couleur: _couleur }) {
  const planId = useSubscriptionStore((s) => s.planId);
  const usage = useSubscriptionStore((s) => s.usage);
  const sub = useSubscriptionStore((s) => s.subscription);
  const openUpgradeModal = useSubscriptionStore((s) => s.openUpgradeModal);
  const setSubscription = useSubscriptionStore((s) => s.setSubscription);

  const [billing, setBilling] = useState('monthly');
  const [loadingAction, setLoadingAction] = useState(null);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  const plan = PLANS[planId] || PLANS.gratuit;
  const PlanIcon = PLAN_ICONS[planId] || Zap;
  const isFree = planId === 'gratuit';


  // Stripe portal
  const handleOpenPortal = useCallback(async () => {
    setLoadingAction('portal');
    try {
      const { url, error } = await createPortalSession();
      if (error) {
        toast.error('Erreur', error.message);
        return;
      }
      // Après un await, window.open est bloqué par Safari ; dans l'app native, navigateur système
      if (url) await ouvrirLienExterne(url, { memeOnglet: true });
      else toast.info('Non disponible', 'Portail Stripe non disponible en mode démo');
    } finally {
      setLoadingAction(null);
    }
  }, []);

  // Annulation / réactivation — via le portail Stripe.
  //
  // Ces deux boutons appelaient les fonctions Edge `cancel-subscription` et
  // `reactivate-subscription`, qui n'ont jamais existé : l'appel mourait sur le
  // preflight CORS et l'abonné ne pouvait pas résilier. Stripe gère la fin de
  // période et le prorata, et le webhook répercute le changement en base via
  // `customer.subscription.updated` / `.deleted`.
  const ouvrirPortail = useCallback(async (action) => {
    if (isDemo) {
      toast.info('Mode démo', 'La gestion d\'abonnement n\'est pas disponible en démo.');
      return;
    }
    setLoadingAction(action);
    try {
      const { url, error } = await createPortalSession();
      if (error || !url) {
        toast.error('Gestion indisponible', 'Écrivez-nous à contact@mallettico.fr, nous le faisons pour vous.');
        return;
      }
      if (action === 'cancel') setShowCancelConfirm(false);
      await ouvrirLienExterne(url, { memeOnglet: true });
    } finally {
      setLoadingAction(null);
    }
  }, []);

  const handleCancel = useCallback(() => ouvrirPortail('cancel'), [ouvrirPortail]);
  const handleReactivate = useCallback(() => ouvrirPortail('reactivate'), [ouvrirPortail]);

  // Select plan
  const handleSelectPlan = useCallback(async (targetPlanId) => {
    if (targetPlanId === planId) return;
    if (targetPlanId === 'gratuit') return;
    setLoadingAction(targetPlanId);
    try {
      const result = await createCheckoutSession(targetPlanId, billing);
      if (result.error) {
        toast.error('Erreur', result.error.message);
        return;
      }
      if (result.directUpgrade) {
        setSubscription({ plan: targetPlanId, status: 'active', billing_interval: billing });
        toast.success('Plan mis à jour', `Vous êtes maintenant sur le plan ${PLANS[targetPlanId].name}`);
        return;
      }
      if (result.url) await ouvrirLienExterne(result.url, { memeOnglet: true });
    } finally {
      setLoadingAction(null);
    }
  }, [planId, billing, setSubscription]);

  return (
    <div className="space-y-6">
      <EnTetePage titre="Abonnement et facturation" sousTitre="Votre plan, vos limites et vos factures" />

      {/* Le plan en cours */}
      <div className="rounded-2xl border border-bord bg-surface shadow-e1 p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-surface-2 text-encre-2 flex-shrink-0">
              <PlanIcon size={22} aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-bold text-encre">Plan {plan.name}</h2>
                {sub?.cancel_at_period_end && <Pastille ton="alerte">Résiliation prévue</Pastille>}
              </div>
              {/* Prix et mention de franchise de TVA (D-19) par l'outil commun, comme « Mon plan » ; un abonné
                  annuel lit son prix annuel (prixAbonne), jamais « par mois ». */}
              <p className="text-sm text-encre-2">
                {isFree ? 'Gratuit' : `${prixAbonne(plan, sub)}, ${MENTION_TVA_ABONNEMENT}`}
              </p>
              {sub?.current_period_end && (
                <p className="text-sm text-encre-3 mt-0.5">
                  {sub?.cancel_at_period_end ? 'Accès jusqu\'au' : 'Prochain renouvellement :'} {dateLue(sub.current_period_end).toLocaleDateString('fr-FR')}
                </p>
              )}
            </div>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            {!isFree && (
              <Bouton icone={ExternalLink} onClick={handleOpenPortal} chargement={loadingAction === 'portal'} disabled={loadingAction === 'portal'}>
                Mes factures et paiement
              </Bouton>
            )}
            {isFree && (
              <Bouton iconeFin={ArrowRight} onClick={() => openUpgradeModal()}>
                Voir les offres
              </Bouton>
            )}
          </div>
        </div>

        {/* Usage : une limite atteinte se dit en toutes lettres, en ton alerte */}
        <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {Object.entries(plan.limits)
            .filter(([key]) => ['devis', 'clients', 'chantiers', 'catalogue', 'equipe', 'storage_mb'].includes(key))
            .map(([key, limit]) => {
              const Icon = RESOURCE_ICONS[key] || FileText;
              const current = usage[key] ?? 0;
              const isUnlimited = limit === -1;
              const percent = isUnlimited ? 0 : (limit > 0 ? Math.min(100, Math.round((current / limit) * 100)) : 100);
              const atteinte = !isUnlimited && current >= limit;
              const proche = !isUnlimited && !atteinte && percent >= 80;

              return (
                <div
                  key={key}
                  className={`rounded-xl p-3 border ${atteinte || proche ? 'border-bord bg-alerte-fond' : 'border-bord bg-fond'}`}
                >
                  <div className="flex items-center gap-1.5 mb-1 text-encre-3">
                    <Icon size={14} aria-hidden="true" />
                    <span className="text-sm">{RESOURCE_LABELS[key]}</span>
                  </div>
                  <div className={`text-base font-bold tabular-nums ${atteinte || proche ? 'text-alerte-texte' : 'text-encre'}`}>
                    {isUnlimited ? 'Illimité' : atteinte ? 'Limite atteinte' : `${Math.round(current * 10) / 10} sur ${limit}`}
                  </div>
                  {atteinte && <p className="text-sm text-alerte-texte tabular-nums">{limit} au plus</p>}
                  {!isUnlimited && limit > 0 && (
                    <div className="mt-1.5 h-1 bg-surface-2 rounded-full overflow-hidden" aria-hidden="true">
                      <div
                        className={`h-full rounded-full ${atteinte || proche ? 'bg-alerte-point' : 'bg-neutre-point'}`}
                        style={{ width: `${Math.min(100, percent)}%` }}
                      />
                    </div>
                  )}
                </div>
              );
          })}
        </div>
      </div>

      {/* Comparer les plans */}
      <div className="rounded-2xl border border-bord bg-surface p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <h3 className="text-lg font-bold text-encre">Comparer les plans</h3>
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

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {PLAN_ORDER.map((pid) => {
            const p = PLANS[pid];
            const Icon = PLAN_ICONS[pid] || Zap;
            const isCurrent = pid === planId;
            const isHigher = PLAN_ORDER.indexOf(pid) > PLAN_ORDER.indexOf(planId);
            // Comme « Mon plan » : à l'année, l'équivalent mensuel par prixAbonnement, et le prix facturé dessous
            const price = p.priceMonthly === 0 ? null
              : billing === 'yearly' && p.priceYearly ? prixAbonnement(p, 'mois-a-l-annee')
              : prixAbonnement(p);

            return (
              <div
                key={pid}
                className={`rounded-xl border p-5 ${isCurrent ? 'border-accent ring-1 ring-accent order-first md:order-none' : 'border-bord'}`}
              >
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <Icon size={16} aria-hidden="true" className="text-encre-2" />
                  <span className="font-semibold text-sm text-encre">{p.name}</span>
                  {isCurrent && <Pastille ton="succes">Votre plan</Pastille>}
                  {p.badge && !isCurrent && <span className="text-sm text-encre-3">{p.badge}</span>}
                </div>
                <div className="text-2xl font-bold text-encre tabular-nums">
                  {price ? <>{price}<span className="text-sm font-normal text-encre-3"> par mois</span></> : 'Gratuit'}
                </div>
                {price && billing === 'yearly' && p.priceYearly > 0 && (
                  <p className="text-sm mt-0.5 text-encre-3 tabular-nums">Facturé {prixAbonnement(p, 'an')}/an</p>
                )}
                {price && <p className="text-sm mt-0.5 text-encre-3">{MENTION_TVA_ABONNEMENT}</p>}
                <p className="text-sm mt-1 text-encre-3">{p.description}</p>
                {isCurrent ? (
                  <p className="mt-3 min-h-[44px] flex items-center justify-center text-sm font-medium text-encre-3">C'est votre plan</p>
                ) : isHigher ? (
                  <Bouton
                    className="mt-3"
                    pleineLargeur
                    variante={PLAN_ORDER.indexOf(pid) === PLAN_ORDER.indexOf(planId) + 1 && !sub?.cancel_at_period_end ? 'principal' : 'secondaire'}
                    onClick={() => handleSelectPlan(pid)}
                    chargement={loadingAction === pid}
                    disabled={loadingAction === pid}
                  >
                    Passer au plan {p.name}
                  </Bouton>
                ) : (
                  <p className="mt-3 min-h-[44px] flex items-center justify-center text-sm text-encre-3">Inclus dans votre plan</p>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Gérer ou résilier, réactiver */}
      {!isFree && (
        <div className="rounded-2xl border border-bord bg-surface p-5 sm:p-6">
          <h3 className="text-lg font-bold text-encre mb-3">Gestion de l'abonnement</h3>

          {sub?.cancel_at_period_end ? (
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 rounded-xl bg-alerte-fond">
              <div className="flex items-start gap-3">
                <AlertTriangle className="text-alerte-texte flex-shrink-0 mt-0.5" size={20} aria-hidden="true" />
                <div>
                  <p className="text-sm font-medium text-alerte-texte">Résiliation programmée</p>
                  <p className="text-sm text-encre-2">Votre plan reste actif jusqu'à la fin de la période payée.</p>
                </div>
              </div>
              <Bouton variante="principal" icone={RefreshCw} onClick={handleReactivate} chargement={loadingAction === 'reactivate'} disabled={loadingAction === 'reactivate'}>
                Réactiver
              </Bouton>
            </div>
          ) : showCancelConfirm ? (
            <div className="p-4 rounded-xl bg-surface-2">
              <p className="text-sm font-medium text-encre mb-1">Gérer ou résilier votre abonnement</p>
              <p className="text-sm text-encre-2 mb-4">
                La page sécurisée de Stripe va s'ouvrir : vous pouvez y changer de carte, retrouver vos factures ou résilier. Si vous résiliez, vous gardez l'accès jusqu'à la fin de la période payée et vos données sont conservées.
              </p>
              <div className="flex flex-wrap gap-2">
                <Bouton onClick={handleCancel} chargement={loadingAction === 'cancel'} disabled={loadingAction === 'cancel'}>
                  Continuer vers Stripe
                </Bouton>
                <Bouton variante="discret" onClick={() => setShowCancelConfirm(false)}>
                  Rester ici
                </Bouton>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm text-encre-3">
                Votre abonnement se renouvelle automatiquement.
              </p>
              <button
                type="button"
                onClick={() => setShowCancelConfirm(true)}
                className="min-h-[44px] px-2 text-sm font-medium text-encre-2 underline underline-offset-2 hover:text-encre"
              >
                Gérer ou résilier mon abonnement
              </button>
            </div>
          )}
        </div>
      )}

      {isDemo && (
        <p className="text-center text-sm text-encre-3">
          Mode démo — les changements de plan sont simulés localement
        </p>
      )}
    </div>
  );
}
