/**
 * PlanPage — Subscription management & plan comparison
 *
 * Extracted from ProfilePage Section 3.
 * Handles: current plan display, Stripe portal, cancel/reactivate,
 * plan comparison with billing toggle, and logout.
 */

import React, { useState, useCallback } from 'react';
import {
  Users, CreditCard, LogOut, Check, ArrowRight,
  Zap, Hammer, ExternalLink, Clock,
} from 'lucide-react';
import { useSubscriptionStore, PLANS, PLAN_ORDER, YEARLY_DISCOUNT } from '../../stores/subscriptionStore';
import { createCheckoutSession, createPortalSession, utiliserCodeTesteur } from '../../services/subscriptionsApi';
import { toast } from '../../stores/toastStore';
import { auth, isDemo } from '../../supabaseClient';
import { useConfirm } from '../../context/AppContext';
import { ouvrirLienExterne } from '../../lib/natif';
import { Segmente } from '../ui/Onglets';
import Pastille from '../ui/Pastille';
import { Bouton } from '../ui/Bouton';

// ─── Helpers ────────────────────────────────────────────────────────────────


const PLAN_ICONS = { gratuit: Zap, artisan: Hammer, equipe: Users };

// ─── Main Component ─────────────────────────────────────────────────────────

export default function PlanPage({ isDark, couleur = '#f97316', setPage }) {
  const { confirm } = useConfirm();

  // Theme
  const cardBg = 'bg-surface border-bord';
  const textPrimary = 'text-encre';
  const textMuted = 'text-encre-3';

  // Subscription store
  const planId = useSubscriptionStore(s => s.planId);
  const sub = useSubscriptionStore(s => s.subscription);
  const setSubscription = useSubscriptionStore(s => s.setSubscription);
  const plan = PLANS[planId] || PLANS.gratuit;

  // Local state
  const [billing, setBilling] = useState('monthly');
  const [loadingPlan, setLoadingPlan] = useState(null);
  const [cancelling, setCancelling] = useState(false);

  // Code testeur (« un an offert ») : plan payant sans abonnement Stripe, avec date de fin.
  const [codeTesteur, setCodeTesteur] = useState('');
  const [codeEnCours, setCodeEnCours] = useState(false);
  const [codeErreur, setCodeErreur] = useState('');

  // Derived
  const isPaid = planId !== 'gratuit';
  const offreTesteur = isPaid && !sub?.stripe_subscription_id && !!sub?.current_period_end;
  const nextBilling = sub?.current_period_end
    ? new Date(sub.current_period_end).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
    : null;

  // ─── Handlers ─────────────────────────────────────────────────────────────

  const handleSelectPlan = useCallback(async (targetPlanId) => {
    if (targetPlanId === planId || targetPlanId === 'gratuit') return;
    setLoadingPlan(targetPlanId);
    try {
      const result = await createCheckoutSession(targetPlanId, billing);
      if (result.error) { toast.error('Erreur', result.error.message); return; }
      if (result.directUpgrade) {
        setSubscription({ plan: targetPlanId, status: 'active', billing_interval: billing });
        toast.success('Plan activé !', `Bienvenue dans le plan ${PLANS[targetPlanId]?.name || targetPlanId}`);
        return;
      }
      if (result.url) await ouvrirLienExterne(result.url, { memeOnglet: true });
    } catch { toast.error('Paiement indisponible', 'Contactez-nous à contact@mallettico.fr pour souscrire.'); }
    finally { setLoadingPlan(null); }
  }, [billing, planId, setSubscription]);

  const [portalLoading, setPortalLoading] = useState(false);

  // Facturation, annulation et réactivation passent toutes par le portail Stripe.
  //
  // Annuler et réactiver appelaient auparavant des fonctions Edge
  // `cancel-subscription` et `reactivate-subscription` qui n'ont jamais existé :
  // l'appel échouait sur le preflight CORS (« Failed to send a request to the
  // Edge Function ») et l'abonné ne pouvait pas résilier.
  //
  // Le portail est la bonne réponse, pas un contournement : Stripe y gère la fin
  // de période, le prorata, les emails de confirmation et le moyen de paiement.
  // Et comme le webhook écoute déjà `customer.subscription.updated` et
  // `.deleted`, le changement redescend seul dans `subscriptions`.
  //
  // À déclarer AVANT ses appelants : `useCallback` est un `const`, le référencer
  // plus haut dans le corps du composant lèverait un ReferenceError au rendu.
  const ouvrirPortail = useCallback(async (echecTitre) => {
    setPortalLoading(true);
    try {
      const result = await createPortalSession();
      if (result.error || !result.url) {
        toast.error(echecTitre, 'Écrivez-nous à contact@mallettico.fr, nous le faisons pour vous.');
        return false;
      }
      // Même onglet : Safari bloque un window.open lancé après un await (fenêtre jugée non sollicitée),
      // et le portail Stripe ramène ensuite ici par son lien de retour.
      await ouvrirLienExterne(result.url, { memeOnglet: true });
      return true;
    } catch {
      toast.error(echecTitre, 'Écrivez-nous à contact@mallettico.fr, nous le faisons pour vous.');
      return false;
    } finally {
      setPortalLoading(false);
    }
  }, []);

  const handlePortal = useCallback(async () => {
    if (isDemo) {
      toast.info('Mode démo', 'Le portail de facturation n\'est pas disponible en mode démo.');
      return;
    }
    await ouvrirPortail('Portail indisponible');
  }, [ouvrirPortail]);

  const handleCancel = useCallback(async () => {
    const finPeriode = sub?.current_period_end
      ? new Date(sub.current_period_end).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
      : 'la fin de votre période';
    const ok = await confirm({
      title: 'Annuler votre abonnement ?',
      message: `Vous gardez l'accès à toutes les fonctionnalités jusqu'au ${finPeriode}, et vos données sont conservées. L'annulation se fait sur la page sécurisée de Stripe, qui va s'ouvrir dans un nouvel onglet.`,
      confirmText: 'Continuer vers Stripe',
      cancelText: 'Garder mon plan',
    });
    if (!ok) return;

    if (isDemo) {
      setSubscription({ ...sub, cancel_at_period_end: true });
      toast.info('Mode démo', 'Annulation simulée — aucun abonnement réel n\'est modifié.');
      return;
    }
    setCancelling(true);
    try { await ouvrirPortail('Annulation impossible'); }
    finally { setCancelling(false); }
  }, [sub, setSubscription, confirm, ouvrirPortail]);

  const handleReactivate = useCallback(async () => {
    if (isDemo) {
      setSubscription({ ...sub, cancel_at_period_end: false });
      toast.info('Mode démo', 'Réactivation simulée.');
      return;
    }
    await ouvrirPortail('Réactivation impossible');
  }, [sub, setSubscription, ouvrirPortail]);

  const handleLogout = useCallback(async () => {
    const ok = await confirm({
      title: 'Se déconnecter ?',
      message: 'Vous serez redirigé vers la page de connexion.',
      confirmText: 'Se déconnecter',
      cancelText: 'Annuler',
      variant: 'info',
    });
    if (!ok) return;
    try { await auth.signOut(); } catch { window.location.reload(); }
  }, [confirm]);

  // ─── RENDER ───────────────────────────────────────────────────────────────

  return (
    <div className={`min-h-screen pb-24 bg-surface-2`}>
      <section className="px-4 sm:px-6 py-6 sm:py-10 max-w-4xl mx-auto">
        <h2 className={`text-xl font-bold mb-6 ${textPrimary}`}>Mon plan</h2>

        {/* Current plan card */}
        <div className={`rounded-xl border p-5 sm:p-6 mb-6 animate-fade-slide-up ${cardBg}`}>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-surface-2 text-encre-2">
                {React.createElement(PLAN_ICONS[planId] || Zap, { size: 22 })}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className={`text-lg font-bold ${textPrimary}`}>Plan {plan.name}</h3>
                  {offreTesteur ? (
                    <Pastille ton="succes">Offert</Pastille>
                  ) : sub?.cancel_at_period_end ? (
                    <Pastille ton="alerte">Annulation prévue</Pastille>
                  ) : (
                    <Pastille ton="succes">Actif</Pastille>
                  )}
                </div>
                {/* Prix formaté à la française : `${plan.priceMonthly}€` affichait
                    « 9.9€ ». Et la période de facturation n'est PAS affichée ici :
                    elle se lisait dans `sub.billing_interval`, colonne qui n'existe
                    pas dans `subscriptions` — un abonné à l'année aurait donc lu
                    « Mensuel ». Mieux vaut ne rien dire que dire faux ; la période
                    exacte figure sur la page Stripe (« Mes factures et paiement »). */}
                <p className={`text-sm font-medium text-encre-2`}>
                  {offreTesteur
                    ? `Offert jusqu'au ${nextBilling} — aucun prélèvement`
                    : isPaid
                    ? `${plan.priceMonthly.toFixed(2).replace('.', ',')} € HT/mois${plan.offreLancement ? ` · ${plan.offreLancement}` : ''}`
                    : 'Gratuit — Découverte'
                  }
                </p>
                {offreTesteur && (
                  <p className={`text-xs mt-0.5 text-encre-2`}>
                    Ensuite, vous repassez au plan Gratuit sans rien perdre, sauf si vous choisissez de vous abonner.
                  </p>
                )}
                {nextBilling && !sub?.cancel_at_period_end && (
                  <p className={`text-xs mt-0.5 text-encre-2`}>
                    <Clock size={11} className="inline mr-1" />
                    Prochaine facturation : {nextBilling}
                  </p>
                )}
                {sub?.cancel_at_period_end && nextBilling && !offreTesteur && (
                  <p className="text-sm mt-0.5 text-alerte-texte">
                    Accès jusqu'au {nextBilling}
                  </p>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 flex-wrap">
              {isPaid && !isDemo && !offreTesteur && (
                <button
                  onClick={handlePortal}
                  disabled={portalLoading}
                  className="px-4 min-h-[44px] rounded-xl text-sm font-semibold flex items-center gap-1.5 border transition-colors disabled:opacity-50 border-bord-fort text-encre hover:bg-surface-2"
                >
                  {portalLoading ? (
                    <><span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" /> Chargement...</>
                  ) : (
                    <><CreditCard size={14} /> Mes factures et paiement <ExternalLink size={11} /></>
                  )}
                </button>
              )}
              {isPaid && !sub?.cancel_at_period_end && !offreTesteur && (
                <button
                  onClick={handleCancel}
                  disabled={cancelling}
                  aria-label={`Annuler mon abonnement ${plan.name}`}
                  className="px-4 min-h-[44px] rounded-xl text-sm font-semibold transition-colors text-danger-texte hover:bg-danger-fond"
                >
                  {cancelling ? 'Annulation…' : 'Annuler l\'abonnement'}
                </button>
              )}
              {sub?.cancel_at_period_end && !offreTesteur && (
                <Bouton variante="principal" onClick={handleReactivate}>Réactiver</Bouton>
              )}
            </div>
          </div>
        </div>

        {/* Code testeur */}
        {!isPaid && (
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setCodeErreur('');
              setCodeEnCours(true);
              const { data, error } = await utiliserCodeTesteur(codeTesteur);
              setCodeEnCours(false);
              if (error) { setCodeErreur(error); return; }
              setSubscription({ ...(sub || {}), plan: data.plan, status: 'active', current_period_end: data.fin, cancel_at_period_end: true, stripe_subscription_id: null });
              setCodeTesteur('');
              toast.success('Code activé', `Plan ${PLANS[data.plan]?.name || data.plan} offert pendant ${data.duree_mois} mois.`);
            }}
            className={`rounded-xl border p-4 sm:p-5 mb-6 ${cardBg}`}
          >
            <label htmlFor="code-testeur" className={`block text-sm font-semibold mb-1 ${textPrimary}`}>Vous avez un code testeur ?</label>
            <p className={`text-xs mb-3 ${textMuted}`}>Il débloque un plan payant pendant la durée prévue, sans carte bancaire.</p>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                id="code-testeur"
                value={codeTesteur}
                onChange={(e) => setCodeTesteur(e.target.value.toUpperCase())}
                placeholder="EX. AMIS-ARTISANS-7K3PX9"
                autoComplete="off"
                autoCapitalize="characters"
                spellCheck={false}
                className={`flex-1 px-3 py-2.5 rounded-xl border text-sm tracking-wide bg-surface border-bord-fort`}
              />
              <button
                type="submit"
                disabled={codeEnCours || codeTesteur.trim().length < 8}
                className="h-11 px-4 rounded-xl text-sm font-semibold disabled:opacity-50 bg-surface text-encre border border-bord-fort hover:bg-surface-2"
              >
                {codeEnCours ? 'Vérification…' : 'Activer'}
              </button>
            </div>
            {codeErreur && <p role="alert" className="text-sm text-danger-texte mt-2">{codeErreur}</p>}
          </form>
        )}

        {/* Plans comparison */}
        <div className="animate-fade-slide-up" style={{ animationDelay: '100ms' }}>
          {/* Mensuel / Annuel : un segment (l'interrupteur de 44×24 était déformé en disque par la règle
              globale des 44 px — revue du 9 oct. 2026). */}
          <div className="flex justify-center mb-5">
            <Segmente
              ariaLabel="Facturation"
              valeur={billing}
              onChange={setBilling}
              options={[
                { valeur: 'monthly', libelle: 'Mensuel' },
                { valeur: 'yearly', libelle: `Annuel −${YEARLY_DISCOUNT} %` },
              ]}
            />
          </div>

          {/* Plan cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
            {PLAN_ORDER.map((pid) => {
              const p = PLANS[pid];
              if (!p) return null;
              const Icon = PLAN_ICONS[pid] || Zap;
              const isCurrent = pid === planId;
              const isHigher = PLAN_ORDER.indexOf(pid) > PLAN_ORDER.indexOf(planId);
              // Un seul bouton plein : l'offre juste au-dessus de la vôtre ; les autres en secondaire.
              const estOffreSuivante = PLAN_ORDER.indexOf(pid) === PLAN_ORDER.indexOf(planId) + 1;
              const price = billing === 'yearly' && p.priceYearly
                ? (p.priceYearly / 12).toFixed(2).replace('.', ',')
                : p.priceMonthly?.toFixed(2).replace('.', ',') || '0';

              return (
                <div
                  key={pid}
                  className={`rounded-2xl border p-4 sm:p-5 relative bg-surface shadow-e1 ${isCurrent ? 'border-accent ring-1 ring-accent' : 'border-bord'}`}
                >
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-surface-2 text-encre-2 flex-shrink-0">
                        <Icon size={18} aria-hidden="true" />
                      </div>
                      <span className="text-base font-bold text-encre">{p.name}</span>
                    </div>
                    {isCurrent ? <Pastille ton="succes">Votre plan</Pastille> : p.badge ? <span className="text-sm text-encre-3 text-right">{p.badge}</span> : null}
                  </div>

                  {/* Le tarif fondateur ne se voyait que sur la page publique.
                      Ici, l'abonné lisait « 9,90 € » sans savoir que c'est un
                      prix cassé qu'il garde tant qu'il reste abonné — l'argument
                      de rétention le plus fort du produit, invisible. */}
                  <div className="mb-3">
                    <span className="text-2xl font-bold text-encre tabular-nums">
                      {price} €
                    </span>
                    <span className="text-sm text-encre-3"> HT/mois</span>
                    {p.offreLancement && (
                      <p className="text-sm mt-1 font-medium text-encre-2">
                        {p.offreLancement} : prix gardé tant que vous restez abonné
                      </p>
                    )}
                    {billing === 'yearly' && p.priceYearly > 0 && (
                      <>
                        <p className="text-sm mt-0.5 text-encre-3 tabular-nums">Facturé {String(p.priceYearly).replace('.', ',')} €/an</p>
                        <p className="text-sm mt-0.5 text-succes-texte font-medium tabular-nums">
                          Économisez {Math.round(p.priceMonthly * 12 - p.priceYearly)} €/an
                        </p>
                      </>
                    )}
                  </div>

                  {/* Features */}
                  <ul className="space-y-1.5 mb-4">
                    {(p.featureLabels || []).filter(f => f.included).slice(0, 5).map((f, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-encre-2">
                        <Check size={16} aria-hidden="true" className="text-succes-point flex-shrink-0 mt-0.5" />
                        <span>{f.name}</span>
                      </li>
                    ))}
                  </ul>

                  {/* CTA */}
                  {isCurrent ? (
                    <p className="w-full min-h-[44px] flex items-center justify-center text-sm font-medium text-encre-3">C'est votre plan</p>
                  ) : isHigher ? (
                    <button
                      onClick={() => handleSelectPlan(pid)}
                      disabled={loadingPlan === pid}
                      className={`w-full min-h-[44px] rounded-xl text-sm font-semibold flex items-center justify-center gap-1.5 transition-colors disabled:opacity-60 ${
                        estOffreSuivante ? 'bg-accent text-sur-accent shadow-e1 hover:brightness-95' : 'bg-surface text-encre border border-bord-fort hover:bg-surface-2'
                      }`}
                    >
                      {loadingPlan === pid ? (
                        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                      ) : (
                        <>Passer au {p.name} <ArrowRight size={16} aria-hidden="true" /></>
                      )}
                    </button>
                  ) : (
                    <p className="w-full min-h-[44px] flex items-center justify-center text-sm text-encre-3">Inclus dans votre plan</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Trust elements */}
        <div className={`mt-8 text-center text-xs ${textMuted} space-y-1`}>
          <p>Au mois, sans engagement · À l'année, payé pour 12 mois · Paiement sécurisé par Stripe</p>
          <p>
            <button onClick={() => setPage?.('cgu')} className="underline hover:opacity-80">CGU</button>
            {' · '}
            <button onClick={() => setPage?.('cgv')} className="underline hover:opacity-80">CGV</button>
            {' · '}
            <button onClick={() => setPage?.('confidentialite')} className="underline hover:opacity-80">Confidentialité</button>
            {' · '}
            <button onClick={() => setPage?.('mentions-legales')} className="underline hover:opacity-80">Mentions légales</button>
            {' · '}
            <button onClick={() => setPage?.('accessibilite')} className="underline hover:opacity-80">Accessibilité</button>
          </p>
        </div>

        {/* Logout */}
        <div className="mt-6 text-center animate-fade-slide-up" style={{ animationDelay: '200ms' }}>
          <button
            onClick={handleLogout}
            className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-colors ${
              isDark ? 'text-red-400 hover:bg-red-500/10' : 'text-red-500 hover:bg-red-50'
            }`}
          >
            <LogOut size={16} />
            Se déconnecter
          </button>

          {isDemo && (
            <p className={`text-xs mt-3 ${textMuted}`}>Mode démo — données de simulation</p>
          )}
        </div>
      </section>

      {/* Animations */}
      <style>{`
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-slide-up {
          animation: fadeSlideUp 0.5s ease-out forwards;
          opacity: 0;
        }
      `}</style>
    </div>
  );
}
