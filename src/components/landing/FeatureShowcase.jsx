/**
 * FeatureShowcase — 8 zig-zag feature blocks showcasing all major BatiGesti features.
 *
 * Replaces the old FeaturesGrid with detailed, screenshot-based feature presentation.
 * Each block alternates image/text layout for visual rhythm.
 */

import React from 'react';
import {
  FileText,
  Mic,
  Building2,
  Calendar,
  Users,
  TrendingUp,
  Bell,
  UserCog,
} from 'lucide-react';
import { ScrollReveal } from './animations';
import FeatureBlock from './FeatureBlock';

const FEATURES = [
  {
    icon: FileText,
    iconColor: '#f97316',
    iconBg: 'bg-orange-50',
    badge: 'Coeur de m\u00e9tier',
    title: 'Devis & Factures professionnels',
    description:
      'Cr\u00e9ez des devis percutants en quelques clics, transformez-les en factures conformes, envoyez-les par email et faites-les signer \u00e9lectroniquement \u2014 tout depuis une seule interface.',
    bullets: [
      'G\u00e9n\u00e9ration PDF conforme Factur-X avec mentions obligatoires',
      'Signature \u00e9lectronique int\u00e9gr\u00e9e (valeur l\u00e9gale)',
      'Envoi par email avec suivi de lecture',
      'Duplication, versioning et historique complet',
      'Calcul automatique TVA, remises et acomptes',
    ],
    screenshotSrc: '/screenshots/devis-editor.png',
  },
  {
    icon: Mic,
    iconColor: '#8b5cf6',
    iconBg: 'bg-violet-50',
    badge: 'Intelligence artificielle',
    title: 'Devis IA : dictez, c\'est chiffr\u00e9',
    description:
      'Dictez vos travaux par reconnaissance vocale ou d\u00e9crivez-les en texte libre. L\'IA analyse, structure et chiffre automatiquement votre devis avec mat\u00e9riaux et main d\'\u0153uvre.',
    bullets: [
      'Reconnaissance vocale directement sur le chantier',
      'Analyse IA des travaux avec chiffrage automatique',
      'Int\u00e9gration avec votre catalogue de prestations',
      'Modification et ajustement en temps r\u00e9el',
    ],
    screenshotSrc: '/screenshots/devis-ia.png',
  },
  {
    icon: Building2,
    iconColor: '#3b82f6',
    iconBg: 'bg-blue-50',
    badge: 'Suivi complet',
    title: 'Gestion de chantiers en temps r\u00e9el',
    description:
      'Suivez chaque chantier de A \u00e0 Z : avancement, rentabilit\u00e9, d\u00e9penses, photos, documents et t\u00e2ches. Tout est centralis\u00e9 dans un tableau de bord par chantier.',
    bullets: [
      'Calcul de marge et rentabilit\u00e9 en temps r\u00e9el',
      'Photos horodat\u00e9es et galerie de chantier',
      'Gestion de documents et pi\u00e8ces jointes',
      'Suivi des t\u00e2ches et check-lists',
      'Historique d\u2019activit\u00e9 et journal de bord',
    ],
    screenshotSrc: '/screenshots/chantier-detail.png',
  },
  {
    icon: Calendar,
    iconColor: '#06b6d4',
    iconBg: 'bg-cyan-50',
    badge: 'Organisation',
    title: 'Planning et emploi du temps',
    description:
      'Planifiez vos chantiers, rendez-vous et interventions dans un calendrier interactif. Drag-and-drop, vue \u00e9quipe, synchronisation avec vos t\u00e2ches.',
    bullets: [
      'Vue jour, semaine, mois avec drag-and-drop',
      'Planification par \u00e9quipe et par chantier',
      'Code couleur par statut et type d\u2019\u00e9v\u00e9nement',
      'Rappels et notifications',
    ],
    screenshotSrc: '/screenshots/planning.png',
  },
  {
    icon: Users,
    iconColor: '#22c55e',
    iconBg: 'bg-green-50',
    badge: 'CRM',
    title: 'Gestion de clients & prospects',
    description:
      'Centralisez tous vos contacts, suivez l\'historique des projets par client, d\u00e9tectez les doublons et acc\u00e9dez \u00e0 toutes les interactions en un clin d\'\u0153il.',
    bullets: [
      'Fiche client compl\u00e8te avec historique des devis et chantiers',
      'D\u00e9tection intelligente de doublons',
      'Recherche rapide et filtres avanc\u00e9s',
      'Export des contacts',
    ],
    screenshotSrc: '/screenshots/clients.png',
  },
  {
    icon: TrendingUp,
    iconColor: '#10b981',
    iconBg: 'bg-emerald-50',
    badge: 'Finances',
    title: 'Tr\u00e9sorerie et suivi financier',
    description:
      'Anticipez vos flux de tr\u00e9sorerie avec des projections \u00e0 30, 60 et 90 jours. Suivez les paiements, d\u00e9tectez les impay\u00e9s et ma\u00eetrisez votre BFR.',
    bullets: [
      'Projections de tr\u00e9sorerie automatiques',
      'Suivi des paiements et impay\u00e9s',
      'Rapprochement bancaire simplifi\u00e9',
      'Tableau de bord financier en temps r\u00e9el',
    ],
    screenshotSrc: '/screenshots/tresorerie.png',
  },
  {
    icon: Bell,
    iconColor: '#f59e0b',
    iconBg: 'bg-amber-50',
    badge: 'Automatisation',
    title: 'Relances automatiques',
    description:
      'Ne laissez plus un devis sans r\u00e9ponse. Programmez des relances automatiques par email avec des templates personnalis\u00e9s et un calendrier adapt\u00e9.',
    bullets: [
      'Templates de relance personnalisables',
      'Planification intelligente des envois',
      'Variables dynamiques (nom client, montant, date...)',
      'Historique des relances par devis',
    ],
    screenshotSrc: '/screenshots/relances.png',
  },
  {
    icon: UserCog,
    iconColor: '#6366f1',
    iconBg: 'bg-indigo-50',
    badge: '\u00c9quipe',
    title: '\u00c9quipe & sous-traitants',
    description:
      'G\u00e9rez votre \u00e9quipe et vos sous-traitants : r\u00f4les, permissions, pointage, cong\u00e9s. Chaque membre voit uniquement ce qui le concerne.',
    bullets: [
      'Gestion des r\u00f4les et permissions',
      'Pointage et suivi des heures',
      'Gestion des cong\u00e9s et absences',
      'Affectation aux chantiers',
    ],
    screenshotSrc: '/screenshots/equipe.png',
  },
];

export default function FeatureShowcase() {
  return (
    <section id="features" className="py-16 sm:py-24 bg-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        {/* Section header */}
        <ScrollReveal className="text-center mb-12 sm:mb-20">
          <p className="text-sm font-semibold text-orange-500 uppercase tracking-wide mb-2">
            Fonctionnalit&eacute;s
          </p>
          <h2 className="text-2xl sm:text-4xl font-bold text-slate-900 mb-4">
            Tout ce dont un artisan a besoin, au m&ecirc;me endroit
          </h2>
          <p className="text-slate-500 max-w-2xl mx-auto">
            De la cr&eacute;ation du devis au suivi de paiement, BatiGesti g&egrave;re l'int&eacute;gralit&eacute;
            de votre cycle commercial et la gestion de vos chantiers.
          </p>
        </ScrollReveal>

        {/* Feature blocks */}
        <div className="space-y-8 sm:space-y-16">
          {FEATURES.map((feature, index) => (
            <FeatureBlock
              key={feature.title}
              {...feature}
              reversed={index % 2 === 1}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
