/**
 * LandingPage — Page d'accueil publique marketing de BatiGesti.
 *
 * Affichée quand l'utilisateur n'est pas connecté à la place du formulaire login.
 * Design light-mode only (pas de isDark/couleur props).
 *
 * Section order:
 * 1. LandingNav (fixed)
 * 2. HeroSection (parallax, floating shapes, app mockup)
 * 3. StatsBar (animated counters)
 * 4. FeatureShowcase (8 zig-zag feature blocks)
 * 5. QuickFeaturesGrid (secondary features)
 * 6. CtaBanner (mid-page CTA)
 * 7. PricingSection (enhanced with animations)
 * 8. PricingComparisonTable (full comparison)
 * 9. TestimonialsSection (auto-scroll carousel)
 * 10. FAQSection (animated accordion, 12 questions)
 * 11. FinalCta (last-chance CTA)
 * 12. FooterSection (4-column)
 */

import React from 'react';
import LandingNav from './LandingNav';
import HeroSection from './HeroSection';
import StatsBar from './StatsBar';
import FeatureShowcase from './FeatureShowcase';
import QuickFeaturesGrid from './QuickFeaturesGrid';
import CtaBanner from './CtaBanner';
import PricingSection from './PricingSection';
import PricingComparisonTable from './PricingComparisonTable';
import TestimonialsSection from './TestimonialsSection';
import FAQSection from './FAQSection';
import FinalCta from './FinalCta';
import FooterSection from './FooterSection';

export default function LandingPage({ onLogin, onSignup, onNavigate }) {
  return (
    <div className="min-h-screen bg-white" style={{ scrollBehavior: 'smooth' }}>
      <LandingNav onLogin={onLogin} onSignup={onSignup} />
      <main>
        <HeroSection onSignup={onSignup} />
        <StatsBar />
        <FeatureShowcase />
        <QuickFeaturesGrid />
        <CtaBanner onSignup={onSignup} />
        <PricingSection onSignup={onSignup} />
        <PricingComparisonTable />
        <TestimonialsSection />
        <FAQSection />
        <FinalCta onSignup={onSignup} />
      </main>
      <FooterSection onNavigate={onNavigate} />
    </div>
  );
}
