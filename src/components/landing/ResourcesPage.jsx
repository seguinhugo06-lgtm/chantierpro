/**
 * ResourcesPage — Resources page at /ressources.
 *
 * Screenshot gallery of all major app screens, "How it works" steps,
 * video placeholder, and guides section.
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Monitor,
  FileText,
  Building2,
  Calendar,
  Users,
  TrendingUp,
  Mic,
  Bell,
  ArrowRight,
  Play,
  BookOpen,
  Lightbulb,
  Rocket,
  CheckCircle,
  X,
} from 'lucide-react';
import MarketingLayout from './MarketingLayout';
import BrowserFrame from './BrowserFrame';
import { ScrollReveal, StaggerReveal, fadeInUp } from './animations';

const SCREENSHOTS = [
  { id: 'dashboard', label: 'Dashboard', icon: Monitor, src: '/screenshots/dashboard.png', description: 'Vue d\'ensemble de votre activit\u00e9 avec 14+ widgets personnalisables.' },
  { id: 'devis', label: 'Devis', icon: FileText, src: '/screenshots/devis-editor.png', description: '\u00c9diteur de devis intuitif avec calcul automatique et g\u00e9n\u00e9ration PDF.' },
  { id: 'devis-ia', label: 'Devis IA', icon: Mic, src: '/screenshots/devis-ia.png', description: 'Dictez vos travaux et l\'IA g\u00e9n\u00e8re le devis chiffr\u00e9 automatiquement.' },
  { id: 'chantier', label: 'Chantier', icon: Building2, src: '/screenshots/chantier-detail.png', description: 'Suivi complet de chantier : avancement, marge, photos, documents.' },
  { id: 'planning', label: 'Planning', icon: Calendar, src: '/screenshots/planning.png', description: 'Calendrier interactif avec drag-and-drop et vue par \u00e9quipe.' },
  { id: 'clients', label: 'Clients', icon: Users, src: '/screenshots/clients.png', description: 'CRM int\u00e9gr\u00e9 avec historique des projets et d\u00e9tection de doublons.' },
  { id: 'tresorerie', label: 'Tr\u00e9sorerie', icon: TrendingUp, src: '/screenshots/tresorerie.png', description: 'Projections de tr\u00e9sorerie \u00e0 30/60/90 jours et suivi des impay\u00e9s.' },
  { id: 'relances', label: 'Relances', icon: Bell, src: '/screenshots/relances.png', description: 'Relances automatiques par email avec templates personnalis\u00e9s.' },
];

const HOW_IT_WORKS = [
  {
    step: 1,
    icon: Rocket,
    title: 'Cr\u00e9ez votre compte',
    description: 'Inscription gratuite en 30 secondes. Pas de carte bancaire requise. Commencez \u00e0 utiliser BatiGesti imm\u00e9diatement.',
  },
  {
    step: 2,
    icon: Lightbulb,
    title: 'Configurez votre espace',
    description: 'Ajoutez vos informations d\'entreprise, importez votre catalogue de prestations et personnalisez vos mod\u00e8les de devis.',
  },
  {
    step: 3,
    icon: FileText,
    title: 'Cr\u00e9ez votre premier devis',
    description: 'En 2 minutes, cr\u00e9ez un devis professionnel. Utilisez la dict\u00e9e vocale IA ou votre catalogue pour aller encore plus vite.',
  },
  {
    step: 4,
    icon: CheckCircle,
    title: 'G\u00e9rez et d\u00e9veloppez',
    description: 'Suivez vos chantiers, g\u00e9rez vos clients, anticipez votre tr\u00e9sorerie. BatiGesti vous accompagne au quotidien.',
  },
];

function ScreenshotViewer({ selected, onSelect }) {
  const active = SCREENSHOTS.find((s) => s.id === selected) || SCREENSHOTS[0];

  return (
    <div className="space-y-6">
      {/* Main screenshot */}
      <AnimatePresence mode="wait">
        <motion.div
          key={active.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.3 }}
        >
          <BrowserFrame
            src={active.src}
            alt={active.label}
            url={`app.batigesti.fr/${active.id}`}
          />
          <p className="text-sm text-slate-500 text-center mt-4">{active.description}</p>
        </motion.div>
      </AnimatePresence>

      {/* Thumbnail tabs */}
      <div className="flex flex-wrap items-center justify-center gap-2">
        {SCREENSHOTS.map((s) => {
          const Icon = s.icon;
          const isActive = s.id === selected;
          return (
            <button
              key={s.id}
              onClick={() => onSelect(s.id)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                isActive
                  ? 'bg-orange-50 text-orange-600 border border-orange-200 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50 border border-transparent'
              }`}
            >
              <Icon size={14} />
              {s.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function ResourcesPage() {
  const [selectedScreen, setSelectedScreen] = useState('dashboard');

  return (
    <MarketingLayout>
      {/* Hero */}
      <section className="py-16 sm:py-24 bg-gradient-to-b from-slate-50 to-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 text-center">
          <ScrollReveal>
            <p className="text-sm font-semibold text-orange-500 uppercase tracking-wide mb-3">
              Ressources
            </p>
            <h1 className="text-3xl sm:text-5xl font-bold text-slate-900 mb-4 leading-tight">
              D&eacute;couvrez BatiGesti en images
            </h1>
            <p className="text-lg text-slate-500 max-w-2xl mx-auto">
              Explorez l'interface, comprenez le fonctionnement et voyez comment
              BatiGesti peut transformer votre quotidien d'artisan.
            </p>
          </ScrollReveal>
        </div>
      </section>

      {/* Screenshot Gallery */}
      <section className="py-12 sm:py-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <ScrollReveal className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-3">
              Galerie de captures d'&eacute;cran
            </h2>
            <p className="text-slate-500">
              Cliquez sur les onglets pour explorer chaque vue de l'application.
            </p>
          </ScrollReveal>

          <ScrollReveal>
            <ScreenshotViewer selected={selectedScreen} onSelect={setSelectedScreen} />
          </ScrollReveal>
        </div>
      </section>

      {/* How it works */}
      <section className="py-16 sm:py-24 bg-slate-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <ScrollReveal className="text-center mb-12 sm:mb-16">
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-3">
              Comment &ccedil;a marche ?
            </h2>
            <p className="text-slate-500">
              De l'inscription &agrave; la gestion quotidienne, en 4 &eacute;tapes simples.
            </p>
          </ScrollReveal>

          <StaggerReveal className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6" staggerDelay={0.1}>
            {HOW_IT_WORKS.map((step) => {
              const Icon = step.icon;
              return (
                <motion.div
                  key={step.step}
                  variants={fadeInUp}
                  className="relative bg-white rounded-2xl border border-slate-200 p-6 text-center hover:border-orange-200 hover:shadow-lg transition-all"
                >
                  {/* Step number */}
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-7 h-7 rounded-full bg-orange-500 text-white text-xs font-bold flex items-center justify-center">
                    {step.step}
                  </div>

                  <div className="w-12 h-12 rounded-xl bg-orange-50 flex items-center justify-center mx-auto mb-4 mt-2">
                    <Icon size={22} className="text-orange-500" />
                  </div>

                  <h3 className="text-base font-bold text-slate-900 mb-2">{step.title}</h3>
                  <p className="text-sm text-slate-500 leading-relaxed">{step.description}</p>
                </motion.div>
              );
            })}
          </StaggerReveal>
        </div>
      </section>

      {/* Video placeholder */}
      <section className="py-16 sm:py-24 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <ScrollReveal className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-3">
              Vid&eacute;o de d&eacute;monstration
            </h2>
            <p className="text-slate-500">
              Visionnez une pr&eacute;sentation compl&egrave;te de BatiGesti en 3 minutes.
            </p>
          </ScrollReveal>

          <ScrollReveal>
            <div className="relative aspect-video rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center overflow-hidden border border-slate-200">
              {/* Play button overlay */}
              <div className="text-center">
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-orange-500 flex items-center justify-center mx-auto mb-4 cursor-pointer hover:bg-orange-600 transition-colors shadow-lg shadow-orange-500/30">
                  <Play size={28} className="text-white ml-1" />
                </div>
                <p className="text-white/60 text-sm">Vid&eacute;o bient&ocirc;t disponible</p>
              </div>
              {/* Decorative elements */}
              <div className="absolute top-4 right-4 w-20 h-20 bg-orange-500/10 rounded-full blur-xl" />
              <div className="absolute bottom-4 left-4 w-16 h-16 bg-blue-500/10 rounded-full blur-xl" />
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* Guides section */}
      <section className="py-16 sm:py-24 bg-slate-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <ScrollReveal className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-3">
              Guides & tutoriels
            </h2>
            <p className="text-slate-500">
              Apprenez &agrave; tirer le meilleur de BatiGesti.
            </p>
          </ScrollReveal>

          <StaggerReveal className="grid sm:grid-cols-3 gap-6" staggerDelay={0.08}>
            {[
              {
                icon: FileText,
                title: 'Cr\u00e9er son premier devis',
                description: 'Guide pas \u00e0 pas pour cr\u00e9er, personnaliser et envoyer votre premier devis professionnel.',
                tag: 'D\u00e9butant',
              },
              {
                icon: Mic,
                title: 'Utiliser le Devis IA',
                description: 'Apprenez \u00e0 utiliser la dict\u00e9e vocale pour g\u00e9n\u00e9rer des devis en quelques secondes.',
                tag: 'Avanc\u00e9',
              },
              {
                icon: TrendingUp,
                title: 'Ma\u00eetriser sa tr\u00e9sorerie',
                description: 'Comment utiliser les projections et le suivi d\'impay\u00e9s pour anticiper vos flux.',
                tag: 'Finances',
              },
            ].map((guide) => {
              const Icon = guide.icon;
              return (
                <motion.div
                  key={guide.title}
                  variants={fadeInUp}
                  className="bg-white rounded-2xl border border-slate-200 p-6 hover:border-orange-200 hover:shadow-lg transition-all group cursor-pointer"
                >
                  <div className="flex items-center gap-2 mb-4">
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-orange-50 text-orange-600">
                      {guide.tag}
                    </span>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-slate-100 group-hover:bg-orange-50 flex items-center justify-center mb-4 transition-colors">
                    <Icon size={20} className="text-slate-500 group-hover:text-orange-500 transition-colors" />
                  </div>
                  <h3 className="text-base font-bold text-slate-900 mb-2">{guide.title}</h3>
                  <p className="text-sm text-slate-500 leading-relaxed mb-4">{guide.description}</p>
                  <span className="text-sm text-orange-500 font-medium group-hover:text-orange-600 transition-colors flex items-center gap-1">
                    Bient&ocirc;t disponible
                  </span>
                </motion.div>
              );
            })}
          </StaggerReveal>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="py-16 sm:py-24 bg-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
          <ScrollReveal>
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-4">
              Convaincu ? Lancez-vous !
            </h2>
            <p className="text-slate-500 mb-8">
              Cr&eacute;ez votre compte gratuitement et testez par vous-m&ecirc;me.
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
