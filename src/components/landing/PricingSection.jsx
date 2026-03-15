import React, { useState } from 'react';
import { Check, ArrowRight } from 'lucide-react';

const PLANS = [
  {
    id: 'gratuit',
    name: 'Gratuit',
    monthly: 0,
    yearly: 0,
    description: 'Pour démarrer et tester',
    features: [
      '5 devis / mois',
      '10 clients',
      '2 chantiers actifs',
      'Planning basique',
      'Catalogue 50 articles',
    ],
    cta: 'Commencer gratuitement',
    highlighted: false,
  },
  {
    id: 'artisan',
    name: 'Artisan',
    monthly: 14.90,
    yearly: 149,
    description: 'Pour l\'artisan indépendant',
    features: [
      'Devis & factures illimités',
      'Clients illimités',
      'Chantiers illimités',
      'Signatures électroniques',
      'Relances automatiques',
      'Devis IA (dictée vocale)',
      'Conformité Facture 2026',
      'Catalogue complet',
    ],
    cta: 'Essayer 14 jours gratuit',
    highlighted: true,
    badge: 'Populaire',
  },
  {
    id: 'equipe',
    name: 'Équipe',
    monthly: 29.90,
    yearly: 299,
    description: 'Pour les entreprises',
    features: [
      'Tout Artisan inclus',
      'Jusqu\'à 10 utilisateurs',
      'Pointage & heures',
      'Gestion des congés',
      'Trésorerie avancée',
      'Sous-traitants',
      'Portail client',
      'Journal d\'audit',
    ],
    cta: 'Essayer 14 jours gratuit',
    highlighted: false,
  },
];

export default function PricingSection({ onSignup }) {
  const [annual, setAnnual] = useState(false);

  return (
    <section id="pricing" className="py-16 sm:py-24 bg-slate-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        {/* Header */}
        <div className="text-center mb-10 sm:mb-14">
          <p className="text-sm font-semibold text-orange-500 uppercase tracking-wide mb-2">
            Tarifs
          </p>
          <h2 className="text-2xl sm:text-4xl font-bold text-slate-900 mb-4">
            Des prix simples, sans surprise
          </h2>
          <p className="text-slate-500 mb-6">
            Tous les prix sont HT. Sans engagement, annulez à tout moment.
          </p>

          {/* Toggle */}
          <div className="inline-flex items-center gap-3 bg-white rounded-xl p-1 border border-slate-200">
            <button
              onClick={() => setAnnual(false)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                !annual ? 'bg-orange-500 text-white' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Mensuel
            </button>
            <button
              onClick={() => setAnnual(true)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                annual ? 'bg-orange-500 text-white' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Annuel
              <span className="ml-1 text-xs opacity-80">-17%</span>
            </button>
          </div>
        </div>

        {/* Plans */}
        <div className="grid sm:grid-cols-3 gap-6 sm:gap-4 lg:gap-6 max-w-4xl mx-auto">
          {PLANS.map((plan) => {
            const price = annual ? plan.yearly : plan.monthly;
            const period = annual ? '/an' : '/mois';

            return (
              <div
                key={plan.id}
                className={`relative rounded-2xl p-6 ${
                  plan.highlighted
                    ? 'bg-white border-2 border-orange-500 shadow-xl shadow-orange-500/10 sm:scale-105'
                    : 'bg-white border border-slate-200'
                }`}
              >
                {/* Badge */}
                {plan.badge && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-orange-500 text-white text-xs font-semibold">
                    {plan.badge}
                  </div>
                )}

                {/* Plan info */}
                <div className="mb-6">
                  <h3 className="text-lg font-bold text-slate-900">{plan.name}</h3>
                  <p className="text-sm text-slate-500 mt-1">{plan.description}</p>
                  <div className="mt-4">
                    <span className="text-3xl font-bold text-slate-900">
                      {price === 0 ? '0' : price.toFixed(price % 1 ? 2 : 0)} €
                    </span>
                    {price > 0 && (
                      <span className="text-slate-500 text-sm">{period} HT</span>
                    )}
                  </div>
                </div>

                {/* Features */}
                <ul className="space-y-2.5 mb-6">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-slate-600">
                      <Check size={16} className="text-orange-500 flex-shrink-0 mt-0.5" />
                      {f}
                    </li>
                  ))}
                </ul>

                {/* CTA */}
                <button
                  onClick={onSignup}
                  className={`w-full py-2.5 rounded-xl text-sm font-medium flex items-center justify-center gap-2 transition-colors ${
                    plan.highlighted
                      ? 'bg-orange-500 text-white hover:bg-orange-600'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {plan.cta}
                  <ArrowRight size={14} />
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
