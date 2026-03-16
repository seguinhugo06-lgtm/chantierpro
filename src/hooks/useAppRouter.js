/**
 * useAppRouter — Bridge between old `setPage` pattern and React Router
 *
 * Provides:
 *  - `page` — current page id derived from URL path (e.g. 'dashboard', 'devis')
 *  - `setPage` — compatibility function that navigates via React Router
 *  - `navigate` — raw react-router navigate function
 *
 * Route mapping:
 *  /app           → dashboard
 *  /app/devis     → devis
 *  /app/chantiers → chantiers
 *  /app/planning  → planning
 *  /app/clients   → clients
 *  /app/catalogue → catalogue
 *  /app/equipe    → equipe
 *  /app/admin     → admin
 *  /app/settings  → settings
 *  /app/finances  → finances
 *  /app/design-system → design-system
 */

import { useCallback, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

// Map of page IDs to URL paths
const PAGE_TO_PATH = {
  'dashboard': '/app',
  'devis': '/app/devis',
  'chantiers': '/app/chantiers',
  'planning': '/app/planning',
  'clients': '/app/clients',
  'catalogue': '/app/catalogue',
  'equipe': '/app/equipe',
  'admin': '/app/admin',
  'settings': '/app/settings',
  'finances': '/app/finances',
  'design-system': '/app/design-system',
};

// Reverse map: path segment → page ID
const PATH_TO_PAGE = {
  '': 'dashboard',
  'devis': 'devis',
  'chantiers': 'chantiers',
  'planning': 'planning',
  'clients': 'clients',
  'catalogue': 'catalogue',
  'equipe': 'equipe',
  'admin': 'admin',
  'administratif': 'admin', // alias for user-friendly URL
  'settings': 'settings',
  'parametres': 'settings', // alias for French URL
  'finances': 'finances',
  'design-system': 'design-system',
};

/**
 * Derive page ID from current URL path
 */
function getPageFromPath(pathname) {
  // Remove /app prefix and leading slash
  const segment = pathname.replace(/^\/app\/?/, '').split('/')[0] || '';
  return PATH_TO_PAGE[segment] || 'dashboard';
}

export default function useAppRouter() {
  const navigate = useNavigate();
  const location = useLocation();

  const page = useMemo(() => getPageFromPath(location.pathname), [location.pathname]);

  // Compatibility wrapper: setPage('devis') → navigate('/app/devis')
  const setPage = useCallback((pageId) => {
    const path = PAGE_TO_PATH[pageId];
    if (path) {
      navigate(path);
    } else {
      // Fallback for unknown pages — try as direct path
      navigate(`/app/${pageId}`);
    }
  }, [navigate]);

  return { page, setPage, navigate, location };
}

export { PAGE_TO_PATH, PATH_TO_PAGE, getPageFromPath };
