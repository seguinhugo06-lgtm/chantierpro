/**
 * CtaBanner — Mid-page conversion CTA with gradient background and floating shapes.
 */

import React from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { ArrowRight, Sparkles } from 'lucide-react';
import { ScrollReveal } from './animations';

export default function CtaBanner({ onSignup }) {
  const { scrollY } = useScroll();
  const shape1Y = useTransform(scrollY, [0, 3000], [0, -40]);
  const shape2Y = useTransform(scrollY, [0, 3000], [0, -60]);

  return (
    <section className="relative py-16 sm:py-24 overflow-hidden">
      {/* Gradient background */}
      <div className="absolute inset-0 bg-gradient-to-r from-orange-500 via-orange-600 to-orange-500" />

      {/* Floating shapes */}
      <motion.div
        style={{ y: shape1Y }}
        className="absolute top-8 left-[10%] w-24 h-24 rounded-full bg-white/10 blur-xl"
      />
      <motion.div
        style={{ y: shape2Y }}
        className="absolute bottom-8 right-[15%] w-32 h-32 rounded-full bg-white/10 blur-xl"
      />
      <motion.div
        className="absolute top-1/2 left-[60%] w-16 h-16 rounded-2xl bg-white/5 rotate-12"
        animate={{ rotate: [12, -12, 12] }}
        transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute top-[20%] right-[25%] w-12 h-12 rounded-full bg-white/5"
        animate={{ scale: [1, 1.2, 1] }}
        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* Pattern overlay */}
      <div
        className="absolute inset-0 opacity-[0.05]"
        style={{
          backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)',
          backgroundSize: '32px 32px',
        }}
      />

      {/* Content */}
      <div className="relative max-w-3xl mx-auto px-4 sm:px-6 text-center">
        <ScrollReveal>
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/15 text-white/90 text-xs font-semibold mb-6 backdrop-blur-sm">
            <Sparkles size={14} />
            Essai gratuit, sans carte bancaire
          </div>

          <h2 className="text-2xl sm:text-4xl font-bold text-white mb-4 leading-tight">
            Pr&ecirc;t &agrave; simplifier la gestion de vos chantiers ?
          </h2>

          <p className="text-base sm:text-lg text-white/80 mb-8 max-w-lg mx-auto">
            Rejoignez des centaines d'artisans qui gagnent du temps chaque jour avec BatiGesti.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
            <button
              onClick={onSignup}
              className="group w-full sm:w-auto px-7 py-3.5 rounded-xl bg-white text-orange-600 font-semibold hover:bg-orange-50 transition-all shadow-lg shadow-orange-900/20 flex items-center justify-center gap-2"
            >
              Commencer gratuitement
              <ArrowRight size={18} className="group-hover:translate-x-0.5 transition-transform" />
            </button>
            <a
              href="#pricing"
              className="w-full sm:w-auto px-7 py-3.5 rounded-xl border border-white/30 text-white font-medium hover:bg-white/10 transition-all flex items-center justify-center"
            >
              Voir les tarifs
            </a>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
