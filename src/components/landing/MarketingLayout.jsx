/**
 * MarketingLayout — Shared wrapper for marketing pages (features, resources).
 *
 * Provides LandingNav, FooterSection, and smooth scroll behavior.
 */

import React from 'react';
import LandingNav from './LandingNav';
import FooterSection from './FooterSection';

export default function MarketingLayout({ children }) {
  // Marketing pages use simple navigation (no login/signup callbacks needed at page level)
  const handleLogin = () => { window.location.href = '/app'; };
  const handleSignup = () => { window.location.href = '/app'; };

  return (
    <div className="min-h-screen bg-white" style={{ scrollBehavior: 'smooth' }}>
      <LandingNav onLogin={handleLogin} onSignup={handleSignup} />
      <main className="pt-16">
        {children}
      </main>
      <FooterSection />
    </div>
  );
}
