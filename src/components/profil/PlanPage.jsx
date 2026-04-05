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
import {
  createCheckoutSession, createPortalSession,
  cancelSubscription, reactivateSubscription,
} from '../../services/subscriptionsApi';
import { toast } from '../../stores/toastStore';
import { auth, isDemo } from '../../supabaseClient';
import { useConfirm } from '../../context/AppContext';

// ─── Helpers ────────────────────────────────────────────────────────────────

function hexToRgba(hex, alpha) {
  const n = parseInt((hex || '#f97316').replace('#', ''), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}

const PLAN_ICONS = { gratuit: Zap, artisan: Hammer, equipe: Users };

// ─── Main Component ─────────────────────────────────────────────────────────

export default function PlanPage({ isDark, couleur = '#f97316' }) {
  const { confirm } = useConfirm();

  // Theme
  const cardBg = isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200';
  const textPrimary = isDark ? 'text-slate-100' : 'text-slate-900';
  const textMuted = isDark ? 'text-slate-400' : 'text-slate-500';

  // Subscription store
  const planId = useSubscriptionStore(s => s.planId);
  const sub = useSubscriptionStore(s => s.subscription);
  const setSubscription = useSubscriptionStore(s => s.setSubscription);
  const plan = PLANS[planId] || PLANS.gratuit;

  // Local state
  const [billing, setBilling] = useState('monthly');
  const [loadingPlan, setLoadingPlan] = useState(null);
  const [cancelling, setCancelling] = useState(false);

  // Derived
  const isPaid = planId !== 'gratuit';
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
      if (result.url) window.location.href = result.url;
    } catch { toast.error('Erreur', 'Une erreur est survenue'); }
    finally { setLoadingPlan(null); }
  }, [billing, planId, setSubscription]);

  const handlePortal = useCallback(async () => {
    const result = await createPortalSession();
    if (result.error) { toast.error('Erreur', result.error.message || 'Portail indisponible'); return; }
    if (result.url) window.location.href = result.url;
  }, []);

  const handleCancel = useCallback(async () => {
    const ok = await confirm({
      title: 'Annuler votre abonnement ?',
      message: 'Vous conservez l\'accès à toutes les fonctionnalités jusqu\'à la fin de votre période de facturation. Vos données seront conservées.',
      confirmText: 'Confirmer l\'annulation',
      cancelText: 'Garder mon plan',
    });
    if (!ok) return;
    setCancelling(true);
    try {
      const { error } = await cancelSubscription();
      if (error) { toast.error('Erreur', error.message); return; }
      setSubscription({ ...sub, cancel_at_period_end: true });
      toast.success('Abonnement annulé', 'Votre plan reste actif jusqu\'à la fin de la période.');
    } catch { toast.error('Erreur', 'Impossible d\'annuler'); }
    finally { setCancelling(false); }
  }, [sub, setSubscription, confirm]);

  const handleReactivate = useCallback(async () => {
    try {
      const { error } = await reactivateSubscription();
      if (error) { toast.error('Erreur', error.message); return; }
      setSubscription({ ...sub, cancel_at_period_end: false });
      toast.success('Réactivé !', 'Votre abonnement continue normalement.');
    } catch { toast.error('Erreur', 'Impossible de réactiver'); }
  }, [sub, setSubscription]);

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
    <div className={`min-h-screen pb-24 ${isDark ? 'bg-slate-900' : 'bg-slate-50'}`}>
      <section className="px-4 sm:px-6 py-6 sm:py-10 max-w-4xl mx-auto">
        <h2 className={`text-xl font-bold mb-6 ${textPrimary}`}>Mon plan</h2>

        {/* Current plan card */}
        <div className={`rounded-xl border p-5 sm:p-6 mb-6 animate-fade-slide-up ${cardBg}`}>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center text-white"
                style={{ background: `linear-gradient(135deg, ${plan.color}, ${plan.color}bb)` }}
              >
                {React.createElement(PLAN_ICONS[planId] || Zap, { size: 22 })}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className={`text-lg font-bold ${textPrimary}`}>Plan {plan.name}</h3>
                  {sub?.cancel_at_period_end ? (
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-red-100 text-red-700">
                      ANNULATION PRÉVUE
                    </span>
                  ) : (
                    <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${isDark ? 'bg-emerald-500/20 text-emerald-300' : 'bg-emerald-50 text-emerald-700'}`}>
                      ACTIF
                    </span>
                  )}
                </div>
                <p className={`text-sm ${textMuted}`}>
                  {isPaid
                    ? `${plan.priceMonthly}€ HT/mois · ${sub?.billing_interval === 'yearly' ? 'Annuel' : 'Mensuel'}`
                    : 'Gratuit — Découverte'
                  }
                </p>
                {nextBilling && !sub?.cancel_at_period_end && (
                  <p className={`text-xs mt-0.5 ${textMuted}`}>
                    <Clock size={11} className="inline mr-1" />
                    Prochaine facturation : {nextBilling}
                  </p>
                )}
                {sub?.cancel_at_period_end && nextBilling && (
                  <p className="text-xs mt-0.5 text-red-500">
                    Accès jusqu'au {nextBilling}
                  </p>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 flex-wrap">
              {isPaid && !isDemo && (
                <button
                  onClick={handlePortal}
                  className={`px-4 py-2 rounded-xl text-xs font-medium flex items-center gap-1.5 border transition-colors ${
                    isDark ? 'border-slate-600 text-slate-300 hover:bg-slate-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <CreditCard size={14} /> Mes factures et paiement <ExternalLink size={11} />
                </button>
              )}
              {isPaid && !sub?.cancel_at_period_end && (
                <button
                  onClick={handleCancel}
                  disabled={cancelling}
                  className={`px-4 py-2 rounded-xl text-xs font-medium transition-colors ${
                    isDark ? 'text-red-400 hover:bg-red-500/10' : 'text-red-500 hover:bg-red-50'
                  }`}
                >
                  {cancelling ? 'Annulation...' : 'Annuler'}
                </button>
              )}
              {sub?.cancel_at_period_end && (
                <button
                  onClick={handleReactivate}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-white transition-all hover:shadow-lg"
                  style={{ backgroundColor: couleur }}
                >
                  Réactiver
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Plans comparison */}
        <div className="animate-fade-slide-up" style={{ animationDelay: '100ms' }}>
          {/* Billing toggle */}
          <div className="flex items-center justify-center gap-3 mb-5">
            <span className={`text-xs font-medium ${billing === 'monthly' ? textPrimary : textMuted}`}>Mensuel</span>
            <button
              onClick={() => setBilling(b => b === 'monthly' ? 'yearly' : 'monthly')}
              aria-label="Basculer facturation mensuelle/annuelle"
              className={`relative w-12 h-7 rounded-full transition-colors ${billing === 'yearly' ? '' : isDark ? 'bg-slate-600' : 'bg-slate-300'}`}
              style={billing === 'yearly' ? { backgroundColor: couleur } : {}}
            >
              <span className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow transition-transform ${billing === 'yearly' ? 'translate-x-[26px]' : 'translate-x-1'}`} />
            </button>
            <span className={`text-xs font-medium ${billing === 'yearly' ? textPrimary : textMuted}`}>
              Annuel
              <span className={`ml-1 px-1.5 py-0.5 rounded-full text-[11px] font-bold ${isDark ? 'bg-green-500/20 text-green-300' : 'bg-green-50 text-green-700'}`}>
                -{YEARLY_DISCOUNT}%
              </span>
            </span>
          </div>

          {/* Plan cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
            {PLAN_ORDER.map((pid) => {
              const p = PLANS[pid];
              if (!p) return null;
              const Icon = PLAN_ICONS[pid] || Zap;
              const isCurrent = pid === planId;
              const isHigher = PLAN_ORDER.indexOf(pid) > PLAN_ORDER.indexOf(planId);
              const price = billing === 'yearly' && p.priceYearly
                ? (p.priceYearly / 12).toFixed(2).replace('.', ',')
                : p.priceMonthly?.toFixed(2).replace('.', ',') || '0';

              return (
                <div
                  key={pid}
                  className={`rounded-xl border-2 p-3 sm:p-5 relative transition-all ${
                    isCurrent
                      ? 'shadow-md'
                      : 'hover:shadow-sm'
                  } ${isDark ? 'bg-slate-800' : 'bg-white'}`}
                  style={{
                    borderColor: isCurrent ? plan.color
                      : p.badge === 'RECOMMANDÉ' ? `${p.color}44`
                      : isDark ? '#334155' : '#e2e8f0',
                  }}
                >
                  {p.badge && !isCurrent && (
                    <span
                      className="absolute -top-2.5 right-3 px-2.5 py-0.5 text-[11px] font-bold rounded-full text-white"
                      style={{ backgroundColor: p.color }}
                    >
                      {p.badge}
                    </span>
                  )}
                  {isCurrent && (
                    <span
                      className="absolute -top-2.5 right-3 px-2.5 py-0.5 text-[11px] font-bold rounded-full text-white"
                      style={{ backgroundColor: p.color }}
                    >
                      ACTUEL
                    </span>
                  )}

                  <div className="flex items-center gap-2 mb-3">
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center"
                      style={{ background: hexToRgba(p.color, 0.15) }}
                    >
                      <Icon size={16} style={{ color: p.color }} />
                    </div>
                    <span className={`text-sm font-bold ${textPrimary}`}>{p.name}</span>
                  </div>

                  <div className="mb-3">
                    <span className="text-xl font-bold" style={{ color: p.color }}>
                      {price}€
                    </span>
                    <span className={`text-xs ${textMuted}`}> HT/mois</span>
                    {billing === 'yearly' && p.priceYearly > 0 && (
                      <p className={`text-[11px] mt-0.5 ${textMuted}`}>Facturé {p.priceYearly}€/an</p>
                    )}
                  </div>

                  {/* Features */}
                  <ul className="space-y-1.5 mb-4">
                    {(p.featureLabels || []).filter(f => f.included).slice(0, 5).map((f, i) => (
                      <li key={i} className={`flex items-start gap-1.5 text-xs ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                        <Check size={13} className="text-green-500 flex-shrink-0 mt-0.5" />
                        <span>{f.name}</span>
                      </li>
                    ))}
                  </ul>

                  {/* CTA */}
                  {isCurrent ? (
                    <button
                      disabled
                      className={`w-full py-2 rounded-xl text-xs font-medium border ${
                        isDark ? 'border-slate-600 text-slate-500' : 'border-slate-200 text-slate-400'
                      }`}
                    >
                      Plan actuel
                    </button>
                  ) : isHigher ? (
                    <button
                      onClick={() => handleSelectPlan(pid)}
                      disabled={loadingPlan === pid}
                      className="w-full py-2.5 rounded-xl text-xs font-bold text-white flex items-center justify-center gap-1.5 transition-all hover:shadow-lg hover:scale-[1.02]"
                      style={{ backgroundColor: p.color }}
                    >
                      {loadingPlan === pid ? (
                        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                      ) : (
                        <>Passer au {p.name} <ArrowRight size={13} /></>
                      )}
                    </button>
                  ) : (
                    <button
                      disabled
                      className={`w-full py-2 rounded-xl text-xs font-medium ${
                        isDark ? 'text-slate-600' : 'text-slate-300'
                      }`}
                    >
                      Plan inférieur
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Logout */}
        <div className="mt-10 text-center animate-fade-slide-up" style={{ animationDelay: '200ms' }}>
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
            <p className={`text-[11px] mt-3 ${textMuted}`}>Mode démo — données de simulation</p>
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
