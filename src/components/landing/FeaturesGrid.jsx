import React from 'react';
import { FileText, Building2, Mic, TrendingUp, Users, Shield } from 'lucide-react';

const FEATURES = [
  {
    icon: FileText,
    title: 'Devis & Factures',
    description: 'Créez un devis en 2 minutes, transformez-le en facture en 1 clic. Conforme Factur-X.',
    color: 'from-orange-500 to-orange-600',
  },
  {
    icon: Building2,
    title: 'Gestion de chantiers',
    description: 'Suivez l\'avancement, la marge et les dépenses en temps réel. Photos horodatées.',
    color: 'from-blue-500 to-blue-600',
  },
  {
    icon: Mic,
    title: 'Devis IA',
    description: 'Dictez vos travaux, l\'IA génère le devis chiffré avec matériaux et main d\'œuvre.',
    color: 'from-violet-500 to-purple-600',
  },
  {
    icon: TrendingUp,
    title: 'Trésorerie',
    description: 'Anticipez vos flux, projections à J+30/60/90 et ne manquez plus un impayé.',
    color: 'from-green-500 to-emerald-600',
  },
  {
    icon: Users,
    title: 'Gestion d\'équipe',
    description: 'Pointage, planning, congés — gérez votre équipe et sous-traitants simplement.',
    color: 'from-cyan-500 to-blue-600',
  },
  {
    icon: Shield,
    title: 'Conformité 2026',
    description: 'Factur-X, archivage 10 ans, piste d\'audit, SHA-256 — soyez conforme sans effort.',
    color: 'from-red-500 to-rose-600',
  },
];

export default function FeaturesGrid() {
  return (
    <section id="features" className="py-16 sm:py-24 bg-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        {/* Header */}
        <div className="text-center mb-12 sm:mb-16">
          <p className="text-sm font-semibold text-orange-500 uppercase tracking-wide mb-2">
            Fonctionnalités
          </p>
          <h2 className="text-2xl sm:text-4xl font-bold text-slate-900 mb-4">
            Tout ce dont un artisan a besoin
          </h2>
          <p className="text-slate-500 max-w-xl mx-auto">
            De la création du devis au suivi de paiement, BatiGesti gère tout votre cycle commercial.
          </p>
        </div>

        {/* Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
          {FEATURES.map((f) => {
            const Icon = f.icon;
            return (
              <div
                key={f.title}
                className="group p-6 rounded-2xl border border-slate-200 hover:border-orange-200 hover:shadow-lg hover:shadow-orange-500/5 transition-all"
              >
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${f.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                  <Icon size={22} className="text-white" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">{f.title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">{f.description}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
