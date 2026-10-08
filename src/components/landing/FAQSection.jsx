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
import { PLANS } from '../../stores/subscriptionStore';

// Les prix se lisent depuis PLANS, jamais en dur : cette réponse annonçait
// encore 4,99 € / 9,99 € (tarifs de l'ancien pivot) alors que le produit est
// vendu 9,90 € / 19,90 €. Un prix faux sur la page publique, c'est une promesse
// que le checkout dément trente secondes plus tard.
const euros = (n) => `${n.toFixed(2).replace('.', ',')} €`;

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
    q: 'C\'est quoi Mallettico ?',
    a: 'Mallettico est un logiciel en ligne (SaaS) de gestion de chantier con\u00e7u sp\u00e9cifiquement pour les artisans et entreprises du BTP. Il regroupe devis, factures, suivi de chantier, planning, CRM, tr\u00e9sorerie et gestion d\'\u00e9quipe dans une seule application accessible depuis n\'importe quel appareil.',
  },
  {
    category: 'general',
    q: 'Puis-je utiliser Mallettico sur mon t\u00e9l\u00e9phone ?',
    a: 'Absolument. Mallettico est une application web progressive (PWA) qui s\'installe directement sur votre t\u00e9l\u00e9phone comme une application native. Pas besoin de t\u00e9l\u00e9charger une app sur l\'App Store ou Play Store. Elle fonctionne sur iPhone, Android, tablette et ordinateur, m\u00eame hors-ligne.',
  },
  {
    category: 'features',
    q: 'Est-ce que je pars d\'une page blanche pour mes devis ?',
    a: 'Non. Mallettico est livr\u00e9 avec un catalogue BTP de plus de 1 000 articles et ouvrages d\u00e9j\u00e0 chiffr\u00e9s, organis\u00e9s par m\u00e9tier. \u00c0 l\'inscription, vous choisissez votre corps de m\u00e9tier et vos articles sont pr\u00e9-remplis. Vous composez alors un devis en quelques clics, et vous ajoutez vos propres articles ou importez vos tarifs fournisseurs par CSV.',
  },
  {
    category: 'features',
    q: 'Comment fonctionnent les relances automatiques ?',
    a: 'Vous configurez des templates de relance personnalis\u00e9s avec des variables dynamiques (nom du client, montant, num\u00e9ro de devis...). Mallettico envoie automatiquement les relances par email selon le calendrier que vous d\u00e9finissez. Vous gardez un historique complet de chaque relance.',
  },
  {
    category: 'features',
    q: 'Le portail client, c\'est quoi exactement ?',
    a: 'Le portail client est un espace en ligne s\u00e9curis\u00e9 o\u00f9 vos clients peuvent consulter leurs devis et factures, et signer leurs devis \u00e9lectroniquement. Chaque client re\u00e7oit un lien unique. Pas besoin de cr\u00e9er un compte pour eux.',
  },
  {
    category: 'tech',
    q: 'Mallettico est-il pr\u00eat pour la facturation \u00e9lectronique ?',
    a: 'Pas encore enti\u00e8rement, et nous pr\u00e9f\u00e9rons le dire. Vos factures portent les mentions obligatoires aujourd\u2019hui (une fois votre profil compl\u00e9t\u00e9) et un fichier Factur-X. Depuis le 1er septembre 2026, vous devez pouvoir recevoir des factures \u00e9lectroniques : cela passe par la Plateforme Agr\u00e9\u00e9e de votre choix (liste officielle sur impots.gouv.fr). \u00c0 partir du 1er septembre 2027, les TPE devront aussi les \u00e9mettre par une Plateforme Agr\u00e9\u00e9e : le raccordement de Mallettico est en pr\u00e9paration, et nous vous pr\u00e9viendrons bien avant l\u2019\u00e9ch\u00e9ance.',
  },
  {
    category: 'tech',
    q: 'Mes donn\u00e9es sont-elles s\u00e9curis\u00e9es ?',
    // Chiffrement : engagement de Supabase, « All customer data is encrypted at rest with AES-256 and in transit via TLS »
    // (supabase.com/security, relu le 8 oct. 2026). Suppression du compte : refusée tant qu'un abonnement payant
    // ou une équipe est actif (migration 072, src/services/suppressionCompte.js).
    a: 'Votre base de donn\u00e9es est h\u00e9berg\u00e9e \u00e0 Paris (Supabase, r\u00e9gion AWS eu-west-3), chiffr\u00e9e par Supabase au repos (AES-256) et en transit (TLS). Depuis les param\u00e8tres, vous pouvez exporter vos clients, devis, factures, chantiers et d\u00e9penses (fichier JSON), puis supprimer votre compte, une fois l\u2019abonnement payant r\u00e9sili\u00e9 et les membres de l\u2019\u00e9quipe retir\u00e9s. Exportez vos factures avant : vous devez les conserver 10 ans.',
  },
  {
    category: 'tech',
    q: 'Puis-je exporter mes donn\u00e9es ?',
    a: 'Oui. Vous pouvez exporter vos devis et factures en PDF, vos donn\u00e9es comptables aux formats compatibles Pennylane et Indy, et vos clients, devis, factures, chantiers et d\u00e9penses en JSON depuis les param\u00e8tres. Vos donn\u00e9es vous appartiennent.',
  },
  {
    category: 'pricing',
    q: 'Puis-je essayer avant de payer ?',
    a: `Oui, et sans limite de temps : le plan Gratuit inclut 5 devis/mois, 10 clients et 2 chantiers actifs, sans carte bancaire. Quand vous \u00eates pr\u00eat, passez \u00e0 Artisan (${euros(PLANS.artisan.priceMonthly)} HT/mois) ou \u00c9quipe (${euros(PLANS.equipe.priceMonthly)} HT/mois) \u2014 tarif fondateur, conserv\u00e9 tant que vous restez abonn\u00e9. Sans engagement, et vous pouvez revenir au plan Gratuit \u00e0 tout moment sans perdre vos donn\u00e9es.`,
  },
  {
    category: 'pricing',
    q: 'Puis-je changer de plan en cours de route ?',
    a: 'Oui. Vous pouvez passer \u00e0 un plan sup\u00e9rieur \u00e0 tout moment, ou revenir \u00e0 un plan inf\u00e9rieur depuis votre espace de gestion.',
  },
  {
    category: 'general',
    q: 'Comment migrer depuis un autre logiciel ?',
    a: 'Mallettico propose des outils d\'import pour vos clients, catalogue et donn\u00e9es existantes. Vous pouvez importer vos donn\u00e9es en CSV ou JSON. Notre support peut vous accompagner dans la migration.',
  },
  {
    category: 'tech',
    q: 'Quelles int\u00e9grations sont disponibles ?',
    a: 'Mallettico int\u00e8gre l\'envoi d\'emails avec PDF joint (devis, factures, relances), la m\u00e9t\u00e9o chantier, et des exports compatibles avec vos outils comptables (Pennylane, Indy, FEC). D\'autres int\u00e9grations sont en cours de d\u00e9veloppement.',
  },
  {
    category: 'pricing',
    q: 'Comment fonctionne la facturation ?',
    a: `La facturation est mensuelle ou annuelle (2 mois offerts : ${euros(PLANS.artisan.priceYearly)} HT/an au lieu de ${euros(PLANS.artisan.priceMonthly * 12)} pour Artisan). Vous payez par carte bancaire via Stripe. Aucun engagement : vous pouvez r\u00e9silier \u00e0 tout moment depuis votre espace de gestion.`,
  },
  {
    category: 'general',
    q: 'Y a-t-il un support client ?',
    a: 'Oui. \u00c9crivez-nous \u00e0 contact@mallettico.fr, nous r\u00e9pondons par e-mail. Le plan \u00c9quipe b\u00e9n\u00e9ficie d\'un support prioritaire.',
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
              href="mailto:contact@mallettico.fr"
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
