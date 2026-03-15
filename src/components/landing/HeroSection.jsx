import React from 'react';
import { ArrowRight, Play, Shield, CheckCircle } from 'lucide-react';

export default function HeroSection({ onSignup }) {
  return (
    <section className="relative bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0">
        <div className="absolute top-0 right-0 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-orange-500/5 rounded-full blur-3xl" />
      </div>

      <div className="relative max-w-6xl mx-auto px-4 sm:px-6 pt-28 sm:pt-36 pb-16 sm:pb-24">
        <div className="text-center max-w-3xl mx-auto">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-400 text-xs font-medium mb-6">
            <Shield size={14} />
            Conforme Facture 2026 · Factur-X · RGPD
          </div>

          {/* Headline */}
          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-bold text-white leading-tight mb-6">
            Gérez vos chantiers,{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-orange-500">
              devis et factures
            </span>{' '}
            en quelques clics
          </h1>

          {/* Subtitle */}
          <p className="text-base sm:text-lg text-slate-400 mb-8 max-w-xl mx-auto leading-relaxed">
            L'outil tout-en-un conçu par et pour les artisans du bâtiment.
            Créez un devis en 2 minutes, suivez vos chantiers, gérez votre trésorerie.
          </p>

          {/* CTA buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 mb-10">
            <button
              onClick={onSignup}
              className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 text-white font-semibold hover:from-orange-600 hover:to-orange-700 transition-all shadow-lg shadow-orange-500/25 flex items-center justify-center gap-2"
            >
              Essayer gratuitement
              <ArrowRight size={18} />
            </button>
            <a
              href="#features"
              className="w-full sm:w-auto px-6 py-3.5 rounded-xl border border-slate-600 text-slate-300 font-medium hover:bg-slate-800 transition-colors flex items-center justify-center gap-2"
            >
              <Play size={16} />
              Découvrir
            </a>
          </div>

          {/* Trust badges */}
          <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 text-slate-500 text-xs">
            <div className="flex items-center gap-1.5">
              <CheckCircle size={14} className="text-green-500" />
              <span>Gratuit pour démarrer</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle size={14} className="text-green-500" />
              <span>Sans engagement</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle size={14} className="text-green-500" />
              <span>Données hébergées en France</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
