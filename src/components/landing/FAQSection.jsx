import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';

const FAQ_ITEMS = [
  {
    q: 'Est-ce que BatiGesti est conforme à la facturation électronique 2026 ?',
    a: 'Oui. BatiGesti génère des factures au format Factur-X (norme EN 16931), avec archivage sécurisé SHA-256 sur 10 ans, piste d\'audit, et toutes les mentions légales obligatoires. Vous êtes conforme sans effort supplémentaire.',
  },
  {
    q: 'Puis-je utiliser BatiGesti sur mon téléphone ?',
    a: 'Absolument. BatiGesti est une application web progressive (PWA) qui s\'installe directement sur votre téléphone. Pas besoin de télécharger une app. Elle fonctionne sur iPhone, Android, tablette et ordinateur.',
  },
  {
    q: 'Comment fonctionne le Devis IA ?',
    a: 'Vous dictez votre devis par la voix ou le tapez en texte libre. L\'IA analyse votre description, identifie les matériaux, quantités et prix, puis génère les lignes du devis automatiquement. Vous pouvez ensuite affiner avec le chat IA.',
  },
  {
    q: 'Mes données sont-elles sécurisées ?',
    a: 'Vos données sont hébergées en Europe sur l\'infrastructure Supabase (PostgreSQL), avec chiffrement au repos et en transit. L\'authentification est gérée par JWT. Chaque utilisateur ne voit que les données de son organisation grâce au Row Level Security.',
  },
  {
    q: 'Puis-je exporter mes données ?',
    a: 'Oui. Vous pouvez exporter vos devis et factures en PDF, vos données comptables aux formats compatibles Pennylane et Indy, et l\'ensemble de vos données en JSON depuis les paramètres.',
  },
  {
    q: 'Puis-je essayer avant de payer ?',
    a: 'Le plan Gratuit est disponible sans limite de temps avec 5 devis/mois, 10 clients et 2 chantiers actifs. Pour les plans payants, vous bénéficiez de 14 jours d\'essai gratuit sans engagement.',
  },
];

export default function FAQSection() {
  const [openIndex, setOpenIndex] = useState(null);

  return (
    <section id="faq" className="py-16 sm:py-24 bg-slate-50">
      <div className="max-w-3xl mx-auto px-4 sm:px-6">
        {/* Header */}
        <div className="text-center mb-10 sm:mb-14">
          <p className="text-sm font-semibold text-orange-500 uppercase tracking-wide mb-2">
            FAQ
          </p>
          <h2 className="text-2xl sm:text-4xl font-bold text-slate-900 mb-4">
            Questions fréquentes
          </h2>
        </div>

        {/* Accordion */}
        <div className="space-y-3">
          {FAQ_ITEMS.map((item, i) => (
            <div
              key={i}
              className="bg-white rounded-xl border border-slate-200 overflow-hidden"
            >
              <button
                onClick={() => setOpenIndex(openIndex === i ? null : i)}
                className="w-full flex items-center justify-between p-4 sm:p-5 text-left"
              >
                <span className="text-sm font-medium text-slate-900 pr-4">{item.q}</span>
                <ChevronDown
                  size={18}
                  className={`text-slate-400 flex-shrink-0 transition-transform ${
                    openIndex === i ? 'rotate-180' : ''
                  }`}
                />
              </button>
              {openIndex === i && (
                <div className="px-4 sm:px-5 pb-4 sm:pb-5">
                  <p className="text-sm text-slate-600 leading-relaxed">{item.a}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
