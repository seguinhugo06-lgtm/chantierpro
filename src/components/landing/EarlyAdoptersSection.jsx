/**
 * EarlyAdoptersSection — Remplace les faux témoignages par de la transparence.
 *
 * BatiGesti est un produit récent : plutôt que d'inventer des avis
 * (interdit — L.121-2 Code de la consommation), on assume le statut
 * de nouveau venu et on en fait un argument : accès direct au créateur,
 * influence sur la roadmap, prix de lancement garanti.
 */

import React from 'react';
import { motion } from 'framer-motion';
import { Rocket, MessageSquare, TrendingDown, ShieldCheck, ArrowRight } from 'lucide-react';
import { ScrollReveal, staggerContainer, fadeInUp } from './animations';

const ADVANTAGES = [
  {
    icon: MessageSquare,
    title: 'Une ligne directe avec le créateur',
    description:
      'Un bug, une idée, un besoin ? Vous parlez directement à la personne qui développe BatiGesti. Réponse rapide, pas de ticket perdu dans une file d\'attente.',
    color: '#f97316',
    bg: 'bg-orange-50',
  },
  {
    icon: Rocket,
    title: 'Votre métier façonne le produit',
    description:
      'Les fonctionnalités sont priorisées selon les retours des premiers artisans utilisateurs. Vos demandes d\'aujourd\'hui sont les fonctionnalités de demain.',
    color: '#3b82f6',
    bg: 'bg-blue-50',
  },
  {
    icon: TrendingDown,
    title: 'Prix de lancement garanti',
    description:
      'En vous inscrivant maintenant, vous bénéficiez du tarif de lancement. Votre prix n\'augmentera pas, même quand les tarifs évolueront.',
    color: '#22c55e',
    bg: 'bg-green-50',
  },
  {
    icon: ShieldCheck,
    title: 'Zéro risque pour essayer',
    description:
      'Plan gratuit sans limite de temps, sans carte bancaire. Vos données restent exportables à tout moment : vous gardez toujours la main.',
    color: '#8b5cf6',
    bg: 'bg-violet-50',
  },
];

export default function EarlyAdoptersSection({ onSignup }) {
  return (
    <section id="early-adopters" className="py-16 sm:py-24 bg-slate-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        {/* Header — honnêteté assumée */}
        <ScrollReveal className="text-center mb-12 sm:mb-16">
          <p className="text-sm font-semibold text-orange-500 uppercase tracking-wide mb-2">
            Transparence
          </p>
          <h2 className="text-2xl sm:text-4xl font-bold text-slate-900 mb-4">
            BatiGesti est nouveau — et c&apos;est votre avantage
          </h2>
          <p className="text-slate-500 max-w-2xl mx-auto">
            Pas de faux témoignages ni de chiffres gonflés ici. BatiGesti vient d&apos;être lancé :
            les premiers artisans inscrits profitent d&apos;avantages qu&apos;aucun logiciel établi ne peut offrir.
          </p>
        </ScrollReveal>

        {/* Advantages grid */}
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          className="grid sm:grid-cols-2 gap-4 sm:gap-6 max-w-4xl mx-auto"
        >
          {ADVANTAGES.map((a) => {
            const Icon = a.icon;
            return (
              <motion.div
                key={a.title}
                variants={fadeInUp}
                className="flex items-start gap-4 p-6 rounded-2xl bg-white border border-slate-200 hover:border-orange-200 hover:shadow-lg hover:shadow-orange-500/5 transition-all"
              >
                <div className={`w-11 h-11 rounded-xl ${a.bg} flex items-center justify-center flex-shrink-0`}>
                  <Icon size={20} style={{ color: a.color }} />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-slate-900 mb-1.5">{a.title}</h4>
                  <p className="text-sm text-slate-500 leading-relaxed">{a.description}</p>
                </div>
              </motion.div>
            );
          })}
        </motion.div>

        {/* CTA */}
        <ScrollReveal className="text-center mt-10 sm:mt-12">
          <button
            onClick={onSignup}
            className="group inline-flex items-center gap-2 px-7 py-3.5 rounded-xl bg-slate-900 text-white font-semibold hover:bg-slate-800 transition-all shadow-lg"
          >
            Devenir l&apos;un des premiers artisans BatiGesti
            <ArrowRight size={18} className="group-hover:translate-x-0.5 transition-transform" />
          </button>
          <p className="text-xs text-slate-400 mt-4">
            Les avis affichés ici seront de vrais avis d&apos;utilisateurs — le vôtre, peut-être.
          </p>
        </ScrollReveal>
      </div>
    </section>
  );
}
