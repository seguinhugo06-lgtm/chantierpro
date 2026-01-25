import React, { useEffect } from 'react';
import { Building2 } from 'lucide-react';

/**
 * Portal Layout - Simplified layout for client portal
 * @param {Object} props
 * @param {string} props.clientName - Client name to display
 * @param {React.ReactNode} props.children - Page content
 */
export default function PortalLayout({ clientName, children }) {
  // Add noindex meta tag to prevent search engine indexing
  useEffect(() => {
    // Set page title
    document.title = clientName
      ? `Espace Client - ${clientName} | ChantierPro`
      : 'Espace Client | ChantierPro';

    // Add noindex meta tag
    let metaRobots = document.querySelector('meta[name="robots"]');
    if (!metaRobots) {
      metaRobots = document.createElement('meta');
      metaRobots.name = 'robots';
      document.head.appendChild(metaRobots);
    }
    metaRobots.content = 'noindex, nofollow';

    // Cleanup on unmount
    return () => {
      document.title = 'ChantierPro';
      if (metaRobots) {
        metaRobots.content = 'index, follow';
      }
    };
  }, [clientName]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-orange-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center shadow-lg shadow-orange-500/20">
                <Building2 className="w-6 h-6 text-white" />
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-orange-600 to-orange-500 bg-clip-text text-transparent">
                ChantierPro
              </span>
            </div>

            {/* Welcome message */}
            {clientName && (
              <div className="text-sm text-slate-600">
                Bienvenue, <span className="font-semibold text-slate-900">{clientName}</span>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white mt-auto">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-sm text-slate-500">
              &copy; {new Date().getFullYear()} ChantierPro. Tous droits reserves.
            </p>
            <div className="flex items-center gap-6 text-sm text-slate-500">
              <a href="#" className="hover:text-orange-600 transition-colors">
                Mentions legales
              </a>
              <a href="#" className="hover:text-orange-600 transition-colors">
                Contact
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
