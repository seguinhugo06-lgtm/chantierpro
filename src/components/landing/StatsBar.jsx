/**
 * StatsBar — Animated counters showing key metrics.
 *
 * Placed between Hero and Features. Numbers animate from 0 to target
 * when scrolled into view using useCounter hook.
 */

import React from 'react';
import { motion } from 'framer-motion';
import { FileText, Users, Shield, Server } from 'lucide-react';
import { useCounter, ScrollReveal, staggerContainer, fadeInUp } from './animations';

const STATS = [
  {
    icon: FileText,
    value: 2000,
    suffix: '+',
    label: 'Devis cr\u00e9\u00e9s',
    color: '#f97316',
    bgColor: 'bg-orange-50',
  },
  {
    icon: Users,
    value: 500,
    suffix: '+',
    label: 'Artisans actifs',
    color: '#3b82f6',
    bgColor: 'bg-blue-50',
  },
  {
    icon: Shield,
    value: 100,
    suffix: '%',
    label: 'Conforme 2026',
    color: '#22c55e',
    bgColor: 'bg-green-50',
  },
  {
    icon: Server,
    value: 100,
    suffix: '%',
    label: 'H\u00e9berg\u00e9 en France',
    color: '#8b5cf6',
    bgColor: 'bg-violet-50',
  },
];

function StatItem({ icon: Icon, value, suffix, label, color, bgColor }) {
  const { ref, value: displayValue } = useCounter(value);

  return (
    <motion.div
      ref={ref}
      variants={fadeInUp}
      className="flex flex-col items-center text-center px-4 py-3"
    >
      <div className={`w-12 h-12 rounded-xl ${bgColor} flex items-center justify-center mb-3`}>
        <Icon size={22} style={{ color }} />
      </div>
      <div className="text-2xl sm:text-3xl font-bold text-slate-900">
        {displayValue.toLocaleString('fr-FR')}{suffix}
      </div>
      <p className="text-sm text-slate-500 mt-1">{label}</p>
    </motion.div>
  );
}

export default function StatsBar() {
  return (
    <section className="py-12 sm:py-16 bg-white border-y border-slate-100">
      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.3 }}
          className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-8"
        >
          {STATS.map((stat) => (
            <StatItem key={stat.label} {...stat} />
          ))}
        </motion.div>
      </div>
    </section>
  );
}
