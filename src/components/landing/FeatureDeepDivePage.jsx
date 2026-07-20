/**
 * FeatureDeepDivePage — Page de détail d'une fonctionnalité (/fonctionnalites/:slug).
 *
 * Rendu piloté par featuresContent.js : hero + screenshot, « Comment ça marche »,
 * sous-fonctionnalités, FAQ (JSON-LD) et features liées. Light-mode only.
 */

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, ArrowLeft, Check, ChevronDown, Play } from 'lucide-react';
import MarketingLayout from './MarketingLayout';
import BrowserFrame from './BrowserFrame';
import { ScrollReveal, staggerContainer, fadeInUp } from './animations';
import { FEATURES_CONTENT } from './featuresContent';

function FaqItem({ item, color }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="bg-slate-50 rounded-xl border border-slate-200 overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-4 sm:p-5 text-left"
      >
        <span className="text-sm font-medium text-slate-900 pr-4">{item.q}</span>
        <motion.div animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }}>
          <ChevronDown size={18} className="text-slate-400" />
        </motion.div>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <p className="px-4 sm:px-5 pb-4 sm:pb-5 text-sm text-slate-600 leading-relaxed">{item.a}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function FeatureDeepDivePage({ slug }) {
  const feature = FEATURES_CONTENT[slug];

  // SEO : titre + description + FAQ JSON-LD
  useEffect(() => {
    if (!feature) return;
    document.title = `${feature.label} — BatiGesti`;
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute('content', feature.metaDescription);

    const jsonLd = {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: feature.faq.map((f) => ({
        '@type': 'Question',
        name: f.q,
        acceptedAnswer: { '@type': 'Answer', text: f.a },
      })),
    };
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.id = 'feature-faq-jsonld';
    script.textContent = JSON.stringify(jsonLd);
    document.getElementById('feature-faq-jsonld')?.remove();
    document.head.appendChild(script);
    return () => document.getElementById('feature-faq-jsonld')?.remove();
  }, [feature]);

  if (!feature) {
    // Slug inconnu → renvoyer vers le catalogue des fonctionnalités
    if (typeof window !== 'undefined') window.location.replace('/fonctionnalites');
    return null;
  }

  const { color } = feature;
  const related = (feature.related || []).map((s) => FEATURES_CONTENT[s]).filter(Boolean);

  return (
    <MarketingLayout>
      {/* Hero */}
      <section className="relative py-14 sm:py-20 bg-gradient-to-b from-orange-50/40 to-white overflow-hidden">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <ScrollReveal>
            <a
              href="/fonctionnalites"
              className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 transition-colors mb-6"
            >
              <ArrowLeft size={15} /> Toutes les fonctionnalités
            </a>
            <div className="grid lg:grid-cols-2 gap-10 lg:gap-14 items-center">
              <div>
                <span
                  className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold mb-4"
                  style={{ background: `${color}15`, color }}
                >
                  {feature.badge}
                </span>
                <h1 className="text-3xl sm:text-[2.6rem] font-bold text-slate-900 leading-[1.15] mb-4">
                  {feature.title}
                </h1>
                <p className="text-base sm:text-lg text-slate-500 leading-relaxed mb-7">
                  {feature.tagline}
                </p>
                <div className="flex flex-col sm:flex-row items-start gap-3">
                  <a
                    href="/"
                    onClick={(e) => { e.preventDefault(); window.location.href = '/'; }}
                    className="w-full sm:w-auto px-6 py-3 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 text-white font-semibold hover:from-orange-600 hover:to-orange-700 transition-all shadow-lg shadow-orange-500/25 flex items-center justify-center gap-2"
                  >
                    Créer mon compte gratuit
                    <ArrowRight size={17} />
                  </a>
                  <a
                    href="/?demo=true"
                    className="w-full sm:w-auto px-6 py-3 rounded-xl border border-slate-200 text-slate-700 font-medium hover:bg-slate-50 transition-all flex items-center justify-center gap-2"
                  >
                    <Play size={15} className="text-orange-500" />
                    Tester la démo en direct
                  </a>
                </div>
              </div>
              <div>
                <BrowserFrame src={feature.screenshot} alt={`${feature.label} — BatiGesti`} />
              </div>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* Comment ça marche */}
      <section className="py-14 sm:py-20 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <ScrollReveal className="text-center mb-10 sm:mb-14">
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">Comment ça marche</h2>
          </ScrollReveal>
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
            className="space-y-4"
          >
            {feature.steps.map((step, i) => (
              <motion.div
                key={step.title}
                variants={fadeInUp}
                className="flex items-start gap-4 sm:gap-5 p-5 sm:p-6 rounded-2xl bg-slate-50 border border-slate-200"
              >
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 text-white font-bold text-sm"
                  style={{ background: color }}
                >
                  {i + 1}
                </div>
                <div>
                  <h3 className="text-base font-semibold text-slate-900 mb-1">{step.title}</h3>
                  <p className="text-sm text-slate-500 leading-relaxed">{step.text}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Sous-fonctionnalités */}
      <section className="py-14 sm:py-20 bg-slate-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <ScrollReveal className="text-center mb-10 sm:mb-14">
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">Dans le détail</h2>
          </ScrollReveal>
          <div className="grid sm:grid-cols-2 gap-5 sm:gap-6">
            {feature.groups.map((group) => (
              <ScrollReveal key={group.name}>
                <div className="bg-white rounded-2xl border border-slate-200 p-6 h-full">
                  <h3 className="text-sm font-bold uppercase tracking-wide mb-4" style={{ color }}>
                    {group.name}
                  </h3>
                  <ul className="space-y-2.5">
                    {group.items.map((item) => (
                      <li key={item} className="flex items-start gap-2.5 text-sm text-slate-600">
                        <Check size={16} style={{ color }} className="flex-shrink-0 mt-0.5" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-14 sm:py-20 bg-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <ScrollReveal className="text-center mb-8 sm:mb-10">
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">Questions fréquentes</h2>
          </ScrollReveal>
          <div className="space-y-3">
            {feature.faq.map((item) => (
              <FaqItem key={item.q} item={item} color={color} />
            ))}
          </div>
        </div>
      </section>

      {/* Features liées */}
      {related.length > 0 && (
        <section className="py-14 sm:py-16 bg-slate-50">
          <div className="max-w-4xl mx-auto px-4 sm:px-6">
            <ScrollReveal className="text-center mb-8">
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900">Ça marche encore mieux avec</h2>
            </ScrollReveal>
            <div className="grid sm:grid-cols-2 gap-4">
              {related.map((r) => (
                <a
                  key={r.slug}
                  href={`/fonctionnalites/${r.slug}`}
                  className="group flex items-center justify-between p-5 rounded-2xl bg-white border border-slate-200 hover:border-orange-200 hover:shadow-lg hover:shadow-orange-500/5 transition-all"
                >
                  <div>
                    <p className="text-sm font-semibold text-slate-900 mb-0.5">{r.label}</p>
                    <p className="text-xs text-slate-500">{r.badge}</p>
                  </div>
                  <ArrowRight size={17} className="text-slate-300 group-hover:text-orange-500 group-hover:translate-x-0.5 transition-all" />
                </a>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* CTA final */}
      <section className="py-16 sm:py-20 bg-slate-900">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
          <ScrollReveal>
            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4">
              Essayez {feature.label.toLowerCase()} dès aujourd&apos;hui
            </h2>
            <p className="text-slate-400 mb-8">
              Plan gratuit sans limite de temps, sans carte bancaire.
            </p>
            <a
              href="/"
              className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 text-white font-semibold hover:from-orange-600 hover:to-orange-700 transition-all shadow-lg shadow-orange-500/25"
            >
              Créer mon compte gratuit
              <ArrowRight size={18} />
            </a>
          </ScrollReveal>
        </div>
      </section>
    </MarketingLayout>
  );
}
