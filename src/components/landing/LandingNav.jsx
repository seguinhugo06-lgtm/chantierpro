import React, { useState, useEffect } from 'react';
import { Building2, Menu, X } from 'lucide-react';

const NAV_LINKS = [
  { label: 'Fonctionnalités', href: '#features' },
  { label: 'Tarifs', href: '#pricing' },
  { label: 'Témoignages', href: '#testimonials' },
  { label: 'FAQ', href: '#faq' },
];

export default function LandingNav({ onLogin, onSignup }) {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollTo = (href) => {
    setMenuOpen(false);
    const el = document.querySelector(href);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all ${
      scrolled ? 'bg-white/95 backdrop-blur-md shadow-sm' : 'bg-transparent'
    }`}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center">
            <Building2 size={18} className="text-white" />
          </div>
          <span className={`text-lg font-bold ${scrolled ? 'text-slate-900' : 'text-white'}`}>
            BatiGesti
          </span>
        </div>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-6">
          {NAV_LINKS.map((link) => (
            <button
              key={link.href}
              onClick={() => scrollTo(link.href)}
              className={`text-sm font-medium transition-colors ${
                scrolled ? 'text-slate-600 hover:text-slate-900' : 'text-white/80 hover:text-white'
              }`}
            >
              {link.label}
            </button>
          ))}
        </div>

        {/* Desktop CTA */}
        <div className="hidden md:flex items-center gap-3">
          <button
            onClick={onLogin}
            className={`text-sm font-medium px-4 py-2 rounded-xl transition-colors ${
              scrolled ? 'text-slate-700 hover:bg-slate-100' : 'text-white/90 hover:text-white'
            }`}
          >
            Connexion
          </button>
          <button
            onClick={onSignup}
            className="text-sm font-medium px-4 py-2 rounded-xl bg-orange-500 text-white hover:bg-orange-600 transition-colors"
          >
            Essai gratuit
          </button>
        </div>

        {/* Mobile menu button */}
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className={`md:hidden p-2 rounded-lg ${scrolled ? 'text-slate-900' : 'text-white'}`}
        >
          {menuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden bg-white border-t shadow-lg">
          <div className="px-4 py-3 space-y-1">
            {NAV_LINKS.map((link) => (
              <button
                key={link.href}
                onClick={() => scrollTo(link.href)}
                className="w-full text-left px-3 py-2.5 text-sm text-slate-700 hover:bg-slate-50 rounded-lg"
              >
                {link.label}
              </button>
            ))}
            <hr className="my-2" />
            <button
              onClick={() => { setMenuOpen(false); onLogin(); }}
              className="w-full text-left px-3 py-2.5 text-sm text-slate-700 hover:bg-slate-50 rounded-lg"
            >
              Connexion
            </button>
            <button
              onClick={() => { setMenuOpen(false); onSignup(); }}
              className="w-full px-3 py-2.5 text-sm text-white bg-orange-500 hover:bg-orange-600 rounded-lg font-medium"
            >
              Essai gratuit
            </button>
          </div>
        </div>
      )}
    </nav>
  );
}
