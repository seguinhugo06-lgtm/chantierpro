/**
 * LandingNav — Enhanced fixed navbar with Framer Motion mobile menu,
 * new page links, and glass-morphism on scroll.
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Building2,
  Menu,
  X,
  FileText,
  Mic,
  Building,
  Calendar,
  Users,
  TrendingUp,
  ChevronDown,
} from 'lucide-react';

const NAV_LINKS = [
  { label: 'Fonctionnalit\u00e9s', href: '#features', hasDropdown: true },
  { label: 'Tarifs', href: '#pricing' },
  { label: 'T\u00e9moignages', href: '#testimonials' },
  { label: 'Ressources', href: '/ressources', isPage: true },
  { label: 'FAQ', href: '#faq' },
];

const FEATURE_DROPDOWN = [
  { icon: FileText, label: 'Devis & Factures', description: 'Cr\u00e9ation, PDF, signatures', href: '#features' },
  { icon: Mic, label: 'Devis IA', description: 'Dict\u00e9e vocale intelligente', href: '#features' },
  { icon: Building, label: 'Chantiers', description: 'Suivi, rentabilit\u00e9, photos', href: '#features' },
  { icon: Calendar, label: 'Planning', description: 'Calendrier, drag-and-drop', href: '#features' },
  { icon: Users, label: 'Clients & CRM', description: 'Contacts, historique', href: '#features' },
  { icon: TrendingUp, label: 'Tr\u00e9sorerie', description: 'Suivi financier, projections', href: '#features' },
];

export default function LandingNav({ onLogin, onSignup }) {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
  const dropdownTimeout = useRef(null);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const scrollTo = (href) => {
    setMenuOpen(false);
    setDropdownOpen(false);
    if (href.startsWith('/')) {
      window.location.href = href;
      return;
    }
    const el = document.querySelector(href);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  const handleDropdownEnter = () => {
    clearTimeout(dropdownTimeout.current);
    setDropdownOpen(true);
  };

  const handleDropdownLeave = () => {
    dropdownTimeout.current = setTimeout(() => setDropdownOpen(false), 200);
  };

  // Nav text color depends on scroll AND hero background
  const textColor = scrolled ? 'text-slate-600 hover:text-slate-900' : 'text-slate-600 hover:text-slate-900';
  const logoColor = scrolled ? 'text-slate-900' : 'text-slate-900';

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
      scrolled
        ? 'bg-white/90 backdrop-blur-xl shadow-sm border-b border-slate-100'
        : 'bg-white/50 backdrop-blur-sm'
    }`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
        {/* Logo */}
        <a href="/" className="flex items-center gap-2 group">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center group-hover:scale-105 transition-transform">
            <Building2 size={18} className="text-white" />
          </div>
          <span className={`text-lg font-bold ${logoColor}`}>
            BatiGesti
          </span>
        </a>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-1">
          {NAV_LINKS.map((link) => (
            link.hasDropdown ? (
              <div
                key={link.href}
                ref={dropdownRef}
                className="relative"
                onMouseEnter={handleDropdownEnter}
                onMouseLeave={handleDropdownLeave}
              >
                <button
                  className={`flex items-center gap-1 text-sm font-medium px-3 py-2 rounded-lg transition-colors ${textColor}`}
                  onClick={() => scrollTo(link.href)}
                >
                  {link.label}
                  <ChevronDown
                    size={14}
                    className={`transition-transform ${dropdownOpen ? 'rotate-180' : ''}`}
                  />
                </button>

                {/* Dropdown */}
                <AnimatePresence>
                  {dropdownOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 8, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 8, scale: 0.95 }}
                      transition={{ duration: 0.2 }}
                      className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-[420px] bg-white rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-200 p-4"
                    >
                      <div className="grid grid-cols-2 gap-1">
                        {FEATURE_DROPDOWN.map((item) => {
                          const Icon = item.icon;
                          return (
                            <button
                              key={item.label}
                              onClick={() => scrollTo(item.href)}
                              className="flex items-start gap-3 p-3 rounded-xl hover:bg-orange-50 transition-colors text-left group"
                            >
                              <div className="w-9 h-9 rounded-lg bg-slate-100 group-hover:bg-orange-100 flex items-center justify-center flex-shrink-0 transition-colors">
                                <Icon size={16} className="text-slate-500 group-hover:text-orange-500 transition-colors" />
                              </div>
                              <div>
                                <p className="text-sm font-medium text-slate-900">{item.label}</p>
                                <p className="text-xs text-slate-400">{item.description}</p>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                      <div className="mt-3 pt-3 border-t border-slate-100">
                        <a
                          href="/fonctionnalites"
                          className="flex items-center justify-center gap-1 text-sm text-orange-500 font-medium hover:text-orange-600 transition-colors py-1"
                        >
                          Voir toutes les fonctionnalit&eacute;s &rarr;
                        </a>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <button
                key={link.href}
                onClick={() => scrollTo(link.href)}
                className={`text-sm font-medium px-3 py-2 rounded-lg transition-colors ${textColor}`}
              >
                {link.label}
              </button>
            )
          ))}
        </div>

        {/* Desktop CTA */}
        <div className="hidden md:flex items-center gap-3">
          <button
            onClick={onLogin}
            className="text-sm font-medium px-4 py-2 rounded-xl text-slate-700 hover:bg-slate-100 transition-colors"
          >
            Connexion
          </button>
          <button
            onClick={onSignup}
            className="text-sm font-medium px-4 py-2 rounded-xl bg-orange-500 text-white hover:bg-orange-600 transition-colors shadow-sm"
          >
            Essai gratuit
          </button>
        </div>

        {/* Mobile menu button */}
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="md:hidden p-2 rounded-lg text-slate-900"
        >
          {menuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="md:hidden bg-white border-t border-slate-100 shadow-lg overflow-hidden"
          >
            <div className="px-4 py-3 space-y-1">
              {NAV_LINKS.map((link) => (
                <button
                  key={link.href}
                  onClick={() => scrollTo(link.href)}
                  className="w-full text-left px-3 py-2.5 text-sm text-slate-700 hover:bg-slate-50 rounded-lg font-medium"
                >
                  {link.label}
                </button>
              ))}
              <hr className="my-2 border-slate-100" />
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
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
