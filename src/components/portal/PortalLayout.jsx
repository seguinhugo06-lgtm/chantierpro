import React, { useEffect } from 'react';
import { Building2 } from 'lucide-react';

/**
 * Portal Layout - Simplified layout for the public client portal.
 * Uses the enterprise accent color for branding.
 *
 * @param {Object} props
 * @param {string} props.clientName - Client name to display
 * @param {Object} props.entreprise - Enterprise data (nom, couleur, logo)
 * @param {string} props.couleur - Accent color hex
 * @param {React.ReactNode} props.children - Page content
 */
export default function PortalLayout({ clientName, entreprise = {}, couleur = '#f97316', children }) {
  const entrepriseNom = entreprise.nom || 'BatiGesti';

  // Set page title + noindex meta
  useEffect(() => {
    document.title = clientName
      ? `Espace Client - ${clientName} | ${entrepriseNom}`
      : `Espace Client | ${entrepriseNom}`;

    let metaRobots = document.querySelector('meta[name="robots"]');
    if (!metaRobots) {
      metaRobots = document.createElement('meta');
      metaRobots.name = 'robots';
      document.head.appendChild(metaRobots);
    }
    metaRobots.content = 'noindex, nofollow';

    return () => {
      document.title = 'BatiGesti';
      if (metaRobots) {
        metaRobots.content = 'index, follow';
      }
    };
  }, [clientName, entrepriseNom]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-orange-50/30 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14 sm:h-16">
            {/* Logo / Enterprise name */}
            <div className="flex items-center gap-3">
              {entreprise.logo ? (
                <img
                  src={entreprise.logo}
                  alt={entrepriseNom}
                  className="h-9 w-9 rounded-xl object-cover"
                />
              ) : (
                <div
                  className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center shadow-lg"
                  style={{
                    background: `linear-gradient(135deg, ${couleur}, ${couleur}cc)`,
                    boxShadow: `0 4px 14px ${couleur}33`,
                  }}
                >
                  <Building2 className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                </div>
              )}
              <span
                className="text-lg sm:text-xl font-bold bg-clip-text text-transparent"
                style={{ backgroundImage: `linear-gradient(135deg, ${couleur}, ${couleur}cc)` }}
              >
                {entrepriseNom}
              </span>
            </div>

            {/* Client greeting */}
            {clientName && (
              <div className="text-xs sm:text-sm text-slate-600">
                Espace client de{' '}
                <span className="font-semibold text-slate-900">{clientName}</span>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white mt-auto">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-xs sm:text-sm text-slate-500">
              &copy; {new Date().getFullYear()} {entrepriseNom}. Tous droits réservés.
            </p>
            <p className="text-xs text-slate-400">
              Propulsé par{' '}
              <span className="font-medium" style={{ color: couleur }}>BatiGesti</span>
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
