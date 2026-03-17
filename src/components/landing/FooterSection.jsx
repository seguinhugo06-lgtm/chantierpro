/**
 * FooterSection — Expanded 4-column footer with product, resources, legal, and contact links.
 */

import React from 'react';
import { Building2, Linkedin } from 'lucide-react';

const COLUMNS = [
  {
    title: 'Produit',
    links: [
      { label: 'Fonctionnalit\u00e9s', href: '/fonctionnalites' },
      { label: 'Tarifs', href: '#pricing' },
      { label: 'Devis IA', href: '#features' },
      { label: 'Conformit\u00e9 2026', href: '#features' },
    ],
  },
  {
    title: 'Ressources',
    links: [
      { label: 'Ressources', href: '/ressources' },
      { label: 'T\u00e9moignages', href: '#testimonials' },
      { label: 'FAQ', href: '#faq' },
      { label: 'Blog', href: '#', disabled: true },
    ],
  },
  {
    title: 'L\u00e9gal',
    links: [
      { label: 'Mentions l\u00e9gales', href: '/mentions-legales' },
      { label: 'CGU', href: '/cgu' },
      { label: 'CGV', href: '/cgv' },
      { label: 'Confidentialit\u00e9', href: '/confidentialite' },
    ],
  },
];

export default function FooterSection() {
  const year = new Date().getFullYear();

  const handleNavClick = (e, href) => {
    if (href.startsWith('#')) {
      e.preventDefault();
      const el = document.querySelector(href);
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <footer className="bg-slate-900 text-slate-400">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-8 sm:gap-12">
          {/* Brand */}
          <div className="col-span-2 sm:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center">
                <Building2 size={16} className="text-white" />
              </div>
              <span className="text-white font-bold text-lg">BatiGesti</span>
            </div>
            <p className="text-sm leading-relaxed mb-4 max-w-xs">
              L'outil de gestion tout-en-un pour les artisans et entreprises du b&acirc;timent.
            </p>
            <a
              href="mailto:contact@batigesti.fr"
              className="text-sm text-orange-400 hover:text-orange-300 transition-colors"
            >
              contact@batigesti.fr
            </a>
            <div className="flex items-center gap-3 mt-4">
              <a
                href="https://www.linkedin.com/company/batigesti"
                target="_blank"
                rel="noopener noreferrer"
                className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 flex items-center justify-center transition-colors"
                aria-label="LinkedIn"
              >
                <Linkedin size={16} className="text-slate-400" />
              </a>
            </div>
          </div>

          {/* Link columns */}
          {COLUMNS.map((col) => (
            <div key={col.title}>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4">
                {col.title}
              </p>
              <ul className="space-y-2.5">
                {col.links.map((link) => (
                  <li key={link.label}>
                    {link.disabled ? (
                      <span className="text-sm text-slate-600 cursor-default">
                        {link.label}
                        <span className="ml-1 text-[10px] bg-slate-800 text-slate-500 px-1.5 py-0.5 rounded">Bient&ocirc;t</span>
                      </span>
                    ) : (
                      <a
                        href={link.href}
                        onClick={(e) => handleNavClick(e, link.href)}
                        className="text-sm hover:text-white transition-colors"
                      >
                        {link.label}
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom */}
        <div className="mt-12 pt-8 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-center sm:text-left">
            &copy; {year} BatiGesti. Tous droits r&eacute;serv&eacute;s.
          </p>
          <p className="text-xs text-slate-600">
            Fait avec soin en France
          </p>
        </div>
      </div>
    </footer>
  );
}
