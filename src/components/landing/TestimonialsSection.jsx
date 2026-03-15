import React from 'react';
import { Star } from 'lucide-react';

const TESTIMONIALS = [
  {
    name: 'Jean-Marc D.',
    role: 'Plombier · Bordeaux',
    stars: 5,
    quote: 'Avant BatiGesti, je passais 2h par jour sur mes devis. Maintenant c\'est 15 minutes. Le Devis IA est bluffant.',
    avatar: 'JM',
  },
  {
    name: 'Sophie L.',
    role: 'Électricienne · Lyon',
    stars: 5,
    quote: 'La conformité Facture 2026 m\'inquiétait. Avec BatiGesti, tout est automatique. Je me concentre sur mes chantiers.',
    avatar: 'SL',
  },
  {
    name: 'Pierre M.',
    role: 'Entreprise rénovation · Paris',
    stars: 5,
    quote: 'Avec 6 employés, le suivi des heures et des marges par chantier a changé notre rentabilité. Indispensable.',
    avatar: 'PM',
  },
];

export default function TestimonialsSection() {
  return (
    <section id="testimonials" className="py-16 sm:py-24 bg-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        {/* Header */}
        <div className="text-center mb-12 sm:mb-16">
          <p className="text-sm font-semibold text-orange-500 uppercase tracking-wide mb-2">
            Témoignages
          </p>
          <h2 className="text-2xl sm:text-4xl font-bold text-slate-900 mb-4">
            Des artisans comme vous utilisent BatiGesti
          </h2>
        </div>

        {/* Cards */}
        <div className="grid sm:grid-cols-3 gap-6">
          {TESTIMONIALS.map((t) => (
            <div
              key={t.name}
              className="p-6 rounded-2xl border border-slate-200 hover:border-orange-200 hover:shadow-lg transition-all"
            >
              {/* Stars */}
              <div className="flex gap-0.5 mb-4">
                {Array.from({ length: t.stars }).map((_, i) => (
                  <Star key={i} size={16} className="text-orange-400 fill-orange-400" />
                ))}
              </div>

              {/* Quote */}
              <p className="text-sm text-slate-600 leading-relaxed mb-6 italic">
                "{t.quote}"
              </p>

              {/* Author */}
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white text-xs font-bold">
                  {t.avatar}
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900">{t.name}</p>
                  <p className="text-xs text-slate-500">{t.role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
