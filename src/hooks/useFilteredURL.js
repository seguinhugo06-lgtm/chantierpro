import { useState, useEffect, useCallback, useMemo } from 'react';

/**
 * useFilteredURL - Persist filter state in URL search params
 *
 * Keeps filters in sync with URL for:
 * - Shareable/bookmarkable filtered views
 * - Browser back/forward navigation
 * - Page refresh persistence
 *
 * @param {Object} defaultFilters - Default filter values
 * @param {Object} options - Configuration options
 * @param {string} options.prefix - Prefix for URL params (default: '')
 * @param {boolean} options.replaceState - Use replaceState instead of pushState (default: true)
 * @param {string[]} options.exclude - Filter keys to exclude from URL
 *
 * @example
 * const { filters, setFilter, setFilters, resetFilters, clearFilter } = useFilteredURL({
 *   status: 'all',
 *   search: '',
 *   sortBy: 'date',
 *   sortOrder: 'desc'
 * });
 *
 * // In your UI:
 * <select value={filters.status} onChange={e => setFilter('status', e.target.value)}>
 *   <option value="all">Tous</option>
 *   <option value="pending">En attente</option>
 * </select>
 */
export function useFilteredURL(defaultFilters = {}, options = {}) {
  const {
    prefix = '',
    replaceState = true,
    exclude = []
  } = options;

  // Parse initial filters from URL
  const getFiltersFromURL = useCallback(() => {
    if (typeof window === 'undefined') return defaultFilters;

    const params = new URLSearchParams(window.location.search);
    const urlFilters = { ...defaultFilters };

    Object.keys(defaultFilters).forEach(key => {
      if (exclude.includes(key)) return;

      const paramKey = prefix ? `${prefix}_${key}` : key;
      const value = params.get(paramKey);

      if (value !== null) {
        // Parse value based on default type
        const defaultValue = defaultFilters[key];

        if (typeof defaultValue === 'boolean') {
          urlFilters[key] = value === 'true';
        } else if (typeof defaultValue === 'number') {
          const parsed = parseFloat(value);
          urlFilters[key] = isNaN(parsed) ? defaultValue : parsed;
        } else if (Array.isArray(defaultValue)) {
          try {
            urlFilters[key] = JSON.parse(value);
          } catch {
            urlFilters[key] = value.split(',').filter(Boolean);
          }
        } else {
          urlFilters[key] = value;
        }
      }
    });

    return urlFilters;
  }, [defaultFilters, prefix, exclude]);

  const [filters, setFiltersState] = useState(getFiltersFromURL);

  // Update URL when filters change
  const updateURL = useCallback((newFilters) => {
    if (typeof window === 'undefined') return;

    const params = new URLSearchParams(window.location.search);

    Object.keys(defaultFilters).forEach(key => {
      if (exclude.includes(key)) return;

      const paramKey = prefix ? `${prefix}_${key}` : key;
      const value = newFilters[key];
      const defaultValue = defaultFilters[key];

      // Only add to URL if different from default
      if (value !== defaultValue && value !== '' && value !== null && value !== undefined) {
        if (Array.isArray(value)) {
          if (value.length > 0) {
            params.set(paramKey, JSON.stringify(value));
          } else {
            params.delete(paramKey);
          }
        } else {
          params.set(paramKey, String(value));
        }
      } else {
        params.delete(paramKey);
      }
    });

    const newURL = params.toString()
      ? `${window.location.pathname}?${params.toString()}`
      : window.location.pathname;

    if (replaceState) {
      window.history.replaceState(null, '', newURL);
    } else {
      window.history.pushState(null, '', newURL);
    }
  }, [defaultFilters, prefix, exclude, replaceState]);

  // Listen for popstate (browser back/forward)
  useEffect(() => {
    const handlePopState = () => {
      setFiltersState(getFiltersFromURL());
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [getFiltersFromURL]);

  // Set a single filter
  const setFilter = useCallback((key, value) => {
    setFiltersState(prev => {
      const newFilters = { ...prev, [key]: value };
      updateURL(newFilters);
      return newFilters;
    });
  }, [updateURL]);

  // Set multiple filters at once
  const setFilters = useCallback((newFilters) => {
    setFiltersState(prev => {
      const merged = { ...prev, ...newFilters };
      updateURL(merged);
      return merged;
    });
  }, [updateURL]);

  // Reset all filters to defaults
  const resetFilters = useCallback(() => {
    setFiltersState(defaultFilters);
    updateURL(defaultFilters);
  }, [defaultFilters, updateURL]);

  // Clear a specific filter (set to default)
  const clearFilter = useCallback((key) => {
    setFiltersState(prev => {
      const newFilters = { ...prev, [key]: defaultFilters[key] };
      updateURL(newFilters);
      return newFilters;
    });
  }, [defaultFilters, updateURL]);

  // Check if any filters are active (different from defaults)
  const hasActiveFilters = useMemo(() => {
    return Object.keys(defaultFilters).some(key => {
      if (exclude.includes(key)) return false;
      const current = filters[key];
      const defaultValue = defaultFilters[key];

      if (Array.isArray(current) && Array.isArray(defaultValue)) {
        return JSON.stringify(current) !== JSON.stringify(defaultValue);
      }
      return current !== defaultValue;
    });
  }, [filters, defaultFilters, exclude]);

  // Get count of active filters
  const activeFilterCount = useMemo(() => {
    return Object.keys(defaultFilters).filter(key => {
      if (exclude.includes(key)) return false;
      const current = filters[key];
      const defaultValue = defaultFilters[key];

      if (Array.isArray(current) && Array.isArray(defaultValue)) {
        return JSON.stringify(current) !== JSON.stringify(defaultValue);
      }
      return current !== defaultValue && current !== '' && current !== null;
    }).length;
  }, [filters, defaultFilters, exclude]);

  // Generate shareable URL
  const getShareableURL = useCallback(() => {
    if (typeof window === 'undefined') return '';

    const params = new URLSearchParams();

    Object.keys(filters).forEach(key => {
      if (exclude.includes(key)) return;

      const value = filters[key];
      const defaultValue = defaultFilters[key];

      if (value !== defaultValue && value !== '' && value !== null) {
        const paramKey = prefix ? `${prefix}_${key}` : key;
        if (Array.isArray(value)) {
          if (value.length > 0) params.set(paramKey, JSON.stringify(value));
        } else {
          params.set(paramKey, String(value));
        }
      }
    });

    const queryString = params.toString();
    return queryString
      ? `${window.location.origin}${window.location.pathname}?${queryString}`
      : `${window.location.origin}${window.location.pathname}`;
  }, [filters, defaultFilters, prefix, exclude]);

  return {
    filters,
    setFilter,
    setFilters,
    resetFilters,
    clearFilter,
    hasActiveFilters,
    activeFilterCount,
    getShareableURL
  };
}

export default useFilteredURL;
