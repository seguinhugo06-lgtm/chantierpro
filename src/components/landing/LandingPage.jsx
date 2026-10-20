/**
 * LandingPage — la page d'accueil publique de Mallettico (visiteur non connecté, hors démo).
 *
 * Toujours en clair (couleurs fixes de la palette `marque`, pas de thème). Refonte d'octobre 2026
 * (spec docs/superpowers/specs/2026-10-19-site-refonte-design.md) ; ordre de la spec : barre, premier
 * écran avec le devis vivant, bande de faits, explorateur des métiers, fonctionnalités en action (`#fonctionnalites`),
 * cycle au défilement, fiabilité, tarifs (le tableau de comparaison est replié dans la section), construit en public,
 * FAQ, dernier appel, pied de page.
 *
 * `MotionConfig reducedMotion="user"` : les animations framer-motion s'effacent si l'appareil demande moins de
 * mouvement. Ancres conservées : `#pricing`, `#faq` (src/lib/sectionsAccueil.js).
 */

import { useEffect } from 'react';
import { MotionConfig } from 'framer-motion';
import LandingNav from './LandingNav';
import HeroSection from './HeroSection';
import FaitsSection from './FaitsSection';
import MetiersSection from './MetiersSection';
import FonctionnalitesSection from './FonctionnalitesSection';
import CycleSection from './CycleSection';
import FiabiliteSection from './FiabiliteSection';
import PricingSection from './PricingSection';
import EarlyAdoptersSection from './EarlyAdoptersSection';
import FAQSection from './FAQSection';
import FinalCta from './FinalCta';
import FooterSection from './FooterSection';
import { sectionDemandee } from '../../lib/sectionsAccueil';

export default function LandingPage({ onLogin, onSignup, onNavigate }) {
  // Arrivée sur /tarifs, /faq ou /#section : descendre à la section dès qu'elle existe, puis
  // une seconde fois quand les images au-dessus ont pris leur place.
  useEffect(() => {
    const cible = sectionDemandee(window.location.pathname, window.location.hash);
    if (!cible) return undefined;
    const minuteries = [];
    let essais = 0;
    const viser = () => {
      const element = document.querySelector(cible);
      if (element) {
        element.scrollIntoView();
        minuteries.push(setTimeout(() => element.scrollIntoView(), 600));
      } else if (++essais < 30) {
        minuteries.push(setTimeout(viser, 100));
      }
    };
    viser();
    return () => minuteries.forEach(clearTimeout);
  }, []);

  return (
    <div className="min-h-screen bg-white overflow-x-clip" style={{ scrollBehavior: 'smooth' }}>
      <LandingNav onLogin={onLogin} onSignup={onSignup} />
      <MotionConfig reducedMotion="user">
        <main>
          <HeroSection onSignup={onSignup} />
          <FaitsSection />
          <MetiersSection />
          <FonctionnalitesSection />
          <CycleSection />
          <FiabiliteSection />
          <PricingSection onSignup={onSignup} />
          <EarlyAdoptersSection onSignup={onSignup} />
          <FAQSection />
          <FinalCta onSignup={onSignup} />
        </main>
      </MotionConfig>
      <FooterSection onNavigate={onNavigate} />
    </div>
  );
}
