/**
 * MarketingLayout — Shared wrapper for marketing pages (features, resources).
 *
 * Provides LandingNav, FooterSection, and smooth scroll behavior.
 */

import React from 'react';
import LandingNav from './LandingNav';
import FooterSection from './FooterSection';

export default function MarketingLayout({ children }) {
  // L'app ouvre directement le formulaire à ces adresses (avant : « /app », qui menait à l'accueil)
  const handleLogin = () => { window.location.href = '/connexion'; };
  const handleSignup = () => { window.location.href = '/inscription'; };

  return (
    <div className="min-h-screen bg-white overflow-x-clip" style={{ scrollBehavior: 'smooth' }}>
      <LandingNav onLogin={handleLogin} onSignup={handleSignup} />
      <main className="pt-16">
        {children}
      </main>
      <FooterSection />
    </div>
  );
}
