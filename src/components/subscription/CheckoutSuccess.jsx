/**
 * CheckoutSuccess — Confirmation page after successful Stripe checkout
 *
 * Shows confetti animation, success icon, plan recap, and next steps.
 * Used after returning from Stripe Checkout with ?billing=success
 */

import React, { useState, useEffect } from 'react';
import { CheckCircle, ArrowRight, Sparkles, FileText, PenTool, Camera, Settings } from 'lucide-react';
import { useSubscriptionStore, PLANS } from '../../stores/subscriptionStore';

// Simple confetti effect using CSS
function Confetti() {
  const [show, setShow] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setShow(false), 3000);
    return () => clearTimeout(timer);
  }, []);

  if (!show) return null;

  const colors = ['#F97316', '#3B82F6', '#8B5CF6', '#22C55E', '#EAB308', '#EC4899'];

  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {Array.from({ length: 50 }).map((_, i) => {
        const color = colors[i % colors.length];
        const left = Math.random() * 100;
        const delay = Math.random() * 2;
        const duration = 2 + Math.random() * 2;
        const size = 4 + Math.random() * 8;

        return (
          <div
            key={i}
            className="absolute animate-confetti-fall"
            style={{
              left: `${left}%`,
              top: '-10px',
              width: `${size}px`,
              height: `${size}px`,
              backgroundColor: color,
              borderRadius: Math.random() > 0.5 ? '50%' : '2px',
              animationDelay: `${delay}s`,
              animationDuration: `${duration}s`,
              transform: `rotate(${Math.random() * 360}deg)`
            }}
          />
        );
      })}
      <style>{`
        @keyframes confetti-fall {
          0% { transform: translateY(-10px) rotate(0deg); opacity: 1; }
          100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
        }
        .animate-confetti-fall {
          animation: confetti-fall ease-out forwards;
        }
      `}</style>
    </div>
  );
}

const PLAN_SUGGESTIONS = {
  pro: [
    { icon: FileText, emoji: '✨', text: 'Créer des devis illimités' },
    { icon: PenTool, emoji: '🖊️', text: 'Utiliser les signatures électroniques' },
    { icon: Camera, emoji: '🤖', text: 'Générer des devis avec l\'IA' }
  ]
};

export default function CheckoutSuccess({ isDark, couleur, setPage }) {
  const planId = useSubscriptionStore((s) => s.planId);
  const sub = useSubscriptionStore((s) => s.subscription);
  const plan = PLANS[planId] || PLANS.gratuit;

  const suggestions = PLAN_SUGGESTIONS[planId] || PLAN_SUGGESTIONS.pro;
  const userEmail = sub?.user_email || 'votre adresse email';

  const nextBilling = sub?.current_period_end
    ? new Date(sub.current_period_end).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
    : null;

  const billingInterval = sub?.billing_interval === 'yearly' ? 'Annuel' : 'Mensuel';
  const price = sub?.billing_interval === 'yearly' && plan.priceYearly
    ? `${plan.priceYearly}€ HT/an`
    : plan.priceMonthly ? `${plan.priceMonthly}€ HT/mois` : 'Gratuit';

  return (
    <div className={`min-h-[80vh] flex flex-col items-center justify-center ${isDark ? '' : 'bg-gradient-to-b from-green-50 to-transparent'} rounded-2xl`}>
      <Confetti />

      <div className="max-w-lg mx-auto text-center px-6 py-12">
        {/* Success icon */}
        <div className="mb-6 animate-bounce">
          <CheckCircle size={80} className="text-green-500 mx-auto" />
        </div>

        {/* Title */}
        <h1 className={`text-3xl font-bold mb-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
          Bienvenue dans le plan {plan.name} !
        </h1>
        <p className={`text-lg mb-8 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
          Votre paiement a été approuvé
        </p>

        {/* Recap card */}
        <div className={`rounded-xl p-6 text-left mb-8 ${isDark ? 'bg-slate-800 border border-slate-700' : 'bg-white border border-slate-200'} shadow-sm`}>
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>Plan choisi</span>
              <span className={`font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                {plan.name} — {billingInterval}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>Prix</span>
              <span className={`font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                {price}
              </span>
            </div>
            {nextBilling && (
              <div className="flex justify-between text-sm">
                <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>Prochaine facturation</span>
                <span className={`font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  {nextBilling}
                </span>
              </div>
            )}
          </div>
          <div className={`mt-4 pt-4 border-t text-xs ${isDark ? 'border-slate-700 text-slate-500' : 'border-slate-100 text-slate-400'}`}>
            Confirmation envoyée par email
          </div>
        </div>

        {/* Suggestions */}
        <div className="mb-10">
          <h3 className={`text-sm font-semibold mb-4 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
            Vos nouvelles fonctionnalités déverrouillées :
          </h3>
          <div className="space-y-2 text-left max-w-sm mx-auto">
            {suggestions.map((s, i) => (
              <div key={i} className={`flex items-center gap-3 text-sm ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                <span className="text-lg">{s.emoji}</span>
                <span>{s.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Action buttons */}
        <div className="space-y-3">
          <button
            onClick={() => setPage && setPage('dashboard')}
            className="w-full py-3 rounded-xl bg-orange-500 text-white font-bold text-sm hover:bg-orange-600 hover:shadow-lg transition-all flex items-center justify-center gap-2"
          >
            Explorer mes nouvelles fonctionnalités
            <ArrowRight size={16} />
          </button>
          <button
            onClick={() => setPage && setPage('billing')}
            className={`w-full py-2.5 rounded-xl border text-sm font-medium transition-colors ${
              isDark
                ? 'border-slate-600 text-slate-300 hover:bg-slate-800'
                : 'border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            Voir mes paramètres d'abonnement
          </button>
        </div>

        {/* Help text */}
        <p className={`text-xs mt-8 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
          Questions ? Consultez notre aide ou contactez support@chantierpro.com
        </p>
      </div>
    </div>
  );
}
