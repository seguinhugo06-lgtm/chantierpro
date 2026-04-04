import React, { useState, useEffect } from 'react';
import { Building2, RefreshCw } from 'lucide-react';

/**
 * PortalLoader — Bypasses React.lazy to handle circular-dependency TDZ errors.
 *
 * React.lazy relies on module evaluation succeeding. When a lazy chunk
 * imports from the main bundle and hits a TDZ (Temporal Dead Zone),
 * the error happens during module evaluation — BEFORE React renders.
 * Neither ErrorBoundary nor lazyWithRetry can catch it.
 *
 * This component uses a manual dynamic import() with Promise.catch(),
 * managing loading/error states via useState. The .catch() fires
 * for ANY rejection, including TDZ errors during module evaluation.
 */
export default function PortalLoader(props) {
  const [Component, setComponent] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    import('./ClientPortal')
      .then((mod) => {
        if (!cancelled) {
          setComponent(() => mod.default);
          setLoading(false);
        }
      })
      .catch((err) => {
        console.error('[PortalLoader] Failed to load ClientPortal:', err);
        if (!cancelled) {
          setError(err);
          setLoading(false);
        }
      });

    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f5f5f5] flex items-center justify-center">
        <Building2 size={48} className="text-orange-500 animate-bounce" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#f5f5f5] flex items-center justify-center">
        <div className="text-center p-8 max-w-md">
          <Building2 size={48} className="text-orange-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-800 mb-2">
            Espace client indisponible
          </h2>
          <p className="text-slate-600 mb-6">
            Le portail client rencontre un problème technique.
            Veuillez réessayer dans quelques instants.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="inline-flex items-center gap-2 px-6 py-3 bg-orange-500 text-white rounded-xl font-medium hover:bg-orange-600 transition-colors shadow-lg"
          >
            <RefreshCw size={18} />
            Recharger la page
          </button>
        </div>
      </div>
    );
  }

  // Render the loaded component with all passed props
  return <Component {...props} />;
}
