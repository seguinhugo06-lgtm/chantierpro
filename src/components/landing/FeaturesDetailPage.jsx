/**
 * FeaturesDetailPage — Dedicated /fonctionnalites page.
 *
 * Comprehensive feature catalog organized by category with
 * screenshots, descriptions, and benefits.
 */

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  FileText,
  Mic,
  Building2,
  Calendar,
  Users,
  TrendingUp,
  Bell,
  UserCog,
  Smartphone,
  Shield,
  Globe,
  BookOpen,
  ArrowRight,
} from 'lucide-react';
import MarketingLayout from './MarketingLayout';
import BrowserFrame from './BrowserFrame';
import { ScrollReveal, StaggerReveal, fadeInUp } from './animations';

const CATEGORIES = [
  { id: 'all', label: 'Tout', icon: null },
  { id: 'devis', label: 'Devis & Factures', icon: FileText },
  { id: 'chantiers', label: 'Chantiers', icon: Building2 },
  { id: 'gestion', label: 'Gestion', icon: Users },
  { id: 'finance', label: 'Finances', icon: TrendingUp },
  { id: 'tech', label: 'Technique', icon: Shield },
];

const FEATURES = [
  {
    category: 'devis',
    icon: FileText,
    color: '#f97316',
    bg: 'bg-orange-50',
    title: 'Cr\u00e9ation de devis & factures',
    description: 'Cr\u00e9ez des devis et factures professionnels en quelques clics. Ajoutez des lignes depuis votre catalogue, appliquez des remises, calculez automatiquement la TVA et g\u00e9n\u00e9rez un PDF conforme.',
    benefits: ['G\u00e9n\u00e9ration PDF conforme', 'Calcul automatique TVA', 'Templates personnalisables', 'Num\u00e9rotation automatique'],
    screenshot: '/screenshots/devis-editor.png',
  },
  {
    category: 'devis',
    icon: Mic,
    color: '#8b5cf6',
    bg: 'bg-violet-50',
    title: 'Devis IA par reconnaissance vocale',
    description: 'Dictez vos travaux directement sur le chantier. L\'intelligence artificielle analyse, structure et chiffre automatiquement votre devis avec mat\u00e9riaux et main d\'\u0153uvre.',
    benefits: ['Reconnaissance vocale', 'Chiffrage automatique IA', 'Int\u00e9gration catalogue', 'Chat IA pour ajustements'],
    screenshot: '/screenshots/devis-ia.png',
  },
  {
    category: 'devis',
    icon: Globe,
    color: '#22c55e',
    bg: 'bg-green-50',
    title: 'Signature \u00e9lectronique',
    description: 'Envoyez vos devis pour signature \u00e9lectronique. Vos clients signent en ligne depuis un lien s\u00e9curis\u00e9, sans cr\u00e9er de compte.',
    benefits: ['Valeur l\u00e9gale', 'Lien s\u00e9curis\u00e9 unique', 'Notification de signature', 'Archivage automatique'],
    screenshot: '/screenshots/devis-editor.png',
  },
  {
    category: 'chantiers',
    icon: Building2,
    color: '#3b82f6',
    bg: 'bg-blue-50',
    title: 'Suivi de chantier complet',
    description: 'Suivez chaque chantier de A \u00e0 Z : avancement, rentabilit\u00e9, d\u00e9penses, t\u00e2ches. Centralisez toutes les informations dans un tableau de bord par chantier.',
    benefits: ['Marge en temps r\u00e9el', 'Journal d\'activit\u00e9', 'Check-lists et t\u00e2ches', 'Statuts personnalis\u00e9s'],
    screenshot: '/screenshots/chantier-detail.png',
  },
  {
    category: 'chantiers',
    icon: Calendar,
    color: '#06b6d4',
    bg: 'bg-cyan-50',
    title: 'Planning interactif',
    description: 'Planifiez vos chantiers et rendez-vous dans un calendrier interactif avec drag-and-drop, vue par \u00e9quipe et code couleur.',
    benefits: ['Vue jour/semaine/mois', 'Drag-and-drop', 'Vue par \u00e9quipe', 'Rappels automatiques'],
    screenshot: '/screenshots/planning.png',
  },
  {
    category: 'gestion',
    icon: Users,
    color: '#22c55e',
    bg: 'bg-green-50',
    title: 'Gestion clients & CRM',
    description: 'Centralisez tous vos contacts, suivez l\'historique des projets par client, d\u00e9tectez les doublons et g\u00e9rez vos prospects.',
    benefits: ['Fiche client compl\u00e8te', 'D\u00e9tection doublons', 'Historique projets', 'Recherche rapide'],
    screenshot: '/screenshots/clients.png',
  },
  {
    category: 'gestion',
    icon: UserCog,
    color: '#6366f1',
    bg: 'bg-indigo-50',
    title: '\u00c9quipe & sous-traitants',
    description: 'G\u00e9rez votre \u00e9quipe et vos sous-traitants : r\u00f4les, permissions, pointage, cong\u00e9s. Affectez les membres aux chantiers.',
    benefits: ['R\u00f4les & permissions', 'Pointage des heures', 'Gestion des cong\u00e9s', 'Affectation chantiers'],
    screenshot: '/screenshots/equipe.png',
  },
  {
    category: 'gestion',
    icon: BookOpen,
    color: '#f59e0b',
    bg: 'bg-amber-50',
    title: 'Catalogue de prestations',
    description: 'Cr\u00e9ez une biblioth\u00e8que de prestations r\u00e9utilisables avec prix, cat\u00e9gories et descriptions. Construisez vos devis comme un jeu de LEGO.',
    benefits: ['Prestations r\u00e9utilisables', 'Cat\u00e9gories personnalis\u00e9es', 'Import/export', 'Prix et unit\u00e9s'],
    screenshot: '/screenshots/dashboard.png',
  },
  {
    category: 'finance',
    icon: TrendingUp,
    color: '#10b981',
    bg: 'bg-emerald-50',
    title: 'Tr\u00e9sorerie & projections',
    description: 'Anticipez vos flux de tr\u00e9sorerie avec des projections \u00e0 30, 60 et 90 jours. D\u00e9tectez les impay\u00e9s et ma\u00eetrisez votre BFR.',
    benefits: ['Projections automatiques', 'Suivi des impay\u00e9s', 'Tableau de bord financier', 'Rapprochement bancaire'],
    screenshot: '/screenshots/tresorerie.png',
  },
  {
    category: 'finance',
    icon: Bell,
    color: '#f59e0b',
    bg: 'bg-amber-50',
    title: 'Relances automatiques',
    description: 'Programmez des relances automatiques par email avec des templates personnalis\u00e9s et des variables dynamiques.',
    benefits: ['Templates personnalisables', 'Planification intelligente', 'Variables dynamiques', 'Historique complet'],
    screenshot: '/screenshots/relances.png',
  },
  {
    category: 'tech',
    icon: Shield,
    color: '#ef4444',
    bg: 'bg-red-50',
    title: 'Conformit\u00e9 Facture 2026',
    description: 'Soyez conforme \u00e0 la facturation \u00e9lectronique 2026 sans effort : Factur-X, archivage 10 ans, piste d\'audit, SHA-256.',
    benefits: ['Factur-X EN 16931', 'Archivage 10 ans', 'SHA-256', 'Piste d\'audit compl\u00e8te'],
    screenshot: '/screenshots/dashboard.png',
  },
  {
    category: 'tech',
    icon: Smartphone,
    color: '#f97316',
    bg: 'bg-orange-50',
    title: 'Mobile & tablette',
    description: 'Installez BatiGesti sur votre t\u00e9l\u00e9phone comme une application native. Fonctionne m\u00eame hors-ligne pour consulter vos donn\u00e9es sur le chantier.',
    benefits: ['Installation en 1 clic', 'Fonctionne hors-ligne', 'Multi-appareils', 'Notifications push'],
    screenshot: '/screenshots/mobile.png',
  },
];

function FeatureCard({ feature }) {
  const Icon = feature.icon;
  return (
    <motion.div
      variants={fadeInUp}
      className="group bg-white rounded-2xl border border-slate-200 overflow-hidden hover:border-orange-200 hover:shadow-xl hover:shadow-orange-500/5 transition-all"
    >
      {/* Screenshot */}
      <div className="p-3 pb-0">
        <BrowserFrame
          src={feature.screenshot}
          alt={feature.title}
          className="!shadow-none !border-slate-100"
        />
      </div>

      {/* Content */}
      <div className="p-5 sm:p-6">
        <div className="flex items-center gap-3 mb-3">
          <div className={`w-9 h-9 rounded-lg ${feature.bg} flex items-center justify-center`}>
            <Icon size={18} style={{ color: feature.color }} />
          </div>
          <h3 className="text-base font-bold text-slate-900">{feature.title}</h3>
        </div>

        <p className="text-sm text-slate-500 leading-relaxed mb-4">{feature.description}</p>

        <ul className="space-y-1.5">
          {feature.benefits.map((b, i) => (
            <li key={i} className="flex items-center gap-2 text-xs text-slate-600">
              <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: feature.color }} />
              {b}
            </li>
          ))}
        </ul>
      </div>
    </motion.div>
  );
}

export default function FeaturesDetailPage() {
  const [activeCategory, setActiveCategory] = useState('all');

  const filtered = activeCategory === 'all'
    ? FEATURES
    : FEATURES.filter((f) => f.category === activeCategory);

  return (
    <MarketingLayout>
      {/* Hero */}
      <section className="py-16 sm:py-24 bg-gradient-to-b from-orange-50/50 to-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 text-center">
          <ScrollReveal>
            <p className="text-sm font-semibold text-orange-500 uppercase tracking-wide mb-3">
              Fonctionnalit&eacute;s
            </p>
            <h1 className="text-3xl sm:text-5xl font-bold text-slate-900 mb-4 leading-tight">
              Tout ce dont vous avez besoin,<br className="hidden sm:block" />
              au m&ecirc;me endroit
            </h1>
            <p className="text-lg text-slate-500 max-w-2xl mx-auto">
              D&eacute;couvrez en d&eacute;tail chaque fonctionnalit&eacute; de BatiGesti.
              De la cr&eacute;ation de devis au suivi financier, tout est int&eacute;gr&eacute;.
            </p>
          </ScrollReveal>
        </div>
      </section>

      {/* Category filter */}
      <section className="sticky top-[60px] z-30 bg-white/90 backdrop-blur-xl border-b border-slate-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3">
          <div className="flex items-center gap-2 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                  activeCategory === cat.id
                    ? 'bg-orange-50 text-orange-600 border border-orange-200'
                    : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50 border border-transparent'
                }`}
              >
                {cat.icon && <cat.icon size={14} />}
                {cat.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Features grid */}
      <section className="py-12 sm:py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <StaggerReveal
            className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6"
            key={activeCategory}
            staggerDelay={0.06}
          >
            {filtered.map((feature) => (
              <FeatureCard key={feature.title} feature={feature} />
            ))}
          </StaggerReveal>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="py-16 sm:py-24 bg-slate-50">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
          <ScrollReveal>
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-4">
              Pr&ecirc;t &agrave; essayer ?
            </h2>
            <p className="text-slate-500 mb-8">
              Cr&eacute;ez votre compte gratuitement et d&eacute;couvrez toutes ces fonctionnalit&eacute;s par vous-m&ecirc;me.
            </p>
            <a
              href="/app"
              className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl bg-orange-500 text-white font-semibold hover:bg-orange-600 transition-colors shadow-lg shadow-orange-500/25"
            >
              Essayer gratuitement
              <ArrowRight size={18} />
            </a>
          </ScrollReveal>
        </div>
      </section>
    </MarketingLayout>
  );
}
