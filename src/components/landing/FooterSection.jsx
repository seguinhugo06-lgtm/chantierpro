import React from 'react';
import { Building2 } from 'lucide-react';

const LEGAL_LINKS = [
  { label: 'Mentions légales', href: '/mentions-legales' },
  { label: 'CGU', href: '/cgu' },
  { label: 'CGV', href: '/cgv' },
  { label: 'Confidentialité', href: '/confidentialite' },
];

export default function FooterSection() {
  const year = new Date().getFullYear();

  return (
    <footer className="bg-slate-900 text-slate-400 py-12 sm:py-16">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex flex-col sm:flex-row items-center sm:items-start justify-between gap-8">
          {/* Logo & tagline */}
          <div className="text-center sm:text-left">
            <div className="flex items-center gap-2 justify-center sm:justify-start mb-2">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center">
                <Building2 size={14} className="text-white" />
              </div>
              <span className="text-white font-bold">BatiGesti</span>
            </div>
            <p className="text-sm max-w-xs">
              L'outil de gestion tout-en-un pour les artisans et entreprises du bâtiment.
            </p>
          </div>

          {/* Legal links */}
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 text-center sm:text-left">
              Légal
            </p>
            <ul className="space-y-2 text-center sm:text-left">
              {LEGAL_LINKS.map((link) => (
                <li key={link.href}>
                  <a
                    href={link.href}
                    className="text-sm hover:text-white transition-colors"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div className="text-center sm:text-left">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
              Contact
            </p>
            <ul className="space-y-2 text-sm">
              <li>
                <a href="mailto:contact@batigesti.fr" className="hover:text-white transition-colors">
                  contact@batigesti.fr
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom */}
        <div className="mt-10 pt-6 border-t border-slate-800 text-center text-xs">
          <p>&copy; {year} BatiGesti. Tous droits réservés. Fait avec soin en France.</p>
        </div>
      </div>
    </footer>
  );
}
