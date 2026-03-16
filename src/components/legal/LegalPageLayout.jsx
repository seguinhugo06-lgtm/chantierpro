/**
 * LegalPageLayout — Layout partagé pour les pages légales publiques.
 */

import React from 'react';
import { Building2, ArrowLeft } from 'lucide-react';

export default function LegalPageLayout({ title, lastUpdated, children }) {
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Nav */}
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <a href="/" className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center">
              <Building2 size={14} className="text-white" />
            </div>
            <span className="font-bold text-slate-900">BatiGesti</span>
          </a>
          <a href="/" className="text-sm text-slate-500 hover:text-slate-700 flex items-center gap-1">
            <ArrowLeft size={14} />
            Retour
          </a>
        </div>
      </nav>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-10 sm:py-16">
        <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-10">
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-2">{title}</h1>
          {lastUpdated && (
            <p className="text-sm text-slate-500 mb-8">Dernière mise à jour : {lastUpdated}</p>
          )}
          <div className="prose prose-slate prose-sm max-w-none">
            {children}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 py-6 text-center text-xs text-slate-500">
        <p>&copy; {new Date().getFullYear()} BatiGesti. Tous droits réservés.</p>
      </footer>
    </div>
  );
}
