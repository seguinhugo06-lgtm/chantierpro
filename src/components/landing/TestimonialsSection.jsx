/**
 * TestimonialsSection — Social proof wall with auto-scrolling carousel.
 *
 * 8 testimonials in two rows, auto-scrolling in opposite directions.
 * CSS-only infinite scroll animation with pause on hover.
 */

import React from 'react';
import { motion } from 'framer-motion';
import { Star, Quote } from 'lucide-react';
import { ScrollReveal, fadeInUp } from './animations';

const TESTIMONIALS = [
  {
    name: 'Jean-Marc D.',
    role: 'Plombier',
    city: 'Bordeaux',
    stars: 5,
    quote: 'Avant BatiGesti, je passais 2h par jour sur mes devis. Maintenant c\'est 15 minutes. Le Devis IA est bluffant.',
    avatar: 'JM',
    gradient: 'from-orange-400 to-orange-600',
  },
  {
    name: 'Sophie L.',
    role: '\u00c9lectricienne',
    city: 'Lyon',
    stars: 5,
    quote: 'La conformit\u00e9 Facture 2026 m\'inqui\u00e9tait. Avec BatiGesti, tout est automatique. Je me concentre sur mes chantiers.',
    avatar: 'SL',
    gradient: 'from-blue-400 to-blue-600',
  },
  {
    name: 'Pierre M.',
    role: 'Entreprise r\u00e9novation',
    city: 'Paris',
    stars: 5,
    quote: 'Avec 6 employ\u00e9s, le suivi des heures et des marges par chantier a chang\u00e9 notre rentabilit\u00e9. Indispensable.',
    avatar: 'PM',
    gradient: 'from-green-400 to-green-600',
  },
  {
    name: 'Karim B.',
    role: 'Ma\u00e7on',
    city: 'Marseille',
    stars: 5,
    quote: 'Je dicte mes travaux sur le chantier et le devis est pr\u00eat en 2 minutes. Mes clients sont impressionn\u00e9s par la rapidit\u00e9.',
    avatar: 'KB',
    gradient: 'from-violet-400 to-violet-600',
  },
  {
    name: 'Marie C.',
    role: 'Peintre',
    city: 'Toulouse',
    stars: 5,
    quote: 'Les relances automatiques m\'ont fait r\u00e9cup\u00e9rer 3 devis en attente le premier mois. \u00c7a se paie tout seul.',
    avatar: 'MC',
    gradient: 'from-cyan-400 to-cyan-600',
  },
  {
    name: 'Fr\u00e9d\u00e9ric R.',
    role: 'Menuisier',
    city: 'Nantes',
    stars: 5,
    quote: 'Le suivi de tr\u00e9sorerie m\'a permis d\'anticiper un trou de 15 000\u20ac. Sans BatiGesti, j\'aurais \u00e9t\u00e9 pris au d\u00e9pourvu.',
    avatar: 'FR',
    gradient: 'from-amber-400 to-amber-600',
  },
  {
    name: 'Laura P.',
    role: 'Carreleur',
    city: 'Lille',
    stars: 5,
    quote: 'Le portail client est g\u00e9nial. Mes clients signent les devis en ligne, plus besoin de courir apr\u00e8s les signatures.',
    avatar: 'LP',
    gradient: 'from-rose-400 to-rose-600',
  },
  {
    name: 'Thomas G.',
    role: 'Couvreur',
    city: 'Strasbourg',
    stars: 4,
    quote: 'Le catalogue de prestations me fait gagner un temps fou. Je construis un devis comme un jeu de LEGO.',
    avatar: 'TG',
    gradient: 'from-teal-400 to-teal-600',
  },
];

function TestimonialCard({ testimonial }) {
  const t = testimonial;
  return (
    <div className="flex-shrink-0 w-[320px] sm:w-[380px] p-6 rounded-2xl border border-slate-200 bg-white hover:border-orange-200 hover:shadow-lg hover:shadow-orange-500/5 transition-all">
      {/* Stars + Quote icon */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-0.5">
          {Array.from({ length: t.stars }).map((_, i) => (
            <Star key={i} size={14} className="text-orange-400 fill-orange-400" />
          ))}
        </div>
        <Quote size={20} className="text-slate-200" />
      </div>

      {/* Quote text */}
      <p className="text-sm text-slate-600 leading-relaxed mb-6">
        &laquo; {t.quote} &raquo;
      </p>

      {/* Author */}
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${t.gradient} flex items-center justify-center text-white text-xs font-bold shadow-sm`}>
          {t.avatar}
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-900">{t.name}</p>
          <p className="text-xs text-slate-500">{t.role} &middot; {t.city}</p>
        </div>
      </div>
    </div>
  );
}

function ScrollingRow({ items, direction = 'left', speed = 40 }) {
  // Double items for seamless loop
  const doubled = [...items, ...items];
  const animationStyle = {
    '--scroll-speed': `${speed}s`,
    animationDirection: direction === 'right' ? 'reverse' : 'normal',
  };

  return (
    <div className="relative overflow-hidden group">
      {/* Fade edges */}
      <div className="absolute left-0 top-0 bottom-0 w-16 sm:w-32 bg-gradient-to-r from-slate-50 to-transparent z-10 pointer-events-none" />
      <div className="absolute right-0 top-0 bottom-0 w-16 sm:w-32 bg-gradient-to-l from-slate-50 to-transparent z-10 pointer-events-none" />

      <div
        className="flex gap-4 sm:gap-6 animate-scroll-x group-hover:[animation-play-state:paused]"
        style={animationStyle}
      >
        {doubled.map((t, i) => (
          <TestimonialCard key={`${t.name}-${i}`} testimonial={t} />
        ))}
      </div>
    </div>
  );
}

export default function TestimonialsSection() {
  const row1 = TESTIMONIALS.slice(0, 4);
  const row2 = TESTIMONIALS.slice(4, 8);

  return (
    <section id="testimonials" className="py-16 sm:py-24 bg-slate-50">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <ScrollReveal className="text-center mb-12 sm:mb-16 px-4 sm:px-6">
          <p className="text-sm font-semibold text-orange-500 uppercase tracking-wide mb-2">
            T&eacute;moignages
          </p>
          <h2 className="text-2xl sm:text-4xl font-bold text-slate-900 mb-4">
            Des artisans comme vous font confiance &agrave; BatiGesti
          </h2>
          <p className="text-slate-500 max-w-xl mx-auto">
            Plombiers, &eacute;lectriciens, ma&ccedil;ons, peintres... ils g&egrave;rent leurs chantiers avec BatiGesti.
          </p>
        </ScrollReveal>

        {/* Scrolling rows */}
        <div className="space-y-4 sm:space-y-6">
          <ScrollingRow items={row1} direction="left" speed={50} />
          <ScrollingRow items={row2} direction="right" speed={55} />
        </div>
      </div>

      {/* CSS for infinite scroll */}
      <style>{`
        @keyframes scroll-x {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
        .animate-scroll-x {
          animation: scroll-x var(--scroll-speed, 40s) linear infinite;
          width: max-content;
        }
        @media (prefers-reduced-motion: reduce) {
          .animate-scroll-x {
            animation: none;
            flex-wrap: wrap;
            width: auto;
            justify-content: center;
          }
        }
      `}</style>
    </section>
  );
}
