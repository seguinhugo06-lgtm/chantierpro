/**
 * QuickFeaturesGrid — Compact grid for secondary features.
 *
 * Small cards with icon + title + one-liner for mobile, integrations,
 * client portal, catalogue, conformity, import/export.
 */

import React from 'react';
import { motion } from 'framer-motion';
import {
  Smartphone,
  Puzzle,
  Globe,
  BookOpen,
  ShieldCheck,
  ArrowUpDown,
} from 'lucide-react';
import { ScrollReveal, staggerContainer, fadeInUp } from './animations';

const FEATURES = [
  {
    icon: Smartphone,
    title: 'Mobile & tablette',
    description: 'Installez l\'app sur votre t\u00e9l\u00e9phone. Fonctionne m\u00eame hors-ligne.',
    color: '#f97316',
    bg: 'bg-orange-50',
  },
  {
    icon: Puzzle,
    title: 'Int\u00e9grations',
    description: 'Stripe, GoCardless, Twilio SMS, SendGrid, m\u00e9t\u00e9o et plus.',
    color: '#3b82f6',
    bg: 'bg-blue-50',
  },
  {
    icon: Globe,
    title: 'Portail client',
    description: 'Vos clients consultent et signent leurs documents en ligne.',
    color: '#22c55e',
    bg: 'bg-green-50',
  },
  {
    icon: BookOpen,
    title: 'Catalogue',
    description: 'Biblioth\u00e8que de prestations r\u00e9utilisables avec prix et cat\u00e9gories.',
    color: '#8b5cf6',
    bg: 'bg-violet-50',
  },
  {
    icon: ShieldCheck,
    title: 'Conformit\u00e9 2026',
    description: 'Factur-X, archivage 10 ans, piste d\'audit, SHA-256.',
    color: '#ef4444',
    bg: 'bg-red-50',
  },
  {
    icon: ArrowUpDown,
    title: 'Import / Export',
    description: 'Importez vos donn\u00e9es existantes, exportez \u00e0 tout moment.',
    color: '#06b6d4',
    bg: 'bg-cyan-50',
  },
];

export default function QuickFeaturesGrid() {
  return (
    <section className="py-12 sm:py-20 bg-slate-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <ScrollReveal className="text-center mb-10 sm:mb-14">
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 mb-3">
            Et bien plus encore...
          </h2>
          <p className="text-slate-500 max-w-lg mx-auto text-sm">
            BatiGesti int&egrave;gre tout ce dont vous avez besoin pour travailler efficacement.
          </p>
        </ScrollReveal>

        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6"
        >
          {FEATURES.map((f) => {
            const Icon = f.icon;
            return (
              <motion.div
                key={f.title}
                variants={fadeInUp}
                className="flex items-start gap-4 p-5 rounded-xl bg-white border border-slate-200 hover:border-slate-300 hover:shadow-md transition-all"
              >
                <div className={`w-10 h-10 rounded-lg ${f.bg} flex items-center justify-center flex-shrink-0`}>
                  <Icon size={20} style={{ color: f.color }} />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-slate-900 mb-1">{f.title}</h4>
                  <p className="text-xs text-slate-500 leading-relaxed">{f.description}</p>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}
