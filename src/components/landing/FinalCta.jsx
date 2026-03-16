/**
 * FinalCta — Last-chance conversion CTA before footer.
 * Dark background, large typography, single focused CTA.
 */

import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { ScrollReveal } from './animations';

export default function FinalCta({ onSignup }) {
  return (
    <section className="relative py-20 sm:py-32 bg-slate-900 overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0">
        <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-orange-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-orange-500/5 rounded-full blur-3xl" />
        <div
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />
      </div>

      <div className="relative max-w-3xl mx-auto px-4 sm:px-6 text-center">
        <ScrollReveal>
          <h2 className="text-3xl sm:text-5xl font-bold text-white mb-6 leading-tight">
            Passez &agrave; la vitesse sup&eacute;rieure
          </h2>
          <p className="text-lg text-slate-400 mb-10 max-w-xl mx-auto leading-relaxed">
            Arr&ecirc;tez de perdre du temps avec les tableurs et les papiers.
            G&eacute;rez tout depuis une seule application, o&ugrave; que vous soyez.
          </p>

          <button
            onClick={onSignup}
            className="group px-8 py-4 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 text-white font-semibold text-lg hover:from-orange-600 hover:to-orange-700 transition-all shadow-lg shadow-orange-500/25 inline-flex items-center gap-3"
          >
            Cr&eacute;er mon compte gratuit
            <ArrowRight size={20} className="group-hover:translate-x-0.5 transition-transform" />
          </button>

          <p className="text-sm text-slate-500 mt-6">
            Gratuit pour d&eacute;marrer &middot; Sans engagement &middot; Configuration en 2 minutes
          </p>
        </ScrollReveal>
      </div>
    </section>
  );
}
