/**
 * FAQSection — Animated accordion FAQ with 12 questions grouped by category.
 *
 * Uses Framer Motion AnimatePresence for smooth accordion open/close.
 * Category tabs for filtering on desktop.
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, HelpCircle } from 'lucide-react';
import { ScrollReveal } from './animations';

const FAQ_CATEGORIES = [
  { id: 'all', label: 'Tout' },
  { id: 'general', label: 'G\u00e9n\u00e9ral' },
  { id: 'features', label: 'Fonctionnalit\u00e9s' },
  { id: 'pricing', label: 'Tarifs' },
  { id: 'tech', label: 'Technique' },
];

const FAQ_ITEMS = [
  {
    category: 'general',
    q: 'C\'est quoi BatiGesti ?',
    a: 'BatiGesti est un logiciel en ligne (SaaS) de gestion de chantier con\u00e7u sp\u00e9cifiquement pour les artisans et entreprises du BTP. Il regroupe devis, factures, suivi de chantier, planning, CRM, tr\u00e9sorerie et gestion d\'\u00e9quipe dans une seule application accessible depuis n\'importe quel appareil.',
  },
  {
    category: 'general',
    q: 'Puis-je utiliser BatiGesti sur mon t\u00e9l\u00e9phone ?',
    a: 'Absolument. BatiGesti est une application web progressive (PWA) qui s\'installe directement sur votre t\u00e9l\u00e9phone comme une application native. Pas besoin de t\u00e9l\u00e9charger une app sur l\'App Store ou Play Store. Elle fonctionne sur iPhone, Android, tablette et ordinateur, m\u00eame hors-ligne.',
  },
  {
    category: 'features',
    q: 'Comment fonctionne le Devis IA ?',
    a: 'Vous dictez votre devis par la voix ou le tapez en texte libre directement sur le chantier. L\'intelligence artificielle analyse votre description, identifie les mat\u00e9riaux, quantit\u00e9s et prix, puis g\u00e9n\u00e8re les lignes du devis automatiquement. Vous pouvez ensuite affiner avec le chat IA ou modifier manuellement.',
  },
  {
    category: 'features',
    q: 'Comment fonctionnent les relances automatiques ?',
    a: 'Vous configurez des templates de relance personnalis\u00e9s avec des variables dynamiques (nom du client, montant, num\u00e9ro de devis...). BatiGesti envoie automatiquement les relances par email selon le calendrier que vous d\u00e9finissez. Vous gardez un historique complet de chaque relance.',
  },
  {
    category: 'features',
    q: 'Le portail client, c\'est quoi exactement ?',
    a: 'Le portail client est un espace en ligne s\u00e9curis\u00e9 o\u00f9 vos clients peuvent consulter leurs devis, les signer \u00e9lectroniquement, et payer leurs factures en ligne. Chaque client re\u00e7oit un lien unique. Pas besoin de cr\u00e9er un compte pour eux.',
  },
  {
    category: 'tech',
    q: 'Est-ce que BatiGesti est conforme \u00e0 la facturation \u00e9lectronique 2026 ?',
    a: 'Oui. BatiGesti g\u00e9n\u00e8re des factures au format Factur-X (norme EN 16931), avec archivage s\u00e9curis\u00e9 SHA-256 sur 10 ans, piste d\'audit, et toutes les mentions l\u00e9gales obligatoires. Vous \u00eates conforme sans effort suppl\u00e9mentaire.',
  },
  {
    category: 'tech',
    q: 'Mes donn\u00e9es sont-elles s\u00e9curis\u00e9es ?',
    a: 'Vos donn\u00e9es sont h\u00e9berg\u00e9es en Europe sur l\'infrastructure Supabase (PostgreSQL), avec chiffrement au repos et en transit. L\'authentification est g\u00e9r\u00e9e par JWT. Chaque utilisateur ne voit que les donn\u00e9es de son organisation gr\u00e2ce au Row Level Security. Nous respectons le RGPD.',
  },
  {
    category: 'tech',
    q: 'Puis-je exporter mes donn\u00e9es ?',
    a: 'Oui. Vous pouvez exporter vos devis et factures en PDF, vos donn\u00e9es comptables aux formats compatibles Pennylane et Indy, et l\'ensemble de vos donn\u00e9es en JSON depuis les param\u00e8tres. Vos donn\u00e9es vous appartiennent.',
  },
  {
    category: 'pricing',
    q: 'Puis-je essayer avant de payer ?',
    a: 'Le plan Gratuit est disponible sans limite de temps avec 5 devis/mois, 10 clients et 2 chantiers actifs. Pour les plans payants (Artisan et \u00c9quipe), vous b\u00e9n\u00e9ficiez de 14 jours d\'essai gratuit sans engagement et sans carte bancaire.',
  },
  {
    category: 'pricing',
    q: 'Puis-je changer de plan en cours de route ?',
    a: 'Oui. Vous pouvez passer \u00e0 un plan sup\u00e9rieur \u00e0 tout moment. Le changement est imm\u00e9diat. Si vous passez \u00e0 un plan inf\u00e9rieur, la modification prend effet \u00e0 la fin de votre p\u00e9riode de facturation en cours.',
  },
  {
    category: 'general',
    q: 'Comment migrer depuis un autre logiciel ?',
    a: 'BatiGesti propose des outils d\'import pour vos clients, catalogue et donn\u00e9es existantes. Vous pouvez importer vos donn\u00e9es en CSV ou JSON. Notre support peut vous accompagner dans la migration.',
  },
  {
    category: 'tech',
    q: 'Quelles int\u00e9grations sont disponibles ?',
    a: 'BatiGesti s\'int\u00e8gre avec Stripe et GoCardless pour les paiements en ligne, SendGrid pour les emails transactionnels, Twilio pour les SMS, et OpenWeatherMap pour la m\u00e9t\u00e9o chantier. D\'autres int\u00e9grations sont en cours de d\u00e9veloppement.',
  },
  {
    category: 'pricing',
    q: 'Comment fonctionne la facturation ?',
    a: 'La facturation est mensuelle ou annuelle (avec 17% de r\u00e9duction). Vous pouvez payer par carte bancaire via Stripe. Aucun engagement : vous pouvez annuler \u00e0 tout moment depuis votre espace de gestion. La facturation s\'arr\u00eate imm\u00e9diatement et vous conservez l\'acc\u00e8s jusqu\'\u00e0 la fin de la p\u00e9riode pay\u00e9e.',
  },
  {
    category: 'general',
    q: 'Y a-t-il un support client ?',
    a: 'Oui. Notre \u00e9quipe r\u00e9pond par email \u00e0 contact@batigesti.fr. Les utilisateurs des plans Artisan et \u00c9quipe b\u00e9n\u00e9ficient d\'un support prioritaire avec un temps de r\u00e9ponse garanti sous 24h ouvr\u00e9es.',
  },
  {
    category: 'pricing',
    q: 'Puis-je annuler mon abonnement \u00e0 tout moment ?',
    a: 'Oui, sans engagement. Vous pouvez annuler votre abonnement en un clic depuis votre espace de gestion. Vous conservez l\'acc\u00e8s \u00e0 toutes les fonctionnalit\u00e9s jusqu\'\u00e0 la fin de votre p\u00e9riode de facturation en cours. Vos donn\u00e9es restent accessibles et exportables.',
  },
];

export default function FAQSection() {
  const [openIndex, setOpenIndex] = useState(null);
  const [activeCategory, setActiveCategory] = useState('all');

  const filtered = activeCategory === 'all'
    ? FAQ_ITEMS
    : FAQ_ITEMS.filter((item) => item.category === activeCategory);

  // Inject FAQPage JSON-LD structured data for SEO
  useEffect(() => {
    const jsonLd = {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: FAQ_ITEMS.map((item) => ({
        '@type': 'Question',
        name: item.q,
        acceptedAnswer: {
          '@type': 'Answer',
          text: item.a,
        },
      })),
    };
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.id = 'faq-jsonld';
    script.textContent = JSON.stringify(jsonLd);
    // Remove existing if re-rendered
    const existing = document.getElementById('faq-jsonld');
    if (existing) existing.remove();
    document.head.appendChild(script);
    return () => {
      const el = document.getElementById('faq-jsonld');
      if (el) el.remove();
    };
  }, []);

  return (
    <section id="faq" className="py-16 sm:py-24 bg-white">
      <div className="max-w-3xl mx-auto px-4 sm:px-6">
        {/* Header */}
        <ScrollReveal className="text-center mb-10 sm:mb-14">
          <p className="text-sm font-semibold text-orange-500 uppercase tracking-wide mb-2">
            FAQ
          </p>
          <h2 className="text-2xl sm:text-4xl font-bold text-slate-900 mb-4">
            Questions fr&eacute;quentes
          </h2>
          <p className="text-slate-500">
            Tout ce que vous devez savoir avant de commencer.
          </p>
        </ScrollReveal>

        {/* Category tabs */}
        <div className="flex flex-wrap items-center justify-center gap-2 mb-8">
          {FAQ_CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => { setActiveCategory(cat.id); setOpenIndex(null); }}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeCategory === cat.id
                  ? 'bg-orange-50 text-orange-600 border border-orange-200'
                  : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50 border border-transparent'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Accordion */}
        <div className="space-y-3">
          {filtered.map((item, i) => {
            const isOpen = openIndex === i;
            return (
              <motion.div
                key={`${activeCategory}-${i}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                className="bg-slate-50 rounded-xl border border-slate-200 overflow-hidden hover:border-slate-300 transition-colors"
              >
                <button
                  onClick={() => setOpenIndex(isOpen ? null : i)}
                  className="w-full flex items-center justify-between p-4 sm:p-5 text-left group"
                >
                  <span className="text-sm font-medium text-slate-900 pr-4 group-hover:text-orange-600 transition-colors">
                    {item.q}
                  </span>
                  <motion.div
                    animate={{ rotate: isOpen ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                    className="flex-shrink-0"
                  >
                    <ChevronDown size={18} className="text-slate-400" />
                  </motion.div>
                </button>
                <AnimatePresence>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                      className="overflow-hidden"
                    >
                      <div className="px-4 sm:px-5 pb-4 sm:pb-5">
                        <p className="text-sm text-slate-600 leading-relaxed">{item.a}</p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>

        {/* Contact CTA */}
        <ScrollReveal className="mt-10 text-center">
          <div className="flex items-center justify-center gap-2 text-slate-500 text-sm">
            <HelpCircle size={16} />
            <span>Vous avez d'autres questions ?</span>
            <a
              href="mailto:contact@batigesti.fr"
              className="text-orange-500 font-medium hover:text-orange-600 transition-colors"
            >
              Contactez-nous
            </a>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
