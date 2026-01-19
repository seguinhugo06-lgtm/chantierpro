import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * useDebounce - Debounce a value
 *
 * Usage:
 *   const [search, setSearch] = useState('');
 *   const debouncedSearch = useDebounce(search, 300);
 *
 *   useEffect(() => {
 *     // This runs 300ms after user stops typing
 *     fetchResults(debouncedSearch);
 *   }, [debouncedSearch]);
 */
export function useDebounce(value, delay = 300) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}

/**
 * useDebouncedCallback - Debounce a callback function
 *
 * Usage:
 *   const debouncedSearch = useDebouncedCallback((query) => {
 *     fetchResults(query);
 *   }, 300);
 *
 *   <input onChange={(e) => debouncedSearch(e.target.value)} />
 */
export function useDebouncedCallback(callback, delay = 300) {
  const timeoutRef = useRef(null);

  const debouncedCallback = useCallback((...args) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      callback(...args);
    }, delay);
  }, [callback, delay]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return debouncedCallback;
}

/**
 * useThrottle - Throttle a value
 *
 * Usage:
 *   const [scroll, setScroll] = useState(0);
 *   const throttledScroll = useThrottle(scroll, 100);
 */
export function useThrottle(value, limit = 100) {
  const [throttledValue, setThrottledValue] = useState(value);
  const lastRan = useRef(Date.now());

  useEffect(() => {
    const handler = setTimeout(() => {
      if (Date.now() - lastRan.current >= limit) {
        setThrottledValue(value);
        lastRan.current = Date.now();
      }
    }, limit - (Date.now() - lastRan.current));

    return () => {
      clearTimeout(handler);
    };
  }, [value, limit]);

  return throttledValue;
}

/**
 * useDebouncedSearch - Combined search state with debouncing
 *
 * Usage:
 *   const { query, setQuery, debouncedQuery, isSearching } = useDebouncedSearch('', 300);
 *
 *   <input
 *     value={query}
 *     onChange={(e) => setQuery(e.target.value)}
 *     placeholder={isSearching ? 'Recherche...' : 'Rechercher'}
 *   />
 *
 *   // Use debouncedQuery for filtering
 *   const filtered = items.filter(item => item.name.includes(debouncedQuery));
 */
export function useDebouncedSearch(initialValue = '', delay = 300) {
  const [query, setQuery] = useState(initialValue);
  const debouncedQuery = useDebounce(query, delay);
  const isSearching = query !== debouncedQuery;

  const clear = useCallback(() => {
    setQuery('');
  }, []);

  return {
    query,
    setQuery,
    debouncedQuery,
    isSearching,
    clear
  };
}

export default useDebounce;
