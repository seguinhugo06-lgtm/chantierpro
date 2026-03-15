/**
 * LandingPage — Page d'accueil publique marketing de BatiGesti.
 *
 * Affichée quand l'utilisateur n'est pas connecté à la place du formulaire login.
 * Design light-mode only (pas de isDark/couleur props).
 */

import React from 'react';
import LandingNav from './LandingNav';
import HeroSection from './HeroSection';
import FeaturesGrid from './FeaturesGrid';
import PricingSection from './PricingSection';
import TestimonialsSection from './TestimonialsSection';
import FAQSection from './FAQSection';
import FooterSection from './FooterSection';

export default function LandingPage({ onLogin, onSignup }) {
  return (
    <div className="min-h-screen bg-white">
      <LandingNav onLogin={onLogin} onSignup={onSignup} />
      <HeroSection onSignup={onSignup} />
      <FeaturesGrid />
      <PricingSection onSignup={onSignup} />
      <TestimonialsSection />
      <FAQSection />
      <FooterSection />
    </div>
  );
}
