/**
 * PricingSection — Enhanced pricing with Framer Motion animations.
 *
 * 3 plan cards with stagger entrance, animated toggle, and savings badge.
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, ArrowRight } from 'lucide-react';
import { ScrollReveal, staggerContainer, fadeInUp } from './animations';

const PLANS = [
  {
    id: 'gratuit',
    name: 'Gratuit',
    monthly: 0,
    yearly: 0,
    description: 'Pour d\u00e9marrer et tester',
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
    description: 'Pour l\'artisan ind\u00e9pendant',
    features: [
      'Devis & factures illimit\u00e9s',
      'Clients illimit\u00e9s',
      'Chantiers illimit\u00e9s',
      'Signatures \u00e9lectroniques',
      'Relances automatiques',
      'Devis IA (dict\u00e9e vocale)',
      'Conformit\u00e9 Facture 2026',
      'Catalogue complet',
    ],
    cta: 'Essayer 14 jours gratuit',
    highlighted: true,
    badge: 'Populaire',
  },
  {
    id: 'equipe',
    name: '\u00c9quipe',
    monthly: 29.90,
    yearly: 299,
    description: 'Pour les entreprises',
    features: [
      'Tout Artisan inclus',
      'Jusqu\'\u00e0 10 utilisateurs',
      'Pointage & heures',
      'Gestion des cong\u00e9s',
      'Tr\u00e9sorerie avanc\u00e9e',
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
        <ScrollReveal className="text-center mb-10 sm:mb-14">
          <p className="text-sm font-semibold text-orange-500 uppercase tracking-wide mb-2">
            Tarifs
          </p>
          <h2 className="text-2xl sm:text-4xl font-bold text-slate-900 mb-4">
            Des prix simples, sans surprise
          </h2>
          <p className="text-slate-500 mb-6">
            Tous les prix sont HT. Sans engagement, annulez &agrave; tout moment.
          </p>

          {/* Animated toggle */}
          <div className="inline-flex items-center gap-1 bg-white rounded-xl p-1 border border-slate-200 relative">
            <button
              onClick={() => setAnnual(false)}
              className="relative px-4 py-2 rounded-lg text-sm font-medium transition-colors z-10"
              style={{ color: !annual ? 'white' : '#475569' }}
            >
              Mensuel
            </button>
            <button
              onClick={() => setAnnual(true)}
              className="relative px-4 py-2 rounded-lg text-sm font-medium transition-colors z-10"
              style={{ color: annual ? 'white' : '#475569' }}
            >
              Annuel
              <span className="ml-1 text-xs opacity-80">-17%</span>
            </button>
            {/* Sliding indicator */}
            <motion.div
              layout
              className="absolute top-1 bottom-1 rounded-lg bg-orange-500"
              style={{
                left: annual ? 'calc(50% - 2px)' : '4px',
                width: annual ? 'calc(50% - 2px)' : 'calc(50% - 4px)',
              }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            />
          </div>

          {/* Savings badge */}
          <AnimatePresence>
            {annual && (
              <motion.div
                initial={{ opacity: 0, y: -10, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.9 }}
                className="mt-3 inline-flex items-center gap-1 px-3 py-1 rounded-full bg-green-50 border border-green-200 text-green-700 text-xs font-semibold"
              >
                &Eacute;conomisez jusqu'&agrave; 17% avec l'abonnement annuel
              </motion.div>
            )}
          </AnimatePresence>
        </ScrollReveal>

        {/* Plans */}
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          className="grid sm:grid-cols-3 gap-6 sm:gap-4 lg:gap-6 max-w-4xl mx-auto"
        >
          {PLANS.map((plan) => {
            const price = annual ? plan.yearly : plan.monthly;
            const period = annual ? '/an' : '/mois';

            return (
              <motion.div
                key={plan.id}
                variants={fadeInUp}
                whileHover={plan.highlighted ? { scale: 1.03 } : { scale: 1.02 }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                className={`relative rounded-2xl p-6 ${
                  plan.highlighted
                    ? 'bg-white border-2 border-orange-500 shadow-xl shadow-orange-500/10 sm:scale-105'
                    : 'bg-white border border-slate-200'
                }`}
              >
                {/* Badge */}
                {plan.badge && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-orange-500 text-white text-xs font-semibold shadow-sm">
                    {plan.badge}
                  </div>
                )}

                {/* Plan info */}
                <div className="mb-6">
                  <h3 className="text-lg font-bold text-slate-900">{plan.name}</h3>
                  <p className="text-sm text-slate-500 mt-1">{plan.description}</p>
                  <div className="mt-4">
                    <AnimatePresence mode="wait">
                      <motion.span
                        key={`${plan.id}-${annual}`}
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        transition={{ duration: 0.2 }}
                        className="text-3xl font-bold text-slate-900 inline-block"
                      >
                        {price === 0 ? '0' : price.toFixed(price % 1 ? 2 : 0)} &euro;
                      </motion.span>
                    </AnimatePresence>
                    {price > 0 && (
                      <span className="text-slate-500 text-sm ml-1">{period} HT</span>
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
                  className={`w-full py-2.5 rounded-xl text-sm font-medium flex items-center justify-center gap-2 transition-all ${
                    plan.highlighted
                      ? 'bg-orange-500 text-white hover:bg-orange-600 shadow-sm'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {plan.cta}
                  <ArrowRight size={14} />
                </button>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}
