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
import { useSubscriptionStore, PLANS, PLAN_ORDER } from '../../stores/subscriptionStore';
import { MENTION_TVA_ABONNEMENT, prixAbonnement, prixAbonne, economieAnnuelle, moisOffertsCommuns } from '../../stores/prixAbonnement';
import { createCheckoutSession, createPortalSession, utiliserCodeTesteur } from '../../services/subscriptionsApi';
import { toast } from '../../stores/toastStore';
import { auth, isDemo } from '../../supabaseClient';
import { useConfirm } from '../../context/AppContext';
import { ouvrirLienExterne } from '../../lib/natif';
import { Segmente } from '../ui/Onglets';
import { EnTetePage } from '../ui/EnTete';
import Pastille from '../ui/Pastille';
import { Bouton } from '../ui/Bouton';
import { dateLue } from '../../lib/dates';

// ─── Helpers ────────────────────────────────────────────────────────────────


const PLAN_ICONS = { gratuit: Zap, artisan: Hammer, equipe: Users };

// ─── Main Component ─────────────────────────────────────────────────────────

export default function PlanPage({ isDark: _isDark, couleur: _couleur, setPage }) {
  const { confirm } = useConfirm();

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
  const [codeOuvert, setCodeOuvert] = useState(false);

  // Derived
  const isPaid = planId !== 'gratuit';
  const offreTesteur = isPaid && !sub?.stripe_subscription_id && !!sub?.current_period_end;
  const nextBilling = sub?.current_period_end
    ? dateLue(sub.current_period_end).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
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
      ? dateLue(sub.current_period_end).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
      : 'la fin de votre période';
    if (isDemo) {
      toast.info('Mode démo', 'La page Stripe n\'est pas disponible en mode démo.');
      return;
    }
    const ok = await confirm({
      title: 'Gérer ou résilier votre abonnement',
      message: `La page sécurisée de Stripe va s'ouvrir : vous pouvez y changer de carte, retrouver vos factures ou résilier. Si vous résiliez, vous gardez l'accès jusqu'au ${finPeriode} et vos données sont conservées.`,
      confirmText: 'Continuer vers Stripe',
      cancelText: 'Rester ici',
      variant: 'info',
    });
    if (!ok) return;
    setCancelling(true);
    try { await ouvrirPortail('Annulation impossible'); }
    finally { setCancelling(false); }
  }, [sub, confirm, ouvrirPortail]);

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

  const formulaireCode = (
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
      className="mt-3 rounded-2xl border border-bord bg-surface p-4 sm:p-5 text-left"
    >
      <label htmlFor="code-testeur" className="block text-sm font-semibold mb-1 text-encre">Votre code testeur</label>
      <p className="text-sm mb-3 text-encre-3">Il débloque un plan payant pendant la durée prévue, sans carte bancaire.</p>
      <div className="flex flex-col sm:flex-row gap-2">
        <input
          id="code-testeur"
          value={codeTesteur}
          onChange={(e) => setCodeTesteur(e.target.value.toUpperCase())}
          placeholder="EX. AMIS-ARTISANS-7K3PX9"
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          aria-invalid={codeErreur ? true : undefined}
          aria-describedby={codeErreur ? 'code-testeur-erreur' : undefined}
          className="flex-1 h-11 px-3 rounded-xl border text-base sm:text-sm tracking-wide bg-surface text-encre border-bord-fort"
        />
        <Bouton type="submit" chargement={codeEnCours} disabled={codeEnCours || codeTesteur.trim().length < 8}>
          {codeEnCours ? 'Vérification…' : 'Activer'}
        </Bouton>
      </div>
      {codeErreur && <p id="code-testeur-erreur" role="alert" className="text-sm text-danger-texte mt-2">{codeErreur}</p>}
    </form>
  );

  return (
    <div className="min-h-screen pb-24 bg-fond">
      <section className="px-4 sm:px-6 py-6 sm:py-10 max-w-4xl mx-auto">
        <EnTetePage titre="Mon plan" />

        {/* Le plan en cours */}
        <div className="rounded-2xl border border-bord bg-surface shadow-e1 p-5 sm:p-6 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-4 min-w-0">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-surface-2 text-encre-2 flex-shrink-0">
                {React.createElement(PLAN_ICONS[planId] || Zap, { size: 22, 'aria-hidden': true })}
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-lg font-bold text-encre">Plan {plan.name}</h2>
                  {offreTesteur ? (
                    <Pastille ton="succes">Offert</Pastille>
                  ) : sub?.cancel_at_period_end ? (
                    <Pastille ton="alerte">Résiliation prévue</Pastille>
                  ) : (
                    <Pastille ton="succes">Actif</Pastille>
                  )}
                </div>
                {/* Le prix que paie l'abonné, avec SA période (`billing_interval`, écrit par le webhook depuis la
                    migration 071) : un abonné annuel lit « 99 € par an », jamais un prix « par mois » qu'il ne paie pas. */}
                <p className="text-sm font-medium text-encre-2">
                  {offreTesteur
                    ? `Offert jusqu'au ${nextBilling} — aucun prélèvement`
                    : isPaid
                    ? `${prixAbonne(plan, sub)}, ${MENTION_TVA_ABONNEMENT}${plan.offreLancement ? ` · ${plan.offreLancement}` : ''}`
                    : 'Gratuit'
                  }
                </p>
                {offreTesteur && (
                  <p className="text-sm mt-0.5 text-encre-3">
                    Ensuite, vous repassez au plan Gratuit sans rien perdre, sauf si vous choisissez de vous abonner.
                  </p>
                )}
                {nextBilling && !sub?.cancel_at_period_end && (
                  <p className="text-sm mt-0.5 text-encre-3">
                    <Clock size={14} className="inline mr-1 -mt-0.5" aria-hidden="true" />
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

            <div className="flex items-center gap-2 flex-wrap">
              {isPaid && !isDemo && !offreTesteur && (
                <Bouton icone={CreditCard} iconeFin={ExternalLink} onClick={handlePortal} chargement={portalLoading} disabled={portalLoading}>
                  Mes factures et paiement
                </Bouton>
              )}
              {sub?.cancel_at_period_end && !offreTesteur && (
                <Bouton variante="principal" onClick={handleReactivate}>Réactiver</Bouton>
              )}
            </div>
          </div>
        </div>

        {/* Les offres */}
        <div>
          {/* Mensuel / Annuel : un segment (l'interrupteur de 44×24 était déformé en disque par la règle
              globale des 44 px — revue du 9 oct. 2026). */}
          <div className="flex justify-center mb-5">
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

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
            {PLAN_ORDER.map((pid) => {
              const p = PLANS[pid];
              if (!p) return null;
              const Icon = PLAN_ICONS[pid] || Zap;
              const isCurrent = pid === planId;
              const isHigher = PLAN_ORDER.indexOf(pid) > PLAN_ORDER.indexOf(planId);
              // Un seul bouton plein : l'offre juste au-dessus de la vôtre, sauf si « Réactiver » l'est déjà.
              const estOffreSuivante = PLAN_ORDER.indexOf(pid) === PLAN_ORDER.indexOf(planId) + 1 && !(sub?.cancel_at_period_end && !offreTesteur);
              // À l'année : l'équivalent mensuel, par l'outil commun (prixAbonnement), et le prix facturé dessous.
              const price = billing === 'yearly' && p.priceYearly
                ? prixAbonnement(p, 'mois-a-l-annee')
                : prixAbonnement(p);

              return (
                <div
                  key={pid}
                  data-plan={pid}
                  // Au téléphone, l'offre en cours en premier.
                  className={`rounded-2xl border p-4 sm:p-5 relative bg-surface shadow-e1 ${isCurrent ? 'border-accent ring-1 ring-accent order-first md:order-none' : 'border-bord'}`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1.5 mb-3">
                    <div className="flex items-center gap-2 min-w-0 flex-shrink-0">
                      <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-surface-2 text-encre-2 flex-shrink-0">
                        <Icon size={18} aria-hidden="true" />
                      </div>
                      <h3 className="text-base font-bold text-encre">{p.name}</h3>
                    </div>
                    {isCurrent ? <Pastille ton="succes">Votre plan</Pastille> : p.badge ? <span className="text-sm text-encre-3">{p.badge}</span> : null}
                  </div>

                  {/* Le tarif fondateur ne se voyait que sur la page publique.
                      Ici, l'abonné lisait « 9,90 € » sans savoir que c'est un
                      prix cassé qu'il garde tant qu'il reste abonné — l'argument
                      de rétention le plus fort du produit, invisible. */}
                  <div className="mb-3">
                    <span className="text-2xl font-bold text-encre tabular-nums">
                      {price}
                    </span>
                    <span className="text-sm text-encre-3"> par mois</span>
                    {p.priceMonthly > 0 && <p className="text-sm mt-0.5 text-encre-3">{MENTION_TVA_ABONNEMENT}</p>}
                    {p.offreLancement && (
                      <p className="text-sm mt-1 font-medium text-encre-2">
                        {p.offreLancement} : prix gardé tant que vous restez abonné
                      </p>
                    )}
                    {billing === 'yearly' && p.priceYearly > 0 && (
                      <>
                        <p className="text-sm mt-0.5 text-encre-3 tabular-nums">Facturé {prixAbonnement(p, 'an')}/an</p>
                        <p className="text-sm mt-0.5 text-succes-texte font-medium tabular-nums">
                          Économisez {economieAnnuelle(p)} par an
                        </p>
                      </>
                    )}
                  </div>

                  <ul className="space-y-1.5 mb-4">
                    {(p.featureLabels || []).filter(f => f.included).slice(0, 5).map((f, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-encre-2">
                        <Check size={16} aria-hidden="true" className="text-succes-point flex-shrink-0 mt-0.5" />
                        <span>{f.name}</span>
                      </li>
                    ))}
                  </ul>

                  {isCurrent ? (
                    <p className="w-full min-h-[44px] flex items-center justify-center text-sm font-medium text-encre-3">C'est votre plan</p>
                  ) : isHigher ? (
                    <Bouton
                      variante={estOffreSuivante ? 'principal' : 'secondaire'}
                      pleineLargeur
                      iconeFin={ArrowRight}
                      onClick={() => handleSelectPlan(pid)}
                      chargement={loadingPlan === pid}
                      disabled={loadingPlan === pid}
                    >
                      Passer au plan {p.name}
                    </Bouton>
                  ) : (
                    <p className="w-full min-h-[44px] flex items-center justify-center text-sm text-encre-3">Inclus dans votre plan</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Gérer ou résilier : un lien discret sous les offres (la page Stripe fait les deux) */}
        {isPaid && !offreTesteur && !sub?.cancel_at_period_end && (
          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={handleCancel}
              disabled={cancelling}
              className="min-h-[44px] px-3 text-sm font-medium text-encre-2 underline underline-offset-2 hover:text-encre disabled:opacity-50"
            >
              Gérer ou résilier mon abonnement
            </button>
          </div>
        )}

        {/* Code testeur : replié en bas */}
        {!isPaid && (
          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() => setCodeOuvert(o => !o)}
              aria-expanded={codeOuvert}
              aria-controls="bloc-code-testeur"
              className="min-h-[44px] px-3 text-sm font-medium text-encre-2 underline underline-offset-2 hover:text-encre"
            >
              J'ai un code
            </button>
            <div id="bloc-code-testeur" hidden={!codeOuvert}>
              {codeOuvert && formulaireCode}
            </div>
          </div>
        )}

        <div className="mt-8 text-center text-sm text-encre-3 space-y-1">
          <p>Au mois, sans engagement · À l'année, payé pour 12 mois · Paiement sécurisé par Stripe</p>
          <p className="flex flex-wrap justify-center gap-x-1">
            {/* Le point suit son lien : au retour à la ligne, il ne commence jamais une ligne */}
            {[['cgu', 'CGU'], ['cgv', 'CGV'], ['confidentialite', 'Confidentialité'], ['mentions-legales', 'Mentions légales'], ['accessibilite', 'Accessibilité']].map(([cle, libelle], i, liste) => (
              <span key={cle} className="inline-flex items-center">
                <button type="button" onClick={() => setPage?.(cle)} className="min-h-[44px] px-1 underline hover:text-encre">{libelle}</button>
                {i < liste.length - 1 && <span aria-hidden="true">·</span>}
              </span>
            ))}
          </p>
        </div>

        <div className="mt-6 text-center">
          <Bouton variante="discret" icone={LogOut} onClick={handleLogout}>
            Se déconnecter
          </Bouton>

          {isDemo && (
            <p className="text-sm mt-3 text-encre-3">Mode démo — données de simulation</p>
          )}
        </div>
      </section>
    </div>
  );
}
