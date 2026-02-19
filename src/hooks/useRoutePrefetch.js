import { useEffect, useRef } from 'react';

/**
 * useRoutePrefetch — Prefetches lazy-loaded route chunks during idle time.
 *
 * Strategy:
 * - After initial page renders (3s delay), prefetch the most-used pages
 * - Uses requestIdleCallback (or setTimeout fallback) to avoid blocking UI
 * - Only prefetches once per session
 *
 * @param {string} currentPage - Currently active page
 */
export default function useRoutePrefetch(currentPage) {
  const prefetched = useRef(false);

  useEffect(() => {
    if (prefetched.current) return;

    // Priority order: most used pages first
    const ROUTES_TO_PREFETCH = [
      { id: 'devis', load: () => import('../components/DevisPage') },
      { id: 'chantiers', load: () => import('../components/Chantiers') },
      { id: 'clients', load: () => import('../components/Clients') },
      { id: 'planning', load: () => import('../components/Planning') },
      { id: 'equipe', load: () => import('../components/Equipe') },
      { id: 'catalogue', load: () => import('../components/Catalogue') },
      { id: 'settings', load: () => import('../components/Settings') },
    ];

    // Filter out the current page (already loaded)
    const toLoad = ROUTES_TO_PREFETCH.filter(r => r.id !== currentPage);

    const idle = typeof requestIdleCallback === 'function'
      ? requestIdleCallback
      : (cb) => setTimeout(cb, 100);

    // Wait 3 seconds after mount, then prefetch in idle callbacks
    const timer = setTimeout(() => {
      prefetched.current = true;

      let idx = 0;
      const loadNext = () => {
        if (idx >= toLoad.length) return;
        idle(() => {
          toLoad[idx].load().catch(() => {}); // Silently ignore failures
          idx++;
          loadNext();
        });
      };
      loadNext();
    }, 3000);

    return () => clearTimeout(timer);
  }, [currentPage]);
}
